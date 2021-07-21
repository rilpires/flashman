const DeviceModel = require('../models/device');
const DeviceVersion = require('../models/device_version');
const UserModel = require('../models/user');
const Notification = require('../models/notification');
const Role = require('../models/role');
const ConfigModel = require('../models/config');
const keyHandlers = require('./handlers/keys');
const deviceHandlers = require('./handlers/devices');
const meshHandlers = require('./handlers/mesh');
const acsDeviceInfo = require('./acs_device_info.js');
const mqtt = require('../mqtts');
const debug = require('debug')('APP');
const fs = require('fs');

let diagAppAPIController = {};

const convertDiagnostic = function(diagnostic) {
  return {
    wan: (diagnostic && diagnostic.wan === 0),
    tr069: (diagnostic && diagnostic.tr069 === 0),
    pon: (diagnostic && 'pon' in diagnostic) ? diagnostic.pon : -1,
    rxpower: (diagnostic && diagnostic.rxpower) ? diagnostic.rxpower : 0,
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

const generateSessionCredential = async function(user) {
  let sessionExpirationDate = new Date().getTime();
  sessionExpirationDate += (7*24*60*60); // 7 days
  debug('User expiration session (epoch) is: ' + sessionExpirationDate);
  // This JSON format is dictated by auth inside firmware
  let expirationCredential = {
    user: user,
    // Must be epoch
    expire: sessionExpirationDate,
  };
  let buff = Buffer.from(JSON.stringify(expirationCredential));
  let b64Json = buff.toString('base64');
  let encryptedB64Json = await keyHandlers.encryptMsg(b64Json);
  let session = {credential: b64Json, sign: encryptedB64Json};
  // Add onu config, if present
  let config = await ConfigModel.findOne({is_default: true}, 'tr069')
    .exec().catch((err) => err);
  if (config && config.tr069) {
    let trConf = config.tr069;
    session.onuLogin = (trConf.web_login) ? trConf.web_login : '';
    session.onuPassword = (trConf.web_password) ? trConf.web_password : '';
    session.onuUserLogin = (trConf.web_login_user) ? trConf.web_login_user : '';
    session.onuUserPassword = (trConf.web_password_user) ?
                              trConf.web_password_user : '';
    session.onuRemote = trConf.remote_access;
  }
  return session;
};

diagAppAPIController.sessionLogin = function(req, res) {
  UserModel.findOne({name: req.body.user}, function(err, user) {
    if (err || !user) {
      return res.status(404).json({success: false,
                                   message: 'Usuário não encontrado'});
    }
    Role.findOne({name: user.role}, async function(err, role) {
      if (err || (!user.is_superuser && !role)) {
        return res.status(500).json({success: false,
                                     message: 'Erro ao encontrar permissões'});
      }
      if (!user.is_superuser && !role.grantDiagAppAccess) {
        return res.status(403).json({success: false,
                                     message: 'Permissão negada'});
      }
      let session = await generateSessionCredential(user.name);
      session.success = true;
      return res.status(200).json(session);
    });
  });
};

diagAppAPIController.configureWifi = async function(req, res) {
  try {
    // Make sure we have a mac/id to verify in database
    if (req.body.mac) {
      // Fetch device from database - query depends on if it's ONU or not
      let device;
      if (req.body.isOnu && req.body.onuMac) {
        device = await DeviceModel.findById(req.body.onuMac);
      } else if (req.body.isOnu) {
        device = await DeviceModel.findOne({serial_tr069: req.body.mac});
      } else {
        device = await DeviceModel.findById(req.body.mac);
      }
      if (!device) {
        return res.status(404).json({'error': 'MAC not found'});
      }
      let content = req.body;
      let updateParameters = false;
      let changes = {wifi2: {}, wifi5: {}};

      // Get SSID prefix data
      let matchedConfig = await ConfigModel.findOne({is_default: true});
      if (!matchedConfig) {
        console.error('No config exists');
        return res.status(500).json({'error': 'Internal error'});
      }
      let createPrefixErrNotification = false;
      if (matchedConfig.personalizationHash !== '' &&
          matchedConfig.isSsidPrefixEnabled &&
          (content.wifi_ssid || content.wifi_ssid_5ghz)
      ) {
        let check2ghz;
        let check5ghz;
        let ssid2ghz = device.wifi_ssid;
        let ssid5ghz = device.wifi_ssid_5ghz;
        let isSsidPrefixEnabled = false;

        if (content.wifi_ssid) {
          ssid2ghz = content.wifi_ssid.trim();
        }
        if (content.wifi_ssid_5ghz) {
          ssid5ghz = content.wifi_ssid_5ghz.trim();
        }
        check2ghz = deviceHandlers.checkSsidPrefixNewRegistry(
          matchedConfig.ssidPrefix, ssid2ghz);
        check5ghz = deviceHandlers.checkSsidPrefixNewRegistry(
          matchedConfig.ssidPrefix, ssid5ghz);
        if (!check2ghz.enablePrefix || !check5ghz.enablePrefix) {
          createPrefixErrNotification = true;
          isSsidPrefixEnabled = false;
        } else {
          isSsidPrefixEnabled = true;
          ssid2ghz = check2ghz.ssid;
          ssid5ghz = check5ghz.ssid;
        }
        device.wifi_ssid = ssid2ghz;
        device.wifi_ssid_5ghz = ssid5ghz;
        changes.wifi2.ssid = ssid2ghz;
        changes.wifi5.ssid = ssid5ghz;
        device.isSsidPrefixEnabled = isSsidPrefixEnabled;
        updateParameters = true;
      } else {
        // Replace relevant wifi fields with new values
        if (content.wifi_ssid) {
          device.wifi_ssid = content.wifi_ssid.trim();
          changes.wifi2.ssid = content.wifi_ssid.trim();
          updateParameters = true;
        }
        if (content.wifi_ssid_5ghz) {
          device.wifi_ssid_5ghz = content.wifi_ssid_5ghz.trim();
          changes.wifi5.ssid = content.wifi_ssid_5ghz.trim();
          updateParameters = true;
        }
      }

      if (content.wifi_password) {
        device.wifi_password = content.wifi_password.trim();
        changes.wifi2.password = content.wifi_password.trim();
        updateParameters = true;
      }
      if (content.wifi_password_5ghz) {
        device.wifi_password_5ghz = content.wifi_password_5ghz.trim();
        changes.wifi5.password = content.wifi_password_5ghz.trim();
        updateParameters = true;
      }
      if (content.wifi_channel) {
        device.wifi_channel = content.wifi_channel.trim();
        changes.wifi2.channel = content.wifi_channel.trim();
        updateParameters = true;
      }
      if (content.wifi_band) {
        device.wifi_band = content.wifi_band.trim();
        changes.wifi2.band = content.wifi_band.trim();
        updateParameters = true;
      }
      if (content.wifi_mode) {
        device.wifi_mode = content.wifi_mode.trim();
        changes.wifi2.mode = content.wifi_mode.trim();
        updateParameters = true;
      }
      if (content.wifi_channel_5ghz) {
        device.wifi_channel_5ghz = content.wifi_channel_5ghz.trim();
        changes.wifi5.channel = content.wifi_channel_5ghz.trim();
        updateParameters = true;
      }
      if (content.wifi_band_5ghz) {
        device.wifi_band_5ghz = content.wifi_band_5ghz.trim();
        changes.wifi5.band = content.wifi_band_5ghz.trim();
        updateParameters = true;
      }
      if (content.wifi_mode_5ghz) {
        device.wifi_mode_5ghz = content.wifi_mode_5ghz.trim();
        changes.wifi5.mode = content.wifi_mode_5ghz.trim();
        updateParameters = true;
      }
      // If no fields were changed, we can safely reply here
      if (!updateParameters) {
        return res.status(200).json({'success': true});
      }
      // Apply changes to database and send mqtt message
      device.do_update_parameters = true;
      await device.save();
      if (device.use_tr069) {
        // tr-069 device, call acs
        acsDeviceInfo.updateInfo(device, changes);
      } else {
        // flashbox device, call mqtt
        meshHandlers.syncSlaves(device);
        mqtt.anlixMessageRouterUpdate(device._id);
      }
      if (createPrefixErrNotification) {
        // Notify if ssid prefix was impossible to be assigned
        let matchedNotif = await Notification
        .findOne({'message_code': 5, 'target': device._id})
        .catch(function(err) {
          console.error('Error fetching database: ' + err);
        });
        if (!matchedNotif || matchedNotif.allow_duplicate) {
          let notification = new Notification({
            'message': 'Não foi possível habilitar o prefixo SSID ' +
                       'pois o tamanho máximo de 32 caracteres foi excedido.',
            'message_code': 5,
            'severity': 'alert',
            'type': 'communication',
            'action_title': 'Ok',
            'allow_duplicate': false,
            'target': device._id,
          });
          await notification.save().catch(
            function(err) {
              console.error('Error creating notification: ' + err);
            }
          );
        }
      }
      return res.status(200).json({'success': true});
    } else {
      return res.status(403).json({'error': 'Did not specify MAC'});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error': 'Internal error'});
  }
};

diagAppAPIController.configureMeshMode = async function(req, res) {
  try {
    // Make sure we have a mac to verify in database
    if (req.body.mac) {
      // Fetch device from database
      let device = await DeviceModel.findById(req.body.mac);
      if (!device) {
        return res.status(404).json({'error': 'MAC not found'});
      }
      let targetMode = parseInt(req.body.mesh_mode);
      if (!isNaN(targetMode) && targetMode >= 0 && targetMode <= 4) {
        if (targetMode === 0 && device.mesh_slaves.length > 0) {
          // Cannot disable mesh mode with registered slaves
          return res.status(500).json({
            'error': 'Cannot disable mesh with reigstered slaves',
          });
        }
        device.mesh_mode = targetMode;
      }
      // Apply changes to database and send mqtt message
      device.do_update_parameters = true;
      await device.save();
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
};

diagAppAPIController.checkMeshStatus = async function(req, res) {
  try {
    // Make sure we have a mac to verify in database
    if (req.body.mac) {
      // Fetch device from database
      let device = await DeviceModel.findById(req.body.mac);
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
};

diagAppAPIController.removeMeshSlave = async function(req, res) {
  try {
    // Make sure we have a mac to remove from database
    if (req.body.remove_mac) {
      // Fetch device from database
      let device = await DeviceModel.findById(req.body.remove_mac);
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
};

diagAppAPIController.receiveCertification = async function(req, res) {
  try {
    let result = await UserModel.find({'name': req.body.user});
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
          device = await DeviceModel.findById(req.body.onuMac);
        } else if (req.body.isOnu) {
          let devices = await DeviceModel.find({serial_tr069: req.body.mac});
          if (devices.length > 0) {
            device = devices[0];
          }
        } else {
          device = await DeviceModel.findById(req.body.mac);
        }
        device.latitude = content.current.latitude;
        device.longitude = content.current.longitude;
        await device.save();
      }
      pushCertification(certifications, content.current, true);
    }
    // Save changes to database and respond
    await user.save();
    let session = await generateSessionCredential(user.name);
    session.success = true;
    return res.status(200).json(session);
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error': 'Internal error'});
  }
};

diagAppAPIController.verifyFlashman = async function(req, res) {
  try {
    // Make sure we have a mac to verify in database
    if (req.body.mac) {
      // Fetch device from database - query depends on if it's ONU or not
      let device;
      if (req.body.isOnu && req.body.onuMac) {
        device = await DeviceModel.findById(req.body.onuMac);
      } else if (req.body.isOnu) {
        device = await DeviceModel.findOne({serial_tr069: req.body.mac});
      } else {
        device = await DeviceModel.findById(req.body.mac);
      }
      let tr069Info = {url: '', interval: 0};
      let config = await(ConfigModel.findOne(
        {is_default: true},
        {tr069: true,
         certification: true}).exec().catch((err) => err));
      if (config.tr069) {
        tr069Info.url = config.tr069.server_url;
        tr069Info.interval = parseInt(config.tr069.inform_interval/1000);
      }
      let certification = { // Structure with camel case format
        requiredWan: true,
        requiredIpv4: true,
        requiredIpv6: false,
        requiredDns: true,
        requiredFlashman: true,
      };
      if (config.certification) {
        certification.requiredWan = config.certification.wan_step_required;
        certification.requiredIpv4 = config.certification.ipv4_step_required;
        certification.requiredIpv6 = config.certification.ipv6_step_required;
        certification.requiredDns = config.certification.dns_step_required;
        certification.requiredFlashman =
          config.certification.flashman_step_required;
      }
      if (!device) {
        return res.status(200).json({
          'success': true,
          'isRegister': false,
          'isOnline': false,
          'tr069Info': tr069Info,
          'certification': certification,
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
        await device.save();
        let onuConfig = {};
        if (config.tr069) {
          onuConfig.onuLogin = (config.tr069.web_login) ?
                               config.tr069.web_login : '';
          onuConfig.onuPassword = (config.tr069.web_password) ?
                                  config.tr069.web_password : '';
          onuConfig.onuUserLogin = (config.tr069.web_login_user) ?
                                   config.tr069.web_login_user : '';
          onuConfig.onuUserPassword = (config.tr069.web_password_user) ?
                                      config.tr069.web_password_user : '';
          onuConfig.onuRemote = config.tr069.remote_access;
          onuConfig.onuPonThreshold = config.tr069.pon_signal_threshold;
          onuConfig.onuPonThresholdCritical = config.tr069.pon_signal_threshold_critical;
          onuConfig.onuPonThresholdCriticalHigh = config.tr069.pon_signal_threshold_critical_high;
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
          'onuConfig': onuConfig,
          'certification': certification,
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
        'certification': certification,
      });
    } else {
      return res.status(403).json({'error': 'Did not specify MAC'});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error': 'Internal error'});
  }
};

diagAppAPIController.getTR069Config = async function(req, res) {
  let config = await ConfigModel.findOne({is_default: true}, 'tr069')
    .exec().catch((err) => err);
  if (!config.tr069) {
    return res.status(200).json({'success': false});
  }
  let certFile = fs.readFileSync('./certs/onu-certs/onuCA.pem', 'utf8');
  return res.status(200).json({
    'success': true,
    'url': config.tr069.server_url,
    'interval': parseInt(config.tr069.inform_interval/1000),
    'certificate': certFile,
  });
};

diagAppAPIController.configureWanOnu = async function(req, res) {
  try {
    // Make sure we have a mac/id to verify in database
    if (req.body.mac) {
      // Fetch device from database - query depends on if it's ONU or not
      let device;
      if (req.body.isOnu && req.body.onuMac) {
        device = await DeviceModel.findById(req.body.onuMac);
      } else if (req.body.isOnu) {
        let devices = await DeviceModel.find({serial_tr069: req.body.mac});
        if (devices.length > 0) {
          device = devices[0];
        }
      } else {
        device = await DeviceModel.findById(req.body.mac);
      }
      if (!device) {
        return res.status(404).json({'error': 'MAC not found'});
      }
      let content = req.body;
      if (content.pppoe_user) {
        device.pppoe_user = content.pppoe_user.trim();
      }
      if (content.pppoe_password) {
        device.pppoe_password = content.pppoe_password.trim();
      }
      // Apply changes to database and reply
      await device.save();
      return res.status(200).json({'success': true});
    } else {
      return res.status(403).json({'error': 'Did not specify MAC'});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error': 'Internal error'});
  }
};

diagAppAPIController.fetchOnuConfig = async function(req, res) {
  try {
    // Make sure we have a mac/id to verify in database
    if (req.body.mac) {
      // Fetch device from database - query depends on if it's ONU or not
      let device;
      if (req.body.isOnu && req.body.onuMac) {
        device = await DeviceModel.findById(req.body.onuMac);
      } else if (req.body.isOnu) {
        let devices = await DeviceModel.find({serial_tr069: req.body.mac});
        if (devices.length > 0) {
          device = devices[0];
        }
      } else {
        device = await DeviceModel.findById(req.body.mac);
      }
      if (!device) {
        return res.status(404).json({'error': 'MAC not found'});
      }
      return res.status(200).json({
        'success': true,
        'pppoeUser': device.pppoe_user,
        'pppoePass': device.pppoe_password,
        'wifiPass': device.wifi_password,
        'wifiPass5ghz': device.wifi_password_5ghz,
      });
    } else {
      return res.status(403).json({'error': 'Did not specify MAC'});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error': 'Internal error'});
  }
};

module.exports = diagAppAPIController;
