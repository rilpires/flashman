const basicCPEModel = require('./base-model');

let hurakallModel = Object.assign({}, basicCPEModel);

hurakallModel.identifier = {vendor: 'Hurakall', model: 'ST-1001-FL'};

hurakallModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.ponSignal = true;
  permissions.lan.listLANDevices = false;
  permissions.firmwareUpgrades = {
    'V1.0.8': [],
  };
  return permissions;
};

hurakallModel.convertWifiMode = function(mode) {
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

hurakallModel.convertWifiBand = function(band, is5ghz=false) {
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

hurakallModel.getBeaconType = function() {
  return 'WPAand11i';
};

hurakallModel.convertGenieSerial = function(serial, mac) {
  let serialPrefix = serial.substring(0, 8); // 4 chars in base 16
  let serialSuffix = serial.substring(8); // remaining chars in utf8
  serialPrefix = serialPrefix.match(/[0-9]{2}/g); // split in groups of 2
  // decode from base16 to utf8
  serialPrefix = serialPrefix.map((prefix) => {
    prefix = parseInt(prefix, 16);
    return String.fromCharCode(prefix);
  });
  // join parts in final format
  return (serialPrefix.join('') + serialSuffix).toUpperCase();
};

hurakallModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

hurakallModel.convertChannelToTask = function(channel, fields, masterKey) {
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

hurakallModel.convertWifiRate = function(rate) {
  return parseInt(rate) / 1000;
};

hurakallModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CT-COM_TeleComAccount.Password';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CT-COM_GponInterfaceConfig.TXPower';
  fields.port_mapping_values.protocol[1] = 'TCP AND UDP';
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
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
  return fields;
};

module.exports = hurakallModel;
