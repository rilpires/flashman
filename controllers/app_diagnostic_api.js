const DeviceModel = require('../models/device');
const DeviceVersion = require('../models/device_version');
const UserModel = require('../models/user');
const Notification = require('../models/notification');
const Role = require('../models/role');
const ConfigModel = require('../models/config');
const keyHandlers = require('./handlers/keys');
const utilHandlers = require('./handlers/util');
const deviceHandlers = require('./handlers/devices');
const meshHandlers = require('./handlers/mesh');
const acsDeviceInfo = require('./acs_device_info.js');
const mqtt = require('../mqtts');
const debug = require('debug')('APP');
const fs = require('fs');
const deviceList = require('./device_list.js');
const DevicesAPI = require('./external-genieacs/devices-api');

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

const pushCertification = (arr, c, finished) => {
  arr.push({
    finished: finished,
    mac: c.mac,
    onuMac: c.onuMac || '',
    isOnu: c.isONU || false,
    routerModel: c.routerModel || '',
    routerVersion: c.routerVersion || '',
    routerRelease: c.routerRelease || '',
    localEpochTimestamp: c.timestamp || 0,
    didDiagnose: c.didDiagnose || false,
    diagnostic: convertDiagnostic(c.diagnostic),
    didConfigureWan: c.didWan || false,
    wanConfigOnu: c.wanConfigOnu || '',
    didConfigureTR069: c.didTR069 || false,
    routerConnType: c.routerConnType || '',
    pppoeUser: c.pppoeUser || '',
    bridgeIP: c.bridgeIP || '',
    bridgeGateway: c.bridgeGateway || '',
    bridgeDNS: c.bridgeDNS || '',
    bridgeSwitch: c.bridgeSwitch || true,
    didConfigureWifi: c.didWifi || false,
    wifiConfig: convertWifi(c.wifiConfig),
    didConfigureMesh: c.didMesh || false,
    mesh: convertMesh(c.mesh),
    didConfigureContract: c.didContract || false,
    didConfigureObservation: c.didObservation || false,
    contract: c.contract || '',
    observations: c.observations || '',
    cancelReason: c.reason || '',
    latitude: c.latitude || 0,
    longitude: c.longitude || 0,
  });
};

const generateSessionCredential = async (user) => {
  let config = await ConfigModel.findOne(
    {is_default: true},
    {tr069: true, pppoePassLength: true, licenseApiSecret: true, company: true},
  ).catch((err) => err);
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
  let session = {
    credential: b64Json,
    sign: encryptedB64Json,
    pppoePassLength: config.pppoePassLength || 1,
    licenseApiSecret: config.licenseApiSecret,
    company: config.company,
  };
  // Add onu config, if present
  if (config && config.tr069) {
    let trConf = config.tr069;
    session.onuLogin = trConf.web_login || '';
    session.onuPassword = trConf.web_password || '';
    session.onuUserLogin = trConf.web_login_user || '';
    session.onuUserPassword = trConf.web_password_user || '';
    session.onuRemote = trConf.remote_access;
  }
  return session;
};

