const basicCPEModel = require('./base-model');

let intelbrasModel = Object.assign({}, basicCPEModel);

intelbrasModel.identifier = {
  vendor: 'Intelbras',
  model: 'WiFiber 1200R inMesh',
};

intelbrasModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.firmwareUpgrade = true;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.speedTest = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.fullSupport;
  permissions.wan.speedTestLimit = 300;
  permissions.lan.listLANDevicesSNR = true;
  permissions.lan.configWrite = false;
  permissions.lan.sendRoutersOnLANChange = false;
  permissions.wifi.extended2GhzChannels = false;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108,
    112, 116, 136, 140, 149, 153, 157, 161,
  ];
  permissions.wifi.bandWrite = false;
  permissions.firmwareUpgrades = {
    '1.1-220712': [],
  };
  return permissions;
};

// Used when setting up a mesh network
basicCPEModel.getBeaconType = function() {
  return '11i';
};

intelbrasModel.convertWifiMode = function(mode) {
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

intelbrasModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '20MHz';
    case 'HT40':
    case 'VHT40':
      return '40MHz';
    case 'VHT80':
      return '80MHz';
    case 'auto':
      return (is5ghz) ? '80MHz' : '40MHz';
    default:
      return '';
  }
};

intelbrasModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.alt_uid = fields.common.mac;
  fields.common.web_admin_password = 'InternetGatewayDevice'+
    '.UserInterface.AdminPassword';
  fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.'+
    'WLANConfiguration.1.AssociatedDevice.1.X_ITBS_WLAN_SNR';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_ITBS_WLAN_ClientSignalStrength';
  fields.devices.host_mode = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_ITBS_WLAN_ClientMode';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_GponInterafceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_GponInterafceConfig.TXPower';
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1'+
    '.X_ITBS_BandWidth';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5'+
    '.X_ITBS_BandWidth';
  fields.wifi2.mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1'+
    '.X_ITBS_WlanStandard';
  fields.wifi5.mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5'+
    '.X_ITBS_WlanStandard';
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

module.exports = intelbrasModel;
