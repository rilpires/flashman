/* eslint-disable no-async-promise-executor */
/* eslint-disable no-prototype-builtins */
/* global __line */

const Validator = require('../public/javascripts/device_validator');
const DevicesAPI = require('./external-genieacs/devices-api');
const messaging = require('./messaging');
const DeviceModel = require('../models/device');
const User = require('../models/user');
const DeviceVersion = require('../models/device_version');
const Notifications = require('../models/notification');
const Config = require('../models/config');
const Role = require('../models/role');
const firmware = require('./firmware');
const mqtt = require('../mqtts');
const sio = require('../sio');
const acsFirmwareHandler = require('./handlers/acs/firmware');
const acsAccessControlHandler = require('./handlers/acs/access_control');
const acsDiagnosticsHandler = require('./handlers/acs/diagnostics');
const acsPortForwardHandler = require('./handlers/acs/port_forward');
const acsMeshDeviceHandler = require('./handlers/acs/mesh');
const deviceHandlers = require('./handlers/devices');
const meshHandlers = require('./handlers/mesh');
const util = require('./handlers/util');
const controlApi = require('./external-api/control');
const acsDeviceInfo = require('./acs_device_info.js');
const {Parser} = require('json2csv');
const crypto = require('crypto');
const path = require('path');
const t = require('./language').i18next.t;

let deviceListController = {};

const fs = require('fs');
const unzipper = require('unzipper');
const request = require('request');
const md5File = require('md5-file');
const requestPromise = require('request-promise-native');
const imageReleasesDir = process.env.FLM_IMG_RELEASE_DIR;

const stockFirmwareLink = 'https://cloud.anlix.io/s/KMBwfD7rcMNAZ3n/download?path=/&files=';

const intToWeekDayStr = function(day) {
  if (day === 0) return t('Sunday');
  if (day === 1) return t('Monday');
  if (day === 2) return t('Tuesday');
  if (day === 3) return t('Wednesday');
  if (day === 4) return t('Thursday');
  if (day === 5) return t('Friday');
  if (day === 6) return t('Saturday');
  return '';
};

// if allSettled is not defined in Promise, we define it here.
if (Promise.allSettled === undefined) {
  Promise.allSettled = function allSettled(promises) {
    let wrappedPromises = promises.map((p) => Promise.resolve(p)
      .then(
        (val) => ({status: 'fulfilled', value: val}),
        (err) => ({status: 'rejected', reason: err})));
    return Promise.all(wrappedPromises);
  };
}

const escapeRegExp = function(string) {
  // $& means the whole matched string
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

deviceListController.getReleases = async function(role,
                                                  isSuperuser,
                                                  modelAsArray=false) {
  let filenames = fs.readdirSync(imageReleasesDir);
  let releases = await firmware.getReleases(filenames, role,
                                            isSuperuser, modelAsArray);
  return releases;
};

const getOnlineCount = async function(query, mqttClients, lastHour,
 tr069Times) {
  let status = {};
  status.onlinenum = 0;
  status.recoverynum = 0;
  status.offlinenum = 0;

  // the queries for each status count. they each countain a query to select
  // each router type, flashbox or onu/tr069, inside the $or array.
  let onlineQuery = {
    $or: [ // 1st: flashbox devices; 2nd: tr069 devices.
      {_id: {$in: mqttClients}},
      {last_contact: {$gte: tr069Times.recovery}},
    ],
  };
  let recoveryQuery = {
    $or: [ // 1st: flashbox devices; 2nd: tr069 devices.
      {_id: {$nin: mqttClients}, last_contact: {$gte: lastHour.getTime()}},
      {last_contact: {$lt: tr069Times.recovery, $gte: tr069Times.offline}},
    ],
  };
  let offlineQuery = {
    $or: [ // 1st: flashbox devices; 2nd: tr069 devices.
      {_id: {$nin: mqttClients}, last_contact: {$lt: lastHour.getTime()}},
      {last_contact: {$lt: tr069Times.offline}},
    ],
  };
  let queries = [onlineQuery, recoveryQuery, offlineQuery];
  // adding the parameter that will defined the router type for each count.
  for (let i = 0; i < queries.length; i++) {
    // a selector for flashbox devices.
    queries[i].$or[0].use_tr069 = {$ne: true};
    queries[i].$or[1].use_tr069 = true; // a selector for tr069 devices.
  }

  // issue the count for each status and the mesh count in parallel.
  let counts = await Promise.all([
    DeviceModel.countDocuments({$and: [onlineQuery, query]}).exec(),
    DeviceModel.countDocuments({$and: [recoveryQuery, query]}).exec(),
    DeviceModel.countDocuments({$and: [offlineQuery, query]}).exec(),
    getOnlineCountMesh(query, lastHour),
  ]);
  // adding each count to their respective status.
  status.onlinenum += counts[0]+counts[3].onlinenum;
  status.recoverynum += counts[1]+counts[3].recoverynum;
  status.offlinenum += counts[2]+counts[3].offlinenum;

  // add total
  status.totalnum = status.offlinenum+status.recoverynum+status.onlinenum;
  return status; // resolve with the counts.
};

const getOnlineCountMesh = function(query, lastHour) {
  return new Promise((resolve, reject)=> {
    let meshQuery = {$and: [{mesh_mode: {$gt: 0}}, query]};
    let status = {onlinenum: 0, recoverynum: 0, offlinenum: 0};
    lastHour = lastHour.getTime();
    let options = {'_id': 1, 'mesh_master': 1, 'mesh_slaves': 1};

    const mqttClients = Object.values(mqtt.unifiedClientsMap)
    .reduce((acc, curr) => {
      return acc.concat(Object.keys(curr));
    }, []);

    DeviceModel.find(meshQuery, options, function(err, devices) {
      if (!err) {
        meshHandlers.enhanceSearchResult(devices).then((extra)=>{
          extra.forEach((e)=>{
            if (mqttClients.includes(e._id)) status.onlinenum += 1;
            else if (e.last_contact >= lastHour) status.recoverynum += 1;
            else status.offlinenum += 1;
          });
          return resolve(status);
        });
      } else {
        return reject(err);
      }
    });
  });
};

deviceListController.sendCustomPing = async function(
  device, reqBody, username, sessionID,
) {
  let err = checkNewDiagnosticAvailability(device);
  if (err) {
    return err;
  }

  let inputHosts = [];
  if (reqBody.content && Array.isArray(reqBody.content.hosts) ) {
    inputHosts = reqBody.content.hosts.filter((h) => typeof(h) == 'string');
  } else {
    return {
      success: false,
      message: t('fieldNameInvalid', {name: 'hosts', errorline: __line}),
    };
  }

  let hostFilter = (host) => host.match(util.fqdnLengthRegex);
  let approvedTempHosts = [];
  approvedTempHosts = inputHosts.map((host)=>host.toLowerCase());
  approvedTempHosts = approvedTempHosts.filter(hostFilter);
  approvedTempHosts = Array.from(new Set(approvedTempHosts));

  if (approvedTempHosts.length == 0) {
    return {
      success: false,
      message: t('fieldNameInvalid', {name: 'hosts', errorline: __line}),
    };
  }

  let now = new Date();
  device.current_diagnostic = {
    type: 'ping',
    stage: 'initiating',
    customized: true,
    in_progress: true,
    started_at: now,
    last_modified_at: now,
    targets: approvedTempHosts,
    user: username,
    webhook_url: '',
    webhook_user: '',
    webhook_secret: '',
  };

  if (typeof reqBody.content.webhook == 'object' &&
      typeof(device.current_diagnostic.webhook_url) == 'string'
  ) {
    device.current_diagnostic.webhook_url = reqBody.content.webhook.url;
    if (typeof reqBody.content.webhook.user == 'string' &&
        typeof reqBody.content.webhook.secret == 'string'
    ) {
      device.current_diagnostic.webhook_user = reqBody.content.webhook.user;
      device.current_diagnostic.webhook_secret =
        reqBody.content.webhook.secret;
    }
  }

  return await initiatePingCommand(device, username, sessionID);
};

deviceListController.sendGenericPing = async function(
  device, username, sessionID,
) {
  let err = checkNewDiagnosticAvailability(device);
  if (err) {
    return err;
  }
  if (device.ping_hosts.length==0) {
    return {
      success: false,
      message: t('fieldNameInvalid', {name: 'hosts', errorline: __line}),
    };
  }

  let now = new Date();
  device.current_diagnostic = {
    type: 'ping',
    stage: 'initiating',
    customized: false,
    in_progress: true,
    started_at: now,
    last_modified_at: now,
    targets: device.ping_hosts.map((item) => item),
    user: username,
    webhook_url: '',
    webhook_user: '',
    webhook_secret: '',
  };

  return await initiatePingCommand(device, username, sessionID);
};

deviceListController.sendCustomSpeedTest = async function(
  device, reqBody, username, sessionID,
) {
  let err = checkNewDiagnosticAvailability(device);
  if (err) {
    return err;
  }

  let validationOk = true;
  let invalidField = '';
  if (typeof reqBody.content != 'object') {
    validationOk = false;
    invalidField = 'url';
  } else if (typeof reqBody.content.url != 'string'||
          !util.urlRegex.test(reqBody.content.url)
  ) {
    validationOk = false;
    invalidField = 'url';
  } else if ( reqBody.content.webhook) {
    validationOk = false;
    if (typeof reqBody.content.webhook != 'object') {
      invalidField = 'content.webhook';
    } else if (typeof reqBody.content.webhook.url != 'string') {
      invalidField = 'content.webhook.url';
    } else if (reqBody.content.webhook.user &&
                typeof reqBody.content.webhook.user != 'string'
    ) {
      invalidField = 'content.webhook.user';
    } else if (reqBody.content.webhook.secret &&
                typeof reqBody.content.webhook.secret != 'string'
    ) {
      invalidField = 'content.webhook.secret';
    } else {
      validationOk = true;
    }
  }

  if (!validationOk) {
    return {
      success: false,
      message: t('fieldNameInvalid', {name: invalidField, errorline: __line}),
    };
  }

  let now = new Date();
  device.current_diagnostic = {
    type: 'speedtest',
    stage: 'measure',
    customized: true,
    in_progress: true,
    started_at: now,
    last_modified_at: now,
    targets: [reqBody.content.url],
    user: username,
    webhook_url: '',
    webhook_user: '',
    webhook_secret: '',
  };

  if (typeof reqBody.content.webhook == 'object' &&
      typeof device.current_diagnostic.webhook_url == 'string'
  ) {
    let webhook = reqBody.content.webhook;
    device.current_diagnostic.webhook_url = webhook.url;
    if (typeof webhook.user == 'string' &&
        typeof webhook.secret == 'string'
    ) {
      device.current_diagnostic.webhook_user = webhook.user;
      device.current_diagnostic.webhook_secret = webhook.secret;
    }
  }

  return await initiateSpeedTest(device, username, sessionID);
};

deviceListController.sendGenericSpeedTest = async function(
  device, username, sessionID,
) {
  let err = checkNewDiagnosticAvailability(device);
  if (err) {
    return err;
  }
  let projection = {measureServerIP: true, measureServerPort: true};
  let config;
  try {
    config =
      await Config.findOne({is_default: true}, projection).lean().exec();
  } catch (e) {
    return {
      success: false,
      message: t('configFindError', {errorline: __line}),
    };
  }

  if (!config.measureServerIP || !config.measureServerPort) {
    return {
      success: false,
      message: t('serviceNotConfiguredByAdmin'),
    };
  }
  let now = new Date();
  // TR069 doesnt use 'targets' field.
  let firmwareUrl = config.measureServerIP + ':' + config.measureServerPort;
  device.current_diagnostic = {
    type: 'speedtest',
    stage: 'estimative',
    customized: false,
    in_progress: true,
    started_at: now,
    last_modified_at: now,
    targets: [firmwareUrl],
    user: username,
    webhook_url: '',
    webhook_user: '',
    webhook_secret: '',
  };
  return await initiateSpeedTest(device, username, sessionID);
};

deviceListController.sendCustomTraceRoute = async function(
  device, reqBody, username, sessionID,
) {
  let err = checkNewDiagnosticAvailability(device);
  if (err) {
    return err;
  }

  // Validation is basically the same as custom ping command
  let inputHosts = [];
  if (reqBody.content && Array.isArray(reqBody.content.hosts) ) {
    inputHosts = reqBody.content.hosts.filter((h) => typeof(h) == 'string');
  } else {
    return {
      success: false,
      message: t('fieldNameInvalid', {name: 'hosts', errorline: __line}),
    };
  }

  let hostFilter = (host) => host.match(util.fqdnLengthRegex);
  let approvedTempHosts = [];
  approvedTempHosts = inputHosts.map((host)=>host.toLowerCase());
  approvedTempHosts = approvedTempHosts.filter(hostFilter);
  approvedTempHosts = Array.from(new Set(approvedTempHosts));

  if (approvedTempHosts.length == 0) {
    return {
      success: false,
      message: t('fieldNameInvalid', {name: 'hosts', errorline: __line}),
    };
  }


  let now = new Date();
  device.current_diagnostic = {
    type: 'traceroute',
    stage: 'initiating',
    customized: true,
    in_progress: true,
    started_at: now,
    last_modified_at: now,
    targets: approvedTempHosts,
    user: username,
    webhook_url: '',
    webhook_user: '',
    webhook_secret: '',
  };


  if (typeof reqBody.content.webhook == 'object' &&
      typeof device.current_diagnostic.webhook_url == 'string'
  ) {
    let webhook = reqBody.content.webhook;
    device.current_diagnostic.webhook_url = webhook.url;
    if (typeof webhook.user == 'string' &&
        typeof webhook.secret == 'string'
    ) {
      device.current_diagnostic.webhook_user = webhook.user;
      device.current_diagnostic.webhook_secret = webhook.secret;
    }
  }

  return await initiateTracerouteTest(device, username, sessionID);
};

deviceListController.sendGenericTraceRoute = async function(
  device, username, sessionID,
) {
  let err = checkNewDiagnosticAvailability(device);
  if (err) {
    return err;
  }

  let now = new Date();
  device.current_diagnostic = {
    type: 'traceroute',
    stage: 'initiating',
    customized: false,
    in_progress: true,
    started_at: now,
    last_modified_at: now,
    targets: device.ping_hosts.map((e)=>e),
    user: username,
    webhook_url: '',
    webhook_user: '',
    webhook_secret: '',
  };

  return await initiateTracerouteTest(device, username, sessionID);
};

deviceListController.sendGenericSiteSurvey = async function(
  device, username, sessionID,
) {
  let err = checkNewDiagnosticAvailability(device);
  if (err) {
    return err;
  }

  let now = new Date();
  device.current_diagnostic = {
    type: 'sitesurvey',
    stage: 'initiating',
    customized: false,
    in_progress: true,
    started_at: now,
    last_modified_at: now,
    user: username,
    webhook_url: '',
    webhook_user: '',
    webhook_secret: '',
  };

  return await initiateSiteSurvey(device, username, sessionID);
};

// This should be called right after sendCustomPingTest or sendGenericPingTest
// Common validations and device.save goes here
const initiatePingCommand = async function(device, username, sessionID) {
  let permissions = DeviceVersion.devicePermissions(device);
  if (!permissions.grantPingTest) {
    return {
      success: false,
      message: t('cpeWithoutCommand'),
    };
  }

  // Validated from here. Saving device & validating stuffs
  device.pingtest_results =
    device.current_diagnostic.targets.map((item) => ({host: item}));
  await device.save().catch((err) => {
    console.log('Error saving device after ping command: ' + err);
  });
  if (sessionID && sio.anlixConnections[sessionID]) {
    sio.anlixWaitForPingTestNotification(
      sessionID, device._id.toUpperCase(),
    );
  }

  if (device.use_tr069) {
    return await acsDiagnosticsHandler.firePingDiagnose(device);
  } else {
    mqtt.anlixMessageRouterPingTest(device._id.toUpperCase());
    return {success: true};
  }
};

// This should be called right after sendCustomSpeedTest or sendGenericSpeedTest
// Common validations and device.save goes here
const initiateSpeedTest = async function(device, username, sessionID) {
  let mac = device._id;
  if (!device.use_tr069) {
    const isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
      return map[mac];
    });
    if (!isDevOn) {
      return {
        success: false,
        message: t('cpeNotOnline', {errorline: __line}),
      };
    }
  }
  let permissions = DeviceVersion.devicePermissions(device);
  if (!permissions.grantSpeedTest) {
    return {
      success: false,
      message: t('cpeWithoutCommand'),
    };
  }

  // Everything is validated now. Proceed to save & trigger stuffs
  if (sessionID && sio.anlixConnections[sessionID]) {
    sio.anlixWaitForSpeedTestNotification(sessionID, mac);
  }
  await device.save().catch((err)=>{
    return {
      success: false,
      message: t('cpeSaveError', {errorline: __line}),
    };
  });

  if (device.use_tr069) {
    let fireResult = await acsDiagnosticsHandler.fireSpeedDiagnose(device);
    return fireResult;
  } else {
    if (device.current_diagnostic.customized) {
      if (!permissions.grantCustomSpeedTest) {
        return {
          success: false,
          message: t('cpeWithoutCommand'),
        };
      } else {
        mqtt.anlixMessageRouterSpeedTestRaw(mac, username);
      }
    } else {
      mqtt.anlixMessageRouterSpeedTest(mac,
        device.current_diagnostic.targets[0], username);
    }
    return {success: true};
  }
};

// This should be called right after sendGenericSiteSurvey
// Common validations and device.save goes here
const initiateSiteSurvey = async function(device, username, sessionID) {
  let permissions = DeviceVersion.devicePermissions(device);
  if (!permissions.grantSiteSurvey) {
    return {
      success: false,
      message: t('cpeWithoutCommand'),
    };
  }

  // Validated from here. Saving device & validating stuffs
  await device.save().catch((err) => {
    console.log('Error saving device after site survey command: ' + err);
  });
  if (sessionID && sio.anlixConnections[sessionID]) {
    sio.anlixWaitForSiteSurveyNotification(
      sessionID, device._id.toUpperCase(),
    );
  }

  if (device.use_tr069) {
    return await acsDiagnosticsHandler.fireSiteSurveyDiagnose(device);
  } else {
    mqtt.anlixMessageRouterSiteSurvey(device._id.toUpperCase());
    return {success: true};
  }
};

