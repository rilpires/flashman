// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const {createSimulator} = require('./cpe-tr069-simulator');
const {
  pulling,
  sleep,
  startFlashmanDbConnection,
  closeFlashmanDbConnection,
} = require('./utils.js');
const blackbox = require('../common/blackbox.js');
const constants = require('../common/constants.js');

jest.setTimeout( 30*1000 );

describe('Test API v2', () => {
  let adminCookie = null;

  let flashmanDb;
  let flashmanConfig;

  let simulator;

  // returns response from an http request, sent to flashman, with a user
  // already logged in.
  const flashman = (method, route, body) =>
    blackbox.sendRequestAdmin(method, route || '', adminCookie, body);

  beforeAll(async () => {
    // logging into flashman.
    const adminLogin = await blackbox.loginAsAdmin();
    adminCookie = adminLogin.header['set-cookie'];

    if (adminCookie === undefined) {
      throw new Error(`Failed to get admin cookie.\n`
      + `Status code: ${adminLogin.statusCode}\n`,
      + `HTTP error: ${adminLogin.error}\n`,
      );
    }

    flashmanDb = await startFlashmanDbConnection().catch((e) => e);
    expect(flashmanDb).not.toBeInstanceOf(Error);

    const result = await flashmanDb.collection('configs').findOneAndUpdate(
      {is_default: true},
      {$set: {measureServerIP: '127.0.0.1', measureServerPort: '33333'}},
      {
        projection: {measureServerIP: 1, measureServerPort: 1, _id: 0},
        returnNewDocument: false,
      },
    );
    expect(result.ok).toBe(1);
    flashmanConfig = result.value;
  });

  afterAll(async () => {
    // resetting speed test measure server config values to previous values.
    const configUpdate = {$set: {}, $unset: {}};
    // eslint-disable-next-line guard-for-in
    for (let k in flashmanConfig) { // for each parameter in the projection.
      let v = flashmanConfig[k];
      if (v !== undefined) configUpdate.$set[k] = v;
      else configUpdate.$unset[k] = true;
    }
    // eslint-disable-next-line guard-for-in
    for (let k in configUpdate) { // removing empty '$set' and '$unset' parts.
      if (Object.keys(configUpdate[k]).length === 0) delete configUpdate[k];
    }
    let result = await flashmanDb.collection('configs')
      .updateOne({is_default: true}, configUpdate);
    expect(result.acknowledged).toBe(true);
    await closeFlashmanDbConnection();
  });

  const initiateCpe = async (deviceDataModel, mac='FF:FF:FF:00:00:01') => {
    // console.log('=========== Initiating CPE ===========', deviceDataModel);
    const genieAddress = constants.GENIEACS_HOST;
    // Creating a device.
    simulator = createSimulator(genieAddress, deviceDataModel, 1000, mac)
    .debug({ // enabling/disabling prints for device events.
      beforeReady: false,
      error: true,
      requested: false,
      response: false,
      sent: false,
      task: false,
      diagnostic: false,
    });
    await simulator.start(); // starting device.
  };

  const removeCpe = async () => {
    // console.log('=========== Removing CPE ===========');
    if (simulator) await simulator.shutDown();
    let res = await blackbox.deleteCPE(simulator.mac, adminCookie);
  };

  const checkCpeHasBeenRegistered = async () => {
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
  };

  const setCpeParameter = async () => {
    // console.log('=========== Changing CPE register ===========')
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
  };

  const pingDiagnostic = async () => {
    // console.log('=========== Firing ping diagnostic ===========')
    // issuing a ping diagnostic.
    let res =
      await flashman('put', `/api/v2/device/command/${simulator.mac}/ping`);
    // console.log('res.body', res.body)
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // waiting CPE to receive 4 diagnostics. it's always 4.
    await simulator.nextDiagnostic('ping'); // ping target host 1.
    await simulator.nextDiagnostic('ping'); // ping target host 2.
    await simulator.nextDiagnostic('ping'); // ping target host 3.
    await simulator.nextDiagnostic('ping'); // ping target host 4.
    // waiting for Flashman to ask for final diagnostic result values.
    await simulator.nextTask('GetParameterValues');

    // getting CPE until ping diagnostic is not running anymore.
    const success = await pulling(async () => {
      res = await flashman('get', `/api/v2/device/update/${simulator.mac}`);
      expect(res.statusCode).toBe(200);
      return !res.body.current_diagnostic.in_progress; // success condition.
    }, 200, 5000); // 200ms intervals between executions, fails after 5000ms.

    // 'success' will be true if our pulling returns true withing the timeout.
    expect(success).toBe(true);
    expect(res.body.current_diagnostic.in_progress).toBe(false);
    for (const result of res.body.pingtest_results) {
      expect(result.completed).toBe(true);
    }
  };

  const tracerouteDiagnostic = async () => {
    // console.log('=========== Firing ping diagnostic ===========')
    // issuing a traceroute diagnostic.
    const url = `/api/v2/device/command/${simulator.mac}/traceroute`;
    let res = await flashman('put', url);
    // console.log('res.body', res.body)
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // waiting CPE to receive 4 diagnostics. it's always 4.
    await simulator.nextDiagnostic('traceroute'); // traceroute target host 1.
    await simulator.nextDiagnostic('traceroute'); // traceroute target host 2.
    await simulator.nextDiagnostic('traceroute'); // traceroute target host 3.
    await simulator.nextDiagnostic('traceroute'); // traceroute target host 4.
    // waiting for Flashman to ask for final diagnostic result values.
    await simulator.nextTask('GetParameterValues');

    // getting CPE until traceroute diagnostic is not running anymore.
    const success = await pulling(async () => {
      res = await flashman('get', `/api/v2/device/update/${simulator.mac}`);
      // console.log('res.body', res.body);
      expect(res.statusCode).toBe(200);
      return !res.body.current_diagnostic.in_progress; // success condition.
    }, 200, 5000); // 200ms intervals between executions, fails after 5000ms.

    // 'success' will be true if our pulling returns true withing the timeout.
    expect(success).toBe(true);
    expect(res.body.current_diagnostic.in_progress).toBe(false);
    for (const result of res.body.traceroute_results) {
      expect(result.completed).toBe(true);
    }
  };

  const sitesurveyDiagnostic = async () => {
    // console.log('=========== Firing site survey diagnostic ===========')
    // issuing a survey diagnostic.
    const url = `/api/v2/device/command/${simulator.mac}/sitesurvey`;
    let res = await flashman('put', url);
    // console.log('res.body', res.body)
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // waiting CPE to receive diagnostic.
    await simulator.nextDiagnostic('sitesurvey');
    // waiting for Flashman to ask for final diagnostic result values.
    await simulator.nextTask('GetParameterValues');

    // getting CPE until survey diagnostic is not running anymore.
    const success = await pulling(async () => {
      res = await flashman('get', `/api/v2/device/update/${simulator.mac}`);
      // console.log('res.body', res.body)
      expect(res.statusCode).toBe(200);
      return !res.body.current_diagnostic.in_progress; // success condition.
    }, 200, 5000); // 200ms intervals between executions, fails after 5000ms.

    // 'success' will be true if our pulling returns true withing the timeout.
    expect(success).toBe(true);
    expect(res.body.current_diagnostic.in_progress).toBe(false);
    expect(res.body.current_diagnostic.stage).toBe('done');
  };

  const speedtestDiagnostic = async () => {
    // console.log('=========== Firing speed test diagnostic ===========')
    // issuing a speed test diagnostic.
    const url = `/api/v2/device/command/${simulator.mac}/speedtest`;
    let res = await flashman('put', url);
    // console.log('res.body', res.body);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // waiting CPE to receive diagnostic.
    await simulator.nextDiagnostic('speedtest'); // speedtest 1.
    await simulator.nextDiagnostic('speedtest'); // speedtest 2.
    // waiting for Flashman to ask for final diagnostic result values.
    await simulator.nextTask('GetParameterValues');

    // getting CPE until survey diagnostic is not running anymore.
    const success = await pulling(async () => {
      res = await flashman('get', `/api/v2/device/update/${simulator.mac}`);
      // console.log('res.body', res.body)
      expect(res.statusCode).toBe(200);
      return !res.body.current_diagnostic.in_progress; // success condition.
    }, 200, 5000); // 200ms intervals between executions, fails after 5000ms.

    // 'success' will be true if our pulling returns true withing the timeout.
    expect(success).toBe(true);
    expect(res.body.current_diagnostic.in_progress).toBe(false);
    expect(res.body.current_diagnostic.stage).toBe('done');
  };

  describe('TR181', () => {
    beforeAll(() => initiateCpe('device-1C61B4-EX220-2226469000523'));

    afterAll(removeCpe);

    // Device search
    test('/api/v2/device/search - After creation', checkCpeHasBeenRegistered);

    test('Changing CPE register', setCpeParameter);

    test('Firing ping diagnostic', pingDiagnostic);

    test('Firing traceroute diagnostic', tracerouteDiagnostic);

    test('Firing site survey diagnostic', sitesurveyDiagnostic);

    test('Firing speed test diagnostic', speedtestDiagnostic);
  });

  describe('TR098', () => {
    beforeAll(() =>initiateCpe(
      'device-00259E-EG8145V5-48575443A94196A5-2023-03-28T154335106Z'));

    afterAll(removeCpe);

    // Device search
    test('/api/v2/device/search - After creation', checkCpeHasBeenRegistered);

    test('Changing CPE register', setCpeParameter);

    test('Firing ping diagnostic', pingDiagnostic);

    test('Firing traceroute diagnostic', tracerouteDiagnostic);

    // TR098 does not have Site Survey, only on proprietary fields

    test('Firing speed test diagnostic', speedtestDiagnostic);
  });

  let cpeIndex = 1;

  describe.each([
    ['device-1C61B4-EX220-2226469000523'],
    ['device-00259E-EG8145V5-48575443A94196A5-2023-03-28T154335106Z'],
    ['device-9CA2F4-EC220_G5_V2-22282X5007025'],
    ['device-9CA2F4-EC220_G5_V3-22275K2000315'],
    ['device-1C61B4-XX230v-22275A7000395-2023-04-27T154050686Z'],
    ['device-C0B101-ZXHN%20H199A-ZTEYH86LCN10105-2023-03-28T154022233Z'],
    ['device-9075BC-G%2D1425G%2DA-ALCLFC265D6F-2023-03-28T160833431Z'],
    ['device-00E04C-W5%2D2100G-D8365F659C6E'],
  ])('Adding Lan Devices for CPE \'%s\'', (deviceDataModel) => {
    beforeEach(() => initiateCpe(
      deviceDataModel,
      'FF:FF:FF:00:00:'+(cpeIndex%100).toString().padStart(2, 0),
    ));

    afterEach(async () => {
      await removeCpe();
      cpeIndex++;
    });

    test('Getting LAN device added', async () => {
      let lanDeviceMac = 'AA:AA:AA:AA:AA:00';
      simulator.addLanDevice({'mac': lanDeviceMac, 'radio': 2});

      // Requesting connected devices to CPE.
      let res = await flashman('post',
        `/devicelist/command/${simulator.mac}/onlinedevs`);
      // console.log('res.body', res.body);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // waiting values to be called for, in CPE, and responded to ACS.
      await simulator.nextTask('GetParameterValues');
      // Flashman always set a periodic inform after getting lan devices
      // We race that promise with a sleep promise, in case Flashman doesn't.
      await Promise.race([
        simulator.nextTask('SetParameterValues'),
        sleep(2000),
      ]);

      // pulling CPE from Flashman and checking if LAN device appears.
      const success = await pulling(async () => {
        // getting LAN devices from the CPE.
        res = await flashman('get', `/devicelist/landevices/${simulator.mac}`);
        // console.log('res.body', res.body);

        // checking CPE has the LAN device and returning result as the success
        // condition for the pulling attempt.
        return res.body.lan_devices.find((dev) => lanDeviceMac === dev.mac);
      }, 400, 5000); // 400ms intervals between executions, fails after 5000ms.
      // 'success' will be true if our pulling returns true within the timeout.
      expect(success).toBe(true);
      // await new Promise(r => setTimeout(r, 1000))
    });
  });
});
