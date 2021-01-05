const DeviceModel = require('../models/device');
const DeviceVersion = require('../models/device_version');
const UserModel = require('../models/user');
const Role = require('../models/role');
const ConfigModel = require('../models/config');
const keyHandlers = require('./handlers/keys');
const deviceHandlers = require('./handlers/devices');
const meshHandlers = require('./handlers/mesh');
const acsDeviceInfo = require('./acs_device_info.js');
const mqtt = require('../mqtts');
const async = require('asyncawait/async');
const await = require('asyncawait/await');
const debug = require('debug')('APP');
const fs = require('fs');

let diagAppAPIController = {};

const convertDiagnostic = function(diagnostic) {
  return {
    wan: (diagnostic && diagnostic.wan === 0),
    tr069: (diagnostic && diagnostic.tr069 === 0),
    ipv4: (diagnostic && diagnostic.ipv4 === 0),
    ipv6: (diagnostic && diagnostic.ipv6 === 0),
    dns: (diagnostic && diagnostic.dns === 0),
    anlix: (diagnostic && diagnostic.anlix === 0),
    flashman: (diagnostic && diagnostic.flashman === 0),
  };
};

const convertWifi = function(wifiConfig) {
  let two = (wifiConfig) ? wifiConfig['2ghz'] : null;
  let five = (wifiConfig) ? wifiConfig['5ghz'] : null;
  return {
    hasFive: (five) ? true : false,
    two: {
      ssid: (two && two.ssid) ? two.ssid : '',
      channel: (two && two.channel) ? two.channel : '',
      band: (two && two.band) ? two.band : '',
      mode: (two && two.mode) ? two.mode : '',
    },
    five: {
      ssid: (five && five.ssid) ? five.ssid : '',
      channel: (five && five.channel) ? five.channel : '',
      band: (five && five.band) ? five.band : '',
      mode: (five && five.mode) ? five.mode : '',
    },
  };
};

const convertStringList = function(list) {
  return list.filter((element)=>typeof element === 'string');
};

const convertMesh = function(mesh) {
  return {
    mode: (mesh && mesh.mode) ? mesh.mode : 0,
    updatedSlaves: (mesh && mesh.updatedSlaves) ?
                   convertStringList(mesh.updatedSlaves) : [],
    originalSlaves: (mesh && mesh.originalSlaves) ?
                    convertStringList(mesh.originalSlaves) : [],
  };
};

const pushCertification = function(arr, c, finished) {
  arr.push({
    finished: finished,
    mac: c.mac,
    onuMac: (c.onuMac) ? c.onuMac : '',
    isOnu: (c.isONU) ? c.isONU : false,
    routerModel: (c.routerModel) ? c.routerModel : '',
    routerVersion: (c.routerVersion) ? c.routerVersion : '',
    routerRelease: (c.routerRelease) ? c.routerRelease : '',
    localEpochTimestamp: (c.timestamp) ? c.timestamp : 0,
    didDiagnose: (c.didDiagnose) ? c.didDiagnose : false,
    diagnostic: convertDiagnostic(c.diagnostic),
    didConfigureWan: (c.didWan) ? c.didWan : false,
    wanConfigOnu: (c.wanConfigOnu) ? c.wanConfigOnu : '',
    didConfigureTR069: (c.didTR069) ? c.didTR069 : false,
    routerConnType: (c.routerConnType) ? c.routerConnType : '',
    pppoeUser: (c.pppoeUser) ? c.pppoeUser : '',
    bridgeIP: (c.bridgeIP) ? c.bridgeIP : '',
    bridgeGateway: (c.bridgeGateway) ? c.bridgeGateway : '',
    bridgeDNS: (c.bridgeDNS) ? c.bridgeDNS : '',
    bridgeSwitch: (c.bridgeSwitch) ? c.bridgeSwitch : true,
    didConfigureWifi: (c.didWifi) ? c.didWifi : false,
    wifiConfig: convertWifi(c.wifiConfig),
    didConfigureMesh: (c.didMesh) ? c.didMesh : false,
    mesh: convertMesh(c.mesh),
    didConfigureContract: (c.didContract) ? c.didContract : false,
    didConfigureObservation: (c.didObservation) ? c.didObservation : false,
    contract: (c.contract) ? c.contract : '',
    observations: (c.observations) ? c.observations : '',
    cancelReason: (c.reason) ? c.reason : '',
    latitude: (c.latitude) ? c.latitude : 0,
    longitude: (c.longitude) ? c.longitude : 0,
  });
};

