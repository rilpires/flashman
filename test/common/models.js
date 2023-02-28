const v8 = require('v8');


let models = {};

// Firmwares
models.defaultMockFirmwares = [
  // TR-069
  {
    _id: '638f927dd05676c90dbdeeba',
    wan_proto: '',
    flashbox_version: '',
    is_beta: false,
    is_restricted: false,
    cpe_type: 'tr069',
    vendor: 'Intelbras',
    model: 'WiFiber 121 AC',
    version: '1.1-220505',
    release: '1.1-220505',
    filename: 'ONT121AC_inMesh_1.1-220505.tar',
    __v: 0,
  },

  // Firmware
  {
    _id: '6363cdadde21785b7cc68c3d',
    wan_proto: 'DHCP',
    flashbox_version: '0.35.1',
    is_beta: false,
    is_restricted: false,
    cpe_type: 'flashbox',
    vendor: 'INTELBRAS',
    model: 'ACTIONRG1200',
    version: 'V1',
    release: '0234-aix',
    filename: 'INTELBRAS_ACTIONRG1200_V1_0234-aix.bin',
    __v: 0,
  },
];


// Devices
models.defaultMockDevices = [
  // TR-069
  {
    _id: 'AA:AA:AA:AA:AA:87',
    current_diagnostic: {
      type: 'traceroute',
      stage: 'done',
      customized: false,
      in_progress: false,
      started_at: Date('2022-12-08T14:24:22.114Z'),
      last_modified_at: Date('2022-12-08T14:30:07.865Z'),
      targets: [
        'www.google.com',
        'www.youtube.com',
        'www.facebook.com',
        'www.instagram.com',
      ],
      user: 'admin',
      webhook_url: '',
      webhook_user: '',
      webhook_secret: '',
      recursion_state: 5,
    },
    custom_tr069_fields: {
      voip_enabled: false,
      ipv6_enabled: false,
      ipv6_mode: '',
    },
    use_tr069: true,
    secure_tr069: false,
    acs_sync_loops: 0,
    recovering_tr069_reset: false,
    version: '1.1-220826',
    wifi_state: 1,
    wifi_hidden: 0,
    wifi_power: 100,
    wifi_is_5ghz_capable: true,
    wifi_state_5ghz: 1,
    wifi_hidden_5ghz: 0,
    wifi_power_5ghz: 100,
    upnp_requests: [],
    mesh_mode: 0,
    mesh_slaves: [],
    mesh_father: '',
    bridge_mode_enabled: false,
    bridge_mode_switch_disable: true,
    wan_ipv4_mask: 0,
    wan_ipv6_mask: 0,
    ipv6_enabled: 2,
    do_update_status: 1,
    mesh_onlinedevs_remaining: 0,
    mesh_update_remaining: [],
    mqtt_secret_bypass: false,
    ping_hosts: [
      'www.google.com',
      'www.youtube.com',
      'www.facebook.com',
      'www.instagram.com',
    ],
    sys_up_time: 81044,
    wan_up_time: 81008,
    latitude: 0,
    longitude: 0,
    stop_coordinates_update: false,
    wps_is_active: false,
    wps_last_connected_mac: '',
    cpu_usage: 101,
    memory_usage: 101,
    traceroute_max_hops: 20,
    traceroute_number_probes: 3,
    traceroute_max_wait: 1,
    serial_tr069: '505442518DC45D87',
    alt_uid_tr069: 'AA:AA:AA:AA:AA:87',
    acs_id: '24FD0D-xPON-505442518DC45D87',
    custom_inform_interval: 56,
    model: '121AC',
    hw_version: '121AC_v1.0',
    installed_release: '1.1-220826',
    release: '1.1-220826',
    connection_type: 'pppoe',
    pppoe_user: 'admin123',
    pppoe_password: '',
    wan_vlan_id: 10,
    wan_mtu: 1492,
    wifi_ssid: 'ANLIX_WiFiber121AC',
    wifi_bssid: 'AA:AA:AA:AA:AA:89',
    wifi_channel: 'auto',
    wifi_ssid_5ghz: 'ANLIX_WiFiber121AC_5G',
    wifi_bssid_5ghz: 'AA:AA:AA:AA:AA:88',
    wifi_channel_5ghz: 'auto',
    wifi_mode_5ghz: '11ac',
    wifi_band_5ghz: 'VHT80',
    lan_subnet: '192.168.1.1',
    lan_netmask: 24,
    ip: '192.168.89.59',
    wan_ip: '192.168.89.59',
    wan_negociated_speed: '1000',
    wan_negociated_duplex: 'Full',
    created_at: Date('2022-12-06T18:23:30.688Z'),
    last_contact: Date('2022-12-14T21:17:38.342Z'),
    last_tr069_sync: Date('2022-12-14T21:12:59.930Z'),
    isSsidPrefixEnabled: false,
    web_admin_password: 'teste123',
    mesh_key: '1l5fgpYZo46q3RmzuMYbZQBjSxU',
    mesh_id: '4ne9rhQHXF8UCg',
    bssid_mesh2: 'AA:AA:AA:AA:BB:8A',
    bssid_mesh5: 'AA:AA:AA:AA:BB:89',
    lan_devices: [],
    port_mapping: [],
    ap_survey: [],
    mesh_routers: [],
    apps: [],
    pingtest_results: [],
    speedtest_results: [],
    vlan: [],
    traceroute_results: [],
    __v: 1,
    do_update: false,
    last_contact_daily: Date('2022-12-14T12:31:17.866Z'),
    pon_signal_measure: {
      1671052379: [-14, 3],
    },
    wan_bytes: {
      1671052379: [14152477, 4451655],
    },
    wifi_band: 'HT40',
    wifi_last_channel: '11',
    wifi_last_channel_5ghz: '161',
    wifi_mode: '11n',
    do_update_parameters: true,
    external_reference: {
      data: '',
      kind: 'CPF',
    },
    wifi_password_5ghz: 'teste123',
    wifi_password: 'teste123',
    pon_rxpower: -14,
    pon_txpower: 3,
  },

  // Firmware
  {
    _id: 'BB:BB:BB:BB:BB:3C',
    current_diagnostic: {
      recursion_state: 5,
      targets: [],
      webhook_url: '',
      webhook_user: '',
      webhook_secret: '',
    },
    custom_tr069_fields: {
      voip_enabled: false,
      ipv6_enabled: false,
      ipv6_mode: '',
    },
    use_tr069: false,
    secure_tr069: true,
    acs_sync_loops: 0,
    recovering_tr069_reset: false,
    version: '0.35.1',
    wifi_state: 1,
    wifi_hidden: 0,
    wifi_power: 100,
    wifi_is_5ghz_capable: true,
    wifi_state_5ghz: 1,
    wifi_hidden_5ghz: 0,
    wifi_power_5ghz: 100,
    upnp_requests: [],
    mesh_mode: 0,
    mesh_slaves: [],
    mesh_father: '',
    bridge_mode_enabled: false,
    bridge_mode_switch_disable: false,
    wan_ipv4_mask: 0,
    wan_ipv6_mask: 0,
    ipv6_enabled: 1,
    do_update_status: 1,
    mesh_onlinedevs_remaining: 0,
    mesh_update_remaining: [],
    mqtt_secret_bypass: false,
    ping_hosts: [
      'www.google.com',
      'www.youtube.com',
      'www.facebook.com',
      'www.instagram.com',
    ],
    sys_up_time: 420,
    wan_up_time: 366,
    latitude: 0,
    longitude: 0,
    stop_coordinates_update: false,
    wps_is_active: false,
    wps_last_connected_mac: '',
    cpu_usage: 10,
    memory_usage: 101,
    traceroute_max_hops: 20,
    traceroute_number_probes: 3,
    traceroute_max_wait: 1,
    created_at: Date('2022-11-03T14:10:50.553Z'),
    model: 'ACTIONRG1200V1',
    installed_release: '0000-flm',
    release: '0234-aix',
    pppoe_user: '',
    pppoe_password: '',
    lan_subnet: '10.0.0.1',
    lan_netmask: 24,
    wifi_ssid: 'INTELBRAS',
    wifi_password: 'teste123',
    wifi_channel: 'auto',
    wifi_last_channel: '6',
    wifi_band: 'auto',
    wifi_last_band: '20',
    wifi_mode: '11n',
    wifi_ssid_5ghz: 'INTELBRAS_5G',
    wifi_password_5ghz: 'teste123',
    wifi_channel_5ghz: '40',
    wifi_last_channel_5ghz: '40',
    wifi_band_5ghz: 'auto',
    wifi_last_band_5ghz: '80',
    wifi_mode_5ghz: '11ac',
    wan_ip: '192.168.88.174',
    wan_ipv6: '2804:3e0:0:4200:463b:32ff:fea2:a63c',
    wan_negociated_speed: '1000',
    wan_negociated_duplex: 'full',
    ip: '::ffff:192.168.88.174',
    last_contact: Date('2022-12-07T20:23:24.920Z'),
    do_update: false,
    do_update_parameters: false,
    bridge_mode_ip: '',
    bridge_mode_gateway: '',
    bridge_mode_dns: '',
    mesh_id: 'fiS7RbkWjyrj3w',
    mesh_key: 'YctGqJuRYRXmskwqFW5b1g2SIFA',
    bssid_mesh2: 'BB:BB:BB:BB:A7:3C',
    bssid_mesh5: 'BB:BB:BB:BB:A8:3C',
    isSsidPrefixEnabled: false,
    vlan: [{
      vlan_id: 1,
      _id: '6363cbe8de21767b7cc68bd5',
      port: 1,
    }, {
      vlan_id: 1,
      _id: '6363cbeada21785b7cc68bd6',
      port: 2,
    }, {
      vlan_id: 1,
      _id: '6363cbeade21765b7cc68bd7',
      port: 3,
    }],
    lan_devices: [],
    port_mapping: [],
    ap_survey: [],
    mesh_routers: [],
    apps: [],
    pingtest_results: [],
    speedtest_results: [],
    traceroute_results: [],
    connection_type: 'dhcp',
    __v: 0,
    lastboot_date: Date('2022-12-07T20:17:19.274Z'),
    lastboot_log: Buffer.from('Teste1', 'utf8').toString('base64'),
    ntp_status: '0.000121',
    firstboot_date: Date('2022-11-25T13:16:49.281Z'),
    firstboot_log: Buffer.from('Teste2', 'utf8').toString('base64'),
    wan_bytes: {
      1669130021: [10728, 12994],
    },
    mqtt_secret: '0QwxSbNfe3DgTk7IJF3EZtSkjDiUt5Rb',
  },
];


