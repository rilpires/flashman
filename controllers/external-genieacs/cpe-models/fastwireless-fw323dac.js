const basicCPEModel = require('./base-model');

let fastwirelessModel = Object.assign({}, basicCPEModel);

fastwirelessModel.identifier = 'FastWireless FW323DAC';

fastwirelessModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.speedTest = true;
  permissions.wan.speedTestLimit = 250;
  permissions.wifi.rebootAfterWiFi2SSIDChange = true;
  permissions.usesStavixXMLConfig = true;
  permissions.firmwareUpgrades = {
    'V2.0.08-191129': [],
  };
  return permissions;
};

fastwirelessModel.convertWifiMode = function(mode) {
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

fastwirelessModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

fastwirelessModel.useModelAlias = function(fwVersion) {
  // Use this for the firmwares that have IGD as ModelName
  if (fwVersion === 'V2.0.08-191129') {
    return 'FW323DAC';
  }
  return '';
};

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
