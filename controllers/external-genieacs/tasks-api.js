/* eslint-disable no-async-promise-executor */
/* global __line */
/*
Set of functions that will handle the communication from flashman to genieacs
through the use of genieacs-nbi, the genie rest api.
*/

const http = require('http');
const mongodb = require('mongodb');
const NotificationModel = require('../../models/notification');
const DeviceModel = require('../../models/device');
const SchedulerCommon = require('../update_scheduler_common');
const {registerMetricGauge} = require('../handlers/metrics/custom_metrics');
const t = require('../language').i18next.t;


let GENIEHOST = (process.env.FLM_NBI_ADDR || 'localhost');
let GENIEPORT = (process.env.FLM_NBI_PORT || 7557);
let MONGOHOST = (process.env.FLM_MONGODB_HOST || 'localhost');
let MONGOPORT = (process.env.FLM_MONGODB_PORT || 27017);

let instanceNumber = parseInt(process.env.NODE_APP_INSTANCE ||
                              process.env.FLM_DOCKER_INSTANCE || 0);
if (process.env.FLM_DOCKER_INSTANCE && instanceNumber > 0) {
  instanceNumber = instanceNumber - 1; // Docker swarm starts counting at 1
}

let mongoURI = 'mongodb://' + MONGOHOST + ':' + MONGOPORT;
if (process.env.MONGODB_USE_HA === true ||
    process.env.MONGODB_USE_HA === 'true'
) {
  // FLM_MONGODB_HA_LIST format 'mongodb,mongoha_mongodb2,mongoha_mongodb2'
  mongoURI =
    'mongodb://' + process.env.FLM_MONGODB_HA_LIST + '/?replicaSet=rs0';
}

let taskWatchlist = {};
let lastTaskWatchlistClean = Date.now();

let genie = {}; // to be exported.

// starting a connection to MongoDB so we can start a change stream to the
// tasks collection when necessary.
let genieDB;

genie.configureTaskApiWatcher = function() {
  return new Promise((resolve, reject)=>{
    mongodb.MongoClient.connect(mongoURI,
      {useUnifiedTopology: true, maxPoolSize: 100000}).then(async (client) => {
        try {
          genieDB = client.db('genieacs');
          // Only watch faults if flashman instance is the first one dispatched
          if (parseInt(instanceNumber) === 0) {
            await watchGenieFaults(); // start watcher for genie faults.
          }
          // Always watch for tasks associated with this instance
          await watchGenieTasks();
          // Always clean old Get Parameters Tasks. This improves performance
          await genie.deleteGetParamTasks();
          /* we should never close connection to database. it will be close when
           application stops. */
          resolve();
        } catch (err) {
          reject(err);
        }
    });
  });
};


const watchGenieTasks = async function() {
  let tasksCollection = genieDB.collection('tasks');
  let changeStream = tasksCollection.watch([
    {$match: {'operationType': 'delete'}},
  ]);
  changeStream.on('change', (change)=>{
    let taskID = change.documentKey['_id'];
    if (taskID && taskID in taskWatchlist) {
      let deviceID = taskWatchlist[taskID].deviceID;
      let callback = taskWatchlist[taskID].callback;
      if (callback && deviceID) {
        callback(deviceID);
      }
      delete taskWatchlist[taskID];
    }
    let now = Date.now();
    let oneDayInMilliseconds = 24*60*60*1000;
    if (now - lastTaskWatchlistClean > oneDayInMilliseconds) {
      Object.keys(taskWatchlist).forEach((id)=>{
        if (now - taskWatchlist[id].timestamp > oneDayInMilliseconds) {
          delete taskWatchlist[id];
        }
      });
    }
  });
  return new Promise((resolve, reject)=>{
    // mongodb's ChangeStream class doesnt expose any "init" event.
    // So we are awaiting one second to without error to consider it ok
    let timer = setTimeout(()=>{
      console.log('Watching for faults in GenieACS database');
      resolve();
    }, 1000);
    changeStream.on('error', (e) => {
      if (e.code==40573) {
        console.error('Replica set is not enabled on genieacs database');
      } else {
        console.error(
          'Error in watching genieacs faults collection change stream:\n', e,
        );
      }
      clearTimeout(timer);
      reject(e);
    });
  });
};

