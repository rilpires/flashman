/**
 * This file includes fields and permissions for CPEs to use in mockings.
 * @namespace test/common/fieldsAndPermissions
 */


let fieldsAndPermissions = {
  fields: [],
  devicePermissions: [],
  cpePermissions: [],
};


/**
 * TR-069 parameter fields.
 *
 * @memberOf test/common/fieldsAndPermissions
 *
 * @type {Array}
 *
 * @property {Object} [0] - All fields valid.
 */
fieldsAndPermissions.fields.push({
  // All fields
  common: {
    mac: 'common.mac',
    model: 'common.model',
    version: 'common.version',
    hw_version: 'common.hw_version',
    uptime: 'common.uptime',
    ip: 'common.ip',
    acs_url: 'common.acs_url',
    interval: 'common.interval',
    web_admin_username: 'common.web_admin_username',
    web_admin_password: 'common.web_admin_password',
    stun_enable: 'common.stun_enable',
    stun_udp_conn_req_addr: 'common.stun_udp_conn_req_addr',
    alt_uid: 'common.alt_uid',
  },
  wan: {
    pppoe_enable: 'wan.pppoe_enable',
    pppoe_status: 'wan.pppoe_status',
    dhcp_enable: 'wan.dhcp_enable',
    dhcp_status: 'wan.dhcp_status',
    pppoe_user: 'wan.pppoe_user',
    pppoe_pass: 'wan.pppoe_pass',
    rate: 'wan.rate',
    duplex: 'wan.duplex',
    wan_ip: 'wan.wan_ip',
    wan_ip_ppp: 'wan.wan_ip_ppp',
    wan_mac: 'wan.wan_mac',
    wan_mac_ppp: 'wan.wan_mac_ppp',
    mask_ipv4: 'wan.mask_ipv4',
    mask_ipv4_ppp: 'wan.mask_ipv4_ppp',
    remote_address: 'wan.remote_address',
    remote_address_ppp: 'wan.remote_address_ppp',
    remote_mac: 'wan.remote_mac',
    remote_mac_ppp: 'wan.remote_mac_ppp',
    default_gateway: 'wan.default_gateway',
    default_gateway_ppp: 'wan.default_gateway_ppp',
    dns_servers: 'wan.dns_servers',
    dns_servers_ppp: 'wan.dns_servers_ppp',
    uptime: 'wan.uptime',
    uptime_ppp: 'wan.uptime_ppp',
    mtu: 'wan.mtu',
    mtu_ppp: 'wan.mtu_ppp',
    recv_bytes: 'wan.recv_bytes',
    sent_bytes: 'wan.sent_bytes',
    port_mapping_entries_dhcp: 'wan.port_mapping_entries_dhcp',
    port_mapping_entries_ppp: 'wan.port_mapping_entries_ppp',
    vlan: 'wan.vlan',
    vlan_ppp: 'wan.vlan_ppp',
    pon_rxpower: 'wan.pon_rxpower',
    pon_txpower: 'wan.pon_txpower',
    pon_rxpower_epon: 'wan.pon_rxpower_epon',
    pon_txpower_epon: 'wan.pon_txpower_epon',
  },
  port_mapping_dhcp: 'port_mapping_dhcp',
  port_mapping_ppp: 'port_mapping_ppp',
  port_mapping_fields: {
    external_port_start: ['ExternalPort', 'external_port_start',
      'xsd:unsignedInt'],
    internal_port_start: ['InternalPort', 'internal_port_start',
      'xsd:unsignedInt'],
    client: ['InternalClient', 'ip', 'xsd:string'],
  },
  port_mapping_values: {
    enable: ['PortMappingEnabled', true, 'xsd:boolean'],
    lease: ['PortMappingLeaseDuration', 0, 'xsd:unsignedInt'],
    protocol: ['PortMappingProtocol', '', 'xsd:string'],
    description: ['PortMappingDescription', '', 'xsd:string'],
    remote_host: ['RemoteHost', '0.0.0.0', 'xsd:string'],
  },
  lan: {
    config_enable: 'lan.config_enable',
    router_ip: 'lan.router_ip',
    subnet_mask: 'lan.subnet_mask',
    lease_min_ip: 'lan.lease_min_ip',
    lease_max_ip: 'lan.lease_max_ip',
    ip_routers: 'lan.ip_routers',
    dns_servers: 'lan.dns_servers',
  },
  ipv6: {
    address: 'ipv6.address',
    address_ppp: 'ipv6.address_ppp',
    mask: 'ipv6.mask',
    mask_ppp: 'ipv6.mask_ppp',
    default_gateway: 'ipv6.default_gateway',
    default_gateway_ppp: 'ipv6.default_gateway_ppp',
    prefix_delegation_address: 'ipv6.prefix_delegation_address',
    prefix_delegation_address_ppp: 'ipv6.prefix_delegation_address_ppp',
    prefix_delegation_mask: 'ipv6.prefix_delegation_mask',
    prefix_delegation_mask_ppp: 'ipv6.prefix_delegation_mask_ppp',
    prefix_delegation_local_address: 'ipv6.prefix_delegation_local_address',
    prefix_delegation_local_address_ppp:
      'ipv6.prefix_delegation_local_address_ppp',
  },
  wifi2: {
    ssid: 'wifi2.ssid',
    bssid: 'wifi2.bssid',
    password: 'wifi2.password',
    channel: 'wifi2.channel',
    auto: 'wifi2.auto',
    mode: 'wifi2.mode',
    enable: 'wifi2.enable',
    beacon_type: 'wifi2.beacon_type',
    band: 'wifi2.band',
  },
  wifi5: {
    ssid: 'wifi5.ssid',
    bssid: 'wifi5.bssid',
    password: 'wifi5.password',
    channel: 'wifi5.channel',
    auto: 'wifi5.auto',
    mode: 'wifi5.mode',
    enable: 'wifi5.enable',
    beacon_type: 'wifi5.beacon_type',
    band: 'wifi5.band',
  },
  mesh2: {
    ssid: 'mesh2.ssid',
    bssid: 'mesh2.bssid',
    password: 'mesh2.password',
    channel: 'mesh2.channel',
    auto: 'mesh2.auto',
    mode: 'mesh2.mode',
    enable: 'mesh2.enable',
    advertise: 'mesh2.advertise',
    encryption: 'mesh2.encryption',
    beacon_type: 'mesh2.beacon_type',
  },
  mesh5: {
    ssid: 'mesh5.ssid',
    bssid: 'mesh5.bssid',
    password: 'mesh5.password',
    channel: 'mesh5.channel',
    auto: 'mesh5.auto',
    mode: 'mesh5.mode',
    enable: 'mesh5.enable',
    advertise: 'mesh5.advertise',
    encryption: 'mesh5.encryption',
    beacon_type: 'mesh5.beacon_type',
  },
  log: 'log',
  stun: {
    address: 'stun.address',
    port: 'stun.port',
  },
  access_control: {
    mac: 'access_control.mac',
    wifi2: 'access_control.wifi2',
    wifi5: 'access_control.wifi5',
  },
  devices: {
    hosts: 'devices.hosts',
    hosts_template: 'devices.hosts_template',
    host_mac: 'devices.host_mac',
    host_name: 'devices.host_name',
    host_ip: 'devices.host_ip',
    host_layer2: 'devices.host_layer2',
    host_active: 'devices.host_active',
    host_rssi: 'devices.host_rssi',
    host_snr: 'devices.host_snr',
    host_cable_rate: 'devices.host_cable_rate',
    host_rate: 'devices.host_rate',
    associated: 'devices.associated',
    assoc_mac: 'devices.assoc_mac',
  },
  diagnostics: {
    ping: {
      root: 'diagnostics.ping.root',
      diag_state: 'diagnostics.ping.diag_state',
      failure_count: 'diagnostics.ping.failure_count',
      success_count: 'diagnostics.ping.success_count',
      host: 'diagnostics.ping.host',
      interface: 'diagnostics.ping.interface',
      num_of_rep: 'diagnostics.ping.num_of_rep',
      avg_resp_time: 'diagnostics.ping.avg_resp_time',
      max_resp_time: 'diagnostics.ping.max_resp_time',
      min_resp_time: 'diagnostics.ping.min_resp_time',
      timeout: 'diagnostics.ping.timeout',
    },
    speedtest: {
      root: 'diagnostics.speedtest.root',
      diag_state: 'diagnostics.speedtest.diag_state',
      num_of_conn: 'diagnostics.speedtest.num_of_conn',
      download_url: 'diagnostics.speedtest.download_url',
      bgn_time: 'diagnostics.speedtest.bgn_time',
      end_time: 'diagnostics.speedtest.end_time',
      test_bytes_rec: 'diagnostics.speedtest.test_bytes_rec',
      down_transports: 'diagnostics.speedtest.down_transports',
      full_load_bytes_rec: 'diagnostics.speedtest.full_load_bytes_rec',
      full_load_period: 'diagnostics.speedtest.full_load_period',
      interface: 'diagnostics.speedtest.interface',
    },
    traceroute: {
      root: 'diagnostics.traceroute.root',
      diag_state: 'diagnostics.traceroute.diag_state',
      interface: 'diagnostics.traceroute.interface',
      target: 'diagnostics.traceroute.target',
      tries_per_hop: 'diagnostics.traceroute.tries_per_hop',
      timeout: 'diagnostics.traceroute.timeout',
      data_block_size: 'diagnostics.traceroute.data_block_size',
      diff_serv: 'diagnostics.traceroute.diff_serv',
      max_hop_count: 'diagnostics.traceroute.max_hop_count',
      response_time: 'diagnostics.traceroute.response_time',
      number_of_hops: 'diagnostics.traceroute.number_of_hops',
      protocol: 'diagnostics.traceroute.protocol',
      ip_version: 'diagnostics.traceroute.ip_version',
      hops_root: 'diagnostics.traceroute.hops_root',
      hop_host: 'diagnostics.traceroute.hop_host',
      hop_ip_address: 'diagnostics.traceroute.hop_ip_address',
      hop_error_code: 'diagnostics.traceroute.hop_error_code',
      hop_rtt_times: 'diagnostics.traceroute.hop_rtt_times',
    },
    sitesurvey: {
      root: 'diagnostics.sitesurvey.root',
      diag_state: 'diagnostics.sitesurvey.diag_state',
      result: 'diagnostics.sitesurvey.result',
      mac: 'diagnostics.sitesurvey.mac',
      ssid: 'diagnostics.sitesurvey.ssid',
      channel: 'diagnostics.sitesurvey.channel',
      signal: 'diagnostics.sitesurvey.signal',
      band: 'diagnostics.sitesurvey.band',
      mode: 'diagnostics.sitesurvey.mode',
    },
    statistics: {
      cpu_usage: 'diagnostics.statistics.cpu_usage',
      memory_usage: 'diagnostics.statistics.memory_usage',
      memory_free: 'diagnostics.statistics.memory_free',
      memory_total: 'diagnostics.statistics.memory_total',
    },
  },
});


