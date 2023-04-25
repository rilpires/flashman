/* global __line */
require('../../bin/globals.js');
const testUtils = require('../common/utils');
const utils = require('../utils');
const Validator = require('../../public/javascripts/device_validator');

let createSimplePortMapping = function(ip,
  p1, p2 = null, p3 = null, p4 = null) {
  return {ip: ip,
    external_port_start: p1,
    external_port_end: p2 ? p2 : p1,
    internal_port_start: p3 ? p3 : p1,
    internal_port_end: p4 ? p4 : (p2 ? p2 : p1),
  };
};
let createIncompatibility = function(lvl) {
  let inc = {simpleSymmetric: false, simpleAsymmetric: false,
    rangeSymmetric: false, rangeAsymmetric: false};
  for (let i = 0; i < lvl; i++) {
    if (Object.keys(inc).length > i) {
      inc[Object.keys(inc)[i]] = true;
    }
  }
  return inc;
};

let rulesObj = [];
let rulesValidity = [];
let rulesOverlapping = [];
let rulesIncompatibility = [];
let incompatibility = [];

rulesObj.push([null, 1, 2.2, 'test', undefined, '', {},
  {'a': '1', 'b': '2'}, ['1', 2, 3.4]]);
rulesObj.push([createSimplePortMapping('192.168.1.10', '1010'),
      {external_port_start: '', external_port_end: '',
      internal_port_start: '', internal_port_end: ''},
      createSimplePortMapping('192.168.1.10', '1010')]);
rulesObj.push([createSimplePortMapping('192.168.1.10', '1010'),
      {ip: '', external_port_end: '',
      internal_port_start: '', internal_port_end: ''},
      createSimplePortMapping('192.168.1.10', '1010')]);
rulesObj.push([createSimplePortMapping('192.168.1.10', '1010'),
      {ip: '', external_port_start: '',
      internal_port_start: '', internal_port_end: ''},
      createSimplePortMapping('192.168.1.10', '1010')]);
rulesObj.push([createSimplePortMapping('192.168.1.10', '1010'),
      {ip: '', external_port_start: '', external_port_end: '',
      internal_port_end: ''},
      createSimplePortMapping('192.168.1.10', '1010')]);
rulesObj.push([createSimplePortMapping('192.168.1.10', '1010'),
      {ip: '', external_port_start: '', external_port_end: '',
      internal_port_start: ''},
      createSimplePortMapping('192.168.1.10', '1010')]);
rulesObj.push([createSimplePortMapping('192.168.1.10', '1010'),
      createSimplePortMapping('192.168.1.20', '2020'),
      createSimplePortMapping('192.168.1.30', '3030')]);
let sp = createSimplePortMapping('10.0.0.10',
  '1010', '2020', '3030', '4040');
rulesObj.push([{...sp, a: '1', b: '2', c: '3'}]);

rulesValidity.push([createSimplePortMapping('192.168.1.10', '1010')]);
rulesValidity.push([createSimplePortMapping('10.0.0.10', '')]);
rulesValidity.push([createSimplePortMapping('10.0.0.10', 'abc')]);
rulesValidity.push([createSimplePortMapping('10.0.0.10', '75432')]);
rulesValidity.push([createSimplePortMapping('10.0.0.10',
  '1010', '1020', '2010', '2030')]);
rulesValidity.push([createSimplePortMapping('10.0.0.10',
  '600', '500', '600', '500')]);
rulesValidity.push([createSimplePortMapping('10.0.0.10',
  '1010', '2020', '3030', '4040')]);

rulesOverlapping.push([createSimplePortMapping( // start
  '192.168.1.10', 1010, 1050),
  createSimplePortMapping('192.168.1.20', 990, 1030)]);
rulesOverlapping.push([createSimplePortMapping( // end
  '192.168.1.10', 1010, 1050),
  createSimplePortMapping('192.168.1.20', 1020, 1060)]);