// watches genieacs faults collection waiting for any insert and deletes them
// as they arrive.
const watchGenieFaults = async function() {
  let faultsCollection = genieDB.collection('faults');
  let cacheCollection = genieDB.collection('cache');
  let tasksCollection = genieDB.collection('tasks');

  // delete all existing faults.
  let ret = await faultsCollection.deleteMany();
  if (ret.n > 0) {
    console.log('INFO: deleted '+ret.n+' documents in genieacs\'s faults '
      +'collection');
  }
  // delete all genieacs cache.
  ret = await cacheCollection.deleteMany();
  if (ret.n > 0) {
    console.log('INFO: deleted '+ret.n+' documents in genieacs\'s cache '+
      'collection.');
  }

  // delete all genieacs update firmware tasks.
  ret = await tasksCollection.deleteMany({name: 'download'});
  if (ret.n > 0) {
    console.log('INFO: deleted '+ret.n+' documents in genieacs\'s tasks '+
      'collection.');
  }

  // creating a change stream on 'faults' collection.
  let changeStream = faultsCollection.watch([
    {$match: {'operationType': 'insert'}}, // listening for 'insert' events.
  ]);
  changeStream.on('change', async (change) => { // for each inserted document.
    let doc = change.fullDocument;
    console.log('WARNING: genieacs created a fault'+(doc.device ?
      ' for device id '+doc.device : '')+' of type \''+doc.code+'\'.');
    let ignoreCodes = [
      'session_terminated', 'timeout', 'cwmp.9002', 'cwmp.9003',
    ];
    if (ignoreCodes.includes(doc.code)) {
      // Ignore session timeout and session terminated errors - no benefit
      // reporting them and clutter flashman
      faultsCollection.deleteOne({_id: doc._id});
      return;
    }

    // The code cwmp.9010 is generated when there was a firmware download error
    if (doc.code === 'cwmp.9010') {
      faultsCollection.deleteOne({_id: doc._id});
      cacheCollection.deleteOne({_id: doc._id});
      tasksCollection.deleteMany({
        device: doc.device,
        name: 'download',
      });
    }

    let errorMsg = '';
    if (doc.detail !== undefined) {
      errorMsg += doc.detail.stack;
    } else if (doc.provision !== undefined) {
      errorMsg += doc.message + ': provision ' + doc.provision;
    } else {
      errorMsg += JSON.stringify(doc);
    }
    await createNotificationForDevice(errorMsg, doc.device, doc);
  });
  return new Promise((resolve, reject)=>{
    let timer = setTimeout(()=>{
      console.log('Watching for faults in GenieACS database');
      resolve();
    }, 1000);
    changeStream.on('error', (e) => {
      if (e.code==40573) {
        console.error('Replica set is not enabled on genieacs database');
      } else {
        console.error(
          'Error in watching genieacs faults collection change stream:\n', e,
        );
      }
      clearTimeout(timer);
      reject(e);
    });
  });
};

/* Creates a new notification in flashman, with the Genie ACS stack trace error
 'stackError' and with the device id 'genieDeviceId' as the notification target
 for that notification. If no 'genieDeviceId' is given, the error is considered
 to be from Genie itself. */
const createNotificationForDevice = async function(
  errorMsg,
  genieDeviceId,
  doc,
) {
  // getting flashman device id related to the genie device id.
  let device = await DeviceModel.findOne(
    {acs_id: genieDeviceId},
    {_id: true, do_update_status: true},
  ).exec();

  if (!device) return;

  // If the error was related to update, change the state to failed
  // Do not show notification
  if (doc.code === 'cwmp.9010') {
    // Might move to ToDo again or Failed
    SchedulerCommon.failedDownload(device._id);
    device.do_update_status = 2;
    await device.save();

    // Do not show the notification
    return;
  }


  // check if a notification already exists for this device, dont add a new one
  let hasNotification = await NotificationModel.findOne(
    {target: device._id, type: 'genieacs'},
  ).exec();
  if (hasNotification) return;
  // notification values.
  let params = {severity: 'alert', type: 'genieacs', action_title: t('Delete'),
    message_error: errorMsg};
  if (genieDeviceId !== undefined) { // if error has an associated device.
    params.message = t('cpeErrorIdCallSupport', {id: genieDeviceId,
      errorline: __line});
    params.target = device._id;
    params.genieDeviceId = genieDeviceId;
  } else { // if error has no associated device.
    params.message = t('genieacsErrorCallSupport', {errorline: __line});
  }
  let notification = new NotificationModel(params); // creating notification.
  await notification.save().catch((err) => {
    console.log('Error saving device task api notification: ' + err);
  }); // saving notification.
};