// This should be called right after sendCustomTraceRoute
// or sendGenericTraceRoute. Common validations and device.save goes here
const initiateTracerouteTest = async function(device, username, sessionID) {
  let permissions = DeviceVersion.devicePermissions(device);
  if (!permissions.grantTraceroute) {
    return {
      success: false,
      message: t('cpeWithoutCommand'),
    };
  }

  // Validated from here. Saving device & validating stuffs
  device.traceroute_results =
    device.current_diagnostic.targets.map((host)=>({address: host}));
  await device.save().catch((err)=>{
    return {
      success: false,
      message: t('cpeSaveError', {errorline: __line}),
    };
  });
  if (sessionID && sio.anlixConnections[sessionID]) {
    sio.anlixWaitForTracerouteNotification(
      sessionID, device._id.toUpperCase(),
    );
  }

  // Start Traceroute
  if (device.use_tr069) {
    return await acsDiagnosticsHandler.fireTraceDiagnose(device);
  } else {
    mqtt.anlixMessageRouterTraceroute(
      device._id,
      device.traceroute_max_hops,
      device.traceroute_number_probes,
      device.traceroute_max_wait,
    );
  }
  return {success: true};
};

// Common validation used by all diagnostics
const checkNewDiagnosticAvailability = function(device) {
  if (!device) {
    return {
      success: false,
      message: t('cpeNotFound', {errorline: __line}),
    };
  }
  const msSinceLastModified =
    new Date() - device.current_diagnostic.last_modified_at;
  const timeoutThresholdMs = 2 * 60 * 1000; // 2 minutes;
  if (!isNaN(msSinceLastModified) &&
      msSinceLastModified<timeoutThresholdMs &&
      device.current_diagnostic.in_progress
  ) {
    return {
      success: false,
      message: t('diagnosticInProgress'),
    };
  }
};

// Main page
deviceListController.index = function(req, res) {
  let indexContent = {};
  let elementsPerPage = 10;

  if (req.user.maxElementsPerPage) {
    elementsPerPage = req.user.maxElementsPerPage;
  }
  indexContent.username = req.user.name;
  indexContent.elementsperpage = elementsPerPage;
  indexContent.visiblecolumnsonpage = req.user.visibleColumnsOnPage;

  // Check Flashman automatic update availability
  if (typeof process.env.FLM_DISABLE_AUTO_UPDATE !== 'undefined' && (
             process.env.FLM_DISABLE_AUTO_UPDATE === 'true' ||
             process.env.FLM_DISABLE_AUTO_UPDATE === true)
  ) {
    indexContent.disableAutoUpdate = true;
  } else {
    indexContent.disableAutoUpdate = false;
  }

  // Check Flashman data collecting availability
  if (typeof process.env.FLM_ENABLE_DATA_COLLECTING !== 'undefined' && (
             process.env.FLM_ENABLE_DATA_COLLECTING === 'true' ||
             process.env.FLM_ENABLE_DATA_COLLECTING === true)
  ) {
    indexContent.enable_data_collecting = true;
  } else {
    indexContent.enable_data_collecting = false;
  }

  User.findOne({name: req.user.name}, function(err, user) {
    if (err || !user) {
      indexContent.superuser = false;
    } else {
      indexContent.superuser = user.is_superuser;
    }

    let query = {is_default: true};
    Config.findOne(query).lean().exec(function(err, matchedConfig) {
      if (err || !matchedConfig) {
        indexContent.update = false;
      } else {
        indexContent.update = matchedConfig.hasUpdate;
        indexContent.majorUpdate = matchedConfig.hasMajorUpdate;
        indexContent.minlengthpasspppoe = matchedConfig.pppoePassLength;
        indexContent.update_schedule = {
          is_active: matchedConfig.device_update_schedule.is_active,
          device_total: matchedConfig.device_update_schedule.device_count,
        };
        if (matchedConfig.device_update_schedule.device_count > 0) {
          // Has a previous configuration saved
          let params = matchedConfig.device_update_schedule;
          let rule = params.rule;
          indexContent.update_schedule['is_aborted'] = params.is_aborted;
          indexContent.update_schedule['date'] = params.date;
          indexContent.update_schedule['use_csv'] = params.used_csv;
          indexContent.update_schedule['use_search'] = params.used_search;
          indexContent.update_schedule['use_time'] = params.used_time_range;
          indexContent.update_schedule['time_ranges'] =
            params.allowed_time_ranges.map((r)=>{
              return {
                start_day: intToWeekDayStr(r.start_day),
                end_day: intToWeekDayStr(r.end_day),
                start_time: r.start_time,
                end_time: r.end_time,
              };
            });
          indexContent.update_schedule['release'] = params.rule.release;
          let todo = rule.to_do_devices.length;
          rule.to_do_devices.forEach((d)=>{
            if (d.slave_count > 0) {
              todo += d.slave_count;
            }
          });
          let inProgress = rule.in_progress_devices.length;
          rule.in_progress_devices.forEach((d)=>{
            if (d.slave_count > 0) {
              inProgress += d.slave_count;
            }
          });
          let doneList = rule.done_devices.filter((d)=>d.state==='ok');
          let done = doneList.length;
          doneList.forEach((d)=>{
            if (d.slave_count > 0) {
              done += d.slave_count;
            }
          });
          let errorList = rule.done_devices.filter((d)=>d.state!=='ok');
          let derror = errorList.length;
          errorList.forEach((d)=>{
            if (d.slave_count > 0) {
              derror += d.slave_count;
            }
          });
          indexContent.update_schedule['device_doing'] =
            rule.in_progress_devices.length;
          indexContent.update_schedule['device_to_do'] = todo + inProgress;
          indexContent.update_schedule['device_done'] = done;
          indexContent.update_schedule['device_error'] = derror;
          indexContent.update_schedule['device_total'] =
            todo + inProgress + done + derror;
        }
      }

      // Filter data using user permissions
      if (req.user.is_superuser) {
        return res.render('index', indexContent);
      } else {
        Role.findOne({name: req.user.role}, function(err, role) {
          if (err) {
            console.log(err);
          }
          indexContent.role = role;
          return res.render('index', indexContent);
        });
      }
    });
  });
};

deviceListController.changeUpdate = async function(req, res) {
  let matchedDevice;
  let error;
  try {
    matchedDevice = await DeviceModel.findByMacOrSerial(req.params.id);
    if (Array.isArray(matchedDevice) && matchedDevice.length > 0) {
      matchedDevice = matchedDevice[0];
    } else {
      return res.status(500).json({success: false,
                                   message: t('cpeNotFound',
                                    {errorline: __line})});
    }
  } catch (e) {
    error = e;
  }
  if (error || !matchedDevice) {
    return res.status(500).json({success: false,
      message: t('cpeFindError', {errorline: __line})});
  }
  // Cast to boolean so that javascript works as intended
  let doUpdate = req.body.do_update;
  if (typeof req.body.do_update === 'string') {
    doUpdate = (req.body.do_update === 'true');
  }
  // Reject update command to mesh slave, use command on mesh master instead
  if (matchedDevice.mesh_master && doUpdate) {
    return res.status(500).json({
      success: false,
      message: t('meshSecondaryUpdateError'),
    });
  }
  // Mesh upgrade logic
  if (matchedDevice.mesh_slaves && matchedDevice.mesh_slaves.length > 0) {
    if (doUpdate) {
      matchedDevice.release = req.params.release.trim();
      const meshUpdateStatus = await meshHandlers.beginMeshUpdate(
        matchedDevice,
      );
      if (!meshUpdateStatus.success) {
        return res.status(500).json({
          success: false,
          message: t('updateStartFailedMeshNetwork'),
        });
      }
    } else {
      await meshHandlers.syncUpdateCancel(matchedDevice);
    }
    return res.status(200).json({'success': true});
  // Simple CPE upgrade logic
  } else {
    if (doUpdate) {
      matchedDevice.release = req.params.release.trim();
      matchedDevice.do_update_status = 0; // waiting
      messaging.sendUpdateMessage(matchedDevice);
    } else {
      matchedDevice.do_update_status = 1; // success
    }
    matchedDevice.do_update = doUpdate;
    try {
      await matchedDevice.save();
    } catch (e) {
      return res.status(500).json({success: false,
        message: t('cpeSaveError', {errorline: __line})});
    }
    if (matchedDevice.use_tr069 && doUpdate) {
      let response = await acsFirmwareHandler.upgradeFirmware(matchedDevice);
      if (response.success) {
        return res.status(200).json(response);
      } else {
        return res.status(500).json(response);
      }
    } else if (doUpdate) {
      mqtt.anlixMessageRouterUpdate(matchedDevice._id);
      // Start ack timeout
      deviceHandlers.timeoutUpdateAck(matchedDevice._id, 'update');
    }
    return res.status(200).json({'success': true});
  }
};

deviceListController.retryMeshUpdate = function(req, res) {
  let fieldsToUpdate = {release: req.params.release.trim()};
  meshHandlers.updateMeshDevice(
    req.params.id, fieldsToUpdate,
  );
  return res.status(200).json({success: true});
};

deviceListController.simpleSearchDeviceQuery = function(queryContents) {
  let finalQuery = {};
  let queryContentNoCase = new RegExp('^' + escapeRegExp(queryContents[0]) +
                                      '$', 'i');
  if (queryContents[0].length > 0) {
    finalQuery.$or = [
      {pppoe_user: queryContentNoCase},
      {_id: queryContentNoCase},
      {serial_tr069: queryContentNoCase},
      {alt_uid_tr069: queryContentNoCase},
      {'external_reference.data': queryContentNoCase},
    ];
  } else {
    finalQuery = {_id: ''};
  }
  return finalQuery;
};

deviceListController.complexSearchDeviceQuery = async function(queryContents,
 mqttClients, currentTimestamp, tr069Times) {
  let finalQuery = {};
  let finalQueryArray = [];

  // Defaults to match all query contents
  let queryLogicalOperator = '$and';
  if (queryContents.includes(t('/or'))) {
    queryLogicalOperator = '$or';
    queryContents = queryContents.filter((query) => query !== t('/or'));
  }
  queryContents = queryContents.filter((query) => query !== t('/and'));
  // setting higher level logical operator for 'finalQuery'.
  finalQuery[queryLogicalOperator] = finalQueryArray;

  // tags that are computed differently for each communication protocol.
  let statusTags = {
    'online': new RegExp(`^${t('online')}$`), // /^online$/
    'online>': new RegExp(`^${t('online')} >.*`), // /^online >.*/
    'recovery': new RegExp(`^${t('unstable')}$`), // /^instavel$/
    'offline': new RegExp(`^${t('offline')}$`), // /^offline$/
    'offline>': new RegExp(`^${t('offline')} >.*`), // /^offline >.*/
    'alerta': new RegExp(`^${t('alert')}$`), // /^alerta/
  };
  // mapping to regular expression because one tag has a parameter inside and
  // won't make an exact match, but the other tags need to be exact. This will
  // help with "Array.some((r) => r.test(tag))".

  let matchedConfig; // will be assigned a value if it reaches a place where
  // it's being used.

  for (let idx=0; idx < queryContents.length; idx++) {
    let tag = queryContents[idx].toLowerCase(); // assigning tag to variable.
    let query = {}; // to be appended to array of queries used in pagination.

    // if tag affects both flashboxes and ONUs.
    if (Object.values(statusTags).some((r) => r.test(tag))) {
    // We need more than one query for each controller protocol.

      // Some functions already had 'mqttClients' built in scope, so they pass
      // it as argument. For the functions that don't, they can keep that
      // argument undefined, in which case we built it here.
      if (mqttClients === undefined) {
        mqttClients = mqtt.getConnectedClients();
      }
      currentTimestamp = currentTimestamp || Date.now();
      let lastHour = new Date(currentTimestamp -3600000);
      tr069Times = tr069Times ||
        await deviceHandlers.buildTr069Thresholds(currentTimestamp);

      // variables that will hold one query for each controller protocol.
      let flashbox; let tr069;

      // each tag has their specific query for each controller protocol.
      if (statusTags['online'].test(tag)) {
        flashbox = {
          _id: {$in: mqttClients},
        };
        tr069 = {last_contact: {$gte: tr069Times.recovery}};
      } else if (statusTags['alerta'].test(tag)) {
        const targets = await Notifications.distinct('target').exec();
        flashbox = {
          _id: {$in: targets},
        };
        tr069 = {_id: {$in: targets}};
      } else if (statusTags['recovery'].test(tag)) {
        flashbox = {
          _id: {$nin: mqttClients},
          last_contact: {$gte: lastHour},
        };
        tr069 = {
          last_contact: {$lt: tr069Times.recovery, $gte: tr069Times.offline},
        };
      } else if (statusTags['offline'].test(tag)) {
        flashbox = {
          _id: {$nin: mqttClients},
          last_contact: {$lt: lastHour},
        };
        tr069 = {last_contact: {$lt: tr069Times.offline}};
      } else if (statusTags['offline>'].test(tag)) {
        const parsedHour = Math.abs(parseInt(tag.split('>')[1]));
        const hourThreshold = !isNaN(parsedHour) ? parsedHour*3600000 : 0;
        flashbox = {
          _id: {$nin: mqttClients},
          last_contact: {$lt: new Date(lastHour - hourThreshold)},
        };
        tr069 = {last_contact:
          {$lt: new Date(tr069Times.offline - hourThreshold)},
        };
      } else if (statusTags['online>'].test(tag)) {
        const parsedHour = Math.abs(parseInt(tag.split('>')[1]));
        const hourThreshold = !isNaN(parsedHour) ? parsedHour * 3600000 : 0;
        flashbox = {
          _id: {$in: mqttClients},
          wan_up_time: {$gte: parseInt(hourThreshold / 1000)},
        };
        tr069 = {
          wan_up_time: {$gte: parseInt(hourThreshold / 1000)},
          last_contact: {$gte: tr069Times.recovery},
        };
      }
      flashbox.use_tr069 = {$ne: true}; // this will select only flashbox.
      tr069.use_tr069 = true; // this will select only tr069.
      query.$or = [flashbox, tr069]; // select either one.
    } else if (new RegExp(`^(?:${t('update')}|${t('upgrade')}) ` +
    `(?:${t('on')}|${t('off')})$`).test(tag)) {
      // update|upgrade on|off.
      query.use_tr069 = {$ne: true}; // only for flashbox.
      if (tag.includes(t('on'))) { // 'update on' or 'upgrade on'.
        query.do_update = {$eq: true};
      } else if (tag.includes(t('off'))) { // 'update off' or 'upgrade off'.
        query.do_update = {$eq: false};
      }
    } else if (new RegExp(`^${t('collecting')} ` +
    `(?:${t('on')}|${t('off')})$`).test(tag)) { // data collecting.
      query.use_tr069 = {$ne: true}; // only for flashbox.
      if (tag.includes(t('on'))) {
        query['data_collecting.is_active'] = true;
      } else if (tag.includes(t('off'))) {
        query['data_collecting.is_active'] = {$ne: true}; // undefined & false.
      }
    } else if (new RegExp(`^(${t('signal')}) ` +
    `(?:${t('good')}|${t('weak')}|${t('bad')})$`).test(tag)) {
      query.use_tr069 = true; // only for ONUs
      if (matchedConfig === undefined) {
        matchedConfig = await Config.findOne(
          {is_default: true}, {tr069: true},
        ).lean();
      }
      if (tag.includes(t('weak'))) {
        query.pon_rxpower = {
          $gte: matchedConfig.tr069.pon_signal_threshold_critical,
          $lte: matchedConfig.tr069.pon_signal_threshold,
        };
      } else if (tag.includes(t('good'))) {
        query.pon_rxpower = {
          $gte: matchedConfig.tr069.pon_signal_threshold,
          $lte: matchedConfig.tr069.pon_signal_threshold_critical_high,
        };
      } else if (tag.includes(t('bad'))) {
        query.pon_rxpower = {
          $lte: matchedConfig.tr069.pon_signal_threshold_critical,
        };
      }
    } else if (new RegExp(`^${t('noSignal')}$`).test(tag)) {
      query.use_tr069 = true; // only for ONUs
      query.pon_rxpower = {$exists: false};
    } else if (new RegExp(`^(ipv6) ` +
    `(?:${t('on')}|${t('off')}|${t('unknown')})$`).test(tag)) {
      if (new RegExp(`\\b${t('on')}\\b`).test(tag)) {
        query.ipv6_enabled = {$eq: 1};
      } else if (new RegExp(`\\b${t('off')}\\b`).test(tag)) {
        query.ipv6_enabled = {$eq: 0};
      } else if (new RegExp(`\\b${t('unknown')}\\b`).test(tag)) {
        query.ipv6_enabled = {$eq: 2};
      }
    } else if (new RegExp(`^(mesh) (?:${t('on')}|${t('off')})$`).test(tag)) {
      if (new RegExp(`\\b${t('on')}\\b`).test(tag)) {
        query.mesh_mode = {$ne: 0};
      } else if (new RegExp(`\\b${t('off')}\\b`).test(tag)) {
        query.mesh_mode = {$eq: 0};
      }
    } else if (new RegExp(`^(${t('mode')}) ` +
    `(?:${t('router')}|bridge)$`).test(tag)) {
      if (tag.includes(t('router'))) {
        query.bridge_mode_enabled = {$eq: false};
      } else if (tag.includes('bridge')) {
        query.bridge_mode_enabled = {$eq: true};
      }
    } else if (tag === 'flashbox') { // Anlix Flashbox routers.
      query.use_tr069 = {$ne: true};
    } else if (tag === 'tr069') { // CPE TR-069 routers.
      query.use_tr069 = true;
    } else if (queryContents[idx] !== '') { // all other non empty filters.
      let queryArray = [];
      let contentCondition = '$or';
      // Check negation condition
      let excludeTag = t('/exclude');
      if (queryContents[idx].startsWith(excludeTag)) {
        const filterContent = queryContents[idx].split(excludeTag)[1].trim();
        let queryInput = new RegExp(escapeRegExp(filterContent), 'i');
        for (let property in DeviceModel.schema.paths) {
          if (DeviceModel.schema.paths.hasOwnProperty(property) &&
              DeviceModel.schema.paths[property].instance === 'String') {
            let field = {};
            field[property] = {$not: queryInput};
            queryArray.push(field);
          }
        }
        contentCondition = '$and';
      } else {
        let queryInput = new RegExp(escapeRegExp(queryContents[idx]), 'i');
        for (let property in DeviceModel.schema.paths) {
          if (DeviceModel.schema.paths.hasOwnProperty(property) &&
              DeviceModel.schema.paths[property].instance === 'String') {
            let field = {};
            field[property] = queryInput;
            queryArray.push(field);
          }
        }
      }
      query[contentCondition] = queryArray;
    }
    finalQueryArray.push(query); // appending query to array of queries.
  }

  // only return 'finalQuery' if 'finalQueryArray' isn't empty.
  if (finalQueryArray.length > 0) return finalQuery;
  else return {};
};

