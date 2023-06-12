const basicCPEModel = require('./base-model');

let huaweiModel = Object.assign({}, basicCPEModel);

huaweiModel.identifier = {vendor: 'Huawei', model: 'EG8145V5'};

huaweiModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.cableRxRate = true;
  permissions.features.meshWifi = true;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.features.siteSurvey = true;
  permissions.features.speedTest = true;
  permissions.features.traceroute = true;
  permissions.features.hasIpv6Information = true;
  permissions.features.hasCPUUsage = true;
  permissions.features.hasMemoryUsage = true;

  permissions.lan.LANDeviceHasSNR = true;
  permissions.lan.dnsServersLimit = 2;

  permissions.traceroute.protocol = 'ICMP';
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.pingTestSingleAttempt = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wan.speedTestLimit = 850;
  permissions.wan.hasIpv4RemoteAddressField = true;
  permissions.wan.hasIpv4DefaultGatewayField = true;
  permissions.wan.hasDnsServerField = true;

  permissions.ipv6.hasAddressField = true;
  permissions.ipv6.hasDefaultGatewayField = true;
  permissions.ipv6.hasPrefixDelegationAddressField = true;
  permissions.ipv6.hasPrefixDelegationLocalAddressField = true;

  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128,
  ];
  permissions.firmwareUpgrades = {
    'V5R019C10S350': ['V5R020C00S280'],
    'V5R020C00S280': [],
  };
  return permissions;
};

huaweiModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return '11bg';
    case '11n':
      return '11bgn';
    case '11na':
      return '11na';
    case '11ac':
      return '11ac';
    case '11ax':
    default:
      return '';
  }
};

huaweiModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '1';
    case 'HT40':
    case 'VHT40':
      return '2';
    case 'VHT80':
      return '3';
    case 'auto':
      return (is5ghz) ? '3' : '0';
    default:
      return '';
  }
};

huaweiModel.convertWifiBandToFlashman = function(band, isAC) {
  switch (band) {
    // String input
    case '0':
      return 'auto';
    case '1':
      return (isAC) ? 'VHT20' : 'HT20';
    case '2':
      return (isAC) ? 'VHT40' : 'HT40';
    case '3':
      return (isAC) ? 'VHT80' : undefined;
    default:
      return undefined;
  }
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

  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'X_GponInterafceConfig.Stats.BytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'X_GponInterafceConfig.Stats.BytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_GponInterafceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_GponInterafceConfig.TXPower';
  fields.wan.vlan = fields.roots.wan.ip+'X_HW_VLAN';
  fields.wan.vlan_ppp = fields.roots.wan.ppp+'X_HW_VLAN';
  fields.wan.service_type = fields.roots.wan.ip+'X_HW_SERVICELIST';
  fields.wan.service_type_ppp = fields.roots.wan.ppp+'X_HW_SERVICELIST';

// IPv6
  // Address
  fields.ipv6.address = fields.roots.wan.ip+
    'X_HW_IPv6.IPv6Address.*.IPAddress';
  fields.ipv6.address_ppp = fields.roots.wan.ppp+
    'X_HW_IPv6.IPv6Address.*.IPAddress';

  // Default gateway
  fields.ipv6.default_gateway = fields.roots.wan.ip+
    'X_HW_IPv6.IPv6Address.*.DefaultGateway';
  fields.ipv6.default_gateway_ppp = fields.roots.wan.ppp+
    'X_HW_IPv6.IPv6Address.*.DefaultGateway';


  // IPv6 Prefix Delegation
  // Address
  fields.ipv6.prefix_delegation_address = fields.roots.wan.ip+
    'X_HW_IPv6.IPv6Prefix.*.Prefix';
  fields.ipv6.prefix_delegation_address_ppp = fields.roots.wan.ppp+
    'X_HW_IPv6.IPv6Prefix.*.Prefix';

  // Local Address
  fields.ipv6.prefix_delegation_local_address = 'InternetGatewayDevice'+
    '.LANDevice.1.LANHostConfigManagement.X_HW_IPv6Interface.*.IPv6Prefix.*.' +
    'Prefix';
  fields.ipv6.prefix_delegation_local_address_ppp = 'InternetGatewayDevice'+
    '.LANDevice.1.LANHostConfigManagement.X_HW_IPv6Interface.*.IPv6Prefix.*.' +
    'Prefix';

  fields.devices.host_cable_rate = 'InternetGatewayDevice.LANDevice.1.' +
    'Hosts.Host.*.X_HW_NegotiatedRate';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_HW_TxRate';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_HW_RSSI';
  fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_HW_SNR';
  fields.port_mapping_fields.internal_port_end = [
    'X_HW_InternalEndPort', 'internal_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
  delete fields.port_mapping_values.remote_host;
  fields.port_mapping_values.protocol[1] = 'TCP/UDP';
  fields.wifi2.password = fields.wifi2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.PreSharedKey',
  );
  fields.wifi5.password = fields.wifi5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.PreSharedKey',
  );
  fields.wifi2.band = fields.wifi2.band.replace(/BandWidth/g, 'X_HW_HT20');
  fields.wifi5.band = fields.wifi5.band.replace(/BandWidth/g, 'X_HW_HT20');
  fields.mesh2.password = fields.mesh2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.PreSharedKey',
  );
  fields.mesh5.password = fields.mesh5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.PreSharedKey',
  );
  Object.keys(fields.mesh5).forEach((k)=>{
    fields.mesh5[k] = fields.mesh5[k].replace(/6/g, '3');
  });
  fields.mesh2.rates = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.' +
    '2.BasicDataTransmitRates';
  fields.mesh2.radio_info = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.2.LowerLayers';
  fields.mesh5.rates = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.' +
    '3.BasicDataTransmitRates';
  fields.mesh5.radio_info = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.3.LowerLayers';

  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.LANDevice.1'+
    '.WiFi.NeighboringWiFiDiagnostic';
  fields.diagnostics.sitesurvey.signal = 'SignalStrength';
  fields.diagnostics.sitesurvey.band = 'OperatingChannelBandwidth';
  fields.diagnostics.sitesurvey.mode = 'OperatingStandards';
  return fields;
};

module.exports = huaweiModel;
