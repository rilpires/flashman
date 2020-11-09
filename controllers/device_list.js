const Validator = require('../public/javascripts/device_validator');
const messaging = require('./messaging');
const DeviceModel = require('../models/device');
const User = require('../models/user');
const DeviceVersion = require('../models/device_version');
const Config = require('../models/config');
const Role = require('../models/role');
const mqtt = require('../mqtts');
const sio = require('../sio');
const deviceHandlers = require('./handlers/devices');
const meshHandlers = require('./handlers/mesh');
const util = require('./handlers/util');
const acsDeviceInfo = require('./acs_device_info.js');

let deviceListController = {};

const fs = require('fs');
const unzipper = require('unzipper');
const request = require('request');
const md5File = require('md5-file');
const requestPromise = require('request-promise-native');
const async = require('asyncawait/async');
const await = require('asyncawait/await');
const imageReleasesDir = process.env.FLM_IMG_RELEASE_DIR;

const stockFirmwareLink = 'https://cloud.anlix.io/s/KMBwfD7rcMNAZ3n/download?path=/&files=';

const intToWeekDayStr = function(day) {
  if (day === 0) return 'Domingo';
  if (day === 1) return 'Segunda';
  if (day === 2) return 'Terça';
  if (day === 3) return 'Quarta';
  if (day === 4) return 'Quinta';
  if (day === 5) return 'Sexta';
  if (day === 6) return 'Sábado';
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

deviceListController.getReleases = function(modelAsArray=false) {
  let releases = [];
  let releaseIds = [];
  fs.readdirSync(imageReleasesDir).forEach((filename) => {
    // File name pattern is VENDOR_MODEL_MODELVERSION_RELEASE.bin
    let fnameSubStrings = filename.split('_');
    let releaseSubStringRaw = fnameSubStrings[fnameSubStrings.length - 1];
    let releaseSubStringsRaw = releaseSubStringRaw.split('.');
    if (releaseSubStringsRaw[1] == 'md5') {
      // Skip MD5 hash files
      return;
    }
    let releaseId = releaseSubStringsRaw[0];
    let releaseModel = fnameSubStrings[1];
    if (fnameSubStrings.length == 4) {
      releaseModel += fnameSubStrings[2];
    }
    // Always make comparison using upper case
    releaseModel = releaseModel.toUpperCase();
    if (modelAsArray) {
      if (releaseIds.includes(releaseId)) {
        for (let i=0; i < releases.length; i++) {
          if (releases[i].id == releaseId) {
            releases[i].model.push(releaseModel);
            break;
          }
        }
      } else {
        let release = {id: releaseId, model: [releaseModel]};
        releases.push(release);
        releaseIds.push(releaseId);
      }
    } else {
      let release = {id: releaseId, model: releaseModel};
      releases.push(release);
    }
  });
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
  };

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

// getting values for inform configurations for tr069 from Config.
const getOnlyTR069Configs = async function(errormsg) {
  let configsWithTr069 = await Config.findOne({is_default: true}, 'tr069')
    .exec().catch((err) => err); // in case of error, return error in await.
  // it's very unlikely that we will incur in any error but,
  if (configsWithTr069.constructor === Error) { // if we returned an error.
    // print error message.
    console.log(errormsg, '\nUsing default values for tr069 config.');
    return { // build a default configuration.
      inform_interval: 10*60*1000,
      offline_threshold: 1,
      recovery_threshold: 3,
    };
  } else { // if no error.
    return configsWithTr069.tr069; // get only tr069 config inside the document.
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

  User.findOne({name: req.user.name}, function(err, user) {
    if (err || !user) {
      indexContent.superuser = false;
    } else {
      indexContent.superuser = user.is_superuser;
    }

    Config.findOne({is_default: true}, function(err, matchedConfig) {
      if (err || !matchedConfig) {
        indexContent.update = false;
      } else {
        indexContent.update = matchedConfig.hasUpdate;
        indexContent.minlengthpasspppoe = matchedConfig.pppoePassLength;
        let active = matchedConfig.measure_configs.is_active;
        indexContent.measure_active = active;
        indexContent.measure_token = (active) ?
            matchedConfig.measure_configs.auth_token : '';
        let license = matchedConfig.measure_configs.is_license_active;
        indexContent.measure_license = license;
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

deviceListController.changeUpdate = function(req, res) {
  DeviceModel.findById(req.params.id, function(err, matchedDevice) {
    if (err || !matchedDevice) {
      let indexContent = {};
      indexContent.type = 'danger';
      indexContent.message = err.message;
      return res.status(500).json({success: false,
                                   message: 'Erro ao encontrar dispositivo'});
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
        message: 'Este roteador é um slave de uma rede mesh, sua atualização '+
                 'deve ser feita a partir do mestre de sua rede',
      });
    }
    matchedDevice.do_update = doUpdate;
    if (doUpdate) {
      matchedDevice.do_update_status = 0; // waiting
      matchedDevice.release = req.params.release.trim();
      messaging.sendUpdateMessage(matchedDevice);
      // Set mesh master's remaining updates field to keep track of network
      // update progress. This is only a helper value for the frontend.
      if (matchedDevice.mesh_slaves && matchedDevice.mesh_slaves.length > 0) {
        let slaveCount = matchedDevice.mesh_slaves.length;
        matchedDevice.do_update_mesh_remaining = slaveCount + 1;
      }
    } else {
      matchedDevice.do_update_status = 1; // success
      meshHandlers.syncUpdateCancel(matchedDevice);
    }
    matchedDevice.save(function(err) {
      if (err) {
        let indexContent = {};
        indexContent.type = 'danger';
        indexContent.message = err.message;
        return res.status(500).json({success: false,
                                     message: 'Erro ao registrar atualização'});
      }

      mqtt.anlixMessageRouterUpdate(matchedDevice._id);
      res.status(200).json({'success': true});

      // Start ack timeout
      deviceHandlers.timeoutUpdateAck(matchedDevice._id);
    });
  });
};

deviceListController.changeUpdateMesh = function(req, res) {
  DeviceModel.findById(req.params.id, function(err, matchedDevice) {
    if (err || !matchedDevice) {
      let indexContent = {};
      indexContent.type = 'danger';
      indexContent.message = err.message;
      return res.status(500).json({success: false,
                                   message: 'Erro ao encontrar dispositivo'});
    }
    // Cast to boolean so that javascript works as intended
    let doUpdate = req.body.do_update;
    if (typeof req.body.do_update === 'string') {
      doUpdate = (req.body.do_update === 'true');
    }
    // Reject update cancel command to mesh slave, use above function instead
    if (!doUpdate) {
      return res.status(500).json({
        success: false,
        message: 'Esta função só deve ser usada para marcar um slave para '+
          'atualizar, não para cancelar a atualização',
      });
    }
    matchedDevice.do_update = true;
    matchedDevice.do_update_status = 0; // waiting
    matchedDevice.release = req.params.release.trim();
    messaging.sendUpdateMessage(matchedDevice);
    matchedDevice.save(function(err) {
      if (err) {
        let indexContent = {};
        indexContent.type = 'danger';
        indexContent.message = err.message;
        return res.status(500).json({success: false,
                                     message: 'Erro ao registrar atualização'});
      }

      mqtt.anlixMessageRouterUpdate(matchedDevice._id);
      res.status(200).json({'success': true});

      // Start ack timeout
      deviceHandlers.timeoutUpdateAck(matchedDevice._id);
    });
  });
};

deviceListController.changeAllUpdates = function(req, res) {
  let form = JSON.parse(req.body.content);
  DeviceModel.find({'_id': {'$in': Object.keys(form.ids)}},
  function(err, matchedDevices) {
    if (err) {
      let indexContent = {};
      indexContent.type = 'danger';
      indexContent.message = err.message;
      return res.render('error', indexContent);
    }

    let scheduledDevices = [];
    for (let idx = 0; idx < matchedDevices.length; idx++) {
      matchedDevices[idx].do_update = form.do_update;
      if (form.do_update) {
        matchedDevices[idx].release = form.ids[matchedDevices[idx]._id].trim();
        matchedDevices[idx].do_update_status = 0; // waiting
        messaging.sendUpdateMessage(matchedDevices[idx]);
      } else {
        matchedDevices[idx].do_update_status = 1; // success
      }
      matchedDevices[idx].save();
      mqtt.anlixMessageRouterUpdate(matchedDevices[idx]._id);
      scheduledDevices.push(matchedDevices[idx]._id);
    }

    return res.status(200).json({'success': true, 'devices': scheduledDevices});
  });
};

deviceListController.simpleSearchDeviceQuery = function(queryContents) {
  let finalQuery = {};
  let queryContentNoCase = new RegExp('^' + queryContents[0] + '$', 'i');
  if (queryContents[0].length > 0) {
    finalQuery.$or = [
      {pppoe_user: queryContentNoCase},
      {_id: queryContentNoCase},
      {'external_reference.data': queryContentNoCase},
    ];
  } else {
    finalQuery = {_id: ''};
  }
  return finalQuery;
};

deviceListController.complexSearchDeviceQuery = async function(queryContents,
 mqttClients, lastHour, tr069Times) {
  let finalQuery = {};
  let finalQueryArray = [];

  // Defaults to match all query contents
  let queryLogicalOperator = '$and';
  if (queryContents.includes('/ou')) {
    queryLogicalOperator = '$or';
    queryContents = queryContents.filter((query) => query !== '/ou');
  }
  queryContents = queryContents.filter((query) => query !== '/e');
  // setting higher level logical operator for 'finalQuery'.
  finalQuery[queryLogicalOperator] = finalQueryArray;

  // tags that are computed differently for each communication protocol.
  let statusTags = {
    online: /^online$/, instavel: /^instavel$/, offline: /^offline$/,
    'offline >': /^offline >.*/,
  };
  // mapping to regular expression because one tag has a parameter inside and
  // won't make an exact match, but the other tags need to be exact.

  for (let idx=0; idx < queryContents.length; idx++) {
    let tag = queryContents[idx].toLowerCase(); // assigning tag to variable.
    let query = {}; // to be appended to array of queries used in pagination.

    if (Object.values(statusTags).some((r) => r.test(tag))) {
    // if we need more than one query for each controller protocol.

      /* if arguments are undefined, we define them only if we are going to use
 them. */
      if (mqttClients === undefined) {
        mqttClients = mqtt.getConnectedClients();
      };
      let currentTime = Date.now();
      if (lastHour === undefined) {
        lastHour = new Date(currentTime -3600000);
      };
      if (tr069Times === undefined) {
        let tr069 = await getOnlyTR069Configs('Error when getting tr069 '
        +'parameters in database to for \'complexSearchDeviceQuery\'.');
        tr069Times = { // thresholds for tr069 status classification.
          // time when devices are considered in recovery for tr069.
          recovery: new Date(currentTime - (tr069.inform_interval*
           tr069.recovery_threshold)),
          // time when devices are considered offline for tr069.
          offline: new Date(currentTime - (tr069.inform_interval*
           tr069.offline_threshold)),
        };
      };

      // variables that will hold one query for each controller protocol.
      let flashbox; let tr069;

      // each tag has their specific query for each controller protocol.
      if (statusTags['online'].test(tag)) {
        flashbox = {
          _id: {$in: mqttClients},
          last_contact: {$gte: lastHour},
        };
        tr069 = {last_contact: {$gte: tr069Times.recovery}};
      } else if (statusTags['instavel'].test(tag)) {
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
      } else if (statusTags['offline >'].test(tag)) {
        const parsedHour = Math.abs(parseInt(tag.split('>')[1]));
        const hourThreshold = !isNaN(parsedHour) ? parsedHour*3600000 : 0;
        flashbox = {
          _id: {$nin: mqttClients},
          last_contact: {$lt: new Date(lastHour - hourThreshold)},
        };
        tr069 = {last_contact:
          {$lt: new Date(tr069Times.offline - hourThreshold)},
        };
      };
      flashbox.use_tr069 = {$ne: true}; // this will select only flashbox.
      tr069.use_tr069 = true; // this will select only tr069.
      query.$or = [flashbox, tr069]; // select either one.
    } else if (/^(?:update|upgrade) (?:on|off)$/.test(tag)) {
    // update|upgrade on|off.
      query.use_tr069 = {$ne: true}; // only for flashbox.
      if (tag.includes('on')) { // 'update on' or 'upgrade on'.
        query.do_update = {$eq: true};
      } else if (tag.includes('off')) { // 'update off' or 'upgrade off'.
        query.do_update = {$eq: false};
      }
    } else if (tag === 'flashbox') { // Anlix Flashbox routers.
      query.use_tr069 = {$ne: true};
    } else if (tag === 'onu') { // ONU routers.
      query.use_tr069 = true;
    } else if (queryContents[idx] !== '') { // all other non empty filters.
      let queryArray = [];
      let contentCondition = '$or';
      // Check negation condition
      if (queryContents[idx].startsWith('/excluir')) {
        const filterContent = queryContents[idx].split('/excluir')[1].trim();
        let queryInput = new RegExp(filterContent, 'i');
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
        let queryInput = new RegExp(queryContents[idx], 'i');
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
      (query) => query !== '/sort-sys-uptime'
    );
    sortKeys.sys_up_time = sortTypeOrder;
  } else if (queryContents.includes('/sort-wan-uptime')) {
    queryContents = queryContents.filter(
      (query) => query !== '/sort-wan-uptime'
    );
    sortKeys.wan_up_time = sortTypeOrder;
  } else {
    sortKeys._id = sortTypeOrder;
  }

  let currentTime = Date.now();
  let lastHour = new Date(currentTime -3600000);
  // getting user configurations.
  let matchedConfig = await Config.findOne({is_default: true},
    'tr069 pppoePassLength').exec().catch((err) => err);
  if (matchedConfig.constructor === Error) {
    console.log('Error when getting user config in database to build '
      +'device list.');
    return;
  }
  let tr069Times = { // thresholds for tr069 status classification.
    // time when devices are considered in recovery for tr069.
    recovery: new Date(currentTime - (matchedConfig.tr069.inform_interval*
      matchedConfig.tr069.recovery_threshold)),
    // time when devices are considered offline for tr069.
    offline: new Date(currentTime - (matchedConfig.tr069.inform_interval*
      matchedConfig.tr069.offline_threshold)),
  };


  // online devices.
  // will be passed to the functions that need an array of ids.
  let mqttClientsArray = mqtt.getConnectedClients();
  // will be used in functions that need to access devices per id.
  let mqttClientsMap = {};
  for (let i = 0; i < mqttClientsArray.length; i++) {
    mqttClientsMap[mqttClientsArray[i]] = true;
  };

  const userRole = await Role.findOne({
    name: util.returnObjOrEmptyStr(req.user.role)
  });
  let finalQuery;
  if (req.user.is_superuser || userRole.grantSearchLevel >= 2) {
    finalQuery = await deviceListController.complexSearchDeviceQuery(
     queryContents, mqttClientsArray, currentTime, tr069Times);
  } else {
    finalQuery = deviceListController.simpleSearchDeviceQuery(queryContents);
  };

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
    let releases = deviceListController.getReleases();

    let enrichDevice = function(device) {
      const model = device.model.replace('N/', '');
      const devReleases = releases.filter((release) => release.model === model);
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
        };
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
      device.permissions = DeviceVersion.findByVersion(
        device.version,
        device.wifi_is_5ghz_capable,
        device.model,
      );

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

    meshHandlers.enhanceSearchResult(matchedDevices.docs).then(function(extra) {
      let allDevices = extra.concat(matchedDevices.docs).map(enrichDevice);
      User.findOne({name: req.user.name}, function(err, user) {
        getOnlineCount(finalQuery, mqttClientsArray, lastHour, tr069Times)
        .then((onlineStatus) => {
          // Counters
          let status = {};
          status = Object.assign(status, onlineStatus);
          // Filter data using user permissions
          return res.json({
            success: true,
            type: 'success',
            limit: req.user.maxElementsPerPage,
            page: matchedDevices.page,
            pages: matchedDevices.pages,
            min_length_pass_pppoe: matchedConfig.pppoePassLength,
            status: status,
            single_releases: deviceListController.getReleases(true),
            filter_list: req.body.filter_list,
            devices: allDevices,
          });
        }, (err) => {
          return res.json({
            success: false,
            type: 'danger',
            message: err.message,
          });
        });
      });
    });
  });
};

deviceListController.delDeviceReg = function(req, res) {
  DeviceModel.find({'_id': {$in: req.body.ids}}, function(err, devices) {
    if (err || !devices) {
      console.log('User delete error: ' + err);
      return res.json({
        success: false,
        type: 'danger',
        message: 'Erro interno ao remover cadastro(s)',
      });
    }
    devices.forEach((device) => {
      deviceHandlers.removeDeviceFromDatabase(device);
    });
    return res.json({
      success: true,
      type: 'success',
      message: 'Cadastro(s) removido(s) com sucesso!',
    });
  });
};

const downloadStockFirmware = function(model) {
  return new Promise(async((resolve, reject)=>{
    let remoteFileUrl = stockFirmwareLink + model + '_9999-aix.zip';
    try {
      // Download md5 hash
      let targetMd5 = await(requestPromise({
        url: remoteFileUrl + '.md5',
        method: 'GET',
      }));
      let currentMd5 = '';
      let localMd5Path = imageReleasesDir + '.' + model + '_9999-aix.zip.md5';
      // Check for local md5 hash
      if (fs.existsSync(localMd5Path)) {
        currentMd5 = fs.readFileSync(localMd5Path, 'utf8');
      }
      if (targetMd5 !== currentMd5) {
        // Mismatch, download new zip file
        console.log('UPDATE: Downloading factory reset fware for '+model+'...');
        fs.writeFileSync(localMd5Path, targetMd5);
        let responseStream = request({ url: remoteFileUrl, method: 'GET' })
        .on('error', (err)=>{
          console.log(err);
          return resolve(false);
        })
        .on('response', (resp)=>{
          if (resp.statusCode !== 200) {
            return resolve(false);
          }
          responseStream.pipe(unzipper.Parse()).on('entry', (entry)=>{
            let fname = entry.path;
            let writeStream = fs.createWriteStream(imageReleasesDir + fname);
            writeStream.on('close', ()=>{
              let md5fname = imageReleasesDir + '.' + fname.replace('.bin', '.md5');
              let binfname = imageReleasesDir + fname;
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
  }));
};

deviceListController.factoryResetDevice = function(req, res) {
  DeviceModel.findById(req.params.id.toUpperCase(), async((err, device)=>{
    if (err || !device) {
      return res.status(500).json({
        success: false,
        message: 'Roteador não encontrado na base de dados',
      });
    }
    const model = device.model.replace('N/', '');
    if (!(await(downloadStockFirmware(model)))) {
      return res.status(500).json({
        success: false,
        msg: 'Erro baixando a firmware de fábrica',
      });
    }
    device.do_update = true;
    device.do_update_status = 0; // waiting
    device.release = '9999-aix';
    await(device.save());
    console.log('UPDATE: Factory resetting router ' + device._id + '...');
    mqtt.anlixMessageRouterUpdate(device._id);
    res.status(200).json({success: true});
    // Start ack timeout
    deviceHandlers.timeoutUpdateAck(device._id);
  }));
};

//
// REST API only functions
//

deviceListController.sendMqttMsg = function(req, res) {
  let msgtype = req.params.msg.toLowerCase();

  DeviceModel.findById(req.params.id.toUpperCase(),
  function(err, device) {
    if (err) {
      return res.status(200).json({success: false,
                                   message: 'Erro interno do servidor'});
    }
    if (device == null) {
      return res.status(200).json({success: false,
                                   message: 'Roteador não encontrado'});
    }
    let permissions = DeviceVersion.findByVersion(device.version,
                                                  device.wifi_is_5ghz_capable);

    switch (msgtype) {
      case 'rstapp':
        if (device) {
          device.app_password = undefined;
          device.save();
        }
        mqtt.anlixMessageRouterResetApp(req.params.id.toUpperCase());
        break;
      case 'rstdevices':
        if (!permissions.grantResetDevices) {
          return res.status(200).json({
            success: false,
            message: 'Roteador não possui essa função!',
          });
        } else if (device) {
          device.lan_devices = device.lan_devices.map((lanDevice) => {
            lanDevice.is_blocked = false;
            return lanDevice;
          });
          device.blocked_devices_index = Date.now();
          device.save();
        }
        mqtt.anlixMessageRouterUpdate(req.params.id.toUpperCase());
        break;
      case 'rstmqtt':
        if (device) {
          device.mqtt_secret = undefined;
          device.mqtt_secret_bypass = true;
          device.save();
        }
        mqtt.anlixMessageRouterResetMqtt(req.params.id.toUpperCase());
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
          device.save(function(err) {
            mqtt.anlixMessageRouterUpdate(req.params.id.toUpperCase());
          });
        }
        break;
      case 'log':
      case 'boot':
      case 'onlinedevs':
      case 'ping':
      case 'upstatus':
      case 'speedtest':
      case 'wps': {
        const isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
          return map[req.params.id.toUpperCase()];
        });
        if (device && !device.use_tr069 && !isDevOn) {
          return res.status(200).json({success: false,
                                     message: 'Roteador não esta online!'});
        }
        if (msgtype === 'speedtest') {
          return deviceListController.doSpeedTest(req, res);
        } else if (msgtype === 'boot') {
          if (device && device.use_tr069) {
            // acs integration will respond to request
            return acsDeviceInfo.rebootDevice(device, res);
          } else {
            mqtt.anlixMessageRouterReboot(req.params.id.toUpperCase());
          }
        } else if (msgtype === 'onlinedevs') {
          let slaves = (device.mesh_slaves) ? device.mesh_slaves : [];
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
            slaves.forEach((slave)=>{
              mqtt.anlixMessageRouterOnlineLanDevs(slave.toUpperCase());
            });
          }
        } else if (msgtype === 'ping') {
          if (req.sessionID && sio.anlixConnections[req.sessionID]) {
            sio.anlixWaitForPingTestNotification(
              req.sessionID, req.params.id.toUpperCase());
          }
          mqtt.anlixMessageRouterPingTest(req.params.id.toUpperCase());
        } else if (msgtype === 'upstatus') {
          let slaves = (device.mesh_slaves) ? device.mesh_slaves : [];
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
            acsDeviceInfo.requestWanBytes(device);
          } else {
            mqtt.anlixMessageRouterUpStatus(req.params.id.toUpperCase());
            slaves.forEach((slave)=>{
              mqtt.anlixMessageRouterUpStatus(slave.toUpperCase());
            });
          }
        } else if (msgtype === 'log') {
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
              message: 'Esse comando somente funciona em uma sessão!',
            });
          }
        } else if (msgtype === 'wps') {
          if (!('activate' in req.params) ||
              !(typeof req.params.activate === 'boolean')
          ) {
            return res.status(200).json({
              success: false,
              message: 'Erro na requisição'});
          }
          mqtt.anlixMessageRouterWpsButton(req.params.id.toUpperCase(),
                                           req.params.activate);
        } else {
          return res.status(200).json({
            success: false,
            message: 'Esse comando não existe',
          });
        }
        break;
      }
      default:
        // Message not implemented
        console.log('REST API MQTT Message not recognized (' + msgtype + ')');
        return res.status(200).json({success: false,
                                     message: 'Esse comando não existe'});
    }

    return res.status(200).json({success: true});
  });
};

deviceListController.getFirstBootLog = function(req, res) {
  DeviceModel.findById(req.params.id.toUpperCase(),
  function(err, matchedDevice) {
    if (err) {
      return res.status(200).json({success: false,
                                   message: 'Erro interno do servidor'});
    }
    if (matchedDevice == null) {
      return res.status(200).json({success: false,
                                   message: 'Roteador não encontrado'});
    }

    if (matchedDevice.firstboot_log) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Type', 'text/plain');
      res.end(matchedDevice.firstboot_log, 'binary');
      return res.status(200);
    } else {
      return res.status(200).json({success: false,
                                   message: 'Não existe log deste roteador'});
    }
  });
};

deviceListController.getLastBootLog = function(req, res) {
  DeviceModel.findById(req.params.id.toUpperCase(),
  function(err, matchedDevice) {
    if (err) {
      return res.status(200).json({success: false,
                                   message: 'Erro interno do servidor'});
    }
    if (matchedDevice == null) {
      return res.status(200).json({success: false,
                                   message: 'Roteador não encontrado'});
    }

    if (matchedDevice.lastboot_log) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Type', 'text/plain');
      res.end(matchedDevice.lastboot_log, 'binary');
      return res.status(200);
    } else {
      return res.status(200).json({success: false,
                                   message: 'Não existe log deste roteador'});
    }
  });
};

deviceListController.getDeviceReg = function(req, res) {
  DeviceModel.findById(req.params.id.toUpperCase()).lean().exec(
  async function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({success: false,
                                   message: 'Erro interno do servidor'});
    }
    if (matchedDevice == null) {
      return res.status(404).json({success: false,
                                   message: 'Roteador não encontrado'});
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
      // getting tr069 inform parameters.
      let tr069Configs = await getOnlyTR069Configs('Error when getting tr069 '
        +'parameters in database to set tr069 status color in device list '
        +'line item.');
      let currentTime = Date.now();
      // // thresholds for tr069 status classification.
      // time when devices are considered in recovery for tr069.
      let recoveryTime = new Date(currentTime - (tr069Configs.inform_interval*
        tr069Configs.recovery_threshold));
      // time when devices are considered offline for tr069.
      let offlineTime = new Date(currentTime - (tr069Configs.inform_interval*
        tr069Configs.offline_threshold));
      // // classifying device status.
      if (matchedDevice.last_contact >= recoveryTime) {
      // if we are inside first threshold.
        deviceColor = 'green';
        matchedDevice.online_status = true;
      } else if (matchedDevice.last_contact >= offlineTime) {
      // if we are inside second threshold.
        deviceColor = 'red';
      };
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
      } else if (matchedDevice.last_contact.getTime() >= lastHour.getTime()) {
        deviceColor = 'red';
      }
    }
    matchedDevice.status_color = deviceColor;

    return res.status(200).json(matchedDevice);
  });
};

