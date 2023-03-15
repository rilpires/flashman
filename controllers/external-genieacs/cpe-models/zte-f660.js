const basicCPEModel = require('./base-model');

let zteModel = Object.assign({}, basicCPEModel);

zteModel.identifier = {vendor: 'ZTE', model: 'F660'};

zteModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.wlanAccessControl = true;
  permissions.features.traceroute = true;
  // permissions.features.speedTest = true; // Limit is too low
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.LANDeviceHasSNR = true;
  // permissions.wan.speedTestLimit = 45;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wifi.dualBand = false;
  permissions.wifi.modeWrite = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.firmwareUpgrades = {
    'V8.0.10P1T20': [],
  };
  return permissions;
};

zteModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'b,g';
    case '11n':
      return 'g,n';
    case '11na':
    case '11ac':
    case '11ax':
    default:
      return '';
  }
};

zteModel.getBeaconType = function() {
  return 'WPAand11i';
};

zteModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

zteModel.convertWifiRate = function(rate) {
  return parseInt(rate) / 1000;
};

zteModel.isDeviceConnectedViaWifi = function(
  layer2iface, wifi2iface, wifi5iface,
) {
  if (layer2iface === '802.11') {
    return 'wifi';
  }
  return 'cable';
};

zteModel.useModelAlias = function(fwVersion) {
  // Use this for the firmwares that have IGD as ModelName
  if (fwVersion === 'V8.0.10P1T20') {
    return 'F660 V8';
  }
  return '';
};

zteModel.getModelFields = function() {
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
  fields.access_control.wifi2 = fields.wifi2.ssid.replace(
    /SSID/g, 'X_ZTE-COM_AccessControl',
  );
  fields.wifi2.password = fields.wifi2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.mesh2.password = fields.mesh2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.Hosts.' +
    'Host.*.InterfaceType';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.AssociatedDevice.1.X_ZTE-COM_RSSI';
  fields.devices.snr = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.' +
    '1.AssociatedDevice.1.X_ZTE-COM_SNR';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.AssociatedDevice.1.X_ZTE-COM_RXRate';
  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.LANDevice.1.WIFI';
  return fields;
};

module.exports = zteModel;
