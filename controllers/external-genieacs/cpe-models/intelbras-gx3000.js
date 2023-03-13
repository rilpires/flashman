const basicCPEModel = require('./base-model');

let flashifyModel = Object.assign({}, basicCPEModel);

flashifyModel.identifier = {vendor: 'Intelbras', model: 'GX3000'};

flashifyModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.customAppPassword = false;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = false;
  permissions.features.portForward = false; // TODO Manual Review
  permissions.features.stun = true;
  permissions.firmwareUpgrades = {
    'FG10_CPE_V02.02.03': [],
  };
  permissions.lan.configWrite = false; // TODO Manual Review
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.sendDnsOnLANChange = false; // TODO Manual Review
  permissions.lan.sendRoutersOnLANChange = false; // TODO Manual Review
  permissions.wan.allowReadWanMtu = false;
  permissions.wan.allowEditWanMtu = false;
  permissions.wan.allowReadWanVlan = false;
  permissions.wan.allowEditWanVlan = false;
  permissions.wan.pingTestSingleAttempt = true;
  permissions.wan.portForwardQueueTasks = false; // TODO Review
  permissions.wan.dhcpUptime = false;
// TODO: this model does not have a valid PPPoE uptime, must implement flag!
  permissions.wan.hasUptimeField = false;
  permissions.wifi.list5ghzChannels = 36, 40, 44, 48, 149, 153, 157, 161, 165;
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.axWiFiMode = true;
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.modeRead = false;
  permissions.wifi.modeWrite = false;
  permissions.useLastIndexOnWildcard = true;
  permissions.needInterfaceInPortFoward = true;
  return permissions;
};

flashifyModel.getFieldType = function(masterKey, key) {
  // TODO: must test Wi-Fi 2.4GHz Auto!
  // TODO: must test Wi-Fi 5GHz Auto!
  // TODO: must test Wi-Fi 2.4GHz Mode!
  // TODO: must test Wi-Fi 5GHz Mode!
  // TODO: must test WAN IPoE VLAN!
  // TODO: must test WAN PPPoE VLAN!
  return basicCPEModel.getFieldType(masterKey, key);
};

flashifyModel.convertWifiMode = function(mode, is5ghz=false) {
  // TODO: check manually
};

flashifyModel.convertWifiBand = function(band, is5ghz=false) {
  switch (band) {
    case 'HT20':
    case 'VHT20':
      return '20MHz';
    case 'HT40':
    case 'VHT40':
      return '40MHz';
    case 'VHT80':
      return '80MHz';
    case 'auto':
      return '40MHz';
    default:
      return undefined;
  }
};
flashifyModel.convertWifiBandToFlashman = function(band, isAC) {
  switch (band) {
    case '20MHz':
      return (isAC) ? 'VHT20' : 'HT20';
    case '40MHz':
      return (isAC) ? 'VHT40' : 'HT40';
    case '80MHz':
      return (isAC) ? 'VHT80' : undefined;
    default:
      return undefined;
  }
};
flashifyModel.getBeaconType = function() {
  // TODO: check manually
};

flashifyModel.getWPAEncryptionMode = function() {
  // TODO: check manually
};

flashifyModel.getIeeeEncryptionMode = function() {
  // TODO: check manually
};

flashifyModel.convertGenieSerial = function(serial, mac) {
  // TODO: check manually
};

flashifyModel.convertToDbm = function(power) {
  // TODO: check manually
};

flashifyModel.convertChannelToTask = function(channel, fields, masterKey) {
  // TODO: must test channel and auto channel substeps!
};

flashifyModel.convertPingTestResult = function(latency) {
  return latency.toString();
};

flashifyModel.convertSpeedValueFullLoad = function(period, bytesRec) {
  // TODO: check manually
};

flashifyModel.convertLanEditToTask = function(device, fields, permissions) {
  // TODO: check manually
};

flashifyModel.useModelAlias = function(fwVersion) {
  // TODO: check manually
};

flashifyModel.convertWifiRate = function(rate) {
  // TODO: check manually
};

flashifyModel.convertCableRate = function(rate) {
  // TODO: check manually
};

flashifyModel.isDeviceConnectedViaWifi = function(
  layer2iface, wifi2iface, wifi5iface,
) {
  if (layer2iface === 'Wi-Fi') {
    return 'wifi';
  }
  return 'cable';
};

flashifyModel.convertPPPoEEnable = function(value) {
  // TODO: check manually
};

flashifyModel.assocFieldWildcardReplacer = function(assocDevicesKey,
                                                    ifaceIndex) {
  return assocDevicesKey.replace(
    /AccessPoint.[0-9*]+./g,
    'AccessPoint.' + ifaceIndex + '.',
  );
};

flashifyModel.getAssociatedInterfaces = function(fields) {
  // TODO: must complete all Wi-Fi substeps!
};

flashifyModel.convertRssiValue = function(rssiValue) {
  // TODO: check manually
};

flashifyModel.getPortForwardRuleName = function(index) {
  // TODO: must test Port forward test!
};

flashifyModel.readTracerouteRTTs = function(genieHopRoot) {
  // TODO: check manually
};

