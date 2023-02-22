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
  cianetGW24ACModel: require('./cpe-models/cianet-gw24ac'),
  cianetHW01NModel: require('./cpe-models/cianet-hw01n'),
  datacomDM985Model: require('./cpe-models/datacom-dm985-424'),
  datacomDM986204Model: require('./cpe-models/datacom-dm986-204'),
  datacomDM986414Model: require('./cpe-models/datacom-dm986-414'),
  dlinkDir615Model: require('./cpe-models/dlink-dir-615'),
  dlinkDir841Model: require('./cpe-models/dlink-dir-841'),
  dlinkDir842Model: require('./cpe-models/dlink-dir-842'),
  e4lH5410WAModel: require('./cpe-models/e4l-h5410wa'),
  fastwirelessFW323DACModel: require('./cpe-models/fastwireless-fw323dac'),
  fiberhomeHG6143DModel: require('./cpe-models/fiberhome-hg6143d'),
  fiberhomeHG6145FModel: require('./cpe-models/fiberhome-hg6145f'),
  fiberhomeHG6245DModel: require('./cpe-models/fiberhome-hg6245d'),
  greatekGwr300Model: require('./cpe-models/greatek-gwr300'),
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
  intelbrasW51200GModel: require('./cpe-models/intelbras-w5-1200g'),
  intelbrasRG1200Model: require('./cpe-models/intelbras-rg1200'),
  intelbrasWiFiberModel120AC: require('./cpe-models/intelbras-wifiber-120ac'),
  intelbrasWiFiberModel121AC: require('./cpe-models/intelbras-wifiber-121ac'),
  intelbrasWiFiber1200RModel: require('./cpe-models/intelbras-wifiber-1200r'),
  mercusysMR30GModel: require('./cpe-models/mercusys-mr30g'),
  multilaserF660Model: require('./cpe-models/multilaser-f660'),
  multilaserF6600Model: require('./cpe-models/multilaser-f6600'),
  multilaserF670LModel: require('./cpe-models/multilaser-f670l'),
  multilaserF670LV9Model: require('./cpe-models/multilaser-f670l-v9'),
  multilaserF680Model: require('./cpe-models/multilaser-f680'),
  multilaserH198Model: require('./cpe-models/multilaser-h198'),
  multilaserH199Model: require('./cpe-models/multilaser-h199'),
  nextFiberNXT425Model: require('./cpe-models/next-fiber-nxt-425ac'),
  nokiaBeaconOneModel: require('./cpe-models/nokia-beacon'),
  nokiaG140WCModel: require('./cpe-models/nokia-g140w'),
  nokiaG140WHModel: require('./cpe-models/nokia-g140wh'),
  nokiaG1425GAModel: require('./cpe-models/nokia-g1425ga'),
  nokiaG1426MAModel: require('./cpe-models/nokia-g1426ma'),
  nokiaG2425Model: require('./cpe-models/nokia-g2425'),
  phyhomeP20Model: require('./cpe-models/phyhome-p20'),
  raisecomRevNModel: require('./cpe-models/raisecom-ht803g-rev-n'),
  raisecomRevTModel: require('./cpe-models/raisecom-ht803g-rev-t'),
  shorelineSH1020WModel: require('./cpe-models/shoreline-sh1020w'),
  tendaAC10Model: require('./cpe-models/tenda-ac10'),
  tendaHG9Model: require('./cpe-models/tenda-hg9'),
  thinkTkOnuAcDModel: require('./cpe-models/tk-onu-ac-d'),
  tplinkArcherC6: require('./cpe-models/tplink-archer-c6'),
  tplinkArcherC5: require('./cpe-models/tplink-archer-c5'),
  tplinkEC220G5Model: require('./cpe-models/tplink-ec220g5'),
  tplinkEC225G5Model: require('./cpe-models/tplink-ec225g5'),
  tplinkEX220Model: require('./cpe-models/tplink-ex220'),
  tplinkEX510Model: require('./cpe-models/tplink-ex510'),
  tplinkHC220G5Model: require('./cpe-models/tplink-hc220g5'),
  tplinkHX220Model: require('./cpe-models/tplink-hx220'),
  tplinkWR840NModel: require('./cpe-models/tplink-wr840n'),
  tplinkXC220G3vModel: require('./cpe-models/tplink-xc220g3v'),
  uneeMPG421R: require('./cpe-models/unee_mp-g421r'),
  uneeMPX421RQF: require('./cpe-models/unee_mp-x421rq-f'),
  zteZT199Model: require('./cpe-models/zte-zt199'),
  zteH196Model: require('./cpe-models/zte-h196'),
  zteF673Model: require('./cpe-models/zte-f673'),
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
  let result = {success: false, cpe: basicCPEModel};
  // Giant if-chain looking for model - sorted alphabetically by comments
  if (modelName === 'ONU GW24AC') {
    // Cianet GW24AC
    result = {success: true, cpe: tr069Models.cianetGW24ACModel};
  } else if (modelName === 'ONU HW01N') {
    // Cianet HW01N
    result = {success: true, cpe: tr069Models.cianetHW01NModel};
  } else if (['DM985-424', 'DM985%2D424'].includes(modelSerial)) {
    // Datacom DM985-424
    result = {success: true, cpe: tr069Models.datacomDM985Model};
  } else if (modelName === 'DM986-204') {
    // Datacom DM986-204
    result = {success: true, cpe: tr069Models.datacomDM986204Model};
  } else if (modelName === 'DM986-414') {
    // Datacom DM986-414
    result = {success: true, cpe: tr069Models.datacomDM986414Model};
  } else if (modelName === 'DIR-615') {
    // D-Link DIR-615
    result = {success: true, cpe: tr069Models.dlinkDir615Model};
  } else if (modelName === 'DIR-841') {
    // D-Link DIR-841
    result = {success: true, cpe: tr069Models.dlinkDir841Model};
  } else if (modelName === 'DIR-842') {
    // D-Link DIR-842
    result = {success: true, cpe: tr069Models.dlinkDir842Model};
  } else if (modelName === 'E4L-H5410WA') {
    // EASY4link H5410WA
    result = {success: true, cpe: tr069Models.e4lH5410WAModel};
  } else if (
    (modelSerial === 'IGD' && modelName === 'IGD') || modelName === 'FW323DAC'
  ) {
    // FastWireless FW323DAC
    result = {success: true, cpe: tr069Models.fastwirelessFW323DACModel};
  } else if (modelName === 'HG6143D') {
    // Fiberhome HG6143D
    result = {success: true, cpe: tr069Models.fiberhomeHG6143DModel};
  } else if (modelName === 'HG6145F') {
    // Fiberhome HG6145F
    result = {success: true, cpe: tr069Models.fiberhomeHG6145FModel};
  } else if (modelName === 'HG6245D') {
    // Fiberhome HG6245D
    result = {success: true, cpe: tr069Models.fiberhomeHG6245DModel};
  } else if (modelSerial === 'IGD' && modelName === 'ModelName') {
    // Greatek GWR300
    result = {success: true, cpe: tr069Models.greatekGwr300Model};
  } else if (modelName === 'GWR-1200AC') {
    // Greatek GWR1200
    result = {success: true, cpe: tr069Models.greatekGwr1200Model};
  } else if (['GONUAC001', 'GONUAC002'].includes(modelName)) {
    // Greatek Stavix
    result = {success: true, cpe: tr069Models.greatekStavixModel};
  } else if (['EG8145V5', 'EG8145V5-V2'].includes(modelName)) {
    // Huawei EG8145V5
    result = {success: true, cpe: tr069Models.huaweiEG8145V5Model};
  } else if (modelName === 'EG8145X6') {
    // Huawei EG8145X6
    result = {success: true, cpe: tr069Models.huaweiEG8145X6Model};
  } else if (modelName === 'HG8121H') {
    // Huawei HG8121H
    result = {success: true, cpe: tr069Models.huaweiHG8121HModel};
  } else if (modelName === 'HG8245Q2') {
    // Huawei HG8245Q2
    result = {success: true, cpe: tr069Models.huaweiHG8245Q2Model};
  } else if (modelName === 'HS8546V5') {
    // Huawei HS8546V5
    result = {success: true, cpe: tr069Models.huaweiHS8546V5Model};
  } else if (['WS5200-21', 'WS5200-40'].includes(modelName)) {
    // Huawei WS5200 v2 / v3
    result = {success: true, cpe: tr069Models.huaweiWS5200Model};
  } else if (modelName === 'WS7001-40') {
    // Huawei AX2
    result = {success: true, cpe: tr069Models.huaweiWS7001Model};
  } else if (modelName === 'WS7000-42') {
    // Huawei AX2S
    result = {success: true, cpe: tr069Models.huaweiWS7000Model};
  } else if (modelName === 'WS7100-30') {
    // Huawei AX3
    result = {success: true, cpe: tr069Models.huaweiWS7100Model};
  } else if (modelName === 'ST-1001-FL') {
    // Hurakall ST-1001-FL
    result = {success: true, cpe: tr069Models.hurakallST1001FLModel};
  } else if (modelName === 'ACtion RG1200' || modelName === 'Intelbras') {
    // Intelbras RG-1200
    result = {success: true, cpe: tr069Models.intelbrasRG1200Model};
  } else if (['W5-1200G', 'W5%2D1200G'].includes(modelSerial)) {
    // Intelbras W5-1200G
    result = {success: true, cpe: tr069Models.intelbrasW51200GModel};
  } else if (modelName === '120AC') {
    // Intelbras WiFiber 120AC
    result = {success: true, cpe: tr069Models.intelbrasWiFiberModel120AC};
  } else if (modelName === '121AC') {
    // Intelbras WiFiber 121AC
    result = {success: true, cpe: tr069Models.intelbrasWiFiberModel121AC};
  } else if (modelName === '1200R') {
    // Intelbras WiFiber 1200R InMesh
    result = {success: true, cpe: tr069Models.intelbrasWiFiber1200RModel};
  } else if (modelName === 'MR30G') {
    // Mercusys MR30G
    result = {success: true, cpe: tr069Models.mercusysMR30GModel};
  } else if (modelName === 'F660') {
    // Multilaser ZTE F660
    result = {success: true, cpe: tr069Models.multilaserF660Model};
  } else if (modelName === 'F6600') {
    // Multilaser ZTE F6600
    result = {success: true, cpe: tr069Models.multilaserF6600Model};
  } else if (modelName === 'F670L' && hwVersion.includes('V9')) {
    // Multilaser ZTE F670L V9.0
    result = {success: true, cpe: tr069Models.multilaserF670LV9Model};
  } else if (modelName === 'F670L') {
    // Multilaser ZTE F670L
    result = {success: true, cpe: tr069Models.multilaserF670LModel};
  } else if (modelName === 'F680') {
    // Multilaser ZTE F680
    result = {success: true, cpe: tr069Models.multilaserF680Model};
  } else if (modelName === 'ZXHN H198A V3.0') {
    // Multilaser ZTE H198
    result = {success: true, cpe: tr069Models.multilaserH198Model};
  } else if (modelName === 'ZXHN H199A') {
    // Multilaser ZTE H199
    result = {success: true, cpe: tr069Models.multilaserH199Model};
  } else if (modelName === 'NXT-425AC') {
    // Next Fiber NXT-425
    result = {success: true, cpe: tr069Models.nextFiberNXT425Model};
  } else if (modelName === 'BEACON 1 HA-020W-B') {
    // Nokia Beacon ONE
    result = {success: true, cpe: tr069Models.nokiaBeaconOneModel};
  } else if (
    ['G-140W-C', 'G-140W-CS', 'G-140W-UD', 'G6-WIFI-001'].includes(modelName)
  ) {
    // Nokia G-140W-C and family
    result = {success: true, cpe: tr069Models.nokiaG140WCModel};
  } else if (modelName === 'G-140W-H') {
    // Nokia G-140W-H
    result = {success: true, cpe: tr069Models.nokiaG140WHModel};
  } else if (modelName === 'G-1425G-A') {
    // Nokia G-1425G-A
    result = {success: true, cpe: tr069Models.nokiaG1425GAModel};
  } else if (modelName === 'G-1426-MA') {
    // Nokia G-1426-MA
    result = {success: true, cpe: tr069Models.nokiaG1426MAModel};
  } else if (modelName === 'G-2425G-A') {
    // Nokia G-2425
    result = {success: true, cpe: tr069Models.nokiaG2425Model};
  } else if (modelName === 'P20') {
    // Phyhome P20
    result = {success: true, cpe: tr069Models.phyhomeP20Model};
  } else if (modelName === 'HT803G-WS2' && hwVersion == 'N.00') {
    // Raisecom HT803G-WS2 REV N
    result = {success: true, cpe: tr069Models.raisecomRevNModel};
  } else if (modelName === 'HT803G-WS2') {
    // Raisecom HT803G-WS2 REV T
    result = {success: true, cpe: tr069Models.raisecomRevTModel};
  } else if (modelName === 'SH1020W') {
    // Shoreline SH1020W
    result = {success: true, cpe: tr069Models.shorelineSH1020WModel};
  } else if (modelSerial === 'AC10') {
    // Tenda AC10
    result = {success: true, cpe: tr069Models.tendaAC10Model};
  } else if (modelName === 'HG9') {
    // Tenda HG9
    result = {success: true, cpe: tr069Models.tendaHG9Model};
  } else if (modelName === 'TK-ONU-AC-D') {
    // Think TK-ONU-AC-D
    result = {success: true, cpe: tr069Models.thinkTkOnuAcDModel};
  } else if (modelSerial === 'IGD' && modelName === 'Archer C5') {
    // TP-Link Archer C5
    result = {success: true, cpe: tr069Models.tplinkArcherC5};
  } else if (modelName === 'Archer C6') {
    // TP-Link Archer C6
    result = {success: true, cpe: tr069Models.tplinkArcherC6};
  } else if (modelName === 'EC220-G5') {
    // TP-Link EC220-G5
    result = {success: true, cpe: tr069Models.tplinkEC220G5Model};
  } else if (modelName === 'EC225-G5') {
    // TP-Link EC225-G5
    result = {success: true, cpe: tr069Models.tplinkEC225G5Model};
  } else if (modelName === 'EX220') {
    // TP-Link EX220
    result = {success: true, cpe: tr069Models.tplinkEX220Model};
  } else if (modelName === 'EX510') {
    // TP-Link EX510
    result = {success: true, cpe: tr069Models.tplinkEX510Model};
  } else if (modelName === 'HC220-G5') {
    // TP-Link HC220-G5
    result = {success: true, cpe: tr069Models.tplinkHC220G5Model};
  } else if (modelName === 'HX220') {
    // TP-Link HX220
    result = {success: true, cpe: tr069Models.tplinkHX220Model};
  } else if (modelSerial === 'IGD' && modelName === 'TL-WR840N') {
    // TP-Link WR840N V6
    result = {success: true, cpe: tr069Models.tplinkWR840NModel};
  } else if (modelName === 'XC220-G3v') {
    // TP-Link XC220-G3v
    result = {success: true, cpe: tr069Models.tplinkXC220G3vModel};
  } else if (['MP-G421R', 'MP-G421RQ'].includes(modelName)) {
    // UNEE Stavix
    result = {success: true, cpe: tr069Models.uneeMPG421R};
  } else if (modelName === 'MP-X421RQ-F') {
    // New UNEE Stavix
    result = {success: true, cpe: tr069Models.uneeMPX421RQF};
  } else if (modelName === 'H196A V9') {
    // ZTE H196A
    result = {success: true, cpe: tr069Models.zteH196Model};
  } else if (modelName === 'ZT199') {
    // ZTE ZT199
    result = {success: true, cpe: tr069Models.zteZT199Model};
  } else if (modelName === 'F673AV9') {
    // ZTE F673AV9
    result = {success: true, cpe: tr069Models.zteF673Model};
  } else if (modelName === 'EMG3524-T10A') {
    // Zyxel EMG1702
    result = {success: true, cpe: tr069Models.zyxelEMG3524Model};
  }
  if (result.success) {
    // Apply fware / hware version differences for extra permissions / fields
    let cpe = result.cpe;
    result.cpe = cpe.applyVersionDifferences(cpe, fwVersion, hwVersion);
  }
  return result;
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
    measure_type: flashRes.data.measure_type,
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
