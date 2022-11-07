const basicCPEModel = require('./base-model');

let fiberhomeModel = Object.assign({}, basicCPEModel);

fiberhomeModel.identifier = {vendor: 'Fiberhome', model: 'HG6245D'};

fiberhomeModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.meshWifi = true;
  permissions.features.ponSignal = true;
  permissions.features.pingTest = true;
  permissions.features.portForward = true;
  permissions.wan.pingTestSetInterface = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64,
    100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144,
    149, 153, 157, 161,
  ];
  permissions.wifi.modeWrite = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.mesh.hardcodedBSSIDOffset = true;
  permissions.mesh.bssidOffsets2Ghz = [
    '-0x86', '0x0', '0x0', '0x0', '0x0', '0x1',
  ];
  permissions.mesh.bssidOffsets5Ghz = [
    '-0x7E', '0x0', '0x0', '0x0', '0x0', '0x5',
  ];
  return permissions;
};

fiberhomeModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'n'; // It only accepts N
    case '11n':
      return 'n';
    case '11na':
      return 'n';
    case '11ac':
      return 'ac';
    case '11ax':
    default:
      return '';
  }
};

fiberhomeModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '1';
    case 'HT40':
    case 'VHT40':
      return '2';
    case 'VHT80':
      return '3';
    case 'auto': // This model's 5ghz auto is only 20/40
      return '0';
    default:
      return '';
  }
};

fiberhomeModel.convertWifiBandToFlashman = function(band, isAC) {
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

fiberhomeModel.getBeaconType = function() {
  return '11i';
};

fiberhomeModel.convertToDbm = function(power) {
  return parseFloat(power).toFixed(3);
};

fiberhomeModel.convertWifiRate = function(rate) {
  return parseInt(rate) / 1000;
};

fiberhomeModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.recv_bytes = fields.wan.recv_bytes.replace(
    /WANEthernetInterfaceConfig/g, 'X_FH_GponInterfaceConfig',
  );
  fields.wan.sent_bytes = fields.wan.sent_bytes.replace(
    /WANEthernetInterfaceConfig/g, 'X_FH_GponInterfaceConfig',
  );
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.X_FH_WANGponLinkConfig.VLANID';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.X_FH_WANGponLinkConfig.VLANID';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.AssociatedDeviceRSSI';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.AssociatedDeviceTxRate';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_FH_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_FH_GponInterfaceConfig.TXPower';
  fields.port_mapping_values.protocol[1] = 'ALL';
  fields.port_mapping_fields.internal_port_end = [
    'X_FH_InternalPortEndRange', 'internal_port_start', 'xsd:unsignedInt',
  ];
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
  return fields;
};

module.exports = fiberhomeModel;
