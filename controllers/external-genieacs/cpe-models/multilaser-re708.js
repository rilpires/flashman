const basicCPEModel = require('./base-model');

let multilaserModel = Object.assign({}, basicCPEModel);

multilaserModel.identifier = {vendor: 'Multilaser / ZTE', model: 'RE708'};

multilaserModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.pingTest = true;
  permissions.features.speedTest = true;
  permissions.wan.speedTestLimit = 290;
  permissions.lan.configWrite = false;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.sendDnsOnLANChange = false;
  permissions.lan.sendRoutersOnLANChange = false;
  permissions.wan.dhcpUptime = true;
  permissions.wan.hasUptimeField = true;
  permissions.wan.canTrustWanRate = false;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 149, 153, 157, 161,
  ];
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.extended2GhzChannels = false;
  permissions.wifi.bandRead2 = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.modeWrite = false;
  permissions.firmwareUpgrades = {
    'RE1200R4GC-2T2R-V3_v3411b_MUL015B': [],
  };
  return permissions;
};

multilaserModel.convertWifiMode = function(mode, is5ghz=false) {
  switch (mode) {
    case '11g':
      return 'b,g';
    case '11n':
      return 'g';
    case '11na':
      return 'a,n';
    case '11ac':
      return 'a,n,ac';
    case '11ax':
    default:
      return '';
  }
};

multilaserModel.useModelAlias = function(fwVersion) {
  if (fwVersion === 'RE1200R4GC-2T2R-V3_v3411b_MUL015B') {
    return 'RE708';
  }
  return '';
};

multilaserModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  Object.keys(fields.wifi2).forEach((k)=>{
    fields.wifi2[k] = fields.wifi5[k].replace(/5/g, '2');
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '1');
  });
  return fields;
};

module.exports = multilaserModel;
