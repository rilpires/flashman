require('../../../bin/globals');
process.env.FLM_GENIE_IGNORED = 'test';

const models = require('../../common/models');
const utils = require('../../common/utils');

// Mock the config (used in language.js)
utils.common.mockConfigs(models.defaultMockConfigs[0], 'findOne');

const meshHandler = require('../../../controllers/handlers/mesh');
const updateCommon = require('../../../controllers/update_scheduler_common');

const ConfigModel = require('../../../models/config');

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

// Test common functions
describe('TR-069 Update Scheduler Tests - Common Functions', () => {
  // Reset all mocks
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });


  // scheduleOfflineWatchdog
  describe('scheduleOfflineWatchdog', () => {
    test('Normal Operation', async () => {
      const callback = jest.fn();

      // Set fake timers
      jest.useFakeTimers();

      // Set the watchdog
      updateCommon.scheduleOfflineWatchdog(callback);
      expect(callback).not.toBeCalled();

      // Run clock and check
      jest.advanceTimersByTime(2*60*1000);
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });


  // removeOfflineWatchdog
  describe('removeOfflineWatchdog', () => {
    test('Normal operation', async () => {
      const callback = jest.fn();

      // Set fake timers
      jest.useFakeTimers();

      // Clear the interval before
      updateCommon.removeOfflineWatchdog();

      // Set the watchdog
      updateCommon.scheduleOfflineWatchdog(callback);
      expect(callback).not.toBeCalled();

      // Run clock and check
      jest.advanceTimersByTime(1*60*1000 + 1000);
      expect(callback).toBeCalled();
      expect(callback).toHaveBeenCalledTimes(1);

      // Cancel Watchdog
      updateCommon.removeOfflineWatchdog();

      // Run clock again and check
      jest.advanceTimersByTime(1*60*1000);
      expect(callback).toBeCalled();
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });


  // getConfig
  describe('getConfig', () => {
    // Okay
    test('Okay', async () => {
      // Set the mock
      utils.common.mockDefaultConfigs();

      // Execute without online and compare
      let config = await updateCommon.getConfig(false, false);
      expect(config._id.toString()).toBe(models.defaultMockConfigs[0]._id);

      // Execute with online and compare
      config = await updateCommon.getConfig(false, true);
      expect(config._id.toString()).toBe(models.defaultMockConfigs[0]._id);
    });


    // Not active
    test('Not active', async () => {
      // Copy and set the mock
      const copiedCofig = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          _id: '84b9f57c7beaae3b4f9d4656',
          device_update_schedule: {
            is_active: false,
        }},
      );
      utils.common.mockConfigs(copiedCofig, 'findOne');

      // Execute without online and compare
      let config = await updateCommon.getConfig(false, false);
      expect(config._id.toString()).toBe(copiedCofig._id);

      // Execute with online and compare
      config = await updateCommon.getConfig(false, true);
      expect(config).toBe(null);
    });


    // Null
    test('Null', async () => {
      // Test null
      utils.common.mockConfigs(null, 'findOne');

      // Execute without online and compare
      let config = await updateCommon.getConfig(false, false);
      expect(config).toBe(null);

      // Execute with online and compare
      config = await updateCommon.getConfig(false, true);
      expect(config).toBe(null);
    });
  });


  // getDevice
  describe('getDevice', () => {
    // Okay
    test('Okay', async () => {
      // Set the mock
      utils.common.mockDefaultDevices();

      const mac = models.defaultMockDevices[0]._id;

      // Execute and compare
      let device = await updateCommon.getDevice(mac, false);
      expect(device._id.toString()).toBe(mac);
    });


    // Null
    test('Null', async () => {
      // Set the mock
      utils.common.mockDevices(null, 'findOne');

      const mac = models.defaultMockDevices[0]._id;

      // Execute and compare
      let device = await updateCommon.getDevice(mac, false);
      expect(device).toBe(null);
    });
  });


  // configQuery
  describe('configQuery', () => {
    // Okay
    test('Okay', async () => {
      // Queries
      const setQuery = {_id: 'A'};
      const pushQuery = {_id: 'B'};

      const spy = jest.spyOn(ConfigModel, 'updateOne');

      // Execute and compare
      updateCommon.configQuery(setQuery, null, pushQuery);
      expect(spy).toHaveBeenCalledWith(
        {'is_default': true},
        {
          '$set': setQuery,
          '$push': pushQuery,
        },
      );
    });
  });


  // successUpdate
  describe('successUpdate', () => {
    // Null config
    test('Null config', async () => {
      const mac = models.defaultMockDevices[0]._id;

      // Set the mock
      utils.common.mockConfigs(null, 'findOne');

      // Execute and compare
      const result = await updateCommon.successUpdate(mac);
      expect(result.success).toBe(false);
      expect(result.error).toContain(
        t('noSchedulingActive').replace('({{errorline}})', ''),
      );
    });


    // Invalid mac
    test('Invalid mac', async () => {
      const mac = models.defaultMockDevices[0]._id;

      // Set the mock
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          _id: '62b0f57a6beffe3b4f9d4656',
          device_update_schedule: {
            rule: {
              in_progress_devices: [
                {mac: 'aa:bb:cc:dd:ee:ff'},
              ],
            },
            is_aborted: false,
            is_active: true,
          },
        },
      );
      utils.common.mockConfigs(config, 'findOne');

      // Execute and compare
      const result = await updateCommon.successUpdate(mac);
      expect(result.success).toBe(false);
      expect(result.error).toContain(
        t('macNotFound').replace('({{errorline}})', ''),
      );
    });


    // Config aborted
    test('Config aborted', async () => {
      const mac = models.defaultMockDevices[0]._id;

      // Set the mock
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          _id: '62b0f57a6beffe3b4f9d4656',
          device_update_schedule: {
            rule: {
              in_progress_devices: [
                {mac: mac},
              ],
            },
            is_aborted: true,
            is_active: true,
          },
        },
      );
      utils.common.mockConfigs(config, 'findOne');

      // Execute and compare
      const result = await updateCommon.successUpdate(mac);
      expect(result.success).toBe(false);
      expect(result.error).toContain(
        t('schedulingAlreadyAborted').replace('({{errorline}})', ''),
      );
    });


    // Config okay 1
    test('Config okay 1', async () => {
      const mac = models.defaultMockDevices[0]._id;

      // Set the mock
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          _id: '62b0f57a6ceffe3c4f9d4656',
          device_update_schedule: {
            rule: {
              in_progress_devices: [
                {
                  mac: mac,
                  slave_count: 0,
                  slave_updates_remaining: 1,
                  mesh_current: 0,
                  mesh_upgrade: 0,
                },
              ],
            },
            is_aborted: false,
            is_active: true,
            device_count: 1,
          },
        },
      );
      utils.common.mockConfigs(config, 'findOne');

      // Set spy
      const spy = jest.spyOn(updateCommon, 'configQuery');

      // Execute and compare
      const result = await updateCommon.successUpdate(mac);
      expect(result.success).toBe(true);
      expect(spy).toBeCalledWith(
        {'device_update_schedule.is_active': false},
        {'device_update_schedule.rule.in_progress_devices': {'mac': mac}},
        {
          'device_update_schedule.rule.done_devices': {
            'mac': mac,
            'state': 'ok',
            'slave_count': 0,
            'slave_updates_remaining': 0,
            'mesh_current': 0,
            'mesh_upgrade': 0,
          },
        },
      );
    });


    // Config okay 1
    test('Config okay 2', async () => {
      const mac = models.defaultMockDevices[0]._id;

      // Set the mock
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          _id: '62b0f57a6ceffe3c4f9d4656',
          device_update_schedule: {
            rule: {
              done_devices: [{}],
              in_progress_devices: [
                {
                  mac: mac,
                  slave_count: 0,
                  slave_updates_remaining: 2,
                  mesh_current: 0,
                  mesh_upgrade: 0,
                },
              ],
            },
            is_aborted: false,
            is_active: true,
            device_count: 2,
          },
        },
      );
      utils.common.mockConfigs(config, 'findOne');

      // Set spy
      const spy = jest.spyOn(ConfigModel, 'updateOne');

      // Execute and compare
      const result = await updateCommon.successUpdate(mac);
      expect(result.success).toBe(true);
      expect(spy).toBeCalledWith({
        'is_default': true,
        'device_update_schedule.rule.in_progress_devices.mac': mac,
      }, {
        '$set': {
          'device_update_schedule.rule.in_progress_devices.$.state':
            'downloading',
          // eslint-disable-next-line max-len
          'device_update_schedule.rule.in_progress_devices.$.slave_updates_remaining': 1,
          'device_update_schedule.rule.in_progress_devices.$.retry_count': 0,
        },
      });
    });
  });


  // failedDownload
  describe('failedDownload', () => {
    // Null config
    test('Null config', async () => {
      const mac = models.defaultMockDevices[0]._id;

      // Set the mock
      utils.common.mockConfigs(null, 'findOne');

      // Execute and compare
      const result = await updateCommon.failedDownload(mac);
      expect(result.success).toBe(false);
      expect(result.error).toContain(
        t('noSchedulingActive').replace('({{errorline}})', ''),
      );
    });


    // Invalid mac
    test('Invalid mac', async () => {
      const mac = models.defaultMockDevices[0]._id;

      // Set the mock
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          _id: '62b0f57a6beffe3b4f9d4656',
          device_update_schedule: {
            rule: {
              in_progress_devices: [
                {mac: 'aa:bb:cc:dd:ee:ff'},
              ],
            },
            is_aborted: false,
            is_active: true,
          },
        },
      );
      utils.common.mockConfigs(config, 'findOne');

      // Execute and compare
      const result = await updateCommon.failedDownload(mac);
      expect(result.success).toBe(false);
      expect(result.error).toContain(
        t('macNotFound').replace('({{errorline}})', ''),
      );
    });


    // Config aborted
    test('Config aborted', async () => {
      const mac = models.defaultMockDevices[0]._id;

      // Set the mock
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          _id: '62b0f57a6beffe3b4f9d4656',
          device_update_schedule: {
            rule: {
              in_progress_devices: [
                {mac: mac},
              ],
            },
            is_aborted: true,
            is_active: true,
          },
        },
      );
      utils.common.mockConfigs(config, 'findOne');

      // Execute and compare
      const result = await updateCommon.failedDownload(mac);
      expect(result.success).toBe(false);
      expect(result.error).toContain(
        t('schedulingAlreadyAborted').replace('({{errorline}})', ''),
      );
    });


    // Aborted + maxtries
    test('Aborted + maxtries', async () => {
      const mac = models.defaultMockDevices[0]._id;


      // Set the mock
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          _id: '62b0f57a6ceffe3c4f9d4656',
          is_aborted: true,
          device_update_schedule: {
            rule: {
              done_devices: [{}],
              in_progress_devices: [
                {
                  mac: mac,
                  retry_count: 3,
                  slave_count: 0,
                  slave_updates_remaining: 2,
                  mesh_current: 0,
                  mesh_upgrade: 0,
                },
              ],
            },
            is_aborted: false,
            is_active: true,
            device_count: 2,
          },
        },
      );
      utils.common.mockConfigs(config, 'findOne');
      utils.common.mockDefaultDevices();


      // Set spy
      const configSpy = jest.spyOn(updateCommon, 'configQuery');

      // Execute and compare
      const result = await updateCommon.failedDownload(mac);
      expect(result.success).toBe(true);
      expect(configSpy).toBeCalledWith({
        'device_update_schedule.is_active': false,
      }, {
        'device_update_schedule.rule.in_progress_devices': {'mac': mac},
      }, {
        'device_update_schedule.rule.done_devices': {
          'mac': mac,
          'state': 'error',
          'slave_count': 0,
          'slave_updates_remaining': 2,
          'mesh_current': 0,
          'mesh_upgrade': 0,
        },
      });
    });


    // Aborted 2
    test('Aborted 2', async () => {
      const mac = models.defaultMockDevices[0]._id;


      // Set the mock
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          _id: '62b0f57a6ceffe3c4f9d4656',
          is_aborted: true,
          device_update_schedule: {
            rule: {
              done_devices: [{}],
              in_progress_devices: [
                {
                  mac: mac,
                  retry_count: 0,
                  slave_count: 0,
                  slave_updates_remaining: 2,
                  mesh_current: 0,
                  mesh_upgrade: 0,
                },
              ],
            },
            is_aborted: false,
            is_active: true,
            device_count: 2,
          },
        },
      );
      utils.common.mockConfigs(config, 'findOne');
      utils.common.mockDevices(models.defaultMockDevices[0], 'findOne');
      utils.common.mockDefaultDevices();


      // Set spy
      const configSpy = jest.spyOn(updateCommon, 'configQuery');


      // Execute and compare
      const result = await updateCommon.failedDownload(mac);
      expect(result.success).toBe(true);
      expect(configSpy).toBeCalledWith(null, {
        'device_update_schedule.rule.in_progress_devices': {'mac': mac},
      }, {
        'device_update_schedule.rule.to_do_devices': {
          'mac': mac,
          'retry_count': 1,
          'state': 'retry',
          'slave_count': 0,
          'slave_updates_remaining': 2,
          'mesh_current': 0,
          'mesh_upgrade': 0,
        },
      });
    });


    // Normal 1
    test('Normal 1', async () => {
      // TR-069 device
      const mac = models.defaultMockDevices[0]._id;


      // Set the mock
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          _id: '62b0f57a6ceffe3c4f9d4656',
          is_aborted: false,
          device_update_schedule: {
            rule: {
              done_devices: [{}],
              in_progress_devices: [
                {
                  mac: mac,
                  retry_count: 0,
                  slave_count: 0,
                  slave_updates_remaining: 2,
                  mesh_current: 0,
                  mesh_upgrade: 0,
                },
              ],
            },
            is_aborted: false,
            is_active: true,
            device_count: 2,
          },
        },
      );
      utils.common.mockConfigs(config, 'findOne');
      utils.common.mockDefaultDevices();


      // Set spy
      const configSpy = jest.spyOn(updateCommon, 'configQuery');
      const updateSpy = jest.spyOn(ConfigModel, 'updateOne');


      // Execute and compare
      const result = await updateCommon.failedDownload(mac);
      expect(result.success).toBe(true);

      expect(updateSpy).toBeCalledWith({
        'is_default': true,
        'device_update_schedule.rule.in_progress_devices.mac': mac,
      }, {
        '$set': {
          'device_update_schedule.rule.in_progress_devices.$.retry_count':
            1,
        },
      });

      expect(configSpy).toBeCalledWith(null, {
        'device_update_schedule.rule.in_progress_devices': {'mac': mac},
      }, {
        'device_update_schedule.rule.to_do_devices': {
          'mac': mac,
          'state': 'retry',
          'retry_count': 1,
          'slave_count': 0,
          'slave_updates_remaining': 2,
          'mesh_current': 0,
          'mesh_upgrade': 0,
        },
      });
    });


    // Normal 2
    test('Normal 2', async () => {
      // Flashbox device
      const mac = models.defaultMockDevices[1]._id;


      // Set the mock
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          _id: '62b0f57a6ceffe3c4f9d4656',
          is_aborted: false,
          device_update_schedule: {
            rule: {
              release: '61.1-220826',
              done_devices: [{}],
              in_progress_devices: [
                {
                  mac: mac,
                  retry_count: 0,
                  slave_count: 0,
                  slave_updates_remaining: 2,
                  mesh_current: 0,
                  mesh_upgrade: 0,
                },
              ],
            },
            is_aborted: false,
            is_active: true,
            device_count: 2,
          },
        },
      );
      utils.common.mockConfigs(config, 'findOne');
      utils.common.mockDevices(models.defaultMockDevices[1], 'findOne');


      // Set spy
      const updateSpy = jest.spyOn(ConfigModel, 'updateOne');
      const meshSpy = jest.spyOn(meshHandler, 'updateMeshDevice')
        .mockImplementation(() => true);


      // Execute and compare
      const result = await updateCommon.failedDownload(mac);
      expect(result.success).toBe(true);

      expect(updateSpy).toBeCalledWith({
        'is_default': true,
        'device_update_schedule.rule.in_progress_devices.mac': mac,
      }, {
        '$set': {
          'device_update_schedule.rule.in_progress_devices.$.retry_count':
            1,
        },
      });

      expect(meshSpy).toBeCalledWith(mac, {
        release: config.device_update_schedule.rule.release,
      });
    });
  });


  // isUpdating
  describe('isUpdating', () => {
    // Null config
    test('Null config', async () => {
      utils.common.mockConfigs(null, 'findOne');

      // Execute and compare
      const result = await updateCommon.__testIsUpdating('aa:bb:cc:dd:ee:ff');
      expect(result.success).toBe(false);
      expect(result.error).toContain(
        t('noSchedulingActive').replace('({{errorline}})', ''),
      );
    });


    // Device not found
    test('Device not found', async () => {
      // TR-069 device
      const mac = models.defaultMockDevices[0]._id;

      // Set the mock
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          _id: '62b0f57a6ceffe3c4f9d4656',
          is_aborted: false,
          device_update_schedule: {
            rule: {
              release: '61.1-220826',
              done_devices: [{}],
              in_progress_devices: [
                {
                  mac: mac,
                  retry_count: 0,
                  slave_count: 0,
                  slave_updates_remaining: 2,
                  mesh_current: 0,
                  mesh_upgrade: 0,
                },
              ],
            },
            is_aborted: false,
            is_active: true,
            device_count: 2,
          },
        },
      );
      utils.common.mockConfigs(config, 'findOne');
      utils.common.mockDefaultDevices();

      // Execute and compare
      const result = await updateCommon.__testIsUpdating(
        models.defaultMockDevices[1]._id,
      );

      expect(result.success).toBe(true);
      expect(result.updating).toBe(false);
    });


    // Device updating
    test( 'Device updating', async () => {
      // TR-069 device
      const mac = models.defaultMockDevices[1]._id;

      // Set the mock
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          _id: '62b0f57a6ceffe3c4f9d4656',
          is_aborted: false,
          device_update_schedule: {
            rule: {
              release: '61.1-220826',
              done_devices: [{}],
              in_progress_devices: [
                {
                  mac: mac,
                  retry_count: 0,
                  slave_count: 0,
                  slave_updates_remaining: 2,
                  mesh_current: 0,
                  mesh_upgrade: 0,
                },
              ],
            },
            is_aborted: false,
            is_active: true,
            device_count: 2,
          },
        },
      );
      utils.common.mockConfigs(config, 'findOne');
      utils.common.mockDefaultDevices();

      // Execute and compare
      const result = await updateCommon.__testIsUpdating(mac);

      expect(result.success).toBe(true);
      expect(result.updating).toBe(true);
    });
  });


  // successUpdateIfCpeWontReturn
  describe('successUpdateIfCpeWontReturn', () => {
    // Invalid config
    test('Invalid config', async () => {
      const mac = models.defaultMockDevices[0]._id;

      // Mocks
      utils.common.mockConfigs(null, 'findOne');

      // Set spy
      const spy = jest.spyOn(updateCommon, 'successUpdate')
        .mockImplementationOnce(() => true);

      // Execute and compare
      const result = await updateCommon.successUpdateIfCpeWontReturn(mac);
      expect(result).toBe(false);
      expect(spy).not.toBeCalled();
    });


    // Not updating
    test('Not updating', async () => {
      const mac = models.defaultMockDevices[0]._id;

      // Mocks
      utils.common.mockConfigs({
        device_update_schedule: {
          is_active: true,
          rule: {
            cpes_wont_return: true,
            in_progress_devices: [{
              mac: '12345678',
            }],
          },
        },
      }, 'findOne');


      // Set spy
      const successSpy = jest.spyOn(updateCommon, 'successUpdate')
        .mockImplementationOnce(() => true);


      // Execute and compare
      const result = await updateCommon.successUpdateIfCpeWontReturn(mac);
      expect(result).toBe(false);
      expect(successSpy).not.toBeCalled();
    });


    // Will return
    test('Will return', async () => {
      const mac = models.defaultMockDevices[0]._id;

      // Mocks
      utils.common.mockConfigs({
        device_update_schedule: {
          is_active: true,
          rule: {
            cpes_wont_return: false,
            in_progress_devices: [{
              mac: mac,
            }],
          },
        },
      }, 'findOne');


      // Set spy
      const spy = jest.spyOn(updateCommon, 'successUpdate')
        .mockImplementationOnce(() => true);


      // Execute and compare
      const result = await updateCommon.successUpdateIfCpeWontReturn(mac);
      expect(result).toBe(false);
      expect(spy).not.toBeCalled();
    });


    // Won't return
    test('Won\'t return', async () => {
      const mac = models.defaultMockDevices[0]._id;

      // Mocks
      utils.common.mockConfigs({
        device_update_schedule: {
          is_active: true,
          rule: {
            cpes_wont_return: true,
            in_progress_devices: [{
              mac: mac,
            }],
          },
        },
      }, 'findOne');


      // Set spy
      const spy = jest.spyOn(updateCommon, 'successUpdate')
        .mockImplementationOnce(() => true);


      // Execute and compare
      const result = await updateCommon.successUpdateIfCpeWontReturn(mac);
      expect(result).toBe(true);
      expect(spy).toBeCalled();
    });
  });
});
