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
  let types = {}
  let createNewTaskForType = {}
  let taskIdsForType = {}
  for (let i = 0; i < tasks.length; i++) {
    let name = tasks[i].name // task type is defined by its "name".
    let parameterId = taskParameterIdFromType[name] // each task type has its parameters under an attribute with different name.

    if (tasks[i][parameterId].constructor !== Array) // if parameters can't be joined.
      continue // move to next task.

    if (!types[name]) { // there may be, or may not be, more tasks of this type.
      types[name] = tasks[i][parameterId]
      taskIdsForType[name] = [tasks[i]._id]
      if (tasks[i]._id === undefined) // if the new task's type didn't exist before.
        createNewTaskForType[name] = true
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
  // console.log(types)
  // console.log(taskIdsForType)
  // console.log(createNewTaskForType)

  tasksToDelete = {}
  tasksToAdd = []
  for (let name in createNewTaskForType) {
    tasksToDelete[name] = taskIdsForType[name]
    newTask = {name: name}
    newTask[taskParameterIdFromType[name]] = types[name]
    tasksToAdd.push(newTask)
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
      if (response.statusMessage === 'No such device')
        errormsg = `Device ${deviceid} doesn't exist.`
      else if (response.statusCode !== 200)
        pendingTasks.push(JSON.parse(response.data)._id)
      // else
      //   sio.anlixSendGenieAcsTaskNotifications(deviceid, 
      //     {finished: true, taskid: JSON.parse(response.data)._id})
      else
        console.log({deviceid, finished: true, taskid: JSON.parse(response.data)._id, source: 'request'})
    }
  }
  return [pendingTasks, errormsg]
}

async function watchPendingTask (pendingTasks, deviceid) {
  let taskid = pendingTasks[pendingTasks.length-1]
  let changeStream = tasksCollection.watch([ 
    {$match: {operationType: "delete", 'documentKey._id': mongodb.ObjectID(taskid)}} 
  ])
  let taskTimer = setTimeout(async function () { 
    if (await tasksCollection.countDocuments({_id: mongodb.ObjectID(taskid)}) === 0) {
      changeStream.close()
      // sio.anlixSendGenieAcsTaskNotifications(deviceid, {
      //  finished: true, taskid: taskid })
      console.log({deviceid, finished: true, taskid: taskid, source: 'timer'})
    } else {
      console.log({deviceid, finished: false, taskid: taskid, source: 'timer'})
    }
  }, 600000)
  if (await changeStream.hasNext()) { // waiting for only one.
    let change = await changeStream.next()
    changeStream.close()
    clearTimeout(taskTimer)
    // sio.anlixSendGenieAcsTaskNotifications(deviceid, {
    //   finished: true, taskid: taskid })
    console.log({deviceid, finished: true, taskid: taskid, source: 'change stream'})
  }
}

/* refer to https://github.com/genieacs/genieacs/wiki/API-Reference#tasks.
'deviceid' is a string. 'task' is an object which structure is a genie task with its parameters already set. 
'timeout' is a number in milliseconds. 
'shouldRequestConnection' is a boolean that tells GenieACS to initiate a connection to the CPE and execute the task. 
'resquest' is the users request that initiate the task. */
const addTask = async function (deviceid, task, timeout, shouldRequestConnection) {
  console.log("-- starting to send task.")

  if (!checkTask(task)) return [undefined, 'task not valid.']

  console.log("-- getting older tasks.")
  // getting older tasks for this deviceid.
  let query = {device: deviceid}
  let response = await request({ method: 'GET', hostname: GENIEHOST, port: GENIEPORT, 
    path: '/tasks/?query='+encodeURIComponent(JSON.stringify(query))
  }).catch(e => e)
  if (response.constructor === Error)
    return [undefined, `${results[i].reason.code} when getting old tasks from genieacs rest api, for device ${deviceid}.`]

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
  let [pendingTasks, errormsg] = await sendTasks(deviceid, tasks, timeout, shouldRequestConnection)
  if (errormsg) return [undefined, errormsg]

  if (pendingTasks.length > 0) { // if genie didn't execute the task before the timeout.
    console.log("-- watching pending tasks.")
    watchPendingTask(pendingTasks, deviceid) // watch tasks collection and wait for the new task to be deleted.
  }

  return [true, undefined]
}

async function run () {
  // let deviceid = 'E01954-F670L-ZTE0QHEL4M05104'
  // let deviceid = 'E01954-F670L-ZTWDWDWDWDWDWD'
  let deviceid = '00259E-HG8245Q2-4857544380B0B09E'
  // let deviceid = '000AC2-HG6245D-FHTT951DCBA'

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
    // parameterValues: [["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel", 10]],
    parameterValues: [["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AutoChannelEnable", true]],
    // name: 'setParameterValues',
    // parameterValues: [
    //   ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID",'my second wifi name'],
    //   ["InternetGatewayDevice.ManagementServer.UpgradesManaged",true]
    // ],
    // name: 'download',
    // file: 'http://anlix.io/thisFile.firmware'
  //   name: 'getParameterValues',
  //   parameterNames: [
  //     "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.TotalBytesSent",
  //     "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.TotalBytesReceived",
  //     "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.TotalPacketsSent",
  //     "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.TotalPacketsReceived",
  //   ]
  }

  let ret = await addTask(deviceid, task, 5000, true)
  console.log(ret[0], ret[1])
}
