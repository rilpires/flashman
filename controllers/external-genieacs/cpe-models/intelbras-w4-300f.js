const basicCPEModel = require('./base-model');

let intelbrasModel = Object.assign({}, basicCPEModel);

intelbrasModel.identifier = {vendor: 'Intelbras', model: 'W4-300F'};

intelbrasModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.speedTest = true;
  permissions.features.stun = true;
  permissions.features.upnp = false;
  permissions.features.wps = false;

  permissions.lan.configWrite = false;
  permissions.lan.dnsServersLimit = 2;

  permissions.wan.dhcpUptime = true;
// TODO: this model does not have a valid PPPoE uptime, must implement flag!
  permissions.wan.hasUptimeField = true;
  permissions.wan.canTrustWanRate = false;
  permissions.wan.speedTestLimit = 100;

  permissions.wifi.dualBand = false;
  permissions.wifi.modeWrite = false;
  permissions.wifi.bandRead2 = false;
  permissions.wifi.bandRead5 = false;
  permissions.wifi.bandWrite2 = false;
  permissions.wifi.bandWrite5 = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.firmwareUpgrades = {
    '1.23.7': [],
  };
  return permissions;
};

intelbrasModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return 'b,g';
    case '11n':
      return 'b,g,n';
    case '11na':
    case '11ac':
    case '11ax':
    default:
      return '';
  }
};

intelbrasModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields.common.alt_uid = fields.common.mac;
  fields.common.model = 'InternetGatewayDevice.DeviceInfo.ProductClass';
  fields.common.web_admin_username = 'InternetGatewayDevice.UserInterface.' +
    'X_ITBS_Username';
  fields.common.web_admin_password = 'InternetGatewayDevice.UserInterface.' +
    'X_ITBS_UserPassword';
  fields.common.stun_enable =
    'InternetGatewayDevice.ManagementServer.STUNEnable';
  fields.common.stun_udp_conn_req_addr =
    'InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress';

  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_values.protocol[1] = 'TCPandUDP';

  // WAN MAC address
  fields.wan.wan_mac =
    'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.MACAddress';
  fields.wan.wan_mac_ppp =
    'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.MACAddress';

  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';

  fields.devices.host_layer2 =
    'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.InterfaceType';
  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.WiFi.' +
    'NeighboringWiFiDiagnostic';
  fields.diagnostics.sitesurvey.diag_state = 'InternetGatewayDevice.WiFi.' +
    'X_ITBS_NeighboringWiFiDiagnosticState';

  return fields;
};

module.exports = intelbrasModel;
