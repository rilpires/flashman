const basicCPEModel = require('./base-model');

let e4lModel = Object.assign({}, basicCPEModel);

e4lModel.identifier = {vendor: 'E4L', model: 'E4L-H5410WA'};

e4lModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  // permissions.features.speedTest = true; // Commented since it caps at 40Mbps
  permissions.features.traceroute = true;
  permissions.lan.configWrite = false;
  permissions.wan.allowReadWanMtu = false;
  permissions.wan.allowEditWanMtu = false;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.pingTestSetInterface = true;
  // permissions.wan.speedTestSetInterface = true;
  permissions.wan.traceRouteSetInterface = true;
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 100, 104,
    108, 112, 116, 120, 124, 128, 132, 136, 140,
  ];
  permissions.firmwareUpgrades = {'V6.2.9T1': []};
  return permissions;
};

e4lModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'bg';
    case '11n':
      return 'bgn';
    case '11na':
      return 'n';
    case '11ac':
      return 'ac';
    case '11ax':
    default:
      return '';
  }
};

e4lModel.convertWifiBand = function(band, is5ghz=false) {
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
      return (is5ghz) ? '3' : '2';
    default:
      return '';
  }
};

e4lModel.convertWifiBandToFlashman = function(band, isAC) {
  switch (band) {
    // String input
    case '3':
      return 'auto';
    case '2':
      return 'auto';
    case '0':
      return (isAC) ? 'VHT20' : 'HT20';
    case '1':
      return (isAC) ? 'VHT40' : 'HT40';
    default:
      return undefined;
  }
};

e4lModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

e4lModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CT-COM_TeleComAccount.Password';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
  'X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CT-COM_GponInterfaceConfig.TXPower';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.1.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.1.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wifi2.password = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.PreSharedKey.1.KeyPassphrase';
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.X_CT-COM_ChannelWidth';
  fields.wifi5.password = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.5.PreSharedKey.1.PreSharedKey';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.5.X_CT-COM_ChannelWidth';
  return fields;
};

module.exports = e4lModel;
