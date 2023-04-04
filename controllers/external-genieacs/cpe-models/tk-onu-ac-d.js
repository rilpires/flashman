const basicCPEModel = require('./base-model');

let tkOnuAcDModel = Object.assign({}, basicCPEModel);

tkOnuAcDModel.identifier = {vendor: 'Think', model: 'TK-ONU-AC-D'};

tkOnuAcDModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wan.portForwardQueueTasks = true;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 149, 153, 157, 161,
  ];
  permissions.firmwareUpgrades = {
    'V1.0.9': [],
  };
  permissions.wifi.extended2GhzChannels = false;
  return permissions;
};

tkOnuAcDModel.convertWifiMode = function(mode) {
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

// Conversion from Flashman format to CPE format
basicCPEModel.convertWifiBand = function(band, is5ghz=false) {
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

tkOnuAcDModel.getBeaconType = function() {
  return 'WPA/WPA2';
};

tkOnuAcDModel.convertChannelToTask = function(channel, fields, masterKey) {
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


tkOnuAcDModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

tkOnuAcDModel.convertWifiRate = function(rate) {
  return parseInt(rate) / 1000;
};

tkOnuAcDModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  // Does not have the field for syncing web admin username
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.'+
    'X_CT-COM_TeleComAccount.Password';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_CT-COM_GponInterfaceConfig.TXPower';
  fields.wan.rate = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.Layer1DownstreamMaxBitRate';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.common.alt_uid = 'InternetGatewayDevice.LANDevice.1.' +
    'LANEthernetInterfaceConfig.1.MACAddress';
  fields.port_mapping_values.protocol[0] = 'Protocol';
  fields.port_mapping_values.protocol[1] = 'BOTH';
  fields.port_mapping_values.enable[0] = 'Enabled';
  fields.port_mapping_values.description[0] = 'Name';
  fields.port_mapping_values.remote_host[0] = 'RemoteHostStart';
  fields.port_mapping_values.remote_host_end = ['RemoteHostEnd',
    '0.0.0.0', 'xsd:string'];
  fields.port_mapping_values.lease[0] = 'LeaseDuration';
  fields.port_mapping_fields.external_port_start[0] = 'ExternalPortStart';
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEnd', 'external_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_fields.internal_port_start[0] = 'InternalPortStart';
  fields.port_mapping_fields.internal_port_end = [
    'InternalPortEnd', 'internal_port_end', 'xsd:unsignedInt',
  ];
  return fields;
};

module.exports = tkOnuAcDModel;
