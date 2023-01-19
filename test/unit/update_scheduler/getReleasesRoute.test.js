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


  /*test('Validate start route', async () => {
    let responses = [];
    let data = {};

    // Mock devices and firmwares
    utils.common.mockDefaultFirmwares();
    utils.common.mockDefaultDevices();
    utils.common.mockDefaultConfigs();


    // Get releases first, this call must succeed
    let possibleReleases = await utils.schedulerCommon.getReleasesFake({
      use_csv: 'false',
      use_all: 'true',
      page_num: '1',
      page_count: '50',
      filter_list: '',
    });
    let goodReleaseId = possibleReleases.body.releaseInfo[0].id;


    // Empty data
    responses.push({
      response: utils.schedulerCommon.starSchedulerFake(data),
      expected: {status: 500, success: false},
      data: data,
    });

    // Push all tests
    for (let test = 0; test < utils.common.TEST_PARAMETERS.length; test++) {
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
      };

      responses.push({
        response: utils.schedulerCommon.starSchedulerFake(data),
        expected: {status: 500, success: false},
        data: data,
      });
    }


    // Wrong values
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
    };
    responses.push({
      response: utils.schedulerCommon.starSchedulerFake(data),
      expected: {status: 500, success: false},
      data: data,
    });

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
    };
    responses.push({
      response: utils.schedulerCommon.starSchedulerFake(data),
      expected: {status: 500, success: false},
      data: data,
    });

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
    };
    responses.push({
      response: utils.schedulerCommon.starSchedulerFake(data),
      expected: {status: 500, success: false},
      data: data,
    });


    // CSV test
    // This test will depend that there is no csv file in the filesystem
    // ToDo!: Check full csv logic
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
    };
    responses.push({
      response: utils.schedulerCommon.starSchedulerFake(data),
      expected: {status: 500, success: false},
      data: data,
    });


    // Not found device - but the mockingoose always return the device
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
    };
    responses.push({
      response: utils.schedulerCommon.starSchedulerFake(data),
      expected: {status: 200, success: true},
      data: data,
    });


    // Has time restriction, but it is malformed
    for (let test = 0; test < utils.common.TEST_PARAMETERS.length; test++) {
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
      };
      responses.push({
        response: utils.schedulerCommon.starSchedulerFake(data),
        expected: {status: 500, success: false},
        data: data,
      });
    }


    // Start twice
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
    };
    responses.push({
      response: utils.schedulerCommon.starSchedulerFake(data),
      expected: {status: 200, success: true},
      data: data,
    });

    responses.push({
      response: utils.schedulerCommon.starSchedulerFake(data),
      expected: {status: 200, success: true},
      data: data,
    });


    // Await all tests and validate it
    for (let test = 0; test < responses.length; test++) {
      let res = responses[test];
      res.response = await res.response;

      try {
        expect(res.response.statusCode).toBe(res.expected.status);
        expect(res.response.body.success).toBe(res.expected.success);

        if (res.expected.success === false) {
          expect(res.response.body.message).toBeDefined();
        }
      
      } catch (error) {
        error.message =
          `
            ${error.message}

            \nFailed data:\n${JSON.stringify(
              res.data, undefined, 2,
            )}

            \nResponse:\n${JSON.stringify(
              res.response.body, undefined, 2,
            )}
          `;
        throw error;
      }
    }
  });

  test('Validate abort route', async () => {

  });*/
});
