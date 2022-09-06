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
  permissions.features.pingTest = true; // will enable ping test dialog
  permissions.features.meshCable = true; // will enable mesh over cable
  permissions.features.stun = true; // will automatically apply stun
                                    // configurations if configured

  // lan permissions
  permissions.lan.configWrite = false; // can change current lan configuration
  permissions.lan.canTrustActive = true;

  // wan permissions
  // speedtest limit, values above show as "limit+ Mbps"
  permissions.wan.speedTestLimit = 30;
  // speed test disabled. speedtest limits for this device are too low

  // wifi permissions
  permissions.wifi.list5ghzChannels =
    [36, 40, 44, 48, 52, 56, 60, 64, 149, 153, 157, 161];
  permissions.wifi.bandRead2 = true;
  permissions.wifi.bandRead5 = true;
  permissions.wifi.bandWrite2 = true;
  permissions.wifi.bandWrite5 = true;
  permissions.wifi.bandAuto2 = true;
  permissions.wifi.bandAuto5 = true;
  permissions.wifi.modeRead = true;
  permissions.wifi.modeWrite = true;
  permissions.wifi.allowSpaces = false;

  // firmware permissions
  permissions.firmwareUpgrades = {
    ' 5.00.21': [],
  };

  return permissions;
};

// Conversion from Flashman format to CPE format
raisecomModel.convertWifiMode = function(mode) {
  // auto = 'b,g,n'
  // g =    'g'
  // n =    'n'
  // b =    'b'

  // auto =          'a,n,ac'
  // 11a =           'a'
  // 11n-only =      'n'
  // 11ac-only =     'ac'
  // 11na/ac mixed = 'n'
  switch (mode) {
    case '11g':
      return 'b';
    case '11n':
      return 'n';
    case '11na':
      return 'n';
    case '11ac':
      return 'ac';
    default:
      return '';
  }
};

// Conversion from Flashman format to CPE format
raisecomModel.convertWifiBand = function(band, is5ghz=false) {
  // 20Mhz       = 0
  // 40Mhz       = 1
  // 20/40Mhz    = 2
  // 80Mhz       = 3
  // 20/40/80Mhz = 4
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
      return (is5ghz) ? '4' : '2';
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
      return (isAC) ? undefined : 'auto';
    case '3':
      return (isAC) ? 'VHT80' : undefined;
    case '4':
      return (isAC) ? 'auto' : undefined;
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
  /*
  Does not have:
  wan:
  - rate
  - duplex
  - uptime
  - mtu/mru
  - port_mapping_entries
  */

  fields.common.stun_enable =
    'InternetGatewayDevice.ManagementServer.STUNEnable';
  fields.common.stun_udp_conn_req_addr =
    'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';

  // common fiekds
  fields.common.alt_uid =
    'InternetGatewayDevice.DeviceInfo.X_CT-COM_MACAddress';

  // wan fields
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_WANPONInterfaceConfig.Stats.BytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_WANPONInterfaceConfig.Stats.BytesSent';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.1.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.TXPower';

  delete fields.wan.port_mapping_entries_dhcp;
  delete fields.wan.port_mapping_entries_ppp;

  fields.lan.subnet_mask = 'InternetGatewayDevice.LANDevice.1.'+
    'LANHostConfigManagement.SubnetMask';

  // wifi fields
  fields.wifi2.password = fields.wifi2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.wifi5.password = fields.wifi5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.mesh2.password = fields.mesh2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
  fields.mesh5.password = fields.mesh5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase');
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

module.exports = raisecomModel;
