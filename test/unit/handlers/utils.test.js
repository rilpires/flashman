require('../../../bin/globals');

const utils = require('../../common/utils');

const utilHandlers = require('../../../controllers/handlers/util');
const testUtils = require('../../utils');

let jsonPath = '../../assets/flashman-test/genie-data/wan/';
let mercusysMR30GWanData = require(jsonPath + 'mercusys-mr30g.json');
let tplinkHC220G5PPPWanData = require(jsonPath + 'tplink-hc220g5-PPP.json');
let tplinkHC220G5IPWanData = require(jsonPath + 'tplink-hc220g5-IP.json');
let noWanAvaliableWanData = require(jsonPath + 'no-wan-available.json');
let moreThanOneWanData = require(jsonPath + 'more-than-one-wan-available.json');

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
      testUtils.assertSpyResultStrictEqual(
        isWanEnabledSpy.mock.results, expectedRets,
      );
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
      console.log(isWanEnabledSpy.mock.results)
      testUtils.assertSpyResultStrictEqual(
        isWanEnabledSpy.mock.results, expectedRets,
      );
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
      testUtils.assertSpyResultStrictEqual(
        isWanEnabledSpy.mock.results, expectedRets,
      );
    });

    test(
      'Validate isWanEnabled - TR-069 + IP with failure - No WAN Available',
      () => {
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
      testUtils.assertSpyResultStrictEqual(
        isWanEnabledSpy.mock.results, expectedRets,
      );
    });

    test(
      'Validate isWanEnabled - TR-069 + IP with failure - ' +
      'Cannot resolve conflict',
      () => {
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
      __testIsWanEnabled(moreThanOneWanData, key);

      // Verify
      expect(isWanEnabledSpy).toHaveBeenCalledTimes(2);
      testUtils.assertSpyResultStrictEqual(
        isWanEnabledSpy.mock.results, expectedRets,
      );
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
      testUtils.assertSpyResultStrictEqual(
        isTraverseNestedKeySpy.mock.results, expectedRet1,
      );

      expect(isWanEnabledSpy).toHaveBeenCalledTimes(2);
      testUtils.assertSpyResultStrictEqual(
        isWanEnabledSpy.mock.results, expectedRets2,
      );
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
      testUtils.assertSpyResultStrictEqual(
        isTraverseNestedKeySpy.mock.results, expectedRet1,
      );

      expect(isWanEnabledSpy).toHaveBeenCalledTimes(1);
      testUtils.assertSpyResultStrictEqual(
        isWanEnabledSpy.mock.results, expectedRets2,
      );
    });
  });

  describe('Test utils regex functions', () => {
    test('Validate isMacValid - Invalid MAC with invalid charactere', () => {
      expect(utilHandlers.isMacValid('000000000000\n')).toBe(false);
    });

    // Invalid MAC
    test('Invalid MAC with no invalid charactere', () => {
      expect(utilHandlers.isMacValid('000000000000')).toBe(false);
    });

    // Normal MAC with invalid character
    test('Valid MAC with invalid charactere', () => {
      expect(utilHandlers.isMacValid('9C:A2:F4:5D:19:09\n')).toBe(false);
    });

    // Valid MAC
    test('Valid MAC with no invalid charactere', () => {
      expect(utilHandlers.isMacValid('9C:A2:F4:5D:19:09')).toBe(true);
    });
  });


  // getMaskFromAddress
  describe('getMaskFromAddress', () => {
    // Invalid types and strings
    test.each(
      utils.common.TEST_PARAMETERS,
    )('Invalid types and strings: %p', async (parameter) => {
      // Execute
      let result = utilHandlers.getMaskFromAddress(parameter, false);

      // validate
      expect(result).toBe(null);
    });


    // Multiple /
    test('Multiple /', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('/////////////', false);

      // validate
      expect(result).toBe(null);
    });


    // Invalid number - Negative
    test('Invalid number - Negative', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('192.168.0.1/-1', false);

      // validate
      expect(result).toBe(null);
    });


    // Invalid number - Big
    test('Invalid number - Big', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('192.168.0.1/500', false);

      // validate
      expect(result).toBe(null);
    });


    // Invalid number - Big 2
    test('Invalid number - Big 2', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('192.168.0.1/33', false);

      // validate
      expect(result).toBe(null);
    });


    // Invalid number - Big 3
    test('Invalid number - Big 3', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress(
        '2804:1234:5678::/200',
        true,
      );

      // validate
      expect(result).toBe(null);
    });


    // Okay IPv4
    test('Okay IPv4', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('192.168.0.1/24', false);

      // validate
      expect(result).toBe('24');
    });


    // Okay IPv6
    test('Okay IPv6', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('2804:1234:5678::/56', true);

      // validate
      expect(result).toBe('56');
    });


    // Limits - 0
    test('Limits - 0', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('192.168.0.1/0', false);

      // validate
      expect(result).toBe(null);
    });


    // Limits - 1
    test('Limits - 1', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('192.168.0.1/1', false);

      // validate
      expect(result).toBe('1');
    });


    // Limits - 32
    test('Limits - 32', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress(
        '192.168.0.1/32',
        false,
      );

      // validate
      expect(result).toBe('32');
    });


    // Limits - 33
    test('Limits - 33', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress(
        '192.168.0.1/33',
        false,
      );

      // validate
      expect(result).toBe(null);
    });


    // Limits - 128
    test('Limits - 128', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress(
        '2804:1234:5678::/128',
        true,
      );

      // validate
      expect(result).toBe('128');
    });


    // Limits - 129
    test('Limits - 129', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress(
        '2804:1234:5678::/129',
        true,
      );

      // validate
      expect(result).toBe(null);
    });
  });


  // traverseNestedKey
  describe('traverseNestedKey', () => {
    // Invalid data
    test('Invalid data', () => {
      // Execute
      let result = utilHandlers.traverseNestedKey(null, '123456');

      // Validate
      expect(result.success).toBe(false);
    });


    // Invalid key
    test('Invalid key', () => {
      // Execute
      let result = utilHandlers.traverseNestedKey({
        teste: '123',
        teste2: '456',
      }, '');

      // Validate
      expect(result.success).toBe(false);
    });


    // No key in data
    test('No key in data', () => {
      // Execute
      let result = utilHandlers.traverseNestedKey({
        teste: '123',
        teste2: '456',
      }, 'teste3.teste4');

      // Validate
      expect(result.success).toBe(false);
    });


    // Valid key and data
    test('Valid key and data', () => {
      let data = {
        teste: {teste2: '456'},
        teste3: {teste2: '123'},
      };

      // Execute
      let result = utilHandlers.traverseNestedKey(data, 'teste.teste2');

      // Validate
      expect(result.success).toBe(true);
      expect(result.key).toBe('teste.teste2');
      expect(result.value).toBe('456');
    });


    // Multiple keys
    test('Multiple keys', () => {
      let data = {
        teste: {
          0: {teste2: 'abc'},
          1: {teste2: '123'},
          2: {teste2: '456'},
          3: {teste2: '789'},
          4: {teste2: '012'},
        },
      };

      // Execute
      let result = utilHandlers.traverseNestedKey(data, 'teste.*.teste2');

      // Validate
      expect(result.success).toBe(true);
      expect(result.key).toBe('teste.0.teste2');
      expect(result.value).toBe('abc');
    });


    // Multiple keys - Last index
    test('Multiple keys - Last index', () => {
      let data = {
        teste: {
          0: {teste2: 'abc'},
          1: {teste2: '123'},
          2: {teste2: '456'},
          3: {teste2: '789'},
          4: {teste2: '012'},
        },
      };

      // Execute
      let result = utilHandlers.traverseNestedKey(data, 'teste.*.teste2', true);

      // Validate
      expect(result.success).toBe(true);
      expect(result.key).toBe('teste.4.teste2');
      expect(result.value).toBe('012');
    });
  });
});
