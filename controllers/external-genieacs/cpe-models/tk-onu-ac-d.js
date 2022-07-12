const basicCPEModel = require('./base-model');

let tkOnuAcDModel = Object.assign({}, basicCPEModel);

tkOnuAcDModel.identifier = 'Think TK-ONU-AC-D';

tkOnuAcDModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.firmwareUpgrade = false;
  permissions.features.pingTest = true;
  permissions.features.speedTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wan.speedTestLimit = 2000;
  permissions.wan.pingTestSingleAttempt = true;
  permissions.firmwareUpgrades = {
    'V1.0.9': [],
  };
  permissions.wifi.extended2GhzChannels = false;
  return permissions;
};

tkOnuAcDModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'g';
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

// Conversion from Flashman format to CPE format
basicCPEModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '20Mhz';
    case 'HT40':
    case 'VHT40':
      return '40Mhz';
    case 'VHT80':
      return '80Mhz';
    case 'auto':
      return 'Auto';
    default:
      return '';
  }
};

tkOnuAcDModel.getBeaconType = function() {
  return 'WPA/WPA2';
};

tkOnuAcDModel.convertChannelToTask = function(channel, fields, masterKey) {
  let auto = (channel === 'auto');
  let values = [];
  values.push([
    fields[masterKey]['channel'], (auto) ? '0' : channel, 'xsd:unsignedInt',
  ]);
  return values;
};


tkOnuAcDModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

tkOnuAcDModel.convertWifiRate = function(rate) {
  return parseInt(rate) / 1000;
};

tkOnuAcDModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
    '.1.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.TXPower';
  fields.wan.rate = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.Layer1DownstreamMaxBitRate';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.common.alt_uid = 'InternetGatewayDevice.LANDevice.1.' +
    'LANEthernetInterfaceConfig.1.MACAddress';
  return fields;
};

module.exports = tkOnuAcDModel;
