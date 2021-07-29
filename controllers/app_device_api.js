const DeviceModel = require('../models/device');
const Config = require('../models/config');
const mqtt = require('../mqtts');
const DeviceVersion = require('../models/device_version');
const deviceHandlers = require('./handlers/devices');
const meshHandlers = require('./handlers/mesh');
const util = require('./handlers/util');
const updateController = require('./update_flashman');
const acsController = require('./acs_device_info');
const crypt = require('crypto');

let appDeviceAPIController = {};

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
  DeviceModel.findById(req.body.id, function(err, matchedDevice) {
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
      let tr069Changes = {wan: {}, lan: {}, wifi2: {}, wifi5: {}};

      // Update location data if present
      if (content.latitude && content.longitude) {
        matchedDevice.latitude = content.latitude;
        matchedDevice.longitude = content.longitude;
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

      matchedDevice.save();

      if (matchedDevice.use_tr069) {
        // Simply call ACS function, dont check for parameters done
        acsController.updateInfo(matchedDevice, tr069Changes);
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
          matchedDevice.save();
          return res.status(500).json({is_set: 0});
        }, (rejectedVal)=>{
          doRollback(matchedDevice, rollbackValues);
          matchedDevice.save();
          return res.status(500).json({is_set: 0});
        });
      }
    } else {
      return res.status(500).json({is_set: 0});
    }
  });
};

