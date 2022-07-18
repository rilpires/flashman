const basicCPEModel = require('./base-model');

let nokiaModel = Object.assign({}, basicCPEModel);

nokiaModel.identifier = 'Nokia G-140W-C';

nokiaModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.firmwareUpgrades = {
    '3FE46343AFIA57': [],
    '3FE46343AFIA89': [],
    '3FE46343AFIA94': [],
  };
  return permissions;
};

nokiaModel.convertWifiMode = function(mode) {
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

nokiaModel.convertField = function(
  masterKey, key, value, typeFunc, modeFunc, bandFunc,
) {
  let fullKey = masterKey + '-' + key;
  if (fullKey === 'wifi2-enable' || fullKey === 'wifi5-enable') {
    let result = {value: null, type: nokiaModel.getFieldType(masterKey, key)};
    result.value = (value > 0) ? 'TRUE' : 'FALSE';
    return result;
  }
  return basicCPEModel.convertField(
    masterKey, key, value, typeFunc, modeFunc, bandFunc,
  );
};

nokiaModel.getBeaconType = function() {
  return 'WPA/WPA2';
};

nokiaModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

nokiaModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_username = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CMCC_TeleComAccount.Username';
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CMCC_TeleComAccount.Password';
  fields.wifi2.password = fields.wifi2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.wifi5.password = fields.wifi5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.mesh2.password = fields.mesh2.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.mesh5.password = fields.mesh5.password.replace(
    /KeyPassphrase/g, 'PreSharedKey.1.KeyPassphrase',
  );
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CMCC_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_CMCC_GponInterfaceConfig.TXPower';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.X_CMCC_VLANIDMark';
  fields.wan.mtu = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.InterfaceMtu';
  fields.wan.mtu_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.InterfaceMtu';
  return fields;
};

module.exports = nokiaModel;
