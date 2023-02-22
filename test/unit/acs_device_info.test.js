require('../../bin/globals');

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const acsDeviceInfoController = require('../../controllers/acs_device_info');
const devicesAPI = require('../../controllers/external-genieacs/devices-api');
const tasksAPI = require('../../controllers/external-genieacs/tasks-api');
const deviceHandlers = require('../../controllers/handlers/devices');
const acsMeshDeviceHandler = require('../../controllers/handlers/acs/mesh.js');

const utils = require('../common/utils');
const models = require('../common/models');
const t = require('../../controllers/language').i18next.t;

// controllers/acs_device_info
describe('ACS Device Info Tests', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // updateInfo - mustExecute = true & executed
  test('Validate updateInfo - mustExecute = true & executed', async () => {
    let device = models.defaultMockDevices[0];
    let changes = {wifi2: {ssid: '12345678'}};
    let deviceFields = devicesAPI.instantiateCPEByModelFromDevice(device)
      .cpe.getModelFields();

    // Mocks
    utils.common.mockDefaultConfigs();
    let addTaskSpy = jest.spyOn(tasksAPI, 'addTask')
      .mockImplementation(() => {
        return {success: true, executed: true, message: 'task success'};
      });
    jest.spyOn(deviceHandlers, 'checkSsidPrefix')
      .mockImplementation(() => {
        return {prefixToUse: ''};
      });

    // Execute
    let result = await acsDeviceInfoController.updateInfo(
      device, changes,
      true, true,
    );

    // Validate
    expect(addTaskSpy).toBeCalledWith(
      device.acs_id,
      {
        'name': 'setParameterValues',
        'parameterValues': [
          [
            deviceFields['wifi2']['ssid'],
            changes.wifi2.ssid,
            'xsd:string',
          ],
          [
            deviceFields['wifi2']['password'],
            device.wifi_password,
            'xsd:string',
          ],
        ],
      },
    );
    expect(result).toBe(true);
  });


  // updateInfo - mustExecute = true & not executed
  test('Validate updateInfo - mustExecute = true & not executed', async () => {
    let device = models.defaultMockDevices[0];
    let changes = {wifi2: {ssid: '12345678'}};
    let deviceFields = devicesAPI.instantiateCPEByModelFromDevice(device)
      .cpe.getModelFields();

    // Mocks
    utils.common.mockDefaultConfigs();
    let addTaskSpy = jest.spyOn(tasksAPI, 'addTask')
      .mockImplementation(() => {
        return {success: true, executed: false, message: 'task success'};
      });
    jest.spyOn(deviceHandlers, 'checkSsidPrefix')
      .mockImplementation(() => {
        return {prefixToUse: ''};
      });

    // Execute
    let result = await acsDeviceInfoController.updateInfo(
      device, changes,
      true, true,
    );

    // Validate
    expect(addTaskSpy).toBeCalledWith(
      device.acs_id,
      {
        'name': 'setParameterValues',
        'parameterValues': [
          [
            deviceFields['wifi2']['ssid'],
            changes.wifi2.ssid,
            'xsd:string',
          ],
          [
            deviceFields['wifi2']['password'],
            device.wifi_password,
            'xsd:string',
          ],
        ],
      },
    );
    expect(result).toBe(undefined);
  });


  // updateInfo - mustExecute = false & executed
  test('Validate updateInfo - mustExecute = false & executed', async () => {
    let device = models.defaultMockDevices[0];
    let changes = {wifi2: {ssid: '12345678'}};
    let deviceFields = devicesAPI.instantiateCPEByModelFromDevice(device)
      .cpe.getModelFields();

    // Mocks
    utils.common.mockDefaultConfigs();
    let addTaskSpy = jest.spyOn(tasksAPI, 'addTask')
      .mockImplementation(() => {
        return {success: true, executed: true, message: 'task success'};
      });
    jest.spyOn(deviceHandlers, 'checkSsidPrefix')
      .mockImplementation(() => {
        return {prefixToUse: ''};
      });

    // Execute
    let result = await acsDeviceInfoController.updateInfo(
      device, changes,
      true, false,
    );

    // Validate
    expect(addTaskSpy).toBeCalledWith(
      device.acs_id,
      {
        'name': 'setParameterValues',
        'parameterValues': [
          [
            deviceFields['wifi2']['ssid'],
            changes.wifi2.ssid,
            'xsd:string',
          ],
          [
            deviceFields['wifi2']['password'],
            device.wifi_password,
            'xsd:string',
          ],
        ],
      },
    );
    expect(result).toBe(true);
  });

  // updateInfo - mustExecute = true & not executed
  test('Validate updateInfo - mustExecute = false & not executed', async () => {
    let device = models.defaultMockDevices[0];
    let changes = {wifi2: {ssid: '12345678'}};
    let deviceFields = devicesAPI.instantiateCPEByModelFromDevice(device)
      .cpe.getModelFields();

    // Mocks
    utils.common.mockDefaultConfigs();
    let addTaskSpy = jest.spyOn(tasksAPI, 'addTask')
      .mockImplementation(() => {
        return {success: true, executed: false, message: 'task success'};
      });
    jest.spyOn(deviceHandlers, 'checkSsidPrefix')
      .mockImplementation(() => {
        return {prefixToUse: ''};
      });

    // Execute
    let result = await acsDeviceInfoController.updateInfo(
      device, changes,
      true, false,
    );

    // Validate
    expect(addTaskSpy).toBeCalledWith(
      device.acs_id,
      {
        'name': 'setParameterValues',
        'parameterValues': [
          [
            deviceFields['wifi2']['ssid'],
            changes.wifi2.ssid,
            'xsd:string',
          ],
          [
            deviceFields['wifi2']['password'],
            device.wifi_password,
            'xsd:string',
          ],
        ],
      },
    );
    expect(result).toBe(true);
  });

  // configTR069VirtualAP - to mode disabled
  test('Validate configTR069VirtualAP - to mode disabled', async () => {
    let device = models.defaultMockDevices[0];

    // Mocks
    jest.spyOn(acsMeshDeviceHandler, 'createVirtualAPObjects')
      .mockImplementation(() => Promise.resolve(true));
    let updateSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
      .mockImplementation(() => Promise.resolve(true));

    // Execute
    await acsDeviceInfoController.configTR069VirtualAP(device, 0);

    // Validate
    expect(updateSpy).toBeCalledWith(
      device, expect.anything(), true, false,
    );
  });

  // configTR069VirtualAP - to mode cable
  test('Validate configTR069VirtualAP - to mode cable', async () => {
    let device = models.defaultMockDevices[0];

    // Mocks
    jest.spyOn(acsMeshDeviceHandler, 'createVirtualAPObjects')
      .mockImplementation(() => Promise.resolve(true));
    let updateSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
      .mockImplementation(() => Promise.resolve(true));

    // Execute
    await acsDeviceInfoController.configTR069VirtualAP(device, 1);

    // Validate
    expect(updateSpy).toBeCalledWith(
      device, expect.anything(), true, false,
    );
  });

  // configTR069VirtualAP - to mode wifi2
  test('Validate configTR069VirtualAP - to mode wifi2', async () => {
    let device = models.defaultMockDevices[0];

    // Mocks
    jest.spyOn(acsMeshDeviceHandler, 'createVirtualAPObjects')
      .mockImplementation(() => Promise.resolve(true));
    let updateSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
      .mockImplementation(() => Promise.resolve(true));

    // Execute
    await acsDeviceInfoController.configTR069VirtualAP(device, 2);

    // Validate
    expect(updateSpy).toBeCalledWith(
      device, expect.anything(), true, true,
    );
  });

  // configTR069VirtualAP - to mode wifi5
  test('Validate configTR069VirtualAP - to mode wifi5', async () => {
    let device = models.defaultMockDevices[0];

    // Mocks
    jest.spyOn(acsMeshDeviceHandler, 'createVirtualAPObjects')
      .mockImplementation(() => Promise.resolve(true));
    let updateSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
      .mockImplementation(() => Promise.resolve(true));

    // Execute
    await acsDeviceInfoController.configTR069VirtualAP(device, 3);

    // Validate
    expect(updateSpy).toBeCalledWith(
      device, expect.anything(), true, true,
    );
  });

  // configTR069VirtualAP - to mode wifi2/5
  test('Validate configTR069VirtualAP - to mode wifi2/5', async () => {
    let device = models.defaultMockDevices[0];


    // Mocks
    jest.spyOn(acsMeshDeviceHandler, 'createVirtualAPObjects')
      .mockImplementation(() => Promise.resolve(true));
    let updateSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
      .mockImplementation(() => Promise.resolve(true));


    // Execute
    await acsDeviceInfoController.configTR069VirtualAP(device, 4);


    // Validate
    expect(updateSpy).toBeCalledWith(
      device, expect.anything(), true, true,
    );
  });

  // configTR069VirtualAP - to unknown mode
  test('Validate configTR069VirtualAP - to unknown mode', async () => {
    let device = models.defaultMockDevices[0];

    // Mocks
    jest.spyOn(acsMeshDeviceHandler, 'createVirtualAPObjects')
      .mockImplementation(() => Promise.resolve(true));
    let updateSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
      .mockImplementation(() => Promise.resolve(true));

    // Execute
    await acsDeviceInfoController.configTR069VirtualAP(device, 9999);

    // Validate
    expect(updateSpy).toBeCalledWith(
      device,
      {
        'mesh2': {},
        'mesh5': {},
        'wifi2': {},
        'wifi5': {},
      },
      true,
      true,
    );
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
