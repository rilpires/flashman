/* eslint-disable no-prototype-builtins */
/* global __line */
const Validator = require('../public/javascripts/device_validator');
const DevicesAPI = require('./external-genieacs/devices-api');
const DeviceModel = require('../models/device');
const Config = require('../models/config');
const mqtt = require('../mqtts');
const DeviceVersion = require('../models/device_version');
const acsAccessControlHandler = require('./handlers/acs/access_control');
const acsDiagnosticsHandler = require('./handlers/acs/diagnostics');
const acsPortForwardHandler = require('./handlers/acs/port_forward');
const deviceHandlers = require('./handlers/devices');
const meshHandlers = require('./handlers/mesh');
const util = require('./handlers/util');
const acsController = require('./acs_device_info');
const crypt = require('crypto');
const fs = require('fs');
const t = require('./language').i18next.t;

let appDeviceAPIController = {};

const getWifiConfig = function(matchedDevice) {
  let wifiConfig = {
    '2ghz': {
      'ssid': matchedDevice.wifi_ssid,
      'password': matchedDevice.wifi_password,
      'channel': matchedDevice.wifi_channel,
      'band': matchedDevice.wifi_band,
      'mode': matchedDevice.wifi_mode,
    },
  };
  if (matchedDevice.wifi_is_5ghz_capable) {
    wifiConfig['5ghz'] = {
      'ssid': matchedDevice.wifi_ssid_5ghz,
      'password': matchedDevice.wifi_password_5ghz,
      'channel': matchedDevice.wifi_channel_5ghz,
      'band': matchedDevice.wifi_band_5ghz,
      'mode': matchedDevice.wifi_mode_5ghz,
    };
  }
  return wifiConfig;
};

let checkUpdateParametersDone = function(id, ncalls, maxcalls) {
  return new Promise((resolve, reject)=>{
    DeviceModel.findById(id, (err, matchedDevice)=>{
      if (err || !matchedDevice) return reject();
      resolve(!matchedDevice.do_update_parameters);
    });
  }).then((done)=>{
    if (done) return Promise.resolve(true);
    if (ncalls >= maxcalls) return Promise.resolve(false);
    return new Promise((resolve, reject)=>{
      setTimeout(()=>{
        checkUpdateParametersDone(id, ncalls+1, maxcalls).then(resolve, reject);
      }, 1000);
    });
  }, (rejectedVal)=>{
    return Promise.reject(rejectedVal);
  });
};

let doRollback = function(device, values) {
  for (let key in values) {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      device[key] = values[key];
    }
  }
};

let appSet = function(req, res, processFunction) {
  DeviceModel.findById(req.body.id, async function(err, matchedDevice) {
    if (err) {
      return res.status(400).json({is_set: 0});
    }
    if (!matchedDevice) {
      return res.status(404).json({is_set: 0});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({is_set: 0});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(404).json({is_set: 0});
    }

    if (util.isJSONObject(req.body.content)) {
      let content = req.body.content;
      let rollbackValues = {};
      let tr069Changes = {
        wan: {}, lan: {}, wifi2: {}, wifi5: {}, changeBlockedDevices: false};

      // Update location data if present
      if (
        content.latitude && content.longitude &&
        !matchedDevice.stop_coordinates_update
      ) {
        matchedDevice.latitude = content.latitude;
        matchedDevice.longitude = content.longitude;
        matchedDevice.last_location_date = new Date();
      }

      if (
        processFunction(content, matchedDevice, rollbackValues, tr069Changes)
      ) {
        matchedDevice.do_update_parameters = true;
      }

      let hashSuffix = '';
      let commandTimeout = 10;
      if (content.hasOwnProperty('command_hash')) {
        hashSuffix = ' ' + content.command_hash;
      }
      if (content.hasOwnProperty('command_timeout')) {
        commandTimeout = content.command_timeout;
      }
      if (matchedDevice.use_tr069 && tr069Changes.changeBlockedDevices) {
        let acRulesRes = {'success': false};
        acRulesRes = await acsAccessControlHandler.changeAcRules(matchedDevice);
        if (!acRulesRes || !acRulesRes['success']) {
          // The return of change Access Control has established
          // error codes. It is possible to make res have
          // specific messages for each error code.
          let errorCode = acRulesRes.hasOwnProperty('error_code') ?
            acRulesRes['error_code'] : 'acRuleDefaultError';
          let response = {
            is_set: 0,
            success: false,
            error_code: errorCode,
          };
          // We need to return a code 200, because the flashman was able to
          // successfully complete the entire request. So we have to return the
          // internal error code in the response, as an "error_code".
          return res.status(200).json(response);
        }
      }
      delete tr069Changes.changeBlockedDevices;

      await matchedDevice.save().catch((err) => {
        console.log('Error setting app sent data: ' + err);
        return res.status(500).json({is_set: 0});
      });

      if (matchedDevice.use_tr069) {
        acsController.updateInfo(matchedDevice, tr069Changes);
        meshHandlers.syncSlaves(matchedDevice);
        return res.status(200).json({is_set: 1});
      } else {
        mqtt.anlixMessageRouterUpdate(matchedDevice._id, hashSuffix);

        checkUpdateParametersDone(matchedDevice._id, 0, commandTimeout)
        .then((done)=>{
          if (done) {
            meshHandlers.syncSlaves(matchedDevice);
            return res.status(200).json({is_set: 1});
          }
          doRollback(matchedDevice, rollbackValues);
          matchedDevice.save().catch((err) => {
            console.log('Error setting app sent data: ' + err);
          });
          return res.status(500).json({is_set: 0});
        }, (rejectedVal)=>{
          doRollback(matchedDevice, rollbackValues);
          matchedDevice.save().catch((err) => {
            console.log('Error setting app sent data: ' + err);
          });
          return res.status(500).json({is_set: 0});
        });
      }
    } else {
      return res.status(500).json({is_set: 0});
    }
  });
};

