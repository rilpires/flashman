// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const {createSimulator} = require('./cpe-tr069-simulator');
const blackbox = require('../common/blackbox.js');
const constants = require('../common/constants.js');
const {pulling} = require('./utils.js');

// eslint-disable-next-line no-unused-vars
const _utils = require('../common/utils');
const t = require('../../controllers/language').i18next.t;


const MAX_PAGE_SIZE = 50;


describe('API V3', () => {
  jest.setTimeout( 30*1000 );

  const deviceDataModel =
    'device-C0B101-ZXHN%20H199A-ZTEYH86LCN10105-2023-03-28T154022233Z';
  const macBase = 'FF:FF:FF:00:00:0';
  const lanMacBase = 'AA:BB:CC:00:00:0';
  const lanIPBase = '192.168.55.';
  const lanNameBase = 'test-device-';
  const deviceCount = 6;
  // In seconds
  const apiCallMaxTime = 1;

  let adminCookie = null;
  let simulators = [];
  let macs = [];
  let lanDevMacs = {};

  const getFlashman = (url, query) => blackbox.sendRequestAdmin(
      'get', url || '', adminCookie, null, query,
    );

  beforeAll(async () => {
    // Login
    const adminLogin = await blackbox.loginAsAdmin();
    adminCookie = adminLogin.header['set-cookie'];

    if (adminCookie === undefined) {
      throw new Error(`Failed to get admin cookie.\n`
        + `Status code: ${adminLogin.statusCode}\n`,
        + `HTTP error: ${adminLogin.error}\n`,
      );
    }

    // Create devices
    for (let deviceIndex = 0; deviceIndex < deviceCount; deviceIndex++) {
      // Create a device
      let simulator = createSimulator(
        constants.GENIEACS_HOST, deviceDataModel,
        deviceIndex, macBase + deviceIndex,
      // Enable/Disable prints for device events.
      ).debug({
        beforeReady: false, error: true, requested: false, response: false,
        sent: false, task: false, diagnostic: false,
      });

      // Append LAN devices
      let lanDevices = [];

      for (let lanDevIndex = 0; lanDevIndex < deviceIndex; lanDevIndex++) {
        simulator.addLanDevice({
          Active: lanDevIndex % 2 === 0 ? true : false,
          HostName: lanNameBase + lanDevIndex,
          IPAddress: lanIPBase + lanDevIndex,
          InterfaceType: 'Ethernet',
          LeaseTimeRemaining: 3000,
          MACAddress: lanMacBase + lanDevIndex,
        });

        lanDevices.push(lanMacBase + lanDevIndex);
      }

      simulators.push(simulator);
      macs.push(macBase + deviceIndex);
      lanDevMacs[macBase + deviceIndex] = lanDevices;
    }

    // Start devices
    await Promise.all(simulators.map((simulator) => simulator.start()));
  });

  afterAll(async () => {
    for (let index = 0; index < simulators.length; index++) {
      let simulator = simulators[index];

      if (simulator) await simulator.shutDown();
      await blackbox.deleteCPE(simulator.mac, adminCookie);
    }
  });

  describe('GET routes', () => {
    describe('MAC', () => {
      // Get a device
      test('Get device', async () => {
        const mac = macs[3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac, null,
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(mac);
        expect(response.body.message).toBe(t('OK'));
      });

      // Get a device with specific fields
      test('Get device fields', async () => {
        const mac = macs[3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac,
          {fields: 'version;wan_ip;resources_usage.cpu_usage'},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(mac);
        expect(response.body.message).toBe(t('OK'));
        // _id, version, wan_ip and resources_usage.cpu_usage
        expect(Object.keys(response.body.device).length).toBe(4);
        expect(Object.keys(response.body.device)).toContain('version');
        expect(Object.keys(response.body.device)).toContain('wan_ip');
        expect(Object.keys(response.body.device)).toContain('resources_usage');
      });

      // Get a device with invalid fields
      test('Get device invalid fields', async () => {
        const mac = macs[3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac,
          {fields: 'version;wan_ip;resources_usage.cpu_usage;'},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe(t('mustBeAString'));
      });

      // Get the device with greater than
      test('Valid greater than', async () => {
        const mac = macs[3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac,
          {conditionField: 'resources_usage.cpu_usage', greaterValue: 100},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(mac);
        expect(response.body.message).toBe(t('OK'));
      });

      // No device match with greater than
      test('No device with greater than', async () => {
        const mac = macs[3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac,
          {conditionField: 'wifi_power', greaterValue: 101},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe(t('noDevicesFound'));
      });

      // Get the device with equal value
      test('Valid equal value', async () => {
        const mac = macs[3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac,
          {conditionField: 'wifi_is_5ghz_capable', equalValue: true},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(mac);
        expect(response.body.message).toBe(t('OK'));
      });

      // No device match with equal value
      test('No device with equal value', async () => {
        const mac = macs[3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac,
          {conditionField: 'wifi_is_5ghz_capable', equalValue: false},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe(t('noDevicesFound'));
      });

      // Get the device with lower value
      test('Valid lower value', async () => {
        const mac = macs[3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac,
          {
            conditionField: 'created_at',
            // A date 3 minutes in the future
            lowerValue: new Date(beforeDate.getTime() + 60000 * 3),
          },
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(mac);
        expect(response.body.message).toBe(t('OK'));
      });

      // No device match with lower value
      test('No device with lower value', async () => {
        const mac = macs[3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac,
          {
            conditionField: 'created_at',
            // A date 3 minutes in the past
            lowerValue: new Date(beforeDate.getTime() - 60000 * 3),
          },
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe(t('noDevicesFound'));
      });

      // Get device with invalid condition value
      test('Invalid condition value', async () => {
        const mac = macs[3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac,
          {
            conditionField: 'wps_is_active',
            // A date 3 minutes in the future
            lowerValue: new Date(beforeDate.getTime() + 60000 * 3),
          },
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(t(
          'fieldNameWrongType',
          {name: 'greaterValue/equalValue/lowerValue', dataType: 'Boolean'},
        ));
      });

      // Get device with invalid condition
      test('Invalid condition', async () => {
        const mac = macs[3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac,
          {conditionField: 'wps_is_active'},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(t('emptyField'));
      });

      // Get device with invalid page
      test('Invalid page', async () => {
        const mac = macs[3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac,
          {page: 'abcd'},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(
          t('invalidPageError').replace('({{errorline}})', ''),
        );
      });

      // Get device with invalid pageLimit
      test('Invalid pageLimit', async () => {
        const mac = macs[3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac,
          {pageLimit: 'abcd'},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(
          t('invalidPageError').replace('({{errorline}})', ''),
        );
      });

      // Get device with valid page
      test('Valid page', async () => {
        const mac = macs[3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac,
          {page: 1, pageLimit: 5},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toContain(t('OK'));
      });
    });


    describe('MAC/LAN Devices', () => {
      beforeAll(async () => {
        // Update all LAN devices
        for (let index = 0; index < simulators.length; index++) {
          let simulator = simulators[index];
          const mac = macs[index];

          let simulatorResponse = await blackbox.sendRequestAdmin(
            'post', '/devicelist/command/' + mac + '/onlinedevs', adminCookie,
          );

          // Validate
          expect(simulatorResponse.statusCode).toBe(200);
          expect(simulatorResponse.body.success).toBe(true);

          // Wait values to be called for in CPE and responded to ACS.
          await simulator.nextTask('GetParameterValues');

          // pulling CPE from flashman and checking if lan device appears.
          const success = await pulling(async () => {
            // getting the CPE.
            let validationResponse = await blackbox.sendRequestAdmin(
              'get', '/devicelist/landevices/' + mac, adminCookie,
            );

            // checking CPE has the lan device and returning result as the
            // success condition for the pulling attempt.
            return lanDevMacs[mac].every((lanDevice) =>
              validationResponse.body.lan_devices.some((lanDevice2) =>
                lanDevice2.mac === lanDevice,
              ),
            );

          // 400ms intervals between executions, fails after 5000ms.
          }, 400, 5000);

          // 'success' will be true if our pulling returns true within the
          // timeout.
          expect(success).toBe(true);
        }
      });

      // Get some LAN devices
      test('Get some LAN devices', async () => {
        const mac = macs[4];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac + '/lan-devices',
          {page: 1, pageLimit: 2},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(mac);
        expect(response.body.message).toBe(t('OK'));
        expect(response.body.device.lan_devices.length).toBe(2);
        expect(response.body.device.lan_devices[0].mac).toContain(':00');
        expect(response.body.device.lan_devices[1].mac).toContain(':01');
      });

      // Get other LAN devices
      test('Get other LAN devices', async () => {
        const mac = macs[5];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac + '/lan-devices',
          {page: 2, pageLimit: 3},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(mac);
        expect(response.body.message).toBe(t('OK'));
        expect(response.body.device.lan_devices.length).toBe(2);
        expect(response.body.device.lan_devices[0].mac).toContain(':03');
        expect(response.body.device.lan_devices[1].mac).toContain(':04');
      });

      // Test what happens when using an invalid page
      test('Invalid page', async () => {
        const mac = macs[4];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac + '/lan-devices',
          {page: 5, pageLimit: 100},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(
          t('invalidPageLimitError', {upperLimit: MAX_PAGE_SIZE})
            .replace('({{errorline}})', ''),
        );
      });

      // Get some LAN devices by MAC
      test('Get some LAN devices by MAC', async () => {
        const mac = macs[4];
        const lanMac = lanDevMacs[mac][3];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac + '/lan-devices/mac/' + lanMac,
          {page: 1, pageLimit: 2},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(mac);
        expect(response.body.message).toBe(t('OK'));
        expect(response.body.device.lan_devices.length).toBe(1);
        expect(response.body.device.lan_devices[0].mac).toBe(lanMac);
      });

      // Get a LAN device by name
      test('Get a LAN device by name', async () => {
        const mac = macs[4];
        const lanMac = lanDevMacs[mac][3];
        const newName = 'testName123';

        // Update the name
        let responseUpdateName = await blackbox
        .sendRequestAdmin(
          'post', '/devicelist/landevice/updatename',
          adminCookie, {device_id: mac, lan_device_id: lanMac, name: newName},
        );
        expect(responseUpdateName.statusCode).toBe(200);

        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac + '/lan-devices/name/' + newName,
          {page: 1, pageLimit: 2},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(mac);
        expect(response.body.message).toBe(t('OK'));
        expect(response.body.device.lan_devices.length).toBe(1);
        expect(response.body.device.lan_devices[0].mac).toBe(lanMac);
        expect(response.body.device.lan_devices[0].name).toBe(newName);
      });

      // Get some LAN devices by name
      test('Get some LAN devices by name', async () => {
        const mac = macs[4];
        const lanMac1 = lanDevMacs[mac][2];
        const lanMac2 = lanDevMacs[mac][3];
        const newName = 'testName123';

        // Update the name
        let responseUpdateName = await blackbox.sendRequestAdmin(
          'post', '/devicelist/landevice/updatename',
          adminCookie, {device_id: mac, lan_device_id: lanMac1, name: newName},
        );
        expect(responseUpdateName.statusCode).toBe(200);
        responseUpdateName = await blackbox.sendRequestAdmin(
          'post', '/devicelist/landevice/updatename',
          adminCookie, {device_id: mac, lan_device_id: lanMac2, name: newName},
        );
        expect(responseUpdateName.statusCode).toBe(200);

        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac + '/lan-devices/name/' + newName,
          {page: 1, pageLimit: 2},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(mac);
        expect(response.body.message).toBe(t('OK'));
        expect(response.body.device.lan_devices.length).toBe(2);
        expect(response.body.device.lan_devices[0].mac).toBe(lanMac1);
        expect(response.body.device.lan_devices[1].mac).toBe(lanMac2);
        expect(response.body.device.lan_devices[0].name).toBe(newName);
        expect(response.body.device.lan_devices[1].name).toBe(newName);
      });

      // Specific fields
      test('Specific fields', async () => {
        const mac = macs[4];
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + mac + '/lan-devices',
          {page: 1, pageLimit: 2, fields: 'mac;ip;dhcp_name'},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(mac);
        expect(response.body.message).toBe(t('OK'));
        expect(response.body.device.lan_devices.length).toBe(2);
        expect(Object.keys(response.body.device.lan_devices[0]).length).toBe(3);
        expect(Object.keys(response.body.device.lan_devices[1]).length).toBe(3);

        expect(response.body.device.lan_devices[0].mac).toContain(':00');
        expect(response.body.device.lan_devices[0].ip).toContain(lanIPBase + 0);
        expect(response.body.device.lan_devices[0].dhcp_name).toContain(
          lanNameBase + 0,
        );

        expect(response.body.device.lan_devices[1].mac).toContain(':01');
        expect(response.body.device.lan_devices[1].ip).toContain(lanIPBase + 1);
        expect(response.body.device.lan_devices[1].dhcp_name).toContain(
          lanNameBase + 1,
        );
      });
    });


    describe('PPPoE Username', () => {
      test('Get device', async () => {
        const pppoe = 'admin123';
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/pppoe-username/' + pppoe, null,
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device.pppoe_user).toBe(pppoe);
        expect(response.body.message).toBe(t('OK'));
      });
    });


    describe('Serial TR-069', () => {
      test('Get device', async () => {
        const serial = 5;
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/serial-tr069/' + serial, null,
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(macs[5]);
        expect(response.body.device.serial_tr069).toBe(serial.toString());
        expect(response.body.message).toBe(t('OK'));
      });
    });


    describe('WAN MAC', () => {
      test('Get device', async () => {
        const wanMac = 'C0:B1:01:31:71:6E';
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/wan-mac/' + wanMac, null,
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device.wan_bssid).toBe(wanMac);
        expect(response.body.message).toBe(t('OK'));
      });
    });


    describe('MAC/Site Survey', () => {
      const deviceDataModelTR181 =
        'device-1C61B4-XX230v-22275A7000395-2023-04-27T154050686Z';
      const macTR181 = macBase + deviceCount;
      let simulator = null;

      beforeAll(async () => {
        // Create a new TR-181 simulator as the TR-069 does not have this
        // capability
        simulator = createSimulator(
          constants.GENIEACS_HOST, deviceDataModelTR181, deviceCount, macTR181,
        // Enable/Disable prints for device events.
        ).debug({
          beforeReady: false, error: true, requested: false, response: false,
          sent: false, task: false, diagnostic: false,
        });

        await simulator.start();

        // Send site survey request
        let response = await blackbox.sendRequestAdmin(
          'post',
          '/devicelist/command/' + macTR181 + '/sitesurvey',
          adminCookie,
        );

        // Validate
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);

        // Wait the CPE to do the site survey
        await simulator.nextDiagnostic('sitesurvey');
        await simulator.nextTask('GetParameterValues');

        // Pulling site survey from Flashman and check if it is already done
        const success = await pulling(async () => {
          // getting the CPE.
          response = await blackbox.sendRequestAdmin(
            'put', '/devicelist/search/', adminCookie,
            {filter_list: macTR181},
          );

          // Check the CPE has already done the site survey
          expect(response.statusCode).toBe(200);
          return !response.body.devices[0].current_diagnostic.in_progress;

        // 200ms intervals between executions, fails after 5000ms.
        }, 200, 5000);

        // 'success' will be true if our pulling returns true within the
        // timeout.
        expect(success).toBe(true);
        expect(response.body.devices[0].current_diagnostic.in_progress)
          .toBe(false);
        expect(response.body.devices[0].current_diagnostic.stage)
          .toBe('done');
      });

      afterAll(async () => {
        if (simulator) await simulator.shutDown();
        await blackbox.deleteCPE(macTR181, adminCookie);
      });

      // Get a site survey
      test('Get Site Survey', async () => {
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + macTR181 + '/site-survey', null,
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(macTR181);
        expect(response.body.message).toBe(t('OK'));

        let apSurvey = response.body.device.ap_survey;
        expect(apSurvey.length).toBe(20);
        apSurvey.forEach(
          (ap) => expect(ap.ssid).toContain('my beautiful SSID'),
        );
      });

      // Get a site survey paginated
      test('Get Site Survey paginated', async () => {
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/mac/' + macTR181 + '/site-survey',
          {page: 2, pageLimit: 4},
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(macTR181);
        expect(response.body.message).toBe(t('OK'));

        let apSurvey = response.body.device.ap_survey;
        expect(apSurvey.length).toBe(4);
        apSurvey.forEach(
          (ap) => expect(ap.ssid).toContain('my beautiful SSID'),
        );
        expect(apSurvey[0].ssid).toContain('4');
        expect(apSurvey[1].ssid).toContain('5');
        expect(apSurvey[2].ssid).toContain('6');
        expect(apSurvey[3].ssid).toContain('7');
      });
    });


    describe('External Reference', () => {
      const referenceBase = 'testName-';

      beforeAll(async () => {
        // Set the reference to all devices
        for (let index = 0; index < macs.length; index++) {
          const mac = macs[index];
          const toUpdate = {content: {
            external_reference: {
              kind: t('Other'),
              data: referenceBase + index,
            },
          }};

          // Change the external reference
          let response = await blackbox.sendRequestAdmin(
            'post', '/devicelist/update/' + mac, adminCookie, toUpdate,
          );

          // Validate
          expect(response.statusCode).toBe(200);
        }
      });

      test('Get device', async () => {
        const reference = referenceBase + 2;
        const beforeDate = new Date();
        // Pick a random device
        let response = await getFlashman(
          '/api/v3/device/external-reference-data/' + reference, null,
        );
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.device._id).toBe(macs[2]);
        expect(response.body.device.external_reference.data).toBe(reference);
        expect(response.body.message).toBe(t('OK'));
      });
    });


    describe('Search', () => {
      // Test each query parameter that can be passed
      test.each([
        // Alert
        [{alert: true}, 0], [{alert: false}, deviceCount],
        // Online
        [{online: true}, deviceCount], [{online: false}, deviceCount],
        // Offline
        [{offline: true}, 0], [{offline: false}, deviceCount],
        // Unstable
        [{unstable: true}, 0], [{unstable: false}, deviceCount],
        // No Signal
        [{noSignal: true}, deviceCount], [{unstable: false}, deviceCount],
        // Flashbox
        [{flashbox: true}, 0], [{flashbox: false}, deviceCount],
        // TR-069
        [{tr069: true}, deviceCount], [{tr069: false}, deviceCount],
        // Signal
        [{signal: 'bad'}, 0], [{signal: 'weak'}, 0], [{signal: 'good'}, 0],
        [{signal: 'bad;weak'}, 0], [{signal: 'weak;good'}, 0],
        [{signal: 'bad;good'}, 0], [{signal: 'bad;weak;good'}, 0],
        // IPv6
        [{ipv6: 'off'}, 0], [{ipv6: 'on'}, 0], [{ipv6: 'unknown'}, deviceCount],
        [{ipv6: 'off;on'}, 0], [{ipv6: 'on;unknown'}, 0],
        [{ipv6: 'off;unknown'}, 0], [{ipv6: 'off;on;unknown'}, 0],
        // Mesh
        [{mesh: 'off'}, deviceCount], [{mesh: 'on'}, 0],
        // Mode
        [{mode: 'router'}, deviceCount], [{mode: 'bridge'}, 0],
        // Online For
        [{onlineFor: 1}, 0],
        // Offline For
        [{offlineFor: 1}, 0],
        // Query
        [{query: macBase + 3}, 1], [{query: macBase + '3;' + macBase + 2}, 0],
        // Exclude
        [{exclude: macBase + 3}, deviceCount - 1],
      ])('Test many - %p', async (query, devices) => {
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(devices > 0 ? 200 : 404);
        expect(response.body.devices.length).toBe(devices);
      });

      // Get specific fields
      test('Specific Fields', async () => {
        const query = {query: macs[4], fields: 'ip;version;wifi_bssid'};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.devices.length).toBe(1);

        const deviceKeys = Object.keys(response.body.devices[0]);
        expect(deviceKeys.length).toBe(5);
        expect(deviceKeys).toContain('_id');
        expect(deviceKeys).toContain('id');
        expect(deviceKeys).toContain('ip');
        expect(deviceKeys).toContain('version');
        expect(deviceKeys).toContain('wifi_bssid');
      });

      // Test the pagination
      test('Pagination', async () => {
        const query = {fields: '_id', sortOn: '_id', page: 3, pageLimit: 1};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.devices.length).toBe(1);
        expect(response.body.devices[0]._id).toBe(macs[2]);

        const deviceKeys = Object.keys(response.body.devices[0]);
        expect(deviceKeys.length).toBe(2);
        expect(deviceKeys).toContain('_id');
      });

      // Invalid page as number
      test('Invalid page - number', async () => {
        const query = {page: 0, pageLimit: 1};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.devices.length).toBe(0);
        expect(response.body.message).toContain(
          t('invalidPageError').replace('({{errorline}})', ''),
        );
      });

      // Invalid page as string
      test('Invalid page - string', async () => {
        const query = {page: 'test', pageLimit: 1};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.devices.length).toBe(0);
        expect(response.body.message).toContain(
          t('invalidPageError').replace('({{errorline}})', ''),
        );
      });

      // Invalid page limit as number
      test('Invalid page limit - number', async () => {
        const query = {page: 1, pageLimit: 0};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.devices.length).toBe(0);
        expect(response.body.message).toContain(
          t('invalidPageError').replace('({{errorline}})', ''),
        );
      });

      // Invalid page limit as big number
      test('Invalid page limit - big number', async () => {
        const query = {page: 1, pageLimit: MAX_PAGE_SIZE + 1};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.devices.length).toBe(0);
        expect(response.body.message).toContain(
          t('invalidPageLimitError', {upperLimit: MAX_PAGE_SIZE})
            .replace('({{errorline}})', ''),
        );
      });

      // Invalid page limit as string
      test('Invalid page limit - string', async () => {
        const query = {page: 1, pageLimit: 'test'};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.devices.length).toBe(0);
        expect(response.body.message).toContain(
          t('invalidPageError').replace('({{errorline}})', ''),
        );
      });

      // Test ascending order
      test('Ascending order', async () => {
        const query = {
          fields: '_id', sortOn: '_id', sortType: 'asc', page: 5, pageLimit: 1,
        };
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.devices[0]._id).toBe(macs[4]);
      });

      // Test descending order
      test('Descending order', async () => {
        const query = {
          fields: '_id', sortOn: '_id', sortType: 'desc', page: 5, pageLimit: 1,
        };
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.devices[0]._id).toBe(macs[1]);
      });

      // Test operation
      test('Operation', async () => {
        const query = {
          fields: '_id', sortOn: '_id', sortType: 'asc',
          operation: 'or', query: macs[3] + ';' + macs[4],
        };
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(200);
        expect(response.body.devices.length).toBe(2);
        expect(response.body.devices[0]._id).toBe(macs[3]);
        expect(response.body.devices[1]._id).toBe(macs[4]);
      });

      // Test what happens with a bunch of ';' in fields
      test('Invalid fields', async () => {
        const query = {
          fields: ';;;', sortOn: '_id', sortType: 'asc',
          operation: 'or', query: macs[3] + ';' + macs[4],
        };
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(
          t('fieldNameInvalid', {name: 'fields'})
            .replace('({{errorline}})', ''),
        );
      });

      // Test what happens with an invalid online option
      test('Invalid online', async () => {
        const query = {fields: '_id', online: 'trulse'};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(
          t('fieldNameInvalid', {name: 'online'})
            .replace('({{errorline}})', ''),
        );
      });

      // Test what happens with an invalid signal option
      test('Invalid signal', async () => {
        const query = {fields: '_id', signal: 'tooBad'};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(
          t('fieldNameInvalid', {name: 'signal'})
            .replace('({{errorline}})', ''),
        );
      });

      // Test what happens with an invalid ipv6 option
      test('Invalid ipv6', async () => {
        const query = {fields: '_id', ipv6: 'doNotKnow'};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(
          t('fieldNameInvalid', {name: 'ipv6'})
            .replace('({{errorline}})', ''),
        );
      });

      // Test what happens with an invalid mesh option
      test('Invalid mesh', async () => {
        const query = {fields: '_id', mesh: 'both'};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(
          t('fieldNameInvalid', {name: 'mesh'})
            .replace('({{errorline}})', ''),
        );
      });

      // Test what happens with an invalid mode option
      test('Invalid mode', async () => {
        const query = {fields: '_id', mode: 'both'};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(
          t('fieldNameInvalid', {name: 'mode'})
            .replace('({{errorline}})', ''),
        );
      });

      // Test what happens with an invalid onlineFor number
      test('Invalid onlineFor - number', async () => {
        const query = {fields: '_id', onlineFor: 0};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(t('valueInvalid'));
      });

      // Test what happens with an invalid onlineFor number
      test('Invalid onlineFor - string', async () => {
        const query = {fields: '_id', onlineFor: 'test'};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(t('valueInvalid'));
      });

      // Test what happens with an exclude and an operation or
      test('Operation "or" + exclude', async () => {
        const query = {fields: '_id', operation: 'or', exclude: macs[4]};
        const beforeDate = new Date();
        let response = await getFlashman('/api/v3/device/search/', query);
        const afterDate = new Date();

        expect((afterDate - beforeDate) / 1000).toBeLessThan(apiCallMaxTime);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(
          t('queryWithOrAndExclude').replace('({{errorline}})', ''),
        );
      });
    });
  });
});