const generateSessionCredential = function(user) {
  let sessionExpirationDate = new Date().getTime();
  sessionExpirationDate += (7*24*60*60); // 7 days
  debug('User expiration session (epoch) is: ' + sessionExpirationDate);
  // This JSON format is dictated by auth inside firmware
  let expirationCredential = {
    user: user,
    // Must be epoch
    expire: sessionExpirationDate,
  };
  let buff = new Buffer(JSON.stringify(expirationCredential));
  let b64Json = buff.toString('base64');
  let encryptedB64Json = await(keyHandlers.encryptMsg(b64Json));
  let session = {credential: b64Json, sign: encryptedB64Json};
  // Add onu config, if present
  let config = await(ConfigModel.findOne({is_default: true}, 'tr069')
    .exec().catch((err) => err));
  if (config && config.tr069 && config.tr069.web_password) {
    session.onuPassword = config.tr069.web_password;
  }
  return session;
};

diagAppAPIController.sessionLogin = function(req, res) {
  UserModel.findOne({name: req.body.user}, function(err, user) {
    if (err || !user) {
      return res.status(404).json({success: false,
                                   message: 'Usuário não encontrado'});
    }
    Role.findOne({name: user.role}, async(function(err, role) {
      if (err || (!user.is_superuser && !role)) {
        return res.status(500).json({success: false,
                                     message: 'Erro ao encontrar permissões'});
      }
      if (!user.is_superuser && !role.grantDiagAppAccess) {
        return res.status(403).json({success: false,
                                     message: 'Permissão negada'});
      }
      let session = generateSessionCredential(user.name);
      session.success = true;
      return res.status(200).json(session);
    }));
  });
};

