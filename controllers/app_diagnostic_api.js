/* global __line */
const DeviceModel = require('../models/device');
const DeviceVersion = require('../models/device_version');
const UserModel = require('../models/user');
const Notification = require('../models/notification');
const Role = require('../models/role');
const ConfigModel = require('../models/config');
const acsDiagnosticsHandler = require('./handlers/acs/diagnostics');
const keyHandlers = require('./handlers/keys');
const utilHandlers = require('./handlers/util');
const deviceHandlers = require('./handlers/devices');
const meshHandlers = require('./handlers/mesh');
const acsDeviceInfo = require('./acs_device_info.js');
const deviceList = require('./device_list.js');
const mqtt = require('../mqtts');
const debug = require('debug')('APP');
const fs = require('fs');
const controlApi = require('./external-api/control');
const t = require('./language').i18next.t;

let diagAppAPIController = {};

// Add onu custom credentials, if present
let onuFactoryCredentials = {
  timestamp: new Date(),
  credentials: [
    {vendor: 'D-Link', model: 'DIR-841', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'D-Link', model: 'DIR-842', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'FastWireless', model: 'FW323DAC', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Greatek', model: 'Stavix G421RQ', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Huawei', model: 'EG8145V5', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Huawei', model: 'EG8145X6', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Huawei', model: 'HG8245Q2', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Huawei', model: 'WS5200', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Huawei', model: 'WS7001 / AX2', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Huawei', model: 'WS7100 / AX3', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Hurakall', model: 'ST-1001-FL', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Intelbras', model: 'WiFiber 121 AC', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Multilaser / ZTE', model: 'F660', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Multilaser / ZTE', model: 'F670L', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Multilaser / ZTE', model: 'F680', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Multilaser / ZTE', model: 'H198A', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Multilaser / ZTE', model: 'H199A', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Nokia', model: 'BEACON HA-020W-B', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Nokia', model: 'G-140W-C', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Nokia', model: 'G-2425G-A', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Tenda', model: 'AC10', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'Tenda', model: 'HG9', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'TP-Link', model: 'Archer C6 v3.2', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'TP-Link', model: 'EC220-G5 v2', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'UNEE', model: 'Stavix MPG421R', username: 'admin', password: 'A@Nlix123'},
    {vendor: 'ZTE', model: 'F670L', username: 'admin', password: 'A@Nlix123'},
  ],
};

// TODO: Usar esse objeto para compor os dropdowns na tela de adição de preset
// let credentialsDropdownObj = {
//   'D-Link': ['DIR-841', 'DIR-842'],
//   'FastWireless': ['FW323DAC'],
//   'Greatek': ['Stavix G421RQ'],
//   'Huawei': [
//     'EG8145V5', 'EG8145X6', 'HG8245Q2', 'WS5200', 'WS7001 / AX2', 'WS7100 / AX3'
//   ],
//   'Hurakall': ['ST-1001-FL'],
//   'Intelbras': ['WiFiber 121 AC'],
//   'Multilaser / ZTE': ['F660', 'F670L', 'F680', 'H198A', 'H199A'],
//   'Nokia': ['BEACON HA-020W-B', 'G-140W-C', 'G-2425G-A'],
//   'Tenda': ['AC10', 'HG9'],
//   'TP-Link': ['Archer C6 v3.2', 'EC220-G5 v2'],
//   'UNEE': ['Stavix MPG421R'],
//   'ZTE': ['F670L'],
// };

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
    speedtest: (diagnostic && diagnostic.speedtest === 0),
    speedValue: (diagnostic && 'speedValue' in diagnostic) ?
                  diagnostic.speedValue : null,
    speedTestLimit: (diagnostic && 'speedTestLimit' in diagnostic) ?
                  diagnostic.speedTestLimit : null,
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
    didSpeedTest: c.didSpeedTest || false,
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
  ).lean().catch((err) => err);
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
  session.onuFactoryCredentials = onuFactoryCredentials;
  return session;
};

