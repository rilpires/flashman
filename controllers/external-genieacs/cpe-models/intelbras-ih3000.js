const basicCPEModel = require('./base-model');

let intelbrasModel = Object.assign({}, basicCPEModel);

intelbrasModel.identifier = {vendor: 'Intelbras', model: 'IH3000'};

intelbrasModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  // permissions.features.pingTest = true; // Needs polling
  permissions.features.ponSignal = false;
  // permissions.features.portForward = true; // Needs refactor
  // permissions.wan.portForwardPermissions =
  //   basicCPEModel.portForwardPermissions.noAsymNoRanges;
  permissions.features.stun = true;
  // permissions.features.speedTest = true; // Needs polling
  permissions.lan.LANDeviceCanTrustActive = false;
  permissions.lan.LANDeviceHasAssocTree = false;
  permissions.wan.allowReadWanMtu = false;
  permissions.wan.allowEditWanMtu = false;
  permissions.wan.allowReadWanVlan = false;
  permissions.wan.allowEditWanVlan = false;
  permissions.wan.pingTestSingleAttempt = true;
  permissions.wan.dhcpUptime = false;
  permissions.wan.hasUptimeField = false;
  permissions.wifi.list5ghzChannels = [36, 40, 44, 48, 149, 153, 157, 161, 165];
  permissions.wifi.allowDiacritics = true;
  permissions.wifi.axWiFiMode = true;
  permissions.wifi.bandAuto5 = false;
  permissions.wifi.modeRead = false;
  permissions.wifi.modeWrite = false;
  permissions.useLastIndexOnWildcard = true;
  permissions.needInterfaceInPortFoward = true;
  permissions.firmwareUpgrades = {
    'FG10_CPE_V02.02.03': [],
  };
  return permissions;
};

intelbrasModel.convertWifiBand = function(band, is5ghz=false) {
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
      return '';
  }
};

intelbrasModel.convertWifiBandToFlashman = function(band, isAC) {
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

intelbrasModel.isDeviceConnectedViaWifi = function(
  layer2iface, wifi2iface, wifi5iface,
) {
  if (layer2iface === 'Wi-Fi') {
    return 'wifi';
  }
  return 'cable';
};

intelbrasModel.assocFieldWildcardReplacer = function(assocDevicesKey,
                                                    ifaceIndex) {
  return assocDevicesKey.replace(
    /AccessPoint.[0-9*]+./g,
    'AccessPoint.' + ifaceIndex + '.',
  );
};

intelbrasModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields = basicCPEModel.convertIGDtoDevice(fields);
  // Common
  fields.common.mac = 'Device.Ethernet.Interface.*.MACAddress';
  fields.common.stun_enable = 'Device.ManagementServer.STUNEnable';
  fields.common.stun_udp_conn_req_addr =
    'Device.ManagementServer.UDPConnectionRequestAddress';
  // Wan
  fields.wan.pppoe_enable = 'Device.PPP.Interface.*.Enable';
  fields.wan.pppoe_user = 'Device.PPP.Interface.*.Username';
  fields.wan.pppoe_pass = 'Device.PPP.Interface.*.Password';
  fields.wan.duplex = 'Device.Ethernet.Interface.*.DuplexMode';
  fields.wan.rate = 'Device.Ethernet.Interface.*.MaxBitRate';
  fields.wan.wan_ip = 'Device.IP.Interface.2.IPv4Address.1.IPAddress';
  fields.wan.wan_ip_ppp = fields.wan.wan_ip;
  delete fields.wan.uptime;
  delete fields.wan.uptime_ppp;
  // This router does not have the fields referring to mtu and mtu_ppp
  fields.wan.recv_bytes = 'Device.IP.Interface.2.Stats.BytesReceived';
  fields.wan.sent_bytes = 'Device.IP.Interface.2.Stats.BytesSent';
  // Port Mapping
  fields.wan.port_mapping_entries_dhcp =
    'Device.NAT.PortMappingNumberOfEntries';
  fields.wan.port_mapping_entries_ppp = fields.wan.port_mapping_entries_dhcp;
  fields.port_mapping_dhcp = 'Device.NAT.PortMapping';
  fields.port_mapping_ppp = fields.port_mapping_dhcp;
  fields.port_mapping_values.protocol[0] = 'Protocol';
  fields.port_mapping_values.protocol[1] = 'tcpudp';
  fields.port_mapping_values.description[0] = 'Alias';
  fields.port_mapping_fields.external_port_end = [
    'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
  ];
  fields.port_mapping_fields_interface_root = 'Device.IP.Interface';
  fields.port_mapping_fields_interface_key =
    'Device.NAT.PortMapping.1.Interface';
  // Lan
  fields.lan.ip_routers = 'Device.DHCPv4.Server.Pool.1.IPRouters';
  fields.lan.lease_max_ip = 'Device.DHCPv4.Server.Pool.1.MaxAddress';
  fields.lan.lease_min_ip = 'Device.DHCPv4.Server.Pool.1.MinAddress';
  fields.lan.router_ip = 'Device.IP.Interface.*.IPv4Address.1.IPAddress';
  fields.lan.subnet_mask = 'Device.DHCPv4.Server.Pool.1.SubnetMask';
  // Wifi
  fields.wifi2.ssid = 'Device.WiFi.SSID.1.SSID';
  fields.wifi2.bssid = 'Device.WiFi.SSID.1.BSSID';
  fields.wifi2.password = 'Device.WiFi.AccessPoint.1.Security.KeyPassphrase';
  fields.wifi2.channel = 'Device.WiFi.Radio.1.Channel';
  fields.wifi2.auto = 'Device.WiFi.Radio.1.AutoChannelEnable';
  fields.wifi2.enable = 'Device.WiFi.SSID.1.Enable';
  fields.wifi2.band = 'Device.WiFi.Radio.1.OperatingChannelBandwidth';
  delete fields.wifi2.beacon_type;
  fields.wifi5.ssid = 'Device.WiFi.SSID.3.SSID';
  fields.wifi5.bssid = 'Device.WiFi.SSID.3.BSSID';
  fields.wifi5.password = 'Device.WiFi.AccessPoint.3.Security.KeyPassphrase';
  fields.wifi5.channel = 'Device.WiFi.Radio.2.Channel';
  fields.wifi5.auto = 'Device.WiFi.Radio.2.AutoChannelEnable';
  fields.wifi5.enable = 'Device.WiFi.SSID.3.Enable';
  fields.wifi5.band = 'Device.WiFi.Radio.2.OperatingChannelBandwidth';
  delete fields.wifi5.beacon_type;
  // Devices
  fields.devices.hosts = 'Device.DeviceInfo.Hosts';
  fields.devices.hosts_template = 'Device.DeviceInfo.Hosts.Host';
  fields.devices.host_mac = 'Device.DeviceInfo.Hosts.Host.*.PhysAddress';
  fields.devices.host_name = 'Device.DeviceInfo.Hosts.Host.*.HostName';
  fields.devices.host_ip = 'Device.DeviceInfo.Hosts.Host.*.IPAddress';
  fields.devices.associated = 'Device.WiFi.AccessPoint.*.AssociatedDevice';
  fields.devices.host_active = 'Device.DeviceInfo.Hosts.Host.*.Active';
  fields.devices.host_layer2 = 'Device.DeviceInfo.Hosts.Host.*.InterfaceType';
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
  return fields;
};

module.exports = intelbrasModel;
