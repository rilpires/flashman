/* global __line */
/*
Set of functions that will handle the communication from flashman to genieacs
through the use of genieacs-nbi, the genie rest api.
*/

const http = require('http');
const mongodb = require('mongodb');
const NotificationModel = require('../../models/notification');
const DeviceModel = require('../../models/device');
const t = require('../language').i18next.t;


let GENIEHOST = (process.env.FLM_NBI_ADDR || 'localhost');
let GENIEPORT = (process.env.FLM_NBI_PORT || 7557);
let MONGOHOST = (process.env.FLM_MONGODB_HOST || 'localhost');
let MONGOPORT = (process.env.FLM_MONGODB_PORT || 27017);

let instanceNumber = parseInt(process.env.NODE_APP_INSTANCE ||
                              process.env.FLM_DOCKER_INSTANCE || 0);

let taskWatchlist = {};
let lastTaskWatchlistClean = Date.now();

let genie = {}; // to be exported.

// starting a connection to MongoDB so we can start a change stream to the
// tasks collection when necessary.
let genieDB;
if (!process.env.FLM_GENIE_IGNORED) { // if there's a GenieACS running.
  mongodb.MongoClient.connect('mongodb://' + MONGOHOST + ':' + MONGOPORT,
    {useUnifiedTopology: true, maxPoolSize: 100000}).then(async (client) => {
    genieDB = client.db('genieacs');
    // Only watch faults if flashman instance is the first one dispatched
    if (parseInt(instanceNumber) === 0) {
      console.log('Watching for faults in GenieACS database');
      watchGenieFaults(); // start watcher for genie faults.
    }
    // Always watch for tasks associated with this instance
    watchGenieTasks();
    // Always clean old Get Parameters Tasks. This improves performance
    genie.deleteGetParamTasks();
    /* we should never close connection to database. it will be close when
     application stops. */
  });
}

const watchGenieTasks = async function() {
  let tasksCollection = genieDB.collection('tasks');
  let changeStream = tasksCollection.watch([
    {$match: {'operationType': 'delete'}},
  ]);
  changeStream.on('error', (e)=>console.log('Error in genieacs tasks stream'));
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
};

// watches genieacs faults collection waiting for any insert and deletes them
// as they arrive.
const watchGenieFaults = async function() {
  let faultsCollection = genieDB.collection('faults');
  let cacheCollection = genieDB.collection('cache');

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

  // creating a change stream on 'faults' collection.
  let changeStream = faultsCollection.watch([
    {$match: {'operationType': 'insert'}}, // listening for 'insert' events.
  ]);
  changeStream.on('error', (e) => {
    console.log('Error in genieacs faults collection change stream.');
    console.log(e);
  });
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
    let errorMsg = '';
    if (doc.detail !== undefined) {
      errorMsg += doc.detail.stack;
    } else if (doc.provision !== undefined) {
      errorMsg += doc.message + ': provision ' + doc.provision;
    } else {
      errorMsg += JSON.stringify(doc);
    }
    await createNotificationForDevice(errorMsg, doc.device);
  });
};

/* Creates a new notification in flashman, with the Genie ACS stack trace error
 'stackError' and with the device id 'genieDeviceId' as the notification target
 for that notification. If no 'genieDeviceId' is given, the error is considered
 to be from Genie itself. */
