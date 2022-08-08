const basicCPEModel = require('./base-model');

let greatekModel = Object.assign({}, basicCPEModel);

greatekModel.identifier = {vendor: 'Greatek', model: 'Stavix G421RQ'};

greatekModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.features.speedTest = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.fullSupport;
  permissions.wan.speedTestLimit = 250;
  permissions.usesStavixXMLConfig = true;
  permissions.firmwareUpgrades = {
    'V1.2.3': [],
    'V2.2.0': [],
    'V2.2.3': [],
    'V2.2.7': [],
  };
  return permissions;
};

greatekModel.convertWifiMode = function(mode) {
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

greatekModel.getBeaconType = function() {
  return 'WPA2';
};

greatekModel.getEncryptionMode = function() {
  return 'AESEncryption';
};

greatekModel.getEncryption2Mode = function() {
  return 'TKIPEncryption';
};

greatekModel.convertRssiValue = function(rssiValue) {
  let result = basicCPEModel.convertRssiValue(rssiValue);
  // This model sends RSSI as a positive value instead of negative
  if (typeof result !== 'undefined') {
    result = -result;
  }
  return result;
};

greatekModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
    'X_RTK_WANGponLinkConfig.VLANIDMark';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.WLAN_RSSI';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_GponInterafceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_GponInterafceConfig.TXPower';
  Object.keys(fields.wifi2).forEach((k)=>{
    fields.wifi2[k] = fields.wifi5[k].replace(/5/g, '6');
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '1');
  });
  fields.wifi2.encryption = 'InternetGatewayDevice.LANDevice.1.'+
    'WLANConfiguration.6.WPAEncryptionModes';
  fields.wifi5.encryption = 'InternetGatewayDevice.LANDevice.1.'+
    'WLANConfiguration.1.WPAEncryptionModes';
  fields.wifi2.encryption2 = 'InternetGatewayDevice.LANDevice.1.'+
    'WLANConfiguration.6.IEEE11iEncryptionModes';
  fields.wifi5.encryption2 = 'InternetGatewayDevice.LANDevice.1.'+
    'WLANConfiguration.1.IEEE11iEncryptionModes';
  Object.keys(fields.mesh2).forEach((k)=>{
    fields.mesh2[k] = fields.mesh5[k].replace(/6/g, '7');
    fields.mesh5[k] = fields.mesh5[k].replace(/6/g, '2');
  });
  return fields;
};

module.exports = greatekModel;
