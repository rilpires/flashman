const TasksAPI = require('../../controllers/external-genieacs/tasks-api');
const {MongoClient} = require('mongodb');


// GenieACS
let GENIEHOST = (process.env.FLM_NBI_ADDR || 'localhost');
let GENIEPORT = (process.env.FLM_NBI_PORT || 7557);
let MONGOHOST = (process.env.FLM_MONGODB_HOST || 'localhost');
let MONGOPORT = (process.env.FLM_MONGODB_PORT || 27017);


// Change VALID_DEVICE_ID to a valid deviceID when testing
const VALID_DEVICE_ID = '24FD0D-xPON-495442530DC45D87';


// Copy of deleteTask in tasks-api.js
const deleteTask = function(taskid) {
  return TasksAPI.request({
    method: 'DELETE',
    hostname: GENIEHOST,
    port: GENIEPORT,
    path: '/tasks/'+taskid,
  });
};


const testAddTask = async function() {

};


describe('TR-069 Update Scheduler Tests', () => {
  let genieConnection;
  let genieDB;

  // Connect to mongo
  beforeAll(async () => {
    genieConnection = await MongoClient.connect('mongodb://' + MONGOHOST + ':' + MONGOPORT,
      {useUnifiedTopology: true, maxPoolSize: 100000});

    genieDB = genieConnection.db('genieacs');
  });

  afterAll(async () => {
    await genieConnection.close();
  });


  // Tests
  test('Validate addTask', async () => {
    let tasksCollection = genieDB.collection('tasks');
    let tasks = [];
    let response = {};

    // Tasks
    let validGetParametersTask = {
      name: 'getParameterValues',
      parameterNames: [
        'InternetGatewayDevice.DeviceInfo.SoftwareVersion',
      ],
    };

    let validDownloadTask = {
      name: 'download',
      instance: '1',
      fileType: '1 Firmware Upgrade Image',
      fileName: 'ONT121AC_SLIC_HYBRID_inMesh_1.1-220826.tar',
    };

    let validTracerouteTask = {
      name: 'setParameterValues',
      parameterValues: [
        [
          'InternetGatewayDevice.TraceRouteDiagnostics.DiagnosticsState',
          'Requested',
          'xsd:string',
        ],
        [
          'InternetGatewayDevice.TraceRouteDiagnostics.Host',
          'www.google.com',
          'xsd:string',
        ],
        [
          'InternetGatewayDevice.TraceRouteDiagnostics.Timeout',
          1000,
          'xsd:unsignedInt',
        ],
        [
          'InternetGatewayDevice.TraceRouteDiagnostics.MaxHopCount',
          20,
          'xsd:unsignedInt',
        ],
      ],
    };

    let invalidTask1 = {
      name: 'setParameterValues',
      parameterValues: null,
    };

    let invalidTask2 = {
      name: 'setParameterValues',
      parameterValues: undefined,
    };

    let invalidTask3 = {
      name: 'BBBBBBBBBB',
      parameterValues: [],
    };


    // Add a task with an invalid deviceID
    response = await TasksAPI.addTask(
      'AAAAAAAAAA',
      validGetParametersTask,
      null,
      300,
    );
    tasks = await tasksCollection.find({device: 'AAAAAAAAAA'});
    expect(response).toHaveProperty('success', false);
    expect(await tasks.count()).toBe(0);


    // Add a download task
    response = await TasksAPI.addTask(
      VALID_DEVICE_ID,
      validDownloadTask,
      null,
      300,
    );
    tasks = await tasksCollection.find({
      device: VALID_DEVICE_ID,
      name: 'download',
    });
    expect(response).toHaveProperty('success', true);
    expect(await tasks.count()).toBe(1);


    // Send another download task
    response = await TasksAPI.addTask(
      VALID_DEVICE_ID,
      validDownloadTask,
      null,
      300,
    );
    tasks = await tasksCollection.find({
      device: VALID_DEVICE_ID,
      name: 'download',
    });
    expect(response).toHaveProperty('success', true);
    expect(await tasks.count()).toBe(1);


    // Send an random task
    response = await TasksAPI.addTask(
      VALID_DEVICE_ID,
      validGetParametersTask,
      null,
      300,
    );
    tasks = await tasksCollection.find({
      device: VALID_DEVICE_ID,
      name: 'getParameterValues',
    });
    expect(response).toHaveProperty('success', true);
    expect(await tasks.count()).toBe(1);


    // Send an invalid task
    response = await TasksAPI.addTask(
      VALID_DEVICE_ID,
      invalidTask1,
      null,
      300,
    );
    tasks = await tasksCollection.find({
      device: VALID_DEVICE_ID,
      name: 'setParameterValues',
    });
    expect(response).toHaveProperty('success', false);
    expect(await tasks.count()).toBe(0);

    response = await TasksAPI.addTask(
      VALID_DEVICE_ID,
      invalidTask2,
      null,
      300,
    );
    tasks = await tasksCollection.find({
      device: VALID_DEVICE_ID,
      name: 'setParameterValues',
    });
    expect(response).toHaveProperty('success', true);
    expect(tasks.count()).toBe(0);

    response = await TasksAPI.addTask(
      VALID_DEVICE_ID,
      invalidTask3,
      null,
      300,
    );
    tasks = await tasksCollection.find({
      device: VALID_DEVICE_ID,
      name: 'BBBBBBBBBB',
    });
    expect(response).toHaveProperty('success', true);
    expect(await tasks.count()).toBe(0);


    // Send another random task
    response = await TasksAPI.addTask(
      VALID_DEVICE_ID,
      validTracerouteTask,
      null,
      300,
    );
    tasks = await tasksCollection.find({
      device: VALID_DEVICE_ID,
      name: 'setParameterValues',
    });
    expect(response).toHaveProperty('success', true);
    expect(await tasks.count()).toBe(1);


    // Send download task
    response = await TasksAPI.addTask(
      VALID_DEVICE_ID,
      validDownloadTask,
      null,
      300,
    );
    tasks = await tasksCollection.find({
      device: VALID_DEVICE_ID,
      name: 'download',
    });
    expect(response).toHaveProperty('success', true);
    expect(await tasks.count()).toBe(1);
  });
});
