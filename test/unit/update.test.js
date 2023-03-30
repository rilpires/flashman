require('../../bin/globals');

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const utils = require('../common/utils');
const models = require('../common/models');

// Mock the config (used in language.js)
utils.common.mockConfigs(models.defaultMockConfigs, 'findOne');

const testUtils = require('../utils');
const updateSchedulerCommon = require(
  '../../controllers/update_scheduler_common',
);
const acsDeviceInfo = require(
  '../../controllers/acs_device_info',
);
const deviceListController = require('../../controllers/device_list');
const devicesAPI = require('../../controllers/external-genieacs/devices-api');
const deviceVersion = require('../../models/device_version');
const tasksAPI = require('../../controllers/external-genieacs/tasks-api');

const fs = require('fs');
const path = require('path');

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

let wanDataSuccess = fs.readFileSync(
  path.resolve(
    __dirname, '../assets/flashman-test/genie-data/wan_data_success.json',
  ), 'utf8',
);

const mockRequest = (params, user, body) => {
  return {params: params, user: user, body: body};
};

let calculateExpectedDns = (dnsServers, oldSubnet, newSubnet) => {
  let newLanDns = [];
  for (let i=0; i<dnsServers.length; i++) {
    // Replaces the address referring to the old subnet value
    // only if it is no longer contained in the DNS server list
    if (dnsServers[i] === oldSubnet && !dnsServers.includes(newSubnet) &&
       !newLanDns.includes(newSubnet)) {
      newLanDns.push(newSubnet);
    } else if (dnsServers[i] !== oldSubnet &&
              !newLanDns.includes(dnsServers[i])) {
      // Otherwise, it keeps the addresses in the list, taking
      // care not to add duplicate addresses
      newLanDns.push(dnsServers[i]);
    }
  }
  return newLanDns.join(',');
};

let convertSubnetMaskToRange = (mask) => {
  // Deep copy of basicCPEModel.convertSubnetMaskToRange
  if (mask === '255.255.255.0' || mask === 24) {
    return {min: '33', max: '254'};
  } else if (mask === '255.255.255.128' || mask === 25) {
    return {min: '161', max: '254'};
  } else if (mask === '255.255.255.192' || mask === 26) {
    return {min: '225', max: '254'};
  }
  return {};
};

let calculateExpectedRangesIp = (netmask, subnet) => {
  let dhcpRanges = convertSubnetMaskToRange(netmask);
  let networkPrefix = subnet.split('.').slice(0, 3).join('.');
  if (!dhcpRanges.min || !dhcpRanges.max) return {minIP: null, maxIP: null};
  return {
    minIP: networkPrefix + '.' + dhcpRanges.min,
    maxIP: networkPrefix + '.' + dhcpRanges.max,
  };
};

