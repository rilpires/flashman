const basicCPEModel = require('./base-model');

let tplinkModel = Object.assign({}, basicCPEModel);

tplinkModel.identifier = {vendor: 'TP-Link', model: 'TL-WR840N'};

tplinkModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  // permissions.features.traceroute = true; // Needs polling
  permissions.features.portForward = true;
  // permissions.features.speedTest = true; // Doesnt update properly?
  // permissions.features.pingTest = true; // Needs polling
  permissions.features.stun = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noRanges;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.LANDeviceHasAssocTree = false;
  permissions.lan.LANDeviceHasSNR = false;
  permissions.lan.sendDnsOnLANChange = false;
  permissions.wifi.allowSpaces = false;
  permissions.wifi.dualBand = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.modeWrite = false;
  permissions.wifi.list5ghzChannels = [];
  permissions.firmwareUpgrades = {
    '3.16.0 0.9.1 v6018.0 Build 190312 Rel.60533n': [],
  };
  return permissions;
};

tplinkModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
    case '11n':
      return 'n';
    case '11na':
    case '11ac':
    case '11ax':
    default:
      return '';
  }
};

tplinkModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
      return '20M';
    case 'HT40':
      return '40M';
    case 'auto':
      return 'Auto';
    case 'VHT20':
    case 'VHT40':
    case 'VHT80':
    default:
      return '';
  }
};

tplinkModel.convertGenieSerial = function(serial, mac) {
  return mac;
};

tplinkModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.stun_enable =
    'InternetGatewayDevice.ManagementServer.STUNEnable';
  fields.common.stun_udp_conn_req_addr = 'InternetGatewayDevice.' +
    'ManagementServer.UDPConnectionRequestAddress';
  fields.wifi2.password = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.X_TP_PreSharedKey';
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.X_TP_Bandwidth';
  fields.port_mapping_fields.external_port_start = [
    'ExternalPort', 'external_port_start', 'xsd:string',
  ];
  fields.port_mapping_fields.external_port_end = [
    'X_TP_ExternalPortEnd', 'external_port_end', 'xsd:string',
  ];
  fields.port_mapping_fields.internal_port_start = [
    'InternalPort', 'internal_port_start', 'xsd:string',
  ];
  fields.port_mapping_fields.internal_port_end = [
    'X_TP_InternalPortEnd', 'internal_port_end', 'xsd:string',
  ];
  fields.port_mapping_values.protocol[1] = 'TCP or UDP';
  delete fields.port_mapping_values.description;
  delete fields.port_mapping_values.remote_host;
  delete fields.port_mapping_values.lease;
  return fields;
};

module.exports = tplinkModel;