// Configs
models.defaultMockConfigs = [
  {
    _id: '62b9f57c6beaae3b4f9d4656',
    tr069: {
      server_url: '192.168.88.72',
      web_login: 'admin',
      web_password: 'teste123',
      connection_login: 'teste123',
      connection_password: 'teste321',
      remote_access: false,
      inform_interval: 60000,
      sync_interval: 300000,
      recovery_threshold: 1,
      offline_threshold: 3,
      pon_signal_threshold: -18,
      pon_signal_threshold_critical: -23,
      pon_signal_threshold_critical_high: 3,
      stun_enable: false,
      insecure_enable: true,
      has_never_enabled_insecure: false,
      onu_factory_credentials: {
        credentials: [],
      },
    },
    certification: {
      wan_step_required: true,
      ipv4_step_required: true,
      ipv6_step_required: false,
      dns_step_required: true,
      flashman_step_required: true,
      speedtest_step_required: false,
    },
    device_update_schedule: {
      rule: {
        timeout_enable: false,
        timeout_period: 1440,
        to_do_devices: [],
        in_progress_devices: [],
        done_devices: [{
          slave_count: 0,
          slave_updates_remaining: 1,
          mesh_current: 0,
          mesh_upgrade: 0,
          _id: '639a0a435e15c28897333b70',
          mac: 'AA:AA:AA:AA:AA:87',
          state: 'aborted_down',
        }],
        release: '61.1-220826',
      },
      is_active: true,
      is_aborted: true,
      device_count: 1,
      allowed_time_ranges: [],
      date: Date('2022-12-14T17:17:07.557Z'),
      used_csv: false,
      used_search: '\'online\'',
      used_time_range: false,
    },
    traps_callbacks: {
      devices_crud: [{
        _id: '62f3f6246e396a462d302926',
        url: 'http://192.168.88.34:8080/api/v1/internaltrap/flashman/generic',
      }],
      users_crud: [],
      roles_crud: [],
      certifications_crud: [],
    },
    is_default: true,
    autoUpdate: true,
    hasUpdate: true,
    hasMajorUpdate: false,
    pppoePassLength: 1,
    measureServerPort: 25752,
    auth_pubkey: `-----BEGIN PUBLIC KEY-----
      AAAAAAATESTESTESTESTETSTESTETSTESTETSE
      -----END PUBLIC KEY-----`,
    auth_privkey: `-----BEGIN PRIVATE KEY-----
      AAAAAAATESTESTESTESTETSTESTETSTESTETSE
      -----END PRIVATE KEY-----`,
    androidLink: '',
    iosLink: '',
    personalizationHash: '',
    licenseApiSecret: '',
    company: '',
    mqtt_secret_bypass: false,
    vlans_profiles: [{
      _id: '62b9f57ffd6c5f3b883a3468',
      vlan_id: 1,
      profile_name: 'LAN',
    }],
    __v: 8,
    language: 'pt-BR',
    isSsidPrefixEnabled: false,
    ssidPrefix: '',
    measureServerIP: '192.168.88.218',
    blockLicenseAtDeviceRemoval: false,
    default_ping_hosts: [],
  },
];