// returns an array with all searched devices.
deviceListController.getDevices = async function(req, res) {
  // reading body parameters.
  let queryContents = []; // array that will hold the user's search filter.
  let projectedFields = []; // array that will hold the fields to return.
  if (req.body !== undefined) { // if request has a body.
    let body = req.body; // shortening variable name to decrease line length.
    // if 'filter_list' key is present and its value is a string.
    if (body.filter_list !== undefined &&
        body.filter_list.constructor === String) {
      queryContents = body.filter_list.split(',');
    }
    // if 'fields' key is present and its value is a string.
    if (body.fields !== undefined && body.fields.constructor === String) {
      projectedFields = body.fields.split(','); // split by commas.
    }
  }

  // building search query.
  const [userRole, err] = await Role.findOne({
    name: util.returnObjOrEmptyStr(req.user.role),
  }).exec().then((x) => [x, undefined], (e) => [undefined, e]);
  if (err) {
    return res.status(500).json({ // in case of error, returns message.
      success: false,
      message: t('roleFindError', {errorline: __line}),
    });
  }
  let finalQuery;
  if (req.user.is_superuser || userRole.grantSearchLevel >= 2) {
    finalQuery = await deviceListController.complexSearchDeviceQuery(
      queryContents);
  } else {
    finalQuery = deviceListController.simpleSearchDeviceQuery(queryContents);
  }

  // querying devices.
  DeviceModel.find(finalQuery, projectedFields).lean().exec()
  .then((devices) => res.json(devices)) // responding with array as json.
  .catch((err) => res.status(500).json({ // in case of error, returns message.
    success: false,
    message: t('cpesFindError', {errorline: __line}),
  }));
};

deviceListController.searchDeviceReg = async function(req, res) {
  let reqPage = 1;
  let elementsPerPage = 10;
  let queryContents = req.body.filter_list.split(',');
  let sortKeys = {};
  let sortTypeOrder = 1;
  // Filter sort type order before filtering query
  if (queryContents.includes('/sort-type-asc')) {
    queryContents= queryContents.filter((query) => query !== '/sort-type-asc');
    sortTypeOrder = 1;
  } else if (queryContents.includes('/sort-type-desc')) {
    queryContents= queryContents.filter((query) => query !== '/sort-type-desc');
    sortTypeOrder = -1;
  }
  // Filter sort option before filtering query
  if (queryContents.includes('/sort-pppoe-usr')) {
    queryContents= queryContents.filter((query) => query !== '/sort-pppoe-usr');
    sortKeys.pppoe_user = sortTypeOrder;
  } else if (queryContents.includes('/sort-mac-addr')) {
    queryContents= queryContents.filter((query) => query !== '/sort-mac-addr');
    sortKeys._id = sortTypeOrder;
  } else if (queryContents.includes('/sort-wan-ip')) {
    queryContents= queryContents.filter((query) => query !== '/sort-wan-ip');
    sortKeys.wan_ip = sortTypeOrder;
  } else if (queryContents.includes('/sort-public-ip')) {
    queryContents= queryContents.filter((query) => query !== '/sort-public-ip');
    sortKeys.ip = sortTypeOrder;
  } else if (queryContents.includes('/sort-release')) {
    queryContents= queryContents.filter((query) => query !== '/sort-release');
    sortKeys.installed_release = sortTypeOrder;
  } else if (queryContents.includes('/sort-ext-ref')) {
    queryContents= queryContents.filter((query) => query !== '/sort-ext-ref');
    sortKeys['external_reference.data'] = sortTypeOrder;
  } else if (queryContents.includes('/sort-sys-uptime')) {
    queryContents = queryContents.filter(
      (query) => query !== '/sort-sys-uptime');
    sortKeys.sys_up_time = sortTypeOrder;
  } else if (queryContents.includes('/sort-wan-uptime')) {
    queryContents = queryContents.filter(
      (query) => query !== '/sort-wan-uptime');
    sortKeys.wan_up_time = sortTypeOrder;
  } else if (queryContents.includes('/sort-pon-signal')) {
    queryContents= queryContents.filter(
      (query) => query !== '/sort-pon-signal');
    sortKeys.pon_rxpower = sortTypeOrder;
  } else {
    sortKeys._id = sortTypeOrder;
  }

  // online devices.
  // will be passed to the functions that need an array of ids.
  let mqttClientsArray = mqtt.getConnectedClients();
  // will be used in functions that need to access devices per id.
  let mqttClientsMap = {};
  for (let i = 0; i < mqttClientsArray.length; i++) {
    mqttClientsMap[mqttClientsArray[i]] = true;
  }

  let currentTimestamp = Date.now();
  let lastHour = new Date(currentTimestamp -3600000);

  // time threshold for tr069 status (status color).
  let tr069Times = await deviceHandlers.buildTr069Thresholds(currentTimestamp);

  const userRole = await Role.findOne({
    name: util.returnObjOrEmptyStr(req.user.role),
  });
  let finalQuery;
  if (req.user.is_superuser || userRole.grantSearchLevel >= 2) {
    finalQuery = await deviceListController.complexSearchDeviceQuery(
      queryContents, mqttClientsArray, currentTimestamp, tr069Times);
  } else {
    finalQuery = deviceListController.simpleSearchDeviceQuery(queryContents);
  }

  if (req.query.page) {
    reqPage = parseInt(req.query.page);
  }
  if (req.user.maxElementsPerPage) {
    elementsPerPage = req.user.maxElementsPerPage;
  }

  let paginateOpts = {
    page: reqPage,
    limit: elementsPerPage,
    lean: true,
    sort: sortKeys,
    projection: {
      lan_devices: false, port_mapping: false, ap_survey: false,
      mesh_routers: false, pingtest_results: false, speedtest_results: false,
      firstboot_log: false, lastboot_log: false,
    },
  };
  // Keys to optionally filter returned results
  if ('query_result_filter' in req.body) {
    let queryResFilter = req.body.query_result_filter.split(',');
    if (Array.isArray(queryResFilter) && queryResFilter.length) {
      paginateOpts.select = queryResFilter;
    }
  }

  DeviceModel.paginate(finalQuery, paginateOpts, function(err, matchedDevices) {
    if (err) {
      return res.json({
        success: false,
        type: 'danger',
        message: err.message,
      });
    }
    deviceListController.getReleases(userRole, req.user.is_superuser)
    .then(function(releases) {
      let enrichDevice = function(device) {
        const dbModel = device.model.replace('N/', '');
        let devReleases;
        if (device.use_tr069) {
          let cpe = DevicesAPI.instantiateCPEByModelFromDevice(
            device).cpe;
          let fancyModel = cpe.identifier.model;
          // Necessary to check both because of legacy cases that have already
          // been uploaded
          devReleases = releases.filter(
            (release) => ([fancyModel, dbModel].includes(release.model)),
          );
          let permissions = cpe.modelPermissions();
          /* get allowed version of upgrade by
            current device version  */
          let allowedVersions = cpe.allowedFirmwareUpgrades(
            device.installed_release,
            permissions,
          );
          /* filter by allowed version that
            current version can jump to */
          devReleases = devReleases.filter(
            (release) => allowedVersions.includes(release.id));
          /* for tr069 devices enable "btn-group device-update"
            if have feature support for the model is granted */
          device.isUpgradeEnabled = permissions.features.firmwareUpgrade;

          // Check for model aliases in case ModelName field is not correct
          let modelAlias = cpe.useModelAlias(device.version);
          if (modelAlias !== '') {
            device.model_alias = modelAlias;
          }
        } else {
          devReleases = releases.filter(
            (release) => release.model === dbModel,
          );
          let filteredDevReleases = [];
          for (let i = 0; i < devReleases.length; i++) {
            const isAllowed = deviceHandlers.isUpgradePossible(
              device, devReleases[i].flashbox_version,
            );
            if (isAllowed) filteredDevReleases.push(devReleases[i]);
          }
          device.isUpgradeEnabled = true;
          devReleases = filteredDevReleases;
        }
        const isDevOn = mqttClientsMap[device._id.toUpperCase()];
        device.releases = devReleases;

        // Status color
        let deviceColor = 'grey-text';
        if (device.use_tr069) { // if this device uses tr069 to be controlled.
          if (device.last_contact >= tr069Times.recovery) {
          // if we are inside first threshold.
            deviceColor = 'green-text';
          } else if (device.last_contact >= tr069Times.offline) {
          // if we are inside second threshold.
            deviceColor = 'red-text';
          }
          // if we are out of these thresholds, we keep the default gray value.
        } else { // default device, flashbox controlled.
          if (isDevOn) {
            deviceColor = 'green-text';
          } else if (device.last_contact.getTime() >= lastHour.getTime()) {
            deviceColor = 'red-text';
          }
        }
        device.status_color = deviceColor;

        // Device permissions
        device.permissions = DeviceVersion.devicePermissions(device);

        // amount ports a device have
        device.qtdPorts = DeviceVersion.getPortsQuantity(device.model);

        // Fill default value if wi-fi state does not exist
        if (device.wifi_state === undefined) {
          device.wifi_state = 1;
          device.wifi_state_5ghz = 1;
        }
        if (device.wifi_power === undefined) {
          device.wifi_power = 100;
          device.wifi_power_5ghz = 100;
        }
        if (device.wifi_hidden === undefined) {
          device.wifi_hidden = 0;
          device.wifi_hidden_5ghz = 0;
        }
        if (device.ipv6_enabled === undefined) {
          device.ipv6_enabled = 0;
        }
        return device;
      };

      meshHandlers.enhanceSearchResult(matchedDevices.docs)
      .then(function(extra) {
        let allDevices = extra.concat(matchedDevices.docs).map(enrichDevice);
        User.findOne({name: req.user.name}, function(err, user) {
          Config.findOne({is_default: true}, {device_update_schedule: false})
          .lean().exec(function(err, matchedConfig) {
            getOnlineCount(finalQuery, mqttClientsArray, lastHour, tr069Times)
            .then((onlineStatus) => {
              // Counters
              let status = {};
              status = Object.assign(status, onlineStatus);
              // Filter data using user permissions
              deviceListController.getReleases(userRole,
                                               req.user.is_superuser, true)
              .then(function(singleReleases) {
                /* validate if is to show ssid prefix checkbox
                    for each device */
                let ssidPrefix = matchedConfig.ssidPrefix;
                let enabledForAllFlashman = (
                  matchedConfig.personalizationHash ? true : false // cast bool
                );
                allDevices.forEach(function(device) {
                  /*
                    Define if is to show ssid prefix
                    checkbox by checking the existence of
                    personalization hash and if ssid prefix
                    is enabled for all flashman.
                    Or else, case ssid prefix is enabled
                    for that device, is enough to be able
                    to show.
                  */
                  device.isToShowSsidPrefixCheckbox = (
                    enabledForAllFlashman || device.isSsidPrefixEnabled
                  );
                });

                let mustBlockLicenseAtRemoval = (
                  matchedConfig.blockLicenseAtDeviceRemoval === true
                ) ? true : false;

                return res.json({
                success: true,
                  type: 'success',
                  limit: req.user.maxElementsPerPage,
                  page: matchedDevices.page,
                  pages: matchedDevices.pages,
                  min_length_pass_pppoe: matchedConfig.pppoePassLength,
                  status: status,
                  single_releases: singleReleases,
                  filter_list: req.body.filter_list,
                  devices: allDevices,
                  ssidPrefix: ssidPrefix,
                  isSsidPrefixEnabled: enabledForAllFlashman,
                  mustBlockLicenseAtRemoval: mustBlockLicenseAtRemoval,
                  ponConfig: {
                    ponSignalThreshold:
                      matchedConfig.tr069.pon_signal_threshold,
                    ponSignalThresholdCritical:
                      matchedConfig.tr069.pon_signal_threshold_critical,
                    ponSignalThresholdCriticalHigh:
                      matchedConfig.tr069.pon_signal_threshold_critical_high,
                  },
                });
              });
            }, (error) => {
              return res.json({
                success: false,
                type: 'danger',
                message: (error.message ? error.message : error),
              });
            });
          });
        });
      });
    });
  });
};

// Function that matches and removes general CPE ids from database
// Returns JSON with status, message and removed CPE ids
const delDeviceOnDatabase = async function(devIds) {
  let removedDevIds = [];
  // Creating an Array for the error messages
  let failedAtRemoval = {};
  // Get devices from ids
  let projection = {
    _id: true, use_tr069: true, alt_uid_tr069: true, serial_tr069: true,
    mesh_master: true, mesh_slaves: true,
  };
  let matchedDevices = await DeviceModel.findByMacOrSerial(devIds, false,
                                                           projection);
  // Check if get at least one device
  if (matchedDevices.length === 0) {
    return {
      success: false,
      removedIds: removedDevIds,
      message: t('cpesNotFound', {errorline: __line}),
      errors: failedAtRemoval,
    };
  }
  // Try to remove each device
  for (let device of matchedDevices) {
    let deviceId = device._id;
    if (device.use_tr069) {
      deviceId = device.serial_tr069;
    }
    // If the device is a mesh master, then we must not delete it
    if (device.mesh_slaves && device.mesh_slaves.length > 0) {
      failedAtRemoval[deviceId] =
        t('cantDeleteMeshWithSecondaries', {errorline: __line});
    } else {
      let removalOK = await deviceHandlers.removeDeviceFromDatabase(device);
      if (!removalOK) {
        failedAtRemoval[deviceId] =
          t('operationUnsuccessful', {errorline: __line});
      } else {
        removedDevIds.push(deviceId);
      }
    }
  }
  // If there are any errors in the array, we log the details and inform which
  // cpes failed to be removed in the response
  let errCount = Object.keys(failedAtRemoval).length;
  if (errCount > 0) {
    console.log(failedAtRemoval);
    return {
      success: false,
      removedIds: removedDevIds,
      message: t('couldntRemoveSomeDevices', {amount: errCount}),
      errors: failedAtRemoval,
    };
  }
  return {
    success: true,
    removedIds: removedDevIds,
  };
};

