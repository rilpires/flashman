const basicCPEModel = require('./base-model');

let zteModel = Object.assign({}, basicCPEModel);

zteModel.identifier = {vendor: 'ZTE', model: 'F673AV9'};

zteModel.modelPermissions = function() {
	let permissions = basicCPEModel.modelPermissions();
	permissions.features.pingTest = true;
	permissions.features.speedTest = true;
	permissions.wan.speedTestLimit = 200;
	permissions.features.portForward = true;
	permissions.wan.portForwardPermissions =
		basicCPEModel.portForwardPermissions.noAsymRanges;
	permissions.wifi.list5ghzChannels = [
		36, 40, 44, 48, 52, 56, 60, 64, 149, 153, 157, 161,
	];
	permissions.firmwareUpgrades = {
		'V2.0.0P1T4': [],
	};
	return permissions;
};

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
      return (is5ghz) ? '3' : '0';
    default:
      return '';
  }
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
  fields.wifi2.band = fields.wifi2.band.replace(
  	/BandWidth/g, 'X_CMCC_ChannelWidth',
  );
  fields.wifi5.band = fields.wifi2.band.replace(
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
  delete fields.diagnostics.speedtest.full_load_bytes_rec;
  delete fields.diagnostics.speedtest.full_load_period;
	return fields;
};

module.exports = zteModel;
