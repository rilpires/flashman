const basicCPEModel = require('./base-model');

let fiberhomeModel = Object.assign({}, basicCPEModel);

fiberhomeModel.identifier = {vendor: 'Fiberhome', model: 'SR120-A'};

fiberhomeModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.speedTest = true;
  permissions.features.traceroute = true;
  permissions.features.hasIpv6Information = true;
  permissions.features.hasCPUUsage = true;
  permissions.features.hasMemoryUsage = true;
  permissions.features.stun = true;

  // It can change MTU, but default uses 1500 in PP
  // Correct this when flashman can handle this case
  permissions.wan.allowReadWanMtu = false;
  permissions.wan.allowEditWanMtu = false;

  permissions.traceroute.maxProbesPerHop = 1;
  permissions.traceroute.protocol = 'ICMP';

  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.dnsServersLimit = 2;

  permissions.wan.hasUptimeField = true;
  permissions.wan.dhcpUptime = true;
  permissions.wan.speedTestLimit = 150;
  permissions.wan.hasIpv4RemoteAddressField = true;
  permissions.wan.hasIpv4DefaultGatewayField = true;
  permissions.wan.hasDnsServerField = true;

  permissions.ipv6.hasAddressField = true;
  permissions.ipv6.hasDefaultGatewayField = true;
  permissions.ipv6.hasPrefixDelegationAddressField = true;

  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64,
    100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144,
    149, 153, 157, 161,
  ];

  permissions.firmwareUpgrades = {
    'SR_V1.00': [],
  };
  return permissions;
};

fiberhomeModel.getFieldType = function(masterKey, key) {
  // Necessary for
  // InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Bandwidth
  if (masterKey === 'wifi2' && key === 'band') {
    return 'xsd:unsignedInt';
  }
  // Necessary for
  // InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Bandwidth
  if (masterKey === 'wifi5' && key === 'band') {
    return 'xsd:unsignedInt';
  }
  // TODO: must test STUN port!
  return basicCPEModel.getFieldType(masterKey, key);
};

fiberhomeModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'g';
    case '11n':
      return 'b,g,n';
    case '11na':
      return 'a,n';
    case '11ac':
      return 'a,n,ac';
    case '11ax':
    default:
      return '';
  }
};

fiberhomeModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
      return 1;
    case 'VHT20':
      return 1;
    case 'HT40':
      return 2;
    case 'VHT40':
      return 2;
    case 'VHT80':
      return 4;
    case 'auto':
      return 3;
    default:
      return undefined;
  }
};

fiberhomeModel.convertWifiBandToFlashman = function(band, isAC) {
  switch (band) {
    // String input
    case '3':
      return 'auto';
    case '1':
      return (isAC) ? 'VHT20' : 'HT20';
    case '2':
      return (isAC) ? 'VHT40' : 'HT40';
    case '4':
      return (isAC) ? 'VHT80' : undefined;
    default:
      return undefined;
  }
};

fiberhomeModel.convertPingTestResult = function(latency) {
  return latency.toString();
};

fiberhomeModel.convertWanRate = function(rate) {
  return rate/1000000;
};

fiberhomeModel.isDeviceConnectedViaWifi = function(
  layer2iface, wifi2iface, wifi5iface,
) {
  if (layer2iface === '802.11') {
    return 'wifi';
  }
  return 'cable';
};

fiberhomeModel.isAllowedWebadminUsername = function(name) {
  // The router uses admin as normal user.
  if (name === 'admin') {
    return false;
  }
  return true;
};

fiberhomeModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();

  fields.common.stun_enable = 'InternetGatewayDevice.ManagementServer.' +
    'STUNEnable';
  fields.common.stun_udp_conn_req_addr =
    'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';

  fields.common.web_admin_username =
    'InternetGatewayDevice.UserInterface.X_AIS_WebUserInfo.SuperAdminName';
  fields.common.web_admin_password =
    'InternetGatewayDevice.UserInterface.X_AIS_WebUserInfo.SuperAdminPassword';
  fields.wan.rate = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.Layer1DownstreamMaxBitRate';
  fields.wan.recv_bytes =
    'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.'+
    'TotalBytesReceived';
  fields.wan.sent_bytes =
    'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.'+
    'TotalBytesSent';
  fields.wan.mtu_ppp =
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
    'WANPPPConnection.*.MaxMTUSize';
  fields.wifi2.password =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.'+
    'PreSharedKey.1.KeyPassphrase';
  fields.wifi2.band =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.'+
    'Bandwidth';
  fields.wifi5.password =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.'+
    'PreSharedKey.1.KeyPassphrase';
  fields.wifi5.band =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Bandwidth';

  fields.devices.host_layer2 =
    'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.InterfaceType';
  fields.devices.host_rssi =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.'+
    'AssociatedDevice.1.X_CT-COM_RSSI';

  fields.diagnostics.sitesurvey.root =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Neighbor';

  fields.diagnostics.traceroute.root =
    'InternetGatewayDevice.TraceRouteDiagnostics';

  // IPv6
  // Address
  fields.ipv6.address = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_FH_IPv6IPAddress';
  fields.ipv6.address_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_FH_IPv6IPAddress';

  // Default gateway
  fields.ipv6.default_gateway = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_FH_DefaultIPv6Gateway';
  fields.ipv6.default_gateway_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_FH_DefaultIPv6Gateway';

  // IPv6 Prefix Delegation
  fields.ipv6.prefix_delegation_address = 'InternetGatewayDevice.WANDevice' +
    '.1.WANConnectionDevice.*.WANIPConnection.*.X_FH_IPv6Prefix';
  fields.ipv6.prefix_delegation_address_ppp = 'InternetGatewayDevice.' +
    'WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_FH_IPv6Prefix';

  return fields;
};

module.exports = fiberhomeModel;
