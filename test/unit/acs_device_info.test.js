require('../../bin/globals');

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const acsDeviceInfoController = require('../../controllers/acs_device_info');
const tasksAPI = require('../../controllers/external-genieacs/tasks-api');

const t = require('../../controllers/language').i18next.t;


// controllers/acs_device_info
describe('ACS Device Info Tests', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // delayExecutionGenie - repeatTimes = 0
  test('Validate delayExecutionGenie - repeatTimes = 0', async () => {
    // Create a function to be passed and resolves instantly
    let asyncFunc = jest.fn(() => new Promise((resolve) => resolve()));
    let acsId = '12345';


    // Mocks
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    let genieSpy = jest.spyOn(tasksAPI, 'getFromCollection')
      .mockImplementation(() => [{_id: acsId}]);


    // Execute
    let result = await acsDeviceInfoController.__testDelayExecutionGenie(
      {acs_id: acsId},
      asyncFunc,
      0,
      1000,
    );
    jest.runAllTimers();


    // Validate
    expect(asyncFunc).not.toBeCalled();
    expect(setTimeout).not.toBeCalled();
    expect(genieSpy).not.toBeCalled();
    expect(result.success).toBe(false);
    expect(result.executed).toBe(false);
    expect(result.message).toContain(
      t('parametersError').replace('({{errorline}})', ''),
    );
  });


  // delayExecutionGenie - repeatTimes = -1
  test('Validate delayExecutionGenie - repeatTimes = -1', async () => {
    // Create a function to be passed and resolves instantly
    let asyncFunc = jest.fn(() => new Promise((resolve) => resolve()));
    let acsId = '12345';


    // Mocks
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    let genieSpy = jest.spyOn(tasksAPI, 'getFromCollection')
      .mockImplementation(() => [{_id: acsId}]);


    // Execute
    let result = await acsDeviceInfoController.__testDelayExecutionGenie(
      {acs_id: acsId},
      asyncFunc,
      -1,
      1000,
    );
    jest.runAllTimers();


    // Validate
    expect(asyncFunc).not.toBeCalled();
    expect(setTimeout).not.toBeCalled();
    expect(genieSpy).not.toBeCalled();
    expect(result.success).toBe(false);
    expect(result.executed).toBe(false);
    expect(result.message).toContain(
      t('parametersError').replace('({{errorline}})', ''),
    );
  });


  // delayExecutionGenie - delayTime = 5000
  test('Validate delayExecutionGenie - delayTime = 5000', async () => {
    // Create a function to be passed
    let asyncFunc = jest.fn(() => new Promise((resolve) => resolve()));
    let acsId = '12345';


    // Mocks
    jest.useFakeTimers();
    let timeSpy = jest.spyOn(global, 'setTimeout')
      .mockImplementation(async (func) => await func());
    let genieSpy = jest.spyOn(tasksAPI, 'getFromCollection')
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => [])
      .mockImplementation(() => [{_id: acsId}]);


    // Execute
    let result = await acsDeviceInfoController.__testDelayExecutionGenie(
      {acs_id: acsId},
      asyncFunc,
      5,
      5000,
    );


    // Validate
    expect(timeSpy).toHaveBeenCalledTimes(3);
    expect(timeSpy.mock.calls[0][1]).toEqual(5000);
    expect(timeSpy.mock.calls[1][1]).toEqual(10000);
    expect(timeSpy.mock.calls[2][1]).toEqual(20000);
    expect(genieSpy).toHaveBeenCalledTimes(3);
    expect(asyncFunc).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.executed).toBe(true);
    expect(result.message).toContain(t('Ok'));
  });


  // delayExecutionGenie - repeatTimes = 5
  test('Validate delayExecutionGenie - repeatTimes = 5', async () => {
    // Create a function to be passed
    let asyncFunc = jest.fn(() => new Promise((resolve) => resolve()));
    let acsId = '12345';


    // Mocks
    jest.useFakeTimers();
    let timeSpy = jest.spyOn(global, 'setTimeout')
      .mockImplementation(async (func) => await func());
    let genieSpy = jest.spyOn(tasksAPI, 'getFromCollection')
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => [])
      .mockImplementation(() => [{_id: acsId}]);


    // Execute
    let result = await acsDeviceInfoController.__testDelayExecutionGenie(
      {acs_id: acsId},
      asyncFunc,
      5,
      1000,
    );


    // Validate
    expect(timeSpy).toHaveBeenCalledTimes(3);
    expect(timeSpy.mock.calls[0][1]).toEqual(1000);
    expect(timeSpy.mock.calls[1][1]).toEqual(2000);
    expect(timeSpy.mock.calls[2][1]).toEqual(4000);
    expect(genieSpy).toHaveBeenCalledTimes(3);
    expect(asyncFunc).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.executed).toBe(true);
    expect(result.message).toContain(t('Ok'));
  });


  // delayExecutionGenie - delayTime = 0
  test('Validate delayExecutionGenie - delayTime = 0', async () => {
    // Create a function to be passed
    let asyncFunc = jest.fn(() => new Promise((resolve) => resolve()));
    let acsId = '12345';


    // Mocks
    jest.useFakeTimers();
    let timeSpy = jest.spyOn(global, 'setTimeout')
      .mockImplementation(async (func) => await func());
    let genieSpy = jest.spyOn(tasksAPI, 'getFromCollection')
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => [])
      .mockImplementation(() => [{_id: acsId}]);


    // Execute
    let result = await acsDeviceInfoController.__testDelayExecutionGenie(
      {acs_id: acsId},
      asyncFunc,
      5,
      0,
    );


    // Validate
    expect(timeSpy).toHaveBeenCalledTimes(0);
    expect(genieSpy).toHaveBeenCalledTimes(0);
    expect(asyncFunc).toHaveBeenCalledTimes(0);
    expect(result.success).toBe(false);
    expect(result.executed).toBe(false);
    expect(result.message).toContain(
      t('parametersError').replace('({{errorline}})', ''),
    );
  });


  // delayExecutionGenie - delayTime = -1
  test('Validate delayExecutionGenie - delayTime = -1', async () => {
    // Create a function to be passed
    let asyncFunc = jest.fn(() => new Promise((resolve) => resolve()));
    let acsId = '12345';


    // Mocks
    jest.useFakeTimers();
    let timeSpy = jest.spyOn(global, 'setTimeout')
      .mockImplementation(async (func) => await func());
    let genieSpy = jest.spyOn(tasksAPI, 'getFromCollection')
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => [])
      .mockImplementation(() => [{_id: acsId}]);


    // Execute
    let result = await acsDeviceInfoController.__testDelayExecutionGenie(
      {acs_id: acsId},
      asyncFunc,
      5,
      -1,
    );


    // Validate
    expect(timeSpy).toHaveBeenCalledTimes(0);
    expect(genieSpy).toHaveBeenCalledTimes(0);
    expect(asyncFunc).toHaveBeenCalledTimes(0);
    expect(result.success).toBe(false);
    expect(result.executed).toBe(false);
    expect(result.message).toContain(
      t('parametersError').replace('({{errorline}})', ''),
    );
  });


  // delayExecutionGenie - no device
  test('Validate delayExecutionGenie - no device', async () => {
    // Create a function to be passed
    let asyncFunc = jest.fn(() => new Promise((resolve) => resolve()));
    let acsId = '12345';


    // Mocks
    jest.useFakeTimers();
    let timeSpy = jest.spyOn(global, 'setTimeout')
      .mockImplementation(async (func) => await func());
    let genieSpy = jest.spyOn(tasksAPI, 'getFromCollection')
      .mockImplementation(() => []);


    // Execute
    let result = await acsDeviceInfoController.__testDelayExecutionGenie(
      {acs_id: acsId},
      asyncFunc,
      5,
      1000,
    );


    // Validate
    expect(timeSpy).toHaveBeenCalledTimes(5);
    expect(timeSpy.mock.calls[0][1]).toEqual(1000);
    expect(timeSpy.mock.calls[1][1]).toEqual(2000);
    expect(timeSpy.mock.calls[2][1]).toEqual(4000);
    expect(genieSpy).toHaveBeenCalledTimes(5);
    expect(asyncFunc).toHaveBeenCalledTimes(0);
    expect(result.success).toBe(true);
    expect(result.executed).toBe(false);
    expect(result.message).toContain(t('noDevicesFound'));
  });
});