deviceListController.delDeviceReg = async function(req, res) {
  try {
    let matchedConfig = await Config.findOne(
      {is_default: true}, {blockLicenseAtDeviceRemoval: true}).lean();
    let mustBlockAtRemoval =
      ('blockLicenseAtDeviceRemoval' in matchedConfig) ?
        matchedConfig.blockLicenseAtDeviceRemoval : false;
    let removeList = [];
    if (req.params.id) {
      removeList = [req.params.id];
    } else {
      removeList = req.body.ids;
    }
    // If mustBlockAtRemoval flag is true, then we must change the flow of
    // delDeviceReg to do the license block with delDeviceAndBlockLicense
    if (mustBlockAtRemoval) {
      req.body.ids = removeList;
      return await deviceListController.delDeviceAndBlockLicense(req, res);
    }
    // Else: Only remove from database
    let delRetObj = await delDeviceOnDatabase(removeList);
    if (!delRetObj.success) {
      return res.status(500).json({
        success: false,
        type: 'danger',
        message: delRetObj.message,
        errors: delRetObj.errors,
      });
    } else {
      // No errors present, simply return success
      return res.status(200).json({
        success: true,
        type: 'success',
        message: t('operationSuccessful'),
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      type: 'danger',
      message: t('operationUnsuccessful', {errorline: __line}),
    });
  }
};

deviceListController.delDeviceAndBlockLicense = async function(req, res) {
  // Check request body
  if (!('ids' in req.body)) {
    return res.status(500).json({success: false, type: 'error',
      message: t('jsonInvalidFormat', {errorline: __line})});
  }
  try {
    let devIds = req.body.ids;
    // Check devices array
    if (!Array.isArray(devIds)) {
      devIds = [devIds];
    }
    // Delete entries from database
    let delRetObj = await delDeviceOnDatabase(devIds);
    if (!delRetObj.success) {
      return res.status(500).json({
        success: false,
        type: 'danger',
        message: delRetObj.message,
        errors: delRetObj.errors,
      });
    }
    // Move on to blocking the licenses
    let retObj =
      await controlApi.changeLicenseStatus(req.app, true, delRetObj.removedIds);
    if (!retObj.success) {
      return res.status(500).json({success: false, type: 'danger',
                                 message: t('operationUnsuccessful',
                                 {errorline: __line})});
    }
    return res.status(200).json({success: true, type: 'success',
                                message: t('operationSuccessful')});
  } catch (err) {
    return res.status(500).json({success: false, type: 'danger',
                                 message: t('operationUnsuccessful',
                                 {errorline: __line})});
  }
};

const downloadStockFirmware = async function(model) {
  return new Promise(async (resolve, reject) => {
    let remoteFileUrl = stockFirmwareLink + model + '_9999-aix.zip';
    try {
      // Download md5 hash
      let targetMd5 = await requestPromise({
        url: remoteFileUrl + '.md5',
        method: 'GET',
      });
      let currentMd5 = '';
      let md5fname = '.' + model + '_9999-aix.zip.md5';
      let localMd5Path = path.join(imageReleasesDir, md5fname);
      // Check for local md5 hash
      if (fs.existsSync(localMd5Path)) {
        currentMd5 = fs.readFileSync(localMd5Path, 'utf8');
      }
      if (targetMd5 !== currentMd5) {
        // Mismatch, download new zip file
        console.log('UPDATE: Downloading factory reset firmware for ' +
                    model + '...');
        fs.writeFileSync(localMd5Path, targetMd5);
        let responseStream = request({url: remoteFileUrl, method: 'GET'})
        .on('error', (err)=>{
          console.log(err);
          return resolve(false);
        })
        .on('response', (resp)=>{
          if (resp.statusCode !== 200) {
            return resolve(false);
          }
          // eslint-disable-next-line new-cap
          responseStream.pipe(unzipper.Parse()).on('entry', (entry)=>{
            let fname = entry.path;
            let fullFilePath = path.join(imageReleasesDir, fname);
            let md5FName = '.' + fname.replace('.bin', '.md5');
            let fullMd5FilePath = path.join(imageReleasesDir, md5FName);
            let writeStream = fs.createWriteStream(fullFilePath);
            writeStream.on('close', ()=>{
              let md5fname = fullMd5FilePath;
              let binfname = fullFilePath;
              let md5Checksum = md5File.sync(binfname);
              fs.writeFileSync(md5fname, md5Checksum);
              return resolve(true);
            });
            entry.pipe(writeStream);
          });
        });
      } else {
        // Hashes match, local file is ok
        return resolve(true);
      }
    } catch (err) {
      if (err.statusCode !== 404) {
        console.log(err.statusCode);
      }
      return resolve(false);
    }
  });
};

deviceListController.syncDevice = function(req, res) {
  DeviceModel.findByMacOrSerial(req.params.id.toUpperCase()).exec(
  async function(err, device) {
    if (err) {
      return res.status(200).json({
        success: false,
        message: t('cpeFindError', {errorline: __line}),
      });
    }
    if (Array.isArray(device) && device.length > 0) {
      device = device[0];
    } else {
      return res.status(200).json({
        success: false,
        message: t('cpeFindError', {errorline: __line}),
      });
    }
    if (!device.use_tr069) {
      return res.status(500).json({
        success: false,
        message: t('nonTr069AcsSyncError', {errorline: __line}),
      });
    } else {
      acsDeviceInfo.requestSync(device);
      return res.status(200).json({
        success: true,
        message: t('commandSuccessfullySent!'),
      });
    }
  });
};

deviceListController.factoryResetDevice = function(req, res) {
  DeviceModel.findById(req.params.id.toUpperCase(), async (err, device) => {
    if (err || !device) {
      return res.status(500).json({
        success: false,
        message: t('cpeFindError'),
      });
    }
    const model = device.model.replace('N/', '');
    if (!(await downloadStockFirmware(model))) {
      return res.status(500).json({
        success: false,
        msg: t('firmwareDownloadStockError'),
      });
    }
    device.do_update = true;
    device.do_update_status = 0; // waiting
    device.release = '9999-aix';
    await device.save().catch((err) => {
      console.log('UPDATE: Error saving device on factory reset: ' + err);
      return res.status(500).json({
        success: false,
        message: t('cpeSaveError'),
      });
    });
    console.log('UPDATE: Factory resetting router ' + device._id + '...');
    mqtt.anlixMessageRouterUpdate(device._id);
    res.status(200).json({success: true});
    // Start ack timeout
    deviceHandlers.timeoutUpdateAck(device._id, 'update');
  });
};

//
// REST API only functions
//

deviceListController.sendCommandMsg = async function(req, res) {
  let msgtype = req.params.msg.toLowerCase();

  switch (msgtype) {
    case 'traceroute':
      return await deviceListController.sendGenericTraceRouteAPI(req, res);
    case 'ping':
      return await deviceListController.sendGenericPingAPI(req, res);
    case 'speedtest':
      return await deviceListController.sendGenericSpeedTestAPI(req, res);
    case 'sitesurvey':
      return await deviceListController.sendGenericSiteSurveyAPI(req, res);
  }

  let devRes = await commonDeviceFind(req);
  if (devRes.success) {
    let device = devRes.matchedDevice;
    let slaves = (device.mesh_slaves) ? device.mesh_slaves : [];
    let permissions = DeviceVersion.devicePermissions(device);
    let emitMsg = true;
    switch (msgtype) {
      case 'rstapp':
        if (device) {
          device.app_password = undefined;
          await device.save().catch((err) => {
            console.log('Error saving app reset password: ' + err);
            emitMsg = false;
          });
        }
        if (emitMsg) {
          mqtt.anlixMessageRouterResetApp(req.params.id.toUpperCase());
        }
        break;
      case 'rstdevices':
        if (!permissions.grantResetDevices) {
          return res.status(200).json({
            success: false,
            message: t('cpeWithoutFunction', {errorline: __line}),
          });
        } else if (device) {
          device.lan_devices = device.lan_devices.map((lanDevice) => {
            lanDevice.is_blocked = false;
            return lanDevice;
          });
          device.blocked_devices_index = Date.now();
          await device.save().catch((err) => {
            console.log('Error saving reset of blocked devices: ' + err);
            emitMsg = false;
          });
        }
        if (emitMsg) {
          mqtt.anlixMessageRouterUpdate(req.params.id.toUpperCase());
        }
        break;
      case 'rstmqtt':
        if (device) {
          device.mqtt_secret = undefined;
          device.mqtt_secret_bypass = true;
          await device.save().catch((err) => {
            console.log('Error saving reset of mqtt: ' + err);
            emitMsg = false;
          });
        }
        if (emitMsg) {
          mqtt.anlixMessageRouterResetMqtt(req.params.id.toUpperCase());
        }
        break;
      case 'updateupnp':
        if (device) {
          let lanDeviceId = req.body.lanid;
          let lanDevicePerm = (req.body.permission === 'accept' ?
                               'accept' : 'reject');
          device.lan_devices.filter(function(lanDevice) {
            if (lanDevice.mac.toUpperCase() === lanDeviceId.toUpperCase()) {
              lanDevice.upnp_permission = lanDevicePerm;
              device.upnp_devices_index = Date.now();
              return true;
            } else {
              return false;
            }
          });
          await device.save().catch((err) => {
            console.log('Error saving on update upnp: ' + err);
            emitMsg = false;
          });
          if (emitMsg) {
            mqtt.anlixMessageRouterUpdate(req.params.id.toUpperCase());
          }
        }
        break;
      case 'log':
        // This message is only valid if we have a socket to send response to
        if (sio.anlixConnections[req.sessionID]) {
          sio.anlixWaitForLiveLogNotification(
            req.sessionID, req.params.id.toUpperCase());
          if (device && device.use_tr069) {
            acsDeviceInfo.requestLogs(device);
          } else {
            mqtt.anlixMessageRouterLog(req.params.id.toUpperCase());
          }
        } else {
          return res.status(200).json({
            success: false,
            message: t('commandOnlyWorksInsideSession'),
          });
        }
        break;
      case 'boot':
        if (device && device.use_tr069) {
          // acs integration will respond to request
          return await acsDeviceInfo.rebootDevice(device, res);
        } else {
          mqtt.anlixMessageRouterReboot(req.params.id.toUpperCase());
        }
        break;
      case 'onlinedevs':
        if (req.sessionID && sio.anlixConnections[req.sessionID]) {
          sio.anlixWaitForOnlineDevNotification(
            req.sessionID,
            req.params.id.toUpperCase(),
          );
          slaves.forEach((slave)=>{
            sio.anlixWaitForOnlineDevNotification(
              req.sessionID,
              slave.toUpperCase(),
            );
          });
        }
        if (device && device.use_tr069) {
          acsDeviceInfo.requestConnectedDevices(device);
        } else {
          mqtt.anlixMessageRouterOnlineLanDevs(req.params.id.toUpperCase());
        }
        slaves.forEach((slave)=>{
          mqtt.anlixMessageRouterOnlineLanDevs(slave.toUpperCase());
        });
        break;
      case 'upstatus':
        if (req.sessionID && sio.anlixConnections[req.sessionID]) {
          sio.anlixWaitForUpStatusNotification(
            req.sessionID,
            req.params.id.toUpperCase(),
          );
          slaves.forEach((slave)=>{
            sio.anlixWaitForUpStatusNotification(
              req.sessionID,
              slave.toUpperCase(),
            );
          });
        }
        if (device && device.use_tr069) {
          acsDeviceInfo.requestUpStatus(device);
        } else {
          mqtt.anlixMessageRouterUpStatus(req.params.id.toUpperCase());
        }
        slaves.forEach((slave)=>{
          mqtt.anlixMessageRouterUpStatus(slave.toUpperCase());
        });
        break;
      case 'wanbytes':
        if (req.sessionID && sio.anlixConnections[req.sessionID]) {
          sio.anlixWaitForStatisticsNotification(
            req.sessionID,
            req.params.id.toUpperCase(),
          );
        }
        if (device && device.use_tr069) {
          acsDeviceInfo.requestStatistics(device);
        } else {
          mqtt.anlixMessageRouterUpStatus(req.params.id.toUpperCase());
        }
        break;
      case 'waninfo':
        // Wait notification, only wait if is not TR069
        if (req.sessionID && sio.anlixConnections[req.sessionID] &&
          !device.use_tr069) {
          sio.anlixWaitForWanInfoNotification(
            req.sessionID,
            req.params.id.toUpperCase(),
          );
        }
        // If does not use TR069 call the mqtt function
        if (device && !device.use_tr069) {
          mqtt.anlixMessageRouterWanInfo(req.params.id.toUpperCase());
        }
        break;
      case 'laninfo':
        // Wait notification, only wait if is not TR069
        if (req.sessionID && sio.anlixConnections[req.sessionID] &&
          !device.use_tr069) {
          sio.anlixWaitForLanInfoNotification(
            req.sessionID,
            req.params.id.toUpperCase(),
          );
        }
        // If does not use TR069 call the mqtt function
        if (device && !device.use_tr069) {
          mqtt.anlixMessageRouterLanInfo(req.params.id.toUpperCase());
        }
        break;
      case 'wps':
        if (!permissions.grantWpsFunction) {
          return res.status(200).json({
            success: false,
            message: t('cpeWithoutFunction', {errorline: __line}),
          });
        }
        if (!('activate' in req.params) ||
            !(typeof req.params.activate === 'boolean')
        ) {
          return res.status(200).json({
            success: false,
            message: t('fieldNameInvalid',
              {name: 'activate', errorline: __line})});
        }
        mqtt.anlixMessageRouterWpsButton(req.params.id.toUpperCase(),
                                         req.params.activate);
        break;
      case 'pondata':
        // Check for permission
        if (!permissions.grantPonSignalSupport) {
          return res.status(200).json({
            success: false,
            message: t('cpeWithoutCommand'),
          });
        }
        // Wait for notification
        if (req.sessionID && sio.anlixConnections[req.sessionID]) {
          sio.anlixWaitForPonSignalNotification(
            req.sessionID, req.params.id.toUpperCase(),
          );
        }
        // Start
        if (device && device.use_tr069) {
          acsDeviceInfo.requestPonData(device);
        } else {
          return res.status(200).json({
            success: false,
            message: t('cpeWithoutCommand'),
          });
        }
        break;
      default:
        // Message not implemented
        console.log('REST API MQTT Message not recognized (' + msgtype + ')');
        return res.status(200).json({success: false,
                                     message: t('commandNotFound',
                                      {errorline: __line})});
    }

    return res.status(200).json({success: true});
  } else {
    return res.status(200).json(devRes);
  }
};

deviceListController.getFirstBootLog = function(req, res) {
  DeviceModel.findByMacOrSerial(req.params.id.toUpperCase()).exec(
  async function(err, matchedDevice) {
    if (err) {
      return res.status(200).json({success: false,
                                   message: t('cpeFindError',
                                    {errorline: __line})});
    }
    if (Array.isArray(matchedDevice) && matchedDevice.length > 0) {
      matchedDevice = matchedDevice[0];
    } else {
      return res.status(200).json({success: false,
                                   message: t('cpeNotFound',
                                   {errorline: __line})});
    }

    if (matchedDevice.firstboot_log) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Type', 'text/plain');
      res.end(matchedDevice.firstboot_log, 'binary');
      return res.status(200);
    } else {
      return res.status(200).json({success: false,
                                   message: t('cpeWithoutLogs')});
    }
  });
};

deviceListController.getLastBootLog = function(req, res) {
  DeviceModel.findByMacOrSerial(req.params.id.toUpperCase()).exec(
  async function(err, matchedDevice) {
    if (err) {
      return res.status(200).json({success: false,
                                   message: t('cpeFindError',
                                    {errorline: __line})});
    }
    if (Array.isArray(matchedDevice) && matchedDevice.length > 0) {
      matchedDevice = matchedDevice[0];
    } else {
      return res.status(200).json({success: false,
                                   message: t('cpeNotFound',
                                    {errorline: __line})});
    }

    if (matchedDevice.lastboot_log) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Type', 'text/plain');
      res.end(matchedDevice.lastboot_log, 'binary');
      return res.status(200);
    } else {
      return res.status(200).json({success: false,
                                   message: t('cpeWithoutLogs')});
    }
  });
};

// Should be called after updating TR-069 CPE through ACS
deviceListController.ensureBssidCollected = async function(
  device, targetMode) {
  /*
    Some devices have an invalid BSSID until the AP is enabled
    If the device doesn't have the bssid yet we have to fetch it
  */
  if (
    // If we dont have 2.4GHz bssid and mesh mode requires 2.4GHz network
    (!device.bssid_mesh2 && (targetMode === 2 || targetMode === 4)) ||
    // If we dont have 5GHz bssid and mesh mode requires 5GHz network
    (!device.bssid_mesh5 && (targetMode === 3 || targetMode === 4))
  ) {
    // It might take some time for some CPEs to enable their Wi-Fi interface
    // after the command is sent. Since the BSSID is only available after the
    // interface is up, we need to wait here to ensure we get a valid read
    await new Promise((r)=>setTimeout(r, 4000));
    const bssidsObj = await acsMeshDeviceHandler.getMeshBSSIDFromGenie(
      device, targetMode,
    );
    if (!bssidsObj.success) {
      return bssidsObj;
    }
    if (targetMode === 2 || targetMode === 4) {
      device.bssid_mesh2 = bssidsObj.bssid_mesh2;
    }
    if (targetMode === 3 || targetMode === 4) {
      device.bssid_mesh5 = bssidsObj.bssid_mesh5;
    }
  }
  return {success: true};
};

deviceListController.getDeviceReg = function(req, res) {
  DeviceModel.findByMacOrSerial(req.params.id.toUpperCase(), true).exec(
  async function(err, matchedDevice) {
    if (err) {
      console.log(err);
      return res.status(500).json({success: false,
                                   message: t('cpeFindError',
                                    {errorline: __line})});
    }
    if (Array.isArray(matchedDevice) && matchedDevice.length > 0) {
      matchedDevice = matchedDevice[0];
    } else {
      return res.status(404).json({success: false,
                                   message: t('cpeNotFound',
                                    {errorline: __line})});
    }

    // hide secret from api
    if (matchedDevice.mqtt_secret) {
      matchedDevice.mqtt_secret = null;
    }

    // hide logs - too large for json
    if (matchedDevice.firstboot_log) {
      matchedDevice.firstboot_log = null;
    }
    if (matchedDevice.lastboot_log) {
      matchedDevice.lastboot_log = null;
    }

    let deviceColor = 'grey';
    matchedDevice.online_status = false;
    if (matchedDevice.use_tr069) { // if this matchedDevice uses tr069.
      // tr069 time thresholds for device status.
      let tr069Times = await deviceHandlers.buildTr069Thresholds();
      // classifying device status.
      if (matchedDevice.last_contact >= tr069Times.recovery) {
      // if we are inside first threshold.
        deviceColor = 'green';
        matchedDevice.online_status = true;
      } else if (matchedDevice.last_contact >= tr069Times.offline) {
      // if we are inside second threshold.
        deviceColor = 'red';
      }
      // if we are out of these thresholds, we keep the default gray value.
    } else { // default matchedDevice, flashbox controlled.
      const isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
        return map[req.params.id.toUpperCase()];
      });
      matchedDevice.online_status = (isDevOn);
      // Status color
      let lastHour = new Date();
      lastHour.setHours(lastHour.getHours() - 1);
      if (matchedDevice.online_status) {
        deviceColor = 'green';
      } else if (!!matchedDevice.last_contact &&
        matchedDevice.last_contact.getTime() >= lastHour.getTime()) {
        deviceColor = 'red';
      }
    }
    matchedDevice.status_color = deviceColor;

    return res.status(200).json(matchedDevice);
  });
};

