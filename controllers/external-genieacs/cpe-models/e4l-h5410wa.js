const basicCPEModel = require('./base-model');

let e4lModel = Object.assign({}, basicCPEModel);

e4lModel.identifier = {vendor: 'E4L', model: 'E4L-H5410WA'};

e4lModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.upnp = false;
  permissions.features.wps = false;
  permissions.lan.sendDnsOnLANChange = false;
  permissions.lan.sendRoutersOnLANChange = false;
  permissions.wan.allowReadWanMtu = false;
  permissions.wan.allowEditWanMtu = false;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wifi.allowDiacritics = true;
  permissions.firmwareUpgrades = {'V6.2.9T1': []};
  return permissions;
}

e4lModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.X_CT-COM_TeleComAccount.Password';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.TXPower';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wifi2.password = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase';
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_CT-COM_ChannelWidth';
  fields.wifi5.password = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.PreSharedKey';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.X_CT-COM_ChannelWidth';
  return fields;
}

module.exports = e4lModel;