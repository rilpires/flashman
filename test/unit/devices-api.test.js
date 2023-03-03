require('../../bin/globals');

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const utils = require('../common/utils');

// Mock the config (used in language.js)
utils.common.mockDefaultConfigs();

const DevicesAPI = require('../../controllers/external-genieacs/devices-api');


// Mock the mqtts (avoid aedes)
jest.mock('../../mqtts', () => {
  return {
    __esModule: false,
    unifiedClientsMap: {},
    anlixMessageRouterUpdate: () => undefined,
    getConnectedClients: () => [],
  };
});


// controllers/external-genieacs/devices-api.js
describe('Devices API Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });


  // getTR069UpgradeableModels - Test normal operation
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
});

