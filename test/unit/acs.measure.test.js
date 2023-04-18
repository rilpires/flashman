require('../../bin/globals');

const utils = require('../common/utils');
const models = require('../common/models');

const measureController = require('../../controllers/handlers/acs/measures');
const utilHandlers = require('../../controllers/handlers/util');
const tasksAPI = require('../../controllers/external-genieacs/tasks-api');
const sio = require('../../sio');

const DeviceModel = require('../../models/device');

const http = require('http');
const fieldsAndPermissions = require('../common/fieldsAndPermissions');
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
    // TaskAPI must fail with wrong json
    test('Wrong pon power', async () => {
      let httpRequestOptions = {};
      let promiseResolve;
      let resultPromise = new Promise((resolve) => {
        promiseResolve = resolve;
      });
      const origData = {'1671052379': [-14, 3]};
      const dataToPass = '1234,5678';
      const id = models.defaultMockDevices[0]._id;

      // Copy the device and assign a new one with pon capability
      let device = models.copyDeviceFrom(
        id,
        {
          model: 'G-140W-C',
          version: '3FE46343AFIA89',
          hw_version: '3FE46343AFIA89',
          pon_signal_measure: origData,
        },
      );

      // Mocks
      utils.common.mockAwaitDevices(device, 'findOne');

      // Spys
      jest.spyOn(sio, 'anlixSendPonSignalNotification')
        .mockImplementationOnce(() => true);

      // This request will run from TaskAPI
      // The dataToPass is a invalid Json
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
      // Return from TaskAPI is undefined
      expect(await resultPromise).toEqual(undefined);
      // Device must not be changed!
      expect(device.pon_signal_measure).toEqual(origData);
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


  describe('checkAndGetGenieField', () => {
    // Invalid data
    test('Invalid data', async () => {
      // Mocks
      let checkSpy = jest.spyOn(utilHandlers, 'checkForNestedKey')
        .mockImplementation(() => true);

      // Execute
      let result = measureController.__testCheckAndGetGenieField(
        null, 'abc',
      );

      // Validate
      expect(checkSpy).not.toBeCalled();
      expect(result.success).toBe(false);
      expect(result.value).toBe(null);
    });


    // Invalid field
    test('Invalid field', async () => {
      // Mocks
      let checkSpy = jest.spyOn(utilHandlers, 'checkForNestedKey')
        .mockImplementation(() => true);

      // Execute
      let result = measureController.__testCheckAndGetGenieField(
        'abc', null,
      );

      // Validate
      expect(checkSpy).not.toBeCalled();
      expect(result.success).toBe(false);
      expect(result.value).toBe(null);
    });


    // Check fails
    test('Check fails', async () => {
      // Mocks
      let checkSpy = jest.spyOn(utilHandlers, 'checkForNestedKey')
        .mockImplementation(() => false);

      // Execute
      let result = measureController.__testCheckAndGetGenieField(
        'abc', 'abc',
      );

      // Validate
      expect(checkSpy).toBeCalled();
      expect(result.success).toBe(false);
      expect(result.value).toBe(null);
    });


    // Invalid value
    test('Invalid value', async () => {
      // Mocks
      let checkSpy = jest.spyOn(utilHandlers, 'checkForNestedKey')
        .mockImplementation(() => true);
      let getSpy = jest.spyOn(utilHandlers, 'getFromNestedKey')
        .mockImplementation(() => null);

      // Execute
      let result = measureController.__testCheckAndGetGenieField(
        'abc', 'abc',
      );

      // Validate
      expect(checkSpy).toBeCalled();
      expect(getSpy).toBeCalled();
      expect(result.success).toBe(false);
      expect(result.value).toBe(null);
    });


    // Okay
    test('Okay', async () => {
      // Mocks
      let checkSpy = jest.spyOn(utilHandlers, 'checkForNestedKey')
        .mockImplementation(() => true);
      let getSpy = jest.spyOn(utilHandlers, 'getFromNestedKey')
        .mockImplementation(() => {
          return {_value: 5};
        });

      // Execute
      let result = measureController.__testCheckAndGetGenieField(
        'abc', 'abc',
      );

      // Validate
      expect(checkSpy).toBeCalled();
      expect(getSpy).toBeCalled();
      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
    });
  });


  // fetchWanBytesFromGenie
  describe('fetchWanBytesFromGenie', () => {
    // Invalid acs ID - empty string
    test('Invalid acs ID - empty string', async () => {
      // Mocks
      utils.common.mockDevices(null, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => true);

      // Execute
      await measureController.fetchWanBytesFromGenie('');

      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });


    // Invalid acs ID - null
    test('Invalid acs ID - null', async () => {
      // Mocks
      utils.common.mockDevices(null, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => true);

      // Execute
      await measureController.fetchWanBytesFromGenie(null);

      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });


    // Invalid device
    test('Invalid device', async () => {
      // Mocks
      utils.common.mockDevices(null, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => true);

      // Execute
      await measureController.fetchWanBytesFromGenie('abc');

      // Validate
      expect(errorSpy).toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });


    // Device not TR-069
    test('Device not TR-069', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.use_tr069 = false;

      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => true);

      // Execute
      await measureController.fetchWanBytesFromGenie('abc');

      // Validate
      expect(errorSpy).toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });

    // Invalid cpe instance
    test('Invalid cpe instance', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.acs_id = '';

      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => true);

      // Execute
      await measureController.fetchWanBytesFromGenie('abc');

      // Validate
      expect(errorSpy).toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });

    // Invalid data response
    test('Invalid data response', async () => {
      let device = {...models.defaultMockDevices[0]};

      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => false);

      // Execute
      await measureController.fetchWanBytesFromGenie('abc');

      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalled();
    });

    // Fields with *
    test('Fields with *', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        0: {
          recv_bytes: {_value: '1234'},
          sent_bytes: {_value: '1234'},
        }, 1: {
          recv_bytes: {_value: '5678'},
          sent_bytes: {_value: '8765'},
        },
      }, diagnostics: {
        0: {statistics: {
          cpu_usage: {_value: '12'},
          memory_free: {_value: '1234'},
          memory_total: {_value: '5678'},
        }}, 1: {statistics: {
          cpu_usage: {_value: '56'},
          memory_free: {_value: '5678'},
          memory_total: {_value: '9012'},
        }},
      }}];
      let permissions = {...fieldsAndPermissions.cpePermissions[0]};
      let fields = fieldsAndPermissions.setAllObjectValues(
        fieldsAndPermissions.fields[0], '',
      );
      fields.wan.recv_bytes = 'wan.*.recv_bytes';
      fields.wan.sent_bytes = 'wan.*.sent_bytes';

      fields.diagnostics.statistics.cpu_usage =
        'diagnostics.*.statistics.cpu_usage';
      fields.diagnostics.statistics.memory_free =
        'diagnostics.*.statistics.memory_free';
      fields.diagnostics.statistics.memory_total =
        'diagnostics.*.statistics.memory_total';

      // Mocks
      utils.common.mockAwaitDevices(device, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fields,
      );
      jest.useFakeTimers().setSystemTime(Date.now());

      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);

      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan,wan,diagnostics,diagnostics,diagnostics',
      );
      expect(device.wan_bytes).toStrictEqual(wanBytes);
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            cpu_usage: 56,
            // Math.ceil((Free - Total) * 100 / Total)
            mem_usage: Math.ceil((9012 - 5678) * 100 / 9012),
          },
        },
      );
    });

    // Fields with * - Memory usage field
    test('Fields with * - Memory usage field', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        0: {
          recv_bytes: {_value: '1234'},
          sent_bytes: {_value: '1234'},
        }, 1: {
          recv_bytes: {_value: '5678'},
          sent_bytes: {_value: '8765'},
        },
      }, diagnostics: {
        0: {statistics: {
          cpu_usage: {_value: '12'},
          memory_usage: {_value: '34'},
        }}, 1: {statistics: {
          cpu_usage: {_value: '56'},
          memory_usage: {_value: '78'},
        }},
      }}];
      let permissions = {...fieldsAndPermissions.cpePermissions[0]};
      let fields = fieldsAndPermissions.setAllObjectValues(
        fieldsAndPermissions.fields[0], '',
      );
      fields.wan.recv_bytes = 'wan.*.recv_bytes';
      fields.wan.sent_bytes = 'wan.*.sent_bytes';

      fields.diagnostics.statistics.cpu_usage =
        'diagnostics.*.statistics.cpu_usage';
      fields.diagnostics.statistics.memory_usage =
        'diagnostics.*.statistics.memory_usage';


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fields,
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan,wan,diagnostics,diagnostics',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            cpu_usage: 56,
            mem_usage: 78,
          },
        },
      );
    });


    // No permission
    test('No permission', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '5678'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: '56'},
        memory_usage: {_value: '78'},
        memory_free: {_value: '5678'},
        memory_total: {_value: '9012'},
      }}}];
      let permissions = fieldsAndPermissions.setAllObjectValues(
        fieldsAndPermissions.cpePermissions[0], false,
      );


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '5678'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {wanbytes: wanBytes},
      );
    });


    // All permissions with no data
    test('All permissions with no data', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{teste: '123'}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).not.toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {},
      );
    });


    // All permissions
    test('All permissions', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: '56'},
        memory_free: {_value: '5678'},
        memory_total: {_value: '9012'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            cpu_usage: 56,
            // Math.ceil((Free - Total) * 100 / Total)
            mem_usage: Math.ceil((9012 - 5678) * 100 / 9012),
          },
        },
      );
    });


    // All permissions - Memory usage
    test('All permissions - Memory usage', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: '56'},
        memory_usage: {_value: '78'},
        memory_free: {_value: '5678'},
        memory_total: {_value: '9012'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            cpu_usage: 56,
            mem_usage: 78,
          },
        },
      );
    });


    // Invalid CPU usage - -1
    test('Invalid CPU usage - -1', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: '-1'},
        memory_free: {_value: '5678'},
        memory_total: {_value: '9012'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            // Math.ceil((Free - Total) * 100 / Total)
            mem_usage: Math.ceil((9012 - 5678) * 100 / 9012),
          },
        },
      );
    });


    // Invalid CPU usage - 101
    test('Invalid CPU usage - 101', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: '101'},
        memory_free: {_value: '5678'},
        memory_total: {_value: '9012'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            // Math.ceil((Free - Total) * 100 / Total)
            mem_usage: Math.ceil((9012 - 5678) * 100 / 9012),
          },
        },
      );
    });


    // Invalid CPU usage - character
    test('Invalid CPU usage - character', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: 'a'},
        memory_free: {_value: '5678'},
        memory_total: {_value: '9012'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            // Math.ceil((Free - Total) * 100 / Total)
            mem_usage: Math.ceil((9012 - 5678) * 100 / 9012),
          },
        },
      );
    });


    // Invalid Memory usage - -1
    test('Invalid Memory usage - -1', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: '50'},
        memory_usage: {_value: '-1'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            cpu_usage: 50,
          },
        },
      );
    });


    // Invalid Memory usage - 101
    test('Invalid Memory usage - 101', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: '50'},
        memory_usage: {_value: '101'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            cpu_usage: 50,
          },
        },
      );
    });


    // Invalid Memory usage - character
    test('Invalid Memory usage - character', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: '15'},
        memory_usage: {_value: 'a'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            // Math.ceil((Free - Total) * 100 / Total)
            cpu_usage: 15,
          },
        },
      );
    });


    // Invalid Memory Free - -1
    test('Invalid Memory Free - -1', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: '50'},
        memory_free: {_value: '-1'},
        memory_total: {_value: '9012'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            cpu_usage: 50,
          },
        },
      );
    });


    // Invalid Memory Free - Bigger than Memory Total
    test('Invalid Memory Free - Bigger than Memory Total', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: '50'},
        memory_free: {_value: '200'},
        memory_total: {_value: '100'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            cpu_usage: 50,
          },
        },
      );
    });


    // Invalid Memory Free - character
    test('Invalid Memory Free - character', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: '50'},
        memory_free: {_value: 'a'},
        memory_total: {_value: '100'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            cpu_usage: 50,
          },
        },
      );
    });


    // Invalid Memory Total - -1
    test('Invalid Memory Total - -1', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: '50'},
        memory_free: {_value: '200'},
        memory_total: {_value: '-1'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            cpu_usage: 50,
          },
        },
      );
    });


    // Invalid Memory Total - character
    test('Invalid Memory Total - character', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: '50'},
        memory_free: {_value: '200'},
        memory_total: {_value: 'a'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          wanbytes: wanBytes,
          resources: {
            cpu_usage: 50,
          },
        },
      );
    });


    // Invalid Memory Total and CPU usage
    test('Invalid Memory Total and CPU usage', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: 'a'},
        memory_free: {_value: '200'},
        memory_total: {_value: 'a'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {wanbytes: wanBytes},
      );
    });


    // Invalid Memory Free and CPU usage
    test('Invalid Memory Free and CPU usage', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = [{wan: {
        recv_bytes: {_value: '5678'},
        sent_bytes: {_value: '8765'},
      }, diagnostics: {statistics: {
        cpu_usage: {_value: 'a'},
        memory_free: {_value: 'a'},
        memory_total: {_value: '100'},
      }}}];


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => {
          return {catch: () => true};
        });
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => data);
      let sioSpy = jest.spyOn(sio, 'anlixSendStatisticsNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );
      jest.useFakeTimers().setSystemTime(Date.now());


      // Execute
      await measureController.fetchWanBytesFromGenie(device.acs_id);


      // Validate
      let wanBytes = {};
      wanBytes[Object.keys(device.wan_bytes)[0]] =
        device.wan_bytes[Object.keys(device.wan_bytes)[0]];
      wanBytes[Date.now().toString().slice(0, -3)] = ['5678', '8765'];

      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toHaveBeenCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.recv_bytes,wan.sent_bytes,diagnostics.statistics.cpu_usage,' +
        'diagnostics.statistics.memory_usage,diagnostics.statistics.' +
        'memory_free,diagnostics.statistics.' +
        'memory_total',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {wanbytes: wanBytes},
      );
    });
  });


  // fetchWanInformationFromGenie
  describe('fetchWanInformationFromGenie', () => {
    // Invalid acs ID - empty string
    test('Invalid acs ID - empty string', async () => {
      // Mocks
      utils.common.mockDevices(null, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{}]);

      // Execute
      await measureController.fetchWanInformationFromGenie('');

      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });


    // Invalid acs ID - null
    test('Invalid acs ID - null', async () => {
      // Mocks
      utils.common.mockDevices(null, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{}]);

      // Execute
      await measureController.fetchWanInformationFromGenie(null);

      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });


    // Invalid device
    test('Invalid device', async () => {
      // Mocks
      utils.common.mockDevices(null, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{}]);

      // Execute
      await measureController.fetchWanInformationFromGenie('abc');

      // Validate
      expect(errorSpy).toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });


    // Device not TR-069
    test('Device not TR-069', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.use_tr069 = false;

      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{}]);

      // Execute
      await measureController.fetchWanInformationFromGenie('abc');

      // Validate
      expect(errorSpy).toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });


    // Invalid cpe instance
    test('Invalid cpe instance', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.acs_id = '';

      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{}]);

      // Execute
      await measureController.fetchWanInformationFromGenie('abc');

      // Validate
      expect(errorSpy).toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });


    // Fields with *
    test('Fields with *', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.connection_type = 'dhcp';
      let data = {wan: {
        0: {
          wan_ip: {_value: '1234'},
          mask_ipv4: {_value: '1234'},
          remote_address: {_value: '1234'},
          remote_mac: {_value: '1234'},
          default_gateway: {_value: '1234'},
          dns_servers: {_value: '1234'},
        }, 1: {
          wan_ip: {'_value': '5678'},
          mask_ipv4: {'_value': '5678'},
          remote_address: {'_value': '5678'},
          remote_mac: {'_value': '5678'},
          default_gateway: {'_value': '5678'},
          dns_servers: {'_value': '5678'},
      }}, ipv6: {
        0: {
          address: {'_value': '1234'},
          mask: {'_value': '1234'},
          default_gateway: {'_value': '1234'},
        }, 1: {
          address: {_value: '5678'},
          mask: {_value: '5678'},
          default_gateway: {_value: '5678'},
      }}};
      let permissions = {...fieldsAndPermissions.cpePermissions[0]};
      let fields = fieldsAndPermissions.setAllObjectValues(
        fieldsAndPermissions.fields[0], '',
      );
      fields.wan.wan_ip = 'wan.*.wan_ip';
      fields.wan.mask_ipv4 = 'wan.*.mask_ipv4';
      fields.wan.remote_address = 'wan.*.remote_address';
      fields.wan.remote_mac = 'wan.*.remote_mac';
      fields.wan.default_gateway = 'wan.*.default_gateway';
      fields.wan.dns_servers = 'wan.*.dns_servers';

      fields.ipv6.address = 'ipv6.*.address';
      fields.ipv6.mask = 'ipv6.*.mask';
      fields.ipv6.default_gateway = 'ipv6.*.default_gateway';


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendWanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fields,
      );


      // Execute
      await measureController.fetchWanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan,ipv6,wan,ipv6,wan,wan,wan,ipv6,wan',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          default_gateway_v4: '5678',
          default_gateway_v6: '5678',
          dns_server: '5678',
          ipv4_address: '5678',
          ipv4_mask: '5678',
          ipv6_address: '5678',
          ipv6_mask: '5678',
          pppoe_ip: '5678',
          pppoe_mac: '5678',
          wan_conn_type: device.connection_type,
        },
      );
    });


    // No permission
    test('No permission', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = {wan: {wan_ip_ppp: {_value: '192.168.0.11'}}};
      let permissions = fieldsAndPermissions.setAllObjectValues(
        fieldsAndPermissions.cpePermissions[0], false,
      );


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendWanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fieldsAndPermissions.fields[0],
       );


      // Execute
      await measureController.fetchWanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.wan_ip_ppp',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          ipv4_address: '192.168.0.11',
          ipv4_mask: '',
          ipv6_address: '',
          ipv6_mask: '0',
          default_gateway_v4: '',
          default_gateway_v6: '',
          dns_server: '',
          wan_conn_type: device.connection_type,
          pppoe_mac: '',
          pppoe_ip: '',
        },
      );
    });


    // No IPv6 permission
    test('No IPv6 permission', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.connection_type = 'pppoe';
      let data = {wan: {
          wan_ip_ppp: {_value: '1234'},
          mask_ipv4_ppp: {_value: '5678'},
          remote_address_ppp: {_value: '9012'},
          remote_mac_ppp: {_value: '3456'},
          default_gateway_ppp: {_value: '7890'},
          dns_servers_ppp: {_value: '1234'}},
        ipv6: {
          address_ppp: {_value: '1234'},
          mask_ppp: {_value: '5678'},
          default_gateway_ppp: {_value: '9012'},
        },
      };
      let permissions = fieldsAndPermissions.setAllObjectValues(
        fieldsAndPermissions.cpePermissions[0], true,
      );
      permissions.features.hasIpv6Information = false;


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendWanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fieldsAndPermissions.fields[0],
      );


      // Execute
      await measureController.fetchWanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.wan_ip_ppp,wan.mask_ipv4_ppp,wan.remote_address_ppp,' +
        'wan.remote_mac_ppp,wan.default_gateway_ppp,wan.dns_servers_ppp',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          default_gateway_v4: '7890',
          default_gateway_v6: '',
          dns_server: '1234',
          ipv4_address: '1234',
          ipv4_mask: '5678',
          ipv6_address: '',
          ipv6_mask: '0',
          pppoe_ip: '9012',
          pppoe_mac: '3456',
          wan_conn_type: device.connection_type,
        },
      );
    });


    // All permissions with no data
    test('All permissions with no data', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = {teste: '123'};


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendWanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );


      // Execute
      await measureController.fetchWanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.wan_ip_ppp,ipv6.address_ppp,wan.mask_ipv4_ppp,ipv6.mask_ppp,' +
        'wan.remote_address_ppp,wan.remote_mac_ppp,wan.default_gateway_ppp,' +
        'ipv6.default_gateway_ppp,wan.dns_servers_ppp',
      );
      expect(saveSpy).not.toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          ipv4_address: '',
          ipv4_mask: '',
          ipv6_address: '',
          ipv6_mask: '0',
          default_gateway_v4: '',
          default_gateway_v6: '',
          dns_server: '',
          wan_conn_type: device.connection_type,
          pppoe_mac: '',
          pppoe_ip: '',
        },
      );
    });


    // All permissions - PPPoE
    test('All permissions - PPPoE', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.connection_type = 'pppoe';
      let data = {wan: {
          wan_ip_ppp: {_value: '1234'},
          mask_ipv4_ppp: {_value: '5678'},
          remote_address_ppp: {_value: '9012'},
          remote_mac_ppp: {_value: '3456'},
          default_gateway_ppp: {_value: '7890'},
          dns_servers_ppp: {_value: '1234'}},
        ipv6: {
          address_ppp: {_value: '1234'},
          mask_ppp: {_value: '5678'},
          default_gateway_ppp: {_value: '9012'},
        },
      };


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendWanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );


      // Execute
      await measureController.fetchWanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.wan_ip_ppp,ipv6.address_ppp,wan.mask_ipv4_ppp,ipv6.mask_ppp,' +
        'wan.remote_address_ppp,wan.remote_mac_ppp,wan.default_gateway_ppp,' +
        'ipv6.default_gateway_ppp,wan.dns_servers_ppp',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          default_gateway_v4: '7890',
          default_gateway_v6: '9012',
          dns_server: '1234',
          ipv4_address: '1234',
          ipv4_mask: '5678',
          ipv6_address: '1234',
          ipv6_mask: '5678',
          pppoe_ip: '9012',
          pppoe_mac: '3456',
          wan_conn_type: device.connection_type,
        },
      );
    });


    // All permissions - DHCP
    test('All permissions - DHCP', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.connection_type = 'dhcp';
      let data = {wan: {
          wan_ip: {_value: '1234'},
          mask_ipv4: {_value: '5678'},
          remote_address: {_value: '9012'},
          remote_mac: {_value: '3456'},
          default_gateway: {_value: '7890'},
          dns_servers: {_value: '1234'}},
        ipv6: {
          address: {_value: '1234'},
          mask: {_value: '5678'},
          default_gateway: {_value: '9012'},
        },
      };


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendWanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );


      // Execute
      await measureController.fetchWanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.wan_ip,ipv6.address,wan.mask_ipv4,ipv6.mask,' +
        'wan.remote_address,wan.remote_mac,wan.default_gateway,' +
        'ipv6.default_gateway,wan.dns_servers',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          default_gateway_v4: '7890',
          default_gateway_v6: '9012',
          dns_server: '1234',
          ipv4_address: '1234',
          ipv4_mask: '5678',
          ipv6_address: '1234',
          ipv6_mask: '5678',
          pppoe_ip: '9012',
          pppoe_mac: '3456',
          wan_conn_type: device.connection_type,
        },
      );
    });


    // Mask from address field
    test('Mask from address field', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.connection_type = 'dhcp';
      let data = {wan: {
        wan_ip: {_value: '1234/24'},
        mask_ipv4: {_value: '56'},
        remote_address: {_value: '3456'},
        remote_mac: {_value: '7890'},
        default_gateway: {_value: '2341'},
        dns_servers: {_value: '9012'},
      }, ipv6: {
        address: {_value: '1234/24'},
        mask: {_value: '56'},
        default_gateway: {_value: '9012'},
      }};
      let permissions = fieldsAndPermissions.setAllObjectValues(
        fieldsAndPermissions.cpePermissions[0], true,
      );


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendWanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fieldsAndPermissions.fields[0],
      );


      // Execute
      await measureController.fetchWanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.wan_ip,ipv6.address,wan.mask_ipv4,ipv6.mask,' +
        'wan.remote_address,wan.remote_mac,wan.default_gateway,' +
        'ipv6.default_gateway,wan.dns_servers',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          ipv4_address: '1234/24',
          ipv4_mask: '56',
          ipv6_address: '1234',
          ipv6_mask: '56',

          default_gateway_v4: '2341',
          default_gateway_v6: '9012',
          dns_server: '9012',
          pppoe_ip: '3456',
          pppoe_mac: '7890',
          wan_conn_type: device.connection_type,
        },
      );
    });


    // Mask from mask field
    test('Mask from mask field', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.connection_type = 'dhcp';
      let data = {wan: {
          wan_ip: {_value: '1234/24'},
          mask_ipv4: {_value: '56'},
          remote_address: {_value: '3456'},
          remote_mac: {_value: '7890'},
          default_gateway: {_value: '2341'},
          dns_servers: {_value: '9012'},
        }, ipv6: {
          address: {_value: '1234/24'},
          mask: {_value: '56'},
          default_gateway: {_value: '9012'},
      }};
      let permissions = fieldsAndPermissions.setAllObjectValues(
        fieldsAndPermissions.cpePermissions[0], true,
      );


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendWanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fieldsAndPermissions.fields[0],
      );


      // Execute
      await measureController.fetchWanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan.wan_ip,ipv6.address,wan.mask_ipv4,ipv6.mask,' +
        'wan.remote_address,wan.remote_mac,wan.default_gateway,' +
        'ipv6.default_gateway,wan.dns_servers',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          ipv4_address: '1234/24',
          ipv4_mask: '56',
          ipv6_address: '1234',
          ipv6_mask: '56',

          default_gateway_v4: '2341',
          default_gateway_v6: '9012',
          dns_server: '9012',
          pppoe_ip: '3456',
          pppoe_mac: '7890',
          wan_conn_type: device.connection_type,
        },
      );
    });
  });


  // fetchLanInformationFromGenie
  describe('fetchLanInformationFromGenie', () => {
    // Invalid acs ID - empty string
    test('Invalid acs ID - empty string', async () => {
      // Mocks
      utils.common.mockDevices(null, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{}]);

      // Execute
      await measureController.fetchLanInformationFromGenie('');

      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });


    // Invalid acs ID - null
    test('Invalid acs ID - null', async () => {
      // Mocks
      utils.common.mockDevices(null, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{}]);

      // Execute
      await measureController.fetchLanInformationFromGenie('');

      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });


    // Invalid device
    test('Invalid device', async () => {
      // Mocks
      utils.common.mockDevices(null, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{}]);

      // Execute
      await measureController.fetchLanInformationFromGenie('abc');

      // Validate
      expect(errorSpy).toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });


    // Device not TR-069
    test('Device not TR-069', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.use_tr069 = false;

      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{}]);

      // Execute
      await measureController.fetchLanInformationFromGenie('abc');

      // Validate
      expect(errorSpy).toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });


    // Invalid cpe instance
    test('Invalid cpe instance', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.acs_id = '';

      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [{}]);

      // Execute
      await measureController.fetchLanInformationFromGenie('abc');

      // Validate
      expect(errorSpy).toBeCalled();
      expect(requestSpy).not.toBeCalled();
    });


    // No IPv6 information
    test('No IPv6 information', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = {wan: {wan_ip_ppp: {_value: '192.168.0.11'}}};
      let permissions = fieldsAndPermissions.setAllObjectValues(
        fieldsAndPermissions.cpePermissions[0], false,
      );


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendLanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fieldsAndPermissions.fields[0],
       );


      // Execute
      await measureController.fetchLanInformationFromGenie('abc');


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).not.toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          prefix_delegation_addr: '',
          prefix_delegation_local: '',
          prefix_delegation_mask: '',
        },
      );
    });


    // Fields with *
    test('Fields with *', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.connection_type = 'dhcp';
      let data = {wan: {0: {
        prefix_delegation_address: {_value: '1234'},
        prefix_delegation_local: {_value: '9012'},
      }, 1: {
        prefix_delegation_address: {_value: '5678'},
        prefix_delegation_local: {_value: '3456'},
      }}};
      let permissions = {...fieldsAndPermissions.cpePermissions[0]};
      let fields = fieldsAndPermissions.setAllObjectValues(
        fieldsAndPermissions.fields[0], '',
      );
      fields.ipv6.prefix_delegation_address = 'wan.*.prefix_delegation_address';
      fields.ipv6.prefix_delegation_mask = 'wan.*.prefix_delegation_mask';
      fields.ipv6.prefix_delegation_local_address =
        'wan.*.prefix_delegation_local';


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendLanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fields,
       );


      // Execute
      await measureController.fetchLanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        'wan,wan,wan',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          prefix_delegation_addr: '5678',
          prefix_delegation_local: '3456',
          prefix_delegation_mask: '',
        },
      );
    });


    // No permission
    test('No permission', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = {wan: {wan_ip_ppp: {_value: '192.168.0.11'}}};
      let permissions = fieldsAndPermissions.setAllObjectValues(
        fieldsAndPermissions.cpePermissions[0], false,
      );
      permissions.features.hasIpv6Information = true;


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendLanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fieldsAndPermissions.fields[0],
       );


      // Execute
      await measureController.fetchLanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        '',
      );
      expect(saveSpy).not.toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          prefix_delegation_addr: '',
          prefix_delegation_local: '',
          prefix_delegation_mask: '',
        },
      );
    });


    // No IPv6 permission
    test('No IPv6 permission', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.connection_type = 'pppoe';
      let data = {ipv6: {
        prefix_delegation_address_ppp: {_value: '1234'},
        prefix_delegation_mask_ppp: {_value: '5678'},
        prefix_delegation_local_address_ppp: {_value: '9012'},
      }};
      let permissions = fieldsAndPermissions.setAllObjectValues(
        fieldsAndPermissions.cpePermissions[0], true,
      );
      permissions.features.hasIpv6Information = false;


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendLanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fieldsAndPermissions.fields[0],
      );


      // Execute
      await measureController.fetchLanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).not.toBeCalled();
      expect(saveSpy).not.toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          prefix_delegation_addr: '',
          prefix_delegation_mask: '',
          prefix_delegation_local: '',
        },
      );
    });


    // All permissions with no data
    test('All permissions with no data', async () => {
      let device = {...models.defaultMockDevices[0]};
      let data = {teste: '123'};


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendLanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );


      // Execute
      await measureController.fetchLanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        'ipv6.prefix_delegation_address_ppp,ipv6.prefix_delegation_mask_ppp,' +
        'ipv6.prefix_delegation_local_address_ppp',
      );
      expect(saveSpy).not.toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          prefix_delegation_addr: '',
          prefix_delegation_local: '',
          prefix_delegation_mask: '',
        },
      );
    });


    // All permissions - PPPoE
    test('All permissions - PPPoE', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.connection_type = 'pppoe';
      let data = {ipv6: {
        prefix_delegation_address_ppp: {_value: '1234'},
        prefix_delegation_mask_ppp: {_value: '5678'},
        prefix_delegation_local_address_ppp: {_value: '9012'},
      }};


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendLanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );


      // Execute
      await measureController.fetchLanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        'ipv6.prefix_delegation_address_ppp,ipv6.prefix_delegation_mask_ppp,' +
        'ipv6.prefix_delegation_local_address_ppp',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          prefix_delegation_addr: '1234',
          prefix_delegation_mask: '5678',
          prefix_delegation_local: '9012',
        },
      );
    });


    // All permissions - DHCP
    test('All permissions - DHCP', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.connection_type = 'dhcp';
      let data = {ipv6: {
        prefix_delegation_address: {_value: '1234'},
        prefix_delegation_mask: {_value: '5678'},
        prefix_delegation_local_address: {_value: '9012'},
      }};


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendLanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        fieldsAndPermissions.cpePermissions[0],
        fieldsAndPermissions.fields[0],
      );


      // Execute
      await measureController.fetchLanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        'ipv6.prefix_delegation_address,ipv6.prefix_delegation_mask,' +
        'ipv6.prefix_delegation_local_address',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          prefix_delegation_addr: '1234',
          prefix_delegation_mask: '5678',
          prefix_delegation_local: '9012',
        },
      );
    });


    // Mask from address field
    test('Mask from address field', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.connection_type = 'dhcp';
      let data = {ipv6: {
        prefix_delegation_address: {_value: '1234/24'},
        prefix_delegation_local_address: {_value: '9012'},
      }};
      let permissions = fieldsAndPermissions.setAllObjectValues(
        fieldsAndPermissions.cpePermissions[0], true,
      );


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendLanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fieldsAndPermissions.fields[0],
      );


      // Execute
      await measureController.fetchLanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        'ipv6.prefix_delegation_address,ipv6.prefix_delegation_mask,' +
        'ipv6.prefix_delegation_local_address',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          prefix_delegation_addr: '1234',
          prefix_delegation_mask: '24',
          prefix_delegation_local: '9012',
        },
      );
    });


    // Mask from mask field
    test('Mask from mask field', async () => {
      let device = {...models.defaultMockDevices[0]};
      device.connection_type = 'dhcp';
      let data = {ipv6: {
        prefix_delegation_address: {_value: '1234/24'},
        prefix_delegation_mask: {_value: '56'},
        prefix_delegation_local_address: {_value: '9012'},
      }};
      let permissions = fieldsAndPermissions.setAllObjectValues(
        fieldsAndPermissions.cpePermissions[0], true,
      );


      // Mocks
      utils.common.mockDevices(device, 'findOne');
      let saveSpy = jest.spyOn(DeviceModel.prototype, 'save')
        .mockImplementation(() => true);
      let errorSpy = jest.spyOn(console, 'error')
        .mockImplementation(() => true);
      let requestSpy = jest.spyOn(tasksAPI, 'getFromCollection')
        .mockImplementation(() => [data]);
      let sioSpy = jest.spyOn(sio, 'anlixSendLanInfoNotification')
        .mockImplementation(() => true);
      utils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true,
        permissions,
        fieldsAndPermissions.fields[0],
      );


      // Execute
      await measureController.fetchLanInformationFromGenie(device.acs_id);


      // Validate
      expect(errorSpy).not.toBeCalled();
      expect(requestSpy).toBeCalledWith(
        'devices',
        {_id: device.acs_id},
        'ipv6.prefix_delegation_address,ipv6.prefix_delegation_mask,' +
        'ipv6.prefix_delegation_local_address',
      );
      expect(saveSpy).toBeCalled();
      expect(sioSpy).toHaveBeenCalledWith(
        device._id,
        {
          prefix_delegation_addr: '1234',
          prefix_delegation_mask: '56',
          prefix_delegation_local: '9012',
        },
      );
    });
  });
});
