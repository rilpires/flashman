const basicCPEModel = require('./base-model');
let flashifyModel = Object.assign({}, basicCPEModel);

// generated with Flashify version dev

flashifyModel.identifier = {vendor: 'INTELBRAS', model: 'AX1800'};

flashifyModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  // Port forward not analised
  // permissions.features.portForward = UNKNOWN;
  permissions.features.siteSurvey = true;
  permissions.features.speedTest = true;
  permissions.features.stun = false;
  permissions.features.traceroute = true;
  permissions.features.wanBytes = true;
  // TODO: double check the permission below!
  permissions.features.macAccessControl = false;
  // TODO: double check the permission below!
  permissions.features.wlanAccessControl = false;
  permissions.features.hasCPUUsage = true;
  permissions.features.hasMemoryUsage = true;
  permissions.firmwareUpgrades = {
    '2.2-230216': [],
  };
  permissions.lan.configWrite = true;
  // TODO: double check the permission below!
  permissions.lan.blockLANDevices = false;
  // TODO: double check the permission below!
  permissions.lan.blockWiredLANDevices = false;
  permissions.lan.listLANDevices = true;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.LANDeviceHasSNR = true;
  permissions.lan.LANDeviceHasAssocTree = true;
  permissions.lan.LANDeviceSkipIfNoWifiMode = false;
  permissions.lan.dnsServersWrite = true;
  permissions.lan.dnsServersLimit = 3;
  permissions.lan.sendRoutersOnLANChange = true;
  permissions.wan.allowReadWanMtu = true;
  permissions.wan.allowEditWanMtu = true;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.pingTestSingleAttempt = false;
  permissions.wan.pingTestSetInterface = false;
  permissions.wan.speedTestSetInterface = false;
  permissions.wan.traceRouteSetInterface = false;
  permissions.wan.portForwardQueueTasks = false;
  // first_down_speed: 142 Mbps
  // second_down_speed: 137 Mbps
  // third_down_speed: 133 Mbps
  // Teste na analise: 233 Mbps
  permissions.wan.speedTestLimit = 230;
  permissions.wan.dhcpUptime = true;
  permissions.wan.hasUptimeField = true;
  permissions.wan.canTrustWanRate = true;
  permissions.wan.hasIpv4DefaultGatewayField = true;
  permissions.wan.hasDnsServerField = true;
  permissions.ipv6.hasAddressField = true;
  permissions.ipv6.hasMaskField = false;
  permissions.ipv6.hasDefaultGatewayField = true;
  permissions.ipv6.hasPrefixDelegationAddressField = true;
  permissions.ipv6.hasPrefixDelegationLocalAddressField = true;
  permissions.features.hasIpv6Information = true;
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.allowSpaces = true;
  permissions.wifi.dualBand = true;
  permissions.wifi.axWiFiMode = true;
  permissions.wifi.extended2GhzChannels = true;
  permissions.wifi.ssidRead = true;
  permissions.wifi.ssidWrite = true;
  permissions.wifi.bandRead2 = true;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite2 = true;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.modeRead = false;
  permissions.wifi.modeWrite = false;

  permissions.siteSurvey.survey2Index = '6';
  permissions.siteSurvey.survey5Index = '1';

  return permissions;
};

flashifyModel.getFieldType = function(masterKey, key) {
  // Necessary for InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANIPConnection.1.X_ITBS_VlanMuxID
  if (masterKey === 'wan' && key === 'vlan') {
    return 'xsd:int';
  }
  // Necessary for InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.X_ITBS_VlanMuxID
  if (masterKey === 'wan' && key === 'vlan_ppp') {
    return 'xsd:int';
  }
  return basicCPEModel.getFieldType(masterKey, key);
};

flashifyModel.convertWanRate = function(rate) {
  return parseInt(rate);
};

flashifyModel.convertPingTestResult = function(latency) {
  return latency.toString();
};

