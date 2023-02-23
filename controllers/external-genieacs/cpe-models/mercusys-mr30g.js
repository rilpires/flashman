const basicCPEModel = require('./base-model');

let mercusysModel = Object.assign({}, basicCPEModel);

mercusysModel.identifier = {vendor: 'MERCUSYS', model: 'MR30G'};

mercusysModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.cableRxRate = false;
  permissions.features.customAppPassword = false;
  // permissions.features.pingTest = true; // Never update AverageResponseTime
  permissions.features.traceroute = true;
  permissions.features.wanBytes = false;
  permissions.lan.listLANDevices = false;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.LANDeviceHasSNR = false;
  permissions.lan.LANDeviceHasAssocTree = false;
  permissions.lan.sendRoutersOnLANChange = false;
  permissions.wan.dhcpUptime = false;
  permissions.wan.hasUptimeField = true;
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48, 149, 153, 157, 161, 165];
  permissions.wifi.allowDiacritics = true;
  permissions.firmwareUpgrades = {
    '1.5.13 Build 220428 Rel.41353n(4252)': [],
  };
  return permissions;
};

mercusysModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
    case '11n':
      return 'n';
    case '11na':
      return 'a';
    case '11ac':
      return 'ac';
    case '11ax':
    default:
      return '';
  }
};

mercusysModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '20M';
    case 'HT40':
    case 'VHT40':
      return '40M';
    case 'VHT80':
      return '80M';
    case 'auto':
      return 'Auto';
    default:
      return '';
  }
};

mercusysModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.mac = 'InternetGatewayDevice.LANDevice.1.'+
    'LANHostConfigManagement.MACAddress';
  Object.keys(fields.wifi5).forEach((k)=>{
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '3');
  });
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.X_TP_Bandwidth';
  fields.wifi2.password = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.X_TP_PreSharedKey'
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.3.X_TP_Bandwidth';
  fields.wifi5.password = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.3.X_TP_PreSharedKey';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.Stats.EthernetBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.Stats.EthernetBytesSent';
  return fields;
};

module.exports = mercusysModel;
