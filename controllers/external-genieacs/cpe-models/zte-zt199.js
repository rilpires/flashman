const basicCPEModel = require('./base-model');

let zteModel = Object.assign({}, basicCPEModel);

zteModel.identifier = {vendor: 'Multilaser / ZTE', model: 'ZT199'};

zteModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.meshWifi = true;
  permissions.features.pingTest = true;
  permissions.features.portForward = true;
  permissions.features.speedTest = true;
  permissions.features.stun = true;
  permissions.features.wlanAccessControl = true;
  permissions.features.traceroute = true;
  permissions.traceroute.protocol = 'ICMP';
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wan.speedTestLimit = 550;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64,
    100, 104, 108, 112, 116, 120, 124, 128,
    149, 153, 157, 161,
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
  fields.wan.wan_ip = fields.wan.wan_ip.replace(
    /1.ExternalIPAddress/, '*.ExternalIPAddress',
  );
  fields.wan.wan_ip_ppp = fields.wan.wan_ip_ppp.replace(
    /1.ExternalIPAddress/, '*.ExternalIPAddress',
  );
  fields.wifi2.mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1'+
    '.X_ZTE-COM_WlanStandard';
  fields.wifi5.mode = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5'+
    '.X_ZTE-COM_WlanStandard';
  fields.wifi2.band = fields.wifi2.band.replace(
    /BandWidth/g, 'X_ZTE-COM_BandWidth',
  );
  fields.wifi5.band = fields.wifi5.band.replace(
    /BandWidth/g, 'X_ZTE-COM_BandWidth',
  );
  fields.wan.uptime = fields.wan.uptime.replace(/1.Uptime/, '*.Uptime');
  fields.wan.uptime_ppp = fields.wan.uptime_ppp.replace(/1.Uptime/, '*.Uptime');
  fields.common.web_admin_username = 'InternetGatewayDevice.User.1.Username';
  fields.common.web_admin_password = 'InternetGatewayDevice.User.1.Password';
  fields.devices.associated = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.AssociatedDevice';
  fields.devices.associated_5 = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.5.AssociatedDevice';
  fields.port_mapping_fields.internal_port_end = [
    'X_ZTE-COM_InternalPortEndRange', 'internal_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_values.description[0] = 'X_ZTE-COM_Name';
  fields.port_mapping_values.other_description = ['PortMappingDescription',
    '', 'xsd:string'];
  fields.port_mapping_values.protocol[1] = 'BOTH';
  fields.port_mapping_values.zte_remote_host_end = [
    'X_ZTE-COM_RemoteHostEndRange', '0.0.0.0', 'xsd:string',
  ];
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
  fields.diagnostics.traceroute.protocol = 'X_ZTE-COM_Protocol';
  return fields;
};

module.exports = zteModel;
