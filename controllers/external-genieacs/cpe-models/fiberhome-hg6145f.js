const basicCPEModel = require('./base-model');

let fiberhomeModel = Object.assign({}, basicCPEModel);

fiberhomeModel.identifier = {vendor: 'Fiberhome', model: 'HG6145F'};

fiberhomeModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.meshWifi = true;
  permissions.features.traceroute = true;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.portForward = true;
  permissions.traceroute.maxProbesPerHop = 1;
  permissions.traceroute.hopCountExceededState = 'Error_CannotResolveHostName';
  permissions.traceroute.protocol = 'ICMP';
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.pingTestSetInterface = true;
  permissions.wan.traceRouteSetInterface = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymRanges;
  permissions.wifi.axWiFiMode = true;
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64,
    100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144,
    149, 153, 157, 161,
  ];
  permissions.wifi.bandRead2 = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.modeRead = true;
  permissions.wifi.modeWrite = true;
  permissions.firmwareUpgrades = {
    'RP2930': [],
  };
  return permissions;
};

fiberhomeModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'bg';
    case '11n':
      return 'bgn';
    case '11na':
      return 'an';
    case '11ac':
      return 'a,n,ac';
    case '11ax':
      return 'ax';
    default:
      return '';
  }
};

fiberhomeModel.getBeaconType = function() {
  return '11i';
};

fiberhomeModel.convertToDbm = function(power) {
  return parseFloat(power).toFixed(3);
};

fiberhomeModel.convertChannelToTask = function(channel, fields, masterKey) {
  if (channel === 'auto') {
    channel = '0';
  }
  let values = [];
  const parsedChannel = parseInt(channel);
  values.push([
    fields[masterKey]['channel'], parsedChannel, 'xsd:unsignedInt',
  ]);
  return values;
};

fiberhomeModel.convertWifiRate = function(rate) {
  return parseInt(rate) / 1000;
};

fiberhomeModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.web_admin_username = 'InternetGatewayDevice.DeviceInfo.' +
    'X_FH_Account.X_FH_WebUserInfo.WebSuperUsername';
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.' +
    'X_FH_Account.X_FH_WebUserInfo.WebSuperPassword';
  fields.wan.recv_bytes = fields.wan.recv_bytes.replace(
    /WANEthernetInterfaceConfig/g, 'X_FH_GponInterfaceConfig',
  );
  fields.wan.sent_bytes = fields.wan.sent_bytes.replace(
    /WANEthernetInterfaceConfig/g, 'X_FH_GponInterfaceConfig',
  );
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.'+
  'WANConnectionDevice.*.WANIPConnection.*.VLANID';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.'+
  'WANConnectionDevice.*.WANPPPConnection.*.VLANID';
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.AssociatedDeviceRSSI';
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.' +
    'WLANConfiguration.*.AssociatedDevice.*.AssociatedDeviceTxRate';
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_FH_GponInterfaceConfig.RXPower';
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.' +
    'X_FH_GponInterfaceConfig.TXPower';
  fields.port_mapping_values.protocol[1] = 'TCP/UDP';
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
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
  return fields;
};

module.exports = fiberhomeModel;
