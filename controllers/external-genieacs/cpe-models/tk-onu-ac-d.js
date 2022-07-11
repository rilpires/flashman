const basicCPEModel = require('./base-model');

let tkOnuAcDModel = Object.assign({}, basicCPEModel);

tkOnuAcDModel.identifier = 'Think/TK-ONU-AC-D';

tkOnuAcDModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.firmwareUpgrade = true;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.lan.blockLANDevices = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wifi.dualBand = false;
  permissions.firmwareUpgrades = {
    'V1.0.9': [],
  };
  return permissions;
};

tkOnuAcDModel.convertWifiMode = function(mode) {
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

tkOnuAcDModel.getBeaconType = function() {
  return 'WPAand11i';
};

tkOnuAcDModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

tkOnuAcDModel.convertWifiRate = function(rate) {
  return parseInt(rate) / 1000;
};

tkOnuAcDModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  return fields;
};

module.exports = tkOnuAcDModel;
