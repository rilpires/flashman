require('../../bin/globals');

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const utils = require('../common/utils');
const models = require('../common/models');

// Mock the config (used in language.js)
utils.common.mockDefaultConfigs();

const firmwareController = require('../../controllers/firmware');
const DevicesAPI = require('../../controllers/external-genieacs/devices-api');


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


describe('Tests for controllers/firmware.js', () => {
  // Reset all mocks
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });


  // index function
  describe('index', () => {
    // Index - Invalid user
    test('Invalid user', async () => {
      // Mocks
      utils.common.mockUsers(null, 'findOne');
      utils.common.mockConfigs(models.defaultMockConfigs[0], 'findOne');
      utils.common.mockDefaultRoles();
      utils.common.mockDevices([], 'find');

      // Execute
      let result = await utils.common.sendFakeRequest(
        firmwareController.index,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.superuser).toBe(false);
      expect(result.body.update).toBe(models.defaultMockConfigs[0].hasUpdate);
      expect(result.body.majorUpdate).toBe(
        models.defaultMockConfigs[0].hasMajorUpdate,
      );
    });


    // Index - Invalid config
    test('Invalid config', async () => {
      // Mocks
      utils.common.mockDefaultUsers();
      utils.common.mockConfigs(null, 'findOne');
      utils.common.mockDefaultRoles();
      utils.common.mockDevices([], 'find');

      // Execute
      let result = await utils.common.sendFakeRequest(
        firmwareController.index,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.superuser).toBe(
        models.defaultMockUsers[0].is_superuser,
      );
      expect(result.body.update).toBe(false);
    });


    // Index - Invalid role
    test('Invalid role', async () => {
      // Mocks
      utils.common.mockDefaultUsers();
      utils.common.mockDefaultConfigs();
      utils.common.mockRoles(null, 'findOne');
      utils.common.mockDevices([], 'find');

      // Execute
      let result = await utils.common.sendFakeRequest(
        firmwareController.index,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.superuser).toBe(
        models.defaultMockUsers[0].is_superuser,
      );
      expect(result.body.update).toBe(
        models.defaultMockConfigs[0].hasUpdate,
      );
      expect(result.body.majorUpdate).toBe(
        models.defaultMockConfigs[0].hasMajorUpdate,
      );
      expect(result.body.role).toBe(null);
    });


    // Index - Okay
    test('Okay', async () => {
      // Mocks
      utils.common.mockDefaultUsers();
      utils.common.mockDefaultConfigs();
      utils.common.mockDefaultRoles();
      utils.common.mockDevices([], 'find');

      // Execute
      let result = await utils.common.sendFakeRequest(
        firmwareController.index,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.superuser).toBe(
        models.defaultMockUsers[0].is_superuser,
      );
      expect(result.body.update).toBe(
        models.defaultMockConfigs[0].hasUpdate,
      );
      expect(result.body.majorUpdate).toBe(
        models.defaultMockConfigs[0].hasMajorUpdate,
      );
      expect(result.body.role).toBeDefined();

      utils.devicesAPICommon.validateUpgradeableModels(result.body.tr069Infos);
    });


    // Index - Normal device
    test('Normal device', async () => {
      let device1 = {
        acs_id: models.defaultMockDevices[0].acs_id,
        model: models.defaultMockDevices[0].model,
        version: models.defaultMockDevices[0].version,
        hw_version: models.defaultMockDevices[0].hw_version,
        installed_release: models.defaultMockDevices[0].installed_release,
      };


      let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device1).cpe;
      let vendor = cpe.identifier.vendor;
      let model = cpe.identifier.model;
      let fullID = vendor + ' ' + model;
      let release = models.defaultMockDevices[0].installed_release;


      // Mocks
      utils.common.mockDefaultUsers();
      utils.common.mockDefaultConfigs();
      utils.common.mockDefaultRoles();
      utils.common.mockDevices([device1], 'find');

      // Execute
      let result = await utils.common.sendFakeRequest(
        firmwareController.index,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.superuser).toBe(
        models.defaultMockUsers[0].is_superuser,
      );
      expect(result.body.update).toBe(
        models.defaultMockConfigs[0].hasUpdate,
      );
      expect(result.body.majorUpdate).toBe(
        models.defaultMockConfigs[0].hasMajorUpdate,
      );
      expect(result.body.role).toBeDefined();

      utils.devicesAPICommon.validateUpgradeableModels(result.body.tr069Infos);
      expect(result.body.tr069Infos.vendors[vendor]).toContain(model);
      expect(result.body.tr069Infos.versions[fullID]).toContain(release);
    });


    // Index - Device with new firmware
    test('Device with new firmware', async () => {
      let device1 = {
        acs_id: models.defaultMockDevices[0].acs_id,
        model: models.defaultMockDevices[0].model,
        version: models.defaultMockDevices[0].version,
        hw_version: models.defaultMockDevices[0].hw_version,
        installed_release: '12345',
      };


      let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device1).cpe;
      let vendor = cpe.identifier.vendor;
      let model = cpe.identifier.model;
      let fullID = vendor + ' ' + model;


      // Mocks
      utils.common.mockDefaultUsers();
      utils.common.mockDefaultConfigs();
      utils.common.mockDefaultRoles();
      utils.common.mockDevices([device1], 'find');

      // Execute
      let result = await utils.common.sendFakeRequest(
        firmwareController.index,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.superuser).toBe(
        models.defaultMockUsers[0].is_superuser,
      );
      expect(result.body.update).toBe(
        models.defaultMockConfigs[0].hasUpdate,
      );
      expect(result.body.majorUpdate).toBe(
        models.defaultMockConfigs[0].hasMajorUpdate,
      );
      expect(result.body.role).toBeDefined();

      utils.devicesAPICommon.validateUpgradeableModels(result.body.tr069Infos);
      expect(result.body.tr069Infos.vendors[vendor]).toContain(model);
      expect(result.body.tr069Infos.versions[fullID]).toContain('12345');
    });


    // Index - Device do not upgrade
    test('Device do not upgrade', async () => {
      let device1 = {
        acs_id: models.defaultMockDevices[0].acs_id,
        model: 'Archer C6',
        version: models.defaultMockDevices[0].version,
        hw_version: models.defaultMockDevices[0].hw_version,
        installed_release: '12345',
      };


      let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device1).cpe;
      let vendor = cpe.identifier.vendor;
      let model = cpe.identifier.model;
      let fullID = vendor + ' ' + model;


      // Mocks
      utils.common.mockDefaultUsers();
      utils.common.mockDefaultConfigs();
      utils.common.mockDefaultRoles();
      utils.common.mockDevices([device1], 'find');

      // Execute
      let result = await utils.common.sendFakeRequest(
        firmwareController.index,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.superuser).toBe(
        models.defaultMockUsers[0].is_superuser,
      );
      expect(result.body.update).toBe(
        models.defaultMockConfigs[0].hasUpdate,
      );
      expect(result.body.majorUpdate).toBe(
        models.defaultMockConfigs[0].hasMajorUpdate,
      );
      expect(result.body.role).toBeDefined();

      console.log(result.body.tr069Infos);
      utils.devicesAPICommon.validateUpgradeableModels(result.body.tr069Infos);
      expect(result.body.tr069Infos.vendors[vendor]).not.toContain(model);
      expect(result.body.tr069Infos.versions[fullID]).not.toBeDefined();
    });


    // Index - Multiple devices
    test('Multiple devices', async () => {
      let device1 = {
        acs_id: models.defaultMockDevices[0].acs_id,
        model: models.defaultMockDevices[0].model,
        version: models.defaultMockDevices[0].version,
        hw_version: models.defaultMockDevices[0].hw_version,
        installed_release: '12345',
      };
      let device2 = {
        acs_id: models.defaultMockDevices[0].acs_id,
        model: models.defaultMockDevices[0].model,
        version: models.defaultMockDevices[0].version,
        hw_version: models.defaultMockDevices[0].hw_version,
        installed_release: 'abcdef',
      };


      let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device1).cpe;
      let vendor = cpe.identifier.vendor;
      let model = cpe.identifier.model;
      let fullID = vendor + ' ' + model;
      let release1 = '12345';
      let release2 = 'abcdef';


      // Mocks
      utils.common.mockDefaultUsers();
      utils.common.mockDefaultConfigs();
      utils.common.mockDefaultRoles();
      utils.common.mockDevices([device1, device2], 'find');

      // Execute
      let result = await utils.common.sendFakeRequest(
        firmwareController.index,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.superuser).toBe(
        models.defaultMockUsers[0].is_superuser,
      );
      expect(result.body.update).toBe(
        models.defaultMockConfigs[0].hasUpdate,
      );
      expect(result.body.majorUpdate).toBe(
        models.defaultMockConfigs[0].hasMajorUpdate,
      );
      expect(result.body.role).toBeDefined();

      utils.devicesAPICommon.validateUpgradeableModels(result.body.tr069Infos);
      expect(result.body.tr069Infos.vendors[vendor]).toContain(model);
      expect(result.body.tr069Infos.versions[fullID]).toContain(release1);
      expect(result.body.tr069Infos.versions[fullID]).toContain(release2);
    });


    // Index - Multiple devices with different models
    test('Multiple devices with different models', async () => {
      let device1 = {
        acs_id: models.defaultMockDevices[0].acs_id,
        model: models.defaultMockDevices[0].model,
        version: models.defaultMockDevices[0].version,
        hw_version: models.defaultMockDevices[0].hw_version,
        installed_release: '12345',
      };
      let device2 = {
        acs_id: 'a-W5-1200G-a',
        model: 'W5-1200G',
        version: models.defaultMockDevices[0].version,
        hw_version: models.defaultMockDevices[0].hw_version,
        installed_release: 'abcdef',
      };


      let cpe1 = DevicesAPI.instantiateCPEByModelFromDevice(device1).cpe;
      let cpe2 = DevicesAPI.instantiateCPEByModelFromDevice(device2).cpe;
      let vendor = cpe1.identifier.vendor;
      let model1 = cpe1.identifier.model;
      let model2 = cpe2.identifier.model;
      let fullID1 = vendor + ' ' + model1;
      let fullID2 = vendor + ' ' + model2;
      let release1 = '12345';
      let release2 = 'abcdef';


      // Mocks
      utils.common.mockDefaultUsers();
      utils.common.mockDefaultConfigs();
      utils.common.mockDefaultRoles();
      utils.common.mockDevices([device1, device2], 'find');

      // Execute
      let result = await utils.common.sendFakeRequest(
        firmwareController.index,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.superuser).toBe(
        models.defaultMockUsers[0].is_superuser,
      );
      expect(result.body.update).toBe(
        models.defaultMockConfigs[0].hasUpdate,
      );
      expect(result.body.majorUpdate).toBe(
        models.defaultMockConfigs[0].hasMajorUpdate,
      );
      expect(result.body.role).toBeDefined();

      utils.devicesAPICommon.validateUpgradeableModels(result.body.tr069Infos);
      expect(result.body.tr069Infos.vendors[vendor]).toContain(model1);
      expect(result.body.tr069Infos.vendors[vendor]).toContain(model2);
      expect(result.body.tr069Infos.versions[fullID1]).toContain(release1);
      expect(result.body.tr069Infos.versions[fullID2]).toContain(release2);
    });


    // Index - Multiple devices with different vendors
    test('Multiple devices with different vendors', async () => {
      let device1 = {
        acs_id: models.defaultMockDevices[0].acs_id,
        model: models.defaultMockDevices[0].model,
        version: models.defaultMockDevices[0].version,
        hw_version: models.defaultMockDevices[0].hw_version,
        installed_release: '12345',
      };
      let device2 = {
        acs_id: models.defaultMockDevices[0].acs_id,
        model: 'ONU GW24AC',
        version: models.defaultMockDevices[0].version,
        hw_version: models.defaultMockDevices[0].hw_version,
        installed_release: 'abcdef',
      };


      let cpe1 = DevicesAPI.instantiateCPEByModelFromDevice(device1).cpe;
      let cpe2 = DevicesAPI.instantiateCPEByModelFromDevice(device2).cpe;
      let vendor1 = cpe1.identifier.vendor;
      let vendor2 = cpe2.identifier.vendor;
      let model1 = cpe1.identifier.model;
      let model2 = cpe2.identifier.model;
      let fullID1 = vendor1 + ' ' + model1;
      let fullID2 = vendor2 + ' ' + model2;
      let release1 = '12345';
      let release2 = 'abcdef';


      // Mocks
      utils.common.mockDefaultUsers();
      utils.common.mockDefaultConfigs();
      utils.common.mockDefaultRoles();
      utils.common.mockDevices([device1, device2], 'find');

      // Execute
      let result = await utils.common.sendFakeRequest(
        firmwareController.index,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.superuser).toBe(
        models.defaultMockUsers[0].is_superuser,
      );
      expect(result.body.update).toBe(
        models.defaultMockConfigs[0].hasUpdate,
      );
      expect(result.body.majorUpdate).toBe(
        models.defaultMockConfigs[0].hasMajorUpdate,
      );
      expect(result.body.role).toBeDefined();

      utils.devicesAPICommon.validateUpgradeableModels(result.body.tr069Infos);
      expect(result.body.tr069Infos.vendors[vendor1]).toContain(model1);
      expect(result.body.tr069Infos.vendors[vendor2]).toContain(model2);
      expect(result.body.tr069Infos.versions[fullID1]).toContain(release1);
      expect(result.body.tr069Infos.versions[fullID2]).toContain(release2);
    });
  });


  // isValidVersion function
  describe('isValidVersion', () => {
    // Version regex - Empty string
    test('Empty string', async () => {
      expect(
        firmwareController.__testIsValidVersion(''),
      ).toBe(false);
    });

    // Version regex - Not a string
    test('Not a string', async () => {
      expect(
        firmwareController.__testIsValidVersion({}),
      ).toBe(false);
    });

    // Version regex - Invalid characteres
    let characteres = ['&', '\\', '"', '\'', '`', '<', '>'];
    for (let char = 0; char < characteres.length; char++) {
      test('Invalid character: ' +
        characteres[char], async () => {
        expect(
          firmwareController.__testIsValidVersion(
            'Test' + characteres[char] + 'Test',
          ),
        ).toBe(false);
      });
    }

    // Version regex - Okay
    test('Okay', async () => {
      expect(
        firmwareController.__testIsValidVersion('Test'),
      ).toBe(true);
    });
  });


  // uploadFirmware function
  describe('uploadFirmware', () => {
    // uploadFirmware - No file
    test('No file', async () => {
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
    test('Invalid file type', async () => {
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
    test('Invalid file name flashbox', async () => {
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
    test('Invalid version tr069', async () => {
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
    test('TR069 model and version exists', async () => {
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
    test('File exists', async () => {
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
  });
});
