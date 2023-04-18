// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const {createSimulator} = require('./cpe-tr069-simulator');
const blackbox = require('../common/blackbox.js');
const constants = require('../common/constants.js');

describe('api_v2', () => {
  const mac = 'FF:FF:FF:00:00:01';
  const deviceModelH199 = './test/assets/data_models/H199.csv';

  let adminCookie = null;
  let simulator;

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
      .sendRequest('get', '/devicelist', adminCookie);
    expect(response.statusCode).toBe(200);
    expect(response.header['content-type']).toContain('text/html');
    expect(response.header['content-type']).toContain('charset=utf-8');
    expect(parseInt(response.header['content-length'])).toBeGreaterThan(50000);
  });


  // setLanDeviceName
  describe('setLanDeviceName', () => {
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
      );
      await simulator.start();


      // Request connected devices in CPE
      let simulatorResponse = await blackbox.sendRequest(
        'post', '/devicelist/command/' + mac + '/onlinedevs', adminCookie,
      );
      await simulator.nextTask();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Validate
      expect(simulatorResponse.body.success).toBe(true);


      // Execute
      let response = await blackbox
        .sendRequest(
          'post', '/devicelist/landevice/updatename',
          adminCookie, data,
        );

      // Validate
      expect(response.statusCode).toBe(200);


      // Execute validation
      let validationResponse = await blackbox
        .sendRequest('get', '/devicelist/landevices/' + mac, adminCookie);

      // Validate
      let lanDevice = validationResponse.body.lan_devices.find(
        (device) => lanDeviceID === device.mac,
      );
      expect(lanDevice.name).toBe(newLanDeviceName);
    });
  });


  afterAll(async () => {
    await blackbox.deleteCPE(mac, adminCookie);
    if (simulator) await simulator.shutDown();
  });
});
