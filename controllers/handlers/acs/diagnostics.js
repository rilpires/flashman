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
const request = require('request-promise-native');

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

const getAllNestedKeysFromMultipleObjects = function(data, target, base) {
  let result = [];
  let resultKeys = [];
  base.result.forEach((res) => {
    let resultKeysRaw = utilHandlers.getFromNestedKey(data, res);
    if (resultKeysRaw) {
      resultKeys = Object.keys(resultKeysRaw);
    }
    resultKeys = resultKeys.filter((k)=>k[0] && k[0]!=='_');
    resultKeys.forEach((i)=>{
      let obj = {};
      Object.keys(target).forEach((key)=>{
        if (target[key] === '') return;
        let field = res+'.'+i+'.'+target[key] + '._value';
        if (utilHandlers.checkForNestedKey(data, field)) {
          obj[key] = utilHandlers.getFromNestedKey(data, field);
        }
      });
      result.push(obj);
    });
  });
  return result;
};

const getNextPingTest = function(device) {
  let found = device.pingtest_results.find((pingTest) => !pingTest.completed);
  return (found) ? found.host : '';
};

const getSpeedtestFile = async function(device, bandEstimative) {
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

  if (device.current_diagnostic.type=='speedtest' &&
      device.current_diagnostic.in_progress &&
      device.current_diagnostic.customized
  ) {
    return device.current_diagnostic.targets[0];
  }

  let stage = device.current_diagnostic.stage;
  let url = 'http://' + matchedConfig.measureServerIP + ':' +
                  matchedConfig.measureServerPort + '/measure/tr069/';
  if (stage) {
    if (stage == 'estimative') {
      return url + 'file_1920KB.bin';
    }
    if (stage == 'measure') {
      if (bandEstimative >= 500) {
        return url + 'file_640000KB.bin'; // Max time to download: 10s
      } else if (bandEstimative >= 300) {
        return url + 'file_448000KB.bin'; // Max time to download: 12s, Min: 7s
      } else if (bandEstimative >= 150) {
        return url + 'file_320000KB.bin'; // Max time to download: 17s, Min: 8s
      } else if (bandEstimative >= 70) {
        return url + 'file_192000KB.bin'; // Max time to download: 22s, Min: 10s
      } else if (bandEstimative >= 30) {
        return url + 'file_64000KB.bin'; // Max time to download: 17s, Min: 7s
      } else if (bandEstimative >= 15) {
        return url + 'file_32000KB.bin'; // Max time to download: 17s, Min: 9s
      } else if (bandEstimative >= 9) {
        return url + 'file_19200KB.bin'; // Max time to download: 17s, Min: 11s
      } else if (bandEstimative >= 3) {
        return url + 'file_6400KB.bin'; // Max time to download: 17s, Min: 6s
      } else if (bandEstimative < 3) {
        return url + 'file_1920KB.bin'; // Max time to download: 15s, Min: 7s
      }
    }
  }
  return '';
};

const calculatePingDiagnostic = async function(
    device, cpe, data, pingKeys, pingFields,
) {
  pingKeys = getAllNestedKeysFromObject(data, pingKeys, pingFields);
  let diagState = pingKeys.diag_state;

  if (['Requested', 'None'].includes(diagState)) return;

  let result = {};
  let currentPingTest = device.pingtest_results.find(
    (e) => e.host === pingKeys.host,
  );

  if (['Complete', 'Complete\n'].includes(diagState)) {
    const loss = parseInt(pingKeys.failure_count * 100 /
      (pingKeys.success_count + pingKeys.failure_count));
    if (isNaN(loss)) {
      debug('calculatePingDiagnostic loss is not an number!!!');
    }
    const count = parseInt(pingKeys.success_count + pingKeys.failure_count);
    currentPingTest.lat = pingKeys.avg_resp_time.toString();
    currentPingTest.loss = loss.toString();
    currentPingTest.count = count.toString();

    if (cpe.modelPermissions().wan.pingTestSingleAttempt) {
      if (pingKeys.success_count === 1) currentPingTest.loss = '0';
      else currentPingTest.loss = '100';
      currentPingTest.count = '1';
    }
  }

  // Always set completed to true to not break recursion on failure
  currentPingTest.completed = true;

  // Filling the result object
  device.pingtest_results.map((p) => {
    result[p.host] = {
      lat: p.lat,
      loss: p.loss,
      count: p.count,
      completed: p.completed,
    };
  });

  // If ping command was sent from a customized api call,
  // we don't want to propagate it to the generic webhook,
  // so we send it to the customized webhook
  if (device.current_diagnostic.type=='ping' &&
      device.current_diagnostic.customized &&
      device.current_diagnostic.in_progress
  ) {
    if (device.current_diagnostic.webhook_url) {
      let requestOptions = {};
      requestOptions.url = device.current_diagnostic.webhook_url;
      requestOptions.method = 'PUT';
      requestOptions.json = {
        'id': device._id,
        'type': 'device',
        'ping_results': result,
      };
      if (device.current_diagnostic.webhook_user &&
          device.current_diagnostic.webook_secret
      ) {
        requestOptions.auth = {
          user: device.current_diagnostic.webhook_user,
          pass: device.current_diagnostic.webhook_secret,
        };
      }
      // No wait!
      request(requestOptions).then(()=>{}, ()=>{});
    }
  } else {
    // Generic ping test -> generic trap
    deviceHandlers.sendPingToTraps(device._id, {results: result});
  }


  device.current_diagnostic.last_modified_at = new Date();
  if (!getNextPingTest(device)) {
    device.current_diagnostic.stage = 'done';
    device.current_diagnostic.in_progress = false;
  }
  await device.save().catch((err) => {
    console.log('Error saving ping test to database: ' + err);
  });

  if (device.current_diagnostic.in_progress) {
    startPingDiagnose(device.acs_id);
  }
  return;
};


