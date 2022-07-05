/* global __line */
const DeviceModel = require('../models/device');
const Config = require('../models/config');
const Notification = require('../models/notification');
const mqtt = require('../mqtts');
const request = require('request-promise-native');
const sio = require('../sio');
const Validator = require('../public/javascripts/device_validator');
const messaging = require('./messaging');
const updateScheduler = require('./update_scheduler');
const DeviceVersion = require('../models/device_version');
const vlanController = require('./vlan');
const meshHandlers = require('./handlers/mesh');
const deviceHandlers = require('./handlers/devices');
const Firmware = require('../models/firmware');
const util = require('./handlers/util');
const crypto = require('crypto');
const dataCollectingController = require('./data_collecting');
const t = require('./language').i18next.t;

const Mutex = require('async-mutex').Mutex;

let mutex = new Mutex();
let mutexRelease = null;

let deviceInfoController = {};

const genericValidate = function(field, func, key, minlength, errors) {
  let validField = func(field, minlength);
  if (!validField.valid) {
    validField.err.forEach(function(error) {
      let obj = {};
      obj[key] = error;
      errors.push(obj);
    });
  }
};

const createRegistry = async function(req, res) {
  if (typeof req.body.id == 'undefined') {
    return res.status(400).end();
  }

  const validator = new Validator();
  const macAddr = req.body.id.trim().toUpperCase();

  let errors = [];
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  let wanIp = util.returnObjOrEmptyStr(req.body.wan_ip).trim();
  let wanIpv6 = util.returnObjOrEmptyStr(req.body.wan_ipv6).trim();
  let wanSpeed = util.returnObjOrEmptyStr(req.body.wan_negociated_speed).trim();
  let wanDuplex =
    util.returnObjOrEmptyStr(req.body.wan_negociated_duplex).trim();
  let installedRelease = util.returnObjOrEmptyStr(req.body.release_id).trim();
  let model = util.returnObjOrEmptyStr(req.body.model).trim().toUpperCase() +
              util.returnObjOrEmptyStr(req.body.model_ver).trim().toUpperCase();
  let version = util.returnObjOrEmptyStr(req.body.version).trim();
  let connectionType =
    util.returnObjOrEmptyStr(req.body.connection_type).trim();
  let pppoeUser = util.returnObjOrEmptyStr(req.body.pppoe_user).trim();
  let pppoePassword = util.returnObjOrEmptyStr(req.body.pppoe_password).trim();
  let lanSubnet = util.returnObjOrEmptyStr(req.body.lan_addr).trim();
  let lanNetmask = parseInt(util.returnObjOrNum(req.body.lan_netmask, 24));
  let ssid = util.returnObjOrEmptyStr(req.body.wifi_ssid).trim();
  let password = util.returnObjOrEmptyStr(req.body.wifi_password).trim();
  let channel = util.returnObjOrEmptyStr(req.body.wifi_channel).trim();
  let band = util.returnObjOrEmptyStr(req.body.wifi_band).trim();
  let mode = util.returnObjOrEmptyStr(req.body.wifi_mode).trim();
  let power = parseInt(util.returnObjOrNum(req.body.wifi_power, 100));
  let wifiState = parseInt(util.returnObjOrNum(req.body.wifi_state, 1));
  let wifiHidden = parseInt(util.returnObjOrNum(req.body.wifi_hidden, 0));
  let ssid5ghz = util.returnObjOrEmptyStr(req.body.wifi_ssid_5ghz).trim();
  let password5ghz =
    util.returnObjOrEmptyStr(req.body.wifi_password_5ghz).trim();
  let channel5ghz = util.returnObjOrEmptyStr(req.body.wifi_channel_5ghz).trim();
  let band5ghz = util.returnObjOrStr(req.body.wifi_band_5ghz, 'VHT80').trim();
  let mode5ghz = util.returnObjOrStr(req.body.wifi_mode_5ghz, '11ac').trim();
  let power5ghz = parseInt(util.returnObjOrNum(req.body.wifi_power_5ghz, 100));
  let wifiState5ghz =
    parseInt(util.returnObjOrNum(req.body.wifi_state_5ghz, 1));
  let wifiHidden5ghz =
    parseInt(util.returnObjOrNum(req.body.wifi_hidden_5ghz, 0));
  let pppoe = (pppoeUser !== '' && pppoePassword !== '');
  let flmUpdater = util.returnObjOrEmptyStr(req.body.flm_updater).trim();
  let is5ghzCapable =
    (util.returnObjOrEmptyStr(req.body.wifi_5ghz_capable).trim() == '1');
  let sysUpTime = parseInt(util.returnObjOrNum(req.body.sysuptime, 0));
  let wanUpTime = parseInt(util.returnObjOrNum(req.body.wanuptime, 0));
  let wanIpv6Enabled = parseInt(util.returnObjOrNum(req.body.ipv6_enabled, 2));
  let wpsState = (parseInt(util.returnObjOrNum(req.body.wpsstate, 0)) === 1);
  let bridgeEnabled = parseInt(util.returnObjOrNum(req.body.bridge_enabled, 0));
  let bridgeSwitchDisable =
    parseInt(util.returnObjOrNum(req.body.bridge_switch_disable, 0));
  let bridgeFixIP = util.returnObjOrEmptyStr(req.body.bridge_fix_ip).trim();
  let bridgeFixGateway =
    util.returnObjOrEmptyStr(req.body.bridge_fix_gateway).trim();
  let bridgeFixDNS = util.returnObjOrEmptyStr(req.body.bridge_fix_dns).trim();
  let meshMode = parseInt(util.returnObjOrNum(req.body.mesh_mode, 0));
  let bssidMesh2 =
    util.returnObjOrEmptyStr(req.body.bssid_mesh2).trim().toUpperCase();
  let bssidMesh5 =
    util.returnObjOrEmptyStr(req.body.bssid_mesh5).trim().toUpperCase();
  let vlan = util.returnObjOrEmptyStr(req.body.vlan);
  let vlanFiltered;
  let vlanDidChange = false;
  if (vlan !== '') {
    let vlanConverted = vlanController.convertDeviceVlan(model, vlan);
    let vlanInfo = await vlanController.getValidVlan(model, vlanConverted);
    if (vlanInfo.success) {
      vlanFiltered = Array.from(vlanInfo.vlan);
      if (vlanInfo.didChange) {
        vlanDidChange = true;
      }
    } else {
      console.log('Error creating entry: ' + res);
      return res.status(500).end();
    }
  }
  let vlanParsed;
  if (vlanFiltered !== undefined) {
    vlanParsed = vlanFiltered.map((el) => JSON.parse(el));
  }

  let sentWifiLastChannel =
    util.returnObjOrEmptyStr(req.body.wifi_curr_channel).trim();
  let sentWifiLastChannel5G =
    util.returnObjOrEmptyStr(req.body.wifi_curr_channel_5ghz).trim();
  let sentWifiLastBand =
    util.returnObjOrEmptyStr(req.body.wifi_curr_band).trim();
  let sentWifiLastBand5G =
    util.returnObjOrEmptyStr(req.body.wifi_curr_band_5ghz).trim();
  // The syn came from flashbox keepalive procedure
  // Keepalive is designed to failsafe existing devices and not create new ones
  if (flmUpdater == '0') {
    return res.status(400).end();
  }

  let matchedConfig =
    await Config.findOne({is_default: true},
                         {device_update_schedule: false}).lean().catch(
    function(err) {
      console.error('Error creating entry: ' + err);
      return res.status(500).end();
    },
  );
  if (!matchedConfig) {
    console.error('Error creating entry. Config does not exists.');
    return res.status(500).end();
  }
  let ssidPrefix = '';
  let isSsidPrefixEnabled = false;
  let createPrefixErrNotification = false;
  // -> 'new registry' scenario
  let checkResponse = deviceHandlers.checkSsidPrefix(
    matchedConfig, ssid, ssid5ghz, false, true);
  /* if in the check is not enabled but hash exists and is
    enabled in config, so we have an error */
  createPrefixErrNotification = !checkResponse.enablePrefix &&
    matchedConfig.personalizationHash !== '' &&
    matchedConfig.isSsidPrefixEnabled;
  isSsidPrefixEnabled = checkResponse.enablePrefix;
  ssidPrefix = checkResponse.prefix;
  // clean ssid
  ssid = checkResponse.ssid2;
  ssid5ghz = checkResponse.ssid5;

  // Validate fields
  genericValidate(macAddr, validator.validateMac, 'mac', null, errors);
  if (connectionType != 'pppoe' && connectionType != 'dhcp' &&
      connectionType != '') {
    return res.status(500).end();
  }
  if (pppoe) {
    genericValidate(pppoeUser, validator.validateUser,
                    'pppoe_user', null, errors);
    genericValidate(pppoePassword, validator.validatePassword,
                    'pppoe_password', matchedConfig.pppoePassLength, errors);
  }
  genericValidate(ssidPrefix + ssid, validator.validateSSID,
                  'ssid', null, errors);
  genericValidate(password, validator.validateWifiPassword,
                  'password', null, errors);
  genericValidate(channel, validator.validateChannel,
                  'channel', null, errors);

  let permissions = DeviceVersion.findByVersion(version, is5ghzCapable,
                                                model);
  if (permissions.grantWifiBand) {
    genericValidate(band, validator.validateBand,
                    'band', null, errors);
    genericValidate(mode, validator.validateMode,
                    'mode', null, errors);
  }
  if (permissions.grantWifiPowerHiddenIpv6Box) {
    genericValidate(power, validator.validatePower,
                    'power', null, errors);
  }
  if (permissions.grantWifi5ghz) {
    genericValidate(ssidPrefix + ssid5ghz, validator.validateSSID,
                    'ssid5ghz', null, errors);
    genericValidate(password5ghz, validator.validateWifiPassword,
                    'password5ghz', null, errors);
    genericValidate(channel5ghz, validator.validateChannel,
                    'channel5ghz', null, errors);
    genericValidate(band5ghz, validator.validateBand,
                    'band5ghz', null, errors);

    // Fix for devices that uses 11a as 11ac mode
    if (mode5ghz == '11a') {
      mode5ghz = '11ac';
    }
    genericValidate(mode5ghz, validator.validateMode,
                    'mode5ghz', null, errors);
    if (permissions.grantWifiPowerHiddenIpv6Box) {
      genericValidate(power5ghz, validator.validatePower,
                      'power5ghz', null, errors);
    }
  }

  if (bridgeEnabled > 0) {
    // Make sure that connection type is DHCP. Avoids bugs in version
    // 0.26.0 of Flashbox firmware
    connectionType = 'dhcp';

    if (bridgeFixIP !== '') {
      genericValidate(bridgeFixIP, validator.validateIP,
                      'bridge_fix_ip', null, errors);
      genericValidate(bridgeFixGateway, validator.validateIP,
                      'bridge_fix_gateway', null, errors);
      genericValidate(bridgeFixDNS, validator.validateIP,
                      'bridge_fix_ip', null, errors);
    }
  }

  if (errors.length < 1) {
    let newMeshId = meshHandlers.genMeshID();
    let newMeshKey = meshHandlers.genMeshKey();
    let deviceObj = {
      '_id': macAddr,
      'created_at': new Date(),
      'model': model,
      'version': version,
      'installed_release': installedRelease,
      'release': installedRelease,
      'pppoe_user': pppoeUser,
      'pppoe_password': pppoePassword,
      'lan_subnet': lanSubnet,
      'lan_netmask': lanNetmask,
      'wifi_ssid': ssid,
      'wifi_password': password,
      'wifi_channel': channel,
      'wifi_last_channel': sentWifiLastChannel,
      'wifi_band': band,
      'wifi_last_band': sentWifiLastBand,
      'wifi_mode': mode,
      'wifi_power': power,
      'wifi_state': wifiState,
      'wifi_hidden': wifiHidden,
      'wifi_is_5ghz_capable': is5ghzCapable,
      'wifi_ssid_5ghz': ssid5ghz,
      'wifi_password_5ghz': password5ghz,
      'wifi_channel_5ghz': channel5ghz,
      'wifi_last_channel_5ghz': sentWifiLastChannel5G,
      'wifi_band_5ghz': band5ghz,
      'wifi_last_band_5ghz': sentWifiLastBand5G,
      'wifi_mode_5ghz': mode5ghz,
      'wifi_power_5ghz': power5ghz,
      'wifi_state_5ghz': wifiState5ghz,
      'wifi_hidden_5ghz': wifiHidden5ghz,
      'wan_ip': wanIp,
      'wan_ipv6': wanIpv6,
      'wan_negociated_speed': wanSpeed,
      'wan_negociated_duplex': wanDuplex,
      'ipv6_enabled': wanIpv6Enabled,
      'ip': ip,
      'last_contact': Date.now(),
      'do_update': false,
      'do_update_parameters': false,
      'sys_up_time': sysUpTime,
      'wan_up_time': wanUpTime,
      'bridge_mode_enabled': (bridgeEnabled > 0),
      'bridge_mode_switch_disable': (bridgeSwitchDisable > 0),
      'bridge_mode_ip': bridgeFixIP,
      'bridge_mode_gateway': bridgeFixGateway,
      'bridge_mode_dns': bridgeFixDNS,
      'mesh_mode': meshMode,
      'mesh_id': newMeshId,
      'mesh_key': newMeshKey,
      'bssid_mesh2': bssidMesh2,
      'bssid_mesh5': bssidMesh5,
      'wps_is_active': wpsState,
      'isSsidPrefixEnabled': isSsidPrefixEnabled,
    };
    if (vlanParsed !== undefined) {
      deviceObj.vlan = vlanParsed;
    }
    let newDeviceModel = new DeviceModel(deviceObj);
    if (connectionType != '') {
      newDeviceModel.connection_type = connectionType;
    }
    await newDeviceModel.save().catch(
      function(err) {
        console.error('Error creating entry: ' + err);
        return res.status(500).end();
      },
    );
    if (createPrefixErrNotification) {
      // Notify if ssid prefix was impossible to be assigned
      let matchedNotif = await Notification
      .findOne({'message_code': 5, 'target': deviceObj._id})
      .catch(function(err) {
        console.error('Error fetching database: ' + err);
      });
      if (!matchedNotif || matchedNotif.allow_duplicate) {
        let notification = new Notification({
          'message': t('ssidPrefixInvalidLength', {errorline: __line}),
          'message_code': 5,
          'severity': 'alert',
          'type': 'communication',
          'action_title': t('Ok'),
          'allow_duplicate': false,
          'target': deviceObj._id,
        });
        await notification.save().catch(
          function(err) {
            console.error('Error creating notification: ' + err);
          },
        );
      }
    }
    let response = {'do_update': false,
                    'do_newprobe': true,
                    'release_id:': installedRelease,
                    'mesh_mode': meshMode,
                    'mesh_id': newMeshId,
                    'mesh_key': newMeshKey,
                    'wifi_ssid': ssidPrefix + ssid};
    if (vlanDidChange) {
      let vlanToDevice = vlanController.convertFlashmanVlan(
        model, JSON.stringify(vlanParsed));
      let vlanHash = crypto.createHash('md5').update(
        JSON.stringify(vlanToDevice)).digest('base64');
      response.vlan = vlanToDevice;
      response.vlan_index = vlanHash;
    }
    if (permissions.grantWifi5ghz) {
      response.wifi_ssid_5ghz = ssidPrefix + ssid5ghz;
    }
    return res.json(response);
  } else {
    console.error('Error creating entry: ' + JSON.stringify(errors));
    return res.status(500).end();
  }
};