/**
 * Device permissions.
 *
 * @memberOf test/common/fieldsAndPermissions
 *
 * @type {Array}
 *
 * @property {Object} [0] - All device permissions true.
 */
fieldsAndPermissions.devicePermissions.push({
  // Grant all
  grantViewLogs: true,
  grantResetDevices: true,
  grantPortForward: true,
  grantPortForwardAsym: true,
  grantPortOpenIpv6: true,
  grantDiacritics: true,
  grantSsidSpaces: true,
  grantWifi2ghzEdit: true,
  grantWifi5ghz: true,
  grantWifiModeRead: true,
  grantWifiModeEdit: true,
  grantWifiBandRead2: true,
  grantWifiBandRead5: true,
  grantWifiBandEdit2: true,
  grantWifiBandEdit5: true,
  grantWifiBandAuto2: true,
  grantWifiBandAuto5: true,
  grantWifi5ChannelList: [36, 40, 44, 48, 149, 153, 157, 161, 165],
  grantWifiState: true,
  grantWifiPowerHiddenIpv6Box: true,
  grantWifiExtendedChannels: true,
  grantPingTest: true,
  grantLanRead: true,
  grantLanEdit: true,
  grantLanGwEdit: true,
  grantLanDevices: true,
  grantSiteSurvey: true,
  grantUpnp: true,
  grantSpeedTest: true,
  grantCustomSpeedTest: true,
  grantSpeedTestLimit: true,
  grantBlockDevices: true,
  grantBlockWiredDevices: true,
  grantOpmode: true,
  grantVlanSupport: true,
  grantStatisticsSupport: true,
  grantPonSignalSupport: true,
  grantMeshMode: true,
  grantMeshV2PrimaryModeUpgrade: true,
  grantMeshV2PrimaryModeCable: true,
  grantMeshV2PrimaryModeWifi: true,
  grantMeshV2SecondaryModeUpgrade: true,
  grantMeshV2SecondaryMode: true,
  grantMeshV2HardcodedBssid: true,
  grantMeshVAPObject: true,
  grantUpdateAck: true,
  grantWpsFunction: true,
  grantSTUN: true,
  grantWanMacRead: true,
  grantWanMtuEdit: true,
  grantWanVlanEdit: true,
  grantWanMtuRead: true,
  grantWanVlanRead: true,
  grantWanLanInformation: true,
  grantWiFiAXSupport: true,
  grantTraceroute: true,
  grantRebootAfterWANChange: true,
  grantCanTrustWanRate: true,
});


