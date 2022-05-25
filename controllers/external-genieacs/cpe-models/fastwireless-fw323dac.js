const basicCPEModel = require('./base-model');

let fastwirelessModel = {};

fastwirelessModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.alt_uid = fields.common.mac;
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_rxpower_epon = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_EponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.TXPower';
  fields.wan.pon_txpower_epon = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_EponInterfaceConfig.TXPower';
  Object.keys(fields.wifi2).forEach((k)=>{
    fields.wifi2[k] = fields.wifi5[k];
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '1');
  });
  return fields;
};

module.exports = fastwirelessModel;