const serializeBlocked = function(devices) {
  if (!devices) return [];
  return devices.map((device)=>{
    let dhcpLease = (!device.dhcp_name ||
                     device.dhcp_name === '!') ? '*' : device.dhcp_name;
    return device.mac + '|' + dhcpLease;
  });
};

const serializeNamed = function(devices) {
  if (!devices) return [];
  return devices.map((device)=>device.mac + '|' + device.name);
};

deviceInfoController.syncDate = function(req, res) {
  // WARNING: This api is open.
  let devId;
  if (req.body.id) {
    if (req.body.id.trim().length == 17) {
      devId = req.body.id.trim().toUpperCase();
    }
  } else {
    devId = '';
  }

  let devNtp;
  if (req.body.ntp) {
    if (req.body.ntp.trim().length <= 12) {
      devNtp = req.body.ntp.trim();
    }
  } else {
    devNtp = '';
  }

  let devDate;
  if (req.body.date) {
    if (req.body.date.trim().length <= 14) {
      devDate = req.body.date.trim();
    }
  } else {
    devDate = '';
  }

  console.log('Request Date from '+ devId +': NTP '+ devNtp +' Date '+ devDate);

  let parsedate = parseInt(devDate);
  if (!isNaN(parsedate)) {
    let locDate = new Date(parsedate*1000);
    let atDate = Date.now();
    let diffDate = atDate - locDate;
    // adjust router clock if difference is more than
    // a minute ahead or more than an hour behind
    let serverDate = Math.floor(Date.now() / 1000);
    if ((diffDate < -(60*1000)) || (diffDate>(60*60*1000))) {
      res.status(200).json({'need_update': 1, 'new_date': serverDate});
    } else {
      res.status(200).json({'need_update': 0, 'new_date': serverDate});
    }
  } else {
    res.status(500).end();
  }
};