// removes entries in Genie's 'faults' and 'cache' collections related to
// a given device id.
genie.deleteCacheAndFaultsForDevice = async function(genieDeviceId) {
  // match anything that contains the given device id.
  let re = new RegExp('^'+genieDeviceId);
  await genieDB.collection('cache').deleteMany({_id: re});
  await genieDB.collection('faults').deleteMany({_id: re});
};

// Delete all "Get" tasks. ** USE IT WISELY! **
genie.deleteGetParamTasks = async function() {
  try {
    let ret = await genieDB.collection('tasks').deleteMany(
      {name: 'getParameterValues'});
    console.log('Number of deleted Get tasks: ' + ret.deletedCount);
  } catch (err) {
    console.error('Error deleting Get parameters tasks:', err);
  }
};

// if allSettled is not defined in Promise, we define it here.
if (Promise.allSettled === undefined) {
  Promise.allSettled = function allSettled(promises) {
    let wrappedPromises = promises.map((p) => Promise.resolve(p).then(
      (val) => ({status: 'fulfilled', value: val}),
      (err) => ({status: 'rejected', reason: err}),
    ));
    return Promise.all(wrappedPromises);
  };
}

/* promisifying a nodejs http request. 'options' are the http.request option as
 defined by nodejs api. 'body' is the content of the request (should be a
 string) and it is up to the caller to set the correct header in case body is
 used. */
genie.request = (options, body) => {
  return new Promise((resolve, reject) => {
    let req = http.request(options, (res) => {
      res.setEncoding('utf8');
      res.data = '';
      res.on('data', (chunk) => res.data+=chunk);
      res.on('end', () => resolve(res));
    });
    req.on('error', reject);
    if (body !== undefined &&
      (body.constructor === String ||
       body.constructor === Buffer)) {
      req.write(body);
    }
    req.end();
  });
};

// delete device by acs_id(flashman)/_id(genieacs)
genie.deleteDeviceFromGenie = async function(device) {
  if (device.use_tr069 && device.acs_id) {
    try {
      await genie.request({
        method: 'DELETE', hostname: GENIEHOST, port: GENIEPORT,
        path: `/devices/${encodeURIComponent(device.acs_id)}`,
      });
    } catch (e) {
      console.log('Error removing device ' +
        device.acs_id + ' from genieacs : ' + e);
      return false;
    }
  }
  return true;
};

/* get stuff out of genie through its API and returns the genie json response
 parsed to javascript object. may throw unhandled errors.
'collection' is the name of the collection the stuff will come out of.
'query is the MongoDB query object given to collection.find() call.
'projection' is a string with comma separated attribute names as they are found
 in the collection documents.*/
genie.getFromCollection = async function(collection, query, projection) {
  if (collection.constructor !== String) {
    throw new Error(
     'collection must be a string when getting data from genieacs api.');
  }
  if (query.constructor !== Object) {
    throw new Error(
      'query must be an object when getting data from genieacs api.');
  }
  if (projection !== undefined && projection.constructor !== String) {
    throw new Error(
     'projection must be a string when getting data from genieacs api.');
  }

  let urlParameters = 'query='+encodeURIComponent(JSON.stringify(query));
  if (projection) urlParameters += '&projection='+projection;

  let response = await genie.request({
    method: 'GET', hostname: GENIEHOST, port: GENIEPORT,
    path: `/${collection}?${urlParameters}`,
  });

  return JSON.parse(response.data);
};

// returns false if preset format doesn't comply with genieacs presets.
const checkPreset = function(preset) {
  if (preset.constructor !== Object // preset must be an object,
   || preset.precondition === undefined) return false; // with a precondition.
  for (let config of preset.configurations) { // for each configuration.
    if (config.constructor !== Object // it must be an object.
     || (config.constructor === Object // but it if its,
      // when any of these attributes exist, their values must be strings.
     && ['type', 'name', 'value'].some((attribute) => config[attribute]
      !== undefined && config[attribute].constructor !== String))) {
      return false;
    }
  }
  return true;
};

