require('../../bin/globals');

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const utils = require('../common/utils');
const models = require('../common/models');

// Mock the config (used in language.js)
utils.common.mockConfigs(models.defaultMockConfigs[0], 'findOne');

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

let bodyField = (value, writable) => {
  return {value: value, writable: writable};
};

let assembleBody = (device) => {
  return {
    acs_id: device._id,
    data: {
      common: {
        mac: bodyField(device._id, 0),
        model: bodyField(device.model, 0),
        version: bodyField(device.version, 0),
        hw_version: bodyField(device.hw_version, 0),
        uptime: bodyField(device.sys_up_time, 0),
        ip: bodyField(device.ip, 0),
        acs_url: bodyField('http://192.168.88.47:57547/', 1),
        interval: bodyField(device.custom_inform_interval, 1),
        stun_enable: bodyField(false, 0),
      },
      wan: {
        pppoe_enable: bodyField((device.connection_type === 'pppoe'), 1),
        pppoe_user: bodyField(device.pppoe_user, 1),
        pppoe_pass: bodyField(device.pppoe_password, 1),
        rate: bodyField(device.wan_negociated_speed, 1),
        duplex: bodyField(device.wan_negociated_duplex, 1),
        wan_ip_ppp: bodyField(device.wan_ip, 1),
        wan_mac_ppp: bodyField(device.wan_bssid, 1),
        uptime: bodyField(device.wan_up_time, 0),
        mtu: bodyField(device.wan_mtu, 1),
        recv_bytes: bodyField(9182195992, 0),
        sent_bytes: bodyField(757192873, 0),
      },
      lan: {
        config_enable: bodyField(true, 1),
        router_ip: bodyField(device.lan_subnet, 1),
        subnet_mask: bodyField(device.lan_netmask, 1),
        lease_min_ip: bodyField('192.168.1.33', 1),
        lease_max_ip: bodyField('192.168.1.253', 1),
        ip_routers: bodyField('192.168.1.1', 1),
        dns_servers: bodyField('192.168.1.1', 1),
      },
      wifi2: {
        ssid: bodyField(device.wifi_ssid, 1),
        bssid: bodyField(device.wifi_bssid, 0),
        password: bodyField('', 1),
        channel: bodyField(device.wifi_channel, 1),
        auto: bodyField((device.wifi_channel === 'auto'), 1),
        mode: bodyField(device.wifi_mode, 1),
        enable: bodyField((device.wifi_state === 1), 1),
        beacon_type: bodyField('11i', 1),
        band: bodyField(device.wifi_band, 1),
      },
      wifi5: {
        ssid: bodyField(device.wifi_bssid_5ghz, 1),
        bssid: bodyField(device.wifi_bssid_5ghz, 0),
        password: bodyField('', 1),
        channel: bodyField(device.wifi_channel_5ghz, 1),
        auto: bodyField((device.wifi_channel === 'auto'), 1),
        mode: bodyField(device.wifi_mode, 1),
        enable: bodyField((device.wifi_state === 1), 1),
        beacon_type: bodyField('11i', 1),
        band: bodyField(device.wifi_band_5ghz, 1),
      },
      mesh2: {},
      mesh5: {},
    },
  };
};

