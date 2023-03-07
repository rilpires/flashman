require('../../bin/globals');

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const utils = require('../common/utils');
const models = require('../common/models');

// Mock the config (used in language.js)
utils.common.mockConfigs(models.defaultMockConfigs, 'findOne');

const firmwareController = require('../../controllers/firmware');
const updateSchedulerCommon = require(
  '../../controllers/update_scheduler_common',
);
const acsDeviceInfo = require(
  '../../controllers/acs_device_info',
);
const devicesAPI = require('../../controllers/external-genieacs/devices-api');
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
    __dirname, '../assets/flashman-test/genie-data/huawei-eg8145v5.json',
  ), 'utf8',
);

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
});
