const basicCPEModel = require('./base-model');

let zteModel = Object.assign({}, basicCPEModel);

zteModel.identifier = {vendor: 'Multilaser / ZTE', model: 'F6600'};

zteModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.features.siteSurvey = true;
  permissions.features.speedTest = true;
  permissions.features.traceroute = true;
  permissions.features.macAccessControl = true;
  permissions.features.hasIpv6Information = true;
  permissions.features.hasCPUUsage = true;
  permissions.features.hasMemoryUsage = true;

  permissions.siteSurvey.requiresPolling = true;
  permissions.siteSurvey.survey2Index = '1';
  permissions.siteSurvey.survey5Index = '2';
  permissions.traceroute.maxProbesPerHop = 3;
  permissions.traceroute.protocol = 'ICMP';
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.mustRebootAfterChanges = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noRanges;
  permissions.wan.speedTestLimit = 300;
  permissions.wan.hasIpv4RemoteAddressField = true;
  permissions.wan.hasIpv4DefaultGatewayField = true;
  permissions.wan.hasDnsServerField = true;

  permissions.ipv6.hasAddressField = true;
  permissions.ipv6.hasPrefixDelegationAddressField = true;

  // X_ZTE-COM_IspDNS must be disabled to use DNS on lan
  permissions.lan.dnsServersWrite = false;

  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64,
    100, 104, 108, 112, 116, 120, 124, 128, 149, 153, 157, 161,
  ];
  permissions.wifi.modeWrite = false;
  permissions.firmwareUpgrades = {
    'V9.0.10P1N7B': [],
  };
  return permissions;
};

zteModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'b,g';
    case '11n':
      return 'b,g,n';
    case '11na':
      return 'a,n';
    case '11ac':
      return 'a,n,ac';
    case '11ax':
      return 'a,n,ac,ax';
    default:
      return '';
  }
};

zteModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '20MHz';
    case 'HT40':
    case 'VHT40':
      return '40MHz';
    case 'VHT80':
      return '80MHz';
    case 'auto':
      return (is5ghz) ? '80MHz' : 'Auto';
    default:
      return '';
  }
};

zteModel.convertWanRate = function(rate) {
  return rate/1000000;
};

zteModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.wan_ip = fields.wan.wan_ip.replace(
    /1.ExternalIPAddress/, '*.ExternalIPAddress',
  );
  fields.wan.wan_ip_ppp = fields.wan.wan_ip_ppp.replace(
    /1.ExternalIPAddress/, '*.ExternalIPAddress',
  );
  fields.wan.recv_bytes = fields.wan.recv_bytes.replace(
    /WANEthernetInterfaceConfig/g, 'X_ZTE-COM_WANPONInterfaceConfig',
  );
  fields.wan.sent_bytes = fields.wan.sent_bytes.replace(
    /WANEthernetInterfaceConfig/g, 'X_ZTE-COM_WANPONInterfaceConfig',
  );
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_ZTE-COM_WANPONInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_ZTE-COM_WANPONInterfaceConfig.TXPower';
  fields.wifi2.mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1'+
    '.X_ZTE-COM_WlanStandard';
  fields.wifi5.mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5'+
    '.X_ZTE-COM_WlanStandard';
  fields.wan.rate = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.Layer1DownstreamMaxBitRate';
  fields.wan.uptime = fields.wan.uptime.replace(/1.Uptime/, '*.Uptime');
  fields.wan.uptime_ppp = fields.wan.uptime_ppp.replace(/1.Uptime/, '*.Uptime');
  fields.wan.mtu_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.WANPPPConnection.*.MaxMTUSize';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.WANIPConnection.*.X_ZTE-COM_VLANID';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.WANPPPConnection.*.X_ZTE-COM_VLANID';
  fields.common.web_admin_username = 'InternetGatewayDevice.User.1.Username';
  fields.common.web_admin_password = 'InternetGatewayDevice.User.1.Password';
  fields.devices.associated = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.AssociatedDevice';
  fields.devices.associated_5 = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.5.AssociatedDevice';
  fields.port_mapping_fields.internal_port_end = [
    'X_ZTE-COM_InternalPortEndRange', 'internal_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_values.description[0] = 'X_ZTE-COM_Name';
  fields.port_mapping_values.other_description = ['PortMappingDescription',
    '', 'xsd:string'];
  fields.port_mapping_values.protocol[1] = 'BOTH';
  fields.port_mapping_values.zte_remote_host_end = [
    'X_ZTE-COM_RemoteHostEndRange', '0.0.0.0', 'xsd:string',
  ];
  fields.common.stun_enable = 'InternetGatewayDevice.ManagementServer.' +
    'STUNEnable';
  fields.common.stun_udp_conn_req_addr = 'InternetGatewayDevice.' +
    'ManagementServer.UDPConnectionRequestAddress';
  fields.access_control.mac = 'InternetGatewayDevice.Firewall.'+
    'X_ZTE-COM_MacFilterService.Filter';
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
  fields.wifi2.password = fields.wifi2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.wifi5.password = fields.wifi5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.mesh2.password = fields.mesh2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.mesh5.password = fields.mesh5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.AssociatedDeviceRssi';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_RxRate';
  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.'+
    'LANDevice.1.WIFI';
  fields.diagnostics.sitesurvey.diag_state = 'Radio.*.DiagnosticsState';
  fields.diagnostics.sitesurvey.result = 'Radio.*.X_ZTE-COM_NeighborAP';
  fields.diagnostics.sitesurvey.band = 'Bandwidth';

  fields.diagnostics.statistics.cpu_usage = 'InternetGatewayDevice.' +
    'DeviceInfo.X_ZTE-COM_CpuUsed';
  fields.diagnostics.statistics.memory_usage = 'InternetGatewayDevice.' +
    'DeviceInfo.X_ZTE-COM_MemUsed';

  fields.diagnostics.traceroute.root =
    'InternetGatewayDevice.TraceRouteDiagnostics';
  fields.diagnostics.traceroute.protocol = 'X_ZTE-COM_Protocol';

  // IPv6
  // Address
  fields.ipv6.address = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_ZTE-COM_ExternalIPv6Address';
  fields.ipv6.address_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_ZTE-COM_ExternalIPv6Address';

  // IPv6 Prefix Delegation
  fields.ipv6.prefix_delegation_address = 'InternetGatewayDevice.WANDevice' +
    '.1.WANConnectionDevice.*.WANIPConnection.*.' +
    'X_ZTE-COM_PD';
  fields.ipv6.prefix_delegation_address_ppp = 'InternetGatewayDevice.' +
    'WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.' +
    'X_ZTE-COM_PD';

  return fields;
};

module.exports = zteModel;
