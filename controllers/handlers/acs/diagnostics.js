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
let GENIEHOST = (process.env.FLM_NBI_ADDR || 'localhost');
let GENIEPORT = (process.env.FLM_NBI_PORT || 7557);

// Returns {key: genieFieldValue}
const getAllNestedKeysFromObject = function(
  data, keys, genieFieldsFromKey, root,
) {
  let result = {};
  keys.forEach((key) => {
    let completeValueField = genieFieldsFromKey[key] + '._value';
    let completeField = genieFieldsFromKey[key];
    if (root) {
      completeValueField = root + '.' + completeValueField;
      completeField = root + '.' + completeField;
    }
    if (utilHandlers.checkForNestedKey(data, completeValueField)) {
      result[key] = utilHandlers.getFromNestedKey(
        data, completeValueField,
      );
    } else if (utilHandlers.checkForNestedKey(data, completeField)) {
      result[key] = utilHandlers.getFromNestedKey(
        data, completeField,
      );
    }
  });
  return result;
};

const saveCurrentDiagnostic = async function(device, msg, progress) {
  device.current_diagnostic.stage = msg;
  device.current_diagnostic.in_progress = progress;
  device.current_diagnostic.last_modified_at = new Date();
  await device.save().catch((err) => {
    console.log('Error saving site survey to database');
    return;
  });
};

const getNextPingTest = function(device) {
  let found = device.pingtest_results.find((pingTest) => !pingTest.completed);
  return (found) ? found.host : '';
};

