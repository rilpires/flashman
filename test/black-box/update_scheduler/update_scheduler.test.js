const request = require('supertest');
const DeviceModel = require('../../../models/device');


// ToDo!: Create a common library file to store those
const TEST_PARAMETERS = [
  'AAAAAAAAAAAA',
  '',
  null,
  undefined,
  NaN,
  [],
  [0],
  [null],
  [undefined],
  {},
  {test: undefined},
  5,
  0,
  10.5,
  -5,
  +Infinity,
  -Infinity,
  // Symbol('BBBBBBBBB'),
  // Symbol(),
  // Missing BigInt
  false,
  true,
  function(x) {
    return x;
  },
];


const loginAsAdmin = async function() {
  return (request('localhost:8000')
    .post('/login')
    .send({
      name: 'admin',
      password: 'landufrj123',
    })
    .catch((error) => console.log(error)));
};


const getDevices = async function(query) {
  const matchedDevices = DeviceModel
    .find(query)
    .lean()
    .catch((error) => console.log(error));

    return matchedDevices;
};


const getReleases = async function(cookie, data) {
  return (request('localhost:8000')
      .put('/devicelist/scheduler/releases')
      .set('Cookie', cookie)
      .send(data)
      .catch((error) => console.log(error))
  );
};


describe('TR-069 Update Scheduler Tests - Front End', () => {
  let adminCookie = null;
  let devices = null;

  beforeAll(async () => {
    jest.setTimeout(100 * 1000);

    // Connect to flashman as admin
    const adminLogin = await loginAsAdmin();
    adminCookie = adminLogin.header['set-cookie'];

    if (typeof adminCookie === undefined) {
      throw new Error('Failed to get admin cookie');
    }

    // Get all devices
    // devices = await getDevices({});
  });


  test('Validate release route', async () => {
    let responses = [];
    // let getCount = 0;
    let response = await getReleases(adminCookie, {});
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).not.toBeUndefined();

    // Push all tests
    for (let test = 0; test < TEST_PARAMETERS.length; test++) {
      responses.push({
        response: getReleases(adminCookie, {
          use_csv: TEST_PARAMETERS[test],
          use_all: TEST_PARAMETERS[test],
          page_num: TEST_PARAMETERS[test],
          page_count: TEST_PARAMETERS[test],
          filter_list: TEST_PARAMETERS[test],
        }),

        expected: {status: 200, success: false},
      });
    }


    // Wrong values
    responses.push({
      response: getReleases(adminCookie, {
        use_csv: 'false',
        use_all: 'true',
        page_num: '5',
        page_count: '0',
        filter_list: '',
      }),

      expected: {status: 200, success: false},
    });

    responses.push({
      response: getReleases(adminCookie, {
        use_csv: 'false',
        use_all: 'true',
        page_num: '0',
        page_count: '5',
        filter_list: '',
      }),

      expected: {status: 200, success: false},
    });


    // CSV test
    // This test will depend that there is no csv file in the filesystem
    // ToDo!: Check csv logic
    responses.push({
      response: getReleases(adminCookie, {
        use_csv: 'true',
        use_all: 'true',
        page_num: '1',
        page_count: '50',
        filter_list: '',
      }),

      expected: {status: 500, success: false},
    });


    // Okay test
    responses.push({
      response: getReleases(adminCookie, {
        use_csv: 'false',
        use_all: 'true',
        page_num: '1',
        page_count: '50',
        filter_list: '',
      }),

      expected: {status: 200, success: true},
    });


    // Await all tests and validate it
    for (let test = 0; test < responses.length; test++) {
      let res = responses[test];
      res.response = await res.response;

      expect(res.response.statusCode).toBe(res.expected.status);
      expect(res.response.body.success).toBe(res.expected.success);

      if (res.expected.success === true) {
        expect(res.response.body.onuCount).toBeGreaterThanOrEqual(0);
        expect(res.response.body.totalCount).toBeGreaterThanOrEqual(0);
        expect(res.response.body.releaseInfo).not.toBeUndefined();
      }
    }

  /*
    This codes generates tests and get the responses for every possibility in
    TEST_PARAMETERS. It can easily generate +1 million test cases. The amount
    of memory and time needed is huge.


    // 5 Parameters, test all combinations
    for (let test = 0; test < Math.pow(TEST_PARAMETERS.length, 5); test++) {
      let data = {};
      let status = 200;
      let success = false;

      // 1st Parameter - use_csv inclusion
      if (test % 2 === 1) {
        data.use_csv = TEST_PARAMETERS[test % TEST_PARAMETERS.length];
      }

      // 2nd Parameter - use_all inclusion
      if (test % 4 >= 2) {
        data.use_all = TEST_PARAMETERS[
          Math.floor(test / TEST_PARAMETERS.length) % TEST_PARAMETERS.length
        ];
      }

      // 3rd Parameter - page_num inclusion
      if (test % 8 >= 4) {
        data.page_num = TEST_PARAMETERS[
          Math.floor(
            test / Math.pow(TEST_PARAMETERS.length, 2),
          ) % TEST_PARAMETERS.length
        ];
      }

      // 4th Parameter - page_count inclusion
      if (test % 16 >= 8) {
        data.page_count = TEST_PARAMETERS[
          Math.floor(
            test / Math.pow(TEST_PARAMETERS.length, 3),
          ) % TEST_PARAMETERS.length
        ];
      }

      // 5th Parameter - filter_list inclusion
      if (test % 32 >= 16) {
        data.filter_list = TEST_PARAMETERS[
          Math.floor(
            test / Math.pow(TEST_PARAMETERS.length, 4),
          ) % TEST_PARAMETERS.length
        ];
      }


      // Check types
      if (
        (data.use_csv) && (data.use_all) &&
        (data.page_num) && (data.page_count) && (data.filter_list) &&
        (data.page_num >= 1 || data.page_count >= 1) &&
        (data.filter_list.constructor === String)
      ) {
        success = true;
      }


      // Increment quantity
      getCount++;
      if (getCount % 5000 === 0) {
        console.log(
          'Currently in test ' +
          getCount + ' of ' +
          Math.pow(TEST_PARAMETERS.length, 5),
        );

        console.log(data);
      }


      // Push the response
      responses.push({
        response: getReleases(adminCookie, data),
        expected: {
          statusCode: status,
          success: success,
        },
      });


      // Clean memory until fault
      if (getCount % 100000 === 0) {
        for (let test = 0; test < responses.length; test++) {
          let response = responses.pop();

          let result = await response.response;
          let status = response.expected.statusCode;
          let success = response.expected.success;

          expect(result.statusCode).toBe(status);
          expect(result.success).toBe(success);
        }
      }
    }

    console.log('Done ' + getCount + ' tests.');

    // console.log(response.body.releaseInfo);
    for (let test = 0; test < responses.length; test++) {
      let response = await responses.pop();

      let result = response.response;
      let status = response.expected.statusCode;
      let success = response.expected.success;

      expect(result.statusCode).toBe(status);
      expect(result.success).toBe(success);
    }
  */
  });
});
