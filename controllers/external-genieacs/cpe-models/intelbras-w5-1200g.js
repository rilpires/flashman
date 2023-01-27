const basicCPEModel = require('./base-model');

let intelbrasModel = Object.assign({}, basicCPEModel);

intelbrasModel.identifier = {vendor: 'Intelbras', model: 'W5-1200G'};

intelbrasModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.pingTest = true;
  // permissions.features.speedtest = true; // Commented since it caps at 80Mbps
  permissions.features.stun = true;
  permissions.features.upnp = false;
  permissions.features.wps = false;
  permissions.lan.configWrite = false;
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48, 149, 153, 157, 161, 165];
  permissions.wifi.bandRead2 = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.modeWrite = false;
  permissions.firmwareUpgrades = {
    '1.23.7': [],
  };
  return permissions;
};

intelbrasModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.alt_uid = fields.common.mac;
  fields.common.model = 'InternetGatewayDevice.DeviceInfo.ProductClass';
  fields.common.web_admin_username = 'InternetGatewayDevice.UserInterface.' +
    'X_ITBS_Username';
  fields.common.web_admin_password = 'InternetGatewayDevice.UserInterface.' +
    'X_ITBS_UserPassword';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wifi2.password = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.2.KeyPassphrase';
  fields.wifi2.auto = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.2.AutoChannelEnable';
  fields.wifi2.enable = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.2.Enable';
  fields.wifi2.ssid = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.2.SSID';
  fields.wifi2.mode = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.2.Standard';
  fields.wifi2.channel = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.2.Channel';
  fields.wifi5.password = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.PreSharedKey.1.KeyPassphrase';
  fields.wifi5.auto = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.AutoChannelEnable';
  fields.wifi5.enable = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.Enable';
  fields.wifi5.ssid = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.SSID';
  fields.wifi5.mode = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.Standard';
  fields.wifi5.channel = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.1.Channel';
  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.WiFi.' +
    'NeighboringWiFiDiagnostic';
  return fields;
};

module.exports = intelbrasModel;