let processWifi = function(content, device, rollback, tr069Changes) {
  let permissions = DeviceVersion.devicePermissions(device);
  let updateParameters = false;
  if (content.pppoe_user) {
    rollback.pppoe_user = device.pppoe_user;
    device.pppoe_user = content.pppoe_user;
    tr069Changes.wan.pppoe_user = content.pppoe_user;
    updateParameters = true;
  }
  if (content.pppoe_password) {
    rollback.pppoe_password = device.pppoe_password;
    device.pppoe_password = content.pppoe_password;
    tr069Changes.wan.pppoe_pass = content.pppoe_password;
    updateParameters = true;
  }
  if (content.wifi_ssid) {
    rollback.wifi_ssid = device.wifi_ssid;
    device.wifi_ssid = content.wifi_ssid;
    tr069Changes.wifi2.ssid = content.wifi_ssid;
    updateParameters = true;
  }
  if (content.wifi_ssid_5ghz) {
    rollback.wifi_ssid_5ghz = device.wifi_ssid_5ghz;
    device.wifi_ssid_5ghz = content.wifi_ssid_5ghz;
    tr069Changes.wifi5.ssid = content.wifi_ssid_5ghz;
    updateParameters = true;
  }
  if (content.wifi_password) {
    rollback.wifi_password = device.wifi_password;
    device.wifi_password = content.wifi_password;
    tr069Changes.wifi2.password = content.wifi_password;
    updateParameters = true;
  }
  if (content.wifi_password_5ghz) {
    rollback.wifi_password_5ghz = device.wifi_password_5ghz;
    device.wifi_password_5ghz = content.wifi_password_5ghz;
    tr069Changes.wifi5.password = content.wifi_password_5ghz;
    updateParameters = true;
  }
  if (content.wifi_channel) {
    rollback.wifi_channel = device.wifi_channel;
    device.wifi_channel = content.wifi_channel;
    tr069Changes.wifi2.channel = content.wifi_channel;
    updateParameters = true;
  }
  if (content.wifi_band && permissions.grantWifiBandEdit2) {
    // discard change to auto when model doesnt support it
    if (content.wifi_band !== 'auto' || permissions.grantWifiBandAuto2) {
      rollback.wifi_band = device.wifi_band;
      device.wifi_band = content.wifi_band;
      tr069Changes.wifi2.band = content.wifi_band;
      updateParameters = true;
    }
  }
  if (content.wifi_mode && permissions.grantWifiModeEdit) {
    rollback.wifi_mode = device.wifi_mode;
    device.wifi_mode = content.wifi_mode;
    tr069Changes.wifi2.mode = content.wifi_mode;
    updateParameters = true;
  }
  if (content.wifi_channel_5ghz) {
    // discard change to invalid 5ghz channel for this model
    let validator = new Validator();
    if (validator.validateChannel(
      content.wifi_channel_5ghz, permissions.grantWifi5ChannelList,
    ).valid) {
      rollback.wifi_channel_5ghz = device.wifi_channel_5ghz;
      device.wifi_channel_5ghz = content.wifi_channel_5ghz;
      tr069Changes.wifi5.channel = content.wifi_channel_5ghz;
      updateParameters = true;
    }
  }
  if (content.wifi_band_5ghz && permissions.grantWifiBandEdit5) {
    // discard change to auto when model doesnt support it
    if (content.wifi_band_5ghz !== 'auto' || permissions.grantWifiBandAuto5) {
      rollback.wifi_band_5ghz = device.wifi_band_5ghz;
      device.wifi_band_5ghz = content.wifi_band_5ghz;
      tr069Changes.wifi5.band = content.wifi_band_5ghz;
      updateParameters = true;
    }
  }
  if (content.wifi_mode_5ghz && permissions.grantWifiModeEdit) {
    rollback.wifi_mode_5ghz = device.wifi_mode_5ghz;
    device.wifi_mode_5ghz = content.wifi_mode_5ghz;
    tr069Changes.wifi5.mode = content.wifi_mode_5ghz;
    updateParameters = true;
  }
  return updateParameters;
};

let processPassword = function(content, device, rollback, tr069Changes) {
  if (content.hasOwnProperty('app_password')) {
    rollback.app_password = device.app_password;
    device.app_password = content.app_password;
    return true;
  }
  return false;
};

let processBlacklist = function(content, device, rollback, tr069Changes) {
  // Legacy checks
  if (content.hasOwnProperty('blacklist_device') &&
      content.blacklist_device.hasOwnProperty('mac') &&
      content.blacklist_device.mac.match(util.macRegex)) {
    // Deep copy lan devices for rollback
    if (!rollback.lan_devices) {
      rollback.lan_devices = util.deepCopyObject(device.lan_devices);
    }
    // Transform dhcp name in case it's a single *
    let dhcpLease = content.blacklist_device.id;
    if (dhcpLease === '*') dhcpLease = '';
    // Search blocked device
    let blackMacDevice = device.use_tr069 ?
      content.blacklist_device.mac.toUpperCase() :
      content.blacklist_device.mac.toLowerCase();
    let ret = false;
    for (let idx = 0; idx < device.lan_devices.length; idx++) {
      if (device.lan_devices[idx].mac == blackMacDevice) {
        device.lan_devices[idx].last_seen = Date.now();
        if (device.lan_devices[idx].dhcp_name !== dhcpLease) {
          device.lan_devices[idx].dhcp_name = dhcpLease;
          device.blocked_devices_index = Date.now();
          ret = true;
        }
        if (device.lan_devices[idx].is_blocked) {
          return ret;
        } else {
          device.lan_devices[idx].is_blocked = true;
          device.blocked_devices_index = Date.now();
          return true;
        }
      }
    }
    // Mac address not found
    device.lan_devices.push({
      mac: blackMacDevice,
      dhcp_name: dhcpLease,
      is_blocked: true,
      first_seen: Date.now(),
      last_seen: Date.now(),
    });
    device.blocked_devices_index = Date.now();
    return true;
  } else if (content.hasOwnProperty('device_configs') &&
           content.device_configs.hasOwnProperty('mac') &&
           content.device_configs.mac.match(util.macRegex) &&
           content.device_configs.hasOwnProperty('block') &&
           content.device_configs.block === true) {
    tr069Changes.changeBlockedDevices = true;
    if (!rollback.lan_devices) {
      rollback.lan_devices = util.deepCopyObject(device.lan_devices);
    }
    let blackMacDevice = device.use_tr069 ?
      content.device_configs.mac.toUpperCase() :
      content.device_configs.mac.toLowerCase();
    for (let idx = 0; idx < device.lan_devices.length; idx++) {
      if (device.lan_devices[idx].mac == blackMacDevice) {
        device.lan_devices[idx].last_seen = Date.now();
        device.lan_devices[idx].is_blocked = true;
        device.blocked_devices_index = Date.now();
        return true;
      }
    }
    // Mac address not found
    device.lan_devices.push({
      mac: blackMacDevice,
      name: content.device_configs.name,
      is_blocked: true,
      first_seen: Date.now(),
      last_seen: Date.now(),
    });
    device.blocked_devices_index = Date.now();
    return true;
  }
  return false;
};

