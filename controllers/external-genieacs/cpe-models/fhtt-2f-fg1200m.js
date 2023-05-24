const basicCPEModel = require('./base-model');

let fhttModel = Object.assign({}, basicCPEModel);

fhttModel.identifier = {vendor: 'FHTT', model: '2F-FG1200M'};

fhttModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  return permissions;
};

fhttModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();

  // ---------- FIELDS NOT SUPPORTED BY FLASHIFY ----------
  // TODO: check fields.common.hw_version
  // TODO: check fields.common.alt_uid
  // TODO: check fields.wan.pon_rxpower_epon
  // TODO: check fields.wan.pon_txpower_epon

  // ---------- FIELDS SUPPORTED BY FLASHIFY ----------
  fields.common.web_admin_username = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CT-COM_ServiceManage.FtpUserName';
  fields.common.web_admin_password = 'InternetGatewayDevice.DeviceInfo.' +
    'X_CT-COM_TeleComAccount.Password';
  fields.wan.rate = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.Layer1DownstreamMaxBitRate';
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesReceived';
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.' +
    'WANCommonInterfaceConfig.TotalBytesSent';
  fields.wan.pppoe_user = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.Username';
  fields.wan.pppoe_pass = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.Password';
  fields.wan.mtu_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.MaxMRUSize';
  fields.wan.wan_ip_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.ExternalIPAddress';
  fields.wan.uptime_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANPPPConnection.*.Uptime';
  fields.wan.wan_ip = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.WANIPConnection.*.ExternalIPAddress';
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  fields.wan.vlan = 'InternetGatewayDevice.WANDevice.1.' +
    'WANConnectionDevice.*.X_CT-COM_WANGponLinkConfig.VLANIDMark';
  delete fields.port_mapping_fields.external_port_end;
  delete fields.port_mapping_fields.internal_port_end;
  fields.lan.subnet_mask = 'InternetGatewayDevice.LANDevice.1.' +
    'LANHostConfigManagement.SubnetMask';
  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.' +
    'Hosts.Host.*.InterfaceType';
  fields.diagnostics.traceroute.root = 'InternetGatewayDevice.' +
    'X_CT-COM_IPTraceRouteDiagnostics';
  fields.diagnostics.traceroute.number_of_hops = 'HopsNumberOfEntries';
  fields.diagnostics.traceroute.protocol = 'Mode';
  fields.diagnostics.traceroute.ip_version = 'Mode';
  fields.diagnostics.traceroute.hops_root = 'Hops';
  fields.diagnostics.traceroute.hop_host = 'ResponseIPAddress';
  fields.diagnostics.traceroute.hop_ip_address = 'ResponseIPAddress';
  return fields;
};

module.exports = fhttModel;
