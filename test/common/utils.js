/**
 * This file includes test utilities.
 * @namespace test/common/utils
 */
/**
 * All test utilities that can be used in all tests.
 * @namespace test/common/utils.common
 */
/**
 * Test utilities that can be used for update scheduler.
 * @namespace test/common/utils.schedulerCommon
 */
/**
 * Test utilities that can be used for devices-api.
 * @namespace test/common/utils.devicesAPICommon
 */

const request = require('supertest');
const mockingoose = require('mockingoose');
const models = require('./models');

process.env.FLM_GENIE_IGNORED = 'TESTE!';

// Models
const DeviceModel = require('../../models/device');
const FirmwareModel = require('../../models/firmware');
const ConfigModel = require('../../models/config');
const RoleModel = require('../../models/role');
const UserModel = require('../../models/user');

// Environments
process.env.FLM_MIN_TIMEOUT_PERIOD = '10';
process.env.FLM_MAX_TIMEOUT_PERIOD = '1440';

// Scheduler
const updateScheduler = require('../../controllers/update_scheduler');

// Devices API
const DevicesAPI = require('../../controllers/external-genieacs/devices-api');


// Mock the mqtts (avoid aedes)
jest.mock('../../mqtts', () => {
  return {
    __esModule: false,
    unifiedClientsMap: {},
    anlixMessageRouterUpdate: () => undefined,
    getConnectedClients: () => [],
  };
});


let utils = {
  common: {},
  schedulerCommon: {},
  devicesAPICommon: {},
};


// Constants
/**
 * The development Flashman host string.
 *
 * @memberof test/common/utils.common
 *
 * @type {String}
 */
utils.common.FLASHMAN_HOST = 'http://localhost:8000';

/**
 * The development Flashman authentication username.
 *
 * @memberof test/common/utils.common
 *
 * @type {String}
 */
utils.common.BASIC_AUTH_USER = 'admin';

/**
 * The development Flashman authentication password.
 *
 * @memberof test/common/utils.common
 *
 * @type {String}
 */
utils.common.BASIC_AUTH_PASS = 'flashman';


/**
 * Array of test cases.
 *
 * @memberOf test/common/utils.common
 *
 * @type {Array}
 *
 * @param {Any} x - The parameter to be passed.
 *
 * @return {Any} The parameter passed.
 */
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


/**
 * Login as admin in flashman and return the response that can be used to
 * access the api.
 *
 * @memberOf test/common/utils.common
 *
 * @async
 *
 * @return {Response} The login response with the cookie to be setted.
 */
utils.common.loginAsAdmin = async function() {
  return (request(utils.common.FLASHMAN_HOST)
    .post('/login')
    .send({
      name: utils.common.BASIC_AUTH_USER,
      password: utils.common.BASIC_AUTH_PASS,
    })
    .catch((error) => console.log(error))
  );
};


/**
 * Deletes the CPE passed to this function from Flashman.
 *
 * @memberOf test/common/utils.common
 *
 * @async
 *
 * @param {String} cpeID - The cpeID to be deleted from Flahsman.
 * @param {Cookie} cookie - The login cookie.
 *
 * @return {Response} The delete response.
 */
utils.common.deleteCPE = async function(cpeID, cookie) {
  return (request(utils.common.FLASHMAN_HOST)
    .delete('/api/v2/device/delete/' + cpeID)
    .set('Cookie', cookie)
    .auth(utils.common.BASIC_AUTH_USER, utils.common.BASIC_AUTH_PASS)
    .send()
    .catch((error) => console.log(error))
  );
};


/**
 * Sends the request to the route specified to Flashman, with the data passed.
 *
 * @memberOf test/common/utils.common
 *
 * @async
 *
 * @param {String} type - The type of request(`put`, `delete`, `get`,
 * `post`...).
 * @param {String} route - The cpeID to be deleted from Flahsman.
 * @param {Cookie} cookie - The cookie login.
 * @param {Object} data - The data to be sent to the route.
 *
 * @return {Response} The response.
 */
utils.common.sendRequest = async function(type, route, cookie, data) {
  let flashmanRequest = request(utils.common.FLASHMAN_HOST);

  return (await flashmanRequest[type](route)
    .set('Cookie', cookie)
    .auth(utils.common.BASIC_AUTH_USER, utils.common.BASIC_AUTH_PASS)
    .send(data)
    .catch((error) => console.log(error))
  );
};


