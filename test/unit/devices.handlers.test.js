/* eslint require-jsdoc: 0 */

const deviceHandlers = require('../../controllers/handlers/devices');

describe('Handlers', () => {
  test('Date difference from 2 seconds until now must be 2 seconds', () => {
    // Return now - 2 seconds
    let testDate = new Date(Date.now() - 2000);
    // Test
    let seconds = deviceHandlers.diffDateUntilNowInSeconds(testDate);
    expect(seconds).toEqual(2);
  });

  test('Date str difference from 2 seconds until now must be 2 seconds', () => {
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

