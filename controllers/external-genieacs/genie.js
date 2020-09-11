/*
Set of functions that will handle the communication from flashman to genieacs 
through the use of genieacs-nbi, the genie rest api.
*/

const http = require('http');
const mongodb = require('mongodb')
// const sio = require('../../sio')


let GENIEHOST = 'localhost'
let GENIEPORT = 7557


let tasksCollection
mongodb.MongoClient.connect('mongodb://localhost:27017', 
  {useUnifiedTopology: true}).then(async client => {
  tasksCollection = client.db('genieacs').collection('tasks')
  await run().catch(e => console.log(e))
  // client.close()
})

if (Promise.allSettled === undefined) {
  Promise.allSettled = function allSettled(promises) {
    let wrappedPromises = promises.map(p => Promise.resolve(p)
        .then(
            val => ({ status: 'fulfilled', value: val }),
            err => ({ status: 'rejected', reason: err })));
    return Promise.all(wrappedPromises);
  }
}

const request = (options, body) => {
  return new Promise((resolve, reject) => {
    let req = http.request(options, res => {
      res.setEncoding('utf8')
      res.data = ''
      res.on('data', chunk => res.data+=chunk)
      res.on('end', _ => resolve(res))
    })
    req.on('error', reject)
    if (body !== undefined && body.constructor === String) req.write(body)
    req.end()
  })
}

function postTask (deviceid, task, timeout, shouldRequestConnection) {
  let taskstring = JSON.stringify(task)
  return request({ 
    method: "POST", hostname: GENIEHOST, port: GENIEPORT,
    path: '/devices/'+deviceid+'/tasks?timeout='+timeout+(shouldRequestConnection ? '&connection_request' : ''),
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(taskstring)}
  }, taskstring)
}

function deleteTask (taskid) {
  return request({ method: 'DELETE', hostname: GENIEHOST, port: GENIEPORT, path: '/tasks/'+taskid })
}

let taskParameterIdFromType = {
  getParameterValues: "parameterNames", setParameterValues: "parameterValues",
  refreshObject: "objectName", addObject: "objectName", download: "file",
}

function checkTask (task) {
  let name = task.name
  let parameterId = taskParameterIdFromType[name]
  if (parameterId === undefined) return false
  if (name === "setParameterValues") {
    if (task[parameterId].constructor !== Array) return false
    for (let i = 0; i < task[parameterId].length; i++) {
      if (task[parameterId][i].constructor !== Array) return false
      if (task[parameterId][i].length !== 2) return false
      if (task[parameterId][i][0].constructor !== String 
          || (task[parameterId][i][1].constructor !== String 
              && task[parameterId][i][1].constructor !== Number
              && task[parameterId][i][1].constructor !== Boolean)
          ) return false
    }
  } else if (name === "getParameterValues" ) {
    if (task[parameterId].constructor !== Array) return false
    for (let i = 0; i < task[parameterId].length; i++) {
      if (task[parameterId][i].constructor !== String) return false
    }
  } else {
    if (task[parameterId].constructor !== String) return false
  }
  return true
}

function joinAllTasks(tasks) {
  let types = {} // map of task types (names) to their respective parameters. all parameters including old and new tasks.
  let taskIdsForType = {} // map of task types to tasks ids of the same type, including old and new tasks.
  let createNewTaskForType = {} // a set of task types need to be added, or re-added, to genie.
  for (let i = 0; i < tasks.length; i++) {
    let name = tasks[i].name // task type is defined by its "name".
    let parameterId = taskParameterIdFromType[name] // each task type has its parameters under an attribute with different name.

    if (tasks[i][parameterId].constructor !== Array) // if parameters can't be joined.
      continue // move to next task.

    if (!types[name]) { // if we haven't seen this task type before. this is the first of its type.
      types[name] = tasks[i][parameterId] // save this task's type and all its parameters.
      if (tasks[i]._id) { // testing id existence. old tasks already have an id.
        // save this task's type and its id, because we may need to delete it if it needs to be joined.
        taskIdsForType[name] = [tasks[i]._id] 
      } else { // if a task is new, it doesn't have an id yet, because it has never been added to genie.
        createNewTaskForType[name] = true // a new task certainly needs to be added to genie.
      }
      continue // first task of its type means nothing to join. move to next task.
    }

    // this part is reached if current task is not the first one found for its type.
    if (tasks[i]._id !== undefined) // for any task except the last one.
      taskIdsForType[name].push(tasks[i]._id) // remembering current task id because it will be joined.
    createNewTaskForType[name] = true // joined tasks always result in creating a new task.

    for (let j = 0; j < tasks[i][parameterId].length; j++) { // for each parameter of this task.
      let parameter = tasks[i][parameterId][j]

      let foundAtIndex = -1 // index at previous task. initializing with a value that means not found.
      if (parameter.constructor === Array) { // if a single parameter is also an array, that contains an Id and a value.
        for (let k = 0; k < types[name].length; k++) // search for parameter existence "manually".
          if (types[name][k][0] === parameter[0]) // first value is the identifier.
            foundAtIndex = k
      } else { // if parameter is not a group of values. (probably a single string).
        foundAtIndex = types[name].indexOf(parameter) // use javascript built in array search.
      }

      if (foundAtIndex < 0) // if parameter doesn't exist.
        types[name].push(parameter) // add it.
      else // if it already exists in a previous task.
        types[name][foundAtIndex] = parameter // substitute if with current value.
    }
  }
  // console.log('types', types)
  // console.log('createNewTaskForType', createNewTaskForType)
  // console.log('taskIdsForType', taskIdsForType)

  tasksToDelete = {} // map of task types to ids of tasks that have the same type.
  tasksToAdd = [] // array of new tasks, joined tasks or completely new.
  for (let name in createNewTaskForType) { // for each task type to be created, or recreated.
    let ids = taskIdsForType[name] // getting ids that have the same type.
    if (ids && ids.length > 0) // if there is at least one id.
      tasksToDelete[name] = taskIdsForType[name] // save to list of tasks to delete.
    let newTask = {name: name} // create a new task of current type.
    newTask[taskParameterIdFromType[name]] = types[name] // add the joined parameters for current task type.
    tasksToAdd.push(newTask) // save to list of tasks to be added.
  }
  return [tasksToAdd, tasksToDelete]
}