/**
 * Sets an interception to the mongo access when calling func to return the
 * device setted by data.
 * There is a case that this function will not work and the error
 * `TypeError: Cannot read property 'Decimal128' of null` will be thrown. In
 * this case, use the function `mockAwaitMongo`. It usually happens due to
 * await.
 *
 * @memberOf test/common/utils.common
 *
 * @param {Model} model - Which model to intercept.
 * @param {Object} data - The model parameters to be setted for the model.
 * @param {String} func - The function to be intercepted.
 *
 * @see {@linkcode utils.common.mockAwaitMongo} in case of this error.
 */
utils.common.mockMongo = function(model, data, func) {
  let mock = jest.fn().mockReturnValue(data);

  mockingoose(model).toReturn(mock, func);
};


/**
 * When the normal `mockMongo` does not work due to the use of await, this
 * function takes place. It sets an interception to the mongo access when
 * calling func to return the device setted by data.
 *
 * @memberOf test/common/utils.common
 *
 * @param {Model} model - Which model to intercept.
 * @param {Object} data - The model parameters to be setted for the model.
 * @param {String} func - The function to be intercepted.
 * @param {Boolean} shouldError - If the catch callback should be called or not.
 *
 * @see {@linkcode utils.common.mockMongo} for default mocking.
 */
utils.common.mockAwaitMongo = function(
  model,
  data,
  func,
  shouldError = false,
) {
  let dataMock = data;
  dataMock.lean = () => data;
  dataMock.catch = (func) => {
    if (shouldError) {
      func(Error('Error generated by test!'));
      return undefined;
    }

    return data;
  };
  dataMock.save = () => {
    return dataMock;
  };


  jest.spyOn(model, func).mockImplementation(() => {
    return dataMock;
  });
};


/**
 * Mock a device
 * There is a case that this function will not work and the error
 * `TypeError: Cannot read property 'Decimal128' of null` will be thrown. In
 * this case, use the function `mockAwaitDevices`. It usually happens due to
 * await.
 *
 * @memberOf test/common/utils.common
 *
 * @param {Object} data - The model parameters to be setted for the device.
 * @param {String} func - The function to be intercepted.
 *
 * @see {@linkcode utils.common.mockAwaitDevices} in case of this error.
 */
utils.common.mockDevices = function(data, func) {
  utils.common.mockMongo(DeviceModel, data, func);
};


/**
 * Mock a config when the usual `mockDevices` does not work. This is related to
 * the use of await when trying to get the device. Usually the error
 * `TypeError: Cannot read property 'Decimal128' of null` will be thrown.
 *
 * @memberOf test/common/utils.common
 *
 * @param {Object} data - The model parameters to be setted for the device.
 * @param {Function} func  - The function to be intercepted.
 * @param {Boolean} shouldError - If the catch callback should be called or not.
 *
 * @see {@linkcode utils.common.mockDevices} for default mocking.
 */
utils.common.mockAwaitDevices = function(data, func, shouldError = false) {
  utils.common.mockAwaitMongo(DeviceModel, data, func, shouldError);
};


/**
 * Mock a firmware.
 *
 * @memberOf test/common/utils.common
 *
 * @param {Object} data - The model parameters to be setted for the firmware.
 * @param {String} func - The function to be intercepted.
 */
utils.common.mockFirmwares = function(data, func) {
  utils.common.mockMongo(FirmwareModel, data, func);
};


/**
 * Mock a config.
 * There is a case that this function will not work and the error
 * `TypeError: Cannot read property 'Decimal128' of null` will be thrown. In
 * this case, use the function `mockAwaitConfigs`. It usually happens due to
 * await.
 *
 * @memberOf test/common/utils.common
 *
 * @param {Object} data - The model parameters to be setted for the config.
 * @param {String} func - The function to be intercepted.
 *
 * @see {@linkcode utils.common.mockAwaitConfigs} in case of this error.
 */
utils.common.mockConfigs = function(data, func) {
  utils.common.mockMongo(ConfigModel, data, func);
};


/**
 * Mock a config when the usual `mockConfigs` does not work. This is related to
 * the use of await when trying to get the config. Usually the error
 * `TypeError: Cannot read property 'Decimal128' of null` will be thrown.
 *
 * @memberOf test/common/utils.common
 *
 * @param {Object} data - The model parameters to be setted for the config.
 * @param {Function} func  - The function to be intercepted.
 * @param {Boolean} shouldError - If the catch callback should be called or not.
 *
 * @see {@linkcode utils.common.mockConfigs} for default mocking.
 */
