const basicCPEModel = require('./base-model');

let datacomModel = Object.assign({}, basicCPEModel);

datacomModel.identifier = {vendor: 'Datacom', model: 'DM986-414'};

datacomModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.firmwareUpgrade = true;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.speedTest = true;
  permissions.wan.speedTestLimit = 200;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noRanges;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 149, 153, 157, 161,
  ];
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.firmwareUpgrades = {
    'V4.6.0-210709': ['V5.4.0-220624'],
    'V5.4.0-220624': [],
  };
  return permissions;
};

datacomModel.convertWifiMode = function(mode) {
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

datacomModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '0';
    case 'HT40':
    case 'VHT40':
      return '1';
    case 'VHT80':
      return '2';
    case 'auto':
      return (is5ghz) ? '2' : '1';
    default:
      return '';
  }
};

datacomModel.convertWifiBandToFlashman = function(band, isAC) {
  switch (band) {
    // String input
    case '0':
      return (isAC) ? 'VHT20' : 'HT20';
    case '1':
      return (isAC) ? 'VHT40' : 'HT40';
    case '2':
      return (isAC) ? 'VHT80' : undefined;
    default:
      return undefined;
  }
};

datacomModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
    'X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.common.web_admin_password = 'InternetGatewayDevice.UserInterface.' +
    'X_WebUserInfo.UserPassword';
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_values.protocol = [
    'PortMappingProtocol', 'TCPandUDP', 'xsd:string',
  ];
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_GponInterafceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_GponInterafceConfig.TXPower';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.1.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.1.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.' +
    'ChannelWidth';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.' +
    'ChannelWidth';
  Object.keys(fields.wifi2).forEach((k)=>{
    fields.wifi2[k] = fields.wifi5[k].replace(/5/g, '6');
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '1');
  });
  Object.keys(fields.mesh2).forEach((k)=>{
    fields.mesh2[k] = fields.mesh5[k].replace(/6/g, '7');
    fields.mesh5[k] = fields.mesh5[k].replace(/6/g, '2');
  });
  return fields;
};

module.exports = datacomModel;
