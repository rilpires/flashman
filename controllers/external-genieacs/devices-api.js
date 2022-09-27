/*
The scripts in this directory are loaded by genieacs along with the provision
script. Configure genieacs' cwmp server parameter EXT_DIR to the following:
"path/to/flashman/controllers/external-genieacs"
*/

// ***** WARNING!!! *****
// DO NOT CHANGE THIS VARIABLE WITHOUT ALSO CHANGING THE COMMAND THAT ALTERS IT
// IN CONTROLLERS/UPDATE_FLASHMAN.JS! THIS LINE IS ALTERED AUTOMATICALLY WHEN
// FLASHMAN IS RESTARTED FOR ANY REASON
const INSTANCES_COUNT = 1;
/* This file is called by genieacs-cwmp, so need to set FLM_WEB_PORT in
 environment.genieacs.json or in shell environment with the same value
 that is in environment.config.json */
const FLASHMAN_PORT = (process.env.FLM_WEB_PORT || 8000);
const API_URL = 'http://'+(process.env.FLM_WEB_HOST || 'localhost')
  +':$PORT/acs/';

const request = require('request');
const basicCPEModel = require('./cpe-models/base-model');

// Import each and every model
const tr069Models = {
  datacomDM985Model: require('./cpe-models/datacom-dm985-424'),
  datacomDM986Model: require('./cpe-models/datacom-dm986-414'),
  dlinkDir615Model: require('./cpe-models/dlink-dir-615'),
  dlinkDir841Model: require('./cpe-models/dlink-dir-841'),
  dlinkDir842Model: require('./cpe-models/dlink-dir-842'),
  fastwirelessFW323DACModel: require('./cpe-models/fastwireless-fw323dac'),
  fiberhomeHG6143DModel: require('./cpe-models/fiberhome-hg6143d'),
  fiberhomeHG6145FModel: require('./cpe-models/fiberhome-hg6145f'),
  greatekGwr1200Model: require('./cpe-models/greatek-gwr1200'),
  greatekStavixModel: require('./cpe-models/greatek-stavix'),
  huaweiEG8145V5Model: require('./cpe-models/huawei-eg8145v5'),
  huaweiEG8145X6Model: require('./cpe-models/huawei-eg8145x6'),
  huaweiHG8121HModel: require('./cpe-models/huawei-hg8121h'),
  huaweiHG8245Q2Model: require('./cpe-models/huawei-hg8245q2'),
  huaweiHS8546V5Model: require('./cpe-models/huawei-hs8546v5'),
  huaweiWS5200Model: require('./cpe-models/huawei-ws5200'),
  huaweiWS7001Model: require('./cpe-models/huawei-ws7001'),
  huaweiWS7000Model: require('./cpe-models/huawei-ws7000'),
  huaweiWS7100Model: require('./cpe-models/huawei-ws7100'),
  hurakallST1001FLModel: require('./cpe-models/hurakall-st1001fl'),
  intelbrasRG1200Model: require('./cpe-models/intelbras-rg1200'),
  intelbrasWiFiberModel: require('./cpe-models/intelbras-wifiber'),
  intelbrasWiFiber1200RModel: require('./cpe-models/intelbras-wifiber-1200r'),
  multilaserF660Model: require('./cpe-models/multilaser-f660'),
  multilaserF670LModel: require('./cpe-models/multilaser-f670l'),
  multilaserF670LV9Model: require('./cpe-models/multilaser-f670l-v9'),
  multilaserF680Model: require('./cpe-models/multilaser-f680'),
  multilaserH198Model: require('./cpe-models/multilaser-h198'),
  multilaserH199Model: require('./cpe-models/multilaser-h199'),
  nokiaBeaconOneModel: require('./cpe-models/nokia-beacon'),
  nokiaG140WCModel: require('./cpe-models/nokia-g140w'),
  nokiaG140WHModel: require('./cpe-models/nokia-g140wh'),
  nokiaG1425GAModel: require('./cpe-models/nokia-g1425ga'),
  nokiaG2425Model: require('./cpe-models/nokia-g2425'),
  phyhomeP20Model: require('./cpe-models/phyhome-p20'),
  raisecomRevNModel: require('./cpe-models/raisecom-ht803g-rev-n'),
  raisecomRevTModel: require('./cpe-models/raisecom-ht803g-rev-t'),
  tendaAC10Model: require('./cpe-models/tenda-ac10'),
  tendaHG9Model: require('./cpe-models/tenda-hg9'),
  thinkTkOnuAcDModel: require('./cpe-models/tk-onu-ac-d'),
  tplinkArcherC6: require('./cpe-models/tplink-archer-c6'),
  tplinkArcherC5: require('./cpe-models/tplink-archer-c5'),
  tplinkEC220G5Model: require('./cpe-models/tplink-ec220g5'),
  tplinkHC220G5Model: require('./cpe-models/tplink-hc220g5'),
  uneeStavixModel: require('./cpe-models/unee-stavix'),
  zteZT199Model: require('./cpe-models/zte-zt199'),
  zyxelEMG3524Model: require('./cpe-models/zyxel-emg3524'),
};

