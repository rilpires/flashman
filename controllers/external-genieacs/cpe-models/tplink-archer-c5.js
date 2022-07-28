const basicCPEModel = require('./base-model');

let tplinkModel = Object.assign({}, basicCPEModel);

tplinkModel.identifier = {vendor: 'TP-Link', model: 'Archer C5 v4'};

tplinkModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.firmwareUpgrade = false;
  permissions.features.pingTest = true;
  permissions.features.speedTest = true;
  permissions.features.portForward = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wan.dhcpUptime = false;
  permissions.wan.speedTestLimit = 200;
  permissions.lan.configWrite = false;
  permissions.firmwareUpgrades = {
    '3.16.0 0.9.1 v600c.0 Build 200427 Rel.33156n': [],
  };
  return permissions;
};

tplinkModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'gn';
    case '11n':
      return 'n';
    case '11na':
      return 'nac';
    case '11ac':
      return 'ac';
    case '11ax':
    default:
      return '';
  }
};

// Conversion from Flashman format to CPE format
tplinkModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '20M';
    case 'HT40':
    case 'VHT40':
      return '40M';
    case 'VHT80':
      return '80M';
    case 'auto':
      return 'Auto';
    default:
      return '';
  }
};

tplinkModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1'+
  '.WANEthernetInterfaceConfig.Stats.BytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1'+
  '.WANEthernetInterfaceConfig.Stats.BytesSent';
  Object.keys(fields.wifi5).forEach((k)=>{
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '2');
  });
  fields.wifi2.password = fields.wifi2.password.replace(
    /KeyPassphrase/g, 'X_TP_PreSharedKey',
  );
  fields.wifi5.password = fields.wifi5.password.replace(
    /KeyPassphrase/g, 'X_TP_PreSharedKey',
  );
  fields.wifi2.band = fields.wifi2.band.replace(
    /BandWidth/g, 'X_TP_Bandwidth',
  );
  fields.wifi5.band = fields.wifi5.band.replace(
    /BandWidth/g, 'X_TP_Bandwidth',
  );
  fields.port_mapping_fields.external_port_end = ['X_TP_ExternalPortEnd',
    'external_port_start', 'xsd:unsignedInt'];
  fields.port_mapping_fields.internal_port_end = ['X_TP_InternalPortEnd',
    'internal_port_start', 'xsd:unsignedInt'];
  fields.port_mapping_values.protocol[1] = 'TCP or UDP';
  fields.port_mapping_values.description[0] = 'ServiceName';
  // This model has problems when the service name is sent
  fields.port_mapping_values.description[1] = '';
  delete fields.port_mapping_values.remote_host;
  delete fields.port_mapping_values.lease;
  return fields;
};

module.exports = tplinkModel;
