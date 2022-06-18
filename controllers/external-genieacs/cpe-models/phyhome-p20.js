const basicCPEModel = require('./base-model');

let phyhomeModel = {};

phyhomeModel.identifier = 'PhyHome P20';

phyhomeModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.ponSignal = true;
  permissions.lan.configWrite = false;
  permissions.wifi.ssidWrite = false;
  return permissions;
};

phyhomeModel.getFieldType = basicCPEModel.getFieldType;

phyhomeModel.convertWifiMode = function(mode) {
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

phyhomeModel.convertWifiBand = basicCPEModel.convertWifiBand;

phyhomeModel.convertWifiBandToFlashman =
  basicCPEModel.convertWifiBandToFlashman;

phyhomeModel.convertField = basicCPEModel.convertField;

phyhomeModel.getBeaconType = basicCPEModel.getBeaconType;

phyhomeModel.convertGenieSerial = basicCPEModel.convertGenieSerial;

phyhomeModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

phyhomeModel.isAllowedWebadminUsername =
  basicCPEModel.isAllowedWebadminUsername;

phyhomeModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CT-COM_GponInterfaceConfig.TXPower';
  return fields;
};

module.exports = phyhomeModel;
