// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const request = require('supertest');
const utilHandler = require('../../controllers/handlers/util');
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
      .catch(utilHandler.catchError);

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
  /* Visualizar log de boot de um roteador
  localhost:8000/api/v2/device/firstlog/:id GET
  possiveis entradas:
    req.params.id - id(mac/serial_tr069) existente
    req.params.id - id(mac/serial_tr069) não existente
  possiveis saidas:
    200 - Não existe log deste CPE
    200 - getHeader('Content-Encoding', 'gzip');
          getHeader('Content-Type', 'text/plain');
    500 - Erro interno do servidor
    404 - Roteador não encontrado */
  test('Visualize first boot log of an CPE(flashbox): existent mac '+
    ' + existent log',
  async () => {
    let id = '80:8F:E8:D4:82:E3';
    let res = await request('localhost:8000')
      .get('/api/v2/device/firstlog/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.header['content-encoding']).toBe('gzip');
    expect(res.header['content-type']).toBe('text/plain');
  });
  test('Visualize first boot log of an CPE(flashbox): existent mac +'+
    ' non existent log',
  async () => {
    let id = 'B0:4E:26:E3:DB:9C';
    let res = await request('localhost:8000')
      .get('/api/v2/device/firstlog/'+id)
      .auth('admin', 'landufrj123');
    let r = res.body;
    expect(res.statusCode).toBe(200);
    expect(r.success).toBeFalsy();
    expect(r.message).toContain('Não existe log deste CPE');
  });
  test('Visualize first boot log of an CPE(flashbox): non existent mac',
  async () => {
    let id = 'FF:FF:FF:FF:FF:FF';
    let res = await request('localhost:8000')
      .get('/api/v2/device/firstlog/'+id)
      .auth('admin', 'landufrj123');
    let r = res.body;
    expect(res.statusCode).toBe(200);
    expect(r.success).toBeFalsy();
    expect(r.message).toContain('não encontrada');
  });
  test('Visualize first boot log of an CPE(tr-069): existent serial +'+
    ' non existent log',
  async () => {
    let id = 'ZTE0QHEL4M05104';
    let res = await request('localhost:8000')
      .get('/api/v2/device/firstlog/'+id)
      .auth('admin', 'landufrj123');
    let r = res.body;
    expect(res.statusCode).toBe(200);
    expect(r.success).toBeFalsy();
    expect(r.message).toContain('Não existe log deste CPE');
  });
  test('Visualize first boot log of an CPE(tr-069): non existent serial',
  async () => {
    let id = 'F1H03H0391FH1091H';
    let res = await request('localhost:8000')
      .get('/api/v2/device/firstlog/'+id)
      .auth('admin', 'landufrj123');
    let r = res.body;
    expect(res.statusCode).toBe(200);
    expect(r.success).toBeFalsy();
    expect(r.message).toContain('não encontrada');
  });

  /* Visualizar último log enviado de um roteador
  localhost:8000/api/v2/device/lastlog/:id GET
  possiveis entradas:
    req.params.id - id(mac/serial_tr069) existente
    req.params.id - id(mac/serial_tr069) não existente
  possiveis saidas:
    200 - Não existe log deste CPE
    200 - getHeader('Content-Encoding', 'gzip');
          getHeader('Content-Type', 'text/plain');
    500 - Erro interno do servidor
    404 - Roteador não encontrado */
test('Visualize last boot log of an CPE(flashbox): existent mac '+
    '+ existent log',
  async () => {
    let id = 'C0:25:E9:88:22:78';
    let res = await request('localhost:8000')
      .get('/api/v2/device/lastlog/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.header['content-encoding']).toBe('gzip');
    expect(res.header['content-type']).toBe('text/plain');
  });
  test('Visualize last boot log of an CPE(flashbox): existent mac +'+
    ' non existent log',
  async () => {
    let id = '80:8F:E8:D4:82:E3';
    let res = await request('localhost:8000')
      .get('/api/v2/device/lastlog/'+id)
      .auth('admin', 'landufrj123');
    let r = res.body;
    expect(res.statusCode).toBe(200);
    expect(r.success).toBeFalsy();
    expect(r.message).toContain('Não existe log deste CPE');
  });
  test('Visualize last boot log of an CPE(flashbox): non existent mac',
  async () => {
    let id = 'EE:EE:EE:EE:EE:EE';
    let res = await request('localhost:8000')
      .get('/api/v2/device/lastlog/'+id)
      .auth('admin', 'landufrj123');
    let r = res.body;
    expect(res.statusCode).toBe(200);
    expect(r.success).toBeFalsy();
    expect(r.message).toContain('não encontrada');
  });
  test('Visualize last boot log of an CPE(tr-069): existent serial +'+
    ' existent log',
  async () => {
    let id = 'ZTE0QHEL4M05104';
    let res = await request('localhost:8000')
      .get('/api/v2/device/lastlog/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.header['content-encoding']).toBe('gzip');
    expect(res.header['content-type']).toBe('text/plain');
  });
  test('Visualize last boot log of an CPE(tr-069): existent serial +'+
    ' non existent log',
  async () => {
    let id = '3FBADE4EAB3913124';
    let res = await request('localhost:8000')
      .get('/api/v2/device/lastlog/'+id)
      .auth('admin', 'landufrj123');
    let r = res.body;
    expect(res.statusCode).toBe(200);
    expect(r.success).toBeFalsy();
    expect(r.message).toContain('Não existe log deste CPE');
  });
  test('Visualize last boot log of an CPE(tr-069): non existent serial',
  async () => {
    let id = 'IB51O24IB21B4I1B';
    let res = await request('localhost:8000')
      .get('/api/v2/device/lastlog/'+id)
      .auth('admin', 'landufrj123');
    let r = res.body;
    expect(res.statusCode).toBe(200);
    expect(r.success).toBeFalsy();
    expect(r.message).toContain('não encontrada');
  });
  /* Consultar informações de um roteador
  localhost:8000/api/v2/device/update/:id GET
  possiveis entradas:
    req.params.id - id(mac/serial_tr069) existente
    req.params.id - id(mac/serial_tr069) não existente
  possiveis saidas:
    200 - { <model/device.js> }
    500 - Erro interno do servidor
    404 - Roteador não encontrado */
  test('Query info of an CPE(flashbox): exists',
  async () => {
    let id = 'A0:F3:C1:92:85:58';
    let res = await request('localhost:8000')
      .get('/api/v2/device/update/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(id);
  });
  test('Query info of an CPE(flashbox): not exists',
  async () => {
    let id = 'DD:DD:DD:DD:DD:DD';
    let res = await request('localhost:8000')
      .get('/api/v2/device/update/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(404);
  });
  test('Query info of an CPE(tr-069): exists by serial',
  async () => {
    let id = 'MKPGB4461FCE';
    let res = await request('localhost:8000')
      .get('/api/v2/device/update/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.serial_tr069).toBe(id);
  });
  test('Query info of an CPE(tr-069): not exists by serial',
  async () => {
    let id = 'MFI3OFMI1FM3';
    let res = await request('localhost:8000')
      .get('/api/v2/device/update/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(404);
  });

  /* Consultar abertura de portas de um roteador
  localhost:8000/api/v2/device/portforward/:id GET
  possiveis entradas:
    req.params.id - id(mac/serial_tr069) existente
    req.params.id - id(mac/serial_tr069) não existente
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
  test('Query port forward of an CPE(flashbox): not exists',
  async () => {
    let id = 'CC:CC:CC:CC:CC:CC';
    let res = await request('localhost:8000')
      .get('/api/v2/device/portforward/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeFalsy();
    expect(res.body.message).toContain('não encontrada');
  });
  test('Query port forward of an CPE(flashbox): exists +'+
    ' do not have this feature',
  async () => {
    let id = 'A0:F3:C1:92:85:58';
    let res = await request('localhost:8000')
      .get('/api/v2/device/portforward/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeFalsy();
    expect(res.body.message).toContain('não possui essa função');
  });
  test('Query port forward of an CPE(flashbox): exists +'+
    ' have this feature',
  async () => {
    let id = 'AC:84:C6:CB:20:77';
    let res = await request('localhost:8000')
      .get('/api/v2/device/portforward/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeTruthy();
    expect(typeof res.body.landevices).toMatch(/object/);
  });
  test('Query port forward of an CPE(tr-069): not exists by serial',
  async () => {
    let id = 'MFI3OFMI1FM3';
    let res = await request('localhost:8000')
      .get('/api/v2/device/portforward/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeFalsy();
    expect(res.body.message).toContain('não encontrada');
  });
  test('Query port forward of an CPE(tr-069): exists by serial +'+
    ' do not have this feature',
  async () => {
    let id = '3FBADE4EAB3913124';
    let res = await request('localhost:8000')
      .get('/api/v2/device/portforward/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeFalsy();
    expect(res.body.message).toContain('não possui essa função');
  });
  test('Query port forward of an CPE(tr-069): exists by serial +'+
    ' have this feature',
  async () => {
    let id = 'ZTEEH7PLA600330';
    let res = await request('localhost:8000')
      .get('/api/v2/device/portforward/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeTruthy();
    expect(typeof res.body.content).toMatch(/object/);
    expect(typeof res.body.compatibility).toMatch(/object/);
  });

  /* Consultar lista de endereços para teste de ping
  localhost:8000/api/v2/device/pinghostslist/:id GET
  possiveis entradas:
    req.params.id - id(mac/serial_tr069) existente
    req.params.id - id(mac/serial_tr069) não existente
  possiveis saidas:
    200 - "ping_hosts_list": [
        "www.google.com",...
    ]
    200 - Erro interno do servidor
    200 - CPE não encontrado */
  test('Query ping test address list of an CPE(flashbox): not exists',
  async () => {
    let id = 'BB:BB:BB:BB:BB:BB';
    let res = await request('localhost:8000')
      .get('/api/v2/device/pinghostslist/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeFalsy();
    expect(res.body.message).toContain('não encontrada');
  });
  test('Query ping test address list of an CPE(flashbox): exists',
  async () => {
    let id = 'CC:32:E5:B2:A5:CE';
    let res = await request('localhost:8000')
      .get('/api/v2/device/pinghostslist/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeTruthy();
    expect(typeof res.body.ping_hosts_list).toMatch(/object/);
  });
  test('Query ping test address list of an CPE(tr-069): not exists by serial',
  async () => {
    let id = 'MFI3OFMI1FM3';
    let res = await request('localhost:8000')
      .get('/api/v2/device/pinghostslist/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeFalsy();
    expect(res.body.message).toContain('não encontrada');
  });
  test('Query ping test address list of an CPE(tr-069): exists by serial',
  async () => {
    let id = '3FBADE4EAB3913124';
    let res = await request('localhost:8000')
      .get('/api/v2/device/pinghostslist/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeTruthy();
    expect(typeof res.body.ping_hosts_list).toMatch(/object/);
  });

  /* Remover registro de roteador
  localhost:8000/api/v2/device/delete/:id DELETE */
  test('Delete a CPE(flashbox): not exists',
  async () => {
    let id = 'AA:AA:AA:AA:AA:AA';
    let res = await request('localhost:8000')
      .delete('/api/v2/device/delete/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeFalsy();
    expect(res.body.type).toMatch(/danger/);
    expect(res.body.message).toContain('não encontrada');
  });
  test('Delete a CPE(flashbox): exists',
  async () => {
    let id = '58:D5:6E:D0:48:00';
    let res = await request('localhost:8000')
      .delete('/api/v2/device/delete/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeTruthy();
    expect(res.body.type).toMatch(/success/);
    expect(res.body.message).toContain('com sucesso');
    let resCheck = await request('localhost:8000')
      .get('/api/v2/device/update/'+id)
      .auth('admin', 'landufrj123');
    expect(resCheck.statusCode).toBe(404);
  });
  test('Delete a CPE(tr-069): not exists by serial',
  async () => {
    let id = 'MFI3OFMI1FM3';
    let res = await request('localhost:8000')
      .delete('/api/v2/device/delete/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeFalsy();
    expect(res.body.type).toMatch(/danger/);
    expect(res.body.message).toContain('não encontrada');
  });
  test('Delete a CPE(tr-069): exists by serial',
  async () => {
    let id = 'ZTEEH7PLA600330';
    let res = await request('localhost:8000')
      .delete('/api/v2/device/delete/'+id)
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeTruthy();
    expect(res.body.type).toMatch(/success/);
    expect(res.body.message).toContain('com sucesso');
    let resCheck = await request('localhost:8000')
      .get('/api/v2/device/update/'+id)
      .auth('admin', 'landufrj123');
    expect(resCheck.statusCode).toBe(404);
  });

  /* Habilitar ou desabilitar atualização de firmware de um roteador
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
    200 - success true */
  test('Enable firwmare update of an CPE(flashbox): not exists',
  async () => {
    let id = 'CC:CC:CC:CC:CC:CC';
    let firmware = '0000-flm';
    let res = await request('localhost:8000')
      .put('/api/v2/device/update/'+id+'/'+firmware)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBeFalsy();
    expect(res.body.message).toContain('não encontrada');
  });
  test('Enable firwmare update of an CPE(flashbox): exists',
  async () => {
    let id = '00:E0:4C:C4:80:14';
    let firmware = 'M119-aix';
    let res = await request('localhost:8000')
      .put('/api/v2/device/update/'+id+'/'+firmware)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeTruthy();
  });
  test('Enable firwmare update of an CPE(tr-069): not exists by serial',
  async () => {
    let id = 'MFI3OFMI1FM3';
    let firmware = 'V1.1.20P1T18';
    let res = await request('localhost:8000')
      .put('/api/v2/device/update/'+id+'/'+firmware)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBeFalsy();
    expect(res.body.message).toContain('não encontrada');
  });

  /* Enviar comando para um roteador
  localhost:8000/api/v2/device/command/:id/:msg PUT
  200 - Erro interno do servidor
  200 - CPE não encontrado
  200 - CPE não possui essa função!
  200 - CPE não esta online!
  200 - Esse comando somente funciona em uma sessão!
  200 - Erro na requisição
  200 - Esse comando não existe
  200 - {success:true} */
  test('Send command to CPE(flashbox): not exists',
  async () => {
    let id = 'BB:BB:BB:BB:BB:BB';
    let res = await request('localhost:8000')
      .put('/api/v2/device/command/'+id+'/onlinedevs')
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeFalsy();
    expect(res.body.message).toContain('não encontrada');
  });
  test('Send command to CPE(flashbox): exists',
  async () => {
    let id = 'B0:4E:26:E3:DB:9C';
    let res = await request('localhost:8000')
      .put('/api/v2/device/command/'+id+'/onlinedevs')
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeTruthy();
  });
  test('Send command to CPE(tr-069): not exists by serial',
  async () => {
    let id = 'MFI3OFMI1FM3';
    let res = await request('localhost:8000')
      .put('/api/v2/device/command/'+id+'/onlinedevs')
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeFalsy();
    expect(res.body.message).toContain('não encontrada');
  });
  test('Send command to CPE(tr-069): exists by serial',
  async () => {
    let id = 'MKPGB4461FCE';
    let res = await request('localhost:8000')
      .put('/api/v2/device/command/'+id+'/onlinedevs')
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  /* Alterar informações de um roteador
  localhost:8000/api/v2/device/update/:id PUT
    500 - Erro interno do servidor
    404 - CPE não encontrado
    500 - Erro ao encontrar configuração
    500 - Tipo de conexão deve ser "pppoe" ou "dhcp"
    403 - Permissão insuficiente para alterar campos requisitados
    500 - Erro ao salvar dados na base
    500 - Erro validando os campos, ver campo "errors"
    500 - Erro ao tratar JSON
    200 - {<device>} */
  test('Set CPE(flashbox) registry: exists',
  async () => {
    let id = '00:E0:4C:C4:80:14';
    let body = {
      'content': {
        'wifi_ssid': 'Teste-Rotas',
      },
    };
    let res = await request('localhost:8000')
      .put('/api/v2/device/update/'+id)
      .send(body)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.wifi_ssid).toBe('Teste-Rotas');
  });
  test('Set CPE(flashbox) registry: not exists',
  async () => {
    let id = 'AA:AA:AA:AA:AA:AA';
    let body = {
      'content': {
        'wifi_ssid': 'Teste-Rotas',
      },
    };
    let res = await request('localhost:8000')
      .put('/api/v2/device/update/'+id)
      .send(body)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain('não encontrada');
  });
  test('Set CPE(tr-069) registry: exists by serial',
  async () => {
    let id = 'ZTEKQHELBU28569';
    let body = {
      'content': {
        'wifi_ssid': 'Teste-Rotas',
      },
    };
    let res = await request('localhost:8000')
      .put('/api/v2/device/update/'+id)
      .send(body)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.wifi_ssid).toBe('Teste-Rotas');
  });
  test('Set CPE(tr-069) registry: not exists by serial',
  async () => {
    let id = 'MFI3OFMI1FM3';
    let body = {
      'content': {
        'wifi_ssid': 'Teste-Rotas',
      },
    };
    let res = await request('localhost:8000')
      .put('/api/v2/device/update/'+id)
      .send(body)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain('não encontrada');
  });

  /* Configurar abertura de portas de um roteador
  localhost:8000/api/v2/device/portforward/:id PUT
  200 - Erro interno do servidor
  200 - CPE não encontrado
  200 - CPE não possui essa função
  200 - Este CPE está em modo bridge, e portanto não pode
   liberar acesso a portas
  200 - Dados de Endereço MAC do Dispositivo Invalidos No JSON
  200 - Portas Internas de Dispositivo invalidas no JSON
  200 - CPE não aceita portas assimétricas
  200 - Portas Externas invalidas no JSON
  200 - Portas Externas Repetidas no JSON
  200 - Portas Internas e Externas não conferem no JSON
  200 - Erro salvando regras no servidor
  200 - Erro ao tratar JSON
  200 - '' (success: true)
  200 - Não é um JSON
  200 - JSON fora do formato
  200 -  <ip> : As portas devem ser números
  200 -  As portas devem estar na faixa entre 1 - 65535 ...
  200 - <ip> : Os campos devem ser preenchidos
  200 - <ip> : As faixas de portas são de tamanhos diferentes
  200 - <ip> : As faixas de portas estão com limites invertidos
  200 - <ip> está fora da faixa de subrede
  200 - Possui mapeamento sobreposto
  200 - Possui regra não compatível
  200 - Erro ao salvar regras no servidor
  200 - Mapeamento de portas no dispositivo <acs_id>
   salvo com sucesso (success: true) */
  test('Set port forward in a CPE(flashbox): exists',
  async () => {
    let id = 'C4:6E:1F:08:82:AD';
    let body = {
      'content': '['+
        '{'+
          '"mac": "DF:EF:AB:12:D2:45",'+
          '"port": [123, 145],'+
          '"dmz": false,'+
          '"router_port": [123, 145]'+
        '}]'};
    let res = await request('localhost:8000')
      .put('/api/v2/device/portforward/'+id)
      .send(body)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeTruthy();
    expect(res.body.message).toBe('');
  });
  test('Set port forward in a CPE(flashbox): not exists',
  async () => {
    let id = 'FF:FF:FF:FF:FF:FF';
    let body = {
      'content': '['+
        '{'+
          '"mac": "DF:EF:AB:12:D2:45",'+
          '"port": [123, 145],'+
          '"dmz": false,'+
          '"router_port": [123, 145]'+
        '}]'};
    let res = await request('localhost:8000')
      .put('/api/v2/device/portforward/'+id)
      .send(body)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeFalsy();
    expect(res.body.message).toContain('não encontrada');
  });
  test('Set port forward in a CPE(tr-069): exists by serial',
  async () => {
    let id = 'ZTE0QHEL4M05104';
    let body = {
      'content': '['+
        '{'+
          '"ip": "192.168.1.10",'+
          '"external_port_start": 1010,'+
          '"external_port_end": 1010,'+
          '"internal_port_start": 1010,'+
          '"internal_port_end": 1010'+
        '}]'};
    let res = await request('localhost:8000')
      .put('/api/v2/device/portforward/'+id)
      .send(body)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeTruthy();
    expect(res.body.message).toContain('com sucesso');
  });
  test('Set port forward in a CPE(tr-069): not exists by serial',
  async () => {
    let id = 'MFI3OFMI1FM3';
    let body = {};
    let res = await request('localhost:8000')
      .put('/api/v2/device/portforward/'+id)
      .send(body)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeFalsy();
    expect(res.body.message).toContain('não encontrada');
  });

  /* Configurar lista de endereços para teste de ping
  localhost:8000/api/v2/device/pinghostslist/:id PUT
  possiveis entradas:
  possiveis saidas:
    200 - CPE não encontrado
    200 - Erro interno do servidor
    200 - Erro ao tratar JSON
    200 - "hosts": [ "www.google.com", ...] */
  test('Set a ping test address list in a CPE(flashbox): exists',
  async () => {
    let id = 'C4:6E:1F:08:82:AD';
    let body = {
      'content': '{'+
        '"hosts":['+
          '"www.npmjs.com",'+
          '"github.com",'+
          '"bitbucket.org"'+
        ']}'};
    let res = await request('localhost:8000')
      .put('/api/v2/device/pinghostslist/'+id)
      .send(body)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeTruthy();
    expect(JSON.stringify(res.body.hosts))
    .toMatch(JSON.stringify(JSON.parse(body.content)['hosts']));
  });
  test('Set a ping test address list in a CPE(flashbox): not exists',
  async () => {
    let id = 'FF:FF:FF:FF:FF:FF';
    let body = {
      'content': '{'+
        '"hosts":['+
          '"www.npmjs.com",'+
          '"github.com",'+
          '"bitbucket.org"'+
        ']}'};
    let res = await request('localhost:8000')
      .put('/api/v2/device/pinghostslist/'+id)
      .send(body)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeFalsy();
    expect(res.body.message).toContain('não encontrada');
  });
  test('Set a ping test address list in a CPE(tr-069): exists by serial',
  async () => {
    let id = '3FBADE4EAB3913124';
    let body = {
      'content': '{'+
        '"hosts":['+
          '"www.npmjs.com",'+
          '"github.com",'+
          '"bitbucket.org"'+
        ']}'};
    let res = await request('localhost:8000')
      .put('/api/v2/device/pinghostslist/'+id)
      .send(body)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeTruthy();
    expect(JSON.stringify(res.body.hosts))
    .toMatch(JSON.stringify(JSON.parse(body.content)['hosts']));
  });
  test('Set a ping test address list in a CPE(tr-069): not exists by serial',
  async () => {
    let id = 'MFI3OFMI1FM3';
    let body = {
      'content': '{'+
        '"hosts":['+
          '"www.npmjs.com",'+
          '"github.com",'+
          '"bitbucket.org"'+
        ']}'};
    let res = await request('localhost:8000')
      .put('/api/v2/device/pinghostslist/'+id)
      .send(body)
      .set('Accept', 'application/json')
      .auth('admin', 'landufrj123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBeFalsy();
    expect(res.body.message).toContain('não encontrada');
  });

  afterAll(async () => {
    if (fakeDevicesInstances.length > 0) {
      await disconnectThemAll(fakeDevicesInstances);
      fakeDevicesInstances = [];
    }
    await mongooseConnection.disconnect().catch(utilHandler.catchError);
  });
});
