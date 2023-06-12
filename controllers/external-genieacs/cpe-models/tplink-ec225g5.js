const basicCPEModel = require('./base-model');

let tplinkModel = Object.assign({}, basicCPEModel);

tplinkModel.identifier = {vendor: 'TP-Link', model: 'EC225-G5'};

tplinkModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.traceroute = true;
  permissions.features.siteSurvey = true;
  permissions.features.speedTest = true;
  permissions.features.pingTest = true;
  permissions.features.stun = true;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.sendRoutersOnLANChange = false;
  permissions.lan.dnsServersWrite = false;
  permissions.wan.hasUptimeField = false;
  permissions.wan.speedTestLimit = 200;
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48, 149, 157, 161, 165];
  permissions.wifi.allowDiacritics = true;
  permissions.siteSurvey.survey2Index = '1';
  permissions.siteSurvey.survey5Index = '3';
  permissions.useLastIndexOnWildcard = true;
  permissions.needInterfaceInPortFoward = true;
  permissions.isTR181 = true;
  permissions.firmwareUpgrades = {
    '1.12.0 Build 220622 Rel.38016n(4252)': [],
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

tplinkModel.getAssociatedInterfaces = function(fields) {
  return {
    iface2: fields.wifi2.password.replace(
      /AccessPoint\.([^.]*)\..*/, 'AccessPoint.$1',
    ),
    iface5: fields.wifi5.password.replace(
      /AccessPoint\.([^.]*)\..*/, 'AccessPoint.$1',
    ),
  };
};

tplinkModel.assocFieldWildcardReplacer = function(assocFieldKey, ifaceIndex) {
  return assocFieldKey.replace(
    /AccessPoint\.[0-9*]+\./g,
    'AccessPoint.' + ifaceIndex + '.',
  );
};

tplinkModel.convertSpeedValueFullLoad = function(period, bytesRec) {
  // 8 => byte to bit
  // 1024**2 => bit to megabit
  return (8/(1024**2)) * (bytesRec/period);
};

tplinkModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields = basicCPEModel.convertIGDtoDevice(fields);
  // Common
  fields.common.mac = 'Device.Ethernet.Link.1.MACAddress';
  fields.common.stun_enable = 'Device.ManagementServer.STUNEnable';
  fields.common.stun_udp_conn_req_addr =
    'Device.ManagementServer.UDPConnectionRequestAddress';
  // Wan
  fields.wan.dhcp_status = 'Device.IP.Interface.*.Status';
  fields.wan.dhcp_enable = 'Device.IP.Interface.*.Enable';
  fields.wan.pppoe_status = 'Device.PPP.Interface.*.Status';
  fields.wan.pppoe_enable = 'Device.PPP.Interface.*.Enable';
  fields.wan.pppoe_user = 'Device.PPP.Interface.*.Username';
  fields.wan.pppoe_pass = 'Device.PPP.Interface.*.Password';
  fields.wan.duplex = 'Device.Ethernet.Interface.*.DuplexMode';
  fields.wan.rate = 'Device.Ethernet.Interface.*.MaxBitRate';
  fields.wan.wan_ip = 'Device.IP.Interface.*.IPv4Address.1.IPAddress';
  fields.wan.wan_ip_ppp = fields.wan.wan_ip;
  fields.wan.wan_mac = 'Device.Ethernet.Interface.*.MACAddress';
  fields.wan.wan_mac_ppp = fields.wan.wan_mac;
  delete fields.wan.uptime;
  delete fields.wan.uptime_ppp;
  fields.wan.mtu = 'Device.IP.Interface.*.MaxMTUSize';
  fields.wan.mtu_ppp = fields.wan.mtu;
  fields.wan.recv_bytes = 'Device.IP.Interface.*.Stats.BytesReceived';
  fields.wan.sent_bytes = 'Device.IP.Interface.*.Stats.BytesSent';
  fields.wan.pppoe_root = 'Device.PPP';
  fields.wan.dhcp_root = 'Device.IP';
  fields.wan.nat_root = 'Device.NAT';
  fields.wan.port_mapping = 'Device.NAT.PortMapping';
  fields.wan.link_root = 'Device.Ethernet.Link';
  fields.wan.vlan_termination_root = 'Device.Ethernet.VLANTermination';

  fields.wan.vlan_ppp = 'Device.Ethernet.VLANTermination.*.VLANID';
  fields.wan.vlan = 'Device.Ethernet.VLANTermination.*.VLANID';

  // Lan
  fields.lan.dns_servers = 'Device.DHCPv4.Server.Pool.1.DNSServers';
  fields.lan.lease_max_ip = 'Device.DHCPv4.Server.Pool.1.MaxAddress';
  fields.lan.lease_min_ip = 'Device.DHCPv4.Server.Pool.1.MinAddress';
  fields.lan.router_ip = 'Device.IP.Interface.1.IPv4Address.1.IPAddress';
  fields.lan.subnet_mask = 'Device.DHCPv4.Server.Pool.1.SubnetMask';
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
  fields.wifi5.password = 'Device.WiFi.AccessPoint.3.Security.KeyPassphrase';
  fields.wifi5.channel = 'Device.WiFi.Radio.2.Channel';
  fields.wifi5.auto = 'Device.WiFi.Radio.2.AutoChannelEnable';
  fields.wifi5.mode = 'Device.WiFi.Radio.2.OperatingStandards';
  fields.wifi5.enable = 'Device.WiFi.SSID.3.Enable';
  fields.wifi5.band = 'Device.WiFi.Radio.2.OperatingChannelBandwidth';
  delete fields.wifi5.beacon_type;
  // Devices
  fields.devices.hosts = 'Device.Hosts';
  fields.devices.hosts_template = 'Device.Hosts.Host';
  fields.devices.host_mac = 'Device.Hosts.Host.*.PhysAddress';
  fields.devices.host_name = 'Device.Hosts.Host.*.HostName';
  fields.devices.host_ip = 'Device.Hosts.Host.*.IPAddress';
  fields.devices.associated = 'Device.WiFi.AccessPoint.*.AssociatedDevice';
  fields.devices.assoc_mac = 'Device.WiFi.AccessPoint.*.AssociatedDevice.*.MACAddress';
  fields.devices.host_rssi = 'Device.WiFi.AccessPoint.*.AssociatedDevice.*.SignalStrength';
  fields.devices.host_mode = 'Device.WiFi.AccessPoint.*.AssociatedDevice.*.Standard';
  fields.devices.host_band = 'Device.WiFi.AccessPoint.*.AssociatedDevice.*.Bandwidth';
  fields.devices.rate = 'Device.WiFi.AccessPoint.*.AssociatedDevice.*.LastDataDownlinkRate';
  // Mesh
  fields.mesh2 = {};
  fields.mesh5 = {};
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
  // Sitesurvey
  fields.diagnostics.sitesurvey.root = 'Device.WiFi.NeighboringWiFiDiagnostic';
  fields.diagnostics.sitesurvey.band = 'OperatingChannelBandwidth';
  fields.diagnostics.sitesurvey.signal = 'SignalStrength';
  return fields;
};

module.exports = tplinkModel;
