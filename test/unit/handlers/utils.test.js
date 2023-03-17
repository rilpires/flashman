require('../../../bin/globals');
const utils = require('../../common/utils');
const utilHandlers = require('../../../controllers/handlers/util');

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