let processWhitelist = function(content, device, rollback, tr069Changes) {
  // Legacy checks
  if (content.hasOwnProperty('whitelist_device') &&
      content.whitelist_device.hasOwnProperty('mac') &&
      content.whitelist_device.mac.match(util.macRegex)) {
    // Deep copy lan devices for rollback
    if (!rollback.lan_devices) {
      rollback.lan_devices = util.deepCopyObject(device.lan_devices);
    }
    // Search device to unblock
    let whiteMacDevice = device.use_tr069 ?
      content.whitelist_device.mac.toUpperCase() :
      content.whitelist_device.mac.toLowerCase();
    for (let idx = 0; idx < device.lan_devices.length; idx++) {
      if (device.lan_devices[idx].mac == whiteMacDevice) {
        device.lan_devices[idx].last_seen = Date.now();
        if (device.lan_devices[idx].is_blocked) {
          device.lan_devices[idx].is_blocked = false;
          device.blocked_devices_index = Date.now();
          return true;
        } else {
          return false;
        }
      }
    }
  } else if (content.hasOwnProperty('device_configs') &&
           content.device_configs.hasOwnProperty('mac') &&
           content.device_configs.mac.match(util.macRegex) &&
           content.device_configs.hasOwnProperty('block') &&
           content.device_configs.block === false) {
    tr069Changes.changeBlockedDevices = true;
    if (!rollback.lan_devices) {
      rollback.lan_devices = util.deepCopyObject(device.lan_devices);
    }
    let blackMacDevice = device.use_tr069 ?
      content.device_configs.mac.toUpperCase() :
      content.device_configs.mac.toLowerCase();
    for (let idx = 0; idx < device.lan_devices.length; idx++) {
      if (device.lan_devices[idx].mac == blackMacDevice) {
        device.lan_devices[idx].last_seen = Date.now();
        device.lan_devices[idx].is_blocked = false;
        device.blocked_devices_index = Date.now();
        return true;
      }
    }
  }
  // Mac address not found or error parsing content
  return false;
};

let processDeviceInfo = function(content, device, rollback, tr069Changes) {
  if (content.hasOwnProperty('device_configs') &&
      content.device_configs.hasOwnProperty('mac') &&
      content.device_configs.mac.match(util.macRegex)) {
    // Deep copy lan devices for rollback
    if (!rollback.lan_devices) {
      rollback.lan_devices = util.deepCopyObject(device.lan_devices);
    }
    let newLanDevice = true;
    let configs = content.device_configs;
    let macDevice = '';
    if (device.use_tr069) {
      macDevice = configs.mac.toUpperCase();
    } else {
      macDevice = configs.mac.toLowerCase();
    }
    for (let idx = 0; idx < device.lan_devices.length; idx++) {
      if (device.lan_devices[idx].mac == macDevice) {
        if (configs.name) {
          device.lan_devices[idx].name = configs.name;
        }
        device.lan_devices[idx].last_seen = Date.now();
        newLanDevice = false;
        if (configs.hasOwnProperty('rules')) {
          let rules = configs.rules;
          device.lan_devices[idx].port = rules.map((rule)=>rule.in);
          device.lan_devices[idx].router_port = rules.map((rule)=>rule.out);
          device.forward_index = Date.now();
        }
      }
    }
    if (newLanDevice) {
      let rules = (configs.hasOwnProperty('rules')) ? configs.rules : [];
      device.lan_devices.push({
        mac: macDevice,
        name: configs.name,
        dmz: configs.dmz,
        port: rules.map((rule)=>rule.in),
        router_port: rules.map((rule)=>rule.out),
        first_seen: Date.now(),
        last_seen: Date.now(),
      });
    }
    return true;
  }
  return false;
};

let processUpnpInfo = function(content, device, rollback, tr069Changes) {
  if (content.hasOwnProperty('device_configs') &&
      content.device_configs.hasOwnProperty('upnp_allow') &&
      content.device_configs.hasOwnProperty('mac') &&
      content.device_configs.mac.match(util.macRegex)) {
    // Deep copy lan devices for rollback
    if (!rollback.lan_devices) {
      rollback.lan_devices = util.deepCopyObject(device.lan_devices);
    }
    // Deep copy upnp requests for rollback
    rollback.upnp_requests = util.deepCopyObject(device.upnp_requests);
    let newLanDevice = true;
    let macDevice = device.use_tr069 ?
      content.device_configs.mac.toUpperCase() :
      content.device_configs.mac.toLowerCase();
    let allow = 'none';
    for (let idx = 0; idx < device.lan_devices.length; idx++) {
      if (device.lan_devices[idx].mac == macDevice) {
        allow = 'none';
        if (content.device_configs.upnp_allow === true) {
          allow = 'accept';
        } else if (content.device_configs.upnp_allow === false) {
          // Reject only if previous value was "accept" or if notification
          if (content.device_configs.upnp_notification ||
              device.lan_devices[idx].upnp_permission === 'accept') {
            allow = 'reject';
          }
        }
        device.lan_devices[idx].upnp_permission = allow;
        device.lan_devices[idx].last_seen = Date.now();
        device.upnp_devices_index = Date.now();
        newLanDevice = false;
      }
    }
    if (newLanDevice) {
      device.lan_devices.push({
        mac: macDevice,
        upnp_permission: allow,
        first_seen: Date.now(),
        last_seen: Date.now(),
      });
    }
    device.upnp_requests = device.upnp_requests.filter((r) => r !== macDevice);
    return true;
  }
  return false;
};

let processAll = function(content, device, rollback, tr069Changes) {
  processWifi(content, device, rollback, tr069Changes);
  processPassword(content, device, rollback, tr069Changes);
  processBlacklist(content, device, rollback, tr069Changes);
  processWhitelist(content, device, rollback, tr069Changes);
  processDeviceInfo(content, device, rollback, tr069Changes);
  processUpnpInfo(content, device, rollback, tr069Changes);
};

let formatDevices = function(device) {
  let allRules = [];
  let lanDevices = device.lan_devices.filter((device)=>{
    return !deviceHandlers.isDeviceTooOld(device.last_seen);
  }).map((lanDevice)=>{
    let name = lanDevice.mac;
    if (lanDevice.name) {
      name = lanDevice.name;
    } else if (lanDevice.dhcp_name && lanDevice.dhcp_name !== '!') {
      name = lanDevice.dhcp_name;
    }
    let rules = [];
    if (device.use_tr069) {
      // Use port mapping structure instead of lan_devices, since rules can be
      // bound to an ip that is not registered
      rules = device.port_mapping.filter((r)=>r.ip === lanDevice.ip);
      if (typeof rules === 'undefined') {
        rules = [];
      }
      allRules = allRules.concat(rules);
    } else {
      // Use legacy lan_devices structure
      let numRules = lanDevice.port.length;
      for (let i = 0; i < numRules; i++) {
        rules.push({
          in: lanDevice.port[i],
          out: lanDevice.router_port[i],
        });
        allRules.push({
          in: lanDevice.port[i],
          out: lanDevice.router_port[i],
        });
      }
    }
    let upnpPermission = lanDevice.upnp_permission === 'accept';
    let signal = 'none';
    if (lanDevice.wifi_snr >= 35) signal = 'excellent';
    else if (lanDevice.wifi_snr >= 25) signal = 'good';
    else if (lanDevice.wifi_snr >= 15) signal = 'ok';
    else if (lanDevice.wifi_snr >= 0) signal = 'bad';
    let isWifi = (lanDevice.conn_type === 1);
    return {
      mac: lanDevice.mac,
      id: (!lanDevice.dhcp_name ||
           lanDevice.dhcp_name === '!') ? '*' : lanDevice.dhcp_name,
      ip: lanDevice.ip,
      blocked: lanDevice.is_blocked,
      name: name,
      dmz: lanDevice.dmz,
      rules: rules,
      online: deviceHandlers.isOnline(lanDevice.last_seen),
      signal: signal,
      is_wifi: isWifi,
      upnp_allow: upnpPermission,
    };
  });
  // Add port forward rules not bound to a device to allRules structure
  if (device.use_tr069) {
    device.port_mapping.forEach((rule)=>{
      // Check if rule ip has a matching device
      if (lanDevices.find((d)=>d.ip === rule.ip)) return;
      // No matchign device, add rule
      allRules.push(rule);
    });
  }
  return {
    devices: lanDevices,
    rules: allRules,
  };
};