const calculateTraceDiagnostic = async function(
  device, cpe, data, pingKeys, pingFields,
) {
  // TO-DO !!!
};

const calculateFreq = function(rawChannel) {
  const startChannel2Ghz = 1;
  const startChannel5GHz = 36;
  let intRawChannel = parseInt(rawChannel);
  let finalFreq = 2412; // 2.4 GHz
  if (Math.floor(intRawChannel / startChannel5GHz) != 0) { // 5.0 GHz
    finalFreq = 5180;
    finalFreq += (intRawChannel - startChannel5GHz) * 5;
  } else {
    finalFreq += (intRawChannel - startChannel2Ghz) * 5;
  }
  return finalFreq;
};

const calculateSiteSurveyDiagnostic = async function(
  device, cpe, data, siteSurveyFields,
) {
  let id = device.acs_id;
  let siteSurveyObjKeys = {
    mac: siteSurveyFields.mac,
    ssid: siteSurveyFields.ssid,
    channel: siteSurveyFields.channel,
    signal: siteSurveyFields.signal,
    band: siteSurveyFields.band,
    mode: siteSurveyFields.mode,
  };

  let apsData = getAllNestedKeysFromMultipleObjects(data,
    siteSurveyObjKeys, siteSurveyFields);
  let diagState = [];
  siteSurveyFields.diag_state.forEach((key)=>{
    if (utilHandlers.checkForNestedKey(data, key + '._value')) {
      diagState.push(utilHandlers.getFromNestedKey(
        data, key + '._value',
      ));
    }
  });
  let outData = [];

  if (diagState.every((x) => x === 'None')) {
    if (cpe.isToDoPoolingInState()) {
      acsDiagnosticsHandler.doPoolingInState(device.acs_id,
        cpe.getModelFields());
    }
  }
  if (diagState.includes('Requested')) {
    acsDiagnosticsHandler.fetchDiagnosticsFromGenie(id);
    return;
  }
  if (diagState.includes('Completed')) {
    apsData.forEach((ap) => {
      let outDev = {};

      let devReg = device.getAPSurveyDevice(ap.mac.toLowerCase());
      if (ap.channel) {
        ap.freq = calculateFreq(ap.channel);
      }
      if (ap.signal) {
        ap.signal = parseInt(ap.signal);
      }
      let devWidth=20;
      let devVHT=false;

      if (ap.mode && ap.mode.includes('ac')) {
        devVHT=true;
      }

      if (ap.band !== 'Auto' &&
          ap.band.match('[0-9]+') != null) {
        // '20MHz' | '40MHz' | '80MHz'
        devWidth = parseInt(ap.band.match('[0-9]+')[0]);
      }

      if (devReg) {
        devReg.ssid = ap.ssid;
        devReg.freq = ap.freq;
        devReg.signal = ap.signal;
        devReg.width = devWidth;
        devReg.VHT = devVHT;
        devReg.last_seen = Date.now();
        if (!devReg.first_seen) {
          devReg.first_seen = Date.now();
        }
      } else {
        device.ap_survey.push({
          mac: ap.mac,
          ssid: ap.ssid,
          freq: ap.freq,
          signal: ap.signal,
          width: devWidth,
          VHT: devVHT,
          first_seen: Date.now(),
          last_seen: Date.now(),
        });
      }
      outDev.mac = ap.mac;
      outData.push(outDev);
    });
    device.current_diagnostic.stage = 'done';
    device.current_diagnostic.in_progress = false;
    device.current_diagnostic.last_modified_at = new Date();
    device.last_site_survey = Date.now();
    await device.save().catch((err) => {
      console.log('Error saving site survey to database');
      return;
    });
  } else {
    device.current_diagnostic.stage = 'error';
    device.current_diagnostic.in_progress = false;
    device.current_diagnostic.last_modified_at = new Date();
    console.log('Error retrieving site survey data!');
  }
  // if someone is waiting for this message, send the information
  sio.anlixSendSiteSurveyNotifications(device._id.toUpperCase(), outData);
  console.log('Site Survey Receiving for device ' +
    id + ' successfully.');
  return;
};


