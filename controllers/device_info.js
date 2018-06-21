
const DeviceModel = require('../models/device');
const mqtt = require('../mqtts');
const externMqtt = require('mqtt');
const Validator = require('../public/javascripts/device_validator');
let deviceInfoController = {};

const returnObjOrEmptyStr = function(query) {
  if (typeof query !== 'undefined' && query) {
    return query;
  } else {
    return '';
  }
};

const createRegistry = function(req, res) {
  if (typeof req.body.id == 'undefined') {
    return res.status(400);
  }

  const validator = new Validator();
  const macAddr = req.body.id.trim().toUpperCase();

  let errors = [];
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  let wanIp = returnObjOrEmptyStr(req.body.wan_ip).trim();
  let release = returnObjOrEmptyStr(req.body.release_id).trim();
  let model = returnObjOrEmptyStr(req.body.model).trim() +
              returnObjOrEmptyStr(req.body.model_ver).trim();
  let version = returnObjOrEmptyStr(req.body.version).trim();
  let connectionType = returnObjOrEmptyStr(req.body.connection_type).trim();
  let pppoeUser = returnObjOrEmptyStr(req.body.pppoe_user).trim();
  let pppoePassword = returnObjOrEmptyStr(req.body.pppoe_password).trim();
  let ssid = returnObjOrEmptyStr(req.body.wifi_ssid).trim();
  let password = returnObjOrEmptyStr(req.body.wifi_password).trim();
  let channel = returnObjOrEmptyStr(req.body.wifi_channel).trim();
  let pppoe = (pppoeUser !== '' && pppoePassword !== '');

  let genericValidate = function(field, func, key) {
    let validField = func(field);
    if (!validField.valid) {
      validField.err.forEach(function(error) {
        let obj = {};
        obj[key] = error;
        errors.push(obj);
      });
    }
  };

  // Validate fields
  genericValidate(macAddr, validator.validateMac, 'mac');
  if (connectionType != 'pppoe' && connectionType != 'dhcp' &&
      connectionType != '') {
    return res.status(500);
  }
  if (pppoe) {
    genericValidate(pppoeUser, validator.validateUser, 'pppoe_user');
    genericValidate(pppoePassword, validator.validatePassword,
                    'pppoe_password');
  }
  genericValidate(ssid, validator.validateSSID, 'ssid');
  genericValidate(password, validator.validateWifiPassword, 'password');
  genericValidate(channel, validator.validateChannel, 'channel');

  if (errors.length < 1) {
    newDeviceModel = new DeviceModel({
      '_id': macAddr,
      'model': model,
      'version': version,
      'release': release,
      'connection_type': connectionType,
      'pppoe_user': pppoeUser,
      'pppoe_password': pppoePassword,
      'wifi_ssid': ssid,
      'wifi_password': password,
      'wifi_channel': channel,
      'wan_ip': wanIp,
      'ip': ip,
      'last_contact': Date.now(),
      'do_update': false,
      'do_update_parameters': false,
    });
    newDeviceModel.save(function(err) {
      if (err) {
        console.log('Error creating entry: ' + err);
        return res.status(500);
      } else {
        return res.status(200).json({'do_update': false,
                                     'release_id:': release});
      }
    });
  } else {
    return res.status(500);
  }
};

const isJSONObject = function(val) {
  return val instanceof Object ? true : false;
};