diagAppAPIController.sessionLogin = (req, res) => {
  UserModel.findOne({name: req.body.user}, (err, user) => {
    if (err || !user) {
      return res.status(404).json({
        success: false,
        message: t('userNotFound', {errorline: __line}),
      });
    }
    Role.findOne({name: user.role}, async (err, role) => {
      if (err || (!user.is_superuser && !role)) {
        return res.status(500).json({
          success: false,
          message: t('permissionFindError', {errorline: __line}),
        });
      }
      if (!user.is_superuser && !role.grantDiagAppAccess) {
        return res.status(403).json({
          success: false,
          message: t('permissionDenied', {errorline: __line}),
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
        return res.status(404).json({'error':
          t('macNotFound', {errorline: __line})});
      }
      let content = req.body;
      let updateParameters = false;
      let changes = {wifi2: {}, wifi5: {}};

      // Get SSID prefix data
      let matchedConfig = await ConfigModel.findOne({is_default: true}).lean();
      if (!matchedConfig) {
        console.error('No config exists');
        return res.status(500).json({'error':
          t('configFindError', {errorline: __line})});
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
            'message': t('ssidPrefixInvalidLength'),
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
      return res.status(403).json({'error':
        t('macUndefined', {errorline: __line})});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error':
      t('serverError', {errorline: __line})});
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
      return res.status(404).json({'error':
        t('cpeNotFound', {errorline: __line})});
    }
    const targetMode = parseInt(req.body.mesh_mode);
    const validateStatus = await meshHandlers.validateMeshMode(
      device, targetMode,
    );
    if (!validateStatus.success) {
      return res.status(500).json({'error': validateStatus.msg});
    }
    /*
      For tr-069 CPEs we must wait until after device has been
      updated via genie to save device in database.
    */
    if (device.use_tr069) {
      let configOk = await acsDeviceInfo.configTR069VirtualAP(
        device, targetMode,
      );
      if (!configOk.success) {
        return res.status(500).json({success: false, message: configOk.msg});
      }
      const collectOk = await deviceList.ensureBssidCollected(
        device, targetMode,
      );
      if (!collectOk.success) {
        return res.status(500).json({
          'error': collectOk.msg,
        });
      }
    }
    meshHandlers.setMeshMode(device, targetMode);
    device.do_update_parameters = true;
    await device.save();
    meshHandlers.syncSlaves(device);
    if (!device.use_tr069) {
      // flashbox device, call mqtt
      mqtt.anlixMessageRouterUpdate(device._id);
    }
    return res.status(200).json({'success': true});
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error': err.msg});
  }
};

diagAppAPIController.checkMeshStatus = async function(req, res) {
  try {
    // Make sure we have a mac to verify in database
    if (req.body.mac) {
      // Fetch device from database
      let device = await DeviceModel.findById(req.body.mac);
      if (!device) {
        return res.status(404).json({'error':
          t('macNotFound', {errorline: __line})});
      }
      if (!device.mesh_slaves || device.mesh_slaves.length === 0) {
        return res.status(200).json({'count': 0, 'slaves': []});
      }
      return res.status(200).json({
        'count': device.mesh_slaves.length,
        'slaves': device.mesh_slaves,
      });
    } else {
      return res.status(403).json({'error':
        t('macUndefined', {errorline: __line})});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error':
      t('serverError', {errorline: __line})});
  }
};

diagAppAPIController.removeSlaveMeshV1 = async function(req, res) {
  try {
    // Make sure we have a mac to remove from database
    if (req.body.remove_mac) {
      // Fetch device from database
      let device = await DeviceModel.findById(req.body.remove_mac);
      if (!device) {
        return res.status(404).json({'error':
          t('macNotFound', {errorline: __line})});
      }
      if (!device.mesh_master) {
        return res.status(403).json({'error':
          t('cpeIsNotMeshSlave', {errorline: __line})});
      }
      deviceHandlers.removeDeviceFromDatabase(device);
      return res.status(200).json({'success': true});
    } else {
      return res.status(403).json({'error':
        t('macUndefined', {errorline: __line})});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error':
      t('serverError', {errorline: __line})});
  }
};

diagAppAPIController.receiveCertification = async (req, res) => {
  try {
    let result = await UserModel.find({'name': req.body.user});
    if (result.length === 0) {
      return res.status(404).json({'error':
        t('userNotFound', {errorline: __line})});
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
      if (
        content.current.latitude && content.current.longitude &&
        !device.stop_coordinates_update
      ) {
        device.latitude = content.current.latitude;
        device.longitude = content.current.longitude;
        device.last_location_date = new Date();
      }
      if (content.current.contractType && content.current.contract) {
        device.external_reference.kind = content.current.contractType;
        device.external_reference.data = content.current.contract;
      }
      await device.save();
      pushCertification(certifications, content.current, true);
    }
    // Save changes to database and respond
    await user.save();
    let session = await generateSessionCredential(user.name);
    session.success = true;
    return res.status(200).json(session);
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error':
      t('serverError', {errorline: __line})});
  }
};

