const basicCPEModel = require('./base-model');

let intelbrasModel = Object.assign({}, basicCPEModel);

intelbrasModel.identifier = {vendor: 'Intelbras', model: 'W5-1200G'};

intelbrasModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
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

intelbrasModel.isDeviceConnectedViaWifi = function(
  layer2iface, wifi2iface, wifi5iface,
) {
  // Replace 2 with 6 - likely reused some legacy code in tr069 implementation
  return basicCPEModel.isDeviceConnectedViaWifi(
    layer2iface,
    wifi2iface.replace(/2/g, '6'),
    wifi5iface,
  );
};

intelbrasModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.alt_uid = fields.common.mac;
  fields.common.model = 'InternetGatewayDevice.DeviceInfo.ProductClass';
  fields.common.web_admin_username = 'InternetGatewayDevice.UserInterface.' +
    'X_ITBS_Username';
  fields.common.web_admin_password = 'InternetGatewayDevice.UserInterface.' +
    'X_ITBS_UserPassword';
  fields.common.stun_enable =
    'InternetGatewayDevice.ManagementServer.STUNEnable';
  fields.common.stun_udp_conn_req_addr =
  'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  Object.keys(fields.wifi2).forEach((k)=>{
    fields.wifi2[k] = fields.wifi5[k].replace(/5/g, '2');
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '1');
  });
  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.WiFi.' +
    'NeighboringWiFiDiagnostic';
  return fields;
};

module.exports = intelbrasModel;
