const mongoose = require('mongoose');
const appDeviceAPIController = require('../../controllers/app_device_api');
const DeviceModel = require('../../models/device');
const DeviceVersionModel = require('../../models/device_version')

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
    console.log(deviceVersion);
    expect(appDeviceAPIController.checkFeature(device.model, 'wps', device.use_tr069));
  });

  test('check feature wps F670L', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'F670L'});
    expect(appDeviceAPIController.checkFeature(device.model, 'wps', device.use_tr069));
  });

  test('check feature upnp F670L', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'F670L'});
    expect(
      appDeviceAPIController.checkFeature(device.model, 'upnp', device.use_tr069),
    ).toBe(false);
  });

  test('check feature speedTest F670L', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'F670L'});
    expect(
      appDeviceAPIController.checkFeature(device.model, 'speedTest', device.use_tr069),
    ).toBe(false);
  });

  test('check feature speedTestLimit F670L', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'F670L'});
    expect(
      appDeviceAPIController.checkFeature(device.model, 'speedTestLimit', device.use_tr069),
    ).toBe(false);
  });

  test('check feature blockDevices F670L', () => {
    let device = new DeviceModel({ use_tr069: true, model: 'F670L'});
    expect(
      appDeviceAPIController.checkFeature(device.model, 'blockDevices', device.use_tr069),
    ).toBe(false);
  });

});