/* sends a put request with a given 'provision' to genieacs and returns the
 genie json response parsed to javascript object. may throw unhandled errors */
genie.putProvision = async function(script, provisionName) {
  script = script.slice(0, -1); // Remove EOF
  return genie.request({
    method: 'PUT', hostname: GENIEHOST, port: GENIEPORT,
    path: '/provisions/'+provisionName,
    headers: {
      'Content-Type': 'application/javascript',
      'Content-Length': Buffer.byteLength(script),
    },
  }, script);
};

/* sends a put request with a given 'preset' to genieacs and returns the genie
 json response parsed to javascript object. may throw unhandled errors. */
genie.putPreset = async function(preset) {
  if (!checkPreset(preset)) throw new Error('preset is invalid.');

  let presetjson = JSON.stringify(preset);
  return genie.request({
    method: 'PUT', hostname: GENIEHOST, port: GENIEPORT,
    path: `/presets/${encodeURIComponent(preset._id)}`,
    headers: {'Content-Type': 'application/json', 'Content-Length':
     Buffer.byteLength(presetjson)},
  }, presetjson);
};

genie.deletePreset = async function(presetId) {
  return genie.request({
    method: 'DELETE', hostname: GENIEHOST, port: GENIEPORT,
    path: `/presets/${encodeURIComponent(presetId)}`,
  });
};

genie.addOrDeleteObject = async function(
  deviceid, acObject, taskType, callback=null, requestConn=true,
) {
  let task = {
    name: taskType,
    objectName: acObject,
  };
  try {
    let ret = await genie.addTask(deviceid, task, callback, 0, requestConn);
    if (!ret || !ret.success || !ret.executed) {
      return false;
    }
    return true;
  } catch (e) {
    console.log('Error: ' + taskType + ' failure at ' + deviceid);
  }
  return false;
};

/* simple request to send a new task to GenieACS and get a promise the resolves
 to the request response or rejects to request error. Will throw an uncaught
 error if task can't be stringifyed to json. */
const postTask = function(deviceid, task, legacyTimeout, requestConn) {
  let taskjson = JSON.stringify(task); // can throw an error here.
  // console.log("Posting a task.")
  let encodedID = encodeURIComponent(deviceid);
  let timeout = (legacyTimeout > 0) ? legacyTimeout.toString() : '7500';
  let path = '/devices/'+encodedID+'/tasks?timeout='+timeout;
  if (requestConn) path += '&connection_request';
  return genie.request({
    method: 'POST', hostname: GENIEHOST, port: GENIEPORT,
    path: path,
    headers: {'Content-Type': 'application/json', 'Content-Length':
     Buffer.byteLength(taskjson)},
  }, taskjson);
};

/* simple request to delete a task, by its id, in GenieACS and get a promise
 the resolves to the request response or rejects to request error. */
const deleteTask = function(taskid) {
  return genie.request({method: 'DELETE', hostname: GENIEHOST, port: GENIEPORT,
    path: '/tasks/'+taskid});
};
genie.deleteTask = deleteTask;


/* a map structure that holds task attribute names where the keys are the task
 names and the values are the task parameters respective to the task name. */
let taskParameterIdFromType = {
  getParameterValues: 'parameterNames',
  setParameterValues: 'parameterValues',
  refreshObject: 'objectName',
  addObject: 'objectName',
  deleteObject: 'objectName',
  download: 'fileName',
  reboot: null,
};

/* return true if task has the correct format or false otherwise. 'task' should
 be a javascript object. refer to
 https://github.com/genieacs/genieacs/wiki/API-Reference#tasks to understand a
 task format.*/