// Create new device entry or update an existing one
deviceInfoController.updateDevicesInfo = async function(req, res) {
  if (process.env.FLM_BYPASS_SECRET == undefined) {
    if (req.body.secret != req.app.locals.secret) {
      console.log('Error in SYN: Secret not match!');
      return res.status(404).end();
    }
  }

  let devId = req.body.id.toUpperCase();
  DeviceModel.findById(devId).lean().exec(async function(err, matchedDevice) {
    if (err) {
      console.log('Error finding device ' + devId + ': ' + err);
      return res.status(500).end();
    } else {
      if (matchedDevice == null) {
        createRegistry(req, res);
      } else {
        let deviceSetQuery = {};
        let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        let errors = [];
        // validate 2.4GHz because feature of ssid prefix
        let config;
        try {
          config = await Config.findOne({is_default: true},
                                        {device_update_schedule: false}).lean();
          if (!config) throw new Error('Config not found');
        } catch (error) {
          console.log(error.message);
        }
        // -> 'updating registry' scenario
        let checkResponse = deviceHandlers.checkSsidPrefix(
          config, matchedDevice.wifi_ssid, matchedDevice.wifi_ssid_5ghz,
          matchedDevice.isSsidPrefixEnabled);
        matchedDevice.wifi_ssid = checkResponse.ssid2;
        matchedDevice.wifi_ssid_5ghz = checkResponse.ssid5;
        matchedDevice.isSsidPrefixEnabled = checkResponse.enablePrefix;
        let ssidPrefix = checkResponse.prefix;
        const validator = new Validator();
        let ssid2ghz = util.returnObjOrEmptyStr(matchedDevice.wifi_ssid);
        genericValidate(ssidPrefix + ssid2ghz, validator.validateSSID,
                        'ssid', null, errors);

        // Update old entries
        if (typeof matchedDevice.do_update_parameters === 'undefined') {
          deviceSetQuery.do_update_parameters = false;
          matchedDevice.do_update_parameters = false; // Used in device response
        }

        // Parameters only modified on first comm between device and flashman
        let bodyModel =
          util.returnObjOrEmptyStr(req.body.model).trim().toUpperCase();
        let bodyModelVer =
          util.returnObjOrEmptyStr(req.body.model_ver).trim().toUpperCase();
        if (matchedDevice.model == '' || matchedDevice.model == bodyModel) {
          // Legacy versions include only model so let's include model version
          deviceSetQuery.model = bodyModel + bodyModelVer;
        }
        const changeLAN =
          util.returnObjOrEmptyStr(req.body.local_change_lan).trim();
        let lanSubnet = util.returnObjOrEmptyStr(req.body.lan_addr).trim();
        let lanNetmask =
          parseInt(util.returnObjOrNum(req.body.lan_netmask, 24));
        if (((!matchedDevice.lan_subnet || matchedDevice.lan_subnet == '') &&
            lanSubnet != '') || (changeLAN === '1')) {
          deviceSetQuery.lan_subnet = lanSubnet;
          matchedDevice.lan_subnet = lanSubnet; // Used in device response
        }
        if (!matchedDevice.lan_netmask || (changeLAN === '1')) {
          deviceSetQuery.lan_netmask = lanNetmask;
          matchedDevice.lan_netmask = lanNetmask; // Used in device response
        }

        // Update WAN configuration if it was sent by device
        let changeWAN =
          util.returnObjOrEmptyStr(req.body.local_change_wan).trim();
        let sentConnType =
          util.returnObjOrEmptyStr(req.body.connection_type).trim();
        let sentBridgeEnabled =
          util.returnObjOrEmptyStr(req.body.bridge_enabled).trim();
        if (typeof req.body.local_change_wan !== 'undefined' &&
            changeWAN === '1'
        ) {
          if (sentBridgeEnabled === '1') {
            // Device was set to bridge mode, change relevant fields
            // IP, Gateway and DNS are changed separately to treat legacy case
            let sentSwitch =
              util.returnObjOrEmptyStr(req.body.bridge_switch_disable).trim();
            sentSwitch = (sentSwitch === '1'); // Cast to bool value
            deviceSetQuery.bridge_mode_enabled = true;
            deviceSetQuery.bridge_mode_switch_disable = sentSwitch;
            matchedDevice.bridge_mode_enabled = true; // Used in device response
            // Used in device response
            matchedDevice.bridge_mode_switch_disable = sentSwitch;
          } else if (sentConnType === 'dhcp') {
            // Device was set to DHCP, change relevant fields
            deviceSetQuery.bridge_mode_enabled = false;
            deviceSetQuery.connection_type = 'dhcp';
            deviceSetQuery.pppoe_user = '';
            deviceSetQuery.pppoe_password = '';
            // Used in device response
            matchedDevice.bridge_mode_enabled = false;
            matchedDevice.connection_type = 'dhcp'; // Used in device response
            matchedDevice.pppoe_user = ''; // Used in device response
            matchedDevice.pppoe_password = ''; // Used in device response
          } else if (sentConnType === 'pppoe') {
            // Device was set to PPPoE, change relevant fields
            let sentUser = util.returnObjOrEmptyStr(req.body.pppoe_user).trim();
            let sentPass =
              util.returnObjOrEmptyStr(req.body.pppoe_password).trim();
            if (sentUser !== '' && sentPass !== '') {
              deviceSetQuery.bridge_mode_enabled = false;
              deviceSetQuery.connection_type = 'pppoe';
              deviceSetQuery.pppoe_user = sentUser;
              deviceSetQuery.pppoe_password = sentPass;
              // Used in device response
              matchedDevice.bridge_mode_enabled = false;
              // Used in device response
              matchedDevice.connection_type = 'pppoe';
              matchedDevice.pppoe_user = sentUser; // Used in device response
              // Used in device response
              matchedDevice.pppoe_password = sentPass;
            }
          }
        }

        // Update bridge parameters in case fixed ip config was changed
        let sentBridgeIp =
          util.returnObjOrEmptyStr(req.body.bridge_fix_ip).trim();
        if (typeof req.body.bridge_fix_ip !== 'undefined' &&
            sentBridgeIp !== matchedDevice.bridge_mode_ip) {
          deviceSetQuery.bridge_mode_ip = sentBridgeIp;
          // Used in device response
          matchedDevice.bridge_mode_ip = sentBridgeIp;
        }
        let sentBridgeGateway =
          util.returnObjOrEmptyStr(req.body.bridge_fix_gateway).trim();
        if (typeof req.body.bridge_fix_gateway !== 'undefined' &&
            sentBridgeGateway !== matchedDevice.bridge_mode_gateway) {
          deviceSetQuery.bridge_mode_gateway = sentBridgeGateway;
          // Used in device response
          matchedDevice.bridge_mode_gateway = sentBridgeGateway;
        }
        let sentBridgeDns =
          util.returnObjOrEmptyStr(req.body.bridge_fix_dns).trim();
        if (typeof req.body.bridge_fix_dns !== 'undefined' &&
            sentBridgeDns !== matchedDevice.bridge_mode_dns) {
          deviceSetQuery.bridge_mode_dns = sentBridgeDns;
          // Used in device response
          matchedDevice.bridge_mode_dns = sentBridgeDns;
        }

        // Store if device has dual band capability
        const is5ghzCapable =
          (util.returnObjOrEmptyStr(req.body.wifi_5ghz_capable).trim() == '1');
        if (is5ghzCapable != matchedDevice.wifi_is_5ghz_capable) {
          deviceSetQuery.wifi_is_5ghz_capable = is5ghzCapable;
        }

        let sentVersion = util.returnObjOrEmptyStr(req.body.version).trim();
        if (matchedDevice.version != sentVersion) {
          // Legacy registration only. Register advanced wireless
          // values for routers with versions older than 0.13.0.
          let permissionsSentVersion = DeviceVersion.findByVersion(
            sentVersion, is5ghzCapable, (bodyModel + bodyModelVer));
          let permissionsCurrVersion = DeviceVersion.findByVersion(
            matchedDevice.version, is5ghzCapable, matchedDevice.model);

          if ( permissionsSentVersion.grantWifiBand &&
              !permissionsCurrVersion.grantWifiBand) {
            let band =
              util.returnObjOrEmptyStr(req.body.wifi_band).trim();
            let mode =
              util.returnObjOrEmptyStr(req.body.wifi_mode).trim();

            genericValidate(band, validator.validateBand,
                            'band', null, errors);
            genericValidate(mode, validator.validateMode,
                            'mode', null, errors);

            if (errors.length < 1) {
              if (matchedDevice.wifi_band !== band) {
                deviceSetQuery.wifi_band = band;
                matchedDevice.wifi_band = band; // Used in device response
              }
              if (matchedDevice.wifi_mode !== mode) {
                deviceSetQuery.wifi_mode = mode;
                matchedDevice.wifi_mode = mode; // Used in device response
              }
            }
          }
          if ( permissionsSentVersion.grantWifi5ghz &&
              !permissionsCurrVersion.grantWifi5ghz) {
            let ssid5ghz =
              util.returnObjOrEmptyStr(req.body.wifi_ssid_5ghz).trim();
            let password5ghz =
              util.returnObjOrEmptyStr(req.body.wifi_password_5ghz).trim();
            let channel5ghz =
              util.returnObjOrEmptyStr(req.body.wifi_channel_5ghz).trim();
            let band5ghz =
              util.returnObjOrStr(req.body.wifi_band_5ghz, 'VHT80').trim();
            let mode5ghz =
              util.returnObjOrStr(req.body.wifi_mode_5ghz, '11ac').trim();

            genericValidate(ssidPrefix+ssid5ghz, validator.validateSSID,
                            'ssid5ghz', null, errors);
            genericValidate(password5ghz, validator.validateWifiPassword,
                            'password5ghz', null, errors);
            genericValidate(channel5ghz, validator.validateChannel,
                            'channel5ghz', null, errors);
            genericValidate(band5ghz, validator.validateBand,
                            'band5ghz', null, errors);

            // Fix for devices that uses 11a as 11ac mode
            if (mode5ghz == '11a') {
              mode5ghz = '11ac';
            }
            genericValidate(mode5ghz, validator.validateMode,
                            'mode5ghz', null, errors);

            if (errors.length < 1) {
              if (matchedDevice.wifi_ssid_5ghz !== ssid5ghz) {
                deviceSetQuery.wifi_ssid_5ghz = ssid5ghz;
                // Used in device response
                matchedDevice.wifi_ssid_5ghz = ssid5ghz;
              }
              if (matchedDevice.wifi_password_5ghz !== password5ghz) {
                deviceSetQuery.wifi_password_5ghz = password5ghz;
                // Used in device response
                matchedDevice.wifi_password_5ghz = password5ghz;
              }
              if (matchedDevice.wifi_channel_5ghz !== channel5ghz) {
                deviceSetQuery.wifi_channel_5ghz = channel5ghz;
                // Used in device response
                matchedDevice.wifi_channel_5ghz = channel5ghz;
              }
              if (matchedDevice.wifi_band_5ghz !== band5ghz) {
                deviceSetQuery.wifi_band_5ghz = band5ghz;
                // Used in device response
                matchedDevice.wifi_band_5ghz = band5ghz;
              }
              if (matchedDevice.wifi_mode_5ghz !== mode5ghz) {
                deviceSetQuery.wifi_mode_5ghz = mode5ghz;
                // Used in device response
                matchedDevice.wifi_mode_5ghz = mode5ghz;
              }
            }
          }
          if ( permissionsSentVersion.grantWifiPowerHiddenIpv6Box &&
              !permissionsCurrVersion.grantWifiPowerHiddenIpv6Box) {
            let power = parseInt(util.returnObjOrNum(req.body.wifi_power, 100));
            genericValidate(power, validator.validatePower,
                            'power', null, errors);
            if (errors.length < 1) {
              if (matchedDevice.wifi_power !== power) {
                deviceSetQuery.wifi_power = power;
                matchedDevice.wifi_power = power; // Used in device response
              }
            }

            if ( permissionsSentVersion.grantWifi5ghz &&
                !permissionsCurrVersion.grantWifi5ghz) {
              let power5ghz =
                parseInt(util.returnObjOrNum(req.body.wifi_power_5ghz, 100));
              genericValidate(power5ghz, validator.validatePower,
                              'power5ghz', null, errors);
              if (errors.length < 1) {
                if (matchedDevice.wifi_power_5ghz !== power5ghz) {
                  deviceSetQuery.wifi_power_5ghz = power5ghz;
                  matchedDevice.wifi_power_5ghz = power5ghz; // Device response
                }
              }
            }

            let wanIpv6Enabled = parseInt(
              util.returnObjOrNum(req.body.ipv6_enabled, 2));
            genericValidate(wanIpv6Enabled, validator.validateIpv6Enabled,
                            'ipv6Enabled', null, errors);
            if (errors.length < 1) {
              if (matchedDevice.ipv6_enabled !== wanIpv6Enabled) {
                deviceSetQuery.ipv6_enabled = wanIpv6Enabled;
                // Used in device response
                matchedDevice.ipv6_enabled = wanIpv6Enabled;
              }
            }
          }
          if (matchedDevice.version !== sentVersion) {
            deviceSetQuery.version = sentVersion;
          }
        }

        let sentNtp = util.returnObjOrEmptyStr(req.body.ntp).trim();
        if (matchedDevice.ntp_status != sentNtp) {
          deviceSetQuery.ntp_status = sentNtp;
        }

        // Parameters *NOT* available to be modified by REST API

        // WAN IPv4
        let sentWanIp = util.returnObjOrEmptyStr(req.body.wan_ip).trim();
        if (sentWanIp !== matchedDevice.wan_ip) {
          deviceSetQuery.wan_ip = sentWanIp;
        }

        // WAN IPv6
        let sentWanIpv6 = util.returnObjOrEmptyStr(req.body.wan_ipv6).trim();
        if (sentWanIpv6 !== matchedDevice.wan_ipv6) {
          deviceSetQuery.wan_ipv6 = sentWanIpv6;
        }

        let sentWanNegociatedSpeed =
        util.returnObjOrEmptyStr(req.body.wan_negociated_speed).trim();
        if (sentWanNegociatedSpeed !== matchedDevice.wan_negociated_speed) {
          deviceSetQuery.wan_negociated_speed = sentWanNegociatedSpeed;
        }
        let sentWanNegociatedDuplex =
        util.returnObjOrEmptyStr(req.body.wan_negociated_duplex).trim();
        if (sentWanNegociatedDuplex !== matchedDevice.wan_negociated_duplex) {
          deviceSetQuery.wan_negociated_duplex = sentWanNegociatedDuplex;
        }
        if (matchedDevice.ip !== ip) {
          deviceSetQuery.ip = ip;
        }
        let sysUpTime = parseInt(util.returnObjOrNum(req.body.sysuptime, 0));
        deviceSetQuery.sys_up_time = sysUpTime;
        let wanUpTime = parseInt(util.returnObjOrNum(req.body.wanuptime, 0));
        deviceSetQuery.wan_up_time = wanUpTime;
        let wpsState = (
          parseInt(util.returnObjOrNum(req.body.wpsstate, 0)) === 1);
        deviceSetQuery.wps_is_active = wpsState;

        let sentWifiLastChannel =
        util.returnObjOrEmptyStr(req.body.wifi_curr_channel).trim();
        if (sentWifiLastChannel !== matchedDevice.wifi_last_channel) {
          deviceSetQuery.wifi_last_channel = sentWifiLastChannel;
        }
        let sentWifiLastChannel5G =
        util.returnObjOrEmptyStr(req.body.wifi_curr_channel_5ghz).trim();
        if (sentWifiLastChannel5G !== matchedDevice.wifi_last_channel_5ghz) {
          deviceSetQuery.wifi_last_channel_5ghz = sentWifiLastChannel5G;
        }

        let sentWifiLastBand =
        util.returnObjOrEmptyStr(req.body.wifi_curr_band).trim();
        if (sentWifiLastBand !== matchedDevice.wifi_last_band) {
          deviceSetQuery.wifi_last_band = sentWifiLastBand;
        }
        let sentWifiLastBand5G =
        util.returnObjOrEmptyStr(req.body.wifi_curr_band_5ghz).trim();
        if (sentWifiLastBand5G !== matchedDevice.wifi_last_band_5ghz) {
          deviceSetQuery.wifi_last_band_5ghz = sentWifiLastBand5G;
        }

        const bssidMesh2 =
          util.returnObjOrEmptyStr(req.body.bssid_mesh2).trim().toUpperCase();
        const bssidMesh5 =
          util.returnObjOrEmptyStr(req.body.bssid_mesh5).trim().toUpperCase();
        if (errors.length < 1) {
          if (matchedDevice.bssid_mesh2 !== bssidMesh2 && bssidMesh2) {
            deviceSetQuery.bssid_mesh2 = bssidMesh2;
            matchedDevice.bssid_mesh2 = bssidMesh2; // Used in device response
          }
          if (matchedDevice.bssid_mesh5 !== bssidMesh5 && bssidMesh5) {
            deviceSetQuery.bssid_mesh5 = bssidMesh5;
            matchedDevice.bssid_mesh5 = bssidMesh5; // Used in device response
          }
        }

        deviceSetQuery.last_contact = Date.now();

        let hardReset = util.returnObjOrEmptyStr(req.body.hardreset).trim();
        if (hardReset == '1') {
          deviceSetQuery.last_hardreset = Date.now();
        }

        let sentRelease = util.returnObjOrEmptyStr(req.body.release_id).trim();
        if (sentRelease !== matchedDevice.installed_release) {
          deviceSetQuery.installed_release = sentRelease;
        }

        let upgradeInfo = util.returnObjOrEmptyStr(req.body.upgfirm).trim();
        if (upgradeInfo == '1') {
          if (matchedDevice.do_update) {
            console.log('Device ' + devId + ' upgraded successfuly');
            if (matchedDevice.mesh_master) {
              // Mesh slaves call the success function with their master's mac
              updateScheduler.successUpdate(matchedDevice.mesh_master);
            } else {
              updateScheduler.successUpdate(matchedDevice._id);
            }
            messaging.sendUpdateDoneMessage(matchedDevice);
            const typeUpgrade = DeviceVersion.mapFirmwareUpgradeMesh(
              matchedDevice.version, sentVersion);
            const isNotV1ToV2 = !(typeUpgrade.current === 1 &&
                                  typeUpgrade.upgrade === 2);
            if (isNotV1ToV2) {
              // This isn't a mesh v1 -> mesh v2 update
              // So the next device in the mesh network starts
              // to update on this call if there is a mesh network
              await meshHandlers.syncUpdate(
                matchedDevice, deviceSetQuery, sentRelease);
            }
            deviceSetQuery.do_update = false;
            matchedDevice.do_update = false; // Used in device response
            deviceSetQuery.do_update_status = 1; // success
          } else {
            console.log(
              'WARNING: Device ' + devId +
              ' sent a upgrade ack but was not marked as upgradable!');
          }
        }

        let flmUpdater = util.returnObjOrEmptyStr(req.body.flm_updater).trim();
        if (flmUpdater == '1' || flmUpdater == '') {
          // The syn came from flashman_updater (or old routers...)

          // We can disable since the device will receive the update
          if (matchedDevice.do_update_parameters !== false) {
            deviceSetQuery.do_update_parameters = false;
          }
          // Remove notification to device using MQTT
          mqtt.anlixMessageRouterReset(matchedDevice._id);
        }

        let blockedDevices = util.deepCopyObject(matchedDevice.lan_devices)
        .filter(
          function(lanDevice) {
            if (lanDevice.is_blocked) {
              return true;
            } else {
              return false;
            }
          },
        );
        let namedDevices = util.deepCopyObject(matchedDevice.lan_devices)
        .filter(
          function(lanDevice) {
            if ('name' in lanDevice && lanDevice.name != '') {
              return true;
            } else {
              return false;
            }
          },
        );

        Config.findOne({is_default: true},
                       {device_update_schedule: false}).lean()
        .exec(async function(err, matchedConfig) {
          // data collecting parameters to be sent to device.
          // initiating with default values.
          // Nothing happens in device with these parameters.
          let dataCollecting = {
            is_active: false,
            has_latency: false,
            ping_fqdn: '',
            alarm_fqdn: '',
            ping_packets: 100,
            burst_loss: false,
            wifi_devices: false,
            ping_and_wan: false,
          };
          // for each data_collecting parameter, in config, we copy its value.
          // This also makes the code compatible with a data base with no data
          // collecting parameters.
          // eslint-disable-next-line guard-for-in
          for (let key in matchedConfig.data_collecting) {
            dataCollecting[key] = matchedConfig.data_collecting[key];
          }
          // combining 'Device' and 'Config' if data_collecting exists in Config
          if (matchedDevice.data_collecting !== undefined) {
            // parameters from device model.
            let d = matchedDevice.data_collecting;
            let p = dataCollecting; // the final parameters.
            // for on/off buttons, device value && config value
            // if it exists in device.
            d.is_active !== undefined &&
              (p.is_active = p.is_active && d.is_active);
            d.has_latency !== undefined &&
              (p.has_latency = p.has_latency && d.has_latency);
            // preference for device value if it exists.
            d.ping_fqdn !== undefined && (p.ping_fqdn = d.ping_fqdn);
          } else {
            // if data collecting doesn't exist, device won't collect anything.
            dataCollecting.is_active = false;
          }

          const isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
            return map[matchedDevice._id];
          });

          let fetchedVlans = '';
          let vlanHash = '';
          if (sentBridgeEnabled !== '1') {
            let containerVlans =
              vlanController.retrieveVlansToDevice(matchedDevice);
            fetchedVlans = containerVlans.vlans;
            vlanHash = containerVlans.hash;
          }
          let wifiSsid2ghz = ssidPrefix + util.returnObjOrEmptyStr(
            matchedDevice.wifi_ssid);
          let wifiSsid5ghz = util.returnObjOrEmptyStr(
            matchedDevice.wifi_ssid_5ghz);
          /*
            to not return appended ssidPrefix
            in case device not support 5GHz
          */
          if (matchedDevice.wifi_is_5ghz_capable) {
            wifiSsid5ghz = ssidPrefix + wifiSsid5ghz;
          }

          let bssids = await meshHandlers.generateBSSIDLists(matchedDevice);
          if (!bssids) {
            bssids = {
              mesh2: [],
              mesh5: [],
            };
          }

          let resJson = {
            'do_update': matchedDevice.do_update,
            'do_newprobe': false,
            'mqtt_status': isDevOn,
            'release_id': util.returnObjOrEmptyStr(matchedDevice.release),
            'connection_type':
              util.returnObjOrEmptyStr(matchedDevice.connection_type),
            'pppoe_user': util.returnObjOrEmptyStr(matchedDevice.pppoe_user),
            'pppoe_password':
              util.returnObjOrEmptyStr(matchedDevice.pppoe_password),
            'lan_addr': util.returnObjOrEmptyStr(matchedDevice.lan_subnet),
            'lan_netmask': util.returnObjOrEmptyStr(matchedDevice.lan_netmask),
            'wifi_ssid': wifiSsid2ghz,
            'wifi_password':
              util.returnObjOrEmptyStr(matchedDevice.wifi_password),
            'wifi_channel':
              util.returnObjOrEmptyStr(matchedDevice.wifi_channel),
            'wifi_band': util.returnObjOrEmptyStr(matchedDevice.wifi_band),
            'wifi_mode': util.returnObjOrEmptyStr(matchedDevice.wifi_mode),
            'wifi_state': matchedDevice.wifi_state,
            'wifi_power': util.returnObjOrNum(matchedDevice.wifi_power, 100),
            'wifi_hidden': matchedDevice.wifi_hidden,
            'wifi_ssid_5ghz': wifiSsid5ghz,
            'wifi_password_5ghz':
              util.returnObjOrEmptyStr(matchedDevice.wifi_password_5ghz),
            'wifi_channel_5ghz':
              util.returnObjOrEmptyStr(matchedDevice.wifi_channel_5ghz),
            'wifi_band_5ghz':
              util.returnObjOrEmptyStr(matchedDevice.wifi_band_5ghz),
            'wifi_mode_5ghz':
              util.returnObjOrEmptyStr(matchedDevice.wifi_mode_5ghz),
            'wifi_power_5ghz':
              util.returnObjOrNum(matchedDevice.wifi_power_5ghz, 100),
            'wifi_state_5ghz': matchedDevice.wifi_state_5ghz,
            'wifi_hidden_5ghz': matchedDevice.wifi_hidden_5ghz,
            'app_password':
              util.returnObjOrEmptyStr(matchedDevice.app_password),
            'data_collecting_is_active': dataCollecting.is_active,
            'data_collecting_has_latency': dataCollecting.has_latency,
            'data_collecting_alarm_fqdn': dataCollecting.alarm_fqdn,
            'data_collecting_ping_fqdn': dataCollecting.ping_fqdn,
            'data_collecting_ping_packets': dataCollecting.ping_packets,
            'data_collecting_burst_loss': dataCollecting.burst_loss,
            'data_collecting_wifi_devices': dataCollecting.wifi_devices,
            'data_collecting_ping_and_wan': dataCollecting.ping_and_wan,
            'blocked_devices': serializeBlocked(blockedDevices),
            'named_devices': serializeNamed(namedDevices),
            'forward_index':
              util.returnObjOrEmptyStr(matchedDevice.forward_index),
            'blocked_devices_index':
              util.returnObjOrEmptyStr(matchedDevice.blocked_devices_index),
            'upnp_devices_index':
              util.returnObjOrEmptyStr(matchedDevice.upnp_devices_index),
            'bridge_mode_enabled':
              (matchedDevice.bridge_mode_enabled) ? 'y' : 'n',
            'bridge_mode_switch_disable':
              (matchedDevice.bridge_mode_switch_disable) ? 'y' : 'n',
            'bridge_mode_ip':
              util.returnObjOrEmptyStr(matchedDevice.bridge_mode_ip),
            'bridge_mode_gateway':
              util.returnObjOrEmptyStr(matchedDevice.bridge_mode_gateway),
            'bridge_mode_dns':
              util.returnObjOrEmptyStr(matchedDevice.bridge_mode_dns),
            'vlan_index': vlanHash,
            'vlan': fetchedVlans,
            'mesh_mode': matchedDevice.mesh_mode,
            'mesh_master': matchedDevice.mesh_master,
            'mesh_id': matchedDevice.mesh_id,
            'mesh_key': matchedDevice.mesh_key,
            'devices_bssid_mesh2': bssids.mesh2,
            'devices_bssid_mesh5': bssids.mesh5,
          };

          // adding all data_collecting parameters to response json.
          let dcRes = dataCollectingController.mergeConfigs(
            matchedConfig.data_collecting,
            matchedDevice.data_collecting,
            matchedDevice.version,
          );
          // eslint-disable-next-line guard-for-in
          for (let parameter in dcRes) {
            // console.log('parameter', parameter, dcRes[parameter])
            resJson['data_collecting_'+parameter] = dcRes[parameter];
          }

          // Only answer ipv6 status if flashman knows current state
          if (matchedDevice.ipv6_enabled !== 2) {
            resJson.ipv6_enabled = matchedDevice.ipv6_enabled;
          }
          // Do not return yet, just respond to request so we can free socket
          res.status(200).json(resJson);
          // Now we push the changed fields to the database
          DeviceModel.updateOne({'_id': matchedDevice._id},
            {'$set': deviceSetQuery}, (err) => {
              if (err) {
                console.log(err);
                return;
              } else {
                // Convert to date string
                deviceSetQuery.last_contact =
                new Date(deviceSetQuery.last_contact).toISOString();
                // Send modified fields if device traps are activated
                if (Object.keys(deviceSetQuery).length > 0 &&
                    matchedConfig.traps_callbacks &&
                    matchedConfig.traps_callbacks.devices_crud
                ) {
                  let callbacks = matchedConfig.traps_callbacks.devices_crud;
                  const promises = callbacks.map((deviceCrud) => {
                    let requestOptions = {};
                    let callbackUrl = deviceCrud.url;
                    let callbackAuthUser = deviceCrud.user;
                    let callbackAuthSecret = deviceCrud.secret;
                    if (callbackUrl) {
                      requestOptions.url = callbackUrl;
                      requestOptions.method = 'PUT';
                      requestOptions.json = {
                        'id': matchedDevice._id,
                        'type': 'device',
                        'changes': deviceSetQuery,
                      };
                      if (callbackAuthUser && callbackAuthSecret) {
                        requestOptions.auth = {
                          user: callbackAuthUser,
                          pass: callbackAuthSecret,
                        };
                      }
                      return request(requestOptions);
                    }
                  });
                  Promise.all(promises).then((resp) => {
                    // Ignore API response
                    return;
                  }, (err) => {
                    // Ignore API endpoint errors
                    return;
                  });
                }
              }
            },
          );
        });
      }
    }
  });
};

