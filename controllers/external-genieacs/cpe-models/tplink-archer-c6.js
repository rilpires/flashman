const basicCPEModel = require('./base-model');

let tplinkModel = Object.assign({}, basicCPEModel);

tplinkModel.identifier = 'TP-Link Archer C6';

tplinkModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.firmwareUpgrade = false;
  permissions.features.pingTest = true;
  permissions.wan.dhcpUptime = false;
  permissions.firmwareUpgrades = {
    '1.0.14 Build 20211118 rel.43110(5553)': [],
  };
  return permissions;
};

tplinkModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'b,g';
    case '11n':
      return 'b,g,n';
    case '11na':
      return 'a,n';
    case '11ac':
      return 'ac,n,a';
    case '11ax':
    default:
      return '';
  }
};

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