const checkTask = function(task) {
  if (!task) return false;

  let name = task.name; // the task name/type.
  if (!name) return false;

  // task name/type has to be defined in 'taskParameterIdFromType'.
  if (!Object.keys(taskParameterIdFromType).includes(name)) return false;
  // the attribute name where a task holds its parameters.
  let parameterId = taskParameterIdFromType[name];
  // in case task name/type is "setParameterValues".
  if (name === 'setParameterValues') {
    // its parameter has to be an array.
    if (
      !task[parameterId] ||
      task[parameterId].constructor !== Array
    ) return false;
    // and for each value in that array.
    for (let i = 0; i < task[parameterId].length; i++) {
      // that value has also to be an array.
      if (
        !task[parameterId][i] ||
        task[parameterId][i].constructor !== Array
      ) return false;
      // that sub array has to have length 3.
      if (task[parameterId][i].length < 2
       || task[parameterId][i].length > 3 ) return false;
      // first position has to be a string (tr069 parameter name).
      if (!task[parameterId][i][0]
       || task[parameterId][i][0].constructor !== String
       // second position can be a string, a number or a boolean.
       || task[parameterId][i][1] === null
       || task[parameterId][i][1] === undefined
       || (task[parameterId][i][1].constructor !== String
        && task[parameterId][i][1].constructor !== Number
        && task[parameterId][i][1].constructor !== Boolean)
       // third position has to be a string (tr069 type).
       || !task[parameterId][i][2]
       || task[parameterId][i][2].constructor !== String) return false;
    }
  } else if (name === 'getParameterValues' ) { // in case task name/type is
  // "getParameterValues".
    // its parameter has to be an array.
    if (
      !task[parameterId] ||
      task[parameterId].constructor !== Array
    ) return false;
    // and for each value in that array.
    for (let i = 0; i < task[parameterId].length; i++) {
      // that value has to be a string (tr069 parameter name).
      if (
        !task[parameterId][i] ||
        task[parameterId][i].constructor !== String
      ) return false;
    }
  } else if (parameterId && task[parameterId].constructor !== String) {
  // names/types have a string as parameter.
    return false;
  }
  return true; // if all passed, this task is good.
};

/* given an array of tasks, ignores tasks that can't be joined (the one which
 parameters data type aren't an array) and returns an array in which the first
 position has an array of tasks that will be new tasks sent to genie and the
 second position has an array of ids to delete.
 It's implicit that all tasks belong to the same device id.
 The tasks to be delete are tasks that have the same name/type.
 All tasks with the same name/type are returned in the second argument. Tasks
 are not checked for being identical, in that case all identical tasks are
 marked to be removed and new identical task is created. The tasks to be added
 are the result of joining tasks with the same name/type or it's a task that
 has not been added yet, case that can be verified by checking that _id doesn't
 exist. Tasks that can't be joined won't be saved to be delete, will just be
 ignored but if it's a new task, it will be saved as task to be added. */
const joinAllTasks = function(tasks, deviceId) {
  let idsToDelete = [];
  let tasksToAdd = [];
  let tasksFromType = {};

  tasks.map((task)=>{
    if (!tasksFromType[task.name]) {
      tasksFromType[task.name] = [];
    }
    tasksFromType[task.name].push(task);
  });
  for (let taskType of Object.keys(tasksFromType)) {
    let parameterId = taskParameterIdFromType[taskType];
    let concatenateArguments = false;
    if (parameterId
      && Array.isArray(tasksFromType[taskType][0][parameterId])
    ) {
      concatenateArguments = true;
    }
    if (tasksFromType[taskType].length>1 ) {
      if (taskType==='download') {
        // Special case: when joining download tasks, keep only the
        // latest one
        let downloadTasks = tasksFromType[taskType];
        let newDownloadTasks = downloadTasks.filter((task)=>!task._id);
        if (newDownloadTasks.length>0) {
          tasksToAdd.push(newDownloadTasks[newDownloadTasks.length-1]);
        }
        idsToDelete.push(
          ...downloadTasks
          .filter((task)=>(task._id))
          .map((task)=>task._id),
        );
      } else if (concatenateArguments) {
        // We are concatenating parameters for this type
        idsToDelete.push(
          ...tasksFromType[taskType]
          .filter((task)=>task._id)
          .map((task)=>task._id),
        );
        let newTask = {name: taskType};
        let allArguments = [];
        tasksFromType[taskType].map((task)=>{
          allArguments.push(...task[parameterId]);
        });
        newTask[parameterId] = deduplicateArguments(allArguments);
        tasksToAdd.push(newTask);
      } else {
        // Not concatenating, just add the new tasks
        tasksToAdd.push(...tasksFromType[taskType].filter((task)=>!task._id));
      }
    } else if (tasksFromType[taskType].length==1) {
      if (!tasksFromType[taskType][0]._id) {
        tasksToAdd.push(tasksFromType[taskType][0]);
      }
    } else { // This should never happen!!!
    }
  }
  return [tasksToAdd, idsToDelete];
};

