const DeviceModel = require('../models/device');
const Config = require('../models/config');
const mqtt = require('../mqtts');
const DeviceVersion = require('../models/device_version');
const async = require('asyncawait/async');
const await = require('asyncawait/await');

let appDeviceAPIController = {};

const isJSONObject = function(val) {
  return val instanceof Object ? true : false;
};

const deepCopyObject = function(obj) {
  return JSON.parse(JSON.stringify(obj));
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

    if (isJSONObject(req.body.content)) {
      let content = req.body.content;
      let rollbackValues = {};

      if (processFunction(content, matchedDevice, rollbackValues)) {
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

      mqtt.anlixMessageRouterUpdate(matchedDevice._id, hashSuffix);

      checkUpdateParametersDone(matchedDevice._id, 0, commandTimeout)
      .then((done)=>{
        if (done) return res.status(200).json({is_set: 1});
        doRollback(matchedDevice, rollbackValues);
        matchedDevice.save();
        return res.status(500).json({is_set: 0});
      }, (rejectedVal)=>{
        doRollback(matchedDevice, rollbackValues);
        matchedDevice.save();
        return res.status(500).json({is_set: 0});
      });
    } else {
      return res.status(500).json({is_set: 0});
    }
  });
};

let processWifi = function(content, device, rollback) {
  let updateParameters = false;
  if (content.pppoe_user) {
    rollback.pppoe_user = device.pppoe_user;
    device.pppoe_user = content.pppoe_user;
    updateParameters = true;
  }
  if (content.pppoe_password) {
    rollback.pppoe_password = device.pppoe_password;
    device.pppoe_password = content.pppoe_password;
    updateParameters = true;
  }
  if (content.wifi_ssid) {
    rollback.wifi_ssid = device.wifi_ssid;
    device.wifi_ssid = content.wifi_ssid;
    updateParameters = true;
  }
  if (content.wifi_ssid_5ghz) {
    rollback.wifi_ssid_5ghz = device.wifi_ssid_5ghz;
    device.wifi_ssid_5ghz = content.wifi_ssid_5ghz;
    updateParameters = true;
  }
  if (content.wifi_password) {
    rollback.wifi_password = device.wifi_password;
    device.wifi_password = content.wifi_password;
    updateParameters = true;
  }
  if (content.wifi_password_5ghz) {
    rollback.wifi_password_5ghz = device.wifi_password_5ghz;
    device.wifi_password_5ghz = content.wifi_password_5ghz;
    updateParameters = true;
  }
  if (content.wifi_channel) {
    rollback.wifi_channel = device.wifi_channel;
    device.wifi_channel = content.wifi_channel;
    updateParameters = true;
  }
  if (content.wifi_band) {
    rollback.wifi_band = device.wifi_band;
    device.wifi_band = content.wifi_band;
    updateParameters = true;
  }
  if (content.wifi_mode) {
    rollback.wifi_mode = device.wifi_mode;
    device.wifi_mode = content.wifi_mode;
    updateParameters = true;
  }
  if (content.wifi_channel_5ghz) {
    rollback.wifi_channel_5ghz = device.wifi_channel_5ghz;
    device.wifi_channel_5ghz = content.wifi_channel_5ghz;
    updateParameters = true;
  }
  if (content.wifi_band_5ghz) {
    rollback.wifi_band_5ghz = device.wifi_band_5ghz;
    device.wifi_band_5ghz = content.wifi_band_5ghz;
    updateParameters = true;
  }
  if (content.wifi_mode_5ghz) {
    rollback.wifi_mode_5ghz = device.wifi_mode_5ghz;
    device.wifi_mode_5ghz = content.wifi_mode_5ghz;
    updateParameters = true;
  }
  return updateParameters;
};

let processPassword = function(content, device, rollback) {
  if (content.hasOwnProperty('app_password')) {
    rollback.app_password = device.app_password;
    device.app_password = content.app_password;
    return true;
  }
  return false;
};

