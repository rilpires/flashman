require('../../bin/globals');

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const utils = require('../common/utils');
const models = require('../common/models');
const fieldsAndPermissions = require('../common/fieldsAndPermissions');

// Mock the config (used in language.js)
utils.common.mockConfigs(models.defaultMockConfigs[0], 'findOne');

const acsDeviceInfoController = require('../../controllers/acs_device_info');
const devicesAPI = require('../../controllers/external-genieacs/devices-api');
const deviceVersion = require('../../models/device_version');
const tasksAPI = require('../../controllers/external-genieacs/tasks-api');
const deviceHandlers = require('../../controllers/handlers/devices');
const utilHandlers = require('../../controllers/handlers/util');
const acsMeshDeviceHandler = require('../../controllers/handlers/acs/mesh.js');
const updateSchedulerCommon = require(
  '../../controllers/update_scheduler_common',
);
const DeviceModel = require('../../models/device');

const http = require('http');
const DeviceVersion = require('../../models/device_version');
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


const mockRequest = (app, body) => {
  return {app: app, body: body};
};

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
        mask_ipv4: bodyField(device.wan_ipv4_mask, 0),
        mask_ipv4_ppp: bodyField(device.wan_ipv4_mask, 0),
        remote_address: bodyField(device.pppoe_ip, 0),
        remote_address_ppp: bodyField(device.pppoe_ip, 0),
        remote_mac: bodyField(device.pppoe_mac, 0),
        remote_mac_ppp: bodyField(device.pppoe_mac, 0),
        default_gateway: bodyField(device.default_gateway_v4, 0),
        default_gateway_ppp: bodyField(device.default_gateway_v4, 0),
        dns_servers: bodyField(device.dns_server, 0),
        dns_servers_ppp: bodyField(device.dns_server, 0),
      },
      ipv6: {
        address: bodyField(device.wan_ipv6, 0),
        address_ppp: bodyField(device.wan_ipv6, 0),
        mask: bodyField(device.wan_ipv6_mask, 0),
        mask_ppp: bodyField(device.wan_ipv6_mask, 0),
        default_gateway: bodyField(device.default_gateway_v6, 0),
        default_gateway_ppp: bodyField(device.default_gateway_v6, 0),
        prefix_address: bodyField(device.prefix_delegation_addr, 0),
        prefix_address_ppp: bodyField(device.prefix_delegation_addr, 0),
        prefix_mask: bodyField(device.prefix_delegation_mask, 0),
        prefix_mask_ppp: bodyField(device.prefix_delegation_mask, 0),
        prefix_local_address: bodyField(device.prefix_delegation_local, 0),
        prefix_local_address_ppp: bodyField(device.prefix_delegation_local, 0),
      },
      lan: {
        config_enable: bodyField(true, 1),
        router_ip: bodyField(device.lan_subnet, 1),
        subnet_mask: bodyField(device.lan_netmask, 1),
        lease_min_ip: bodyField('192.168.1.33', 1),
        lease_max_ip: bodyField('192.168.1.253', 1),
        ip_routers: bodyField('192.168.1.1', 1),
        dns_servers: bodyField(device.lan_dns_servers, 1),
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

  // updateInfo
  describe('updateInfo', () => {
    // mustExecute = true & executed
    test('mustExecute = true & executed', async () => {
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

    // mustExecute = true & not executed
    test('mustExecute = true & not executed', async () => {
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

    // mustExecute = false & executed
    test('mustExecute = false & executed', async () => {
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

    // mustExecute = true & not executed
    test('mustExecute = false & not executed', async () => {
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
  });

  // configTR069VirtualAP
  describe('configTR069VirtualAP', () => {
    // To mode disabled
    test('To mode disabled', async () => {
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

    // To mode cable
    test('To mode cable', async () => {
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

    // To mode wifi2
    test('To mode wifi2', async () => {
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

    // To mode wifi5
    test('To mode wifi5', async () => {
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

    // To mode wifi2/5
    test('To mode wifi2/5', async () => {
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

    // To unknown mode
    test('To unknown mode', async () => {
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

  // delayExecutionGenie
  describe('delayExecutionGenie', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => true);
    });


    // repeatTimes = 0
    test('repeatTimes = 0', async () => {
      // Create a function to be passed and resolves instantly
      let asyncFunc = jest.fn(() => new Promise((resolve) => resolve()));
      let acsId = '12345';

      // Mocks
      jest.useFakeTimers();
      jest.spyOn(global, 'setTimeout');
      let genieSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{_id: acsId}]);

      // Execute
      let result = await acsDeviceInfoController.delayExecutionGenie(
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

    // repeatTimes = -1
    test('repeatTimes = -1', async () => {
      // Create a function to be passed and resolves instantly
      let asyncFunc = jest.fn(() => new Promise((resolve) => resolve()));
      let acsId = '12345';

      // Mocks
      jest.useFakeTimers();
      jest.spyOn(global, 'setTimeout');
      let genieSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{_id: acsId}]);

      // Execute
      let result = await acsDeviceInfoController.delayExecutionGenie(
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

    // delayTime = 5000
    test('delayTime = 5000', async () => {
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
      let result = await acsDeviceInfoController.delayExecutionGenie(
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

    // repeatTimes = 5
    test('repeatTimes = 5', async () => {
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
      let result = await acsDeviceInfoController.delayExecutionGenie(
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

    // delayTime = 0
    test('delayTime = 0', async () => {
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
      let result = await acsDeviceInfoController.delayExecutionGenie(
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

    // delayTime = -1
    test('delayTime = -1', async () => {
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
      let result = await acsDeviceInfoController.delayExecutionGenie(
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

    // No device
    test('No device', async () => {
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
      let result = await acsDeviceInfoController.delayExecutionGenie(
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

      // We are not testing the updateInfo in this test
      acsDeviceInfoController.updateInfo = jest.fn().mockResolvedValue();

      // Mock the generic save (workaround from new DeviceModel)
      DeviceModel.prototype.save = jest.fn();
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
        let req = mockRequest(app, body);

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
        let req = mockRequest(app, body);

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
        let req = mockRequest(app, body);

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
        let req = mockRequest(app, body);

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

    test(
      'Receives valid value for lan_dns_servers',
      async () => {
        const id = models.defaultMockDevices[0]._id;
        const device = models.copyDeviceFrom(
          id,
          {
            _id: 'A0:DE:0F:0C:37:54',
            acs_id: '00E0FC-WS5200%2D40-XQFQU21607004481',
            model: 'WS5200-40', // Huawei  WS5200-40
            version: '2.0.0.505(C947)',
            hw_version: 'VER.A',
            lan_dns_servers: '192.168.3.1,192.168.2.1', // Valid value
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
        let req = mockRequest(app, body);

        // Spies
        let reportOnuDevicesSpy =
          jest.spyOn(acsDeviceInfoController, 'reportOnuDevices');

        // Execute
        let ret = await acsDeviceInfoController.__testCreateRegistry(
          req, cpe, permissions,
        );

        // Verify
        expect(ret).toStrictEqual(true);

        // It is expected that: the field value of lan_dns_servers is accepted
        // and strictly equal to the passed value
        expect(reportOnuDevicesSpy).toHaveBeenCalledWith(
          app,
          expect.arrayContaining([
            expect.objectContaining({lan_dns_servers: device.lan_dns_servers}),
          ]),
        );
      },
    );

    test(
      'Receives a list with repeated IP addresses for lan_dns_servers',
      async () => {
        const id = models.defaultMockDevices[0]._id;
        const device = models.copyDeviceFrom(
          id,
          {
            _id: 'A0:DE:0F:0C:37:54',
            acs_id: '00E0FC-WS5200%2D40-XQFQU21607004481',
            model: 'WS5200-40', // Huawei  WS5200-40
            version: '2.0.0.505(C947)',
            hw_version: 'VER.A',
            lan_dns_servers: '192.168.3.1,192.168.3.1', // Duplicated value
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
        let req = mockRequest(app, body);

        // Spies
        let reportOnuDevicesSpy =
          jest.spyOn(acsDeviceInfoController, 'reportOnuDevices');

        // Execute
        let ret = await acsDeviceInfoController.__testCreateRegistry(
          req, cpe, permissions,
        );

        // Verify
        expect(ret).toStrictEqual(true);

        // Is expected lan_dns_servers field value to filter out duplicate
        // addresses
        expect(reportOnuDevicesSpy).toHaveBeenCalledWith(
          app,
          expect.arrayContaining([
            expect.objectContaining({lan_dns_servers: '192.168.3.1'}),
          ]),
        );
      },
    );

    test(
      'Receives an empty field for lan_dns_servers',
      async () => {
        const id = models.defaultMockDevices[0]._id;
        const device = models.copyDeviceFrom(
          id,
          {
            _id: '1C:61:B4:85:9F:B6',
            acs_id: '1C61B4-IGD-22271K1007249',
            model: 'EC220-G5', // Tp-Link EC220-G5
            version: '3.16.0 0.9.1 v6055.0 Build 220706 Rel.79244n',
            hw_version: 'EC220-G5 v2 00000003',
            // Field is undefined because the router does not allow reading and
            // writing of it
            lan_dns_servers: undefined,
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
        let req = mockRequest(app, body);

        // Spies
        let reportOnuDevicesSpy =
          jest.spyOn(acsDeviceInfoController, 'reportOnuDevices');

        // Execute
        let ret = await acsDeviceInfoController.__testCreateRegistry(
          req, cpe, permissions,
        );

        // Verify
        expect(ret).toStrictEqual(true);

        // It is expected field lan_dns_servers to be undefined
        expect(reportOnuDevicesSpy).toHaveBeenCalledWith(
          app,
          expect.arrayContaining([
            expect.objectContaining({lan_dns_servers: undefined}),
          ]),
        );
      },
    );

    // Validate WAN and LAN information
    test('WAN & LAN information', async () => {
      const device = models.defaultMockDevices[0];
      const cpePermissions = {
        features: {hasIpv6Information: true},
        lan: {}, wifi: {}, mesh: {}, stavixXMLConfig: {},
        wan: {
          hasIpv4MaskField: true,
          hasIpv4RemoteAddressField: true,
          hasIpv4RemoteMacField: true,
          hasIpv4DefaultGatewayField: true,
          hasDnsServerField: true,
        },
        ipv6: {
          hasAddressField: true,
          hasMaskField: true,
          hasDefaultGatewayField: true,
          hasPrefixDelegationAddressField: true,
          hasPrefixDelegationMaskField: true,
          hasPrefixDelegationLocalAddressField: true,
        },
      };
      let app = {
        locals: {
          secret: '123',
        },
      };

      // Mocks
      let request = {app: app, body: assembleBody(device)};
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true, cpePermissions, null,
      );
      jest.spyOn(acsDeviceInfoController, 'delayExecutionGenie')
        .mockImplementation(() => true);

      // Get the cpe with the mocked permissions
      const cpe = devicesAPI.instantiateCPEByModelFromDevice(
        device,
      ).cpe;

      let devicePermissions = deviceVersion.devicePermissions(device);
      devicePermissions.grantWanLanInformation = true;


      // Spies
      let reportOnuDevicesSpy =
        jest.spyOn(acsDeviceInfoController, 'reportOnuDevices');

      // Execute
      let result = await acsDeviceInfoController.__testCreateRegistry(
        request, cpe, devicePermissions,
      );

      // Validate
      expect(result).toBe(true);
      expect(reportOnuDevicesSpy).toHaveBeenCalledWith(
        app,
        expect.arrayContaining([
          expect.objectContaining({
            wan_ipv6: device.wan_ipv6,
            wan_ipv4_mask: device.wan_ipv4_mask,
            wan_ipv6_mask: device.wan_ipv6_mask,
            default_gateway_v4: device.default_gateway_v4,
            default_gateway_v6: device.default_gateway_v6,
            dns_server: device.dns_server,
            pppoe_mac: device.pppoe_mac,
            pppoe_ip: device.pppoe_ip,
            prefix_delegation_addr: device.prefix_delegation_addr,
            prefix_delegation_mask: device.prefix_delegation_mask,
            prefix_delegation_local: device.prefix_delegation_local,
          }),
        ]),
      );
    });


    // WAN and LAN information without IPv6
    test('WAN & LAN information without IPv6', async () => {
      const device = models.defaultMockDevices[0];
      let cpePermissions = {
        features: {hasIpv6Information: false},
        lan: {}, wifi: {}, mesh: {}, stavixXMLConfig: {},
        wan: {
          hasIpv4MaskField: true,
          hasIpv4RemoteAddressField: true,
          hasIpv4RemoteMacField: true,
          hasIpv4DefaultGatewayField: true,
          hasDnsServerField: true,
        },
        ipv6: {
          hasAddressField: true,
          hasMaskField: true,
          hasDefaultGatewayField: true,
          hasPrefixDelegationAddressField: true,
          hasPrefixDelegationMaskField: true,
          hasPrefixDelegationLocalAddressField: true,
        },
      };
      let app = {
        locals: {
          secret: '123',
        },
      };

      // Mocks
      let request = {app: app, body: assembleBody(device)};
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true, cpePermissions, null,
      );
      jest.spyOn(acsDeviceInfoController, 'delayExecutionGenie')
        .mockImplementation(() => true);

      // Get the cpe with the mocked permissions
      const cpe = devicesAPI.instantiateCPEByModelFromDevice(
        device,
      ).cpe;

      let devicePermissions = deviceVersion.devicePermissions(device);
      devicePermissions.grantWanLanInformation = true;


      // Spies
      let reportOnuDevicesSpy =
        jest.spyOn(acsDeviceInfoController, 'reportOnuDevices');

      // Execute
      let result = await acsDeviceInfoController.__testCreateRegistry(
        request, cpe, devicePermissions,
      );

      // Validate
      expect(result).toBe(true);
      expect(reportOnuDevicesSpy).toHaveBeenCalledWith(
        app,
        expect.arrayContaining([
          expect.objectContaining({
            wan_ipv4_mask: device.wan_ipv4_mask,
            default_gateway_v4: device.default_gateway_v4,
            dns_server: device.dns_server,
            pppoe_mac: device.pppoe_mac,
            pppoe_ip: device.pppoe_ip,
          }),
        ]),
      );
      expect(reportOnuDevicesSpy).toHaveBeenCalledWith(
        app,
        expect.arrayContaining([
          expect.not.objectContaining({
            wan_ipv6: device.wan_ipv6,
            wan_ipv6_mask: device.wan_ipv6_mask,
            default_gateway_v6: device.default_gateway_v6,
            prefix_delegation_addr: device.prefix_delegation_addr,
            prefix_delegation_mask: device.prefix_delegation_mask,
            prefix_delegation_local: device.prefix_delegation_local,
          }),
        ]),
      );
    });


    // WAN and LAN information no grant
    test('WAN & LAN information no grant', async () => {
      const device = models.defaultMockDevices[0];
      let cpePermissions = {
        features: {hasIpv6Information: true},
        lan: {}, wifi: {}, mesh: {}, stavixXMLConfig: {},
        wan: {
          hasIpv4MaskField: true,
          hasIpv4RemoteAddressField: true,
          hasIpv4RemoteMacField: true,
          hasIpv4DefaultGatewayField: true,
          hasDnsServerField: true,
        },
        ipv6: {
          hasAddressField: true,
          hasMaskField: true,
          hasDefaultGatewayField: true,
          hasPrefixDelegationAddressField: true,
          hasPrefixDelegationMaskField: true,
          hasPrefixDelegationLocalAddressField: true,
        },
      };
      let app = {
        locals: {
          secret: '123',
        },
      };

      // Mocks
      let request = {app: app, body: assembleBody(device)};
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true, cpePermissions, null,
      );
      jest.spyOn(acsDeviceInfoController, 'delayExecutionGenie')
        .mockImplementation(() => true);

      // Get the cpe with the mocked permissions
      const cpe = devicesAPI.instantiateCPEByModelFromDevice(
        device,
      ).cpe;

      let devicePermissions = deviceVersion.devicePermissions(device);
      devicePermissions.grantWanLanInformation = false;


      // Spies
      let reportOnuDevicesSpy =
        jest.spyOn(acsDeviceInfoController, 'reportOnuDevices');

      // Execute
      let result = await acsDeviceInfoController.__testCreateRegistry(
        request, cpe, devicePermissions,
      );

      // Validate
      expect(result).toBe(true);
      expect(reportOnuDevicesSpy).toHaveBeenCalledWith(
        app,
        expect.arrayContaining([
          expect.not.objectContaining({
            wan_ipv4_mask: device.wan_ipv4_mask,
            default_gateway_v4: device.default_gateway_v4,
            dns_server: device.dns_server,
            pppoe_mac: device.pppoe_mac,
            pppoe_ip: device.pppoe_ip,
            wan_ipv6: device.wan_ipv6,
            wan_ipv6_mask: device.wan_ipv6_mask,
            default_gateway_v6: device.default_gateway_v6,
            prefix_delegation_addr: device.prefix_delegation_addr,
            prefix_delegation_mask: device.prefix_delegation_mask,
            prefix_delegation_local: device.prefix_delegation_local,
          }),
        ]),
      );
    });


    // Invalid config
    test('Invalid config', async () => {
      let device = models.defaultMockDevices[0];
      device.acs_id = '';
      let app = {
        locals: {
          secret: '123',
        },
      };

      // Mocks
      let request = {app: app, body: assembleBody(device)};
      utils.common.mockConfigs(null, 'findOne');

      // Get the cpe and permissions
      const cpe = devicesAPI.instantiateCPEByModelFromDevice(
        device,
      ).cpe;

      let permissions = deviceVersion.devicePermissions(device);


      // Spies
      let reportOnuDevicesSpy =
        jest.spyOn(acsDeviceInfoController, 'reportOnuDevices');
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );

      // Execute
      let result = await acsDeviceInfoController.__testCreateRegistry(
        request, cpe, permissions,
      );

      expect(result).toBe(false);
      expect(errorSpy).toBeCalled();
      expect(reportOnuDevicesSpy).not.toBeCalled();
    });


    // All permissions
    test('All permissions', async () => {
      const device = models.defaultMockDevices[0];
      let cpePermissions = fieldsAndPermissions.cpePermissions[0];
      let app = {
        locals: {
          secret: '123',
        },
      };

      // Mocks
      let request = {app: app, body: assembleBody(device)};
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true, cpePermissions, null,
      );
      utils.common.mockDefaultConfigs();
      let delaySpy = jest.spyOn(acsDeviceInfoController, 'delayExecutionGenie')
        .mockImplementation(() => true);

      // Get the cpe with the mocked permissions
      const cpe = devicesAPI.instantiateCPEByModelFromDevice(
        device,
      ).cpe;

      let devicePermissions = fieldsAndPermissions.devicePermissions[0];


      // Spies
      let reportOnuDevicesSpy =
        jest.spyOn(acsDeviceInfoController, 'reportOnuDevices');

      // Execute
      let result = await acsDeviceInfoController.__testCreateRegistry(
        request, cpe, devicePermissions,
      );

      // Validate
      expect(result).toBe(true);
      expect(reportOnuDevicesSpy).toHaveBeenCalledWith(
        app,
        expect.arrayContaining([
          expect.anything(),
        ]),
      );
      expect(delaySpy).toHaveBeenCalledTimes(2);
    });
  });


  describe('informDevice function', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.restoreAllMocks();
      jest.clearAllMocks();
      jest.useRealTimers();

      jest.spyOn(console, 'log').mockImplementation(() => true);
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

describe('syncDeviceData - Update web admin login', () => {
    // New config
    test('New config', async () => {
      let oldLogin = 'teste123';
      let oldPass = 'teste321';
      let newLogin = '123teste';
      let newPass = '321teste';

      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: false,
          release: '1234',
          installed_release: '1234',
          recovering_tr069_reset: false,
          web_admin_username: oldLogin,
          web_admin_password: oldPass,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: newLogin,
            web_password: newPass,
          },
        },
      );


      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
            web_admin_username: {writable: true, value: oldLogin},
            web_admin_password: {writable: true, value: oldPass},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).toBeCalledWith(device, {
        common: {
          web_admin_username: newLogin,
          web_admin_password: newPass,
        }, lan: {}, stun: {}, wan: {}, wifi2: {}, wifi5: {},
      });
      expect(device.web_admin_username).toBe(newLogin);
      expect(device.web_admin_password).toBe(newPass);
    });


    // Undefined device password
    test('Undefined device password', async () => {
      let oldLogin = 'teste123';
      let oldPass = 'teste321';
      let newLogin = '123teste';
      let newPass = '321teste';

      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: false,
          release: '1234',
          installed_release: '1234',
          recovering_tr069_reset: false,
          web_admin_username: oldLogin,
          web_admin_password: undefined,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: newLogin,
            web_password: newPass,
          },
        },
      );


      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
            web_admin_username: {writable: true, value: oldLogin},
            web_admin_password: {writable: true, value: oldPass},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).toBeCalledWith(device, {
        common: {
          web_admin_username: newLogin,
          web_admin_password: newPass,
        }, lan: {}, stun: {}, wan: {}, wifi2: {}, wifi5: {},
      });
      expect(device.web_admin_username).toBe(newLogin);
      expect(device.web_admin_password).toBe(newPass);
    });


    // Undefined device login
    test('Undefined device login', async () => {
      let oldLogin = 'teste123';
      let oldPass = 'teste321';
      let newLogin = '123teste';
      let newPass = '321teste';

      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: false,
          release: '1234',
          installed_release: '1234',
          recovering_tr069_reset: false,
          web_admin_username: undefined,
          web_admin_password: oldPass,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: newLogin,
            web_password: newPass,
          },
        },
      );


      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
            web_admin_username: {writable: true, value: oldLogin},
            web_admin_password: {writable: true, value: oldPass},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).toBeCalledWith(device, {
        common: {
          web_admin_username: newLogin,
          web_admin_password: newPass,
        }, lan: {}, stun: {}, wan: {}, wifi2: {}, wifi5: {},
      });
      expect(device.web_admin_username).toBe(newLogin);
      expect(device.web_admin_password).toBe(newPass);
    });


    // Login not writable
    test('Login not writable', async () => {
      let oldLogin = 'teste123';
      let oldPass = 'teste321';
      let newLogin = '123teste';
      let newPass = '321teste';

      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: false,
          release: '1234',
          installed_release: '1234',
          recovering_tr069_reset: false,
          web_admin_username: oldLogin,
          web_admin_password: oldPass,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: newLogin,
            web_password: newPass,
          },
        },
      );


      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
            web_admin_username: {writable: false, value: oldLogin},
            web_admin_password: {writable: false, value: oldPass},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
      expect(device.web_admin_username).toBe(oldLogin);
      expect(device.web_admin_password).toBe(oldPass);
    });


    // Login not writable and no value
    test('Login not writable and no value', async () => {
      let oldLogin = 'teste123';
      let oldPass = 'teste321';
      let newLogin = '123teste';
      let newPass = '321teste';

      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: false,
          release: '1234',
          installed_release: '1234',
          recovering_tr069_reset: false,
          web_admin_username: oldLogin,
          web_admin_password: oldPass,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: newLogin,
            web_password: newPass,
          },
        },
      );


      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
            web_admin_username: {writable: false},
            web_admin_password: {writable: false},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
      expect(device.web_admin_username).toBe(oldLogin);
      expect(device.web_admin_password).toBe(oldPass);
    });


    // No cpe info
    test('No cpe info', async () => {
      let oldLogin = 'teste123';
      let oldPass = 'teste321';
      let newLogin = '123teste';
      let newPass = '321teste';

      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: false,
          release: '1234',
          installed_release: '1234',
          recovering_tr069_reset: false,
          web_admin_username: oldLogin,
          web_admin_password: oldPass,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: newLogin,
            web_password: newPass,
          },
        },
      );


      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
      expect(device.web_admin_username).toBe(oldLogin);
      expect(device.web_admin_password).toBe(oldPass);
    });


    // Invalid config
    test('Invalid config', async () => {
      let oldLogin = 'teste123';
      let oldPass = 'teste321';

      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: false,
          release: '1234',
          installed_release: '1234',
          recovering_tr069_reset: false,
          web_admin_username: oldLogin,
          web_admin_password: oldPass,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: undefined,
            web_password: undefined,
          },
        },
      );


      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
            web_admin_username: {writable: true, value: oldLogin},
            web_admin_password: {writable: true, value: oldPass},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
      expect(device.web_admin_username).toBe(oldLogin);
      expect(device.web_admin_password).toBe(oldPass);
    });


    // Everything is undefined
    test('Everything is undefined', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: false,
          release: '1234',
          installed_release: '1234',
          recovering_tr069_reset: false,
          web_admin_username: undefined,
          web_admin_password: undefined,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: undefined,
            web_password: undefined,
          },
        },
      );


      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
            web_admin_username: {writable: true},
            web_admin_password: {writable: true},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
      expect(device.web_admin_username).not.toBeDefined();
      expect(device.web_admin_password).not.toBeDefined();
    });


    // Same config
    test('New config', async () => {
      let oldLogin = 'teste123';
      let oldPass = 'teste321';

      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: false,
          release: '1234',
          installed_release: '1234',
          recovering_tr069_reset: false,
          web_admin_username: oldLogin,
          web_admin_password: oldPass,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: oldLogin,
            web_password: oldPass,
          },
        },
      );


      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
            web_admin_username: {writable: true, value: oldLogin},
            web_admin_password: {writable: true, value: oldPass},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {}, ipv6: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
      expect(device.web_admin_username).toBe(oldLogin);
      expect(device.web_admin_password).toBe(oldPass);
    });


    // Empty data
    test('Empty data', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id, {},
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id, {},
      );


      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };

      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device.acs_id, device, {
          common: {}, wan: {}, lan: {}, wifi2: {}, wifi5: {}, ipv6: {},
        }, {},
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
    });


    // No WAN/LAN information permission
    test('No WAN/LAN information permission', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          connection_type: 'dhcp',
          wan_ipv6: '',
          wan_ipv4_mask: 0,
          wan_ipv6_mask: 0,
          pppoe_ip: '',
          pppoe_mac: '',
          default_gateway_v4: '',
          default_gateway_v6: '',
          dns_server: '',
          prefix_delegation_addr: '',
          prefix_delegation_mask: '',
          prefix_delegation_local: '',
        },
      );
      let config = models.copyConfigFrom(models.defaultMockConfigs[0]._id, {});
      let permissions = {...fieldsAndPermissions.cpePermissions[0]};
      let fields = {...fieldsAndPermissions.fields[0]};

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fields,
      );

      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device.acs_id, device, {
          common: {}, wan: {
            mask_ipv4: {writable: false, value: '24'},
            remote_address: {writable: false, value: '192.168.89.2'},
            remote_mac: {writable: false, value: 'AA:BB:CC:DD:EE:FF'},
            default_gateway: {writable: false, value: '192.168.80.1'},
            dns_servers: {writable: false, value: '8.8.8.8'},
          }, lan: {}, wifi2: {}, wifi5: {}, ipv6: {
            address: {writable: false, value: '2804:1234:5678::a1'},
            mask: {writable: false, value: '78'},
            default_gateway: {writable: false, value: '2804:1234:5678::a0'},
            prefix_address: {writable: false, value: '2804:1234:5679::'},
            prefix_mask: {writable: false, value: '64'},
            prefix_local_address:
              {writable: false, value: '2804:1234:5679::b1'},
          },
        },
        {grantWanLanInformation: false},
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
      expect(device.wan_ipv6).toBe('');
      expect(device.wan_ipv4_mask).toBe(0);
      expect(device.wan_ipv6_mask).toBe(0);
      expect(device.pppoe_ip).toBe('');
      expect(device.pppoe_mac).toBe('');
      expect(device.default_gateway_v4).toBe('');
      expect(device.default_gateway_v6).toBe('');
      expect(device.dns_server).toBe('');
      expect(device.prefix_delegation_addr).toBe('');
      expect(device.prefix_delegation_mask).toBe('');
      expect(device.prefix_delegation_local).toBe('');
    });


    // WAN/LAN information permission with no value
    test('No WAN/LAN information permission with no value', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          connection_type: 'dhcp',
          wan_ipv6: '',
          wan_ipv4_mask: 0,
          wan_ipv6_mask: 0,
          pppoe_ip: '',
          pppoe_mac: '',
          default_gateway_v4: '',
          default_gateway_v6: '',
          dns_server: '',
          prefix_delegation_addr: '',
          prefix_delegation_mask: '',
          prefix_delegation_local: '',
        },
      );
      let config = models.copyConfigFrom(models.defaultMockConfigs[0]._id, {});
      let permissions = {...fieldsAndPermissions.cpePermissions[0]};
      let fields = {...fieldsAndPermissions.fields[0]};

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fields,
      );

      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device.acs_id, device, {
          common: {}, wan: {}, lan: {}, wifi2: {}, wifi5: {}, ipv6: {},
        },
        {grantWanLanInformation: true},
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
      expect(device.wan_ipv6).toBe('');
      expect(device.wan_ipv4_mask).toBe(0);
      expect(device.wan_ipv6_mask).toBe(0);
      expect(device.pppoe_ip).toBe('');
      expect(device.pppoe_mac).toBe('');
      expect(device.default_gateway_v4).toBe('');
      expect(device.default_gateway_v6).toBe('');
      expect(device.dns_server).toBe('');
      expect(device.prefix_delegation_addr).toBe('');
      expect(device.prefix_delegation_mask).toBe('');
      expect(device.prefix_delegation_local).toBe('');
    });


    // No WAN/LAN information IPv6 feature
    test('No WAN/LAN information IPv6 feature', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          connection_type: 'dhcp',
          wan_ipv6: '',
          wan_ipv4_mask: 0,
          wan_ipv6_mask: 0,
          pppoe_ip: '',
          pppoe_mac: '',
          default_gateway_v4: '',
          default_gateway_v6: '',
          dns_server: '',
          prefix_delegation_addr: '',
          prefix_delegation_mask: '',
          prefix_delegation_local: '',
        },
      );
      let config = models.copyConfigFrom(models.defaultMockConfigs[0]._id, {});
      let permissions = {...fieldsAndPermissions.cpePermissions[0]};
      let fields = {...fieldsAndPermissions.fields[0]};
      permissions['features'] = {hasIpv6Information: false};

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fields,
      );

      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device.acs_id, device, {
          common: {}, wan: {
            mask_ipv4: {writable: false, value: '24'},
            remote_address: {writable: false, value: '192.168.89.2'},
            remote_mac: {writable: false, value: 'AA:BB:CC:DD:EE:FF'},
            default_gateway: {writable: false, value: '192.168.80.1'},
            dns_servers: {writable: false, value: '8.8.8.8'},
          }, lan: {}, wifi2: {}, wifi5: {}, ipv6: {
            address: {writable: false, value: '2804:1234:5678::a1'},
            mask: {writable: false, value: '78'},
            default_gateway: {writable: false, value: '2804:1234:5678::a0'},
            prefix_address: {writable: false, value: '2804:1234:5679::'},
            prefix_mask: {writable: false, value: '64'},
            prefix_local_address:
              {writable: false, value: '2804:1234:5679::b1'},
          },
        },
        {grantWanLanInformation: true},
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
      expect(device.wan_ipv6).toBe('');
      expect(device.wan_ipv4_mask).toBe(24);
      expect(device.wan_ipv6_mask).toBe(0);
      expect(device.pppoe_ip).toBe('192.168.89.2');
      expect(device.pppoe_mac).toBe('AA:BB:CC:DD:EE:FF');
      expect(device.default_gateway_v4).toBe('192.168.80.1');
      expect(device.default_gateway_v6).toBe('');
      expect(device.dns_server).toBe('8.8.8.8');
      expect(device.prefix_delegation_addr).toBe('');
      expect(device.prefix_delegation_mask).toBe('');
      expect(device.prefix_delegation_local).toBe('');
    });


    // All WAN/LAN information
    test('All WAN/LAN information', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          connection_type: 'dhcp',
          wan_ipv6: '',
          wan_ipv4_mask: 0,
          wan_ipv6_mask: 0,
          pppoe_ip: '',
          pppoe_mac: '',
          default_gateway_v4: '',
          default_gateway_v6: '',
          dns_server: '',
          prefix_delegation_addr: '',
          prefix_delegation_mask: '',
          prefix_delegation_local: '',
        },
      );
      let config = models.copyConfigFrom(models.defaultMockConfigs[0]._id, {});
      let permissions = {...fieldsAndPermissions.cpePermissions[0]};
      let fields = {...fieldsAndPermissions.fields[0]};
      permissions['features'] = {hasIpv6Information: true};

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fields,
      );

      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device.acs_id, device, {
          common: {}, wan: {
            mask_ipv4: {writable: false, value: '24'},
            remote_address: {writable: false, value: '192.168.89.2'},
            remote_mac: {writable: false, value: 'AA:BB:CC:DD:EE:FF'},
            default_gateway: {writable: false, value: '192.168.80.1'},
            dns_servers: {writable: false, value: '8.8.8.8'},
          }, lan: {}, wifi2: {}, wifi5: {}, ipv6: {
            address: {writable: false, value: '2804:1234:5678::a1'},
            mask: {writable: false, value: '78'},
            default_gateway: {writable: false, value: '2804:1234:5678::a0'},
            prefix_address: {writable: false, value: '2804:1234:5679::'},
            prefix_mask: {writable: false, value: '64'},
            prefix_local_address:
              {writable: false, value: '2804:1234:5679::b1'},
          },
        },
        {grantWanLanInformation: true},
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
      expect(device.wan_ipv6).toBe('2804:1234:5678::a1');
      expect(device.wan_ipv4_mask).toBe(24);
      expect(device.wan_ipv6_mask).toBe(78);
      expect(device.pppoe_ip).toBe('192.168.89.2');
      expect(device.pppoe_mac).toBe('AA:BB:CC:DD:EE:FF');
      expect(device.default_gateway_v4).toBe('192.168.80.1');
      expect(device.default_gateway_v6).toBe('2804:1234:5678::a0');
      expect(device.dns_server).toBe('8.8.8.8');
      expect(device.prefix_delegation_addr).toBe('2804:1234:5679::');
      expect(device.prefix_delegation_mask).toBe('64');
      expect(device.prefix_delegation_local).toBe('2804:1234:5679::b1');
    });


    // WAN/LAN information - mask < 0
    test('WAN/LAN information - mask < 0', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          connection_type: 'dhcp',
          wan_ipv6: '',
          wan_ipv4_mask: 0,
          wan_ipv6_mask: 0,
          pppoe_ip: '',
          pppoe_mac: '',
          default_gateway_v4: '',
          default_gateway_v6: '',
          dns_server: '',
          prefix_delegation_addr: '',
          prefix_delegation_mask: '',
          prefix_delegation_local: '',
        },
      );
      let config = models.copyConfigFrom(models.defaultMockConfigs[0]._id, {});
      let permissions = {...fieldsAndPermissions.cpePermissions[0]};
      let fields = {...fieldsAndPermissions.fields[0]};
      permissions['features'] = {hasIpv6Information: true};

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fields,
      );

      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device.acs_id, device, {
          common: {}, wan: {
            mask_ipv4: {writable: false, value: '-1'},
          }, lan: {}, wifi2: {}, wifi5: {}, ipv6: {
            mask: {writable: false, value: '-1'},
          },
        },
        {grantWanLanInformation: true},
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
      expect(device.wan_ipv4_mask).toBe(0);
      expect(device.wan_ipv6_mask).toBe(0);
    });


    // WAN/LAN information - bigger mask value
    test('WAN/LAN information - bigger mask value', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          connection_type: 'dhcp',
          wan_ipv6: '',
          wan_ipv4_mask: 0,
          wan_ipv6_mask: 0,
          pppoe_ip: '',
          pppoe_mac: '',
          default_gateway_v4: '',
          default_gateway_v6: '',
          dns_server: '',
          prefix_delegation_addr: '',
          prefix_delegation_mask: '',
          prefix_delegation_local: '',
        },
      );
      let config = models.copyConfigFrom(models.defaultMockConfigs[0]._id, {});
      let permissions = {...fieldsAndPermissions.cpePermissions[0]};
      let fields = {...fieldsAndPermissions.fields[0]};
      permissions['features'] = {hasIpv6Information: true};

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fields,
      );

      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device.acs_id, device, {
          common: {}, wan: {
            mask_ipv4: {writable: false, value: '33'},
          }, lan: {}, wifi2: {}, wifi5: {}, ipv6: {
            mask: {writable: false, value: '129'},
          },
        },
        {grantWanLanInformation: true},
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
      expect(device.wan_ipv4_mask).toBe(0);
      expect(device.wan_ipv6_mask).toBe(0);
    });


    // WAN/LAN information - upper limit mask value
    test('WAN/LAN information - upper limit mask value', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          connection_type: 'dhcp',
          wan_ipv6: '',
          wan_ipv4_mask: 0,
          wan_ipv6_mask: 0,
          pppoe_ip: '',
          pppoe_mac: '',
          default_gateway_v4: '',
          default_gateway_v6: '',
          dns_server: '',
          prefix_delegation_addr: '',
          prefix_delegation_mask: '',
          prefix_delegation_local: '',
        },
      );
      let config = models.copyConfigFrom(models.defaultMockConfigs[0]._id, {});
      let permissions = {...fieldsAndPermissions.cpePermissions[0]};
      let fields = {...fieldsAndPermissions.fields[0]};
      permissions['features'] = {hasIpv6Information: true};

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fields,
      );

      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device.acs_id, device, {
          common: {}, wan: {
            mask_ipv4: {writable: false, value: '32'},
          }, lan: {}, wifi2: {}, wifi5: {}, ipv6: {
            mask: {writable: false, value: '128'},
          },
        },
        {grantWanLanInformation: true},
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
      expect(device.wan_ipv4_mask).toBe(32);
      expect(device.wan_ipv6_mask).toBe(128);
    });


    // WAN/LAN information - lower limit mask value
    test('WAN/LAN information - lower limit mask value', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          connection_type: 'dhcp',
          wan_ipv6: '',
          wan_ipv4_mask: 5,
          wan_ipv6_mask: 5,
          pppoe_ip: '',
          pppoe_mac: '',
          default_gateway_v4: '',
          default_gateway_v6: '',
          dns_server: '',
          prefix_delegation_addr: '',
          prefix_delegation_mask: '',
          prefix_delegation_local: '',
        },
      );
      let config = models.copyConfigFrom(models.defaultMockConfigs[0]._id, {});
      let permissions = {...fieldsAndPermissions.cpePermissions[0]};
      let fields = {...fieldsAndPermissions.fields[0]};
      permissions['features'] = {hasIpv6Information: true};

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fields,
      );

      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device.acs_id, device, {
          common: {}, wan: {
            mask_ipv4: {writable: false, value: '0'},
          }, lan: {}, wifi2: {}, wifi5: {}, ipv6: {
            mask: {writable: false, value: '0'},
          },
        },
        {grantWanLanInformation: true},
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
      expect(device.wan_ipv4_mask).toBe(0);
      expect(device.wan_ipv6_mask).toBe(0);
    });
  });


  describe('requestWanInformation', () => {
    // Invalid device - Undefined
    test('Invalid device - Undefined', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );

      // Execute
      acsDeviceInfoController.requestWanInformation(undefined);

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).toBeCalled();
    });


    // Invalid device - Null
    test('Invalid device - Null', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );

      // Execute
      acsDeviceInfoController.requestWanInformation(null);

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).toBeCalled();
    });


    // Invalid device - Non TR-069
    test('Invalid device - Not TR-069', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );

      // Execute
      acsDeviceInfoController.requestWanInformation({
        acs_id: '1234',
        use_tr069: false,
      });

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).toBeCalled();
    });


    // Invalid device - No acs_id
    test('Invalid device - No acs_id', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );

      // Execute
      acsDeviceInfoController.requestWanInformation({
        acs_id: '',
        use_tr069: true,
      });

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).toBeCalled();
    });


    // Unknown model
    test('Unknown model', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );

      // Execute
      acsDeviceInfoController.requestWanInformation({
        acs_id: '000000-EG8145X99999-0000000000000000',
        use_tr069: true,
      });

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).not.toBeCalled();
    });


    // No permission
    test('No permission', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        {
          features: {hasIpv6Information: true},
          wan: {
            hasIpv4MaskField: false,
            hasIpv4RemoteAddressField: false,
            hasIpv4RemoteMacField: false,
            hasIpv4DefaultGatewayField: false,
            hasDnsServerField: false,
          },
          ipv6: {
            hasAddressField: false,
            hasMaskField: false,
            hasDefaultGatewayField: false,
          },
        },
        {wan: {}, ipv6: {}},
      );

      // Execute
      acsDeviceInfoController.requestWanInformation({
        acs_id: '000000-EG8145X6-0000000000000000',
        use_tr069: true,
        connection_type: 'pppoe',
      });

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).not.toBeCalled();
    });


    // All permissions with no field
    test('All permissions with no field', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        {
          features: {hasIpv6Information: true},
          wan: {
            hasIpv4MaskField: true,
            hasIpv4RemoteAddressField: true,
            hasIpv4RemoteMacField: true,
            hasIpv4DefaultGatewayField: true,
            hasDnsServerField: true,
          },
          ipv6: {
            hasAddressField: true,
            hasMaskField: true,
            hasDefaultGatewayField: true,
          },
        },
        {wan: {}, ipv6: {}},
      );

      // Execute
      acsDeviceInfoController.requestWanInformation({
        acs_id: '000000-EG8145X6-0000000000000000',
        use_tr069: true,
        connection_type: 'pppoe',
      });

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).not.toBeCalled();
    });


    // All permissions PPPoE
    test('All permissions PPPoE', () => {
      let acsID = '000000-EG8145X6-0000000000000000';

      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        {
          features: {hasIpv6Information: true},
          wan: {
            hasIpv4MaskField: true,
            hasIpv4RemoteAddressField: true,
            hasIpv4RemoteMacField: true,
            hasIpv4DefaultGatewayField: true,
            hasDnsServerField: true,
          },
          ipv6: {
            hasAddressField: true,
            hasMaskField: true,
            hasDefaultGatewayField: true,
          },
        },
        {
          wan: {
            wan_ip_ppp: 'wan.wan_ip',
            mask_ipv4_ppp: 'wan.mask_ipv4',
            remote_address_ppp: 'wan.remote_address',
            remote_mac_ppp: 'wan.remote_mac',
            default_gateway_ppp: 'wan.default_gateway',
            dns_servers_ppp: 'wan.dns_servers',
          },
          ipv6: {
            address_ppp: 'ipv6.address',
            mask_ppp: 'ipv6.mask',
            default_gateway_ppp: 'ipv6.default_gateway',
          },
        },
      );

      // Execute
      acsDeviceInfoController.requestWanInformation({
        acs_id: acsID,
        use_tr069: true,
        connection_type: 'pppoe',
      });

      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(taskSpy).toBeCalledWith(
        acsID,
        {
          name: 'getParameterValues',
          parameterNames: [
            'wan.wan_ip',
            'wan.mask_ipv4',
            'wan.remote_address',
            'wan.remote_mac',
            'wan.default_gateway',
            'wan.dns_servers',
            'ipv6.address',
            'ipv6.mask',
            'ipv6.default_gateway',
          ],
        },
        expect.anything(),
      );
    });


    // All permissions DHCP
    test('All permissions DHCP', () => {
      let acsID = '000000-EG8145X6-0000000000000000';

      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        {
          features: {hasIpv6Information: true},
          wan: {
            hasIpv4MaskField: true,
            hasIpv4RemoteAddressField: true,
            hasIpv4RemoteMacField: true,
            hasIpv4DefaultGatewayField: true,
            hasDnsServerField: true,
          },
          ipv6: {
            hasAddressField: true,
            hasMaskField: true,
            hasDefaultGatewayField: true,
          },
        },
        {
          wan: {
            wan_ip: 'wan.wan_ip',
            mask_ipv4: 'wan.mask_ipv4',
            remote_address: 'wan.remote_address',
            remote_mac: 'wan.remote_mac',
            default_gateway: 'wan.default_gateway',
            dns_servers: 'wan.dns_servers',
          },
          ipv6: {
            address: 'ipv6.address',
            mask: 'ipv6.mask',
            default_gateway: 'ipv6.default_gateway',
          },
        },
      );

      // Execute
      acsDeviceInfoController.requestWanInformation({
        acs_id: acsID,
        use_tr069: true,
        connection_type: 'dhcp',
      });

      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(taskSpy).toBeCalledWith(
        acsID,
        {
          name: 'getParameterValues',
          parameterNames: [
            'wan.wan_ip',
            'wan.mask_ipv4',
            'wan.remote_address',
            'wan.remote_mac',
            'wan.default_gateway',
            'wan.dns_servers',
            'ipv6.address',
            'ipv6.mask',
            'ipv6.default_gateway',
          ],
        },
        expect.anything(),
      );
    });


    // Each permission
    test.each([
      ['hasIpv4MaskField', 'mask_ipv4_ppp', 'wan'],
      ['hasIpv4RemoteAddressField', 'remote_address_ppp', 'wan'],
      ['hasIpv4RemoteMacField', 'remote_mac_ppp', 'wan'],
      ['hasIpv4DefaultGatewayField', 'default_gateway_ppp', 'wan'],
      ['hasDnsServerField', 'dns_servers_ppp', 'wan'],
      ['hasAddressField', 'address_ppp', 'ipv6'],
      ['hasMaskField', 'mask_ppp', 'ipv6'],
      ['hasDefaultGatewayField', 'default_gateway_ppp', 'ipv6'],
    ])('Each permissions: %s', (permission, field, section) => {
      let acsID = '000000-EG8145X6-0000000000000000';
      let permissions = {
        features: {hasIpv6Information: true},
        wan: {
          hasIpv4MaskField: false,
          hasIpv4RemoteAddressField: false,
          hasIpv4RemoteMacField: false,
          hasIpv4DefaultGatewayField: false,
          hasDnsServerField: false,
        },
        ipv6: {
          hasAddressField: false,
          hasMaskField: false,
          hasDefaultGatewayField: false,
        },
      };
      let fields = {
        wan: {
          wan_ip_ppp: 'wan.wan_ip',
          mask_ipv4_ppp: '',
          remote_address_ppp: '',
          remote_mac_ppp: '',
          default_gateway_ppp: '',
          dns_servers_ppp: '',
        },
        ipv6: {
          address_ppp: '',
          mask_ppp: '',
          default_gateway_ppp: '',
        },
      };


      // Change the permission and field
      permissions[section][permission] = true;
      fields[section][field] = section + field;


      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fields,
      );

      // Execute
      acsDeviceInfoController.requestWanInformation({
        acs_id: acsID,
        use_tr069: true,
        connection_type: 'pppoe',
      });

      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(taskSpy).toBeCalledWith(
        acsID,
        {
          name: 'getParameterValues',
          parameterNames: [
            'wan.wan_ip',
            section + field,
          ],
        },
        expect.anything(),
      );
    });
  });


  describe('requestLanInformation', () => {
    // Invalid device - Undefined
    test('Invalid device - Undefined', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );

      // Execute
      acsDeviceInfoController.requestLanInformation(undefined);

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).toBeCalled();
    });


    // Invalid device - Null
    test('Invalid device - Null', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );

      // Execute
      acsDeviceInfoController.requestLanInformation(null);

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).toBeCalled();
    });


    // Invalid device - Non TR-069
    test('Invalid device - Not TR-069', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );

      // Execute
      acsDeviceInfoController.requestLanInformation({
        acs_id: '1234',
        use_tr069: false,
      });

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).toBeCalled();
    });


    // Invalid device - No acs_id
    test('Invalid device - No acs_id', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );

      // Execute
      acsDeviceInfoController.requestLanInformation({
        acs_id: '',
        use_tr069: true,
      });

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).toBeCalled();
    });


    // Unknown model
    test('Unknown model', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );

      // Execute
      acsDeviceInfoController.requestLanInformation({
        acs_id: '000000-EG8145X99999-0000000000000000',
        use_tr069: true,
      });

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).not.toBeCalled();
    });


    // No IPv6 Information
    test('No IPv6 Information', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        {
          features: {hasIpv6Information: false},
          ipv6: {},
        },
        {ipv6: {}},
      );

      // Execute
      acsDeviceInfoController.requestLanInformation({
        acs_id: '000000-EG8145X99999-0000000000000000',
        use_tr069: true,
      });

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).not.toBeCalled();
    });


    // No permission
    test('No permission', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        {
          features: {hasIpv6Information: true},
          ipv6: {
            hasPrefixDelegationAddressField: false,
            hasPrefixDelegationMaskField: false,
            hasPrefixDelegationLocalAddressField: false,
          },
        },
        {wan: {}, ipv6: {}},
      );

      // Execute
      acsDeviceInfoController.requestLanInformation({
        acs_id: '000000-EG8145X6-0000000000000000',
        use_tr069: true,
        connection_type: 'pppoe',
      });

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).not.toBeCalled();
    });


    // All permissions with no field
    test('All permissions with no field', () => {
      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        {
          features: {hasIpv6Information: true},
          ipv6: {
            hasPrefixDelegationAddressField: true,
            hasPrefixDelegationMaskField: true,
            hasPrefixDelegationLocalAddressField: true,
          },
        },
        {wan: {}, ipv6: {}},
      );

      // Execute
      acsDeviceInfoController.requestLanInformation({
        acs_id: '000000-EG8145X6-0000000000000000',
        use_tr069: true,
        connection_type: 'pppoe',
      });

      // Validate
      expect(taskSpy).not.toBeCalled();
      expect(errorSpy).not.toBeCalled();
    });


    // All permissions PPPoE
    test('All permissions PPPoE', () => {
      let acsID = '000000-EG8145X6-0000000000000000';

      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        {
          features: {hasIpv6Information: true},
          ipv6: {
            hasPrefixDelegationAddressField: true,
            hasPrefixDelegationMaskField: true,
            hasPrefixDelegationLocalAddressField: true,
          },
        },
        {
          ipv6: {
            prefix_delegation_address_ppp: 'address',
            prefix_delegation_mask_ppp: 'mask',
            prefix_delegation_local_address_ppp: 'local.address',
          },
        },
      );

      // Execute
      acsDeviceInfoController.requestLanInformation({
        acs_id: acsID,
        use_tr069: true,
        connection_type: 'pppoe',
      });

      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(taskSpy).toBeCalledWith(
        acsID,
        {
          name: 'getParameterValues',
          parameterNames: [
            'address',
            'mask',
            'local.address',
          ],
        },
        expect.anything(),
      );
    });


    // All permissions DHCP
    test('All permissions DHCP', () => {
      let acsID = '000000-EG8145X6-0000000000000000';

      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        {
          features: {hasIpv6Information: true},
          ipv6: {
            hasPrefixDelegationAddressField: true,
            hasPrefixDelegationMaskField: true,
            hasPrefixDelegationLocalAddressField: true,
          },
        },
        {
          ipv6: {
            prefix_delegation_address: 'address',
            prefix_delegation_mask: 'mask',
            prefix_delegation_local_address: 'local.address',
          },
        },
      );

      // Execute
      acsDeviceInfoController.requestLanInformation({
        acs_id: acsID,
        use_tr069: true,
        connection_type: 'dhcp',
      });

      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(taskSpy).toBeCalledWith(
        acsID,
        {
          name: 'getParameterValues',
          parameterNames: [
            'address',
            'mask',
            'local.address',
          ],
        },
        expect.anything(),
      );
    });


    // Each permission
    test.each([
      ['hasPrefixDelegationAddressField', 'prefix_delegation_address'],
      ['hasPrefixDelegationMaskField', 'prefix_delegation_mask'],
      [
        'hasPrefixDelegationLocalAddressField',
        'prefix_delegation_local_address',
      ],
    ])('Each permissions: %s', (permission, field) => {
      let acsID = '000000-EG8145X6-0000000000000000';
      let permissions = {
        features: {hasIpv6Information: true},
        ipv6: {
          hasPrefixDelegationAddressField: false,
          hasPrefixDelegationMaskField: false,
          hasPrefixDelegationLocalAddressField: false,
        },
      };
      let fields = {
        ipv6: {
          prefix_delegation_address: '',
          prefix_delegation_mask: '',
          prefix_delegation_local_address: '',
        },
      };


      // Change the permission and field
      permissions['ipv6'][permission] = true;
      fields['ipv6'][field] = field;


      // Mocks
      let taskSpy = jest.spyOn(tasksAPI, 'addTask').mockImplementation(
        () => true,
      );
      let errorSpy = jest.spyOn(console, 'error').mockImplementation(
        () => true,
      );
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fields,
      );

      // Execute
      acsDeviceInfoController.requestLanInformation({
        acs_id: acsID,
        use_tr069: true,
        connection_type: 'dhcp',
      });

      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(taskSpy).toBeCalledWith(
        acsID,
        {
          name: 'getParameterValues',
          parameterNames: [
            field,
          ],
        },
        expect.anything(),
      );
    });
  });


  describe('requestSync', () => {
    // All parameters and fields
    test('All parameters and fields', async () => {
      const device = models.defaultMockDevices[0];
      let devicePermissions = fieldsAndPermissions.devicePermissions[0];


      // Mocks
      jest.spyOn(deviceVersion, 'devicePermissions')
        .mockImplementation(() => devicePermissions);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      let taskSpy = jest.spyOn(tasksAPI, 'addTask')
        .mockImplementation(() => true);


      // Execute
      await acsDeviceInfoController.requestSync(device);


      // Validate
      let parameterNames = [];
      parameterNames = parameterNames.concat(
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].common,
        ),
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].wan,
        ),
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].lan,
        ),
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].ipv6,
        ),
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].wifi2,
        ),
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].wifi5,
        ),
      );

      // Remove unused fields
      parameterNames = parameterNames.filter((field) => {
        let removeFields = [
          'common.hw_version', 'common.mac', 'common.model',
          'lan.config_enable', 'lan.dns_servers',
          'lan.ip_routers', 'lan.lease_max_ip', 'lan.lease_min_ip',
          'wan.pon_rxpower_epon', 'wan.pon_txpower_epon', 'wifi2.beacon_type',
          'wifi5.beacon_type',
        ];
        if (removeFields.includes(field)) return false;
        return true;
      });

      expect(taskSpy.mock.calls[0][0]).toBe(device.acs_id);
      expect(taskSpy.mock.calls[0][1].name).toBe('getParameterValues');
      expect(taskSpy.mock.calls[0][1].parameterNames.sort())
        .toStrictEqual(parameterNames.sort());
    });


    // All permissions with no fields
    test('All permissions with no fields', async () => {
      const device = models.defaultMockDevices[0];
      let devicePermissions = fieldsAndPermissions.devicePermissions[0];
      let fields = {...fieldsAndPermissions.fields[0]};

      fields.ipv6 = fieldsAndPermissions.setAllObjectValues(
        fields.ipv6, '',
      );

      let wan = {...fields.wan};
      wan.mask_ipv4 = '';
      wan.mask_ipv4_ppp = '';
      wan.remote_address = '';
      wan.remote_address_ppp = '';
      wan.remote_mac = '';
      wan.remote_mac_ppp = '';
      wan.default_gateway = '';
      wan.default_gateway_ppp = '';
      wan.dns_servers = '';
      wan.dns_servers_ppp = '';
      fields.wan = wan;


      // Mocks
      jest.spyOn(deviceVersion, 'devicePermissions')
        .mockImplementation(() => devicePermissions);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fields,
      );
      let taskSpy = jest.spyOn(tasksAPI, 'addTask')
        .mockImplementation(() => true);


      // Execute
      await acsDeviceInfoController.requestSync(device);


      // Validate
      let parameterNames = [];
      parameterNames = parameterNames.concat(
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].common,
        ),
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].wan,
        ),
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].lan,
        ),
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].wifi2,
        ),
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].wifi5,
        ),
      );

      // Remove unused fields
      parameterNames = parameterNames.filter((field) => {
        let removeFields = [
          'common.hw_version', 'common.mac', 'common.model',
          'lan.config_enable', 'lan.dns_servers',
          'lan.ip_routers', 'lan.lease_max_ip', 'lan.lease_min_ip',
          'wan.pon_rxpower_epon', 'wan.pon_txpower_epon', 'wifi2.beacon_type',
          'wifi5.beacon_type', 'wan.mask_ipv4', 'wan.mask_ipv4_ppp',
          'wan.remote_address', 'wan.remote_address_ppp', 'wan.remote_mac',
          'wan.remote_mac_ppp', 'wan.default_gateway',
          'wan.default_gateway_ppp', 'wan.dns_servers', 'wan.dns_servers_ppp',
        ];
        if (removeFields.includes(field)) return false;
        return true;
      });

      expect(taskSpy.mock.calls[0][0]).toBe(device.acs_id);
      expect(taskSpy.mock.calls[0][1].name).toBe('getParameterValues');
      expect(taskSpy.mock.calls[0][1].parameterNames.sort())
        .toStrictEqual(parameterNames.sort());
    });


    // Without WAN and LAN information
    test('Without WAN and LAN information', async () => {
      const device = models.defaultMockDevices[0];
      let devicePermissions = {...fieldsAndPermissions.devicePermissions[0]};
      devicePermissions.grantWanLanInformation = false;


      // Mocks
      jest.spyOn(deviceVersion, 'devicePermissions')
        .mockImplementation(() => devicePermissions);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      let taskSpy = jest.spyOn(tasksAPI, 'addTask')
        .mockImplementation(() => true);


      // Execute
      await acsDeviceInfoController.requestSync(device);


      // Validate
      let parameterNames = fieldsAndPermissions.getAllObjectValues(
        fieldsAndPermissions.fields[0].ipv6,
      );
      parameterNames.push(fieldsAndPermissions.fields[0].wan.mask_ipv4);
      parameterNames.push(fieldsAndPermissions.fields[0].wan.mask_ipv4_ppp);

      parameterNames.push(fieldsAndPermissions.fields[0].wan.remote_address);
      parameterNames.push(fieldsAndPermissions.fields[0].wan
        .remote_address_ppp,
      );

      parameterNames.push(fieldsAndPermissions.fields[0].wan.remote_mac);
      parameterNames.push(fieldsAndPermissions.fields[0].wan
        .remote_mac_ppp,
      );

      parameterNames.push(fieldsAndPermissions.fields[0].wan.default_gateway);
      parameterNames.push(fieldsAndPermissions.fields[0].wan
        .default_gateway_ppp,
      );

      parameterNames.push(fieldsAndPermissions.fields[0].wan.dns_servers);
      parameterNames.push(fieldsAndPermissions.fields[0].wan
        .dns_servers_ppp,
      );

      expect(taskSpy.mock.calls[0][0]).toBe(device.acs_id);
      expect(taskSpy.mock.calls[0][1].name).toBe('getParameterValues');
      expect(taskSpy.mock.calls[0][1].parameterNames).not
        .toContain(parameterNames);
    });


    // WAN and LAN information with no IPv6
    test('WAN and LAN information with no IPv6', async () => {
      const device = models.defaultMockDevices[0];
      let devicePermissions = fieldsAndPermissions.devicePermissions[0];
      let cpePermissions = {...fieldsAndPermissions.cpePermissions[0]};
      cpePermissions.features.hasIpv6Information = false;


      // Mocks
      jest.spyOn(deviceVersion, 'devicePermissions')
        .mockImplementation(() => devicePermissions);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        cpePermissions,
        fieldsAndPermissions.fields[0],
      );
      let taskSpy = jest.spyOn(tasksAPI, 'addTask')
        .mockImplementation(() => true);


      // Execute
      await acsDeviceInfoController.requestSync(device);


      // Validate
      let parameterNames = [];
      parameterNames = parameterNames.concat(
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].common,
        ),
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].wan,
        ),
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].lan,
        ),
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].wifi2,
        ),
        fieldsAndPermissions.getAllObjectValues(
          fieldsAndPermissions.fields[0].wifi5,
        ),
      );

      // Remove unused fields
      parameterNames = parameterNames.filter((field) => {
        let removeFields = [
          'common.hw_version', 'common.mac', 'common.model',
          'lan.config_enable', 'lan.dns_servers',
          'lan.ip_routers', 'lan.lease_max_ip', 'lan.lease_min_ip',
          'wan.pon_rxpower_epon', 'wan.pon_txpower_epon', 'wifi2.beacon_type',
          'wifi5.beacon_type',
        ];
        if (removeFields.includes(field)) return false;
        return true;
      });
      let parameterNamesNotContain = fieldsAndPermissions.getAllObjectValues(
        fieldsAndPermissions.fields[0].ipv6,
      );

      expect(taskSpy.mock.calls[0][0]).toBe(device.acs_id);
      expect(taskSpy.mock.calls[0][1].name).toBe('getParameterValues');
      expect(taskSpy.mock.calls[0][1].parameterNames.sort())
        .toStrictEqual(parameterNames.sort());
      expect(taskSpy.mock.calls[0][1].parameterNames).not
        .toContain(parameterNamesNotContain);
    });
  });


  describe('fetchSyncResult', () => {
    // Invalid acs ID
    test('Invalid acs ID', async () => {
      const device = models.defaultMockDevices[0];

      let parameterNames = fieldsAndPermissions.getAllObjectValues(
        fieldsAndPermissions.fields[0],
      );

      const cpe = devicesAPI.instantiateCPEByModelFromDevice(device).cpe;


      // Mocks
      let requestEndSpy = jest.fn();
      let requestSpy = jest.spyOn(http, 'request').mockImplementation(() => {
        return {
          end: requestEndSpy,
        };
      });


      // Execute
      await acsDeviceInfoController.__testFetchSyncResult(
        '', [], parameterNames, cpe,
      );

      // Validate
      expect(requestSpy).toBeCalled();
      expect(requestEndSpy).toBeCalled();
    });


    // Invalid parameter names
    test('Invalid parameter names', async () => {
      const device = models.defaultMockDevices[0];

      const cpe = devicesAPI.instantiateCPEByModelFromDevice(device).cpe;


      // Mocks
      let requestEndSpy = jest.fn();
      let requestSpy = jest.spyOn(http, 'request').mockImplementation(() => {
        return {
          end: requestEndSpy,
        };
      });


      // Execute
      await acsDeviceInfoController.__testFetchSyncResult(
        device.acs_id, [], [], cpe,
      );

      // Validate
      expect(requestSpy).toBeCalled();
      expect(requestEndSpy).toBeCalled();
    });


    // Invalid cpe
    test('Invalid cpe', async () => {
      const device = {...models.defaultMockDevices[0]};
      device.acs_id = '';

      let parameterNames = fieldsAndPermissions.getAllObjectValues(
        fieldsAndPermissions.fields[0],
      );

      const cpe = devicesAPI.instantiateCPEByModelFromDevice(device).cpe;


      // Mocks
      let requestEndSpy = jest.fn();
      let requestSpy = jest.spyOn(http, 'request').mockImplementation(() => {
        return {
          end: requestEndSpy,
        };
      });


      // Execute
      await acsDeviceInfoController.__testFetchSyncResult(
        device.acs_id, [], parameterNames, cpe,
      );

      // Validate
      expect(requestSpy).toBeCalled();
      expect(requestEndSpy).toBeCalled();
    });


    // No data to fetch
    test('No data to fetch', async () => {
      const device = {...models.defaultMockDevices[0]};
      device.acs_id = '';

      let parameterNames = fieldsAndPermissions.getAllObjectValues(
        fieldsAndPermissions.fields[0],
      );

      const cpe = devicesAPI.instantiateCPEByModelFromDevice(device).cpe;
      let data = '';


      // Mocks
      utils.common.mockDevices(null, 'findOne');
      let nestedSpy = jest.spyOn(utilHandlers, 'getFromNestedKey')
        .mockImplementation(() => undefined);
      let permissionSpy = jest.spyOn(DeviceVersion, 'devicePermissions')
        .mockImplementation(() => true);
      let requestEndSpy = jest.fn();
      let requestSpy = jest.spyOn(http, 'request')
        .mockImplementation((options, callback) => {
          callback({
            setEncoding: () => true,
            on: async (type, callback2) => {
              if (type === 'data') callback2(data);
              if (type === 'end') await callback2();
            },
          });

          return {
            end: requestEndSpy,
          };
      });


      // Execute
      await acsDeviceInfoController.__testFetchSyncResult(
        device.acs_id, [], parameterNames, cpe,
      );

      // Validate
      expect(requestSpy).toBeCalled();
      expect(requestEndSpy).toBeCalled();
      expect(permissionSpy).not.toBeCalled();
      expect(nestedSpy).not.toBeCalled();
    });


    // All data to fetch
    test('All data to fetch', async () => {
      const device = {...models.defaultMockDevices[0]};
      device.acs_id = '';

      let parameterNames = fieldsAndPermissions.getAllObjectValues(
        fieldsAndPermissions.fields[0],
      );

      const cpe = devicesAPI.instantiateCPEByModelFromDevice(device).cpe;
      let data = '';
      const dataToFetch = {
        basic: true, alt_uid: true, web_admin_user: true, web_admin_pass: true,
        wan: true, ipv6: true, vlan: true, vlan_ppp: true, bytes: true,
        pon: true, lan: true, wifi2: true, wifiMode: true, wifiBand: true,
        wifi5: true, mesh2: true, mesh5: true, port_forward: true, stun: true,
        fields: fieldsAndPermissions.fields[0],
      };


      // Mocks
      utils.common.mockDevices(null, 'findOne');
      let nestedSpy = jest.spyOn(utilHandlers, 'getFromNestedKey')
        .mockImplementation(() => undefined);
      let permissionSpy = jest.spyOn(DeviceVersion, 'devicePermissions')
        .mockImplementation(() => true);
      let requestEndSpy = jest.fn();
      let requestSpy = jest.spyOn(http, 'request')
        .mockImplementation((options, callback) => {
          callback({
            setEncoding: () => true,
            on: async (type, callback2) => {
              if (type === 'data') callback2(data);
              if (type === 'end') await callback2();
            },
          });

          return {
            end: requestEndSpy,
          };
      });


      // Execute
      await acsDeviceInfoController.__testFetchSyncResult(
        device.acs_id, dataToFetch, parameterNames, cpe,
      );


      // Validate
      expect(requestSpy).toBeCalled();
      expect(requestEndSpy).toBeCalled();
      expect(permissionSpy).not.toBeCalled();
      expect(nestedSpy).toBeCalledTimes(77);
    });
  });