let processWifi = function(content, device, rollback, tr069Changes) {
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
  if (content.wifi_band) {
    rollback.wifi_band = device.wifi_band;
    device.wifi_band = content.wifi_band;
    tr069Changes.wifi2.band = content.wifi_band;
    updateParameters = true;
  }
  if (content.wifi_mode) {
    rollback.wifi_mode = device.wifi_mode;
    device.wifi_mode = content.wifi_mode;
    tr069Changes.wifi2.mode = content.wifi_mode;
    updateParameters = true;
  }
  if (content.wifi_channel_5ghz) {
    rollback.wifi_channel_5ghz = device.wifi_channel_5ghz;
    device.wifi_channel_5ghz = content.wifi_channel_5ghz;
    tr069Changes.wifi5.channel = content.wifi_channel_5ghz;
    updateParameters = true;
  }
  if (content.wifi_band_5ghz) {
    rollback.wifi_band_5ghz = device.wifi_band_5ghz;
    device.wifi_band_5ghz = content.wifi_band_5ghz;
    tr069Changes.wifi5.band = content.wifi_band_5ghz;
    updateParameters = true;
  }
  if (content.wifi_mode_5ghz) {
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
  let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
  // Legacy checks
  if (content.hasOwnProperty('blacklist_device') &&
      content.blacklist_device.hasOwnProperty('mac') &&
      content.blacklist_device.mac.match(macRegex)) {
    // Deep copy lan devices for rollback
    if (!rollback.lan_devices) {
      rollback.lan_devices = util.deepCopyObject(device.lan_devices);
    }
    // Transform dhcp name in case it's a single *
    let dhcpLease = content.blacklist_device.id;
    if (dhcpLease === '*') dhcpLease = '';
    // Search blocked device
    let blackMacDevice = content.blacklist_device.mac.toLowerCase();
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
           content.device_configs.mac.match(macRegex) &&
           content.device_configs.hasOwnProperty('block') &&
           content.device_configs.block === true) {
    if (!rollback.lan_devices) {
      rollback.lan_devices = util.deepCopyObject(device.lan_devices);
    }
    let blackMacDevice = content.device_configs.mac.toLowerCase();
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
  let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
  // Legacy checks
  if (content.hasOwnProperty('whitelist_device') &&
      content.whitelist_device.hasOwnProperty('mac') &&
      content.whitelist_device.mac.match(macRegex)) {
    // Deep copy lan devices for rollback
    if (!rollback.lan_devices) {
      rollback.lan_devices = util.deepCopyObject(device.lan_devices);
    }
    // Search device to unblock
    let whiteMacDevice = content.whitelist_device.mac.toLowerCase();
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
           content.device_configs.mac.match(macRegex) &&
           content.device_configs.hasOwnProperty('block') &&
           content.device_configs.block === false) {
    if (!rollback.lan_devices) {
      rollback.lan_devices = util.deepCopyObject(device.lan_devices);
    }
    let blackMacDevice = content.device_configs.mac.toLowerCase();
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
  let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
  if (content.hasOwnProperty('device_configs') &&
      content.device_configs.hasOwnProperty('mac') &&
      content.device_configs.mac.match(macRegex)) {
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
  let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
  if (content.hasOwnProperty('device_configs') &&
      content.device_configs.hasOwnProperty('upnp_allow') &&
      content.device_configs.hasOwnProperty('mac') &&
      content.device_configs.mac.match(macRegex)) {
    // Deep copy lan devices for rollback
    if (!rollback.lan_devices) {
      rollback.lan_devices = util.deepCopyObject(device.lan_devices);
    }
    // Deep copy upnp requests for rollback
    rollback.upnp_requests = util.deepCopyObject(device.upnp_requests);
    let newLanDevice = true;
    let macDevice = content.device_configs.mac.toLowerCase();
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

appDeviceAPIController.registerApp = function(req, res) {
  if (req.body.secret == req.app.locals.secret) {
    DeviceModel.findById(req.body.id, function(err, matchedDevice) {
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
      matchedDevice.save();
      return res.status(200).json({is_registered: 1});
    });
  } else {
    return res.status(401).json({is_registered: 0});
  }
};

appDeviceAPIController.registerPassword = function(req, res) {
  if (req.body.secret == req.app.locals.secret) {
    DeviceModel.findById(req.body.id, function(err, matchedDevice) {
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
      matchedDevice.save();
      return res.status(200).json({is_registered: 1});
    });
  } else {
    return res.status(401).json({is_registered: 0});
  }
};

appDeviceAPIController.removeApp = function(req, res) {
  if (req.body.secret == req.app.locals.secret) {
    DeviceModel.findById(req.body.id, function(err, matchedDevice) {
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
      matchedDevice.save();
      return res.status(200).json({is_unregistered: 1});
    });
  } else {
    return res.status(401).json({is_unregistered: 0});
  }
};

appDeviceAPIController.rebootRouter = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'CPE não encontrado'});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message: 'App não encontrado'});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message: 'App não autorizado'});
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
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'CPE não encontrado'});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message: 'App não encontrado'});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message: 'App não autorizado'});
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
  DeviceModel.findById(req.body.id).lean().exec(async (err, matchedDevice) => {
    if (err) {
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'CPE não encontrado'});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message: 'App não encontrado'});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message: 'App não autorizado'});
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
        config = await Config.findOne({is_default: true}).lean();
        if (!config) throw {error: 'Config not found'};
      } catch (err) {
        console.log(err);
      }

      if (config && config.measureServerIP) {
        // Send mqtt message to perform speedtest
        let url = config.measureServerIP + ':' + config.measureServerPort;
        mqtt.anlixMessageRouterSpeedTest(req.body.id, url,
                                         {name: 'App_Cliente'});
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
      config = await Config.findOne({is_default: true}).lean();
      if (!config) throw new Error('Config not found');
    } catch (error) {
      console.log(error);
    }
    if (err || !config) {
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'CPE não encontrado'});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({
        message: 'App não encontrado',
        secret: true,
      });
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({
        message: 'App não autorizado',
        secret: true,
      });
    }
    if (req.body.content.password !== matchedDevice.app_password) {
      return res.status(403).json({
        message: 'Senha errada',
        password: true,
      });
    }
    if (req.body.content.personalizationHash &&
      config.personalizationHash &&
      config.personalizationHash !==
      req.body.content.personalizationHash) {
      return res.status(403).json({
        message: 'Erro na hash de personalização',
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
    let mustUpdateLocation = (latitude && longitude);
    if (mustUpdateFCM || mustUpdateLocation) {
      // Query again but this time without .lean() so we can edit register
      DeviceModel.findById(req.body.id).exec(function(err, matchedDeviceEdit) {
        if (err || !matchedDeviceEdit) return;
        if (mustUpdateFCM) {
          let device = matchedDeviceEdit.lan_devices.find((d)=>d.app_uid===appid);
          device.fcm_uid = fcmid;
          device.last_seen = Date.now();
        }
        if (mustUpdateLocation) {
          matchedDeviceEdit.latitude = latitude;
          matchedDeviceEdit.longitude = longitude;
        }
        matchedDeviceEdit.save();
      });
    }

    // Fetch permissions and wifi configuration from database
    let permissions = DeviceVersion.findByVersion(
      matchedDevice.version,
      matchedDevice.wifi_is_5ghz_capable,
      matchedDevice.model,
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

    let prefixObj = {};
    prefixObj.name = await updateController.
      getSsidPrefix(matchedDevice.isSsidPrefixEnabled);
    prefixObj.grant = matchedDevice.isSsidPrefixEnabled;

    return res.status(200).json({
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
    });
  });
};

appDeviceAPIController.appGetVersion = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'CPE não encontrado'});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message: 'App não encontrado'});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message: 'App não autorizado'});
    }

    let permissions = DeviceVersion.findByVersion(
      matchedDevice.version,
      matchedDevice.wifi_is_5ghz_capable,
      matchedDevice.model,
    );
    return res.status(200).json({
      permissions: permissions,
    });
  });
};

