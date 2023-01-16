const request = require('supertest');
const mockingoose = require('mockingoose');
const models = require('./models');

// Models
const DeviceModel = require('../../models/device');
const FirmwareModel = require('../../models/firmware');
const ConfigModel = require('../../models/config');


// Scheduler
const updateScheduler = require('../../controllers/update_scheduler');


let utils = {
  common: {},
  schedulerCommon: {},
};


utils.common.TEST_PARAMETERS = [
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
  '{}',
  ':[}',
  '[]',
  '[0]',
];


/*
  Description:
    Login as admin in flashman and return the response that can be used to
    access the api.

  Inputs:

  Outputs:
    response - The login response with the cookie to be setted
*/
utils.common.loginAsAdmin = async function() {
  return (request('localhost:8000')
    .post('/login')
    .send({
      name: 'admin',
      password: 'landufrj123',
    })
    .catch((error) => console.log(error))
  );
};


/*
  Description:
    Sets an interception to the mongo access when calling func to return the
    device setted by data.

  Inputs:
    model - Which model to intercept
    data  - The model parameters to be setted for the model
    func  - The function to be intercepted

  Outputs:

*/
utils.common.mockMongo = function(model, data, func) {
  let mock = jest.fn().mockReturnValue(data);

  mockingoose(model).toReturn(mock, func);
};


/*
  Description:
    Mock a device

  Inputs:
    data  - The model parameters to be setted for the device
    func  - The function to be intercepted

  Outputs:

*/
utils.common.mockDevices = function(data, func) {
  utils.common.mockMongo(DeviceModel, data, func);
};


/*
  Description:
    Mock a firmware

  Inputs:
    data  - The model parameters to be setted for the firmware
    func  - The function to be intercepted

  Outputs:

*/
utils.common.mockFirmwares = function(data, func) {
  utils.common.mockMongo(FirmwareModel, data, func);
};


/*
  Description:
    Mock a config

  Inputs:
    data  - The model parameters to be setted for the config
    func  - The function to be intercepted

  Outputs:

*/
utils.common.mockConfigs = function(data, func) {
  utils.common.mockMongo(ConfigModel, data, func);
};


/*
  Description:
    Mock devices in defaultMockDevices

  Inputs:

  Outputs:

*/
utils.common.mockDefaultDevices = function() {
  utils.common.mockDevices(models.defaultMockDevices, 'find');
  utils.common.mockDevices(models.defaultMockDevices[0], 'findOne');
  utils.common.mockDevices(models.defaultMockDevices[0], 'findById');
};


/*
  Description:
    Mock firmwares in defaultMockFirmwares

  Inputs:

  Outputs:

*/
utils.common.mockDefaultFirmwares = function() {
  utils.common.mockFirmwares(models.defaultMockFirmwares, 'find');
  utils.common.mockFirmwares(models.defaultMockFirmwares[0], 'findOne');
  utils.common.mockFirmwares(models.defaultMockFirmwares[0], 'findById');
};


/*
  Description:
    Mock configs in defaultMockConfigs

  Inputs:

  Outputs:

*/
utils.common.mockDefaultConfigs = function() {
  utils.common.mockConfigs(models.defaultMockConfigs, 'find');
  utils.common.mockConfigs(models.defaultMockConfigs[0], 'findOne');
  utils.common.mockConfigs(models.defaultMockConfigs[0], 'findById');
};


/*
  Description:
    Get all device models based on the query passed.

  Inputs:
    query - The query to find the devices

  Outputs:
    devices - All device models matched by query
*/
utils.common.getDevices = async function(query) {
  const matchedDevices = DeviceModel
    .find(query)
    .lean()
    .catch((error) => console.log(error));

    return matchedDevices;
};


/** ************ Update Scheduler ************ **/