describe('syncDeviceData', () => {
    // Not updating
    test('Not updating', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: false,
          release: '1234',
          installed_release: '12345',
        },
      );

      // Mocks
      utils.common.mockDefaultConfigs();
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
    });


    // Updating different release same version
    test('Updating different release same version', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: true,
          release: '1234',
          installed_release: '12345',
        },
      );

      // Mocks
      utils.common.mockDefaultConfigs();
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '12345'},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
    });


    // Updating different release and version
    test('Updating different release and version', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: true,
          release: '1234',
          installed_release: '12345',
        },
      );

      // Mocks
      utils.common.mockDefaultConfigs();
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).toBeCalled();
    });


    // Updating same release and version
    test('Updating same release and version', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: true,
          release: '1234',
          installed_release: '1234',
        },
      );

      // Mocks
      utils.common.mockDefaultConfigs();
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).toBeCalled();
    });


    // Updating web admin login by tr069 reset
    test('Updating web admin login by tr069 reset', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: false,
          release: '1234',
          installed_release: '1234',
          recovering_tr069_reset: true,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: 'teste123',
            web_password: 'teste567',
          },
        },
      );

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
            web_admin_username: {writable: true},
            web_admin_password: {writable: true},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).toBeCalledWith(
        device,
        {
          common: {
            web_admin_username: config.tr069.web_login,
            web_admin_password: config.tr069.web_password,
          },
          lan: {}, stun: {}, wan: {},
          wifi2: {
            password: models.defaultMockDevices[0].wifi_password,
          },
          wifi5: {
            password: models.defaultMockDevices[0].wifi_password_5ghz,
          },
        },
      );
    });


    // Updating web admin login by upgrade
    test('Updating web admin login by upgrade', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: true,
          release: '1234',
          installed_release: '5678',
          recovering_tr069_reset: false,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: 'teste123',
            web_password: 'teste567',
          },
        },
      );

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
            web_admin_username: {writable: true},
            web_admin_password: {writable: true},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).toBeCalled();
      expect(updateInfoSpy).toBeCalledWith(
        device,
        {
          common: {
            web_admin_username: config.tr069.web_login,
            web_admin_password: config.tr069.web_password,
          },
          lan: {}, stun: {}, wan: {}, wifi2: {}, wifi5: {},
        },
      );
    });


    // Update web admin login due to missing fields
    test('Update web admin login due to missing fields', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: false,
          release: '1234',
          installed_release: '1234',
          recovering_tr069_reset: false,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: 'teste123',
            web_password: 'teste567',
          },
        },
      );

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
            web_admin_username: {writable: true},
            web_admin_password: {writable: true},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).toBeCalledWith(
        device,
        {
          common: {
            web_admin_username: config.tr069.web_login,
            web_admin_password: config.tr069.web_password,
          },
          lan: {}, stun: {}, wan: {}, wifi2: {}, wifi5: {},
        },
      );
    });


    // Not update web admin login due to same fields
    test('Not update web admin login due to same fields', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: false,
          release: '1234',
          installed_release: '1234',
          recovering_tr069_reset: false,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: 'teste123',
            web_password: 'teste567',
          },
        },
      );

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
            web_admin_username: {
              value: config.tr069.web_login,
              writable: true,
            },
            web_admin_password: {
              value: config.tr069.web_password,
              writable: true,
            },
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
    });


    // Not update web admin login due config
    test('Not update web admin login due config', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: true,
          release: '1234',
          installed_release: '5678',
          recovering_tr069_reset: false,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: '',
            web_password: '',
          },
        },
      );

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
            web_admin_username: {writable: true},
            web_admin_password: {writable: true},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
    });


    // Not update web admin login due to not writable
    test('Not update web admin login due to not writable', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: true,
          release: '1234',
          installed_release: '5678',
          recovering_tr069_reset: false,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: 'teste123',
            web_password: 'teste321',
          },
        },
      );

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
            web_admin_username: {writable: false},
            web_admin_password: {writable: false},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
    });


    // Not update web admin login due data
    test('Not update web admin login due data', async () => {
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {
          _id: '1',
          do_update: true,
          release: '1234',
          installed_release: '5678',
          recovering_tr069_reset: false,
        },
      );
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          tr069: {
            web_login: 'teste123',
            web_password: 'teste321',
          },
        },
      );

      // Mocks
      utils.common.mockConfigs(config, 'findOne');
      let successUpdateSpy = jest.spyOn(updateSchedulerCommon, 'successUpdate')
        .mockImplementationOnce(() => true);
      let updateInfoSpy = jest.spyOn(acsDeviceInfoController, 'updateInfo')
        .mockImplementationOnce(() => true);
      device.save = function() {
        return new Promise((resolve) => {
          resolve();
        });
      };


      // Execute the request
      await acsDeviceInfoController.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
          },
          wan: {}, lan: {}, wifi2: {}, wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).toBeCalled();
      expect(updateInfoSpy).not.toBeCalled();
    });
  });
});
