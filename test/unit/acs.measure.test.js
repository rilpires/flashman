require('../../bin/globals');
const measureController = require('../../controllers/handlers/acs/measures');
const utilHandlers = require('../../controllers/handlers/util');
const sio = require('../../sio');

const DeviceModel = require('../../models/device');

const utils = require('../common/utils');
const models = require('../common/models');

const http = require('http');
const t = require('../../controllers/language').i18next.t;


let GENIEHOST = (process.env.FLM_NBI_ADDR || 'localhost');
let GENIEPORT = (process.env.FLM_NBI_PORT || 7557);


// Test measure functions
describe('Handlers/ACS/Measures Tests', () => {
  // Reset all mocks
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });


  // fetchPonSignalFromGenie - Invalid device id
  test('Validate fetchPonSignalFromGenie - Invalid device id', async () => {
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


  // fetchPonSignalFromGenie - Could not get pon
  test('Validate fetchPonSignalFromGenie - Could not get pon', async () => {
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


  // fetchPonSignalFromGenie - Wrong pon power
  test('Validate fetchPonSignalFromGenie - Wrong pon power', async () => {
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


  // fetchPonSignalFromGenie - Wrong pon array
  test('Validate fetchPonSignalFromGenie - Wrong pon array', async () => {
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


  // fetchPonSignalFromGenie - Wrong pon parameters
  test('Validate fetchPonSignalFromGenie - Wrong pon parameters', async () => {
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
