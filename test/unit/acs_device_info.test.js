require('../../bin/globals');

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const utils = require('../common/utils');
const models = require('../common/models');

// Mock the config (used in language.js)
utils.common.mockConfigs(models.defaultMockConfigs, 'findOne');

const acsDeviceInfoController = require('../../controllers/acs_device_info');
const devicesAPI = require('../../controllers/external-genieacs/devices-api');
const deviceVersion = require('../../models/device_version');
const tasksAPI = require('../../controllers/external-genieacs/tasks-api');
const deviceHandlers = require('../../controllers/handlers/devices');
const acsMeshDeviceHandler = require('../../controllers/handlers/acs/mesh.js');

const t = require('../../controllers/language').i18next.t;

// Mock the mqtts (avoid aedes)
jest.mock('../../mqtts', () => {
  return {
    __esModule: false,
    unifiedClientsMap: {},
    anlixMessageRouterUpdate: () => undefined,
    getConnectedClients: () => [],
  };
});

// controllers/acs_device_info
describe('ACS Device Info Tests', () => {
  beforeEach(() => {
    // jest.resetModules();
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

  // Validate createRegistry - Receives invalid value for field wan_mac_ppp - Is
  // expected the field to be rejected as an invalid MAC address and not
  // included in device creation
  test(
    'Validate createRegistry - Receives invalid value for field wan_mac_ppp',
    async () => {
      const id = models.defaultMockDevices[0]._id;
      const device = models.copyDeviceFrom(
        id,
        {
          _id: '94:46:96:8c:23:61',
          acs_id: '944696-WiFi%20AC1200%20Router-9446968c2362',
          model: 'RE1200R4GC-2T2R-V3', // Multilaser RE708
          version: 'RE1200R4GC-2T2R-V3_v3411b_MUL015B',
          hw_version: '81xx',
        },
      );
      let splitID = device.acs_id.split('-');
      let model = splitID.slice(1, splitID.length-1).join('-');

      const cpe = devicesAPI.instantiateCPEByModel(
        model, device.model, device.version, device.hw_version,
      ).cpe;

      let permissions = deviceVersion.devicePermissions(device);

      let app = {
        locals: {
          secret: '123',
        },
      };

      // The body receives an invalid value for the wan_mac_ppp field
      let body = {
        acs_id: '944696-WiFi%20AC1200%20Router-9446968c2362',
        data: {
          common: {
            mac: { value: '94:46:96:8c:23:61', writable: 0 },
            model: { value: 'RE1200R4GC-2T2R-V3', writable: 0 },
            version: { value: 'RE1200R4GC-2T2R-V3_v3411b_MUL015B', writable: 0 },
            hw_version: { value: '81xx', writable: 0 },
            uptime: { value: 1028, writable: 0 },
            ip: { value: 'http://192.168.89.58:7547/tr069', writable: 0 },
            acs_url: { value: 'http://192.168.88.47:57547', writable: 1 },
            interval: { value: 113, writable: 1 }
          },
          wan: {
            pppoe_enable: { value: true, writable: 1 },
            pppoe_user: { value: 'user', writable: 1 },
            pppoe_pass: { value: '', writable: 1 },
            rate: { value: '100', writable: 1 },
            duplex: { value: 'Full', writable: 1 },
            wan_ip_ppp: { value: '192.168.89.58', writable: 0 },
            wan_mac_ppp: { value: '000000000000\n', writable: 0 },
            uptime_ppp: { value: 1005, writable: 0 },
            mtu_ppp: { value: 1452, writable: 1 },
            recv_bytes: { value: 695251, writable: 0 },
            sent_bytes: { value: 642883, writable: 0 },
            port_mapping_entries_ppp: { value: 0, writable: 0 }
          },
          lan: {
            config_enable: { value: false, writable: 1 },
            router_ip: { value: '10.0.0.2', writable: 1 },
            subnet_mask: { value: '255.255.255.0', writable: 1 },
            lease_min_ip: { value: '10.0.0.100', writable: 1 },
            lease_max_ip: { value: '10.0.0.200', writable: 1 },
            ip_routers: { value: '0.0.0.0', writable: 1 },
            dns_servers: { value: '', writable: 1 }
          },
          wifi2: {
            ssid: { value: 'Anlix-Multilaser-RE708', writable: 1 },
            bssid: { value: '94:46:96:8c:23:64', writable: 0 },
            password: { value: '', writable: 1 },
            channel: { value: 6, writable: 1 },
            auto: { value: false, writable: 1 },
            mode: { value: 'b,g,n', writable: 0 },
            enable: { value: true, writable: 1 },
            beacon_type: { value: '11i', writable: 1 }
          },
          wifi5: {
            ssid: { value: 'Anlix-Multilaser-RE708-5G', writable: 1 },
            bssid: { value: '94:46:96:8c:23:63', writable: 0 },
            password: { value: '', writable: 1 },
            channel: { value: 40, writable: 1 },
            auto: { value: false, writable: 1 },
            mode: { value: 'a,n,ac', writable: 0 },
            enable: { value: true, writable: 1 },
            beacon_type: { value: '11i', writable: 1 }
          },
          mesh2: {
            ssid: { value: 'Anlix-Multilaser-RE708', writable: 1 },
            bssid: { value: '94:46:96:8c:23:64', writable: 0 },
            password: { value: '', writable: 1 },
            channel: { value: 6, writable: 1 },
            auto: { value: false, writable: 1 },
            mode: { value: 'b,g,n', writable: 0 },
            enable: { value: true, writable: 1 },
            advertise: { value: true, writable: 1 },
            encryption: { value: 'TKIPandAESEncryption ', writable: 1 },
            beacon_type: { value: '11i', writable: 1 }
          },
          mesh5: {},
        },
      };

      // Mocks
      const mockRequest = () => {return {app: app, body: body}};
      let req = mockRequest();

      // Spies
      let reportOnuDevicesSpy =
        jest.spyOn(acsDeviceInfoController, 'reportOnuDevices');

      // Execute
      let ret = await acsDeviceInfoController.__testCreateRegistry(
        req, cpe, permissions,
      );

      // Verify
      expect(ret).toStrictEqual(true);

      // It is expected that wan_mac_ppp value is rejected and that the device
      // object does not have the corresponding property (wan_bssid)
      expect(reportOnuDevicesSpy).toHaveBeenCalledWith(
        app,
        expect.arrayContaining([
          expect.not.objectContaining({wan_bssid: expect.any(String)}),
        ]),
      );
    },
  );
  
  // Validate createRegistry - Receives valid value for field wan_mac_ppp - Is
  // expected the field to be accepted as a valid MAC address and included in
  // device criation
  test(
    'Validate createRegistry - Receives valid value for field wan_mac_ppp',
    async () => {
      const id = models.defaultMockDevices[0]._id;
      const device = models.copyDeviceFrom(
        id,
        {
          _id: '94:46:96:8c:23:61',
          acs_id: '944696-WiFi%20AC1200%20Router-9446968c2362',
          model: 'RE1200R4GC-2T2R-V3', // Multilaser RE708
          version: 'RE1200R4GC-2T2R-V3_v3411b_MUL015B',
          hw_version: '81xx',
        },
      );
      let splitID = device.acs_id.split('-');
      let model = splitID.slice(1, splitID.length-1).join('-');

      const cpe = devicesAPI.instantiateCPEByModel(
        model, device.model, device.version, device.hw_version,
      ).cpe;

      let permissions = deviceVersion.devicePermissions(device);

      let app = {
        locals: {
          secret: '123',
        },
      };

      // The body receives a valid value for the wan_mac_ppp field
      let body = {
        acs_id: '944696-WiFi%20AC1200%20Router-9446968c2362',
        data: {
          common: {
            mac: { value: '94:46:96:8c:23:61', writable: 0 },
            model: { value: 'RE1200R4GC-2T2R-V3', writable: 0 },
            version: { value: 'RE1200R4GC-2T2R-V3_v3411b_MUL015B', writable: 0 },
            hw_version: { value: '81xx', writable: 0 },
            uptime: { value: 1028, writable: 0 },
            ip: { value: 'http://192.168.89.58:7547/tr069', writable: 0 },
            acs_url: { value: 'http://192.168.88.47:57547', writable: 1 },
            interval: { value: 113, writable: 1 }
          },
          wan: {
            pppoe_enable: { value: true, writable: 1 },
            pppoe_user: { value: 'user', writable: 1 },
            pppoe_pass: { value: '', writable: 1 },
            rate: { value: '100', writable: 1 },
            duplex: { value: 'Full', writable: 1 },
            wan_ip_ppp: { value: '192.168.89.58', writable: 0 },
            wan_mac_ppp: { value: '9C:A2:F4:5D:19:09', writable: 0 },
            uptime_ppp: { value: 1005, writable: 0 },
            mtu_ppp: { value: 1452, writable: 1 },
            recv_bytes: { value: 695251, writable: 0 },
            sent_bytes: { value: 642883, writable: 0 },
            port_mapping_entries_ppp: { value: 0, writable: 0 }
          },
          lan: {
            config_enable: { value: false, writable: 1 },
            router_ip: { value: '10.0.0.2', writable: 1 },
            subnet_mask: { value: '255.255.255.0', writable: 1 },
            lease_min_ip: { value: '10.0.0.100', writable: 1 },
            lease_max_ip: { value: '10.0.0.200', writable: 1 },
            ip_routers: { value: '0.0.0.0', writable: 1 },
            dns_servers: { value: '', writable: 1 }
          },
          wifi2: {
            ssid: { value: 'Anlix-Multilaser-RE708', writable: 1 },
            bssid: { value: '94:46:96:8c:23:64', writable: 0 },
            password: { value: '', writable: 1 },
            channel: { value: 6, writable: 1 },
            auto: { value: false, writable: 1 },
            mode: { value: 'b,g,n', writable: 0 },
            enable: { value: true, writable: 1 },
            beacon_type: { value: '11i', writable: 1 }
          },
          wifi5: {
            ssid: { value: 'Anlix-Multilaser-RE708-5G', writable: 1 },
            bssid: { value: '94:46:96:8c:23:63', writable: 0 },
            password: { value: '', writable: 1 },
            channel: { value: 40, writable: 1 },
            auto: { value: false, writable: 1 },
            mode: { value: 'a,n,ac', writable: 0 },
            enable: { value: true, writable: 1 },
            beacon_type: { value: '11i', writable: 1 }
          },
          mesh2: {
            ssid: { value: 'Anlix-Multilaser-RE708', writable: 1 },
            bssid: { value: '94:46:96:8c:23:64', writable: 0 },
            password: { value: '', writable: 1 },
            channel: { value: 6, writable: 1 },
            auto: { value: false, writable: 1 },
            mode: { value: 'b,g,n', writable: 0 },
            enable: { value: true, writable: 1 },
            advertise: { value: true, writable: 1 },
            encryption: { value: 'TKIPandAESEncryption ', writable: 1 },
            beacon_type: { value: '11i', writable: 1 }
          },
          mesh5: {},
        },
      };

      // Mocks
      const mockRequest = () => {return {app: app, body: body}};
      let req = mockRequest();

      // Spies
      let reportOnuDevicesSpy =
        jest.spyOn(acsDeviceInfoController, 'reportOnuDevices');

      // Execute
      let ret = await acsDeviceInfoController.__testCreateRegistry(
        req, cpe, permissions,
      );

      // Verify
      expect(ret).toStrictEqual(true);

      // It is expected that wan_mac_ppp value is added when assembling the
      // device object and that the value of the corresponding property
      // (wan_bssid) is exactly equal to the value received
      expect(reportOnuDevicesSpy).toHaveBeenCalledWith(
        app,
        expect.arrayContaining([
          expect.objectContaining({wan_bssid: body.data.wan.wan_mac_ppp.value}),
        ]),
      );
    },
  );
});
