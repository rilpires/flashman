const basicCPEModel = require('./base-model');

let multilaserModel = Object.assign({}, basicCPEModel);

multilaserModel.identifier = {vendor: 'Multilaser / ZTE', model: 'H199A'};

multilaserModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.firmwareUpgrade = true;
  permissions.features.meshWifi = true;
  permissions.features.pingTest = true;
  permissions.features.portForward = true;
  permissions.features.siteSurvey = true;
  permissions.features.speedTest = true;
  permissions.features.stun = true;
  permissions.features.traceroute = true;
  permissions.lan.blockLANDevices = true;
  permissions.siteSurvey.survey2Index = '1';
  permissions.siteSurvey.survey5Index = '2';
  permissions.traceroute.maxProbePerHop = 3;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wan.speedTestLimit = 550;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64,
    100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140,
    149, 153, 157, 161, 165,
  ];
  permissions.wifi.bandAuto5 = false;
  permissions.mesh.objectExists = true;
  permissions.firmwareUpgrades = {
    'V9.1.0P1_MUL': ['V9.1.0P3N2_MUL', 'V9.1.0P4N1_MUL'],
    'V9.1.0P3N2_MUL': ['V9.1.0P4N1_MUL'],
    'V9.1.0P4N1_MUL': [],
  };
  return permissions;
};

multilaserModel.convertWifiMode = function(mode) {
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

multilaserModel.convertWifiBand = function(band, is5ghz=false) {
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

multilaserModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

multilaserModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_username = 'InternetGatewayDevice.DeviceInfo.' +
    'X_ZTE-COM_AdminAccount.Username';
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.' +
    'X_ZTE-COM_AdminAccount.Password';
  fields.devices.associated = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.AssociatedDevice';
  fields.devices.associated_5 = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.5.AssociatedDevice';
  fields.port_mapping_fields.internal_port_end = [
    'X_ZTE-COM_InternalPortEndRange', 'internal_port_start', 'xsd:unsignedInt',
  ];
  fields.port_mapping_values.protocol[1] = 'BOTH';
  fields.common.stun_enable = 'InternetGatewayDevice.ManagementServer.' +
    'STUNEnable';
  fields.common.stun_udp_conn_req_addr = 'InternetGatewayDevice.' +
    'ManagementServer.UDPConnectionRequestAddress';
  fields.access_control.wifi2 = fields.wifi2.ssid.replace(
    /SSID/g, 'X_ZTE-COM_AccessControl',
  );
  fields.access_control.wifi5 = fields.wifi5.ssid.replace(
    /SSID/g, 'X_ZTE-COM_AccessControl',
  );
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
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.AssociatedDeviceRssi';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_RxRate';
  fields.wifi2.mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1'+
    '.X_ZTE-COM_WlanStandard';
  fields.wifi5.mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5'+
    '.X_ZTE-COM_WlanStandard';
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1'+
    '.X_ZTE-COM_BandWidth';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5'+
    '.X_ZTE-COM_BandWidth';
  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.'+
    'LANDevice.1.WIFI';
  fields.diagnostics.sitesurvey.diag_state = 'Radio.*.DiagnosticsState';
  fields.diagnostics.sitesurvey.result = 'Radio.*.X_ZTE-COM_NeighborAP';
  fields.diagnostics.sitesurvey.band = 'Bandwidth';
  return fields;
};

module.exports = multilaserModel;
