/* global __line */

const DeviceModel = require('../../../models/device');
const DevicesAPI = require('../../external-genieacs/devices-api');
const Config = require('../../../models/config');
const utilHandlers = require('../util');
const sio = require('../../../sio');
const http = require('http');
const debug = require('debug')('ACS_DEVICES_MEASURES');
const t = require('../../language').i18next.t;

let acsMeasuresHandler = {};
let GENIEHOST = (process.env.FLM_NBI_ADDR || 'localhost');
let GENIEPORT = (process.env.FLM_NBI_PORT || 7557);

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
    hostname: GENIEHOST,
    port: GENIEPORT,
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
      let checkRecv = utilHandlers.checkForNestedKey(
        data,
        recvField+'._value',
        useLastIndexOnWildcard,
      );
      let checkSent = utilHandlers.checkForNestedKey(
        data,
        sentField+'._value',
        useLastIndexOnWildcard,
      );
      if (checkRecv && checkSent) {
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
      sio.anlixSendStatisticsNotification(mac, {wanbytes: wanBytes});
    });
  });
  req.end();
};

acsMeasuresHandler.fetchPonSignalFromGenie = async function(acsID) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID}).lean();

    if (!device) {
      return {
        success: false,
        message: t('cpeFindError', {errorline: __line}),
      };
    }
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
    hostname: GENIEHOST,
    port: GENIEPORT,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let data = '';
    let ponSignal = {};
    let ponArrayMeasures = {};
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
          rxpower: utilHandlers.getFromNestedKey(
            data,
            rxPowerField + '._value',
          ),

          txpower: utilHandlers.getFromNestedKey(
            data,
            txPowerField + '._value',
          ),
        };
      } else if (
        utilHandlers.checkForNestedKey(data, rxPowerFieldEpon + '._value') &&
        utilHandlers.checkForNestedKey(data, txPowerFieldEpon + '._value')
      ) {
        success = true;
        ponSignal = {
          rxpower: utilHandlers.getFromNestedKey(
            data,
            rxPowerFieldEpon + '._value',
          ),

          txpower: utilHandlers.getFromNestedKey(
            data,
            txPowerFieldEpon + '._value',
          ),
        };
      }

      if (success) {
        let deviceEdit = await DeviceModel.findById(mac);
        let deviceModified = false;

        if (!deviceEdit) return;
        deviceEdit.last_contact = Date.now();

        // Pon Rx Power
        if (ponSignal.rxpower) {
          ponSignal.rxpower = cpe.convertToDbm(ponSignal.rxpower);

          // Do not modify if rxpower is invalid
          if (ponSignal.rxpower) {
            deviceEdit.pon_rxpower = ponSignal.rxpower;
            deviceModified = true;
          }
        }

        // Pon Tx Power
        if (ponSignal.txpower) {
          ponSignal.txpower = cpe.convertToDbm(ponSignal.txpower);

          // Do not modify if txpower is invalid
          if (ponSignal.txpower) {
            deviceEdit.pon_txpower = ponSignal.txpower;
            deviceModified = true;
          }
        }


        ponArrayMeasures = acsMeasuresHandler.appendPonSignal(
          deviceEdit.pon_signal_measure,
          ponSignal.rxpower,
          ponSignal.txpower,
        );

        if (ponArrayMeasures) {
          deviceEdit.pon_signal_measure = ponArrayMeasures;
          deviceModified = true;
        }


        // Only save the device if modified the device, reducing the quantity
        // of unneeded await and save calls
        if (deviceModified === true) {
          await deviceEdit.save().catch((err) => {
            console.log('Error saving pon signal: ' + err);
          });
        }
      }


      // Send notification for app
      sio.anlixSendPonSignalNotification(
        mac,
        {ponsignalmeasure: ponArrayMeasures},
      );


      return ponArrayMeasures;
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
  let PPPoEUser = fields.wan.pppoe_user.replace(/\.\*.*/g, '');
  let upTimeField;
  let upTimePPPField;
  let rxPowerField;
  let txPowerField;
  let rxPowerFieldEpon;
  let txPowerFieldEpon;
  let query = {_id: acsID};
  let projection = fields.common.uptime + ',' + PPPoEUser;

  if (cpe.modelPermissions().wan.hasUptimeField) {
    upTimeField = fields.wan.uptime.replace(/\.\*.*/g, '');
    upTimePPPField = fields.wan.uptime_ppp.replace(/\.\*.*/g, '');
    projection += ',' + upTimeField + ',' + upTimePPPField;
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
    hostname: GENIEHOST,
    port: GENIEPORT,
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
      let checkFunction = utilHandlers.checkForNestedKey;
      let getFunction = utilHandlers.getFromNestedKey;

      if (checkFunction(data, fields.common.uptime + '._value')) {
        successSys = true;
        sysUpTime = getFunction(data, fields.common.uptime + '._value');
      }
      if (checkFunction(data, fields.wan.pppoe_user + '._value')) {
        successWan = true;
        let hasPPPoE = getFunction(data, fields.wan.pppoe_user + '._value');
        if (
          hasPPPoE && checkFunction(data, fields.wan.uptime_ppp + '._value')
        ) {
          wanUpTime = getFunction(data, fields.wan.uptime_ppp + '._value');
        }
      } else if (checkFunction(data, fields.wan.uptime + '._value')) {
        successWan = true;
        wanUpTime = getFunction(data, fields.wan.uptime + '._value');
      }
      if (checkFunction(data, rxPowerField + '._value') &&
          checkFunction(data, txPowerField + '._value')) {
        successRxPower = true;
        ponSignal = {
          rxpower: getFunction(data, rxPowerField + '._value'),
          txpower: getFunction(data, txPowerField + '._value'),
        };
      } else if (checkFunction(data, rxPowerFieldEpon + '._value') &&
                 checkFunction(data, txPowerFieldEpon + '._value')) {
        successRxPower = true;
        ponSignal = {
          rxpower: getFunction(data, rxPowerFieldEpon + '._value'),
          txpower: getFunction(data, txPowerFieldEpon + '._value'),
        };
      }
      if (successSys || successWan || successRxPower) {
        let deviceEdit = await DeviceModel.findById(mac);
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
          deviceEdit.pon_rxpower = ponSignal.rxpower;
          deviceEdit.pon_txpower = ponSignal.txpower;
          // append to device data structure
          ponSignal = acsMeasuresHandler.appendPonSignal(
            deviceEdit.pon_signal_measure,
            ponSignal.rxpower,
            ponSignal.txpower,
          );
          deviceEdit.pon_signal_measure = ponSignal;
        }
        if (successSys && deviceEdit.sys_up_time
            && deviceEdit.sys_up_time != sysUpTime) {
          /* only update last contact when sys up time from projection
           is different from the database, to avoid the bug of trigger
           this function, by mass trigger fetch up status, that entails
           bogus last contact refer */
          deviceEdit.last_contact = Date.now();
          sio.anlixSendUpStatusNotification(mac, {
            sysuptime: sysUpTime,
            wanuptime: wanUpTime,
            ponsignal: signalState,
          });
        }
        /* if sys up status is the same, so probably this functions
        was triggered by deleted task prompted by another fetch up
        status, then does not send data to front end */
        deviceEdit.sys_up_time = sysUpTime;
        deviceEdit.wan_up_time = wanUpTime;
        await deviceEdit.save().catch((err) => {
          console.log('Error saving device up status: ' + err);
        });
      }
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