/**
 * CPE permissions.
 *
 * @memberOf test/common/fieldsAndPermissions
 *
 * @type {Array}
 *
 * @property {Object} [0] - All CPE permissions true.
 */
fieldsAndPermissions.cpePermissions.push({
  features: {
    cableRxRate: true,
    customAppPassword: true,
    firmwareUpgrade: true,
    meshCable: true,
    meshWifi: true,
    pingTest: true,
    ponSignal: true,
    portForward: true,
    siteSurvey: true,
    speedTest: true,
    stun: true,
    traceroute: true,
    upnp: true,
    wanBytes: true,
    wps: true,
    macAccessControl: true,
    wlanAccessControl: true,
    hasIpv6Information: true,
    hasCPUUsage: true,
    hasMemoryUsage: true,
  },
  firmwareUpgrades: {
    'v1': ['v1', 'v2'],
    'v2': ['v2'],
    'v3': [],
  },
  lan: {
    configRead: true,
    configWrite: true,
    blockLANDevices: true,
    blockWiredLANDevices: true,
    listLANDevices: true,
    LANDeviceCanTrustActive: true,
    LANDeviceHasSNR: true,
    LANDeviceHasAssocTree: true,
    LANDeviceSkipIfNoWifiMode: true,
    needEnableConfig: true,
    needConfigOnLANChange: true,
    sendDnsOnLANChange: true,
    sendRoutersOnLANChange: true,
  },
  wan: {
    allowReadMacAddress: true,
    allowReadWanMtu: true,
    allowEditWanMtu: true,
    allowReadWanVlan: true,
    allowEditWanVlan: true,
    dhcpUptime: true,
    pingTestSingleAttempt: true,
    pingTestSetInterface: true,
    speedTestSetInterface: true,
    traceRouteSetInterface: true,
    portForwardQueueTasks: true,
    portForwardPermissions: true,
    speedTestLimit: true,
    hasUptimeField: true,
    mustRebootAfterChanges: true,
    canTrustWanRate: true,
    hasIpv4MaskField: true,
    hasIpv4RemoteAddressField: true,
    hasIpv4RemoteMacField: true,
    hasIpv4DefaultGatewayField: true,
    hasDnsServerField: true,
  },
  ipv6: {
    hasAddressField: true,
    hasMaskField: true,
    hasDefaultGatewayField: true,
    hasPrefixDelegationAddressField: true,
    hasPrefixDelegationMaskField: true,
    hasPrefixDelegationLocalAddressField: true,
  },
  wifi: {
    list5ghzChannels: [36, 40, 44, 48, 149, 153, 157, 161, 165],
    allowDiacritics: true,
    allowSpaces: true,
    dualBand: true,
    axWiFiMode: true,
    extended2GhzChannels: true,
    ssidRead: true,
    ssidWrite: true,
    bandRead2: true,
    bandRead5: true,
    bandWrite2: true,
    bandWrite5: true,
    bandAuto2: true,
    bandAuto5: true,
    modeRead: true,
    modeWrite: true,
    rebootAfterWiFi2SSIDChange: true,
    mustBeEnabledToConfigure: true,
  },
  mesh: {
    bssidOffsets2Ghz: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x0'],
    bssidOffsets5Ghz: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x0'],
    hardcodedBSSIDOffset: true,
    objectExists: true,
    setEncryptionForCable: true,
  },
  siteSurvey: {
    requiresPolling: true,
    requiresSeparateTasks: true,
    survey2Index: '2',
    survey5Index: '5',
  },
  traceroute: {
    maxProbesPerHop: 3,
    minProbesPerHop: 1,
    completeAsRequested: true,
    hopCountExceededState: 'Error_MaxHopCountExceeded',
    protocol: 'UDP',
  },
  onlineAfterReset: true,
  useLastIndexOnWildcard: true,
  needInterfaceInPortFoward: true,
  stavixXMLConfig: {
    portForward: true,
    webCredentials: true,
  },
});


