require('../../bin/globals');

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const firmwareController = require('../../controllers/firmware');
const updateSchedulerCommon = require(
  '../../controllers/update_scheduler_common',
);
const acsDeviceInfo = require(
  '../../controllers/acs_device_info',
);
const devicesAPI = require('../../controllers/external-genieacs/devices-api');
const tasksAPI = require('../../controllers/external-genieacs/tasks-api');
const utilHandlers = require('../../controllers/handlers/util');

const utils = require('../common/utils');
const models = require('../common/models');

const fs = require('fs');
const path = require('path');

const t = require('../../controllers/language').i18next.t;


// Test updates
describe('Update Tests - Functions', () => {
  // Reset all mocks
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // Version regex - Empty string
  test('Validate Version Regex - Empty string', async () => {
    expect(
      firmwareController.__testIsValidVersion(''),
    ).toBe(false);
  });

  // Version regex - Not a string
  test('Validate Version Regex - Not a string', async () => {
    expect(
      firmwareController.__testIsValidVersion({}),
    ).toBe(false);
  });

  // Version regex - Invalid characteres
  let characteres = ['&', '\\', '"', '\'', '`', '<', '>'];
  for (let char = 0; char < characteres.length; char++) {
    test('Validate Version Regex - Invalid character: ' +
      characteres[char], async () => {
      expect(
        firmwareController.__testIsValidVersion(
          'Test' + characteres[char] + 'Test',
        ),
      ).toBe(false);
    });
  }

  // Version regex - Okay
  test('Validate Version Regex - Okay', async () => {
    expect(
      firmwareController.__testIsValidVersion('Test'),
    ).toBe(true);
  });


  // uploadFirmware - No file
  test('Validate uploadFirmware - No file', async () => {
    // Data to be sent
    let data = {};

    // Execute the request
    let response = await utils.common.sendFakeRequest(
      firmwareController.uploadFirmware,
      data,
      undefined,
    );

    // Validate
    expect(response.body.type).toBe('danger');
    expect(response.body.message).toContain(
      t('noFileSelectedError').replace('({{errorline}})', ''),
    );
  });


  // uploadFirmware - Invalid file type
  test('Validate uploadFirmware - Invalid file type', async () => {
    // Data to be sent
    let data = {};
    let files = {
      hasOwnProperty: () => false,
    };

    // Execute the request
    let response = await utils.common.sendFakeRequest(
      firmwareController.uploadFirmware,
      data,
      files,
    );

    // Validate
    expect(response.body.type).toBe('danger');
    expect(response.body.message).toContain(
      t('noFileSelectedError').replace('({{errorline}})', ''),
    );
  });


  // uploadFirmware - Invalid file name flashbox
  test('Validate uploadFirmware - Invalid file name flashbox', async () => {
    // Data to be sent
    let data = {};
    let files = {
      hasOwnProperty: function(property) {
        if (property === 'firmwareflashboxfile') return true;
        return false;
      },
      firmwareflashboxfile: {
        name: 'ABCDEFGHIJKL.bin',
      },
    };

    // Execute the request
    let response = await utils.common.sendFakeRequest(
      firmwareController.uploadFirmware,
      data,
      files,
    );

    // Validate
    expect(response.body.type).toBe('danger');
    expect(response.body.message).toContain(
      t('firmwareFileNameInvalid').replace('({{errorline}})', ''),
    );
  });


  // uploadFirmware - Invalid version tr069
  test('Validate uploadFirmware - Invalid version tr069', async () => {
    // Data to be sent
    let data = {
      version: 'FGHJKRTYUIO&"\'<>/\\`',
      productvendor: 'gwr1200',
      productclass: 'gwr1200v2',
    };

    let files = {
      hasOwnProperty: function(property) {
        if (property === 'firmwaretr069file') return true;
        return false;
      },
      firmwaretr069file: {
        name: 'ABCDEFGHIJKL.bin',
      },
    };

    // Execute the request
    let response = await utils.common.sendFakeRequest(
      firmwareController.uploadFirmware,
      data,
      files,
    );

    // Validate
    expect(response.body.type).toBe('danger');
    expect(response.body.message).toContain(
      t('firmwareVersionNameInvalid').replace('({{errorline}})', ''),
    );
  });


  // uploadFirmware - TR069 model and version exists
  test(
    'Validate uploadFirmware - TR069 model and version exists',
    async () => {
    // Data to be sent
    let data = {
      version: '123',
      productvendor: 'gwr1200',
      productclass: 'gwr1200v2',
    };

    let files = {
      hasOwnProperty: function(property) {
        if (property === 'firmwaretr069file') return true;
        return false;
      },
      firmwaretr069file: {
        name: 'ABCDEFGHIJKL.bin',
      },
    };

    // Mocks
    utils.common.mockFirmwares({id: '12345'}, 'findOne');
    jest.spyOn(path, 'join')
      .mockImplementation(() => '/tmp/ABCDEFGHIJKL.bin');
    jest.spyOn(fs, 'existsSync')
      .mockImplementation(() => false);

    // Execute the request
    let response = await utils.common.sendFakeRequest(
      firmwareController.uploadFirmware,
      data,
      files,
    );

    // Validate
    expect(response.body.type).toBe('danger');
    expect(response.body.message).toContain(
      t('firmwareAlreadyExists').replace('({{errorline}})', ''),
    );
  });


  // uploadFirmware - File exists
  test('Validate uploadFirmware - File exists', async () => {
    // Data to be sent
    let data = {
      version: '12345',
      productvendor: 'gwr1200',
      productclass: 'gwr1200v2',
    };

    let files = {
      hasOwnProperty: function(property) {
        if (property === 'firmwaretr069file') return true;
        return false;
      },
      firmwaretr069file: {
        name: 'ABCDEFGHIJKL.bin',
      },
    };


    // Mocks
    utils.common.mockFirmwares(null, 'findOne');
    jest.spyOn(path, 'join')
      .mockImplementationOnce(() => '/tmp/ABCDEFGHIJKL.bin');
    jest.spyOn(fs, 'existsSync')
      .mockImplementationOnce(() => true);


    // Execute the request
    let response = await utils.common.sendFakeRequest(
      firmwareController.uploadFirmware,
      data,
      files,
    );

    // Validate
    expect(response.body.type).toBe('danger');
    expect(response.body.message).toContain(
      t('fileAlreadyExists').replace('({{errorline}})', ''),
    );
  });


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
      jest.spyOn(utilHandlers, 'checkForNestedKey')
        .mockImplementation(() => true);
      jest.spyOn(utilHandlers, 'replaceNestedKeyWildcards')
        .mockImplementation(() => expectedFieldName);
      jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{_id: id}]);

      // Execute function
      let ret = await acsDeviceInfo.__testReplaceWanFieldsWildcards(
        id, false, deviceFields, changes, task,
      );

      // Validate
      expect(ret).toStrictEqual({'success': true, 'task': expectedTask});
    },
  );


  // Validate replaceWanFieldsWildcards - No corresponding field for key
  test(
    'Validate replaceWanFieldsWildcards - No corresponding field for key',
    async () => {
      const id = models.defaultMockDevices[0]._id;
      let deviceFields = {wan: {}}; // Empty fields

      let changes = {
        wan: {mtu_ppp: 1487},
        lan: {},
        wifi2: {ssid: 'Anlix-Teste'},
        wifi5: {},
        mesh2: {},
        mesh5: {},
      };

      let task = {}; // Empty task - It doesn't matter

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


  // Validate replaceWanFieldsWildcards - Unable to replace wildcards
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

      jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{_id: id}]);

      // Spies
      jest.spyOn(utilHandlers, 'checkForNestedKey')
        .mockImplementation(() => false);
      jest.spyOn(utilHandlers, 'replaceNestedKeyWildcards')
        .mockImplementation(() => undefined);

      // Execute
      let ret = await acsDeviceInfo.__testReplaceWanFieldsWildcards(
        id, false, deviceFields, changes, task,
      );

      // Validate
      expect(ret).toStrictEqual({'success': false, 'task': undefined});
    },
  );

  // Validate updateInfo - Happy Case
  test(
    'Validate updateInfo - Happy Case',
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
      utils.common.mockConfigs({}, 'findOne');

      // Spies
      let addTaskSpy = jest.spyOn(tasksAPI, 'addTask')
        .mockReturnValue(undefined);

      jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => JSON.parse('[{"_id":"00259E-EG8145V5-48575443A94196A5","InternetGatewayDevice":{"WANDevice":{"1":{"WANConnectionDevice":{"1":{"WANIPConnection":{"1":{"ExternalIPAddress":{"_object":false,"_timestamp":"2023-02-17T21:20:59.085Z","_type":"xsd:string","_value":"0.0.0.0","_writable":true},"_object":true,"AddressingType":{"_object":false,"_writable":true},"AutoDisconnectTime":{"_object":false,"_writable":true},"ConnectionStatus":{"_object":false,"_writable":false},"ConnectionTrigger":{"_object":false,"_writable":true},"ConnectionType":{"_object":false,"_writable":true},"DHCPClient":{"_object":true,"_writable":false},"DNSEnabled":{"_object":false,"_writable":true},"DNSOverrideAllowed":{"_object":false,"_writable":true},"DNSServers":{"_object":false,"_writable":true},"DefaultGateway":{"_object":false,"_writable":true},"Enable":{"_object":false,"_writable":true},"IdleDisconnectTime":{"_object":false,"_writable":true},"LastConnectionError":{"_object":false,"_writable":false},"MACAddress":{"_object":false,"_timestamp":"2023-02-17T21:20:59.086Z","_type":"xsd:string","_value":"00:e0:4c:ea:e6:0f","_writable":true},"MACAddressOverride":{"_object":false,"_writable":true},"MaxMTUSize":{"_object":false,"_timestamp":"2023-02-17T21:20:59.086Z","_type":"xsd:unsignedInt","_value":0,"_writable":true},"NATEnabled":{"_object":false,"_writable":true},"Name":{"_object":false,"_writable":true},"PortMapping":{"_object":true,"_writable":true,"_timestamp":"2023-02-16T22:03:52.323Z"},"PortMappingNumberOfEntries":{"_object":false,"_timestamp":"2023-02-17T21:20:59.086Z","_type":"xsd:unsignedInt","_value":0,"_writable":false},"PossibleConnectionTypes":{"_object":false,"_writable":false},"RSIPAvailable":{"_object":false,"_writable":false},"Reset":{"_object":false,"_writable":true},"RouteProtocolRx":{"_object":false,"_writable":true},"ShapingBurstSize":{"_object":false,"_writable":true},"ShapingRate":{"_object":false,"_writable":true},"Stats":{"_object":true,"_writable":false},"SubnetMask":{"_object":false,"_writable":true},"Uptime":{"_object":false,"_timestamp":"2023-02-17T21:20:59.086Z","_type":"xsd:unsignedInt","_value":21103,"_writable":false},"WarnDisconnectDelay":{"_object":false,"_writable":true},"_timestamp":"2023-02-16T22:01:27.615Z","_writable":true},"_object":true,"_timestamp":"2023-02-17T21:20:59.084Z","_writable":true},"_object":true,"WANEthernetLinkConfig":{"_object":true,"_writable":false},"WANIPConnectionNumberOfEntries":{"_object":false,"_writable":false},"WANPPPConnection":{"1":{"AutoDisconnectTime":{"_object":false,"_writable":true},"ConnectionStatus":{"_object":false,"_writable":false},"ConnectionTrigger":{"_object":false,"_writable":true},"ConnectionType":{"_object":false,"_writable":true},"CurrentMRUSize":{"_object":false,"_writable":false},"DNSEnabled":{"_object":false,"_writable":true},"DNSOverrideAllowed":{"_object":false,"_writable":true},"DNSServers":{"_object":false,"_writable":true},"DefaultGateway":{"_object":false,"_writable":false},"Enable":{"_object":false,"_timestamp":"2023-02-17T21:20:59.090Z","_type":"xsd:boolean","_value":true,"_writable":true},"ExternalIPAddress":{"_object":false,"_timestamp":"2023-02-17T21:20:59.090Z","_type":"xsd:string","_value":"192.168.89.88","_writable":true},"IdleDisconnectTime":{"_object":false,"_writable":true},"LastConnectionError":{"_object":false,"_writable":false},"MACAddress":{"_object":false,"_timestamp":"2023-02-17T21:20:59.090Z","_type":"xsd:string","_value":"00:e0:4c:ea:e6:0f","_writable":false},"MACAddressOverride":{"_object":false,"_writable":true},"MaxMRUSize":{"_object":false,"_timestamp":"2023-02-17T21:20:59.090Z","_type":"xsd:unsignedInt","_value":1492,"_writable":true},"NATEnabled":{"_object":false,"_writable":true},"Name":{"_object":false,"_writable":true},"PPPAuthenticationProtocol":{"_object":false,"_writable":false},"PPPCompressionProtocol":{"_object":false,"_writable":false},"PPPEncryptionProtocol":{"_object":false,"_writable":false},"PPPLCPEcho":{"_object":false,"_writable":false},"PPPLCPEchoRetry":{"_object":false,"_writable":false},"PPPoEACName":{"_object":false,"_writable":true},"PPPoEServiceName":{"_object":false,"_writable":true},"PPPoESessionID":{"_object":false,"_writable":false},"Password":{"_object":false,"_timestamp":"2023-02-17T21:20:59.090Z","_type":"xsd:string","_value":"","_writable":true},"PortMapping":{"_object":true,"_timestamp":"2023-02-17T21:20:59.084Z","_writable":true},"PortMappingNumberOfEntries":{"_object":false,"_timestamp":"2023-02-17T21:20:59.090Z","_type":"xsd:unsignedInt","_value":0,"_writable":false},"PossibleConnectionTypes":{"_object":false,"_writable":false},"RSIPAvailable":{"_object":false,"_writable":false},"RemoteIPAddress":{"_object":false,"_writable":false},"Reset":{"_object":false,"_writable":true},"RouteProtocolRx":{"_object":false,"_writable":true},"ShapingBurstSize":{"_object":false,"_writable":false},"Stats":{"EthernetBroadcastPacketsReceived":{"_object":false,"_writable":false},"EthernetBroadcastPacketsSent":{"_object":false,"_writable":false},"EthernetBytesReceived":{"_object":false,"_writable":false},"EthernetBytesSent":{"_object":false,"_writable":false},"EthernetDiscardPacketsReceived":{"_object":false,"_writable":false},"EthernetDiscardPacketsSent":{"_object":false,"_writable":false},"EthernetErrorsReceived":{"_object":false,"_writable":false},"EthernetErrorsSent":{"_object":false,"_writable":false},"EthernetMulticastPacketsReceived":{"_object":false,"_writable":false},"EthernetMulticastPacketsSent":{"_object":false,"_writable":false},"EthernetPacketsReceived":{"_object":false,"_writable":false},"EthernetPacketsSent":{"_object":false,"_writable":false},"EthernetUnicastPacketsReceived":{"_object":false,"_writable":false},"EthernetUnicastPacketsSent":{"_object":false,"_writable":false},"EthernetUnknownProtoPacketsReceived":{"_object":false,"_writable":false},"_object":true,"_timestamp":"2023-02-17T21:20:59.084Z","_writable":false},"TransportType":{"_object":false,"_writable":false},"Uptime":{"_object":false,"_timestamp":"2023-02-17T21:20:59.090Z","_type":"xsd:unsignedInt","_value":28,"_writable":false},"Username":{"_object":false,"_timestamp":"2023-02-17T21:20:59.090Z","_type":"xsd:string","_value":"admin123","_writable":true},"WarnDisconnectDelay":{"_object":false,"_writable":true},"_object":true,"_timestamp":"2023-02-17T21:20:59.084Z","_writable":true},"_object":true,"_timestamp":"2023-02-17T21:20:59.084Z","_writable":true},"WANPPPConnectionNumberOfEntries":{"_object":false,"_writable":false},"_timestamp":"2023-02-16T22:01:27.615Z","_writable":true},"_object":true,"_timestamp":"2023-02-17T21:20:59.084Z","_writable":true}}}}}]'));
      // Execute
      await acsDeviceInfo.__testUpdateInfo(device, changes);

      // Verify
      expect(addTaskSpy).toHaveBeenCalledTimes(1);
      expect(addTaskSpy).toHaveBeenCalledWith(
        device.acs_id, expectedTask, expect.anything(),
      );
    },
  );


  // Validate updateInfo - Unable to replace wildcards
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

      let changes = {
        wan: {mtu_ppp: 1487},
        lan: {},
        wifi2: {ssid: 'Anlix-Teste'},
        wifi5: {},
        mesh2: {},
        mesh5: {},
      };

      // Mocks
      utils.common.mockConfigs({}, 'findOne');

      // Spies
      jest.spyOn(utilHandlers, 'checkForNestedKey')
        .mockImplementation(() => false);
      jest.spyOn(utilHandlers, 'replaceNestedKeyWildcards')
        .mockImplementation(() => undefined);
      let addTaskSpy = jest.spyOn(tasksAPI, 'addTask');

      jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{_id: id}]);

      // Execute
      await acsDeviceInfo.__testUpdateInfo(device, changes);

      // Verify
      expect(addTaskSpy).not.toHaveBeenCalled();
    },
  );
});
