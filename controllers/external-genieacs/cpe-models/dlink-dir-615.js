const basicCPEModel = require('./base-model');

let dlinkModel = Object.assign({}, basicCPEModel);

dlinkModel.identifier = {vendor: 'D-Link', model: 'DIR-615'};

dlinkModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.pingTest = true;
  permissions.wifi.dualBand = false;
  permissions.lan.LANDeviceHasAssocTree = false;
  permissions.firmwareUpgrades = {
    '3.0.7': [],
  };
  return permissions;
};

dlinkModel.convertWifiMode = function(mode) {
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

dlinkModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '20MHz';
    case 'HT40':
    case 'VHT40':
      return '20/40MHz';
    case 'VHT80':
      return '20/40/80MHz';
    case 'auto':
      return (is5ghz) ? '20/40/80MHz' : '20/40MHz Coexistent';
    default:
      return '';
  }
};

dlinkModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  Object.keys(fields.wifi2).forEach((k)=>{
    fields.wifi5[k] = fields.wifi5[k].replace(/5/g, '3');
  });
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.' +
    'X_DLINK_OperatingChannelBandwidth';
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.' +
    'X_DLINK_OperatingChannelBandwidth';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.X_DLINK_RSSI';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.LastDataTransmitRate';
  return fields;
};

module.exports = dlinkModel;
