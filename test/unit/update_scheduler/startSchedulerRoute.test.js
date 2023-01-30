require('../../../bin/globals');
const utils = require('../../common/utils');
const models = require('../../common/models');

// Mock the filesystem
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readdirSync: () => [],
}));


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
    jest.restoreAllMocks();
    jest.clearAllMocks();

    utils.common.mockDefaultFirmwares();
    utils.common.mockDefaultDevices();
    utils.common.mockDefaultConfigs();
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
      data = {
        use_search: utils.common.TEST_PARAMETERS[test],
        use_csv: utils.common.TEST_PARAMETERS[test],
        use_all: utils.common.TEST_PARAMETERS[test],
        use_time_restriction: utils.common.TEST_PARAMETERS[test],
        time_restriction: utils.common.TEST_PARAMETERS[test],
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
    data = {
      use_search: '',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
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
    data = {
      use_search: '',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
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
    data = {
      use_search: '',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
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
    data = {
      use_search: '',
      use_csv: 'true',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
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

    data = {
      use_search: '',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
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

    data = {
      use_search: '',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
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
      data = {
        use_search: '',
        use_csv: 'false',
        use_all: 'true',
        use_time_restriction: 'true',
        time_restriction: utils.common.TEST_PARAMETERS[test],
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


  // Okay
  test('Validate start route - Okay', async () => {
    data = {
      use_search: '"online"',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
      release: goodReleaseId,
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
    data = {
      use_search: '"online"',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
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

    data = {
      use_search: '"online"',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
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
    data = {
      use_search: '"online"',
      use_csv: 'false',
      use_all: 'true',
      use_time_restriction: 'false',
      time_restriction: '[]',
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