const getTR069CustomFactoryModels = function() {
  let ret = new Map();
  Object.values(tr069Models).forEach((cpe) => {
    if (cpe.modelPermissions().features.customAppPassword) {
      if (ret[cpe.identifier.vendor]) {
        ret[cpe.identifier.vendor].push(cpe.identifier.model);
      } else {
        ret[cpe.identifier.vendor] = Array.from([cpe.identifier.model]);
      }
    }
  });
  return ret;
};

const getTR069UpgradeableModels = function() {
  let ret = {vendors: {}, versions: {}};
  Object.values(tr069Models).forEach((cpe)=>{
    let permissions = cpe.modelPermissions();
    // Only include models with firmware upgrades
    if (!permissions.features.firmwareUpgrade) return;
    let vendor = cpe.identifier.vendor;
    let model = cpe.identifier.model;
    let fullID = vendor + ' ' + model;
    if (ret.vendors[vendor]) {
      ret.vendors[vendor].push(model);
      ret.versions[fullID] = Object.keys(permissions.firmwareUpgrades);
    } else {
      ret.vendors[vendor] = Array.from([model]);
      ret.versions[fullID] = Object.keys(permissions.firmwareUpgrades);
    }
  });
  return ret;
};

const instantiateCPEByModelFromDevice = function(device) {
  if (!device.acs_id) {
    return {success: false, cpe: basicCPEModel};
  }
  let splitID = device.acs_id.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let modelName = device.model;
  let fwVersion = device.version;
  let hwVersion = device.hw_version;
  return instantiateCPEByModel(model, modelName, fwVersion, hwVersion);
};

