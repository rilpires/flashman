const basicCPEModel = require('./base-model');

const versionCompare = function(foo, bar) {
  // Returns like C strcmp: 0 if equal, -1 if foo < bar, 1 if foo > bar
  // Remove the leading V in the version so we compare only the numbers
  let fooVer = foo.slice(1).split('.').map((val) => {
    return parseInt(val);
  });
  let barVer = bar.slice(1).split('.').map((val) => {
    return parseInt(val);
  });
  for (let i = 0; i < fooVer.length; i++) {
    if (fooVer[i] < barVer[i]) return -1;
    if (fooVer[i] > barVer[i]) return 1;
  }
  return 0;
};

let greatekModel = Object.assign({}, basicCPEModel);

greatekModel.identifier = {vendor: 'Greatek', model: 'Stavix G421RQ'};

greatekModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.wan.allowReadWanMtu = true;
  permissions.wan.allowEditWanMtu = true;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.features.speedTest = true;
  permissions.features.traceroute = true;
  permissions.mesh.setEncryptionForCable = true;
  permissions.traceroute.ipv6HasPriority = true;
  permissions.traceroute.protocol = 'ICMP';
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.fullSupport;
  permissions.wan.speedTestLimit = 250;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 149, 153, 157, 161,
  ];
  permissions.wifi.modeRead = false;
  permissions.wifi.modeWrite = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.stavixXMLConfig = {
    portForward: true,
    webCredentials: true,
  };
  permissions.firmwareUpgrades = {
    'V1.2.3': [],
    'V2.2.0': [],
    'V2.2.3': [],
    'V2.2.7': [],
    'V2.3.5': [],
    'V2.3.7': [],
  };
  return permissions;
};

// Version 2.3.7 now allows direct editing of user/password fields, so we dont
// rely on xml editing, which causes a reboot and all
const modelPermissionsPost237 = function() {
  let permissions = greatekModel.modelPermissions();
  permissions.stavixXMLConfig.webCredentials = false;
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

greatekModel.convertWifiBand = function(band, is5ghz=false) {
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

greatekModel.convertWifiBandToFlashman = function(band, isAC) {
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

greatekModel.getBeaconType = function() {
  return 'WPA2';
};

greatekModel.getWPAEncryptionMode = function() {
  return 'AESEncryption';
};

greatekModel.getIeeeEncryptionMode = function() {
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
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.1.X_RTK_WANGponLinkConfig.VLANIDMark';
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
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.' +
    'ChannelWidth';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.' +
    'ChannelWidth';
  Object.keys(fields.wifi2).forEach((k)=>{
    fields.wifi2[k] = fields.wifi5[k].replace(/5/g, '6');
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '1');
  });
  fields.wifi2.encryption = 'InternetGatewayDevice.LANDevice.1.'+
    'WLANConfiguration.6.WPAEncryptionModes';
  fields.wifi5.encryption = 'InternetGatewayDevice.LANDevice.1.'+
    'WLANConfiguration.1.WPAEncryptionModes';
  fields.wifi2.encryptionIeee = 'InternetGatewayDevice.LANDevice.1.'+
    'WLANConfiguration.6.IEEE11iEncryptionModes';
  fields.wifi5.encryptionIeee = 'InternetGatewayDevice.LANDevice.1.'+
    'WLANConfiguration.1.IEEE11iEncryptionModes';
  Object.keys(fields.mesh2).forEach((k)=>{
    fields.mesh2[k] = fields.mesh5[k].replace(/6/g, '7');
    fields.mesh5[k] = fields.mesh5[k].replace(/6/g, '2');
  });
  return fields;
};

// Version 2.3.7 now allows direct editing of user/password fields, so we dont
// rely on xml editing, which causes a reboot and all
const modelFieldsPost237 = function() {
  let fields = greatekModel.getModelFields();
  fields.common.web_admin_username = 'InternetGatewayDevice.UserInterface.' +
    'X_WebUserInfo.AdminName';
  fields.common.web_admin_password = 'InternetGatewayDevice.UserInterface.' +
    'X_WebUserInfo.AdminPassword';
  return fields;
};

greatekModel.applyVersionDifferences = function(base, fwVersion, hwVersion) {
  let copy = Object.assign({}, base);
  if (versionCompare(fwVersion, 'V2.3.7') >= 0) {
    copy.modelPermissions = modelPermissionsPost237;
    copy.getModelFields = modelFieldsPost237;
  }
  return copy;
};

module.exports = greatekModel;
