const basicCPEModel = require('./base-model');

let datacomModel = Object.assign({}, basicCPEModel);

datacomModel.identifier = {vendor: 'Datacom', model: 'DM955'};

datacomModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.traceroute = false;
  permissions.features.speedTest = true;

  // Values are always zero
  permissions.features.wanBytes = false;

  permissions.lan.configWrite = false;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.LANDeviceHasAssocTree = false;
  permissions.lan.sendDnsOnLANChange = false;
  permissions.lan.sendRoutersOnLANChange = false;

  permissions.wan.speedTestLimit = 80;
  permissions.wan.allowReadWanMtu = false;
  permissions.wan.allowEditWanMtu = false;
  permissions.wan.dhcpUptime = true;
  permissions.wan.hasUptimeField = true;

  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 149, 153, 157, 161, 165];
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.bandRead2 = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.modeWrite = false;

  permissions.firmwareUpgrades = {
    '2.0.0': [],
  };
  return permissions;
};

datacomModel.convertWifiMode = function(mode) {
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

datacomModel.isDeviceConnectedViaWifi = function(
  layer2iface, wifi2iface, wifi5iface,
) {
  if (layer2iface === '802.11') {
    return 'wifi';
  }
  return 'cable';
};

datacomModel.convertWanRate = function(rate) {
  return rate/1000;
};

datacomModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();

  fields.common.web_admin_username =
    'InternetGatewayDevice.User.2.Username';
  fields.wan.rate =
    'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.'+
    'Layer1DownstreamMaxBitRate';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';

  fields.wifi5.password =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.KeyPassphrase';
  fields.wifi5.auto =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.AutoChannelEnable';
  fields.wifi5.enable =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Enable';
  fields.wifi5.ssid =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID';
  // TODO: check fields.wifi5.band
  fields.wifi5.mode =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Standard';
  fields.wifi5.channel =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Channel';
  fields.devices.host_layer2 =
    'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.InterfaceType';

  fields.diagnostics.traceroute.root =
    'InternetGatewayDevice.TraceRouteDiagnostics';

  return fields;
};

module.exports = datacomModel;
