const TasksAPI = require('../../../controllers/external-genieacs/tasks-api');
const {MongoClient} = require('mongodb');


// GenieACS
let MONGOHOST = (process.env.FLM_MONGODB_HOST || 'localhost');
let MONGOPORT = (process.env.FLM_MONGODB_PORT || 27017);


// Change VALID_DEVICE_ID to a valid deviceID when testing
// ToDo! This value should be setted according to the test database,
// but tasks-api is fixed to use the genieacs.
const VALID_DEVICE_ID = '24FD0D-xPON-495442530DC45D87';
const INVALID_PARAMETERS = [
  'AAAAAAAAAAAA',
  '',
  null,
  undefined,
  NaN,
  [],
  [0],
  [null],
  [undefined],
  {},
  {test: undefined},
  5,
  0,
  10.5,
  -5,
  +Infinity,
  -Infinity,
  // Symbol('BBBBBBBBB'),
  // Symbol(),
  // Missing BigInt
  false,
  true,
  function(x) {
    return x;
  },
];


const testAddTask = async function(
  deviceID,
  task,
  tasksCollection,
  expected,
) {
  let response = await TasksAPI.addTask(
    deviceID,
    task,
    null,
    300,
  );

  // Validating directly from mongo might have unexpected results
  // let tasks;
  //
  // If deviceID and name are valid
  // if (
  //   deviceID !== null &&
  //   deviceID !== undefined &&
  //
  //   task !== null &&
  //   task !== undefined &&
  //   task.name !== null &&
  //   task.name !== undefined
  // ) {
  //   tasks = await tasksCollection.find({
  //     device: deviceID,
  //     name: task.name,
  //   });
  //
  // If only deviceID is valid
  // } else if (
  //   deviceID !== null &&
  //   deviceID !== undefined
  // ) {
  //   tasks = await tasksCollection.find({
  //     device: deviceID,
  //   });
  //
  // If only name is valid
  // } else if (
  //   task !== null &&
  //   task !== undefined &&
  //   task.name !== null &&
  //   task.name !== undefined
  // ) {
  //   tasks = await tasksCollection.find({
  //     device: deviceID,
  //   });
  // }

  expect(response).toHaveProperty('success', expected.success);
  // expect(await tasks.count()).toBe(expected.value);
};


describe('TR-069 Update Scheduler Tests - tasks-api.js', () => {
  let genieConnection;
  let genieDB;

  // Connect to mongo
  beforeAll(async () => {
    genieConnection = await MongoClient.connect('mongodb://' + MONGOHOST + ':' + MONGOPORT,
      {useUnifiedTopology: true, maxPoolSize: 100000});

    genieDB = genieConnection.db('genieacs');
  });

  // Disconnect from mongo
  afterAll(async () => {
    await genieConnection.close();
  });


  // Tests
  test('Validate addTask', async () => {
    let tasksCollection = genieDB.collection('tasks');
    let invalidTasks = [];

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


    // Loop name
    for (let index = 0; index < INVALID_PARAMETERS.length; index++) {
      // Loop parameterValues
      for (let index2 = 0; index2 < INVALID_PARAMETERS.length; index2++) {
        // Push all combinations of invalid parameters
        invalidTasks.push({
          name: INVALID_PARAMETERS[index],
          parameterValues: INVALID_PARAMETERS[index2],
        });
      }


      // Push tasks with a valid name and invalid parameterValues
      invalidTasks.push({
        name: 'setParameterValues',
        parameterValues: INVALID_PARAMETERS[index],
      });


      // Push tasks without parameters
      invalidTasks.push({
        name: INVALID_PARAMETERS[index],
      });

      invalidTasks.push({
        parameterValues: INVALID_PARAMETERS[index],
      });


      // Push fully invalid tasks
      invalidTasks.push(INVALID_PARAMETERS[index]);
    }


    // Push task with only one parameter valid
    invalidTasks.push({
      parameterValues: [
        'InternetGatewayDevice.DeviceInfo.SoftwareVersion',
      ],
    });

    invalidTasks.push({
      name: 'setParameterValues',
    });


    // Test invalid deviceIDs
    for (let index = 0; index < INVALID_PARAMETERS.length; index++) {
      await testAddTask(
        INVALID_PARAMETERS[index],
        validGetParametersTask,
        tasksCollection,
        {success: false, value: 0},
      );
    }


    // Test invalid deviceIDs
    for (let index = 0; index < invalidTasks.length; index++) {
      await testAddTask(
        VALID_DEVICE_ID,
        invalidTasks[index],
        tasksCollection,
        {success: false, value: 0},
      );
    }


    // Test spawning 2 download tasks
    await testAddTask(
      VALID_DEVICE_ID,
      validDownloadTask,
      tasksCollection,
      {success: true, value: 1},
    );

    await testAddTask(
      VALID_DEVICE_ID,
      validDownloadTask,
      tasksCollection,
      {success: true, value: 1},
    );


    // Send 2 different tasks
    await testAddTask(
      VALID_DEVICE_ID,
      validGetParametersTask,
      tasksCollection,
      {success: true, value: 1},
    );

    await testAddTask(
      VALID_DEVICE_ID,
      validTracerouteTask,
      tasksCollection,
      {success: true, value: 1},
    );
  });
});
