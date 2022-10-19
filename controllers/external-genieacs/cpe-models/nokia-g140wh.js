const basicCPEModel = require('./base-model');

let nokiaModel = Object.assign({}, basicCPEModel);

nokiaModel.identifier = {vendor: 'Nokia', model: 'G-140W-H'};

nokiaModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.firmwareUpgrade = true;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.features.siteSurvey = true;
  permissions.features.speedTest = true;
  permissions.features.traceroute = true;
  permissions.lan.sendRoutersOnLANChange = false;
  permissions.lan.LANDeviceHasSNR = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wan.speedTestLimit = 650;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 149, 153, 157, 161,
  ];
  permissions.firmwareUpgrades = {
    '3FE48077HJIJ86': ['3FE48077HJIL96'],
    '3FE48077HJIL96': [],
  };
  return permissions;
};

nokiaModel.convertWifiMode = function(mode) {
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

nokiaModel.convertWifiBand = function(band, is5ghz=false) {
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
      return 'Auto';
    default:
      return '';
  }
};

nokiaModel.convertWifiRate = function(rate) {
  return parseInt(rate) / 1000;
};

nokiaModel.convertWanRate = function(rate) {
  return parseInt(rate) / 1000000;
};

nokiaModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wifi2.password = fields.wifi2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.wifi5.password = fields.wifi5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.' +
    'X_ALU_COM_ChannelBandWidthExtend';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.' +
    'X_ALU_COM_ChannelBandWidthExtend';
  fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_ALU-COM_SNR';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.LastDataDownlinkRate';
  fields.devices.host_mode = 'InternetGatewayDevice.LANDevice.1'+
    '.WLANConfiguration.*.AssociatedDevice.*.OperatingStandard';
  fields.common.web_admin_username = 'InternetGatewayDevice.X_Authentication.' +
    'WebAccount.UserName';
  fields.common.web_admin_password = 'InternetGatewayDevice.X_Authentication.' +
    'WebAccount.Password';
  fields.port_mapping_values.protocol[1] = 'TCPorUDP';
  fields.port_mapping_values.remote_host = ['RemoteHost', '', 'xsd:string'];
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_fields.internal_port_end = [
    'X_ASB_COM_InternalPortEnd', 'internal_port_end', 'xsd:unsignedInt',
  ];
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.rate = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.Layer1DownstreamMaxBitRate';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.X_ALU_OntOpticalParam.' +
    'RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.X_ALU_OntOpticalParam.' +
    'TXPower';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
    'X_CT-COM_WANGponLinkConfig.VLANIDMark';

  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.'+
    'X_ALU-COM_NeighboringWiFiDiagnostic';
  fields.diagnostics.sitesurvey.signal = 'SignalStrength';
  fields.diagnostics.sitesurvey.band = 'OperatingChannelBandwidth';
  fields.diagnostics.sitesurvey.mode = 'OperatingStandards';
  return fields;
};

module.exports = nokiaModel;
