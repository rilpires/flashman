/*
Set of functions that will handle the communication from flashman to genieacs
through the use of genieacs-nbi, the genie rest api.
*/

const http = require('http');
const mongodb = require('mongodb');
const sio = require('../../sio');
const NotificationModel = require('../../models/notification');
const DeviceModel = require('../../models/device');


let GENIEHOST = 'localhost';
let GENIEPORT = 7557;

let genie = {}; // to be exported.

// starting a connection to MongoDB so we can start a change stream to the
// tasks collection when necessary.
let tasksCollection;
let genieDB;
if (!process.env.FLM_GENIE_IGNORED) { // if there's a GenieACS running.
  mongodb.MongoClient.connect('mongodb://localhost:27017',
    {useUnifiedTopology: true}).then(async (client) => {
    genieDB = client.db('genieacs');
    tasksCollection = genieDB.collection('tasks');
    // Only watch if flashman instance is the first one dispatched
    if (parseInt(process.env.NODE_APP_INSTANCE) === 0) {
      console.log('Watching for faults in GenieACS database');
      watchGenieFaults(); // start watcher for genie faults.
    }
    /* we should never close connection to database. it will be close when
     application stops. */
  });
}

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
    await createNotificationForDevice(doc.detail.stack, doc.device);
    console.log('WARNING: genieacs created a fault'+(doc.device ? 
      ' for device id '+doc.device : '')+'.');
  });
};

/* Creates a new notification in flashman, with the Genie ACS stack trace error
 'stackError' and with the device id 'genieDeviceId' as the notification target
 for that notification. If no 'genieDeviceId' is given, the error is considered
 to be from Genie itself. */
const createNotificationForDevice = async function(stackError, genieDeviceId) {
  // getting flashman device id related to the genie device id.
  let device = await DeviceModel.findOne({acs_id: genieDeviceId}, '_id').exec();
  // notification values.
  let params = {severity: 'alert', type: 'genieacs', action_title: 'Apagar',
    message_error: stackError};
  if (genieDeviceId !== undefined) { // if error has an associated device.
    params.message = 'Erro na ONU '+genieDeviceId+'. Chamar supporte.';
    params.target = device._id;
    params.genieDeviceId = genieDeviceId;
  } else { // if error has no associated device.
    params.message = 'Erro no GenieACS. Chamar supporte.';
  }
  let notification = new NotificationModel(params); // creating notification.
  await notification.save(); // saving notification.
};

// removes entries in Genie's 'faults' and 'cache' collections related to 
// a given device id.
genie.deleteCacheAndFaultsForDevice = async function(genieDeviceId) {
  // match anything that contains the given device id.
  let re = new RegExp('^'+genieDeviceId);
  await genieDB.collection('cache').deleteMany({_id: re});
  await genieDB.collection('faults').deleteMany({_id: re});
}

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
 string) and it up to the caller to set the correct header in case body is used.
 */