deviceListController.setDeviceReg = function(req, res) {
  DeviceModel.findByMacOrSerial(req.params.id.toUpperCase()).exec(
  async function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: t('cpeFindError', {errorline: __line}),
        errors: [],
      });
    }
    if (Array.isArray(matchedDevice) && matchedDevice.length > 0) {
      matchedDevice = matchedDevice[0];
    } else {
      return res.status(404).json({success: false,
        message: t('cpeNotFound', {errorline: __line}), errors: []});
    }
    let permissions = DeviceVersion.devicePermissions(matchedDevice);

    if (util.isJSONObject(req.body.content)) {
      let content = req.body.content;
      let updateParameters = false;
      let needsToUpdateExtRef = false;
      let validator = new Validator();

      let errors = [];
      let connectionType =
        util.returnObjOrEmptyStr(content.connection_type).toString().trim();
      let pppoeUser =
        util.returnObjOrEmptyStr(content.pppoe_user).toString().trim();
      let pppoePassword =
        util.returnObjOrEmptyStr(content.pppoe_password).toString().trim();
      let ipv6Enabled =
        parseInt(util.returnObjOrNum(content.ipv6_enabled, 2));
      let lanSubnet =
        util.returnObjOrEmptyStr(content.lan_subnet).toString().trim();
      let lanNetmask =
        parseInt(util.returnObjOrNum(content.lan_netmask, 24));
      let ssid =
        util.returnObjOrEmptyStr(content.wifi_ssid).toString().trim();
      let password =
        util.returnObjOrEmptyStr(content.wifi_password).toString().trim();
      let channel =
        util.returnObjOrEmptyStr(content.wifi_channel).toString().trim();
      let band =
        util.returnObjOrEmptyStr(content.wifi_band).toString().trim();
      let mode =
        util.returnObjOrEmptyStr(content.wifi_mode).toString().trim();
      let power =
        parseInt(util.returnObjOrNum(content.wifi_power, 100));
      let wifiState =
        parseInt(util.returnObjOrNum(content.wifi_state, 1));
      let wifiHidden =
        parseInt(util.returnObjOrNum(content.wifi_hidden, 0));
      let ssid5ghz =
        util.returnObjOrEmptyStr(content.wifi_ssid_5ghz).toString().trim();
      let password5ghz =
        util.returnObjOrEmptyStr(content.wifi_password_5ghz).toString().trim();
      let channel5ghz =
        util.returnObjOrEmptyStr(content.wifi_channel_5ghz).toString().trim();
      let band5ghz =
        util.returnObjOrEmptyStr(content.wifi_band_5ghz).toString().trim();
      let mode5ghz =
        util.returnObjOrEmptyStr(content.wifi_mode_5ghz).toString().trim();
      let power5ghz =
        parseInt(util.returnObjOrNum(content.wifi_power_5ghz, 100));
      let wifiState5ghz =
        parseInt(util.returnObjOrNum(content.wifi_state_5ghz, 1));
      let wifiHidden5ghz =
        parseInt(util.returnObjOrNum(content.wifi_hidden_5ghz, 0));
      let isSsidPrefixEnabled =
        (parseInt(util.returnObjOrNum(content.isSsidPrefixEnabled, 0)) == 0 ?
          false : true);
      let bridgeEnabled =
        parseInt(util.returnObjOrNum(content.bridgeEnabled, 1)) === 1;
      let bridgeDisableSwitch =
        parseInt(util.returnObjOrNum(content.bridgeDisableSwitch, 1)) === 1;
      let bridgeFixIP =
        util.returnObjOrEmptyStr(content.bridgeFixIP).toString().trim();
      let bridgeFixGateway =
        util.returnObjOrEmptyStr(content.bridgeFixGateway).toString().trim();
      let bridgeFixDNS =
        util.returnObjOrEmptyStr(content.bridgeFixDNS).toString().trim();
      let meshMode = parseInt(util.returnObjOrNum(content.mesh_mode, 0));
      let extReference = util.returnObjOrFalse(content.external_reference);
      let slaveCustomConfigs = [];
      try {
        slaveCustomConfigs = JSON.parse(content.slave_custom_configs);
        if (slaveCustomConfigs.length !== matchedDevice.mesh_slaves.length) {
          slaveCustomConfigs = [];
        }
      } catch (err) {
        slaveCustomConfigs = [];
      }

      let genericValidate = function(field, func, key, minlength) {
        let validField = func(field, minlength);
        if (!validField.valid) {
          validField.err.forEach(function(error) {
            let obj = {};
            obj[key] = error;
            errors.push(obj);
          });
        }
      };

      Config.findOne({is_default: true}, {device_update_schedule: false})
      .lean().exec(async function(err, matchedConfig) {
        if (err || !matchedConfig) {
          console.log('Error returning default config');
          return res.status(500).json({
            success: false,
            message: t('configFindError', {errorline: __line}),
            errors: [],
          });
        }

        // Validate fields
        if (connectionType != 'pppoe' && connectionType != 'dhcp' &&
            connectionType != '') {
          return res.status(500).json({
            success: false,
            message: t('connectionTypeShouldBePppoeDhcp'),
          });
        }
        if (pppoeUser !== '' && pppoePassword !== '') {
          connectionType = 'pppoe';
          genericValidate(pppoeUser, validator.validateUser, 'pppoe_user');
          if (!matchedDevice.use_tr069 || pppoePassword) {
            // Do not validate this field if a TR069 device left it blank
            genericValidate(pppoePassword, validator.validatePassword,
                            'pppoe_password', matchedConfig.pppoePassLength);
          }
        }
        // -> 'updating registry' scenario
        let checkResponse = deviceHandlers.checkSsidPrefix(
          matchedConfig, ssid, ssid5ghz, isSsidPrefixEnabled);
        // This function returns what prefix we should be using for this device,
        // based on the local flag (as updated in the interface) and what SSID
        // values should be saved in the database
        isSsidPrefixEnabled = checkResponse.enablePrefix;
        ssid = checkResponse.ssid2;
        ssid5ghz = checkResponse.ssid5;
        let ssidPrefix = checkResponse.prefixToUse;

        if (content.hasOwnProperty('wifi_ssid')) {
          genericValidate(
            ssidPrefix+ssid,
            (s)=>validator.validateSSID(
              s, permissions.grantDiacritics, permissions.grantSsidSpaces,
            ),
            'ssid',
          );
        }
        if (content.hasOwnProperty('wifi_password')) {
          if (!matchedDevice.use_tr069 || password) {
            // Do not validate this field if a TR069 device left it blank
            genericValidate(
              password,
              (p)=>validator.validateWifiPassword(
                p, permissions.grantDiacritics,
              ),
              'password',
            );
          }
        }
        if (content.hasOwnProperty('wifi_channel')) {
          genericValidate(channel, validator.validateChannel, 'channel');
        }
        if (content.hasOwnProperty('wifi_band')) {
          genericValidate(band, validator.validateBand, 'band');
        }
        if (content.hasOwnProperty('wifi_mode')) {
          genericValidate(mode, validator.validateMode, 'mode');
        }
        if (content.hasOwnProperty('wifi_power')) {
          genericValidate(power, validator.validatePower, 'power');
        }
        if (content.hasOwnProperty('wifi_ssid_5ghz')) {
          genericValidate(
            ssidPrefix+ssid5ghz,
            (s)=>validator.validateSSID(
              s, permissions.grantDiacritics, permissions.grantSsidSpaces,
            ),
            'ssid5ghz',
          );
        }
        if (content.hasOwnProperty('wifi_password_5ghz')) {
          if (!matchedDevice.use_tr069 || password5ghz) {
            // Do not validate this field if a TR069 device left it blank
            genericValidate(
              password5ghz,
              (p)=>validator.validateWifiPassword(
                p, permissions.grantDiacritics,
              ),
              'password5ghz',
            );
          }
        }
        if (content.hasOwnProperty('wifi_channel_5ghz')) {
          genericValidate(
            channel5ghz,
            (ch)=>validator.validateChannel(
              ch, permissions.grantWifi5ChannelList,
            ),
            'channel5ghz',
          );
        }
        if (content.hasOwnProperty('wifi_band_5ghz')) {
          genericValidate(band5ghz, validator.validateBand, 'band5ghz');
        }
        if (content.hasOwnProperty('wifi_mode_5ghz')) {
          genericValidate(mode5ghz, validator.validateMode, 'mode5ghz');
        }
        if (content.hasOwnProperty('wifi_power_5ghz')) {
          genericValidate(power5ghz, validator.validatePower, 'power5ghz');
        }
        if (content.hasOwnProperty('lan_subnet')) {
          genericValidate(lanSubnet, validator.validateIP, 'lan_subnet');
          genericValidate(lanSubnet, validator.validateIPAgainst,
                          'lan_subnet', '192.168.43');
        }
        if (content.hasOwnProperty('lan_netmask')) {
          genericValidate(lanNetmask, validator.validateNetmask, 'lan_netmask');
        }
        if (bridgeEnabled && bridgeFixIP) {
          genericValidate(bridgeFixIP, validator.validateIP,
                          'bridge_fixed_ip');
          genericValidate(bridgeFixGateway, validator.validateIP,
                          'bridge_fixed_gateway');
          genericValidate(bridgeFixDNS, validator.validateIP,
                          'bridge_fixed_dns');
        }
        if ((content.hasOwnProperty('external_reference')) &&
            (extReference.kind !== matchedDevice.external_reference.kind ||
             extReference.data !== matchedDevice.external_reference.data)) {
          genericValidate(extReference, validator.validateExtReference,
            'external_reference');
          needsToUpdateExtRef = true;
        }
        // We must enable Wi-Fi corresponding to mesh radio we're using
        // Some models have this restriction.
        // For simplicity we're doing this for all devices
        let invalidState2 = (wifiState < 1);
        let invalidState5 = (
          matchedDevice.wifi_is_5ghz_capable && wifiState5ghz < 1
        );
        if (meshMode > 1 && (invalidState2 || invalidState5)) {
          errors.push({'mesh_mode': t('enableWifiToConfigureMesh')});
        }
        const validateOk = await meshHandlers.validateMeshMode(
          matchedDevice, meshMode, false,
        );
        if (!validateOk.success) {
          validateOk.errors.forEach((msg)=>{
            errors.push({'mesh_mode': msg});
          });
        }

        if (errors.length < 1) {
          Role.findOne({name: util.returnObjOrEmptyStr(req.user.role)},
          async function(err, role) {
            if (err) {
              console.log(err);
            }
            let superuserGrant = false;
            let hasPermissionError = false;

            if (!role && req.user.is_superuser) {
              superuserGrant = true;
            }
            let cpe = DevicesAPI.instantiateCPEByModelFromDevice(
              matchedDevice).cpe;
            let changes = {wan: {}, lan: {}, wifi2: {},
                           wifi5: {}, mesh2: {}, mesh5: {}};

            if (connectionType !== '' && !matchedDevice.bridge_mode_enabled &&
                connectionType !== matchedDevice.connection_type &&
                !matchedDevice.use_tr069) {
              if (superuserGrant || role.grantWanType) {
                if (connectionType === 'pppoe') {
                  if (pppoeUser !== '' && pppoePassword !== '') {
                    matchedDevice.connection_type = connectionType;
                    updateParameters = true;
                  }
                } else {
                  matchedDevice.connection_type = connectionType;
                  matchedDevice.pppoe_user = '';
                  matchedDevice.pppoe_password = '';
                  updateParameters = true;
                }
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('pppoe_user') &&
                pppoeUser !== '' && !matchedDevice.bridge_mode_enabled &&
                pppoeUser !== matchedDevice.pppoe_user) {
              if (superuserGrant || role.grantPPPoEInfo > 1) {
                changes.wan.pppoe_user = pppoeUser;
                matchedDevice.pppoe_user = pppoeUser;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('pppoe_password') &&
                pppoePassword !== '' && !matchedDevice.bridge_mode_enabled &&
                pppoePassword !== matchedDevice.pppoe_password) {
              if (superuserGrant || role.grantPPPoEInfo > 1) {
                changes.wan.pppoe_pass = pppoePassword;
                matchedDevice.pppoe_password = pppoePassword;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('ipv6_enabled')) {
              matchedDevice.ipv6_enabled = ipv6Enabled;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_ssid') &&
                ssid !== '' &&
                ssid !== matchedDevice.wifi_ssid) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                changes.wifi2.ssid = ssid;
                matchedDevice.wifi_ssid = ssid;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_password') &&
                password !== '' && password !== matchedDevice.wifi_password) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                changes.wifi2.password = password;
                matchedDevice.wifi_password = password;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_channel') &&
                channel !== '' && channel !== matchedDevice.wifi_channel) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                changes.wifi2.channel = channel;
                matchedDevice.wifi_channel = channel;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_band') &&
                permissions.grantWifiBandEdit2 &&
                band !== '' && band !== matchedDevice.wifi_band) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                // Discard change to 'auto' if not allowed
                if (band !== 'auto' || permissions.grantWifiBandAuto2) {
                  changes.wifi2.band = band;
                  matchedDevice.wifi_band = band;
                  updateParameters = true;
                }
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_mode') &&
                permissions.grantWifiModeEdit &&
                mode !== '' && mode !== matchedDevice.wifi_mode) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                changes.wifi2.mode = mode;
                matchedDevice.wifi_mode = mode;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_state') &&
                wifiState !== matchedDevice.wifi_state) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                changes.wifi2.enable = wifiState;
                // When enabling Wi-Fi set beacon type
                if (wifiState) {
                  changes.wifi2.beacon_type = cpe.getBeaconType();
                }
                matchedDevice.wifi_state = wifiState;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_hidden') &&
                wifiHidden !== matchedDevice.wifi_hidden) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                matchedDevice.wifi_hidden = wifiHidden;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_power') &&
                power !== '' && power !== matchedDevice.wifi_power) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                matchedDevice.wifi_power = power;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_ssid_5ghz') &&
                ssid5ghz !== '' &&
                ssid5ghz !== matchedDevice.wifi_ssid_5ghz) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                changes.wifi5.ssid = ssid5ghz;
                matchedDevice.wifi_ssid_5ghz = ssid5ghz;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_password_5ghz') &&
                password5ghz !== '' &&
                password5ghz !== matchedDevice.wifi_password_5ghz) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                changes.wifi5.password = password5ghz;
                matchedDevice.wifi_password_5ghz = password5ghz;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_channel_5ghz') &&
                channel5ghz !== '' &&
                channel5ghz !== matchedDevice.wifi_channel_5ghz) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                changes.wifi5.channel = channel5ghz;
                matchedDevice.wifi_channel_5ghz = channel5ghz;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_band_5ghz') &&
                permissions.grantWifiBandEdit5 &&
                band5ghz !== '' && band5ghz !== matchedDevice.wifi_band_5ghz) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                // Discard change to 'auto' if not allowed
                if (band !== 'auto' || permissions.grantWifiBandAuto5) {
                  changes.wifi5.band = band5ghz;
                  matchedDevice.wifi_band_5ghz = band5ghz;
                  updateParameters = true;
                }
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_mode_5ghz') &&
                permissions.grantWifiModeEdit &&
                mode5ghz !== '' && mode5ghz !== matchedDevice.wifi_mode_5ghz) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                changes.wifi5.mode = mode5ghz;
                matchedDevice.wifi_mode_5ghz = mode5ghz;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_state_5ghz') &&
                wifiState5ghz !== matchedDevice.wifi_state_5ghz) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                changes.wifi5.enable = wifiState5ghz;
                // When enabling Wi-Fi set beacon type
                if (wifiState5ghz) {
                  changes.wifi5.beacon_type = cpe.getBeaconType();
                }
                matchedDevice.wifi_state_5ghz = wifiState5ghz;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_hidden_5ghz') &&
                wifiHidden5ghz !== matchedDevice.wifi_hidden_5ghz) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                matchedDevice.wifi_hidden_5ghz = wifiHidden5ghz;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('isSsidPrefixEnabled') &&
                isSsidPrefixEnabled !== matchedDevice.isSsidPrefixEnabled) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                matchedDevice.isSsidPrefixEnabled = isSsidPrefixEnabled;
                updateParameters = true;
                // Since we changed the prefix, this implies a change to SSIDs
                changes.wifi2.ssid = matchedDevice.wifi_ssid;
                changes.wifi5.ssid = matchedDevice.wifi_ssid_5ghz;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('wifi_power_5ghz') &&
                power5ghz !== '' &&
                power5ghz !== matchedDevice.wifi_power_5ghz) {
              if (superuserGrant || role.grantWifiInfo > 1) {
                matchedDevice.wifi_power_5ghz = power5ghz;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('lan_subnet') &&
                lanSubnet !== '' && !matchedDevice.bridge_mode_enabled &&
                lanSubnet !== matchedDevice.lan_subnet) {
              if (superuserGrant || role.grantLanEdit) {
                changes.lan.router_ip = lanSubnet;
                matchedDevice.lan_subnet = lanSubnet;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('lan_netmask') &&
                lanNetmask !== '' && !matchedDevice.bridge_mode_enabled &&
                parseInt(lanNetmask) !== matchedDevice.lan_netmask) {
              if (superuserGrant || role.grantLanEdit) {
                changes.lan.subnet_mask = parseInt(lanNetmask);
                matchedDevice.lan_netmask = lanNetmask;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (needsToUpdateExtRef) {
              if (superuserGrant || role.grantDeviceId) {
                let extRef =
                  util.getExtRefPattern(extReference.kind, extReference.data);
                matchedDevice.external_reference.kind = extRef.kind;
                matchedDevice.external_reference.data = extRef.data;
              } else {
                // Its possible that default value might be undefined
                // In this case there is no permission error
                if ((typeof matchedDevice.external_reference.kind !==
                     'undefined') &&
                    (typeof matchedDevice.external_reference.data !==
                     'undefined')) {
                  hasPermissionError = true;
                }
              }
            }
            if (content.hasOwnProperty('bridgeEnabled') &&
                bridgeEnabled !== matchedDevice.bridge_mode_enabled &&
                !matchedDevice.use_tr069) {
              if (superuserGrant || role.grantOpmodeEdit) {
                // In the case of changing from bridge to router:
                // Clear vlan configuration
                if (matchedDevice.bridge_mode_enabled == true &&
                    bridgeEnabled == false) {
                  matchedDevice.vlan = [];
                }

                matchedDevice.bridge_mode_enabled = bridgeEnabled;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('bridgeDisableSwitch') &&
                bridgeDisableSwitch !==
                matchedDevice.bridge_mode_switch_disable) {
              if (superuserGrant || role.grantOpmodeEdit) {
                matchedDevice.bridge_mode_switch_disable = bridgeDisableSwitch;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('bridgeFixIP') &&
                bridgeFixIP !== matchedDevice.bridge_mode_ip) {
              if (superuserGrant || role.grantOpmodeEdit) {
                matchedDevice.bridge_mode_ip = bridgeFixIP;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('bridgeFixIP') &&
                bridgeFixGateway !== matchedDevice.bridge_mode_gateway) {
              if (superuserGrant || role.grantOpmodeEdit) {
                matchedDevice.bridge_mode_gateway = bridgeFixGateway;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('bridgeFixIP') &&
                bridgeFixDNS !== matchedDevice.bridge_mode_dns) {
              if (superuserGrant || role.grantOpmodeEdit) {
                matchedDevice.bridge_mode_dns = bridgeFixDNS;
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            if (content.hasOwnProperty('mesh_mode') &&
                meshMode !== matchedDevice.mesh_mode) {
              if (superuserGrant || role.grantOpmodeEdit) {
                /*
                  For tr-069 CPEs we must wait until after device has been
                  updated via genie to save device in database.
                */
                if (matchedDevice.use_tr069) {
                  const configOk = await acsDeviceInfo.configTR069VirtualAP(
                    matchedDevice, meshMode,
                  );
                  if (!configOk.success) {
                    return res.status(500).json({
                      success: false,
                      type: 'danger',
                      message: configOk.msg,
                    });
                  }
                  const collectOk = await deviceListController
                    .ensureBssidCollected(matchedDevice, meshMode);
                  if (!collectOk.success) {
                    return res.status(500).json({
                      success: false,
                      type: 'danger',
                      message: collectOk.msg,
                    });
                  }
                  // If user changed Wi-Fi 2.4GHz channel and we are configuring
                  // a 2.4GHz mesh network, discard user channel update
                  if (
                    changes.wifi2.channel && (meshMode === 2 || meshMode === 4)
                  ) {
                    delete changes.wifi2.channel;
                  }
                  // If user changed Wi-Fi 5GHz channel and we are configuring
                  // a 5GHz mesh network, discard user channel update
                  if (
                    changes.wifi5.channel && (meshMode === 3 || meshMode === 4)
                  ) {
                    delete changes.wifi5.channel;
                  }
                }
                meshHandlers.setMeshMode(
                  matchedDevice, meshMode,
                );
                updateParameters = true;
              } else {
                hasPermissionError = true;
              }
            }
            let isWifi2DisabledAndChangingSomething = (
              matchedDevice.wifi_state == 0 &&
              JSON.stringify(changes.wifi2) != '{}' &&
              JSON.stringify(changes.wifi2) != '{"enable":0}'
            );
            let isWifi5DisabledAndChangingSomething = (
              matchedDevice.wifi_state_5ghz == 0 &&
              JSON.stringify(changes.wifi5) != '{}' &&
              JSON.stringify(changes.wifi5) != '{"enable":0}'
            );
            if (cpe.modelPermissions().wifi.mustBeEnabledToConfigure
              && (isWifi2DisabledAndChangingSomething ||
                  isWifi5DisabledAndChangingSomething)) {
              return res.status(500).json({
                success: false,
                message: t('enabledToModifyFields',
                  {errorline: __line}),
                errors: [],
              });
            }
            if (hasPermissionError) {
              return res.status(403).json({
                success: false,
                type: 'danger',
                message: t('notEnoughPermissionsForFields',
                  {errorline: __line}),
              });
            }
            if (updateParameters) {
              matchedDevice.do_update_parameters = true;
            }
            matchedDevice.save(async function(err) {
              if (err) {
                console.log(err);
                return res.status(500).json({
                  success: false,
                  message: t('cpeSaveError', {errorline: __line}),
                });
              }
              if (!matchedDevice.use_tr069) {
                // flashbox device, call mqtt
                mqtt.anlixMessageRouterUpdate(matchedDevice._id);
              } else {
                // tr-069 device, call acs
                acsDeviceInfo.updateInfo(matchedDevice, changes);
              }
              meshHandlers.syncSlaves(matchedDevice, slaveCustomConfigs);

              matchedDevice.success = true;
              return res.status(200).json(matchedDevice);
            });
          });
        } else {
          return res.status(500).json({
            success: false,
            message: t('fieldsInvalidCheckErrors'),
            errors: errors,
          });
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: t('fieldNameInvalid', {name: 'content', errorline: __line}),
        errors: [],
      });
    }
  });
};

deviceListController.createDeviceReg = function(req, res) {
  if (util.isJSONObject(req.body.content)) {
    const content = req.body.content;
    const macAddr = content.mac_address.trim().toUpperCase();
    const validator = new Validator();

    let errors = [];
    let release = util.returnObjOrEmptyStr(content.release).trim();
    let connectionType =
      util.returnObjOrEmptyStr(content.connection_type).trim();
    let pppoeUser = util.returnObjOrEmptyStr(content.pppoe_user).trim();
    let pppoePassword = util.returnObjOrEmptyStr(content.pppoe_password).trim();
    let ssid = util.returnObjOrEmptyStr(content.wifi_ssid).trim();
    let password = util.returnObjOrEmptyStr(content.wifi_password).trim();
    let channel = util.returnObjOrEmptyStr(content.wifi_channel).trim();
    let band = util.returnObjOrEmptyStr(content.wifi_band).trim();
    let mode = util.returnObjOrEmptyStr(content.wifi_mode).trim();
    const extReference = util.returnObjOrFalse(content.external_reference);
    let pppoe = (pppoeUser !== '' && pppoePassword !== '');

    let genericValidate = function(field, func, key, minlength) {
      let validField = func(field, minlength);
      if (!validField.valid) {
        validField.err.forEach(function(error) {
          let obj = {};
          obj[key] = error;
          errors.push(obj);
        });
      }
    };

    Config.findOne({is_default: true}, {device_update_schedule: false})
    .lean().exec(async function(err, matchedConfig) {
      if (err || !matchedConfig) {
        console.log('Error searching default config');
        return res.status(500).json({
          success: false,
          message: t('configFindError', {errorline: __line}),
        });
      }

      // Validate fields
      genericValidate(macAddr, validator.validateMac, 'mac');
      if (connectionType != 'pppoe' && connectionType != 'dhcp' &&
          connectionType != '') {
        return res.status(500).json({
          success: false,
          message: t('connectionTypeShouldBePppoeDhcp'),
        });
      }
      if (pppoe) {
        connectionType = 'pppoe';
        genericValidate(pppoeUser, validator.validateUser, 'pppoe_user');
        genericValidate(pppoePassword, validator.validatePassword,
                        'pppoe_password', matchedConfig.pppoePassLength);
      } else {
        connectionType = 'dhcp';
      }
      let isSsidPrefixEnabled = false;
      // -> 'new registry' scenario
      let checkResponse = deviceHandlers.checkSsidPrefix(
        matchedConfig, ssid, '', false, true);
      // The function already returns what SSID we should be saving in the
      // database and what the local flag value should be, based on the global
      // flag and SSID values.
      isSsidPrefixEnabled = checkResponse.enablePrefix;
      let ssidPrefix = checkResponse.prefixToUse;

      genericValidate(
        ssidPrefix+ssid,
        (s)=>validator.validateSSID(s, false, true),
        'ssid',
      );
      genericValidate(password, validator.validateWifiPassword, 'password');
      genericValidate(channel, validator.validateChannel, 'channel');
      genericValidate(band, validator.validateBand, 'band');
      genericValidate(mode, validator.validateMode, 'mode');
      if (extReference) {
        genericValidate(extReference, validator.validateExtReference,
          'external_reference');
      }

      DeviceModel.findById(macAddr, function(err, matchedDevice) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: t('cpeFindError', {errorline: __line}),
            errors: errors,
          });
        } else {
          if (matchedDevice) {
            errors.push({mac: t('macAlreadyExists')});
          }
          if (errors.length < 1) {
            let newDeviceModel = new DeviceModel({
              '_id': macAddr,
              'created_at': new Date(),
              'external_reference': extReference ? extReference : {},
              'model': '',
              'release': release,
              'pppoe_user': pppoeUser,
              'pppoe_password': pppoePassword,
              'wifi_ssid': ssid,
              'wifi_password': password,
              'wifi_channel': channel,
              'wifi_band': band,
              'wifi_mode': mode,
              'last_contact': new Date('January 1, 1970 01:00:00'),
              'do_update': false,
              'do_update_parameters': false,
              'isSsidPrefixEnabled': isSsidPrefixEnabled,
            });
            if (extReference) {
              let extRef =
                util.getExtRefPattern(extReference.kind, extReference.data);
              newDeviceModel.external_reference.kind = extRef.kind;
              newDeviceModel.external_reference.data = extRef.data;
            }
            if (connectionType != '') {
              newDeviceModel.connection_type = connectionType;
            }
            newDeviceModel.save(function(err) {
              if (err) {
                return res.status(500).json({
                  success: false,
                  message: t('cpeSaveError', {errorline: __line}),
                  errors: errors,
                });
              } else {
                return res.status(200).json({'success': true});
              }
            });
          } else {
            return res.status(500).json({
              success: false,
              message: t('fieldsInvalidCheckErrors'),
              errors: errors,
            });
          }
        }
      });
    });
  } else {
    return res.status(500).json({
      success: false,
      message: t('fieldNameInvalid', {name: 'content', errorline: __line}),
      errors: [],
    });
  }
};

