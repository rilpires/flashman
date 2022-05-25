const basicCPEModel = require('./base-model');

let intelbrasModel = {};

intelbrasModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.alt_uid = fields.common.mac;
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
    'WANPPPConnection.1.X_ITBS_VlanMuxID';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_ITBS_WLAN_ClientSignalStrength';
  fields.devices.host_mode = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_ITBS_WLAN_ClientMode';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_GponInterafceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.'+
    'X_GponInterafceConfig.TXPower';
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

module.exports = intelbrasModel;
