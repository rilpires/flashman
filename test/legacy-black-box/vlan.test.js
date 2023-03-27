// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const request = require('supertest');
const utilHandler = require('../../controllers/handlers/util');
const mongoose = require('mongoose');
const DeviceModel = require('../../models/device');
const {populateDevices, disconnectThemAll} = require('../fake_router');

describe('vlan routes', () => {
  let adminCookie = null;
  let testCookie = null;
  let managerCookie = null;
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
      .catch(utilHandler.catchError);
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
      .catch(utilHandler.catchError);
    testCookie = testLogin.header['set-cookie'];
    if (typeof testCookie === undefined) {
      throw new Error('Failed to get admin cookie');
    }

    const managerLogin = await request('localhost:8000')
      .post('/login')
      .send({
        name: 'teste',
        password: 'teste123',
      })
      .catch(utilHandler.catchError);
    managerCookie = managerLogin.header['set-cookie'];
    if (typeof managerCookie === undefined) {
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
    ).catch(utilHandler.catchDatabaseError);

    const query = {};
    const matchedDevices = await DeviceModel
      .find(query)
      .lean()
      .catch(utilHandler.catchDatabaseError);

    let slaveCount = {};
    const macList = matchedDevices.map((device) => {
      if (device.mesh_slaves && device.mesh_slaves.length > 0) {
        slaveCount[device._id] = device.mesh_slaves.length;
      } else {
        slaveCount[device._id] = 0;
      }
      return device._id;
    });

    fakeDevicesInstances =
      await populateDevices(macList).catch(utilHandler.catchError);
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
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
  });
  test('/vlan/profile - Try to get the list of vlan profile page as test user',
  async () => {
    let res = await request('localhost:8000')
      .get('/vlan/profile')
      .set('Cookie', testCookie)
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(403);
  });

  // localhost:8000/vlan/profile/fetch GET
  test('/vlan/profile/fetch - Fetch 14 existent vlan profiles',
  async () => {
    let res = await request('localhost:8000')
      .get('/vlan/profile/fetch')
      .set('Cookie', testCookie)
      .catch(utilHandler.catchError);
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
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(403);
    expect(res.text).toContain('Permissão negada');
  });
  test('/vlan/profile/:vid - Try to get the editing'+
    ' vlan profile page as admin user and  be a non existent vlan profile',
  async () => {
    let res = await request('localhost:8000')
      .get('/vlan/profile/'+13)
      .set('Cookie', adminCookie)
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('VLAN ID não encontrado');
  });
  test('/vlan/profile/:vid - Try to get the editing'+
    ' vlan profile page as admin user and be a existent vlan profile',
  async () => {
    let res = await request('localhost:8000')
      .get('/vlan/profile/'+31)
      .set('Cookie', adminCookie)
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/name="profilename" value="test31"/);
  });

  // localhost:8000/vlan/profile/check/:profileid GET
  test('/vlan/profile/check/:profileid - Check non existent vlan',
  async () => {
    let profileId = '60953d058203b85981484824';
    let res = await request('localhost:8000')
      .get('/vlan/profile/check/'+profileId)
      .set('Cookie', adminCookie)
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Perfil de VLAN não encontrado');
  });
  test('/vlan/profile/check/:profileid - Check vlan 10 iphone',
  async () => {
    let profileId = '60953d058203ab0019ac44b6'; // vlan 10 iphone
    let res = await request('localhost:8000')
      .get('/vlan/profile/check/'+profileId)
      .set('Cookie', adminCookie)
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // localhost:8000/vlan/fetch/:deviceid GET
  test('/vlan/fetch/:deviceid - Fetch vlan from a existent device',
  async () => {
    let deviceId = 'C4:E9:84:70:34:17';
    let res = await request('localhost:8000')
      .get('/vlan/fetch/'+deviceId)
      .set('Cookie', adminCookie)
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.vlan[0].vlan_id).toBe(1);
    expect(res.body.vlan[0].port).toBe(1);
    expect(res.body.vlan[1].vlan_id).toBe(31);
    expect(res.body.vlan[1].port).toBe(2);
    expect(res.body.vlan[2].vlan_id).toBe(1);
    expect(res.body.vlan[2].port).toBe(3);
    expect(res.body.vlan[3].vlan_id).toBe(1);
    expect(res.body.vlan[3].port).toBe(4);
  });
  test('/vlan/fetch/:deviceid - Fetch vlan from a non existent device',
  async () => {
    let deviceId = 'AA:EE:FF:23:78:AB';
    let res = await request('localhost:8000')
      .get('/vlan/fetch/'+deviceId)
      .set('Cookie', adminCookie)
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
  });

  // localhost:8000/vlan/fetchvlancompatible GET
  test('/vlan/fetchvlancompatible - Fetch compatible devices models',
  async () => {
    let res = await request('localhost:8000')
      .get('/vlan/fetchvlancompatible')
      .set('Cookie', adminCookie)
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.compatibleModels.length).toBe(41);
  });

  // localhost:8000/vlan/profile/new POST
  test('/vlan/profile/new - Try create a new vlan profile'+
    ' with existent vlan_id recorded and fail',
  async () => {
    let res = await request('localhost:8000')
      .post('/vlan/profile/new')
      .set('Cookie', adminCookie)
      .send({id: 16, name: 'teste123'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message)
      .toContain('Já existe um perfil de VLAN com esse ID');
  });
  test('/vlan/profile/new - Try create a new vlan profile'+
    ' with existent profile_name recorded and fail',
  async () => {
    let res = await request('localhost:8000')
      .post('/vlan/profile/new')
      .set('Cookie', adminCookie)
      .send({id: 2323, name: 'ipphone'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message)
      .toContain('Já existe um perfil de VLAN com esse nome');
  });
  test('/vlan/profile/new - Try create a new vlan profile'+
    ' with vlan_id above 4094 limit and fail',
  async () => {
    let res = await request('localhost:8000')
      .post('/vlan/profile/new')
      .set('Cookie', adminCookie)
      .send({id: 9999, name: 'teste123'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message)
      .toContain('O VLAN ID não pode ser menor que 3 ou maior que 4094');
  });
  test('/vlan/profile/new - Try create a new vlan profile'+
    ' with profile_name more than 32 characters length and fail',
  async () => {
    let res = await request('localhost:8000')
      .post('/vlan/profile/new')
      .set('Cookie', adminCookie)
      .send({id: 2323, name: 'test123test123test123test123test123'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message)
      .toContain('maior do que 32 caracteres');
  });
  test('/vlan/profile/new - Try create a new vlan profile'+
    ' with profile_name not in standards and fail',
  async () => {
    let res = await request('localhost:8000')
      .post('/vlan/profile/new')
      .set('Cookie', adminCookie)
      .send({id: 2323, name: '123test'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message)
      .toContain('Perfil de VLAN deve começar');
  });
  test('/vlan/profile/new - Try create a new vlan profile'+
    ' with valid inputs and succeeds',
  async () => {
    let res = await request('localhost:8000')
      .post('/vlan/profile/new')
      .set('Cookie', adminCookie)
      .send({id: 2323, name: 'test2323'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message)
      .toContain('com sucesso');
  });

  // localhost:8000/vlan/profile/edit/:vid POST
  test('/vlan/profile/edit/:vid - Try to edit a non existent'+
    ' vlan profile and fail',
  async () => {
    let res = await request('localhost:8000')
      .post('/vlan/profile/edit/'+42)
      .set('Cookie', adminCookie)
      .send({profilename: 'teste123'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message)
      .toContain('não encontrado');
  });
  test('/vlan/profile/edit/:vid - Try to edit to a existent'+
    ' vlan profile name and fail',
  async () => {
    let res = await request('localhost:8000')
      .post('/vlan/profile/edit/'+10)
      .set('Cookie', adminCookie)
      .send({profilename: 'WAN'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message)
      .toContain('Perfil de VLAN deve ser distinto');
  });
  test('/vlan/profile/edit/:vid - Try to edit to profile name '+
    ' bigger than 32 characters and fail',
  async () => {
    let res = await request('localhost:8000')
      .post('/vlan/profile/edit/'+10)
      .set('Cookie', adminCookie)
      .send({profilename: 'abcdefabcdefabcdefabcdefabcdefabcdef'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message)
      .toContain('Perfil de VLAN não deve ser maior');
  });
  test('/vlan/profile/edit/:vid - Try to edit to profile name '+
    ' out of standards and fail',
  async () => {
    let res = await request('localhost:8000')
      .post('/vlan/profile/edit/'+10)
      .set('Cookie', adminCookie)
      .send({profilename: '123test'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message)
      .toContain('deve começar com um caractere do alfabeto');
  });
  test('/vlan/profile/edit/:vid - Set a new name to vlan id 10',
  async () => {
    let res = await request('localhost:8000')
      .post('/vlan/profile/edit/'+10)
      .set('Cookie', adminCookie)
      .send({profilename: 'Android'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message)
      .toContain('com sucesso');
  });
  test('/vlan/profile/edit/:vid - Set vlan id 10 back to ipphone',
  async () => {
    let res = await request('localhost:8000')
      .post('/vlan/profile/edit/'+10)
      .set('Cookie', adminCookie)
      .send({profilename: 'ipphone'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message)
      .toContain('com sucesso');
  });

  // localhost:8000/vlan/fetchmaxvid POST
  test('/vlan/fetchmaxvid - Pass a wrong json',
  async () => {
    let res = await request('localhost:8000')
      .post('/vlan/fetchmaxvid')
      .set('Cookie', adminCookie)
      .send({models: '"ARCHERC2V1"; "DIR-819A1"; "EC220-G5V2"'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message)
      .toContain('inválido');
  });
  test('/vlan/fetchmaxvid - 3 samples of models and'+
    ' check if is max_vid matches',
  async () => {
    let models = ['ARCHERC2V1', 'DIR-819A1', 'EC220-G5V2'];
    let res = await request('localhost:8000')
      .post('/vlan/fetchmaxvid')
      .set('Cookie', adminCookie)
      .send({models: JSON.stringify(models)})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.maxVids[models[0]]).toBe(31);
    expect(res.body.maxVids[models[1]]).toBe(15);
    expect(res.body.maxVids[models[2]]).toBe(4094);
  });
  test('/vlan/fetchmaxvid - non existent model',
  async () => {
    let models = ['test123'];
    let res = await request('localhost:8000')
      .post('/vlan/fetchmaxvid')
      .set('Cookie', adminCookie)
      .send({models: JSON.stringify(models)})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.maxVids[models[0]]).toBe(0);
  });

  // localhost:8000/vlan/update/:deviceid POST
  test('/vlan/update/:deviceid  - Try update a vlan to'+
    ' a non existent device',
  async () => {
    let deviceId = 'AA:BB:CC:DD:EE:FF';
    let res = await request('localhost:8000')
      .post('/vlan/update/'+deviceId)
      .set('Cookie', adminCookie)
      .send({})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('não encontrada');
  });
  test('/vlan/update/:deviceid  - Try update a vlan with a'+
    ' user without permission',
  async () => {
    let deviceId = 'AA:BB:CC:DD:EE:FF';
    let res = await request('localhost:8000')
      .post('/vlan/update/'+deviceId)
      .set('Cookie', managerCookie)
      .send({})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(403);
  });
  test('/vlan/update/:deviceid  - Try update a vlan with'+
    ' wrong vlan format',
  async () => {
    let deviceId = '08:32:82:10:09:22';
    let res = await request('localhost:8000')
      .post('/vlan/update/'+deviceId)
      .set('Cookie', testCookie)
      .send({})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('inválido');
  });
  test('/vlan/update/:deviceid  - Update a vlan in a device',
  async () => {
    let deviceId = '08:32:82:10:09:22';
    let res = await request('localhost:8000')
      .post('/vlan/update/'+deviceId)
      .set('Cookie', testCookie)
      .send({vlans: '[{"port":1, "vlan_id":10},{"port":2, "vlan_id":15},'+
        '{"port":3, "vlan_id":10},{"port":4, "vlan_id":1}]'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('com sucesso');
  });
  test('/vlan/update/:deviceid  - Update vlan config back in the'+
    ' previosly updated device',
  async () => {
    let deviceId = '08:32:82:10:09:22';
    let res = await request('localhost:8000')
      .post('/vlan/update/'+deviceId)
      .set('Cookie', testCookie)
      .send({vlans: '[{"port":1, "vlan_id":1},{"port":2, "vlan_id":1},'+
        '{"port":3, "vlan_id":1},{"port":4, "vlan_id":1}]'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('com sucesso');
  });

  // localhost:8000/vlan/profile/del' DELETE
  test('/vlan/profile/del - Delete vlan profile'+
    ' previously created',
  async () => {
    let res = await request('localhost:8000')
      .delete('/vlan/profile/del')
      .set('Cookie', adminCookie)
      .send({ids: '2323'})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message)
      .toContain('com sucesso');
  });
  test('/vlan/profile/del - Delete vlan profile'+
    ' passing a number',
  async () => {
    let res = await request('localhost:8000')
      .delete('/vlan/profile/del')
      .set('Cookie', adminCookie)
      .send({ids: 32})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message)
      .toContain('com sucesso');
  });
  test('/vlan/profile/del - Delete vlan profile'+
    ' passing a array of number',
  async () => {
    let res = await request('localhost:8000')
      .delete('/vlan/profile/del')
      .set('Cookie', adminCookie)
      .send({ids: [64, 16, 15]})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message)
      .toContain('com sucesso');
  });
  test('/vlan/profile/del - Try delete vlan profile'+
    ' passing a object',
  async () => {
    let res = await request('localhost:8000')
      .delete('/vlan/profile/del')
      .set('Cookie', adminCookie)
      .send({ids: {a: 123, b: 321}})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message)
      .toContain('inválido');
  });
  test('/vlan/profile/del - Try delete vlan profile'+
    ' passing undefined',
  async () => {
    let res = await request('localhost:8000')
      .delete('/vlan/profile/del')
      .set('Cookie', adminCookie)
      .send({})
      .catch(utilHandler.catchError);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message)
      .toContain('inválido');
  });

  afterAll(async () => {
    if (fakeDevicesInstances.length > 0) {
      await disconnectThemAll(fakeDevicesInstances);
      fakeDevicesInstances = [];
    }
    await mongooseConnection.disconnect().catch(utilHandler.catchError);
  });
});
