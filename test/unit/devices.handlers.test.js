/* eslint require-jsdoc: 0 */
require('../../bin/globals.js');
const utils = require('../common/utils');
const deviceHandlers = require('../../controllers/handlers/devices');

describe('Controllers - Handlers - Devices', () => {
  describe('diffDateUntilNowInSeconds function', () => {
    test('Date difference from 2 seconds until now must be 2 seconds', () => {
      // Return now - 2 seconds
      let testDate = new Date(Date.now() - 2000);
      // Test
      let seconds = deviceHandlers.diffDateUntilNowInSeconds(testDate);
      expect(seconds).toEqual(2);
    });
    test('Date str difference from 2 seconds until now must be 2 seconds',
      () => {
      // Return now - 2 seconds
      let testDate = new Date(Date.now() - 2000);
      testDate = testDate.toISOString();
      // Test
      let seconds = deviceHandlers.diffDateUntilNowInSeconds(testDate);
      expect(seconds).toEqual(2);
    });
    test('Date difference from invalid until now must be epoch', () => {
      // Return now - 2 seconds
      let testDate = 'not-a-date';
      // Test
      let seconds = deviceHandlers.diffDateUntilNowInSeconds(testDate);
      expect(seconds).toBeGreaterThan(500000);
    });
  });
  describe('isOnline function', () => {
    test('Device must return online status when date is ISO string', () => {
      // Return 'now' date
      let testDate = new Date();
      testDate = testDate.toISOString();
      // Test
      let isOnlineReturn = deviceHandlers.isOnline(testDate);
      expect(isOnlineReturn).toEqual(true);
    });
    test('Device must return online status when date is Date', () => {
      // Return 'now' date
      let testDate = new Date();
      // Test
      let isOnlineReturn = deviceHandlers.isOnline(testDate);
      expect(isOnlineReturn).toEqual(true);
    });
    test('Device must return offline status when date is invalid', () => {
      let testDate = 'not-a-date';
      // Test
      let isOnlineReturn = deviceHandlers.isOnline(testDate);
      expect(isOnlineReturn).toEqual(false);
    });
    test('Device must return offline status when date is old', () => {
      let testDate = new Date(1970, 1, 1);
      // Test
      let isOnlineReturn = deviceHandlers.isOnline(testDate);
      expect(isOnlineReturn).toEqual(false);
    });
  });
  describe('buildStatusColor function', () => {
    /*
      input:
        device:
          use_tr069 - true, false
          last_contact - Date()
        tr069Times
          recovery - Date()
          offline - Date()
        isDeviceOnline - true, false
      output:
        deviceColor - 'grey', 'green', 'red'
      possible happy flows:
        use_tr069 = true
          device.last_contact >= tr069Times.recovery = true -> 'green'
          device.last_contact >= tr069Times.recovery = false
            device.last_contact >= tr069Times.offline = true -> 'red'
            device.last_contact >= tr069Times.offline = false -> 'grey'
        use_tr069 = false
          isDeviceOnline = true -> 'green'
          isDeviceOnline = false
            device.last_contact >= lastHour = true -> 'red'
            device.last_contact >= lastHour = false -> 'grey'

      total tests = 6 + x */
    test('TR069 CPE that is online', () => {
      let currentTimestamp = Date.now();
      let device = {
        use_tr069: true,
        last_contact: new Date(currentTimestamp - 3*60000),
      };
      let tr069Times = {
        recovery: new Date(currentTimestamp - (5*60000)),
        offline: new Date(currentTimestamp - (10*60000)),
      };
      let color = deviceHandlers.buildStatusColor(device, tr069Times, false);
      expect(color).toEqual('green');
    });
    test('TR069 CPE that is unstable', () => {
      let currentTimestamp = Date.now();
      let device = {
        use_tr069: true,
        last_contact: new Date(currentTimestamp - 7*60000),
      };
      let tr069Times = {
        recovery: new Date(currentTimestamp - (5*60000)),
        offline: new Date(currentTimestamp - (10*60000)),
      };
      let color = deviceHandlers.buildStatusColor(device, tr069Times, false);
      expect(color).toEqual('red');
    });
    test('TR069 CPE that is offline', () => {
      let currentTimestamp = Date.now();
      let device = {
        use_tr069: true,
        last_contact: new Date(currentTimestamp - 12*60000),
      };
      let tr069Times = {
        recovery: new Date(currentTimestamp - (5*60000)),
        offline: new Date(currentTimestamp - (10*60000)),
      };
      let color = deviceHandlers.buildStatusColor(device, tr069Times, false);
      expect(color).toEqual('grey');
    });
    test('Flashbox CPE that is online', () => {
      let currentTimestamp = Date.now();
      let device = {
        use_tr069: false,
        last_contact: new Date(currentTimestamp - 30*60000),
      };
      let tr069Times = {};
      let color = deviceHandlers.buildStatusColor(device, tr069Times, true);
      expect(color).toEqual('green');
    });
    test('Flashbox CPE that is unstable', () => {
      let currentTimestamp = Date.now();
      let device = {
        use_tr069: false,
        last_contact: new Date(currentTimestamp - 30*60000),
      };
      let tr069Times = {};
      let color = deviceHandlers.buildStatusColor(device, tr069Times, false);
      expect(color).toEqual('red');
    });
    test('Flashbox CPE that is offline', () => {
      let currentTimestamp = Date.now();
      let device = {
        use_tr069: false,
        last_contact: new Date(currentTimestamp - 120*60000),
      };
      let tr069Times = {};
      let color = deviceHandlers.buildStatusColor(device, tr069Times, false);
      expect(color).toEqual('grey');
    });
    test('Broke CPE that could break the function 1', () => {
      let device = undefined;
      let tr069Times = undefined;
      let isOn = undefined;
      let color = deviceHandlers.buildStatusColor(device, tr069Times, isOn);
      expect(color).toEqual('grey');
    });
    test('Broke CPE that could break the function 2', () => {
      let device = {last_contact: 'asd'};
      let tr069Times = undefined;
      let isOn = undefined;
      let color = deviceHandlers.buildStatusColor(device, tr069Times, isOn);
      expect(color).toEqual('grey');
    });
    test('Broke CPE that could break the function 3', () => {
      let device = {
        use_tr069: true,
        last_contact: 'asd',
      };
      let tr069Times = undefined;
      let isOn = undefined;
      let color = deviceHandlers.buildStatusColor(device, tr069Times, isOn);
      expect(color).toEqual('grey');
    });
    test('Broke CPE that could break the function 4', () => {
      let device = {
        use_tr069: true,
        last_contact: 'asd',
      };
      let tr069Times = {};
      let isOn = undefined;
      let color = deviceHandlers.buildStatusColor(device, tr069Times, isOn);
      expect(color).toEqual('grey');
    });
  });
});