// Receive device firmware upgrade confirmation
deviceInfoController.confirmDeviceUpdate = function(req, res) {
  DeviceModel.findById(req.body.id, async function(err, matchedDevice) {
    if (err) {
      console.log('Error finding device: ' + err);
      return res.status(500).json({proceed: 0});
    } else {
      if (matchedDevice == null) {
        return res.status(500).json({proceed: 0});
      } else {
        let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        matchedDevice.ip = ip;
        matchedDevice.last_contact = Date.now();
        if (matchedDevice.do_update && matchedDevice.do_update_status === 5) {
          // Ack timeout already happened, abort update
          try {
            await matchedDevice.save();
            return res.status(500).json({proceed: 0});
          } catch (err) {
            return res.status(500).json({proceed: 0});
          }
        }
        let proceed = 0;
        let upgStatus = util.returnObjOrEmptyStr(req.body.status).trim();
        if (upgStatus == '1') {
          console.log('Device ' + req.body.id + ' is going on upgrade...');
          if (matchedDevice.release === '9999-aix') {
            // Disable schedule since factory firmware will not inform status
            matchedDevice.installed_release = '9999-aix';
            matchedDevice.do_update = false;
            matchedDevice.do_update_status = 1; // success
          } else {
            matchedDevice.do_update_status = 10; // ack received
            let firmware = await Firmware.findByReleaseCombinedModel(
              matchedDevice.release, matchedDevice.model);
            firmware = firmware[0];
            if (firmware && firmware.flashbox_version) {
              const typeUpgrade = DeviceVersion.mapFirmwareUpgradeMesh(
                matchedDevice.version, firmware.flashbox_version);
              const isV1ToV2 = (typeUpgrade.current === 1 &&
                                typeUpgrade.upgrade === 2);
              // Mesh network upgrade from mesh v1 to v2:
              // The next device in the mesh network won't wait for the
              // previous to finish upgrade. When the ack is received the next
              // device starts upgrade if there is a mesh network
              if (isV1ToV2) {
                await meshHandlers.syncUpdate(
                  matchedDevice, null, matchedDevice.release);
              }
            }
          }
          proceed = 1;
        } else if (upgStatus == '0' || upgStatus == '2') {
          if (matchedDevice.mesh_master) {
            // Mesh slaves call update schedules function with their master mac
            updateScheduler.failedDownload(
              matchedDevice.mesh_master, req.body.id);
          } else {
            updateScheduler.failedDownload(req.body.id);
          }
          console.log('WARNING: Device ' + req.body.id +' failed in firmware ' +
                      (upgStatus == '0' ? 'check' : 'download'));
          if (upgStatus == '0') {
            matchedDevice.do_update_status = 3; // img check failed
          } else {
            matchedDevice.do_update_status = 2; // img download failed
          }
        } else if (upgStatus == '') {
          console.log('WARNING: Device ' + req.body.id +
                      ' ack update on an old firmware! Reseting upgrade...');
          matchedDevice.do_update = false;
          matchedDevice.do_update_status = 1; // success
          proceed = 1;
        }

        matchedDevice.save().catch((err) => {
          console.log('Error saving device during upgrade confirmation: ' +err);
        });
        return res.status(200).json({proceed: proceed});
      }
    }
  });
};

