require('../../bin/globals');

const utils = require('../common/utils');
const models = require('../common/models');

const devicesAPI = require('../../controllers/external-genieacs/devices-api');


// controllers/external-genieacs/devices-api
describe('Devices API Tests', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });


  // getDeviceFields - undefined args
  test('Validate getDeviceFields - undefined args', async () => {
    // Execute
    let teste = await devicesAPI.getDeviceFields(undefined, undefined);


    // Validate
    expect(teste.success).toBe(false);
    expect(teste.message).toBe('Incomplete arguments');
  });


  // getDeviceFields - args missing fields
  test('Validate getDeviceFields - args missing fields', async () => {
    let callbackFunction = jest.fn((arg1, arg2) => {
      return arg2;
    });


    // Execute
    let teste = await devicesAPI.getDeviceFields(
      ['{}'],
      callbackFunction,
    );


    // Validate
    expect(teste.success).toBe(false);
    expect(teste.message).toBe('Incomplete arguments');
    expect(callbackFunction).toBeCalled();
  });
});
