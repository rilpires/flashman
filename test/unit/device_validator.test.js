require('../../bin/globals.js');
const Validator = require('../../public/javascripts/device_validator');

const utils = require('../common/utils');

describe('Validate functions used both in front and back end', () => {
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
    test.each(utils.common.TEST_PARAMETERS.slice(1))(
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
  /*
    input:
      rules(16) - 1 int, 1 float, 1 undefined, 1 null, 1 string, 1 empty array,
        1 array of invalid objects, 1 array of almost valid rules,
        7 array of rules with errors, 1 valid array of rules
      subnet(1) - (1 int, 1 float, 1 undefined, 1 null, 1 invalid string,
        1 almost valid IP) [may test the checkAddressSubnetRange], 1 valid IP
      mask(1) - (1 string, 1 float, 1 undefined, 1 null, 1 negative int,
        1 int higher than 26) [may test the checkAddressSubnetRange],
        1 int between 0 and 26
    output:
      'success-message object':
        success(2) - true, false
        message(8) - t('operationSuccessful'), t('outOfSubnetRangeError'),
          t('fieldShouldBeFilledError'), t('portsSouldBeNumberError'),
          t('portsSouldBeBetweenError'), t('portRangesAreDifferentError'),
          t('portRangesInvertedLimitsError')
    total tests = 16 */
  describe('checkPortMappingValidity function(rules, subnet, mask)', () => {});
  /*
    input:
      rules(15) - 1 int, 1 float, 1 undefined, 1 null, 1 string, 1 empty array,
        1 array of invalid objects, 1 array of almost valid objects,
        6 array of valid rules with overlapping (start, end, both, edge start,
        edge end, both edge), 1 array of overlapping valid rules
    output:
      'success-message object':
        success(2) - true, false
        message(2) - t('operationSuccessful'), t('overlappingMappingError')
    total tests = 15 */
  describe('checkOverlappingPorts function(rules)', () => {});
  /*
    input:
      rules(14) - 1 int, 1 float, 1 undefined, 1 null, 1 string, 1 empty array,
        1 array of invalid objects, 1 array of almost valid objects,
        5 array of almost compatible rules, 1 array of compatible rules
      compatibility(12) - 1 int, 1 float, 1 undefined, 1 null, 1 string,
        1 empty object, 1 almost valid object, 5 valid objects
    output:
      'success-message object':
        success(2) - true, false
        message(2) - t('operationSuccessful'), t('incompatibleRulesError')
    total tests = 21 */
  describe('checkIncompatibility function(rules, compatibility)', () => {});
});