deviceListController.setDeviceReg = function(req, res) {
  DeviceModel.findById(req.params.id.toUpperCase(),
  function(err, matchedDevice) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: [],
      });
    }
    if (matchedDevice == null) {
      return res.status(404).json({
        success: false,
        message: 'Roteador não encontrado',
        errors: [],
      });
    }

    if (util.isJSONObject(req.body.content)) {
      let content = req.body.content;
      let updateParameters = false;
      let validator = new Validator();

      let errors = [];
      let connectionType = util.returnObjOrEmptyStr(content.connection_type).trim();
      let pppoeUser = util.returnObjOrEmptyStr(content.pppoe_user).trim();
      let pppoePassword = util.returnObjOrEmptyStr(content.pppoe_password).trim();
      let ipv6Enabled = parseInt(util.returnObjOrNum(content.ipv6_enabled, 2));
      let lanSubnet = util.returnObjOrEmptyStr(content.lan_subnet).trim();
      let lanNetmask = util.returnObjOrEmptyStr(content.lan_netmask).trim();
      let ssid = util.returnObjOrEmptyStr(content.wifi_ssid).trim();
      let password = util.returnObjOrEmptyStr(content.wifi_password).trim();
      let channel = util.returnObjOrEmptyStr(content.wifi_channel).trim();
      let band = util.returnObjOrEmptyStr(content.wifi_band).trim();
      let mode = util.returnObjOrEmptyStr(content.wifi_mode).trim();
      let power = parseInt(util.returnObjOrNum(content.wifi_power, 100));
      let wifiState = parseInt(util.returnObjOrNum(content.wifi_state, 1));
      let wifiHidden = parseInt(util.returnObjOrNum(content.wifi_hidden, 0));
      let ssid5ghz = util.returnObjOrEmptyStr(content.wifi_ssid_5ghz).trim();
      let password5ghz = util.returnObjOrEmptyStr(content.wifi_password_5ghz).trim();
      let channel5ghz = util.returnObjOrEmptyStr(content.wifi_channel_5ghz).trim();
      let band5ghz = util.returnObjOrEmptyStr(content.wifi_band_5ghz).trim();
      let mode5ghz = util.returnObjOrEmptyStr(content.wifi_mode_5ghz).trim();
      let power5ghz = parseInt(util.returnObjOrNum(content.wifi_power_5ghz, 100));
      let wifiState5ghz = parseInt(util.returnObjOrNum(content.wifi_state_5ghz, 1));
      let wifiHidden5ghz = parseInt(util.returnObjOrNum(content.wifi_hidden_5ghz, 0));
      let bridgeEnabled = parseInt(util.returnObjOrNum(content.bridgeEnabled, 1)) === 1;
      let bridgeDisableSwitch = parseInt(util.returnObjOrNum(content.bridgeDisableSwitch, 1)) === 1;
      let bridgeFixIP = util.returnObjOrEmptyStr(content.bridgeFixIP).trim();
      let bridgeFixGateway = util.returnObjOrEmptyStr(content.bridgeFixGateway).trim();
      let bridgeFixDNS = util.returnObjOrEmptyStr(content.bridgeFixDNS).trim();
      let meshMode = parseInt(util.returnObjOrNum(content.mesh_mode, 0));
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

      Config.findOne({is_default: true}, function(err, matchedConfig) {
        if (err || !matchedConfig) {
          console.log('Error returning default config');
          return res.status(500).json({
            success: false,
            message: 'Erro ao encontrar configuração',
            errors: [],
          });
        }

        // Validate fields
        if (connectionType != 'pppoe' && connectionType != 'dhcp' &&
            connectionType != '') {
          return res.status(500).json({
            success: false,
            message: 'Tipo de conexão deve ser "pppoe" ou "dhcp"',
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
        if (content.hasOwnProperty('wifi_ssid')) {
          genericValidate(ssid, validator.validateSSID, 'ssid');
        }
        if (content.hasOwnProperty('wifi_password')) {
          genericValidate(password, validator.validateWifiPassword, 'password');
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
          genericValidate(ssid5ghz, validator.validateSSID, 'ssid5ghz');
        }
        if (content.hasOwnProperty('wifi_password_5ghz')) {
          genericValidate(password5ghz,
                          validator.validateWifiPassword, 'password5ghz');
        }
        if (content.hasOwnProperty('wifi_channel_5ghz')) {
          genericValidate(channel5ghz,
                          validator.validateChannel, 'channel5ghz');
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

        if (errors.length < 1) {
          Role.findOne({name: util.returnObjOrEmptyStr(req.user.role)},
          function(err, role) {
            if (err) {
              console.log(err);
            }
            let superuserGrant = false;
            if (!role && req.user.is_superuser) {
              superuserGrant = true;
            }
            let changes = {wan: {}, lan: {}, wifi2: {}, wifi5: {}};
            if (connectionType != '' && (superuserGrant || role.grantWanType) &&
                !matchedDevice.bridge_mode_enabled &&
                !matchedDevice.use_tr069) {
              // Only alter connection type if not in bridge mode and not tr-069
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
            }
            if (content.hasOwnProperty('pppoe_user') &&
                (superuserGrant || role.grantPPPoEInfo > 1) &&
                pppoeUser !== '' && !matchedDevice.bridge_mode_enabled) {
              if (matchedDevice.pppoe_user !== pppoeUser) {
                changes.wan.pppoe_user = pppoeUser;
              }
              matchedDevice.pppoe_user = pppoeUser;
              updateParameters = true;
            }
            if (content.hasOwnProperty('pppoe_password') &&
                (superuserGrant || role.grantPPPoEInfo > 1) &&
                pppoePassword !== '' && !matchedDevice.bridge_mode_enabled) {
              if (matchedDevice.pppoe_password !== pppoePassword) {
                changes.wan.pppoe_pass = pppoePassword;
              }
              matchedDevice.pppoe_password = pppoePassword;
              updateParameters = true;
            }
            if (content.hasOwnProperty('ipv6_enabled')) {
              matchedDevice.ipv6_enabled = ipv6Enabled;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_ssid') &&
                (superuserGrant || role.grantWifiInfo > 1) &&
                ssid !== '') {
              if (matchedDevice.wifi_ssid !== ssid) {
                changes.wifi2.ssid = ssid;
              }
              matchedDevice.wifi_ssid = ssid;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_password') &&
                (superuserGrant || role.grantWifiInfo > 1) &&
                password !== '') {
              if (matchedDevice.wifi_password !== password) {
                changes.wifi2.password = password;
              }
              matchedDevice.wifi_password = password;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_channel') &&
                (superuserGrant || role.grantWifiInfo > 1) &&
                channel !== '') {
              if (matchedDevice.wifi_channel !== channel) {
                changes.wifi2.channel = channel;
              }
              matchedDevice.wifi_channel = channel;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_band') &&
                (superuserGrant || role.grantWifiInfo > 1) &&
                band !== '') {
              if (matchedDevice.wifi_band !== band) {
                changes.wifi2.band = band;
              }
              matchedDevice.wifi_band = band;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_mode') &&
                (superuserGrant || role.grantWifiInfo > 1) &&
                mode !== '') {
              if (matchedDevice.wifi_mode !== mode) {
                changes.wifi2.mode = mode;
              }
              matchedDevice.wifi_mode = mode;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_state') &&
               (superuserGrant || role.grantWifiInfo > 1)) {
              if (matchedDevice.wifi_state !== wifiState) {
                changes.wifi2.enable = wifiState;
              }
              matchedDevice.wifi_state = wifiState;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_hidden') &&
               (superuserGrant || role.grantWifiInfo > 1)) {
              matchedDevice.wifi_hidden = wifiHidden;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_power') &&
                (superuserGrant || role.grantWifiInfo > 1) &&
                power !== '') {
              matchedDevice.wifi_power = power;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_ssid_5ghz') &&
                (superuserGrant || role.grantWifiInfo > 1) &&
                ssid5ghz !== '') {
              if (matchedDevice.wifi_ssid_5ghz !== ssid5ghz) {
                changes.wifi5.ssid = ssid5ghz;
              }
              matchedDevice.wifi_ssid_5ghz = ssid5ghz;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_password_5ghz') &&
                (superuserGrant || role.grantWifiInfo > 1) &&
                password5ghz !== '') {
              if (matchedDevice.wifi_password_5ghz !== password5ghz) {
                changes.wifi5.password = password5ghz;
              }
              matchedDevice.wifi_password_5ghz = password5ghz;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_channel_5ghz') &&
                (superuserGrant || role.grantWifiInfo > 1) &&
                channel5ghz !== '') {
              if (matchedDevice.wifi_channel_5ghz !== channel5ghz) {
                changes.wifi5.channel = channel5ghz;
              }
              matchedDevice.wifi_channel_5ghz = channel5ghz;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_band_5ghz') &&
                (superuserGrant || role.grantWifiInfo > 1) &&
                band5ghz !== '') {
              if (matchedDevice.wifi_band_5ghz !== band5ghz) {
                changes.wifi5.band = band5ghz;
              }
              matchedDevice.wifi_band_5ghz = band5ghz;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_mode_5ghz') &&
                (superuserGrant || role.grantWifiInfo > 1) &&
                mode5ghz !== '') {
              if (matchedDevice.wifi_mode_5ghz !== mode5ghz) {
                changes.wifi5.mode = mode5ghz;
              }
              matchedDevice.wifi_mode_5ghz = mode5ghz;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_state_5ghz') &&
               (superuserGrant || role.grantWifiInfo > 1)) {
              if (matchedDevice.wifi_state_5ghz !== wifiState5ghz) {
                changes.wifi5.enable = wifiState5ghz;
              }
              matchedDevice.wifi_state_5ghz = wifiState5ghz;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_hidden_5ghz') &&
               (superuserGrant || role.grantWifiInfo > 1)) {
              matchedDevice.wifi_hidden_5ghz = wifiHidden5ghz;
              updateParameters = true;
            }
            if (content.hasOwnProperty('wifi_power_5ghz') &&
                (superuserGrant || role.grantWifiInfo > 1) &&
                power5ghz !== '') {
              matchedDevice.wifi_power_5ghz = power5ghz;
              updateParameters = true;
            }
            if (content.hasOwnProperty('lan_subnet') &&
                (superuserGrant || role.grantLanEdit) &&
                lanSubnet !== '' && !matchedDevice.bridge_mode_enabled) {
              if (matchedDevice.lan_subnet !== lanSubnet) {
                changes.lan.router_ip = lanSubnet;
              }
              matchedDevice.lan_subnet = lanSubnet;
              updateParameters = true;
            }
            if (content.hasOwnProperty('lan_netmask') &&
                (superuserGrant || role.grantLanEdit) &&
                lanNetmask !== '' && !matchedDevice.bridge_mode_enabled) {
              if (matchedDevice.lan_netmask !== parseInt(lanNetmask)) {
                changes.lan.subnet_mask = parseInt(lanNetmask);
              }
              matchedDevice.lan_netmask = lanNetmask;
              updateParameters = true;
            }
            if (content.hasOwnProperty('external_reference') &&
                (superuserGrant || role.grantDeviceId)) {
              matchedDevice.external_reference.kind =
                content.external_reference.kind;
              matchedDevice.external_reference.data =
                content.external_reference.data;
            }
            if (content.hasOwnProperty('bridgeEnabled') &&
                (superuserGrant || role.grantOpmodeEdit) &&
                !matchedDevice.use_tr069) {
              matchedDevice.bridge_mode_enabled = bridgeEnabled;
              updateParameters = true;
            }
            if (content.hasOwnProperty('bridgeDisableSwitch') &&
                (superuserGrant || role.grantOpmodeEdit)) {
              matchedDevice.bridge_mode_switch_disable = bridgeDisableSwitch;
              updateParameters = true;
            }
            if (content.hasOwnProperty('bridgeFixIP') &&
                (superuserGrant || role.grantOpmodeEdit)) {
              matchedDevice.bridge_mode_ip = bridgeFixIP;
              updateParameters = true;
            }
            if (content.hasOwnProperty('bridgeFixIP') &&
                (superuserGrant || role.grantOpmodeEdit)) {
              matchedDevice.bridge_mode_gateway = bridgeFixGateway;
              updateParameters = true;
            }
            if (content.hasOwnProperty('bridgeFixIP') &&
                (superuserGrant || role.grantOpmodeEdit)) {
              matchedDevice.bridge_mode_dns = bridgeFixDNS;
              updateParameters = true;
            }
            if (content.hasOwnProperty('mesh_mode') &&
                (superuserGrant || role.grantOpmodeEdit) &&
                !matchedDevice.use_tr069) {
              matchedDevice.mesh_mode = meshMode;
              updateParameters = true;
            }
            if (updateParameters) {
              matchedDevice.do_update_parameters = true;
            }
            matchedDevice.save(async function(err) {
              if (err) {
                console.log(err);
                return res.status(500).json({
                  success: false,
                  message: 'Erro ao salvar dados na base',
                });
              }
              if (!matchedDevice.use_tr069) {
                // flashbox device, call mqtt
                mqtt.anlixMessageRouterUpdate(matchedDevice._id);
                meshHandlers.syncSlaves(matchedDevice, slaveCustomConfigs);
              } else {
                // tr-069 device, call acs
                acsDeviceInfo.updateInfo(matchedDevice, changes);
              }

                matchedDevice.success = true;
                return res.status(200).json(matchedDevice);
            });
          });
        } else {
          return res.status(500).json({
            success: false,
            message: 'Erro validando os campos, ver campo "errors"',
            errors: errors,
          });
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Erro ao tratar JSON',
        errors: [],
      });
    }
  });
};

deviceListController.createDeviceReg = function(req, res) {
  if (util.isJSONObject(req.body.content)) {
    const content = req.body.content;
    const macAddr = content.mac_address.trim().toUpperCase();
    const extReference = content.external_reference;
    const validator = new Validator();

    let errors = [];
    let release = util.returnObjOrEmptyStr(content.release).trim();
    let connectionType = util.returnObjOrEmptyStr(content.connection_type).trim();
    let pppoeUser = util.returnObjOrEmptyStr(content.pppoe_user).trim();
    let pppoePassword = util.returnObjOrEmptyStr(content.pppoe_password).trim();
    let ssid = util.returnObjOrEmptyStr(content.wifi_ssid).trim();
    let password = util.returnObjOrEmptyStr(content.wifi_password).trim();
    let channel = util.returnObjOrEmptyStr(content.wifi_channel).trim();
    let band = util.returnObjOrEmptyStr(content.wifi_band).trim();
    let mode = util.returnObjOrEmptyStr(content.wifi_mode).trim();
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

    Config.findOne({is_default: true}, function(err, matchedConfig) {
      if (err || !matchedConfig) {
        console.log('Error searching default config');
        return res.status(500).json({
          success: false,
          message: 'Erro ao encontrar configuração',
        });
      }

      // Validate fields
      genericValidate(macAddr, validator.validateMac, 'mac');
      if (connectionType != 'pppoe' && connectionType != 'dhcp' &&
          connectionType != '') {
        return res.status(500).json({
          success: false,
          message: 'Tipo de conexão deve ser "pppoe" ou "dhcp"',
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
      genericValidate(ssid, validator.validateSSID, 'ssid');
      genericValidate(password, validator.validateWifiPassword, 'password');
      genericValidate(channel, validator.validateChannel, 'channel');
      genericValidate(band, validator.validateBand, 'band');
      genericValidate(mode, validator.validateMode, 'mode');

      DeviceModel.findById(macAddr, function(err, matchedDevice) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: errors,
          });
        } else {
          if (matchedDevice) {
            errors.push({mac: 'Endereço MAC já cadastrado'});
          }
          if (errors.length < 1) {
            let newDeviceModel = new DeviceModel({
              '_id': macAddr,
              'created_at': new Date(),
              'external_reference': extReference,
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
            });
            if (connectionType != '') {
              newDeviceModel.connection_type = connectionType;
            }
            newDeviceModel.save(function(err) {
              if (err) {
                return res.status(500).json({
                  success: false,
                  message: 'Erro ao salvar registro',
                  errors: errors,
                });
              } else {
                return res.status(200).json({'success': true});
              }
            });
          } else {
            return res.status(500).json({
              success: false,
              message: 'Erro validando os campos, ver campo \"errors\"',
              errors: errors,
            });
          }
        }
      });
    });
  } else {
    return res.status(500).json({
      success: false,
      message: 'Erro ao tratar JSON',
      errors: [],
    });
  }
};

deviceListController.setPortForward = function(req, res) {
  DeviceModel.findById(req.params.id.toUpperCase(),
  function(err, matchedDevice) {
    if (err) {
      return res.status(200).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
    if (matchedDevice == null) {
      return res.status(200).json({
        success: false,
        message: 'Roteador não encontrado',
      });
    }
    let permissions = DeviceVersion.findByVersion(
      matchedDevice.version, matchedDevice.wifi_is_5ghz_capable);
    if (!permissions.grantPortForward) {
      return res.status(200).json({
        success: false,
        message: 'Roteador não possui essa função',
      });
    }
    if (matchedDevice.bridge_mode_enabled) {
      return res.status(200).json({
        success: false,
        message: 'Este roteador está em modo bridge, e portanto não pode '+
                 'liberar acesso a portas',
      });
    }

    console.log('Updating Port Forward for ' + matchedDevice._id);
    if (util.isJsonString(req.body.content)) {
      let content = JSON.parse(req.body.content);

      let usedAsymPorts = [];

      content.forEach((r) => {
        let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;

        if (!r.hasOwnProperty('mac') ||
            !r.hasOwnProperty('dmz') ||
            !r.mac.match(macRegex)) {
          return res.status(200).json({
            success: false,
            message: 'Dados de Endereço MAC do Dispositivo Invalidos No JSON',
          });
        }

        if (!r.hasOwnProperty('port') || !Array.isArray(r.port) ||
          !(r.port.map((p) => parseInt(p)).every((p) => (p >= 1 && p <= 65535)))
        ) {
          return res.status(200).json({
            success: false,
            message: 'Portas Internas de Dispositivo invalidas no JSON',
          });
        }

        let localPorts = r.port.map((p) => parseInt(p));
          // Get unique port set
        let localUniquePorts = [...new Set(localPorts)];

        if (r.hasOwnProperty('router_port')) {
          if (!permissions.grantPortForwardAsym) {
            return res.status(200).json({
              success: false,
              message: 'Roteador não aceita portas assimétricas',
            });
          }

          if (!Array.isArray(r.router_port) ||
            !(r.router_port.map((p) => parseInt(p)).every(
                (p) => (p >= 1 && p <= 65535)
              )
            )
          ) {
            return res.status(200).json({
              success: false,
              message: 'Portas Externas invalidas no JSON',
            });
          }

          let localAsymPorts = r.router_port.map((p) => parseInt(p));
          // Get unique port set
          let localUniqueAsymPorts = [...new Set(localAsymPorts)];
          if (localUniqueAsymPorts.length != localAsymPorts.length) {
            return res.status(200).json({
              success: false,
              message: 'Portas Externas Repetidas no JSON',
            });
          }

          if (localUniqueAsymPorts.length != localUniquePorts.length) {
            return res.status(200).json({
              success: false,
              message: 'Portas Internas e Externas não conferem no JSON',
            });
          }

          if (!(localUniqueAsymPorts.every((p) => (!usedAsymPorts.includes(p))))
          ) {
            return res.status(200).json({
              success: false,
              message: 'Portas Externas Repetidas no JSON',
            });
          }

          usedAsymPorts = usedAsymPorts.concat(localUniqueAsymPorts);
        } else {
          if (!(localUniquePorts.every((p) => (!usedAsymPorts.includes(p))))) {
            return res.status(200).json({
              success: false,
              message: 'Portas Externas Repetidas no JSON',
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
            message: 'Erro salvando regras no servidor',
          });
        }
        mqtt.anlixMessageRouterUpdate(matchedDevice._id);

        return res.status(200).json({
          success: true,
          message: '',
        });
      });
    } else {
      return res.status(200).json({
        success: false,
        message: 'Erro ao tratar JSON',
      });
    }
  });
};

deviceListController.getPortForward = function(req, res) {
  DeviceModel.findById(req.params.id.toUpperCase(),
  function(err, matchedDevice) {
    if (err) {
      return res.status(200).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
    if (matchedDevice == null) {
      return res.status(200).json({
        success: false,
        message: 'Roteador não encontrado',
      });
    }
    let permissions = DeviceVersion.findByVersion(
      matchedDevice.version, matchedDevice.wifi_is_5ghz_capable);
    if (!permissions.grantPortForward) {
      return res.status(200).json({
        success: false,
        message: 'Roteador não possui essa função',
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
  DeviceModel.findById(req.params.id.toUpperCase(),
  function(err, matchedDevice) {
    if (err) {
      return res.status(200).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
    if (matchedDevice == null) {
      return res.status(200).json({
        success: false,
        message: 'Roteador não encontrado',
      });
    }
    return res.status(200).json({
      success: true,
      ping_hosts_list: matchedDevice.ping_hosts,
    });
  });
};

deviceListController.setPingHostsList = function(req, res) {
  DeviceModel.findById(req.params.id.toUpperCase(),
  function(err, matchedDevice) {
    if (err) {
      return res.status(200).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
    if (matchedDevice == null) {
      return res.status(200).json({
        success: false,
        message: 'Roteador não encontrado',
      });
    }
    console.log('Updating hosts ping list for ' + matchedDevice._id);
    if (util.isJsonString(req.body.content)) {
      let content = JSON.parse(req.body.content);
      let approvedHosts = [];
      content.hosts.forEach((host) => {
        let fqdnLengthRegex = /^([0-9A-Za-z]{1,63}\.){0,3}([0-9A-Za-z]{1,62})$/;
        host = host.toLowerCase();
        if (host.match(fqdnLengthRegex)) {
          approvedHosts.push(host);
        }
      });
      matchedDevice.ping_hosts = approvedHosts;
      matchedDevice.save(function(err) {
        if (err) {
          return res.status(200).json({
            success: false,
            message: 'Erro interno do servidor',
          });
        }
        return res.status(200).json({
          success: true,
          hosts: approvedHosts,
        });
      });
    } else {
      return res.status(200).json({
        success: false,
        message: 'Erro ao tratar JSON',
      });
    }
  });
};

deviceListController.getLanDevices = function(req, res) {
  DeviceModel.findById(req.params.id.toUpperCase(),
  function(err, matchedDevice) {
    if (err) {
      return res.status(200).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
    if (matchedDevice == null) {
      return res.status(200).json({
        success: false,
        message: 'Roteador não encontrado',
      });
    }

    let enrichedLanDevs = util.deepCopyObject(matchedDevice.lan_devices)
    .map((lanDevice) => {
      lanDevice.is_old = deviceHandlers.isTooOld(lanDevice.last_seen);
      lanDevice.is_online = deviceHandlers.isOnline(lanDevice.last_seen);
      // Ease up gateway reference when in Mesh mode
      lanDevice.gateway_mac = matchedDevice._id;
      return lanDevice;
    });

    return res.status(200).json({
      success: true,
      lan_devices: enrichedLanDevs,
      mesh_routers: matchedDevice.mesh_routers,
    });
  });
};

deviceListController.getSpeedtestResults = function(req, res) {
  DeviceModel.findById(req.params.id.toUpperCase(), (err, matchedDevice)=>{
    if (err) {
      return res.status(500).json({
        success: false,
        type: 'danger',
        message: 'Erro interno do servidor',
      });
    }
    if (!matchedDevice) {
      return res.status(404).json({
        success: false,
        type: 'danger',
        message: 'Roteador não encontrado',
      });
    }

    let permissions = DeviceVersion.findByVersion(
      matchedDevice.version,
      matchedDevice.wifi_is_5ghz_capable,
      matchedDevice.model,
    );

    return res.status(200).json({
      success: true,
      measures: matchedDevice.speedtest_results,
      limit: permissions.grantSpeedTestLimit,
    });
  });
};

deviceListController.doSpeedTest = function(req, res) {
  let mac = req.params.id.toUpperCase();
  const isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
    return map[mac];
  });
  DeviceModel.findById(mac, (err, matchedDevice)=>{
    if (err) {
      return res.status(200).json({
        success: false,
        message: 'Erro interno, por favor tente novamente',
      });
    }
    if (!matchedDevice) {
      return res.status(200).json({
        success: false,
        message: 'Roteador não encontrado',
      });
    }
    if (!isDevOn) {
      return res.status(200).json({
        success: false,
        message: 'Roteador não está online!',
      });
    }
    let permissions = DeviceVersion.findByVersion(
      matchedDevice.version,
      matchedDevice.wifi_is_5ghz_capable,
      matchedDevice.model,
    );
    if (!permissions.grantSpeedTest) {
      return res.status(200).json({
        success: false,
        message: 'Roteador não suporta este comando',
      });
    }
    Config.findOne({is_default: true}, function(err, matchedConfig) {
      if (err || !matchedConfig) {
        return res.status(200).json({
          success: false,
          message: 'Erro interno, por favor tente novamente',
        });
      }
      if (!matchedConfig.measureServerIP) {
        return res.status(200).json({
          success: false,
          message: 'Este serviço não foi configurado pelo administrador',
        });
      }
      let url = matchedConfig.measureServerIP + ':' +
                matchedConfig.measureServerPort;
      if (req.sessionID && sio.anlixConnections[req.sessionID]) {
        sio.anlixWaitForSpeedTestNotification(req.sessionID, mac);
      }
      mqtt.anlixMessageRouterSpeedTest(mac, url, req.user);
      return res.status(200).json({
        success: true,
      });
    });
  });
};

deviceListController.setDeviceCrudTrap = function(req, res) {
  // Store callback URL for devices
  Config.findOne({is_default: true}, function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao acessar dados na base',
      });
    } else {
      matchedConfig.traps_callbacks.device_crud.url = req.body.url;
      if ('user' in req.body && 'secret' in req.body) {
        matchedConfig.traps_callbacks.device_crud.user = req.body.user;
        matchedConfig.traps_callbacks.device_crud.secret = req.body.secret;
      }
      matchedConfig.save((err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Erro ao gravar dados na base',
          });
        }
        return res.status(200).json({
          success: true,
          message: 'Endereço salvo com sucesso',
        });
      });
    }
  });
};

deviceListController.setLanDeviceBlockState = function(req, res) {
  DeviceModel.findById(req.body.id, function(err, matchedDevice) {
    if (err || !matchedDevice) {
      return res.status(500).json({success: false,
                                   message: 'Erro ao encontrar roteador'});
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
      matchedDevice.save(function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Erro ao registrar atualização'});
        }
        mqtt.anlixMessageRouterUpdate(matchedDevice._id);

        return res.status(200).json({'success': true});
      });
    } else {
      return res.status(500).json({success: false,
                                   message: 'Erro ao encontrar dispositivo'});
    }
  });
};

deviceListController.updateLicenseStatus = function(req, res) {
  DeviceModel.findById(req.body.id, function(err, matchedDevice) {
    if (err || !matchedDevice) {
      return res.status(500).json({success: false,
                                   message: 'Erro ao encontrar roteador'});
    }
    request({
      url: 'https://controle.anlix.io/api/device/list',
      method: 'POST',
      json: {
        'secret': req.app.locals.secret,
        'all': false,
        'mac': matchedDevice._id,
      },
    },
    function(error, response, body) {
      if (error) {
        return res.json({success: false, message: 'Erro na requisição'});
      }
      if (response.statusCode === 200) {
        if (body.success) {
          let isBlocked = (body.device.is_blocked === true ||
                           body.device.is_blocked === 'true');
          if (matchedDevice.is_license_active === undefined) {
            matchedDevice.is_license_active = !isBlocked;
            matchedDevice.save();
          } else if ((!isBlocked) !== matchedDevice.is_license_active) {
            matchedDevice.is_license_active = !isBlocked;
            matchedDevice.save();
          }
          return res.json({success: true, status: !isBlocked});
        } else {
          return res.json({success: false, message: body.message});
        }
      } else {
        return res.json({success: false, message: 'Erro na requisição'});
      }
    });
  });
};

module.exports = deviceListController;