deviceInfoController.registerMqtt = function(req, res) {
  if (req.body.secret == req.app.locals.secret) {
    DeviceModel.findById(req.body.id, async function(err, matchedDevice) {
      if (err) {
        console.log('Attempt to register MQTT secret for device ' +
          req.body.id + ' failed: Cant get device profile.');
        return res.status(400).json({is_registered: 0});
      }
      if (!matchedDevice) {
        console.log('Attempt to register MQTT secret for device ' +
          req.body.id + ' failed: No device found.');
        return res.status(404).json({is_registered: 0});
      }
      let config = await Config.findOne(
        {is_default: true}, {mqtt_secret_bypass: true},
      ).lean().catch(
        (err) => {
          console.log('Error fetch config from database');
        },
      );
      if (!matchedDevice.mqtt_secret ||
          process.env.FLM_BYPASS_MQTTS_PASSWD ||
          matchedDevice.mqtt_secret_bypass ||
          (config && config.mqtt_secret_bypass)
      ) {
        matchedDevice.mqtt_secret = req.body.mqttsecret;
        try {
          await matchedDevice.save();
          console.log('Device ' +
                      req.body.id + ' register MQTT secret successfully.');
          return res.status(200).json({is_registered: 1});
        } catch (err) {
          console.log('Error saving device on MQTT register: ' + err);
          return res.status(500).json({is_registered: 0});
        }
      } else {
        // Device have a secret. Modification of secret is forbidden!
        console.log('Attempt to register MQTT secret for device ' +
          req.body.id + ' failed: Device have a secret.');
        // Send notification
        Notification.findOne({
          'message_code': 1,
          'target': matchedDevice._id},
        function(err, matchedNotif) {
          if (!err && (!matchedNotif || matchedNotif.allow_duplicate)) {
            let notification = new Notification({
              'message': t('firmwareHasBeenModifiedLocally',
                {errorline: __line}),
              'message_code': 1,
              'severity': 'alert',
              'type': 'communication',
              'action_title': t('permitCommunication'),
              'action_url': '/devicelist/command/' +
                            matchedDevice._id + '/rstmqtt',
              'allow_duplicate': false,
              'target': matchedDevice._id,
            });
            notification.save(function(err) {
              if (!err) {
                sio.anlixSendDeviceStatusNotification(matchedDevice._id,
                                                      notification);
              }
            });
          } else {
            sio.anlixSendDeviceStatusNotification(matchedDevice._id,
                                                  matchedNotif);
          }
        });
        return res.status(404).json({is_registered: 0});
      }
    });
  } else {
    console.log('Attempt to register MQTT secret for device ' +
      req.body.id + ' failed: Client Secret not match!');
    return res.status(401).json({is_registered: 0});
  }
};

