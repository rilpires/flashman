const basicCPEModel = require('./base-model');

let zteModel = Object.assign({}, basicCPEModel);

zteModel.identifier = {vendor: 'ZTE', model: 'H196A'};

zteModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.pingTest = true;
  permissions.features.portForward = true;
  permissions.features.speedTest = true;
  permissions.features.stun = true;
  permissions.features.traceroute = true;
  permissions.features.upnp = false;
  permissions.features.wps = false;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.wan.speedTestLimit = 550;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymNoRanges;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116,
    120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161,
  ];
  // permissions.wifi.bandWrite2 = false;
  // permissions.wifi.bandWrite5 = false;
  permissions.wifi.allowDiacritics = true;
  permissions.firmwareUpgrades = {
    'V9.0.0P2_MUL': [],
  };
  return permissions;
};

zteModel.convertWifiMode = function(mode) {
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

zteModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '20MHz';
    case 'HT40':
    case 'VHT40':
      return '40MHz';
    case 'VHT80':
      return '80MHz';
    case 'auto':
      return (is5ghz) ? '80MHz' : 'Auto';
    default:
      return '';
  }
};

zteModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_username = 'InternetGatewayDevice.User.1.Username';
  fields.common.web_admin_password = 'InternetGatewayDevice.User.1.Password';
  fields.common.stun_enable = 'InternetGatewayDevice.ManagementServer.' +
    'STUNEnable';
  fields.common.stun_udp_conn_req_addr = 'InternetGatewayDevice.' +
    'ManagementServer.UDPConnectionRequestAddress';
  fields.devices.associated = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.AssociatedDevice';
  fields.devices.associated_5 = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.5.AssociatedDevice';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.X_ZTE-COM_BandWidth';
  fields.wifi2.mode = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.X_ZTE-COM_WlanStandard';
  fields.access_control.wifi2 = 'InternetGatewayDevice.LANDevice.' +
    '1.WLANConfiguration.1.X_ZTE-COM_AccessControl';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.5.X_ZTE-COM_BandWidth';
  fields.wifi5.mode = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.5.X_ZTE-COM_WlanStandard';
  fields.access_control.wifi5 = 'InternetGatewayDevice.LANDevice.' +
    '1.WLANConfiguration.5.X_ZTE-COM_AccessControl';
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_fields.internal_port_end = [
    'X_ZTE-COM_InternalPortEndRange', 'internal_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_values.description[0] = 'X_ZTE-COM_Name';
  fields.port_mapping_values.other_description = [
    'PortMappingDescription', '', 'xsd:string',
  ];
  fields.port_mapping_values.protocol[1] = 'BOTH';
  fields.port_mapping_values.zte_remote_host_end = [
    'X_ZTE-COM_RemoteHostEndRange', '0.0.0.0', 'xsd:string',
  ];
  return fields;
};

module.exports = zteModel;
