/* eslint require-jsdoc: 0 */

// Override process environment variable to avoid starting genie
process.env.FLM_GENIE_IGNORED = 'TESTE!';

const utils = require('../common/utils');
const models = require('../common/models');

// Mock the config (used in language.js)
utils.common.mockConfigs(models.defaultMockConfigs, 'findOne');

const vlanController = require('../../controllers/vlan.js');
const ConfigModel = require('../../models/config');
const mockingoose = require('mockingoose');
const crypto = require('crypto');
const mqtt = require('../../mqtts');

describe('VLAN Controller', () => {
  afterAll((done) => {
    mqtt.close(() => {
      done();
    });
  });

  /* list of possibilities
    model
      1 - null
      2 - undefined
      3 - existing model - ['DIR-819A1', 'TL-WDR3500V1',  'TL-WDR3600V1', ...]
      4 - whatever string - [.* excepts in existing model array]
    vlanObj
      1 - null
      2 - undefined
      3 - whatever is not a object
        1 - object
        2 - array
        3 - string
        4 - number
      4 - corrupted array of vlans - [{vlan_idz:123, portz:5}, ...]
      5 - a valid array of vlans - [{vlan_idz:15, port:2}, ...]
        1 - vlan in the max vid range
        2 - vlan out of max vid range
  */
  test('convertFlashmanVlan : m1 v1', () => {
    let model = null;
    let vlanObj = null;
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('1 2 3 4 6t');
    expect(digestedVlans['2']).toBe('0 6t');
  });
  test('convertFlashmanVlan : m1 v3.1', () => {
    let model = null;
    let vlanObj = {};
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('1 2 3 4 6t');
    expect(digestedVlans['2']).toBe('0 6t');
  });
  test('convertFlashmanVlan : m2 v3.1', () => {
    let model = undefined;
    let vlanObj = {};
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('1 2 3 4 6t');
    expect(digestedVlans['2']).toBe('0 6t');
  });
  test('convertFlashmanVlan : m3 v3.1', () => {
    let model = 'TL-WDR3600V1';
    let vlanObj = {};
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('2 3 4 5 0t');
    expect(digestedVlans['2']).toBe('1 0t');
  });
  test('convertFlashmanVlan : m4 v3.1', () => {
    let model = 'test';
    let vlanObj = {};
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('1 2 3 4 6t');
    expect(digestedVlans['2']).toBe('0 6t');
  });
  test('convertFlashmanVlan : m4 v5.1', () => {
    let model = 'test';
    let vlanObj = '[{"vlan_id": 23, "port": 4},'+
      '{"vlan_id": 1, "port": 2},'+
      '{"vlan_id": 23, "port": 3},'+
      '{"vlan_id": 1, "port": 1}]';
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('1 2 3 4 6t');
    expect(digestedVlans['2']).toBe('0 6t');
  });
  test('convertFlashmanVlan : m3 v2', () => {
    let model = 'TL-WDR3600V1';
    let vlanObj = undefined;
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('2 3 4 5 0t');
    expect(digestedVlans['2']).toBe('1 0t');
  });
  test('convertFlashmanVlan : m3 v3.1', () => {
    let model = 'TL-WDR3600V1';
    let vlanObj = {};
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('2 3 4 5 0t');
    expect(digestedVlans['2']).toBe('1 0t');
  });
  test('convertFlashmanVlan : m3 v3.2', () => {
    let model = 'TL-WDR3600V1';
    let vlanObj = [];
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('2 3 4 5 0t');
    expect(digestedVlans['2']).toBe('1 0t');
  });
  test('convertFlashmanVlan : m3 v3.3', () => {
    let model = 'TL-WDR3600V1';
    let vlanObj = 'test';
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('2 3 4 5 0t');
    expect(digestedVlans['2']).toBe('1 0t');
  });
  test('convertFlashmanVlan : m3 v3.4', () => {
    let model = 'TL-WDR3600V1';
    let vlanObj = 42.23;
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('2 3 4 5 0t');
    expect(digestedVlans['2']).toBe('1 0t');
  });
  test('convertFlashmanVlan : m3 v4.1', () => {
    let model = 'TL-WDR3600V1';
    let vlanObj = '[{"vlan_id": 123, "portz": 4},'+
      '{"vlan_idz": 42, "port": 2},'+
      '{"vlan_idz": 23, "portz": 1}]';
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('2 3 4 5 0t');
    expect(digestedVlans['2']).toBe('1 0t');
  });
  test('convertFlashmanVlan : m3 v4.2', () => {
    let model = 'TL-WDR3600V1';
    let vlanObj = '[{"vlan_id": 123, "port": 4},'+
      '{"vlan_id": "test", "port": "test"},'+
      '{"vlan_id": "test", "port": "test"}]';
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('2 3 4 5 0t');
    expect(digestedVlans['2']).toBe('1 0t');
  });
  test('convertFlashmanVlan : m3 v4.3', () => {
    let model = 'TL-WDR3600V1';
    let vlanObj = '[{"vlan_id": 123, "port": 4},'+
      '{"vlan_id": 67, "port": 2.3},'+
      '{"vlan_id": 45, "port": 3.1}]';
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('2 3 4 5 0t');
    expect(digestedVlans['2']).toBe('1 0t');
  });
  test('convertFlashmanVlan : m3 v5.1', () => {
    let model = 'TL-WR2543N/NDV1';
    let vlanObj = '[{"vlan_id": 23, "port": 4},'+
      '{"vlan_id": 1, "port": 2},'+
      '{"vlan_id": 23, "port": 3},'+
      '{"vlan_id": 1, "port": 1}]';
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('2 1 9t');
    expect(digestedVlans['23']).toBe('4t 3t 0t');
    expect(digestedVlans['2']).toBe('0 9t');
  });
  test('convertFlashmanVlan : m3 v5.2', () => {
    let model = 'TL-WR2543N/NDV1';
    let vlanObj = '[{"vlan_id": 203, "port": 4},'+
      '{"vlan_id": 1, "port": 2},'+
      '{"vlan_id": 203, "port": 3},'+
      '{"vlan_id": 1, "port": 1}]';
    let digestedVlans = vlanController
      .convertFlashmanVlan(model, vlanObj);
    expect(digestedVlans['1']).toBe('1 2 3 4 9t');
    expect(digestedVlans['2']).toBe('0 9t');
  });
  /* list of possibilities
      device
        1 - empty vlan object
        2 - some vlan setted */
  test('retrieveVlansToDevice : d1', () => {
    let device = {
      model: 'DIR-819A1',
      vlan: {},
    };
    let ret = vlanController
      .retrieveVlansToDevice(device);
    let vlanHash = crypto.createHash('md5').update(
      JSON.stringify(ret.vlans)).digest('base64');
    expect(ret.hash).toBe(vlanHash);
    expect(ret.vlans['1']).toBe('1 2 3 4 6t');
    expect(ret.vlans['2']).toBe('0 6t');
  });
  test('retrieveVlansToDevice : d2', () => {
    let device = {
      model: 'DIR-819A1',
      vlan: [{port: 2, vlan_id: 10}, {port: 3, vlan_id: 12},
        {port: 1, vlan_id: 1}, {port: 4, vlan_id: 1}],
    };
    let ret = vlanController
      .retrieveVlansToDevice(device);
    let vlanHash = crypto.createHash('md5').update(
      JSON.stringify(ret.vlans)).digest('base64');
    expect(ret.hash).toBe(vlanHash);
    expect(ret.vlans['1']).toBe('1 4 6t');
    expect(ret.vlans['10']).toBe('2t 0t');
    expect(ret.vlans['12']).toBe('3t 0t');
    expect(ret.vlans['2']).toBe('0 6t');
  });
  /* list of possibilities
    model
      1 - existing model - TL-WDR3600V1
      2 - non existing model or whatever string
    vlanObj
      1 - null
      2 - undefined
      3 - empty object
      4 - empty array
      5 - number
      6 - empty string
      7 - default vlan
      8 - some vlan
      9 - corrupted vlan */
  test('convertDeviceVlan : m2 v1', () => {
    let model = 'test';
    let vlanObj = null;
    let vlan = vlanController
      .convertDeviceVlan(model, vlanObj);
    expect(JSON.parse(vlan[0]).port).toBe(1);
    expect(JSON.parse(vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[1]).port).toBe(2);
    expect(JSON.parse(vlan[1]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[2]).port).toBe(3);
    expect(JSON.parse(vlan[2]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[3]).port).toBe(4);
    expect(JSON.parse(vlan[3]).vlan_id).toBe(1);
  });
  test('convertDeviceVlan : m2 v2', () => {
    let model = 'test';
    let vlanObj = undefined;
    let vlan = vlanController
      .convertDeviceVlan(model, vlanObj);
    expect(JSON.parse(vlan[0]).port).toBe(1);
    expect(JSON.parse(vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[1]).port).toBe(2);
    expect(JSON.parse(vlan[1]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[2]).port).toBe(3);
    expect(JSON.parse(vlan[2]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[3]).port).toBe(4);
    expect(JSON.parse(vlan[3]).vlan_id).toBe(1);
  });
  test('convertDeviceVlan : m2 v3', () => {
    let model = 'test';
    let vlanObj = {};
    let vlan = vlanController
      .convertDeviceVlan(model, vlanObj);
    expect(JSON.parse(vlan[0]).port).toBe(1);
    expect(JSON.parse(vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[1]).port).toBe(2);
    expect(JSON.parse(vlan[1]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[2]).port).toBe(3);
    expect(JSON.parse(vlan[2]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[3]).port).toBe(4);
    expect(JSON.parse(vlan[3]).vlan_id).toBe(1);
  });
  test('convertDeviceVlan : m2 v4', () => {
    let model = 'test';
    let vlanObj = [];
    let vlan = vlanController
      .convertDeviceVlan(model, vlanObj);
    expect(JSON.parse(vlan[0]).port).toBe(1);
    expect(JSON.parse(vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[1]).port).toBe(2);
    expect(JSON.parse(vlan[1]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[2]).port).toBe(3);
    expect(JSON.parse(vlan[2]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[3]).port).toBe(4);
    expect(JSON.parse(vlan[3]).vlan_id).toBe(1);
  });
  test('convertDeviceVlan : m2 v5', () => {
    let model = 'test';
    let vlanObj = 123;
    let vlan = vlanController
      .convertDeviceVlan(model, vlanObj);
    expect(JSON.parse(vlan[0]).port).toBe(1);
    expect(JSON.parse(vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[1]).port).toBe(2);
    expect(JSON.parse(vlan[1]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[2]).port).toBe(3);
    expect(JSON.parse(vlan[2]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[3]).port).toBe(4);
    expect(JSON.parse(vlan[3]).vlan_id).toBe(1);
  });
  test('convertDeviceVlan : m2 v6', () => {
    let model = 'test';
    let vlanObj = '';
    let vlan = vlanController
      .convertDeviceVlan(model, vlanObj);
    expect(JSON.parse(vlan[0]).port).toBe(1);
    expect(JSON.parse(vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[1]).port).toBe(2);
    expect(JSON.parse(vlan[1]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[2]).port).toBe(3);
    expect(JSON.parse(vlan[2]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[3]).port).toBe(4);
    expect(JSON.parse(vlan[3]).vlan_id).toBe(1);
  });
  test('convertDeviceVlan : m2 v7', () => {
    let model = 'test';
    let vlanObj = '{"1": "1 2 3 4 6t", "2": "0 6t"}';
    let vlan = vlanController
      .convertDeviceVlan(model, vlanObj);
    expect(JSON.parse(vlan[0]).port).toBe(1);
    expect(JSON.parse(vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[1]).port).toBe(2);
    expect(JSON.parse(vlan[1]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[2]).port).toBe(3);
    expect(JSON.parse(vlan[2]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[3]).port).toBe(4);
    expect(JSON.parse(vlan[3]).vlan_id).toBe(1);
  });
  test('convertDeviceVlan : m2 v8', () => {
    let model = 'test';
    let vlanObj = '{"1": "1 4 6t", "23": "2 3 0t", "2": "0 6t"}';
    let vlan = vlanController
      .convertDeviceVlan(model, vlanObj);
    expect(JSON.parse(vlan[0]).port).toBe(1);
    expect(JSON.parse(vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[1]).port).toBe(2);
    expect(JSON.parse(vlan[1]).vlan_id).toBe(23);
    expect(JSON.parse(vlan[2]).port).toBe(3);
    expect(JSON.parse(vlan[2]).vlan_id).toBe(23);
    expect(JSON.parse(vlan[3]).port).toBe(4);
    expect(JSON.parse(vlan[3]).vlan_id).toBe(1);
  });
  test('convertDeviceVlan : m2 v9.1', () => {
    let model = 'test';
    let vlanObj = '{"1": "1 4 6t", "ab": "2 3 0t", "19":'+
      ' "a b qde f", "2": "0 6t"}';
    let vlan = vlanController
      .convertDeviceVlan(model, vlanObj);
    expect(JSON.parse(vlan[0]).port).toBe(1);
    expect(JSON.parse(vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[1]).port).toBe(2);
    expect(JSON.parse(vlan[1]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[2]).port).toBe(3);
    expect(JSON.parse(vlan[2]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[3]).port).toBe(4);
    expect(JSON.parse(vlan[3]).vlan_id).toBe(1);
  });
  test('convertDeviceVlan : m2 v9.2', () => {
    let model = 'test';
    let vlanObj = '{"100": "1 4 6t", "ab": "2 3 0t", "19":'+
      ' "a b qde f", "2": "0 6t"}';
    let vlan = vlanController
      .convertDeviceVlan(model, vlanObj);
    expect(JSON.parse(vlan[0]).port).toBe(1);
    expect(JSON.parse(vlan[0]).vlan_id).toBe(100);
    expect(JSON.parse(vlan[1]).port).toBe(2);
    expect(JSON.parse(vlan[1]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[2]).port).toBe(3);
    expect(JSON.parse(vlan[2]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[3]).port).toBe(4);
    expect(JSON.parse(vlan[3]).vlan_id).toBe(100);
  });
  test('convertDeviceVlan : m2 v9.3', () => {
    let model = 'test';
    let vlanObj = '{"2": "0 6t", "19":'+
      ' "a b qde f", "ab": "2 3 0t"}';
    let vlan = vlanController
      .convertDeviceVlan(model, vlanObj);
    expect(JSON.parse(vlan[0]).port).toBe(1);
    expect(JSON.parse(vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[1]).port).toBe(2);
    expect(JSON.parse(vlan[1]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[2]).port).toBe(3);
    expect(JSON.parse(vlan[2]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[3]).port).toBe(4);
    expect(JSON.parse(vlan[3]).vlan_id).toBe(1);
  });
  test('convertDeviceVlan : m2 v9.4', () => {
    let model = 'test';
    let vlanObj = '{"ab": "2 3 0t", "19":'+
      ' "a b qde f"}';
    let vlan = vlanController
      .convertDeviceVlan(model, vlanObj);
    expect(JSON.parse(vlan[0]).port).toBe(1);
    expect(JSON.parse(vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[1]).port).toBe(2);
    expect(JSON.parse(vlan[1]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[2]).port).toBe(3);
    expect(JSON.parse(vlan[2]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[3]).port).toBe(4);
    expect(JSON.parse(vlan[3]).vlan_id).toBe(1);
  });

  test('convertDeviceVlan : m1 v8', () => {
    let model = 'TL-WDR3600V1';
    let vlanObj = '{"1": "2 5 0t", "23": "3 4 1t", "2": "1 0t"}';
    let vlan = vlanController
      .convertDeviceVlan(model, vlanObj);
    expect(JSON.parse(vlan[0]).port).toBe(1);
    expect(JSON.parse(vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(vlan[1]).port).toBe(2);
    expect(JSON.parse(vlan[1]).vlan_id).toBe(23);
    expect(JSON.parse(vlan[2]).port).toBe(3);
    expect(JSON.parse(vlan[2]).vlan_id).toBe(23);
    expect(JSON.parse(vlan[3]).port).toBe(4);
    expect(JSON.parse(vlan[3]).vlan_id).toBe(1);
  });
  /* list of possibilities
    convertedVlan
      1 - valid vlan
      2 - corrupted vlan (null on port or vlan_id)
    config.vlans_profiles
      1 - all vlans that come from router
      2 - lack of some vlan that come from router
  */
  test('getValidVlan : v1 p1', async () => {
    let convertedVlan = ['{"port":1,"vlan_id":1}',
      '{"port":2,"vlan_id":23}',
      '{"port":3,"vlan_id":23}',
      '{"port":4,"vlan_id":1}'];
    const returnConfigMock = jest.fn().mockReturnValue({
      is_default: true,
      vlans_profiles: [
        {'vlan_id': 1,
        'profile_name': 'Internet'},
        {'vlan_id': 23,
        'profile_name': 'Test23'},
      ],
    });
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    let retObj = await vlanController.getValidVlan('', convertedVlan);
    expect(retObj.success).toBe(true);
    expect(retObj.didChange).toBe(false);
    expect(JSON.parse(retObj.vlan[0]).port).toBe(1);
    expect(JSON.parse(retObj.vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(retObj.vlan[1]).port).toBe(2);
    expect(JSON.parse(retObj.vlan[1]).vlan_id).toBe(23);
    expect(JSON.parse(retObj.vlan[2]).port).toBe(3);
    expect(JSON.parse(retObj.vlan[2]).vlan_id).toBe(23);
    expect(JSON.parse(retObj.vlan[3]).port).toBe(4);
    expect(JSON.parse(retObj.vlan[3]).vlan_id).toBe(1);
  });
  test('getValidVlan : v1 p2', async () => {
    let convertedVlan = ['{"port":1,"vlan_id":1}',
      '{"port":2,"vlan_id":23}',
      '{"port":3,"vlan_id":23}',
      '{"port":4,"vlan_id":1}'];
    const returnConfigMock = jest.fn().mockReturnValue({
      is_default: true,
      vlans_profiles: [
        {'vlan_id': 1,
        'profile_name': 'Internet'}],
    });
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    let retObj = await vlanController.getValidVlan('', convertedVlan);
    expect(retObj.success).toBe(true);
    expect(retObj.didChange).toBe(true);
    expect(JSON.parse(retObj.vlan[0]).port).toBe(1);
    expect(JSON.parse(retObj.vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(retObj.vlan[1]).port).toBe(2);
    expect(JSON.parse(retObj.vlan[1]).vlan_id).toBe(1);
    expect(JSON.parse(retObj.vlan[2]).port).toBe(3);
    expect(JSON.parse(retObj.vlan[2]).vlan_id).toBe(1);
    expect(JSON.parse(retObj.vlan[3]).port).toBe(4);
    expect(JSON.parse(retObj.vlan[3]).vlan_id).toBe(1);
  });
  test('getValidVlan : v2 p1', async () => {
    let convertedVlan = ['{"port":null,"vlan_id":1}',
      '{"port":2,"vlan_id":null}',
      '{"port":3,"vlan_id":23}',
      '{"port":4,"vlan_id":1}'];
    const returnConfigMock = jest.fn().mockReturnValue({
      is_default: true,
      vlans_profiles: [
        {'vlan_id': 1,
        'profile_name': 'Internet'},
        {'vlan_id': 23,
        'profile_name': 'Test23'},
      ],
    });
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    let retObj = await vlanController.getValidVlan('', convertedVlan);
    expect(retObj.success).toBe(true);
    expect(retObj.didChange).toBe(true);
    expect(JSON.parse(retObj.vlan[0]).port).toBe(1);
    expect(JSON.parse(retObj.vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(retObj.vlan[1]).port).toBe(2);
    expect(JSON.parse(retObj.vlan[1]).vlan_id).toBe(1);
    expect(JSON.parse(retObj.vlan[2]).port).toBe(3);
    expect(JSON.parse(retObj.vlan[2]).vlan_id).toBe(23);
    expect(JSON.parse(retObj.vlan[3]).port).toBe(4);
    expect(JSON.parse(retObj.vlan[3]).vlan_id).toBe(1);
  });
  test('getValidVlan : v2 p2', async () => {
    let convertedVlan = ['{"port":1,"vlan_id":1}',
      '{"port":null,"vlan_id":23}',
      '{"port":3,"vlan_id":null}',
      '{"port":4,"vlan_id":1}'];
    const returnConfigMock = jest.fn().mockReturnValue({
      is_default: true,
      vlans_profiles: [{'vlan_id': 1,
        'profile_name': 'Internet'}],
    });
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    let retObj = await vlanController.getValidVlan('', convertedVlan);
    expect(retObj.success).toBe(true);
    expect(retObj.didChange).toBe(true);
    expect(JSON.parse(retObj.vlan[0]).port).toBe(1);
    expect(JSON.parse(retObj.vlan[0]).vlan_id).toBe(1);
    expect(JSON.parse(retObj.vlan[1]).port).toBe(2);
    expect(JSON.parse(retObj.vlan[1]).vlan_id).toBe(1);
    expect(JSON.parse(retObj.vlan[2]).port).toBe(3);
    expect(JSON.parse(retObj.vlan[2]).vlan_id).toBe(1);
    expect(JSON.parse(retObj.vlan[3]).port).toBe(4);
    expect(JSON.parse(retObj.vlan[3]).vlan_id).toBe(1);
  });
});
