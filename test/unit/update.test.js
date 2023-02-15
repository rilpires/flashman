require('../../bin/globals');
const firmwareController = require('../../controllers/firmware');
const updateSchedulerCommon = require(
  '../../controllers/update_scheduler_common',
);
const acsDeviceInfo = require(
  '../../controllers/acs_device_info',
);
const utilHandlers = require('../../controllers/handlers/util');

const utils = require('../common/utils');
const models = require('../common/models');

const fs = require('fs');
const path = require('path');

const http = require('http');
const t = require('../../controllers/language').i18next.t;

let GENIEHOST = (process.env.FLM_NBI_ADDR || 'localhost');
let GENIEPORT = (process.env.FLM_NBI_PORT || 7557);

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


  // replaceWanFieldsWildcards - Happy case
  test(
    'Validate replaceWanFieldsWildcards with wildcard flag false - successfull',
    async () => {
      // Mocks
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

      let httpRequestOptions = {};
      const dataToPass = '1234'; // Any value - It doesn't matter

      let originalFieldName = 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.*.WANPPPConnection.*.MaxMRUSize';
      let expectedFieldName = 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.MaxMRUSize';

      let changes = {
        wan: { mtu_ppp: 1487 },
        lan: {},
        wifi2: {ssid: 'Anlix-Teste'},
        wifi5: {},
        mesh2: {},
        mesh5: {},
      };

      let fields = {
        wan: {
          mtu_ppp: originalFieldName,
        },
      };

      let task = {
        name: 'setParameterValues',
        parameterValues: [
          [
            originalFieldName,
            1488,
            'xsd:unsignedInt'
          ],
          [
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
            'Anlix-Teste',
            'xsd:string'
          ],
        ]
      };

      // It is expected that the function will change only the fields of the
      // task referring to the WAN
      let expectedTask = {
        name: 'setParameterValues',
        parameterValues: [
          [
            expectedFieldName,
            1488,
            'xsd:unsignedInt'
          ],
          [
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
            'Anlix-Teste',
            'xsd:string'
          ],
        ]
      };

      // Spies
      jest.spyOn(utilHandlers, 'checkForNestedKey')
        .mockImplementation(() => true);
      jest.spyOn(utilHandlers, 'replaceNestedKeyWildcards')
        .mockImplementation(() => expectedFieldName);

      let httpRequestSpy = jest.spyOn(http, 'request')
        .mockImplementation(
          (options, callback) => {
            httpRequestOptions = options;
            callback({
              on: async (event, cb) => {
                if (event === 'data') {
                  cb(dataToPass);
                } else if (event === 'end') {
                  await cb();
                }  else if (event === 'error') {
                  expect(this.on).rejects;
                }
              },
              setEncoding: () => true,
            });

            return {end: () => true};
          },
        );

      // Execute function
      let ret = await acsDeviceInfo.__testReplaceWanFieldsWildcards(
        id, false, fields, changes, task,
      );

      // Validate
      expect(httpRequestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          hostname: GENIEHOST,
          port: GENIEPORT,
        }),
        expect.anything(),
      );

      expect(httpRequestSpy).toHaveBeenCalledWith(
        httpRequestOptions,
        expect.anything(),
      );

      expect(ret).toStrictEqual({'success': true, 'task': expectedTask});
    },
  );

  // replaceWanFieldsWildcards - Unable to replace wildcards
  test(
    'replaceWanFieldsWildcards - Unable to replace wildcards',
    async () => {
      // Mocks
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

      let httpRequestOptions = {};
      const dataToPass = '1234'; // Any value - It doesn't matter

      let changes = {
        wan: { mtu_ppp: 1487 },
        lan: {},
        wifi2: {ssid: 'Anlix-Teste'},
        wifi5: {},
        mesh2: {},
        mesh5: {},
      };

      let fields = { wan: {} }; // Empty fields - It doesn't matter

      let task = {}; // Empty task - It doesn't matter

      // Spies
      jest.spyOn(utilHandlers, 'checkForNestedKey')
        .mockImplementation(() => false);
      jest.spyOn(utilHandlers, 'replaceNestedKeyWildcards')
        .mockImplementation(() => undefined);

      let httpRequestSpy = jest.spyOn(http, 'request')
        .mockImplementation(
          (options, callback) => {
            httpRequestOptions = options;
            callback({
              on: async (event, cb) => {
                if (event === 'data') {
                  cb(dataToPass);
                } else if (event === 'end') {
                  await cb();
                }  else if (event === 'error') {
                  expect(this.on).rejects;
                }
              },
              setEncoding: () => true,
            });

            return {end: () => true};
          },
        );

      // Execute
      let ret = await acsDeviceInfo.__testReplaceWanFieldsWildcards(
        id, false, fields, changes, task,
      );

      // Validate
      expect(ret).toStrictEqual({'success': false, 'task': undefined});
    },
  );
});