async function deleteOldTaks (tasksToDelete, deviceid) {
  let promises = []
  for (let name in tasksToDelete)
    for (let i = 0; i < tasksToDelete[name].length; i++)
      promises.push(deleteTask(tasksToDelete[name][i]))
  results = await Promise.allSettled(promises)
  for (let i = 0; i < results.length; i++) {
    if (results[i].reason)
      console.log(`${results[i].reason.code} when deleting older tasks in genieacs rest api, for device ${deviceid}.`)
    else if (results[i].value.data === 'Task not found')
      console.log(`Task not foud When deleting an old task in genieAcs rest api, for device ${deviceid}.`)
  }

}

async function sendTasks (deviceid, tasks, timeout, shouldRequestConnection) {
  let promises = []
  for (let i = 0; i < tasks.length; i++)
    promises.push(postTask(deviceid, tasks[i], timeout, shouldRequestConnection))
  let results = await Promise.allSettled(promises)
  let errormsg
  let pendingTasks = []
  for (let i = 0; i < results.length; i++) {
    if (results[i].reason) { // treating http connection request errors.
      // delete tasksToDelete[tasks[i].name] // this is why we don't delete older tasks before adding substituting tasks.
      errormsg = results[i].reason.code
        + ` when adding a joined task, in substitution of older tasks, in genieacs rest api, for device ${deviceid}.`
      if (tasks[i].name === task.name) // if this task is the one given as argument to this function. it's brand new.
        errormsg = results[i].reason.code
          + ` when adding new task in genieacs rest api, for device ${devicei}.`
    } else {
      let response = results[i].value
      console.log(`response ${i})`, response.statusCode, response.statusMessage)
      if (response.statusMessage === 'No such device') {
        errormsg = `Device ${deviceid} doesn't exist.`
      } else if (response.statusMessage === 'Device is offline') {
        // sio.anlixSendGenieAcsTaskNotifications(deviceid, 
        //   {finished: true, taskid: JSON.parse(response.data)._id})
        console.log({deviceid, finished: false, taskid: JSON.parse(response.data)._id, source: 'request', 
          message: response.statusMessage})
      } else if (response.statusCode !== 200) {
        pendingTasks.push(JSON.parse(response.data))
      } else {
        // sio.anlixSendGenieAcsTaskNotifications(deviceid, 
        //   {finished: true, taskid: JSON.parse(response.data)._id})
        console.log({deviceid, finished: true, taskid: JSON.parse(response.data)._id, source: 'request', 
          message: 'task executed.'})
      }
    }
  }
  return [errormsg, pendingTasks]
}

async function watchPendingTaskAndRetry (pendingTasks, deviceid, watchTimes) {
  let task = pendingTasks.pop()
  let watchTime = watchTimes.shift()
  let changeStream = tasksCollection.watch([ 
    {$match: {operationType: "delete", 'documentKey._id': mongodb.ObjectID(task._id)}} 
  ])
  let taskTimer = setTimeout(async function () { 
    if (await tasksCollection.countDocuments({_id: mongodb.ObjectID(taskid)}) === 0) { return }
    console.log('run out of time. retying.')
    // let dumTask = {name: getParameterValues, 
    //   parameterNames: ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.TotalBytesSent"]}
    changeStream.close()
    addTask(deviceid, task, 5000, true, watchTimes)
    // let [errormsg, pendingTasks] = await sendTasks(deviceid, [task], 5000, true, watchTimes)
    // if (pendingTasks.length === 0) { return }
    // taskTimer = setTimeout(async function () {
    //   if (await tasksCollection.countDocuments({_id: mongodb.ObjectID(task._id)}) === 0) { return }
    //   // sio.anlixSendGenieAcsTaskNotifications(deviceid, {
    //   //  finished: true, taskid: task._id })
    //   console.log({deviceid, finished: false, taskid: task._id, source: 'dumb task timer', 
    //     message: `task never executed in ${(watchTime/1000 +120).toFixed(0)} seconds.`})
    // }, 120000)
  }, watchTime)
  if (await changeStream.hasNext()) { // waiting for only one.
    let change = await changeStream.next()
    changeStream.close()
    clearTimeout(taskTimer)
    // sio.anlixSendGenieAcsTaskNotifications(deviceid, {
    //   finished: true, taskid: task._id })
    console.log({deviceid, finished: true, taskid: task._id, source: 'change stream', message: 'task executed.'})
  }
}