const request = (options, body) => {
  return new Promise((resolve, reject) => {
    let req = http.request(options, (res) => {
      res.setEncoding('utf8');
      res.data = '';
      res.on('data', (chunk) => res.data+=chunk);
      res.on('end', () => resolve(res));
    });
    req.on('error', reject);
    if (body !== undefined && body.constructor === String) req.write(body);
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

  let response = await request({
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

/* sends a put request with a given 'preset' to genieacs and returns the genie
 json response parsed to javascript object. may throw unhandled errors. */
genie.putPreset = async function(preset) {
  if (!checkPreset(preset)) throw new Error('preset is invalid.');

  let presetjson = JSON.stringify(preset);
  return request({
    method: 'PUT', hostname: GENIEHOST, port: GENIEPORT,
    path: `/presets/${encodeURIComponent(preset._id)}`,
    headers: {'Content-Type': 'application/json', 'Content-Length':
     Buffer.byteLength(presetjson)},
  }, presetjson);
};

/* simple request to send a new task to GenieACS and get a promise the resolves
 to the request response or rejects to request error. Will throw an uncaught
 error if task can't be stringifyed to json. */
const postTask = function(deviceid, task, timeout, shouldRequestConnection) {
  let taskjson = JSON.stringify(task); // can throw an error here.
  // console.log("Posting a task.")
  return request({
    method: 'POST', hostname: GENIEHOST, port: GENIEPORT,
    path: '/devices/'+encodeURIComponent(deviceid)+'/tasks?timeout='+timeout+
     (shouldRequestConnection ? '&connection_request' : ''),
    headers: {'Content-Type': 'application/json', 'Content-Length':
     Buffer.byteLength(taskjson)},
  }, taskjson);
};

/* simple request to delete a task, by its id, in GenieACS and get a promise
 the resolves to the request response or rejects to request error. */
const deleteTask = function(taskid) {
  return request({method: 'DELETE', hostname: GENIEHOST, port: GENIEPORT, path:
   '/tasks/'+taskid});
};

/* a map structure that holds task attribute names where the keys are the task
 names and the values are the task parameters respective to the task name. */
let taskParameterIdFromType = {
  getParameterValues: 'parameterNames',
  setParameterValues: 'parameterValues',
  refreshObject: 'objectName',
  addObject: 'objectName',
  download: 'file',
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
  for (let name in tasksToDelete) { // for each task name/type.
    if (name === name) {
      // for each task._id in this task type/name.
      for (let id in tasksToDelete[name]) {
        promises.push(deleteTask(id)); // delete task.
      }
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
      throw new Error(`Task not foud when deleting an old task in genieAcs `
        +`rest api, for device ${deviceid}.`);
    }
    /* successful deletes don't need to be noted. they are expected to be
 successful. */
  }
};

/* given an array of tasks scheduled for later and an array of times to wait
 for these tasks to be executed, starts a mongodb change stream watching for
 delete events on GenieACS task collection waiting for a document which _id
 matches the last task _id and starts a timeout using the first number on given
 'watchTimes'. If the change stream is executed first, the timeout is
 cleared/closed, the change stream is closed and a socket.io message is emitted
 saying the pending task has been executed. But if the timeout is executed
 first, the change stream is closed and if there are more values in
 'watchTimes', the last task is used in a new call to addTask(...) with
 'watchTimes' having the first value removed, meaning the whole process of
 adding a task will be done again (basically a retry of the last task), but if
 'watchTimes' has no more values, emits a message saying task was not executed.
 */
const watchPendingTaskAndRetry = async function(pendingTasks, deviceid,
 watchTimes, callback) {
  let task = pendingTasks.pop(); // removes last task out of the array.
  let watchTime = watchTimes.shift(); // removes first value out of the array.
  // starts a change stream in task collection from GenieACS database.
  let changeStream = tasksCollection.watch([
    {$match: {'operationType': 'delete', 'documentKey._id':
    mongodb.ObjectID(task._id)}}, // listening for 'delete' events,
  ]); // filtered by document._id match.
  changeStream.on('error', (e) => {
    changeStream.close();
  });

  return new Promise((resolve, reject) => {
    let taskTimer = setTimeout(async function() { // starts a timeout.
      // if there are zero documents matching task._id. it means task was
      // executed and change stream probably saw it first.
      if (await tasksCollection.countDocuments(
       {_id: mongodb.ObjectID(task._id)}) === 0) return;

      // if there is a document still in database matching task._id.
      changeStream.close(); // close change stream.
      if (watchTimes.length > 0) { // if there are more watchTimes in array.
        // repeat the whole process of adding a task with one less watch time.
        genie.addTask(deviceid, task, 5000, true, watchTimes);
        /* we don't need to repeat the whole process using all tasks because
when GenieACS execute one task, all tasks are also executed. We actually only
implement a retry because genie fails in its attempt to retry tasks. This is a
Genie hiccup. The result of our retry is the last task will be joined with
itself and will be removed and re added.*/
      } else { // if there no more watch times we won't retry anymore.
        if (callback) {
          callback({finished: false, task: task});
        } else {
          // sending a socket.io message saying it wasn't executed.
          sio.anlixSendGenieAcsTaskNotifications(deviceid, {finished: false,
           taskid: task._id, source: 'timer', message:
           `task never executed for deviceid ${deviceid}`});
        }
        resolve({finished: false, task: task, source: 'timer',
         message: `task never executed for deviceid ${deviceid}`});
      }
    }, watchTime); // amount of time to wait before executing setTimeout.

    // waiting for only one match on the change stream. simply because we filter
    // by _id, which is unique.
    // if the last task was execute, it's high likely the previous tasks were
    // also executed.
    changeStream.hasNext().then(async function() {
      if (changeStream.isClosed()) return;
      await changeStream.next();
      changeStream.close(); // close this change stream.
      clearTimeout(taskTimer); // clear setTimeout.
      if (callback) {
        callback({finished: true, task: task});
      } else {
        // sending a socket.io message saying it was executed.
        sio.anlixSendGenieAcsTaskNotifications(deviceid, {finished: true,
         taskid: task._id, source: 'change stream', message: 'task executed.'});
      }
      resolve({finished: true, task: task, source: 'change stream', message:
       'task executed.'});
    }, () => { // if any error happened with hasNext().
      changeStream.close();
    });
  });
};

/* for each task send a request to GenieACS to add a task to a device id.
 GenieACS doesn't have a call to add more than one task at once. Returns an
 array in which the first position is an error message if there were any or
 null otherwise and the second position is an array of tasks there were not
 processed in less than 'timeout' millisecond. 'shouldRequestConnection' is a
 boolean that tells GenieACS to initiate a connection to the CPE/ONU and
 execute the task. If 'shouldRequestConnection' is given false, all tasks will
 be scheduled for later execution by Genie. */
const sendTasks = async function(deviceid, tasks, timeout,
 shouldRequestConnection, watchTimes, callback) {
  // making each task become a promise.
  // transforming task objects into postTask promise function.
  tasks = tasks.map((task) => postTask(deviceid, task, timeout,
   shouldRequestConnection));
  // wait for all promises to finish.
  let results = await Promise.allSettled(tasks);
  // array of tasks that did not execute in less than 'timeout' millisecond.
  let pendingTasks = [];
  for (let i = 0; i < results.length; i++) { // for each request result.
    // if there was a reason it was rejected. print error message.
    if (results[i].reason) {
      // if this task is the last one, it means it is the brand new task.
      if (i === results.length-1) {
        throw new Error(results[i].reason.code
         + ` when adding new task in genieacs rest api, for device `
         +`${deviceid}.`);
      } else {// if it's not the brand new task.
        throw new Error(results[i].reason.code
         + ` when adding a joined task, in substitution of older tasks, in `
         +`genieacs rest api, for device ${deviceid}.`);
      }
    }

    let response = results[i].value; // referencing only promise's value.
    // console.log(`response ${i})`, response.statusCode,
    //  response.statusMessage, response.data) // for debugging.
    if (response.statusMessage === 'No such device') {/* if Genie responded
    saying device doesn't exist. */
      throw new Error(`Device ${deviceid} doesn't exist.`);
    }

    let task = JSON.parse(response.data); // parse task to javascript object.
    if (response.statusCode !== 200) {/* if Genie didn't respond with
      code 200, it scheduled the task for latter. */
      if (shouldRequestConnection) pendingTasks.push(task);
      /* if we are waiting for genie acs to connect with the device we add
 this task to array of pending tasks to watch for it disappearing in
 database. */
    } else if (i === results.length-1) {/* if request wasn't rejected and it
    is the last task in the array of tasks and Genie responded with status
    code 200, this means task has execute before 'timeout'. */
      if (callback) {
        callback({finished: true, task: task});
      } else {
        sio.anlixSendGenieAcsTaskNotifications(deviceid, {finished: true,
         taskid: task._id, source: 'request', message: 'task executed.'});
      }
      return {finished: true, task: task, source: 'request',
       message: 'task executed.'};
    }
  }

  // if genie didn't execute the task before the timeout.
  if (pendingTasks.length > 0) {
    // if there are no watch times, simply reply with task failed to execute.
    if (!watchTimes || watchTimes.length === 0) {
      if (callback) {
        callback({finished: false, task: pendingTasks.pop()});
      } else {
        sio.anlixSendGenieAcsTaskNotifications(deviceid,
         {finished: false, taskid: pendingTasks.pop()._id,
         source: 'pending reject', message: 'no watch times defined'});
      }
    } else {
      // watch tasks collection until the new task is deleted.
      return watchPendingTaskAndRetry(pendingTasks, deviceid, watchTimes,
       callback);
      // this function call also emits its result with socket.io (web sockets).
    }
  }
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
 connection to the CPE/ONU and execute the task. When it's false, genie will
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
genie.addTask = async function(deviceid, task, shouldRequestConnection,
  timeout=5000, watchTimes=[60000, 120000], callback=null) {
  // checking device id.
  if (!deviceid || deviceid.constructor !== String) {
    throw new Error('device id not valid. Received:', deviceid);
  }
  // checking task format and data types.
  if (!checkTask(task)) throw new Error('task not valid.');

  // getting older tasks for this device id.
  let query = {device: deviceid}; // selecting all tasks for a given device id.
  let tasks = await genie.getFromCollection('tasks', query).catch((e) => {
  /* rejected value will be error object in case of connection errors.*/
    throw new Error(`${e.code} when getting old tasks from genieacs rest api, `
     +`for device ${deviceid}.`); // return error code in error message.
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
      await deleteOldTasks(tasksToDelete, deviceid);
    }
  }

  // console.log("sending tasks", tasks, ", timeout:", timeout,
  // ", watchTimes:", watchTimes)
  // sending the new task and the old tasks being substituted, then return result.
  return sendTasks(deviceid, tasks, timeout, shouldRequestConnection,
   watchTimes, callback);
};

module.exports = genie;
