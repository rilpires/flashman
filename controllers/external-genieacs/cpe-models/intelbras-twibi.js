const basicCPEModel = require('./base-model');

let intelbrasModel = Object.assign({}, basicCPEModel);

intelbrasModel.identifier = {vendor: 'Intelbras', model: 'Twibi'};

intelbrasModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.speedTest = true;
  permissions.features.siteSurvey = false;
  permissions.features.stun = true;
  permissions.features.hasCPUUsage = true;
  permissions.features.hasMemoryUsage = true;

  permissions.lan.configWrite = false;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.dnsServersWrite = false;
  permissions.lan.sendRoutersOnLANChange = false;

  permissions.wan.allowReadWanMtu = false;
  permissions.wan.allowEditWanMtu = false;
  permissions.wan.speedTestLimit = 170;
  permissions.wan.dhcpUptime = true;
  permissions.wan.hasUptimeField = true;

  permissions.wifi.allowDiacritics = true;
  permissions.wifi.extended2GhzChannels = false;
  permissions.wifi.bandRead2 = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.modeWrite = false;

  permissions.traceroute.minProbesPerHop = 3;
  permissions.traceroute.maxProbesPerHop = 1;
  permissions.traceroute.protocol = 'ICMP';
  permissions.traceroute.hopCountExceededState = 'None';

  // firmware upgrade permissions
  permissions.firmwareUpgrades = {
    '1.0.8': [],
  };

  // flag for devices that stay online post reset
  return permissions;
};

intelbrasModel.getFieldType = function(masterKey, key) {
  // Necessary for InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable
  if (masterKey === 'wifi2' && key === 'enable') {
    return 'xsd:string';
  }
  // Necessary for InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable
  if (masterKey === 'wifi5' && key === 'enable') {
    return 'xsd:string';
  }
  // Necessary for InternetGatewayDevice.ManagementServer.PeriodicInformInterval
  if (masterKey === 'common' && key === 'interval') {
    return 'xsd:string';
  }
  // Necessary for InternetGatewayDevice.ManagementServer.STUNServerPort
  if (masterKey === 'stun' && key === 'port') {
    return 'xsd:string';
  }
  // Necessary for InternetGatewayDevice.ManagementServer.STUNEnable
  if (masterKey === 'common' && key === 'stun_enable') {
    return 'xsd:string';
  }
  return basicCPEModel.getFieldType(masterKey, key);
};

intelbrasModel.convertField = function(
  masterKey, key, value, typeFunc, modeFunc, bandFunc,
) {
  let fullKey = masterKey + '-' + key;
  if (fullKey === 'wifi2-enable' || fullKey === 'wifi5-enable') {
    let result =
      {value: null, type: intelbrasModel.getFieldType(masterKey, key)};
    result.value = (value > 0) ? '0' : '1';
    return result;
  }
  return basicCPEModel.convertField(
    masterKey, key, value, typeFunc, modeFunc, bandFunc,
  );
};

intelbrasModel.isDeviceConnectedViaWifi = function(
  layer2iface, wifi2iface, wifi5iface,
) {
  if (layer2iface === '802.11') {
    return 'wifi';
  }
  return 'cable';
};

intelbrasModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();

  fields.common.stun_enable = 'InternetGatewayDevice.ManagementServer.'+
    'STUNEnable';
  fields.common.stun_udp_conn_req_addr =
    'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';

  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.'+
    'WANCommonInterfaceConfig.TotalBytesSent';

  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.'+
    'Hosts.Host.*.InterfaceType';
  fields.diagnostics.traceroute.root =
    'InternetGatewayDevice.TraceRouteDiagnostics';
  fields.diagnostics.traceroute.hop_host = 'Host';

  return fields;
};

module.exports = intelbrasModel;

