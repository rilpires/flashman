require('../../bin/globals');

const utils = require('../common/utils');

const DevicesAPI = require('../../controllers/external-genieacs/devices-api');

// controllers/external-genieacs/devices-api.js
describe('Devices API Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });


  // getTR069UpgradeableModels
  describe('getTR069UpgradeableModels', () => {
    test('Test normal operation', async () => {
      // Execute
      let result = await DevicesAPI.getTR069UpgradeableModels();

      // validate
      expect(result.vendors.length).not.toBe(0);
      expect(result.versions.length).not.toBe(0);

      utils.devicesAPICommon.validateUpgradeableModels(result);
    });
  });


  // getDeviceFields
  describe('getDeviceFields', () => {
    // Undefined args
    test('Undefined args', async () => {
      // Execute
      let teste = await DevicesAPI.getDeviceFields(undefined, undefined);

      // Validate
      expect(teste.success).toBe(false);
      expect(teste.message).toBe('Incomplete arguments');
    });

    // Args missing fields
    test('Args missing fields', async () => {
      let callbackFunction = jest.fn((arg1, arg2) => {
        return arg2;
      });

      // Execute
      let teste = await DevicesAPI.getDeviceFields(
        ['{}'],
        callbackFunction,
      );

      // Validate
      expect(teste.success).toBe(false);
      expect(teste.message).toBe('Incomplete arguments');
      expect(callbackFunction).toBeCalled();
    });
  });
});
