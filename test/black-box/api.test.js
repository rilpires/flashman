// this test need to be run InBand (synchronous)
const request = require('supertest');
const {catchDatabaseError, catchError} = require('../../controllers/tools');
const mongoose = require('mongoose');
const DeviceModel = require('../../models/device');
const {populateDevices, disconnectThemAll} = require('../fake_router');

describe('api_v2', () => {
  let adminCookie = null;
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
  /* Visualizar log de boot de um roteador
  localhost:8000/api/v2/device/firstlog/:id GET
  possiveis entradas:
    req.params.id - id(mac/acs_id/serial_tr069) existente
    req.params.id - id(mac/acs_id/serial_tr069) não existente
  possiveis saidas:
    200 - Não existe log deste CPE
    200 - getHeader('Content-Encoding', 'gzip');
          getHeader('Content-Type', 'text/plain');
    500 - Erro interno do servidor
    404 - Roteador não encontrado */
  test('Visualize boot log of an CPE(flashbox): existent mac + existent log',
  async () => {
    let id = '80:8F:E8:D4:82:E3';
    return await request('localhost:8000')
      .get('/api/v2/device/firstlog/'+id)
      .auth('admin', 'landufrj123')
      .expect(200)
      .expect('Content-Encoding', 'gzip')
      .expect('Content-Type', 'text/plain')
      .then((response) => {
        expect(response.statusCode).toBe(200);
      })
      .catch(catchError);
  });
  test('Visualize boot log of an CPE(flashbox): existent mac +'+
    'non existent log',
  async () => {
    let id = 'B0:4E:26:E3:DB:9C';
    let res = await request('localhost:8000')
      .get('/api/v2/device/firstlog/'+id)
      .auth('admin', 'landufrj123')
      .expect(200)
      .catch(catchError);
    let r = res.body;
    expect(r.success).toBeFalsy();
    expect(r.message).toMatch(/Não existe log deste CPE/);
  });
  test('Visualize boot log of an CPE(flashbox): non existent mac',
  async () => {
    let id = 'FF:FF:FF:FF:FF:FF';
    let res = await request('localhost:8000')
      .get('/api/v2/device/firstlog/'+id)
      .auth('admin', 'landufrj123')
      .expect(200)
      .catch(catchError);
    let r = res.body;
    expect(r.success).toBeFalsy();
    expect(r.message).toMatch(/CPE não encontrado/);
  });
  test('Visualize boot log of an CPE(tr-069): existent acs_id +'+
    'non existent log',
  async () => {
    let id = '0CF0B4-GONUAC001-MKPGB4461FCE';
    let res = await request('localhost:8000')
      .get('/api/v2/device/firstlog/'+id)
      .auth('admin', 'landufrj123')
      .expect(200)
      .catch(catchError);
    let r = res.body;
    expect(r.success).toBeFalsy();
    expect(r.message).toMatch(/Não existe log deste CPE/);
  });
  test('Visualize boot log of an CPE(tr-069): non existent acs_id',
  async () => {
    let id = 'A4ADF2-Huawei-F1H03H0391FH1091H';
    let res = await request('localhost:8000')
      .get('/api/v2/device/firstlog/'+id)
      .auth('admin', 'landufrj123')
      .expect(200)
      .catch(catchError);
    let r = res.body;
    expect(r.success).toBeFalsy();
    expect(r.message).toMatch(/CPE não encontrado/);
  });
  test('Visualize boot log of an CPE(tr-069): existent serial +'+
    'non existent log',
  async () => {
    let id = 'ZTE0QHEL4M05104';
    let res = await request('localhost:8000')
      .get('/api/v2/device/firstlog/'+id)
      .auth('admin', 'landufrj123')
      .expect(200)
      .catch(catchError);
    let r = res.body;
    expect(r.success).toBeFalsy();
    expect(r.message).toMatch(/Não existe log deste CPE/);
  });
  test('Visualize boot log of an CPE(tr-069): non existent serial',
  async () => {
    let id = 'F1H03H0391FH1091H';
    let res = await request('localhost:8000')
      .get('/api/v2/device/firstlog/'+id)
      .auth('admin', 'landufrj123')
      .expect(200)
      .catch(catchError);
    let r = res.body;
    expect(r.success).toBeFalsy();
    expect(r.message).toMatch(/CPE não encontrado/);
  });

  /* Visualizar último log enviado de um roteador
  localhost:8000/api/v2/device/lastlog/:id GET
  possiveis entradas:
    req.params.id - id(mac/acs_id/serial_tr069) existente
    req.params.id - id(mac/acs_id/serial_tr069) não existente
  possiveis saidas:
    200 - Não existe log deste CPE
    200 - getHeader('Content-Encoding', 'gzip');
          getHeader('Content-Type', 'text/plain');
    500 - Erro interno do servidor
    404 - Roteador não encontrado */

  /* Consultar informações de um roteador
  localhost:8000/api/v2/device/update/:id GET
  possiveis entradas:
    req.params.id - id(mac/acs_id/serial_tr069) existente
    req.params.id - id(mac/acs_id/serial_tr069) não existente
  possiveis saidas:
    200 - { <model/device.js> }
    500 - Erro interno do servidor
    404 - Roteador não encontrado */

  /* Consultar abertura de portas de um roteador
  localhost:8000/api/v2/device/portforward/:id GET
  possiveis entradas:
    req.params.id - id(mac/acs_id/serial_tr069) existente
    req.params.id - id(mac/acs_id/serial_tr069) não existente
  possiveis saidas:
    200 - "landevices": [
        {
            "mac": "f8:77:b8:ff:ff:ff",
            "port": [
                555
            ],
            "dmz": true,
            "router_port": [
                444
            ],
            "name": "",
            "has_dhcpv6": false
        }, ...]
    200 - Erro interno do servidor
    200 - CPE não encontrado
    200 - CPE não possui essa função */

  /* Consultar lista de endereços para teste de ping
  localhost:8000/api/v2/device/pinghostslist/:id GET
  possiveis entradas:
    req.params.id - id(mac/acs_id/serial_tr069) existente
    req.params.id - id(mac/acs_id/serial_tr069) não existente
  possiveis saidas:
    200 - "ping_hosts_list": [
        "www.google.com",...
    ]
    200 - Erro interno do servidor
    200 - CPE não encontrado */

  /* Remover registro de roteador
  localhost:8000/api/v2/device/delete/:id DELETE */

  /*
  Habilitar ou desabilitar atualização de firmware de um roteador
  localhost:8000/api/v2/device/update/:id/:release PUT
  possiveis entradas:
    req.params.id
    req.params.release
    req.body.do_update
  possiveis saidas:
    500 - Dispositivo não encontrado
    500 - Erro ao encontrar dispositivo
    500 - Este CPE é secundário em uma rede mesh...
    500 - Erro ao registrar atualização
    500 - Não existe firmware com essa versão
    500 - <outras mensagens>
    200 - success true

  Enviar comando para um roteador
  localhost:8000/api/v2/device/command/:id/:msg PUT

  Alterar informações de um roteador
  localhost:8000/api/v2/device/update/:id PUT

  Configurar abertura de portas de um roteador
  localhost:8000/api/v2/device/portforward/:id PUT

  Configurar lista de endereços para teste de ping
  localhost:8000/api/v2/device/pinghostslist/:id PUT
  */
  afterAll(async () => {
    if (fakeDevicesInstances.length > 0) {
      await disconnectThemAll(fakeDevicesInstances).catch(catchError);
      fakeDevicesInstances = [];
    }
    await mongooseConnection.disconnect().catch(catchError);
  });
});