const calculateSpeedDiagnostic = async function(
  device, cpe, data, speedKeys, speedFields,
) {
  speedKeys = getAllNestedKeysFromObject(data, speedKeys, speedFields);
  let result;
  let speedValueBasic;
  let speedValueFullLoad;
  if (device.current_diagnostic.type=='speedtest' &&
      device.current_diagnostic.in_progress
  ) {
    const diagState = speedKeys.diag_state;
    if (diagState == 'Completed' || diagState == 'Complete') {
      let beginTime = (new Date(speedKeys.bgn_time)).valueOf();
      let endTime = (new Date(speedKeys.end_time)).valueOf();
      speedValueBasic = cpe.convertSpeedValueBasic(
        endTime, beginTime, speedKeys.test_bytes_rec,
      );

      if (speedKeys.full_load_bytes_rec && speedKeys.full_load_period) {
        speedValueFullLoad = speedValueBasic = cpe.convertSpeedValueFullLoad(
          speedKeys.full_load_period, speedKeys.full_load_bytes_rec,
        );
      }

      // Speedtest's estimative / real measure step
      if (device.current_diagnostic.stage == 'estimative') {
        device.current_diagnostic.stage = 'measure';
        device.current_diagnostic.last_modified_at = new Date();
        await device.save().catch((err) => {
          console.log('Error saving speed test to database: ' + err);
        });
        await sio.anlixSendSpeedTestNotifications(device._id, {
          stage: 'estimative_finished',
          user: device.current_diagnostic.user,
        });
        startSpeedtestDiagnose(device.acs_id, speedValueBasic);
        return;
      } else if (device.current_diagnostic.stage == 'measure') {
        result = {
          downSpeed: '',
          user: device.current_diagnostic.user,
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
            user: device.current_diagnostic.user,
          };
          break;
        default:
          result = {
            user: device.current_diagnostic.user,
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

  let pingHostUrl = getNextPingTest(device);
  // We don't expect it to be empty here
  if (!pingHostUrl) {
    return;
  }

  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();

  let diagnStateField = fields.diagnostics.ping.diag_state;
  let diagnNumRepField = fields.diagnostics.ping.num_of_rep;
  let diagnURLField = fields.diagnostics.ping.host;
  let diagnInterfaceField = fields.diagnostics.ping.interface;
  let diagnTimeoutField = fields.diagnostics.ping.timeout;

  let numberOfRep = 10;
  let timeout = 1000;


  let task = {
    name: 'setParameterValues',
    parameterValues: [[diagnStateField, 'Requested', 'xsd:string'],
                      [diagnNumRepField, numberOfRep, 'xsd:unsignedInt'],
                      [diagnURLField, pingHostUrl, 'xsd:string'],
                      [diagnTimeoutField, timeout, 'xsd:unsignedInt']],
  };
  if (cpe.modelPermissions().wan.pingTestSetInterface) {
    let interfaceVal = 'InternetGatewayDevice.WANDevice.1.' +
      'WANConnectionDevice.1.WANPPPConnection.1.';
    if (device.connection_type === 'dhcp') {
      interfaceVal = 'InternetGatewayDevice.WANDevice.1.' +
      'WANConnectionDevice.1.WANIPConnection.1.';
    }
    task.parameterValues.push(
      [diagnInterfaceField, interfaceVal, 'xsd:string'],
    );
  }
  const result = await TasksAPI.addTask(acsID, task);
  if (!result.success) {
    console.log('Error starting ping diagnose for ' + acsID);
  }
};

const startSpeedtestDiagnose = async function(acsID, bandEstimative) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID}).lean();
  } catch (err) {
    return {success: false, message: err.message + ' in ' + acsID};
  }
  if (!device) {
    return {success: false, message: t('cpeFindError', {errorline: __line})};
  }

  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let diagnStateField = fields.diagnostics.speedtest.diag_state;
  let diagnNumConnField = fields.diagnostics.speedtest.num_of_conn;
  let diagnURLField = fields.diagnostics.speedtest.download_url;

  let numberOfCon = 3;
  let speedtestHostUrl = await getSpeedtestFile(device, bandEstimative);

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
  // Special case for models that cannot change number of connections
  if (!diagnNumConnField) {
    task.parameterValues.splice(1, 1);
  }
  const result = await TasksAPI.addTask(acsID, task);
  if (!result.success) {
    console.log('Error starting speedtest diagnose for ' + acsID);
  }
};

