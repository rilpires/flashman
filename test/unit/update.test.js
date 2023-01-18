require('../../bin/globals');
const firmwareController = require('../../controllers/firmware');
const updateSchedulerCommon = require(
  '../../controllers/update_scheduler_common',
);
const acsDeviceInfo = require(
  '../../controllers/acs_device_info',
);

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
  let characteres = ['&', '/', '\\', '"', '\'', '`', '<', '>'];
  for (let char = 0; char < characteres.length; char++) {
    test('Validate Version Regex - Invalid character: ' + char, async () => {
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
});
