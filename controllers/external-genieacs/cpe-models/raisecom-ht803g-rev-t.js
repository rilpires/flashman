const basicCPEModel = require('./base-model');
let raisecomModel = Object.assign({}, basicCPEModel);

// Must be changed for every model, used when importing firmwares
raisecomModel.identifier = {vendor: 'Raisecom', model: 'HT803G-WS2'};

// Must be tweaked by models to reflect their features and permissions
// IF YOU NEED A NEW KEY, ADD IT TO THIS BASE MODEL AS WELL!
raisecomModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();

  // features permissions
  permissions.features.ponSignal = true; // will measure pon rx/tx power
  permissions.features.portForward = true; // will enable port forward dialogs
  permissions.features.pingTest = true; // will enable ping test dialog
  permissions.features.speedTest = true; // will enable speed test dialogs

  // wan permissions
  // queue tasks and only send request on last
  permissions.wan.portForwardQueueTasks = true;
  // specifies range/asym support
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noRanges;
  // speedtest limit, values above show as "limit+ Mbps"
  permissions.wan.speedTestLimit = 10000;

  // wifi permissions
  permissions.wifi.list5ghzChannels =
    [36, 40, 44, 48, 52, 56, 60, 64, 149, 153, 157, 161, 165];
  permissions.wifi.bandRead = false; // will display current wifi band
  permissions.wifi.bandWrite = false; // can change current wifi band
  // can change current wifi 2.4 band to auto mode
  permissions.wifi.bandAuto2 = false;
  // can change current wifi 5 band to auto mode
  permissions.wifi.bandAuto5 = false;

  // firmware permissions
  permissions.firmwareUpgrades = {
    '3.20': [],
  };

  return permissions;
};

// Conversion from Flashman format to CPE format
raisecomModel.convertWifiMode = function(mode) {
  // b/g/n =  'b,g,n'
  // b/g =    'g'
  // n =      'n'
  // ac/n/a = 'n'
  // n/a =    'n'
  // a =      '' (blank)
  switch (mode) {
    case '11g':
      return 'b/g';
    case '11n':
      return 'b,g,n';
    case '11na':
      return 'n';
    case '11ac':
      return 'n';
    default:
      return '';
  }
};

// Conversion from Flashman format to CPE format
// 20Mhz    = 0
// 40Mhz    = 1
// Auto     = 2
// 80Mhz    = 3
raisecomModel.convertWifiBand = function(band, is5ghz=false) {
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
      return '2';
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
      return 'auto';
    case '3':
      return (isAC) ? 'VHT80' : undefined;
    default:
      return undefined;
  }
};

raisecomModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.TXPower';
  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.Hosts.Host.'+
    '*.InterfaceType';
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.'+
    'X_CT-COM_TeleComAccount.Password';
  fields.port_mapping_values.protocol[1] = 'BOTH';
  delete fields.port_mapping_fields.external_port_end;
  return fields;
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

raisecomModel.getBeaconType = function() {
  return 'WPAand11i';
};

// Map TR-069 XML fields to Flashman fields
raisecomModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();

  // common fiekds
  fields.common.alt_uid = 'InternetGatewayDevice.LANDevice.1.'+
    'LANEthernetInterfaceConfig.1.MACAddress';

  // wan fields
  delete fields.wan.rate;
  delete fields.wan.duplex;
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.Stats.BytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.Stats.BytesSent';
  fields.wan.port_mapping_entries_dhcp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.WANIPConnection.*.PortMappingNumberOfEntries';
  fields.wan.port_mapping_entries_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.WANPPPConnection.*.PortMappingNumberOfEntries';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.'+
    'X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.TXPower';

  // port mapping fields
  fields.port_mapping_dhcp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.WANIPConnection.*.PortMapping';
  fields.port_mapping_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.WANPPPConnection.*.PortMapping';
  fields.port_mapping_values.protocol[1] = 'TCPandUDP';

  // wifi fields
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.'+
    '1.X_CT-COM_ChannelWidth';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.'+
    '6.X_CT-COM_ChannelWidth';
  delete fields.mesh2;
  delete fields.mesh5;

  // stun fields
  delete fields.stun;

  // access control fields
  delete fields.access_control;

  // devices fields
  delete fields.devices.host_rssi;
  delete fields.devices.host_snr;
  delete fields.devices.host_rate;

  // diagnostics fields
  delete fields.diagnostics.speedtest.num_of_conn;
  delete fields.diagnostics.speedtest.down_transports;
  delete fields.diagnostics.speedtest.full_load_bytes_rec;
  delete fields.diagnostics.speedtest.full_load_period;

  return fields;
};

module.exports = raisecomModel;