utils.common.mockAwaitConfigs = function(data, func, shouldError = false) {
  utils.common.mockAwaitMongo(ConfigModel, data, func, shouldError);
};


/**
 * Mock a User.
 *
 * @memberOf test/common/utils.common
 *
 * @param {Object} data - The model parameters to be setted for the user.
 * @param {String} func - The function to be intercepted.
 */
utils.common.mockUsers = function(data, func) {
  utils.common.mockMongo(UserModel, data, func);
};

/**
 * Mock a Role.
 *
 * @memberOf test/common/utils.common
 *
 * @param {Object} data - The model parameters to be setted for the role.
 * @param {String} func - The function to be intercepted.
 */
utils.common.mockRoles = function(data, func) {
  utils.common.mockMongo(RoleModel, data, func);
};

/**
 * Mock devices in `defaultMockDevices`. There is a case that this function will
 * not work and the error
 * `TypeError: Cannot read property 'Decimal128' of null` will be thrown. In
 * this case, use the function `mockDefaultAwaitDevices`. It usually happens
 * due to await.
 *
 * @memberOf test/common/utils.common
 *
 * @see {@linkcode utils.common.mockDefaultAwaitDevices} in case of this error.
 */
utils.common.mockDefaultDevices = function() {
  utils.common.mockDevices(models.defaultMockDevices, 'find');
  utils.common.mockDevices(models.defaultMockDevices[0], 'findOne');
  utils.common.mockDevices(models.defaultMockDevices[0], 'findById');
};


/**
 * Mock devices in `defaultMockDevices` when the usual `mockDefaultDevices`
 * does not work. This is related to the use of await when trying to get
 * the device. Usually the error
 * `TypeError: Cannot read property 'Decimal128' of null` will be thrown.
 *
 * @memberOf test/common/utils.common
 *
 * @see {@linkcode utils.common.mockDefaultDevices} for default mocking.
 */
utils.common.mockDefaultAwaitDevices = function() {
  utils.common.mockAwaitDevices(models.defaultMockDevices, 'find');
  utils.common.mockAwaitDevices(models.defaultMockDevices[0], 'findOne');
  utils.common.mockAwaitDevices(models.defaultMockDevices[0], 'findById');
};


/**
 * Mock firmwares in `defaultMockFirmwares`.
 *
 * @memberOf test/common/utils.common
 */
utils.common.mockDefaultFirmwares = function() {
  utils.common.mockFirmwares(models.defaultMockFirmwares, 'find');
  utils.common.mockFirmwares(models.defaultMockFirmwares[0], 'findOne');
  utils.common.mockFirmwares(models.defaultMockFirmwares[0], 'findById');
};


/**
 * Mock configs in `defaultMockConfigs`. There is a case that this function will
 * not work and the error
 * `TypeError: Cannot read property 'Decimal128' of null` will be thrown. In
 * this case, use the function `mockDefaultAwaitConfigs`. It usually happens
 * due to await.
 *
 * @memberOf test/common/utils.common
 *
 * @see {@linkcode utils.common.mockDefaultAwaitConfigs} in case of this error.
 */
utils.common.mockDefaultConfigs = function() {
  utils.common.mockConfigs(models.defaultMockConfigs, 'find');
  utils.common.mockConfigs(models.defaultMockConfigs[0], 'findOne');
  utils.common.mockConfigs(models.defaultMockConfigs[0], 'findById');
};


/**
 * Mock configs in `defaultMockConfigs` when the usual `mockDefaultConfigs`
 * does not work. This is related to the use of await when trying to get
 * the config. Usually the error
 * `TypeError: Cannot read property 'Decimal128' of null` will be thrown.
 *
 * @memberOf test/common/utils.common
 *
 * @see {@linkcode utils.common.mockDefaultConfigs} for default mocking.
 */
utils.common.mockDefaultAwaitConfigs = function() {
  utils.common.mockAwaitConfigs(models.defaultMockConfigs, 'find');
  utils.common.mockAwaitConfigs(models.defaultMockConfigs[0], 'findOne');
  utils.common.mockAwaitConfigs(models.defaultMockConfigs[0], 'findById');
};


/**
 * Mock roles in `defaultMockRoles`
 *
 * @memberOf test/common/utils.common
 */
utils.common.mockDefaultRoles = function() {
  utils.common.mockRoles(models.defaultMockRoles, 'find');
  utils.common.mockRoles(models.defaultMockRoles[0], 'findOne');
  utils.common.mockRoles(models.defaultMockRoles[0], 'findById');
};

