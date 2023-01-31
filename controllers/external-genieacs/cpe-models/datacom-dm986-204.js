const basicCPEModel = require('./base-model');

let datacomModel = Object.assign({}, basicCPEModel);

datacomModel.identifier = {vendor: 'Datacom', model: 'DM986-204'};

datacomModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.portForward = true;
  permissions.features.traceroute = true;
  permissions.features.speedTest = true;
  permissions.features.pingTest = true;
  permissions.features.upnp = false;
  permissions.features.wps = false;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.wan.speedTestLimit = 230;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48, 149, 153, 157, 161, 165];
  permissions.wifi.extended2GhzChannels = false;
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.bandRead2 = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.modeWrite = false;
  permissions.traceroute.maxProbesPerHop = 1;
  permissions.traceroute.protocol = 'ICMP';
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.fullSupport;
  permissions.firmwareUpgrades = {
    'V2.0.0': [],
  };
  return permissions;
};

datacomModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnectionNumberOfEntries';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnectionNumberOfEntries';
  fields.wifi2.password = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.KeyPassphrase';
  fields.wifi2.auto = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.AutoChannelEnable';
  fields.wifi2.enable = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Enable';
  fields.wifi2.ssid = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.SSID';
  fields.wifi2.mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Standard';
  fields.wifi2.channel = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Channel';
  fields.wifi5.password = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase';
  fields.wifi5.auto = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AutoChannelEnable';
  fields.wifi5.enable = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable';
  fields.wifi5.ssid = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID';
  fields.wifi5.mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Standard';
  fields.wifi5.channel = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel';
  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.Hosts.Host.' +
    '*.InterfaceType';
  return fields;
};

module.exports = datacomModel;