deviceListController.checkOverlappingPorts = function(rules) {
  let i;
  let j;
  let ipI;
  let ipJ;
  let exStart;
  let exEnd;
  let inStart;
  let inEnd;
  if (rules.length > 1) {
    for (i = 0; i < rules.length; i++) {
      ipI = rules[i].ip;
      exStart = rules[i].external_port_start;
      exEnd = rules[i].external_port_end;
      inStart = rules[i].internal_port_start;
      inEnd = rules[i].internal_port_end;
      for (j = i+1; j < rules.length; j++) {
        ipJ = rules[j].ip;
        let port = rules[j].external_port_start;
        if (port >= exStart && port <= exEnd) {
          return true;
        }
        port = rules[j].external_port_end;
        if (port >= exStart && port <= exEnd) {
          return true;
        }
        port = rules[j].internal_port_start;
        if (ipI == ipJ && port >= inStart && port <= inEnd) {
          return true;
        }
        port = rules[j].internal_port_end;
        if (ipI == ipJ && port >= inStart && port <= inEnd) {
          return true;
        }
      }
    }
  }
  return false;
};

/*
Function to check if exists rules that are not compatible to the device:
  Returns true case exist a rule that is not possible to do in the device;
  False if is all clean;
*/
deviceListController.checkIncompatibility = function(rules, compatibility) {
  let ret = false;
  let i;
  let exStart;
  let exEnd;
  let inStart;
  let inEnd;
  for (i = 0; i < rules.length; i++) {
    exStart = rules[i].external_port_start;
    exEnd = rules[i].external_port_end;
    inStart = rules[i].internal_port_start;
    inEnd = rules[i].internal_port_end;
    if (!compatibility.simpleSymmetric) {
      if (exStart == exEnd && inStart == inEnd) {
        ret = true;
      }
    }
    if (!compatibility.simpleAsymmetric) {
      if (exStart != inStart && exEnd != inEnd) {
        ret = true;
      }
    }
    if (!compatibility.rangeSymmetric) {
      if (exStart != exEnd && inStart != inEnd) {
        ret = true;
      }
    }
    if (!compatibility.rangeAsymmetric) {
      if (exStart != inStart && exEnd != inEnd &&
         exStart != exEnd && inStart != inEnd) {
        ret = true;
      }
    }
  }
  return ret;
};

deviceListController.setPortForwardTr069 = async function(device, content) {
  let i;
  let j;
  let rules;
  let isOnSubnetRange;
  let isPortsNumber;
  let isPortsOnRange;
  let isPortsNotEmpty;
  let isRangeOfSameSize;
  let isRangeNegative;
  let isJsonInFormat;
  let portToCheck;
  let portsValues;
  let firstSlice;
  let secondSlice;
  let diffPortForwardLength;
  let ret = {};
  try {
    rules = JSON.parse(content);
  } catch (e) {
    console.log(e.message);
    ret.success = false;
    ret.message = t('jsonError', {errorline: __line});
    return ret;
  }

  // verify well formation of rules object
  if (Array.isArray(rules)) {
    isJsonInFormat = rules.every((r) => {
      return !!r.ip &&
       !!r.external_port_start &&
       !!r.external_port_end &&
       !!r.internal_port_start &&
       !!r.internal_port_end;
    });
  } else {
    isJsonInFormat = false;
  }
  if (!isJsonInFormat) {
    ret.success = false;
    ret.message = t('jsonInvalidFormat', {errorline: __line});
    return ret;
  }
  for (i = 0; i < rules.length; i++) {
    isPortsNumber = true;
    isPortsOnRange = true;
    isPortsNotEmpty = true;
    isRangeOfSameSize = true;
    isRangeNegative = true;
    portsValues = [];
    portsValues[0] = rules[i].external_port_start;
    portsValues[1] = rules[i].external_port_end;
    portsValues[2] = rules[i].internal_port_start;
    portsValues[3] = rules[i].internal_port_end;
    // verify if the given ip is on subnet range
    let validator = new Validator();
    isOnSubnetRange = validator.checkAddressSubnetRange(
      device.lan_subnet,
      rules[i].ip,
      device.lan_netmask,
    );
    // verify if is number, empty, on 2^16 range,
    for (j = 0; j < 4; j++) {
      portToCheck = portsValues[j];
      if (portToCheck == '') {
        isPortsNotEmpty = false;
      } else if (isNaN(parseInt(portToCheck))) {
        isPortsNumber = false;
      } else if (!(parseInt(portToCheck) >= 1 &&
                   parseInt(portToCheck) <= 65535 &&
                   parseInt(portToCheck) != 22 &&
                   parseInt(portToCheck) != 23 &&
                   parseInt(portToCheck) != 80 &&
                   parseInt(portToCheck) != 443 &&
                   parseInt(portToCheck) != 7547 &&
                   parseInt(portToCheck) != 58000)) {
        isPortsOnRange = false;
      }
    }
    if (!isPortsNumber) {
      ret.success = false;
      ret.message = t('portsSouldBeNumberError', {ip: rules[i].ip});
      return ret;
    }
    // verify if range is on same size and start/end order
    firstSlice = parseInt(portsValues[1]) - parseInt(portsValues[0]);
    secondSlice = parseInt(portsValues[3]) - parseInt(portsValues[2]);
    if (firstSlice != secondSlice) {
      isRangeOfSameSize = false;
    }
    if (firstSlice < 0 || secondSlice < 0) {
      isRangeNegative = false;
    }
    if (!isPortsOnRange) {
      ret.success = false;
      ret.message = t('portsSouldBeBetweenError', {ip: rules[i].ip});
      return ret;
    }
    if (!isPortsNotEmpty) {
      ret.success = false;
      ret.message = t('fieldShouldBeFilledError', {ip: rules[i].ip});
      return ret;
    }
    if (!isRangeOfSameSize) {
      ret.success = false;
      ret.message = t('portRangesAreDifferentError', {ip: rules[i].ip});
      return ret;
    }
    if (!isRangeNegative) {
      ret.success = false;
      ret.message = t('portRangesInvertedLimitsError', {ip: rules[i].ip});
      return ret;
    }
    if (!isOnSubnetRange) {
      ret.success = false;
      ret.message = t('outOfSubnetRangeError', {ip: rules[i].ip});
      return ret;
    }
  }
  // check overlapping port mapping
  if (deviceListController.checkOverlappingPorts(rules)) {
    ret.success = false;
    ret.message = t('overlappingMappingError');
    return ret;
  }
  // check compatibility in mode of port mapping
  let permissions = DeviceVersion.devicePermissions(device);
  let portForwardOpts = permissions.grantPortForwardOpts;
  if (deviceListController.checkIncompatibility(rules, portForwardOpts)) {
    ret.success = false;
    ret.message = t('incompatibleRulesError');
    return ret;
  }
  // get the difference of length between new entries and old entries
  diffPortForwardLength = rules.length - device.port_mapping.length;
  // passed by validations, json is clean to put in the document
  device.port_mapping = rules;
  // push a hash from rules json
  device.forward_index =
    crypto.createHash('md5').update(JSON.stringify(content)).digest('base64');
  try {
    await device.save();
  } catch (err) {
    console.log('Error Saving Port Forward: '+err);
    ret.success = false;
    ret.message = t('cpeSaveError', {errorline: __line});
    return ret;
  }
  // geniacs-api call
  acsPortForwardHandler.changePortForwardRules(device, diffPortForwardLength);
  ret.success = true;
  ret.message = t('operationSuccessful');
  return ret;
};

deviceListController.setPortForward = function(req, res) {
  DeviceModel.findByMacOrSerial(req.params.id.toUpperCase()).exec(
  async function(err, matchedDevice) {
    if (err) {
      return res.status(200).json({
        success: false,
        message: t('cpeFindError', {errorline: __line}),
      });
    }
    if (Array.isArray(matchedDevice) && matchedDevice.length > 0) {
      matchedDevice = matchedDevice[0];
    } else {
      return res.status(200).json({success: false,
                                   message: t('cpeNotFound',
                                    {errorline: __line})});
    }
    let permissions = DeviceVersion.devicePermissions(matchedDevice);
    if (!permissions.grantPortForward) {
      return res.status(200).json({
        success: false,
        message: t('cpeWithoutFunction'),
      });
    }
    if (matchedDevice.bridge_mode_enabled) {
      return res.status(200).json({
        success: false,
        message: t('cpeNotInBridgeCantOpenPorts'),
      });
    }
    // TR-069 routers
    if (matchedDevice.use_tr069) {
      let result =
        await deviceListController.setPortForwardTr069(matchedDevice,
                                                       req.body.content);
      return res.status(200).json({
        success: result.success,
        message: result.message,
      });
    // Flashbox firmware routers
    } else {
      let content;
      if (typeof req.body.content == 'string' &&
          util.isJsonString(req.body.content)
      ) {
        content = JSON.parse(req.body.content);
      } else if (typeof req.body.content == 'object') {
        content = req.body.content;
      } else {
        return res.status(200).json({
          success: false,
          message: t('fieldNameInvalid',
            {name: 'content', errorline: __line}),
        });
      }

      let usedAsymPorts = [];

      content.forEach((r) => {
        if (!r.hasOwnProperty('mac') ||
            !r.hasOwnProperty('dmz') ||
            !r.mac.match(util.macRegex)) {
          return res.status(200).json({
            success: false,
            message: t('macInvalidInJson'),
          });
        }

        if (!r.hasOwnProperty('port') || !Array.isArray(r.port) ||
          !(r.port.map((p) => parseInt(p))
                  .every((p) => (p >= 1 && p <= 65535)))
        ) {
          return res.status(200).json({
            success: false,
            message: t('internalPortsInvalidInJson'),
          });
        }

        let localPorts = r.port.map((p) => parseInt(p));
          // Get unique port set
        let localUniquePorts = [...new Set(localPorts)];

        if (r.hasOwnProperty('router_port')) {
          if (!permissions.grantPortForwardAsym) {
            return res.status(200).json({
              success: false,
              message: t('cpeNotAcceptingSymmetricalPorts'),
            });
          }

          if (!Array.isArray(r.router_port) ||
            !(r.router_port.map((p) => parseInt(p)).every(
                (p) => (p >= 1 && p <= 65535)))
          ) {
            return res.status(200).json({
              success: false,
              message: t('externalPortsInvalidInJson'),
            });
          }

          let localAsymPorts = r.router_port.map((p) => parseInt(p));
          // Get unique port set
          let localUniqueAsymPorts = [...new Set(localAsymPorts)];
          if (localUniqueAsymPorts.length != localAsymPorts.length) {
            return res.status(200).json({
              success: false,
              message: t('externalPortsRepeatedInJson'),
            });
          }

          if (localUniqueAsymPorts.length != localUniquePorts.length) {
            return res.status(200).json({
              success: false,
              message: t('externalAndInternalPortsIncorrectInJson'),
            });
          }

          if (
            !(localUniqueAsymPorts.every((p) => (!usedAsymPorts.includes(p))))
          ) {
            return res.status(200).json({
              success: false,
              message: t('externalPortsRepeatedInJson'),
            });
          }

          usedAsymPorts = usedAsymPorts.concat(localUniqueAsymPorts);
        } else {
          if (
            !(localUniquePorts.every((p) => (!usedAsymPorts.includes(p))))
          ) {
            return res.status(200).json({
              success: false,
              message: t('externalPortsRepeatedInJson'),
            });
          }
          usedAsymPorts = usedAsymPorts.concat(localUniquePorts);
        }
      });

      // If we get here, all is validated!

      // Remove all old firewall rules
      for (let idx = 0; idx < matchedDevice.lan_devices.length; idx++) {
        if (matchedDevice.lan_devices[idx].port.length > 0) {
          matchedDevice.lan_devices[idx].port = [];
          matchedDevice.lan_devices[idx].router_port = [];
          matchedDevice.lan_devices[idx].dmz = false;
        }
      }

      // Update with new ones
      content.forEach((r) => {
        let newRuleMac = r.mac.toLowerCase();
        let portsArray = r.port.map((p) => parseInt(p));
        portsArray = [...new Set(portsArray)];
        let portAsymArray = [];

        if (r.hasOwnProperty('router_port')) {
          portAsymArray = r.router_port.map((p) => parseInt(p));
          portAsymArray = [...new Set(portAsymArray)];
        }

        let newLanDevice = true;
        for (let idx = 0; idx < matchedDevice.lan_devices.length; idx++) {
          if (matchedDevice.lan_devices[idx].mac == newRuleMac) {
            matchedDevice.lan_devices[idx].port = portsArray;
            matchedDevice.lan_devices[idx].router_port = portAsymArray;
            matchedDevice.lan_devices[idx].dmz = r.dmz;
            matchedDevice.lan_devices[idx].last_seen = Date.now();
            newLanDevice = false;
            break;
          }
        }
        if (newLanDevice) {
          matchedDevice.lan_devices.push({
            mac: newRuleMac,
            port: portsArray,
            router_port: portAsymArray,
            dmz: r.dmz,
            first_seen: Date.now(),
            last_seen: Date.now(),
          });
        }
      });

      matchedDevice.forward_index = Date.now();

      matchedDevice.save(function(err) {
        if (err) {
          console.log('Error Saving Port Forward: '+err);
          return res.status(200).json({
            success: false,
            message: t('cpeSaveError', {errorline: __line}),
          });
        }
        mqtt.anlixMessageRouterUpdate(matchedDevice._id);

        return res.status(200).json({
          success: true,
          message: '',
        });
      });
    }
  });
};

