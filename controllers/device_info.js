
const DeviceModel = require('../models/device');
const Config = require('../models/config');
const Notification = require('../models/notification');
const mqtt = require('../mqtts');
const sio = require('../sio');
const Validator = require('../public/javascripts/device_validator');
const DeviceVersion = require('../models/device_version');
const async = require('asyncawait/async');
const await = require('asyncawait/await');
let deviceInfoController = {};

const returnObjOrEmptyStr = function(query) {
  if (typeof query !== 'undefined' && query) {
    return query;
  } else {
    return '';
  }
};

const returnObjOrStr = function(query, str) {
  if (typeof query !== 'undefined' && query) {
    return query;
  } else {
    return str;
  }
};

const returnObjOrNum = function(query, num) {
  if (typeof query !== 'undefined' && query) {
    return query;
  } else {
    return num;
  }
};

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

const createRegistry = function(req, res) {
  if (typeof req.body.id == 'undefined') {
    return res.status(400).end();
  }

  const validator = new Validator();
  const macAddr = req.body.id.trim().toUpperCase();

  let errors = [];
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  let wanIp = returnObjOrEmptyStr(req.body.wan_ip).trim();
  let wanSpeed = returnObjOrEmptyStr(req.body.wan_negociated_speed).trim();
  let wanDuplex = returnObjOrEmptyStr(req.body.wan_negociated_duplex).trim();
  let installedRelease = returnObjOrEmptyStr(req.body.release_id).trim();
  let model = returnObjOrEmptyStr(req.body.model).trim().toUpperCase() +
              returnObjOrEmptyStr(req.body.model_ver).trim().toUpperCase();
  let version = returnObjOrEmptyStr(req.body.version).trim();
  let connectionType = returnObjOrEmptyStr(req.body.connection_type).trim();
  let pppoeUser = returnObjOrEmptyStr(req.body.pppoe_user).trim();
  let pppoePassword = returnObjOrEmptyStr(req.body.pppoe_password).trim();
  let lanSubnet = returnObjOrEmptyStr(req.body.lan_addr).trim();
  let lanNetmask = parseInt(returnObjOrNum(req.body.lan_netmask, 24));
  let ssid = returnObjOrEmptyStr(req.body.wifi_ssid).trim();
  let password = returnObjOrEmptyStr(req.body.wifi_password).trim();
  let channel = returnObjOrEmptyStr(req.body.wifi_channel).trim();
  let band = returnObjOrEmptyStr(req.body.wifi_band).trim();
  let mode = returnObjOrEmptyStr(req.body.wifi_mode).trim();
  let ssid5ghz = returnObjOrEmptyStr(req.body.wifi_ssid_5ghz).trim();
  let password5ghz = returnObjOrEmptyStr(req.body.wifi_password_5ghz).trim();
  let channel5ghz = returnObjOrEmptyStr(req.body.wifi_channel_5ghz).trim();
  let band5ghz = returnObjOrStr(req.body.wifi_band_5ghz, 'VHT80').trim();
  let mode5ghz = returnObjOrStr(req.body.wifi_mode_5ghz, '11ac').trim();
  let pppoe = (pppoeUser !== '' && pppoePassword !== '');
  let flmUpdater = returnObjOrEmptyStr(req.body.flm_updater).trim();
  let is5ghzCapable =
    (returnObjOrEmptyStr(req.body.wifi_5ghz_capable).trim() == '1');

  // The syn came from flashbox keepalive procedure
  // Keepalive is designed to failsafe existing devices and not create new ones
  if (flmUpdater == '0') {
    return res.status(400).end();
  }

  Config.findOne({is_default: true}, function(err, matchedConfig) {
    if (err || !matchedConfig) {
      console.log('Error creating entry: ' + err);
      return res.status(500).end();
    }

    // Validate fields
    genericValidate(macAddr, validator.validateMac, 'mac', null, errors);
    if (connectionType != 'pppoe' && connectionType != 'dhcp' &&
        connectionType != '') {
      return res.status(500);
    }
    if (pppoe) {
      genericValidate(pppoeUser, validator.validateUser,
                      'pppoe_user', null, errors);
      genericValidate(pppoePassword, validator.validatePassword,
                      'pppoe_password', matchedConfig.pppoePassLength, errors);
    }
    genericValidate(ssid, validator.validateSSID,
                    'ssid', null, errors);
    genericValidate(password, validator.validateWifiPassword,
                    'password', null, errors);
    genericValidate(channel, validator.validateChannel,
                    'channel', null, errors);

    let permissions = DeviceVersion.findByVersion(version, is5ghzCapable);
    if (permissions.grantWifiBand) {
      genericValidate(band, validator.validateBand,
                      'band', null, errors);
      genericValidate(mode, validator.validateMode,
                      'mode', null, errors);
    }
    if (permissions.grantWifi5ghz) {
      genericValidate(ssid5ghz, validator.validateSSID,
                      'ssid5ghz', null, errors);
      genericValidate(password5ghz, validator.validateWifiPassword,
                      'password5ghz', null, errors);
      genericValidate(channel5ghz, validator.validateChannel,
                      'channel5ghz', null, errors);
      genericValidate(band5ghz, validator.validateBand,
                      'band5ghz', null, errors);
      genericValidate(mode5ghz, validator.validateMode,
                      'mode5ghz', null, errors);
    }

    if (errors.length < 1) {
      newDeviceModel = new DeviceModel({
        '_id': macAddr,
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
        'wifi_band': band,
        'wifi_mode': mode,
        'wifi_is_5ghz_capable': is5ghzCapable,
        'wifi_ssid_5ghz': ssid5ghz,
        'wifi_password_5ghz': password5ghz,
        'wifi_channel_5ghz': channel5ghz,
        'wifi_band_5ghz': band5ghz,
        'wifi_mode_5ghz': mode5ghz,
        'wan_ip': wanIp,
        'wan_negociated_speed': wanSpeed,
        'wan_negociated_duplex': wanDuplex,
        'ip': ip,
        'last_contact': Date.now(),
        'do_update': false,
        'do_update_parameters': false,
      });
      if (connectionType != '') {
        newDeviceModel.connection_type = connectionType;
      }
      newDeviceModel.save(function(err) {
        if (err) {
          console.log('Error creating entry: ' + err);
          return res.status(500).end();
        } else {
          return res.status(200).json({'do_update': false,
                                       'do_newprobe': true,
                                       'release_id:': installedRelease});
        }
      });
    } else {
      console.log('Error creating entry: ' + errors);
      return res.status(500).end();
    }
  });
};