appDeviceAPIController.appGetDevices = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'CPE não encontrado'});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message: 'App não encontrado'});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message: 'App não autorizado'});
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
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'CPE não encontrado'});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message: 'App não encontrado'});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message: 'App não autorizado'});
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
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'CPE não encontrado'});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message: 'App não encontrado'});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message: 'App não autorizado'});
    }

    let config;
    try {
      config = await Config.findOne({is_default: true}).lean();
      if (!config) throw new Error('Config not found');
    } catch (err) {
      console.log(err);
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
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'CPE não encontrado'});
    }
    let appObj = matchedDevice.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({message: 'App não encontrado'});
    }
    if (appObj[0].secret != req.body.app_secret) {
      return res.status(403).json({message: 'App não autorizado'});
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
    return res.status(500).json({message: 'Erro nos parâmetros'});
  }
  DeviceModel.findById(req.body.content.reset_mac).exec(async (err, device) => {
    if (err) {
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!device) {
      return res.status(404).json({message: 'Device não encontrado'});
    }
    let appObj = device.apps.filter(function(app) {
      return app.id === req.body.app_id;
    });
    if (appObj.length == 0) {
      return res.status(404).json({
        message: 'App não encontrado',
        secret: true,
      });
    }
    if (appObj[0].secret != req.body.content.reset_secret) {
      return res.status(403).json({
        message: 'App não autorizado',
        secret: true,
      });
    }

    device.app_password = undefined;
    await device.save();
    if (!device.use_tr069) {
      mqtt.anlixMessageRouterResetApp(req.body.content.reset_mac.toUpperCase());
    }

    return res.status(200).json({success: true});
  });
};

