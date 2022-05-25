const basicCPEModel = require('./base-model');

let dlinkModel = {};

dlinkModel.identifier = 'D-Link DIR-841';

dlinkModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.speedTest = true;
  permissions.wan.speedTestLimit = 180;
  permissions.firmwareUpgrades = {
    '3.0.4': [],
  };
  return permissions;
};

dlinkModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.wifi5.ssid = fields.wifi5.ssid.replace(/5/g, '3');
  fields.wifi5.bssid = fields.wifi5.bssid.replace(/5/g, '3');
  fields.wifi5.password = fields.wifi5.password.replace(/5/g, '3');
  fields.wifi5.channel = fields.wifi5.channel.replace(/5/g, '3');
  fields.wifi5.auto = fields.wifi5.auto.replace(/5/g, '3');
  fields.wifi5.mode = fields.wifi5.mode.replace(/5/g, '3');
  fields.wifi5.enable = fields.wifi5.enable.replace(/5/g, '3');
  fields.wifi5.band = fields.wifi5.band.replace(/5/g, '3');
  fields.wifi5.beacon_type = fields.wifi5.beacon_type.replace(/5/g, '3');
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.' +
    'X_DLINK_OperatingChannelBandwidth';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.' +
    'X_DLINK_OperatingChannelBandwidth';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_DLINK_RSSI';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.LastDataTransmitRate';
  fields.wan.wan_ip = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.' +
    '*.WANIPConnection.*.ExternalIPAddress';
  fields.wan.uptime = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.' +
    '*.WANIPConnection.*.Uptime';
  return fields;
};

module.exports = dlinkModel;