diagAppAPIController.verifyFlashman = async (req, res) => {
  try {
    // Make sure we have a mac to verify in database
    if (req.body.mac) {
      // Fetch device from database - query depends on if it's ONU or not
      let device;
      let tr069Info = {url: '', interval: 0};

      if (req.body.isOnu) {
        if (req.body.onuMac) {
          device = await DeviceModel.findById(req.body.onuMac);
        } else if (req.body.useAlternativeTR069UID) {
          device = await DeviceModel.findOne({alt_uid_tr069: req.body.mac});
        } else {
          device = await DeviceModel.findOne({serial_tr069: req.body.mac});
        }
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
            measureServerIP: true,
            licenseApiSecret: true,
            company: true,
          },
        ).lean().catch((err) => err)
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
        requiredSpeedTest: false,
      };
      if (config.certification) {
        certification.requiredWan = config.certification.wan_step_required;
        certification.requiredIpv4 = config.certification.ipv4_step_required;
        certification.requiredIpv6 = config.certification.ipv6_step_required;
        certification.requiredDns = config.certification.dns_step_required;
        certification.requiredFlashman =
          config.certification.flashman_step_required;
      }
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
      if (onuFactoryCredentials) {
        onuConfig.onuFactoryCredentials = onuFactoryCredentials;
      }
      if (!device) {
        return res.status(200).json({
          'success': true,
          'isRegister': false,
          'isOnline': false,
          'tr069Info': tr069Info,
          'onuConfig': onuConfig,
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

      let permissions = DeviceVersion.devicePermissions(device);

      if (config.certification.speedtest_step_required) {
        if (config && config.measureServerIP) {
          certification.requiredSpeedTest = permissions.grantSpeedTest;
        }
      }

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
        // Saving IPv6 and VoIP info sent from app
        if ('voipEnabled' in req.body) {
          let voipEnabled = req.body.voipEnabled;
          if (typeof voipEnabled === 'boolean') {
            device.custom_tr069_fields.voip_enabled = voipEnabled;
          } else {
            device.custom_tr069_fields.voip_enabled = false;
          }
        }
        if ('ipv6Enabled' in req.body) {
          let ipv6Enabled = req.body.ipv6Enabled;
          if (typeof ipv6Enabled === 'boolean') {
            device.custom_tr069_fields.ipv6_enabled = ipv6Enabled;
          } else {
            device.custom_tr069_fields.ipv6_enabled = false;
          }
        }
        if ('ipv6Mode' in req.body) {
          let ipv6Mode = req.body.ipv6Mode;
          if (typeof ipv6Mode === 'string') {
            device.custom_tr069_fields.ipv6_mode = ipv6Mode;
          } else {
            device.custom_tr069_fields.ipv6_mode = '';
          }
        }
        // We need to store WiFiber's OMCI Mode for OLT connection
        if (req.body.intelbrasOmciMode) {
          let omciMode = req.body.intelbrasOmciMode;
          device.custom_tr069_fields.intelbras_omci_mode = omciMode;
        }
        await device.save();
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
      return res.status(403).json({'error':
        t('macUndefined', {errorline: __line})});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error':
      t('serverError', {errorline: __line})});
  }
};

