const basicCPEModel = require('./base-model');

let nokiaModel = {};

nokiaModel.identifier = 'Nokia G-2425';

nokiaModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.features.speedTest = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noRanges;
  permissions.wan.speedTestLimit = 850;
  permissions.firmwareUpgrades = {
    '3FE49025IJHK03': [],
  };
  return permissions;
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
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.X_ALU_OntOpticalParam.' +
    'RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.X_ALU_OntOpticalParam.' +
    'TXPower';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
    'X_CT-COM_WANGponLinkConfig.VLANIDMark';
  return fields;
};

module.exports = nokiaModel;
