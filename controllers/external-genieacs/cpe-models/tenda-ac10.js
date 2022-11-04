const basicCPEModel = require('./base-model');

let tendaModel = Object.assign({}, basicCPEModel);

tendaModel.identifier = {vendor: 'Tenda', model: 'AC10'};

tendaModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.portForward = true;
  permissions.features.pingTest = true;
  permissions.features.siteSurvey = true;
  permissions.features.speedTest = true;
  permissions.features.stun = true;
  permissions.lan.needEnableConfig = true;
  permissions.siteSurvey.survey2Index = '1';
  permissions.siteSurvey.survey5Index = '2';
  permissions.wan.speedTestLimit = 180;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noRanges;
  permissions.wan.allowEditWanMtu = true;
  permissions.wan.allowReadWanMtu = true;
  permissions.wifi.mustBeEnabledToConfigure = true;
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48, 149, 153, 157, 161];
  permissions.wifi.modeWrite = false;
  permissions.firmwareUpgrades = {
    'V16.03.06.05_multi_BR01': [],
  };
  return permissions;
};

tendaModel.getFieldType = function(masterKey, key) {
  return 'xsd:string';
};

tendaModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'bg';
    case '11n':
      return 'bgn';
    case '11na':
      return 'an';
    case '11ac':
      return 'an+ac';
    case '11ax':
    default:
      return '';
  }
};

tendaModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '0';
    case 'HT40':
    case 'VHT40':
      return '1';
    case 'VHT80':
      return '3';
    case 'auto':
      return '2';
    default:
      return '';
  }
};

tendaModel.convertWifiBandToFlashman = function(band, isAC) {
  switch (band) {
    // String input
    case '0':
      return (isAC) ? 'VHT20' : 'HT20';
    case '1':
      return (isAC) ? 'VHT40' : 'HT40';
    case '2':
      return 'auto';
    case '3':
      return (isAC) ? 'VHT80' : undefined;
    default:
      return undefined;
  }
};

tendaModel.convertField = function(
  masterKey, key, value, typeFunc, modeFunc, bandFunc,
) {
  let fullKey = masterKey + '-' + key;
  if (fullKey === 'wifi2-enable' || fullKey === 'wifi5-enable') {
    let result = {value: null, type: tendaModel.getFieldType(masterKey, key)};
    result.value = (value > 0) ? '1' : '0';
    return result;
  }
  return basicCPEModel.convertField(
    masterKey, key, value, typeFunc, modeFunc, bandFunc,
  );
};

tendaModel.getBeaconType = function() {
  return 'WPAand11i';
};

tendaModel.convertChannelToTask = function(channel, fields, masterKey) {
  let auto = (channel === 'auto');
  let values = [];
  values.push([
    fields[masterKey]['auto'], (auto) ? '1' : '0', 'xsd:string',
  ]);
  if (!auto) {
    values.push([
      fields[masterKey]['channel'], channel, 'xsd:string',
    ]);
  }
  return values;
};

tendaModel.convertPingTestResult = function(latency) {
  return (parseInt(latency) / 1000).toString(); // Results are in microseconds
};

tendaModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.alt_uid = fields.common.mac;
  fields.common.model = 'InternetGatewayDevice.DeviceInfo.ProductClass';
  fields.common.stun_enable = 'InternetGatewayDevice.ManagementServer.' +
    'STUNEnable';
  fields.common.stun_udp_conn_req_addr = 'InternetGatewayDevice.' +
    'ManagementServer.UDPConnectionRequestAddress';
  fields.lan.subnet_mask = 'InternetGatewayDevice.LANDevice.1'+
    '.LANHostConfigManagement.SubnetMask';
  fields.lan.enable_config = 'InternetGatewayDevice.LANDevice.1.'+
    'LANHostConfigManagement.DHCPServerConfigurable';

  fields.port_mapping_fields.external_port_start = [
    'ExternalPort', 'external_port_start', 'xsd:string',
  ];
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:string',
  ];
  fields.port_mapping_fields.internal_port_start = [
    'InternalPort', 'internal_port_start', 'xsd:string',
  ];
  fields.port_mapping_fields.client = [
    'InternalClient', 'ip', 'xsd:string',
  ];
  fields.port_mapping_values.enable = [
    'PortMappingEnabled', '1', 'xsd:string',
  ];
  fields.port_mapping_values.lease = [
    'PortMappingLeaseDuration', '0', 'xsd:string',
  ];
  fields.port_mapping_values.protocol = [
    'PortMappingProtocol', 'TCP AND UDP', 'xsd:string',
  ];
  fields.port_mapping_values.description = [
    'PortMappingDescription', '0', 'xsd:string',
  ];
  fields.port_mapping_values.remote_host = [
    'RemoteHost', '0', 'xsd:string',
  ];
  Object.keys(fields.wifi5).forEach((k)=>{
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '2');
  });
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration'+
    '.1.X_CT-COM_ChannelWidth';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration'+
    '.2.X_CT-COM_ChannelWidth';
  fields.wan.mtu_ppp = 'InternetGatewayDevice.WANDevice.1.'+
    'WANConnectionDevice.*.WANPPPConnection.*.MaxMTUSize';

  fields.devices.associated = 'InternetGatewayDevice.LANDevice.1'+
    '.WLANConfiguration.1.AssociatedDevice';
  fields.devices.associated_5 = 'InternetGatewayDevice.LANDevice.1'+
    '.WLANConfiguration.2.AssociatedDevice';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1'+
  '.WLANConfiguration.*.AssociatedDevice.*.X_CT-COM_RSSI';
  fields.devices.alt_host_name = 'InternetGatewayDevice.LANDevice.1'+
    '.WLANConfiguration.*.AssociatedDevice.*.X_CT-COM_DhcpName';
  fields.mesh2 = {};
  fields.mesh5 = {};
  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.LANDevice'+
    '.1.X_CT-COM_Radio';
  fields.diagnostics.sitesurvey.diag_state = '*.WLANNeighbor.DiagnosticsState';
  fields.diagnostics.sitesurvey.result = '*.WLANNeighbor.Result';
  fields.diagnostics.sitesurvey.ssid = 'SSIDName';
  return fields;
};

module.exports = tendaModel;