flashifyModel.getModelFields = function() {
  let fields = flashifyModel.getModelFields();

  // ---------- FIELDS NOT SUPPORTED BY FLASHIFY ----------
  // TODO: check fields.common.hw_version
  // TODO: check fields.common.alt_uid
  // TODO: check fields.devices.hosts

  // ---------- FIELDS SUPPORTED BY FLASHIFY ----------
  fields.common.mac = 'Device.Ethernet.Interface.*.MACAddress';
  fields.wan.duplex = 'Device.Ethernet.Interface.*.DuplexMode';
  fields.wan.rate = 'Device.Ethernet.Interface.*.MaxBitRate';
  fields.wan.recv_bytes = 'Device.IP.Interface.*.Stats.BytesReceived';
  fields.wan.sent_bytes = 'Device.IP.Interface.*.Stats.BytesSent';
  fields.wan.pppoe_enable = 'Device.PPP.Interface.*.Enable';
  fields.wan.pppoe_user = 'Device.PPP.Interface.*.Username';
  fields.wan.pppoe_pass = 'Device.PPP.Interface.*.Password';
  fields.wan.wan_ip_ppp = 'Device.IP.Interface.*.IPv4Address.1.IPAddress';
  fields.wan.wan_ip = 'Device.IP.Interface.*.IPv4Address.1.IPAddress';
  // TODO: check fields.wan.vlan_ppp
  // TODO: check fields.wan.vlan
  fields.wan.port_mapping_entries_dhcp =
    'Device.NAT.PortMappingNumberOfEntries';
  fields.wan.port_mapping_entries_ppp =
    'Device.NAT.PortMappingNumberOfEntries';
  fields.port_mapping_dhcp = 'Device.NAT.PortMapping';
  fields.port_mapping_ppp = 'Device.NAT.PortMapping';
  fields.lan.ip_routers = 'Device.DHCPv4.Server.Pool.1.IPRouters';
  fields.lan.lease_max_ip = 'Device.DHCPv4.Server.Pool.1.MaxAddress';
  fields.lan.lease_min_ip = 'Device.DHCPv4.Server.Pool.1.MinAddress';
  fields.lan.router_ip = 'Device.IP.Interface.*.IPv4Address.1.IPAddress';
  fields.lan.subnet_mask = 'Device.DHCPv4.Server.Pool.1.SubnetMask';
  fields.wifi2.password = 'Device.WiFi.AccessPoint.1.Security.KeyPassphrase';
  // TODO: check fields.wifi2.auto
  fields.wifi2.enable = 'Device.WiFi.SSID.1.Enable';
  fields.wifi2.ssid = 'Device.WiFi.SSID.1.SSID';
  fields.wifi2.band = 'Device.WiFi.Radio.1.OperatingChannelBandwidth';
  // TODO: check fields.wifi2.mode
  fields.wifi2.channel = 'Device.WiFi.Radio.1.Channel';
  fields.wifi5.password = 'Device.WiFi.AccessPoint.3.Security.KeyPassphrase';
  // TODO: check fields.wifi5.auto
  fields.wifi5.enable = 'Device.WiFi.SSID.3.Enable';
  fields.wifi5.ssid = 'Device.WiFi.SSID.3.SSID';
  fields.wifi5.band = 'Device.WiFi.Radio.2.OperatingChannelBandwidth';
  // TODO: check fields.wifi5.mode
  fields.wifi5.channel = 'Device.WiFi.Radio.2.Channel';
  fields.devices.hosts_template = 'Device.DeviceInfo.Hosts.Host';
  fields.devices.host_mac = 'Device.DeviceInfo.Hosts.Host.*.PhysAddress';
  fields.devices.host_active = 'Device.DeviceInfo.Hosts.Host.*.Active';
  fields.devices.host_layer2 = 'Device.DeviceInfo.Hosts.Host.*.InterfaceType';
  fields.devices.host_ip = 'Device.DeviceInfo.Hosts.Host.*.IPAddress';
  fields.devices.host_name = 'Device.DeviceInfo.Hosts.Host.*.HostName';
  fields.devices.associated = 'Device.WiFi.AccessPoint.1.AssociatedDevice';
  fields.diagnostics.ping.root = 'Device.IP.Diagnostics.IPPing';
  fields.diagnostics.ping.diag_state =
    'Device.IP.Diagnostics.IPPing.DiagnosticsState';
  fields.diagnostics.ping.host =
    'Device.IP.Diagnostics.IPPing.Host';
  fields.diagnostics.ping.interface = 'Device.IP.Diagnostics.IPPing.Interface';
  fields.diagnostics.ping.num_of_rep =
    'Device.IP.Diagnostics.IPPing.NumberOfRepetitions';
  fields.diagnostics.ping.timeout = 'Device.IP.Diagnostics.IPPing.Timeout';
  fields.diagnostics.ping.success_count =
    'Device.IP.Diagnostics.IPPing.SuccessCount';
  fields.diagnostics.ping.failure_count =
    'Device.IP.Diagnostics.IPPing.FailureCount';
  fields.diagnostics.ping.avg_resp_time =
    'Device.IP.Diagnostics.IPPing.AverageResponseTime';
  fields.diagnostics.ping.min_resp_time =
    'Device.IP.Diagnostics.IPPing.MinimumResponseTime';
  fields.diagnostics.ping.max_resp_time =
    'Device.IP.Diagnostics.IPPing.MaximumResponseTime';
  return fields;
};

flashifyModel.applyVersionDifferences = function(base, fwVersion, hwVersion) {
  // TODO: check manually
};

module.exports = flashifyModel;

