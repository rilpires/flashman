const basicCPEModel = require('./base-model');

let intelbrasModel = Object.assign({}, basicCPEModel);

intelbrasModel.identifier = {vendor: 'Intelbras', model: 'RX1500'};

intelbrasModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.speedTest = true;
  permissions.features.traceroute = true;
  permissions.lan.dnsServersWrite = false;
  permissions.lan.sendRoutersOnLANChange = false;
  permissions.lan.dnsServersLimit = 2;
  permissions.wan.dhcpUptime = false;
  permissions.wan.hasUptimeField = true;
  permissions.wan.speedTestLimit = 320;
  permissions.wan.hasIpv4DefaultGatewayField = true;
  permissions.wan.hasDnsServerField = true;
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48, 149, 153, 157, 161, 165];
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.axWiFiMode = true;
  permissions.wifi.bandRead2 = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.modeWrite = false;
  permissions.firmwareUpgrades = {
    '2.1.3': [],
  };
  return permissions;
};

intelbrasModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'g';
    case '11n':
      return 'n';
    case '11na':
    case '11ac':
      return 'ac';
    case '11ax':
    default:
      return '';
  }
};

intelbrasModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.model = 'InternetGatewayDevice.DeviceInfo.ProductClass';
  fields.common.alt_uid = fields.common.mac;
  delete fields.port_mapping_fields.external_port_end;
  delete fields.port_mapping_fields.internal_port_end;
  Object.keys(fields.wifi2).forEach((k)=>{
    fields.wifi2[k] = fields.wifi5[k].replace(/5/g, '6');
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '1');
  });
  return fields;
};

module.exports = intelbrasModel;
