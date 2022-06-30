const basicCPEModel = require('./base-model');

let greatekModel = Object.assign({}, basicCPEModel);

greatekModel.identifier = 'Greatek GWR1200';

greatekModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.portForward = true;
  permissions.features.speedTest = true;
  permissions.features.stun = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noRanges;
  permissions.wan.portForwardQueueTasks = true;
  permissions.wan.speedTestLimit = 300;
  permissions.lan.configWrite = false;
  permissions.firmwareUpgrades = {
    '638.112.100.1383': [],
  };
  return permissions;
};

greatekModel.convertWifiMode = function(mode) {
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

greatekModel.convertGenieSerial = function(serial, mac) {
  return mac;
};

greatekModel.isDeviceConnectedViaWifi = function(
  layer2iface, wifi2iface, wifi5iface,
) {
  // Replace 2 with 6 - likely reused some legacy code in tr069 implementation
  return basicCPEModel.isDeviceConnectedViaWifi(
    layer2iface,
    wifi2iface.replace(/2/g, '6'),
    wifi5iface,
  );
};

greatekModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  Object.keys(fields.wifi2).forEach((k)=>{
    fields.wifi2[k] = fields.wifi5[k].replace(/5/g, '2');
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '1');
  });
  Object.keys(fields.mesh2).forEach((k)=>{
    fields.mesh2[k] = fields.mesh5[k].replace(/6/g, '4');
    fields.mesh5[k] = fields.mesh5[k].replace(/6/g, '3');
  });
  ['wifi2', 'wifi5', 'mesh2', 'mesh5'].forEach((k)=>{
    fields[k].password = fields[k].password.replace(
      /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
    );
  });
  // Port forwarding fields
  fields.port_mapping_fields.external_port_end =
    ['ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt'];
  fields.port_mapping_values.protocol =
    ['PortMappingProtocol', 'TCPandUDP', 'xsd:string'];
  // STUN fields
  fields.common.stun_enable =
    'InternetGatewayDevice.ManagementServer.STUNEnable';
  fields.common.stun_udp_conn_req_addr =
  'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';
  return fields;
};

module.exports = greatekModel;
