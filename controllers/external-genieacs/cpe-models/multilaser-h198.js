const basicCPEModel = require('./base-model');

let multilaserModel = Object.assign({}, basicCPEModel);

multilaserModel.identifier = 'Multilaser/ZTE H198';

multilaserModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.firmwareUpgrade = true;
  permissions.features.mesh = true;
  permissions.features.pingTest = true;
  permissions.features.portForward = true;
  permissions.features.speedTest = true;
  permissions.features.stun = true;
  permissions.lan.blockLANDevices = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wan.speedTestLimit = 100;
  permissions.mesh.objectExists = true;
  permissions.firmwareUpgrades = {
    'V3.0.0C5_MUL': ['V3.0.0C6_MUL'],
    'V3.0.0C6_MUL': [],
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

multilaserModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

multilaserModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_username = 'InternetGatewayDevice.DeviceInfo.' +
    'X_ZTE-COM_AdminAccount.Username';
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.' +
    'X_ZTE-COM_AdminAccount.Password';
  fields.devices.associated = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.AssociatedDevice';
  fields.devices.associated_5 = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.5.AssociatedDevice';
  fields.port_mapping_fields.internal_port_end = [
    'X_ZTE-COM_InternalPortEndRange', 'internal_port_start', 'xsd:unsignedInt',
  ];
  fields.port_mapping_values.protocol[1] = 'BOTH';
  fields.common.stun_enable = 'InternetGatewayDevice.ManagementServer.' +
    'STUNEnable';
  fields.common.stun_udp_conn_req_addr = 'InternetGatewayDevice.' +
    'ManagementServer.UDPConnectionRequestAddress';
  fields.access_control.wifi2 = fields.wifi2.ssid.replace(
    /SSID/g, 'X_ZTE-COM_AccessControl',
  );
  fields.access_control.wifi5 = fields.wifi5.ssid.replace(
    /SSID/g, 'X_ZTE-COM_AccessControl',
  );
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

module.exports = multilaserModel;
