// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const {createSimulator, formatXML} = require('./cpe-tr069-simulator');
const blackbox = require('../common/blackbox.js');
const constants = require('../common/constants.js');


describe('api_v2', () => {
  const deviceModelH199 = './test/assets/data_models/H199.csv';

  let adminCookie = null;

  jest.setTimeout( 15*1000 );

  const mac = 'FF:FF:FF:00:00:01';
  let simulator;


  beforeAll(async () => {
    const adminLogin = await blackbox.loginAsAdmin();
    adminCookie = adminLogin.header['set-cookie'];

    if (adminCookie === undefined) {
      throw new Error(`Failed to get admin cookie.\n`
      + `Status code: ${adminLogin.statusCode}\n`,
      + `HTTP error: ${adminLogin.error}\n`,
      );
    }
  });

  // Device search
  test('/api/v2/device/search - Before and After creation', async () => {
    let res = await blackbox.sendRequestAdmin(
      'put', '/api/v2/device/search', adminCookie, {filter_list: 'online'},
    );
    expect(res.statusCode).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(res.header['content-type']).toContain('charset=utf-8');
    expect(res.body.success).toBe(true);
    expect(res.body.status.onlinenum).toEqual(0);
    expect(res.body.status.recoverynum).toEqual(0);
    expect(res.body.status.offlinenum).toEqual(0);
    expect(res.body.status.totalnum).toEqual(0);

    // Creating a device
    simulator = createSimulator(
      constants.GENIEACS_HOST, deviceModelH199, 1000, mac,
    ).on('started', () => {
      // console.log('*** simulator started');
    }).on('ready', () => {
      // console.log('*** simulator ready');
    }).on('requested', (request) => {
      // console.log(`- RECEIVED REQUEST BODY '${formatXML(request.body)}'.`);
    }).on('response', (response) => {
      // console.log(`- RECEIVED RESPONSE BODY '${formatXML(response.body)}'.`);
    }).on('sent', (request) => {
      // console.log(`- SENT BODY '${formatXML(request.body)}'.`);
    }).on('task', (task) => {
      // console.log('- PROCESSED task', JSON.stringify(task, null, '  '));
    });
    await simulator.start();

    // Checking new result
    res = await blackbox.sendRequestAdmin(
      'put', '/api/v2/device/search', adminCookie, {filter_list: 'online'},
    );
    expect(res.statusCode).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(res.header['content-type']).toContain('charset=utf-8');
    expect(res.body.success).toBe(true);
    expect(res.body.status.totalnum).toBeGreaterThan(0);
    expect(res.body.status.onlinenum).toBeGreaterThan(0);
    expect(res.body.status.offlinenum).toEqual(0);
  });

  test('Changing CPE register', async () => {
    let update = {
      content: {
        wifi_ssid: 'some ssid',
        wifi_password: 'somepassword',
      },
    };
    let res = await blackbox.sendRequestAdmin(
      'put', '/api/v2/device/update/' + mac, adminCookie, update,
    );
    expect(res.statusCode).toBe(200);
    // eslint-disable-next-line guard-for-in
    for (let field in update.content) {
      expect(res.body[field]).toBe(update.content[field]);
    }

    // Waiting for simulator to process the task, respond and receive answer.
    await simulator.nextTask();

    res = await blackbox.sendRequestAdmin(
      'get', '/api/v2/device/update/' + mac, adminCookie,
    );
    expect(res.statusCode).toBe(200);
    // eslint-disable-next-line guard-for-in
    for (let field in update.content) {
      expect(res.body[field]).toBe(update.content[field]);
    }
  });

  afterAll(async () => {
    await blackbox.deleteCPE(mac, adminCookie);
    if (simulator) await simulator.shutDown();
  });
});
