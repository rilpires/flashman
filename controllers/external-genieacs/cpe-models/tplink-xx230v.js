const basicCPEModel = require('./base-model');

let tplinkModel = Object.assign({}, basicCPEModel);

tplinkModel.identifier = {vendor: 'TP-Link', model: 'XX230V'};

tplinkModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.features.portForward = true;
  permissions.features.pingTest = true;
  permissions.features.ponSignal = true;
  permissions.features.siteSurvey = true;
  // Router return speedtest error
  permissions.features.speedTest = false;
  permissions.features.traceroute = true;
  permissions.features.stun = false;
  permissions.features.hasIpv6Information = true;
  permissions.features.hasCPUUsage = true;
  permissions.features.hasMemoryUsage = true;
  permissions.features.macAccessControl = true;

  permissions.traceroute.hopCountExceededState = 'Completed';
  permissions.traceroute.protocol = 'ICMP';

  permissions.lan.blockLANDevices = true;
  permissions.lan.blockWiredLANDevices = true;
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.dnsServersLimit = 2;

  permissions.wan.portForwardPermissions =
    basicCPEModel.portForwardPermissions.noRanges;
  permissions.wan.hasUptimeField = false;
  permissions.wan.speedTestLimit = 900;
  permissions.wan.allowReadWanVlan = true;
  permissions.wan.allowEditWanVlan = true;
  permissions.wan.hasIpv4RemoteAddressField = true;
  permissions.wan.hasIpv4DefaultGatewayField = true;
  permissions.wan.hasDnsServerField = true;

  permissions.ipv6.hasAddressField = true;
  permissions.ipv6.hasDefaultGatewayField = true;
  permissions.ipv6.hasPrefixDelegationAddressField = true;
  permissions.ipv6.hasPrefixDelegationLocalAddressField = true;

  permissions.useLastIndexOnWildcard = true;
  permissions.needInterfaceInPortFoward = true;

  permissions.wifi.list5ghzChannels = [
    36, 40, 44, 48, 52, 56, 60, 64, 100,
    104, 108, 112, 116, 120, 124, 128, 132,
    136, 140, 144, 149, 153, 157, 161,
  ];
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.axWiFiMode = true;
  permissions.wifi.extended2GhzChannels = false;
  permissions.wifi.bandAuto2 = false;
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.modeWrite = false;
  permissions.isTR181 = true;
  permissions.firmwareUpgrades = {
    '0.6.0 3.0.0 v6066.0 Build 220630 Rel.56119n': [],
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

tplinkModel.convertToDbm = function(power) {
  return parseFloat((10 * Math.log10(power * 0.0001)).toFixed(3));
};

tplinkModel.assocFieldWildcardReplacer = function(assocFieldKey, ifaceIndex) {
  return assocFieldKey.replace(
    /Radio\.[0-9*]+\.AP\.[0-9*]+\./g,
    'Radio.' + ifaceIndex + '.AP.' + ifaceIndex + '.',
  );
};

tplinkModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields = basicCPEModel.convertIGDtoDevice(fields);
  // Common
  fields.common.mac = 'Device.Ethernet.Interface.1.MACAddress';
  fields.common.stun_enable = 'Device.ManagementServer.STUNEnable';
  fields.common.stun_udp_conn_req_addr =
    'Device.ManagementServer.UDPConnectionRequestAddress';
  fields.common.web_admin_password = 'Device.Users.User.2.Password';
  // Wan
  fields.wan.pon_rxpower =
    'Device.Optical.Interface.*.X_TP_GPON_Config.RXPower';
  fields.wan.pon_txpower =
    'Device.Optical.Interface.*.X_TP_GPON_Config.TXPower';
  fields.wan.dhcp_status = 'Device.IP.Interface.*.Status';
  fields.wan.dhcp_enable = 'Device.IP.Interface.*.Enable';
  fields.wan.pppoe_status = 'Device.PPP.Interface.*.Status';
  fields.wan.pppoe_enable = 'Device.PPP.Interface.*.Enable';
  fields.wan.pppoe_user = 'Device.PPP.Interface.*.Username';
  fields.wan.pppoe_pass = 'Device.PPP.Interface.*.Password';
  fields.wan.rate = 'Device.Ethernet.Interface.*.MaxBitRate';
  fields.wan.duplex = 'Device.Ethernet.Interface.*.DuplexMode';
  fields.wan.wan_ip = 'Device.IP.Interface.*.IPv4Address.*.IPAddress';
  fields.wan.wan_ip_ppp = 'Device.IP.Interface.*.IPv4Address.*.IPAddress';
  fields.wan.wan_mac = 'Device.Ethernet.Interface.*.MACAddress';
  fields.wan.wan_mac_ppp = fields.wan.wan_mac;
  delete fields.wan.uptime;
  delete fields.wan.uptime_ppp;
  fields.wan.mtu = 'Device.IP.Interface.*.MaxMTUSize';
  fields.wan.mtu_ppp = 'Device.IP.Interface.*.MaxMTUSize';
  fields.wan.recv_bytes = 'Device.IP.Interface.*.Stats.BytesSent';
  fields.wan.sent_bytes = 'Device.IP.Interface.*.Stats.BytesReceived';
  fields.wan.remote_address_ppp = 'Device.PPP.Interface.*.IPCP.RemoteIPAddress';
  fields.wan.default_gateway =
    'Device.Routing.Router.1.IPv4Forwarding.*.GatewayIPAddress';
  fields.wan.default_gateway_ppp =
    'Device.Routing.Router.1.IPv4Forwarding.*.GatewayIPAddress';
  fields.wan.dns_servers = 'Device.DHCPv4.Client.*.DNSServers';
  fields.wan.dns_servers_ppp = 'Device.PPP.Interface.*.IPCP.DNSServers';
  fields.wan.vlan_ppp = 'Device.Ethernet.VLANTermination.*.VLANID';
  fields.wan.vlan = 'Device.Ethernet.VLANTermination.*.VLANID';
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
  fields.port_mapping_values.protocol = [
    'Protocol', 'TCP or UDP', 'xsd:string',
  ];
  fields.port_mapping_values.description[0] = 'Alias';
  fields.port_mapping_values.enable[0] = 'Enable';
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_fields_interface_root = 'Device.IP.Interface';
  fields.port_mapping_fields_interface_key =
    'Device.NAT.PortMapping.1.Interface';
  // Lan
  fields.lan.router_ip = 'Device.IP.Interface.1.IPv4Address.1.IPAddress';
  fields.lan.subnet_mask = 'Device.DHCPv4.Server.Pool.1.SubnetMask';
  fields.lan.lease_max_ip = 'Device.DHCPv4.Server.Pool.1.MaxAddress';
  fields.lan.lease_min_ip = 'Device.DHCPv4.Server.Pool.1.MinAddress';
  fields.lan.ip_routers = 'Device.DHCPv4.Server.Pool.1.IPRouters';
  fields.lan.dns_servers = 'Device.DHCPv4.Server.Pool.1.DNSServers';

  fields.access_control.mac = 'Device.Hosts.AccessControl';

  // IPv6
  fields.ipv6.address = 'Device.IP.Interface.*.IPv6Address.*.IPAddress';
  fields.ipv6.address_ppp = fields.ipv6.address;

  fields.ipv6.prefix_delegation_address =
    'Device.IP.Interface.*.IPv6Prefix.*.Prefix';
  fields.ipv6.prefix_delegation_address_ppp =
    fields.ipv6.prefix_delegation_address;

  fields.ipv6.prefix_delegation_local_address =
    'Device.IP.Interface.1.IPv6Address.*.IPAddress';
  fields.ipv6.prefix_delegation_local_address_ppp =
    fields.ipv6.prefix_delegation_local_address;

  // Wifi
  fields.wifi2.ssid = 'Device.WiFi.SSID.1.SSID';
  fields.wifi2.bssid = 'Device.WiFi.SSID.1.BSSID';
  fields.wifi2.password = 'Device.WiFi.AccessPoint.1.Security.KeyPassphrase';
  fields.wifi2.channel = 'Device.WiFi.Radio.1.Channel';
  fields.wifi2.auto = 'Device.WiFi.Radio.1.AutoChannelEnable';
  fields.wifi2.mode = 'Device.WiFi.Radio.1.OperatingStandards';
  fields.wifi2.band = 'Device.WiFi.Radio.1.OperatingChannelBandwidth';
  fields.wifi2.enable = 'Device.WiFi.SSID.1.Enable';
  delete fields.wifi2.beacon_type;
  fields.wifi5.ssid = 'Device.WiFi.SSID.3.SSID';
  fields.wifi5.bssid = 'Device.WiFi.SSID.3.BSSID';
  fields.wifi5.password = 'Device.WiFi.AccessPoint.3.Security.KeyPassphrase';
  fields.wifi5.channel = 'Device.WiFi.Radio.2.Channel';
  fields.wifi5.auto = 'Device.WiFi.Radio.2.AutoChannelEnable';
  fields.wifi5.mode = 'Device.WiFi.Radio.2.OperatingStandards';
  fields.wifi5.band = 'Device.WiFi.Radio.2.OperatingChannelBandwidth';
  fields.wifi5.enable = 'Device.WiFi.SSID.3.Enable';
  delete fields.wifi5.beacon_type;
  // Mesh
  fields.mesh2 = {};
  fields.mesh5 = {};
  // Devices
  fields.devices.hosts = 'Device.Hosts';
  fields.devices.hosts_template = 'Device.Hosts.Host';
  fields.devices.host_mac = 'Device.Hosts.Host.*.PhysAddress';
  fields.devices.host_active = 'Device.Hosts.Host.*.Active';
  fields.devices.host_ip = 'Device.Hosts.Host.*.IPAddress';
  fields.devices.host_name = 'Device.Hosts.Host.*.HostName';
  fields.devices.host_rssi = 'Device.WiFi.MultiAP.APDevice.1.Radio.*.AP.*.'+
    'AssociatedDevice.*.SignalStrength';
  fields.devices.assoc_mac = 'Device.WiFi.MultiAP.APDevice.1.Radio.*.AP.2.' +
    'AssociatedDevice.*.MACAddress';
  fields.devices.associated = 'Device.WiFi.MultiAP.APDevice.1.Radio.*.AP.2.' +
    'AssociatedDevice';

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
  fields.devices.rate = 'Device.WiFi.AccessPoint.1.AssociatedDevice.*' +
    '.LastDataUplinkRate';
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
  delete fields.diagnostics.speedtest.full_load_bytes_rec;
  delete fields.diagnostics.speedtest.full_load_period;
  // Traceroute
  fields.diagnostics.traceroute.root = 'Device.IP.Diagnostics.TraceRoute';
  fields.diagnostics.traceroute.hop_host = 'Host';
  fields.diagnostics.traceroute.hop_ip_address = 'HostAddress';
  fields.diagnostics.traceroute.hop_error_code = 'ErrorCode';
  fields.diagnostics.traceroute.hop_rtt_times = 'RTTimes';
  // Sitesurvey
  fields.diagnostics.sitesurvey.root = 'Device.WiFi.NeighboringWiFiDiagnostic';
  fields.diagnostics.sitesurvey.signal = 'SignalStrength';
  fields.diagnostics.sitesurvey.band = 'OperatingChannelBandwidth';
  fields.diagnostics.sitesurvey.mode = 'OperatingStandards';
  return fields;
};

module.exports = tplinkModel;