diagAppAPIController.sessionLogin = (req, res) => {
  UserModel.findOne({name: req.body.user}, (err, user) => {
    if (err || !user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
      });
    }
    Role.findOne({name: user.role}, async (err, role) => {
      if (err || (!user.is_superuser && !role)) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao encontrar permissões',
        });
      }
      if (!user.is_superuser && !role.grantDiagAppAccess) {
        return res.status(403).json({
          success: false,
          message: 'Permissão negada',
        });
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
      } else if (req.body.isOnu && req.body.useAlternativeTR069UID) {
        device = await DeviceModel.findOne({alt_uid_tr069: req.body.mac});
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
      // What only matters in this case is the deviceEnabled flag
      if (device.isSsidPrefixEnabled &&
          (content.wifi_ssid || content.wifi_ssid_5ghz)) {
        let ssid2ghz = device.wifi_ssid;
        let ssid5ghz = device.wifi_ssid_5ghz;
        let isSsidPrefixEnabled;

        if (content.wifi_ssid) {
          ssid2ghz = content.wifi_ssid.trim();
        }
        if (content.wifi_ssid_5ghz) {
          ssid5ghz = content.wifi_ssid_5ghz.trim();
        }
        // -> 'updating registry' scenario
        let checkResponse = deviceHandlers.checkSsidPrefix(
          matchedConfig, ssid2ghz, ssid5ghz, device.isSsidPrefixEnabled);
        createPrefixErrNotification = !checkResponse.enablePrefix;
        isSsidPrefixEnabled = checkResponse.enablePrefix;
        ssid2ghz = checkResponse.ssid2;
        ssid5ghz = checkResponse.ssid5;
        // Replace relevant wifi fields with new values
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
      // Apply changes to database and update device
      device.do_update_parameters = true;
      await device.save();
      meshHandlers.syncSlaves(device);
      if (device.use_tr069) {
        // tr-069 device, call acs
        acsDeviceInfo.updateInfo(device, changes);
      } else {
        // flashbox device, call mqtt
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
            },
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
    if (!req.body.mac) {
      return res.status(500).json({'error': 'JSON invalid'});
    }
    // Fetch device from database - query depends on if it's ONU or not
    let device;
    if (req.body.isOnu && req.body.onuMac) {
      device = await DeviceModel.findById(req.body.onuMac);
    } else {
      device = await DeviceModel.findById(req.body.mac);
    }
    if (!device) {
      return res.status(404).json({'error': 'Device not found'});
    }
    let targetMode = parseInt(req.body.mesh_mode);
    if (isNaN(targetMode) || targetMode < 0 || targetMode > 4) {
      return res.status(403).json({'error': 'invalid targetMode'});
    }
    if (targetMode === 0 && device.mesh_slaves.length > 0) {
      return res.status(500).json({
        'error': 'Cannot disable mesh with registered slaves',
      });
    }
    let model = device.model;
    let changes;
    if (device.use_tr069) {
      let acsID = device.acs_id;
      let splitID = acsID.split('-');
      model = splitID.slice(1, splitID.length-1).join('-');
      changes = meshHandlers.buildTR069Changes(device, targetMode);
    }
    const permissions = DeviceVersion.findByVersion(
      device.version,
      device.wifi_is_5ghz_capable,
      model,
    );
    const isMeshV1Compatible = permissions.grantMeshMode;
    const isMeshV2Compatible = permissions.grantMeshV2;
    if (!isMeshV1Compatible && !isMeshV2Compatible) {
      return res.status(403).json({
        'error': 'CPE isn\'t compatibe with mesh',
      });
    }
    if (isMeshV2Compatible) {
      if (device.use_tr069) {
        changes = meshHandlers.buildTR069Changes(device, targetMode);
      }
      if ((targetMode === 2 || targetMode === 4) && !device.wifi_state) {
        if (device.use_tr069) {
          changes.wifi2 = {};
          changes.wifi2.enable = 1;
          // When enabling Wi-Fi set beacon type
          changes.wifi2.beacon_type = DevicesAPI.getBeaconTypeByModel(model);
        }
        device.wifi_state = 1;
      }
      if ((targetMode === 3 || targetMode === 4) && !device.wifi_state_5ghz) {
        if (device.use_tr069) {
          changes.wifi5 = {};
          changes.wifi5.enable = 1;
          // When enabling Wi-Fi set beacon type
          changes.wifi5.beacon_type = DevicesAPI.getBeaconTypeByModel(model);
        }
        device.wifi_state_5ghz = 1;
      }
    }
    // Apply changes to database and update device
    device.mesh_mode = targetMode;
    device.do_update_parameters = true;
    await device.save();
    meshHandlers.syncSlaves(device);
    if (device.use_tr069) {
      // tr-069 device, call acs
      acsDeviceInfo.updateInfo(device, changes);
    } else {
      // flashbox device, call mqtt
      mqtt.anlixMessageRouterUpdate(device._id);
    }
    return res.status(200).json({'success': true});
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

diagAppAPIController.receiveCertification = async (req, res) => {
  try {
    let result = await UserModel.find({'name': req.body.user});
    if (result.length === 0) {
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
        } else if (req.body.isOnu && req.body.useAlternativeTR069UID) {
          device = await DeviceModel.findOne({alt_uid_tr069: req.body.mac});
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
        if (content.current.contractType && content.current.contract) {
          device.external_reference.kind = content.current.contractType;
          device.external_reference.data = content.current.contract;
        }
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

diagAppAPIController.verifyFlashman = async (req, res) => {
  try {
    // Make sure we have a mac to verify in database
    if (req.body.mac) {
      // Fetch device from database - query depends on if it's ONU or not
      let device;
      let tr069Info = {url: '', interval: 0};

      if (req.body.isOnu && req.body.onuMac) {
        device = await DeviceModel.findById(req.body.onuMac);
      } else if (req.body.isOnu && req.body.useAlternativeTR069UID) {
        device = await DeviceModel.findOne({alt_uid_tr069: req.body.mac});
      } else if (req.body.isOnu) {
        device = await DeviceModel.findOne({serial_tr069: req.body.mac});
      } else {
        device = await DeviceModel.findById(req.body.mac);
      }

      let config = await(
        ConfigModel.findOne({is_default: true},
          {
            tr069: true,
            certification: true,
            ssidPrefix: true,
            isSsidPrefixEnabled: true,
            personalizationHash: true,
            licenseApiSecret: true,
            company: true,
          },
        ).catch((err) => err)
      );

      if (config.tr069) {
        tr069Info.url = config.tr069.server_url;
        tr069Info.interval = parseInt(config.tr069.inform_interval/1000);
      }

      // Structure with camel case format
      let certification = {
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
      }

      let checkResponse = deviceHandlers.checkSsidPrefix(
        config, device.wifi_ssid,
        device.wifi_ssid_5ghz,
        device.isSsidPrefixEnabled,
      );

      let prefixObj = {
        name: checkResponse.prefix,
        grant: checkResponse.enablePrefix,
      };

      let permissions = DeviceVersion.findByVersion(
        device.version,
        device.wifi_is_5ghz_capable,
        device.model,
      );

      if (req.body.isOnu) {
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
          onuConfig.onuLogin = config.tr069.web_login || '';
          onuConfig.onuPassword = config.tr069.web_password || '';
          onuConfig.onuUserLogin = config.tr069.web_login_user || '';
          onuConfig.onuUserPassword = config.tr069.web_password_user || '';
          onuConfig.onuRemote = config.tr069.remote_access;
          onuConfig.onuPonThreshold = config.tr069.pon_signal_threshold;
          onuConfig.onuPonThresholdCritical =
            config.tr069.pon_signal_threshold_critical;
          onuConfig.onuPonThresholdCriticalHigh =
            config.tr069.pon_signal_threshold_critical_high;
        }
        return res.status(200).json({
          'success': true,
          'isRegister': true,
          'isOnline': true,
          'permissions': permissions,
          'deviceInfo': {
            'pppoe_pass': device.pppoe_password,
            'onu_mac': device._id,
            'mesh_mode': device.mesh_mode,
            'mesh_master': device.mesh_master,
            'mesh_slaves': device.mesh_slaves,
          },
          'tr069Info': tr069Info,
          'onuConfig': onuConfig,
          'certification': certification,
          'prefix': prefixObj,
          'external_reference': device.external_reference || '',
          'licenseApiSecret': config.licenseApiSecret || '',
          'company': config.company || '',
        });
      }

      const isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
        return map[req.body.mac.toUpperCase()];
      });
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
        'prefix': prefixObj,
        'external_reference': device.external_reference || '',
        'licenseApiSecret': config.licenseApiSecret || '',
        'company': config.company || '',
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
      } else if (req.body.isOnu && req.body.useAlternativeTR069UID) {
        device = await DeviceModel.findOne({alt_uid_tr069: req.body.mac});
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
      if (content.connection_type) {
        device.connection_type = content.connection_type;
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
      } else if (req.body.isOnu && req.body.useAlternativeTR069UID) {
        device = await DeviceModel.findOne({alt_uid_tr069: req.body.mac});
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

/*
STATUS MAPPING:
200: success,
403: action forbidden,
404: device not found,
500: internal error;
*/
diagAppAPIController.associateSlave = async function(req, res) {
  let response = {
    registrationStatus: 'failed',
    bridgeStatus: 'failed',
    switchEnabledStatus: 'failed'
  };
  if (!req.body.master || !req.body.slave) {
    response.message = 'JSON recebido não é válido';
    return res.status(500).json(response);
  }
  const masterMacAddr = req.body.master.toUpperCase();
  const slaveMacAddr = req.body.slave.toUpperCase();
  if (!utilHandlers.isMacValid(masterMacAddr)) {
    response.message = 'MAC do CPE primário inválido';
    return res.status(403).json(response);
  }
  if (!utilHandlers.isMacValid(slaveMacAddr)) {
    response.message = 'MAC do CPE candidato a secundário inválido';
    return res.status(403).json(response);
  }
  const masterProjection = 'mesh_master mesh_slaves mesh_mode mesh_key mesh_id '+
  'wifi_ssid wifi_password wifi_band wifi_mode wifi_state wifi_hidden '+
  'isSsidPrefixEnabled wifi_channel wifi_is_5ghz_capable wifi_ssid_5ghz '+
  'wifi_password_5ghz wifi_band_5ghz wifi_mode_5ghz wifi_state_5ghz '+
  'wifi_hidden_5ghz wifi_channel_5ghz';
  let matchedMaster = await DeviceModel.findById(masterMacAddr, masterProjection)
  .catch((err) => {
    response.message = 'Erro interno';
    return res.status(500).json(response);
  });
  if (!matchedMaster) {
    response.message = 'CPE primário não encontrado';
    return res.status(404).json(response);
  }
  if (matchedMaster.mesh_mode === 0) {
    response.message = 'CPE indicado como primário não está em modo mesh';
    return res.status(403).json(response);
  }
  if (matchedMaster.mesh_master) {
    response.message = 'CPE indicado como primário é secundário';
    return res.status(403).json(response);
  }
  const slaveProjection = 'mesh_master mesh_slaves mesh_mode bridge_mode_enabled ' +
  'bridge_mode_switch_disable lastboot_date use_tr069 version model mesh_key ' +
  'mesh_id wifi_ssid wifi_password wifi_band wifi_mode wifi_state '+
  'wifi_hidden isSsidPrefixEnabled wifi_channel wifi_is_5ghz_capable '+
  'wifi_ssid_5ghz wifi_password_5ghz wifi_band_5ghz wifi_mode_5ghz '+
  'wifi_state_5ghz wifi_hidden_5ghz wifi_channel_5ghz';
  let matchedSlave = await DeviceModel.findById(slaveMacAddr, slaveProjection)
  .catch((err) => {
    response.message = 'Erro interno';
    return res.status(500).json(response);
  });
  if (!matchedSlave) {
    response.message = 'CPE candidato a secundário não encontrado';
    return res.status(404).json(response);
  }
  const isMeshV2Compatible = DeviceVersion.findByVersion(
    matchedSlave.version,
    matchedSlave.wifi_is_5ghz_capable,
    matchedSlave.model
  ).grantMeshV2;
  if (!isMeshV2Compatible) {
    response.message = 'CPE candidato a secundário não é ' +
    'compatível com o mesh v2';
    return res.status(403).json(response);
  }
  if (matchedSlave.mesh_master &&
  matchedSlave.mesh_master !== masterMacAddr) {
    response.message = 'CPE candidato a secundário já está registrado' +
    ' como secundário de ' + matchedSlave.mesh_master;
    return res.status(403).json(response);
  }
  if ((matchedSlave.mesh_mode !== 0 && !matchedSlave.mesh_master) ||
  (matchedSlave.mesh_slaves && matchedSlave.mesh_slaves.length)) {
    response.message = 'CPE candidato a secundário é primário';
    return res.status(403).json(response);
  }
  if (matchedSlave.use_tr069) {
    response.message = 'CPE candidato a secundário não pode ser TR-069';
    return res.status(403).json(response);
  }
  const isSlaveOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
    return map[slaveMacAddr];
  });
  if (!isSlaveOn) {
    response.message = 'CPE candidato a secundário não está online';
    return res.status(403).json(response);
  }

  // If no errors occur always update the slave
  // to make sure master and slave are synchronized
  matchedSlave.mesh_master = matchedMaster._id;
  meshHandlers.syncSlaveWifi(matchedMaster, matchedSlave);
  await matchedSlave.save();

  if (!matchedMaster.mesh_slaves.includes(slaveMacAddr)) {
    matchedMaster.mesh_slaves.push(slaveMacAddr);
    await matchedMaster.save();
  }

  // Now we must put slave in bridge mode

  let isBridge;
  let isSwitchEnabled;

  if (!matchedSlave.bridge_mode_enabled) {
    isBridge = 'success';
    matchedSlave.bridge_mode_enabled = true;
  } else {
    // Already in bridge mode
    isBridge = 'already';
  }
  if (matchedSlave.bridge_mode_switch_disable) {
    isSwitchEnabled = 'success';
    matchedSlave.bridge_mode_switch_disable = false;
  } else {
    // Switch already enabled
    isSwitchEnabled = 'already';
  }

  if (isBridge === 'success' || isSwitchEnabled === 'success') {
    await matchedSlave.save();
  }

  // We do not differentiate the case where
  // the slave was already registered in relation to the master.
  // If no errors occur, always treat as a new register.
  // This is done in case some config on the slave was outdated.

  // Instead of updating slave, we send lastboot_date
  // to app and a reboot is done

  response.message = 'Sucesso';
  response.registrationStatus = 'success';
  response.bridgeStatus = isBridge;
  response.switchEnabledStatus = isSwitchEnabled;
  response.lastBootDate = matchedSlave.lastboot_date;

  return res.status(200).json(response);
};

diagAppAPIController.disassociateSlave = async function(req, res) {
  if (!req.body.slave) {
    return res.status(500).json({
      success: false,
      message: 'JSON recebido não é válido',
    });
  }
  const slaveMacAddr = req.body.slave.toUpperCase();
  if (!utilHandlers.isMacValid(slaveMacAddr)) {
    return res.status(403).json({
      success: false,
      message: 'MAC do CPE indicado como secundário inválido',
    });
  }
  let matchedSlave = await DeviceModel.findById(slaveMacAddr,
  'mesh_master mesh_slaves mesh_mode')
  .catch((err) => {
    return res.status(500).json({
      success: false,
      message: 'Erro interno',
    });
  });
  if (!matchedSlave) {
    return res.status(404).json({
      success: false,
      message: 'CPE indicado como secundário não encontrado',
    });
  }
  if (!matchedSlave.mesh_master) {
    return res.status(403).json({
      success: false,
      message: 'CPE indicado como secundário não possui primário associado',
    });
  }
  if (matchedSlave.mesh_slaves && matchedSlave.mesh_slaves.length) {
    return res.status(403).json({
      success: false,
      message: 'CPE indicado como secundário possui ' +
      'CPEs secundários associados',
    });
  }
  const masterMacAddr = matchedSlave.mesh_master.toUpperCase();
  let matchedMaster = await DeviceModel.findById(masterMacAddr,
  'mesh_master mesh_slaves mesh_mode use_tr069 last_contact')
  .catch((err) => {
    return res.status(500).json({
      success: false,
      message: 'Erro interno',
    });
  });
  if (!matchedMaster) {
    return res.status(404).json({
      success: false,
      message: 'CPE indicado como primário não encontrado',
    });
  }
  if (matchedMaster.mesh_mode === 0) {
    return res.status(403).json({
      success: false,
      message: 'CPE indicado como primário não está em modo mesh',
    });
  }
  if (matchedMaster.mesh_master) {
    return res.status(403).json({
      success: false,
      message: 'CPE indicado como primário é secundário',
    });
  }
  if (!matchedMaster.mesh_slaves.includes(slaveMacAddr)) {
    return res.status(403).json({
      success: false,
      message: 'CPE indicado como secundário não está na ' +
      'lista de secundários do CPE indicado como primário',
    });
  }

  matchedSlave.mesh_master = '';
  matchedSlave.mesh_mode = 0;
  await matchedSlave.save();

  const slaveIndex = matchedMaster.mesh_slaves.indexOf(slaveMacAddr);
  matchedMaster.mesh_slaves.splice(slaveIndex, 1);
  await matchedMaster.save();

  const isSlaveOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
    return map[slaveMacAddr];
  });
  if (isSlaveOn) mqtt.anlixMessageRouterUpdate(slaveMacAddr);

  return res.status(200).json({
    success: true,
    message: 'Sucesso',
  });
};

diagAppAPIController.poolFlashmanField = async function(req, res) {
  if (!req.body.mac || !req.body.field) {
    return res.status(500).json({message: 'JSON recebido não é válido'});
  }
  const macAddr = req.body.mac.toUpperCase();
  if (!utilHandlers.isMacValid(macAddr)) {
    return res.status(403).json({message: 'MAC inválido'});
  }
  const field = req.body.field;
  let matchedDevice = await DeviceModel.findById(macAddr, field)
  .catch((err) => {
    return res.status(500).json({message: 'Erro interno'});
  });
  if (!matchedDevice) {
    return res.status(404).json({message: 'CPE não encontrado'});
  }
  let fieldValue = matchedDevice[field];
  if (fieldValue === undefined) {
    return res.status(404).json({message: 'Campo não encontrado'});
  }
  if (fieldValue instanceof Date) fieldValue = fieldValue.getTime();
  return res.status(200).json({fieldValue: fieldValue});
};

module.exports = diagAppAPIController;