const makeDeviceBackupData = function(device, config, certFile) {
  let now = new Date();
  let formattedNow = '';
  formattedNow += now.getDate() + '/';
  formattedNow += now.getMonth()+1 + '/';
  formattedNow += now.getFullYear() + ' às ';
  let hours = now.getHours();
  hours = (hours < 10) ? '0'+hours : hours;
  formattedNow += hours + ':';
  let minutes = now.getMinutes();
  minutes = (minutes < 10) ? '0'+minutes : minutes;
  formattedNow += minutes;
  let customFields = {};
  let deviceCustomFields = device.custom_tr069_fields;
  if (deviceCustomFields && deviceCustomFields.intelbras_omci_mode) {
    customFields.intelbrasOmciMode = deviceCustomFields.intelbras_omci_mode;
  }
  if (
    deviceCustomFields && typeof deviceCustomFields.voip_enabled === 'boolean'
  ) {
    customFields.voipEnabled = deviceCustomFields.voip_enabled;
  }
  if (
    deviceCustomFields &&
    typeof deviceCustomFields.ipv6_enabled === 'boolean' &&
    typeof deviceCustomFields.ipv6_mode === 'string'
  ) {
    customFields.ipv6Enabled = deviceCustomFields.ipv6_enabled;
    customFields.ipv6Mode = deviceCustomFields.ipv6_mode;
  }
  return {
    timestamp: formattedNow,
    model: device.model,
    firmware: device.version,
    mac: device._id,
    serial: device.serial_tr069,
    alt_uid: (device.alt_uid_tr069) ? device.alt_uid_tr069 : '',
    wan: {
      conn_type: device.connection_type,
      pppoe_user: device.pppoe_user,
      pppoe_password: device.pppoe_password,
      vlan: device.wan_vlan_id,
      mtu: device.wan_mtu,
    },
    tr069: {
      url: config.tr069.server_url,
      interval: parseInt(config.tr069.inform_interval/1000),
      certificate: certFile,
    },
    wifi: getWifiConfig(device),
    remote: config.tr069.remote_access,
    credentials: {
      admin: {
        name: config.tr069.web_login,
        pass: config.tr069.web_password,
      },
      user: {
        name: config.tr069.web_login_user,
        pass: config.tr069.web_password_user,
      },
    },
    customFields: customFields,
  };
};

appDeviceAPIController.registerApp = function(req, res) {
  if (req.body.secret == req.app.locals.secret) {
    DeviceModel.findById(req.body.id, async function(err, matchedDevice) {
      if (err) {
        return res.status(400).json({is_registered: 0});
      }
      if (!matchedDevice) {
        return res.status(404).json({is_registered: 0});
      }
      if (req.body.app_mac) {
        let deviceObj = matchedDevice.lan_devices.find((device)=>{
          return device.mac === req.body.app_mac;
        });
        if (deviceObj && deviceObj.app_uid !== req.body.app_id) {
          deviceObj.app_uid = req.body.app_id;
        } else if (!deviceObj) {
          matchedDevice.lan_devices.push({
            mac: req.body.app_mac,
            app_uid: req.body.app_id,
            first_seen: Date.now(),
            last_seen: Date.now(),
          });
        }
      }
      let appObj = matchedDevice.apps.filter(function(app) {
        return app.id === req.body.app_id;
      });
      if (appObj.length == 0) {
        matchedDevice.apps.push({id: req.body.app_id,
                                 secret: req.body.app_secret});
      } else {
        let objIdx = matchedDevice.apps.indexOf(appObj[0]);
        matchedDevice.apps.splice(objIdx, 1);
        appObj[0].secret = req.body.app_secret;
        matchedDevice.apps.push(appObj[0]);
      }
      try {
        await matchedDevice.save();
        return res.status(200).json({is_registered: 1});
      } catch (err) {
        console.log('Error registering app: ' + err);
        return res.status(500).json({is_registered: 0});
      }
    });
  } else {
    return res.status(401).json({is_registered: 0});
  }
};

appDeviceAPIController.registerPassword = function(req, res) {
  if (req.body.secret == req.app.locals.secret) {
    DeviceModel.findById(req.body.id, async function(err, matchedDevice) {
      if (err) {
        return res.status(400).json({is_registered: 0});
      }
      if (!matchedDevice) {
        return res.status(404).json({is_registered: 0});
      }
      let appObj = matchedDevice.apps.filter(function(app) {
        return app.id === req.body.app_id;
      });
      if (appObj.length == 0) {
        return res.status(404).json({is_set: 0});
      }
      if (appObj[0].secret != req.body.app_secret) {
        return res.status(403).json({is_set: 0});
      }
      matchedDevice.app_password = req.body.router_passwd;
      try {
        await matchedDevice.save();
        return res.status(200).json({is_registered: 1});
      } catch (err) {
        console.log('Error registering password for ' +
                    req.body.id + ': ' + err);
        return res.status(500).json({is_registered: 0});
      }
    });
  } else {
    return res.status(401).json({is_registered: 0});
  }
};

appDeviceAPIController.removeApp = function(req, res) {
  if (req.body.secret == req.app.locals.secret) {
    DeviceModel.findById(req.body.id, async function(err, matchedDevice) {
      if (err) {
        return res.status(400).json({is_unregistered: 0});
      }
      if (!matchedDevice) {
        return res.status(404).json({is_unregistered: 0});
      }
      let appsFiltered = matchedDevice.apps.filter(function(app) {
        return app.id !== req.body.app_id;
      });
      matchedDevice.apps = appsFiltered;
      try {
        await matchedDevice.save();
        return res.status(200).json({is_unregistered: 1});
      } catch (err) {
        console.log('Error removing app for ' +
                    req.body.id + ': ' + err);
        return res.status(200).json({is_unregistered: 0});
      }
    });
  } else {
    return res.status(401).json({is_unregistered: 0});
  }
};

appDeviceAPIController.rebootRouter = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message:
        t('cpeFindError', {errorline: __line})});
    }
    if (!matchedDevice) {
      return res.status(404).json({message:
        t('cpeNotFound', {errorline: __line})});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message:
        t('appNotFound', {errorline: __line})});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message:
        t('appUnauthorized', {errorline: __line})});
    }

    let isDevOn;
    if (matchedDevice.use_tr069) {
      acsController.rebootDevice(matchedDevice);
      isDevOn = true; // We would need to query database to check if online
    } else {
      // Send mqtt message to reboot router
      mqtt.anlixMessageRouterReboot(req.body.id);
      isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
        return map[req.body.id.toUpperCase()];
      });
    }


    return res.status(200).json({
      success: isDevOn,
    });
  });
};