const instantiateCPEByModel = function(
  modelSerial, modelName, fwVersion, hwVersion,
) {
  // Treat special cases where fwVersion and hwVersion are invalid
  if (!fwVersion) fwVersion = '';
  if (!hwVersion) hwVersion = '';
  // Giant if-chain looking for model - sorted alphabetically by comments
  if (['DM985-424', 'DM985%2D424'].includes(modelSerial)) {
    // Datacom DM985-424
    return {success: true, cpe: tr069Models.datacomDM985Model};
  } else if (modelName === 'DM986-414') {
    // Datacom DM986-414
    return {success: true, cpe: tr069Models.datacomDM986Model};
  } else if (modelName === 'DIR-615') {
    // D-Link DIR-615
    return {success: true, cpe: tr069Models.dlinkDir615Model};
  } else if (modelName === 'DIR-841') {
    // D-Link DIR-841
    return {success: true, cpe: tr069Models.dlinkDir841Model};
  } else if (modelName === 'DIR-842') {
    // D-Link DIR-842
    return {success: true, cpe: tr069Models.dlinkDir842Model};
  } else if (
    (modelSerial === 'IGD' && modelName === 'IGD') || modelName === 'FW323DAC'
  ) {
    // FastWireless FW323DAC
    return {success: true, cpe: tr069Models.fastwirelessFW323DACModel};
  } else if (modelName === 'HG6143D') {
    // Fiberhome HG6143D
    return {success: true, cpe: tr069Models.fiberhomeHG6143DModel};
  } else if (modelName === 'HG6145F') {
    // Fiberhome HG6145F
    return {success: true, cpe: tr069Models.fiberhomeHG6145FModel};
  } else if (modelName === 'GWR-1200AC') {
    // Greatek GWR1200
    return {success: true, cpe: tr069Models.greatekGwr1200Model};
  } else if (['GONUAC001', 'GONUAC002'].includes(modelName)) {
    // Greatek Stavix
    return {success: true, cpe: tr069Models.greatekStavixModel};
  } else if (modelName === 'EG8145V5') {
    // Huawei EG8145V5
    return {success: true, cpe: tr069Models.huaweiEG8145V5Model};
  } else if (modelName === 'EG8145X6') {
    // Huawei EG8145X6
    return {success: true, cpe: tr069Models.huaweiEG8145X6Model};
  } else if (modelName === 'HG8121H') {
    // Huawei HG8121H
    return {success: true, cpe: tr069Models.huaweiHG8121HModel};
  } else if (modelName === 'HG8245Q2') {
    // Huawei HG8245Q2
    return {success: true, cpe: tr069Models.huaweiHG8245Q2Model};
  } else if (modelName === 'HS8546V5') {
    // Huawei HS8546V5
    return {success: true, cpe: tr069Models.huaweiHS8546V5Model};
  } else if (['WS5200-21', 'WS5200-40'].includes(modelName)) {
    // Huawei WS5200 v2 / v3
    return {success: true, cpe: tr069Models.huaweiWS5200Model};
  } else if (modelName === 'WS7001-40') {
    // Huawei AX2
    return {success: true, cpe: tr069Models.huaweiWS7001Model};
  } else if (modelName === 'WS7000-42') {
    // Huawei AX2S
    return {success: true, cpe: tr069Models.huaweiWS7000Model};
  } else if (modelName === 'WS7100-30') {
    // Huawei AX3
    return {success: true, cpe: tr069Models.huaweiWS7100Model};
  } else if (modelName === 'ST-1001-FL') {
    // Hurakall ST-1001-FL
    return {success: true, cpe: tr069Models.hurakallST1001FLModel};
  } else if (modelName === 'ACtion RG1200') {
    // Intelbras RG-1200
    return {success: true, cpe: tr069Models.intelbrasRG1200Model};
  } else if (modelName === '121AC') {
    // Intelbras WiFiber 121AC
    return {success: true, cpe: tr069Models.intelbrasWiFiberModel};
  } else if (modelName === '1200R') {
    // Intelbras WiFiber 1200R InMesh
    return {success: true, cpe: tr069Models.intelbrasWiFiber1200RModel};
  } else if (modelName === 'F660') {
    // Multilaser ZTE F660
    return {success: true, cpe: tr069Models.multilaserF660Model};
  } else if (modelName === 'F670L' && hwVersion.includes('V9')) {
    // Multilaser ZTE F670L V9.0
    return {success: true, cpe: tr069Models.multilaserF670LV9Model};
  } else if (modelName === 'F670L') {
    // Multilaser ZTE F670L
    return {success: true, cpe: tr069Models.multilaserF670LModel};
  } else if (modelName === 'F680') {
    // Multilaser ZTE F680
    return {success: true, cpe: tr069Models.multilaserF680Model};
  } else if (modelName === 'ZXHN H198A V3.0') {
    // Multilaser ZTE H198
    return {success: true, cpe: tr069Models.multilaserH198Model};
  } else if (modelName === 'ZXHN H199A') {
    // Multilaser ZTE H199
    return {success: true, cpe: tr069Models.multilaserH199Model};
  } else if (modelName === 'BEACON 1 HA-020W-B') {
    // Nokia Beacon ONE
    return {success: true, cpe: tr069Models.nokiaBeaconOneModel};
  } else if (['G-140W-C', 'G-140W-CS', 'G-140W-UD'].includes(modelName)) {
    // Nokia G-140W-C and family
    return {success: true, cpe: tr069Models.nokiaG140WCModel};
  } else if (modelName === 'G-140W-H') {
    // Nokia G-140W-H
    return {success: true, cpe: tr069Models.nokiaG140WHModel};
  } else if (modelName === 'G-1425G-A') {
    // Nokia G-1425G-A
    return {success: true, cpe: tr069Models.nokiaG1425GAModel};
  } else if (modelName === 'G-2425G-A') {
    // Nokia G-2425
    return {success: true, cpe: tr069Models.nokiaG2425Model};
  } else if (modelName === 'P20') {
    // Phyhome P20
    return {success: true, cpe: tr069Models.phyhomeP20Model};
  } else if (modelName === 'HT803G-WS2' && hwVersion == 'N.00') {
    // Raisecom HT803G-WS2 REV N
    return {success: true, cpe: tr069Models.raisecomRevNModel};
  } else if (modelName === 'HT803G-WS2') {
    // Raisecom HT803G-WS2 REV T
    return {success: true, cpe: tr069Models.raisecomRevTModel};
  } else if (modelSerial === 'AC10') {
    // Tenda AC10
    return {success: true, cpe: tr069Models.tendaAC10Model};
  } else if (modelName === 'HG9') {
    // Tenda HG9
    return {success: true, cpe: tr069Models.tendaHG9Model};
  } else if (modelName === 'TK-ONU-AC-D') {
    // Think TK-ONU-AC-D
    return {success: true, cpe: tr069Models.thinkTkOnuAcDModel};
  } else if (modelSerial === 'IGD' && modelName === 'Archer C5') {
    // TP-Link Archer C5
    return {success: true, cpe: tr069Models.tplinkArcherC5};
  } else if (modelName === 'Archer C6') {
    // TP-Link Archer C6
    return {success: true, cpe: tr069Models.tplinkArcherC6};
  } else if (modelName === 'EC220-G5') {
    // TP-Link EC220-G5
    return {success: true, cpe: tr069Models.tplinkEC220G5Model};
  } else if (modelName === 'HC220-G5') {
    // TP-Link HC220-G5
    return {success: true, cpe: tr069Models.tplinkHC220G5Model};
  } else if (['MP-G421R', 'MP-G421RQ'].includes(modelName)) {
    // UNEE Stavix
    return {success: true, cpe: tr069Models.uneeStavixModel};
  } else if (modelName === 'ZT199') {
    // ZTE ZT199
    return {success: true, cpe: tr069Models.zteZT199Model};
  } else if (modelName === 'EMG3524-T10A') {
    // Zyxel EMG1702
    return {success: true, cpe: tr069Models.zyxelEMG3524Model};
  }
  return {success: false, cpe: basicCPEModel};
};