// Roles
models.defaultMockRoles = [
  {
    _id: '636181e078ffa476f1c2a083',
    is_hidden: true,
    grantWifiInfo: 2,
    grantPPPoEInfo: 2,
    grantPassShow: true,
    grantFirmwareUpgrade: true,
    grantMassFirmwareUpgrade: true,
    grantWanType: true,
    grantDeviceId: true,
    grantDeviceActions: true,
    grantDeviceRemoval: true,
    grantDeviceMassRemoval: true,
    grantDeviceLicenseBlock: true,
    grantFactoryReset: true,
    grantDeviceAdd: true,
    grantMonitorManage: true,
    grantFirmwareManage: true,
    grantUserManage: true,
    grantFlashmanManage: true,
    grantAPIAccess: true,
    grantDiagAppAccess: true,
    grantCertificationAccess: 0,
    grantLOGAccess: true,
    grantNotificationPopups: true,
    grantLanEdit: true,
    grantLanDevices: 2,
    grantSiteSurvey: true,
    grantLanDevicesBlock: true,
    grantMeasureDevices: 1,
    grantOpmodeEdit: true,
    grantVlan: 0,
    grantVlanProfileEdit: true,
    grantStatisticsView: true,
    grantCsvExport: true,
    grantSearchLevel: 2,
    grantShowSearchSummary: true,
    grantShowRowsPerPage: true,
    grantFirmwareBetaUpgrade: true,
    grantFirmwareRestrictedUpgrade: true,
    grantSlaveDisassociate: true,
    name: 'admin',
    __v: 0,
  },
];


