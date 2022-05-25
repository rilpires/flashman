const basicCPEModel = require('./base-model');

let tplinkModel = {};

tplinkModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.mac = 'InternetGatewayDevice.LANDevice.1.'+
    'LANHostConfigManagement.MACAddress';
  Object.keys(fields.wifi5).forEach((k)=>{
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '2');
  });
  fields.wifi2.password = fields.wifi2.password.replace(
    /KeyPassphrase/g, 'X_TP_Password',
  );
  fields.wifi5.password = fields.wifi5.password.replace(
    /KeyPassphrase/g, 'X_TP_Password',
  );
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  return fields;
};

module.exports = tplinkModel;
