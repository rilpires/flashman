// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const {createSimulator} = require('./cpe-tr069-simulator');
const blackbox = require('../common/blackbox.js');
const constants = require('../common/constants.js');
const {pulling} = require('./utils.js');

describe('api_v2', () => {
  const deviceModelH199 =
    'device-C0B101-ZXHN%20H199A-ZTEYH86LCN10105-2023-03-28T154022233Z';
  let adminCookie = null;
  jest.setTimeout( 30*1000 );

  beforeAll(async () => {
    const adminLogin = await blackbox.loginAsAdmin();
    adminCookie = adminLogin.header['set-cookie'];

    if (adminCookie === undefined) {
      throw new Error('Failed to get admin cookie');
    }
  });

  // Devicelist page rendered properly
  test('Devicelist page', async () => {
    let response = await blackbox
      .sendRequestAdmin('get', '/devicelist', adminCookie);
    expect(response.statusCode).toBe(200);
    expect(response.header['content-type']).toContain('text/html');
    expect(response.header['content-type']).toContain('charset=utf-8');
    expect(parseInt(response.header['content-length'])).toBeGreaterThan(50000);
  });

  // setLanDeviceName
  describe('setLanDeviceName', () => {
    const mac = 'FF:FF:FF:00:00:01';
    let simulator;

    // Normal operation
    test('Normal operation', async () => {
      const lanDeviceID = 'AA:BB:CC:DD:EE:FF';
      const newLanDeviceName = 'teste123';

      let data = {
        device_id: mac,
        lan_device_id: lanDeviceID,
        name: newLanDeviceName,
      };


      // Start CPE
      simulator = createSimulator(
        constants.GENIEACS_HOST, deviceModelH199, 1000, mac,
      ).debug({ // enabling/disabling prints for device events.
        beforeReady: false,
        error: true,
        xml: false,
        requested: false,
        response: false,
        sent: false,
        task: false,
        diagnostic: false,
      });
      simulator.addLanDevice({
        Active: true,
        HostName: 'test-device',
        IPAddress: '192.168.1.38',
        InterfaceType: 'Ethernet',
        Layer2Interface:
          'InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.2',
        LeaseTimeRemaining: 3000,
        MACAddress: 'AA:BB:CC:DD:EE:FF',
      });
      await simulator.start();


      // Request connected devices in CPE
      let simulatorResponse = await blackbox.sendRequestAdmin(
        'post', '/devicelist/command/' + mac + '/onlinedevs', adminCookie,
      );

      // Validate
      expect(simulatorResponse.statusCode).toBe(200);
      expect(simulatorResponse.body.success).toBe(true);

      // waiting values to be called for in CPE and responded to ACS.
      await simulator.nextTask('GetParameterValues');


      // pulling CPE from flashman and checking if lan device appears.
      const success = await pulling(async () => {
        // getting the CPE.
        let validationResponse = await blackbox.sendRequestAdmin(
          'get', '/devicelist/landevices/' + mac, adminCookie,
        );

        // checking CPE has the lan device and returning result as the success
        // condition for the pulling attempt.
        return validationResponse.body.lan_devices.find(
          (device) => lanDeviceID === device.mac,
        );
      }, 400, 5000); // 400ms intervals between executions, fails after 5000ms.
     
      // 'success' will be true if our pulling returns true withing the timeout.
      expect(success).toBe(true);


      // Execute
      let response = await blackbox
        .sendRequestAdmin(
          'post', '/devicelist/landevice/updatename',
          adminCookie, data,
        );

      // Validate
      expect(response.statusCode).toBe(200);


      // Execute validation
      let validationResponse = await blackbox
        .sendRequestAdmin('get', '/devicelist/landevices/' + mac, adminCookie);

      // Validate
      let lanDevice = validationResponse.body.lan_devices.find(
        (device) => lanDeviceID === device.mac,
      );
      expect(lanDevice.name).toBe(newLanDeviceName);

      await simulator.shutDown();
    });
  });

  // setLanDeviceName
  describe('Testing Search Engine', () => {
    beforeAll(async ()=>{
      await blackbox.deleteAllDevices(adminCookie);
    });

    test('Search operations when empty', async () => {
      let response;
      response = await blackbox
      .sendRequestAdmin('put', '/api/v2/device/search', adminCookie,
        {filter_list: ''},
      );
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status.totalnum).toBe(0);

      response = await blackbox
      .sendRequestAdmin('put', '/api/v2/device/search', adminCookie,
        {filter_list: 'AA'},
      );
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status.totalnum).toBe(0);

      response = await blackbox
      .sendRequestAdmin('put', '/api/v2/device/search', adminCookie,
        {filter_list: 'bb:cc'},
      );
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status.totalnum).toBe(0);

      response = await blackbox
      .sendRequestAdmin('put', '/api/v2/device/search', adminCookie,
        {filter_list: '00:05'},
      );
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status.totalnum).toBe(0);
    });

    test('Search operations when devices present', async () => {
      let macs = [
        'AA:BB:CC:DD:00:00',
        'AA:BB:CC:DD:00:01',
        'AA:BB:CC:DD:00:02',
        'AA:BB:CC:DD:00:03',
        'AA:BB:CC:DD:00:04',
        'AA:BB:CC:DD:00:05',
      ];
      let simulators = macs.map(
        (mac, index) => {
          return createSimulator(
          constants.GENIEACS_HOST, deviceModelH199, index, mac,
          ).debug({ // enabling/disabling prints for device events.
            beforeReady: false,
            error: true,
            xml: true,
            requested: false,
            response: false,
            sent: false,
            task: false,
            diagnostic: false,
          });
        },
      );
      await Promise.all(
        simulators.map( (simulator) => simulator.start() ),
      );

      let response;

      response = await blackbox
      .sendRequestAdmin('put', '/api/v2/device/search', adminCookie,
        {filter_list: ''},
      );
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status.totalnum).toBe(6);

      response = await blackbox
      .sendRequestAdmin('put', '/api/v2/device/search', adminCookie,
        {filter_list: 'AA'},
      );
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status.totalnum).toBe(6);

      response = await blackbox
      .sendRequestAdmin('put', '/api/v2/device/search', adminCookie,
        {filter_list: 'bb:cc'},
      );
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status.totalnum).toBe(6);

      response = await blackbox
      .sendRequestAdmin('put', '/api/v2/device/search', adminCookie,
        {filter_list: '00:05'},
      );
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status.totalnum).toBe(1);

      await Promise.all(
        simulators.map( (simulator) => simulator.shutDown() ),
      );
    });

    afterAll(async ()=>{
      await blackbox.deleteAllDevices(adminCookie);
    });
  });
});