diagAppAPIController.configureWifi = async(function(req, res) {
  try {
    // Make sure we have a mac/id to verify in database
    if (req.body.mac) {
      // Fetch device from database - query depends on if it's ONU or not
      let device;
      if (req.body.isOnu && req.body.onuMac) {
        device = await(DeviceModel.findById(req.body.onuMac));
      } else if (req.body.isOnu) {
        let devices = await(DeviceModel.find({serial_tr069: req.body.mac}));
        if (devices.length > 0) {
          device = devices[0];
        }
      } else {
        device = await(DeviceModel.findById(req.body.mac));
      }
      if (!device) {
        return res.status(404).json({'error': 'MAC not found'});
      }
      let content = req.body;
      let updateParameters = false;
      let changes = {wifi2: {}, wifi5: {}};
      // Replace relevant wifi fields with new values
      if (content.wifi_ssid) {
        device.wifi_ssid = content.wifi_ssid;
        changes.wifi2.ssid = content.wifi_ssid;
        updateParameters = true;
      }
      if (content.wifi_ssid_5ghz) {
        device.wifi_ssid_5ghz = content.wifi_ssid_5ghz;
        changes.wifi5.ssid = content.wifi_ssid_5ghz;
        updateParameters = true;
      }
      if (content.wifi_password) {
        device.wifi_password = content.wifi_password;
        changes.wifi2.password = content.wifi_password;
        updateParameters = true;
      }
      if (content.wifi_password_5ghz) {
        device.wifi_password_5ghz = content.wifi_password_5ghz;
        changes.wifi5.password = content.wifi_password_5ghz;
        updateParameters = true;
      }
      if (content.wifi_channel) {
        device.wifi_channel = content.wifi_channel;
        changes.wifi2.channel = content.wifi_channel;
        updateParameters = true;
      }
      if (content.wifi_band) {
        device.wifi_band = content.wifi_band;
        changes.wifi2.band = content.wifi_band;
        updateParameters = true;
      }
      if (content.wifi_mode) {
        device.wifi_mode = content.wifi_mode;
        changes.wifi2.mode = content.wifi_mode;
        updateParameters = true;
      }
      if (content.wifi_channel_5ghz) {
        device.wifi_channel_5ghz = content.wifi_channel_5ghz;
        changes.wifi5.channel = content.wifi_channel_5ghz;
        updateParameters = true;
      }
      if (content.wifi_band_5ghz) {
        device.wifi_band_5ghz = content.wifi_band_5ghz;
        changes.wifi5.band = content.wifi_band_5ghz;
        updateParameters = true;
      }
      if (content.wifi_mode_5ghz) {
        device.wifi_mode_5ghz = content.wifi_mode_5ghz;
        changes.wifi5.mode = content.wifi_mode_5ghz;
        updateParameters = true;
      }
      // If no fields were changed, we can safely reply here
      if (!updateParameters) {
        return res.status(200).json({'success': true});
      }
      // Apply changes to database and send mqtt message
      device.do_update_parameters = true;
      await(device.save());
      if (device.use_tr069) {
        // tr-069 device, call acs
        acsDeviceInfo.updateInfo(device, changes);
      } else {
        // flashbox device, call mqtt
        meshHandlers.syncSlaves(device);
        mqtt.anlixMessageRouterUpdate(device._id);
      }
      return res.status(200).json({'success': true});
    } else {
      return res.status(403).json({'error': 'Did not specify MAC'});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error': 'Internal error'});
  }
});

diagAppAPIController.configureMeshMode = async(function(req, res) {
  try {
    // Make sure we have a mac to verify in database
    if (req.body.mac) {
      // Fetch device from database
      let device = await(DeviceModel.findById(req.body.mac));
      if (!device) {
        return res.status(404).json({'error': 'MAC not found'});
      }
      let content = req.body;
      let targetMode = parseInt(req.body.mesh_mode)
      if (!isNaN(targetMode) && targetMode >= 0 && targetMode <= 4) {
        if (targetMode === 0 && device.mesh_slaves.length > 0) {
          // Cannot disable mesh mode with registered slaves
          return res.status(500).json({
            'error': 'Cannot disable mesh with reigstered slaves'
          });
        }
        device.mesh_mode = targetMode;
      }
      // Apply changes to database and send mqtt message
      device.do_update_parameters = true;
      await(device.save());
      meshHandlers.syncSlaves(device);
      mqtt.anlixMessageRouterUpdate(device._id);
      return res.status(200).json({'success': true});
    } else {
      return res.status(403).json({'error': 'Did not specify MAC'});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error': 'Internal error'});
  }
});

diagAppAPIController.checkMeshStatus = async(function(req, res) {
  try {
    // Make sure we have a mac to verify in database
    if (req.body.mac) {
      // Fetch device from database
      let device = await(DeviceModel.findById(req.body.mac));
      if (!device) {
        return res.status(404).json({'error': 'MAC not found'});
      }
      if (!device.mesh_slaves || device.mesh_slaves.length === 0) {
        return res.status(200).json({'count': 0, 'slaves': []});
      }
      return res.status(200).json({
        'count': device.mesh_slaves.length,
        'slaves': device.mesh_slaves,
      });
    } else {
      return res.status(403).json({'error': 'Did not specify MAC'});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error': 'Internal error'});
  }
});

diagAppAPIController.removeMeshSlave = async(function(req, res) {
  try {
    // Make sure we have a mac to remove from database
    if (req.body.remove_mac) {
      // Fetch device from database
      let device = await(DeviceModel.findById(req.body.remove_mac));
      if (!device) {
        return res.status(404).json({'error': 'MAC not found'});
      }
      if (!device.mesh_master) {
        return res.status(403).json({'error': 'Device is not a mesh slave!'});
      }
      deviceHandlers.removeDeviceFromDatabase(device);
      return res.status(200).json({'success': true});
    } else {
      return res.status(403).json({'error': 'Did not specify MAC'});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error': 'Internal error'});
  }
});

diagAppAPIController.receiveCertification = async(function(req, res) {
  try {
    let result = await(UserModel.find({'name': req.body.user}));
    if (!result) {
      return res.status(404).json({'error': 'User not found'});
    }
    let user = result[0]; // Should only match one since name is unique
    let content = req.body;
    let certifications = user.deviceCertifications;
    if (!certifications) {
      certifications = [];
    }
    // Save cancelled certifications, if any
    if (content.cancelled) {
      content.cancelled.forEach((c)=>{
        if (!c.mac) return; // MAC is mandatory
        pushCertification(certifications, c, false);
      });
    }
    // Save current certification, if any
    if (content.current && content.current.mac) {
      if (content.current.latitude && content.current.longitude) {
        let device;
        if (req.body.isOnu && req.body.onuMac) {
          device = await(DeviceModel.findById(req.body.onuMac));
        } else if (req.body.isOnu) {
          let devices = await(DeviceModel.find({serial_tr069: req.body.mac}));
          if (devices.length > 0) {
            device = devices[0];
          }
        } else {
          device = await(DeviceModel.findById(req.body.mac));
        }
        device.latitude = content.current.latitude;
        device.longitude = content.current.longitude;
        await(device.save());
      }
      pushCertification(certifications, content.current, true);
    }
    // Save changes to database and respond
    await(user.save());
    let session = generateSessionCredential(user.name);
    session.success = true;
    return res.status(200).json(session);
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error': 'Internal error'});
  }
});

diagAppAPIController.verifyFlashman = async(function(req, res) {
  try {
    // Make sure we have a mac to verify in database
    if (req.body.mac) {
      // Fetch device from database - query depends on if it's ONU or not
      let device;
      if (req.body.isOnu && req.body.onuMac) {
        device = await(DeviceModel.findById(req.body.onuMac));
      } else if (req.body.isOnu) {
        let devices = await(DeviceModel.find({serial_tr069: req.body.mac}));
        if (devices.length > 0) {
          device = devices[0];
        }
      } else {
        device = await(DeviceModel.findById(req.body.mac));
      }
      if (!device) {
        return res.status(200).json({
          'success': true,
          'isRegister': false,
          'isOnline': false,
        });
      } else if (req.body.isOnu) {
        // Save passwords sent from app
        if (req.body.pppoePass) {
          device.pppoe_password = req.body.pppoePass;
        }
        if (req.body.wifi2Pass) {
          device.wifi_password = req.body.wifi2Pass;
        }
        if (req.body.wifi5Pass) {
          device.wifi_password_5ghz = req.body.wifi5Pass;
        }
        await(device.save());
        let tr069Info = {'url': '', 'interval': 0};
        let config = await(ConfigModel.findOne({is_default: true}, 'tr069')
          .exec().catch((err) => err));
        if (config.tr069) {
          tr069Info.url = config.tr069.server_url;
          tr069Info.interval = parseInt(config.tr069.inform_interval/1000);
        }
        return res.status(200).json({
          'success': true,
          'isRegister': true,
          'isOnline': true,
          'deviceInfo': {
            'pppoe_pass': device.pppoe_password,
            'onu_mac': device._id,
          },
          'tr069Info': tr069Info,
        });
      }
      const isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
        return map[req.body.mac.toUpperCase()];
      });
      let permissions = DeviceVersion.findByVersion(
        device.version,
        device.wifi_is_5ghz_capable,
        device.model,
      );
      return res.status(200).json({
        'success': true,
        'isRegister': true,
        'isOnline': isDevOn,
        'permissions': permissions,
        'deviceInfo': {
          'mesh_mode': device.mesh_mode,
          'mesh_master': device.mesh_master,
          'mesh_slaves': device.mesh_slaves,
        },
      });
    } else {
      return res.status(403).json({'error': 'Did not specify MAC'});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error': 'Internal error'});
  }
});

diagAppAPIController.getTR069Config = async(function(req, res) {
  let config = await(ConfigModel.findOne({is_default: true}, 'tr069')
    .exec().catch((err) => err));
  if (!config.tr069) {
    return res.status(200).json({'success': false});
  }
  return res.status(200).json({
    'success': true,
    'url': config.tr069.server_url,
    'interval': parseInt(config.tr069.inform_interval/1000),
  });
});

diagAppAPIController.configureWanOnu = async(function(req, res) {
    try {
    // Make sure we have a mac/id to verify in database
    if (req.body.mac) {
      // Fetch device from database - query depends on if it's ONU or not
      let device;
      if (req.body.isOnu && req.body.onuMac) {
        device = await(DeviceModel.findById(req.body.onuMac));
      } else if (req.body.isOnu) {
        let devices = await(DeviceModel.find({serial_tr069: req.body.mac}));
        if (devices.length > 0) {
          device = devices[0];
        }
      } else {
        device = await(DeviceModel.findById(req.body.mac));
      }
      if (!device) {
        return res.status(404).json({'error': 'MAC not found'});
      }
      let content = req.body;
      if (content.pppoe_user) {
        device.pppoe_user = content.pppoe_user;
      }
      if (content.pppoe_password) {
        device.pppoe_password = content.pppoe_password;
      }
      // Apply changes to database and reply
      await(device.save());
      return res.status(200).json({'success': true});
    } else {
      return res.status(403).json({'error': 'Did not specify MAC'});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error': 'Internal error'});
  }
});

module.exports = diagAppAPIController;