appDeviceAPIController.refreshInfo = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message:
        t('cpeFindError', {errorline: __line})});
    }
    if (!matchedDevice) {
      return res.status(404).json({message:
        t('cpeNotFound', {errorline: __line})});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message:
        t('appNotFound', {errorline: __line})});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message:
        t('appUnauthorized', {errorline: __line})});
    }

    let isDevOn;
    if (req.body.content.do_device_update) {
      if (matchedDevice.use_tr069) {
        acsController.requestConnectedDevices(matchedDevice);
        isDevOn = true;
      } else {
        // Send mqtt message to update devices on flashman db
        mqtt.anlixMessageRouterOnlineLanDevs(req.body.id);
        isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
          return map[req.body.id.toUpperCase()];
        });
      }
    }

    return res.status(200).json({
      has_access: isDevOn,
      devices_timestamp: matchedDevice.last_devices_refresh,
    });
  });
};

appDeviceAPIController.doSpeedtest = function(req, res) {
  DeviceModel.findByMacOrSerial(req.body.id).exec(
  async (err, matchedDevice) => {
    if (err) {
      return res.status(500).json({message:
        t('cpeFindError', {errorline: __line})});
    }
    if (Array.isArray(matchedDevice) && matchedDevice.length > 0) {
      matchedDevice = matchedDevice[0];
    } else {
      return res.status(404).json({success: false,
        message: t('cpeNotFound', {errorline: __line})});
    }
    if (!matchedDevice) {
      return res.status(404).json({message:
        t('cpeNotFound', {errorline: __line})});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message:
        t('appNotFound', {errorline: __line})});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message:
        t('appUnauthorized', {errorline: __line})});
    }

    // Send reply first, then send mqtt message
    let lastMeasureID;
    let lastErrorID;
    let previous = matchedDevice.speedtest_results;
    if (previous.length > 0) {
      lastMeasureID = previous[previous.length - 1]._id;
    } else {
      lastMeasureID = '';
    }
    if (matchedDevice.last_speedtest_error) {
      lastErrorID = matchedDevice.last_speedtest_error.unique_id;
    } else {
      lastErrorID = '';
    }

    const isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
      return map[req.body.id.toUpperCase()];
    });

    res.status(200).json({
      has_access: isDevOn,
      last_uid: lastMeasureID,
      last_error_uid: lastErrorID,
    });

    // Wait for a few seconds so the app can receive the reply
    // We need to do this because the measurement blocks all traffic
    setTimeout(async () => {
      let config;
      try {
        config = await Config.findOne(
          {is_default: true}, {measureServerIP: true, measureServerPort: true},
        ).lean();
        if (!config) throw new Error('Config not found');
      } catch (err) {
        console.log(err.message);
      }

      if (config && config.measureServerIP) {
         if (matchedDevice.use_tr069) {
          matchedDevice.current_speedtest.timestamp = new Date();
          matchedDevice.current_speedtest.user = 'App_Cliente';
          matchedDevice.current_speedtest.stage = 'estimative';
          try {
            await matchedDevice.save();
            acsDiagnosticsHandler.fireSpeedDiagnose(matchedDevice._id);
          } catch (err) {
            console.log('Error speed test procedure: ' + err);
          }
        } else {
          // Send mqtt message to perform speedtest
          let url = config.measureServerIP + ':' + config.measureServerPort;
          mqtt.anlixMessageRouterSpeedTest(req.body.id, url,
                                           {name: 'App_Cliente'});
        }
      }
    }, 1.5*1000);
  });
};

appDeviceAPIController.appSetWifi = function(req, res) {
  appSet(req, res, processWifi);
};

appDeviceAPIController.appSetPassword = function(req, res) {
  appSet(req, res, processPassword);
};

appDeviceAPIController.appSetBlacklist = function(req, res) {
  appSet(req, res, processBlacklist);
};

appDeviceAPIController.appSetWhitelist = function(req, res) {
  appSet(req, res, processWhitelist);
};

appDeviceAPIController.appSetDeviceInfo = function(req, res) {
  appSet(req, res, processDeviceInfo);
};

appDeviceAPIController.appSetConfig = function(req, res) {
  appSet(req, res, processAll);
};

