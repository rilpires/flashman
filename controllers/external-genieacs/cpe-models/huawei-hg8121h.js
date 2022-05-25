const basicCPEModel = require('./base-model');

let huaweiModel = {};

huaweiModel.identifier = 'Huawei HG8121H';

huaweiModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.speedTest = true;
  permissions.wan.speedTestLimit = 150;
  permissions.wifi.dualBand = false;
  permissions.firmwareUpgrades = {
    'V3R018C00S128': [],
  };
  return permissions;
};

huaweiModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_username = 'InternetGatewayDevice.UserInterface.' +
    'X_HW_WebUserInfo.2.UserName';
  fields.common.web_admin_password = 'InternetGatewayDevice.UserInterface.' +
    'X_HW_WebUserInfo.2.Password';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'X_GponInterafceConfig.Stats.BytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'X_GponInterafceConfig.Stats.BytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_GponInterafceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_GponInterafceConfig.TXPower';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
    'WANPPPConnection.*.X_HW_VLAN';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_HW_RSSI';
  fields.devices.host_snr = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_HW_SNR';
  fields.port_mapping_fields.internal_port_end = [
    'X_HW_InternalEndPort', 'internal_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
  delete fields.port_mapping_values.remote_host;
  fields.port_mapping_values.protocol[1] = 'TCP/UDP';
  fields.wifi2.password = fields.wifi2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.PreSharedKey',
  );
  fields.wifi5.password = fields.wifi5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.PreSharedKey',
  );
  fields.wifi2.band = fields.wifi2.band.replace(/BandWidth/g, 'X_HW_HT20');
  fields.wifi5.band = fields.wifi5.band.replace(/BandWidth/g, 'X_HW_HT20');
  fields.mesh2.password = fields.mesh2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.PreSharedKey',
  );
  fields.mesh5.password = fields.mesh5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.PreSharedKey',
  );
  Object.keys(fields.mesh5).forEach((k)=>{
    fields.mesh5[k] = fields.mesh5[k].replace(/6/g, '3');
  });
  fields.mesh2.rates = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.' +
    '2.BasicDataTransmitRates';
  fields.mesh2.radio_info = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.2.LowerLayers';
  fields.mesh5.rates = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.' +
    '3.BasicDataTransmitRates';
  fields.mesh5.radio_info = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.3.LowerLayers';
  return fields;
};

module.exports = huaweiModel;