let processBlacklist = function(content, device, rollback) {
  let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
  // Legacy checks
  if (content.hasOwnProperty('blacklist_device') &&
      content.blacklist_device.hasOwnProperty('mac') &&
      content.blacklist_device.mac.match(macRegex)) {
    // Deep copy lan devices for rollback
    if (!rollback.lan_devices) {
      rollback.lan_devices = deepCopyObject(device.lan_devices);
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
  }
  else if (content.hasOwnProperty('device_configs') &&
           content.device_configs.hasOwnProperty('mac') &&
           content.device_configs.mac.match(macRegex) &&
           content.device_configs.hasOwnProperty('block') &&
           content.device_configs.block === true) {
    if (!rollback.lan_devices) {
      rollback.lan_devices = deepCopyObject(device.lan_devices);
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

let processWhitelist = function(content, device, rollback) {
  let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
  // Legacy checks
  if (content.hasOwnProperty('whitelist_device') &&
      content.whitelist_device.hasOwnProperty('mac') &&
      content.whitelist_device.mac.match(macRegex)) {
    // Deep copy lan devices for rollback
    if (!rollback.lan_devices) {
      rollback.lan_devices = deepCopyObject(device.lan_devices);
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
  }
  else if (content.hasOwnProperty('device_configs') &&
           content.device_configs.hasOwnProperty('mac') &&
           content.device_configs.mac.match(macRegex) &&
           content.device_configs.hasOwnProperty('block') &&
           content.device_configs.block === false) {
    if (!rollback.lan_devices) {
      rollback.lan_devices = deepCopyObject(device.lan_devices);
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

let processDeviceInfo = function(content, device, rollback) {
  let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
  if (content.hasOwnProperty('device_configs') &&
      content.device_configs.hasOwnProperty('mac') &&
      content.device_configs.mac.match(macRegex)) {
    // Deep copy lan devices for rollback
    if (!rollback.lan_devices) {
      rollback.lan_devices = deepCopyObject(device.lan_devices);
    }
    let newLanDevice = true;
    let configs = content.device_configs;
    let macDevice = configs.mac.toLowerCase();
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

let processAll = function(content, device, rollback) {
  processWifi(content, device, rollback);
  processPassword(content, device, rollback);
  processBlacklist(content, device, rollback);
  processWhitelist(content, device, rollback);
  processDeviceInfo(content, device, rollback);
};

let formatDevices = function(device) {
  let allRules = [];
  const justNow = Date.now();
  let lanDevices = device.lan_devices.filter((device)=>{
    const lastSeen = ((device.last_seen) ?
                      device.last_seen : new Date(1970, 1, 1));
    const timeDiff = Math.abs(justNow - lastSeen);
    const timeDiffSeconds = Math.floor(timeDiff / 3600);
    return (timeDiffSeconds < 86400);
  }).map((lanDevice)=>{
    let name = lanDevice.mac;
    if (lanDevice.name) {
      name = lanDevice.name;
    } else if (lanDevice.dhcp_name !== '' && lanDevice.dhcp_name !== '!') {
      name = lanDevice.dhcp_name;
    }
    let numRules = lanDevice.port.length;
    let rules = [];
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
    const lastSeen = ((lanDevice.last_seen) ?
                      lanDevice.last_seen : new Date(1970, 1, 1));
    const timeDiff = Math.abs(justNow - lastSeen);
    const timeDiffSeconds = Math.floor(timeDiff / 3600);
    let online = (timeDiffSeconds < 5);
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
      online: online,
      signal: signal,
      is_wifi: isWifi,
    };
  });
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
        }
        else if (!deviceObj) {
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
      return res.status(404).json({message: 'Device não encontrado'});
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

    // Send mqtt message to update devices on flashman db
    mqtt.anlixMessageRouterReboot(req.body.id);

    return res.status(200).json({
      success: mqtt.clients[req.body.id.toUpperCase()] ? true : false,
    });
  });
};

appDeviceAPIController.refreshInfo = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'Device não encontrado'});
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

    // Send mqtt message to update devices on flashman db
    if (req.body.content.do_device_update) {
      mqtt.anlixMessageRouterOnlineLanDevs(req.body.id);
    }

    return res.status(200).json({
      has_access: mqtt.clients[req.body.id.toUpperCase()] ? true : false,
      devices_timestamp: matchedDevice.last_devices_refresh,
    });
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
  DeviceModel.findById(req.body.id).lean().exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'Device não encontrado'});
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
    if (req.body.content.password !== matchedDevice.app_password) {
      return res.status(403).json({message: 'Senha errada'});
    }

    // Send mqtt message to update devices on flashman db
    mqtt.anlixMessageRouterOnlineLanDevs(req.body.id);

    // Check if FCM ID has changed, update if so
    let appid = req.body.app_id;
    let fcmid = req.body.content.fcmToken;
    let lanDevice = matchedDevice.lan_devices.find((d)=>d.app_uid===appid);
    if (fcmid && lanDevice && fcmid !== lanDevice.fcm_uid) {
      // Query again but this time without .lean() so we can edit register
      DeviceModel.findById(req.body.id).exec(function(err, matchedDeviceEdit) {
        if (err || !matchedDeviceEdit) return;
        let device = matchedDeviceEdit.lan_devices.find((d)=>d.app_uid===appid);
        device.fcm_uid = fcmid;
        device.last_seen = Date.now();
        matchedDeviceEdit.save();
      });
    }

    // Fetch permissions and wifi configuration from database
    let permissions = DeviceVersion.findByVersion(
      matchedDevice.version, matchedDevice.wifi_is_5ghz_capable
    );

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

    let localDevice = matchedDevice.lan_devices.find((device)=>{
      return req.body.app_id === device.app_uid;
    });
    let localMac = localDevice ? localDevice.mac : '';

    return res.status(200).json({
      permissions: permissions,
      wifi: wifiConfig,
      localMac: localMac,
      model: matchedDevice.model,
      version: matchedDevice.version,
      release: matchedDevice.installed_release,
      devices_timestamp: matchedDevice.last_devices_refresh,
      has_access: mqtt.clients[req.body.id.toUpperCase()] ? true : false,
    });
  });
};

appDeviceAPIController.appGetVersion = function(req, res) {
  DeviceModel.findById(req.body.id).lean().exec(function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({message: 'Erro interno'});
    }
    if (!matchedDevice) {
      return res.status(404).json({message: 'Device não encontrado'});
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
      matchedDevice.version, matchedDevice.wifi_is_5ghz_capable
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
      return res.status(404).json({message: 'Device não encontrado'});
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
      return res.status(404).json({message: 'Device não encontrado'});
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

module.exports = appDeviceAPIController;
