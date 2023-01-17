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


// controllers/update_scheduler.js/getDevicesReleases
describe('TR-069 Update Scheduler Tests - Get Releases', () => {

  beforeAll(() => {
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
  });


  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();

    utils.common.mockDefaultFirmwares();
    utils.common.mockDefaultDevices();
    utils.common.mockDefaultConfigs();
  });
  

  // Empty data  
  test('Validate release route - {}', async () => {
    let data = {};

    let response = await utils.schedulerCommon.getReleasesFake(data);
    checkResponse(response, 200, false, data);
  });


  // TEST_PARAMETERS tests
  for (
    let testIndex = 0;
    testIndex < utils.common.TEST_PARAMETERS.length;
    testIndex++
  ) {
    test(
      'Validate release route - TEST_PARAMETERS: ' + 
      utils.common.TEST_PARAMETERS[testIndex], async () => {
      data = {
        use_csv: utils.common.TEST_PARAMETERS[testIndex],
        use_all: utils.common.TEST_PARAMETERS[testIndex],
        page_num: utils.common.TEST_PARAMETERS[testIndex],
        page_count: utils.common.TEST_PARAMETERS[testIndex],
        filter_list: utils.common.TEST_PARAMETERS[testIndex],
      };
      
      let response = await utils.schedulerCommon.getReleasesFake(data);
      checkResponse(response, 200, false, data);
    });
  }


  // Page count
  test('Validate release route - Invalid page count', async () => {
    data = {
      use_csv: 'false',
      use_all: 'true',
      page_num: '5',
      page_count: '0',
      filter_list: '',
    };

    let response = await utils.schedulerCommon.getReleasesFake(data);
    checkResponse(response, 200, false, data);
  });


  // Page num
  test('Validate release route - Invalid page num', async () => {
    data = {
      use_csv: 'false',
      use_all: 'true',
      page_num: '0',
      page_count: '5',
      filter_list: '',
    };

    let response = await utils.schedulerCommon.getReleasesFake(data);
    checkResponse(response, 200, false, data);
  });


  // CSV
  test('Validate release route - No csv file', async () => {
    data = {
      use_csv: 'true',
      use_all: 'true',
      page_num: '1',
      page_count: '50',
      filter_list: '',
    };

    let response = await utils.schedulerCommon.getReleasesFake(data);
    checkResponse(response, 500, false, data);
  });


  // Okay test
  test('Validate release route - Okay', async () => {
    data = {
      use_csv: 'false',
      use_all: 'true',
      page_num: '1',
      page_count: '50',
      filter_list: '',
    };

    let response = await utils.schedulerCommon.getReleasesFake(data);
    checkResponse(response, 200, true, data);
  });


  // Okay test - 2
  test('Validate release route - Okay 2', async () => {
    data = {
      use_csv: 'false',
      use_all: 'false',
      page_num: '1',
      page_count: '50',
      filter_list: '',
    };

    let response = await utils.schedulerCommon.getReleasesFake(data);
    checkResponse(response, 200, true, data);
  });


  // Not found device
  test('Validate release route - Not found device', async () => {
    utils.common.mockDevices([], 'find');
    utils.common.mockDevices({}, 'findOne');
    utils.common.mockDevices({}, 'findById');

    data = {
      use_csv: 'false',
      use_all: 'true',
      page_num: '1',
      page_count: '50',
      filter_list: 'AA:AA:AA:AA:AA:AA',
    };
  
    let response = await utils.schedulerCommon.getReleasesFake(data);
    checkResponse(response, 500, false, data);
  });


  // Not found firmware
  test('Validate release route - Not found firmware', async () => {
    utils.common.mockFirmwares([], 'find');
    utils.common.mockFirmwares({}, 'findOne');
    utils.common.mockFirmwares({}, 'findById');

    data = {
      use_csv: 'false',
      use_all: 'true',
      page_num: '1',
      page_count: '50',
      filter_list: 'AA:AA:AA:AA:AA:AA',
    };
  
    let response = await utils.schedulerCommon.getReleasesFake(data);
    checkResponse(response, 200, true, data);
  });
});
