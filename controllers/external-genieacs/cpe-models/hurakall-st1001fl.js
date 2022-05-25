const basicCPEModel = require('./base-model');

let hurakallModel = {};

hurakallModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CT-COM_TeleComAccount.Password';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
    'X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CT-COM_GponInterfaceConfig.TXPower';
  fields.port_mapping_values.protocol[1] = 'TCP AND UDP';
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

module.exports = hurakallModel;
