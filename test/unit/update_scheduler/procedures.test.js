require('../../../bin/globals');
const updateCommon = require('../../../controllers/update_scheduler_common');
const updateScheduler = require('../../../controllers/update_scheduler');

const utils = require('../../common/utils');
const models = require('../../common/models');

const meshHandler = require('../../../controllers/handlers/mesh');
const deviceHandlers = require('../../../controllers/handlers/devices');
const mqtts = require('../../../mqtts');
const messaging = require('../../../controllers/messaging');
const acsFirmware = require('../../../controllers/handlers/acs/firmware');

const DeviceModel = require('../../../models/device');

const t = require('../../../controllers/language').i18next.t;


// Test update_scheduler
describe('TR-069 Update Scheduler Tests - Functions', () => {
  // Reset all mocks
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });


  // recoverFromOffline
  test('Validate Update Scheduler - recoverFromOffline', async () => {
    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;
    // TR-069 device
    const tr069Mac = models.defaultMockDevices[0]._id;

    // Set fake timers
    jest.useFakeTimers();

    // Set the mocks
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
                mac: flashMac,
                state: 'downloading',
              },
              {
                mac: tr069Mac,
                state: 'doing',
              },
            ],
          },
          is_aborted: false,
          is_active: true,
          device_count: 2,
        },
      },
    );

    // Set spy
    let configSpy = jest.spyOn(updateCommon, 'configQuery');
    let watchdogSpy = jest.spyOn(global, 'setTimeout');

    // Execute
    await updateScheduler.recoverFromOffline(config);

    // Test
    jest.advanceTimersByTime(10*60*1000);
    expect(configSpy).toHaveBeenLastCalledWith(null,
      {'device_update_schedule.rule.in_progress_devices': {
        'mac': {'$in': [flashMac]},
      }},
      {'device_update_schedule.rule.to_do_devices': {'$each': [{
        mac: flashMac,
        state: 'update',
        retry_count: 0,
      }]}},
    );
    expect(watchdogSpy).toHaveBeenCalledTimes(1);
  });


  // markNextForUpdate null config
  test(
    'Validate Update Scheduler - markNextForUpdate null config',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Mock null config
    utils.common.mockConfigs(null, 'findOne');

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(false);
    expect(result.error).toContain(
      t('noSchedulingActive').replace('({{errorline}})', ''),
    );
  });


  // markNextForUpdate aborted
  test(
    'Validate Update Scheduler - markNextForUpdate aborted',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;

    // Create the config which is aborted
    let config = models.copyConfigFrom(
      models.defaultMockConfigs[0]._id,
      {
        _id: '62b0f57a6ceffe3c4f9d4656',
        device_update_schedule: {
          rule: {
            release: '61.1-220826',
            done_devices: [{}],
            to_do_devices: [
              {
                mac: flashMac,
                state: 'downloading',
              },
            ],
          },
          is_aborted: true,
          is_active: true,
          device_count: 2,
        },
      },
    );

    // Mock config
    utils.common.mockConfigs(config, 'findOne');
    let consoleSpy = jest.spyOn(console, 'log');

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(true);
    expect(result.marked).toBe(false);
    expect(consoleSpy).toHaveBeenLastCalledWith('Scheduler: Schedule aborted');
  });


  // markNextForUpdate invalid time
  test(
    'Validate Update Scheduler - markNextForUpdate invalid time',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;

    // Create the config which is aborted
    let config = models.copyConfigFrom(
      models.defaultMockConfigs[0]._id,
      {
        _id: '62b0f57a6ceffe3c4f9d4656',
        device_update_schedule: {
          rule: {
            release: '61.1-220826',
            done_devices: [{}],
            to_do_devices: [
              {
                mac: flashMac,
                state: 'downloading',
              },
            ],
          },
          allowed_time_ranges: {
            start_day: 0,
            end_day: 1,
            start_time: '01:01',
            end_time: '01:01',
          },
          used_time_range: true,
          is_aborted: false,
          is_active: true,
          device_count: 1,
        },
      },
    );

    // Mock config
    utils.common.mockConfigs(config, 'findOne');
    let consoleSpy = jest.spyOn(console, 'log');

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(true);
    expect(result.marked).toBe(false);
    expect(consoleSpy).toHaveBeenLastCalledWith(
      'Scheduler: Invalid time range',
    );
  });


  // markNextForUpdate no device
  test(
    'Validate Update Scheduler - markNextForUpdate no device',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;

    // Create the config which is aborted
    let config = models.copyConfigFrom(
      models.defaultMockConfigs[0]._id,
      {
        _id: '62b0f57a6ceffe3c4f9d4656',
        device_update_schedule: {
          rule: {
            release: '61.1-220826',
            done_devices: [{}],
            in_progress_devices: [
              {
                mac: flashMac,
                state: 'downloading',
              },
            ],
          },
          is_aborted: false,
          is_active: true,
          device_count: 1,
        },
      },
    );

    // Mock config
    utils.common.mockConfigs(config, 'findOne');
    let consoleSpy = jest.spyOn(console, 'log');

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(true);
    expect(result.marked).toBe(false);
    expect(consoleSpy).toHaveBeenLastCalledWith(
      'Scheduler: No devices to update',
    );
  });


  // markNextForUpdate no tr069 device
  test(
    'Validate Update Scheduler - markNextForUpdate no tr069 device',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;

    // Create the config which is aborted
    let config = models.copyConfigFrom(
      models.defaultMockConfigs[0]._id,
      {
        _id: '62b0f57a6ceffe3c4f9d4656',
        device_update_schedule: {
          rule: {
            release: '61.1-220826',
            done_devices: [{}],
            to_do_devices: [
              {
                mac: flashMac,
                state: 'downloading',
              },
            ],
          },
          is_aborted: false,
          is_active: true,
          device_count: 1,
        },
      },
    );

    // Mock config and devices
    utils.common.mockConfigs(config, 'findOne');
    utils.common.mockDevices([], 'find');

    // Spy
    let consoleSpy = jest.spyOn(console, 'log');
    let configSpy = jest.spyOn(updateCommon, 'configQuery');

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(true);
    expect(result.marked).toBe(false);
    expect(consoleSpy).toHaveBeenLastCalledWith(
      'Scheduler: No online devices to update',
    );
    expect(configSpy).toHaveBeenLastCalledWith(
      {'device_update_schedule.rule.to_do_devices.$[].state': 'offline'},
      null,
      null,
    );
  });


  // markNextForUpdate no online devices 1
  test(
    'Validate Update Scheduler - markNextForUpdate no online devices 1',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;

    // Create the config which is aborted
    let config = models.copyConfigFrom(
      models.defaultMockConfigs[0]._id,
      {
        _id: '62b0f57a6ceffe3c4f9d4656',
        device_update_schedule: {
          rule: {
            release: '61.1-220826',
            done_devices: [{}],
            to_do_devices: [
              {
                mac: flashMac,
                state: 'downloading',
              },
            ],
          },
          is_aborted: false,
          is_active: true,
          device_count: 1,
        },
      },
    );

    // Mock config and devices
    utils.common.mockConfigs(config, 'findOne');
    utils.common.mockDevices([
      // TR-069
      models.defaultMockDevices[0],
      ], 'find',
    );

    // Spy
    let consoleSpy = jest.spyOn(console, 'log');
    let configSpy = jest.spyOn(updateCommon, 'configQuery');

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(true);
    expect(result.marked).toBe(false);
    expect(consoleSpy).toHaveBeenLastCalledWith(
      'Scheduler: No online devices to update',
    );
    expect(configSpy).toHaveBeenLastCalledWith(
      {'device_update_schedule.rule.to_do_devices.$[].state': 'offline'},
      null,
      null,
    );
  });


  // markNextForUpdate no online devices 2
  test(
    'Validate Update Scheduler - markNextForUpdate no online devices 2',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;
    // TR-069 device
    const tr069Mac = models.defaultMockDevices[0]._id;

    // Create the config which is aborted
    let config = models.copyConfigFrom(
      models.defaultMockConfigs[0]._id,
      {
        _id: '62b0f57a6ceffe3c4f9d4656',
        device_update_schedule: {
          rule: {
            release: '61.1-220826',
            done_devices: [{}],
            to_do_devices: [
              {
                mac: flashMac,
                state: 'downloading',
              },
            ],
          },
          is_aborted: false,
          is_active: true,
          device_count: 1,
        },
      },
    );

    // Mock config and devices
    utils.common.mockConfigs(config, 'findOne');
    utils.common.mockDevices([], 'find');
    mqtts.unifiedClientsMap = {a: {}};
    // Assume there is a router online with different mac of the used one
    mqtts.unifiedClientsMap.a[tr069Mac] = true;

    // Spy
    let consoleSpy = jest.spyOn(console, 'log');
    let configSpy = jest.spyOn(updateCommon, 'configQuery');

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(true);
    expect(result.marked).toBe(false);
    expect(consoleSpy).toHaveBeenLastCalledWith(
      'Scheduler: No online devices to update',
    );
    expect(configSpy).toHaveBeenLastCalledWith(
      {'device_update_schedule.rule.to_do_devices.$[].state': 'offline'},
      null,
      null,
    );
  });


  // markNextForUpdate flashbox same firmware
  test(
    'Validate Update Scheduler - markNextForUpdate flashbox same firmware',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;

    // Create the config which is aborted
    let config = models.copyConfigFrom(
      models.defaultMockConfigs[0]._id,
      {
        _id: '62b0f57a6ceffe3c4f9d4656',
        device_update_schedule: {
          rule: {
            release: '0000-flm',
            done_devices: [{}],
            to_do_devices: [
              {
                mac: flashMac,
                state: 'downloading',
              },
            ],
          },
          is_aborted: false,
          is_active: true,
          device_count: 1,
        },
      },
    );

    // Mock config and devices
    jest.spyOn(meshHandler, 'beginMeshUpdate')
      .mockImplementationOnce(() => Promise.resolve({success: true}));
    jest.spyOn(DeviceModel.prototype, 'save')
      .mockImplementationOnce(() => Promise.resolve());
    utils.common.mockConfigs(config, 'findOne');
    utils.common.mockDevices([
      models.defaultMockDevices[0],
    ],
    'find',
  );
    utils.common.mockDevices(models.defaultMockDevices[1], 'findOne');
    mqtts.unifiedClientsMap = {a: {}};
    mqtts.unifiedClientsMap.a[flashMac] = true;

    // Spy
    let configSpy = jest.spyOn(updateCommon, 'configQuery');

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(true);
    expect(result.marked).toBe(true);
    expect(configSpy).toHaveBeenLastCalledWith(
      null,
      {'device_update_schedule.rule.to_do_devices': {'mac': flashMac}},
      {
        'device_update_schedule.rule.in_progress_devices': {
          'mac': flashMac,
          'state': 'downloading',
          'retry_count': 0,
          'slave_count': 0,
          'slave_updates_remaining': 1,
          'mesh_current': 1,
          'mesh_upgrade': 1,
        },
      },
    );
  });


  // markNextForUpdate tr069 same firmware
  test(
    'Validate Update Scheduler - markNextForUpdate tr069 same firmware',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;
    // TR-069 device
    const tr069Mac = models.defaultMockDevices[0]._id;

    // Create the config which is aborted
    let config = models.copyConfigFrom(
      models.defaultMockConfigs[0]._id,
      {
        _id: '62b0f57a6ceffe3c4f9d4656',
        device_update_schedule: {
          rule: {
            release: '1.1-220826',
            done_devices: [{}],
            to_do_devices: [
              {
                mac: tr069Mac,
                state: 'downloading',
              },
            ],
          },
          is_aborted: false,
          is_active: true,
          device_count: 1,
        },
      },
    );

    // Mock config and devices
    jest.spyOn(meshHandler, 'beginMeshUpdate')
      .mockImplementationOnce(() => Promise.resolve({success: true}));
    jest.spyOn(DeviceModel.prototype, 'save')
      .mockImplementationOnce(() => Promise.resolve());
    utils.common.mockConfigs(config, 'findOne');
    utils.common.mockDevices([
        models.defaultMockDevices[0],
      ],
      'find',
    );
    utils.common.mockDevices(models.defaultMockDevices[0], 'findOne');
    mqtts.unifiedClientsMap = {a: {}};
    mqtts.unifiedClientsMap.a[flashMac] = true;

    // Spy
    let configSpy = jest.spyOn(updateCommon, 'configQuery');

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(true);
    expect(result.marked).toBe(true);
    expect(result.updated).toBe(true);
    expect(configSpy).toHaveBeenLastCalledWith(
      {'device_update_schedule.is_active': true},
      {'device_update_schedule.rule.to_do_devices': {'mac': tr069Mac}},
      {
        'device_update_schedule.rule.done_devices': {
          'mac': tr069Mac,
          'state': 'ok',
          'slave_count': 0,
          'slave_updates_remaining': 0,
          'mesh_current': 1,
          'mesh_upgrade': 1,
        },
      },
    );
  });


  // markNextForUpdate mesh upgrade
  test(
    'Validate Update Scheduler - markNextForUpdate mesh upgrade',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;

    // Create the config which is aborted
    let config = models.copyConfigFrom(
      models.defaultMockConfigs[0]._id,
      {
        _id: '62b0f57a6ceffe3c4f9d4656',
        device_update_schedule: {
          rule: {
            release: '0234-flm',
            done_devices: [{}],
            to_do_devices: [
              {
                mac: flashMac,
                state: 'downloading',
                slave_count: 10,
                slave_updates_remaining: 10,
                mesh_current: 1,
                mesh_upgrade: 2,
              },
            ],
          },
          is_aborted: false,
          is_active: true,
          device_count: 1,
        },
      },
    );

    // Mock config and devices
    utils.common.mockConfigs(config, 'findOne');
    utils.common.mockDevices([
        models.defaultMockDevices[0],
      ],
      'find',
    );
    utils.common.mockDevices(models.defaultMockDevices[1], 'findOne');
    mqtts.unifiedClientsMap = {a: {}};
    mqtts.unifiedClientsMap.a[flashMac] = true;

    // Spy
    let configSpy = jest.spyOn(updateCommon, 'configQuery');
    let meshUpgradeSpy = jest.spyOn(meshHandler, 'beginMeshUpdate')
      .mockImplementationOnce(() => Promise.resolve({success: true}));

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(true);
    expect(result.marked).toBe(true);
    expect(configSpy).toHaveBeenLastCalledWith(
      null,
      {'device_update_schedule.rule.to_do_devices': {'mac': flashMac}},
      {
        'device_update_schedule.rule.in_progress_devices': {
          'mac': flashMac,
          'state': 'v1tov2',
          'retry_count': 0,
          'slave_count': 10,
          'slave_updates_remaining': 11,
          'mesh_current': 1,
          'mesh_upgrade': 2,
        },
      },
    );
    expect(meshUpgradeSpy).toHaveBeenCalled();
  });


  // initialize null config
  test('Validate Update Scheduler - initialize null config', async () => {
    // Test null
    utils.common.mockConfigs(null, 'findOne');

    // Execute and verify
    let result = await updateScheduler.initialize();
    expect(result.success).toBe(false);
    expect(result.error).toContain(
      t('noSchedulingActive').replace('({{errorline}})', ''),
    );
  });


  // markNextForUpdate normal flashbox
  test(
    'Validate Update Scheduler - markNextForUpdate normal flashbox',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;

    // Create the config which is aborted
    const config = models.copyConfigFrom(
      models.defaultMockConfigs[0]._id,
      {
        _id: '62b0f57a6ceffe3c4f9d4656',
        device_update_schedule: {
          rule: {
            release: '0234-flm',
            done_devices: [{}],
            to_do_devices: [
              {
                mac: flashMac,
                state: 'downloading',
                slave_count: 0,
                slave_updates_remaining: 0,
                mesh_current: 2,
                mesh_upgrade: 2,
              },
            ],
          },
          is_aborted: false,
          is_active: true,
          device_count: 1,
        },
      },
    );

    // Mock config and devices
    utils.common.mockConfigs(config, 'findOne');
    utils.common.mockDevices([
        models.defaultMockDevices[0],
      ],
      'find',
    );
    utils.common.mockDevices(models.defaultMockDevices[1], 'findOne');
    mqtts.unifiedClientsMap = {a: {}};
    mqtts.unifiedClientsMap.a[flashMac] = true;

    // Spy
    const configSpy = jest.spyOn(updateCommon, 'configQuery');
    const deviceSpy = jest.spyOn(DeviceModel.prototype, 'save')
      .mockImplementationOnce(() => Promise.resolve());
    const messagingSpy = jest.spyOn(messaging, 'sendUpdateMessage')
      .mockImplementationOnce(() => {});
    const deviceHandlerSpy = jest.spyOn(deviceHandlers, 'timeoutUpdateAck')
      .mockImplementationOnce(() => {});
    const tr069UpdaterSpy = jest.spyOn(acsFirmware, 'upgradeFirmware')
      .mockImplementationOnce(() => {});
    const flashboxUpdaterSpy = jest.spyOn(mqtts, 'anlixMessageRouterUpdate')
      .mockImplementationOnce(() => {});

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(true);
    expect(result.marked).toBe(true);
    expect(configSpy).toHaveBeenLastCalledWith(
      null,
      {'device_update_schedule.rule.to_do_devices': {'mac': flashMac}},
      {
        'device_update_schedule.rule.in_progress_devices': {
          'mac': flashMac,
          'state': 'downloading',
          'retry_count': 0,
          'slave_count': 0,
          'slave_updates_remaining': 1,
          'mesh_current': 2,
          'mesh_upgrade': 2,
        },
      },
    );
    expect(deviceSpy).toBeCalled();
    expect(messagingSpy).toBeCalled();
    expect(deviceHandlerSpy).toBeCalled();
    expect(tr069UpdaterSpy).not.toBeCalled();
    expect(flashboxUpdaterSpy).toBeCalled();
  });


  // markNextForUpdate normal tr069
  test(
    'Validate Update Scheduler - markNextForUpdate normal tr069',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;
    // TR-069 device
    const tr069Mac = models.defaultMockDevices[0]._id;

    // Create the config which is aborted
    const config = models.copyConfigFrom(
      models.defaultMockConfigs[0]._id,
      {
        _id: '62b0f57a6ceffe3c4f9d4656',
        device_update_schedule: {
          rule: {
            release: '0234-flm',
            done_devices: [{}],
            to_do_devices: [
              {
                mac: tr069Mac,
                state: 'downloading',
                slave_count: 0,
                slave_updates_remaining: 0,
                mesh_current: 2,
                mesh_upgrade: 2,
              },
            ],
          },
          is_aborted: false,
          is_active: true,
          device_count: 1,
        },
      },
    );

    // Mock config and devices
    utils.common.mockConfigs(config, 'findOne');
    utils.common.mockDevices([
        models.defaultMockDevices[0],
      ],
      'find',
    );
    utils.common.mockDevices(models.defaultMockDevices[0], 'findOne');
    mqtts.unifiedClientsMap = {a: {}};
    mqtts.unifiedClientsMap.a[flashMac] = true;

    // Spy
    const configSpy = jest.spyOn(updateCommon, 'configQuery');
    const deviceSpy = jest.spyOn(DeviceModel.prototype, 'save')
      .mockImplementationOnce(() => Promise.resolve());
    const messagingSpy = jest.spyOn(messaging, 'sendUpdateMessage')
      .mockImplementationOnce(() => {});
    const deviceHandlerSpy = jest.spyOn(deviceHandlers, 'timeoutUpdateAck')
      .mockImplementationOnce(() => {});
    const tr069UpdaterSpy = jest.spyOn(acsFirmware, 'upgradeFirmware')
      .mockImplementationOnce(() => {});
    const flashboxUpdaterSpy = jest.spyOn(mqtts, 'anlixMessageRouterUpdate')
      .mockImplementationOnce(() => {});

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(true);
    expect(result.marked).toBe(true);
    expect(configSpy).toHaveBeenLastCalledWith(
      null,
      {'device_update_schedule.rule.to_do_devices': {'mac': tr069Mac}},
      {
        'device_update_schedule.rule.in_progress_devices': {
          'mac': tr069Mac,
          'state': 'downloading',
          'retry_count': 0,
          'slave_count': 0,
          'slave_updates_remaining': 1,
          'mesh_current': 2,
          'mesh_upgrade': 2,
        },
      },
    );
    expect(deviceSpy).toBeCalled();
    expect(messagingSpy).toBeCalled();
    expect(deviceHandlerSpy).toBeCalled();
    expect(tr069UpdaterSpy).toBeCalled();
    expect(flashboxUpdaterSpy).not.toBeCalled();
  });


  // markNextForUpdate multiple flashbox
  test(
    'Validate Update Scheduler - markNextForUpdate multiple flashbox',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;
    const flashMac2 = flashMac.substring(0, 15) + 'FA';
    const flashMac3 = flashMac.substring(0, 15) + 'FB';
    const flashMac4 = flashMac.substring(0, 15) + 'FC';

    // TR-069 device
    const tr069Mac = models.defaultMockDevices[0]._id;
    const tr069Mac2 = flashMac.substring(0, 15) + 'FD';
    const tr069Mac3 = flashMac.substring(0, 15) + 'FE';
    const tr069Mac4 = flashMac.substring(0, 15) + 'FF';

    // Create the config which is aborted
    const config = models.copyConfigFrom(
      models.defaultMockConfigs[0]._id,
      {
        _id: '62b0f57a6ceffe3c4f9d4656',
        device_update_schedule: {
          rule: {
            release: '0234-flm',
            done_devices: [{}],
            to_do_devices: [
              {
                mac: flashMac,
                state: 'downloading',
                slave_count: 0,
                slave_updates_remaining: 0,
                mesh_current: 2,
                mesh_upgrade: 2,
              },
              {
                mac: flashMac2,
                state: 'downloading',
                slave_count: 0,
                slave_updates_remaining: 0,
                mesh_current: 2,
                mesh_upgrade: 2,
              },
              {
                mac: flashMac3,
                state: 'downloading',
                slave_count: 0,
                slave_updates_remaining: 0,
                mesh_current: 2,
                mesh_upgrade: 2,
              },
            ],
          },
          is_aborted: false,
          is_active: true,
          device_count: 1,
        },
      },
    );

    // Copy Devices
    const flashDevice2 = models.copyDeviceFrom(
      flashMac,
      flashMac2,
    );

    const tr069Device2 = models.copyDeviceFrom(
      tr069Mac,
      {
        _id: tr069Mac2,
      },
    );
    const tr069Device3 = models.copyDeviceFrom(
      tr069Mac,
      {
        _id: tr069Mac3,
      },
    );
    const tr069Device4 = models.copyDeviceFrom(
      tr069Mac,
      {
        _id: tr069Mac4,
      },
    );


    // Mock config and devices
    utils.common.mockConfigs(config, 'findOne');
    utils.common.mockDevices([
        models.defaultMockDevices[0],
        tr069Device2,
        tr069Device3,
        tr069Device4,
      ],
      'find',
    );
    console.log(tr069Device2._id);
    utils.common.mockDevices(flashDevice2, 'findOne');
    mqtts.unifiedClientsMap = {
      a: {}, b: {}, c: {}, d: {},
    };
    mqtts.unifiedClientsMap.c[flashMac3] = true;
    mqtts.unifiedClientsMap.d[flashMac4] = true;

    // Spy
    const configSpy = jest.spyOn(updateCommon, 'configQuery');
    const deviceSpy = jest.spyOn(DeviceModel.prototype, 'save')
      .mockImplementationOnce(() => Promise.resolve());
    const messagingSpy = jest.spyOn(messaging, 'sendUpdateMessage')
      .mockImplementationOnce(() => {});
    const deviceHandlerSpy = jest.spyOn(deviceHandlers, 'timeoutUpdateAck')
      .mockImplementationOnce(() => {});
    const tr069UpdaterSpy = jest.spyOn(acsFirmware, 'upgradeFirmware')
      .mockImplementationOnce(() => {});
    const flashboxUpdaterSpy = jest.spyOn(mqtts, 'anlixMessageRouterUpdate')
      .mockImplementationOnce(() => {});

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(true);
    expect(result.marked).toBe(true);
    expect(configSpy).toHaveBeenLastCalledWith(
      null,
      {'device_update_schedule.rule.to_do_devices': {'mac': flashMac3}},
      {
        'device_update_schedule.rule.in_progress_devices': {
          'mac': flashMac3,
          'state': 'downloading',
          'retry_count': 0,
          'slave_count': 0,
          'slave_updates_remaining': 1,
          'mesh_current': 2,
          'mesh_upgrade': 2,
        },
      },
    );
    expect(deviceSpy).toBeCalled();
    expect(messagingSpy).toBeCalled();
    expect(deviceHandlerSpy).toBeCalled();
    expect(tr069UpdaterSpy).not.toBeCalled();
    expect(flashboxUpdaterSpy).toBeCalled();
  });


  // markNextForUpdate multiple tr069
  test(
    'Validate Update Scheduler - markNextForUpdate multiple tr069',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;
    const flashMac3 = flashMac.substring(0, 15) + 'FB';
    const flashMac4 = flashMac.substring(0, 15) + 'FC';

    // TR-069 device
    const tr069Mac = models.defaultMockDevices[0]._id;
    const tr069Mac2 = flashMac.substring(0, 15) + 'FD';
    const tr069Mac3 = flashMac.substring(0, 15) + 'FE';
    const tr069Mac4 = flashMac.substring(0, 15) + 'FF';

    // Create the config which is aborted
    const config = models.copyConfigFrom(
      models.defaultMockConfigs[0]._id,
      {
        _id: '62b0f57a6ceffe3c4f9d4656',
        device_update_schedule: {
          rule: {
            release: '0234-flm',
            done_devices: [{}],
            to_do_devices: [
              {
                mac: tr069Mac2,
                state: 'downloading',
                slave_count: 0,
                slave_updates_remaining: 0,
                mesh_current: 2,
                mesh_upgrade: 2,
              },
              {
                mac: tr069Mac3,
                state: 'downloading',
                slave_count: 0,
                slave_updates_remaining: 0,
                mesh_current: 2,
                mesh_upgrade: 2,
              },
              {
                mac: tr069Mac4,
                state: 'downloading',
                slave_count: 0,
                slave_updates_remaining: 0,
                mesh_current: 2,
                mesh_upgrade: 2,
              },
            ],
          },
          is_aborted: false,
          is_active: true,
          device_count: 1,
        },
      },
    );

    // Copy Devices
    const tr069Device2 = models.copyDeviceFrom(
      tr069Mac,
      {
        _id: tr069Mac2,
      },
    );
    const tr069Device3 = models.copyDeviceFrom(
      tr069Mac,
      {
        _id: tr069Mac3,
      },
    );
    const tr069Device4 = models.copyDeviceFrom(
      tr069Mac,
      {
        _id: tr069Mac4,
      },
    );


    // Mock config and devices
    utils.common.mockConfigs(config, 'findOne');
    utils.common.mockDevices([
        models.defaultMockDevices[0],
        tr069Device2,
        tr069Device3,
        tr069Device4,
      ],
      'find',
    );
    utils.common.mockDevices(tr069Device2, 'findOne');
    mqtts.unifiedClientsMap = {
      a: {}, b: {}, c: {}, d: {},
    };
    mqtts.unifiedClientsMap.c[flashMac3] = true;
    mqtts.unifiedClientsMap.d[flashMac4] = true;

    // Spy
    const configSpy = jest.spyOn(updateCommon, 'configQuery');
    const deviceSpy = jest.spyOn(DeviceModel.prototype, 'save')
      .mockImplementationOnce(() => Promise.resolve());
    const messagingSpy = jest.spyOn(messaging, 'sendUpdateMessage')
      .mockImplementationOnce(() => {});
    const deviceHandlerSpy = jest.spyOn(deviceHandlers, 'timeoutUpdateAck')
      .mockImplementationOnce(() => {});
    const tr069UpdaterSpy = jest.spyOn(acsFirmware, 'upgradeFirmware')
      .mockImplementationOnce(() => {});
    const flashboxUpdaterSpy = jest.spyOn(mqtts, 'anlixMessageRouterUpdate')
      .mockImplementationOnce(() => {});

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(true);
    expect(result.marked).toBe(true);
    expect(configSpy).toHaveBeenLastCalledWith(
      null,
      {'device_update_schedule.rule.to_do_devices': {'mac': tr069Mac2}},
      {
        'device_update_schedule.rule.in_progress_devices': {
          'mac': tr069Mac2,
          'state': 'downloading',
          'retry_count': 0,
          'slave_count': 0,
          'slave_updates_remaining': 1,
          'mesh_current': 2,
          'mesh_upgrade': 2,
        },
      },
    );
    expect(deviceSpy).toBeCalled();
    expect(messagingSpy).toBeCalled();
    expect(deviceHandlerSpy).toBeCalled();
    expect(tr069UpdaterSpy).toBeCalled();
    expect(flashboxUpdaterSpy).not.toBeCalled();
  });


  // markNextForUpdate multiple mesh
  test(
    'Validate Update Scheduler - markNextForUpdate multiple mesh',
    async () => {
    // Set fake timers
    jest.useFakeTimers();

    // Flashbox device
    const flashMac = models.defaultMockDevices[1]._id;
    const flashMac2 = flashMac.substring(0, 15) + 'FA';
    const flashMac3 = flashMac.substring(0, 15) + 'FB';
    const flashMac4 = flashMac.substring(0, 15) + 'FC';

    // TR-069 device
    const tr069Mac = models.defaultMockDevices[0]._id;
    const tr069Mac2 = flashMac.substring(0, 15) + 'FD';
    const tr069Mac3 = flashMac.substring(0, 15) + 'FE';
    const tr069Mac4 = flashMac.substring(0, 15) + 'FF';

    // Create the config which is aborted
    let config = models.copyConfigFrom(
      models.defaultMockConfigs[0]._id,
      {
        _id: '62b0f57a6ceffe3c4f9d4656',
        device_update_schedule: {
          rule: {
            release: '0234-flm',
            done_devices: [{}],
            to_do_devices: [
              {
                mac: flashMac2,
                state: 'downloading',
                slave_count: 10,
                slave_updates_remaining: 10,
                mesh_current: 1,
                mesh_upgrade: 2,
              },
              {
                mac: flashMac3,
                state: 'downloading',
                slave_count: 10,
                slave_updates_remaining: 10,
                mesh_current: 1,
                mesh_upgrade: 2,
              },
              {
                mac: flashMac4,
                state: 'downloading',
                slave_count: 10,
                slave_updates_remaining: 10,
                mesh_current: 1,
                mesh_upgrade: 2,
              },
            ],
          },
          is_aborted: false,
          is_active: true,
          device_count: 1,
        },
      },
    );

    // Copy Devices
    const tr069Device2 = models.copyDeviceFrom(
      tr069Mac,
      {
        _id: tr069Mac2,
      },
    );
    const tr069Device3 = models.copyDeviceFrom(
      tr069Mac,
      {
        _id: tr069Mac3,
      },
    );
    const tr069Device4 = models.copyDeviceFrom(
      tr069Mac,
      {
        _id: tr069Mac4,
      },
    );

    // Mock config and devices
    utils.common.mockConfigs(config, 'findOne');
    utils.common.mockDevices([
        models.defaultMockDevices[0],
        tr069Device2,
        tr069Device3,
        tr069Device4,
      ],
      'find',
    );
    utils.common.mockDevices(models.defaultMockDevices[1], 'findOne');
    mqtts.unifiedClientsMap = {a: {}, b: {}, c: {}, d: {}};
    mqtts.unifiedClientsMap.a[flashMac] = true;
    mqtts.unifiedClientsMap.a[flashMac3] = true;
    mqtts.unifiedClientsMap.a[flashMac4] = true;

    // Spy
    let configSpy = jest.spyOn(updateCommon, 'configQuery');
    let meshUpgradeSpy = jest.spyOn(meshHandler, 'beginMeshUpdate')
      .mockImplementationOnce(() => Promise.resolve({success: true}));

    // Execute
    let result = updateScheduler.__testMarkNextForUpdate();

    // Run timers
    jest.advanceTimersByTime(500);
    result = await result;

    // Get the result
    expect(result.success).toBe(true);
    expect(result.marked).toBe(true);
    expect(configSpy).toHaveBeenLastCalledWith(
      null,
      {'device_update_schedule.rule.to_do_devices': {'mac': flashMac3}},
      {
        'device_update_schedule.rule.in_progress_devices': {
          'mac': flashMac3,
          'state': 'v1tov2',
          'retry_count': 0,
          'slave_count': 10,
          'slave_updates_remaining': 11,
          'mesh_current': 1,
          'mesh_upgrade': 2,
        },
      },
    );
    expect(meshUpgradeSpy).toHaveBeenCalled();
  });


  // markSeveral null config
  test('Validate Update Scheduler - markSeveral null config', async () => {
    // Mocks
    utils.common.mockConfigs(null, 'findOne');

    // Execute
    let result = await updateScheduler.__testMarkSeveral();

    // Verify
    expect(result).toBe(undefined);
  });


  // markSeveral okay
  test('Validate Update Scheduler - markSeveral okay', async () => {
    // Mocks
    utils.common.mockConfigs(null, 'findOne');

    // Execute
    let result = await updateScheduler.__testMarkSeveral();

    // Verify
    expect(result).toBe(undefined);
  });


  // initialize null config
  test('Validate Update Scheduler - initialize null config', async () => {
    // Test null
    utils.common.mockConfigs(null, 'findOne');

    // Execute and verify
    let result = await updateScheduler.initialize();
    expect(result.success).toBe(false);
    expect(result.error).toContain(
      t('noSchedulingActive').replace('({{errorline}})', ''),
    );
  });


  // initialize okay
  test('Validate Update Scheduler - initialize okay', async () => {
    // Create parameters list
    let macList = [
      models.defaultMockDevices[0]._id,
      models.defaultMockDevices[1]._id,
    ];

    let slaveCountPerMac = {};
    slaveCountPerMac[models.defaultMockDevices[0]._id] = 0;
    slaveCountPerMac[models.defaultMockDevices[1]._id] = 8001;

    // Set mocks
    utils.common.mockDefaultConfigs();
    let configSpy = jest.spyOn(updateCommon, 'configQuery');

    // Execute and verify
    let result = await updateScheduler.initialize(
      macList,
      slaveCountPerMac,
      slaveCountPerMac,
      slaveCountPerMac,
    );

    expect(result.success).toBe(true);
    expect(configSpy).toHaveBeenLastCalledWith(
      {
        'device_update_schedule.rule.to_do_devices': [{
          mac: macList[0].toUpperCase(),
          state: 'update',
          slave_count: slaveCountPerMac[macList[0]],
          retry_count: 0,
          mesh_current: slaveCountPerMac[macList[0]],
          mesh_upgrade: slaveCountPerMac[macList[0]],
        }, {
          mac: macList[1].toUpperCase(),
          state: 'update',
          slave_count: slaveCountPerMac[macList[1]],
          retry_count: 0,
          mesh_current: slaveCountPerMac[macList[1]],
          mesh_upgrade: slaveCountPerMac[macList[1]],
        }],
        'device_update_schedule.rule.in_progress_devices': [],
        'device_update_schedule.rule.done_devices': [],
      },
      null,
      null,
    );
  });
});
