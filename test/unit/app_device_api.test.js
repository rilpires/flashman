require('../../bin/globals');
const utils = require('../common/utils');
const appDeviceAPIController = require('../../controllers/app_device_api');

// controllers/app-device-api.js
describe('APP Device API Tests', () => {
  const altUid = {
    alt_uid: true,
    serial: '1111',
  };
  const macAsSerial = {
    use_mac_as_serial: true,
    serial: '2222',
  };
  const serial = {
    serial: '3333',
  };
  const abnormalContent = {};
  const nullContent = null;
  const undefinedContent = undefined;

  // getQueryForBackupFetch
  describe('getQueryForBackupFetch', () => {
    test('Test alt uid', () => {
      // Execute
      const result = appDeviceAPIController.getQueryForBackupFetch(altUid);
      // validate
      expect(result.alt_uid_tr069).toBe('1111');
    });

    test('Test mac as serial', () => {
      // Execute
      const result = appDeviceAPIController.getQueryForBackupFetch(macAsSerial);
      // validate
      expect(result._id).toBe('2222');
    });

    test('Test serial tr069', () => {
      // Execute
      const result = appDeviceAPIController.getQueryForBackupFetch(serial);
      // validate
      expect(result.serial_tr069).toBe('3333');
    });

    test('Test abnormal body.content', () => {
      // Execute
      const result =
        appDeviceAPIController.getQueryForBackupFetch(abnormalContent);
      // validate
      expect(result).toBe(null);
    });

    test('Test null body.content', () => {
      // Execute
      const result = appDeviceAPIController.getQueryForBackupFetch(nullContent);
      // validate
      expect(result).toBe(null);
    });

    test('Test undefined body.content', () => {
      // Execute
      const result =
        appDeviceAPIController.getQueryForBackupFetch(undefinedContent);
      // validate
      expect(result).toBe(null);
    });
  });

});