// Mock the config (used in language.js)
utils.common.mockConfigs(models.defaultMockConfigs[0], 'findOne');
utils.common.mockConfigs(models.defaultMockConfigs[0], 'updateOne');

/**
 * Mock users in `defaultMockUsers`.
 *
 * @memberOf test/common/utils.common
 */
utils.common.mockDefaultUsers = function() {
  utils.common.mockUsers(models.defaultMockUsers, 'find');
  utils.common.mockUsers(models.defaultMockUsers[0], 'findOne');
  utils.common.mockUsers(models.defaultMockUsers[0], 'findById');
};

/**
 * Get all device models based on the query passed.
 *
 * @memberOf test/common/utils.common
 *
 * @async
 *
 * @param {Query} query - The query to find the devices.
 *
 * @return {Array} All device models matched by query.
 */
utils.common.getDevices = async function(query) {
  const matchedDevices = DeviceModel
    .find(query)
    .lean()
    .catch((error) => console.log(error));

  return matchedDevices;
};


/** ************ Update Scheduler ************ **/


/**
 * Send a request get scheduler releases and return the request.
 *
 * @memberOf test/common/utils.schedulerCommon
 *
 * @async
 *
 * @param {Object} cookie - The cookie login.
 * @param {Object} data - The data to be sent.
 *
 * @return {Object} The request sent to get the releases.
 */
utils.schedulerCommon.getReleases = async function(cookie, data) {
  return (request('localhost:8000')
    .put('/devicelist/scheduler/releases')
    .set('Cookie', cookie)
    .send(data)
    .catch((error) => console.log(error))
  );
};


/**
 * Create a basic fake response.
 *
 * @memberof test/common/utils
 *
 * @param {Integer} errorCode - The error code of the response.
 * @param {Promise} promiseResolve - The resolver of the promise to be called.
 * when finished.
 * @param {Object} header - The header of the response.
 * @param {Object} data - The body of the response.
 *
 * @return {Object} An object containing the statusCode and the data (response).
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


/**
 * Create a fake response status.
 *
 * @memberof test/common/utils
 *
 * @param {Integer} errorCode - The error code of the response.
 * @param {PromiseResolver} promiseResolve - The resolver of the promise to be
 * called when finished.
 * @param {Object} header - The header to be sent in the response.
 *
 * @return {Object} An object containing the statusCode and a json function that
 * can generate a basic fake response.
 */
const fakeStatus = function(errorCode, promiseResolve, header) {
  return {
    statusCode: errorCode,
    json: (data) => fakeJson(errorCode, promiseResolve, header, data),
    send: (data) => fakeJson(errorCode, promiseResolve, header, data),
  };
};


/**
 * Call the function passed, faking a request. This is not a real http request
 * but pretends to be.
 *
 * @memberOf test/common/utils.common
 *
 * @async
 *
 * @param {Function} func - The function to be called.
 * @param {Object} data - The data to be sent.
 * @param {Object} files - All files to be sent.
 * @param {Object} query - URL parameters to be passed.
 * @param {Object} user - An object containing user and role information.
 * @param {Object} params - The object containing params of the request.
 * @param {Object} sessionID - The session ID of the request.
 *
 * @return {Promise} A promise to wait for the response.
 *
 * @example <caption>Example usage of sendFakeRequest.</caption>
 * let result = await utils.common.sendFakeRequest(
 *  acsDeviceInfoController.informDevice,
 *  {acs_id: '1234'},
 * );
 */
utils.common.sendFakeRequest = async function(
  func, data, files, query, user, params, sessionID,
) {
  let promiseResolve;

  // Create a promise and store the resolve
  let promise = new Promise((resolve) => {
    promiseResolve = resolve;
  });

  // Call the function
  func(
    {
      body: data,
      // Use the user passed or a default
      user: (user) ? user : {
        role: undefined,
        is_superuser: true,
      },
      files: files,
      query: query,
      params: params,
      sessionID: sessionID,
    },

    // Pass the promise resolve
    {
      header: {},
      status: (errorCode) => fakeStatus(
        errorCode, promiseResolve, this.header,
      ),
      set: function(headerName, value) {
        this.header[headerName] = value;
      },
      json: (data) => fakeJson(200, promiseResolve, {}, data),
      render: (view, data) => fakeJson(200, promiseResolve, {}, data),
    },
  );

  return promise;
};