diagAppAPIController.getTR069Config = async function(req, res) {
  let config = await ConfigModel.findOne({is_default: true}, 'tr069')
    .lean().exec().catch((err) => err);
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
        return res.status(404).json({'error':
          t('macNotFound', {errorline: __line})});
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
      return res.status(403).json({'error':
        t('macUndefined', {errorline: __line})});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error':
      t('serverError', {errorline: __line})});
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
        return res.status(404).json({'error':
          t('macNotFound', {errorline: __line})});
      }
      return res.status(200).json({
        'success': true,
        'pppoeUser': device.pppoe_user,
        'pppoePass': device.pppoe_password,
        'wifiPass': device.wifi_password,
        'wifiPass5ghz': device.wifi_password_5ghz,
      });
    } else {
      return res.status(403).json({'error':
        t('macUndefined', {errorline: __line})});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({'error':
      t('serverError', {errorline: __line})});
  }
};

/*
STATUS MAPPING:
200: success,
403: action forbidden,
404: device not found,
500: internal error;
*/
diagAppAPIController.associateSlaveMeshV2 = async function(req, res) {
  let response = {
    registrationStatus: 'failed',
    bridgeStatus: 'failed',
    switchEnabledStatus: 'failed',
  };
  if (!req.body.master || !req.body.slave) {
    response.message = t('jsonInvalidFormat', {errorline: __line});
    response.errcode = 'invalid';
    return res.status(500).json(response);
  }
  const masterMacAddr = req.body.master.toUpperCase();
  const slaveMacAddrList = req.body.slave.toUpperCase();
  let slaveMacAddr = null;

  // Slave MAC Addr might be a list read from bar codes.
  // Use first MAC matched with database if it's a list
  if (Array.isArray(slaveMacAddrList)) {
    for (let possibleSlaveMac of slaveMacAddrList) {
      if (!utilHandlers.isMacValid(possibleSlaveMac)) continue;
      let possibleMatch = await DeviceModel.findById(
        possibleSlaveMac, {_id: true})
      .catch((err) => {
        response.message = t('cpeFindError', {errorline: __line});
        return res.status(500).json(response);
      });
      if (possibleMatch && possibleMatch._id) {
        slaveMacAddr = possibleMatch._id;
        break;
      }
    }
  } else {
    slaveMacAddr = slaveMacAddrList;
  }

  if (!utilHandlers.isMacValid(masterMacAddr)) {
    response.message = t('primaryCpeMacInvalid', {errorline: __line});
    response.errcode = 'invalid-mac-primary';
    return res.status(403).json(response);
  }
  if (!utilHandlers.isMacValid(slaveMacAddr)) {
    response.message =
      t('secondaryCandidateCpeMacInvalid', {errorline: __line});
    response.errcode = 'invalid-mac-secondary';
    return res.status(403).json(response);
  }
  const masterProjection = 'mesh_master mesh_slaves mesh_mode mesh_key '+
  'mesh_id wifi_ssid wifi_password wifi_band wifi_mode wifi_state wifi_hidden '+
  'isSsidPrefixEnabled wifi_channel wifi_is_5ghz_capable wifi_ssid_5ghz '+
  'wifi_password_5ghz wifi_band_5ghz wifi_mode_5ghz wifi_state_5ghz '+
  'wifi_hidden_5ghz wifi_channel_5ghz';
  let matchedMaster;
  try {
    matchedMaster = await DeviceModel.findById(masterMacAddr, masterProjection);
  } catch (err) {
    response.message = t('cpeFindError', {errorline: __line});
    response.errcode = 'internal';
    return res.status(500).json(response);
  }
  if (!matchedMaster) {
    response.message = t('primaryCpeNotFound', {errorline: __line});
    response.errcode = 'notfound-mac-primary';
    return res.status(404).json(response);
  }
  if (matchedMaster.mesh_mode === 0) {
    response.message = t('primaryCpeNotInMeshMode', {errorline: __line});
    response.errcode = 'primary-not-mesh';
    return res.status(403).json(response);
  }
  if (matchedMaster.mesh_master) {
    response.message = t('primaryCpeIsSecondary', {errorline: __line});
    response.errcode = 'primary-is-secondary';
    return res.status(403).json(response);
  }
  const slaveProjection = 'mesh_master mesh_slaves mesh_mode version model ' +
  'bridge_mode_enabled bridge_mode_switch_disable lastboot_date use_tr069 ' +
  'mesh_key mesh_id wifi_ssid wifi_password wifi_band wifi_mode wifi_state '+
  'wifi_hidden isSsidPrefixEnabled wifi_channel wifi_is_5ghz_capable '+
  'wifi_ssid_5ghz wifi_password_5ghz wifi_band_5ghz wifi_mode_5ghz '+
  'wifi_state_5ghz wifi_hidden_5ghz wifi_channel_5ghz';
  let matchedSlave;
  try {
    matchedSlave = await DeviceModel.findById(slaveMacAddr, slaveProjection);
  } catch (err) {
    response.message = t('cpeFindError', {errorline: __line});
    response.errcode = 'internal';
    return res.status(500).json(response);
  }
  if (!matchedSlave) {
    response.message = t('secondaryCandidateCpeNotFound', {errorline: __line});
    response.errcode = 'notfound-mac-secondary';
    return res.status(404).json(response);
  }
  let slavePermissions = DeviceVersion.devicePermissions(matchedSlave);
  const isMeshV2Compatible = slavePermissions.grantMeshV2SecondaryMode;
  if (!isMeshV2Compatible) {
    response.message = t('secondaryCandidateCpeNotCompatibleWithMeshV2',
      {errorline: __line});
    response.errcode = 'secondary-incompatible';
    return res.status(403).json(response);
  }
  if (matchedSlave.mesh_master &&
  matchedSlave.mesh_master !== masterMacAddr) {
    response.message = t('secondaryCandidateCpeAlreadyAssignedTo',
      {mesh_master: matchedSlave.mesh_master, errorline: __line});
    response.errcode = 'secondary-already-has-master';
    return res.status(403).json(response);
  }
  if ((matchedSlave.mesh_mode !== 0 && !matchedSlave.mesh_master) ||
  (matchedSlave.mesh_slaves && matchedSlave.mesh_slaves.length)) {
    response.message = t('secondaryCandidateCpeIsPrimary',
      {errorline: __line});
    response.errcode = 'secondary-is-primary';
    return res.status(403).json(response);
  }
  if (matchedSlave.use_tr069) {
    response.message = t('secondaryCandidateCpeCannotBeTr069',
      {errorline: __line});
    response.errcode = 'secondary-is-tr069';
    return res.status(403).json(response);
  }
  const isSlaveOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
    return map[slaveMacAddr];
  });
  if (!isSlaveOn) {
    response.message = t('secondaryCandidateCpeNotOnline', {errorline: __line});
    response.errcode = 'secondary-not-online';
    return res.status(403).json(response);
  }

  // If no errors occur always update the slave
  // to make sure master and slave are synchronized
  matchedSlave.mesh_master = matchedMaster._id;
  meshHandlers.syncSlaveWifi(matchedMaster, matchedSlave);
  try {
    await matchedSlave.save();
  } catch (err) {
    console.log('Error saving slave mesh assoc: ' + err);
    response.message = t('saveError', {errorline: __line});
    response.errcode = 'internal';
    return res.status(500).json(response);
  }

  if (!matchedMaster.mesh_slaves.includes(slaveMacAddr)) {
    matchedMaster.mesh_slaves.push(slaveMacAddr);
    try {
      await matchedMaster.save();
    } catch (err) {
      console.log('Error saving master mesh assoc: ' + err);
      response.message = t('saveError', {errorline: __line});
      response.errcode = 'internal';
      return res.status(500).json(response);
    }
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
    try {
      await matchedSlave.save();
    } catch (err) {
      console.log('Error saving slave mesh assoc: ' + err);
      response.message = t('saveError', {errorline: __line});
      response.errcode = 'internal';
      return res.status(500).json(response);
    }
  }

  // We do not differentiate the case where
  // the slave was already registered in relation to the master.
  // If no errors occur, always treat as a new register.
  // This is done in case some config on the slave was outdated.

  // Instead of updating slave, we send lastboot_date
  // to app and a reboot is done

  response.message = t('Success');
  response.registrationStatus = 'success';
  response.bridgeStatus = isBridge;
  response.switchEnabledStatus = isSwitchEnabled;
  let lastBootDate = matchedSlave.lastboot_date;
  if (!lastBootDate) {
    response.lastBootDate = 0;
  } else {
    response.lastBootDate = lastBootDate.getTime();
  }

  return res.status(200).json(response);
};

