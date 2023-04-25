// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const {createSimulator} = require('./cpe-tr069-simulator');
const {pulling} = require('./utils.js');
const blackbox = require('../common/blackbox.js');
const constants = require('../common/constants.js');


describe('api_v2', () => {
  const deviceDataModel =
    'device-00259E-EG8145V5-48575443A94196A5-2023-03-28T154335106Z';

  let adminCookie = null;

  jest.setTimeout( 15*1000 );

  let simulator;

  // returns response from an http request, sent to flashman, with a user
  // already logged in.
  const flashman = (method, url, body) =>
    blackbox.sendRequestAdmin(method, url || '', adminCookie, body);

  beforeAll(async () => {
    const adminLogin = await blackbox.loginAsAdmin();
    adminCookie = adminLogin.header['set-cookie'];

    if (adminCookie === undefined) {
      throw new Error(`Failed to get admin cookie.\n`
      + `Status code: ${adminLogin.statusCode}\n`,
      + `HTTP error: ${adminLogin.error}\n`,
      );
    }

    // Creating a device
    let mac = 'FF:FF:FF:00:00:01';
    const genieAddress = constants.GENIEACS_HOST;
    simulator = createSimulator(genieAddress, deviceDataModel, 1000, mac)
    .debug({
      beforeReady: false,
      error: true,
      xml: false,
      requested: false,
      response: false,
      sent: false,
      task: false,
      diagnostic: false,
    });
    await simulator.start();
  });

  afterAll(async () => {
    if (simulator) await simulator.shutDown();
    await blackbox.deleteCPE(simulator.mac, adminCookie);
  });

  // Device search
  test('/api/v2/device/search - After creation', async () => {
    let res = await flashman('put', '/api/v2/device/search', {
      filter_list: 'online',
    });
    expect(res.statusCode).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(res.header['content-type']).toContain('charset=utf-8');
    expect(res.body.success).toBe(true);
    expect(res.body.status.onlinenum).toBeGreaterThan(0);
    expect(res.body.status.recoverynum).toEqual(0);
    expect(res.body.status.offlinenum).toEqual(0);
    expect(res.body.status.totalnum).toBeGreaterThan(0);
  });

  test('Changing CPE register', async () => {
    let update = {
      content: {
        wifi_ssid: 'some ssid',
        wifi_password: 'somepassword',
      },
    };
    let res =
      await flashman('put', `/api/v2/device/update/${simulator.mac}`, update);
    // console.log('res.body', res.body)
    expect(res.statusCode).toBe(200);
    // eslint-disable-next-line guard-for-in
    for (const field in update.content) {
      expect(res.body[field]).toBe(update.content[field]);
    }

    // Waiting for simulator to process the task, respond and receive answer.
    await simulator.nextTask();

    res = await flashman('get', `/api/v2/device/update/${simulator.mac}`);
    // console.log('res.body', res.body)
    expect(res.statusCode).toBe(200);
    // eslint-disable-next-line guard-for-in
    for (const field in update.content) {
      expect(res.body[field]).toBe(update.content[field]);
    }
  });

  test('Firing ping diagnostic', async () => {
    // starting ping diagnostic.
    let res =
      await flashman('put', `/api/v2/device/command/${simulator.mac}/ping`);
    // console.log('res.body', res.body)
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // awaiting cpe to receive 4 diagnostics. it's always 4.
    await simulator.nextDiagnostic(); // ping 1.
    await simulator.nextDiagnostic(); // ping 2.
    await simulator.nextDiagnostic(); // ping 3.
    await simulator.nextDiagnostic(); // ping 4.
    // waiting for Flashman to ask for final diagnostic result values.
    await simulator.nextTask('GetParameterValues');
    // console.log('waiting Flashman to process the last diagnostic')
    await new Promise((resolve) => setTimeout(resolve, 500));

    // getting cpe until it has all ping diagnostic is not running anymore.
    const ready = await pulling(async () => {
      res = await flashman('get', `/api/v2/device/update/${simulator.mac}`);
      expect(res.statusCode).toBe(200);
      return !res.body.current_diagnostic.in_progress; // success condition.
    }, 200, 5000); // 200ms intervals between executions, fails after 500ms.

    // 'ready' will be true if our function returns true withing the timeout.
    expect(ready).toBe(true);
    expect(res.body.current_diagnostic.in_progress).toBe(false);
    for (const result of res.body.pingtest_results) {
      expect(result.completed).toBe(true);
    }
  });
});
