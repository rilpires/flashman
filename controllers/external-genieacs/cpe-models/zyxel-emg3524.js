const basicCPEModel = require('./base-model');

let zyxelModel = Object.assign({}, basicCPEModel);

zyxelModel.identifier = {vendor: 'Zyxel', model: 'EMG3524-T10A'};

zyxelModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.stun = true;
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48, 149, 153, 157, 161];
  permissions.wifi.bandRead2 = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.modeWrite = false;
  permissions.firmwareUpgrades = {
    'V1.42(ABXU.1)b6_0118': [],
  };
  return permissions;
};

zyxelModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'bg';
    case '11n':
      return 'bgn';
    case '11na':
      return 'an';
    case '11ac':
      return 'anac';
    case '11ax':
    default:
      return '';
  }
};

zyxelModel.isAllowedWebadminUsername = function(name) {
  return (name !== 'admin');
};

zyxelModel.getPortForwardRuleName = function(index) {
  return 'User Define';
};

zyxelModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.stun_enable = 'InternetGatewayDevice.ManagementServer.' +
    'STUNEnable';
  fields.common.stun_udp_conn_req_addr = 'InternetGatewayDevice.' +
    'ManagementServer.UDPConnectionRequestAddress';
  fields.common.web_admin_username = 'InternetGatewayDevice.X_5067F0_Ext.' +
    'LoginPrivilegeMgmt.1.UserName';
  fields.common.web_admin_password = 'InternetGatewayDevice.X_5067F0_Ext.' +
    'LoginPrivilegeMgmt.1.Password';
  fields.wan.rate = 'InternetGatewayDevice.LANDevice.1.' +
    'LANEthernetInterfaceConfig.4.Stats.X_5067F0_MaxBitRate';
  fields.wan.duplex = 'InternetGatewayDevice.LANDevice.1.' +
    'LANEthernetInterfaceConfig.4.Stats.X_5067F0_DuplexMode';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.1.WANIPConnection.1.Stats.EthernetBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.1.WANIPConnection.1.Stats.EthernetBytesSent';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.SignalStrength';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.LastDataTransmitRate';
  fields.port_mapping_values.protocol[1] = 'TCP/UDP';
  fields.port_mapping_values.remote_host = ['RemoteHost', '', 'xsd:string'];
  fields.port_mapping_values.description = [
    'PortMappingDescription', 'User Define', 'xsd:string',
  ];
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
  ['wifi2', 'wifi5', 'mesh2', 'mesh5'].forEach((k)=>{
    fields[k].password = fields[k].password.replace(
      /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
    );
  });
  return fields;
};

module.exports = zyxelModel;