// 'args' can be an array of strings or array of arrays
// the first type if easy to concatenate: just remove duplicates
// the second is kinda tricky - we use the first argument as an identifier
// and keep the latest one
const deduplicateArguments = function(args) {
  let ret = [];
  const parameterIsArray = (args.length>0) && (Array.isArray(args[0]));
  if (parameterIsArray) {
    let insertedIds = new Set();
    for (let arg of args.reverse()) {
      if (!insertedIds.has(arg[0])) {
        insertedIds.add(arg[0]);
        ret.push(arg);
      }
    }
  } else {
    // Simple deduplication
    ret = Array.from(new Set(args));
  }
  return ret;
};

/* for each task id, send a request to GenieACS to delete that task. GenieACS
 doesn't have a call to delete more than one task at once. 'deviceid' is used
 to print error messages. */
const deleteOldTasks = async function(taskIdsToDelete, deviceid) {
  let promises = taskIdsToDelete.map((taskId)=>deleteTask(taskId));
  let results = await Promise.allSettled(promises);
  for (let i = 0; i < results.length; i++) { // for each request result.
    // if there was a reason it was rejected. print error message.
    if (results[i].reason) {
      throw new Error(`${results[i].reason.code} when deleting older tasks in `
        +` genieacs rest api, for device ${deviceid}.`);
    } else if (results[i].value.data === 'Task not found') { // if it resolved
    // to GenieACS saying task wasn't found.
      throw new Error(`Task not found when deleting an old task in genieAcs `
        +`rest api, for device ${deviceid}.`);
    }
    /* successful deletes don't need to be noted. they are expected to be
 successful. */
  }
};

/* for each task send a request to GenieACS to add a task to a device id.
 GenieACS doesn't have a call to add more than one task at once. Returns an
 array in which the first position is an error message if there were any or
 null otherwise and the second position is an array of tasks there were not
 processed in less than 'timeout' millisecond. 'shouldRequestConnection' is a
 boolean that tells GenieACS to initiate a connection to the CPE and
 execute the task. If 'shouldRequestConnection' is given false, all tasks will
 be scheduled for later execution by Genie. */
const sendTasks = async function(
  deviceid, tasks, callback, legacyTimeout, requestConn,
) {
  // making each task become a promise.
  // transforming task objects into postTask promise function.
  tasks = tasks.map(
    (task) => postTask(deviceid, task, legacyTimeout, requestConn));
  // wait for all promises to finish.
  let results = await Promise.allSettled(tasks);
  for (let i = 0; i < results.length; i++) { // for each request result.
    // if there was a reason it was rejected. print error message.
    if (results[i].reason) {
      console.error(results[i]);
      let msg = results[i].reason.code +
        ' when adding new task in genieacs rest api, for device ' +
        deviceid;
      return {success: false, message: msg};
    }

    let response = results[i].value; // referencing only promise's value.
    // console.log(`response ${i})`, response.statusCode,
    //  response.statusMessage, response.data) // for debugging.
    if (response.statusMessage === 'No such device') {
      // if Genie responded saying device doesn't exist
      return {success: false, message: 'Device does not exist: ' + deviceid};
    }

    if (i < results.length-1) continue; // We only care about the last task

    if (response.statusCode === 200) {
      // if this is the last task (which originated this call), and result was
      // immediate success, we call the callback, if provided, and return
      if (callback) {
        callback(deviceid);
      }
      return {success: true, executed: true, message: 'task success'};
    } else if (response.statusCode === 202) {
      // if this is the last task (which originated this call), and result was
      // success without immediate response (202), add task id and callback to
      // task watch list
      let taskid;
      try {
        // parse task to javascript object.
        taskid = JSON.parse(response.data)['_id'];
      } catch (e) {
        taskid = '';
        console.log('Wrong task at ' + deviceid + ' as ' + response.data);
      }
      if (taskid && callback) {
        taskWatchlist[taskid] = {
          deviceID: deviceid,
          callback: callback,
          timestamp: Date.now(),
        };
      }
      // If requestConn was specified as false, return executed as true, since
      // it wasn't expected to run anyway
      return {success: true, executed: !requestConn, message: 'task scheduled'};
    } else {
      // something went wrong, log error and return
      console.log(`Error adding task to GenieACS `+
        `(${deviceid}): ${response.data}`);
      return {success: false, message: 'error in genie response'};
    }
  }
  // The last iteration of the for loop should always return
  // return here as well just in case
  return {success: false, message: 'no reply when adding tasks to genie'};
};

