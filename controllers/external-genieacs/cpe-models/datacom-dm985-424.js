const basicCPEModel = require('./base-model');

let datacomModel = Object.assign({}, basicCPEModel);

datacomModel.identifier = {vendor: 'Datacom', model: 'DM985-424'};

datacomModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.portForward = true;
  permissions.features.ponSignal = true;
  permissions.features.traceroute = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noRanges;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48, 149, 153, 157, 161, 165];
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.modeWrite = false;
  permissions.firmwareUpgrades = {
    'V3.2.0': [],
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

datacomModel.getBeaconType = function() {
  return 'WPAand11i';
};

datacomModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

datacomModel.isDeviceConnectedViaWifi = function(
  layer2iface, wifi2iface, wifi5iface,
) {
  if (layer2iface === '802.11') {
    return 'wifi';
  }
  return 'cable';
};

datacomModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.diagnostics.traceroute.root = 'InternetGatewayDevice.' +
    'X_CT-COM_IPTraceRouteDiagnostics';
  fields.diagnostics.traceroute.hops_root = 'Hops';
  fields.diagnostics.traceroute.hop_host = 'ResponseIPAddress';
  fields.diagnostics.traceroute.hop_ip_address = 'ResponseIPAddress';
  // Even though 'Mode' field exists, I can't set it to anything
  // fields.diagnostics.traceroute.protocol = 'Mode';
  // fields.diagnostics.traceroute.hop_rtt_times = 'ResponseTime1';
  fields.diagnostics.traceroute.number_of_hops = 'HopsNumberOfEntries';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.TXPower';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.Hosts.Host.'+
    '*.InterfaceType';
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.'+
    'X_CT-COM_TeleComAccount.Password';
  fields.port_mapping_values.protocol[1] = 'BOTH';
  delete fields.port_mapping_fields.external_port_end;
  return fields;
};


datacomModel.readTracerouteRTTs = function(hopRoot) {
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

module.exports = datacomModel;