const getNextTraceTarget = function(device) {
  let found = device.traceroute_results.find(
    (traceTest) => !traceTest.completed,
  );
  return (found) ? found.address : '';
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

  if (device.current_diagnostic.type == 'speedtest' &&
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
  pingKeys = getAllNestedKeysFromObject(
    data, Object.keys(pingKeys), pingFields,
  );
  let diagState = pingKeys.diag_state;
  if (['Requested', 'None'].includes(diagState)) return;

  let result = {};
  let currentPingTest = device.pingtest_results.find(
    (e) => e.host === pingKeys.host,
  );

  if (['Complete', 'Complete\n', 'Completed'].includes(diagState)) {
    const loss = parseInt(pingKeys.failure_count * 100 /
      (pingKeys.success_count + pingKeys.failure_count));
    if (isNaN(loss)) {
      debug('calculatePingDiagnostic loss is not an number!!!');
    }
    const count = parseInt(pingKeys.success_count + pingKeys.failure_count);
    currentPingTest.lat = cpe.convertPingTestResult(pingKeys.avg_resp_time);
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
  if (device.current_diagnostic.type == 'ping' &&
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
      request(requestOptions).then(() => { }, () => { });
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

const calculateTraceDiagnostic = async function(device, data, traceFields) {
  console.log('calculateTraceDiagnostic...');

  // Filling individually each key, since 'getAllNestedKeysFromObject' won't
  // do any good
  console.log('data antes:');
  console.log(data);
  console.log('traceFields antes:');
  console.log(traceFields);
  let rootData = getAllNestedKeysFromObject(
    data, Object.keys(traceFields), traceFields, traceFields['root'],
  );
  console.log('rootData:');
  console.log(rootData);

  let traceResult = device.traceroute_results
    .filter((e)=>!e.completed)
    .find((e)=>e.address==rootData.target);

  if (!traceResult) return;
  if (['Requested', 'None'].includes(rootData.diag_state)) return;

  console.log('Trace result antes:', traceResult);

  let hasData = [
    'Complete',
    'Complete\n',
    'Completed',
    'Error_MaxHopCountExceeded',
  ].includes(rootData.diag_state);
  let hasExceeded = ['Error_MaxHopCountExceeded'].includes(rootData.diag_state);


  if (hasData || hasExceeded) {
    const inNumberOfHops = parseInt(rootData.number_of_hops);
    const traceTarget = rootData.target;
    const inTriesPerHop = parseInt(rootData.tries_per_hop);
    const maxHopCount = parseInt(rootData.max_hop_count);
    let hopSkipped = false;
    traceResult.address = traceTarget;
    traceResult.tries_per_hop = inTriesPerHop;
    traceResult.hops = [];
    if (hasExceeded) {
      traceResult.reached_destination = false;
      traceResult.all_hops_tested = false;
    } else {
      traceResult.reached_destination = true;
      traceResult.all_hops_tested = true;
    }
    console.log('inNumberOfHops: ', inNumberOfHops);
    for (let hopIndex = 1; hopIndex <= maxHopCount; hopIndex++ ) {
      let inHop = rootData.hops_root[hopIndex.toString()];
      if (!inHop) {
        hopSkipped = true;
        continue;
      } else if (hopSkipped) {
        traceResult.all_hops_tested = false;
      }
      console.log('inHop antes:', inHop);
      inHop = getAllNestedKeysFromObject(
        inHop, Object.keys(traceFields), traceFields,
      );
      console.log('inHop dps:', inHop);
      console.log('inHop rtt times:', inHop.hop_rtt_times );
      let currentHop = {
        ip: inHop.hop_ip_address ? inHop.hop_ip_address : inHop.hop_host,
        ms_values: inHop.hop_rtt_times
          .split(',')
          .filter((e)=>!isNaN(parseInt(e)))
          .map((e)=>parseInt(e).toString()),
      };
      if (currentHop.ip) {
        traceResult.hops.push(currentHop);
      }
    }
  } else {
    traceResult.reached_destination = false;
    traceResult.all_hops_tested = false;
  }
  // ALWAYS set to completed
  traceResult.completed = true;

  device.current_diagnostic.last_modified_at = new Date();
  if (!getNextTraceTarget(device)) {
    device.current_diagnostic.stage = 'done';
    device.current_diagnostic.in_progress = false;
  } else {
    device.current_diagnostic.in_progress = true;
  }

  await device.save().catch((err) => {
    console.log('Error saving device after traceroute test(tr069): ' + err);
  });


  console.log('Trace result depois, pre trap:', traceResult);

  // No await needed
  sio.anlixSendTracerouteNotification(device._id, traceResult);
  // Sending to proper webhooks. Will only send if all tests are completed tho
  deviceHandlers.processTracerouteTraps(device);

  if (device.current_diagnostic.in_progress) {
    startTracerouteDiagnose(device.acs_id);
  }
  return;
};

const calculateFreq = function(rawChannel) {
  const startChannel2Ghz = 1;
  const startChannel5GHz = 36;
  let intRawChannel = parseInt(rawChannel);
  let finalFreq;
  if (intRawChannel >= 36) {
    // 5GHz networks
    finalFreq = 5180 + ((intRawChannel - startChannel5GHz) * 5);
  } else {
    // 2.4GHz networks
    finalFreq = 2412 + ((intRawChannel - startChannel2Ghz) * 5);
  }
  return finalFreq;
};

const calculateSiteSurveyDiagnostic = async function(
  device, cpe, data, siteSurveyFields,
) {
  let rootField = siteSurveyFields.root;
  // We must first check the diagnostic state for errors
  let stateField = rootField + '.' + siteSurveyFields.diag_state;
  let stateFieldList;
  // Make sure we clear wildcards with the appropriate index
  if (stateField.includes('*')) {
    stateFieldList = [
      stateField.replace('*', cpe.modelPermissions().siteSurvey.survey2Index),
      stateField.replace('*', cpe.modelPermissions().siteSurvey.survey5Index),
    ];
  } else {
    stateFieldList = [stateField];
  }
  let stateValues = stateFieldList.map((field)=>{
    return utilHandlers.getFromNestedKey(data, field + '._value');
  });
  // If this model requires polling and some state is still requested, loop poll
  if (
    cpe.modelPermissions().siteSurvey.requiresPolling &&
    stateValues.some((v)=>v.match(/requested/i)) &&
    device.current_diagnostic.recursion_state > 0
  ) {
    device.current_diagnostic.recursion_state--;
    saveCurrentDiagnostic(device, 'initiating', true);
    doPoolingInState(device.acs_id, rootField);
    return;
  }
  // Otherwise, if the diagnostic is not complete, we save the result as error
  if (!stateValues.some((v)=>v.match(/complete/i))) {
    await saveCurrentDiagnostic(device, 'error', false);
    return;
  }
  // We can now read the results from the data provided and store it in database
  let resultField = rootField + '.' + siteSurveyFields.result;
  let resultFieldList;
  // Make sure we clear wildcards with the appropriate index
  if (resultField.includes('*')) {
    resultFieldList = [
      resultField.replace('*', cpe.modelPermissions().siteSurvey.survey2Index),
      resultField.replace('*', cpe.modelPermissions().siteSurvey.survey5Index),
    ];
  } else {
    resultFieldList = [resultField];
  }
  let siteSurveyObjKeys = {
    mac: siteSurveyFields.mac,
    ssid: siteSurveyFields.ssid,
    channel: siteSurveyFields.channel,
    signal: siteSurveyFields.signal,
    band: siteSurveyFields.band,
    mode: siteSurveyFields.mode,
  };
  let neighborAPs = [];
  // Iterate on each result field, for separate interfaces
  resultFieldList.forEach((field)=>{
    let results = utilHandlers.getFromNestedKey(data, field);
    // Filter out meta keys and iterate on the AP indexes
    Object.keys(results).filter((k)=>k[0]!=='_').forEach((apIndex)=>{
      let apData = results[apIndex];
      let result = {};
      // Fetch each data point for this neighbor ap, but only if available
      Object.keys(siteSurveyObjKeys).forEach((key)=>{
        if (apData.hasOwnProperty(siteSurveyObjKeys[key])) {
          result[key] = apData[siteSurveyObjKeys[key]]['_value'];
        }
      });
      // Add it to our result structure
      neighborAPs.push(result);
    });
  });
  // Iterate on our result structure to update/create database entries
  let finalData = [];
  neighborAPs.forEach((ap)=>{
    // Make sure we have a mac and ssid
    if (!ap.mac || !ap.ssid) {
      return;
    }
    // Convert channel to frequency
    if (ap.channel) {
      ap.freq = calculateFreq(ap.channel);
    }
    // Make sure signal is an integer
    if (ap.signal) {
      ap.signal = parseInt(ap.signal);
    }
    // Set default values for bandwidth and vht
    let devWidth = 20;
    let devVHT = false;
    // Bandwidth becomes numerical value received, if received at all
    // Sample values: '20MHz' | '40MHz' | '80MHz'
    if (ap.band && ap.band !== 'Auto' && ap.band.match('[0-9]+') != null) {
      devWidth = parseInt(ap.band.match('[0-9]+')[0]);
    }
    // VHT becomes true if neighbor ap reports its mode as AC
    if (ap.mode && ap.mode.includes('ac')) {
      devVHT = true;
    }
    // Check if this AP is already registered in database, so we know whether to
    // update it or create an entry for it
    let devReg = device.getAPSurveyDevice(ap.mac.toLowerCase());
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
        mac: ap.mac.toLowerCase(),
        ssid: ap.ssid,
        freq: ap.freq,
        signal: ap.signal,
        width: devWidth,
        VHT: devVHT,
        first_seen: Date.now(),
        last_seen: Date.now(),
      });
    }
    finalData.push({mac: ap.mac.toLowerCase()});
  });
  device.last_site_survey = Date.now();
  await saveCurrentDiagnostic(device, 'done', false);
  // Send information to socket.io connections
  sio.anlixSendSiteSurveyNotifications(device._id.toUpperCase(), finalData);
  console.log('Site Survey for device ' + device.acs_id + ' received.');
};


const calculateSpeedDiagnostic = async function(
  device, data, speedKeys, speedFields,
) {
  speedKeys = getAllNestedKeysFromObject(
    data, Object.keys(speedKeys), speedFields,
  );
  let result;
  let speedValueBasic;
  let speedValueFullLoad;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  if (device.current_diagnostic.type == 'speedtest' &&
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

const startTracerouteDiagnose = async function(acsID) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID});
  } catch (err) {
    return {success: false, message: err.message + ' in ' + acsID};
  }
  if (!device) {
    return {success: false, message: t('cpeFindError', {errorline: __line})};
  }

  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;


  let tracerouteTarget = getNextTraceTarget(device);
  if (!tracerouteTarget) {
    // We'are done here
    return;
  }

  let fields = cpe.getModelFields();
  let rootField = fields.diagnostics.traceroute.root;
  let diagnStateField = rootField + '.'
    + fields.diagnostics.traceroute.diag_state;
  let diagnTargetField = rootField + '.'
    + fields.diagnostics.traceroute.target;
  let diagnTriesField = rootField + '.'
    + fields.diagnostics.traceroute.tries_per_hop;
  let diagnTimeoutField = rootField + '.'
    + fields.diagnostics.traceroute.timeout;
  let diagnMaxHops = rootField + '.'
  + fields.diagnostics.traceroute.max_hop_count;

  let triesPerHop = device.traceroute_number_probes;
  let timeout = device.traceroute_max_wait * 1000;
  let maxHops = device.traceroute_max_hops;

  let permissions = cpe.modelPermissions();
  console.log('traceroute permissions: ' , permissions.traceroute );
  triesPerHop = Math.min(triesPerHop, permissions.traceroute.maxProbePerHop);

  let parameterValues = [
    [diagnStateField, 'Requested', 'xsd:string'],
    [diagnTargetField, tracerouteTarget, 'xsd:string'],
    [diagnTriesField, triesPerHop, 'xsd:unsignedInt'],
    [diagnTimeoutField, timeout, 'xsd:unsignedInt'],
    [diagnMaxHops, maxHops, 'xsd:unsignedInt'],
  ];

  let task = {
    name: 'setParameterValues',
    parameterValues: parameterValues,
  };

  const result = await TasksAPI.addTask(acsID, task);
  if (!result.success) {
    console.log('Error starting traceroute diagnose for ' + acsID);
  }
};