diagAppAPIController.disassociateSlaveMeshV2 = async function(req, res) {
  if (!req.body.slave) {
    return res.status(500).json({
      success: false,
      message: t('jsonInvalidFormat', {errorline: __line}),
    });
  }
  const slaveMacAddr = req.body.slave.toUpperCase();
  if (!utilHandlers.isMacValid(slaveMacAddr)) {
    return res.status(403).json({
      success: false,
      message: t('secondaryIndicatedCpeMacInvalid', {errorline: __line}),
    });
  }
  let matchedSlave = await DeviceModel.findById(slaveMacAddr,
  'mesh_master mesh_slaves mesh_mode')
  .catch((err) => {
    return res.status(500).json({
      success: false,
      message: t('cpeFindError', {errorline: __line}),
    });
  });
  if (!matchedSlave) {
    return res.status(404).json({
      success: false,
      message: t('secondaryIndicatedCpeNotFound', {errorline: __line}),
    });
  }
  if (!matchedSlave.mesh_master) {
    return res.status(403).json({
      success: false,
      message: t('secondaryIndicatedCpeNotAssignedToPrimary',
        {errorline: __line}),
    });
  }
  if (matchedSlave.mesh_slaves && matchedSlave.mesh_slaves.length) {
    return res.status(403).json({
      success: false,
      message: t('secondaryIndicatedCpeHasSecondariesAssigned',
        {errorline: __line}),
    });
  }
  const masterMacAddr = matchedSlave.mesh_master.toUpperCase();
  let matchedMaster = await DeviceModel.findById(masterMacAddr,
  'mesh_master mesh_slaves mesh_mode use_tr069 last_contact')
  .catch((err) => {
    return res.status(500).json({
      success: false,
      message: t('cpeFindError', {errorline: __line}),
    });
  });
  if (!matchedMaster) {
    return res.status(404).json({
      success: false,
      message: t('primaryCpeNotFound', {errorline: __line}),
    });
  }
  if (matchedMaster.mesh_mode === 0) {
    return res.status(403).json({
      success: false,
      message: t('primaryCpeNotInMeshMode', {errorline: __line}),
    });
  }
  if (matchedMaster.mesh_master) {
    return res.status(403).json({
      success: false,
      message: t('primaryCpeIsSecondary', {errorline: __line}),
    });
  }
  if (!matchedMaster.mesh_slaves.includes(slaveMacAddr)) {
    return res.status(403).json({
      success: false,
      message: t('secondaryIndicatedCpeNotInPrimaryList', {errorline: __line}),
    });
  }

  // Credit mesh license back
  let controlApiRet = await controlApi.meshLicenseCredit(slaveMacAddr);
  if (!controlApiRet.success) {
    return res.status(500).json({
      success: false,
      message: t('errorCreditingMeshLicense', {errorline: __line}),
    });
  }

  matchedSlave.mesh_master = '';
  matchedSlave.mesh_mode = 0;
  try {
    await matchedSlave.save();
  } catch (err) {
    console.log('Error saving slave mesh disassoc: ' + err);
    return res.status(500).json({
      success: false,
      message: t('saveError', {errorline: __line}),
    });
  }

  const slaveIndex = matchedMaster.mesh_slaves.indexOf(slaveMacAddr);
  matchedMaster.mesh_slaves.splice(slaveIndex, 1);
  try {
    await matchedMaster.save();
  } catch (err) {
    console.log('Error saving master mesh disassoc: ' + err);
    return res.status(500).json({
      success: false,
      message: t('saveError', {errorline: __line}),
    });
  }

  const isSlaveOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
    return map[slaveMacAddr];
  });
  if (isSlaveOn) mqtt.anlixMessageRouterUpdate(slaveMacAddr);

  return res.status(200).json({
    success: true,
    message: t('Success'),
  });
};