/*
  Description:
    Send a request get scheduler releases and return the request.

  Inputs:
    cookie - The cookie login
    data - The data to be sent

  Outputs:
    releases - The request sent to get the releases
*/
utils.schedulerCommon.getReleases = async function(cookie, data) {
  return (request('localhost:8000')
      .put('/devicelist/scheduler/releases')
      .set('Cookie', cookie)
      .send(data)
      .catch((error) => console.log(error))
  );
};


/*
  Description:
    Create a basic fake response

  Inputs:
    errorCode - The error code of the response
    promiseResolve - The resolver of the promise to be called when finished
    data - The body of the response

  Outputs:
    response - An object containing the statusCode and the data
*/
const fakeJson = function(errorCode, promiseResolve, header, data) {
  // Build the response
  let response = {
    statusCode: errorCode,
    body: data,
    header: header,
  };

  // Resolve the promise
  promiseResolve(response);

  return response;
};


/*
  Description:
    Create a fake response status

  Inputs:
    errorCode - The error code of the response
    promiseResolve - The resolver of the promise to be called when finished

  Outputs:
    status - An object containing the statusCode and a json function that
    can generate a basic fake response
*/
const fakeStatus = function(errorCode, promiseResolve, header) {
  return {
    statusCode: errorCode,
    json: (data) => fakeJson(errorCode, promiseResolve, header, data),
    send: (data) => fakeJson(errorCode, promiseResolve, header, data),
  };
};


/*
  Description:
    Call the function passed faking a request.

  Inputs:
    func - The function to be called
    data - The data to be sent

  Outputs:
    promise - A promise to wait for the response
*/
utils.schedulerCommon.sendFakeRequest = async function(func, data) {
  let promiseResolve;

  // Create a promise and store the resolve
  let promise = new Promise((resolve) => {
    promiseResolve = resolve;
  });

  // Call the function
  func(
    {body: data, user: {
      role: undefined,
      is_superuser: true,
    }},

    // Pass the promise resolve
    {
      header: {},
      status: (errorCode) => fakeStatus(
        errorCode, promiseResolve, this.header,
      ),
      set: (headerName, value) => function() {
        this.header[headerName] = value;
      },
    },
  );

  return promise;
};


/*
  Description:
    Call the function getDevicesReleases faking a request.

  Inputs:
    data - The data to be sent

  Outputs:
    releases - A promise to get the releases
*/
utils.schedulerCommon.getReleasesFake = async function(data) {
  let promise = utils.schedulerCommon.sendFakeRequest(
    updateScheduler.getDevicesReleases,
    data,
  );

  return promise;
};


/*
  Description:
    Call the function startSchedule faking a request.

  Inputs:
    data - The data to be sent

  Outputs:
    promise - A promise to start the scheduler
*/
utils.schedulerCommon.startSchedulerFake = async function(data) {
  let promise = utils.schedulerCommon.sendFakeRequest(
    updateScheduler.startSchedule,
    data,
  );

  return promise;
};


/*
  Description:
    Call the function abortSchedule faking a request.

  Inputs:

  Outputs:
    promise - A promise to abort the scheduler
*/
utils.schedulerCommon.abortSchedulerFake = async function() {
  let promise = utils.schedulerCommon.sendFakeRequest(
    updateScheduler.abortSchedule,
    {},
  );

  return promise;
};


/*
  Description:
    Call the function scheduleResult faking a request.

  Inputs:

  Outputs:
    promise - A promise to get the result of the scheduler
*/
utils.schedulerCommon.schedulerResultFake = async function() {
  let promise = utils.schedulerCommon.sendFakeRequest(
    updateScheduler.scheduleResult,
    {},
  );

  return promise;
};


/*
  Description:
    Send a request to start the scheduler and return the request.

  Inputs:
    cookie - The cookie login
    data - The data to be sent

  Outputs:
    releases - The request sent to start the scheduler
*/
utils.schedulerCommon.sendStartSchedule = async function(cookie, data) {
  return (request('localhost:8000')
      .post('/devicelist/scheduler/start')
      .set('Cookie', cookie)
      .send(data)
      .catch((error) => console.log(error))
  );
};


module.exports = utils;
