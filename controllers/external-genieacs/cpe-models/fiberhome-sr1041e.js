const basicCPEModel = require('./base-model');

let fiberhomeModel = Object.assign({}, basicCPEModel);

fiberhomeModel.identifier = {vendor: 'Fiberhome', model: 'SR1041E'};

fiberhomeModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.cableRxRate = true;

  permissions.features.hasIpv6Information = true;
  permissions.features.hasCPUUsage = true;
  permissions.features.hasMemoryUsage = true;

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
  permissions.wan.speedTestLimit = 700;
  permissions.wan.hasIpv4RemoteAddressField = true;
  permissions.wan.hasIpv4DefaultGatewayField = true;
  permissions.wan.hasDnsServerField = true;

  permissions.ipv6.hasAddressField = true;
  permissions.ipv6.hasDefaultGatewayField = true;
  permissions.ipv6.hasPrefixDelegationAddressField = true;

  permissions.wifi.allowDiacritics = true;
  permissions.wifi.axWiFiMode = true;
  permissions.wifi.extended2GhzChannels = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite5 = false;

  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64,
    100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144,
    149, 153, 157, 161,
  ];

  permissions.firmwareUpgrades = {
    'RP0101': [],
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

fiberhomeModel.convertWifiMode = function(mode, is5ghz=false) {
  switch (mode) {
    case '11g':
      return 'bg';
    case '11n':
      return 'bgn';
    case '11na':
      return 'a';
    case '11ac':
      return 'a,n,ac';
    case '11ax':
      return 'ax';
    default:
      return '';
  }
};

fiberhomeModel.convertPingTestResult = function(latency) {
  return latency.toString();
};

fiberhomeModel.convertWifiRate = function(rate) {
  return parseInt(rate) / 1000;
};

fiberhomeModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();

  fields.wifi2.password =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.'+
    'PreSharedKey.1.KeyPassphrase';
  fields.wifi2.band =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.'+
    'X_FH_ChannelWidth';
  fields.wifi5.password =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.'+
    'PreSharedKey.1.KeyPassphrase';
  fields.wifi5.band =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.X_FH_ChannelWidth';

  fields.devices.host_cable_rate =
    'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.NegoTxRate';
  fields.devices.host_rssi =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.'+
    'AssociatedDevice.*.AssociatedDeviceRSSI';
  fields.devices.host_rate =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.'+
    'AssociatedDevice.*.AssociatedDeviceTxRate';

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
