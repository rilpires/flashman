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
});
