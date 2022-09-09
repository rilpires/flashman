const basicCPEModel = require('./base-model');

let fastwirelessModel = Object.assign({}, basicCPEModel);

fastwirelessModel.identifier = {vendor: 'FastWireless', model: 'FW323DAC'};

fastwirelessModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.speedTest = true;
  permissions.wan.speedTestLimit = 250;
  permissions.wifi.rebootAfterWiFi2SSIDChange = true;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64,
    100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140,
    149, 153, 157, 161, 165,
  ];
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.usesStavixXMLConfig = true;
  permissions.lan.LANDeviceHasAssocTree = false;
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

fastwirelessModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '0';
    case 'HT40':
    case 'VHT40':
      return '1';
    case 'VHT80':
      return '3';
    case 'auto':
      return (is5ghz) ? '3' : '1';
    default:
      return '';
  }
};

fastwirelessModel.convertWifiBandToFlashman = function(band, isAC) {
  switch (band) {
    // String input
    case '0':
      return (isAC) ? 'VHT20' : 'HT20';
    case '1':
      return (isAC) ? 'VHT40' : 'HT40';
    case '3':
      return (isAC) ? 'VHT80' : undefined;
    default:
      return undefined;
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
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.' +
    'ChannelWidth';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.' +
    'ChannelWidth';
  Object.keys(fields.wifi2).forEach((k)=>{
    fields.wifi2[k] = fields.wifi5[k];
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '1');
  });
  return fields;
};

module.exports = fastwirelessModel;
