const basicCPEModel = require('./base-model');

let greatekModel = Object.assign({}, basicCPEModel);

greatekModel.identifier = {vendor: 'Greatek', model: 'GWR300'};

greatekModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.lan.configWrite = false;
  permissions.wan.mustRebootAfterChanges = true;
  permissions.wifi.dualBand = false;
  permissions.wifi.rebootAfterWiFi2SSIDChange = true;
  permissions.wifi.modeWrite = false;
  permissions.wifi.bandRead2 = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.firmwareUpgrades = {
    'v3.4.6.7': [],
  };
  return permissions;
};

greatekModel.useModelAlias = function(fwVersion) {
  // Use this for the firmwares that have IGD as ModelName
  return 'GWR300';
};

greatekModel.convertGenieSerial = function(serial, mac) {
  return mac;
};

greatekModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'b,g';
    case '11n':
      return 'b,g,n';
    case '11na':
    case '11ac':
    case '11ax':
    default:
      return '';
  }
};

greatekModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  return fields;
};

module.exports = greatekModel;
