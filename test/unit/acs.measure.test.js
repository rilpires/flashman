require('../../bin/globals');
const measureController = require('../../controllers/handlers/acs/measures');

const DeviceModel = require('../../models/device');

const utils = require('../common/utils');
const models = require('../common/models');

const t = require('../../controllers/language').i18next.t;


// Test measure functions
describe('Handlers/ACS/Measures Tests', () => {
  // Reset all mocks
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });


  // fetchPonSignalFromGenie - Invalid device id
  test('Validate fetchPonSignalFromGenie - Invalid device id', async () => {
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
});
