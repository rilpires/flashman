const basicCPEModel = require('./base-model');

let tendaModel = {};

tendaModel.identifier = 'Tenda HG9';

tendaModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.fullSupport;
  permissions.usesStavixXMLConfig = true;
  permissions.firmwareUpgrades = {
    'v1.0.1': [],
  };
  return permissions;
};

tendaModel.getFieldType = basicCPEModel.getFieldType;

tendaModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'bg';
    case '11n':
      return 'bgn';
    case '11na':
      return 'an';
    case '11ac':
      return 'anac';
    case '11ax':
    default:
      return '';
  }
};

tendaModel.convertWifiBand = basicCPEModel.convertWifiBand;

tendaModel.convertWifiBandToFlashman = basicCPEModel.convertWifiBandToFlashman;

tendaModel.convertField = basicCPEModel.convertField;

tendaModel.getBeaconType = function() {
  return 'WPA2';
};

tendaModel.convertGenieSerial = basicCPEModel.convertGenieSerial;

tendaModel.convertToDbm = function(power) {
  return parseFloat(power.split(' ')[0]);
};

tendaModel.isAllowedWebadminUsername = basicCPEModel.isAllowedWebadminUsername;

tendaModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.1.X_TDTC_VLAN';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'WANGponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'WANGponInterfaceConfig.TXPower';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  Object.keys(fields.wifi2).forEach((k)=>{
    fields.wifi2[k] = fields.wifi5[k].replace(/5/g, '6');
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '1');
  });
  Object.keys(fields.mesh2).forEach((k)=>{
    fields.mesh2[k] = fields.mesh5[k].replace(/6/g, '7');
    fields.mesh5[k] = fields.mesh5[k].replace(/6/g, '2');
  });
  return fields;
};

module.exports = tendaModel;
