/*
The scripts in this directory are loaded by genieacs along with the provision
script. Configure genieacs' cwmp server parameter EXT_DIR to the following:
"path/to/flashman/controllers/external-genieacs"
*/
/**
 * This file includes functions to handle the interact with GenieACS and
 * Flashman. Be aware that those functions might be accessible for Flashman
 * in a Docker environment.
 * @namespace controllers/external-genieacs/devices-api
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
  datacomDM955Model: require('./cpe-models/datacom-dm955-5GT'),
  dlinkDir615Model: require('./cpe-models/dlink-dir-615'),
  dlinkDir841Model: require('./cpe-models/dlink-dir-841'),
  dlinkDir842Model: require('./cpe-models/dlink-dir-842'),
  e4lH5410WAModel: require('./cpe-models/e4l-h5410wa'),
  fastwirelessFW323DACModel: require('./cpe-models/fastwireless-fw323dac'),
  fiberhomeHG6143DModel: require('./cpe-models/fiberhome-hg6143d'),
  fiberhomeHG6145FModel: require('./cpe-models/fiberhome-hg6145f'),
  fiberhomeHG6245DModel: require('./cpe-models/fiberhome-hg6245d'),
  fiberhomesr120aModel: require('./cpe-models/fiberhome-sr120-a'),
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
  intelbrasGX3000Model: require('./cpe-models/intelbras-gx3000'),
  intelbrasIH3000Model: require('./cpe-models/intelbras-ih3000'),
  intelbrasW52100GModel: require('./cpe-models/intelbras-w5-2100g'),
  intelbrasW51200GModel: require('./cpe-models/intelbras-w5-1200g'),
  intelbrasW4300FModel: require('./cpe-models/intelbras-w4-300f'),
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
  multilaserRE708Model: require('./cpe-models/multilaser-re708'),
  nextFiberNXT425Model: require('./cpe-models/next-fiber-nxt-425ac'),
  nokiaBeaconOneModel: require('./cpe-models/nokia-beacon'),
  nokiaG120WFModel: require('./cpe-models/nokia-g120w-f'),
  nokiaG140WCModel: require('./cpe-models/nokia-g140w'),
  nokiaG140WHModel: require('./cpe-models/nokia-g140wh'),
  nokiaG1425GAModel: require('./cpe-models/nokia-g1425ga'),
  nokiaG1425GBModel: require('./cpe-models/nokia-g1425gb'),
  nokiaG1426MAModel: require('./cpe-models/nokia-g1426ma'),
  nokiaG2425Model: require('./cpe-models/nokia-g2425'),
  parksFiberlink501: require('./cpe-models/parks-fiberlink-501'),
  phyhomeP20Model: require('./cpe-models/phyhome-p20'),
  raisecomRevNModel: require('./cpe-models/raisecom-ht803g-rev-n'),
  raisecomRevTModel: require('./cpe-models/raisecom-ht803g-rev-t'),
  shorelineSH1020WModel: require('./cpe-models/shoreline-sh1020w'),
  tendaAC10Model: require('./cpe-models/tenda-ac10'),
  tendaHG9Model: require('./cpe-models/tenda-hg9'),
  thinkTkOnuAcDModel: require('./cpe-models/tk-onu-ac-d'),
  tplinkArcherC6: require('./cpe-models/tplink-archer-c6'),
  tplinkArcherC5: require('./cpe-models/tplink-archer-c5'),
  tplinkEC220G5V2Model: require('./cpe-models/tplink-ec220g5-v2'),
  tplinkEC220G5V2dot2Model: require('./cpe-models/tplink-ec220g5-v2.2'),
  tplinkEC220G5V3Model: require('./cpe-models/tplink-ec220g5-v3'),
  tplinkEC225G5Model: require('./cpe-models/tplink-ec225g5'),
  tplinkEX220Model: require('./cpe-models/tplink-ex220'),
  tplinkEX510Model: require('./cpe-models/tplink-ex510'),
  tplinkHC220G5Model: require('./cpe-models/tplink-hc220g5'),
  tplinkHX220Model: require('./cpe-models/tplink-hx220'),
  tplinkWR840NModel: require('./cpe-models/tplink-wr840n'),
  tplinkXC220G3vModel: require('./cpe-models/tplink-xc220g3v'),
  tplinkXX230vModel: require('./cpe-models/tplink-xx230v'),
  uneeMPG421R: require('./cpe-models/unee_mp-g421r'),
  uneeMPX421RQF: require('./cpe-models/unee_mp-x421rq-f'),
  zteZT199Model: require('./cpe-models/zte-zt199'),
  zteH196Model: require('./cpe-models/zte-h196'),
  zteF660Model: require('./cpe-models/zte-f660'),
  zteF673Model: require('./cpe-models/zte-f673'),
  zyxelEMG3524Model: require('./cpe-models/zyxel-emg3524'),
};

const getTR069CustomFactoryModels = function() {
  let ret = new Map();
  Object.values(tr069Models).forEach((cpe) => {
    if (ret[cpe.identifier.vendor]) {
      ret[cpe.identifier.vendor].push(cpe.identifier.model);
    } else {
      ret[cpe.identifier.vendor] = Array.from([cpe.identifier.model]);
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

    Object.keys(permissions.firmwareUpgrades).forEach((firmware) => {
      // Vendor exists, adding a new model and new firmware
      if (
        ret.vendors[vendor] &&
        !ret.vendors[vendor].includes(model) &&
        !ret.versions[fullID]
      ) {
        ret.vendors[vendor].push(model);
        ret.versions[fullID] = [firmware];

      // Vendor exists, model exists, adding a new firmware
      } else if (
        ret.vendors[vendor] &&
        ret.vendors[vendor].includes(model) &&
        ret.versions[fullID] &&
        !ret.versions[fullID].includes(firmware)
      ) {
        ret.versions[fullID].push(firmware);

      // Vendor does not exists, add both
      } else if (!ret.vendors[vendor] && !ret.versions[fullID]) {
        ret.vendors[vendor] = Array.from([model]);
        ret.versions[fullID] = [firmware];
      }
    });
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
  } else if (modelName === 'DM955') {
    // Datacom DM955-5GT
    result = {success: true, cpe: tr069Models.datacomDM955Model};
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
  } else if (modelName === 'SR120-A') {
    // Fiberhome SR120-A
    result = {success: true, cpe: tr069Models.fiberhomesr120aModel};
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
  } else if (modelName === 'GX3000') {
    // Intelbras GX3000
    result = {success: true, cpe: tr069Models.intelbrasGX3000Model};
  } else if (modelName === 'IH3000') {
    // Intelbras IH3000
    result = {success: true, cpe: tr069Models.intelbrasIH3000Model};
  } else if (modelName === 'ACtion RG1200' || modelName === 'Intelbras') {
    // Intelbras RG-1200
    result = {success: true, cpe: tr069Models.intelbrasRG1200Model};
  } else if (['W5-2100G', 'W5%2D2100G'].includes(modelSerial)) {
    // Intelbras W5-2100G
    result = {success: true, cpe: tr069Models.intelbrasW52100GModel};
  } else if (['W5-1200G', 'W5%2D1200G'].includes(modelSerial)) {
    // Intelbras W5-1200G
    result = {success: true, cpe: tr069Models.intelbrasW51200GModel};
  } else if (['W4-300F', 'W4%2D300F'].includes(modelSerial)) {
    // Intelbras W4-300F
    result = {success: true, cpe: tr069Models.intelbrasW4300FModel};
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
  } else if (modelName === 'F660' && hwVersion.includes('V8.0')) {
    // ZTE F660
    result = {success: true, cpe: tr069Models.zteF660Model};
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
  } else if (modelName === 'RE1200R4GC-2T2R-V3') {
    // Multilaser ZTE RE708
    result = {success: true, cpe: tr069Models.multilaserRE708Model};
  } else if (modelName === 'NXT-425AC') {
    // Next Fiber NXT-425
    result = {success: true, cpe: tr069Models.nextFiberNXT425Model};
  } else if (modelName === 'BEACON 1 HA-020W-B') {
    // Nokia Beacon ONE
    result = {success: true, cpe: tr069Models.nokiaBeaconOneModel};
  } else if (modelName === 'G-120W-F') {
    // Nokia G-120W-F
    result = {success: true, cpe: tr069Models.nokiaG120WFModel};
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
  } else if (modelName === 'G-1425G-B') {
    // Nokia G-1425G-A
    result = {success: true, cpe: tr069Models.nokiaG1425GBModel};
  } else if (modelName === 'G-1426-MA') {
    // Nokia G-1426-MA
    result = {success: true, cpe: tr069Models.nokiaG1426MAModel};
  } else if (modelName === 'G-2425G-A') {
    // Nokia G-2425
    result = {success: true, cpe: tr069Models.nokiaG2425Model};
  } else if (modelName === 'Fiberlink501') {
    // Parks Fiberlink 501
    result = {success: true, cpe: tr069Models.parksFiberlink501};
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
  } else if (modelName === 'EC220-G5' && hwVersion.includes('v2.2')) {
    // TP-Link EC220-G5 v2.2
    result = {success: true, cpe: tr069Models.tplinkEC220G5V2dot2Model};
  } else if (modelName === 'EC220-G5' && hwVersion.includes('v2')) {
    // TP-Link EC220-G5 v2
    result = {success: true, cpe: tr069Models.tplinkEC220G5V2Model};
  } else if (modelName === 'EC220-G5' && hwVersion.includes('3.0')) {
    // TP-Link EC220-G5 v3
    result = {success: true, cpe: tr069Models.tplinkEC220G5V3Model};
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
  } else if (modelName === 'XX230v') {
    // TP-Link XX230V
    result = {success: true, cpe: tr069Models.tplinkXX230vModel};
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
  let params = null;

  // If callback not defined, define a simple one
  if (!callback) {
    callback = (arg1, arg2) => {
      return arg2;
    };
  }

  try {
    params = JSON.parse(args[0]);
  } catch (error) {
    return callback(null, {
      success: false,
      message: 'Incomplete arguments',
    });
  }

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
    connection: flashRes.data.connection,
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

const convertIndexIntoWildcard = function(path) {
  return path.split('.').map((part, i) => {
    if (isNaN(parseInt(part))) {
      return part;
    } else {
      return '*';
    }
  }).join('.');
};

const getFieldProperties = function(fields, path) {
  let properties = [];
  let pattern = convertIndexIntoWildcard(path);
  for (let key of Object.keys(fields)) {
    let prop = convertIndexIntoWildcard(fields[key]);
    if (pattern === prop) {
      properties.push(key);
    }
  }
  if (path.includes('PortMapping') && properties.length === 0) {
    properties.push('port_mapping');
  }
  return properties;
};

const extractIndexes = function(path, isTR181) {
  // For TR-181 devices, only the first numeric key is used as a reference.
  // For TR-098 devices, a maximum of the first three numeric keys are used as
  // references. The surplus will be used to tag repeat properties later
  const endIndex = isTR181 ? 1 : 3;
  const keys = path.split('.').filter((key) => !isNaN(parseInt(key)))
                .map((key) => parseInt(key, 10));
  const indexes = keys.slice(0, endIndex);
  const surplus = keys.slice(endIndex);
  return [indexes, surplus];
};

const verifyIndexesMatch = function(keyIndexes, indexes) {
  if (keyIndexes.length > indexes.length) {
    keyIndexes = keyIndexes.slice(0, (indexes.length));
  } else if (keyIndexes.length < indexes.length) {
    return false;
  }
  return keyIndexes.every((k, i) => parseInt(k) === indexes[i]);
};

const extractLinkPath = function(path, addLowerLayer = false) {
  const parts = path.split('.');
  let linkPath = '';
  for (let i = 0; i < parts.length; i++) {
    const curr = parts[i];
    // If is a number, add and break the loop, so only the first index is added
    if (!isNaN(parseInt(curr))) {
      linkPath += curr + ((addLowerLayer) ? '.LowerLayers' : '.');
      break;
    }
    linkPath += curr + '.';
  }
  return linkPath;
};

const getObjValue = function(obj) {
  return Array.isArray(obj.value) ? obj.value[0] : obj.value;
};

const findInterfaceLink = function(data, path, i) {
  // Device.IP.Interface.*.LowerLayers -> Device.PPP.Interface.*.
  let connectionPath = path.replace('*', i);
  let interfPPP = 'Device.PPP.Interface.';
  let interfIP = 'Device.IP.Interface.';
  for (let j = 0; j < data.length; j++) {
    let value = getObjValue(data[j]);
    if (connectionPath === data[j].path && (value.includes(interfPPP)
        || value.includes(interfIP))) {
      return value;
    }
  }
  return null;
};

const findEthernetLink = function(data, path, i) {
  // Device.Ethernet.Interface.*. -> Device.Ethernet.Link.*.LowerLayers
  // Device.Ethernet.Link.*.LowerLayers ->
  //    Device.Ethernet.VLANTermination.*.LowerLayers
  // Device.Ethernet.VLANTermination.*. -> Device.PPP.Interface.*.LowerLayers
  let connectionPath = path.replace('*', i);
  let ethernetLink;
  let vlanLink;
  for (let j = 0; j < data.length; j++) {
    let value = getObjValue(data[j]);
    if (connectionPath === value) {
      ethernetLink = extractLinkPath(data[j].path);
    }
  }
  for (let j = 0; j < data.length; j++) {
    let value = getObjValue(data[j]);
    if (ethernetLink === value) {
      vlanLink = extractLinkPath(data[j].path);
    }
  }
  for (let j = 0; j < data.length; j++) {
    let value = getObjValue(data[j]);
    if (vlanLink === value) {
      return data[j].path;
    }
  }
  return null;
};

const findPortMappingLink = function(data, path) {
  // If the connection is IP:
  // Device.NAT.PortMapping.*.Interface -> Device.IP.Interface.*.
  // If the connection is PPP:
  // Device.NAT.PortMapping.*.Interface -> Device.IP.Interface.*.
  // Device.IP.Interface.*.LowerLayers -> Device.PPP.Interface.*.
  let ipLink = null;
  for (let j = 0; j < data.length; j++) {
    if (path === data[j].path) {
    let value = getObjValue(data[j]);
      ipLink = extractLinkPath(value);
      break;
    }
  }
  let pppLink = ipLink + 'LowerLayers';
  for (let j = 0; j < data.length; j++) {
    if (pppLink === data[j].path) {
      let value = getObjValue(data[j]);
      if (value.includes('PPP')) {
        return value;
      }
    }
  }
  return ipLink;
};

const wanKeySort = function(keys, isTR181) {
  const result = [];

  for (const [key, value] of Object.entries(keys)) {
    const [, , ...indexes] = key.split('_');
    result.push({key, value, indexes});
  }

  const sortKeys = (a, b) => {
    // Sort keys according to their type for TR-181 (dhcp first, ppp second)
    if (isTR181) {
      if (a.key.includes('dhcp') && b.key.includes('ppp')) {
        return -1;
      } else if (a.key.includes('ppp') && b.key.includes('dhcp')) {
        return 1;
      }
    }

    // Compare indexes based on hierarchy
    for (let i = 0; i < a.indexes.length; i++) {
      const diff = a.indexes[i] - b.indexes[i];
      if (diff !== 0) {
        return diff;
      }
    }

    // Elements have the same order and should remain in their current positions
    return 0;
  };

  result.sort(sortKeys);

  return Object.fromEntries(result.map(({key, value}) => [key, value]));
};

const wanKeyCriation = function(data, isTR181) {
  let result = {};
  for (let obj of data) {
    let pathType = obj.path.includes('PPP') ? 'ppp' :
                   obj.path.includes('IP') ? 'dhcp' : 'common';
    let indexes = [];
    if (isTR181) {
      // TR-181 devices, it is necessary to filter the interfaces, because not
      // all of them are WANs. To decide whether a path should generate a new
      // key, we evaluate the AddressingType node, which receives the conn type
      if (obj.path.includes('AddressingType')) {
        let correctPath;
        let value = getObjValue(obj);
        if (value === 'DHCP') {
          // If the connection is DHCP, the path index already represents a
          // physical connection
          correctPath = extractLinkPath(obj.path);
        } else if (value === 'IPCP') {
          let linkPath = extractLinkPath(obj.path, true);
          correctPath = findInterfaceLink(data, linkPath, indexes[0]);
        }
        if (correctPath) {
          // Update indexes and path type
          indexes = extractIndexes(correctPath, isTR181)[0];
          pathType = correctPath.includes('PPP') ? 'ppp' :
                     correctPath.includes('IP') ? 'dhcp' : 'common';
        }
      }
    } else {
      // For TR-098 devices, key creation is straightforward
      indexes = extractIndexes(obj.path, isTR181)[0];
    }
    // Once we have the correct indexes, a new key is created
    let key = 'wan_' + pathType + '_' + indexes.join('_');
    let indexesHasCorrectSize = ((indexes.length === 3 && !isTR181) ||
      (indexes.length === 1 && isTR181));
    let pathHasCorrectType = (pathType === 'ppp' || pathType === 'dhcp');
    if (indexes.length > 0 && !result[key] &&
        indexesHasCorrectSize && pathHasCorrectType) {
      result[key] = {};
      result[key]['port_mapping'] = [];
    }
  }
  return wanKeySort(result, isTR181);
};

const assembleWanObj = function(args, callback) {
  let params;
  if (args.update) {
    params = args;
  } else {
    params = JSON.parse(args[0]);
  }
  let data = params.data;
  let fields = params.fields.wan;
  let isTR181 = params.isTR181;
  let result = wanKeyCriation(data, isTR181);
  for (let obj of data) {
    let [indexes, surplus] = extractIndexes(obj.path, isTR181);
    // Addition of obj to WANs: depending on the property's match, since there
    // may be PPP-type properties associated with IP-type paths
    let properties = getFieldProperties(fields, obj.path);
    if (properties.length === 0) continue;

    // Looks for the correct WAN: This depends on the prop match type and the
    // path index
    for (let prop of properties) {
      let pathType = obj.path.includes('PPP') ? 'ppp' :
                     obj.path.includes('IP') ? 'dhcp' :
                     obj.path.includes('Ethernet') ? 'ethernet' : 'undefined';
      let propType = prop.includes('ppp') ? 'ppp' : 'dhcp';

      // The keys associated with port mapping must be treated differently
      // because, in the TR-098, they will be classified as dhcp or ppp
      let isPortMapping = (obj.path.includes('PortMapping') &&
                           properties.length === 1 &&
                           properties[0] === 'port_mapping');
      if (isPortMapping) pathType = 'port_mapping';

      let field = {};
      if (surplus.length > 0) prop += '_' + surplus.join('_');
      field[prop] = obj;

      for (let key of Object.keys(result)) {
        const keyType = key.split('_')[1];
        const keyIndexes = key.split('_').filter((key) => !isNaN(key));
        let typeMatch = (keyType === propType);
        if (!typeMatch && !isPortMapping) continue;
        // If the path does not have indexes, the same must be added on all WANs
        if (indexes.length === 0) {
          Object.assign(result[key], field);
          continue;
        }
        // The TR-181 works with a stack of links to connect the trees. Whenever
        // the type of the path is different from the type of the property, it
        // means that we must disregard the current indices and look for the
        // correct ones to insert the field
        if (propType !== pathType && isTR181) {
          let linkPath;
          let correctPath;
          if (pathType === 'dhcp') {
            linkPath = extractLinkPath(obj.path, true);
            correctPath = findInterfaceLink(data, linkPath, indexes[0]);
          } else if (pathType === 'ethernet') {
            linkPath = extractLinkPath(obj.path);
            correctPath = findEthernetLink(data, linkPath, indexes[0]);
          } else if (pathType === 'port_mapping') {
            linkPath = extractLinkPath(obj.path) + 'Interface';
            correctPath = findPortMappingLink(data, linkPath);
          }
          if (!correctPath) continue;
          // Update indexes with correct path
          indexes = extractIndexes(correctPath, isTR181)[0];
        }
        // If the flow reached this point, it means that we have a path with
        // indixes and these must be an exact match of the key
        if (verifyIndexesMatch(keyIndexes, indexes)) {
          if (isPortMapping) {
            result[key]['port_mapping'].push(obj);
          } else {
            Object.assign(result[key], field);
          }
        }
      }
    }
  }
  return callback(null, result);
};

const getParentNode = function(args, callback) {
  let params;
  let update = false;
  if (args.update) {
    params = args;
    update = true;
  } else {
    params = JSON.parse(args[0]);
  }
  let fields = params.fields;
  let isTR181 = params.isTR181;
  let nodes = [];
  const hasNumericKey = (str) => str.split('.').some((s) => !isNaN(s));
  const hasWildcardKey = (str) => str.includes('*');
  let wanFields = fields.wan;
  Object.keys(wanFields).forEach((key) => {
    let node;
    if (!hasNumericKey(wanFields[key]) && !hasWildcardKey(wanFields[key])) {
      // If the field does not have numeric keys or wildcards, it must not be
      // changed
      node = wanFields[key];
    } else {
      // Otherwise, the last substring is discarded and we add the string '.*.*'
      // to update the entire parent node of the given field
      let tmp = wanFields[key].split('.').slice(0, -1);
      if (tmp[tmp.length - 1] === '*') {
        // If the parent node already ends with the string '.*', just add '.*'
        node = tmp.join('.');
      } else if (!isNaN(parseInt(tmp[tmp.length - 1]))) {
        // If the parent node already ends with a numerical key, it is discarded
        // and '.*.*' is added
        node = tmp.slice(0, -1).join('.');
      } else {
        // If none of the previous cases is true, it is only necessary to add
        // the string '.*.*'
        node = tmp.join('.');
      }
    }
    if (!nodes.includes(node)) {
      nodes.push(node);
    }
  });
  if (isTR181 && !update) {
    // Additional information required for TR-181 devices
    nodes.push('Device.Ethernet.VLANTermination');
    nodes.push('Device.Ethernet.Link');
    nodes.push('Device.NAT.PortMapping');
    nodes.push('Device.NAT');
    nodes.push('Device.IP');
    nodes.push('Device.PPP');
  }
  nodes.push(fields.port_mapping_dhcp);
  nodes.push(fields.port_mapping_ppp);
  let result;
  if (update) {
    let nodesWithNoWildcards = nodes
      .map((node) => {
        const wildcardIndex = node.indexOf('*');
        if (wildcardIndex !== -1) {
          return node.substring(0, wildcardIndex - 1);
        } else {
          return node;
        }
      });
    let projection = [];
    nodesWithNoWildcards.map((node, i) => {
      let j = projection.findIndex((e) => {
        return e === node || e.includes(node) || node.includes(e);
      });
      if (j === -1) {
        projection.push(node);
      } else {
        let pNode = projection[j];
        if (node.length < pNode.length) {
          projection[j] = node;
        }
      }
    });
    result = projection.join(',');
  } else {
    result = nodes.map((node) => {
      if (node.endsWith('.*')) {
        return node + '.*';
      } else {
        return node + '.*.*';
      }
    });
    Object.keys(wanFields).forEach((key) => {
      let node = convertIndexIntoWildcard(wanFields[key]);
      if (!result.includes(node)) {
        result.push(node);
      }
    });
  }
  return callback(null, result);
};

/**
 * Calls Flashman to save parameters that got a notification in
 * GenieACS.
 *
 * @memberof controllers/external-genieacs/devices-api
 *
 * @param {String} args - The data and ACS ID as a JSON string.
 * @param {Function} callback - The function to be called when an error or
 * success occurs.
 *
 * @return {Any} The callback response.
 */
