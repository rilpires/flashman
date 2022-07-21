const basicCPEModel = require('./base-model');

let huaweiModel = Object.assign({}, basicCPEModel);

huaweiModel.identifier = {vendor: 'Huawei', model: 'WS7100 / AX3'};

huaweiModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.pingTest = true;
  permissions.wifi.axWiFiMode = true;
  permissions.firmwareUpgrades = {
    '10.0.5.29(C947)': [],
  };
  return permissions;
};

huaweiModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'b/g';
    case '11n':
      return 'b/g/n';
    case '11na':
      return 'a/n';
    case '11ac':
      return 'a/n/ac';
    case '11ax':
      return 'a/n/ac/ax';
    default:
      return '';
  }
};

huaweiModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wifi2.password = fields.wifi2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.wifi5.password = fields.wifi5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  Object.keys(fields.wifi5).forEach((k)=>{
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '2');
  });
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.AssociatedDeviceRssi';
  delete fields.wan.port_mapping_entries_dhcp;
  delete fields.wan.port_mapping_entries_ppp;
  fields.port_mapping_dhcp = 'InternetGatewayDevice.Services.' +
    'X_HUAWEI_PortForwarding';
  fields.port_mapping_ppp = 'InternetGatewayDevice.Services.' +
    'X_HUAWEI_PortForwarding';
  fields.port_mapping_values.protocol[1] = 'TCP/UDP';
  fields.port_mapping_values.remote_host = ['RemoteHost', '', 'xsd:string'];
  fields.port_mapping_fields.internal_port_end = [
    'InternalPortEndRange', 'internal_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
  delete fields.port_mapping_values.lease;
  return fields;
};

module.exports = huaweiModel;
