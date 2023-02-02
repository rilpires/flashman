const basicCPEModel = require('./base-model');

let cianetModel = Object.assign({}, basicCPEModel);

cianetModel.identifier = {vendor: 'Cianet', model: 'ONU GW24AC'};

cianetModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.portForward = true;
  permissions.features.traceroute = true;
  permissions.features.ponSignal = true;
  permissions.features.stun = true;
  permissions.wan.allowReadWanMtu = false;
  permissions.wan.allowEditWanMtu = false;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116,
    120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165,
  ];
  permissions.firmwareUpgrades = {
    'V1.0.9': [],
  };
  return permissions;
};

cianetModel.convertWifiMode = function(mode) {
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

cianetModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '20Mhz';
    case 'HT40':
    case 'VHT40':
      return '40Mhz';
    case 'VHT80':
      return '80Mhz';
    case 'auto':
      return 'Auto';
    default:
      return '';
  }
};

cianetModel.isDeviceConnectedViaWifi = function(
  layer2iface, wifi2iface, wifi5iface,
) {
  if (layer2iface === '802.11') {
    return 'wifi';
  }
  return 'cable';
};

cianetModel.readTracerouteRTTs = function(hopRoot) {
  let ret = [];
  for (let i = 1; i <= 3; i++) {
    let responseObject = hopRoot[`ResponseTime${i}`];
    // Sometimes a probe comes with 0 latency (while others come >100)
    // This clearly means that probe was a loss.
    // I've never seen 0 latency on initial hops, only >=1, probably a ceil()
    if (responseObject &&
      typeof(responseObject['_value']) == 'number' &&
      !isNaN(responseObject['_value']) &&
      responseObject['_value'] > 0
    ) {
      ret.push(responseObject['_value'].toString());
    }
  }
  return ret;
};

cianetModel.convertChannelToTask = function(channel, fields, masterKey) {
  if (channel === 'auto') {
    channel = '0';
  }
  let values = [];
  const parsedChannel = parseInt(channel);
  values.push([
    fields[masterKey]['channel'], parsedChannel, 'xsd:unsignedInt',
  ]);
  return values;
};

cianetModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

cianetModel.convertWifiRate = function(rate) {
  return parseInt(rate) / 1000;
};

cianetModel.convertWanRate = function(rate) {
  return parseInt(rate) / 1000;
};

cianetModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CT-COM_TeleComAccount.Password';
  fields.common.alt_uid = 'InternetGatewayDevice.LANDevice.1.' +
    'LANEthernetInterfaceConfig.1.MACAddress';
  fields.common.stun_enable = 'InternetGatewayDevice.ManagementServer.' +
    'STUNEnable';
  fields.common.stun_udp_conn_req_addr =
    'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CT-COM_GponInterfaceConfig.TXPower';
  fields.wan.wan_ip = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.1.WANPPPConnection.1.DNSServers';
  fields.wan.rate = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.Layer1DownstreamMaxBitRate';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wifi2.auto = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1' +
    '.Channel';
  fields.wifi5.password = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.KeyPassphrase';
  fields.wifi5.auto = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.' +
    '6.Channel';
  fields.wifi5.enable = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.' +
    '3.Enable';
  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.Hosts.Host.' +
    '3.InterfaceType';
  fields.port_mapping_values.protocol[0] = 'Protocol';
  fields.port_mapping_values.protocol[1] = 'BOTH';
  fields.port_mapping_values.enable[0] = 'Enabled';
  fields.port_mapping_values.description[0] = 'Name';
  fields.port_mapping_values.remote_host[0] = 'RemoteHostStart';
  fields.port_mapping_values.remote_host_end = [
    'RemoteHostEnd', '0.0.0.0', 'xsd:string',
  ];
  fields.port_mapping_values.lease[0] = 'LeaseDuration';
  fields.port_mapping_fields.external_port_start[0] = 'ExternalPortStart';
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEnd', 'external_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_fields.internal_port_start[0] = 'InternalPortStart';
  fields.port_mapping_fields.internal_port_end = [
    'InternalPortEnd', 'internal_port_end', 'xsd:unsignedInt',
  ];
  fields.diagnostics.traceroute.root = 'InternetGatewayDevice.' +
    'X_CT-COM_IPTraceRouteDiagnostics';
  fields.diagnostics.traceroute.hops_root = 'Hops';
  fields.diagnostics.traceroute.hop_host = 'ResponseIPAddress';
  fields.diagnostics.traceroute.hop_ip_address = 'ResponseIPAddress';
  fields.diagnostics.traceroute.number_of_hops = 'HopsNumberOfEntries';
  fields.diagnostics.traceroute.protocol = 'Mode';
  return fields;
}

module.exports = cianetModel;
