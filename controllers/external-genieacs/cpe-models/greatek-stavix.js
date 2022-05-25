const basicCPEModel = require('./base-model');

let greatekModel = {};

greatekModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
    'X_RTK_WANGponLinkConfig.VLANIDMark';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.WLAN_RSSI';
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

module.exports = greatekModel;
