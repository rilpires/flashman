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

assembleBody = function(data) {
  return {
    acs_id: data._id,
    data: {
      common: {
        mac: data.mac,
        model: data.model,
        version: data.version,
        hw_version: data.hw_version,
        uptime: data.uptime,
        ip: data.ip,
        acs_url: data.acs_url,
        interval: data.interval,
        stun_enable: data.stun_enable,
        stun_udp_conn_req_addr: data.stun_udp_conn_req_addr,
      },
      wan: {
        pppoe_enable: data.pppoe_enable,
        pppoe_user: data.pppoe_user,
        pppoe_pass: data.pppoe_pass,
        rate: data.rate,
        duplex: data.duplex,
        wan_ip_ppp: data.wan_ip_ppp,
        wan_mac_ppp: data.wan_mac_ppp,
        uptime: data.wan_uptime,
        mtu: data.mtu,
        recv_bytes: data.recv_bytes,
        sent_bytes: data.sent_bytes,
        port_mapping_entries_dhcp: data.port_mapping_entries_dhcp,
      },
      lan: {
        config_enable: data.config_enable,
        router_ip: data.router_ip,
        subnet_mask: data.subnet_mask,
        lease_min_ip: data.lease_min_ip,
        lease_max_ip: data.lease_max_ip,
        ip_routers: data.ip_routers,
        dns_servers: data.dns_servers,
      },
      wifi2: {
        ssid: data.ssid,
        bssid: data.bssid,
        password: data.password,
        channel: data.channel,
        auto: data.auto,
        mode: data.mode,
        enable: data.enable,
        beacon_type: data.beacon_type,
        band: data.band,
      },
      wifi5: {
        ssid: data.ssid,
        bssid: data.bssid,
        password: data.password,
        channel: data.channel,
        auto: data.auto,
        mode: data.mode,
        enable: data.enable,
        beacon_type: data.beacon_type,
        band: data.band,
      },
      mesh2: {
        ssid: data.ssid,
        bssid: data.bssid,
        password: data.password,
        channel: data.channel,
        auto: data.auto,
        mode: data.mode,
        enable: data.enable,
        advertise: data.advertise,
        encryption: data.encryption,
        beacon_type: data.beacon_type,
      },
      mesh5: {
        ssid: data.ssid,
        bssid: data.bssid,
        password: data.password,
        channel: data.channel,
        auto: data.auto,
        mode: data.mode,
        enable: data.enable,
        advertise: data.advertise,
        encryption: data.encryption,
        beacon_type: data.beacon_type,
      },
    },
  };
};

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

      let newDeviceBodyData = models.copyNewDeviceBodyData(
        models.defaultNewDeviceBodyData[0]._id,
        {
          _id: device.acs_id,
          model: { value: device.model, writable: 0 },
          version: { value: device.version, writable: 0 },
          hw_version: { value: device.hw_version, writable: 0 },
          wan_mac_ppp: { value: '000000000000\n', writable: 0 }, // Invalid
        },
      );

      let body = assembleBody(newDeviceBodyData);

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

      let newDeviceBodyData = models.copyNewDeviceBodyData(
        models.defaultNewDeviceBodyData[0]._id,
        {
          _id: device.acs_id,
          model: { value: device.model, writable: 0 },
          version: { value: device.version, writable: 0 },
          hw_version: { value: device.hw_version, writable: 0 },
          wan_mac_ppp: { value: '9C:A2:F4:5D:19:09', writable: 0 }, // Valid
        },
      );

      let body = assembleBody(newDeviceBodyData);

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
  
  // Validate createRegistry - Flag canTrustWanRate is false - Is expected the
  // fields rate and duplex to be rejectec and not included in device creation
  test(
    'Validate createRegistry - Cannot trust rate',
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

      let newDeviceBodyData = models.copyNewDeviceBodyData(
        models.defaultNewDeviceBodyData[0]._id,
        {
          _id: device.acs_id,
          model: { value: device.model, writable: 0 },
          version: { value: device.version, writable: 0 },
          hw_version: { value: device.hw_version, writable: 0 },
        },
      );

      let body = assembleBody(newDeviceBodyData);

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
    'Validate createRegistry - Can trust rate',
    async () => {
      // Flag canTrustWanRate for ZTE H199 is true
      const id = models.defaultMockDevices[0]._id;
      const device = models.copyDeviceFrom(
        id,
        {
          _id: 'c0:b1:01:31:71:6e',
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

      let newDeviceBodyData = models.copyNewDeviceBodyData(
        models.defaultNewDeviceBodyData[0]._id, {},
      );

      let body = assembleBody(newDeviceBodyData);

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

      // Assert that canTrustWanRate is really true
      expect(permissions.grantCanTrustWanRate).toStrictEqual(true);

      // It is expected that rate and duplex values are added when assembling
      // the device object and that the value of the corresponding properties is
      // exactly equal to the values received
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
