const basicCPEModel = require('./base-model');

let nokiaModel = Object.assign({}, basicCPEModel);

nokiaModel.identifier = {vendor: 'Nokia', model: 'BEACON HA-020W-B'};

nokiaModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.portForward = true;
  permissions.features.speedTest = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wan.speedTestLimit = 800;
  permissions.firmwareUpgrades = {
    '3FE49127HJII42': [],
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
      return '20MHz';
    case 'HT40':
    case 'VHT40':
      return '40MHz';
    case 'VHT80':
      return '80MHz';
    case 'auto':
      return 'Auto';
    default:
      return '';
  }
};

nokiaModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wifi2.password = fields.wifi2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.wifi5.password = fields.wifi5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.' +
    'X_ALU_COM_ChannelBandWidthExtend';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.' +
    'X_ALU_COM_ChannelBandWidthExtend';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.RSSI';
  fields.common.web_admin_username = 'InternetGatewayDevice.X_Authentication.' +
    'WebAccount.UserName';
  fields.common.web_admin_password = 'InternetGatewayDevice.X_Authentication.' +
    'WebAccount.Password';
  fields.port_mapping_values.protocol[1] = 'TCPorUDP';
  fields.port_mapping_values.remote_host = ['RemoteHost', '', 'xsd:string'];
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_fields.internal_port_end = [
    'X_ASB_COM_InternalPortEnd', 'internal_port_end', 'xsd:unsignedInt',
  ];
  return fields;
};

module.exports = nokiaModel;
