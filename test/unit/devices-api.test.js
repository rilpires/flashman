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

  // getRegistrationSetupCommands
  describe('getRegistrationSetupCommands', () => {
    // Undefined args
    test('Undefined args', async () => {
      // Mocks
      let callbackSpy = jest.fn();

      // Execute
      await DevicesAPI.getRegistrationSetupCommands(undefined, callbackSpy);

      // Validate
      expect(callbackSpy).toBeCalled();
      expect(callbackSpy).toHaveBeenCalledWith(null, {
        success: false,
        message: 'Invalid JSON',
      });
    });

    // Empty JSON args
    test('Invalid JSON args', async () => {
      // Mocks
      let callbackSpy = jest.fn();

      // Execute
      await DevicesAPI.getRegistrationSetupCommands([], callbackSpy);

      // Validate
      expect(callbackSpy).toBeCalled();
      expect(callbackSpy).toHaveBeenCalledWith(null, {
        success: false,
        message: 'Invalid JSON',
      });
    });

    // Invalid JSON args
    test('Invalid JSON args', async () => {
      // Mocks
      let callbackSpy = jest.fn();

      // Execute
      await DevicesAPI.getRegistrationSetupCommands(['abc'], callbackSpy);

      // Validate
      expect(callbackSpy).toBeCalled();
      expect(callbackSpy).toHaveBeenCalledWith(null, {
        success: false,
        message: 'Invalid JSON',
      });
    });

    // Missing model modelName
    test('Missing model modelName', async () => {
      // Mocks
      let callbackSpy = jest.fn();

      // Execute
      await DevicesAPI.getRegistrationSetupCommands(
        ['{"model": "teste123"}'],
        callbackSpy,
      );

      // Validate
      expect(callbackSpy).toBeCalled();
      expect(callbackSpy).toHaveBeenCalledWith(null, {
        success: false,
        message: 'Incomplete arguments',
      });
    });

    // Missing model model
    test('Missing model model', async () => {
      // Mocks
      let callbackSpy = jest.fn();

      // Execute
      await DevicesAPI.getRegistrationSetupCommands(
        ['{"modelName": "teste123"}'],
        callbackSpy,
      );

      // Validate
      expect(callbackSpy).toBeCalled();
      expect(callbackSpy).toHaveBeenCalledWith(null, {
        success: false,
        message: 'Incomplete arguments',
      });
    });

    // Unknown model
    test('Unknown model', async () => {
       // Mocks
       let callbackSpy = jest.fn();

       // Execute
       await DevicesAPI.getRegistrationSetupCommands(
         ['{"model": "teste123", "modelName": "teste123"}'],
         callbackSpy,
       );

       // Validate
       expect(callbackSpy).toBeCalled();
       expect(callbackSpy).toHaveBeenCalledWith(null, {
         success: false,
         message: 'Unknown Model',
         commands: [],
       });
    });

    // No commands
    test('No commands', async () => {
      // Mocks
      let callbackSpy = jest.fn();

      // Execute
      await DevicesAPI.getRegistrationSetupCommands(
        ['{"model": "teste", "modelName": "ONU GW24AC"}'],
        callbackSpy,
      );

      // Validate
      expect(callbackSpy).toBeCalled();
      expect(callbackSpy).toHaveBeenCalledWith(null, {
        success: true,
        message: 'OK',
        commands: [],
      });
    });

    // Commands
    test('Commands', async () => {
      const commands = DevicesAPI.instantiateCPEByModel(
        '', 'ACtion RG1200',
      ).cpe.getModelCommands();

      // Mocks
      let callbackSpy = jest.fn();

      // Execute
      await DevicesAPI.getRegistrationSetupCommands(
        ['{"model": "teste", "modelName": "ACtion RG1200"}'],
        callbackSpy,
      );

      // Validate
      expect(callbackSpy).toBeCalled();
      expect(commands.length).toBeGreaterThan(0);
      expect(callbackSpy).toHaveBeenCalledWith(null, {
        success: true,
        message: 'OK',
        commands: commands,
      });
    });
  });
});