rulesOverlapping.push([createSimplePortMapping( // both
  '192.168.1.10', 1010, 1050),
  createSimplePortMapping('192.168.1.20', 1005, 1015),
  createSimplePortMapping('192.168.1.30', 1045, 1055)]);
rulesOverlapping.push([createSimplePortMapping( // edge start
  '192.168.1.10', 1010, 1050),
  createSimplePortMapping('192.168.1.20', 970, 1010)]);
rulesOverlapping.push([createSimplePortMapping( // edge end
  '192.168.1.10', 1010, 1050),
  createSimplePortMapping('192.168.1.20', 1050, 1090)]);
rulesOverlapping.push([createSimplePortMapping( // both edge
  '192.168.1.10', 1010, 1050),
  createSimplePortMapping('192.168.1.20', 970, 1010),
  createSimplePortMapping('192.168.1.30', 1050, 1090)]);
rulesOverlapping.push([createSimplePortMapping(
  '192.168.1.10', 1020, 1040),
  createSimplePortMapping('192.168.1.20', 970, 1010),
  createSimplePortMapping('192.168.1.30', 1050, 1090)]);

rulesIncompatibility.push([createSimplePortMapping('10.20.30.100',
  1010, 1020, 2010, 2020)]);
incompatibility.push(createIncompatibility(3));
rulesIncompatibility.push([createSimplePortMapping('10.20.30.100',
  1010, 1020, 1010, 1020)]);
incompatibility.push(createIncompatibility(2));
rulesIncompatibility.push([createSimplePortMapping('10.20.30.100',
  1010, 1010, 2020, 2020)]);
incompatibility.push(createIncompatibility(1));
rulesIncompatibility.push([createSimplePortMapping('10.20.30.100', 1010)]);
incompatibility.push(createIncompatibility(0));
rulesIncompatibility.push([createSimplePortMapping('10.20.30.100',
  1010, 1020, 780, 790)]);
incompatibility.push(createIncompatibility(4));
incompatibility.push({simpleAsymmetric: false,
  rangeSymmetric: false, rangeAsymmetric: false});