const isJSONObject = function(val) {
  return val instanceof Object ? true : false;
};

const serializeBlocked = function(devices) {
  if (!devices) return [];
  return devices.map((device)=>device.mac + '|' + device.dhcp_name);
};

const serializeNamed = function(devices) {
  if (!devices) return [];
  return devices.map((device)=>device.mac + '|' + device.name);
};

const deepCopyObject = function(obj) {
  return JSON.parse(JSON.stringify(obj));
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
deviceInfoController.updateDevicesInfo = function(req, res) {
  if (process.env.FLM_BYPASS_SECRET == undefined) {
    if (req.body.secret != req.app.locals.secret) {
      console.log('Error in SYN: Secret not match!');
      return res.status(404).end();
    }
  }

  let devId = req.body.id.toUpperCase();
  DeviceModel.findById(devId, function(err, matchedDevice) {
    if (err) {
      console.log('Error finding device '+devId+': ' + err);
      return res.status(500).end();
    } else {
      if (matchedDevice == null) {
        createRegistry(req, res);
      } else {
        let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Update old entries
        if (!matchedDevice.get('do_update_parameters')) {
          matchedDevice.do_update_parameters = false;
        }

        // Parameters only modified on first comm between device and flashman
        let bodyModel =
          returnObjOrEmptyStr(req.body.model).trim().toUpperCase();
        let bodyModelVer =
          returnObjOrEmptyStr(req.body.model_ver).trim().toUpperCase();
        if (matchedDevice.model == '' || matchedDevice.model == bodyModel) {
          // Legacy versions include only model so let's include model version
          matchedDevice.model = bodyModel + bodyModelVer;
        }
        let lanSubnet = returnObjOrEmptyStr(req.body.lan_addr).trim();
        let lanNetmask = parseInt(returnObjOrNum(req.body.lan_netmask, 24));
        if (!matchedDevice.lan_subnet || matchedDevice.lan_subnet == '') {
          matchedDevice.lan_subnet = lanSubnet;
        }
        if (!matchedDevice.lan_netmask) {
          matchedDevice.lan_netmask = lanNetmask;
        }

        // Store if device has dual band capability
        const is5ghzCapable =
          (returnObjOrEmptyStr(req.body.wifi_5ghz_capable).trim() == '1');
        matchedDevice.wifi_is_5ghz_capable = is5ghzCapable;

        let sentVersion = returnObjOrEmptyStr(req.body.version).trim();
        if (matchedDevice.version != sentVersion) {
          console.log('Device '+ devId +' changed version to: '+ sentVersion);

          // Legacy registration only. Register advanced wireless
          // values for routers with versions older than 0.13.0.
          let permissionsSentVersion = DeviceVersion.findByVersion(
            sentVersion, is5ghzCapable);
          let permissionsCurrVersion = DeviceVersion.findByVersion(
            matchedDevice.version, is5ghzCapable);
          let errors = [];
          const validator = new Validator();
          if ( permissionsSentVersion.grantWifiBand &&
              !permissionsCurrVersion.grantWifiBand) {
            let band =
              returnObjOrEmptyStr(req.body.wifi_band).trim();
            let mode =
              returnObjOrEmptyStr(req.body.wifi_mode).trim();

            genericValidate(band, validator.validateBand,
                            'band', null, errors);
            genericValidate(mode, validator.validateMode,
                            'mode', null, errors);

            if (errors.length < 1) {
              matchedDevice.wifi_band = band;
              matchedDevice.wifi_mode = mode;
            }
          }
          if ( permissionsSentVersion.grantWifi5ghz &&
              !permissionsCurrVersion.grantWifi5ghz) {
            let ssid5ghz =
              returnObjOrEmptyStr(req.body.wifi_ssid_5ghz).trim();
            let password5ghz =
              returnObjOrEmptyStr(req.body.wifi_password_5ghz).trim();
            let channel5ghz =
              returnObjOrEmptyStr(req.body.wifi_channel_5ghz).trim();
            let band5ghz =
              returnObjOrStr(req.body.wifi_band_5ghz, 'VHT80').trim();
            let mode5ghz =
              returnObjOrStr(req.body.wifi_mode_5ghz, '11ac').trim();

            genericValidate(ssid5ghz, validator.validateSSID,
                            'ssid5ghz', null, errors);
            genericValidate(password5ghz, validator.validateWifiPassword,
                            'password5ghz', null, errors);
            genericValidate(channel5ghz, validator.validateChannel,
                            'channel5ghz', null, errors);
            genericValidate(band5ghz, validator.validateBand,
                            'band5ghz', null, errors);
            genericValidate(mode5ghz, validator.validateMode,
                            'mode5ghz', null, errors);

            if (errors.length < 1) {
              matchedDevice.wifi_ssid_5ghz = ssid5ghz;
              matchedDevice.wifi_password_5ghz = password5ghz;
              matchedDevice.wifi_channel_5ghz = channel5ghz;
              matchedDevice.wifi_band_5ghz = band5ghz;
              matchedDevice.wifi_mode_5ghz = mode5ghz;
            }
          }
          matchedDevice.version = sentVersion;
        }

        let sentNtp = returnObjOrEmptyStr(req.body.ntp).trim();
        if (matchedDevice.ntp_status != sentNtp) {
          console.log('Device '+ devId +' changed NTP STATUS to: '+ sentNtp);
          matchedDevice.ntp_status = sentNtp;
        }

        // Parameters *NOT* available to be modified by REST API
        matchedDevice.wan_ip =
        returnObjOrEmptyStr(req.body.wan_ip).trim();
        matchedDevice.wan_negociated_speed =
        returnObjOrEmptyStr(req.body.wan_negociated_speed).trim();
        matchedDevice.wan_negociated_duplex =
        returnObjOrEmptyStr(req.body.wan_negociated_duplex).trim();
        matchedDevice.ip = ip;
        matchedDevice.last_contact = Date.now();

        let hardReset = returnObjOrEmptyStr(req.body.hardreset).trim();
        if (hardReset == '1') {
          matchedDevice.last_hardreset = Date.now();
        }

        let upgradeInfo = returnObjOrEmptyStr(req.body.upgfirm).trim();
        if (upgradeInfo == '1') {
          if (matchedDevice.do_update) {
            console.log('Device ' + devId + ' upgraded successfuly');
            matchedDevice.do_update = false;
            matchedDevice.do_update_status = 1; // success
          } else {
            console.log(
              'WARNING: Device ' + devId +
              ' sent a upgrade ack but was not marked as upgradable!'
            );
          }
        }

        let sentRelease = returnObjOrEmptyStr(req.body.release_id).trim();
        matchedDevice.installed_release = sentRelease;

        let flmUpdater = returnObjOrEmptyStr(req.body.flm_updater).trim();
        if (flmUpdater == '1' || flmUpdater == '') {
          // The syn came from flashman_updater (or old routers...)

          // We can disable since the device will receive the update
          matchedDevice.do_update_parameters = false;
          // Remove notification to device using MQTT
          mqtt.anlixMessageRouterReset(matchedDevice._id);
        }

        matchedDevice.save();
        let blockedDevices = deepCopyObject(matchedDevice.lan_devices).filter(
          function(lanDevice) {
            if (lanDevice.is_blocked) {
              return true;
            } else {
              return false;
            }
          }
        );
        let namedDevices = deepCopyObject(matchedDevice.lan_devices).filter(
          function(lanDevice) {
            if ('name' in lanDevice && lanDevice.name != '') {
              return true;
            } else {
              return false;
            }
          }
        );
        Config.findOne({is_default: true}, function(err, matchedConfig) {
          let zabbixFqdn = '';
          if (matchedConfig && matchedConfig.measure_configs.zabbix_fqdn) {
            zabbixFqdn = matchedConfig.measure_configs.zabbix_fqdn;
          }
          return res.status(200).json({
            'do_update': matchedDevice.do_update,
            'do_newprobe': false,
            'mqtt_status': (matchedDevice._id in mqtt.clients),
            'release_id': returnObjOrEmptyStr(matchedDevice.release),
            'connection_type': returnObjOrEmptyStr(matchedDevice.connection_type),
            'pppoe_user': returnObjOrEmptyStr(matchedDevice.pppoe_user),
            'pppoe_password': returnObjOrEmptyStr(matchedDevice.pppoe_password),
            'lan_addr': returnObjOrEmptyStr(matchedDevice.lan_subnet),
            'lan_netmask': returnObjOrEmptyStr(matchedDevice.lan_netmask),
            'wifi_ssid': returnObjOrEmptyStr(matchedDevice.wifi_ssid),
            'wifi_password': returnObjOrEmptyStr(matchedDevice.wifi_password),
            'wifi_channel': returnObjOrEmptyStr(matchedDevice.wifi_channel),
            'wifi_band': returnObjOrEmptyStr(matchedDevice.wifi_band),
            'wifi_mode': returnObjOrEmptyStr(matchedDevice.wifi_mode),
            'wifi_ssid_5ghz': returnObjOrEmptyStr(matchedDevice.wifi_ssid_5ghz),
            'wifi_password_5ghz': returnObjOrEmptyStr(matchedDevice.wifi_password_5ghz),
            'wifi_channel_5ghz': returnObjOrEmptyStr(matchedDevice.wifi_channel_5ghz),
            'wifi_band_5ghz': returnObjOrEmptyStr(matchedDevice.wifi_band_5ghz),
            'wifi_mode_5ghz': returnObjOrEmptyStr(matchedDevice.wifi_mode_5ghz),
            'app_password': returnObjOrEmptyStr(matchedDevice.app_password),
            'zabbix_psk': returnObjOrEmptyStr(matchedDevice.measure_config.measure_psk),
            'zabbix_fqdn': zabbixFqdn,
            'zabbix_active': returnObjOrEmptyStr(matchedDevice.measure_config.is_active),
            'blocked_devices': serializeBlocked(blockedDevices),
            'named_devices': serializeNamed(namedDevices),
            'forward_index': returnObjOrEmptyStr(matchedDevice.forward_index),
          });
        });
      }
    }
  });
};

// Receive device firmware upgrade confirmation
deviceInfoController.confirmDeviceUpdate = function(req, res) {
  DeviceModel.findById(req.body.id, function(err, matchedDevice) {
    if (err) {
      console.log('Error finding device: ' + err);
      return res.status(500).end();
    } else {
      if (matchedDevice == null) {
        return res.status(500).end();
      } else {
        let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        matchedDevice.ip = ip;
        matchedDevice.last_contact = Date.now();
        let upgStatus = returnObjOrEmptyStr(req.body.status).trim();
        if (upgStatus == '1') {
          console.log('Device ' + req.body.id + ' is going on upgrade...');
        } else if (upgStatus == '0') {
          console.log('WARNING: Device ' + req.body.id +
                      ' failed in firmware check!');
          matchedDevice.do_update_status = 3; // img check failed
        } else if (upgStatus == '2') {
          console.log('WARNING: Device ' + req.body.id +
                      ' failed to download firmware!');
          matchedDevice.do_update_status = 2; // img download failed
        } else if (upgStatus == '') {
          console.log('WARNING: Device ' + req.body.id +
                      ' ack update on an old firmware! Reseting upgrade...');
          matchedDevice.do_update = false;
          matchedDevice.do_update_status = 1; // success
        }

        matchedDevice.save();
        return res.status(200).end();
      }
    }
  });
};

deviceInfoController.registerMqtt = function(req, res) {
  if (req.body.secret == req.app.locals.secret) {
    DeviceModel.findById(req.body.id, function(err, matchedDevice) {
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
      if (!matchedDevice.mqtt_secret) {
        matchedDevice.mqtt_secret = req.body.mqttsecret;
        matchedDevice.save();
        console.log('Device ' +
          req.body.id + ' register MQTT secret successfully.');
        return res.status(200).json({is_registered: 1});
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
              'message': 'Este firmware Flashbox foi ' +
                         'modificado ou substituído localmente',
              'message_code': 1,
              'severity': 'alert',
              'type': 'communication',
              'action_title': 'Permitir comunicação',
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

deviceInfoController.registerApp = function(req, res) {
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

deviceInfoController.registerPassword = function(req, res) {
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

deviceInfoController.removeApp = function(req, res) {
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

deviceInfoController.appSetWifi = function(req, res) {
  let processFunction = (content, device, rollback) => {
    let updateParameters = false;
    if (content.hasOwnProperty('pppoe_user')) {
      rollback.pppoe_user = device.pppoe_user;
      device.pppoe_user = content.pppoe_user;
      updateParameters = true;
    }
    if (content.hasOwnProperty('pppoe_password')) {
      rollback.pppoe_password = device.pppoe_password;
      device.pppoe_password = content.pppoe_password;
      updateParameters = true;
    }
    if (content.hasOwnProperty('wifi_ssid')) {
      rollback.wifi_ssid = device.wifi_ssid;
      device.wifi_ssid = content.wifi_ssid;
      updateParameters = true;
    }
    if (content.hasOwnProperty('wifi_password')) {
      rollback.wifi_password = device.wifi_password;
      device.wifi_password = content.wifi_password;
      updateParameters = true;
    }
    if (content.hasOwnProperty('wifi_channel')) {
      rollback.wifi_channel = device.wifi_channel;
      device.wifi_channel = content.wifi_channel;
      updateParameters = true;
    }
    return updateParameters;
  };
  appSet(req, res, processFunction);
};

deviceInfoController.appSetPassword = function(req, res) {
  let processFunction = (content, device, rollback) => {
    if (content.hasOwnProperty('app_password')) {
      rollback.app_password = device.app_password;
      device.app_password = content.app_password;
      return true;
    }
    return false;
  };
  appSet(req, res, processFunction);
};

deviceInfoController.appSetBlacklist = function(req, res) {
  let processFunction = (content, device, rollback) => {
    let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
    if (content.hasOwnProperty('blacklist_device') &&
        content.blacklist_device.hasOwnProperty('mac') &&
        content.blacklist_device.mac.match(macRegex)) {
      // Deep copy lan devices for rollback
      rollback.lan_devices = deepCopyObject(device.lan_devices);
      // Search blocked device
      let blackMacDevice = content.blacklist_device.mac.toLowerCase();
      for (let idx = 0; idx < device.lan_devices.length; idx++) {
        if (device.lan_devices[idx].mac == blackMacDevice) {
          if (device.lan_devices[idx].is_blocked) {
            return false;
          } else {
            device.lan_devices[idx].is_blocked = true;
            return true;
          }
        }
      }
      // Mac address not found
      device.lan_devices.push({
        mac: blackMacDevice,
        dhcp_name: content.blacklist_device.id,
        is_blocked: true,
      });
      return true;
    }
    return false;
  };
  appSet(req, res, processFunction);
};

deviceInfoController.appSetWhitelist = function(req, res) {
  let processFunction = (content, device, rollback) => {
    let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
    if (content.hasOwnProperty('whitelist_device') &&
        content.whitelist_device.hasOwnProperty('mac') &&
        content.whitelist_device.mac.match(macRegex)) {
      // Deep copy lan devices for rollback
      rollback.lan_devices = deepCopyObject(device.lan_devices);
      // Search device to unblock
      let whiteMacDevice = content.whitelist_device.mac.toLowerCase();
      for (let idx = 0; idx < device.lan_devices.length; idx++) {
        if (device.lan_devices[idx].mac == whiteMacDevice) {
          if (device.lan_devices[idx].is_blocked) {
            device.lan_devices[idx].is_blocked = false;
            return true;
          } else {
            return false;
          }
        }
      }
    }
    // Mac address not found or error parsing content
    return false;
  };
  appSet(req, res, processFunction);
};

deviceInfoController.appSetDeviceInfo = function(req, res) {
  let processFunction = (content, device, rollback) => {
    let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
    if (content.hasOwnProperty('device_configs') &&
        content.device_configs.hasOwnProperty('mac') &&
        content.device_configs.mac.match(macRegex)) {
      // Deep copy lan devices for rollback
      rollback.lan_devices = deepCopyObject(device.lan_devices);
      let newLanDevice = true;
      let macDevice = content.device_configs.mac.toLowerCase();
      for (let idx = 0; idx < device.lan_devices.length; idx++) {
        if (device.lan_devices[idx].mac == macDevice) {
          device.lan_devices[idx].name = content.device_configs.name;
          newLanDevice = false;
        }
      }
      if (newLanDevice) {
        device.lan_devices.push({
          mac: macDevice,
          name: content.device_configs.name,
        });
      }
      return true;
    }
    return false;
  };
  appSet(req, res, processFunction);
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

  DeviceModel.findById(id, function(err, matchedDevice) {
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

    if (bootType == 'FIRST') {
      matchedDevice.firstboot_log = new Buffer(req.body);
      matchedDevice.firstboot_date = Date.now();
      matchedDevice.save();
      console.log('Log Receiving for device ' +
        id + ' successfully. FIRST BOOT');
    } else if (bootType == 'BOOT') {
      matchedDevice.lastboot_log = new Buffer(req.body);
      matchedDevice.lastboot_date = Date.now();
      matchedDevice.save();
      console.log('Log Receiving for device ' +
        id + ' successfully. LAST BOOT');
    } else if (bootType == 'LIVE') {
      sio.anlixSendLiveLogNotifications(id, req.body);
      console.log('Log Receiving for device ' +
        id + ' successfully. LIVE');
    }

    return res.status(200).json({processed: 1});
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

      let res_out = matchedDevice.lan_devices.filter(function(lanDevice) {
      if ( typeof lanDevice.port !== 'undefined' && lanDevice.port.length > 0 ) {
        return true;
      } else {
        return false;
      }});

      let out_data = [];
      for(var i = 0; i < res_out.length; i++) {
        tmp_data = {};
        tmp_data.mac = res_out[i].mac;
        tmp_data.port = res_out[i].port;
        tmp_data.dmz = res_out[i].dmz;

        if(('router_port' in res_out[i]) && 
            res_out[i].router_port.length != 0)
          tmp_data.router_port = res_out[i].router_port

        out_data.push(tmp_data)
      }

      if (matchedDevice.forward_index) {
        return res.status(200).json({
          'success': true,
          'forward_index': matchedDevice.forward_index,
          'forward_rules': out_data,
        });
      }
    });
  } else {
    console.log('Router ' + req.body.id + ' Get Port Forwards ' +
      'failed: Client Secret not match!');
    return res.status(401).json({success: false});
  }
};

deviceInfoController.receiveDevices = function(req, res) {
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
      console.log('Devices Receiving for device ' +
        id + ' failed: Cant get device profile.');
      return res.status(400).json({processed: 0});
    }
    if (!matchedDevice) {
      console.log('Devices Receiving for device ' +
        id + ' failed: No device found.');
      return res.status(404).json({processed: 0});
    }

    let devsData = req.body.Devices;
    let outData = [];

    for (let connDeviceMac in devsData) {
      let upConnDevMac = connDeviceMac.toLowerCase();
      let upConnDev = devsData[upConnDevMac];
      let outDev = {};
      let devreg = matchedDevice.getLanDevice(upConnDevMac);
      if(devreg){
        if(upConnDev.hostname && upConnDev.hostname != '' && upConnDev.hostname != '!')
          devreg.dhcp_name = upConnDev.hostname;
        if(!devreg.first_seen)
          devreg.first_seen = Date.now();
        devreg.last_seen = Date.now();
        if(devreg.name && devreg.name != '')
          outDev.hostname = devreg.name;
        else 
          outDev.hostname = devreg.dhcp_name;
      } else {
        matchedDevice.lan_devices.push({
          mac: upConnDevMac,
          dhcp_name: (upConnDev.hostname != '' && upConnDev.hostname != '!')? upConnDev.hostname : '',
          first_seen: Date.now(),
          last_seen: Date.now(),
        });
        outDev.hostname = (upConnDev.hostname != '' && upConnDev.hostname != '!')? upConnDev.hostname : '';
      }
      outDev.mac = upConnDevMac;
      outData.push(outDev);
    }

    matchedDevice.save();

    // if someone is waiting for this message, send the information
    sio.anlixSendOnlineDevNotifications(id, outData);
    console.log('Devices Receiving for device ' +
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

    sio.anlixSendPingTestNotifications(id, req.body);
    console.log('Ping results for device ' +
      id + ' received successfully.');

    return res.status(200).json({processed: 1});
  });
};

deviceInfoController.getZabbixConfig = async(function(req, res) {
  let id = req.headers['x-anlix-id'];
  let envsec = req.headers['x-anlix-sec'];

  // Check secret to authenticate api call
  if (process.env.FLM_BYPASS_SECRET == undefined) {
    if (envsec !== req.app.locals.secret) {
      console.log('Router ' + id + ' Get Zabbix Conf fail: Secret not match');
      return res.status(403).json({success: 0});
    }
  }

  try {
    // Check if zabbix fqdn config is set
    let config = await(Config.findOne({is_default: true}));
    if (!config) throw new {message: 'Config not found'};
    if (!config.measure_configs.zabbix_fqdn) {
      throw new {message: 'Zabbix FQDN not configured'};
    }

    // Check if device has a zabbix psk configured
    let device = await(DeviceModel.findById(id));
    if (!device) throw new {message: 'Device ' + id + ' not found'};
    if (!device.measure_config.measure_psk) {
      throw new {message: 'Device ' + id + ' has no psk configured'};
    }

    // Reply with zabbix fqdn and device zabbix psk
    return res.status(200).json({
      success: 1,
      psk: device.measure_config.measure_psk,
      fqdn: config.measure_configs.zabbix_fqdn,
      is_active: device.measure_config.is_active,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({success: 0});
  }
});

module.exports = deviceInfoController;