const startSiteSurveyDiagnose = async function(acsID) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID});
  } catch (err) {
    return {success: false, message: err.message + ' in ' + acsID};
  }
  if (!device) {
    return {success: false, message: t('cpeFindError', {errorline: __line})};
  }

  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();

  // Diagnostic state field must be added to the root field
  let rootField = fields.diagnostics.sitesurvey.root;
  let stateField = rootField + '.' + fields.diagnostics.sitesurvey.diag_state;
  // In case we have a wildcard, CPE must specify the indexes for each network
  let params = [];
  if (stateField.includes('*')) {
    params = [
      stateField.replace('*', cpe.modelPermissions().siteSurvey.survey2Index),
      stateField.replace('*', cpe.modelPermissions().siteSurvey.survey5Index),
    ];
  } else {
    params = [stateField];
  }

  // Map param fields to task - some devices reject setting both fields at the
  // same time, so we split into two tasks based on the cpe flag
  let task = {name: 'setParameterValues'};
  if (cpe.modelPermissions().siteSurvey.requiresSeparateTasks) {
    task.parameterValues = [[params[0], 'Requested', 'xsd:string']];
  } else {
    task.parameterValues = params.map((p)=>[p, 'Requested', 'xsd:string']);
  }
  let result = await TasksAPI.addTask(acsID, task);
  if (!result.success) {
    return saveCurrentDiagnostic(device, 'error', false);
  }

  // Send the second field if we only sent one of them above
  if (cpe.modelPermissions().siteSurvey.requiresSeparateTasks) {
    let task = {
      name: 'setParameterValues',
      parameterValues: [[params[1], 'Requested', 'xsd:string']],
    };
    let result = await TasksAPI.addTask(acsID, task);
    if (!result.success) {
      return saveCurrentDiagnostic(device, 'error', false);
    }
  }

  // Some CPEs don't respond with a diagnostic success event, so we manually
  // poll for the result state
  if (cpe.modelPermissions().siteSurvey.requiresPolling) {
    doPoolingInState(acsID, rootField);
  }
};