deviceListController.getPortForward = function(req, res) {
  DeviceModel.findByMacOrSerial(req.params.id.toUpperCase()).exec(
  async function(err, matchedDevice) {
    if (err) {
      return res.status(200).json({
        success: false,
        message: t('cpeFindError', {errorline: __line}),
      });
    }
    if (Array.isArray(matchedDevice) && matchedDevice.length > 0) {
      matchedDevice = matchedDevice[0];
    } else {
      return res.status(200).json({success: false,
                                   message: t('cpeNotFound',
                                    {errorline: __line})});
    }
    let permissions = DeviceVersion.devicePermissions(matchedDevice);
    if (!permissions.grantPortForward) {
      return res.status(200).json({
        success: false,
        message: t('cpeWithoutFunction'),
      });
    }

    if (matchedDevice.use_tr069) {
      let cpe = DevicesAPI.instantiateCPEByModelFromDevice(matchedDevice).cpe;
      return res.status(200).json({
        success: true,
        content: matchedDevice.port_mapping,
        compatibility: permissions.grantPortForwardOpts,
        xmlWarning: cpe.modelPermissions().stavixXMLConfig.portForward,
      });
    }

    let resOut = matchedDevice.lan_devices.filter(function(lanDevice) {
      if (typeof lanDevice.port !== 'undefined' && lanDevice.port.length > 0 ) {
        return true;
      } else {
        return false;
      }
    });

    let outData = [];
    for (let i = 0; i < resOut.length; i++) {
      let tmpData = {};
      tmpData.mac = resOut[i].mac;
      tmpData.port = resOut[i].port;
      tmpData.dmz = resOut[i].dmz;

      if (('router_port' in resOut[i]) &&
          resOut[i].router_port.length != 0) {
        tmpData.router_port = resOut[i].router_port;
      }

      if (!('name' in resOut[i] && resOut[i].name == '') &&
          ('dhcp_name' in resOut[i])) {
        tmpData.name = resOut[i].dhcp_name;
      } else {
        tmpData.name = resOut[i].name;
      }
      // Check if device has IPv6 through DHCP
      tmpData.has_dhcpv6 = (Array.isArray(resOut[i].dhcpv6) &&
                            resOut[i].dhcpv6.length > 0 ? true : false);

      outData.push(tmpData);
    }

    return res.status(200).json({
      success: true,
      landevices: outData,
    });
  });
};

deviceListController.getPingHostsList = function(req, res) {
  DeviceModel.findByMacOrSerial(req.params.id.toUpperCase()).exec(
  function(err, matchedDevice) {
    let device;
    let responseHosts = [];

    if (err) {
      return res.status(200).json({
        success: false,
        message: t('cpeFindError', {errorline: __line}),
      });
    }
    if (Array.isArray(matchedDevice) && matchedDevice.length > 0) {
      device = matchedDevice[0];
    } else {
      return res.status(200).json({success: false,
                                   message: t('cpeNotFound',
                                    {errorline: __line})});
    }

    if (device.current_diagnostic.type=='ping' &&
        device.current_diagnostic.customized &&
        device.current_diagnostic.in_progress
    ) {
      responseHosts = device.current_diagnostic.targets;
    } else {
      responseHosts = device.ping_hosts;
    }
    return res.status(200).json({
      success: true,
      ping_hosts_list: responseHosts,
    });
  });
};

deviceListController.setPingHostsList = function(req, res) {
  DeviceModel.findByMacOrSerial(req.params.id.toUpperCase()).exec(
  async function(err, matchedDevice) {
    if (err) {
      return res.status(200).json({
        success: false,
        message: t('cpeFindError', {errorline: __line}),
      });
    }
    if (Array.isArray(matchedDevice) && matchedDevice.length > 0) {
      matchedDevice = matchedDevice[0];
    } else {
      return res.status(200).json({success: false,
                                   message: t('cpeNotFound',
                                    {errorline: __line})});
    }

    let content;
    if (typeof(req.body.content) == 'string' &&
        util.isJsonString(req.body.content)
    ) {
      content = JSON.parse(req.body.content);
    } else if (typeof(req.body.content) == 'object') {
      content = req.body.content;
    } else {
      return res.status(200).json({
        success: false,
        message: t('fieldNameInvalid',
          {name: 'content', errorline: __line}),
      });
    }

    let approvedHosts = [];
    content.hosts.forEach((host) => {
      host = host.toLowerCase();
      if (host.match(util.fqdnLengthRegex)) {
        approvedHosts.push(host);
      }
    });

    // Check if approved hosts contains default hosts if configured
    const getDefaultPingHosts = await getDefaultPingHostsAtConfig();
    if (getDefaultPingHosts.success &&
        getDefaultPingHosts.hosts.length > 0 &&
        !getDefaultPingHosts.hosts.every((x) => approvedHosts.includes(x))) {
      return res.status(200).json({
        success: false,
        message: t('hostListMustContainDefaultHosts',
          {hosts: getDefaultPingHosts.hosts, errorline: __line}),
      });
    }
    matchedDevice.ping_hosts = approvedHosts;
    matchedDevice.save(function(err) {
      if (err) {
        return res.status(200).json({
          success: false,
          message: t('cpeSaveError', {errorline: __line}),
        });
      }
      return res.status(200).json({
        success: true,
        hosts: approvedHosts,
      });
    });
  });
};

const getDefaultPingHostsAtConfig = async function() {
  let message = t('configNotFound', {errorline: __line});
  let config = {};
  try {
    config = await Config.findOne(
      {is_default: true}, {default_ping_hosts: true},
    ).lean();
  } catch (err) {
    message = t('configFindError', {errorline: __line});
  }
  if (config && Array.isArray(config.default_ping_hosts)) {
    return {success: true, hosts: config.default_ping_hosts};
  }
  return {success: false, type: 'error', message: message};
};

deviceListController.getDefaultPingHosts = async function(req, res) {
  const getDefaultPingHosts = await getDefaultPingHostsAtConfig();
  if (getDefaultPingHosts.success) {
    return res.status(200).json({
      success: true,
      default_ping_hosts_list: getDefaultPingHosts.hosts,
    });
  }
  return res.status(200).json({
    success: false, message: getDefaultPingHosts.message,
  });
};

deviceListController.setDefaultPingHosts = async function(req, res) {
  let success = true;
  let type = 'success';
  let message = t('operationSuccessful', {errorline: __line});
  Config.findOne({is_default: true}, {default_ping_hosts: true}).exec(
    async function(err, matchedConfig) {
      if (err) {
        success = false; type = 'error';
        message = t('configFindError', {errorline: __line});
      }
      if (!util.isJSONObject(req.body)) {
        success = false; type = 'error';
        message = t('jsonError', {errorline: __line});
      }
      if (!req.body.default_ping_hosts_list) {
        success = false; type = 'error';
        message = t('configNotFound', {errorline: __line});
      }
      let hosts = req.body.default_ping_hosts_list;
      let approvedHosts = [];
      hosts.forEach((host) => {
        host = host.toLowerCase();
        if (host.match(util.fqdnLengthRegex)) {
          approvedHosts.push(host);
        }
      });
      matchedConfig.default_ping_hosts = approvedHosts;
      matchedConfig.save(function(err) {
        if (err) {
          success = false; type = 'error';
          message = t('configSaveError', {errorline: __line});
        }
      });
      if (approvedHosts.length) {
        const overwriteResult = await overwriteHostsOnDevices(approvedHosts);
        if (!overwriteResult.success) {
          success = false; type = 'error';
          message = t('cpeSaveError', {errorline: __line});
        }
      }
    });
    return res.status(200).json({
      success: success, type: type, message: message,
    });
};

const overwriteHostsOnDevices = async function(approvedHosts) {
  let devices = {};
  try {
    devices = await DeviceModel.find({}, {ping_hosts: true});
  } catch (err) {
    return {success: false, type: 'error',
      message: t('cpeFindError', {errorline: __line})};
  }
  for (let device of devices) {
    device.ping_hosts = approvedHosts;
    try {
      device.save();
    } catch (err) {
      return {success: false, type: 'error',
        message: t('cpeSaveError', {errorline: __line})};
    }
  }
  return {success: true};
};

deviceListController.getLanDevices = async function(req, res) {
  try {
    let matchedDevice = await DeviceModel.findById(req.params.id.toUpperCase());
    if (matchedDevice == null) {
      return res.status(200).json({
        success: false,
        message: t('cpeNotFound', {errorline: __line}),
      });
    }

    let enrichedLanDevs = util.deepCopyObject(matchedDevice.lan_devices)
    .map((lanDevice) => {
      lanDevice.is_old = deviceHandlers.isDeviceTooOld(lanDevice.last_seen);
      lanDevice.is_online = deviceHandlers.isOnline(lanDevice.last_seen);
      // Ease up gateway reference when in Mesh mode
      lanDevice.gateway_mac = matchedDevice._id;
      return lanDevice;
    });

    let onlyOldMeshRoutersEntries = true;
    let enrichedMeshRouters = util.deepCopyObject(matchedDevice.mesh_routers)
    .filter((meshRouter) => {
      // Remove entries related to wireless connection if cabled mesh only mode
      if (matchedDevice.mesh_mode === 1 && meshRouter.iface !== 1) {
        return false;
      } else {
        return true;
      }
    })
    .map((meshRouter) => {
      meshRouter.is_old = deviceHandlers.isApTooOld(meshRouter.last_seen);
      // There is at least one updated entry
      if (!meshRouter.is_old) {
        onlyOldMeshRoutersEntries = false;
      }
      return meshRouter;
    });
    // If mesh routers list is empty or old and there are routers in mesh then
    // let's check if it's possible to populate mesh routers list by cabled
    // connections
    if (onlyOldMeshRoutersEntries || (matchedDevice.mesh_mode === 1)) {
      let meshEntry = {
        mac: '',
        last_seen: Date.now(),
        conn_time: 0,
        rx_bytes: 0,
        tx_bytes: 0,
        signal: 0,
        rx_bit: 0,
        tx_bit: 0,
        latency: 0,
        iface: 1,
      };
      if (matchedDevice.mesh_master) { // Slave router
        let masterId = matchedDevice.mesh_master.toUpperCase();
        let matchedMaster = await DeviceModel.findById(
          masterId,
          {last_contact: true,
           _id: true,
           wan_negociated_speed: true,
          }).lean();
        // If there is recent comm assume there is a cabled connection
        if (!deviceHandlers.isApTooOld(matchedMaster.last_contact)) {
          meshEntry.mac = matchedMaster._id;
          meshEntry.rx_bit = matchedMaster.wan_negociated_speed;
          meshEntry.tx_bit = matchedMaster.wan_negociated_speed;
          enrichedMeshRouters.push(meshEntry);
        }
      } else if (matchedDevice.mesh_slaves) { // Master router
        for (let slaveMac of matchedDevice.mesh_slaves) {
          let slaveId = slaveMac.toUpperCase();
          let matchedSlave = await DeviceModel.findById(
            slaveId,
            {last_contact: true,
             _id: true,
             wan_negociated_speed: true,
            }).lean();
          // If there is recent comm assume there is a cabled connection
          if (!deviceHandlers.isApTooOld(matchedSlave.last_contact)) {
            meshEntry.mac = matchedSlave._id;
            meshEntry.rx_bit = matchedSlave.wan_negociated_speed;
            meshEntry.tx_bit = matchedSlave.wan_negociated_speed;
            enrichedMeshRouters.push(meshEntry);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      lan_devices: enrichedLanDevs,
      mesh_routers: enrichedMeshRouters,
    });
  } catch (err) {
    console.error(err);
    return res.status(200).json({
      success: false,
      message: t('serverError', {errorline: __line}),
    });
  }
};

deviceListController.getSiteSurvey = function(req, res) {
  DeviceModel.findById(req.params.id.toUpperCase(),
  function(err, matchedDevice) {
    if (err) {
      return res.status(200).json({
        success: false,
        message: t('cpeFindError', {errorline: __line}),
      });
    }
    if (matchedDevice == null) {
      return res.status(200).json({
        success: false,
        message: t('cpeNotFound', {errorline: __line}),
      });
    }

    let enrichedSiteSurvey = util.deepCopyObject(matchedDevice.ap_survey)
    .map((apDevice) => {
      apDevice.is_old = deviceHandlers.isApTooOld(apDevice.last_seen);
      return apDevice;
    });

    return res.status(200).json({
      success: true,
      ap_devices: enrichedSiteSurvey,
      wifi_last_channel: matchedDevice.wifi_last_channel,
      wifi_last_channel_5ghz: matchedDevice.wifi_last_channel_5ghz,
    });
  });
};

deviceListController.getSpeedtestResults = function(req, res) {
  DeviceModel.findById(req.params.id.toUpperCase(), (err, matchedDevice)=>{
    if (err) {
      return res.status(500).json({
        success: false,
        type: 'danger',
        message: t('cpeFindError', {errorline: __line}),
      });
    }
    if (!matchedDevice) {
      return res.status(404).json({
        success: false,
        type: 'danger',
        message: t('cpeNotFound', {errorline: __line}),
      });
    }

    let permissions = DeviceVersion.devicePermissions(matchedDevice);

    return res.status(200).json({
      success: true,
      measures: matchedDevice.speedtest_results,
      limit: permissions.grantSpeedTestLimit,
    });
  });
};

deviceListController.setDeviceCrudTrap = function(req, res) {
  // Store callback URL for devices
  let query = {is_default: true};
  let projection = {traps_callbacks: true};
  Config.findOne(query, projection).exec(function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: t('configFindError', {errorline: __line}),
      });
    } else {
      if (typeof req.body.url === 'string' && req.body.url) {
        let deviceCrud = {url: req.body.url};
        if (req.body.user && req.body.secret) {
          deviceCrud.user = req.body.user;
          deviceCrud.secret = req.body.secret;
        }
        let index = matchedConfig.traps_callbacks.devices_crud.findIndex(
          (d)=>d.url===req.body.url,
        );
        if (index > -1) {
          matchedConfig.traps_callbacks.devices_crud[index] = deviceCrud;
        } else {
          matchedConfig.traps_callbacks.devices_crud.push(deviceCrud);
        }
        matchedConfig.save((err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: t('cpeSaveError', {errorline: __line}),
            });
          }
          return res.status(200).json({
            success: true,
            message: t('operationSuccessful'),
          });
        });
      } else {
        return res.status(500).json({
          success: false,
          message: t('fieldNameMissing', {name: 'url', errorline: __line}),
        });
      }
    }
  });
};

deviceListController.deleteDeviceCrudTrap = function(req, res) {
  // Delete callback URL for devices
  let query = {is_default: true};
  let projection = {traps_callbacks: true};
  const deviceCrudIndex = req.body.index;
  if (typeof deviceCrudIndex !== 'number' || deviceCrudIndex < 0) {
    return res.status(500).send({
      success: false,
      message: t('fieldNameInvalid', {name: 'index', errorline: __line}),
    });
  }
  Config.findOne(query, projection).exec(function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: t('configFindError', {errorline: __line}),
      });
    } else {
      if (!matchedConfig.traps_callbacks.devices_crud[deviceCrudIndex]) {
        return res.status(500).json({
          success: false,
          message: t('arrayElementNotFound'),
        });
      }
      matchedConfig.traps_callbacks.devices_crud.splice(deviceCrudIndex, 1);
      matchedConfig.save((err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: t('cpeSaveError', {errorline: __line}),
          });
        }
        return res.status(200).json({
          success: true,
          message: t('operationSuccessful'),
        });
      });
    }
  });
};

deviceListController.getDeviceCrudTrap = function(req, res) {
  // get callback url and user
  let query = {is_default: true};
  let projection = {traps_callbacks: true};
  Config.findOne(query, projection).exec(function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: t('configFindError', {errorline: __line}),
      });
    } else {
      const devicesCrud = matchedConfig.traps_callbacks.devices_crud.map(
        (d)=>({url: d.url, user: (d.user) ? d.user : ''}),
      );
      if (devicesCrud.length == 0) {
        return res.status(200).json({
          success: true,
          exists: false,
        });
      }
      return res.status(200).json({
        success: true,
        exists: true,
        url: devicesCrud[0].url,
        user: (devicesCrud[0].user) ? devicesCrud[0].user : '',
        devicesCrud: devicesCrud,
      });
    }
  });
};

