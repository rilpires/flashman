const basicCPEModel = require('./base-model');

let cianetModel = Object.assign({}, basicCPEModel);

cianetModel.identifier = {vendor: 'Cianet', model: 'ONU GW24AC'};

cianetModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.stun = true;
  permissions.features.upnp = false;
  permissions.features.wps = false;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.wan.allowReadWanMtu = false;
  permissions.wan.allowEditWanMtu = false;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.hasUptimeField = false;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116,
    120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165,
  ];
  permissions.firmwareUpgrades = {
    'V1.0.9': [],
  };
  return permissions;
};

cianetModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.X_CT-COM_TeleComAccount.Password';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.TXPower';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.wan_ip = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.DNSServers';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wifi2.auto = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel';
  fields.wifi5.password = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase';
  fields.wifi5.auto = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Channel';
  fields.wifi5.enable = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.Enable';
  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.Hosts.Host.3.InterfaceType';
  return fields;
}

module.exports = cianetModel;
