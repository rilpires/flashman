const basicCPEModel = require('./base-model');

let fiberhomeModel = Object.assign({}, basicCPEModel);

fiberhomeModel.identifier = 'Fiberhome HG6145F';

fiberhomeModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.firmwareUpgrade = true;
  permissions.features.mesh = true;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.lan.blockLANDevices = true;
  permissions.wan.pingTestSetInterface = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noRanges;
  permissions.mesh.bssidOffsets2Ghz = [
    '0x2', '0x0', '0x0', '0x0', '0x0', '0x0',
  ];
  permissions.mesh.bssidOffsets5Ghz = [
    '0x2', '0x0', '0x0', '0x0', '0x0', '0x2',
  ];
  permissions.mesh.objectExists = true;
  permissions.firmwareUpgrades = {
    'RP2930': [],
  };
  return permissions;
};

fiberhomeModel.convertWifiMode = function(mode) { // VERIFY
  switch (mode) {
    case '11g':
      return 'bg';
    case '11n':
      return 'bgn';
    case '11na':
      return 'an';
    case '11ac':
      return 'a,n,ac';
    case '11ax':
    default:
      return '';
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
  fields.common.web_admin_username = 'InternetGatewayDevice.DeviceInfo.' +
    'X_FH_Account.X_FH_WebUserInfo.WebSuperUsername';
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.' +
    'X_FH_Account.X_FH_WebUserInfo.WebSuperPassword';
  fields.wan.recv_bytes = fields.wan.recv_bytes.replace(
    /WANEthernetInterfaceConfig/g, 'X_FH_GponInterfaceConfig',
  );
  fields.wan.sent_bytes = fields.wan.sent_bytes.replace(
    /WANEthernetInterfaceConfig/g, 'X_FH_GponInterfaceConfig',
  );
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
    'WANPPPConnection.*.X_ZTE-COM_VLANID';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' + // VERIFY
    'WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_RSSI';
  fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.' + // VERIFY
    'WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_SNR';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.' + // VERIFY
    'WLANConfiguration.*.AssociatedDevice.*.LastDataTransmitRate';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_FH_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_FH_GponInterfaceConfig.TXPower';
  fields.port_mapping_values.protocol[1] = 'TCP AND UDP'; // VERIFY
  fields.access_control.wifi2 = fields.wifi2.ssid.replace( // VERIFY
    /SSID/g, 'X_ZTE-COM_AccessControl',
  );
  fields.access_control.wifi5 = fields.wifi5.ssid.replace( // VERIFY
    /SSID/g, 'X_ZTE-COM_AccessControl',
  );
  fields.port_mapping_fields.external_port_end = [ // VERIFY
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
