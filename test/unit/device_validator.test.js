require('../../bin/globals.js');
const Validator = require('../../public/javascripts/device_validator');

describe('Validate functions used both in front and back end)', () => {
  /*  mtuField(7) - int valid, int invalid 1,
      int invalid 2, float, string, undefined, null
      isPPPoE(7) - true, false, 0, 1, '0', '1', 'true',
      'false', string, undefined, null
      total tests = 14 */
  test('validateMtu: mtuField(int valid), isPPPoE(true)', () => {
    let validator = new Validator();
    let mtuField = 1492;
    let isPPPoE = true;
    let result = validator.validateMtu(mtuField, isPPPoE);
    expect(result).toHaveProperty('valid');
    expect(result.valid).toBe(true);
  });
  /*  vlanField(7) - int valid, int invalid 1,
      int invalid 2, float, int string, float string,
      non-numeric string, undefined, null
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
  test('validateVlan: vlanField(non-numeric string)', () => {
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
