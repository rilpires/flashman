const basicCPEModel = require('./base-model');

let tplinkModel = Object.assign({}, basicCPEModel);

tplinkModel.identifier = {vendor: 'TP-Link', model: 'EC220-G5 v2'};

tplinkModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.wan.allowEditWanMtu = true;
  permissions.wan.allowReadWanMtu = true;
  permissions.features.pingTest = true;
  permissions.features.portForward = true;
  permissions.features.speedTest = true;
  permissions.features.traceroute = true;
  permissions.lan.sendDnsOnLANChange = false;
  permissions.traceroute.protocol = 'ICMP';
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noRanges;
  permissions.wan.speedTestLimit = 230;
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48, 149, 153, 157, 161];
  permissions.wifi.modeWrite = false;
  permissions.firmwareUpgrades = {
    '3.16.0 0.9.1 v6055.0 Build 201228 Rel.13643n': [],
  };
  return permissions;
};

tplinkModel.convertWifiMode = function(mode) {
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

tplinkModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '20M';
    case 'HT40':
    case 'VHT40':
      return '40M';
    case 'VHT80':
      return '80M';
    case 'auto':
      return 'Auto';
    default:
      return '';
  }
};

tplinkModel.getPortForwardRuleName = function(index) {
  return 'Anlix_' + index.toString();
};

tplinkModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  Object.keys(fields.wifi5).forEach((k)=>{
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '2');
  });
  fields.common.web_admin_password = 'InternetGatewayDevice.X_TP_UserCfg.'+
    'UserPwd';
  fields.wifi2.password = fields.wifi2.password.replace(
    /KeyPassphrase/g, 'X_TP_PreSharedKey',
  );
  fields.wifi5.password = fields.wifi5.password.replace(
    /KeyPassphrase/g, 'X_TP_PreSharedKey',
  );
  fields.wifi2.band = fields.wifi2.band.replace(
    /BandWidth/g, 'X_TP_Bandwidth',
  );
  fields.wifi5.band = fields.wifi5.band.replace(
    /BandWidth/g, 'X_TP_Bandwidth',
  );
  fields.port_mapping_fields.external_port_end = [
    'X_TP_ExternalPortEnd', 'external_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_fields.internal_port_end = [
    'X_TP_InternalPortEnd', 'internal_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_values.description[0] = 'ServiceName';
  fields.port_mapping_values.protocol[1] = 'TCP or UDP';
  delete fields.port_mapping_values.remote_host;
  delete fields.port_mapping_values.lease;
  // is needless to set this parameter
  delete fields.lan.dns_servers;
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1'+
    '.WLANConfiguration.*.AssociatedDevice.*.X_TP_StaSignalStrength';
  fields.devices.host_mode = 'InternetGatewayDevice.LANDevice.1'+
    '.WLANConfiguration.*.AssociatedDevice.*.X_TP_StaStandard';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1'+
    '.WLANConfiguration.*.AssociatedDevice.*.X_TP_StaConnectionSpeed';
  return fields;
};

module.exports = tplinkModel;
