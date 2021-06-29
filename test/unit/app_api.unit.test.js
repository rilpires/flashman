const mongoose = require('mongoose');
const appDeviceAPIController = require('../../controllers/app_device_api');
const DeviceModel = require('../../models/device');
const DeviceVersion = require('../../models/device_version')

describe('App API', () => {
  let modelZteF670L = 'F670L';

  beforeAll(async () => {
    await mongoose.connect(
      "mongodb://" + process.env.FLM_MONGODB_HOST + ":27017/flashman",
      {
        useNewUrlParser: true,
        serverSelectionTimeoutMS: 2 ** 31 - 1, // biggest positive signed integer with 32 bits.
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true,
      },
      (err) => {
        if (err) {
          console.error(err);
          process.exit(1);
        }
      }
    );
  });

  test('check feature not tr069', () => {
    let device = new DeviceModel({ model: 'NOTTR069'});
    expect(DeviceVersion.checkFeature(device.model, 'wps'));
  });

  test('check feature wps F670L', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'F670L'});
    expect(DeviceVersion.checkFeature(device.model, 'wps')).toBe(false);
  });

  test('check feature upnp F670L', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'F670L'});
    expect(
      DeviceVersion.checkFeature(device.model, 'upnp'),
    ).toBe(false);
  });

  test('check feature speedTest F670L', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'F670L'});
    expect(
      DeviceVersion.checkFeature(device.model, 'speedTest'),
    ).toBe(false);
  });

  test('check feature speedTestLimit F670L', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'F670L'});
    expect(
      DeviceVersion.checkFeature(device.model, 'speedTestLimit'),
    ).toBe(0);
  });

  test('check feature blockDevices F670L', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'F670L'});
    expect(
      DeviceVersion.checkFeature(device.model, 'blockDevices'),
    ).toBe(false);
  });

  test('check feature wps other model', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'H198A'});
    expect(
      DeviceVersion.checkFeature(device.model, 'wps'),
    ).toBe(false);
  });

  test('check feature upnp other model', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'H198A'});
    expect(
      DeviceVersion.checkFeature(device.model, 'upnp'),
    ).toBe(false);
  });

  test('check feature speedTest other model', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'H198A'});
    expect(
      DeviceVersion.checkFeature(device.model, 'speedTest'),
    ).toBe(false);
  });

  test('check feature speedTestLimit other model', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'H198A'});
    expect(
      DeviceVersion.checkFeature(device.model, 'speedTestLimit'),
    ).toBe(false);
  });

  test('check feature blockDevices other model', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'H198A'});
    expect(
      DeviceVersion.checkFeature(device.model, 'blockDevices'),
    ).toBe(false);
  });

  test('without model', () => {
    let device = new DeviceModel({use_tr069: true});
    expect(
      DeviceVersion.checkFeature('', 'wps'),
    ).toBe(false);
  });

  test('false tr069 variable', () => {
    let device = new DeviceModel();
    expect(
      DeviceVersion.checkFeature(device.model, 'wps'),
    ).toBe(true);
  });

  test('empty feature variable', () => {
    let device = new DeviceModel();
    expect(DeviceVersion.checkFeature(device.model, '')).toBe(true);
  });

  test('try to processUpnpInfo on tr069', () => {
    let content = new DeviceModel({ model: 'F670L', use_tr069: true});
    let device = new DeviceModel({ model: 'F670L', use_tr069: true });
    let rollback = new DeviceModel({ model: 'F670L', use_tr069: true });
    expect(appDeviceAPIController.processUpnpInfo(content, device, rollback)).toBe(false);
  });

  test('try to processBlacklist on tr069', () => {
    let content = new DeviceModel({ model: 'F670L', use_tr069: true});
    let device = new DeviceModel({ model: 'F670L', use_tr069: true });
    let rollback = new DeviceModel({ model: 'F670L', use_tr069: true });
    expect(appDeviceAPIController.processBlacklist(content, device, rollback)).toBe(false);
  });

  test('try to processWhitelist on tr069', () => {
    let content = new DeviceModel({ model: 'F670L', use_tr069: true});
    let device = new DeviceModel({ model: 'F670L', use_tr069: true });
    let rollback = new DeviceModel({ model: 'F670L', use_tr069: true });
    expect(appDeviceAPIController.processWhitelist(content, device, rollback)).toBe(false);
  });
});
