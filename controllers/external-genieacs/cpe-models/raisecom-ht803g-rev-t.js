const basicCPEModel = require('./base-model');
let raisecomModel = Object.assign({}, basicCPEModel);

// Must be changed for every model, used when importing firmwares
raisecomModel.identifier = {vendor: 'Raisecom', model: 'HT803G-WS2'};

// Must be tweaked by models to reflect their features and permissions
// IF YOU NEED A NEW KEY, ADD IT TO THIS BASE MODEL AS WELL!
raisecomModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();

  permissions.features.ponSignal = true; // will measure pon rx/tx power
  permissions.features.portForward = false; // will enable port forward dialogs
  permissions.features.pingTest = true; // will enable ping test dialog
  permissions.features.speedTest = true; // will enable speed test dialogs
  permissions.features.traceroute = true; // will enable speed test dialogs

  permissions.traceroute.minProbesPerHop = 3;
  permissions.traceroute.hopCountExceededState = 'Error_Other';
  permissions.traceroute.protocol = 'ICMP';

  permissions.wan.speedTestLimit = 300;

  // wan port forwarding
  // permissions.wan.portForwardPermissions = // specifies range/asym support
  //   basicCPEModel.portForwardPermissions.noRanges;

  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 149, 153, 157, 161, 165,
  ];
  permissions.wifi.modeRead = false; // Removed because 5ghz cant show AC mode
  permissions.wifi.modeWrite = false; // Removed because 5ghz cant show AC mode
  permissions.wifi.bandAuto5 = false;

  // firmware permissions
  permissions.firmwareUpgrades = {
    '3.20': [],
  };

  return permissions;
};

// Conversion from Flashman format to CPE format
raisecomModel.convertWifiBand = function(band, is5ghz=false) {
  // 20Mhz    = 0
  // 40Mhz    = 1
  // 80Mhz    = 3
  // 20/40Mhz = 2
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '0';
    case 'HT40':
    case 'VHT40':
      return '1';
    case 'VHT80':
      return '3';
    case 'auto':
      return (is5ghz) ? '3' : '2';
    default:
      return '';
  }
};

raisecomModel.convertWifiBandToFlashman = function(band, isAC) {
  switch (band) {
    // String input
    case '0':
      return (isAC) ? 'VHT20' : 'HT20';
    case '1':
      return (isAC) ? 'VHT40' : 'HT40';
    case '2':
      // 'auto' bandwidth for AC is disabled
      return (isAC) ? undefined : 'auto';
    case '3':
      return (isAC) ? 'VHT80' : undefined;
    default:
      return undefined;
  }
};

raisecomModel.convertChannelToTask = function(channel, fields, masterKey) {
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

raisecomModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

raisecomModel.isDeviceConnectedViaWifi = function(
  layer2iface, wifi2iface, wifi5iface,
) {
  if (layer2iface === '802.11') {
    return 'wifi';
  }
  return 'cable';
};

raisecomModel.getBeaconType = function() {
  return '11i';
};

raisecomModel.getWPAEncryptionMode = function() {
  return 'AESEncryption';
};

raisecomModel.getIeeeEncryptionMode = function() {
  return 'AESEncryption';
};

// Map TR-069 XML fields to Flashman fields
raisecomModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();

  // common fields
  fields.common.alt_uid = 'InternetGatewayDevice.LANDevice.1.'+
    'LANEthernetInterfaceConfig.1.MACAddress';

  // user and password fields
  fields.common.web_admin_username =
    'InternetGatewayDevice.DeviceInfo.X_CT-COM_TeleComAccount.Username';
  fields.common.web_admin_password =
    'InternetGatewayDevice.DeviceInfo.X_CT-COM_TeleComAccount.Password';

  // devices fields
  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.Hosts.Host.' +
    '*.InterfaceType';

  // traceroute
  fields.diagnostics.traceroute.root = 'InternetGatewayDevice.' +
    'X_CT-COM_IPTraceRouteDiagnostics';
  fields.diagnostics.traceroute.hops_root = 'Hops';
  fields.diagnostics.traceroute.max_hop_count = 'MaximumHops';
  fields.diagnostics.traceroute.number_of_hops = 'HopsNumberOfEntries';
  fields.diagnostics.traceroute.hop_host = 'ResponseIPAddress';
  fields.diagnostics.traceroute.hop_ip_address = 'ResponseIPAddress';


  // wan fields
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';

  // fields.wan.port_mapping_entries_dhcp =
  //   'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
  //   'WANIPConnection.*.PortMappingNumberOfEntries';
  // fields.wan.port_mapping_entries_ppp =
  //   'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
  //   'WANPPPConnection.*.PortMappingNumberOfEntries';

  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.pon_rxpower =
    'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower =
    'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.TXPower';

  // port mapping fields
  // fields.port_mapping_dhcp = 'InternetGatewayDevice.WANDevice.1.'+
  //   'WANConnectionDevice.*.WANIPConnection.*.PortMapping';
  // fields.port_mapping_ppp = 'InternetGatewayDevice.WANDevice.1.'+
  //   'WANConnectionDevice.*.WANPPPConnection.*.PortMapping';
  // fields.port_mapping_values.protocol[1] = 'TCPandUDP';

  // wifi fields
  Object.keys(fields.wifi2).forEach((k)=>{
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '6');
  });
  Object.keys(fields.mesh2).forEach((k)=>{
    fields.mesh2[k] = fields.mesh5[k].replace(/6/g, '2');
    fields.mesh5[k] = fields.mesh5[k].replace(/6/g, '3');
  });
  fields.wifi2.band = fields.wifi2.band.replace(
    /BandWidth/g, 'X_CT-COM_ChannelWidth');
  fields.wifi5.band = fields.wifi5.band.replace(
    /BandWidth/g, 'X_CT-COM_ChannelWidth');

  // wifi encryption fields
  fields.wifi2.encryption =
    fields.wifi2.beacon_type.replace(/BeaconType/g, 'WPAEncryptionModes');
  fields.wifi5.encryption =
    fields.wifi5.beacon_type.replace(/BeaconType/g, 'WPAEncryptionModes');
  fields.wifi2.encryptionIeee =
    fields.wifi2.beacon_type.replace(/BeaconType/g, 'IEEE11iEncryptionModes');
  fields.wifi5.encryptionIeee =
    fields.wifi5.beacon_type.replace(/BeaconType/g, 'IEEE11iEncryptionModes');

  // diagnostics fields
  delete fields.diagnostics.speedtest.num_of_conn;
  delete fields.diagnostics.speedtest.down_transports;
  delete fields.diagnostics.speedtest.full_load_bytes_rec;
  delete fields.diagnostics.speedtest.full_load_period;

  return fields;
};


// Despite it being almost the same method as others "X_CT-COM_" prefixed
// models on traceroute tree, this one always fills latency values with
// numbers greater than 0 (except on first hops, where latency is
// usually 0 or 1ms). Looks like there is no way to have intermediary
// packet loss on this model, it may just repeat last valid value.
raisecomModel.readTracerouteRTTs = function(hopRoot) {
  let ret = [];
  for (let i = 1; i <= 3; i++) {
    let responseObject = hopRoot[`ResponseTime${i}`];
    if (responseObject &&
      typeof(responseObject['_value']) == 'number' &&
      !isNaN(responseObject['_value'])
    ) {
      ret.push(responseObject['_value'].toString());
    }
  }
  return ret;
};

module.exports = raisecomModel;
