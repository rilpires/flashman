const basicCPEModel = require('./base-model');

let cianetModel = Object.assign({}, basicCPEModel);

cianetModel.identifier = {vendor: 'Cianet', model: 'ONU HW01N'};

cianetModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.portForward = true;
  permissions.features.traceroute = true;
  // permissions.features.speedTest = true; // Limit is too low
  permissions.features.pingTest = true;
  permissions.features.upnp = false;
  permissions.features.wps = false;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.sendRoutersOnLANChange = false;
  permissions.lan.LANDeviceHasAssocTree = false;
  permissions.lan.sendDnsOnLANChange = false;
  permissions.lan.LANDeviceHasSNR = false;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  // permissions.wan.speedTestLimit = 65; // Limit is too low
  permissions.wifi.allowSpaces = false;
  permissions.wifi.dualBand = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.list5ghzChannels = [];
  permissions.wifi.modeWrite = false;
  permissions.firmwareUpgrades = {
    'V2.1.12': [],
  };
  return permissions;
};

cianetModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'g';
    case '11n':
      return 'b,g,n';
    case '11na':
    case '11ac':
    case '11ax':
    default:
      return '';
  }
};

cianetModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
      return 0;
    case 'HT40':
      return 1;
    case 'auto':
      return 2;
    case 'VHT20':
    case 'VHT40':
    default:
      return '';
  }
};

cianetModel.convertWifiBandToFlashman = function(band, isAC) {
  switch (band) {
    // String input
    case 0:
      return (isAC) ? undefined : 'HT20';
    case 1:
      return (isAC) ? undefined : 'HT40';
    case 2:
      return 'auto';
    default:
      return undefined;
  }
};

cianetModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

cianetModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.mac = 'InternetGatewayDevice.LANDevice.1.' +
    'LANHostConfigManagement.MACAddress';
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CATV_TeleComAccount.Password';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CATV_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CATV_GponInterfaceConfig.TXPower';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CATV_GponInterfaceConfig.Stats.BytesSent';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
    'X_CATV_WANGponLinkConfig.VLANIDMark';
  fields.wifi2.password = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.PreSharedKey.1.PreSharedKey';
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.' +
    'X_CATV_ChannelWidth';
  return fields;
};

module.exports = cianetModel;
