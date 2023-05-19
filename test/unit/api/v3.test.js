require('../../../bin/globals');

const utils = require('../../common/utils');
const models = require('../../common/models');

const api = require('../../../controllers/api/v3');
const t = require('../../../controllers/language').i18next.t;


// API V3 Tests
describe('API V3 Tests', () => {
  // Tests if it can return an object that can be returned to the user
  describe('buildDeviceResponse Tests', () => {
    // Test what happens if not valid is passed
    test('Not valid', () => {
      // Variables
      const valid = false;
      const status = 123;
      const extra = 'test';

      // Execute
      let response = api.buildDeviceResponse(valid, status, extra);

      // Validate
      expect(response).toStrictEqual({
        valid: valid,
        statusCode: status,
        message: extra,
        json: {
          success: valid,
          message: extra,
          device: {},
        },
      });
    });

    // Test what happens if valid is passed
    test('Valid', () => {
      // Variables
      const valid = true;
      const status = 123;
      const extra = 'test';

      // Execute
      let response = api.buildDeviceResponse(valid, status, extra);

      // Validate
      expect(response).toStrictEqual({
        valid: valid,
        statusCode: status,
        message: t('OK'),
        json: {
          success: valid,
          message: t('OK'),
          device: extra,
        },
      });
    });
  });


  // Tests if it can return the response to the user
  describe('returnDevicesError Tests', () => {
    test('Normal operation', () => {
      // Spy
      let jsonSpy = jest.fn();
      let statusSpy = jest.fn().mockImplementation(() => ({json: jsonSpy}));

      // Variables
      let response = {status: statusSpy};
      const validation = {statusCode: 123, message: 'test'};

      // Execute
      api.returnDevicesError(response, validation);

      // Validate
      expect(statusSpy).toHaveBeenCalledWith(validation.statusCode);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: validation.message,
        devices: [],
      });
    });
  });


  // Test if it can validate a request properly
  describe('validateRequest Tests', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();

      // Mock response
      jest.spyOn(api, 'buildDeviceResponse')
        .mockImplementation((arg1, arg2, arg3) => ({
          arg1: arg1, arg2: arg2, arg3: arg3,
        }));
    });

    // The request did not come properly
    test.each(
      [
        null, undefined, {}, {params: null, query: {}},
        {params: undefined, query: {}}, {params: {}, query: null},
        {params: {}, query: undefined},
      ],
    )('Invalid request - %p', (request) => {
      // Execute
      const response = api.validateRequest(request);

      // Validate
      expect(response.arg1).toBe(false);
      expect(response.arg2).toBe(400);
      expect(response.arg3).toContain(
        t('requestError').replace('({{errorline}})', ''),
      );
    });

    // The request came properly
    test('Valid request', () => {
      // Execute
      const response = api.validateRequest({
        params: {}, query: {},
      });

      // Validate
      expect(response.valid).toBe(true);
    });
  });
});
