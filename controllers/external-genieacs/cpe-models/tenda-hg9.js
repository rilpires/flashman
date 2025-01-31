const basicCPEModel = require('./base-model');

let tendaModel = Object.assign({}, basicCPEModel);

tendaModel.identifier = {vendor: 'Tenda', model: 'HG9'};

tendaModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.traceroute = true;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.features.hasIpv6Information = true;
  permissions.features.hasCPUUsage = true;
  permissions.features.hasMemoryUsage = true;
  permissions.traceroute.protocol = 'ICMP';
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.pingTestSingleAttempt = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.fullSupport;
  permissions.wan.hasIpv4RemoteAddressField = true;
  permissions.wan.hasIpv4DefaultGatewayField = true;
  permissions.wan.hasDnsServerField = true;
  permissions.ipv6.hasAddressField = true;
  permissions.ipv6.hasDefaultGatewayField = true;
  permissions.ipv6.hasPrefixDelegationAddressField = true;
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48];
  permissions.wifi.bandRead2 = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.modeWrite = false;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.stavixXMLConfig = {
    portForward: true,
    webCredentials: true,
  };
  permissions.firmwareUpgrades = {
    'v1.0.1': [],
  };
  permissions.lan.dnsServersLimit = 3;
  return permissions;
};

tendaModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'bg';
    case '11n':
      return 'bgn';
    case '11na':
      return 'an';
    case '11ac':
      return 'anac';
    case '11ax':
    default:
      return '';
  }
};

tendaModel.getBeaconType = function() {
  return 'WPA2';
};

tendaModel.convertToDbm = function(power) {
  return parseFloat(power.split(' ')[0]).toFixed(3);
};

tendaModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.X_TDTC_VLAN';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.X_TDTC_VLAN';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'WANGponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'WANGponInterfaceConfig.TXPower';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.service_type = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_TDTC_ServiceList';
  fields.wan.service_type_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_TDTC_ServiceList';

  // IPv6
  // Address
  fields.ipv6.address = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_TDTC_IPv6Address';
  fields.ipv6.address_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_TDTC_IPv6Address';

  // Default gateway
  fields.ipv6.default_gateway = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_TDTC_IPv6GatewayAddress';
  fields.ipv6.default_gateway_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_TDTC_IPv6GatewayAddress';

  // IPv6 Prefix Delegation
  // Address
  fields.ipv6.prefix_delegation_address = 'InternetGatewayDevice.WANDevice'+
    '.1.WANConnectionDevice.*.WANIPConnection'+
    '.*.X_TDTC_IPv6PrefixDelegationAddress';
  fields.ipv6.prefix_delegation_address_ppp = 'InternetGatewayDevice.WANDevice'+
    '.1.WANConnectionDevice.*.WANPPPConnection'+
    '.*.X_TDTC_IPv6PrefixDelegationAddress';

  Object.keys(fields.wifi2).forEach((k)=>{
    fields.wifi2[k] = fields.wifi5[k].replace(/5/g, '6');
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '1');
  });
  Object.keys(fields.mesh2).forEach((k)=>{
    fields.mesh2[k] = fields.mesh5[k].replace(/6/g, '7');
    fields.mesh5[k] = fields.mesh5[k].replace(/6/g, '2');
  });
  return fields;
};

module.exports = tendaModel;