const createNotificationForDevice = async function(errorMsg, genieDeviceId) {
  // getting flashman device id related to the genie device id.
  let device = await DeviceModel.findOne({acs_id: genieDeviceId}, '_id').exec();
  if (!device) return;
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
    console.log('Error deleting Get parameters tasks: ' + err);
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
    console.log(
      'Error: ' + taskType + ' failure at ' + deviceid,
    );
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
  let name = task.name; // the task name/type.
  // the attribute name where a task holds its parameters.
  let parameterId = taskParameterIdFromType[name];
  // task name/type has to be defined in 'taskParameterIdFromType'.
  if (parameterId === undefined) return false;
  // in case task name/type is "setParameterValues".
  if (name === 'setParameterValues') {
    // its parameter has to be an array.
    if (task[parameterId].constructor !== Array) return false;
    // and for each value in that array.
    for (let i = 0; i < task[parameterId].length; i++) {
      // that value has also to be an array.
      if (task[parameterId][i].constructor !== Array) return false;
      // that sub array has to have length 3.
      if (task[parameterId][i].length < 2
       || task[parameterId][i].length > 3 ) return false;
      // first position has to be a string (tr069 parameter name).
      if (task[parameterId][i][0] === undefined
       || task[parameterId][i][0].constructor !== String
       // second position can be a string, a number or a boolean.
       || task[parameterId][i][1] === undefined
       || (task[parameterId][i][1].constructor !== String
        && task[parameterId][i][1].constructor !== Number
        && task[parameterId][i][1].constructor !== Boolean)
       // third position has to be a string (tr069 type).
       || task[parameterId][i][2] === undefined
       || task[parameterId][i][2].constructor !== String) return false;
    }
  } else if (name === 'getParameterValues' ) { // in case task name/type is
  // "getParameterValues".
    // its parameter has to be an array.
    if (task[parameterId].constructor !== Array) return false;
    // and for each value in that array.
    for (let i = 0; i < task[parameterId].length; i++) {
      // that value has to be a string (tr069 parameter name).
      if (task[parameterId][i].constructor !== String) return false;
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
 second position has an object where key is a task type/name and the value is
 an array of task ids to be deleted. It's implicit that all tasks belong to the
 same device id. The tasks to be delete are tasks that have the same name/type.
 All tasks with the same name/type are returned in the second argument. Tasks
 are not checked for being identical, in that case all identical tasks are
 marked to be removed and new identical task is created. The tasks to be added
 are the result of joining tasks with the same name/type or it's a task that
 has not been added yet, case that can be verified by checking that _id doesn't
 exist. Tasks that can't be joined won't be saved to be delete, will just be
 ignored but if it's a new task, it will be saved as task to be added. */
const joinAllTasks = function(tasks) {
  // console.log("tasks to join:", tasks)
  // map of task types (names) to their respective parameters. all parameters
  // including old and new tasks.
  let types = {};
  // map of task types to tasks ids of the same type, including old and new
  // tasks.
  let taskIdsForType = {};
  // a set of task types that need to be added, or re-added, to genie.
  let createNewTaskForType = {};
  for (let i = 0; i < tasks.length; i++) {
    let name = tasks[i].name; // task type is defined by its "name".
    // the name of the attribute that goes along with this task name/type.
    let parameterId = taskParameterIdFromType[name];
    // each task type has its parameters under an attribute with different name.

    // if parameters can't be joined and task isn't new.
    if (parameterId && tasks[i][parameterId].constructor !== Array
        && tasks[i]._id !== undefined) continue; // move to next task.

    // if we haven't seen this task type before. this is the first of its type.
    if (!types[name]) {
      // save this task's type and all its parameters.
      if (parameterId) {
        types[name] = tasks[i][parameterId];
      }
      // testing id existence. old tasks already have an id.
      if (tasks[i]._id) {
        // save this task's type and its id, because we may need to delete it
        // if it needs to be joined.
        taskIdsForType[name] = {};
        taskIdsForType[name][tasks[i]._id] = true;
      } else { // if a task is new, it doesn't have an id yet, because it has
      // never been added to genie.
        // a new task certainly needs to be added to genie.
        createNewTaskForType[name] = true;
      }
      // first task of its type means nothing to join. move to next task.
      continue;
    }

    // this part is reached if current task is not the first one found for its
    // type.
    if (tasks[i]._id !== undefined) { // for any task except the last one.
      taskIdsForType[name][tasks[i]._id] = true;
    } // remembering current task id because it will be joined.
    // joined tasks always result in creating a new task.
    createNewTaskForType[name] = true;

    // for each parameter of this task.
    for (let j = 0; j < tasks[i][parameterId].length; j++) {
      let parameter = tasks[i][parameterId][j];

      // index at previous task. initializing with a value that means not
      // found.
      let foundAtIndex = -1;
      // if a single parameter is also an array, that contains an Id and a
      // value.
      if (parameter.constructor === Array) {
        // search for parameter existence "manually".
        for (let k = 0; k < types[name].length; k++) {
          // first value is the identifier.
          if (types[name][k][0] === parameter[0]) {
            foundAtIndex = k;
          }
        }
      } else { // if parameter is not a group of values. (probably a single
      // string).
        // use javascript built in array search.
        foundAtIndex = types[name].indexOf(parameter);
      }

      if (foundAtIndex < 0) { // if parameter doesn't exist.
        types[name].push(parameter);
         // add it.
      } else {// if it already exists in a previous task.
        types[name][foundAtIndex] = parameter;
      } // substitute if with current value.
    }
  }

  // map of task types to ids of tasks that have the same type.
  let tasksToAdd = []; // array of new tasks, joined tasks or completely new.
  // for each task type to be created, or recreated.
  for (let name in createNewTaskForType) {
    if (name === name) {
      let newTask = {name: name}; // create a new task of current type.
      // add the joined parameters for current task type.
      if (taskParameterIdFromType[name]) {
        newTask[taskParameterIdFromType[name]] = types[name];
      }
      tasksToAdd.push(newTask); // save to list of tasks to be added.
    }
  }
  return [tasksToAdd, taskIdsForType];
};

/* for each task id, send a request to GenieACS to delete that task. GenieACS
 doesn't have a call to delete more than one task at once. 'deviceid' is used
 to print error messages. */
const deleteOldTasks = async function(tasksToDelete, deviceid) {
  let promises = []; // array that will hold http request promises.
  /* eslint-disable guard-for-in */
  for (let name in tasksToDelete) { // for each task name/type.
    // for each task._id in this task type/name.
    /* eslint-disable guard-for-in*/
    for (let id in tasksToDelete[name]) {
      promises.push(deleteTask(id)); // delete task.
    }
  } // add a request to array of promises.
  // wait for all promises to finish.
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
      return {success: true, executed: false, message: 'task scheduled'};
    } else {
      // something went wrong, log error and return
      console.log('Error adding task to GenieACS: ' + response.data);
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
  let tasks = await genie.getFromCollection('tasks', query).catch((e) => {
  /* rejected value will be error object in case of connection errors.*/
    return {
      success: false,
      message: `${e.code} when getting old tasks from genieacs ` +
      `rest api, for device ${deviceid}.`,
    };
  });
  // console.log("tasks found", tasks)
  // adding the new task as one more older task to tasks array.
  tasks.push(task);

  // if there was at least one task plus the current task being added in tasks
  // array.
  if (tasks.length > 1) {
    // declaring variable that will hold array of tasks to be
    // delete/substituted.
    let tasksToDelete;
    // substitutes tasks array with arrays of tasks to be added to genie.
    [tasks, tasksToDelete] = joinAllTasks(tasks);
    // console.log("joined tasks:", tasks, ", tasksToDelete:", tasksToDelete)


    /* we have to delete old tasks before adding the joined tasks because it
could happen that an old task is executed while we add their joined
counterpart, in which case deleting it would make genie return 'task not found'.
So we delete old tasks as fast as we can. Adding a task makes us wait at least
a 'timeout' amount of milliseconds, so it isn't fast. */
    // if there are tasks being substituted by new ones.
    if (Object.keys(tasksToDelete).length > 0) {
      // there will be tasks to be deleted.
      try {
        await deleteOldTasks(tasksToDelete, deviceid);
      } catch (e) {
        console.log('Warning (tasks-api): ' + e.message);
      }
    }
  }

  /* console.log("sending tasks", tasks, ", timeout:", timeout,
   ", watchTimes:", watchTimes)
   sending the new task and the old tasks being substituted,
   then return result. */
  return sendTasks(deviceid, tasks, callback, legacyTimeout, requestConn);
};

module.exports = genie;
