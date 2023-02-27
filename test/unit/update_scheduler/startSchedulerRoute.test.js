require('../../../bin/globals');

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const utils = require('../../common/utils');
const models = require('../../common/models');
const ConfigModel = require('../../../models/config');

// Used to cancel scheduler
const SchedulerCommon = require('../../../controllers/update_scheduler_common');

// Mock the filesystem
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readdirSync: () => [],
}));

// Mock the mqtts (avoid aedes)
jest.mock('../../../mqtts', () => {
  return {
    __esModule: false,
    unifiedClientsMap: {},
    anlixMessageRouterUpdate: () => undefined,
    getConnectedClients: () => [],
  };
});

/* Validates the response */
const checkResponse = function(response, statusCode, success, data) {
  try {
    expect(response.statusCode).toBe(statusCode);
    expect(response.body.success).toBe(success);

    if (success === false) {
      expect(response.body.message).toBeDefined();
    }
  } catch (error) {
    error.message =
      `
        ${error.message}

        \nFailed data:\n${JSON.stringify(
          data, undefined, 2,
        )}

        \nResponse:\n${JSON.stringify(
          response.body, undefined, 2,
        )}
      `;
    throw error;
  }
};


// controllers/update_scheduler.js/startSchedule
describe('TR-069 Update Scheduler Tests - Start Schedule', () => {
  let goodReleaseId = null;

  beforeAll(async () => {
    // Mock the devices
    models.copyFirmwareFrom(
      '638f927dd05676c90dbdeeba',
      {
        _id: '639f957de0a676f90db6eeba',
        version: '1.1-220826',
        release: '1.1-220826',
        filename: 'ONT121AC_inMesh_1.1-220826.tar',
      },
    );

    utils.common.mockDefaultFirmwares();
    utils.common.mockDefaultDevices();
    utils.common.mockDefaultConfigs();

    goodReleaseId = (await utils.schedulerCommon.getReleasesFake({
      use_csv: 'false',
      use_all: 'true',
      page_num: '1',
      page_count: '50',
      filter_list: '',
    })).body.releaseInfo[0].id;
  });


  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllMocks();

    utils.common.mockDefaultFirmwares();
    utils.common.mockDefaultDevices();
    utils.common.mockDefaultConfigs();

    // Mock the save() call
    jest.spyOn(ConfigModel.prototype, 'save')
      .mockImplementation(() => Promise.resolve(),
    );
  });

  afterEach(() => {
    // Cancel schedule after test (avoid jest hang waiting a timer)
    SchedulerCommon.removeOfflineWatchdog();
  });

  // Empty data
  test('Validate start route - {}', async () => {
    let data = {};

    let response = await utils.schedulerCommon.startSchedulerFake(data);
    checkResponse(response, 500, false, data);
  });


  // TEST_PARAMETERS tests
  for (
    let testIndex = 0;
    testIndex < utils.common.TEST_PARAMETERS.length;
    testIndex++
  ) {
    test(
      'Validate start route - TEST_PARAMETERS: ' +
      utils.common.TEST_PARAMETERS[testIndex], async () => {
      let data = {
        use_search: utils.common.TEST_PARAMETERS[test],
        use_csv: utils.common.TEST_PARAMETERS[test],
        use_all: utils.common.TEST_PARAMETERS[test],
        use_time_restriction: utils.common.TEST_PARAMETERS[test],
        time_restriction: utils.common.TEST_PARAMETERS[test],
        timeout_enable: utils.common.TEST_PARAMETERS[test],
        timeout_period: utils.common.TEST_PARAMETERS[test],
        release: utils.common.TEST_PARAMETERS[test],
        page_num: utils.common.TEST_PARAMETERS[test],
        page_count: utils.common.TEST_PARAMETERS[test],
        filter_list: utils.common.TEST_PARAMETERS[test],
        cpes_wont_return: utils.common.TEST_PARAMETERS[test],
      };

      let response = await utils.schedulerCommon.startSchedulerFake(data);
      checkResponse(response, 500, false, data);
    });
  }

  // Page count
  test('Validate start route - Invalid page count', async () => {
    let data = {
      use_search: '',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
      timeout_enable: 'false',
      release: goodReleaseId,
      page_num: '5',
      page_count: '0',
      filter_list: '',
      cpes_wont_return: 'false',
    };

    let response = await utils.schedulerCommon.startSchedulerFake(data);
    checkResponse(response, 500, false, data);
  });


  // Page num
  test('Validate start route - Invalid page num', async () => {
    let data = {
      use_search: '',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
      timeout_enable: 'false',
      release: goodReleaseId,
      page_num: '0',
      page_count: '5',
      filter_list: '',
      cpes_wont_return: 'false',
    };

    let response = await utils.schedulerCommon.startSchedulerFake(data);
    checkResponse(response, 500, false, data);
  });


  // Release
  test('Validate start route - Invalid Release', async () => {
    let data = {
      use_search: '',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
      timeout_enable: 'false',
      release: 'AAA',
      page_num: '1',
      page_count: '50',
      filter_list: '',
      cpes_wont_return: 'false',
    };

    let response = await utils.schedulerCommon.startSchedulerFake(data);
    checkResponse(response, 500, false, data);
  });


  // CSV
  // This test will depend that there is no csv file in the filesystem
  // ToDo!: Check full csv logic
  test('Validate start route - No csv file', async () => {
    let data = {
      use_search: '',
      use_csv: 'true',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
      timeout_enable: 'false',
      release: goodReleaseId,
      page_num: '1',
      page_count: '50',
      filter_list: '',
      cpes_wont_return: 'false',
    };

    let response = await utils.schedulerCommon.startSchedulerFake(data);
    checkResponse(response, 500, false, data);
  });


  // Not found device
  test('Validate start route - Not found device', async () => {
    utils.common.mockDevices([], 'find');
    utils.common.mockDevices(null, 'findOne');
    utils.common.mockDevices(null, 'findById');

    let data = {
      use_search: '',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
      timeout_enable: 'false',
      release: goodReleaseId,
      page_num: '1',
      page_count: '50',
      filter_list: 'AA:AA:AA:AA:AA:AA',
      cpes_wont_return: 'false',
    };

    let response = await utils.schedulerCommon.startSchedulerFake(data);
    checkResponse(response, 500, false, data);
  });


  // Not found firmware
  test('Validate start route - Not found firmware', async () => {
    utils.common.mockFirmwares([], 'find');
    utils.common.mockFirmwares(null, 'findOne');
    utils.common.mockFirmwares(null, 'findById');

    let data = {
      use_search: '',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
      timeout_enable: 'false',
      release: goodReleaseId,
      page_num: '1',
      page_count: '50',
      filter_list: '',
      cpes_wont_return: 'false',
    };

    let response = await utils.schedulerCommon.getReleasesFake(data);
    checkResponse(response, 200, true, data);
  });


  // Time restriction, but it is malformed
  for (
    let testIndex = 0;
    testIndex < utils.common.TEST_PARAMETERS.length;
    testIndex++
  ) {
    test(
      'Validate start route - Time Restriction: ' +
      utils.common.TEST_PARAMETERS[testIndex], async () => {
      let data = {
        use_search: '',
        use_csv: 'false',
        use_all: 'true',
        use_time_restriction: 'true',
        time_restriction: utils.common.TEST_PARAMETERS[test],
        timeout_enable: 'false',
        release: goodReleaseId,
        page_num: '1',
        page_count: '50',
        filter_list: '',
        cpes_wont_return: 'false',
      };

      let response = await utils.schedulerCommon.startSchedulerFake(data);
      checkResponse(response, 500, false, data);
    });
  }


  // Timeout, but it is malformed
  for (
    let testIndex = 0;
    testIndex < utils.common.TEST_PARAMETERS.length;
    testIndex++
  ) {
    test(
      'Validate start route - Timeout cases: ' +
      utils.common.TEST_PARAMETERS[testIndex], async () => {
      let data = {
        use_search: '',
        use_csv: 'false',
        use_all: 'true',
        use_time_restriction: 'false',
        time_restriction: '[]',
        timeout_enable: 'true',
        timeout_period: utils.common.TEST_PARAMETERS[test],
        release: goodReleaseId,
        page_num: '1',
        page_count: '50',
        filter_list: '',
        cpes_wont_return: 'false',
      };

      let response = await utils.schedulerCommon.startSchedulerFake(data);
      checkResponse(response, 500, false, data);
    });
  }


  // Invalid timeout 1
  test('Validate start route - Invalid timeout 1', async () => {
    let timeoutPeriod = Math.ceil(
      models.defaultMockConfigs[0].tr069.inform_interval / 60000,
    ) + parseInt(process.env.FLM_MIN_TIMEOUT_PERIOD) - 1;

    let data = {
      use_search: '"online"',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
      timeout_enable: 'true',
      timeout_period: timeoutPeriod.toString(),
      release: goodReleaseId,
      page_num: '1',
      page_count: '50',
      filter_list: 'online',
      cpes_wont_return: 'false',
    };

    let response = await utils.schedulerCommon.startSchedulerFake(data);
    checkResponse(response, 500, false, data);
  });


  // Invalid timeout 2
  test('Validate start route - Invalid timeout 2', async () => {
    let timeoutPeriod = parseInt(process.env.FLM_MAX_TIMEOUT_PERIOD) + 1;

    let data = {
      use_search: '"online"',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
      timeout_enable: 'true',
      timeout_period: timeoutPeriod.toString(),
      release: goodReleaseId,
      page_num: '1',
      page_count: '50',
      filter_list: 'online',
      cpes_wont_return: 'false',
    };

    let response = await utils.schedulerCommon.startSchedulerFake(data);
    checkResponse(response, 500, false, data);
  });


  // Okay
  test('Validate start route - Okay', async () => {
    let data = {
      use_search: '"online"',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
      release: goodReleaseId,
      timeout_enable: 'false',
      page_num: '1',
      page_count: '50',
      filter_list: 'online',
      cpes_wont_return: 'false',
    };

    let response = await utils.schedulerCommon.startSchedulerFake(data);
    checkResponse(response, 200, true, data);
  });


  // Okay 2
  test('Validate start route - Okay 2', async () => {
    let data = {
      use_search: '"online"',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
      timeout_enable: 'false',
      release: goodReleaseId,
      page_num: '1',
      page_count: '50',
      filter_list: 'online',
      cpes_wont_return: 'false',
    };

    let response = await utils.schedulerCommon.startSchedulerFake(data);
    checkResponse(response, 200, true, data);
  });


  // Okay valid timeout
  test('Validate start route - Okay valid timeout', async () => {
    let timeoutPeriod = Math.ceil(
      models.defaultMockConfigs[0].tr069.inform_interval / 60000,
    ) + process.env.FLM_MIN_TIMEOUT_PERIOD;

    let data = {
      use_search: '"online"',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
      timeout_enable: 'true',
      timeout_period: timeoutPeriod.toString(),
      release: goodReleaseId,
      page_num: '1',
      page_count: '50',
      filter_list: 'online',
      cpes_wont_return: 'false',
    };

    let response = await utils.schedulerCommon.startSchedulerFake(data);
    checkResponse(response, 200, true, data);
  });


  // Okay strange firmware
  test('Validate start route - Okay strange firmware', async () => {
    models.copyFirmwareFrom(
      '638f927dd05676c90dbdeeba',
      {
        _id: '639f957de1a676b90db6eebc',
        version: '1.1-229999',
        release: '1.1-229999',
        filename: 'ONT121AC_inMesh_1.1-229999.tar',
      },
    );

    let data = {
      use_search: '"online"',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
      timeout_enable: 'false',
      release: '1.1-229999',
      page_num: '1',
      page_count: '50',
      filter_list: 'online',
      cpes_wont_return: 'false',
    };

    let response = await utils.schedulerCommon.startSchedulerFake(data);
    checkResponse(response, 200, true, data);
  });


  // Okay, no return to flashman
  test('Validate start route - Okay, no return to flashman', async () => {
    let data = {
      use_search: '"online"',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
      timeout_enable: 'false',
      release: goodReleaseId,
      page_num: '1',
      page_count: '50',
      filter_list: 'online',
      cpes_wont_return: 'true',
    };

    let response = await utils.schedulerCommon.startSchedulerFake(data);
    checkResponse(response, 200, true, data);
  });
});
