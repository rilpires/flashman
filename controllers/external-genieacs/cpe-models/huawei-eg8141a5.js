const basicCPEModel = require('./base-model');

let huaweiModel = Object.assign({}, basicCPEModel);

huaweiModel.identifier = {vendor: 'Huawei', model: 'EG8141A5'};

huaweiModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  // permissions.features.pingTest = true; // Always indicates 90% loss
  permissions.features.ponSignal = true;
  permissions.features.speedTest = true;
  permissions.features.traceroute = true;
  permissions.features.hasIpv6Information = true;
  permissions.features.hasCPUUsage = true;
  permissions.features.hasMemoryUsage = true;
  permissions.firmwareUpgrades = {
    'V5R019C00S120': [],
  };
  permissions.lan.LANDeviceHasSNR = true;
  permissions.lan.dnsServersLimit = 3;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.dhcpUptime = false;
  permissions.wan.hasUptimeField = true;
  permissions.wan.hasDnsServerField = true;
  permissions.wan.speedTestLimit = 500;
  permissions.ipv6.hasAddressField = true;
  permissions.ipv6.hasDefaultGatewayField = true;
  permissions.ipv6.hasPrefixDelegationAddressField = true;
  permissions.ipv6.hasPrefixDelegationLocalAddressField = true;
  permissions.wifi.dualBand = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.traceroute.maxProbesPerHop = 1;
  return permissions;
};

huaweiModel.getFieldType = function(masterKey, key) {
  if ((masterKey === 'wifi2' || masterKey === 'wifi5') && key === 'band') {
    return 'xsd:unsignedInt';
  }
  return basicCPEModel.getFieldType(masterKey, key);
};

huaweiModel.convertWifiMode = function(mode, is5ghz=false) {
  switch (mode) {
    case '11g':
      return '11bg';
    case '11n':
      return '11bgn';
    case '11na':
    case '11ac':
    case '11ax':
    default:
      return '';
  }
};

huaweiModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
      return 1;
    case 'HT40':
      return 2;
    case 'auto':
      return 0;
    case 'VHT40':
    case 'VHT20':
    default:
      return '';
  }
};

huaweiModel.convertWifiBandToFlashman = function(band, isAC) {
  switch (band) {
    case 0:
      return 'auto';
    case 1:
      return (isAC) ? undefined : 'HT20';
    case 2:
      return (isAC) ? undefined : 'HT40';
    default:
      return undefined;
  }
};

huaweiModel.convertWanRate = function(rate) {
  return parseInt(rate) / 1000000;
};

huaweiModel.getBeaconType = function() {
  return 'WPAand11i';
};

huaweiModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_username = 'InternetGatewayDevice.UserInterface.' +
    'X_HW_WebUserInfo.2.UserName';
  fields.common.web_admin_password = 'InternetGatewayDevice.UserInterface.' +
    'X_HW_WebUserInfo.2.Password';
  fields.wan.rate = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.Layer1DownstreamMaxBitRate';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_GponInterafceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_GponInterafceConfig.TXPower';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_GponInterafceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_GponInterafceConfig.TXPower';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_HW_VLAN';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_HW_VLAN';
  fields.wan.service_type = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_HW_SERVICELIST';
  fields.wan.service_type_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_HW_SERVICELIST';

  fields.ipv6.address =
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
    'WANIPConnection.*.X_HW_IPv6.IPv6Address.1.IPAddress';
  fields.ipv6.default_gateway =
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
    'WANIPConnection.*.X_HW_IPv6.IPv6Address.1.DefaultGateway';
  fields.ipv6.prefix_delegation_address =
    'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_HW_IPv6.IPv6Prefix.1.Prefix';
  fields.ipv6.address_ppp =
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
    'WANPPPConnection.*.X_HW_IPv6.IPv6Address.1.IPAddress';
  fields.ipv6.default_gateway_ppp =
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
    'WANPPPConnection.*.X_HW_IPv6.IPv6Address.1.DefaultGateway';
  fields.ipv6.prefix_delegation_address_ppp =
    'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_HW_IPv6.IPv6Prefix.1.Prefix';
  fields.ipv6.prefix_delegation_local_address_ppp =
    'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement' +
    '.X_HW_IPv6Interface.1.IPv6Prefix.1.Prefix';
  fields.ipv6.prefix_delegation_local_address =
    'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement' +
    '.X_HW_IPv6Interface.1.IPv6Prefix.1.Prefix';
  delete fields.port_mapping_fields.external_port_end;
  delete fields.port_mapping_fields.internal_port_end;
  fields.lan.router_ip = 'InternetGatewayDevice.LANDevice.1.' +
    'LANHostConfigManagement.IPInterface.2.IPInterfaceIPAddress';
  fields.lan.subnet_mask = 'InternetGatewayDevice.LANDevice.1.' +
    'LANHostConfigManagement.IPInterface.2.IPInterfaceSubnetMask';
  fields.wifi2.password = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.PreSharedKey.1.KeyPassphrase';
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.X_HW_HT20';
  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.' +
    'Hosts.Host.*.InterfaceType';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_HW_RSSI';
  fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_HW_SNR';
  fields.devices.host_mode = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_HW_WorkingMode';
  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.LANDevice.1.' +
    'WiFi';
  return fields;
};

module.exports = huaweiModel;
