require('../../../bin/globals');

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const utils = require('../../common/utils');
const models = require('../../common/models');

// Mock the config (used in language.js)
utils.common.mockConfigs(models.defaultMockConfigs, 'findOne');

const utilHandlers = require('../../../controllers/handlers/util');

const t = require('../../../controllers/language').i18next.t;

// Mock the mqtts (avoid aedes)
jest.mock('../../../mqtts', () => {
  return {
    __esModule: false,
    unifiedClientsMap: {},
    anlixMessageRouterUpdate: () => undefined,
    getConnectedClients: () => [],
  };
});

describe('Utils Handler Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Test utils regex functions', () => {

    test('Validate isMacValid - Invalid MAC with invalid charactere', () => {
      expect(utilHandlers.isMacValid('000000000000\n')).toBe(false);
    });

    test('Validate isMacValid - Invalid MAC with no invalid charactere', () => {
      expect(utilHandlers.isMacValid('000000000000')).toBe(false);
    });

    test('Validate isMacValid - Valid MAC with invalid charactere', () => {
      expect(utilHandlers.isMacValid('9C:A2:F4:5D:19:09\n')).toBe(false);
    });

    test('Validate isMacValid - Valid MAC with no invalid charactere', () => {
      expect(utilHandlers.isMacValid('9C:A2:F4:5D:19:09')).toBe(true);
    });

  });
});