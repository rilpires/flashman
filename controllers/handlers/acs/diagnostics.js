/* eslint-disable no-prototype-builtins */
/* global __line */
const TasksAPI = require('../../external-genieacs/tasks-api');
const Config = require('../../../models/config');
const DeviceModel = require('../../../models/device');
const DeviceVersion = require('../../../models/device_version');
const DevicesAPI = require('../../external-genieacs/devices-api');
const deviceHandlers = require('../devices');
const utilHandlers = require('../util.js');
const sio = require('../../../sio');
const http = require('http');
const debug = require('debug')('ACS_DIAGNOSTICS');
const t = require('../../language').i18next.t;

let acsDiagnosticsHandler = {};

const getAllNestedKeysFromObject = function(data, target, genieFields) {
  let result = {};
  Object.keys(target).forEach((key)=>{
    if (utilHandlers.checkForNestedKey(data, genieFields[key] + '._value')) {
      result[key] = utilHandlers.getFromNestedKey(
        data, genieFields[key] + '._value',
      );
    }
  });
  return result;
};

const getSpeedtestFile = async function(device) {
  let matchedConfig = await Config.findOne(
    {is_default: true}, {measureServerIP: true, measureServerPort: true},
  ).lean().catch(
    function(err) {
      console.error('Error creating entry: ' + err);
      return '';
    },
  );
  if (!matchedConfig) {
    console.error('Error creating entry. Config does not exists.');
    return '';
  }
  let stage = device.current_speedtest.stage;
  let band = device.current_speedtest.band_estimative;
  let url = 'http://' + matchedConfig.measureServerIP + ':' +
                  matchedConfig.measureServerPort + '/measure/tr069/';
  if (stage) {
    if (stage == 'estimative') {
      return url + 'file_512KB.bin';
    }
    if (stage == 'measure') {
      if (band >= 700) {
        return url + 'file_640000KB.bin';
      } else if (band >= 500) {
        return url + 'file_448000KB.bin';
      } else if (band >= 300) {
        return url + 'file_320000KB.bin';
      } else if (band >= 100) {
        return url + 'file_192000KB.bin';
      } else if (band >= 50) {
        return url + 'file_64000KB.bin';
      } else if (band >= 30) {
        return url + 'file_32000KB.bin';
      } else if (band >= 10) {
        return url + 'file_19200KB.bin';
      } else if (band >= 5) {
        return url + 'file_6400KB.bin';
      } else if (band >= 3) {
        return url + 'file_1920KB.bin';
      } else if (band < 3) {
        return url + 'file_512KB.bin';
      }
    }
  }
  return '';
};

const calculatePingDiagnostic = function(device, data, pingKeys, pingFields) {
  pingKeys = getAllNestedKeysFromObject(data, pingKeys, pingFields);
  if (pingKeys.diag_state !== 'Requested' && pingKeys.diag_state !== 'None') {
    let result = {};
    device.ping_hosts.forEach((host) => {
      if (host) {
        result[host] = {
          lat: '---',
          loss: '--- ',
        };
      }
    });
    if (
      pingKeys.diag_state === 'Complete' ||
      pingKeys.diag_state === 'Complete\n'
    ) {
      const loss = parseInt(pingKeys.failure_count * 100 /
        (pingKeys.success_count + pingKeys.failure_count));
      if (isNaN(loss)) {
        debug('calculatePingDiagnostic loss is not an number!!!');
      }
      result[pingKeys.host] = {
        lat: pingKeys.avg_resp_time.toString(),
        loss: loss.toString(),
      };
      let model = device.model;
      if (
        ['HG8245Q2', 'EG8145V5', 'HG8121H', 'EG8145X6', 'HG9'].includes(model)
      ) {
        if (pingKeys.success_count === 1) result[pingKeys.host]['loss'] = '0';
        else result[pingKeys.host]['loss'] = '100';
      }
    }
    deviceHandlers.sendPingToTraps(device._id, {results: result});
  }
};

