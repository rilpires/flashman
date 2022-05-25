const basicCPEModel = require('./base-model');

let nokiaModel = {};

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