appDeviceAPIController.activateWpsButton = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'CPE não encontrado'});
    }
    let appObj = matchedDevice.apps.find(function(app) {
      return app.id === req.body.app_id;
    });
    if (typeof appObj === 'undefined') {
      return res.status(404).json({message: 'App não encontrado'});
    }
    if (appObj.secret !== req.body.app_secret) {
      return res.status(403).json({message: 'App não autorizado'});
    }
    if (!('content' in req.body) || !('activate' in req.body.content) ||
        !(typeof req.body.content.activate === 'boolean')
    ) {
      return res.status(500).json({message: 'Erro na requisição'});
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
    return res.status(500).json({message: 'JSON recebido não é válido'});
  }
  // Get global config tr069 cpe login credentials
  let config = await Config.findOne({is_default: true}).lean().catch((err)=>{
    console.err('Error fetching config: ' + err);
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
  let query = {
    use_tr069: true,
    '$or': [
      {wifi_ssid: targetSSID},
      {wifi_ssid_5ghz: targetSSID},
      {wifi_bssid: targetBSSID},
      {wifi_bssid_5ghz: targetBSSID},
    ],
  };
  let projection = {_id: 1, model: 1, version: 1, pending_app_secret:1};
  DeviceModel.find(query, projection).exec(function(err, matchedDevices) {
    if (err) {
      return res.status(500).json({'message': 'Erro interno'});
    }
    // Generate a new secret for app
    let newSecret = crypt.randomBytes(20).toString('base64');
    let foundDevices = matchedDevices.map((device) => {
      // Save secret as a pending secret for devices
      device.pending_app_secret = newSecret;
      device.save();
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
    return res.status(500).json({message: 'JSON recebido não é válido'});
  }
  let query = req.body.content.mac;
  let projection = {
    _id: 1, pending_app_secret:1, serial_tr069: 1, apps: 1, app_password: 1
  };
  DeviceModel.findById(query, projection, function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({'message': 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({'message': 'CPE não encontrado'});
    }
    if (matchedDevice.pending_app_secret === '' ||
        matchedDevice.pending_app_secret !== req.body.content.secret) {
      return res.status(403).json({'message': 'Secret inválido'});
    }
    if (matchedDevice.serial_tr069 !== req.body.content.serial) {
      return res.status(403).json({'message': 'Serial inválido'});
    }
    let appObj = matchedDevice.apps.filter((app) => app.id === req.body.app_id);
    let newEntry = {
      id: req.body.app_id,
      secret: req.body.content.secret,
    };
    if (appObj.length == 0) {
      matchedDevice.apps.push(newEntry);
    } else {
      matchedDevice.apps = matchedDevice.apps.map((app) => {
        // Change old entry to new entry if ids match
        if (app.id === req.body.app_id) {
          return newEntry;
        }
        // Return old entry otherwise
        return app;
      });
    }
    // Clear pending secret and save data
    matchedDevice.pending_app_secret = '';
    matchedDevice.save();
    return res.status(200).json({
      serialOk: true,
      hasPassword: (matchedDevice.app_password) ? true : false, // cast to bool
    });
  });
};

appDeviceAPIController.appSetPasswordFromApp = function(req, res) {
  if (!util.isJSONObject(req.body.content)) {
    return res.status(500).json({message: 'JSON recebido não é válido'});
  }
  let query = req.body.id;
  let projection = {_id: 1, app_password: 1, apps: 1};
  DeviceModel.findById(query, projection).exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'CPE não encontrado'});
    }
    let appObj;
    if (matchedDevice.apps) {
      appObj = matchedDevice.apps.find((app) => app.id === req.body.app_id);
    }
    if (typeof appObj === 'undefined') {
      return res.status(403).json({message: 'App não encontrado'});
    }
    if (appObj.secret !== req.body.app_secret) {
      return res.status(403).json({message: 'App não autorizado'});
    }
    let content = req.body.content;
    let newPassword = (content.password) ? content.password : '';
    if (newPassword === '') {
      return res.status(200).json({registerOK: false});
    }
    matchedDevice.app_password = newPassword;
    matchedDevice.save();
    return res.status(200).json({registerOK: true});
  });
};

appDeviceAPIController.appSetPortForward = function(req, res) {
  if (!util.isJSONObject(req.body.content)) {
    return res.status(500).json({message: 'JSON recebido não é válido'});
  }
  let query = req.body.id;
  DeviceModel.findById(query).exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'CPE não encontrado'});
    }
    if (!matchedDevice.use_tr069) {
      return res.status(403).json({message: 'CPE não autorizado'});
    }
    let appObj;
    if (matchedDevice.apps) {
      appObj = matchedDevice.apps.find((app) => app.id === req.body.app_id);
    }
    if (typeof appObj === 'undefined') {
      return res.status(403).json({message: 'App não encontrado'});
    }
    if (appObj.secret !== req.body.app_secret) {
      return res.status(403).json({message: 'App não autorizado'});
    }
    let content = req.body.content;
    if (content.rules && content.rules.constructor === Array) {
      let oldLength = matchedDevice.port_mapping.length;
      let newLength = content.rules.length;
      let diff = newLength - oldLength;
      matchedDevice.port_mapping = content.rules;
      matchedDevice.save();
      acsController.changePortForwardRules(matchedDevice, diff);
      return res.status(200).json({'success': true});
    }
    return res.status(500).json({message: 'Dados de regras inválidos'});
  });
};

module.exports = appDeviceAPIController;
