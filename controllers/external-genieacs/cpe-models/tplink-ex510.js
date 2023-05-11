const basicCPEModel = require('./base-model');

let tplinkModel = Object.assign({}, basicCPEModel);

tplinkModel.identifier = {vendor: 'TP-Link', model: 'EX510'};

tplinkModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.pingTest = true;
  permissions.features.portForward = true;
  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noAsymNoRanges;
  permissions.features.siteSurvey = true;
  permissions.features.speedTest = true;
  permissions.features.traceroute = true;
  permissions.features.stun = true;
  permissions.traceroute.hopCountExceededState = 'Completed';
  permissions.features.upnp = false;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.dnsServersWrite = false;
  permissions.lan.sendRoutersOnLANChange = false;
  permissions.wan.speedTestLimit = 900;
  permissions.wan.hasUptimeField = false;
  permissions.siteSurvey.survey2Index = '1';
  permissions.siteSurvey.survey5Index = '3';
  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 100,
    104, 108, 112, 116, 120, 124, 128,
  ];
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.axWiFiMode = true;
  permissions.traceroute.maxProbesPerHop = 1;
  permissions.traceroute.protocol = 'ICMP';
  permissions.useLastIndexOnWildcard = true;
  permissions.needInterfaceInPortFoward = true;
  permissions.isTR181 = true;
  permissions.firmwareUpgrades = {
    'Datecode2203270436': [],
  };
  return permissions;
};

tplinkModel.convertWifiMode = function(mode, is5ghz=false) {
  switch (mode) {
    case '11g':
    case '11n':
      return 'b,g,n';
    case '11na':
    case '11ac':
      return 'a,n,ac';
    case '11ax':
      return (is5ghz) ? 'a,n,ac,ax' : 'b,g,n,ax';
    default:
      return '';
  }
};

tplinkModel.convertWifiBand = function(band, is5ghz=false) {
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
      return 'Auto';
    default:
      return '';
  }
};

tplinkModel.convertRssiValue = function(rssiValue) {
  let result = basicCPEModel.convertRssiValue(rssiValue);
  // This model sends RSSI as some mystical formula, according to TP-Link
  return (result / 2) - 110;
};

tplinkModel.assocFieldWildcardReplacer = function(assocFieldKey, ifaceIndex) {
  return assocFieldKey.replace(
    /Radio\.[0-9*]+\./g,
    'Radio.' + ifaceIndex + '.',
  );
};

tplinkModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields = basicCPEModel.convertIGDtoDevice(fields);
  // Common
  fields.common.mac = 'Device.Ethernet.Interface.2.MACAddress';
  fields.common.stun_enable = 'Device.ManagementServer.STUNEnable';
  fields.common.stun_udp_conn_req_addr =
    'Device.ManagementServer.UDPConnectionRequestAddress';
  fields.common.web_admin_password = 'Device.Users.User.2.Password';
  // Wan
  fields.wan.dhcp_status = 'Device.IP.Interface.*.Status';
  fields.wan.dhcp_enable = 'Device.IP.Interface.*.Enable';
  fields.wan.pppoe_status = 'Device.PPP.Interface.*.Status';
  fields.wan.pppoe_enable = 'Device.PPP.Interface.*.Enable';
  fields.wan.pppoe_user = 'Device.PPP.Interface.*.Username';
  fields.wan.pppoe_pass = 'Device.PPP.Interface.*.Password';
  fields.wan.rate = 'Device.Ethernet.Interface.*.MaxBitRate';
  fields.wan.duplex = 'Device.Ethernet.Interface.*.DuplexMode';
  fields.wan.wan_ip = 'Device.IP.Interface.*.IPv4Address.1.IPAddress';
  fields.wan.wan_ip_ppp = 'Device.IP.Interface.*.IPv4Address.1.IPAddress';
  fields.wan.mtu_ppp = 'Device.IP.Interface.*.MaxMTUSize';
  fields.wan.mtu = 'Device.IP.Interface.*.MaxMTUSize';
  fields.wan.recv_bytes = 'Device.IP.Interface.*.Stats.BytesReceived';
  fields.wan.sent_bytes = 'Device.IP.Interface.*.Stats.BytesSent';
  delete fields.wan.uptime;
  delete fields.wan.uptime_ppp;
  fields.wan.pppoe_root = 'Device.PPP';
  fields.wan.dhcp_root = 'Device.IP';
  fields.wan.nat_root = 'Device.NAT';
  fields.wan.port_mapping = 'Device.NAT.PortMapping';
  fields.wan.link_root = 'Device.Ethernet.Link';
  fields.wan.vlan_termination_root = 'Device.Ethernet.VLANTermination';
  // Port Mapping
  fields.wan.port_mapping_entries_dhcp =
    'Device.NAT.PortMappingNumberOfEntries';
  fields.wan.port_mapping_entries_ppp =
    'Device.NAT.PortMappingNumberOfEntries';
  fields.port_mapping_dhcp = 'Device.NAT.PortMapping';
  fields.port_mapping_ppp = 'Device.NAT.PortMapping';
  fields.port_mapping_values.enable[0] = 'Enable';
  fields.port_mapping_values.protocol[0] = 'Protocol';
  fields.port_mapping_values.protocol[1] = 'TCP or UDP';
  fields.port_mapping_values.description[0] = 'Alias';
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_fields_interface_root = 'Device.IP.Interface';
  fields.port_mapping_fields_interface_key =
    'Device.NAT.PortMapping.1.Interface';
  // Lan
  fields.lan.router_ip = 'Device.IP.Interface.1.IPv4Address.1.IPAddress';
  fields.lan.subnet_mask = 'Device.DHCPv4.Server.Pool.1.SubnetMask';
  fields.lan.lease_min_ip = 'Device.DHCPv4.Server.Pool.1.MinAddress';
  fields.lan.lease_max_ip = 'Device.DHCPv4.Server.Pool.1.MaxAddress';
  fields.lan.ip_routers = 'Device.DHCPv4.Server.Pool.1.IPRouters';
  fields.lan.dns_servers = 'Device.DHCPv4.Server.Pool.1.DNSServers';
  // Wifi
  fields.wifi2.ssid = 'Device.WiFi.SSID.1.SSID';
  fields.wifi2.bssid = 'Device.WiFi.SSID.1.BSSID';
  fields.wifi2.password = 'Device.WiFi.AccessPoint.1.Security.KeyPassphrase';
  fields.wifi2.channel = 'Device.WiFi.Radio.1.Channel';
  fields.wifi2.auto = 'Device.WiFi.Radio.1.AutoChannelEnable';
  fields.wifi2.mode = 'Device.WiFi.Radio.1.OperatingStandards';
  fields.wifi2.enable = 'Device.WiFi.SSID.1.Enable';
  fields.wifi2.band = 'Device.WiFi.Radio.1.OperatingChannelBandwidth';
  delete fields.wifi2.beacon_type;
  fields.wifi5.ssid = 'Device.WiFi.SSID.3.SSID';
  fields.wifi5.bssid = 'Device.WiFi.SSID.3.BSSID';
  fields.wifi5.password = 'Device.WiFi.AccessPoint.1.Security.KeyPassphrase';
  fields.wifi5.channel = 'Device.WiFi.Radio.2.Channel';
  fields.wifi5.auto = 'Device.WiFi.Radio.1.AutoChannelEnable';
  fields.wifi5.mode = 'Device.WiFi.Radio.2.OperatingStandards';
  fields.wifi5.enable = 'Device.WiFi.SSID.3.Enable';
  fields.wifi5.band = 'Device.WiFi.Radio.2.OperatingChannelBandwidth';
  delete fields.wifi5.beacon_type;
  // Mesh
  fields.mesh2 = {};
  fields.mesh5 = {};
  // Devices
  fields.devices.hosts = 'Device.Hosts';
  fields.devices.hosts_template = 'Device.Hosts.Host';
  fields.devices.host_mac = 'Device.Hosts.Host.*.PhysAddress';
  fields.devices.host_name = 'Device.Hosts.Host.*.HostName';
  fields.devices.host_ip = 'Device.Hosts.Host.*.IPAddress';
  fields.devices.associated = 'Device.WiFi.MultiAP.APDevice.1.Radio.*.AP.2.' +
    'AssociatedDevice';
  fields.devices.assoc_mac = 'Device.WiFi.MultiAP.APDevice.1.Radio.*.AP.2.' +
    'AssociatedDevice.*.MACAddress';
  fields.devices.host_active = 'Device.Hosts.Host.*.Active';
  fields.devices.host_rssi = 'Device.WiFi.MultiAP.APDevice.1.Radio.*.AP.2.' +
    'AssociatedDevice.*.SignalStrength';
  // Ping
  Object.keys(fields.diagnostics.ping).forEach((k) => {
    fields.diagnostics.ping[k] = fields.diagnostics.ping[k].replace(
      'IPPingDiagnostics', 'IP.Diagnostics.IPPing');
  });
  // Speedtest
  Object.keys(fields.diagnostics.speedtest).forEach((k) => {
    fields.diagnostics.speedtest[k] = fields.diagnostics.speedtest[k].replace(
      'DownloadDiagnostics', 'IP.Diagnostics.DownloadDiagnostics');
  });
  // Traceroute
  fields.diagnostics.traceroute.root = 'Device.IP.Diagnostics.TraceRoute';
  fields.diagnostics.traceroute.hop_host = 'Host';
  fields.diagnostics.traceroute.hop_ip_address = 'HostAddress';
  fields.diagnostics.traceroute.hop_error_code = 'ErrorCode';
  fields.diagnostics.traceroute.hop_rtt_times = 'RTTimes';
  delete fields.diagnostics.speedtest.full_load_bytes_rec;
  delete fields.diagnostics.speedtest.full_load_period;
  // Sitesurvey
  fields.diagnostics.sitesurvey.root = 'Device.WiFi.'+
    'NeighboringWiFiDiagnostic';
  fields.diagnostics.sitesurvey.signal = 'SignalStrength';
  return fields;
};

module.exports = tplinkModel;