appDeviceAPIController.appGetLoginInfo = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(async (err, matchedDevice) => {
    let config;
    try {
      config = await Config.findOne({is_default: true},
                                    {device_update_schedule: false}).lean();
      if (!config) throw new Error('Config not found');
    } catch (error) {
      console.log(error.message);
    }
    if (err || !config) {
      return res.status(500).json({message:
        t('cpeFindError', {errorline: __line})});
    }
    if (!matchedDevice) {
      return res.status(404).json({message:
        t('cpeNotFound', {errorline: __line})});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({
        message: t('appNotFound', {errorline: __line}),
        secret: true,
      });
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({
        message: t('appUnauthorized', {errorline: __line}),
        secret: true,
      });
    }
    if (req.body.content.password !== matchedDevice.app_password) {
      return res.status(403).json({
        message: t('invalidPassword'),
        password: true,
      });
    }
    if (req.body.content.personalizationHash &&
      config.personalizationHash &&
      config.personalizationHash !==
      req.body.content.personalizationHash) {
      return res.status(403).json({
        message: t('personalizationHasError', {errorline: __line}),
        personalizationHash: true,
        androidLink: config.androidLink,
        iosLink: config.iosLink,
      });
    }

    if (matchedDevice.use_tr069) {
      acsController.requestConnectedDevices(matchedDevice);
    } else {
      // Send mqtt message to update devices on flashman db
      mqtt.anlixMessageRouterOnlineLanDevs(req.body.id);
    }

    // Check if FCM ID has changed or if location info provided, update if so
    let appid = req.body.app_id;
    let fcmid = req.body.content.fcmToken;
    let latitude = req.body.content.latitude;
    let longitude = req.body.content.longitude;
    let lanDevice = matchedDevice.lan_devices.find((d)=>d.app_uid===appid);
    let mustUpdateFCM = (fcmid && lanDevice && fcmid !== lanDevice.fcm_uid);
    let mustUpdateLocation = (
      latitude && longitude && !matchedDevice.stop_coordinates_update
    );
    if (mustUpdateFCM || mustUpdateLocation) {
      // Query again but this time without .lean() so we can edit register
      DeviceModel.findById(req.body.id).exec(async function(err,
                                                            matchedDeviceEdit,
      ) {
        if (err || !matchedDeviceEdit) return;
        if (mustUpdateFCM) {
          let device = matchedDeviceEdit.lan_devices.find(
            (d)=>d.app_uid===appid);
          device.fcm_uid = fcmid;
          device.last_seen = Date.now();
        }
        if (mustUpdateLocation) {
          matchedDeviceEdit.latitude = latitude;
          matchedDeviceEdit.longitude = longitude;
          matchedDeviceEdit.last_location_date = new Date();
        }
        try {
          await matchedDeviceEdit.save();
        } catch (err) {
          console.log('Error saving location or FCM: ' + err);
        }
      });
    }

    // Fetch permissions and wifi configuration from database
    let permissions = DeviceVersion.devicePermissions(matchedDevice);

    permissions.grantWifiBandEdit = (
      permissions.grantWifiBandEdit2 || permissions.grantWifiBandEdit5
    );
    permissions.grantWifiBandRead = (
      permissions.grantWifiBandRead2 || permissions.grantWifiBandRead5
    );
    permissions.grantWifiBand = (
      permissions.grantWifiBandEdit && permissions.grantWifiBandRead
    );

    // Override some permissions if device in bridge mode
    if (matchedDevice.bridge_mode_enabled) {
      permissions.grantPortForward = false;
      permissions.grantPortForwardAsym = false;
      permissions.grantBlockDevices = false;
      permissions.grantUpnp = false;
    }

    let speedtestInfo = {};
    if (config && config.measureServerIP && permissions.grantSpeedTest) {
      speedtestInfo.server = config.measureServerIP;
      speedtestInfo.previous = matchedDevice.speedtest_results;
      speedtestInfo.limit = permissions.grantSpeedTestLimit;
    }

    let wifiConfig = getWifiConfig(matchedDevice);

    let notifications = [];
    matchedDevice.upnp_requests.forEach((mac)=>{
      let upnpDevice = matchedDevice.lan_devices.find((d)=>d.mac===mac);
      if (!upnpDevice) return;
      let name = upnpDevice.upnp_name;
      if (upnpDevice.name) {
        name = upnpDevice.name;
      }
      notifications.push({
        mac: mac,
        name: name,
      });
    });

    let localDevice = matchedDevice.lan_devices.find((device)=>{
      return req.body.app_id === device.app_uid;
    });
    let localMac = localDevice ? localDevice.mac : '';

    let isDevOn;
    if (matchedDevice.use_tr069) {
      isDevOn = true;
    } else {
      isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
        return map[req.body.id.toUpperCase()];
      });
    }

    // -> 'updating registry' scenario
    let checkResponse = deviceHandlers.checkSsidPrefix(
      config, matchedDevice.wifi_ssid, matchedDevice.wifi_ssid_5ghz,
      matchedDevice.isSsidPrefixEnabled);
    let prefixObj = {};
    prefixObj.name = checkResponse.prefix;
    prefixObj.grant = checkResponse.enablePrefix;

    let response = {
      permissions: permissions,
      wifi: wifiConfig,
      localMac: localMac,
      speedtest: speedtestInfo,
      notifications: notifications,
      prefix: prefixObj,
      model: matchedDevice.model,
      version: matchedDevice.version,
      release: matchedDevice.installed_release,
      devices_timestamp: matchedDevice.last_devices_refresh,
      has_access: isDevOn,
      use_tr069: matchedDevice.use_tr069,
      mesh_mode: matchedDevice.mesh_mode,
    };

    try {
      // Only send bakcup for tr069 devices and valid config
      if (matchedDevice.use_tr069 && config.tr069) {
        let certFile = fs.readFileSync('./certs/onu-certs/onuCA.pem', 'utf8');
        response.resetBackup = makeDeviceBackupData(
          matchedDevice, config, certFile,
        );
      }
    } catch (err) {
      // Do nothing if above fails - is not a required step
    }

    return res.status(200).json(response);
  });
};

appDeviceAPIController.appGetVersion = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message:
        t('cpeFindError', {errorline: __line})});
    }
    if (!matchedDevice) {
      return res.status(404).json({message:
        t('cpeNotFound', {errorline: __line})});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message:
        t('appNotFound', {errorline: __line})});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message:
        t('appUnauthorized', {errorline: __line})});
    }

    let permissions = DeviceVersion.devicePermissions(matchedDevice);
    return res.status(200).json({
      permissions: permissions,
    });
  });
};

appDeviceAPIController.appGetDevices = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message:
        t('cpeFindError', {errorline: __line})});
    }
    if (!matchedDevice) {
      return res.status(404).json({message:
        t('cpeNotFound', {errorline: __line})});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message:
        t('appNotFound', {errorline: __line})});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message:
        t('appUnauthorized', {errorline: __line})});
    }

    let devicesInfo = formatDevices(matchedDevice);

    return res.status(200).json({
      devices_timestamp: matchedDevice.last_devices_refresh,
      devices: devicesInfo.devices,
      rules: devicesInfo.rules,
    });
  });
};

appDeviceAPIController.appGetPortForward = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message:
        t('cpeFindError', {errorline: __line})});
    }
    if (!matchedDevice) {
      return res.status(404).json({message:
        t('cpeNotFound', {errorline: __line})});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message:
        t('appNotFound', {errorline: __line})});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message:
        t('appUnauthorized', {errorline: __line})});
    }

    let devices = {};
    matchedDevice.lan_devices.forEach((device)=>{
      let numRules = device.port.length;
      let rules = [];
      for (let i = 0; i < numRules; i++) {
        rules.push({
          in: device.port[i],
          out: device.router_port[i],
        });
      }
      devices[device.mac] = {dmz: device.dmz, rules: rules};
    });

    return res.status(200).json({
      devices: devices,
    });
  });
};

appDeviceAPIController.appGetSpeedtest = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(async (err, matchedDevice) => {
    if (err) {
      return res.status(500).json({message:
        t('cpeFindError', {errorline: __line})});
    }
    if (!matchedDevice) {
      return res.status(404).json({message:
        t('cpeNotFound', {errorline: __line})});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message:
        t('appNotFound', {errorline: __line})});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message:
        t('appUnauthorized', {errorline: __line})});
    }

    let config;
    try {
      config = await Config.findOne(
        {is_default: true}, {measureServerIP: true, measureServerPort: true},
      ).lean();
      if (!config) throw new Error('Config not found');
    } catch (err) {
      console.log(err.message);
      return res.status(500).json({message:
        t('configFindError', {errorline: __line})});
    }

    let reply = {'speedtest': {}};
    if (config && config.measureServerIP) {
      reply.speedtest.server = config.measureServerIP;
    }
    let previous = matchedDevice.speedtest_results;
    reply.speedtest.previous = previous;
    if (previous.length > 0) {
      reply.last_uid = previous[previous.length - 1]._id;
    } else {
      reply.last_uid = '';
    }
    if (matchedDevice.last_speedtest_error) {
      reply.last_error_uid = matchedDevice.last_speedtest_error.unique_id;
      reply.last_error = matchedDevice.last_speedtest_error.error;
    } else {
      reply.last_error_uid = '';
      reply.last_error = '';
    }

    return res.status(200).json(reply);
  });
};

