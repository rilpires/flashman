require('../../bin/globals');

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const utils = require('../common/utils');
const models = require('../common/models');

const measureController = require('../../controllers/handlers/acs/measures');
const utilHandlers = require('../../controllers/handlers/util');
const sio = require('../../sio');

const DeviceModel = require('../../models/device');

const http = require('http');
const t = require('../../controllers/language').i18next.t;


let GENIEHOST = (process.env.FLM_NBI_ADDR || 'localhost');
let GENIEPORT = (process.env.FLM_NBI_PORT || 7557);


// Mock the mqtts (avoid aedes)
jest.mock('../../mqtts', () => {
  return {
    __esModule: false,
    unifiedClientsMap: {},
    anlixMessageRouterUpdate: () => undefined,
    getConnectedClients: () => [],
  };
});


// Test measure functions
describe('Handlers/ACS/Measures Tests', () => {
  // Reset all mocks
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });


  // fetchPonSignalFromGenie
  describe('fetchPonSignalFromGenie', () => {
    // Invalid device id
    test('Invalid device id', async () => {
      // Mocks
      utils.common.mockDevices(null, 'findOne');

      // Execute
      let result = await measureController.fetchPonSignalFromGenie('1234');

      // Validate
      expect(result.success).toBe(false);
      expect(result.message).toContain(
        t('cpeFindError').replace('({{errorline}})', ''),
      );
    });


    // Could not get pon
    test('Could not get pon', async () => {
      let httpRequestOptions = {};
      const dataToPass = '1234,5678';
      const id = models.defaultMockDevices[0]._id;

      // Copy the device and assign a new one with pon capability
      let device = models.copyDeviceFrom(
        id,
        {
          model: 'G-140W-C',
          version: '3FE46343AFIA89',
          hw_version: '3FE46343AFIA89',
        },
      );


      // Mocks
      utils.common.mockDevices(device, 'findOne');


      // Spys
      jest.spyOn(utilHandlers, 'checkForNestedKey')
        .mockImplementation(() => false);
      jest.spyOn(utilHandlers, 'getFromNestedKey')
        .mockImplementationOnce(() => 30.5)
        .mockImplementationOnce(() => 2.3);

      let httpRequestSpy = jest.spyOn(http, 'request')
        .mockImplementationOnce(
          (options, callback) => {
            httpRequestOptions = options;
            // Call the callback immediately
            callback({
              on: async (event, callback2) => {
                // Pass the data and call the second callback
                if (event === 'data') {
                  callback2(dataToPass);
                } else if (event === 'end') {
                  await callback2();
                // If it is an invalid parameter, give an error
                } else {
                  expect(this.on).not.toHaveBeenCalled();
                }
              },

              setEncoding: () => true,
            });

            return {end: () => true};
          },
        );

      let appNotifySpy = jest.spyOn(sio, 'anlixSendPonSignalNotification')
          .mockImplementation(() => false);


      // Execute
      await measureController.fetchPonSignalFromGenie(id);


      // Validate
      expect(httpRequestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          hostname: GENIEHOST,
          port: GENIEPORT,
        }),
        expect.anything(),
      );
      expect(httpRequestSpy).toHaveBeenCalledWith(
        httpRequestOptions,
        expect.anything(),
      );
      expect(appNotifySpy).not.toHaveBeenCalled();
    });


    // Wrong pon power
    test('Wrong pon power', async () => {
      let httpRequestOptions = {};
      let promiseResolve;
      let resultPromise = new Promise((resolve) => {
        promiseResolve = resolve;
      });
      const dataToPass = '1234,5678';
      const id = models.defaultMockDevices[0]._id;

      // Copy the device and assign a new one with pon capability
      let device = models.copyDeviceFrom(
        id,
        {
          model: 'G-140W-C',
          version: '3FE46343AFIA89',
          hw_version: '3FE46343AFIA89',
        },
      );


      // Mocks
      utils.common.mockDevices(device, 'findOne');


      // Spys
      jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementationOnce(() => Promise.resolve());

      jest.spyOn(utilHandlers, 'checkForNestedKey')
        .mockImplementation(() => true);
      jest.spyOn(utilHandlers, 'getFromNestedKey')
        .mockImplementationOnce(() => undefined)
        .mockImplementationOnce(() => undefined);

      jest.spyOn(sio, 'anlixSendPonSignalNotification')
        .mockImplementationOnce(() => true);

      let httpRequestSpy = jest.spyOn(http, 'request')
        .mockImplementationOnce(
          (options, callback) => {
            httpRequestOptions = options;
            // Call the callback immediately
            callback({
              on: async (event, callback2) => {
                // Pass the data and call the second callback
                if (event === 'data') {
                  callback2(dataToPass);
                } else if (event === 'end') {
                  promiseResolve(await callback2());
                // If it is an invalid parameter, give an error
                } else {
                  expect(this.on).not.toHaveBeenCalled();
                }
              },

              setEncoding: () => true,
            });

            return {end: () => true};
          },
        );


      // Execute
      await measureController.fetchPonSignalFromGenie(id);


      // Validate
      expect(httpRequestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          hostname: GENIEHOST,
          port: GENIEPORT,
        }),
        expect.anything(),
      );
      expect(httpRequestSpy).toHaveBeenCalledWith(
        httpRequestOptions,
        expect.anything(),
      );
      expect(await resultPromise).toEqual(device.pon_signal_measure);
    });


    // Wrong pon array
    test('Wrong pon array', async () => {
      let httpRequestOptions = {};
      let promiseResolve;
      let resultPromise = new Promise((resolve) => {
        promiseResolve = resolve;
      });
      const dataToPass = '1234,5678';
      const id = models.defaultMockDevices[0]._id;

      // Copy the device and assign a new one with pon capability
      let device = models.copyDeviceFrom(
        id,
        {
          model: 'G-140W-C',
          version: '3FE46343AFIA89',
          hw_version: '3FE46343AFIA89',
          pon_signal_measure: undefined,
        },
      );


      // Mocks
      utils.common.mockDevices(device, 'findOne');


      // Spys
      jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementationOnce(() => Promise.resolve());

      jest.spyOn(utilHandlers, 'checkForNestedKey')
        .mockImplementation(() => true);
      jest.spyOn(utilHandlers, 'getFromNestedKey')
        .mockImplementationOnce(() => 30.5)
        .mockImplementationOnce(() => 2.4);

      jest.spyOn(sio, 'anlixSendPonSignalNotification')
        .mockImplementationOnce(() => true);

      let httpRequestSpy = jest.spyOn(http, 'request')
        .mockImplementationOnce(
          (options, callback) => {
            httpRequestOptions = options;
            // Call the callback immediately
            callback({
              on: async (event, callback2) => {
                // Pass the data and call the second callback
                if (event === 'data') {
                  callback2(dataToPass);
                } else if (event === 'end') {
                  promiseResolve(await callback2());
                // If it is an invalid parameter, give an error
                } else {
                  expect(this.on).not.toHaveBeenCalled();
                }
              },

              setEncoding: () => true,
            });

            return {end: () => true};
          },
        );


      // Execute
      await measureController.fetchPonSignalFromGenie(id);


      // Validate
      expect(httpRequestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          hostname: GENIEHOST,
          port: GENIEPORT,
        }),
        expect.anything(),
      );
      expect(httpRequestSpy).toHaveBeenCalledWith(
        httpRequestOptions,
        expect.anything(),
      );

      let result = await resultPromise;
      let expected = {};
      expected[Object.keys(result)[0]] = [-25.157, -36.198];
      expect(result).toStrictEqual(expected);
    });


    // Wrong pon parameters
    test('Wrong pon parameters', async () => {
      let httpRequestOptions = {};
      let promiseResolve;
      let resultPromise = new Promise((resolve) => {
        promiseResolve = resolve;
      });
      const dataToPass = '1234,5678';
      const id = models.defaultMockDevices[0]._id;

      // Copy the device and assign a new one with pon capability
      let device = models.copyDeviceFrom(
        id,
        {
          model: 'G-140W-C',
          version: '3FE46343AFIA89',
          hw_version: '3FE46343AFIA89',
          pon_signal_measure: undefined,
        },
      );


      // Mocks
      utils.common.mockDevices(device, 'findOne');


      // Spys
      jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementationOnce(() => Promise.resolve());

      jest.spyOn(utilHandlers, 'checkForNestedKey')
        .mockImplementation(() => true);
      jest.spyOn(utilHandlers, 'getFromNestedKey')
        .mockImplementationOnce(() => undefined)
        .mockImplementationOnce(() => undefined);

      jest.spyOn(sio, 'anlixSendPonSignalNotification')
        .mockImplementationOnce(() => true);

      let httpRequestSpy = jest.spyOn(http, 'request')
        .mockImplementationOnce(
          (options, callback) => {
            httpRequestOptions = options;
            // Call the callback immediately
            callback({
              on: async (event, callback2) => {
                // Pass the data and call the second callback
                if (event === 'data') {
                  callback2(dataToPass);
                } else if (event === 'end') {
                  promiseResolve(await callback2());
                // If it is an invalid parameter, give an error
                } else {
                  expect(this.on).not.toHaveBeenCalled();
                }
              },

              setEncoding: () => true,
            });

            return {end: () => true};
          },
        );


      // Execute
      await measureController.fetchPonSignalFromGenie(id);


      // Validate
      expect(httpRequestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          hostname: GENIEHOST,
          port: GENIEPORT,
        }),
        expect.anything(),
      );
      expect(httpRequestSpy).toHaveBeenCalledWith(
        httpRequestOptions,
        expect.anything(),
      );

      let result = await resultPromise;
      let expected = {};
      expected[Object.keys(result)[0]] = [-25.157, -36.198];
      expect(result).toStrictEqual({});
    });
  });


  // Wrong original
  describe('appendPonSignal', () => {
    // Wrong original
    test('Wrong original', async () => {
      // Execute
      let result = measureController
        .appendPonSignal(undefined, -25.157, -36.198);


      // Validate
      let expected = {};
      expected[Object.keys(result)[0]] = [-25.157, -36.198];
      expect(result).toEqual(expected);
    });


    // Wrong tx/rx power
    test('Wrong tx/rx power', async () => {
      // Execute
      let result = measureController.appendPonSignal(
        {'12345': [678, 901]},
        undefined,
        undefined,
      );


      // Validate
      expect(result).toEqual({'12345': [678, 901]});
    });


    // Both wrong
    test('Both wrong', async () => {
      // Execute
      let result = measureController.appendPonSignal(
        undefined,
        undefined,
        undefined,
      );


      // Validate
      expect(result).toEqual({});
    });
  });
});