const doPoolingInState = async function(acsID, rootField) {
  // Wait for 5s to pool results
  await new Promise((resolve) => setTimeout(resolve, 5000));
  let task = {
    name: 'getParameterValues',
    parameterNames: [rootField],
  };
  TasksAPI.addTask(acsID, task, fetchDiagnosticsFromGenie);
  return;
};

acsDiagnosticsHandler.triggerDiagnosticResults = async function(device) {
  let acsID = device.acs_id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let fieldToFetch = '';
  console.log('acsDiagnosticsHandler.triggerDiagnosticResults');
  switch (device.current_diagnostic.type) {
    case 'ping':
      fieldToFetch = fields.diagnostics.ping.root;
      break;
    case 'speedtest':
      fieldToFetch = fields.diagnostics.speedtest.root;
      break;
    case 'traceroute':
      fieldToFetch = fields.diagnostics.traceroute.root;
      break;
    case 'sitesurvey':
      fieldToFetch = fields.diagnostics.sitesurvey.root;
      break;
    default:
      return;
  }
  let task = {
    name: 'getParameterValues',
    parameterNames: [fieldToFetch],
  };
  TasksAPI.addTask(acsID, task, fetchDiagnosticsFromGenie);
};

const fetchDiagnosticsFromGenie = async function(acsID) {
  console.log('fetchDiagnosticsFromGenie');
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
    traceroute: {
      diag_state: '',
      number_of_hops: '',
      target: '',
      tries_per_hop: '',
      max_hop_count: '',
      hops_root: '',
      hop_host: '',
      hop_ip_address: '',
      hop_error_code: '',
      hop_rtt_times: '',
    },
    sitesurvey: {
      diag_state: '',
      result: '',
    },
  };

  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();

  let diagType = device.current_diagnostic.type;
  let keys = {};
  let genieFields = {};
  if (diagType === 'ping') {
    keys = diagNecessaryKeys.ping;
    genieFields = fields.diagnostics.ping;
  } else if (diagType === 'speedtest') {
    keys = diagNecessaryKeys.speedtest;
    genieFields = fields.diagnostics.speedtest;
  } else if (diagType === 'traceroute') {
    keys = diagNecessaryKeys.traceroute;
    genieFields = fields.diagnostics.traceroute;
  } else if (diagType === 'sitesurvey') {
    keys = diagNecessaryKeys.sitesurvey;
    genieFields = fields.diagnostics.sitesurvey;
  }
  for (let key in keys) {
    if (genieFields.hasOwnProperty(key)) {
      // Remove wildcards, fetch everything before them
      let param = genieFields[key];
      // sitesurvey & traceroute both uses fields relative to root node
      if (diagType === 'sitesurvey') {
        param = fields.diagnostics.sitesurvey.root + '.' + param;
      } else if (diagType === 'traceroute') {
        param = fields.diagnostics.traceroute.root + '.' + param;
      }
      parameters.push(param.replace(/\.\*.*/g, ''));
    }
  }

  let query = {_id: acsID};
  let path = '/devices/?query=' + JSON.stringify(query) +
    '&projection=' + parameters.join(',');
  let options = {
    protocol: 'http:',
    method: 'GET',
    hostname: GENIEHOST,
    port: GENIEPORT,
    path: encodeURI(path),
  };
  let request = http.request(options, (response) => {
    let chunks = [];
    response.on('error', (error) => console.log(error));
    response.on('data', async (chunk) => chunks.push(chunk));
    response.on('end', async (chunk) => {
      let body = Buffer.concat(chunks);
      try {
        let data = JSON.parse(body)[0];
        let permissions = DeviceVersion.devicePermissions(device);
        if (!permissions) {
          console.log('Failed: genie can\'t check device permissions');
        } else if (!device.current_diagnostic.in_progress) {
          console.log('Genie diagnostic received but ' +
            'current_diagnostic.in_progress==false');
        } else if (permissions.grantPingTest && diagType == 'ping') {
          await calculatePingDiagnostic(
            device, cpe, data,
            diagNecessaryKeys.ping,
            fields.diagnostics.ping,
          );
        } else if (permissions.grantSpeedTest && diagType == 'speedtest') {
          await calculateSpeedDiagnostic(
            device, data, diagNecessaryKeys.speedtest,
            fields.diagnostics.speedtest,
          );
        } else if (permissions.grantTraceroute && diagType == 'traceroute') {
          await calculateTraceDiagnostic(
            device, data, fields.diagnostics.traceroute,
          );
        } else if (permissions.grantSiteSurvey && diagType == 'sitesurvey') {
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
    return {
      success: false,
      message: t('cpeFindError', {errorline: __line}),
    };
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
    return {
      success: false,
      message: t('cpeFindError', {errorline: __line}),
    };
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
  if (!device || !device.use_tr069 || !device.acs_id) {
    return {
      success: false,
      message: t('cpeFindError', {errorline: __line}),
    };
  }
  let acsID = device.acs_id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let traceRouteRootField = fields.diagnostics.traceroute.root;
  // We need to update the parameter values before we fire the traceroute
  let task = {
    name: 'getParameterValues',
    parameterNames: [traceRouteRootField],
  };
  const result = await TasksAPI.addTask(acsID, task, startTracerouteDiagnose);
  if (result.success) {
    return {success: true, message: t('operationSuccessful')};
  } else {
    return {
      success: false, message: t('acsSpeedTestError', {errorline: __line}),
    };
  }
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
    saveCurrentDiagnostic(device, 'error', false);
    return {
      success: false, message: t('acsSiteSurveyError', {errorline: __line}),
    };
  }
};

module.exports = acsDiagnosticsHandler;
