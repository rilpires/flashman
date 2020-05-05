/* eslint require-jsdoc: 0 */

const deviceHandlers = require('../../controllers/handlers/devices');

describe('Handlers', () => {
  test('Device must return online status', () => {
    // Return 'now' date
    let testDateOnline = new Date();
    testDateOnline = testDateOnline.toISOString();
    // Test
    let isOnlineReturn = deviceHandlers.isOnline(testDateOnline);
    expect(isOnlineReturn).toEqual(true);
  });
});

