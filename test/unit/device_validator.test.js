require('../../bin/globals.js');
const Validator = require('../../public/javascripts/device_validator');

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
});
