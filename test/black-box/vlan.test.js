// this test need to be run InBand (synchronous)
const request = require('supertest');
const {catchDatabaseError, catchError} = require('../../controllers/tools');
const mongoose = require('mongoose');
const DeviceModel = require('../../models/device');
const {populateDevices, disconnectThemAll} = require('../fake_router');

describe('vlan routes', () => {
  let adminCookie = null;
  let testCookie = null;
  let mongooseConnection = null;
  let fakeDevicesInstances = [];

  beforeAll(async () => {
    jest.setTimeout(100 * 1000);

    const adminLogin = await request('localhost:8000')
      .post('/login')
      .send({
        name: 'admin',
        password: 'landufrj123',
      })
      .catch(catchError);

    adminCookie = adminLogin.header['set-cookie'];
    if (typeof adminCookie === undefined) {
      throw new Error('Failed to get admin cookie');
    }

    const testLogin = await request('localhost:8000')
      .post('/login')
      .send({
        name: 'teste.testet@testetest.com.br',
        password: 'teste123',
      })
      .catch(catchError);

    testCookie = testLogin.header['set-cookie'];
    if (typeof testCookie === undefined) {
      throw new Error('Failed to get admin cookie');
    }

    mongooseConnection = await mongoose.connect(
      'mongodb://' + 'localhost' + ':27017/flashman-test',
      {
        useNewUrlParser: true,
        // biggest positive signed integer with 32 bits.
        serverSelectionTimeoutMS: 2**31-1,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true,
      },
    ).catch(catchDatabaseError);

    const query = {};
    const matchedDevices = await DeviceModel
      .find(query)
      .lean()
      .catch(catchDatabaseError);

    let slaveCount = {};
    const macList = matchedDevices.map((device) => {
      if (device.mesh_slaves && device.mesh_slaves.length > 0) {
        slaveCount[device._id] = device.mesh_slaves.length;
      } else {
        slaveCount[device._id] = 0;
      }
      return device._id;
    });

    fakeDevicesInstances = await populateDevices(macList).catch(catchError);
    fakeDevicesInstances.map((device) => {
      device.on('message', async (_, message) => {
        if (message.toString() === 'boot') {
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
          device.end();
        }
      });
    });
  });

  // localhost:8000/vlan/profile GET
  test('/vlan/profile - Try to get the list of vlan profile page as admin user',
  async () => {
    let res = await request('localhost:8000')
      .get('/vlan/profile')
      .set('Cookie', adminCookie)
      .catch(catchError);
    expect(res.statusCode).toBe(200);
  });
  test('/vlan/profile - Try to get the list of vlan profile page as test user',
  async () => {
    let res = await request('localhost:8000')
      .get('/vlan/profile')
      .set('Cookie', testCookie)
      .catch(catchError);
    expect(res.statusCode).toBe(403);
  });

  // localhost:8000/vlan/profile/fetch GET
  test('/vlan/profile/fetch - Fetch 14 existent vlan profiles',
  async () => {
    let res = await request('localhost:8000')
      .get('/vlan/profile/fetch')
      .set('Cookie', testCookie)
      .catch(catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.vlanProfiles.length).toBe(14);
  });

  // localhost:8000/vlan/profile/:vid GET
  test('/vlan/profile/:vid - Try to get the editing'+
    ' vlan profile page as test user',
  async () => {
    let res = await request('localhost:8000')
      .get('/vlan/profile/'+10)
      .set('Cookie', testCookie)
      .catch(catchError);
    expect(res.statusCode).toBe(403);
    expect(res.text).toMatch(/Permissão negada/);
  });
  test('/vlan/profile/:vid - Try to get the editing'+
    ' vlan profile page as admin user and  be a non existent vlan profile',
  async () => {
    let res = await request('localhost:8000')
      .get('/vlan/profile/'+13)
      .set('Cookie', adminCookie)
      .catch(catchError);
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/VLAN ID não encontrado/);
  });
  test('/vlan/profile/:vid - Try to get the editing'+
    ' vlan profile page as admin user and be a existent vlan profile',
  async () => {
    let res = await request('localhost:8000')
      .get('/vlan/profile/'+31)
      .set('Cookie', adminCookie)
      .catch(catchError);
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/name="profilename" value="test31"/);
  });

  // localhost:8000/vlan/profile/check/:profileid GET
  test('/vlan/profile/check/:profileid - Check vlan 10 iphone',
  async () => {
    let id = '60953d058203ab0019ac44b6'; // vlan 10 iphone
    let res = await request('localhost:8000')
      .get('/vlan/profile/check/'+id)
      .set('Cookie', adminCookie)
      .catch(catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // localhost:8000/vlan/fetch/:deviceid GET

  // localhost:8000/vlan/fetchvlancompatible GET

  // localhost:8000/vlan/profile/new POST

  // localhost:8000/vlan/profile/edit/:vid POST

  // localhost:8000/vlan/fetchmaxvid POST

  // localhost:8000/vlan/update/:deviceid POST

  // localhost:8000/vlan/profile/del' DELETE
  afterAll(async () => {
    if (fakeDevicesInstances.length > 0) {
      await disconnectThemAll(fakeDevicesInstances);
      fakeDevicesInstances = [];
    }
    await mongooseConnection.disconnect().catch(catchError);
  });
});
