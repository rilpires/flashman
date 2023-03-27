const basicCPEModel = require('./base-model');

let parksModel = Object.assign({}, basicCPEModel);

parksModel.identifier = {vendor: 'Parks', model: 'Fiberlink 501'};

parksModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  // permissions.features.pingTest = true; // Never update AverageResponseTime
  permissions.features.speedTest = true;
  permissions.features.traceroute = true;
  permissions.lan.listLANDevices = false;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.traceRouteSetInterface = true;
  permissions.wan.dhcpUptime = true;
  permissions.wan.hasUptimeField = true;
  permissions.wan.speedTestLimit = 230;
  permissions.wan.canTrustWanRate = false;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 100, 108,
    112, 116, 136, 140, 149, 157, 161, 165,
  ];
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.bandRead2 = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.traceroute.minProbesPerHop = 3;
  permissions.traceroute.hopCountExceededState = 'Error_Other';
  permissions.firmwareUpgrades = {
    'V4.1.0-220609': [],
  };
  return permissions;
};

parksModel.convertWifiMode = function(mode, is5ghz=false) {
  switch (mode) {
    case '11g':
      return 'g';
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

parksModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_RTK_VlanMuxID';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_RTK_VlanMuxID';
  Object.keys(fields.wifi2).forEach((k)=>{
    fields.wifi2[k] = fields.wifi5[k].replace(/5/g, '6');
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '1');
  });
  return fields;
};

module.exports = parksModel;