// Create new device entry or update an existing one
deviceInfoController.updateDevicesInfo = function(req, res) {
  DeviceModel.findById(req.body.id.toUpperCase(), function(err, matchedDevice) {
    if (err) {
      console.log('Error finding device: ' + err);
      return res.status(500);
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
        if (matchedDevice.model == '' ||
          matchedDevice.model == returnObjOrEmptyStr(req.body.model).trim()
        ) {
          // Legacy versions include only model so let's include model version
          matchedDevice.model = returnObjOrEmptyStr(req.body.model).trim() +
                                returnObjOrEmptyStr(req.body.model_ver).trim();
        }
        if (matchedDevice.version == '') {
          matchedDevice.version = returnObjOrEmptyStr(req.body.version).trim();
        }
        if (matchedDevice.release == '') {
          matchedDevice.release = returnObjOrEmptyStr(req.body.release_id).trim();
        }

        // Parameters *NOT* available to be modified by REST API
        matchedDevice.wan_ip = returnObjOrEmptyStr(req.body.wan_ip).trim();
        matchedDevice.ip = ip;
        matchedDevice.last_contact = Date.now();

        // We can disable since the device will receive the update
        matchedDevice.do_update_parameters = false;

        // Remove notification to device using MQTT
        if (process.env.FLM_MQTT_BROKER) {
          // Send notification to device using external MQTT server
          let client = externMqtt.connect(process.env.FLM_MQTT_BROKER);
          client.on('connect', function() {
            client.publish(
              'flashman/update/' + matchedDevice._id,
              '', {qos: 1, retain: true}); // topic, msg, options
            client.end();
          });
        } else {
          mqtt.anlix_message_router_reset(matchedDevice._id);
        }

        matchedDevice.save();
        return res.status(200).json({
          'do_update': matchedDevice.do_update,
          'release_id': returnObjOrEmptyStr(matchedDevice.release),
          'connection_type': returnObjOrEmptyStr(matchedDevice.connection_type),
          'pppoe_user': returnObjOrEmptyStr(matchedDevice.pppoe_user),
          'pppoe_password': returnObjOrEmptyStr(matchedDevice.pppoe_password),
          'wifi_ssid': returnObjOrEmptyStr(matchedDevice.wifi_ssid),
          'wifi_password': returnObjOrEmptyStr(matchedDevice.wifi_password),
          'wifi_channel': returnObjOrEmptyStr(matchedDevice.wifi_channel),
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
      return res.status(500);
    } else {
      if (matchedDevice == null) {
        return res.status(500);
      } else {
        let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        matchedDevice.ip = ip;
        matchedDevice.last_contact = Date.now();
        matchedDevice.do_update = false;
        matchedDevice.save();
        return res.status(200);
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
      matchedDevice.mqtt_secret = req.body.mqttsecret;
      matchedDevice.save();
      console.log('Device ' +
        req.body.id + ' register MQTT secret successfully.');
      return res.status(200).json({is_registered: 1});
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

deviceInfoController.appSet = function(req, res) {
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
      let updateParameters = false;

      if (content.hasOwnProperty('pppoe_user')) {
        matchedDevice.pppoe_user = content.pppoe_user;
        updateParameters = true;
      }
      if (content.hasOwnProperty('pppoe_password')) {
        matchedDevice.pppoe_password = content.pppoe_password;
        updateParameters = true;
      }
      if (content.hasOwnProperty('wifi_ssid')) {
        matchedDevice.wifi_ssid = content.wifi_ssid;
        updateParameters = true;
      }
      if (content.hasOwnProperty('wifi_password')) {
        matchedDevice.wifi_password = content.wifi_password;
        updateParameters = true;
      }
      if (content.hasOwnProperty('wifi_channel')) {
        matchedDevice.wifi_channel = content.wifi_channel;
        updateParameters = true;
      }
      if (updateParameters) {
        matchedDevice.do_update_parameters = true;
      }

      matchedDevice.save();

      if (process.env.FLM_MQTT_BROKER) {
        // Send notification to device using external MQTT server
        let client = externMqtt.connect(process.env.FLM_MQTT_BROKER);
        client.on('connect', function() {
          client.publish(
            'flashman/update/' + matchedDevice._id,
            '1', {qos: 1, retain: true}); // topic, msg, options
          client.end();
        });
      } else {
        mqtt.anlix_message_router_update(matchedDevice._id);
      }

      return res.status(200).json({is_set: 1});
    } else {
      return res.status(500).json({is_set: 0});
    }
  });
};

module.exports = deviceInfoController;
