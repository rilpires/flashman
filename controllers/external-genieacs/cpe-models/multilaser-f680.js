const basicCPEModel = require('./base-model');

let multilaserModel = Object.assign({}, basicCPEModel);

multilaserModel.identifier = {vendor: 'Multilaser / ZTE', model: 'F680'};

multilaserModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.meshWifi = true;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.siteSurvey = true;
  permissions.features.traceroute = true;
  permissions.features.portForward = true;
  permissions.features.wlanAccessControl = true;
  permissions.features.hasCPUUsage = true;
  permissions.features.hasMemoryUsage = true;
  permissions.lan.LANDeviceHasSNR = true;
  permissions.siteSurvey.requiresPolling = true;
  permissions.siteSurvey.requiresSeparateTasks = true;
  permissions.siteSurvey.survey2Index = '1';
  permissions.siteSurvey.survey5Index = '2';
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noRanges;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64,
    100, 104, 108, 112, 116, 120, 124, 128,
    149, 153, 157, 161,
  ];
  permissions.wifi.modeWrite = false;
  permissions.mesh.objectExists = true;
  permissions.firmwareUpgrades = {
    'V6.0.10P3N9': ['V6.0.10P3N12B'],
    'V6.0.10P3N12B': [],
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

multilaserModel.getBeaconType = function() {
  return 'WPAand11i';
};

multilaserModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

multilaserModel.convertWifiRate = function(rate) {
  return parseInt(rate) / 1000;
};

multilaserModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_username = 'InternetGatewayDevice.UserInterface.' +
    'X_ZTE-COM_WebUserInfo.AdminName';
  fields.common.web_admin_password = 'InternetGatewayDevice.UserInterface.' +
    'X_ZTE-COM_WebUserInfo.AdminPassword';
  fields.wan.recv_bytes = fields.wan.recv_bytes.replace(
    /WANEthernetInterfaceConfig/g, 'X_ZTE-COM_WANPONInterfaceConfig',
  );
  fields.wan.sent_bytes = fields.wan.sent_bytes.replace(
    /WANEthernetInterfaceConfig/g, 'X_ZTE-COM_WANPONInterfaceConfig',
  );
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.'+
  'WANConnectionDevice.*.WANIPConnection.*.X_ZTE-COM_VLANID';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.'+
  'WANConnectionDevice.*.WANPPPConnection.*.X_ZTE-COM_VLANID';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_RSSI';
  fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_ZTE-COM_SNR';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.LastDataTransmitRate';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_ZTE-COM_WANPONInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_ZTE-COM_WANPONInterfaceConfig.TXPower';
  fields.port_mapping_values.protocol[1] = 'TCP AND UDP';
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
  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.'+
    'LANDevice.1.WIFI';
  fields.diagnostics.sitesurvey.diag_state = 'Radio.*.DiagnosticsState';
  fields.diagnostics.sitesurvey.result = 'Radio.*.X_ZTE-COM_NeighborAP';
  fields.diagnostics.statistics.cpu_usage = 'InternetGatewayDevice.' +
    'DeviceInfo.X_ZTE-COM_CpuUsed';
  fields.diagnostics.statistics.memory_usage = 'InternetGatewayDevice.' +
    'DeviceInfo.X_ZTE-COM_MemUsed';
  // Delete free and used memory as the usage already has the percentage
  delete fields.diagnostics.statistics.memory_free;
  delete fields.diagnostics.statistics.memory_total;

  return fields;
};

module.exports = multilaserModel;
