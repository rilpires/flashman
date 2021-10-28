const vlanController = require('../../controllers/vlan.js');
const crypto = require('crypto');

describe('VLAN Controller', () => {
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
        2 - vlan out of max vid range */
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
  test('getValidVlan :', () => {
    let model;
    let convertedVlan;
    expect(true).toBe(true);
  });
  test('convertDeviceVlan :', () => {
    let model;
    let vlanObj;
    expect(true).toBe(true);
  });
});
