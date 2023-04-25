const basicCPEModel = require('./base-model');

let nokiaModel = Object.assign({}, basicCPEModel);

nokiaModel.identifier = {vendor: 'Nokia', model: 'G-120W-F'};

nokiaModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.traceroute = true;
  permissions.features.siteSurvey = true;
  permissions.features.speedTest = true;
  permissions.features.hasCPUUsage = true;
  permissions.features.hasMemoryUsage = true;

  permissions.lan.configWrite = false;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.sendDnsOnLANChange = false;
  permissions.lan.sendRoutersOnLANChange = false;
  permissions.lan.dnsServersLimit = 2;

  permissions.wan.pingTestSingleAttempt = true;
  permissions.wan.dhcpUptime = true;
  permissions.wan.hasUptimeField = true;
  permissions.wan.speedTestLimit = 150;

  permissions.wifi.dualBand = false;

  permissions.firmwareUpgrades = {
    '3FE46606BFIB40': [],
  };
  return permissions;
};

nokiaModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'b,g';
    case '11n':
      return 'b,g,n';
    case '11na':
      return undefined;
    case '11ac':
      return undefined;
    case '11ax':
    default:
      return undefined;
  }
};

nokiaModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
      return '20MHz';
    case 'VHT20':
      return undefined;
    case 'HT40':
      return '40MHz';
    case 'auto':
      return 'Auto';
    default:
      return undefined;
  }
};

nokiaModel.isDeviceConnectedViaWifi = function(
  layer2iface, wifi2iface, wifi5iface,
) {
  if (layer2iface === '802.11') {
    return 'wifi';
  }
  return 'cable';
};

nokiaModel.convertToDbm = function(power) {
  return parseFloat(power).toFixed(3);
};

nokiaModel.convertPingTestResult = function(latency) {
  return latency.toString();
};

nokiaModel.convertWanRate = function(rate) {
  return rate/1000000;
};

nokiaModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();

  fields.common.web_admin_username =
    'InternetGatewayDevice.X_Authentication.WebAccount.UserName';
  fields.common.web_admin_password =
    'InternetGatewayDevice.X_Authentication.WebAccount.Password';
  fields.wan.pon_rxpower =
    'InternetGatewayDevice.X_ALU_OntOpticalParam.RXPower';
  fields.wan.pon_txpower =
    'InternetGatewayDevice.X_ALU_OntOpticalParam.TXPower';
  fields.wan.rate = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.Layer1DownstreamMaxBitRate';
  fields.wan.recv_bytes =
    'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes =
    'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pppoe_user =
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
    'WANPPPConnection.*.Username';
  fields.wan.pppoe_pass =
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
    'WANPPPConnection.*.Password';
  fields.wan.mtu_ppp =
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
    'WANPPPConnection.*.InterfaceMtu';
  fields.wan.wan_ip_ppp =
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
    'WANPPPConnection.*.ExternalIPAddress';
  fields.wan.uptime_ppp =
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
    'WANPPPConnection.*.Uptime';
  fields.wan.mtu =
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
    'WANIPConnection.*.InterfaceMtu';
  fields.wan.wan_ip =
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
    'WANIPConnection.*.ExternalIPAddress';
  fields.wan.uptime =
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
    'WANIPConnection.*.Uptime';
  // TODO: check fields.wan.vlan_ppp
  fields.wan.vlan =
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
    'X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wifi2.band =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.'+
    'X_ALU_COM_ChannelBandWidthExtend';

  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.Hosts.'+
    'Host.*.InterfaceType';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.'+
    'WLANConfiguration.1.AssociatedDevice.*.RSSI';

  fields.devices.host_rate =
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice.'+
    '2.LastDataDownlinkRate';

  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.'+
    'X_ALU-COM_NeighboringWiFiDiagnostic';
  fields.diagnostics.traceroute.root = 'InternetGatewayDevice.'+
    'TraceRouteDiagnostics';

  return fields;
};

module.exports = nokiaModel;
