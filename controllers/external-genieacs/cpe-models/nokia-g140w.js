const basicCPEModel = require('./base-model');

let nokiaModel = Object.assign({}, basicCPEModel);

nokiaModel.identifier = {vendor: 'Nokia', model: 'G-140W-C'};

nokiaModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.traceroute = true;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.hasIpv6Information = true;
  permissions.features.hasCPUUsage = true;
  permissions.features.hasMemoryUsage = true;

  permissions.wan.hasIpv4RemoteAddressField = true;
  permissions.wan.hasDnsServerField = true;

  permissions.traceroute.protocol = 'ICMP';
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 149, 153, 157, 161,
  ];
  permissions.wifi.modeWrite = false;
  permissions.lan.LANDeviceCanTrustActive = false;

  permissions.ipv6.hasAddressField = true;
  permissions.ipv6.hasDefaultGatewayField = true;
  permissions.ipv6.hasPrefixDelegationAddressField = true;

  permissions.lan.dnsServersLimit = 2;

  permissions.firmwareUpgrades = {
    '3FE46343AFIA57': [],
    '3FE46343AFIA89': [],
    '3FE46343AFIA94': [],
  };
  return permissions;
};

nokiaModel.convertWifiMode = function(mode) {
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

nokiaModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '0';
    case 'HT40':
    case 'VHT40':
      return '1';
    case 'VHT80':
      return '3';
    case 'auto':
      return (is5ghz) ? '3' : '2';
    default:
      return '';
  }
};

nokiaModel.convertWifiBandToFlashman = function(band, isAC) {
  switch (band) {
    // String input
    case '0':
      return (isAC) ? 'VHT20' : 'HT20';
    case '1':
      return (isAC) ? 'VHT40' : 'HT40';
    case '2':
      return 'auto';
    case '3':
      return (isAC) ? 'auto' : undefined;
    default:
      return undefined;
  }
};

nokiaModel.convertField = function(
  masterKey, key, value, typeFunc, modeFunc, bandFunc,
) {
  let fullKey = masterKey + '-' + key;
  if (fullKey === 'wifi2-enable' || fullKey === 'wifi5-enable') {
    let result = {value: null, type: nokiaModel.getFieldType(masterKey, key)};
    result.value = (value > 0) ? 'TRUE' : 'FALSE';
    return result;
  }
  return basicCPEModel.convertField(
    masterKey, key, value, typeFunc, modeFunc, bandFunc,
  );
};

nokiaModel.getBeaconType = function() {
  return 'WPA/WPA2';
};

nokiaModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

nokiaModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_username = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CMCC_TeleComAccount.Username';
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CMCC_TeleComAccount.Password';
  fields.diagnostics.traceroute.protocol = 'Mode';
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
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CMCC_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CMCC_GponInterfaceConfig.TXPower';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_CMCC_VLANIDMark';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_CMCC_VLANIDMark';
  fields.wan.mtu = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.InterfaceMtu';
  fields.wan.mtu_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.InterfaceMtu';

  fields.diagnostics.statistics.cpu_usage = 'InternetGatewayDevice.' +
    'DeviceInfo.X_ALU-COM_CPUMEMMonitor.cpu';

  // IPv6
  // Address
  fields.ipv6.address = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_CMCC_IPv6IPAddress';
  fields.ipv6.address_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_CMCC_IPv6IPAddress';

  // Default Gateway
  fields.ipv6.default_gateway = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_CMCC_DefaultIPv6Gateway';
  fields.ipv6.default_gateway_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_CMCC_DefaultIPv6Gateway';

  // IPv6 Prefix Delegation
  // Address
  fields.ipv6.prefix_delegation_address = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.WANIPConnection.*.X_CMCC_IPv6Prefix';
  fields.ipv6.prefix_delegation_address_ppp = 'InternetGatewayDevice.WANDevice'+
    '.1.WANConnectionDevice.*.WANPPPConnection.*.X_CMCC_IPv6Prefix';

  return fields;
};

module.exports = nokiaModel;
