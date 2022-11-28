require('../../bin/globals.js');
const Validator = require('../../public/javascripts/device_validator');

describe('Validate functions used both in front and back end)', () => {
  /*
    input:
      mtuField(9) - int valid, int invalid 1, int invalid 2, float,
      int string, float string, random string, undefined, null
      isPPPoE(2) - true, false
    output:
      result - true, false
    total tests = 11 */
  test('validateMtu: mtuField(int valid), isPPPoE(true)', () => {
    let validator = new Validator();
    let mtuField = 1492;
    let isPPPoE = true;
    let result = validator.validateMtu(mtuField, isPPPoE);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(true);
  });
  test('validateMtu: mtuField(int invalid 1), isPPPoE(true)', () => {
    let validator = new Validator();
    let mtuField = 442;
    let isPPPoE = true;
    let result = validator.validateMtu(mtuField, isPPPoE);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(false);
  });
  test('validateMtu: mtuField(int invalid 2), isPPPoE(true)', () => {
    let validator = new Validator();
    let mtuField = 2442;
    let isPPPoE = true;
    let result = validator.validateMtu(mtuField, isPPPoE);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(false);
  });
  test('validateMtu: mtuField(float), isPPPoE(true)', () => {
    let validator = new Validator();
    let mtuField = 1492.2941;
    let isPPPoE = true;
    let result = validator.validateMtu(mtuField, isPPPoE);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(false);
  });
  test('validateMtu: mtuField(int string), isPPPoE(true)', () => {
    let validator = new Validator();
    let mtuField = '1492';
    let isPPPoE = true;
    let result = validator.validateMtu(mtuField, isPPPoE);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(true);
  });
  test('validateMtu: mtuField(float string), isPPPoE(true)', () => {
    let validator = new Validator();
    let mtuField = '1492.2941';
    let isPPPoE = true;
    let result = validator.validateMtu(mtuField, isPPPoE);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(false);
  });
  test('validateMtu: mtuField(random string), isPPPoE(true)', () => {
    let validator = new Validator();
    let mtuField = 'boo';
    let isPPPoE = true;
    let result = validator.validateMtu(mtuField, isPPPoE);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(false);
  });
  test('validateMtu: mtuField(undefined), isPPPoE(true)', () => {
    let validator = new Validator();
    let mtuField;
    let isPPPoE = true;
    let result = validator.validateMtu(mtuField, isPPPoE);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(false);
  });
  test('validateMtu: mtuField(null), isPPPoE(true)', () => {
    let validator = new Validator();
    let mtuField = null;
    let isPPPoE = true;
    let result = validator.validateMtu(mtuField, isPPPoE);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(false);
  });
  /* ************************************************************** */
  test('validateMtu: mtuField(valid), isPPPoE(false)', () => {
    let validator = new Validator();
    let mtuField = 1500;
    let isPPPoE = false;
    let result = validator.validateMtu(mtuField, isPPPoE);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(true);
  });
  /*
    input:
      vlanField(9) - int valid, int invalid 1,
      int invalid 2, float, int string, float string,
      random string, undefined, null
    output:
      result - true, false
    total tests = 9 */
  test('validateVlan: vlanField(int valid)', () => {
    let validator = new Validator();
    let vlanField = 23;
    let result = validator.validateVlan(vlanField);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(true);
  });
  test('validateVlan: vlanField(int invalid 1)', () => {
    let validator = new Validator();
    let vlanField = -23;
    let result = validator.validateVlan(vlanField);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(false);
  });
  test('validateVlan: vlanField(int invalid 2)', () => {
    let validator = new Validator();
    let vlanField = 23232;
    let result = validator.validateVlan(vlanField);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(false);
  });
  test('validateVlan: vlanField(float)', () => {
    let validator = new Validator();
    let vlanField = 23.23;
    let result = validator.validateVlan(vlanField);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(false);
  });
  test('validateVlan: vlanField(int string)', () => {
    let validator = new Validator();
    let vlanField = '23';
    let result = validator.validateVlan(vlanField);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(true);
  });
  test('validateVlan: vlanField(float string)', () => {
    let validator = new Validator();
    let vlanField = '23.23';
    let result = validator.validateVlan(vlanField);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(false);
  });
  test('validateVlan: vlanField(random string)', () => {
    let validator = new Validator();
    let vlanField = 'boo';
    let result = validator.validateVlan(vlanField);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(false);
  });
  test('validateVlan: vlanField(undefined)', () => {
    let validator = new Validator();
    let vlanField;
    let result = validator.validateVlan(vlanField);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(false);
  });
  test('validateVlan: vlanField(null)', () => {
    let validator = new Validator();
    let vlanField = null;
    let result = validator.validateVlan(vlanField);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(false);
  });
});