// Test updates
describe('Update Tests - Functions', () => {
  // Reset all mocks
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('syncDeviceData Tests', () => {
    // syncDeviceData - Not updating
    test('Validate syncDeviceData - Not updating', async () => {
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
      await acsDeviceInfo.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
          },
          wan: {},
          lan: {},
          wifi2: {},
          wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
    });

    // syncDeviceData - Updating different release same version
    test(
      'Validate syncDeviceData - Updating different release same version',
      async () => {
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
      await acsDeviceInfo.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '12345'},
          },
          wan: {},
          lan: {},
          wifi2: {},
          wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).not.toBeCalled();
    });

    // syncDeviceData - Updating different release and version
    test(
      'Validate syncDeviceData - Updating different release and version',
      async () => {
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
      await acsDeviceInfo.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
          },
          wan: {},
          lan: {},
          wifi2: {},
          wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).toBeCalled();
    });

    // syncDeviceData - Updating same release and version
    test(
      'Validate syncDeviceData - Updating same release and version',
      async () => {
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
      await acsDeviceInfo.__testSyncDeviceData(
        device._id,
        device,
        {
          common: {
            version: {value: '1234'},
          },
          wan: {},
          lan: {},
          wifi2: {},
          wifi5: {},
        },
        {
          grantMeshV2HardcodedBssid: null,
        },
      );

      // Validate
      expect(successUpdateSpy).toBeCalled();
    });
  });

  describe('replaceWanFieldsWildcards Tests', () => {
    // Validate replaceWanFieldsWildcards - Happy Case
    test(
      'Validate replaceWanFieldsWildcards - Happy Case',
      async () => {
        const id = models.defaultMockDevices[0]._id;
        let device = models.copyDeviceFrom(
          id,
          {
            _id: '94:25:33:3B:D1:C2',
            acs_id: '00259E-EG8145V5-48575443A94196A5',
            model: 'EG8145V5',
            version: 'V5R020C00S280',
          },
        );
        let deviceFields = devicesAPI.instantiateCPEByModelFromDevice(device)
          .cpe.getModelFields();

        let expectedFieldName =
          deviceFields['wan']['mtu_ppp'].replace(/\*/g, '1');

        let changes = {
          wan: {mtu_ppp: 1487},
          lan: {},
          wifi2: {ssid: 'Anlix-Teste'},
          wifi5: {},
          mesh2: {},
          mesh5: {},
        };

        let task = {
          name: 'setParameterValues',
          parameterValues: [
            [
              deviceFields['wan']['mtu_ppp'],
              changes.wan.mtu_ppp,
              'xsd:unsignedInt',
            ],
            [
              deviceFields['wifi2']['ssid'],
              changes.wifi2.ssid,
              'xsd:string',
            ],
          ],
        };

        // It is expected that the function will change only the fields of the
        // task referring to the WAN
        let expectedTask = {
          name: 'setParameterValues',
          parameterValues: [
            [
              expectedFieldName,
              changes.wan.mtu_ppp,
              'xsd:unsignedInt',
            ],
            [
              deviceFields['wifi2']['ssid'],
              changes.wifi2.ssid,
              'xsd:string',
            ],
          ],
        };

        // Spies
        jest.spyOn(tasksAPI, 'getFromCollection')
          .mockImplementation(() => JSON.parse('[' + wanDataSuccess + ']'));

        // Execute function
        let ret = await acsDeviceInfo.__testReplaceWanFieldsWildcards(
          id, false, deviceFields, changes, task,
        );

        // Validate
        expect(ret).toStrictEqual({'success': true, 'task': expectedTask});
      },
    );

    // Validate replaceWanFieldsWildcards - Error fetching genie data: Expect
    // success false
    test(
      'Validate replaceWanFieldsWildcards - Unable to replace wildcards',
      async () => {
        const id = models.defaultMockDevices[0]._id;
        let device = models.copyDeviceFrom(
          id,
          {
            _id: '94:25:33:3B:D1:C2',
            acs_id: '00259E-EG8145V5-48575443A94196A5',
            model: 'EG8145V5',
            version: 'V5R020C00S280',
          },
        );
        let deviceFields = devicesAPI.instantiateCPEByModelFromDevice(device)
          .cpe.getModelFields();

        let changes = {
          wan: {mtu_ppp: 1487},
          lan: {},
          wifi2: {ssid: 'Anlix-Teste'},
          wifi5: {},
          mesh2: {},
          mesh5: {},
        };

        let task = {}; // Empty task - It doesn't matter

        // Spies
        jest.spyOn(tasksAPI, 'getFromCollection')
          .mockImplementation(() => [{_id: id}]);

        // Execute
        let ret = await acsDeviceInfo.__testReplaceWanFieldsWildcards(
          id, false, deviceFields, changes, task,
        );

        // Validate
        expect(ret).toStrictEqual({'success': false, 'task': undefined});
      },
    );
  });

  describe('updateInfo Tests', () => {
    // Validate updateInfo - Happy Case
    test(
      'Validate updateInfo - Happy Case',
      async () => {
        const id = models.defaultMockDevices[0]._id;
        const device = models.copyDeviceFrom(
          id,
          {
            _id: '94:25:33:3B:D1:C2',
            acs_id: '00259E-EG8145V5-48575443A94196A5',
            model: 'EG8145V5',
            version: 'V5R020C00S280',
          },
        );
        let deviceFields = devicesAPI.instantiateCPEByModelFromDevice(device)
          .cpe.getModelFields();

        const config = models.copyConfigFrom(
          models.defaultMockConfigs[0]._id,
          {
            _id: '84b9f57c7beaae3b4f9d4656',
            is_default: true,
            device_update_schedule: false,
          },
        );

        let changes = {
          wan: {mtu_ppp: 1487},
          lan: {},
          wifi2: {ssid: 'Anlix-Teste'},
          wifi5: {},
          mesh2: {},
          mesh5: {},
        };

        let projection = Object.keys(changes.wan).map((k)=>{
          if (!deviceFields.wan[k]) return;
          return deviceFields.wan[k].split('.*')[0];
        }).join(',');

        let expectedTask = {
          name: 'setParameterValues',
          parameterValues: [
            [
              deviceFields['wan']['mtu_ppp'].replace(/\*/g, '1'),
              changes.wan.mtu_ppp,
              'xsd:unsignedInt',
            ],
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
        };

        // Mocks
        utils.common.mockConfigs(config, 'findOne');

        // Spies
        let addTaskSpy = jest.spyOn(tasksAPI, 'addTask')
          .mockReturnValue(undefined);

        let getFromCollectionSpy = jest.spyOn(tasksAPI, 'getFromCollection')
          .mockImplementation(() => JSON.parse('[' + wanDataSuccess + ']'));

        // Execute
        await acsDeviceInfo.__testUpdateInfo(device, changes);

        // Verify
        expect(getFromCollectionSpy).toHaveBeenCalledTimes(1);
        expect(getFromCollectionSpy).toHaveBeenCalledWith(
          'devices', {_id: device.acs_id}, projection,
        );

        expect(addTaskSpy).toHaveBeenCalledTimes(1);
        expect(addTaskSpy).toHaveBeenCalledWith(
          device.acs_id, expectedTask, expect.anything(),
        );
      },
    );

    // Validate updateInfo - Error fetching genie data: Expect addTask not to be
    // called
    test(
      'Validate updateInfo - Unable to replace wildcards',
      async () => {
        const id = models.defaultMockDevices[0]._id;
        let device = models.copyDeviceFrom(
          id,
          {
            _id: '94:25:33:3B:D1:C2',
            acs_id: '00259E-EG8145V5-48575443A94196A5',
            model: 'EG8145V5',
            version: 'V5R020C00S280',
          },
        );

        const config = models.copyConfigFrom(
          models.defaultMockConfigs[0]._id,
          {
            _id: '84b9f57c7beaae3b4f9d4656',
            is_default: true,
            device_update_schedule: false,
          },
        );

        let changes = {
          wan: {mtu_ppp: 1487},
          lan: {},
          wifi2: {ssid: 'Anlix-Teste'},
          wifi5: {},
          mesh2: {},
          mesh5: {},
        };

        // Mocks
        utils.common.mockConfigs(config, 'findOne');

        // Spies
        let addTaskSpy = jest.spyOn(tasksAPI, 'addTask')
          .mockReturnValue(undefined);

        jest.spyOn(tasksAPI, 'getFromCollection')
          .mockImplementation(() => [{_id: id}]);

        // Execute
        await acsDeviceInfo.__testUpdateInfo(device, changes);

        // Verify
        expect(addTaskSpy).not.toHaveBeenCalled();
      },
    );

    // Validate updateInfo - No WAN edition (legacy case): Expect
    // replaceWanFieldsWildcards (and getFromCollection) not to be called
    test(
      'Validate updateInfo - No WAN edition (legacy case)',
      async () => {
        const id = models.defaultMockDevices[0]._id;
        const device = models.copyDeviceFrom(
          id,
          {
            _id: '94:25:33:3B:D1:C2',
            acs_id: '00259E-EG8145V5-48575443A94196A5',
            model: 'EG8145V5',
            version: 'V5R020C00S280',
          },
        );
        let deviceFields = devicesAPI.instantiateCPEByModelFromDevice(device)
          .cpe.getModelFields();

        const config = models.copyConfigFrom(
          models.defaultMockConfigs[0]._id,
          {
            _id: '84b9f57c7beaae3b4f9d4656',
            is_default: true,
            device_update_schedule: false,
          },
        );

        let changes = {
          wan: {},
          lan: {},
          wifi2: {ssid: 'Anlix-Teste'},
          wifi5: {},
          mesh2: {},
          mesh5: {},
        };

        let expectedTask = {
          name: 'setParameterValues',
          parameterValues: [
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
        };

        // Mocks
        utils.common.mockConfigs(config, 'findOne');

        // Spies
        let addTaskSpy = jest.spyOn(tasksAPI, 'addTask')
          .mockReturnValue(undefined);

        let getFromCollectionSpy = jest.spyOn(tasksAPI, 'getFromCollection');

        // Execute
        await acsDeviceInfo.__testUpdateInfo(device, changes);

        // Verify
        expect(getFromCollectionSpy).not.toHaveBeenCalled();

        expect(addTaskSpy).toHaveBeenCalledTimes(1);
        expect(addTaskSpy).toHaveBeenCalledWith(
          device.acs_id, expectedTask, expect.anything(),
        );
      },
    );

    test(
      'Subnet edit + dnsServersWrite true + Old subnet is contained in DNS ' +
      'servers = triggers DNS edit removing old subnet anda adding new subnet',
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
            lan_subnet: '192.168.3.1',
            lan_netmask: 24,
            lan_dns_servers: '192.168.3.1,192.168.2.1', // Valid value
          },
        );

        const role = models.copyRoleFrom(
          models.defaultMockRoles[0]._id,
          {grantMonitorManage: false},
        );

        const config = models.copyConfigFrom(
          models.defaultMockConfigs[0]._id,
          {
            _id: '84b9f57c7beaae3b4f9d4656',
            is_default: true,
            device_update_schedule: false,
          },
        );

        let deviceFields = devicesAPI.instantiateCPEByModelFromDevice(device)
          .cpe.getModelFields();
        let permissions = deviceVersion.devicePermissions(device);

        // Attributes for mock the request
        let body = {
          content: {
            lan_subnet: '192.168.1.0', // New subnet value
            lan_netmask: 24,
          },
        };

        let params = {id: device._id};

        let user = {role: undefined};

        let changes = {
          wan: {},
          lan: {router_ip: '192.168.1.0'},
          wifi2: {},
          wifi5: {},
          mesh2: {},
          mesh5: {},
        };

        // Calculate new min and max ranges for new subnet
        let expectedRangesIp = calculateExpectedRangesIp(
          body.content.lan_netmask, body.content.lan_subnet,
        );

        // Calculate expected DNS
        // Old subnet value = 192.168.3.1
        // Old DNS value = 192.168.3.1,192.168.2.1
        // New subnet value = 192.168.1.0
        // Is expected the new DNS value to be = 192.168.1.0,192.168.2.1
        let expectedDns = calculateExpectedDns(
          device.lan_dns_servers.split(','), // Current value of LAN DNS field
          device.lan_subnet, // Old subnet value
          body.content.lan_subnet, // New subnet value
        );

        // Whenever a change is made to the value of the subnet field, the task
        // sent to the base must also change other fields alongside. As the
        // write permission in the DNS servers field is true for this device, we
        // expect the field to be changed in the sent task
        let expectedTask = {
          name: 'setParameterValues',
          parameterValues: [
            [
              deviceFields['lan']['dns_servers'],
              expectedDns,
              'xsd:string',
            ],
            [
              deviceFields['lan']['ip_routers'],
              body.content.lan_subnet,
              'xsd:string',
            ],
            [
              deviceFields['lan']['lease_min_ip'],
              expectedRangesIp.minIP,
              'xsd:string',
            ],
            [
              deviceFields['lan']['lease_max_ip'],
              expectedRangesIp.maxIP,
              'xsd:string',
            ],
            [
              deviceFields['lan']['router_ip'],
              body.content.lan_subnet,
              'xsd:string',
            ],
          ],
        };

        // Mocks
        utils.common.mockConfigs(config, 'findOne');
        utils.common.mockDevices([device], 'find');
        utils.common.mockRoles(role, 'findOne');

        let req = mockRequest(params, user, body);
        const res = testUtils.mockResponse();

        // Spies
        let addTaskSpy = jest.spyOn(tasksAPI, 'addTask');
        let updateInfoSpy = jest.spyOn(acsDeviceInfo, 'updateInfo');

        // Execute
        await deviceListController.setDeviceReg(req, res);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Verify
        // Assert write permission is true for device
        expect(permissions.grantLanDnsEdit).toBe(true);

        // Assert function is called with parameters that contain the correct
        // new value for DNS
        expect(updateInfoSpy).toHaveBeenCalledTimes(1);
        expect(updateInfoSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            lan_dns_servers: expectedDns,
            lan_netmask: body.content.lan_netmask,
            lan_subnet: body.content.lan_subnet,
          }),
          changes,
        );

        // Assert task is sent correctly
        expect(addTaskSpy).toHaveBeenCalledTimes(1);
        expect(addTaskSpy).toHaveBeenCalledWith(
          device.acs_id, expectedTask, expect.anything(),
        );
      },
    );

    test(
      'Subnet edit + dnsServersWrite true + Old and new subnet is contained ' +
      'in DNS servers = triggers DNS edit only removing old subnet',
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
            lan_subnet: '192.168.3.1',
            lan_netmask: 24,
            lan_dns_servers: '192.168.3.1,192.168.1.0', // Valid value
          },
        );

        const role = models.copyRoleFrom(
          models.defaultMockRoles[0]._id,
          {grantMonitorManage: false},
        );

        const config = models.copyConfigFrom(
          models.defaultMockConfigs[0]._id,
          {
            _id: '84b9f57c7beaae3b4f9d4656',
            is_default: true,
            device_update_schedule: false,
          },
        );

        let deviceFields = devicesAPI.instantiateCPEByModelFromDevice(device)
          .cpe.getModelFields();
        let permissions = deviceVersion.devicePermissions(device);

        // Attributes for mock the request
        let body = {
          content: {
            lan_subnet: '192.168.1.0', // New subnet value
            lan_netmask: 24,
          },
        };

        let params = {id: device._id};

        let user = {role: undefined};

        let changes = {
          wan: {},
          lan: {router_ip: '192.168.1.0'},
          wifi2: {},
          wifi5: {},
          mesh2: {},
          mesh5: {},
        };

        // Calculate new min and max ranges for new subnet
        let expectedRangesIp = calculateExpectedRangesIp(
          body.content.lan_netmask, body.content.lan_subnet,
        );

        // Calculate expected DNS
        // Old subnet value = 192.168.3.1
        // Old DNS value = 192.168.3.1,192.168.1.0
        // New subnet value = 192.168.1.0
        // Is expected the new DNS value to be = 192.168.1.0
        let expectedDns = calculateExpectedDns(
          device.lan_dns_servers.split(','), // Current value of LAN DNS field
          device.lan_subnet, // Old subnet value
          body.content.lan_subnet, // New subnet value
        );

        // Whenever a change is made to the value of the subnet field, the task
        // sent to the base must also change other fields alongside. As the
        // write permission in the DNS servers field is true for this device, we
        // expect the field to be changed in the sent task
        let expectedTask = {
          name: 'setParameterValues',
          parameterValues: [
            [
              deviceFields['lan']['dns_servers'],
              expectedDns,
              'xsd:string',
            ],
            [
              deviceFields['lan']['ip_routers'],
              body.content.lan_subnet,
              'xsd:string',
            ],
            [
              deviceFields['lan']['lease_min_ip'],
              expectedRangesIp.minIP,
              'xsd:string',
            ],
            [
              deviceFields['lan']['lease_max_ip'],
              expectedRangesIp.maxIP,
              'xsd:string',
            ],
            [
              deviceFields['lan']['router_ip'],
              body.content.lan_subnet,
              'xsd:string',
            ],
          ],
        };

        // Mocks
        utils.common.mockConfigs(config, 'findOne');
        utils.common.mockDevices([device], 'find');
        utils.common.mockRoles(role, 'findOne');

        let req = mockRequest(params, user, body);
        const res = testUtils.mockResponse();

        // Spies
        let addTaskSpy = jest.spyOn(tasksAPI, 'addTask');
        let updateInfoSpy = jest.spyOn(acsDeviceInfo, 'updateInfo');

        // Execute
        await deviceListController.setDeviceReg(req, res);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Verify
        // Assert write permission is true for device
        expect(permissions.grantLanDnsEdit).toBe(true);

        // Assert function is called with parameters that contain the correct
        // new value for DNS
        expect(updateInfoSpy).toHaveBeenCalledTimes(1);
        expect(updateInfoSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            lan_dns_servers: expectedDns,
            lan_netmask: body.content.lan_netmask,
            lan_subnet: body.content.lan_subnet,
          }),
          changes,
        );

        // Assert task is sent correctly
        expect(addTaskSpy).toHaveBeenCalledTimes(1);
        expect(addTaskSpy).toHaveBeenCalledWith(
          device.acs_id, expectedTask, expect.anything(),
        );
      },
    );

    test(
      'Subnet edit + dnsServersWrite false = does not triggers DNS edit',
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
            lan_subnet: '192.168.3.1',
            lan_netmask: 24,
            lan_dns_servers: undefined,
          },
        );

        const role = models.copyRoleFrom(
          models.defaultMockRoles[0]._id,
          {grantMonitorManage: false},
        );

        const config = models.copyConfigFrom(
          models.defaultMockConfigs[0]._id,
          {
            _id: '84b9f57c7beaae3b4f9d4656',
            is_default: true,
            device_update_schedule: false,
          },
        );

        let deviceFields = devicesAPI.instantiateCPEByModelFromDevice(device)
          .cpe.getModelFields();
        let permissions = deviceVersion.devicePermissions(device);

        // Attributes for mock the request
        let body = {
          content: {
            lan_subnet: '192.168.1.0', // New subnet value
            lan_netmask: 24,
          },
        };

        let params = {id: device._id};

        let user = {role: undefined};

        let changes = {
          wan: {},
          lan: {router_ip: '192.168.1.0'},
          wifi2: {},
          wifi5: {},
          mesh2: {},
          mesh5: {},
        };

        // Calculate new min and max ranges for new subnet
        let expectedRangesIp = calculateExpectedRangesIp(
          body.content.lan_netmask, body.content.lan_subnet,
        );

        // Whenever a change is made to the value of the subnet field, the task
        // sent to the base must also change other fields alongside. As the
        // write permission in the DNS servers field is FALSE for this device,
        // we expect field editing is NOT included in the task
        let expectedTask = {
          name: 'setParameterValues',
          parameterValues: [
            [
              deviceFields['lan']['ip_routers'],
              body.content.lan_subnet,
              'xsd:string',
            ],
            [
              deviceFields['lan']['lease_min_ip'],
              expectedRangesIp.minIP,
              'xsd:string',
            ],
            [
              deviceFields['lan']['lease_max_ip'],
              expectedRangesIp.maxIP,
              'xsd:string',
            ],
            [
              deviceFields['lan']['router_ip'],
              body.content.lan_subnet,
              'xsd:string',
            ],
          ],
        };

        // Mocks
        utils.common.mockConfigs(config, 'findOne');
        utils.common.mockDevices([device], 'find');
        utils.common.mockRoles(role, 'findOne');

        let req = mockRequest(params, user, body);
        const res = testUtils.mockResponse();

        // Spies
        let addTaskSpy = jest.spyOn(tasksAPI, 'addTask');
        let updateInfoSpy = jest.spyOn(acsDeviceInfo, 'updateInfo');

        // Execute
        await deviceListController.setDeviceReg(req, res);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Verify
        // Assert write permission is false for device
        expect(permissions.grantLanDnsEdit).toBe(false);

        // Assert function is called with parameters that does not contain an
        // attribute that references DNS
        expect(updateInfoSpy).toHaveBeenCalledTimes(1);
        expect(updateInfoSpy).toHaveBeenCalledWith(
          expect.not.objectContaining({
            lan_dns_servers: expect.anything(),
          }),
          changes,
        );

        // Assert task is sent correctly
        expect(addTaskSpy).toHaveBeenCalledTimes(1);
        expect(addTaskSpy).toHaveBeenCalledWith(
          device.acs_id, expectedTask, expect.anything(),
        );
      },
    );
  });
});
