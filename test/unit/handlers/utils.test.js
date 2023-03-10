require('../../../bin/globals');

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const utils = require('../../common/utils');
const models = require('../../common/models');

// Mock the config (used in language.js)
utils.common.mockConfigs(models.defaultMockConfigs[0], 'findOne');

const utilHandlers = require('../../../controllers/handlers/util');

let jsonPath = '../../assets/flashman-test/genie-data/wan/';
let mercusysMR30GWanData = require(jsonPath + 'mercusys-mr30g.json');
let tplinkHC220G5PPPWanData = require(jsonPath + 'tplink-hc220g5-PPP.json');
let tplinkHC220G5IPWanData = require(jsonPath + 'tplink-hc220g5-IP.json');
let noWanAvaliableWanData = require(jsonPath + 'no-wan-available.json');

// Mock the mqtts (avoid aedes)
jest.mock('../../../mqtts', () => {
  return {
    __esModule: false,
    unifiedClientsMap: {},
    anlixMessageRouterUpdate: () => undefined,
    getConnectedClients: () => [],
  };
});

// Get object from key for assertions
let getFromNestedKey = (data, key) => {
  let result = data;
  let splitKey = key.split('.');
  for (let i = 0; i < splitKey.length; i++) {
    result = result[splitKey[i]];
    if (result === undefined) return undefined;
  }
  return result;
};

// Compare mock result value with what is expected
let assertSpyResult = (results, expected) => {
  for (let i = 0; i < results.length; i++) {
    expect(results[i].value).toStrictEqual(expected[i]);
  }
};

// Simulates isWanEnabled function call (inside traverseNestedKey)
let __testIsWanEnabled = (data, key, wildcardFlag = false) => {
  let current = data;
  let splitKey = key.split('.');
  for (let i = 0; i < splitKey.length; i++) {
    if (splitKey[i] === '*') {
      // Calls isWanEnabled
      let wanEnabled = utilHandlers.isWanEnabled(current, key, wildcardFlag);
      // Replace wildcard with function return
      if (wanEnabled.success) {
        splitKey[i] = wanEnabled.index;
      } else {
        // In case of function error, keep legacy behavior
        let orderedKeys = utilHandlers.orderNumericGenieKeys(
          Object.keys(current),
        );
        splitKey[i] = wildcardFlag ?
          orderedKeys[orderedKeys.length - 1] : orderedKeys[0];
      }
    }
    if (!Object.prototype.hasOwnProperty.call(current, splitKey[i])) {
      return {success: false};
    }
    current = current[splitKey[i]];
  }
};