appDeviceAPIController.appGetWpsState = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message:
        t('cpeFindError', {errorline: __line})});
    }
    if (!matchedDevice) {
      return res.status(404).json({message:
        t('cpeNotFound', {errorline: __line})});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message:
        t('appNotFound', {errorline: __line})});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message:
        t('appUnauthorized', {errorline: __line})});
    }

    return res.status(200).json({
      is_active: matchedDevice.wps_is_active,
      last_conn_date: matchedDevice.wps_last_connected_date,
      last_conn_mac: matchedDevice.wps_last_connected_mac,
    });
  });
};

appDeviceAPIController.resetPassword = function(req, res) {
  if (!req.body.content || !req.body.content.reset_mac ||
      !req.body.content.reset_secret) {
    return res.status(500).json({message:
      t('parametersError', {errorline: __line})});
  }
  DeviceModel.findById(req.body.content.reset_mac).exec(async (err, device) => {
    if (err) {
      return res.status(500).json({message:
        t('cpeFindError', {errorline: __line})});
    }
    if (!device) {
      return res.status(404).json({message:
        t('cpeNotFound', {errorline: __line})});
    }
    let appObj = device.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({
        message: t('appNotFound', {errorline: __line}),
        secret: true,
      });
    }
    if (appObj[0].secret != req.body.content.reset_secret) {
      return res.status(403).json({
        message: t('appUnauthorized', {errorline: __line}),
        secret: true,
      });
    }

    device.app_password = undefined;
    try {
      await device.save();
    } catch (err) {
      console.log('Error resetting app password: ' + err);
      return res.status(500).json({
        message: t('saveError', {errorline: __line}),
        secret: true,
      });
    }
    if (!device.use_tr069) {
      mqtt.anlixMessageRouterResetApp(req.body.content.reset_mac.toUpperCase());
    }
    return res.status(200).json({success: true});
  });
};

appDeviceAPIController.activateWpsButton = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message:
        t('cpeFindError', {errorline: __line})});
    }
    if (!matchedDevice) {
      return res.status(404).json({message:
        t('cpeNotFound', {errorline: __line})});
    }
    let appObj = matchedDevice.apps.find(function(app) {
      return app.id === req.body.app_id;
    });
    if (typeof appObj === 'undefined') {
      return res.status(404).json({message:
        t('appNotFound', {errorline: __line})});
    }
    if (appObj.secret !== req.body.app_secret) {
      return res.status(403).json({message:
        t('appUnauthorized', {errorline: __line})});
    }
    if (!('content' in req.body) || !('activate' in req.body.content) ||
        !(typeof req.body.content.activate === 'boolean')
    ) {
      return res.status(500).json({message:
        t('requestError', {errorline: __line})});
    }

    // Send mqtt message to activate WPS push button
    mqtt.anlixMessageRouterWpsButton(req.body.id, req.body.content.activate);

    const isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
      return map[req.body.id.toUpperCase()];
    });

    return res.status(200).json({
      success: isDevOn,
    });
  });
};

appDeviceAPIController.getDevicesByWifiData = async function(req, res) {
  if (!util.isJSONObject(req.body.content)) {
    return res.status(500).json({message:
      t('jsonError', {errorline: __line})});
  }
  // Get global config tr069 cpe login credentials
  let config = await Config.findOne(
    {is_default: true}, {tr069: true, ssidPrefix: true},
  ).lean().catch((err)=>{
    console.error('Error fetching config: ' + err);
  });
  let configUser;
  let configPassword;
  if (config) {
    configUser = config.tr069.web_login;
    configPassword = config.tr069.web_password;
  } else {
    configUser = '';
    configPassword = '';
  }
  // Query database for devices with matching SSID/BSSID
  let targetSSID = req.body.content.ssid;
  let targetBSSID = req.body.content.bssid.toUpperCase();
  let ssidPrefix = (config.ssidPrefix) ? config.ssidPrefix : '';
  let noPrefixTargetSSID = deviceHandlers.cleanAndCheckSsid(
    ssidPrefix, targetSSID,
  ).ssid;
  let query = {
    'use_tr069': true,
    '$or': [
      {wifi_ssid: targetSSID},
      {wifi_ssid: noPrefixTargetSSID},
      {wifi_ssid_5ghz: targetSSID},
      {wifi_ssid_5ghz: noPrefixTargetSSID},
      {wifi_bssid: targetBSSID},
      {wifi_bssid_5ghz: targetBSSID},
    ],
  };
  let projection = {_id: 1, model: 1, version: 1, pending_app_secret: 1};
  DeviceModel.find(query, projection).exec(function(err, matchedDevices) {
    if (err) {
      return res.status(500).json({'message':
        t('cpeFindError', {errorline: __line})});
    }
    // Generate a new secret for app
    let newSecret = crypt.randomBytes(20).toString('base64');
    let foundDevices = matchedDevices.map((device) => {
      // Save secret as a pending secret for devices
      device.pending_app_secret = newSecret;
      try {
        device.save();
      } catch (err) {
        console.log('Error saving pending secret of device: ' + err);
      }
      // Format data for app
      let result = {
        mac: device._id,
        model: device.model,
        firmwareVer: device.version,
      };
      if (configUser) {
        result.customLogin = configUser;
      }
      if (configPassword) {
        result.customPassword = configPassword;
      }
      return result;
    });
    return res.status(200).json({
      'secret': newSecret,
      'foundDevices': foundDevices,
    });
  });
};

appDeviceAPIController.validateDeviceSerial = function(req, res) {
  if (!util.isJSONObject(req.body.content)) {
    return res.status(500).json({message:
      t('jsonError', {errorline: __line})});
  }
  let serial = req.body.content.serial;
  let query = {
    '$or': [
      {serial_tr069: serial},
      {alt_uid_tr069: serial},
    ],
  };
  let altSerial = req.body.content.alt_serial;
  if (altSerial) {
    query['$or'].push({serial_tr069: altSerial});
  }
  DeviceModel.find(query).exec(async function(err, matchedDevices) {
    if (err) {
      return res.status(500).json({'message':
        t('cpeFindError', {errorline: __line})});
    }
    if (!matchedDevices || matchedDevices.length === 0) {
      return res.status(404).json({'message':
        t('cpeNotFound', {errorline: __line})});
    }
    let device = matchedDevices[0];
    if (device.pending_app_secret === '' ||
        device.pending_app_secret !== req.body.content.secret) {
      return res.status(403).json({'message':
        t('secretInvalid', {errorline: __line})});
    }
    let appObj = device.apps.filter((app) => app.id === req.body.app_id);
    let newEntry = {
      id: req.body.app_id,
      secret: req.body.content.secret,
    };
    if (appObj.length == 0) {
      device.apps.push(newEntry);
    } else {
      device.apps = device.apps.map((app) => {
        // Change old entry to new entry if ids match
        if (app.id === req.body.app_id) {
          return newEntry;
        }
        // Return old entry otherwise
        return app;
      });
    }
    // Clear pending secret and save data
    device.pending_app_secret = '';
    try {
      await device.save();
    } catch (err) {
      console.log('Error removing pending secret of device: ' + err);
      return res.status(500).json({
        message: t('saveError', {errorline: __line}),
      });
    }
    // Build hard reset backup structure for client app
    let config = await Config.findOne(
      {is_default: true}, 'tr069',
    ).lean().exec().catch((err) => err);
    let response = {
      serialOk: true,
      hasPassword: (device.app_password) ? true : false, // cast to bool
    };
    try {
      if (config.tr069) {
        let certFile = fs.readFileSync('./certs/onu-certs/onuCA.pem', 'utf8');
        response.resetBackup = makeDeviceBackupData(device, config, certFile);
      }
    } catch (err) {
      // Do nothing if above fails - is not a required step
    }
    return res.status(200).json(response);
  });
};

