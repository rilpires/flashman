/* global __line */

const DeviceModel = require('../../../models/device');
const DevicesAPI = require('../../external-genieacs/devices-api');
const Config = require('../../../models/config');
const utilHandlers = require('../util.js');
const sio = require('../../../sio');
const http = require('http');
const debug = require('debug')('ACS_DEVICES_MEASURES');
const t = require('../../language').i18next.t;

let acsMeasuresHandler = {};

acsMeasuresHandler.fetchWanBytesFromGenie = async function(acsID) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID}).lean();
  } catch (e) {
    return;
  }
  if (!device || !device.use_tr069) {
    return;
  }
  let mac = device._id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let useLastIndexOnWildcard = cpe.modelPermissions().useLastIndexOnWildcard;
  let fields = cpe.getModelFields();
  let recvField = fields.wan.recv_bytes;
  let sentField = fields.wan.sent_bytes;
  let query = {_id: acsID};
  let projection = recvField.replace(/\.\*.*/g, '') + ','
    + sentField.replace(/\.\*.*/g, '');
  let path = '/devices/?query='+JSON.stringify(query)+'&projection='+projection;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let data = '';
    let wanBytes = {};
    resp.on('data', (chunk)=>data+=chunk);
    resp.on('end', async () => {
      if (data.length > 0) {
        try {
          data = JSON.parse(data)[0];
        } catch (err) {
          debug(err);
          data = '';
        }
      }
      let success = false;
      if (utilHandlers.checkForNestedKey(data, recvField+'._value', useLastIndexOnWildcard) &&
          utilHandlers.checkForNestedKey(data, sentField+'._value', useLastIndexOnWildcard)) {
        success = true;
        wanBytes = {
          recv: utilHandlers.getFromNestedKey(
            data, recvField+'._value', useLastIndexOnWildcard,
          ),
          sent: utilHandlers.getFromNestedKey(
            data, sentField+'._value', useLastIndexOnWildcard,
          ),
        };
      }
      if (success) {
        let deviceEdit = await DeviceModel.findById(mac);
        if (!deviceEdit) return;
        deviceEdit.last_contact = Date.now();
        wanBytes = acsMeasuresHandler.appendBytesMeasure(
          deviceEdit.wan_bytes,
          wanBytes.recv,
          wanBytes.sent,
        );
        deviceEdit.wan_bytes = wanBytes;
        await deviceEdit.save().catch((err) => {
          console.log('Error saving device wan bytes: ' + err);
        });
      }
      sio.anlixSendWanBytesNotification(mac, {wanbytes: wanBytes});
    });
  });
  req.end();
};

acsMeasuresHandler.fetchPonSignalFromGenie = async function(acsID) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID}).lean();
  } catch (e) {
    console.log('Error:', e);
    return {success: false,
            message: t('cpeFindError', {errorline: __line})};
  }
  let mac = device._id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let rxPowerField = fields.wan.pon_rxpower;
  let txPowerField = fields.wan.pon_txpower;
  let rxPowerFieldEpon = '';
  let txPowerFieldEpon = '';
  let projection = rxPowerField + ',' + txPowerField;

  if (fields.wan.pon_rxpower_epon && fields.wan.pon_txpower_epon) {
    rxPowerFieldEpon = fields.wan.pon_rxpower_epon;
    txPowerFieldEpon = fields.wan.pon_txpower_epon;
    projection += ',' + rxPowerFieldEpon + ',' + txPowerFieldEpon;
  }

  let query = {_id: acsID};
  let path = '/devices/?query='+JSON.stringify(query)+'&projection='+projection;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let data = '';
    let ponSignal = {};
    resp.on('data', (chunk)=>data+=chunk);
    resp.on('end', async () => {
      if (data.length > 0) {
        try {
          data = JSON.parse(data)[0];
        } catch (err) {
          debug(err);
          data = '';
        }
      }
      let success = false;
      if (utilHandlers.checkForNestedKey(data, rxPowerField + '._value') &&
          utilHandlers.checkForNestedKey(data, txPowerField + '._value')) {
        success = true;
        ponSignal = {
          rxpower: utilHandlers.getFromNestedKey(data, rxPowerField + '._value'),
          txpower: utilHandlers.getFromNestedKey(data, txPowerField + '._value'),
        };
      } else if (utilHandlers.checkForNestedKey(data, rxPowerFieldEpon + '._value') &&
                 utilHandlers.checkForNestedKey(data, txPowerFieldEpon + '._value')) {
        success = true;
        ponSignal = {
          rxpower: utilHandlers.getFromNestedKey(data, rxPowerFieldEpon + '._value'),
          txpower: utilHandlers.getFromNestedKey(data, txPowerFieldEpon + '._value'),
        };
      }
      if (success) {
        let deviceEdit = await DeviceModel.findById(mac);
        if (!deviceEdit) return;
        deviceEdit.last_contact = Date.now();
        if (ponSignal.rxpower) {
          ponSignal.rxpower = cpe.convertToDbm(ponSignal.rxpower);
        }
        if (ponSignal.txpower) {
          ponSignal.txpower = cpe.convertToDbm(ponSignal.txpower);
        }
        ponSignal = acsMeasuresHandler.appendPonSignal(
          deviceEdit.pon_signal_measure,
          ponSignal.rxpower,
          ponSignal.txpower,
        );
        deviceEdit.pon_signal_measure = ponSignal;
        await deviceEdit.save().catch((err) => {
          console.log('Error saving pon signal: ' + err);
        });
      }
      sio.anlixSendPonSignalNotification(mac, {ponsignalmeasure: ponSignal});
      return ponSignal;
    });
  });
  req.end();
};

