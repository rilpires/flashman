/*
Set of functions that will handle the communication from flashman to genieacs 
through the use of genieacs-nbi, the genie rest api.
*/

const http = require('http');


const request = (options, body) => {
  return new Promise((resolve, reject) => {
    let req = http.request(options, res => {
      res.setEncoding('utf8')
      let data = ''
      res.on('data', chunk => data+=chunk)
      res.on('end', _ => {resolve(data)})
    })
    req.on('error', e => {reject(e)})
    if (body !== undefined && body.constructor === String) req.write(body)
    req.end()
  })
}

let GENIEHOST = 'localhost'
let GENIEPORT = 7557

function postTask (deviceid, task, timeout, shouldRequestConnection) {
  return request({ method: "POST", hostname: GENIEHOST, port: GENIEPORT,
    path: '/devices/'+deviceid+'/tasks?timeout='+timeout+(shouldRequestConnection ? '&connection_request' : '')
  }, JSON.stringify(task))
}

function deleteTask (taskid) {
  return request({ method: 'DELETE', hostname: GENIEHOST, port: GENIEPORT, path: '/tasks/'+taskid })
}

let taskParameterIdFromType = {
  getParameterValues: "parameterNames",
  setParameterValues: "parameterValues",
  refreshObject: "objectName",
  addObject: "objectName",
  download: "file",
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
      if (task[parameterId][i][0].constructor !== String || task[parameterId][i][1].constructor !== String) return false
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
      if (tasks[i]._id === undefined) // if the new task is of type that didn't exist before.
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

// refer to https://github.com/genieacs/genieacs/wiki/API-Reference#tasks
// 'deviceid' is a string. 'task' is an object which structure is the given 
// task with its parameters already set. 'timeout' is a number in 
// milliseconds. 'shouldRequestConnection' is a boolean that tells GenieACS to 
// initiate a connection to the CPE.
const addTask = async function (deviceid, task, timeout, shouldRequestConnection) {
  if (!checkTask(task)) return [null, 'task not valid.']

  // getting older tasks for this deviceid.
  let query = {device: deviceid}
  let dataString = await request({ method: 'GET', hostname: GENIEHOST, port: GENIEPORT, 
    path: '/tasks/?query='+encodeURIComponent(JSON.stringify(query))
  })
  .catch(e => '[]')

  var tasks = JSON.parse(dataString)
  tasks.push(task) // adding the new task as one more older task.

  let tasksToDelete = {}
  if (tasks.length > 1) // if there was at least one task, plus the current task being added.
    [tasks, tasksToDelete] = joinAllTasks(tasks)
  
  let promises = []
  for (var i = 0; i < tasks.length; i++)
    promises.push(postTask(deviceid, tasks[i], timeout, shouldRequestConnection))
  let results = await Promise.allSettled(promises)
  let errormsg
  for (let i = 0; i < results.length; i++)
    if (results[i].reason) {
      delete tasksToDelete[tasks[i].name] // this is why we don't delete older tasks before adding substituting tasks.
      if (tasks[i].name === task.name) {
        errormsg = 'Error when adding new task in genieacs rest api for device '+deviceid
      } else {
        console.log('Error when adding a joined task in genieacs rest api in substitution of older tasks for device '+deviceid)
      }
    }

  if (Object.keys(tasksToDelete).length > 0) {
    promises = []
    for (let name in tasksToDelete)
      for (let i = 0; i < tasksToDelete[name].length; i++)
        promises.push(deleteTask(tasksToDelete[name][i]))
    results = await Promise.allSettled(promises)
    for (let i = 0; i < results.length; i++)
      if (results[i].reason)
        console.log('Error when deleting older tasks in genieacs rest api for device '+deviceid)
  }

  if (errormsg) return [null, errormsg]
  return [true, null]

}

let deviceid = '202BC1-BM632w-00000'
let task = {"name":"getParameterValues","parameterNames":["InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnectionNumberOfEntries","InternetGatewayDevice.Time.NTPServer1","InternetGatewayDevice.Time.Status"]}
addTask(deviceid, task, 10000, true)

// deleteTask("5f4d8d0bb465ab6c13c5a98f").then(console.log)