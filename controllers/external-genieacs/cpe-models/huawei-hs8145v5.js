const basicCPEModel = require('./base-model');

let huaweiModel = Object.assign({}, basicCPEModel);

huaweiModel.identifier = {vendor: 'Huawei', model: 'HS8145V5'};

huaweiModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  return permissions;
};

huaweiModel.getModelFields = function() {
  let fields = huaweiModel.getModelFields();

  // ---------- FIELDS NOT SUPPORTED BY FLASHIFY ----------
  // TODO: check fields.common.hw_version
  // TODO: check fields.common.alt_uid
  // TODO: check fields.wan.pon_rxpower_epon
  // TODO: check fields.wan.pon_txpower_epon
  // TODO: check fields.devices.hosts

  // ---------- FIELDS SUPPORTED BY FLASHIFY ----------
  fields.common.web_admin_username = 'InternetGatewayDevice.DeviceInfo.VendorLogFile.1.Name'
  fields.common.web_admin_password = 'InternetGatewayDevice.UserInterface.X_HW_WebUserInfo.2.Password'
  fields.wan.rate = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.Layer1DownstreamMaxBitRate'
  fields.wan.pon_rxpower = 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower'
  fields.wan.pon_txpower = 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.TXPower'
  fields.wan.recv_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesReceived'
  fields.wan.sent_bytes = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.TotalBytesSent'
  // TODO: check fields.wan.pppoe_enable
  // TODO: check fields.wan.mtu
  // TODO: check fields.wan.wan_ip
  // TODO: check fields.wan.uptime
  fields.wan.vlan_ppp = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_HW_VLAN'
  // TODO: check fields.wan.vlan
  fields.wifi2.password = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase'
  fields.wifi2.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_HW_HT20'
  fields.wifi5.password = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase'
  fields.wifi5.band = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.X_HW_HT20'
  fields.devices.host_layer2 = 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.InterfaceType'
  fields.devices.host_rssi = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice.1.X_HW_RSSI'
  fields.devices.snr = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice.1.X_HW_SNR'
  fields.devices.host_rate = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice.1.X_HW_TxRate'
  // TODO: check fields.devices.host_mode
  // TODO: check fields.devices.host_band
  // TODO: check fields.diagnostics.speedtest.bgn_time
  // TODO: check fields.diagnostics.speedtest.end_time
  // TODO: check fields.diagnostics.speedtest.test_bytes_rec
  // TODO: check fields.diagnostics.speedtest.full_load_bytes_rec
  // TODO: check fields.diagnostics.speedtest.full_load_period
  fields.diagnostics.sitesurvey.root = 'InternetGatewayDevice.LANDevice.1.WiFi'
  fields.diagnostics.sitesurvey.diag_state = 'DiagnosticsState'
  fields.diagnostics.sitesurvey.result = 'Result'
  fields.diagnostics.sitesurvey.signal = 'SignalStrength'
  fields.diagnostics.sitesurvey.mode = 'OperatingStandards'
  fields.diagnostics.traceroute.root = 'InternetGatewayDevice.TraceRouteDiagnostics'
  return fields;
};

module.exports = huaweiModel;
