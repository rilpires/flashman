const basicCPEModel = require('./base-model');

let nokiaModel = Object.assign({}, basicCPEModel);

nokiaModel.identifier = {vendor: 'Nokia', model: 'G-1426-MA'};

nokiaModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.traceroute = true;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.features.speedTest = true;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.speedTestLimit = 1000;
  permissions.wan.speedTestSetInterface = true;
  permissions.wan.portForwardQueueTasks = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noRanges;
  permissions.traceroute.protocol = 'ICMP';
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 149, 153, 157, 161, 165,
  ];
  permissions.wifi.axWiFiMode = true;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.LANDeviceSkipIfNoWifiMode = true;
  permissions.firmwareUpgrades = {
    '3FE49218HJIJ62': [],
  };
  return permissions;
};

// 2.4Ghz modes:
// ax: ax
// b,g,n: b,g,n
// b,g: b,g
// g,n: g,n
// b: b
// g: g
// n: n

// 5Ghz modes:
// ax: ax
// ac: ac
// a: a
// n,a: n,a

nokiaModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'b,g';
    case '11n':
      return 'b,g,n';
    case '11na':
      return 'n,a';
    case '11ac':
      return 'ac';
    case '11ax':
      return 'ax';
    default:
      return '';
  }
};

// 2.4Ghz band:
// 0: 20MHz
// 1: 40MHz
// 2: 20/40MHz

// 5Ghz band:
// 0: 20MHz
// 1: 40MHz
// 2: 20/40MHz auto
// 3: 20/40/80MHz auto

nokiaModel.convertWifiBand = function(band, is5ghz=false) {
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

nokiaModel.convertWifiBandToFlashman = function(band, isAC) {
  switch (band) {
    // String input
    case '0':
      return (isAC) ? 'VHT20' : 'HT20';
    case '1':
      return (isAC) ? 'VHT40' : 'HT40';
    case '2':
      return 'auto';
    case '3':
      return (isAC) ? 'auto' : undefined;
    default:
      return undefined;
  }
};

nokiaModel.convertField = function(
  masterKey, key, value, typeFunc, modeFunc, bandFunc,
) {
  let fullKey = masterKey + '-' + key;
  if (fullKey === 'wifi2-enable' || fullKey === 'wifi5-enable') {
    let result = {value: null, type: nokiaModel.getFieldType(masterKey, key)};
    result.value = (value > 0) ? 'TRUE' : 'FALSE';
    return result;
  }
  return basicCPEModel.convertField(
    masterKey, key, value, typeFunc, modeFunc, bandFunc,
  );
};

nokiaModel.convertGenieSerial = function(serial, mac) {
  // If serial starts with 4E42454C which is "NBEL" in hex, we change it so
  // that the serial in Flashman matches the one in the vendor's label
  if (serial.slice(0, 8) === '4E42454C') {
    return 'NBEL' + serial.slice(8);
  }
  return serial;
};

nokiaModel.getBeaconType = function() {
  return 'WPA/WPA2';
};

nokiaModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

nokiaModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_username = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CMCC_TeleComAccount.Username';
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CMCC_TeleComAccount.Password';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.'+
    'WLANConfiguration.*.AssociatedDevice.*.RSSI';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.'+
    'Hosts.Host.*.NegotiationRate';
  fields.devices.host_cable_rate = fields.devices.host_rate;
  fields.diagnostics.traceroute.protocol = 'Mode';
  fields.wifi2.password = fields.wifi2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.wifi5.password = fields.wifi5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.mesh2.password = fields.mesh2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.mesh5.password = fields.mesh5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.wifi2.band = fields.wifi2.band.replace(
    /BandWidth/g, 'X_CMCC_ChannelWidth',
  );
  fields.wifi5.band = fields.wifi5.band.replace(
    /BandWidth/g, 'X_CMCC_ChannelWidth',
  );
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CMCC_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CMCC_GponInterfaceConfig.TXPower';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_CMCC_VLANIDMark';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_CMCC_VLANIDMark';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.service_type = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.X_CMCC_ServiceList';
  fields.wan.service_type_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_CMCC_ServiceList';

  fields.port_mapping_values.protocol[1] = 'TCP';
  fields.port_mapping_values.remote_host[1] = '';
  return fields;
};

module.exports = nokiaModel;