// controllers/acs_device_info
describe('ACS Device Info Tests', () => {
  beforeEach(() => {
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
    expect(genieSpy).toHaveBeenCalledTimes(4);
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
    expect(genieSpy).toHaveBeenCalledTimes(4);
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

  describe('Validate createRegistry', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
      jest.useRealTimers();

      jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{_id: '94:46:96:8c:23:61'}]);

      jest.spyOn(tasksAPI, 'addTask')
        .mockImplementation(() => {
          return {success: true, executed: true, message: 'task success'};
      });
    });

    // Validate createRegistry - Receives invalid value for field
    // wan_mac_ppp - Is expected the field to be rejected as an invalid
    // MAC address and not included in device creation
    test(
      'Receives invalid value for field wan_mac_ppp',
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

        let body = assembleBody(device);

        // Mocks
        const mockRequest = () => {
          return {app: app, body: body};
        };
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
      'Receives valid value for field wan_mac_ppp',
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

        let body = assembleBody(device);

        // Mocks
        const mockRequest = () => {
          return {app: app, body: body};
        };
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
            expect.objectContaining(
              {wan_bssid: body.data.wan.wan_mac_ppp.value}),
          ]),
        );
      },
    );

    // Validate createRegistry - Flag canTrustWanRate is false - Is expected the
    // fields rate and duplex to be rejectec and not included in device creation
    test(
      'Cannot trust rate',
      async () => {
        // Flag canTrustWanRate for Multilaser RE708 is false
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

        let body = assembleBody(device);

        // Mocks
        const mockRequest = () => {
          return {app: app, body: body};
        };
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

        // Assert that canTrustWanRate is really false
        expect(permissions.grantCanTrustWanRate).toStrictEqual(false);

        // It is expected that rate and duplex are rejected and that the device
        // object does not have the corresponding properties
        expect(reportOnuDevicesSpy).toHaveBeenCalledWith(
          app,
          expect.arrayContaining([
            expect.not.objectContaining({
              wan_negociated_speed: expect.any(String),
              wan_negociated_duplex: expect.any(String),
            }),
          ]),
        );
      },
    );

    // Validate createRegistry - Flag canTrustWanRate is true - Is expected the
    // the fields rate and duplex to be accepted and included in device creation
    test(
      'Can trust rate',
      async () => {
        // Flag canTrustWanRate for ZTE H199 is true
        const id = models.defaultMockDevices[0]._id;
        const device = models.copyDeviceFrom(
          id,
          {
            _id: '94:46:96:8c:23:61',
            acs_id: 'C0B101-ZXHN%20H199A-ZTEYH86LCN10105',
            model: 'ZXHN H199A', // ZTE H199
            version: 'V9.1.0P4N1_MUL',
            hw_version: 'V9.1.1',
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

        let body = assembleBody(device);

        // Mocks
        const mockRequest = () => {
          return {app: app, body: body};
        };
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

        // Assert that canTrustWanRate is really true
        expect(permissions.grantCanTrustWanRate).toStrictEqual(true);

        // It is expected that rate and duplex values are added when assembling
        // the device object and that the value of the corresponding
        // properties is exactly equal to the values received
        expect(reportOnuDevicesSpy).toHaveBeenCalledWith(
          app,
          expect.arrayContaining([
            expect.objectContaining({
              wan_negociated_speed: body.data.wan.rate.value,
              wan_negociated_duplex: body.data.wan.duplex.value,
            }),
          ]),
        );
      },
    );
  });

  describe('informDevice function', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.restoreAllMocks();
      jest.clearAllMocks();
      jest.useRealTimers();
    });

    test('Invalid config', async () => {
      let acsID = models.defaultMockDevices[0].acs_id;

      // Mocks
      utils.common.mockConfigs(null, 'findOne');

      // Execute
      let result = await utils.common.sendFakeRequest(
        acsDeviceInfoController.informDevice,
        {acs_id: acsID},
        undefined,
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toContain(
        t('configFindError').replace('({{errorline}})', ''),
      );
    });

    test('New device', async () => {
      let acsID = models.defaultMockDevices[0].acs_id;
      let tr069Config = models.defaultMockConfigs[0].tr069;

      // Mocks
      utils.common.mockAwaitConfigs(models.defaultMockConfigs[0], 'findOne');
      utils.common.mockDevices(null, 'findOne');

      // Execute
      let result = await utils.common.sendFakeRequest(
        acsDeviceInfoController.informDevice,
        {acs_id: acsID},
        undefined,
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.measure).toBe(true);
      expect(result.body.measure_type).toBe('newDevice');
      expect(result.body.connection.login).toBe(
        tr069Config.connection_login,
      );
      expect(result.body.connection.password).toBe(
        tr069Config.connection_password,
      );
    });

    test('Non TR-069 device', async () => {
      let acsID = models.defaultMockDevices[0].acs_id;

      // Mocks
      utils.common.mockDefaultAwaitConfigs();
      // Use a firmware device
      utils.common.mockAwaitDevices(models.defaultMockDevices[1], 'findOne');

      // Execute
      let result = await utils.common.sendFakeRequest(
        acsDeviceInfoController.informDevice,
        {acs_id: acsID},
        undefined,
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toContain(
        t('nonTr069AcsSyncError').replace('({{errorline}})', ''),
      );
    });

    test('Hard reset', async () => {
      let tr069Config = models.defaultMockConfigs[0].tr069;
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {recovering_tr069_reset: true},
      );

      // Mocks
      utils.common.mockDefaultAwaitConfigs();
      utils.common.mockAwaitDevices(device, 'findOne');

      // Execute
      let result = await utils.common.sendFakeRequest(
        acsDeviceInfoController.informDevice,
        {acs_id: device.acs_id},
        undefined,
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.measure).toBe(true);
      expect(result.body.measure_type).toBe('updateDevice');
      expect(result.body.connection.login).toBe(
        tr069Config.connection_login,
      );
      expect(result.body.connection.password).toBe(
        tr069Config.connection_password,
      );
    });

    test('Updated', async () => {
      let tr069Config = models.defaultMockConfigs[0].tr069;
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          do_update: true,
          do_update_status: 0,
        },
      );

      // Mocks
      utils.common.mockDefaultAwaitConfigs();
      utils.common.mockAwaitDevices(device, 'findOne');

      // Execute
      let result = await utils.common.sendFakeRequest(
        acsDeviceInfoController.informDevice,
        {acs_id: device.acs_id},
        undefined,
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.measure).toBe(true);
      expect(result.body.measure_type).toBe('updateDevice');
      expect(result.body.connection.login).toBe(
        tr069Config.connection_login,
      );
      expect(result.body.connection.password).toBe(
        tr069Config.connection_password,
      );
    });

    test('Update failed and not sync', async () => {
      let tr069Config = models.defaultMockConfigs[0].tr069;
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          do_update: true,
          do_update_status: 1,
          last_tr069_sync: Date.now(),
        },
      );

      // Mocks
      utils.common.mockDefaultAwaitConfigs();
      utils.common.mockAwaitDevices(device, 'findOne');
      let requestSyncSpy = jest.spyOn(acsDeviceInfoController, 'requestSync');

      // Execute
      let result = await utils.common.sendFakeRequest(
        acsDeviceInfoController.informDevice,
        {acs_id: device.acs_id},
        undefined,
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.measure).toBe(false);
      expect(result.body.connection).toBeUndefined();
      expect(requestSyncSpy).not.toBeCalled();
    });
/*
    test.only('Normal sync', async () => {
      let tr069Config = models.defaultMockConfigs[0].tr069;

      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {tr069: tr069Config},
      );
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {last_tr069_sync: Date.now() - 10000000},
      );

      // Mocks
      utils.common.mockAwaitConfigs(config, 'findOne');
      utils.common.mockAwaitDevices(device, 'findOne');
      let requestSyncSpy = jest.spyOn(acsDeviceInfoController, 'requestSync');

      jest.spyOn(tasksAPI, 'addTask')
        .mockImplementation(() => {
          return {success: true, executed: true, message: 'task success'};
      });

      // Execute
      const req = mockRequest({acs_id: device.acs_id});
      const response = mockResponse();

      let result = await acsDeviceInfoController.informDevice(req, response);



      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.measure).toBe(false);
      expect(result.body.connection).toBeUndefined();
      expect(requestSyncSpy).toBeCalled();
    });
*/
  });
});