/*
  Description:
    Copy from the models passed and return a new one with the
    parameters modified.

  Inputs:
    models - The array of entries
    id - The _id to be copied
    data - An object with the parameters to modify and their values

  Outputs:
    model - The new model with parameters already modified
*/
const copyFrom = function(models, id, data) {
  // Get the model with the same id
  let model = {...models.find((entry) => {
    if (entry._id === id) return true;
  })};

  // Loop through every key in data and assign the value
  let keys = Object.keys(data);
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    model[keys[keyIndex]] = data[keys[keyIndex]];
  }

  return model;
};


/*
  Description:
    Copy a firmware from defaultMockFirmwares and adds a new one with the
    parameters modified.

  Inputs:
    id - The _id of the firmware
    data - An object with the parameters to modify and their values

  Outputs:
*/
models.copyFirmwareFrom = function(id, data) {
  // Get the firmware with the same id
  let firmware = copyFrom(models.defaultMockFirmwares, id, data);

  // Push to array
  models.defaultMockFirmwares.push(firmware);

  return firmware;
};


/*
  Description:
    Copy a firmware from defaultMockDevices and adds a new one with the
    parameters modified.

  Inputs:
    id - The _id of the device
    data - An object with the parameters to modify and their values

  Outputs:
*/
models.copyDeviceFrom = function(id, data) {
  // Get the device with the same id
  let device = copyFrom(models.defaultMockDevices, id, data);

  // Push to array
  models.defaultMockDevices.push(device);

  return device;
};


/*
  Description:
    Copy a config from defaultMockConfigs and adds a new one with the
    parameters modified.

  Inputs:
    id - The _id of the config
    data - An object with the parameters to modify and their values

  Outputs:
*/
models.copyConfigFrom = function(id, data) {
  // Get the config with the same id
  let config = copyFrom(models.defaultMockConfigs, id, data);

  // Push to array
  models.defaultMockConfigs.push(config);

  return config;
};


models.copyRoleFrom = function(id, data) {
  // Get the config with the same id
  let config = copyFrom(models.defaultMockRoles, id, data);

  // Push to array
  models.defaultMockRoles.push(config);

  return config;
};


module.exports = models;