const calculateSpeedDiagnostic = async function(
  device, data, speedKeys, speedFields,
) {
  speedKeys = getAllNestedKeysFromObject(data, speedKeys, speedFields);
  let result;
  let speedValueBasic;
  let speedValueFullLoad;
  let rqstTime;
  let lastTime = (new Date(1970, 0, 1)).valueOf();

  try {
    if ('current_speedtest' in device &&
        'timestamp' in device.current_speedtest &&
        device.current_speedtest.timestamp) {
      rqstTime = device.current_speedtest.timestamp.valueOf();
    }
  } catch (e) {
    console.log('Error at TR-069 speedtest:', e);
    return;
  }

  if (!device.current_speedtest.timestamp || (rqstTime > lastTime)) {
    if (speedKeys.diag_state == 'Completed') {
      if (device.speedtest_results.length > 0) {
        lastTime = utilHandlers.parseDate(
          device.speedtest_results[device.speedtest_results.length-1].timestamp,
        );
      }

      let beginTime = (new Date(speedKeys.bgn_time)).valueOf();
      let endTime = (new Date(speedKeys.end_time)).valueOf();
      // 10**3 => seconds to miliseconds (because of valueOf() notation)
      let deltaTime = (endTime - beginTime) / (10**3);

      // 8 => byte to bit
      // 1024**2 => bit to megabit
      speedValueBasic = (8/(1024**2))*(speedKeys.test_bytes_rec/deltaTime);

      if (speedKeys.full_load_bytes_rec && speedKeys.full_load_period) {
        // 10**6 => microsecond to second
        // 8 => byte to bit
        // 1024**2 => bit to megabit
        speedValueFullLoad = ((8*(10**6))/(1024**2)) *
                    (speedKeys.full_load_bytes_rec/speedKeys.full_load_period);
      }

      // Speedtest's estimative / real measure step
      if (device.current_speedtest.stage == 'estimative') {
        device.current_speedtest.band_estimative = speedValueBasic;
        device.current_speedtest.stage = 'measure';
        await device.save().catch((err) => {
          console.log('Error saving speed test est to database: ' + err);
        });
        await sio.anlixSendSpeedTestNotifications(device._id, {
          stage: 'estimative_finished',
          user: device.current_speedtest.user,
        });
        acsDiagnosticsHandler.fireSpeedDiagnose(device._id);
        return;
      } else if (device.current_speedtest.stage == 'measure') {
        result = {
          downSpeed: '',
          user: device.current_speedtest.user,
        };
        if (speedKeys.full_load_bytes_rec && speedKeys.full_load_period) {
          result.downSpeed = parseInt(speedValueFullLoad).toString() + ' Mbps';
          if (isNaN(parseInt(speedValueFullLoad))) {
            result.downSpeed = '0 Mbps';
          }
        } else {
          result.downSpeed = parseInt(speedValueBasic).toString() + ' Mbps';
          if (isNaN(parseInt(speedValueBasic))) {
            result.downSpeed = '0 Mbps';
          }
        }
        deviceHandlers.storeSpeedtestResult(device, result);
        return;
      }
    } else {
      // Error treatment (switch-case for future error handling)
      switch (speedKeys.diag_state) {
        case 'Error_InitConnectionFailed':
        case 'Error_NoResponse':
        case 'Error_Other':
          console.log('Failure at TR-069 speedtest:', speedKeys.diag_state);
          result = {
            downSpeed: '503 Server',
            user: device.current_speedtest.user,
          };
          break;
        default:
          result = {
            user: device.current_speedtest.user,
          };
      }
      deviceHandlers.storeSpeedtestResult(device, result);
      return;
    }
  }
};

const startPingDiagnose = async function(acsID) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID}).lean();
  } catch (err) {
    return {success: false, message: err.message + ' in ' + acsID};
  }
  if (!device) {
    return {success: false, message: t('cpeFindError', {errorline: __line})};
  }

  let fields = DevicesAPI.getModelFieldsFromDevice(device).fields;
  let diagnStateField = fields.diagnostics.ping.diag_state;
  let diagnNumRepField = fields.diagnostics.ping.num_of_rep;
  let diagnURLField = fields.diagnostics.ping.host;
  let diagnTimeoutField = fields.diagnostics.ping.timeout;

  let numberOfRep = 10;
  let pingHostUrl = device.ping_hosts[0];
  let timeout = 1000;

  let task = {
    name: 'setParameterValues',
    parameterValues: [[diagnStateField, 'Requested', 'xsd:string'],
                      [diagnNumRepField, numberOfRep, 'xsd:unsignedInt'],
                      [diagnURLField, pingHostUrl, 'xsd:string'],
                      [diagnTimeoutField, timeout, 'xsd:unsignedInt']],
  };
  const result = await TasksAPI.addTask(acsID, task);
  if (!result.success) {
    console.log('Error starting ping diagnose for ' + acsID);
  }
};

const startSpeedtestDiagnose = async function(acsID) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID}).lean();
  } catch (err) {
    return {success: false, message: err.message + ' in ' + acsID};
  }
  if (!device) {
    return {success: false, message: t('cpeFindError', {errorline: __line})};
  }

  let fields = DevicesAPI.getModelFieldsFromDevice(device).fields;
  let diagnStateField = fields.diagnostics.speedtest.diag_state;
  let diagnNumConnField = fields.diagnostics.speedtest.num_of_conn;
  let diagnURLField = fields.diagnostics.speedtest.download_url;

  let numberOfCon = 3;
  let speedtestHostUrl = await getSpeedtestFile(device);

  if (!speedtestHostUrl || speedtestHostUrl === '') {
    console.log('No valid speedtest URL found for ' + acsID);
    return;
  }

  let task = {
    name: 'setParameterValues',
    parameterValues: [[diagnStateField, 'Requested', 'xsd:string'],
                      [diagnNumConnField, numberOfCon, 'xsd:unsignedInt'],
                      [diagnURLField, speedtestHostUrl, 'xsd:string']],
  };
  if (device.model == 'HG8121H') {
    task.parameterValues = [
      [diagnStateField, 'Requested', 'xsd:string'],
      [diagnURLField, speedtestHostUrl, 'xsd:string']
    ];
  }
  const result = await TasksAPI.addTask(acsID, task);
  if (!result.success) {
    console.log('Error starting speedtest diagnose for ' + acsID);
  }
};

