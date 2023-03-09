/* eslint require-jsdoc: 0 */

const commonUtils = require('../common/utils');
require('../../bin/globals.js');
const mockingoose = require('mockingoose');
const diagAppAPIController = require('../../controllers/app_diagnostic_api');
const DeviceModel = require('../../models/device');
const ConfigModel = require('../../models/config');
const utils = require('../utils');

describe('Technician App API', () => {
  test('Must fail if request has invalid body', async () => {
    // Request
    const bodyEmpty = {};
    const bodyNoMac = {
      notamac: 'AA:AA:AA:AA:AA:AA',
    };
    const req = utils.mockRequest(bodyEmpty);
    const req2 = utils.mockRequest(bodyNoMac);
    const res = utils.mockResponse();
    const res2 = utils.mockResponse();
    // Test
    await diagAppAPIController.verifyFlashman(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    await diagAppAPIController.verifyFlashman(req2, res2);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('Must return default certification if DB is old', async () => {
    // Default certification steps
    let certification = {certification: {
      requiredWan: true,
      requiredIpv4: true,
      requiredIpv6: false,
      requiredDns: true,
      requiredFlashman: true,
      requiredSpeedTest: false,
    }};
    // Mock return of DB
    const returnConfigMock = jest.fn().mockReturnValue({
      tr069: undefined,
      certification: undefined,
    });
    const returnDeviceMock = jest.fn().mockReturnValue({
      _id: 'AB:AB:AB:AB:AB:AB',
      version: '0.40.0',
      model: 'Router Model',
      wifi_is_5ghz_capable: true,
      mesh_mode: 0,
      pppoe_password: 'dummypass',
    });
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'findById');
    // Request
    const body = {
      mac: 'AB:AB:AB:AB:AB:AB',
    };
    const req = utils.mockRequest(body);
    const res = utils.mockResponse();
    // Test
    await diagAppAPIController.verifyFlashman(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining(certification));
  });

  test('Must return certification object if is Flashbox device', async () => {
    // Default certification steps
    let certification = {
      requiredWan: true,
      requiredIpv4: true,
      requiredIpv6: false,
      requiredDns: true,
      requiredFlashman: true,
      requiredSpeedTest: false,
    };
    // Mock return of DB
    const returnConfigMock = jest.fn().mockReturnValue({
      tr069: undefined,
      certification: certification,
    });
    const returnDeviceMock = jest.fn().mockReturnValue({
      _id: 'AB:AB:AB:AB:AB:AB',
      version: '0.40.0',
      model: 'Router Model',
      wifi_is_5ghz_capable: true,
      mesh_mode: 0,
      pppoe_password: 'dummypass',
    });
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'findById');
    // Request
    const body = {
      mac: 'AB:AB:AB:AB:AB:AB',
      isOnu: false,
    };
    const req = utils.mockRequest(body);
    const res = utils.mockResponse();
    // Test
    await diagAppAPIController.verifyFlashman(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({certification: certification}));
  });

  test('Must return certification object if is a TR-069 device', async () => {
    // Default certification steps
    let certification = {
      requiredWan: true,
      requiredIpv4: true,
      requiredIpv6: false,
      requiredDns: true,
      requiredFlashman: true,
      requiredSpeedTest: false,
    };
    // Mock return of DB
    const returnConfigMock = jest.fn().mockReturnValue({
      tr069: undefined,
      certification: certification,
    });
    const returnDeviceMock = jest.fn().mockReturnValue({
      _id: 'someid',
      version: '0.40.0',
      model: 'Router Model',
      wifi_is_5ghz_capable: true,
      mesh_mode: 0,
      pppoe_password: 'dummypass',
    });
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'findById');
    // Request
    const body = {
      mac: 'strangemac',
      isOnu: true,
    };
    const body2 = {
      mac: 'anything',
      onuMac: 'serialid',
      isOnu: true,
    };
    const req = utils.mockRequest(body);
    const req2 = utils.mockRequest(body2);
    const res = utils.mockResponse();
    const res2 = utils.mockResponse();
    // Test
    await diagAppAPIController.verifyFlashman(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({certification: certification}));
    await diagAppAPIController.verifyFlashman(req2, res2);
    expect(res2.json).toHaveBeenCalledWith(
      expect.objectContaining({certification: certification}));
  });
});
