const mongoose = require('mongoose');
const DeviceModel = require('../../models/device');
const DeviceVersion = require('../../models/device_version');

describe('DeviceVersion API', () => {
  let zteF670LData = {
    _id: '0C:F0:B4:46:1F:CE',
    measure_config: {is_active: false},
    use_tr069: true,
    version: 'V1.2.3',
    wifi_state: 0,
    wifi_hidden: 0,
    wifi_power: 100,
    wifi_is_5ghz_capable: true,
    wifi_state_5ghz: 0,
    wifi_hidden_5ghz: 0,
    wifi_power_5ghz: 100,
    upnp_requests: [],
    mesh_mode: 0,
    mesh_slaves: [],
    bridge_mode_enabled: false,
    bridge_mode_switch_disable: true,
    ipv6_enabled: 2,
    do_update_status: 1,
    do_update_mesh_remaining: 0,
    mqtt_secret_bypass: false,
    ping_hosts: [
      'www.google.com',
      'www.youtube.com',
      'www.facebook.com',
      'www.instagram.com',
    ],
    sys_up_time: 631109,
    wan_up_time: 631063,
    latitude: 0,
    longitude: 0,
    wps_is_active: false,
    wps_last_connected_mac: '',
    serial_tr069: 'MKPGB4461FCE',
    acs_id: '0CF0B4-GONUAC001-MKPGB4461FCE',
    model: 'GONUAC001',
    installed_release: 'V1.2.3',
    release: '0000-ONU',
    connection_type: 'pppoe',
    pppoe_user: 'admin123',
    pppoe_password: 'admin123',
    wifi_ssid: 'STAVIX_2.4G_Anlix',
    wifi_channel: '11',
    wifi_mode: '11n',
    wifi_ssid_5ghz: 'STAVIX_5G_Anlix',
    wifi_channel_5ghz: '44',
    wifi_mode_5ghz: '11ac',
    lan_subnet: '192.168.111.1',
    lan_netmask: 24,
    ip: '192.168.89.250',
    wan_ip: '192.168.89.250',
    wan_negociated_speed: '0',
    wan_negociated_duplex: 'Half',
    created_at: {$date: '2021-04-05T17:24:15.174Z'},
    last_contact: {$date: '2021-06-15T20:10:09.061Z'},
    lan_devices: [],
    ap_survey: [],
    mesh_routers: [],
    apps: [],
    speedtest_results: [],
    __v: 1,
    is_license_active: true,
    wifi_password: 'landufrj123',
    wifi_password_5ghz: 'landufrj123',
    do_update_parameters: true,
    external_reference: {data: 'Stavix Greatek', kind: 'Outro'},
    wifi_band: 'auto',
    wifi_band_5ghz: 'auto',
    mesh_id: 'D6q91LT9-7xdYg',
    mesh_key: 'eEITLqC5A0EYIKVbRoIIV8TkmGU',
    pon_status: 'Up',
    pon_txpower: 2,
    pon_rxpower: -13,
    port_forward_rules: [],
    vlan: [],
    acs_sync_loops: 0,
  };

  beforeAll(async () => {
    await mongoose.connect(
      'mongodb://' + process.env.FLM_MONGODB_HOST + ':27017/flashman',
      {
        useNewUrlParser: true,
        serverSelectionTimeoutMS: 2 ** 31 - 1,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true,
      },
      (err) => {
        if (err) {
          console.error(err);
          process.exit(1);
        }
      },
    );
  });

  test('check feature not tr069', () => {
    let device = new DeviceModel({model: 'NOTTR069'});
    expect(DeviceVersion.checkFeature(device.model, 'wps'));
  });

  test('check feature wps F670L', () => {
    let device = new DeviceModel({use_tr069: true, model: 'F670L'});
    expect(DeviceVersion.checkFeature(device.model, 'wps')).toBe(false);
  });

  test('check feature upnp F670L', () => {
    let device = new DeviceModel({use_tr069: true, model: 'F670L'});
    expect(DeviceVersion.checkFeature(device.model, 'upnp')).toBe(false);
  });

  test('check feature speedTest F670L', () => {
    let device = new DeviceModel({use_tr069: true, model: 'F670L'});
    expect(DeviceVersion.checkFeature(device.model, 'speedTest')).toBe(false);
  });

  test('check feature speedTestLimit F670L', () => {
    let device = new DeviceModel({use_tr069: true, model: 'F670L'});
    expect(DeviceVersion.checkFeature(device.model, 'speedTestLimit')).toBe(
      false,
    );
  });

  test('check feature blockDevices F670L', () => {
    let device = new DeviceModel({use_tr069: true, model: 'F670L'});
    expect(DeviceVersion.checkFeature(device.model, 'blockDevices')).toBe(
      false,
    );
  });

  test('check feature wps other model', () => {
    let device = new DeviceModel({use_tr069: true, model: 'GONUAC001'});
    expect(DeviceVersion.checkFeature(device.model, 'wps')).toBe(false);
  });

  test('check feature upnp other model', () => {
    let device = new DeviceModel({use_tr069: true, model: 'GONUAC001'});
    expect(DeviceVersion.checkFeature(device.model, 'upnp')).toBe(false);
  });

  test('check feature speedTest other model', () => {
    let device = new DeviceModel({use_tr069: true, model: 'GONUAC001'});
    expect(DeviceVersion.checkFeature(device.model, 'speedTest')).toBe(false);
  });

  test('check feature speedTestLimit other model', () => {
    let device = new DeviceModel({use_tr069: true, model: 'GONUAC001'});
    expect(DeviceVersion.checkFeature(device.model, 'speedTestLimit')).toBe(
      false,
    );
  });

  test('check feature blockDevices other model', () => {
    let device = new DeviceModel({use_tr069: true, model: 'GONUAC001'});
    expect(DeviceVersion.checkFeature(device.model, 'blockDevices')).toBe(
      false,
    );
  });

  test('without model', () => {
    expect(DeviceVersion.checkFeature('', 'wps')).toBe(true);
  });

  test('empty feature variable', () => {
    let device = new DeviceModel();
    expect(DeviceVersion.checkFeature(device.model, '')).toBe(true);
  });

  test('findByVersion on ZTE F670L', () => {
    let device = new DeviceModel(zteF670LData);
    let expectedResult = {
      grantViewLogs: true,
      grantResetDevices: true,
      grantPortForward: false,
      grantPortForwardAsym: true,
      grantPortOpenIpv6: true,
      grantWifi5ghz: true,
      grantWifiBand: true,
      grantWifiBandAuto: true,
      grantWifiState: true,
      grantWifiPowerHiddenIpv6Box: true,
      grantPingTest: true,
      grantLanEdit: true,
      grantLanGwEdit: true,
      grantLanDevices: true,
      grantSiteSurvey: true,
      grantUpnp: false,
      grantSpeedTest: false,
      grantSpeedTestLimit: 0,
      grantBlockDevices: false,
      grantOpmode: true,
      grantVlanSupport: false,
      grantWanBytesSupport: true,
      grantPonSignalSupport: true,
      grantMeshMode: true,
      grantUpdateAck: false,
      grantWpsFunction: false,
    };

    let permissionTest = DeviceVersion.findByVersion(
      device.version,
      device.wifi_is_5ghz_capable,
      device.model,
    );
    expect(permissionTest).toStrictEqual(expectedResult);
  });
});