describe('Validate functions used both in frontend and backend', () => {
  /*
    input:
      mtuField(9) - int valid, int invalid 1, int invalid 2, float,
      int string, float string, random string, undefined, null
      isPPPoE(2) - true, false
    output:
      result - true, false
    total tests = 11 */
  describe('validateMtu function(mtuField, isPPPoE)', () => {
    test('mtuField(int valid), isPPPoE(true)', () => {
      let validator = new Validator();
      let mtuField = 1492;
      let isPPPoE = true;
      let result = validator.validateMtu(mtuField, isPPPoE);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
    });
    test('mtuField(int invalid 1), isPPPoE(true)', () => {
      let validator = new Validator();
      let mtuField = 442;
      let isPPPoE = true;
      let result = validator.validateMtu(mtuField, isPPPoE);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('mtuField(int invalid 2), isPPPoE(true)', () => {
      let validator = new Validator();
      let mtuField = 2442;
      let isPPPoE = true;
      let result = validator.validateMtu(mtuField, isPPPoE);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('mtuField(float), isPPPoE(true)', () => {
      let validator = new Validator();
      let mtuField = 1492.2941;
      let isPPPoE = true;
      let result = validator.validateMtu(mtuField, isPPPoE);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('mtuField(int string), isPPPoE(true)', () => {
      let validator = new Validator();
      let mtuField = '1492';
      let isPPPoE = true;
      let result = validator.validateMtu(mtuField, isPPPoE);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
    });
    test('mtuField(float string), isPPPoE(true)', () => {
      let validator = new Validator();
      let mtuField = '1492.2941';
      let isPPPoE = true;
      let result = validator.validateMtu(mtuField, isPPPoE);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('mtuField(random string), isPPPoE(true)', () => {
      let validator = new Validator();
      let mtuField = 'boo';
      let isPPPoE = true;
      let result = validator.validateMtu(mtuField, isPPPoE);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('mtuField(undefined), isPPPoE(true)', () => {
      let validator = new Validator();
      let mtuField;
      let isPPPoE = true;
      let result = validator.validateMtu(mtuField, isPPPoE);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('mtuField(null), isPPPoE(true)', () => {
      let validator = new Validator();
      let mtuField = null;
      let isPPPoE = true;
      let result = validator.validateMtu(mtuField, isPPPoE);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('mtuField(valid), isPPPoE(false)', () => {
      let validator = new Validator();
      let mtuField = 1500;
      let isPPPoE = false;
      let result = validator.validateMtu(mtuField, isPPPoE);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
    });
  });
  /*
    input:
      vlanField(9) - int valid, int invalid 1,
      int invalid 2, float, int string, float string,
      random string, undefined, null
    output:
      result - true, false
    total tests = 9 */
  describe('validateVlan function(vlanField)', () => {
    test('vlanField(int valid)', () => {
      let validator = new Validator();
      let vlanField = 23;
      let result = validator.validateVlan(vlanField);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
    });
    test('vlanField(int invalid 1)', () => {
      let validator = new Validator();
      let vlanField = -23;
      let result = validator.validateVlan(vlanField);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('vlanField(int invalid 2)', () => {
      let validator = new Validator();
      let vlanField = 23232;
      let result = validator.validateVlan(vlanField);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('vlanField(float)', () => {
      let validator = new Validator();
      let vlanField = 23.23;
      let result = validator.validateVlan(vlanField);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('vlanField(int string)', () => {
      let validator = new Validator();
      let vlanField = '23';
      let result = validator.validateVlan(vlanField);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
    });
    test('vlanField(float string)', () => {
      let validator = new Validator();
      let vlanField = '23.23';
      let result = validator.validateVlan(vlanField);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('vlanField(random string)', () => {
      let validator = new Validator();
      let vlanField = 'boo';
      let result = validator.validateVlan(vlanField);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('vlanField(undefined)', () => {
      let validator = new Validator();
      let vlanField;
      let result = validator.validateVlan(vlanField);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('vlanField(null)', () => {
      let validator = new Validator();
      let vlanField = null;
      let result = validator.validateVlan(vlanField);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
  });
  /*
    input:
      user(9) - 2 string valid, 3 string invalid,
        int, float, undefined, null
    output:
      result - true, false
    total tests = 9 */
  describe('validateUser function(user)', () => {
    test('user(string valid 1)', () => {
      let validator = new Validator();
      let user = 'T3s @#.-_';
      let result = validator.validateUser(user);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
    });
    test('user(string valid 2)', () => {
      let validator = new Validator();
      let user = 'a';
      let result = validator.validateUser(user);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
    });
    test('user(string invalid 1)', () => {
      let validator = new Validator();
      let user = 'T3s @#.-_+';
      let result = validator.validateUser(user);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('user(string invalid 2)', () => {
      let validator = new Validator();
      let user = '';
      let result = validator.validateUser(user);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('user(string invalid 3)', () => {
      let validator = new Validator();
      let user = 'abcdefghijklmnopqrstuvxwyz1234567890_'+
        'abcdefghijklmnopqrstuvxwyz1234567890_';
      let result = validator.validateUser(user);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('user(int)', () => {
      let validator = new Validator();
      let user = 23;
      let result = validator.validateUser(user);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('user(float)', () => {
      let validator = new Validator();
      let user = 42.42;
      let result = validator.validateUser(user);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('user(undefined)', () => {
      let validator = new Validator();
      let user;
      let result = validator.validateUser(user);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('user(null)', () => {
      let validator = new Validator();
      let user = null;
      let result = validator.validateUser(user);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
  });
  /*
    input:
      pass(9) - 1 string valid, 7 string invalid,
        int, float, undefined, null
    output:
      result - true, false
    total tests = 12 */
  describe('validateWebInterfacePassword function(pass)', () => {
    test('pass(string valid 1)', () => {
      let validator = new Validator();
      let pass = '1A3p5@78';
      let result = validator.validateWebInterfacePassword(pass);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
    });
    test('pass(string invalid 1)', () => {
      let validator = new Validator();
      let pass = '1234567';
      let result = validator.validateWebInterfacePassword(pass);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('pass(string invalid 2)', () => {
      let validator = new Validator();
      let pass = 'abcdefghijklmnopqrstuvxwyz1234567890_'+
        'abcdefghijklmnopqrstuvxwyz1234567890_';
      let result = validator.validateWebInterfacePassword(pass);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    // starts with special character
    test('pass(string invalid 3)', () => {
      let validator = new Validator();
      let pass = '@TR3p4q45l!';
      let result = validator.validateWebInterfacePassword(pass);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    // does not have lowercase letter
    test('pass(string invalid 4)', () => {
      let validator = new Validator();
      let pass = 'Q#Y987654';
      let result = validator.validateWebInterfacePassword(pass);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    // does not have number
    test('pass(string invalid 5)', () => {
      let validator = new Validator();
      let pass = 'W^Pzxcvbn';
      let result = validator.validateWebInterfacePassword(pass);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    // does not have uppercase letter
    test('pass(string invalid 6)', () => {
      let validator = new Validator();
      let pass = 'w!qbnm554';
      let result = validator.validateWebInterfacePassword(pass);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    // does not have special character
    test('pass(string invalid 7)', () => {
      let validator = new Validator();
      let pass = 'ABmowe179';
      let result = validator.validateWebInterfacePassword(pass);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('pass(int)', () => {
      let validator = new Validator();
      let pass = 42;
      let result = validator.validateWebInterfacePassword(pass);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('pass(float)', () => {
      let validator = new Validator();
      let pass = 23.23;
      let result = validator.validateWebInterfacePassword(pass);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('pass(undefined)', () => {
      let validator = new Validator();
      let pass;
      let result = validator.validateWebInterfacePassword(pass);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
    test('pass(null)', () => {
      let validator = new Validator();
      let pass = null;
      let result = validator.validateWebInterfacePassword(pass);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });
  });


  describe('validateTR069ConnectionField function(pass)', () => {
    test.each(testUtils.common.TEST_PARAMETERS.slice(1))(
      'Invalid field: %p', (pass) => {
      let validator = new Validator();
      let result = validator.validateTR069ConnectionField(pass);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });


    test('Minimum length', () => {
      let validator = new Validator();
      let pass = '';
      let result = validator.validateTR069ConnectionField(pass);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });


    test('Maximum length', () => {
      let validator = new Validator();
      let pass = 'a'.repeat(33);
      let result = validator.validateTR069ConnectionField(pass);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });


    test('Invalid characters', () => {
      let validator = new Validator();
      let pass = '1A3p5@78/*';
      let result = validator.validateTR069ConnectionField(pass);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });


    test('Valid characters', () => {
      let validator = new Validator();
      let pass = 'ABmowe179';
      let result = validator.validateTR069ConnectionField(pass);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
    });
  });


  // validateDeviceName
  describe('validateDeviceName function(name)', () => {
    // Invalid parameters
    test.each(testUtils.common.TEST_PARAMETERS.slice(1))(
      'Invalid field: %p', (name) => {
      let validator = new Validator();
      let result = validator.validateDeviceName(name);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });


    // Empty string
    test('Empty string', () => {
      let validator = new Validator();
      let name = '';
      let result = validator.validateDeviceName(name);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });


    // Minimum length
    test('Minimum length', () => {
      let validator = new Validator();
      let name = 'a';
      let result = validator.validateDeviceName(name);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
    });


    // Maximum length
    test('Maximum length', () => {
      let validator = new Validator();
      let name = 'a'.repeat(129);
      let result = validator.validateDeviceName(name);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });


    // Invalid characters
    test('Invalid characters', () => {
      let validator = new Validator();
      let name = '1A3p5@78/*`\'^~]{!';
      let result = validator.validateDeviceName(name);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
    });


    // Valid characters
    test('Valid characters', () => {
      let validator = new Validator();
      let name = 'ABmowe179 .,:;_-';
      let result = validator.validateDeviceName(name);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
    });
  });
  /*
    input:
      rules(9) - undefined,  null, int, float, string, Object,
      Array of bogus stuffs, Array of bogus objects,
      Array of correct object, Empty Array,
    output:
      true, false
    total tests = 14 */
  describe('checkPortMappingObj function(rules)', () => {
    // [{ip, external_port_start, external_port_end,
    //   internal_port_start, internal_port_end}]
    test.each([[false, undefined], [false, null], [false, 42],
      [false, {'a': '1', 'b': '2'}], [false, 23.23], [false, 'test'],
      [false, rulesObj[0]], [false, rulesObj[1]], [false, rulesObj[2]],
      [false, rulesObj[3]], [false, rulesObj[4]], [false, rulesObj[5]],
      [true, []], [true, rulesObj[6]], [true, rulesObj[7]],
      ])('%# -> expects %s', (expected, rules) => {
      let validator = new Validator();
      let ret = validator.checkPortMappingObj(rules);
      expect(ret).toBe(expected);
    });
  });
  /*
    input:
      rules(8) - 1 empty array, 6 array of rules with errors,
      1 valid array of rules
      subnet(1) - (1 int, 1 float, 1 undefined, 1 null, 1 invalid string,
        1 almost valid IP) [may test the checkAddressSubnetRange], 1 valid IP
      mask(1) - (1 string, 1 float, 1 undefined, 1 null, 1 negative int,
        1 int higher than 26) [may test the checkAddressSubnetRange],
        1 int between 0 and 26
    output:
      'success-message object':
        success(2) - true, false
        message(7) - t('outOfSubnetRangeError'), t('fieldShouldBeFilledError'),
          t('portsSouldBeNumberError'), t('portsSouldBeBetweenError'),
          t('portRangesAreDifferentError'), t('portRangesInvertedLimitsError'),
          t('operationSuccessful')
    total tests = 8 */
  describe('checkPortMappingValidity function(rules, subnet, mask)', () => {
    test.each([
      [true, utils.tt('operationSuccessful'), []],
      [false, utils.tt('outOfSubnetRangeError', {ip: '192.168.1.10'}),
        rulesValidity[0]],
      [false, utils.tt('fieldShouldBeFilledError', {ip: '10.0.0.10'}),
        rulesValidity[1]],
      [false, utils.tt('portsSouldBeNumberError', {ip: '10.0.0.10'}),
        rulesValidity[2]],
      [false, utils.tt('portsSouldBeBetweenError', {ip: '10.0.0.10'}),
        rulesValidity[3]],
      [false, utils.tt('portRangesAreDifferentError', {ip: '10.0.0.10'}),
        rulesValidity[4]],
      [false, utils.tt('portRangesInvertedLimitsError', {ip: '10.0.0.10'}),
        rulesValidity[5]],
      [true, utils.tt('operationSuccessful'), rulesValidity[6]],
      ])('%# -> expects (%s, %s)', (eSuccess, eMessage, rules) => {
      let validator = new Validator();
      let subnet = '10.0.0.1';
      let mask = 24;
      let ret = validator.checkPortMappingValidity(rules, subnet, mask);
      expect(ret.success).toBe(eSuccess);
      expect(ret.message).toMatch(eMessage);
    });
  });
  /*
    input:
      rules(8) - 1 empty array, 6 array of valid rules with
        overlapping (start, end, both, edge start, edge end,
        both edge), 1 array of valid rules without overlapping
    output:
      'success-message object':
        success(2) - true, false
        message(2) - t('operationSuccessful'), t('overlappingMappingError')
    total tests = 8 */
  describe('checkOverlappingPorts function(rules)', () => {
    test.each([
      [true, utils.tt('operationSuccessful'), []],
      [false, utils.tt('overlappingMappingError', {ip: '192.168.1.10'}),
        rulesOverlapping[0]],
      [false, utils.tt('overlappingMappingError', {ip: '192.168.1.10'}),
        rulesOverlapping[1]],
      [false, utils.tt('overlappingMappingError', {ip: '192.168.1.10'}),
        rulesOverlapping[2]],
      [false, utils.tt('overlappingMappingError', {ip: '192.168.1.10'}),
        rulesOverlapping[3]],
      [false, utils.tt('overlappingMappingError', {ip: '192.168.1.10'}),
        rulesOverlapping[4]],
      [false, utils.tt('overlappingMappingError', {ip: '192.168.1.10'}),
        rulesOverlapping[5]],
      [true, utils.tt('operationSuccessful'), rulesOverlapping[6]],
      ])('%# -> expects (%s, %s)', (eSuccess, eMessage, rules) => {
      let validator = new Validator();
      let ret = validator.checkOverlappingPorts(rules);
      expect(ret.success).toBe(eSuccess);
      expect(ret.message).toMatch(eMessage);
    });
  });
  /*
    input:
      rules(7) - 1 empty array, 5 array of almost compatible rules,
      1 array of compatible rules
      compatibility(12) - 1 int, 1 float, 1 undefined, 1 null, 1 string,
        1 empty object, 1 almost valid object, 5 valid objects
    output:
      'success-message object':
        success(2) - true, false
        message(2) - t('operationSuccessful'), t('incompatibleRulesError')
    total tests = 14 */
  describe('checkIncompatibility function(rules, compatibility)', () => {
    test.each([
      [false, utils.tt('incompatibleRulesError', {ip: '10.20.30.100'}),
        rulesIncompatibility[0], incompatibility[0]],
      [false, utils.tt('incompatibleRulesError', {ip: '10.20.30.100'}),
        rulesIncompatibility[1], incompatibility[1]],
      [false, utils.tt('incompatibleRulesError', {ip: '10.20.30.100'}),
        rulesIncompatibility[2], incompatibility[2]],
      [false, utils.tt('incompatibleRulesError', {ip: '10.20.30.100'}),
        rulesIncompatibility[3], incompatibility[3]],
      [true, utils.tt('operationSuccessful'),
        rulesIncompatibility[4], incompatibility[4]],
      [true, utils.tt('operationSuccessful'), [], incompatibility[4]],
      [false, utils.tt('jsonInvalidFormat', {errorline: __line}), [], 42],
      [false, utils.tt('jsonInvalidFormat', {errorline: __line}), [], 23.23],
      [false, utils.tt('jsonInvalidFormat',
        {errorline: __line}), [], undefined],
      [false, utils.tt('jsonInvalidFormat', {errorline: __line}), [], null],
      [false, utils.tt('jsonInvalidFormat', {errorline: __line}), [], ''],
      [false, utils.tt('jsonInvalidFormat', {errorline: __line}), [], 'test'],
      [false, utils.tt('jsonInvalidFormat', {errorline: __line}), [], {}],
      [false, utils.tt('jsonInvalidFormat',
        {errorline: __line}), [], incompatibility[5]],
      ])('%# -> expects (%s, %s)',
      (eSuccess, eMessage, rules, compatibility) => {
      let validator = new Validator();
      let ret = validator.checkIncompatibility(rules, compatibility);
      expect(ret.message).toMatch(eMessage);
      expect(ret.success).toBe(eSuccess);
    });
  });
});