deviceInfoController.registerMeshSlave = function(req, res) {
  if (req.body.secret == req.app.locals.secret) {
    DeviceModel.findById(req.body.id, function(err, matchedDevice) {
      if (err) {
        console.log('Attempt to register mesh slave for device ' +
          req.body.id + ' failed: Cant get device profile.');
        return res.status(400).json({is_registered: 0});
      }
      if (!matchedDevice) {
        console.log('Attempt to register mesh slave for device ' +
          req.body.id + ' failed: No device found.');
        return res.status(404).json({is_registered: 0});
      }

      // lookup if device is already registered
      let slave = req.body.slave.toUpperCase();
      let pos = matchedDevice.mesh_slaves.indexOf(slave);
      if (pos < 0) {
        // Not found, register
        DeviceModel.findById(slave, async function(err, slaveDevice) {
          if (err) {
            console.log('Attempt to register mesh slave ' + slave +
              ' for device ' + req.body.id + ' failed: cant get slave device.');
            return res.status(400).json({is_registered: 0});
          }
          if (!slaveDevice) {
            console.log('Attempt to register mesh slave ' + slave +
              ' for device ' + req.body.id +
              ' failed: Slave device not found.');
            return res.status(404).json({is_registered: 0});
          }

          if (slaveDevice.mesh_master) {
            console.log('Attempt to register mesh slave ' + slave +
              ' for device ' + req.body.id +
              ' failed: Slave device aready registred in other master.');
            return res.status(404).json({is_registered: 0});
          }

          if (slaveDevice.mesh_mode != '0' && !slaveDevice.mesh_master) {
            console.log('Attempt to register mesh slave ' + slave +
              ' for device ' + req.body.id +
              ' failed: Slave device is mesh master.');
            return res.status(404).json({is_registered: 0});
          }

          slaveDevice.mesh_master = matchedDevice._id;
          meshHandlers.syncSlaveWifi(matchedDevice, slaveDevice);
          await slaveDevice.save().catch((err) => {
            console.log('Error saving master to slave: ' + slave);
            return res.status(500).json({is_registered: 0});
          });

          matchedDevice.mesh_slaves.push(slave);
          await matchedDevice.save().catch((err) => {
            console.log('Error saving slave to master: ' + req.body.id);
            return res.status(500).json({is_registered: 0});
          });

          // Push updates to the Slave
          mqtt.anlixMessageRouterUpdate(slave);

          console.log('Slave ' + slave + ' registred on Master ' +
            req.body.id + ' successfully.');
          return res.status(200).json({is_registered: 1});
        });
      } else {
        // already registred
        return res.status(200).json({is_registered: 2});
      }
    });
  } else {
    console.log('Attempt to register mesh slave for device ' +
      req.body.id + ' failed: Client Secret not match!');
    return res.status(401).json({is_registered: 0});
  }
};

deviceInfoController.receiveLog = function(req, res) {
  let id = req.headers['x-anlix-id'];
  let bootType = req.headers['x-anlix-logs'];
  let envsec = req.headers['x-anlix-sec'];

  if (process.env.FLM_BYPASS_SECRET == undefined) {
    if (envsec != req.app.locals.secret) {
      console.log('Error Receiving Log: Secret not match!');
      return res.status(404).json({processed: 0});
    }
  }

  DeviceModel.findById(id, async function(err, matchedDevice) {
    if (err) {
      console.log('Log Receiving for device ' +
        id + ' failed: Cant get device profile.');
      return res.status(400).json({processed: 0});
    }
    if (!matchedDevice) {
      console.log('Log Receiving for device ' +
        id + ' failed: No device found.');
      return res.status(404).json({processed: 0});
    }

    let dbSaveOk = true;
    if (bootType == 'FIRST') {
      matchedDevice.firstboot_log = Buffer.from(req.body);
      matchedDevice.firstboot_date = Date.now();
      await matchedDevice.save().catch((err) => {
        console.log('Log Receiving for device ' +
                    id + ' failed: Failed to save on database');
        dbSaveOk = false;
      });
      if (dbSaveOk) {
        console.log('Log Receiving for device ' +
                    id + ' successfully. FIRST BOOT');
      }
    } else if (bootType == 'BOOT') {
      matchedDevice.lastboot_log = Buffer.from(req.body);
      matchedDevice.lastboot_date = Date.now();
      await matchedDevice.save().catch((err) => {
        console.log('Log Receiving for device ' +
                    id + ' failed: Failed to save on database');
        dbSaveOk = false;
      });
      if (dbSaveOk) {
        console.log('Log Receiving for device ' +
                    id + ' successfully. LAST BOOT');
      }
    } else if (bootType == 'LIVE') {
      sio.anlixSendLiveLogNotifications(id, req.body);
      console.log('Log Receiving for device ' +
        id + ' successfully. LIVE');
    }

    if (dbSaveOk) {
      return res.status(200).json({processed: 1});
    } else {
      return res.status(500).json({processed: 0});
    }
  });
};

deviceInfoController.getPortForward = function(req, res) {
  if (req.body.secret == req.app.locals.secret) {
    DeviceModel.findById(req.body.id, function(err, matchedDevice) {
      if (err) {
        console.log('Router ' + req.body.id + ' Get Port Forwards ' +
          'failed: Cant get device profile.');
        return res.status(400).json({success: false});
      }
      if (!matchedDevice) {
        console.log('Router ' + req.body.id + ' Get Port Forwards ' +
          'failed: No device found.');
        return res.status(404).json({success: false});
      }

      let resOut = matchedDevice.lan_devices.filter(function(lanDevice) {
        if (typeof lanDevice.port !== 'undefined' &&
            lanDevice.port.length > 0) {
          return true;
        } else {
          return false;
        }
      });

      let outData = [];
      for (let i = 0; i < resOut.length; i++) {
        let tmpData = {};
        tmpData.mac = resOut[i].mac;
        tmpData.port = resOut[i].port;
        tmpData.dmz = resOut[i].dmz;

        if (('router_port' in resOut[i]) &&
            resOut[i].router_port.length != 0) {
          tmpData.router_port = resOut[i].router_port;
        }
        outData.push(tmpData);
      }

      if (matchedDevice.forward_index) {
        return res.status(200).json({
          'success': true,
          'forward_index': matchedDevice.forward_index,
          'forward_rules': outData,
        });
      } else {
        console.log('Router ' + req.body.id + ' Get Port Forwards ' +
          'failed: No index found.');
        return res.status(404).json({success: false});
      }
    });
  } else {
    console.log('Router ' + req.body.id + ' Get Port Forwards ' +
      'failed: Client Secret not match!');
    return res.status(401).json({success: false});
  }
};

