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

describe('Utils Handler Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Test functions that handles nested genie object', () => {
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