/**
 * Call the function `getDevicesReleases` faking a request.
 *
 * @memberOf test/common/utils.schedulerCommon
 *
 * @async
 *
 * @param {Object} data - The data to be sent.
 *
 * @return {Promise} A promise to get the releases.
 */
utils.schedulerCommon.getReleasesFake = async function(data) {
  let promise = utils.common.sendFakeRequest(
    updateScheduler.getDevicesReleases,
    data,
  );

  return promise;
};


/**
 * Call the function startSchedule faking a request.
 *
 * @memberOf test/common/utils.schedulerCommon
 *
 * @async
 *
 * @param {Object} data - The data to be sent.
 *
 * @return {Promise} A promise to start the scheduler.
 */
utils.schedulerCommon.startSchedulerFake = async function(data) {
  let promise = utils.common.sendFakeRequest(
    updateScheduler.startSchedule,
    data,
  );

  return promise;
};


/**
 * Call the function `abortSchedule` faking a request.
 *
 * @memberOf test/common/utils.schedulerCommon
 *
 * @async
 *
 * @return {Promise} A promise to abort the scheduler.
 */
utils.schedulerCommon.abortSchedulerFake = async function() {
  let promise = utils.common.sendFakeRequest(
    updateScheduler.abortSchedule,
    {},
  );

  return promise;
};


/**
 * Call the function `scheduleResult` faking a request.
 *
 * @memberOf test/common/utils.schedulerCommon
 *
 * @async
 *
 * @return {Promise} A promise to get the result of the scheduler.
 */
utils.schedulerCommon.schedulerResultFake = async function() {
  let promise = utils.common.sendFakeRequest(
    updateScheduler.scheduleResult,
    {},
  );

  return promise;
};


/**
 * Send a real request to start the scheduler and return the request.
 *
 * @memberOf test/common/utils.schedulerCommon
 *
 * @async
 *
 * @param {Object} cookie - The cookie login.
 * @param {Object} data - The data to be sent.
 *
 * @return {Object} The request sent to start the scheduler.
 */
utils.schedulerCommon.sendStartSchedule = async function(cookie, data) {
  return (request('localhost:8000')
    .post('/devicelist/scheduler/start')
    .set('Cookie', cookie)
    .send(data)
    .catch((error) => console.log(error))
  );
};

/** ************ Devices API ************ **/

utils.devicesAPICommon.validateUpgradeableModels = function(data) {
  Object.keys(DevicesAPI.__testTR069Models).forEach((modelName) => {
    let device = DevicesAPI.__testTR069Models[modelName];
    let permission = device.modelPermissions();

    let vendor = device.identifier.vendor;
    let model = device.identifier.model;
    let fullID = vendor + ' ' + model;

    if (!permission.features.firmwareUpgrade) {
      expect(data.vendors[vendor])
        .not.toContain(model);

      return;
    }

    expect(data.vendors[vendor])
      .toContain(model);

    let allFirmwares = Object.keys(
      permission.firmwareUpgrades,
    );

    allFirmwares.forEach((firmware) => {
      expect(data.versions[fullID])
        .toContain(firmware);
    });
  });
};


/**
 * Mocks the function `instantiateCPEByModelFromDevice` and the return a `jest`
 * spy.
 *
 * @memberOf test/common/utils.devicesAPICommon
 *
 * @param {Boolean} success - If should return success.
 * @param {Object} permissions - The permissions object to be returned.
 * @param {Object} fields - The fields object to be returned.
 *
 * @return {Spy} The `jest` spy of the function.
 */
utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice = function(
  success, permissions, fields,
) {
  return jest.spyOn(
    DevicesAPI,
    'instantiateCPEByModelFromDevice',
  ).mockImplementation(() => {
    return {
      success: success,
      cpe: {
        // Permissions
        modelPermissions: () => {
          return permissions;
        },

        // Fields
        getModelFields: () => {
          return fields;
        },

        // PPPoE Enable
        convertPPPoEEnable: (enable) => {
          return enable === 'true' || enable === 1 || enable === true;
        },

        // Get Serial
        convertGenieSerial: (serial, mac) => {
          return serial;
        },

        // Convert Band
        convertWifiBandToFlashman: (band, isAC) => {
          return band;
        },

        // Check Login
        isAllowedWebadminUsername: (login) => {
          return true;
        },

        // Convert WAN Rate
        convertWanRate: (rate) => {
          return rate;
        },
      },
    };
  });
};


/**
 * @exports test/common/utils
 */
module.exports = utils;
