const basicCPEModel = require('./base-model');

let shorelineModel = Object.assign({}, basicCPEModel);

shorelineModel.identifier = {vendor: 'Shoreline', model: 'SH1020W'};

shorelineModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.speedTest = true;
  permissions.features.traceroute = true;
  // Sent bytes always 0
  // permissions.features.wanBytes = false;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.speedTestLimit = 250;
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48, 149, 153, 157, 161, 165];
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.extended2GhzChannels = false;
  permissions.wifi.modeWrite = false;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandRead2 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.firmwareUpgrades = {
    'V4.0-22072550': [],
  };
  return permissions;
};

shorelineModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'g';
    case '11n':
      return 'n';
    case '11na':
      return 'n';
    case '11ac':
      return 'ac';
    case '11ax':
    default:
      return '';
  }
};

shorelineModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
    'X_CT-COM_VLAN';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.X_CT-COM_VLAN';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
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

module.exports = shorelineModel;