/* refer to https://github.com/genieacs/genieacs/wiki/API-Reference#tasks.
'deviceid' is a string. 'task' is an object which structure is a genie task with its parameters already set. 
'timeout' is a number in milliseconds. 
'shouldRequestConnection' is a boolean that tells GenieACS to initiate a connection to the CPE and execute the task. 
'resquest' is the users request that initiate the task. */
const addTask = async function (deviceid, task, timeout=5000, shouldRequestConnection, watchTimes=[600000, 120000]) {
  if (watchTimes.length === 0) { return }

  console.log("-- starting to send task.")

  if (!checkTask(task)) return ['task not valid.', undefined]

  console.log("-- getting older tasks.")
  // getting older tasks for this deviceid.
  let query = {device: deviceid}
  let response = await request({ method: 'GET', hostname: GENIEHOST, port: GENIEPORT, 
    path: '/tasks/?query='+encodeURIComponent(JSON.stringify(query))
  }).catch(e => e)
  if (response.constructor === Error) {
    return [`${response.code} when getting old tasks from genieacs rest api, for device ${deviceid}.`, undefined]
  }

  console.log("-- parsing older tasks.")
  let tasks = JSON.parse(response.data) // parsing older tasks.
  tasks.push(task) // adding the new task as one more older task.

  if (tasks.length > 1) { // if there was at least one task plus the current task being added.
    console.log("-- joining tasks tasks.")
    let tasksToDelete
    [tasks, tasksToDelete] = joinAllTasks(tasks)

    if (Object.keys(tasksToDelete).length > 0) {// if there are tasks being substituted by new ones.
      console.log("-- deleting tasks tasks.")
      await deleteOldTaks(tasksToDelete)
    }
  }
  
  console.log("-- sending tasks.")
  // send the new task and the old tasks being substituted.
  let [errormsg, pendingTasks] = await sendTasks(deviceid, tasks, timeout, shouldRequestConnection)
  if (errormsg) return [errormsg, undefined]

  if (pendingTasks.length > 0) { // if genie didn't execute the task before the timeout.
    console.log("-- watching pending tasks.")
    watchPendingTaskAndRetry(pendingTasks, deviceid, watchTimes) // watch tasks collection and wait for the new task to be deleted.
  }

  return [undefined, true]
}

async function run () {
  // let deviceid = 'E01954-F670L-ZTE0QHEL4M05104'
  let deviceid = '00259E-HG8245Q2-4857544380B0B09E'
  // let deviceid = '000AC2-HG6245D-FHTT951DCBA0'
  // let deviceid = '202BC1-BM632w-000000'


  // let results = await Promise.allSettled([
  //   postTask(deviceid, {
  //     name: 'getParameterValues',
  //     parameterNames: [
  //       "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel",
  //       "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.WPS.Enable",
  //     ]
  //   }, 2000, false),
  //   postTask(deviceid, {
  //     name: 'getParameterValues',
  //     parameterNames: [
  //       "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID",
  //     ]
  //   }, 2000, false),
  // ])
  // results.map(r => console.log(r.value.statusCode, r.value.statusMessage))

  let task = {
    name: 'setParameterValues',
    // parameterValues: [["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel", 4]],
    // parameterValues: [["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel", 1],["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AutoChannelEnable", true]],
    // parameterValues: [["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AutoChannelEnable", true]],
    // name: 'setParameterValues',
    parameterValues: [
      // ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID",'another wifi name'],
      ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID",'HUAWEI-2.4G-fpkf'],
      // ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.WPS.Enable", false],
    ],
    // name: 'download',
    // file: 'http://anlix.io/thisFile.firmware'
    // name: 'getParameterValues',
    // parameterNames: [
    //   "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID",
    //   "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.TotalBytesSent",
    //   "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.TotalBytesReceived",
    //   "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.TotalPacketsSent",
    //   "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.TotalPacketsReceived",
    // ]
  }

  let ret = await addTask(deviceid, task, 5000, true, [5*60*1000, 2*60*1000])
  // let ret = await sendTasks(deviceid, [task], 5000, true)
  console.log(ret[0], ret[1])
}