const syncDeviceChanges = async function(args, callback) {
  let params = null;

  // Try parsing the data received
  try {
    params = JSON.parse(args[0]);
  } catch (error) {
    return callback(null, {
      success: false,
      message: 'Invalid JSON',
    });
  }

  // Check params
  if (!params || !params.data || !params.acs_id) {
    return callback(null, {
      success: false,
      message: 'Incomplete arguments',
    });
  }

  let result = await sendFlashmanRequest('device/syncchanges', params);
  return callback(null, result);
};


/**
 * @exports controllers/external-genieacs/devices-api
 */
exports.instantiateCPEByModelFromDevice = instantiateCPEByModelFromDevice;
exports.instantiateCPEByModel = instantiateCPEByModel;
exports.getDeviceFields = getDeviceFields;
exports.syncDeviceData = syncDeviceData;
exports.syncDeviceDiagnostics = syncDeviceDiagnostics;
exports.syncDeviceChanges = syncDeviceChanges;
exports.getTR069UpgradeableModels = getTR069UpgradeableModels;
exports.getTR069CustomFactoryModels = getTR069CustomFactoryModels;
exports.wanKeyCriation = wanKeyCriation;
exports.assembleWanObj = assembleWanObj;
exports.getParentNode = getParentNode;
exports.getFieldProperties = getFieldProperties;
exports.verifyIndexesMatch = verifyIndexesMatch;

/*
 * This function is being exported in order to test it.
 * The ideal way is to have a condition to only export it when testing
 */
exports.__testTR069Models = tr069Models;
