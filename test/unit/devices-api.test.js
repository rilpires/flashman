require('../../bin/globals');
const utils = require('../common/utils');
const models = require('../common/models');

const DevicesAPI = require('../../controllers/external-genieacs/devices-api');

// controllers/external-genieacs/devices-api.js
describe('Devices API Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  // getTR069UpgradeableModels - Test devices mock
  test.each(
    utils.common.TEST_PARAMETERS,
  )('getTR069UpgradeableModels - Test devices mock: %p', async (parameter) => {
    // Mocks
    utils.common.mockDevices(parameter, 'find');

    // Execute
    let result = await DevicesAPI.getTR069UpgradeableModels();

    // validate
    expect(result.vendors.length).not.toBe(0);
    expect(result.versions.length).not.toBe(0);
  });

/*
  // getTR069UpgradeableModels - Okay device
  test('getTR069UpgradeableModels - Okay device', async () => {
    let device = models.copyDeviceFrom(
      models.defaultMockDevices[0]._id,
      {
        _id: '1234',
        installed_release: 'ABCDEFG',
      },
    );
    let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;

    let vendor = cpe.identifier.vendor;
    let model = cpe.identifier.model;
    let fullID = vendor + ' ' + cpe.identifier.model;


    // Mocks
    utils.common.mockDevices([device], 'find');


    // Execute
    let result = await DevicesAPI.getTR069UpgradeableModels();


    // Validate
    expect(result.vendors[vendor]).toContain(model);
    expect(result.versions[fullID]).toContain('ABCDEFG');
  });


  // getTR069UpgradeableModels - Multiple devices
  test('getTR069UpgradeableModels - Multiple devices', async () => {
    let device1 = models.copyDeviceFrom(
      models.defaultMockDevices[0]._id,
      {
        _id: '1234',
        installed_release: 'ABCDEFG',
      },
    );
    let device2 = models.copyDeviceFrom(
      models.defaultMockDevices[0]._id,
      {
        _id: '1235',
        installed_release: 'ABCDEFGH',
      },
    );


    let cpe1 = DevicesAPI.instantiateCPEByModelFromDevice(device1).cpe;

    let vendor = cpe1.identifier.vendor;
    let model = cpe1.identifier.model;
    let fullID = vendor + ' ' + cpe1.identifier.model;


    // Mocks
    utils.common.mockDevices([device1, device2], 'find');


    // Execute
    let result = await DevicesAPI.getTR069UpgradeableModels();


    // Validate
    expect(result.vendors[vendor]).toContain(model);
    expect(result.versions[fullID]).toContain('ABCDEFG');
    expect(result.versions[fullID]).toContain('ABCDEFGH');
  });
*/

  // getDeviceFields - undefined args
  test('Validate getDeviceFields - undefined args', async () => {
    // Execute
    let teste = await DevicesAPI.getDeviceFields(undefined, undefined);

    // Validate
    expect(teste.success).toBe(false);
    expect(teste.message).toBe('Incomplete arguments');
  });

  // getDeviceFields - args missing fields
  test('Validate getDeviceFields - args missing fields', async () => {
    let callbackFunction = jest.fn((arg1, arg2) => {
      return arg2;
    });

    // Execute
    let teste = await DevicesAPI.getDeviceFields(
      ['{}'],
      callbackFunction,
    );

    // Validate
    expect(teste.success).toBe(false);
    expect(teste.message).toBe('Incomplete arguments');
    expect(callbackFunction).toBeCalled();
  });
});

