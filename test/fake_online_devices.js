const {populateDevices, disconnectThemAll} = require('./fake_router');
const {flashmanLogin} = require('./utils');
const mongoose = require('mongoose');
const DeviceModel = require('../models/device');

const main = async () => { 
  let mongooseConnection = await mongoose.connect(
    'mongodb://' + 'localhost' + ':27017/flashman-test',
    {
      useNewUrlParser: true,
      // biggest positive signed integer with 32 bits.
      serverSelectionTimeoutMS: 2**31-1,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    },
  ).catch(console.log);

  const query = {};
  const matchedDevices = await DeviceModel
    .find(query)
    .lean()
    .catch(console.log);

  let slaveCount = {};
  const macList = matchedDevices.map((device) => {
    if (device.mesh_slaves && device.mesh_slaves.length > 0) {
      slaveCount[device._id] = device.mesh_slaves.length;
    } else {
      slaveCount[device._id] = 0;
    }
    return device._id;
  });

  let fakeDevicesInstances = await populateDevices(macList).catch(console.log);
  fakeDevicesInstances.map((device) => {
    console.log('Called!');
    device.on('message', async (_, message) => {
      console.log('Called!');
      if (message.toString() === 'boot') {
        console.log('Booted!');
        const deviceData = matchedDevices.find((deviceData) =>
          deviceData._id === device.options.username);
        if (Math.floor(Math.random() * 5) > 0) {
          console.log(device.options.username);
          await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
        }
        await request('localhost:8000')
          .post('/deviceinfo/syn')
          .set('Cookie', adminCookie)
          .send({
            id: device.options.username,
            version: deviceData.version,
            model: deviceData.model,
            model_ver: 'v5',
            release_id: deviceData.release,
            pppoe_user: deviceData.pppoe_user,
            pppoe_password: deviceData.pppoe_password,
            wan_ip: deviceData.wan_ip,
            wifi_ssid: deviceData.wifi_ssid,
            wifi_password: deviceData.wifi_password,
            wifi_channel: deviceData.wifi_channel,
            secret: deviceData.mqtt_secret,
            wifi_5ghz_capable: deviceData.wifi_5ghz_capable === true ?
            '1' :
            '0',
          })
          .catch((err) => console.log(err));
      }
    });
  });

  process.on('exit', () => {
    if (fakeDevicesInstances.length > 0) {
      disconnectThemAll(fakeDevicesInstances);
      fakeDevicesInstances = [];
    }
    mongooseConnection.disconnect().catch(console.log);
    console.log('Disconnection!');
  });
};

main();
