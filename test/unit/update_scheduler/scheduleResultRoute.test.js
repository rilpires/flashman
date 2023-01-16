require('../../../bin/globals');
const utils = require('../../common/utils');
const models = require('../../common/models');

// Mock the filesystem
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readdirSync: () => [],
}));


/* Validates the response */
const checkResponse = function(response, statusCode, success) {
  try {
    expect(response.statusCode).toBe(statusCode);

    if (success === false) {
      expect(response.body.message).toBeDefined();
    } else {
      expect(response.body).toEqual(
        expect.stringContaining('Atualização abortada')
      );
    }
  
  } catch (error) {
    error.message =
      `
        ${error.message}

        \nResponse:\n${JSON.stringify(
          response, undefined, 2,
        )}
      `;
    throw error;
  }
};


// controllers/update_scheduler.js/scheduleResult
describe('TR-069 Update Scheduler Tests - Schedule Result', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();

    utils.common.mockDefaultFirmwares();
    utils.common.mockDefaultDevices();
    utils.common.mockDefaultConfigs();
  });


  // Empty config
  test('Validate result route - Empty config', async () => {
    utils.common.mockConfigs([], 'find');
    utils.common.mockConfigs(null, 'findOne');
    utils.common.mockConfigs(null, 'findById');

    let response = await utils.schedulerCommon.schedulerResultFake();
    checkResponse(response, 500, false);
  });


  // Scheduler already aborted
  // The config of models.defaultMockConfigs is aborted
  test('Validate abort route - Already aborted', async () => {
    let response = await utils.schedulerCommon.schedulerResultFake();
    checkResponse(response, 200, true);
  });


  // Invalid device
  test('Validate result route - Invalid device', async () => {
    utils.common.mockDevices([], 'find');
    utils.common.mockDevices(null, 'findOne');
    utils.common.mockDevices(null, 'findById');

    let response = await utils.schedulerCommon.schedulerResultFake();
    checkResponse(response, 200, true);
  });


  // Okay
  test('Validate result route - Okay', async () => {
    // Copy the config and use it
    let config = models.copyConfigFrom(
      '62b9f57c6beaae3b4f9d4656',
      {
        _id: '62b9f57c6beaae3b4f9d4657',
        device_update_schedule: {
          rule: {
            to_do_devices: [],
            in_progress_devices: [],
            done_devices: [{
              slave_count: 0,
              slave_updates_remaining: 1,
              mesh_current: 0,
              mesh_upgrade: 0,
              _id: '639a0a435e15c28897333b70',
              mac: 'AA:AA:AA:AA:AA:87',
              state: 'aborted_down',
            }],
            release: '61.1-220826',
          },
          is_active: true,
          is_aborted: false,
          device_count: 1,
          allowed_time_ranges: [],
          date: Date('2022-12-14T17:17:07.557Z'),
          used_csv: false,
          used_search: '\'online\'',
          used_time_range: false,
        },
      },
    );

    utils.common.mockConfigs(models.defaultMockConfigs, 'find');
    utils.common.mockConfigs(config, 'findOne');
    utils.common.mockConfigs(config, 'findById');

    let response = await utils.schedulerCommon.schedulerResultFake();
    checkResponse(response, 200, true);
  });

});