describe('Utils Handler Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Test functions that handles nested genie object', () => {
    test('Validate isWanEnabled - TR-069 + PPP with success', () => {
      // The expected result was checked manually from the given json
      let expectedRets = [
        {success: true, index: '1'}, // First call return
        {success: true, index: '2'}, // Second call return
      ];

      // Simulating editing the MaxMRUSize key
      let key = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
        'WANPPPConnection.*.MaxMRUSize';

      // Spies
      let isWanEnabledSpy = jest.spyOn(utilHandlers, 'isWanEnabled');

      // Execute
      __testIsWanEnabled(mercusysMR30GWanData, key);

      // Verify
      expect(isWanEnabledSpy).toHaveBeenCalledTimes(2);
      assertSpyResult(isWanEnabledSpy.mock.results, expectedRets);
    });

    test('Validate isWanEnabled - TR-181 + PPP with success', () => {
      // The expected result was checked manually from the given json
      let expectedRets = [
        {success: true, index: '20'}, // First and only call return
      ];

      // Simulating editing the MaxMRUSize key
      let key = 'Device.PPP.Interface.*.MaxMRUSize';

      // Spies
      let isWanEnabledSpy = jest.spyOn(utilHandlers, 'isWanEnabled');

      // Execute
      __testIsWanEnabled(tplinkHC220G5PPPWanData, key, true);

      // Verify
      expect(isWanEnabledSpy).toHaveBeenCalledTimes(1);
      assertSpyResult(isWanEnabledSpy.mock.results, expectedRets);
    });

    test('Validate isWanEnabled - TR-181 + IP with success', () => {
      // The expected result was checked manually from the given json
      let expectedRets = [
        {success: true, index: '36'}, // First and only call return
      ];

      // Simulating editing the MaxMRUSize key
      let key = 'Device.IP.Interface.*.MaxMTUSize';

      // Spies
      let isWanEnabledSpy = jest.spyOn(utilHandlers, 'isWanEnabled');

      // Execute
      __testIsWanEnabled(tplinkHC220G5IPWanData, key, true);

      // Verify
      expect(isWanEnabledSpy).toHaveBeenCalledTimes(1);
      assertSpyResult(isWanEnabledSpy.mock.results, expectedRets);
    });

    test('Validate isWanEnabled - TR-069 + IP with failure', () => {
      // Json with no wan available
      let expectedRets = [
        {success: false, index: null}, // First call return
        {success: false, index: null}, // Second call return
      ];

      // Simulating editing the MaxMRUSize key
      let key = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
        'WANIPConnection.*.MaxMTUSize';

      // Spies
      let isWanEnabledSpy = jest.spyOn(utilHandlers, 'isWanEnabled');

      // Execute
      __testIsWanEnabled(noWanAvaliableWanData, key);

      // Verify
      expect(isWanEnabledSpy).toHaveBeenCalledTimes(2);
      assertSpyResult(isWanEnabledSpy.mock.results, expectedRets);
    });

    test('Validate traverseNestedKey - TR-069 + PPP with success', () => {
      // Simulating editing the MaxMRUSize key
      let key = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
        'WANPPPConnection.*.MaxMRUSize';

      // Expected return of traverseNestedKey
      let expectedKey = (key.replace(/\*/, '1')).replace(/\*/, '2');
      let expectedValue = getFromNestedKey(mercusysMR30GWanData, expectedKey);
      let expectedRet1 = [
        // First and only call return
        {success: true, key: expectedKey, value: expectedValue},
      ];

      // Expected returns of isWanEnabled
      let expectedRets2 = [
        {success: true, index: '1'}, // First call return
        {success: true, index: '2'}, // Second call return
      ];

      // Spies
      let isTraverseNestedKeySpy =
        jest.spyOn(utilHandlers, 'traverseNestedKey');
      let isWanEnabledSpy = jest.spyOn(utilHandlers, 'isWanEnabled');

      // Execute
      utilHandlers.traverseNestedKey(mercusysMR30GWanData, key, false, true);

      // Verify
      expect(isTraverseNestedKeySpy).toHaveBeenCalledTimes(1);
      assertSpyResult(isTraverseNestedKeySpy.mock.results, expectedRet1);

      expect(isWanEnabledSpy).toHaveBeenCalledTimes(2);
      assertSpyResult(isWanEnabledSpy.mock.results, expectedRets2);
    });

    test('Validate traverseNestedKey - TR-181 + PPP with success ', () => {
      // Simulating editing the MaxMRUSize key
      let key = 'Device.PPP.Interface.*.MaxMRUSize';

      // Expected return of traverseNestedKey
      let expectedKey = key.replace(/\*/, '20');
      let expectedValue =
        getFromNestedKey(tplinkHC220G5PPPWanData, expectedKey);
      let expectedRet1 = [
        // First and only call return
        {success: true, key: expectedKey, value: expectedValue},
      ];

      // Expected returns of isWanEnabled
      let expectedRets2 = [
        {success: true, index: '20'}, // First and only call return
      ];

      // Spies
      let isTraverseNestedKeySpy =
        jest.spyOn(utilHandlers, 'traverseNestedKey');
      let isWanEnabledSpy = jest.spyOn(utilHandlers, 'isWanEnabled');

      // Execute
      utilHandlers.traverseNestedKey(tplinkHC220G5PPPWanData, key, true, true);

      // Verify
      expect(isTraverseNestedKeySpy).toHaveBeenCalledTimes(1);
      assertSpyResult(isTraverseNestedKeySpy.mock.results, expectedRet1);

      expect(isWanEnabledSpy).toHaveBeenCalledTimes(1);
      assertSpyResult(isWanEnabledSpy.mock.results, expectedRets2);
    });
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
