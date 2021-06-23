const appDeviceAPIController = require('../../controllers/app_device_api');

describe('App API', () => {
  let modelZteF670L = 'F670L';

  test('check feature not tr069', () => {
    expect(appDeviceAPIController.checkFeature('NOTTR069', 'wps', false));
  });

  test('check feature wps F670L', () => {
    expect(appDeviceAPIController.checkFeature(modelZteF670L, 'wps', true));
  });

  test('check feature upnp F670L', () => {
    expect(
      appDeviceAPIController.checkFeature(modelZteF670L, 'upnp', true)
    ).toBe(false);
  });

  test('check feature speedTest F670L', () => {
    expect(
      appDeviceAPIController.checkFeature(modelZteF670L, 'speedTest', true)
    ).toBe(false);
  });

  test('check feature speedTestLimit F670L', () => {
    expect(
      appDeviceAPIController.checkFeature(modelZteF670L, 'speedTestLimit', true)
    ).toBe(false);
  });

  test('check feature blockDevices F670L', () => {
    expect(
      appDeviceAPIController.checkFeature(modelZteF670L, 'blockDevices', true)
    ).toBe(false);
  });
});
