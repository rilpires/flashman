const DeviceModel = require('../models/device');
const UserModel = require('../models/user');
const Role = require('../models/role');
const keyHandlers = require('./handlers/keys');
const mqtt = require('../mqtts');
const async = require('asyncawait/async');
const await = require('asyncawait/await');
const debug = require('debug')('APP');

let diagAppAPIController = {};

const convertDiagnostic = function(diagnostic) {
  return {
    wan: (diagnostic && diagnostic.wan === 0),
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

const pushCertification = function(arr, c, finished) {
  arr.push({
    finished: finished,
    mac: c.mac,
    routerModel: (c.routerModel) ? c.routerModel : '',
    routerVersion: (c.routerVersion) ? c.routerVersion : '',
    routerRelease: (c.routerRelease) ? c.routerRelease : '',
    localEpochTimestamp: (c.timestamp) ? c.timestamp : 0,
    didDiagnose: (c.didDiagnose) ? c.didDiagnose : false,
    diagnostic: convertDiagnostic(c.diagnostic),
    didConfigureWan: (c.didWan) ? c.didWan : false,
    routerConnType: (c.routerConnType) ? c.routerConnType : '',
    pppoeUser: (c.pppoeUser) ? c.pppoeUser : '',
    bridgeIP: (c.bridgeIP) ? c.bridgeIP : '',
    bridgeGateway: (c.bridgeGateway) ? c.bridgeGateway : '',
    bridgeDNS: (c.bridgeDNS) ? c.bridgeDNS : '',
    bridgeSwitch: (c.bridgeSwitch) ? c.bridgeSwitch : true,
    didConfigureWifi: (c.didWifi) ? c.didWifi : false,
    wifiConfig: convertWifi(c.wifiConfig),
    didConfigureMesh: (c.didMesh) ? c.didMesh : false,
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
  sessionExpirationDate += (7*24*60*60*1000); // 7 days
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
  return {credential: b64Json, sign: encryptedB64Json};
};

diagAppAPIController.sessionLogin = function(req, res) {
  const sessionExpiration = 7; // In days
  UserModel.findOne({name: req.body.user}, function(err, user) {
    if (err || !user) {
      return res.status(404).json({success: false,
                                   message: 'Usuário não encontrado'});
    }
    Role.findOne({name: user.role}, async(function(err, role) {
      if (err) {
        return res.status(500).json({success: false,
                                     message: 'Erro ao encontrar permissões'});
      }
      if (!role.grantDiagAppAccess) {
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
    // Make sure we have a mac to verify in database
    if (req.body.mac) {
      // Fetch device from database
      let device = await(DeviceModel.findById(req.body.mac));
      if (!device) {
        return res.status(404).json({'error': 'MAC not found'});
      }
      let content = req.body;
      let updateParameters = false;
      // Replace relevant wifi fields with new values
      if (content.wifi_ssid) {
        device.wifi_ssid = content.wifi_ssid;
        updateParameters = true;
      }
      if (content.wifi_ssid_5ghz) {
        device.wifi_ssid_5ghz = content.wifi_ssid_5ghz;
        updateParameters = true;
      }
      if (content.wifi_password) {
        device.wifi_password = content.wifi_password;
        updateParameters = true;
      }
      if (content.wifi_password_5ghz) {
        device.wifi_password_5ghz = content.wifi_password_5ghz;
        updateParameters = true;
      }
      if (content.wifi_channel) {
        device.wifi_channel = content.wifi_channel;
        updateParameters = true;
      }
      if (content.wifi_band) {
        device.wifi_band = content.wifi_band;
        updateParameters = true;
      }
      if (content.wifi_mode) {
        device.wifi_mode = content.wifi_mode;
        updateParameters = true;
      }
      if (content.wifi_channel_5ghz) {
        device.wifi_channel_5ghz = content.wifi_channel_5ghz;
        updateParameters = true;
      }
      if (content.wifi_band_5ghz) {
        device.wifi_band_5ghz = content.wifi_band_5ghz;
        updateParameters = true;
      }
      if (content.wifi_mode_5ghz) {
        device.wifi_mode_5ghz = content.wifi_mode_5ghz;
        updateParameters = true;
      }
      // If no fields were changed, we can safely reply here
      if (!updateParameters) {
        return res.status(200).json({'success': true});
      }
      // Apply changes to database and send mqtt message
      device.do_update_parameters = true;
      await(device.save());
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
        let device = await(DeviceModel.findById(content.current.mac));
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
      // Fetch device from database
      let device = await(DeviceModel.findById(req.body.mac));
      if (!device) {
        return res.status(200).json({
          'success': true,
          'isRegister': false,
          'isOnline': false,
        });
      }
      const isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
        return map[req.body.mac.toUpperCase()];
      });
      return res.status(200).json({
        'success': true,
        'isRegister': true,
        'isOnline': isDevOn,
      });
    } else {
      return res.status(403).json({'error': 'Did not specify MAC'});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error': 'Internal error'});
  }
});

module.exports = diagAppAPIController;
