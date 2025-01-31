const basicCPEModel = require('./base-model');

let multilaserModel = Object.assign({}, basicCPEModel);

multilaserModel.identifier = {vendor: 'Multilaser / ZTE', model: 'F670L v9'};

multilaserModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.features.siteSurvey = true;
  permissions.features.speedTest = true;
  permissions.features.wlanAccessControl = true;
  permissions.features.traceroute = true;
  permissions.features.hasIpv6Information = true;
  permissions.features.hasCPUUsage = true;
  permissions.features.hasMemoryUsage = true;
  permissions.lan.LANDeviceHasSNR = true;
  permissions.siteSurvey.requiresPolling = true;
  permissions.siteSurvey.survey2Index = '1';
  permissions.siteSurvey.survey5Index = '2';
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.speedTestLimit = 300;
  permissions.wan.portForwardQueueTasks = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wan.traceRouteSetInterface = true;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108,
    112, 116, 120, 124, 128, 149, 153, 157, 161,
  ];
  permissions.wifi.modeWrite = false;

  permissions.ipv6.hasAddressField = true;
  permissions.ipv6.hasPrefixDelegationAddressField = true;
  permissions.ipv6.hasPrefixDelegationLocalAddressField = true;

  permissions.lan.dnsServersLimit = 3;

  permissions.firmwareUpgrades = {
    'V9.0.11P1N9': [],
  };
  return permissions;
};

multilaserModel.convertWifiMode = function(mode) {
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
    default:
      return '';
  }
};

multilaserModel.getBeaconType = function() {
  return 'WPAand11i';
};

multilaserModel.convertToDbm = function(power) {
  return parseFloat(power).toFixed(3);
};

multilaserModel.convertWifiRate = function(rate) {
  return parseInt(rate) / 1000;
};

multilaserModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_username = 'InternetGatewayDevice.User.1.Username';
  fields.common.web_admin_password = 'InternetGatewayDevice.User.1.Password';
  fields.wan.mtu_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.WANPPPConnection.*.MaxMTUSize';
  fields.wan.recv_bytes = fields.wan.recv_bytes.replace(
    /WANEthernetInterfaceConfig/g, 'X_ZTE-COM_WANPONInterfaceConfig',
  );
  fields.wan.sent_bytes = fields.wan.sent_bytes.replace(
    /WANEthernetInterfaceConfig/g, 'X_ZTE-COM_WANPONInterfaceConfig',
  );
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.WANIPConnection.*.X_ZTE-COM_VLANID';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.WANPPPConnection.*.X_ZTE-COM_VLANID';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_WLAN_RSSI';
  fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_WLAN_SNR';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.LastDataTransmitRate';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_ZTE-COM_WANPONInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_ZTE-COM_WANPONInterfaceConfig.TXPower';
  fields.port_mapping_values.protocol[1] = 'BOTH';
  fields.port_mapping_values.description[0] = 'X_ZTE-COM_Name';
  fields.access_control.wifi2 = fields.wifi2.ssid.replace(
    /SSID/g, 'X_ZTE-COM_AccessControl',
  );
  fields.access_control.wifi5 = fields.wifi5.ssid.replace(
    /SSID/g, 'X_ZTE-COM_AccessControl',
  );
  fields.port_mapping_fields.internal_port_end = [
    'InternalPortEndRange', 'internal_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.'+
    'LANDevice.1.WIFI';
  fields.diagnostics.sitesurvey.diag_state = 'Radio.*.DiagnosticsState';
  fields.diagnostics.sitesurvey.result = 'Radio.*.X_ZTE-COM_NeighborAP';
  fields.diagnostics.sitesurvey.band = 'Bandwidth';
  fields.diagnostics.traceroute.protocol = 'X_ZTE-COM_Protocol';
  fields.diagnostics.traceroute.ip_version = 'X_ZTE-COM_Mode';

  fields.diagnostics.statistics.cpu_usage = 'InternetGatewayDevice.' +
    'DeviceInfo.X_ZTE-COM_CpuUsed';
  fields.diagnostics.statistics.memory_usage = 'InternetGatewayDevice.' +
    'DeviceInfo.X_ZTE-COM_MemUsed';

  // IPv6
  // Address
  fields.ipv6.address = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_ZTE-COM_ExternalIPv6Address';
  fields.ipv6.address_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_ZTE-COM_ExternalIPv6Address';

  // IPv6 Prefix Delegation
  fields.ipv6.prefix_delegation_address = 'InternetGatewayDevice.WANDevice' +
    '.1.WANConnectionDevice.*.WANIPConnection.*.' +
    'X_ZTE-COM_IPv6PrefixDelegationAddress';
  fields.ipv6.prefix_delegation_address_ppp = 'InternetGatewayDevice.' +
    'WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.' +
    'X_ZTE-COM_IPv6PrefixDelegationAddress';
  fields.ipv6.prefix_delegation_local_address = 'InternetGatewayDevice' +
    '.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.' +
    'X_ZTE-COM_IPv6GUAFormPrefixAddress';
  fields.ipv6.prefix_delegation_local_address_ppp = 'InternetGatewayDevice' +
    '.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.' +
    'X_ZTE-COM_IPv6GUAFormPrefixAddress';

  return fields;
};

module.exports = multilaserModel;