/* Get all tasks, in GenieACS, for a device, remove unnecessary tasks, join
 tasks that could have been issue together and add a new given task for a given
 device id and returns an array in which the first position is an error
 message, when there is any, or null where there is none, and in the second
 position, a true value if the new task is executed under 'timeout' or null if
 it will emit the result through socket.io. Possible returns:
- [msg !== null, null]: error.
- [msg === null, null]: result will be given using socket.io.
- [msg === null, true]: task executed successfully before 'timeout' run out.

Arguments:
'deviceid' is a string identifying a device in GenieACS database.
'task' is an object which structure is a Genie task with its parameters already
 set. refer to https://github.com/genieacs/genieacs/wiki/API-Reference#tasks.
'timeout' is a number in milliseconds that will be used as request timeout when
 communicating with GenieACS.
'shouldRequestConnection' is a boolean that tells GenieACS to initiate a
 connection to the CPE and execute the task. When it's false, genie will
 always return as fast as possible saying task was scheduled for later.
'watchTimes' is an array of numbers that are the milliseconds used for waiting
 for scheduled tasks to disappear from GenieACS database, used only if the
 request 'timeout', sent to genie, runs out without an answer confirm the task
 execution.
'callback' is a callback to override the default behaviour of calling the sio
 event handler
Having 2 or more numbers in this array means one or more retries to genie, for
 the cases when genie can't retry a task on its own. After all retries sent to
 genie, if the retried task doesn't disappear from its database, a message
 saying the task has not executed is emitted through socket.io.*/

genie.addTask = async function(
  deviceid, task, callback=null, legacyTimeout=0, requestConn=true,
) {
  // checking device id.
  if (!deviceid || deviceid.constructor !== String) {
    return {
      success: false, message: 'Device ID not valid. Received: ' + deviceid,
    };
  }
  // checking task format and data types.
  if (!checkTask(task)) {
    return {success: false, message: 'Task not valid: ' + JSON.stringify(task)};
  }

  // getting older tasks for this device id.
  let query = {device: deviceid}; // selecting all tasks for a given device id.
  let currentTasks 
    = await genie.getFromCollection('tasks', query).catch((e) => {
  /* rejected value will be error object in case of connection errors.*/
    return {
      success: false,
      message: `${e.code} when getting old tasks from genieacs ` +
      `rest api, for device ${deviceid}.`,
    };
  });
  let tasksToAdd;
  let taskIdsToDelete;
  [tasksToAdd, taskIdsToDelete]
    = joinAllTasks([...currentTasks, task]);

    /* we have to delete old tasks before adding the joined tasks because it
could happen that an old task is executed while we add their joined
counterpart, in which case deleting it would make genie return 'task not found'.
So we delete old tasks as fast as we can. Adding a task makes us wait at least
a 'timeout' amount of milliseconds, so it isn't fast. */
    // if there are tasks being substituted by new ones.
  try {
    await deleteOldTasks(taskIdsToDelete, deviceid);
  } catch (e) {
    console.log('Warning (tasks-api): ' + e.message);
  }

  /* console.log("sending tasks", tasks, ", timeout:", timeout,
   ", watchTimes:", watchTimes)
   sending the new task and the old tasks being substituted,
   then return result. */
  return sendTasks(deviceid, tasksToAdd, callback, legacyTimeout, requestConn);
};

registerMetricGauge({
  name: 'flm_tasks_api_list_length',
  help: 'Length of current task watch list',
  collect: () => Object.keys(taskWatchlist).length,
});


// below methods shoud be used only on unit tests
genie.tests = {};
genie.tests.joinAllTasks = joinAllTasks;

module.exports = genie;