acsMeasuresHandler.fetchUpStatusFromGenie = async function(acsID) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID}).lean();
  } catch (e) {
    return;
  }
  if (!device || !device.use_tr069) {
    return;
  }
  let mac = device._id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let PPPoEUser1 = fields.wan.pppoe_user.replace('*', 1).replace('*', 1);
  let PPPoEUser2 = fields.wan.pppoe_user.replace('*', 1).replace('*', 2);
  let upTimeField1;
  let upTimeField2;
  let upTimePPPField1;
  let upTimePPPField2;
  let rxPowerField;
  let txPowerField;
  let rxPowerFieldEpon;
  let txPowerFieldEpon;
  let query = {_id: acsID};
  let projection = fields.common.uptime +
    ',' + PPPoEUser1 + ',' + PPPoEUser2;

  if (cpe.modelPermissions().wan.hasUptimeField) {
    upTimeField1 = fields.wan.uptime.replace('*', 1);
    upTimeField2 = fields.wan.uptime.replace('*', 2);
    upTimePPPField1 = fields.wan.uptime_ppp.replace('*', 1).replace('*', 1);
    upTimePPPField2 = fields.wan.uptime_ppp.replace('*', 1).replace('*', 2);
    projection += ',' + upTimeField1 + ',' + upTimeField2 +
      ',' + upTimePPPField1 + ',' + upTimePPPField2;
  }

  if (fields.wan.pon_rxpower && fields.wan.pon_txpower) {
    rxPowerField = fields.wan.pon_rxpower;
    txPowerField = fields.wan.pon_txpower;
    projection += ',' + rxPowerField + ',' + txPowerField;
  }

  if (fields.wan.pon_rxpower_epon && fields.wan.pon_txpower_epon) {
    rxPowerFieldEpon = fields.wan.pon_rxpower_epon;
    txPowerFieldEpon = fields.wan.pon_txpower_epon;
    projection += ',' + rxPowerFieldEpon + ',' + txPowerFieldEpon;
  }
  let path = '/devices/?query='+JSON.stringify(query)+'&projection='+projection;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let data = '';
    let sysUpTime = 0;
    let wanUpTime = 0;
    let signalState = {};
    let ponSignal = {};
    resp.on('data', (chunk)=>data+=chunk);
    resp.on('end', async () => {
      if (data.length > 0) {
        try {
          data = JSON.parse(data)[0];
        } catch (err) {
          debug(err);
          return;
        }
      }
      let successSys = false;
      let successWan = false;
      let successRxPower = false;
      if (utilHandlers.checkForNestedKey(data, fields.common.uptime+'._value')) {
        successSys = true;
        sysUpTime = utilHandlers.getFromNestedKey(data, fields.common.uptime+'._value');
      }
      if (utilHandlers.checkForNestedKey(data, PPPoEUser1+'._value')) {
        successWan = true;
        let hasPPPoE = utilHandlers.getFromNestedKey(data, PPPoEUser1+'._value');
        if (hasPPPoE && utilHandlers.checkForNestedKey(data, upTimePPPField1+'._value')) {
          wanUpTime = utilHandlers.getFromNestedKey(data, upTimePPPField1+'._value');
        }
      } else if (utilHandlers.checkForNestedKey(data, PPPoEUser2+'._value')) {
        successWan = true;
        let hasPPPoE = utilHandlers.getFromNestedKey(data, PPPoEUser2+'._value');
        if (hasPPPoE && utilHandlers.checkForNestedKey(data, upTimePPPField2+'._value')) {
          wanUpTime = utilHandlers.getFromNestedKey(data, upTimePPPField2+'._value');
        }
      } else if (utilHandlers.checkForNestedKey(data, upTimeField1+'._value')) {
        successWan = true;
        wanUpTime = utilHandlers.getFromNestedKey(data, upTimeField1+'._value');
      } else if (utilHandlers.checkForNestedKey(data, upTimeField2+'._value')) {
        successWan = true;
        wanUpTime = utilHandlers.getFromNestedKey(data, upTimeField2+'._value');
      }
      if (utilHandlers.checkForNestedKey(data, rxPowerField + '._value') &&
          utilHandlers.checkForNestedKey(data, txPowerField + '._value')) {
        successRxPower = true;
        ponSignal = {
          rxpower: utilHandlers.getFromNestedKey(data, rxPowerField + '._value'),
          txpower: utilHandlers.getFromNestedKey(data, txPowerField + '._value'),
        };
      } else if (utilHandlers.checkForNestedKey(data, rxPowerFieldEpon + '._value') &&
                 utilHandlers.checkForNestedKey(data, txPowerFieldEpon + '._value')) {
        successRxPower = true;
        ponSignal = {
          rxpower: utilHandlers.getFromNestedKey(data, rxPowerFieldEpon + '._value'),
          txpower: utilHandlers.getFromNestedKey(data, txPowerFieldEpon + '._value'),
        };
      }
      if (successSys || successWan || successRxPower) {
        let deviceEdit = await DeviceModel.findById(mac);
        deviceEdit.last_contact = Date.now();
        deviceEdit.sys_up_time = sysUpTime;
        deviceEdit.wan_up_time = wanUpTime;

        if (successRxPower) {
          // covert rx and tx signal
          ponSignal.rxpower = cpe.convertToDbm(ponSignal.rxpower);
          ponSignal.txpower = cpe.convertToDbm(ponSignal.txpower);
          // send then
          let config = await Config.findOne(
            {is_default: true}, {tr069: true},
          ).lean();
          signalState = {
            rxpower: ponSignal.rxpower,
            threshold:
              config.tr069.pon_signal_threshold,
            thresholdCritical:
              config.tr069.pon_signal_threshold_critical,
            thresholdCriticalHigh:
              config.tr069.pon_signal_threshold_critical_high,
          };
          // append to device data structure
          ponSignal = acsMeasuresHandler.appendPonSignal(
            deviceEdit.pon_signal_measure,
            ponSignal.rxpower,
            ponSignal.txpower,
          );
          deviceEdit.pon_signal_measure = ponSignal;
        }
        await deviceEdit.save().catch((err) => {
          console.log('Error saving device up status: ' + err);
        });
      }
      sio.anlixSendUpStatusNotification(mac, {
        sysuptime: sysUpTime,
        wanuptime: wanUpTime,
        ponsignal: signalState,
      });
    });
  });
  req.end();
};

