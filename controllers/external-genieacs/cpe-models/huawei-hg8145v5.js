const basicCPEModel = require('./base-model');

let flashifyModel = Object.assign({}, basicCPEModel);

// generated with Flashify version 2.13.0

flashifyModel.identifier = { vendor: 'Huawei', model: 'HG8145V5' };

flashifyModel.modelPermissions = function () {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.cableRxRate = true;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  // Must verify
  permissions.features.portForward = false;
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
    'V5R020C00S270': [],
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
  permissions.wan.allowReadWanMtu = false;
  permissions.wan.allowEditWanMtu = false;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.pingTestSingleAttempt = true;
  permissions.wan.pingTestSetInterface = false;
  permissions.wan.speedTestSetInterface = false;
  permissions.wan.traceRouteSetInterface = false;
  permissions.wan.portForwardQueueTasks = false;
  permissions.wan.speedTestLimit = 900;
  permissions.wan.dhcpUptime = false;
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
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48, 52, 56, 60, 64, 149, 153, 157, 161];
  permissions.wifi.allowDiacritics = false;
  permissions.wifi.allowSpaces = true;
  permissions.wifi.dualBand = true;
  permissions.wifi.axWiFiMode = false;
  permissions.wifi.extended2GhzChannels = true;
  permissions.wifi.ssidRead = true;
  permissions.wifi.ssidWrite = true;
  permissions.wifi.bandRead2 = true;
  permissions.wifi.bandRead5 = true;
  permissions.wifi.bandWrite2 = true;
  permissions.wifi.bandWrite5 = true;
  permissions.wifi.bandAuto2 = true;
  permissions.wifi.bandAuto5 = true;
  permissions.wifi.modeRead = true;
  permissions.wifi.modeWrite = true;
  return permissions;
};

flashifyModel.getFieldType = function (masterKey, key) {
  // Necessary for InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_HW_HT20
  if (masterKey === 'wifi2' && key === 'band') {
    return 'xsd:unsignedInt';
  }
  // Necessary for InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.X_HW_HT20
  if (masterKey === 'wifi5' && key === 'band') {
    return 'xsd:unsignedInt';
  }
  // TODO: must test WAN IPoE VLAN!
  // Necessary for InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_HW_IPv6MultiCastVLAN
  if (masterKey === 'wan' && key === 'vlan_ppp') {
    return 'xsd:int';
  }
  return basicCPEModel.getFieldType(masterKey, key);
};

flashifyModel.convertWifiMode = function (mode, is5ghz = false) {
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

flashifyModel.convertWifiBand = function (band, is5ghz = false) {
  switch (band) {
    case 'HT20':
      return 1;
    case 'VHT20':
      return 3;
    case 'HT40':
    case 'VHT40':
      return 2;
    case 'auto':
      return (is5ghz) ? 3 : 0;
    default:
      return undefined;
  }
};

flashifyModel.convertWifiBandToFlashman = function (band, isAC) {
  switch (band) {
    case 0:
    case 3:
      return 'auto';
    case 1:
      return 'HT20';
    case 2:
      return (isAC) ? 'VHT40' : 'HT40';
    default:
      return undefined;
  }
};

flashifyModel.convertWanRate = function (rate) {
  return rate / 1000000;
};

flashifyModel.isDeviceConnectedViaWifi = function (
  layer2iface, wifi2iface, wifi5iface,
) {
  if (layer2iface === '802.11') {
    return 'wifi';
  }
  return 'cable';
};

flashifyModel.getModelFields = function () {
  let fields = basicCPEModel.getModelFields();

  // ---------- FIELDS SUPPORTED BY FLASHIFY ----------
  fields.common.web_admin_username = 'InternetGatewayDevice.UserInterface.X_HW_WebUserInfo.2.UserName';
  fields.common.web_admin_password = 'InternetGatewayDevice.UserInterface.X_HW_WebUserInfo.2.Password';
  fields.wan.rate = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.Layer1DownstreamMaxBitRate';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.TXPower';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pppoe_enable = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Enable';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_HW_VLAN';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.X_HW_VLAN';
  fields.wan.service_type = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.X_HW_SERVICELIST';
  fields.wan.service_type_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_HW_SERVICELIST';
  fields.ipv6.address_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_HW_IPv6.IPv6Address.*.IPAddress';
  fields.ipv6.address = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.X_HW_IPv6.IPv6Address.*.IPAddress';
  fields.ipv6.default_gateway_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_HW_IPv6.IPv6Address.*.DefaultGateway';
  fields.ipv6.default_gateway = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.X_HW_IPv6.IPv6Address.*.DefaultGateway';
  fields.ipv6.prefix_delegation_address_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_HW_IPv6.IPv6Prefix.*.Prefix';
  fields.ipv6.prefix_delegation_address = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.X_HW_IPv6.IPv6Prefix.*.Prefix';
  fields.ipv6.prefix_delegation_local_address_ppp = 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.X_HW_IPv6Interface.1.IPv6Prefix.*.Prefix';
  fields.ipv6.prefix_delegation_local_address = 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.X_HW_IPv6Interface.1.IPv6Prefix.*.Prefix';
  delete fields.port_mapping_fields.external_port_end;
  delete fields.port_mapping_fields.internal_port_end;
  fields.wifi2.password = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase';
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_HW_HT20';
  fields.wifi5.password = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.X_HW_HT20';
  // TODO: check fields.access_control.wifi2
  // TODO: check fields.access_control.wifi5
  // TODO: check fields.access_control.mac
  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.InterfaceType';
  fields.devices.host_cable_rate = 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.X_HW_NegotiatedRate';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_HW_RSSI'
  fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_HW_SNR'
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_HW_TxRate'
  fields.devices.host_mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.AssociatedDevice.*.X_HW_WorkingMode'

  fields.diagnostics.traceroute.root = 'InternetGatewayDevice.TraceRouteDiagnostics';
  fields.diagnostics.traceroute.hop_host = 'Host';

  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.LANDevice' +
    '.1.WiFi.NeighboringWiFiDiagnostic';
  fields.diagnostics.sitesurvey.signal = 'SignalStrength';
  fields.diagnostics.sitesurvey.band = 'OperatingChannelBandwidth';
  fields.diagnostics.sitesurvey.mode = 'OperatingStandards';
  return fields;
};

flashifyModel.applyVersionDifferences = function (base, fwVersion, hwVersion) {
  // TODO: check manually!
  return base;
};

module.exports = flashifyModel;