flashifyModel.isDeviceConnectedViaWifi = function(
  layer2iface, wifi2iface, wifi5iface,
) {
  if (layer2iface === '802.11') {
    return 'wifi';
  }
  return 'cable';
};

flashifyModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();

  fields.common.web_admin_password = 'InternetGatewayDevice.UserInterface.AdminPassword';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.TXPower';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pppoe_status = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.ConnectionStatus';
  fields.wan.pppoe_user = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Username';
  fields.wan.pppoe_pass = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Password';
  fields.wan.mtu_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.MaxMRUSize';
  fields.wan.wan_ip_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.ExternalIPAddress';
  fields.wan.uptime_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Uptime';
  fields.wan.dhcp_enable = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.DHCPClient.ReqDHCPOption.1.Enable';
  fields.wan.dhcp_status = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.ConnectionStatus';
  fields.wan.mtu = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.MaxMTUSize';
  fields.wan.wan_ip = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.ExternalIPAddress';
  fields.wan.uptime = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.Uptime';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_ITBS_VlanMuxID';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.X_ITBS_VlanMuxID';

  fields.ipv6.address = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.X_ITBS_IPv6ExternalAddress';
  fields.ipv6.address_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_ITBS_IPv6ExternalAddress';
  fields.ipv6.default_gateway_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_ITBS_IPv6GatewayAddress';
  fields.ipv6.default_gateway = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.X_ITBS_IPv6GatewayAddress';
  fields.ipv6.prefix_delegation_address_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_ITBS_IPv6PrefixDelegationAddress';
  fields.ipv6.prefix_delegation_address = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.X_ITBS_IPv6PrefixDelegationAddress';
  fields.ipv6.prefix_delegation_local_address_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_ITBS_IPv6GUAFormPrefixAddress';
  fields.ipv6.prefix_delegation_local_address = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.X_ITBS_IPv6GUAFormPrefixAddress';
  delete fields.port_mapping_fields.external_port_start;
  delete fields.port_mapping_fields.internal_port_start;
  delete fields.port_mapping_fields.client;
  delete fields.port_mapping_fields.external_port_end;
  delete fields.port_mapping_fields.internal_port_end;
  delete fields.port_mapping_values.enable;
  delete fields.port_mapping_values.lease;
  delete fields.port_mapping_values.protocol;
  delete fields.port_mapping_values.description;
  delete fields.port_mapping_values.remote_host;
  fields.wifi2.password = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.KeyPassphrase';
  fields.wifi2.auto = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.AutoChannelEnable';
  fields.wifi2.enable = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Enable';
  fields.wifi2.ssid = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.SSID';
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.X_ITBS_BandWidth';
  fields.wifi2.mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.X_ITBS_WlanStandard';
  fields.wifi2.channel = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Channel';
  fields.wifi5.password = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase';
  fields.wifi5.auto = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AutoChannelEnable';
  fields.wifi5.enable = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable';
  fields.wifi5.ssid = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_ITBS_BandWidth';
  fields.wifi5.mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_ITBS_WlanStandard';
  fields.wifi5.channel = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel';
  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.InterfaceType';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_ITBS_WLAN_ClientSignalStrength'
  fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_ITBS_WLAN_SNR'
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_ITBS_WLAN_ClientDataRate'
  fields.devices.host_mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_ITBS_WLAN_ClientMode'
  fields.devices.host_band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_ITBS_WLAN_ClientChannelWidth'

  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.LANDevice.1.WIFI';
  fields.diagnostics.sitesurvey.result = 'Radio.*.X_ITBS_NeighborAP';

  fields.diagnostics.traceroute.root = 'InternetGatewayDevice.TraceRouteDiagnostics';
  fields.diagnostics.traceroute.hop_host = 'HopHostAddress';
  fields.diagnostics.traceroute.hop_ip_address = 'IPAddressUsed';
  return fields;
};

flashifyModel.applyVersionDifferences = function(base, fwVersion, hwVersion) {
  // TODO: check manually!
  return base;
};

module.exports = flashifyModel;