deviceInfoController.receiveDevices = async function(req, res) {
  let id = req.headers['x-anlix-id'];
  let envsec = req.headers['x-anlix-sec'];

  if (process.env.FLM_BYPASS_SECRET == undefined) {
    if (envsec != req.app.locals.secret) {
      console.log('Error Receiving Devices: Secret not match!');
      return res.status(404).json({processed: 0});
    }
  }

  DeviceModel.findById(id, async function(err, matchedDevice) {
    if (err) {
      console.log('Devices Receiving for device ' +
        id + ' failed: Cant get device profile.');
      return res.status(400).json({processed: 0});
    }
    if (!matchedDevice) {
      console.log('Devices Receiving for device ' +
        id + ' failed: No device found.');
      return res.status(404).json({processed: 0});
    }
    if (!('Devices' in req.body)) {
      console.log('Devices Receiving for device ' +
        id + ' failed: Invalid JSON.');
      return res.status(400).json({processed: 0});
    }

    const validator = new Validator();
    let devsData = req.body.Devices;
    let outData = [];
    let routersData = undefined;

    const permissions = DeviceVersion.findByVersion(
      matchedDevice.version,
      matchedDevice.wifi_is_5ghz_capable,
      matchedDevice.model,
    );

    // In mesh v2 there is a new layout of the flashbox response
    const meshV2 = (permissions.grantMeshV2PrimaryMode ||
      permissions.grantMeshV2SecondaryMode);

    if ('mesh_routers' in req.body) {
      routersData = req.body.mesh_routers;
      if (meshV2 && matchedDevice.mesh_master) {
        // in the new layout mesh slaves only send their mesh father info
        const meshFatherBssid = Object.keys(routersData)[0];
        let fatherMac = await meshHandlers.convertBSSIDToId(
          matchedDevice, meshFatherBssid,
        );
        if (fatherMac === '') {
          return res.status(500).json({processed: 0});
        }
        matchedDevice.mesh_father = fatherMac;
      }
    }

    for (let connDeviceMac in devsData) {
      if (Object.prototype.hasOwnProperty.call(devsData, connDeviceMac)) {
        let outDev = {};
        let upConnDevMac = connDeviceMac.toLowerCase();
        let upConnDev = devsData[upConnDevMac];
        let ipRes = {valid: false};
        // Skip if not lowercase
        if (!upConnDev) continue;

        let devReg = matchedDevice.getLanDevice(upConnDevMac);
        if (upConnDev.ip) {
          ipRes = validator.validateIP(upConnDev.ip);
        }
        // Check wifi or cable data
        if (upConnDev.conn_type) {
          upConnDev.conn_type = parseInt(upConnDev.conn_type);
        }
        if (upConnDev.conn_speed) {
          upConnDev.conn_speed = parseInt(upConnDev.conn_speed);
          if (isNaN(upConnDev.conn_speed)) upConnDev.conn_speed = null;
        }
        if (upConnDev.wifi_signal) {
          upConnDev.wifi_signal = parseFloat(upConnDev.wifi_signal);
          if (isNaN(upConnDev.wifi_signal)) upConnDev.wifi_signal = null;
        }
        if (upConnDev.wifi_snr) {
          upConnDev.wifi_snr = parseInt(upConnDev.wifi_snr);
          if (isNaN(upConnDev.wifi_snr)) upConnDev.wifi_snr = null;
        }
        if (upConnDev.wifi_freq) {
          upConnDev.wifi_freq = parseFloat(upConnDev.wifi_freq);
          if (isNaN(upConnDev.wifi_freq)) upConnDev.wifi_freq = null;
        }
        if (upConnDev.ping) {
          upConnDev.ping = parseFloat(upConnDev.ping);
          if (isNaN(upConnDev.ping)) upConnDev.ping = null;
        }
        if (devReg) {
          if ((upConnDev.hostname) && (upConnDev.hostname != '') &&
              (upConnDev.hostname != '!')
          ) {
            devReg.dhcp_name = upConnDev.hostname;
          }
          if (!devReg.first_seen) {
            devReg.first_seen = Date.now();
          }
          if (devReg.name && devReg.name != '') {
            outDev.hostname = devReg.name;
          } else {
            outDev.hostname = devReg.dhcp_name;
          }
          devReg.ip = (ipRes.valid ? upConnDev.ip : null);
          if (Array.isArray(upConnDev.ipv6)) {
            devReg.ipv6 = upConnDev.ipv6;
          }
          if (Array.isArray(upConnDev.dhcpv6)) {
            devReg.dhcpv6 = upConnDev.dhcpv6;
          }
          // If device change conn type to cable, check conn speed to be sure
          if (devReg.conn_type === 1 && upConnDev.conn_type === 0) {
            if (upConnDev.conn_speed >= 100) {
              devReg.conn_type = upConnDev.conn_type;
            }
          } else {
            devReg.conn_type = ([0, 1].includes(upConnDev.conn_type) ?
                                upConnDev.conn_type : null);
          }
          devReg.last_seen = Date.now();
          devReg.conn_speed = upConnDev.conn_speed;
          devReg.wifi_signal = upConnDev.wifi_signal;
          devReg.wifi_snr = upConnDev.wifi_snr;
          devReg.wifi_freq = upConnDev.wifi_freq;
          devReg.wifi_mode = (['G', 'N', 'AC'].includes(upConnDev.wifi_mode) ?
                              upConnDev.wifi_mode : null);
          if (upConnDev.wifi_signature != '') {
            devReg.wifi_fingerprint = upConnDev.wifi_signature;
          }
          if (upConnDev.dhcp_signature != '') {
            devReg.dhcp_fingerprint = upConnDev.dhcp_signature;
          }
          if (upConnDev.dhcp_vendor_class != '') {
            devReg.dhcp_vendor_class = upConnDev.dhcp_vendor_class;
          }
          if (upConnDev.ping && upConnDev.ping != '') {
            devReg.ping = upConnDev.ping;
          }
        } else {
          let hostName = (upConnDev.hostname != '' &&
                          upConnDev.hostname != '!') ? upConnDev.hostname : '';
          matchedDevice.lan_devices.push({
            mac: upConnDevMac,
            dhcp_name: hostName,
            first_seen: Date.now(),
            last_seen: Date.now(),
            ip: (ipRes.valid ? upConnDev.ip : null),
            ipv6: (Array.isArray(upConnDev.ipv6) ? upConnDev.ipv6 : null),
            dhcpv6: (Array.isArray(upConnDev.dhcpv6) ? upConnDev.dhcpv6 : null),
            conn_type: ([0, 1].includes(upConnDev.conn_type) ?
                        upConnDev.conn_type : null),
            conn_speed: upConnDev.conn_speed,
            wifi_signal: upConnDev.wifi_signal,
            wifi_snr: upConnDev.wifi_snr,
            wifi_freq: upConnDev.wifi_freq,
            wifi_mode: (['G', 'N', 'AC'].includes(upConnDev.wifi_mode) ?
                        upConnDev.wifi_mode : null),
            wifi_fingerprint: upConnDev.wifi_signature,
            dhcp_fingerprint: upConnDev.dhcp_signature,
            dhcp_vendor_class: upConnDev.dhcp_vendor_class,
            ping: upConnDev.ping ? upConnDev.ping : null,
          });
          outDev.hostname = hostName;
        }
        outDev.has_dhcpv6 = (Array.isArray(upConnDev.dhcpv6) &&
                             upConnDev.dhcpv6.length > 0 ? true : false);
        outDev.mac = upConnDevMac;
        outData.push(outDev);
      }
    }

    if (routersData) {
      // Erasing existing data of previous mesh routers
      matchedDevice.mesh_routers = [];

      for (let connRouter in routersData) {
        if (Object.prototype.hasOwnProperty.call(routersData, connRouter)) {
          let upConnRouterMac;
          if (meshV2) {
            // in new response the keys are in uppercase
            upConnRouterMac = connRouter.toUpperCase();
          } else {
            // in legacy response the keys are in lowercase
            upConnRouterMac = connRouter.toLowerCase();
          }
          let upConnRouter = routersData[upConnRouterMac];
          if (!upConnRouter) continue;

          if (upConnRouter.rx_bit && typeof upConnRouter.rx_bit === 'number') {
            upConnRouter.rx_bit = parseInt(upConnRouter.rx_bit);
          } else {
            upConnRouter.rx_bit = 0;
          }
          if (upConnRouter.tx_bit && typeof upConnRouter.tx_bit === 'number') {
            upConnRouter.tx_bit = parseInt(upConnRouter.tx_bit);
          } else {
            upConnRouter.tx_bit = 0;
          }
          if (upConnRouter.signal) {
            upConnRouter.signal = parseFloat(upConnRouter.signal);
          }
          if (upConnRouter.rx_bytes && upConnRouter.tx_bytes) {
            upConnRouter.rx_bytes = parseInt(upConnRouter.rx_bytes);
            upConnRouter.tx_bytes = parseInt(upConnRouter.tx_bytes);
          }
          if (upConnRouter.conn_time) {
            upConnRouter.conn_time = parseInt(upConnRouter.conn_time);
          }
          if (upConnRouter.latency) {
            upConnRouter.latency = parseInt(upConnRouter.latency);
          } else {
            upConnRouter.latency = 0;
          }
          if (upConnRouter.iface) {
            let ifaceMode = 1;
            if (upConnRouter.iface === 'mesh0') ifaceMode = 2;
            if (upConnRouter.iface === 'mesh1') ifaceMode = 3;
            upConnRouter.iface = ifaceMode;
          } else {
            upConnRouter.iface = 1;
          }
          matchedDevice.mesh_routers.push({
            mac: upConnRouterMac,
            last_seen: Date.now(),
            conn_time: upConnRouter.conn_time,
            rx_bytes: upConnRouter.rx_bytes,
            tx_bytes: upConnRouter.tx_bytes,
            signal: upConnRouter.signal,
            rx_bit: upConnRouter.rx_bit,
            tx_bit: upConnRouter.tx_bit,
            latency: upConnRouter.latency,
            iface: upConnRouter.iface,
          });
        }
      }
    }

    // Used for mesh networks
    let isWaitingForTopology = false;
    let willSignalMeshTopology = false;
    let masterMac;
    if (matchedDevice.mesh_master) {
      masterMac = matchedDevice.mesh_master;
      const tmpMasterDevice = await DeviceModel.findOne(
        {'_id': masterMac},
        {'do_update_status': true},
      ).lean();
      isWaitingForTopology = tmpMasterDevice.do_update_status === 20;
    } else {
      masterMac = matchedDevice._id;
      isWaitingForTopology = matchedDevice.do_update_status === 20;
    }
    if (isWaitingForTopology) {
      try {
        /*
          This region should not have two parallel executions because fields
          of the same device are read and written. A random timeout is set
          between accesses to the mutex
        */
        let interval = Math.random() * 500; // scale to seconds, cap at 500ms
        await new Promise((resolve) => setTimeout(resolve, interval));
        mutexRelease = await mutex.acquire();
        await DeviceModel.update({
          '_id': masterMac,
        }, {
          '$inc': {
            'mesh_onlinedevs_remaining': -1,
          },
        });
        let masterDevice = await DeviceModel.findOne(
          {'_id': masterMac},
          {'mesh_onlinedevs_remaining': true,
          'do_update_status': true},
        );
        // end of critical region
        mutexRelease();

        const devicesRemaining = masterDevice.mesh_onlinedevs_remaining;
        if (devicesRemaining === 0) {
          masterDevice.do_update_status = 30;
          // Last mesh device to report topology should trigger mesh topology
          // done to scheduler and mesh handler
          willSignalMeshTopology = true;
          await masterDevice.save().catch((err) => {
            console.log('Error saving mesh master on topology update: ' + err);
          });
        }
      } catch (err) {
        console.log(err);
        mutexRelease();
        return res.status(500).json({processed: 0});
      }
    }

    matchedDevice.last_devices_refresh = Date.now();
    await matchedDevice.save().catch((err) => {
      console.log('Error saving received devices to database: ' + id);
    });

    if (willSignalMeshTopology) {
      meshHandlers.validateMeshTopology(masterMac);
    }

    // if someone is waiting for this message, send the information
    sio.anlixSendOnlineDevNotifications(id, outData);
    console.log('Devices Receiving for device ' +
      id + ' successfully.');

    return res.status(200).json({processed: 1});
  });
};

deviceInfoController.receiveSiteSurvey = function(req, res) {
  let id = req.headers['x-anlix-id'];
  let envsec = req.headers['x-anlix-sec'];

  if (process.env.FLM_BYPASS_SECRET == undefined) {
    if (envsec != req.app.locals.secret) {
      console.log('Error Receiving Site Survey: Secret not match!');
      return res.status(404).json({processed: 0});
    }
  }

  DeviceModel.findById(id, async function(err, matchedDevice) {
    if (err) {
      console.log('Site Survey Receiving for device ' +
        id + ' failed: Cant get device profile.');
      return res.status(400).json({processed: 0});
    }
    if (!matchedDevice) {
      console.log('Site Survey Receiving for device ' +
        id + ' failed: No device found.');
      return res.status(404).json({processed: 0});
    }
    if (!('survey' in req.body)) {
      console.log('Site Survey Receiving for device ' +
        id + ' failed: Invalid JSON.');
      return res.status(400).json({processed: 0});
    }

    let apsData = req.body.survey;
    let outData = [];

    for (let connApMac in apsData) {
      if (Object.prototype.hasOwnProperty.call(apsData, connApMac)) {
        let outDev = {};
        let upConnApMac = connApMac.toLowerCase();
        let upConnDev = apsData[upConnApMac];
        if (!upConnDev) continue;

        let devReg = matchedDevice.getAPSurveyDevice(upConnApMac);
        if (upConnDev.freq) {
          upConnDev.freq = parseInt(upConnDev.freq);
        }
        if (upConnDev.signal) {
          upConnDev.signal = parseInt(upConnDev.signal);
        }
        let devWidth=20;
        let devVHT=false;

        if (upConnDev.largura_HT) {
          if (upConnDev.largura_HT === 'any') {
            devWidth = 40;
          } else {
            devWidth = parseInt(upConnDev.largura_HT);
          }
        }

        if (upConnDev.largura_VHT) {
          let VHTWifth=parseInt(upConnDev.largura_VHT);
          if (VHTWifth > 0) {
            devVHT=true;
            devWidth = VHTWifth;
          }
        }

        if (devReg) {
          devReg.ssid = upConnDev.SSID;
          devReg.freq = upConnDev.freq;
          devReg.signal = upConnDev.signal;
          devReg.width = devWidth;
          devReg.VHT = devVHT;
          devReg.last_seen = Date.now();
          if (!devReg.first_seen) {
            devReg.first_seen = Date.now();
          }
        } else {
          matchedDevice.ap_survey.push({
            mac: upConnApMac,
            ssid: upConnDev.SSID,
            freq: upConnDev.freq,
            signal: upConnDev.signal,
            width: devWidth,
            VHT: devVHT,
            first_seen: Date.now(),
            last_seen: Date.now(),
          });
        }
        outDev.mac = upConnApMac;
        outData.push(outDev);
      }
    }

    matchedDevice.last_site_survey = Date.now();
    await matchedDevice.save().catch((err) => {
      console.log('Error saving site survey to database');
      return res.status(500).json({processed: 0});
    });

    // if someone is waiting for this message, send the information
    sio.anlixSendSiteSurveyNotifications(id, outData);
    console.log('Site Survey Receiving for device ' +
      id + ' successfully.');

    return res.status(200).json({processed: 1});
  });
};

