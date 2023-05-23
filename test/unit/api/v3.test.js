require('../../../bin/globals');

const utils = require('../../common/utils');
const models = require('../../common/models');

const api = require('../../../controllers/api/v3');
const DeviceModel = require('../../../models/device');
const t = require('../../../controllers/language').i18next.t;


const MAX_PAGE_SIZE = 50;


// API V3 Tests
describe('API V3 Tests', () => {
  // Tests if it can return an object that can be returned to the user
  describe('buildDeviceResponse Tests', () => {
    // Test what happens if not valid is passed
    test('Not valid', () => {
      // Variables
      const valid = false;
      const status = 123;
      const extra = 'test';

      // Execute
      let response = api.buildDeviceResponse(valid, status, extra);

      // Validate
      expect(response).toStrictEqual({
        valid: valid,
        statusCode: status,
        message: extra,
        json: {
          success: valid,
          message: extra,
          device: {},
        },
      });
    });

    // Test what happens if valid is passed
    test('Valid', () => {
      // Variables
      const valid = true;
      const status = 123;
      const extra = 'test';

      // Execute
      let response = api.buildDeviceResponse(valid, status, extra);

      // Validate
      expect(response).toStrictEqual({
        valid: valid,
        statusCode: status,
        message: t('OK'),
        json: {
          success: valid,
          message: t('OK'),
          device: extra,
        },
      });
    });
  });


  // Tests if it can return the response to the user
  describe('returnDevicesError Tests', () => {
    test('Normal operation', () => {
      // Spy
      let jsonSpy = jest.fn();
      let statusSpy = jest.fn().mockImplementation(() => ({json: jsonSpy}));

      // Variables
      let response = {status: statusSpy};
      const validation = {statusCode: 123, message: 'test'};

      // Execute
      api.returnDevicesError(response, validation);

      // Validate
      expect(statusSpy).toHaveBeenCalledWith(validation.statusCode);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: validation.message,
        devices: [],
      });
    });
  });


  // Test if it can validate a request properly
  describe('validateRequest Tests', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();

      // Mock response
      jest.spyOn(api, 'buildDeviceResponse')
        .mockImplementation((arg1, arg2, arg3) => ({
          valid: arg1, status: arg2, extra: arg3,
        }));
    });

    // The request did not come properly
    test.each(
      [
        null, undefined, {}, {params: null, query: {}},
        {params: undefined, query: {}}, {params: {}, query: null},
        {params: {}, query: undefined},
      ],
    )('Invalid request - %p', (request) => {
      // Execute
      const response = api.validateRequest(request);

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(
        t('requestError').replace('({{errorline}})', ''),
      );
    });

    // The request came properly
    test('Valid request', () => {
      // Execute
      const response = api.validateRequest({
        params: {}, query: {},
      });

      // Validate
      expect(response.valid).toBe(true);
    });
  });


  // Test if it can validate an object a field passed
  describe('validateField Tests', () => {
    // Use the first field avaiable
    const testField = Object.keys(api.__testTranslationObject)[0];

    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();

      // Mock response
      jest.spyOn(api, 'buildDeviceResponse')
        .mockImplementation((arg1, arg2, arg3) => ({
          valid: arg1, status: arg2, extra: arg3,
        }));
    });

    // Test invalid params
    test.each(
      [null, undefined, {}],
    )('Invalid params - %p', (params) => {
      let params2 = {};
      params2[testField] = params;

      // Execute
      const response = api.validateField(params, testField, 'test');
      const response2 = api.validateField(params2, testField, 'test');

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(t('mustBeAString'));

      expect(response2.valid).toBe(false);
      expect(response2.status).toBe(400);
      expect(response2.extra).toContain(t('mustBeAString'));
    });

    // Test if all entries in translate has a validation function
    test('Check all validations', () => {
      Object.keys(api.__testTranslationObject).forEach((entry) => {
        expect(
          typeof api.__testTranslationObject[entry].validation,
        ).toBe('function');
      });
    });

    // Check what happens if the validation returns not valid from
    // device_validator
    test('Not valid - device_validator', () => {
      const errorMessage = 'DeviceValidatorError';
      let params = {};
      params[testField] = 'Test123';

      api.__testTranslationObject[testField].validation = () => ({
        valid: false, err: errorMessage,
      });

      // Execute
      const response = api.validateField(params, testField, 'test');

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(errorMessage);
    });

    // Check what happens if the validation returns not valid from
    // buildDeviceResponse
    test('Not valid - buildDeviceResponse', () => {
      const errorMessage = 'DeviceValidatorError';
      let params = {};
      params[testField] = 'Test123';

      api.__testTranslationObject[testField].validation = () => ({
        valid: false, message: errorMessage,
      });

      // Execute
      const response = api.validateField(params, testField, 'test');

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(errorMessage);
    });

    // Check what happens if the validation returns valid
    test('Valid', () => {
      let params = {};
      params[testField] = 'Test123';

      api.__testTranslationObject[testField].validation = () => ({valid: true});

      // Execute
      const response = api.validateField(params, testField, 'test');

      // Validate
      expect(response.valid).toBe(true);
      expect(response.status).toBe(200);
      expect(response.extra).toContain(t('OK'));
    });
  });


  // Test if the projection passed will be valid or not
  describe('validateDeviceProjection Tests', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();

      // Mock response
      jest.spyOn(api, 'buildDeviceResponse')
        .mockImplementation((arg1, arg2, arg3) => ({
          valid: arg1, status: arg2, extra: arg3,
        }));
    });

    // Test invalid projection
    test.each(
      [null, undefined, {}, 53],
    )('Invalid projection - %p', (projection) => {
      // Execute
      const response = api.validateDeviceProjection(projection, 'test');

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(t('mustBeAString'));
    });

    // Test if the validation returns false
    test('Not valid', () => {
      // Execute
      // It executes `device_validator.validateProjection` as it cannot override
      // `validateProjection` for `validateDeviceProjection`
      const response = api.validateDeviceProjection('1', null);

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(
        t('thisFieldMustHaveAtLeastMinChars', {min: 2}),
      );
    });

    // Test if the validation returns true but there is no path to it
    test('No path', () => {
      // Execute
      // It executes `device_validator.validateProjection` as it cannot override
      // `validateProjection` for `validateDeviceProjection`
      const response = api.validateDeviceProjection('123', null);

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(
        t('fieldNotFound').replace('({{errorline}})', ''),
      );
    });

    // Test if the validation returns true but there is no sub-path to it
    test('No subpath', () => {
      // Execute
      // It executes `device_validator.validateProjection` as it cannot override
      // `validateProjection` for `validateDeviceProjection`
      const response = api.validateDeviceProjection('123', 'test');

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(
        t('fieldNotFound').replace('({{errorline}})', ''),
      );
    });

    // Test what happens if find a path and did not passed `relativePath`
    test('Valid path', () => {
      const path = Object.keys(DeviceModel.schema.paths)[0];

      // Execute
      // It executes `device_validator.validateProjection` as it cannot override
      // `validateProjection` for `validateDeviceProjection`
      const response = api.validateDeviceProjection(path, null);

      // Validate
      expect(response.valid).toBe(true);
      expect(response.value).toBe(path);
    });

    // Test what happens if find a subpath and passed `relativePath`
    test('Valid subpath', () => {
      const subpath = Object.keys(DeviceModel.schema.subpaths)[0];
      const relativePath = subpath.split('.')[0];
      const path = subpath.split('.')[1];

      // Execute
      // It executes `device_validator.validateProjection` as it cannot override
      // `validateProjection` for `validateDeviceProjection`
      const response = api.validateDeviceProjection(path, relativePath);

      // Validate
      expect(response.valid).toBe(true);
      expect(response.value).toBe(subpath);
    });
  });


  // Test if the page passed will be valid or not
  describe('validatePage Tests', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();

      // Mock response
      jest.spyOn(api, 'buildDeviceResponse')
        .mockImplementation((arg1, arg2, arg3) => ({
          valid: arg1, status: arg2, extra: arg3,
        }));
    });

    // Test if page is not a valid string
    test.each(
      [null, undefined, {}, 53, ''],
    )('Invalid page - %p', (page) => {
      // Execute
      const response = api.validatePage(page);

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(t('mustBeAString'));
    });

    // Test an invalid page number
    test.each(
      ['-1', 'undefined', 'null', '-59', '0'],
    )('Invalid page number - %p', (page) => {
      // Execute
      const response = api.validatePage(page);

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(
        t('invalidPageError').replace('({{errorline}})', ''),
      );
    });

    // Test valid page numbers
    test.each(
      ['1', '50', '5743453', '10'],
    )('Valid page number - %p', (page) => {
      // Execute
      const response = api.validatePage(page);

      // Validate
      expect(response.valid).toBe(true);
      expect(response.value).toBe(parseInt(page));
    });
  });


  // Test if the page limit passed will be valid or not
  describe('validatePageLimit Tests', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();

      // Mock response
      jest.spyOn(api, 'buildDeviceResponse')
        .mockImplementation((arg1, arg2, arg3) => ({
          valid: arg1, status: arg2, extra: arg3,
        }));
    });

    // Test if validatePage returns false
    test('Invalid page', () => {
      // Mocks
      jest.spyOn(api, 'validatePage')
        .mockImplementation(() => ({
          valid: false, status: 400, extra: t('mustBeAString'),
        }));

      // Execute
      const response = api.validatePageLimit('12');

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(t('mustBeAString'));
    });

    // Test if validatePage returns true, but is bigger than MAX_PAGE_SIZE
    test('Invalid page number', () => {
      const page = MAX_PAGE_SIZE + 1;

      // Mocks
      jest.spyOn(api, 'validatePage')
        .mockImplementation(() => ({valid: true, value: page}));

      // Execute
      const response = api.validatePageLimit(page.toString());

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(
        t('invalidPageLimitError', {upperLimit: MAX_PAGE_SIZE})
          .replace('({{errorline}})', ''),
      );
    });

    // Test if a valid page number is passed
    test.each(
      [MAX_PAGE_SIZE, 10, 1, 34],
    )('Valid page number - %p', (page) => {
      // Mocks
      jest.spyOn(api, 'validatePage')
        .mockImplementation(() => ({valid: true, value: page}));

      // Execute
      const response = api.validatePageLimit(page.toString());

      // Validate
      expect(response.valid).toBe(true);
      expect(response.value).toBe(page);
    });
  });


  // Test if the value passed is inside the options
  describe('validateOptions Tests', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();

      // Mock response
      jest.spyOn(api, 'buildDeviceResponse')
        .mockImplementation((arg1, arg2, arg3) => ({
          valid: arg1, status: arg2, extra: arg3,
        }));
    });

    // Test invalid params
    test.each(
      [null, undefined, {}],
    )('Invalid params - %p', (params) => {
      const testField = 'testField';

      let params2 = {};
      params2[testField] = params;

      // Execute
      const response = api.validateOptions(
        params, testField, ['0', '1', '2'],
      );
      const response2 = api.validateOptions(
        params2, testField, ['0', '1', '3'],
      );

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(
        t('fieldInvalid').replace('({{errorline}})', ''),
      );

      expect(response2.valid).toBe(false);
      expect(response2.status).toBe(400);
      expect(response2.extra).toContain(
        t('fieldInvalid').replace('({{errorline}})', ''),
      );
    });

    // Test what happends with empty parameters
    test('Empty parameters', () => {
      const testField = 'testField';
      let params = {};
      params[testField] = ';;;;;;';

      // Execute
      const response = api.validateOptions(
        params, testField, ['0', '1', '2'],
      );

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(
        t('fieldNameInvalid', {name: testField}).replace('({{errorline}})', ''),
      );
    });

    // Test a parameter not in options
    test('Parameter not found', () => {
      const testField = 'testField';
      let params = {};
      params[testField] = '1;0;2;1;3;0;2';

      // Execute
      const response = api.validateOptions(
        params, testField, ['0', '1', '2'],
      );

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(
        t('fieldNameInvalid', {name: testField}).replace('({{errorline}})', ''),
      );
    });

    // Test what happens with multiple parameters not in options
    test('Parameters not found', () => {
      const testField = 'testField';
      let params = {};
      params[testField] = '1;4;2;5;3;0;2';

      // Execute
      const response = api.validateOptions(
        params, testField, ['0', '1', '2'],
      );

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(
        t('fieldNameInvalid', {name: testField}).replace('({{errorline}})', ''),
      );
    });

    // Test what happens with a ';' at the end
    test('Invalid ";"', () => {
      const testField = 'testField';
      let params = {};
      params[testField] = '1;0;2;1;1;0;2;';

      // Execute
      const response = api.validateOptions(
        params, testField, ['0', '1', '2'],
      );

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(
        t('fieldNameInvalid', {name: testField}).replace('({{errorline}})', ''),
      );
    });

    // Test a valid case
    test('Valid parameters', () => {
      const testField = 'testField';
      let params = {};
      params[testField] = '1;0;2;1;1;0;2';

      // Execute
      const response = api.validateOptions(
        params, testField, ['0', '1', '2'],
      );

      // Validate
      expect(response.valid).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.message).toContain(t('OK'));
      expect(response.value).toStrictEqual([
        '1', '0', '2', '1', '1', '0', '2',
      ]);
    });
  });


  // Test if translateField can return the field
  describe('translateField Tests', () => {
    const fields = Object.keys(api.__testTranslationObject);

    test.each(fields)('Test field - %p', (field) => {
      // Execute
      const response = api.translateField(field);

      // Validate
      expect(response).toBe(api.__testTranslationObject[field].field);
    });
  });


  // Test if the order and pipeline functions are right to get a device
  describe('getLeanDevice Tests', () => {
    let aggregateSpy = null;

    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();

      // Mock Device Model aggregate
      aggregateSpy = jest.spyOn(DeviceModel, 'aggregate')
        .mockImplementation((pipeline) => ({exec: () => true}));
    });

    // Test only the filter
    test('Test filter', () => {
      const filter = 'test123';

      // Execute
      api.getLeanDevice('test123');

      // Validate
      const pipeline = aggregateSpy.mock.calls[0][0];

      // $match
      expect(pipeline[0]).toStrictEqual({'$match': filter});
      // $limit
      expect(pipeline[1]).toStrictEqual({'$limit': 1});
      // $skip - paginate
      expect(pipeline[2]).toStrictEqual({'$skip': 0});
      // $limit - paginate
      expect(pipeline[3]).toStrictEqual({'$limit': MAX_PAGE_SIZE});
      // $project
      expect(pipeline[4]).toStrictEqual(
        {'$project': api.__testReducedDeviceFields},
      );
    });

    // Test what relativePath does to the pipeline
    test('Test relative path', () => {
      const filter = 'test123';
      const relativePath = 'testRelative';

      // Execute
      api.getLeanDevice('test123', relativePath);

      // Validate
      const pipeline = aggregateSpy.mock.calls[0][0];

      // $match
      expect(pipeline[0]).toStrictEqual({'$match': filter});
      // $limit
      expect(pipeline[1]).toStrictEqual({'$limit': 1});
      // $unwind
      expect(pipeline[2]).toStrictEqual({'$unwind': '$' + relativePath});
      // $match
      expect(pipeline[3]).toStrictEqual({'$match': filter});
      // $skip - paginate
      expect(pipeline[4]).toStrictEqual({'$skip': 0});
      // $limit - paginate
      expect(pipeline[5]).toStrictEqual({'$limit': MAX_PAGE_SIZE});
      // $group
      let group = {'$group': {'_id': '$_id'}};
      group['$group'][relativePath] = {'$push': '$' + relativePath};
      expect(pipeline[6]).toStrictEqual(group);
      // $project
      expect(pipeline[7]).toStrictEqual(
        {'$project': api.__testReducedDeviceFields},
      );
    });

    // Test what will happen with an invalid page
    test.each([
      // page, valid
      [0, false], [-5, false], [-100, false], [1, true], [50, true],
      [MAX_PAGE_SIZE, true], [5436738, true],
      [99999999999999999999999999999999999999999999999999999999999999999, true],
    ])('Test pages - %p', (page, valid) => {
      const filter = 'test123';
      const relativePath = 'testRelative';

      // Execute
      api.getLeanDevice('test123', relativePath, page);

      // Validate
      const pipeline = aggregateSpy.mock.calls[0][0];

      // $match
      expect(pipeline[0]).toStrictEqual({'$match': filter});
      // $limit
      expect(pipeline[1]).toStrictEqual({'$limit': 1});
      // $unwind
      expect(pipeline[2]).toStrictEqual({'$unwind': '$' + relativePath});
      // $match
      expect(pipeline[3]).toStrictEqual({'$match': filter});
      // $skip - paginate
      const skip = valid ? (page - 1) * MAX_PAGE_SIZE : 0;
      expect(pipeline[4]).toStrictEqual({'$skip': skip});
      // $limit - paginate
      expect(pipeline[5]).toStrictEqual({'$limit': MAX_PAGE_SIZE});
      // $group
      let group = {'$group': {'_id': '$_id'}};
      group['$group'][relativePath] = {'$push': '$' + relativePath};
      expect(pipeline[6]).toStrictEqual(group);
      // $project
      expect(pipeline[7]).toStrictEqual(
        {'$project': api.__testReducedDeviceFields},
      );
    });

    // Test what will happen with an invalid page limit
    test.each([
      // page, valid
      [0, false], [-5, false], [-100, false], [1, true], [49, true],
      [MAX_PAGE_SIZE, false], [5436738, false],
      [9999999999999999999999999999999999999999999999999999999999999999, false],
    ])('Test page limits - %p', (page, valid) => {
      const filter = 'test123';
      const relativePath = 'testRelative';

      // Execute
      api.getLeanDevice('test123', relativePath, 0, page);

      // Validate
      const pipeline = aggregateSpy.mock.calls[0][0];

      // $match
      expect(pipeline[0]).toStrictEqual({'$match': filter});
      // $limit
      expect(pipeline[1]).toStrictEqual({'$limit': 1});
      // $unwind
      expect(pipeline[2]).toStrictEqual({'$unwind': '$' + relativePath});
      // $match
      expect(pipeline[3]).toStrictEqual({'$match': filter});
      // $skip - paginate
      expect(pipeline[4]).toStrictEqual({'$skip': 0});
      // $limit - paginate
      const limit = valid ? page : MAX_PAGE_SIZE;
      expect(pipeline[5]).toStrictEqual({'$limit': limit});
      // $group
      let group = {'$group': {'_id': '$_id'}};
      group['$group'][relativePath] = {'$push': '$' + relativePath};
      expect(pipeline[6]).toStrictEqual(group);
      // $project
      expect(pipeline[7]).toStrictEqual(
        {'$project': api.__testReducedDeviceFields},
      );
    });

    // Test both pages valid
    test('Valid pages', () => {
      const filter = 'test123';
      const relativePath = 'testRelative';
      const page = 15;
      const pageLimit = 30;

      // Execute
      api.getLeanDevice('test123', relativePath, page, pageLimit);

      // Validate
      const pipeline = aggregateSpy.mock.calls[0][0];

      // $match
      expect(pipeline[0]).toStrictEqual({'$match': filter});
      // $limit
      expect(pipeline[1]).toStrictEqual({'$limit': 1});
      // $unwind
      expect(pipeline[2]).toStrictEqual({'$unwind': '$' + relativePath});
      // $match
      expect(pipeline[3]).toStrictEqual({'$match': filter});
      // $skip - paginate
      expect(pipeline[4]).toStrictEqual({'$skip': (page - 1) * pageLimit});
      // $limit - paginate
      expect(pipeline[5]).toStrictEqual({'$limit': pageLimit});
      // $group
      let group = {'$group': {'_id': '$_id'}};
      group['$group'][relativePath] = {'$push': '$' + relativePath};
      expect(pipeline[6]).toStrictEqual(group);
      // $project
      expect(pipeline[7]).toStrictEqual(
        {'$project': api.__testReducedDeviceFields},
      );
    });

    // Test a custom projection
    test('Custom project', () => {
      const filter = 'test123';
      const relativePath = 'testRelative';
      const page = 15;
      const pageLimit = 30;
      const project = {ip: true, wan_bssid: true};

      // Execute
      api.getLeanDevice('test123', relativePath, page, pageLimit, project);

      // Validate
      const pipeline = aggregateSpy.mock.calls[0][0];

      // $match
      expect(pipeline[0]).toStrictEqual({'$match': filter});
      // $limit
      expect(pipeline[1]).toStrictEqual({'$limit': 1});
      // $unwind
      expect(pipeline[2]).toStrictEqual({'$unwind': '$' + relativePath});
      // $match
      expect(pipeline[3]).toStrictEqual({'$match': filter});
      // $skip - paginate
      expect(pipeline[4]).toStrictEqual({'$skip': (page - 1) * pageLimit});
      // $limit - paginate
      expect(pipeline[5]).toStrictEqual({'$limit': pageLimit});
      // $group
      let group = {'$group': {'_id': '$_id'}};
      group['$group'][relativePath] = {'$push': '$' + relativePath};
      expect(pipeline[6]).toStrictEqual(group);
      // $project
      expect(pipeline[7]).toStrictEqual({'$project': project});
    });

    // Test a custom & custom default projection
    test('Custom & custom default project', () => {
      const filter = 'test123';
      const relativePath = 'testRelative';
      const page = 15;
      const pageLimit = 30;
      const project = {ip: true, wan_bssid: true};

      // Execute
      api.getLeanDevice(
        'test123', relativePath, page, pageLimit, null, project,
      );

      // Validate
      const pipeline = aggregateSpy.mock.calls[0][0];

      // $match
      expect(pipeline[0]).toStrictEqual({'$match': filter});
      // $limit
      expect(pipeline[1]).toStrictEqual({'$limit': 1});
      // $unwind
      expect(pipeline[2]).toStrictEqual({'$unwind': '$' + relativePath});
      // $match
      expect(pipeline[3]).toStrictEqual({'$match': filter});
      // $skip - paginate
      expect(pipeline[4]).toStrictEqual({'$skip': (page - 1) * pageLimit});
      // $limit - paginate
      expect(pipeline[5]).toStrictEqual({'$limit': pageLimit});
      // $group
      let group = {'$group': {'_id': '$_id'}};
      group['$group'][relativePath] = {'$push': '$' + relativePath};
      expect(pipeline[6]).toStrictEqual(group);
      // $project
      expect(pipeline[7]).toStrictEqual({'$project': project});
    });

    // Test a custom default projection
    test('Custom default project', () => {
      const filter = 'test123';
      const relativePath = 'testRelative';
      const page = 15;
      const pageLimit = 30;
      const project = {ip: true, wan_bssid: true};
      const defaultProject = {
        'lan_devices.name': true, 'lan_devices.mac': true,
      };

      // Execute
      api.getLeanDevice(
        'test123', relativePath, page, pageLimit, project, defaultProject,
      );

      // Validate
      const pipeline = aggregateSpy.mock.calls[0][0];

      // $match
      expect(pipeline[0]).toStrictEqual({'$match': filter});
      // $limit
      expect(pipeline[1]).toStrictEqual({'$limit': 1});
      // $unwind
      expect(pipeline[2]).toStrictEqual({'$unwind': '$' + relativePath});
      // $match
      expect(pipeline[3]).toStrictEqual({'$match': filter});
      // $skip - paginate
      expect(pipeline[4]).toStrictEqual({'$skip': (page - 1) * pageLimit});
      // $limit - paginate
      expect(pipeline[5]).toStrictEqual({'$limit': pageLimit});
      // $group
      let group = {'$group': {'_id': '$_id'}};
      group['$group'][relativePath] = {'$push': '$' + relativePath};
      expect(pipeline[6]).toStrictEqual(group);
      // $project
      expect(pipeline[7]).toStrictEqual({'$project': project});
    });
  });


  // Test if is able to return a device based on the fields passed
  describe('getDeviceByFields Tests', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();

      // Mock response
      jest.spyOn(api, 'buildDeviceResponse')
        .mockImplementation((arg1, arg2, arg3) => ({
          valid: arg1, status: arg2, extra: arg3,
        }));
    });

    // Test what happens if validation return false
    test('Invalid field', async () => {
      const params = {'param1': 1, 'param2': 2, 'param3': 3};
      const routeParams = ['param1', 'param2', 'param3'];
      const errorMessage = 'errorMessage';

      // Mocks
      let validateSpy = jest.spyOn(api, 'validateField')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: false, message: errorMessage})
        .mockReturnValueOnce({valid: true});
      let translateSpy = jest.spyOn(api, 'translateField')
        .mockImplementation((paramName) => paramName);

      // Execute
      const response = await api.getDeviceByFields(
        params, null, null, null, null, null, null, routeParams,
      );

      // Validate
      expect(response.message).toBe(errorMessage);
      expect(validateSpy).toHaveBeenCalledTimes(2);
      expect(translateSpy).toHaveBeenCalledTimes(1);
    });

    // Test what happens if any projection is invalid
    test('Invalid projections', async () => {
      const params = {'param1': 1, 'param2': 2, 'param3': 3};
      const projections = ['proj1', 'proj2', 'proj3', 'proj4'];
      const routeParams = ['param1', 'param2', 'param3'];
      const errorMessage = 'errorMessage';

      // Mocks
      let validateSpy = jest.spyOn(api, 'validateField')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      let translateSpy = jest.spyOn(api, 'translateField')
        .mockImplementation((paramName) => paramName);
      let projectionSpy = jest.spyOn(api, 'validateDeviceProjection')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: false, message: errorMessage})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});

      // Execute
      const response = await api.getDeviceByFields(
        params, null, projections, null, null, null, null, routeParams,
      );

      // Validate
      expect(response.message).toBe(errorMessage);
      expect(validateSpy).toHaveBeenCalledTimes(3);
      expect(translateSpy).toHaveBeenCalledTimes(3);
      expect(projectionSpy).toHaveBeenCalledTimes(2);
    });

    // Test what happens if it throws an error while reading the device
    test('Database fails', async () => {
      const params = {'param1': 1, 'param2': 2, 'param3': 3};
      const projections = ['proj1', 'proj2', 'proj3', 'proj4'];
      const routeParams = ['param1', 'param2', 'param3'];
      const errorMessage = 'errorMessage';

      // Mocks
      let validateSpy = jest.spyOn(api, 'validateField')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      let translateSpy = jest.spyOn(api, 'translateField')
        .mockImplementation((paramName) => paramName);
      let projectionSpy = jest.spyOn(api, 'validateDeviceProjection')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      jest.spyOn(api, 'getLeanDevice').mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // Execute
      const response = await api.getDeviceByFields(
        params, null, projections, null, null, null, null, routeParams,
      );

      // Validate
      expect(validateSpy).toHaveBeenCalledTimes(3);
      expect(translateSpy).toHaveBeenCalledTimes(3);
      expect(projectionSpy).toHaveBeenCalledTimes(4);
      expect(response.valid).toBe(false);
      expect(response.status).toBe(500);
      expect(response.extra).toContain(
        t('databaseFindError').replace('({{errorline}})', ''),
      );
    });

    // Test what happens if it could not find the device
    test('No device', async () => {
      const params = {'param1': 1, 'param2': 2, 'param3': 3};
      const projections = ['proj1', 'proj2', 'proj3', 'proj4'];
      const routeParams = ['param1', 'param2', 'param3'];

      // Mocks
      let validateSpy = jest.spyOn(api, 'validateField')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      let translateSpy = jest.spyOn(api, 'translateField')
        .mockImplementation((paramName) => paramName);
      let projectionSpy = jest.spyOn(api, 'validateDeviceProjection')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      jest.spyOn(api, 'getLeanDevice').mockImplementation(() => []);

      // Execute
      const response = await api.getDeviceByFields(
        params, null, projections, null, null, null, null, routeParams,
      );

      // Validate
      expect(validateSpy).toHaveBeenCalledTimes(3);
      expect(translateSpy).toHaveBeenCalledTimes(3);
      expect(projectionSpy).toHaveBeenCalledTimes(4);
      expect(response.valid).toBe(false);
      expect(response.status).toBe(404);
      expect(response.extra).toContain(t('noDevicesFound'));
    });

    // Test what happens if it find the device
    test('Found device', async () => {
      const params = {'param1': 1, 'param2': 2, 'param3': 3};
      const projections = ['proj1', 'proj2', 'proj3', 'proj4'];
      const routeParams = ['param1', 'param2', 'param3'];
      const model = models.copyDeviceFrom(models.defaultMockDevices[0]._id, {});

      // Mocks
      let validateSpy = jest.spyOn(api, 'validateField')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      let translateSpy = jest.spyOn(api, 'translateField')
        .mockImplementation((paramName) => paramName);
      let projectionSpy = jest.spyOn(api, 'validateDeviceProjection')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      let deviceSpy = jest.spyOn(api, 'getLeanDevice')
        .mockImplementation(() => [model]);

      // Execute
      const response = await api.getDeviceByFields(
        params, null, projections, null, null, null, null, routeParams,
      );

      // Validate
      expect(validateSpy).toHaveBeenCalledTimes(3);
      expect(translateSpy).toHaveBeenCalledTimes(3);
      expect(projectionSpy).toHaveBeenCalledTimes(4);
      expect(response.valid).toBe(true);
      expect(response.status).toBe(200);
      expect(response.extra).toStrictEqual(model);

      // For this test setup, query will be equal to params + additionalQueries
      // if passed
      let useProjection = {};
      projections.forEach((proj) => useProjection[proj] = true);
      expect(deviceSpy).toHaveBeenCalledWith(
        params, null, null, null, useProjection, null,
      );
    });

    // Test what happens if it find the device and have additional queries to
    // add
    test('Found device + additional queries', async () => {
      const params = {'param1': 1, 'param2': 2, 'param3': 3};
      const projections = ['proj1', 'proj2', 'proj3', 'proj4'];
      const addQueries = {'param4': 4, 'param5': 5};
      const routeParams = ['param1', 'param2', 'param3'];
      const model = models.copyDeviceFrom(models.defaultMockDevices[0]._id, {});

      // Mocks
      let validateSpy = jest.spyOn(api, 'validateField')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      let translateSpy = jest.spyOn(api, 'translateField')
        .mockImplementation((paramName) => paramName);
      let projectionSpy = jest.spyOn(api, 'validateDeviceProjection')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      let deviceSpy = jest.spyOn(api, 'getLeanDevice')
        .mockImplementation(() => [model]);

      // Execute
      const response = await api.getDeviceByFields(
        params, null, projections, addQueries, null, null, null, routeParams,
      );

      // Validate
      expect(validateSpy).toHaveBeenCalledTimes(3);
      expect(translateSpy).toHaveBeenCalledTimes(3);
      expect(projectionSpy).toHaveBeenCalledTimes(4);
      expect(response.valid).toBe(true);
      expect(response.status).toBe(200);
      expect(response.extra).toStrictEqual(model);

      // For this test setup, query will be equal to params + additionalQueries
      // if passed
      let useProjection = {};
      let query = params;
      projections.forEach((proj) => useProjection[proj] = true);
      Object.keys(addQueries).forEach(
        (entry) => query[entry] = addQueries[entry],
      );

      expect(deviceSpy).toHaveBeenCalledWith(
        query, null, null, null, useProjection, null,
      );
    });

    // Test what happens if a default projection, relative path, page and page
    // limit are passed
    test('Full test', async () => {
      const params = {'param1': 1, 'param2': 2, 'param3': 3};
      const defaultProjection = {'defaulProj1': true, 'defaultProj2': true};
      const projections = ['proj1', 'proj2', 'proj3', 'proj4'];
      const addQueries = {'param4': 4, 'param5': 5};
      const page = 234;
      const pageLimit = 6543;
      const routeParams = ['param1', 'param2', 'param3'];
      const relativePath = 'testPath';
      const model = models.copyDeviceFrom(models.defaultMockDevices[0]._id, {});

      // Mocks
      let validateSpy = jest.spyOn(api, 'validateField')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      let translateSpy = jest.spyOn(api, 'translateField')
        .mockImplementation((paramName) => paramName);
      let projectionSpy = jest.spyOn(api, 'validateDeviceProjection')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      let deviceSpy = jest.spyOn(api, 'getLeanDevice')
        .mockImplementation(() => [model]);

      // Execute
      const response = await api.getDeviceByFields(
        params, defaultProjection, projections, addQueries,
        page, pageLimit, relativePath, routeParams,
      );

      // Validate
      expect(validateSpy).toHaveBeenCalledTimes(3);
      expect(translateSpy).toHaveBeenCalledTimes(3);
      expect(projectionSpy).toHaveBeenCalledTimes(4);
      expect(response.valid).toBe(true);
      expect(response.status).toBe(200);
      expect(response.extra).toStrictEqual(model);

      // For this test setup, query will be equal to params + additionalQueries
      // if passed
      let useProjection = {};
      let query = params;
      projections.forEach((proj) => useProjection[proj] = true);
      Object.keys(addQueries).forEach(
        (entry) => query[entry] = addQueries[entry],
      );

      expect(deviceSpy).toHaveBeenCalledWith(
        query, relativePath, page, pageLimit, useProjection, defaultProjection,
      );
    });

    // Test what happens if projections is not the array type
    test('Projection not array', async () => {
      const params = {'param1': 1, 'param2': 2, 'param3': 3};
      const defaultProjection = {'defaulProj1': true, 'defaultProj2': true};
      const projections = {};
      const addQueries = {'param4': 4, 'param5': 5};
      const page = 234;
      const pageLimit = 6543;
      const routeParams = ['param1', 'param2', 'param3'];
      const relativePath = 'testPath';
      const model = models.copyDeviceFrom(models.defaultMockDevices[0]._id, {});

      // Mocks
      let validateSpy = jest.spyOn(api, 'validateField')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      let translateSpy = jest.spyOn(api, 'translateField')
        .mockImplementation((paramName) => paramName);
      let projectionSpy = jest.spyOn(api, 'validateDeviceProjection')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      let deviceSpy = jest.spyOn(api, 'getLeanDevice')
        .mockImplementation(() => [model]);

      // Execute
      const response = await api.getDeviceByFields(
        params, defaultProjection, projections, addQueries,
        page, pageLimit, relativePath, routeParams,
      );

      // Validate
      expect(validateSpy).toHaveBeenCalledTimes(3);
      expect(translateSpy).toHaveBeenCalledTimes(3);
      expect(projectionSpy).toHaveBeenCalledTimes(0);
      expect(response.valid).toBe(true);
      expect(response.status).toBe(200);
      expect(response.extra).toStrictEqual(model);

      // For this test setup, query will be equal to params + additionalQueries
      // if passed
      let query = params;
      Object.keys(addQueries).forEach(
        (entry) => query[entry] = addQueries[entry],
      );

      expect(deviceSpy).toHaveBeenCalledWith(
        query, relativePath, page, pageLimit, null, defaultProjection,
      );
    });

    // Test what happens if projections is an empty array
    test('Projection empty', async () => {
      const params = {'param1': 1, 'param2': 2, 'param3': 3};
      const defaultProjection = {'defaulProj1': true, 'defaultProj2': true};
      const projections = [];
      const addQueries = {'param4': 4, 'param5': 5};
      const page = 234;
      const pageLimit = 6543;
      const routeParams = ['param1', 'param2', 'param3'];
      const relativePath = 'testPath';
      const model = models.copyDeviceFrom(models.defaultMockDevices[0]._id, {});

      // Mocks
      let validateSpy = jest.spyOn(api, 'validateField')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      let translateSpy = jest.spyOn(api, 'translateField')
        .mockImplementation((paramName) => paramName);
      let projectionSpy = jest.spyOn(api, 'validateDeviceProjection')
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true})
        .mockReturnValueOnce({valid: true});
      let deviceSpy = jest.spyOn(api, 'getLeanDevice')
        .mockImplementation(() => [model]);

      // Execute
      const response = await api.getDeviceByFields(
        params, defaultProjection, projections, addQueries,
        page, pageLimit, relativePath, routeParams,
      );

      // Validate
      expect(validateSpy).toHaveBeenCalledTimes(3);
      expect(translateSpy).toHaveBeenCalledTimes(3);
      expect(projectionSpy).toHaveBeenCalledTimes(0);
      expect(response.valid).toBe(true);
      expect(response.status).toBe(200);
      expect(response.extra).toStrictEqual(model);

      // For this test setup, query will be equal to params + additionalQueries
      // if passed
      let query = params;
      Object.keys(addQueries).forEach(
        (entry) => query[entry] = addQueries[entry],
      );

      expect(deviceSpy).toHaveBeenCalledWith(
        query, relativePath, page, pageLimit, null, defaultProjection,
      );
    });
  });


  // Test if it can validate integers
  describe('parseRouteIntParameter Tests', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();

      // Mock response
      jest.spyOn(api, 'buildDeviceResponse')
        .mockImplementation((arg1, arg2, arg3) => ({
          valid: arg1, status: arg2, extra: arg3,
        }));
    });

    // Test invalid values
    test.each([
      NaN, undefined, null, {}, '', 'abcd',
    ])('Invalid values - %p', (value) => {
      const fieldName = 'testField';
      let params = {};
      params[fieldName] = value;

      // Execute
      const response = api.parseRouteIntParameter(params, fieldName);

      // Validate
      expect(response.valid).toBe(false);
      expect(response.status).toBe(400);
      expect(response.extra).toContain(t('valueInvalid'));
      expect(response.value).toBeNaN();
    });

    // Test valid values
    test.each([
      '0', '-5', '5.32', 54, 23.776, '70',
    ])('Valid values - %p', (value) => {
      const fieldName = 'testField';
      let params = {};
      params[fieldName] = value;

      // Execute
      const response = api.parseRouteIntParameter(params, fieldName);

      // Validate
      expect(response.valid).toBe(true);
      expect(response.status).toBe(200);
      expect(response.extra).toContain(t('OK'));
      expect(response.value).toBe(parseInt(value));
    });
  });


  // Test if it can parse an array of strings
  describe('parseRouteStringArrayParameter Tests', () => {
    // Test what happens when passing invalid fields
    test.each([
      null, undefined, [], {}, 0, 5.3,
    ])('Invalid fields - %p', (value) => {
      const testField = 'testField';
      let params = {};
      params[testField] = value;

      // Execute
      const response = api.parseRouteStringArrayParameter(
        params, testField, null,
      );

      // Validate
      expect(response.valid).toBe(false);
      expect(response.statusCode).toBe(400);
      expect(response.message).toContain(t('emptyField'));
      expect(response.value).toStrictEqual([]);
    });

    // Test what happens when passing strange fields
    test.each([
      ';;;;', 'a;b;', 'a,b,c,d', ';abc', ';',
    ])('Strange fields - %p', (value) => {
      const testField = 'testField';
      let params = {};
      params[testField] = value;

      // Execute
      const response = api.parseRouteStringArrayParameter(
        params, testField, null,
      );

      // Validate
      expect(response.valid).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.message).toContain(t('OK'));
      expect(response.value).toStrictEqual(value.split(';'));
    });

    // Test what happens when using relative path
    test('Relative path', () => {
      const testField = 'testField';
      const relativePath = 'path';
      let params = {};
      params[testField] = 'a1;b2;c3;d4;';

      // Execute
      const response = api.parseRouteStringArrayParameter(
        params, testField, relativePath,
      );

      // Validate
      let value = params[testField].split(';');
      value.forEach((element, index, array) => {
        array[index] = relativePath + '.' + element;
      });

      expect(response.valid).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.message).toContain(t('OK'));
      expect(response.value).toStrictEqual(value);
    });
  });


  // Test if it can parse conditions
  describe('parseRouteConditionParameter Tests', () => {
    // Test what happens when passing invalid fields
    test.each([
      null, undefined, [], {}, 0, 5.3,
    ])('Invalid fields - %p', (value) => {
      const testField = 'testField';
      let params = {};
      params[testField] = value;

      // Execute
      const response = api.parseRouteConditionParameter(
        params, testField, null,
      );

      // Validate
      expect(response.valid).toBe(false);
      expect(response.statusCode).toBe(400);
      expect(response.message).toContain(
        t('fieldInvalid').replace('({{errorline}})', ''),
      );
      expect(response.value).toStrictEqual({});
    });

    // Test what happens with an empty condition
    test('Empty condition', () => {
      const testField = 'testField';
      let params = {};
      params[testField] = Object.keys(DeviceModel.schema.paths)[0];

      // Execute
      const response = api.parseRouteConditionParameter(
        params, testField, null,
      );

      // Validate
      expect(response.valid).toBe(false);
      expect(response.statusCode).toBe(400);
      expect(response.message).toContain(t('emptyField'));
      expect(response.value).toStrictEqual({});
    });

    // Test what happens when passing each route field
    test.each(
      Object.keys(DeviceModel.schema.paths).slice(0, 11),
    )('Valid fields paths - %p', (modelPath) => {
      const testField = 'testField';
      const modelObject = DeviceModel.schema.paths[modelPath];
      let params = {};
      params[testField] = modelObject.path;
      let value = {};
      value[modelObject.path] = {};

      // Date
      if (modelObject.instance === 'Date') {
        params['greaterValue'] = (new Date('0')).toISOString();
        value[modelObject.path]['$gt'] = new Date('0');
      // Number
      } else if (modelObject.instance === 'Number') {
        params['equalValue'] = '36';
        value[modelObject.path]['$eq'] = 36;
      // Boolean
      } else if (modelObject.instance === 'Boolean') {
        params['lowerValue'] = 'true';
        value[modelObject.path]['$lt'] = true;
      } else {
        params['lowerValue'] = 'false';
      }

      // Execute
      const response = api.parseRouteConditionParameter(
        params, testField, null,
      );

      // Validate
      if (
        modelObject.instance === 'Date' || modelObject.instance === 'Number' ||
        modelObject.instance === 'Boolean'
      ) {
        expect(response.valid).toBe(true);
        expect(response.statusCode).toBe(200);
        expect(response.message).toContain(t('OK'));
        expect(response.value).toStrictEqual(value);
      } else {
        expect(response.valid).toBe(false);
        expect(response.statusCode).toBe(400);
        expect(response.message).toContain(
          t('fieldWrongType').replace('\'{{dataType}}\'', ''),
        );
        expect(response.value).toStrictEqual({});
      }
    });

    // Test what happens when passing each route field
    test.each(
      Object.keys(DeviceModel.schema.subpaths).slice(0, 11),
    )('Invalid types subpaths - %p', (modelPath) => {
      const testField = 'testField';
      const modelObject = DeviceModel.schema.subpaths[modelPath];
      let params = {};
      params[testField] = modelPath;

      // Date
      if (modelObject.instance === 'Date') {
        params['equalValue'] = 'false';
      // Number
      } else if (modelObject.instance === 'Number') {
        params['lowerValue'] = 'true';
      // Boolean
      } else if (modelObject.instance === 'Boolean') {
        params['greaterValue'] = (new Date('0')).toISOString();
      } else {
        params['greaterValue'] = 'false';
      }

      // Execute
      const response = api.parseRouteConditionParameter(
        params, testField, null,
      );

      // Validate
      if (
        modelObject.instance === 'Date' || modelObject.instance === 'Number' ||
        modelObject.instance === 'Boolean'
      ) {
        expect(response.valid).toBe(false);
        expect(response.statusCode).toBe(400);
        t('fieldNameWrongType')
          .replace('\'{{-name}}\'', '')
          .replace('\'{{dataType}}\'', '')
          .split(' ')
          .forEach((element) => expect(response.message).toContain(element));
        expect(response.value).toStrictEqual({});
      } else {
        expect(response.valid).toBe(false);
        expect(response.statusCode).toBe(400);
        expect(response.message).toContain(
          t('fieldWrongType').replace('\'{{dataType}}\'', ''),
        );
        expect(response.value).toStrictEqual({});
      }
    });

    // Test what happens when passing relative path
    test('Relative path', () => {
      const testField = 'testField';
      const relativePath = 'lan_devices';

      let params = {};
      params[testField] = 'last_seen';
      params['equalValue'] = (new Date('0')).toISOString();

      let value = {};
      value[relativePath + '.' + params[testField]] = {};
      value[relativePath + '.' + params[testField]]['$eq'] = new Date('0');

      // Execute
      const response = api.parseRouteConditionParameter(
        params, testField, relativePath,
      );

      // Validate
        expect(response.valid).toBe(true);
        expect(response.statusCode).toBe(200);
        expect(response.message).toContain(t('OK'));
        expect(response.value).toStrictEqual(value);
    });
  });
});
