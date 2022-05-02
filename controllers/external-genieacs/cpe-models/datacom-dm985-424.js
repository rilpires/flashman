const basicCPEModel = require('./base-model');

let datacomModel = {};

datacomModel.getFieldType = basicCPEModel.getFieldType;

datacomModel.convertWifiMode = function(mode) {
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

datacomModel.convertWifiBand = basicCPEModel.convertWifiBand;

datacomModel.convertField = basicCPEModel.convertField;

datacomModel.getBeaconType = function() {
  return 'WPAand11i';
};

datacomModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.TXPower';
  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.Hosts.Host.'+
    '*.InterfaceType';
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.'+
    'X_CT-COM_TeleComAccount.Password';
  fields.port_mapping_values.protocol[1] = 'BOTH';
  delete fields.port_mapping_fields.external_port_end;
  return fields;
};

module.exports = datacomModel;