deviceInfoController.getPingHosts = function(req, res) {
  if (req.body.secret == req.app.locals.secret) {
    DeviceModel.findById(req.body.id, function(err, matchedDevice) {
      if (err) {
        console.log('Router ' + req.body.id + ' Get Ping Hosts ' +
          'failed: Cant get device profile.');
        return res.status(400).json({success: false});
      }
      if (!matchedDevice) {
        console.log('Router ' + req.body.id + ' Get Ping Hosts ' +
          'failed: No device found.');
        return res.status(404).json({success: false});
      }
      if (matchedDevice.ping_hosts) {
        return res.status(200).json({
          'success': true,
          'hosts': matchedDevice.ping_hosts,
        });
      } else {
        console.log('Router ' + req.body.id + ' Get Ping Hosts ' +
          'failed: No hosts found.');
        return res.status(404).json({success: false});
      }
    });
  } else {
    console.log('Router ' + req.body.id + ' Get Port Forwards ' +
      'failed: Client Secret not match!');
    return res.status(401).json({success: false});
  }
};

deviceInfoController.getUpnpDevsPerm = function(req, res) {
  if (req.body.secret == req.app.locals.secret) {
    DeviceModel.findById(req.body.id, function(err, matchedDevice) {
      if (err) {
        console.log('Router ' + req.body.id + ' Get uPnP devices permissions ' +
          'failed: Cant get device profile.');
        return res.status(400).json({success: false});
      }
      if (!matchedDevice) {
        console.log('Router ' + req.body.id + ' Get uPnP devices permissions ' +
          'failed: No device found.');
        return res.status(404).json({success: false});
      }

      let outData = [];
      for (let i = 0; i < matchedDevice.lan_devices.length; i++) {
        let tmpData = {};
        tmpData.mac = matchedDevice.lan_devices[i].mac;
        tmpData.dmz = matchedDevice.lan_devices[i].dmz;
        tmpData.upnp = matchedDevice.lan_devices[i].upnp_permission;
        outData.push(tmpData);
      }

      if (matchedDevice.upnp_devices_index) {
        return res.status(200).json({
          'success': true,
          'upnp_devices_index': matchedDevice.upnp_devices_index,
          'upnp_devices': outData,
        });
      }
    });
  } else {
    console.log('Router ' + req.body.id + ' Get uPnP devices permissions ' +
      'failed: Client Secret not match!');
    return res.status(401).json({success: false});
  }
};

deviceInfoController.receivePingResult = function(req, res) {
  let id = req.headers['x-anlix-id'];
  let envsec = req.headers['x-anlix-sec'];

  if (process.env.FLM_BYPASS_SECRET == undefined) {
    if (envsec != req.app.locals.secret) {
      console.log('Error Receiving Devices: Secret not match!');
      return res.status(404).json({processed: 0});
    }
  }

  DeviceModel.findById(id, function(err, matchedDevice) {
    if (err) {
      console.log('Ping results for device ' +
        id + ' failed: Cant get device profile.');
      return res.status(400).json({processed: 0});
    }
    if (!matchedDevice) {
      console.log('Ping results for device ' +
        id + ' failed: No device found.');
      return res.status(404).json({processed: 0});
    }

    let result = {};
    // Filling the result object
    // Sync with ACS
    // count in firmware is 100
    Object.keys(req.body.results).map((k) => {
      let p = req.body.results[k];
      if (p) {
        result[k] = {
          lat: p.lat,
          loss: p.loss,
          count: '100',
          completed: true,
        };
      }
    });

    // If ping command was sent from a customized api call,
    // we don't want to propagate it to the generic webhook
    if (matchedDevice.temp_command_trap &&
        matchedDevice.temp_command_trap.ping_hosts &&
        matchedDevice.temp_command_trap.ping_hosts.length > 0
    ) {
      matchedDevice.temp_command_trap.ping_hosts = [];
      if (matchedDevice.temp_command_trap.webhook_url != '') {
        let requestOptions = {};
        requestOptions.url = matchedDevice.temp_command_trap.webhook_url;
        requestOptions.method = 'PUT';
        requestOptions.json = {
          'id': matchedDevice._id,
          'type': 'device',
          'ping_results': result,
        };
        if (matchedDevice.temp_command_trap.webhook_user &&
            matchedDevice.temp_command_trap.webhook_secret
        ) {
          requestOptions.auth = {
            user: matchedDevice.temp_command_trap.webhook_user,
            pass: matchedDevice.temp_command_trap.webhook_secret,
          };
        }
        request(requestOptions).then(()=>{}, ()=>{});
      }
      // Not waiting for this save
      matchedDevice.save().catch((err) => {
        console.log('Error saving device after ping command: ' + err);
      });
    } else {
      // Not a customized ping call, send to generic trap
      deviceHandlers.sendPingToTraps(id, {results: result});
    }

    // We don't need to wait
    return res.status(200).json({processed: 1});
  });
};


deviceInfoController.receiveSpeedtestResult = function(req, res) {
  let id = req.headers['x-anlix-id'];
  let envsec = req.headers['x-anlix-sec'];

  if (process.env.FLM_BYPASS_SECRET == undefined) {
    if (envsec != req.app.locals.secret) {
      console.log('Error Receiving Speedtest: Secret not match!');
      return res.status(404).json({processed: 0});
    }
  }

  DeviceModel.findById(id, function(err, matchedDevice) {
    if (err) {
      console.log('Speedtest results for device ' +
        id + ' failed: Cant get device profile.');
      return res.status(400).json({processed: 0});
    }
    if (!matchedDevice) {
      console.log('Speedtest results for device ' +
        id + ' failed: No device found.');
      return res.status(404).json({processed: 0});
    }

    deviceHandlers.storeSpeedtestResult(matchedDevice, req.body);

    // We don't need to wait
    return res.status(200).json({processed: 1});
  });
};

deviceInfoController.receiveUpnp = function(req, res) {
  let id = req.headers['x-anlix-id'];
  let envsec = req.headers['x-anlix-sec'];

  if (process.env.FLM_BYPASS_SECRET == undefined) {
    if (envsec != req.app.locals.secret) {
      console.log('Error Receiving Upnp request: Secret not match!');
      return res.status(404).json({processed: 0});
    }
  }

  DeviceModel.findById(id, async function(err, matchedDevice) {
    if (err) {
      console.log('Upnp request for device ' + id +
        ' failed: Cant get device profile.');
      return res.status(400).json({processed: 0});
    }
    if (!matchedDevice) {
      console.log('Upnp request for device ' + id +
        ' failed: No device found.');
      return res.status(404).json({processed: 0});
    }

    let deviceMac = req.body.mac;
    let deviceName = req.body.name;
    let lanDevice = matchedDevice.lan_devices.find((d)=>d.mac===deviceMac);
    if (lanDevice) {
      lanDevice.upnp_name = deviceName;
      lanDevice.last_seen = Date.now();
    } else {
      matchedDevice.lan_devices.push({
        mac: deviceMac,
        upnp_name: deviceName,
        first_seen: Date.now(),
        last_seen: Date.now(),
      });
    }
    if (lanDevice.upnp_permission !== 'reject') {
      matchedDevice.upnp_requests.push(deviceMac); // add notification for app
    } else {
      console.log('Upnp request for device ' + id + ' ignored because of' +
        ' explicit user reject');
      return res.status(200).json({processed: 0, reason: 'User rejected upnp'});
    }
    await matchedDevice.save().catch((err) => {
      return res.status(500).json({processed: 0});
    });

    messaging.sendUpnpMessage(matchedDevice, deviceMac, deviceName);

    console.log('Upnp request for device ' + id +
      ' received successfully.');

    return res.status(200).json({processed: 1});
  });
};

deviceInfoController.receiveRouterUpStatus = function(req, res) {
  let id = req.headers['x-anlix-id'];
  let envsec = req.headers['x-anlix-sec'];

  if (process.env.FLM_BYPASS_SECRET == undefined) {
    if (envsec != req.app.locals.secret) {
      console.log('Error Receiving Devices: Secret not match!');
      return res.status(404).json({processed: 0});
    }
  }

  DeviceModel.findById(id, async function(err, matchedDevice) {
    if (err) {
      return res.status(400).json({processed: 0});
    }
    if (!matchedDevice) {
      return res.status(404).json({processed: 0});
    }
    let sysUpTime = parseInt(util.returnObjOrNum(req.body.sysuptime, 0));
    matchedDevice.sys_up_time = sysUpTime;
    let wanUpTime = parseInt(util.returnObjOrNum(req.body.wanuptime, 0));
    matchedDevice.wan_up_time = wanUpTime;
    if (util.isJSONObject(req.body.wanbytes)) {
      matchedDevice.wan_bytes = req.body.wanbytes;
    }
    await matchedDevice.save().catch((err) => {
      return res.status(500).json({processed: 0});
    });
    sio.anlixSendUpStatusNotification(id, req.body);
    sio.anlixSendWanBytesNotification(id, req.body);
    return res.status(200).json({processed: 1});
  });
};

deviceInfoController.receiveWpsResult = function(req, res) {
  let id = req.headers['x-anlix-id'];
  let envsec = req.headers['x-anlix-sec'];

  if (process.env.FLM_BYPASS_SECRET == undefined) {
    if (envsec != req.app.locals.secret) {
      console.log('Wps: Secrets do not match');
      return res.status(404).json({processed: 0});
    }
  }

  DeviceModel.findById(id, async function(err, matchedDevice) {
    if (err) {
      console.log('Wps: Error fetching database');
      return res.status(400).json({processed: 0});
    }
    if (!matchedDevice) {
      console.log('Wps: ' + id + ' not found');
      return res.status(404).json({processed: 0});
    }

    if (!('wps_inform' in req.body) || !('wps_content' in req.body)) {
      console.log('Wps: ' + id + ' wrong request body');
      return res.status(500).json({processed: 0});
    }
    const wpsInform = parseInt(req.body.wps_inform);

    if (wpsInform === 0) {
      matchedDevice.wps_is_active = (parseInt(req.body.wps_content) === 1);
    } else if (wpsInform === 2) {
      let errors = [];
      let macAddr = req.body.wps_content.trim().toUpperCase();
      const validator = new Validator();

      genericValidate(macAddr, validator.validateMac, 'mac', null, errors);
      if (errors.length < 1) {
        matchedDevice.wps_last_connected_date = Date.now();
        matchedDevice.wps_last_connected_mac = macAddr;
      } else {
        console.log('Wps: ' + id + ' wrong content format');
        return res.status(500).json({processed: 0});
      }
    }
    try {
      await matchedDevice.save();
      console.log('Wps: ' + id + ' received successfully');
      return res.status(200).json({processed: 1});
    } catch (err) {
      console.log('Wps: ' + id + ' database save error');
      return res.status(500).json({processed: 0});
    }
  });
};

module.exports = deviceInfoController;
