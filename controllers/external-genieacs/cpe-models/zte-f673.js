const basicCPEModel = require('./base-model');

let zteModel = Object.assign({}, basicCPEModel);

zteModel.identifier = {vendor: 'ZTE', model: 'F673AV9'};

zteModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.features.speedTest = true;
  permissions.features.traceroute = true;
  permissions.traceroute.protocol = 'ICMP';
  permissions.wan.mustRebootAfterChanges = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wan.speedTestLimit = 200;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 149, 153, 157, 161, 165,
  ];
  permissions.firmwareUpgrades = {
    'V2.0.0P1T4': [],
  };
  return permissions;
};

// Should be tweaked if the tr-069 xml has special types for some fields
zteModel.getFieldType = function(masterKey, key) {
  switch (masterKey+'-'+key) {
    case 'wifi2-band':
    case 'wifi5-band':
      return 'xsd:unsignedInt';
    default:
      return basicCPEModel.getFieldType(masterKey, key);
  }
};

// WiFi operational modes
// 2.4Ghz
// BGN -> bgn
// GN -> gn
// BG -> bg
// N -> n
// G -> g
// B -> b

// 5Ghz
// ANAC -> ac
// AN -> na
// N -> ac
// A -> a
zteModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'bg';
    case '11n':
      return 'bgn';
    case '11na':
      return 'na';
    case '11ac':
      return 'ac';
    case '11ax':
    default:
      return '';
  }
};

// WiFi bandwidth modes
// 0 -> 20 Mhz
// 1 -> 40 Mhz
// 2 -> auto (only for 2.4Ghz WLAN)
// 3 -> 80 Mhz / auto (only for 5Ghz WLAN)
zteModel.convertWifiBand = function(band, is5ghz=false) {
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

zteModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

zteModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.web_admin_user = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CMCC_TeleComAccount.Username';
  fields.web_admin_password = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CMCC_TeleComAccount.Password';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CMCC_GponInterfaceConfig.Stats.BytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CMCC_GponInterfaceConfig.Stats.BytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CMCC_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CMCC_GponInterfaceConfig.TXPower';
  fields.wifi2.band = fields.wifi2.band.replace(
    /BandWidth/g, 'X_CMCC_ChannelWidth',
  );
  fields.wifi5.band = fields.wifi5.band.replace(
    /BandWidth/g, 'X_CMCC_ChannelWidth',
  );
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1' +
    '.WANPPPConnection.1.X_CMCC_VLANIDMark';
  fields.port_mapping_values.protocol = [
    'PortMappingProtocol', 'BOTH', 'xsd:string',
  ];
  fields.port_mapping_fields.client = [
    'InternalClient', 'ip', 'xsd:string',
  ];
  fields.port_mapping_fields.internal_port_start = [
    'InternalPort', 'internal_port_start', 'xsd:unsignedInt',
  ];
  fields.diagnostics.traceroute.protocol = 'Mode';
  delete fields.diagnostics.speedtest.full_load_bytes_rec;
  delete fields.diagnostics.speedtest.full_load_period;
  return fields;
};

module.exports = zteModel;