diagAppAPIController.poolFlashmanField = async function(req, res) {
  if (!req.body.mac || !req.body.field) {
    return res.status(500).json({message:
      t('jsonInvalidFormat', {errorline: __line})});
  }
  const macAddr = req.body.mac.toUpperCase();
  if (!utilHandlers.isMacValid(macAddr)) {
    return res.status(403).json({message:
      t('macInvalid', {errorline: __line})});
  }
  const field = req.body.field;
  let matchedDevice = await DeviceModel.findById(macAddr, field)
  .catch((err) => {
    return res.status(500).json({message:
      t('cpeFindError', {errorline: __line})});
  });
  if (!matchedDevice) {
    return res.status(404).json({message:
      t('cpeNotFound', {errorline: __line})});
  }
  let fieldValue = matchedDevice[field];
  if (fieldValue === undefined) {
    return res.status(404).json({message:
      t('fieldNotFound', {errorline: __line})});
  }
  if (fieldValue instanceof Date) fieldValue = fieldValue.getTime();
  return res.status(200).json({fieldValue: fieldValue});
};


// =============================================================================
// Implementation of speedtest route methods on flashman.
diagAppAPIController.getSpeedTest = function(req, res) {
  DeviceModel.findByMacOrSerial(req.body.mac).exec(
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

    let config;
    try {
      config = await ConfigModel.findOne(
        {is_default: true}, {measureServerIP: true, measureServerPort: true},
      ).lean();
      if (!config) throw new Error('Config not found');
    } catch (err) {
      console.log(err.message);
    }

    let reply = {'speedtest': {}};
    if (config && config.measureServerIP) {
      reply.speedtest.server = config.measureServerIP;
    }
    let previous = matchedDevice.speedtest_results;
    reply.speedtest.previous = previous;
    if (previous && previous.length > 0) {
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

diagAppAPIController.doSpeedTest = function(req, res) {
  DeviceModel.findByMacOrSerial(req.body.mac).exec(
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

    // Send reply first, then send mqtt message
    let lastMeasureID;
    let lastErrorID;
    let previous = matchedDevice.speedtest_results;
    if (previous && previous.length > 0) {
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
      return map[req.body.mac.toUpperCase()];
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
        config = await ConfigModel.findOne(
          {is_default: true}, {measureServerIP: true, measureServerPort: true},
        ).lean();
        if (!config) throw new Error('Config not found');
      } catch (err) {
        console.log(err.message);
      }

      if (config && config.measureServerIP) {
        if (matchedDevice.use_tr069) {
          matchedDevice.current_speedtest.timestamp = new Date();
          matchedDevice.current_speedtest.user = req.user.name;
          matchedDevice.current_speedtest.stage = 'estimative';
          try {
            await matchedDevice.save();
            acsDiagnosticsHandler.fireSpeedDiagnose(matchedDevice._id);
          } catch (err) {
            console.log('Error saving speed test estimative: ' + err);
          }
        } else {
          // Send mqtt message to perform speedtest
          let url = config.measureServerIP + ':' + config.measureServerPort;
          mqtt.anlixMessageRouterSpeedTest(req.body.mac, url,
                                           {name: req.user.name});
        }
      }
    }, 1.5*1000);
  });
};
// =============================================================================

module.exports = diagAppAPIController;