acsMeasuresHandler.appendBytesMeasure = function(original, recv, sent) {
  if (!original) original = {};
  try {
    let now = Math.floor(Date.now()/1000);
    let bytes = JSON.parse(JSON.stringify(original));
    if (Object.keys(bytes).length >= 300) {
      let keysNum = Object
        .keys(bytes)
        .map((keyNum) => {
          const parsedKeyNum = parseInt(keyNum);
          if (isNaN(parsedKeyNum)) {
            debug('parsedKeyNum is NaN!!!');
          }
          return parsedKeyNum;
        });
      let smallest = Math.min(...keysNum);
      delete bytes[smallest];
    }
    bytes[now] = [recv, sent];
    return bytes;
  } catch (e) {
    debug(`appendBytesMeasure Exception: ${e}`);
    return original;
  }
};

acsMeasuresHandler.appendPonSignal = function(original, rxPower, txPower) {
  if (!original) original = {};
  try {
    let now = Math.floor(Date.now() / 1000);
    let dbms = JSON.parse(JSON.stringify(original));
    if (Object.keys(dbms).length >= 100) {
      let keysNum = Object
        .keys(dbms)
        .map((keyNum) => {
          const parsedKeyNum = parseInt(keyNum);
          if (isNaN(parsedKeyNum)) {
            debug('parsedKeyNum is NaN!!!');
          }
          return parsedKeyNum;
        });
      let smallest = Math.min(...keysNum);
      delete dbms[smallest];
    }
    dbms[now] = [rxPower, txPower];
    return dbms;
  } catch (e) {
    debug(`appendPonSignal Exception: ${e}`);
    return original;
  }
};

module.exports = acsMeasuresHandler;