appDeviceAPIController.appSetPasswordFromApp = function(req, res) {
  if (!util.isJSONObject(req.body.content)) {
    return res.status(500).json({message:
      t('jsonError', {errorline: __line})});
  }
  let query = req.body.id;
  let projection = {_id: 1, app_password: 1, apps: 1};
  DeviceModel.findById(query, projection).exec(async function(err,
                                                              matchedDevice,
  ) {
    if (err) {
      return res.status(500).json({message:
        t('cpeFindError', {errorline: __line})});
    }
    if (!matchedDevice) {
      return res.status(404).json({message:
        t('cpeNotFound', {errorline: __line})});
    }
    let appObj;
    if (matchedDevice.apps) {
      appObj = matchedDevice.apps.find((app) => app.id === req.body.app_id);
    }
    if (typeof appObj === 'undefined') {
      return res.status(403).json({message:
        t('appNotFound', {errorline: __line})});
    }
    if (appObj.secret !== req.body.app_secret) {
      return res.status(403).json({message:
        t('appUnauthorized', {errorline: __line})});
    }
    let content = req.body.content;
    let newPassword = (content.password) ? content.password : '';
    if (newPassword === '') {
      return res.status(200).json({registerOK: false});
    }
    matchedDevice.app_password = newPassword;
    try {
      await matchedDevice.save();
    } catch (err) {
      console.log('Error saving app password: ' + err);
      return res.status(500).json({
        message: t('saveError', {errorline: __line}),
      });
    }
    return res.status(200).json({registerOK: true});
  });
};

appDeviceAPIController.appSetPortForward = function(req, res) {
  if (!util.isJSONObject(req.body.content)) {
    return res.status(500).json({message:
      t('jsonError', {errorline: __line})});
  }
  let query = req.body.id;
  DeviceModel.findById(query).exec(async function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message:
        t('cpeFindError', {errorline: __line})});
    }
    if (!matchedDevice) {
      return res.status(404).json({message:
        t('cpeNotFound', {errorline: __line})});
    }
    if (!matchedDevice.use_tr069) {
      return res.status(403).json({message:
        t('cpeUnauthorized', {errorline: __line})});
    }
    let appObj;
    if (matchedDevice.apps) {
      appObj = matchedDevice.apps.find((app) => app.id === req.body.app_id);
    }
    if (typeof appObj === 'undefined') {
      return res.status(403).json({message:
        t('appNotFound', {errorline: __line})});
    }
    if (appObj.secret !== req.body.app_secret) {
      return res.status(403).json({message:
        t('appUnauthorized', {errorline: __line})});
    }
    let content = req.body.content;
    if (content.rules && content.rules.constructor === Array) {
      let oldLength = matchedDevice.port_mapping.length;
      let newLength = content.rules.length;
      let diff = newLength - oldLength;
      matchedDevice.port_mapping = content.rules;
      try {
        await matchedDevice.save();
      } catch (err) {
        console.log('Error saving port mapping: ' + err);
        return res.status(500).json({
          message: t('saveError', {errorline: __line}),
        });
      }
      acsPortForwardHandler.changePortForwardRules(matchedDevice, diff);
      return res.status(200).json({'success': true});
    }
    return res.status(500).json({message:
      t('rulesDataInvalid', {errorline: __line})});
  });
};

appDeviceAPIController.fetchBackupForAppReset = async function(req, res) {
  if (!util.isJSONObject(req.body.content)) {
    return res.status(500).json({message:
      t('jsonError', {errorline: __line})});
  }
  let query;
  if (req.body.content.alt_uid) {
    query = {alt_uid_tr069: req.body.content.serial};
  } else {
    query = {serial_tr069: req.body.content.serial};
  }
  try {
    let device = await DeviceModel.findOne(query).lean();
    if (!device) {
      // Device is not registered, cannot reconfigure
      return res.status(200).json({success: true, isRegister: false});
    }
    let config = await Config.findOne(
      {is_default: true}, 'tr069',
    ).exec().catch((err) => err);
    let lastContact = device.last_contact;
    let now = Date.now();
    // do not send that this specific model is online to client app
    // after reset this model still online on flashman because
    // it configuration is not entirely reseted
    let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
    let onlineReset = cpe.modelPermissions().onlineAfterReset;

    if (now - lastContact <= config.tr069.inform_interval && !onlineReset) {
      // Device is online, no need to reconfigure
      return res.status(200).json({
        success: true, isRegister: true, isOnline: true,
      });
    }

    // Build hard reset backup structure for client app
    const certFile = fs.readFileSync('./certs/onu-certs/onuCA.pem', 'utf8');
    const resetBackup = makeDeviceBackupData(device, config, certFile);
    return res.status(200).json({
      success: true,
      isRegister: true,
      isOnline: false,
      resetBackup: resetBackup,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({success: false});
  }
};

appDeviceAPIController.signalResetRecover = async function(req, res) {
  if (!util.isJSONObject(req.body.content)) {
    return res.status(500).json({message:
      t('jsonError', {errorline: __line})});
  }
  let query;
  if (req.body.content.alt_uid) {
    query = {alt_uid_tr069: req.body.content.serial};
  } else {
    query = {serial_tr069: req.body.content.serial};
  }
  try {
    let device = await DeviceModel.findOne(query);
    if (!device) {
      // Device is not registered, cannot reconfigure
      return res.status(200).json({success: true, isRegister: false});
    }
    let config = await Config.findOne(
      {is_default: true}, 'tr069',
    ).lean().exec().catch((err) => err);
    let lastContact = device.last_contact;
    let now = Date.now();
    // do not send that this specific model is online to client app
    // after reset this model still online on flashman because
    // it configuration is not entirely reseted
    let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
    let onlineReset = cpe.modelPermissions().onlineAfterReset;

    if (now - lastContact <= 2*config.tr069.inform_interval && !onlineReset) {
      // Device is online, no need to reconfigure
      return res.status(200).json({
        success: true, isRegister: true, isOnline: true,
      });
    }
    // Set device hard reset flag so that it fully syncs on the next inform
    device.recovering_tr069_reset = true;
    device.save();
    return res.status(200).json({
      success: true,
      isRegister: true,
      isOnline: false,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({success: false});
  }
};

module.exports = appDeviceAPIController;
