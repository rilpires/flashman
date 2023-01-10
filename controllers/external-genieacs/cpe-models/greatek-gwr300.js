const basicCPEModel = require('./base-model');

let greatekModel = Object.assign({}, basicCPEModel);

greatekModel.identifier = {vendor: 'Greatek', model: 'GWR300'};

greatekModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.wan.pppUptime = false;
  permissions.wifi.modeWrite = false;
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.bandRead2 = false;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto5 = false;
  return permissions;
};

basicCPEModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'b,g';
    case '11n':
      return 'b,g,n';
    case '11na':
      return '';
    case '11ac':
      return '';
    case '11ax':
    default:
      return '';
  }
};

greatekModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesReceived'
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesSent'
  fields.lan.subnet_mask = 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.SubnetMask'
  return fields;
};

module.exports = greatekModel;