/**
 * Gets all object values, regardless of the depth of the object.
 *
 * @memberOf test/common/fieldsAndPermissions
 *
 * @param {Object} object - The object to get all values from
 *
 * @return {Array} The array containing all values.
 */
fieldsAndPermissions.getAllObjectValues = function(object) {
  let fieldNames = [];

  Object.keys(object).forEach((name) => {
    // If it is an object, go deeper in one level
    if (object[name].constructor === Object) {
      let subfield = object[name];

      fieldNames = fieldNames.concat(
        fieldsAndPermissions.getAllObjectValues(subfield),
      );

      return;
    }

    // If array, use the first element
    if (object[name].constructor === Array) {
      fieldNames.push(object[name][0]);

      return;
    }

    // If string, push and continue to next field
    fieldNames.push(object[name]);
  });

  return fieldNames;
};


/**
 * Sets all object values, regardless of the depth of the object.
 *
 * @memberOf test/common/fieldsAndPermissions
 *
 * @param {Object} object - The object to set all values
 * @param {Any} value - The value to change all fields to
 *
 * @return {Object} The object with all values modified.
 */
fieldsAndPermissions.setAllObjectValues = function(object, value) {
  let copiedObject = {...object};

  Object.keys(copiedObject).forEach((name) => {
    // If it is an object, go deeper in one level
    if (copiedObject[name].constructor === Object) {
      let subfield = copiedObject[name];

      copiedObject[name] = fieldsAndPermissions.setAllObjectValues(
        subfield, value,
      );

      return;
    }

    // If array, continue to the next field
    if (copiedObject[name].constructor === Array) {
      return;
    }

    // If string, set the value and continue to next field
    copiedObject[name] = value;
  });

  return copiedObject;
};


/**
 * @exports test/common/fieldsAndPermissions
 */
module.exports = fieldsAndPermissions;