const startSiteSurveyDiagnose = async function(acsID) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID}).lean();
  } catch (err) {
    return {success: false, message: err.message + ' in ' + acsID};
  }
  if (!device) {
    return {success: false, message: t('cpeFindError', {errorline: __line})};
  }

  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let params = [];
  fields.diagnostics.sitesurvey.diag_state.forEach((ds) => {
    params.push([ds, 'Requested', 'xsd:string']);
  });

  let task = {
    name: 'setParameterValues',
    parameterValues: params,
  };
  const result = await TasksAPI.addTask(acsID, task);
  if (!result.success) {
    console.log('Error starting site survey diagnose for ' + acsID);
  }
  if (cpe.isToDoPoolingInState()) {
    acsDiagnosticsHandler.doPoolingInState(acsID, fields);
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

acsDiagnosticsHandler.doPoolingInState = async function(acsID, fields) {
  await delay(1000);
  let task = {
    name: 'getParameterValues',
    parameterNames: fields.diagnostics.sitesurvey.diag_state,
  };
  const result = await TasksAPI.addTask(acsID, task);
  if (result.success) {
    acsDiagnosticsHandler.fetchDiagnosticsFromGenie(acsID);
  } else {
    acsDiagnosticsHandler.doPoolingInState(acsID, fields);
  }
  return;
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
    sitesurvey: {
      diag_state: '',
      result: '',
    },
  };

  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();

  for (let masterKey in diagNecessaryKeys) {
    if (
      diagNecessaryKeys.hasOwnProperty(masterKey) &&
      fields.diagnostics.hasOwnProperty(masterKey)
    ) {
      let keys = diagNecessaryKeys[masterKey];
      let genieFields = fields.diagnostics[masterKey];
      for (let key in keys) {
        if (genieFields.hasOwnProperty(key)) {
          if (typeof genieFields[key] === 'string') {
            parameters.push(genieFields[key]);
          } else if (Array.isArray(genieFields[key])) {
            parameters = parameters.concat(genieFields[key]);
          }
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
        let permissions = DeviceVersion.devicePermissions(device);
        let diagType = device.current_diagnostic.type;
        if (!permissions) {
          console.log('Failed: genie can\'t check device permissions');
        } else if (!device.current_diagnostic.in_progress) {
          console.log('Genie diagnostic received but ' +
          'current_diagnostic.in_progress==false');
        } else if (permissions.grantPingTest && diagType=='ping') {
          await calculatePingDiagnostic(
            device, cpe, data,
            diagNecessaryKeys.ping,
            fields.diagnostics.ping,
          );
        } else if (permissions.grantSpeedTest && diagType=='speedtest') {
          await calculateSpeedDiagnostic(
            device, cpe, data, diagNecessaryKeys.speedtest,
            fields.diagnostics.speedtest,
          );
        } else if (permissions.grantTraceTest && diagType=='traceroute') {
          await calculateTraceDiagnostic(/* to-do */);
        } else if (permissions.grantSiteSurvey && diagType=='sitesurvey') {
          await calculateSiteSurveyDiagnostic(
            device, cpe, data, fields.diagnostics.sitesurvey,
          );
        }
      } catch (e) {
        console.log('Failed: genie response was not valid');
        console.log('Error:', e);
      }
    });
  });
  request.end();
};

acsDiagnosticsHandler.firePingDiagnose = async function(device) {
  if (!device || !device.use_tr069 || !device.acs_id) {
    return {success: false,
            message: t('cpeFindError', {errorline: __line})};
  }
  let acsID = device.acs_id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
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
      success: false, message: t('acsPingError', {errorline: __line}),
    };
  }
};

acsDiagnosticsHandler.fireSpeedDiagnose = async function(device) {
  if (!device || !device.use_tr069 || !device.acs_id) {
    return {success: false,
            message: t('cpeFindError', {errorline: __line})};
  }
  let acsID = device.acs_id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
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

acsDiagnosticsHandler.fireTraceDiagnose = async function(device) {
  return {
    success: false, message: t('notAvailable'),
  };
};

acsDiagnosticsHandler.fireSiteSurveyDiagnose = async function(device) {
  if (!device || !device.use_tr069 || !device.acs_id) {
    return {success: false,
            message: t('cpeFindError', {errorline: __line})};
  }
  let acsID = device.acs_id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let siteSurveyDiagnostics = fields.diagnostics.sitesurvey.root;
  // We need to update the parameter values before we fire the speedtest
  let task = {
    name: 'getParameterValues',
    parameterNames: [siteSurveyDiagnostics],
  };
  const result = await TasksAPI.addTask(acsID, task, startSiteSurveyDiagnose);
  if (result.success) {
    return {success: true, message: t('operationSuccessful')};
  } else {
    return {
      success: false, message: t('acsSiteSurveyError', {errorline: __line}),
    };
  }
};

module.exports = acsDiagnosticsHandler;