acsDiagnosticsHandler.fetchDiagnosticsFromGenie = async function(acsID) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID});
  } catch (e) {
    return;
  }
  if (!device || !device.use_tr069 || !device.acs_id) {
    return;
  }

  let parameters = [];
  let diagNecessaryKeys = {
    ping: {
      diag_state: '',
      num_of_rep: '',
      failure_count: '',
      success_count: '',
      host: '',
      avg_resp_time: '',
      max_resp_time: '',
      min_resp_time: '',
    },
    speedtest: {
      diag_state: '',
      num_of_conn: '',
      download_url: '',
      bgn_time: '',
      end_time: '',
      test_bytes_rec: '',
      down_transports: '',
      full_load_bytes_rec: '',
      full_load_period: '',
    },
  };

  let fields = DevicesAPI.getModelFieldsFromDevice(device).fields;

  for (let masterKey in diagNecessaryKeys) {
    if (
      diagNecessaryKeys.hasOwnProperty(masterKey) &&
      fields.diagnostics.hasOwnProperty(masterKey)
    ) {
      let keys = diagNecessaryKeys[masterKey];
      let genieFields = fields.diagnostics[masterKey];
      for (let key in keys) {
        if (genieFields.hasOwnProperty(key)) {
          parameters.push(genieFields[key]);
        }
      }
    }
  }

  let query = {_id: acsID};
  let path = '/devices/?query='+JSON.stringify(query)+
              '&projection='+parameters.join(',');
  let options = {
    protocol: 'http:',
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let request = http.request(options, (response)=>{
    let chunks = [];
    response.on('error', (error) => console.log(error));
    response.on('data', async (chunk)=>chunks.push(chunk));
    response.on('end', async (chunk) => {
      let body = Buffer.concat(chunks);
      try {
        let data = JSON.parse(body)[0];
        let permissions = DeviceVersion.findByVersion(
          device.version,
          device.wifi_is_5ghz_capable,
          device.model,
        );
        if (permissions) {
          if (permissions.grantPingTest) {
            await calculatePingDiagnostic(
              device, data, diagNecessaryKeys.ping, fields.diagnostics.ping,
            );
          }
          if (permissions.grantSpeedTest) {
            await calculateSpeedDiagnostic(
              device, data, diagNecessaryKeys.speedtest,
              fields.diagnostics.speedtest,
            );
          }
        } else {
          console.log('Failed: genie can\'t check device permissions');
        }
      } catch (e) {
        console.log('Failed: genie response was not valid');
        console.log('Error:', e);
      }
    });
  });
  request.end();
};

acsDiagnosticsHandler.firePingDiagnose = async function(mac) {
  let device;
  try {
    device = await DeviceModel.findById(mac).lean();
  } catch (e) {
    console.log('Error:', e);
    return {success: false,
            message: t('cpeFindError', {errorline: __line})};
  }
  if (!device || !device.use_tr069 || !device.acs_id) {
    return {success: false,
            message: t('cpeFindError', {errorline: __line})};
  }
  let acsID = device.acs_id;
  let fields = DevicesAPI.getModelFieldsFromDevice(device).fields;
  let diagnIPPingDiagnostics = fields.diagnostics.ping.root;
  // We need to update the parameter values before we fire the ping test
  let task = {
    name: 'getParameterValues',
    parameterNames: [diagnIPPingDiagnostics],
  };
  const result = await TasksAPI.addTask(acsID, task, startPingDiagnose);
  if (result.success) {
    return {success: true, message: t('operationSuccessful')};
  } else {
    return {
      success: false, message: t('acsPingCouldNotBeSent', {errorline: __line}),
    };
  }
};

acsDiagnosticsHandler.fireSpeedDiagnose = async function(mac) {
  let device;
  try {
    device = await DeviceModel.findById(mac).lean();
  } catch (e) {
    console.log('Error:', e);
    return {success: false,
            message: t('cpeFindError', {errorline: __line})};
  }
  if (!device || !device.use_tr069 || !device.acs_id) {
    return {success: false,
            message: t('cpeFindError', {errorline: __line})};
  }
  let acsID = device.acs_id;
  let fields = DevicesAPI.getModelFieldsFromDevice(device).fields;
  let diagnSpeedtestDiagnostics = fields.diagnostics.speedtest.root;
  // We need to update the parameter values before we fire the speedtest
  let task = {
    name: 'getParameterValues',
    parameterNames: [diagnSpeedtestDiagnostics],
  };
  const result = await TasksAPI.addTask(acsID, task, startSpeedtestDiagnose);
  if (result.success) {
    return {success: true, message: t('operationSuccessful')};
  } else {
    return {
      success: false, message: t('acsSpeedTestError', {errorline: __line}),
    };
  }
};

module.exports = acsDiagnosticsHandler;
