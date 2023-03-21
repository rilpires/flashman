require('../../../bin/globals');

const utils = require('../../common/utils');
const utilHandlers = require('../../../controllers/handlers/util');

describe('Utils Handler Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // isMacValid
  describe('isMacValid', () => {
    // Invalid MAC with invalid character
    test('Invalid MAC with invalid charactere', () => {
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
      let result = utilHandlers.getMaskFromAddress(parameter);

      // validate
      expect(result).toBe(null);
    });


    // Multiple /
    test('Multiple /', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('/////////////');

      // validate
      expect(result).toBe(null);
    });


    // Invalid number - Negative
    test('Invalid number - Negative', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('192.168.0.1/-1');

      // validate
      expect(result).toBe(null);
    });


    // Invalid number - Big
    test('Invalid number - Big', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('192.168.0.1/500');

      // validate
      expect(result).toBe(null);
    });


    // Okay IPv4
    test('Okay IPv4', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('192.168.0.1/24');

      // validate
      expect(result).toBe('24');
    });


    // Okay IPv6
    test('Okay IPv6', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('2804:1234:5678::/56');

      // validate
      expect(result).toBe('56');
    });


    // Limits - 0
    test('Limits - 0', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('192.168.0.1/0');

      // validate
      expect(result).toBe(null);
    });


    // Limits - 1
    test('Limits - 1', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('192.168.0.1/1');

      // validate
      expect(result).toBe('1');
    });


    // Limits - 128
    test('Limits - 128', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('192.168.0.1/128');

      // validate
      expect(result).toBe('128');
    });


    // Limits - 129
    test('Limits - 129', () => {
      // Execute
      let result = utilHandlers.getMaskFromAddress('192.168.0.1/129');

      // validate
      expect(result).toBe(null);
    });
  });
    });
  });
});