const getModelFields = function(
  oui, model, modelName, firmwareVersion, hardwareVersion,
) {
  let cpeResult = instantiateCPEByModel(
    model, modelName, firmwareVersion, hardwareVersion,
  );
  return {
    success: cpeResult.success,
    message: (cpeResult.success) ? '' : 'Unknown Model',
    fields: cpeResult.cpe.getModelFields(),
    useLastIndexOnWildcard:
      cpeResult.cpe.modelPermissions().useLastIndexOnWildcard,
  };
};

const getDeviceFields = async function(args, callback) {
  let params = JSON.parse(args[0]);
  if (!params || !params.oui || !params.model) {
    return callback(null, {
      success: false,
      message: 'Incomplete arguments',
    });
  }
  let flashRes = await sendFlashmanRequest('device/inform', params);
  if (!flashRes['success'] ||
      Object.prototype.hasOwnProperty.call(flashRes, 'measure')) {
    return callback(null, flashRes);
  }
  let fieldsResult = getModelFields(
    params.oui, params.model, params.modelName,
    params.firmwareVersion, params.hardwareVersion,
  );
  if (!fieldsResult['success']) {
    return callback(null, fieldsResult);
  }
  return callback(null, {
    success: true,
    fields: fieldsResult.fields,
    measure: flashRes.data.measure,
    useLastIndexOnWildcard: fieldsResult.useLastIndexOnWildcard,
  });
};

const computeFlashmanUrl = function(shareLoad=true) {
  let url = API_URL;
  let numInstances = INSTANCES_COUNT;
  // Only used at scenarios where Flashman was installed directly on a host
  // without docker and with more than 1 vCPU
  if (shareLoad && numInstances > 1) {
    // More than 1 instance - share load between instances 1 and N-1
    // We ignore instance 0 for the same reason we ignore it for router syn
    // Instance 0 will be at port FLASHMAN_PORT, instance i will be at
    // FLASHMAN_PORT+i
    let target = Math.floor(Math.random()*(numInstances-1)) + FLASHMAN_PORT + 1;
    url = url.replace('$PORT', target.toString());
  } else {
    // Only 1 instance - force on instance 0
    url = url.replace('$PORT', FLASHMAN_PORT.toString());
  }
  return url;
};

const sendFlashmanRequest = function(route, params, shareLoad=true) {
  return new Promise((resolve, reject)=>{
    let url = computeFlashmanUrl(shareLoad);
    request({
      url: url + route,
      method: 'POST',
      json: params,
    },
    function(error, response, body) {
      if (error) {
        return resolve({
          success: false,
          message: 'Error contacting Flashman',
        });
      }
      if (response.statusCode === 200) {
        if (body.success) {
          return resolve({success: true, data: body});
        } else if (body.message) {
          return resolve({
            success: false,
            message: body.message,
          });
        } else {
          return resolve({
            success: false,
            message: (body.message) ? body.message : 'Flashman internal error',
          });
        }
      } else {
        return resolve({
          success: false,
          message: (body.message) ? body.message : 'Error in Flashman request',
        });
      }
    });
  });
};

const syncDeviceData = async function(args, callback) {
  let params = JSON.parse(args[0]);
  if (!params || !params.data || !params.acs_id) {
    return callback(null, {
      success: false,
      message: 'Incomplete arguments',
    });
  }
  let result = await sendFlashmanRequest('device/syn', params);
  callback(null, result);
};

const syncDeviceDiagnostics = async function(args, callback) {
  let params = JSON.parse(args[0]);
  if (!params || !params.acs_id) {
    return callback(null, {
      success: false,
      message: 'Incomplete arguments',
    });
  }
  let result = await sendFlashmanRequest('receive/diagnostic', params, false);
  callback(null, result);
};

exports.instantiateCPEByModelFromDevice = instantiateCPEByModelFromDevice;
exports.instantiateCPEByModel = instantiateCPEByModel;
exports.getDeviceFields = getDeviceFields;
exports.syncDeviceData = syncDeviceData;
exports.syncDeviceDiagnostics = syncDeviceDiagnostics;
exports.getTR069UpgradeableModels = getTR069UpgradeableModels;
exports.getTR069CustomFactoryModels = getTR069CustomFactoryModels;