deviceListController.setLanDeviceBlockState = function(req, res) {
  DeviceModel.findById(req.body.id, async function(err, matchedDevice) {
    if (err || !matchedDevice) {
      return res.status(500).json({success: false,
                                   message: t('cpeFindError',
                                    {errorline: __line})});
    }
    let devFound = false;
    for (let idx = 0; idx < matchedDevice.lan_devices.length; idx++) {
      if (matchedDevice.lan_devices[idx].mac === req.body.lanid) {
        matchedDevice.lan_devices[idx].is_blocked = req.body.isblocked;
        matchedDevice.blocked_devices_index = Date.now();
        devFound = true;
        break;
      }
    }
    if (devFound) {
      if (matchedDevice.use_tr069) {
        let result = {'success': false};
        result = await acsAccessControlHandler.changeAcRules(matchedDevice);
        if (!result || !result['success']) {
          // The return of change Access Control has established
          // error codes. It is possible to make res have
          // specific messages for each error code.
          let errorMessage = result.hasOwnProperty('message') ?
            result['message'] : t('acRuleDefaultError', {errorline: __line});
          return res.status(500).json({
            success: false,
            message: errorMessage,
          });
        }
      }
      matchedDevice.save(async function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: t('cpeSaveError', {errorline: __line})});
        }
        if (!matchedDevice.use_tr069) {
          mqtt.anlixMessageRouterUpdate(matchedDevice._id);
        }
        return res.status(200).json({'success': true});
      });
    } else {
      return res.status(500).json({success: false,
                                   message: t('lanDeviceFindError',
                                    {errorline: __line})});
    }
  });
};

deviceListController.updateLicenseStatus = async function(req, res) {
  if (!('id' in req.body)) {
    return res.status(500).json({success: false,
      message: t('jsonInvalidFormat', {errorline: __line})});
  }
  try {
    let matchedDevice = await DeviceModel.findOne(
      {$or: [
        {_id: req.body.id},
        {serial_tr069: req.body.id},
        {alt_uid_tr069: req.body.id},
      ]},
      {_id: true, serial_tr069: true, use_tr069: true,
       alt_uid_tr069: true, is_license_active: true});

    if (!matchedDevice) {
      return res.status(500).json({success: false,
                                   message: t('cpeNotFound',
                                    {errorline: __line})});
    }
    let deviceId = matchedDevice._id;
    if (matchedDevice.use_tr069 && matchedDevice.alt_uid_tr069) {
      deviceId = matchedDevice.alt_uid_tr069;
    } else if (matchedDevice.use_tr069) {
      deviceId = matchedDevice.serial_tr069;
    }
    let retObj = await controlApi.getLicenseStatus(req.app, deviceId);
    if (retObj.success) {
      if (matchedDevice.is_license_active === undefined) {
        matchedDevice.is_license_active = !retObj.isBlocked;
        await matchedDevice.save();
      } else if ((!retObj.isBlocked) !== matchedDevice.is_license_active) {
        matchedDevice.is_license_active = !retObj.isBlocked;
        await matchedDevice.save();
      }
      return res.json({success: true, status: !retObj.isBlocked});
    } else {
      return res.json({success: false, message: retObj.message});
    }
  } catch (err) {
    return res.status(500).json({success: false,
                                 message: t('serverError',
                                  {errorline: __line})});
  }
};

deviceListController.changeLicenseStatus = async function(req, res) {
  if (!('ids' in req.body) || !('block' in req.body)) {
    return res.status(500).json({success: false,
      message: t('jsonInvalidFormat', {errorline: __line})});
  }
  try {
    const newBlockStatus =
      (req.body.block === true || req.body.block === 'true');
    let devIds = req.body.ids;
    if (!Array.isArray(devIds)) {
      devIds = [devIds];
    }
    let matchedDevices = await DeviceModel.find(
      {$or: [
        {_id: {$in: devIds}},
        {serial_tr069: {$in: devIds}},
        {alt_uid_tr069: {$in: devIds}},
      ]},
      {_id: true, serial_tr069: true, use_tr069: true,
       alt_uid_tr069: true, is_license_active: true});

    if (matchedDevices.length === 0) {
      return res.status(500).json({success: false,
                                   message: t('cpesNotFound',
                                   {errorline: __line})});
    }
    const idsArray = matchedDevices.map((device)=> {
      if (device.use_tr069 && device.alt_uid_tr069) {
        return device.alt_uid_tr069;
      } else if (device.use_tr069) {
        return device.serial_tr069;
      } else {
        return device._id;
      }
    });
    let retObj =
      await controlApi.changeLicenseStatus(req.app, newBlockStatus, idsArray);
    if (retObj.success) {
      for (let device of matchedDevices) {
        device.is_license_active = !newBlockStatus;
        await device.save();
      }
      return res.json({success: true});
    } else {
      return res.json({success: false, message: retObj.message});
    }
  } catch (err) {
    return res.status(500).json({success: false,
                                 message: t('serverError',
                                 {errorline: __line})});
  }
};

// Returns the informations about the WAN for firmware devices
deviceListController.getWanInfo = async function(request, response) {
  let deviceId = request.params.id.toUpperCase();

  DeviceModel.findById(deviceId, function(error, matchedDevice) {
    // If an error occurred while finding the device
    if (error) {
      return request.status(400).json({
        processed: 0,
        success: false,
      });
    }

    // If could not find the device
    if (!matchedDevice) {
      return request.status(404).json({
        success: false,
        message: t('cpeNotFound', {errorline: __line}),
      });
    }

    // If it is TR069
    if (matchedDevice.use_tr069) {
      return request.status(404).json({
        success: false,
        message: t('cpeNotFound', {errorline: __line}),
      });
    }


    // Get the parameters
    let connectionType = matchedDevice.connection_type;
    let defaultGatewayV4 = matchedDevice.default_gateway_v4;
    let defaultGatewayV6 = matchedDevice.default_gateway_v6;

    let dnsServer = matchedDevice.dns_server;

    let pppoeMac = matchedDevice.pppoe_mac;
    let pppoeIp = matchedDevice.pppoe_ip;

    let ipv4Address = matchedDevice.wan_ip;
    let ipv4Mask = matchedDevice.wan_ipv4_mask;
    let ipv6Address = matchedDevice.wan_ipv6;
    let ipv6Mask = matchedDevice.wan_ipv6_mask;


    // Fill the request
    // Fields undefined is returned as blank
    return response.status(200).json({
      success: true,
      wan_conn_type: connectionType,

      default_gateway_v4: (defaultGatewayV4 ? defaultGatewayV4 : ''),
      default_gateway_v6: (defaultGatewayV6 ? defaultGatewayV6 : ''),

      dns_server: (dnsServer ? dnsServer : ''),

      pppoe_mac: (connectionType === 'pppoe' && pppoeMac ?
        pppoeMac : ''),
      pppoe_ip: (connectionType === 'pppoe' && pppoeIp ?
        pppoeIp : ''),

      ipv4_address: (ipv4Address ? ipv4Address : ''),
      ipv4_mask: (ipv4Mask ? ipv4Mask : ''),
      ipv6_address: (ipv6Address ? ipv6Address : ''),
      ipv6_mask: (ipv6Mask ? ipv6Mask : ''),
    });
  });
};


// Returns the informations about the LAN for firmware devices
deviceListController.getLanInfo = async function(request, response) {
  let deviceId = request.params.id.toUpperCase();

  DeviceModel.findById(deviceId, function(error, matchedDevice) {
    // If an error occurred while finding the device
    if (error) {
      return request.status(400).json({
        processed: 0,
        success: false,
      });
    }

    // If could not find the device
    if (!matchedDevice) {
      return request.status(404).json({
        success: false,
        message: t('cpeNotFound', {errorline: __line}),
      });
    }

    // If it is TR069
    if (matchedDevice.use_tr069) {
      return request.status(404).json({
        success: false,
        message: t('cpeNotFound', {errorline: __line}),
      });
    }


    // Get the parameters
    let prefixDelegationAddr = matchedDevice.prefix_delegation_addr;
    let prefixDelegationMask = matchedDevice.prefix_delegation_mask;
    let prefixDelegationLocal = matchedDevice.prefix_delegation_local;


    // Fill the request
    // Fields undefined is returned as blank
    return response.status(200).json({
      success: true,
      prefix_delegation_addr: (prefixDelegationAddr ?
        prefixDelegationAddr : ''),

      prefix_delegation_mask: (prefixDelegationMask ?
        prefixDelegationMask : ''),

      prefix_delegation_local: (prefixDelegationLocal ?
        prefixDelegationLocal : ''),
    });
  });
};

const commonDeviceFind = async function(req) {
  try {
    let devId = req.params.id.toUpperCase();
    let retDevs = await DeviceModel.findByMacOrSerial(devId);
    if (Array.isArray(retDevs) && retDevs.length > 0) {
      let device = retDevs[0];
      if (device && !device.use_tr069) {
        const isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
          return map[devId];
        });
        if (device && !isDevOn) {
          return {success: false, message: t('cpeNotOnline',
                                  {errorline: __line})};
        }
      }
      return {success: true, matchedDevice: device};
    } else {
      return {success: false, message: t('cpeNotFound', {errorline: __line})};
    }
  } catch (e) {
    return {success: false, message: t('cpeFindError', {errorline: __line})};
  }
};

deviceListController.sendCustomPingAPI = async function(req, res) {
  let devRes = await commonDeviceFind(req);
  if (devRes.success) {
    let commandResponse = await deviceListController.sendCustomPing(
      devRes.matchedDevice, req.body, req.user.name, req.sessionID,
    );
    return res.status(200).json(commandResponse);
  } else {
    return res.status(200).json(devRes);
  }
};
deviceListController.sendGenericPingAPI = async function(req, res) {
  let devRes = await commonDeviceFind(req);
  if (devRes.success) {
    let commandResponse = await deviceListController.sendGenericPing(
      devRes.matchedDevice, req.user.name, req.sessionID,
    );
    return res.status(200).json(commandResponse);
  } else {
    return res.status(200).json(devRes);
  }
};
deviceListController.sendCustomSpeedTestAPI = async function(req, res) {
  let devRes = await commonDeviceFind(req);
  if (devRes.success) {
    let commandResponse = await deviceListController.sendCustomSpeedTest(
      devRes.matchedDevice, req.body, req.user.name, req.sessionID,
    );
    return res.status(200).json(commandResponse);
  } else {
    return res.status(200).json(devRes);
  }
};
deviceListController.sendGenericSpeedTestAPI = async function(req, res) {
  let devRes = await commonDeviceFind(req);
  if (devRes.success) {
    let commandResponse = await deviceListController.sendGenericSpeedTest(
      devRes.matchedDevice, req.user.name, req.sessionID,
    );
    return res.status(200).json(commandResponse);
  } else {
    return res.status(200).json(devRes);
  }
};
deviceListController.sendCustomTraceRouteAPI = async function(req, res) {
  let devRes = await commonDeviceFind(req);
  if (devRes.success) {
    let commandResponse = await deviceListController.sendCustomTraceRoute(
      devRes.matchedDevice, req.body, req.user.name, req.sessionID,
    );
    return res.status(200).json(commandResponse);
  } else {
    return res.status(200).json(devRes);
  }
};
deviceListController.sendGenericTraceRouteAPI = async function(req, res) {
  let devRes = await commonDeviceFind(req);
  if (devRes.success) {
    let commandResponse = await deviceListController.sendGenericTraceRoute(
      devRes.matchedDevice, req.user.name, req.sessionID,
    );
    return res.status(200).json(commandResponse);
  } else {
    return res.status(200).json(devRes);
  }
};
deviceListController.sendGenericSiteSurveyAPI = async function(req, res) {
  let devRes = await commonDeviceFind(req);
  if (devRes.success) {
    let commandResponse = await deviceListController.sendGenericSiteSurvey(
      devRes.matchedDevice, req.user.name, req.sessionID,
    );
    return res.status(200).json(commandResponse);
  } else {
    return res.status(200).json(devRes);
  }
};

deviceListController.exportDevicesCsv = async function(req, res) {
  let queryContents = req.query.filter.split(',');

  try {
    const userRole = await Role.findOne({
      name: util.returnObjOrEmptyStr(req.user.role)});
    let finalQuery;
    if (req.user.is_superuser || userRole.grantSearchLevel >= 2) {
      finalQuery = await deviceListController.complexSearchDeviceQuery(
        queryContents);
    } else {
      finalQuery = deviceListController.simpleSearchDeviceQuery(
        queryContents);
    }
    let queryProjection = {
      '_id': true, 'serial_tr069': true, 'alt_uid_tr069': true,
      'connection_type': true, 'pppoe_user': true, 'pppoe_password': true,
      'lan_subnet': true, 'lan_netmask': true, 'wifi_ssid': true,
      'wifi_password': true, 'wifi_channel': true, 'wifi_band': true,
      'wifi_mode': true, 'wifi_ssid_5ghz': true, 'wifi_password_5ghz': true,
      'wifi_channel_5ghz': true, 'wifi_band_5ghz': true, 'wifi_mode_5ghz': true,
      'ip': true, 'wan_ip': true, 'ipv6_enabled': true,
      'wan_negociated_speed': true, 'wan_negociated_duplex': true,
      'external_reference.kind': true, 'external_reference.data': true,
      'model': true, 'version': true, 'hw_version': true,
      'installed_release': true, 'do_update': true,
    };

    let devices = {};
    devices = await DeviceModel.find(finalQuery, queryProjection).lean();

    let exportPasswords = (req.user.is_superuser || userRole.grantPassShow ?
                           true : false);

    devices = devices.map((device) => {
      let ipv6Enabled = t('No');
      if (device.ipv6_enabled === 1) {
        ipv6Enabled = t('Yes');
      } else if (device.ipv6_enabled === 2) {
        ipv6Enabled = t('Unknown');
      }
      device.ipv6_enabled = ipv6Enabled;
      return device;
    });

    const csvFields = [
      {label: t('macAddress'), value: '_id'},
      {label: t('serialIdentifier'), value: 'serial_tr069'},
      {label: t('alternativeTr069Identifier'), value: 'alt_uid_tr069'},
      {label: t('wanConnectionType'), value: 'connection_type'},
      {label: t('pppoeUser'), value: 'pppoe_user'},
    ];
    if (exportPasswords) {
      csvFields.push({label: t('pppoePassword'), value: 'pppoe_password'});
    }
    csvFields.push(
      {label: t('lanSubnetwork'), value: 'lan_subnet'},
      {label: t('lanMask'), value: 'lan_netmask'},
      {label: t('ssidWifi'), value: 'wifi_ssid'},
    );
    if (exportPasswords) {
      csvFields.push({label: t('passwordWifi'), value: 'wifi_password'});
    }
    csvFields.push(
      {label: t('channelWifi'), value: 'wifi_channel'},
      {label: t('bandwidth'), value: 'wifi_band'},
      {label: t('operationMode'), value: 'wifi_mode'},
      {label: t('ssidWifi5Ghz'), value: 'wifi_ssid_5ghz'},
    );
    if (exportPasswords) {
      csvFields.push({label: t('passwordWifi5Ghz'),
        value: 'wifi_password_5ghz'});
    }
    csvFields.push(
      {label: t('channelWifi5GHz'), value: 'wifi_channel_5ghz'},
      {label: t('xGhzBandwidth', {x: 5}), value: 'wifi_band_5ghz'},
      {label: t('xGhzOperationMode', {x: 5}), value: 'wifi_mode_5ghz'},
      {label: t('publicIp'), value: 'ip'},
      {label: t('wanIp'), value: 'wan_ip'},
      {label: t('IpvxEnabled', {x: 6}), value: 'ipv6_enabled'},
      {label: t('negotiatedWanSpeed'), value: 'wan_negociated_speed'},
      {label: t('duplexWanTransmissionMode'), value: 'wan_negociated_duplex'},
      {label: t('clientIdType'), value: 'external_reference.kind'},
      {label: t('clientId'), value: 'external_reference.data'},
      {label: t('cpeModel'), value: 'model'},
      {label: t('firmwareversion'), value: 'version'},
      {label: t('hardwareVersion'), value: 'hw_version'},
      {label: 'Release', value: 'installed_release'},
      {label: t('updatefirmware'), value: 'do_update'},
    );
    const json2csvParser = new Parser({fields: csvFields});
    const devicesCsv = json2csvParser.parse(devices);
    res.set('Content-Type', 'text/csv');
    return res.send(devicesCsv);
  } catch (err) {
    let emptyReturn = '';
    res.set('Content-Type', 'text/csv');
    return res.send(emptyReturn);
  }
};

deviceListController.editCoordinates = async function(req, res) {
  const devices = req.body.devices;
  let okCount = 0;
  let failCount = 0;
  let status = {};

  if (
    !(devices instanceof Array) ||
    devices.length === 0 ||
    devices.some((d)=>typeof d.id !== 'string')
  ) {
    return res.status(500).json({
      success: false,
      okCount: okCount,
      failCount: failCount,
      message: t('fieldNameInvalid', {name: 'devices', errorline: __line}),
      status: {},
    });
  }

  for (let device of devices) {
    let id = device.id;
    let latitude = device.latitude;
    let longitude = device.longitude;
    let preventAutoUpdate = device.preventAutoUpdate;

    let matchedDevice;
    try {
      matchedDevice = await DeviceModel.findByMacOrSerial(id);
      if (Array.isArray(matchedDevice) && matchedDevice.length > 0) {
        matchedDevice = matchedDevice[0];
      } else {
        failCount += 1;
        status[id] = {
          success: false, msg: t('cpeNotFound', {errorline: __line}),
        };
        continue;
      }
    } catch (e) {
      failCount += 1;
      status[id] = {
        success: false, msg: t('cpeFindError', {errorline: __line}),
      };
      continue;
    }

    let error = '';
    if (typeof latitude !== 'number') {
      error = t('fieldNameInvalid', {name: 'latitude', errorline: __line});
    } else if (typeof longitude !== 'number') {
      error = t('fieldNameInvalid', {name: 'longitude', errorline: __line});
    } else if (typeof preventAutoUpdate !== 'boolean') {
      error = t(
        'fieldNameInvalid', {name: 'preventAutoUpdate', errorline: __line},
      );
    }

    if (error) {
      failCount += 1;
      status[id] = {success: false, msg: error};
      continue;
    }

    matchedDevice.latitude = latitude;
    matchedDevice.longitude = longitude;
    matchedDevice.stop_coordinates_update = preventAutoUpdate;
    try {
      await matchedDevice.save();
    } catch (err) {
      failCount += 1;
      status[id] = {
        success: false, msg: t('cpeFindError', {errorline: __line}),
      };
      continue;
    }
    okCount += 1;
    status[id] = {success: true, msg: t('Success!')};
  }
  return res.status(200).json({
    success: okCount > 0,
    okCount: okCount,
    failCount: failCount,
    status: status,
  });
};

module.exports = deviceListController;
