const basicCPEModel = require('./base-model');

let tplinkModel = Object.assign({}, basicCPEModel);

tplinkModel.identifier = 'TP-Link HC220-G5';

tplinkModel.modelPermissions = function() {
  let permissions = basicCPEModel.modelPermissions();
  permissions.firmwareUpgrades = {
    '0.8.0 2.0.0 v605e.0 Build 210923 Rel.23076n': [],
  };
  return permissions;
};

tplinkModel.getModelFields = function() {
  let fields = basicCPEModel.getModelFields();
  fields = basicCPEModel.convertIGDtoDevice(fields);
  fields.common.mac = 'Device.Ethernet.Interface.*.MACAddress';
  fields.common.web_admin_password = 'Device.Users.User.2.Password';
  fields.wan.pppoe_enable = 'Device.PPP.Interface.*.Enable';
  fields.wan.pppoe_user = 'Device.PPP.Interface.*.Username';
  fields.wan.pppoe_pass = 'Device.PPP.Interface.*.Password';
  fields.wan.rate = 'Device.Ethernet.Interface.*.MaxBitRate';
  fields.wan.duplex = 'Device.Ethernet.Interface.*.DuplexMode';
  fields.wan.wan_ip = 'Device.DHCPv4.Client.*.IPAddress';
  fields.wan.wan_ip_ppp = 'Device.PPP.Interface.*.IPCP.LocalIPAddress';
  fields.wan.uptime = 'Device.PPP.Interface.*.IdleDisconnectTime';
  fields.wan.uptime_ppp = 'Device.PPP.Interface.*.IdleDisconnectTime';
  fields.wan.mtu = 'Device.IP.Interface.*.MaxMTUSize';
  fields.wan.mtu_ppp = 'Device.PPP.Interface.*.MaxMRUSize';
  fields.wan.recv_bytes = 'Device.Ethernet.Interface.1.Stats.BytesReceived';
  fields.wan.sent_bytes = 'Device.Ethernet.Interface.1.Stats.BytesSent';
  fields.wan.port_mapping_entries_dhcp =
    'Device.NAT.PortMappingNumberOfEntries';
  fields.wan.port_mapping_entries_ppp =
    'Device.NAT.PortMappingNumberOfEntries';
  fields.port_mapping_dhcp = 'Device.NAT.PortMapping';
  fields.port_mapping_ppp = 'Device.NAT.PortMapping';
  fields.lan.router_ip = 'Device.IP.Interface.1.IPv4Address.1.IPAddress';
  fields.lan.subnet_mask = 'Device.DHCPv4.Server.Pool.1.SubnetMask';
  fields.lan.lease_min_ip = 'Device.DHCPv4.Server.Pool.1.MinAddress';
  fields.lan.lease_max_ip = 'Device.DHCPv4.Server.Pool.1.MaxAddress';
  fields.lan.ip_routers = 'Device.DHCPv4.Server.Pool.1.IPRouters';
  fields.lan.dns_servers = 'Device.DHCPv4.Server.Pool.1.DNSServers';
  fields.wifi2.ssid = 'Device.WiFi.SSID.1.SSID';
  fields.wifi2.bssid = 'Device.WiFi.SSID.1.BSSID';
  fields.wifi2.password = 'Device.WiFi.AccessPoint.1.Security.KeyPassphrase';
  fields.wifi2.channel = 'Device.WiFi.MultiAP.APDevice.1.Radio.1.Channel';
  fields.wifi2.auto = 'Device.WiFi.Radio.1.AutoChannelEnable';
  fields.wifi2.mode = 'Device.WiFi.Radio.1.OperatingStandards';
  fields.wifi2.enable = 'Device.WiFi.SSID.1.Enable';
  delete fields.wifi2.beacon_type; // check this later
  fields.wifi2.band = 'Device.WiFi.Radio.1.CurrentOperatingChannelBandwidth';
  fields.wifi5.ssid = 'Device.WiFi.SSID.3.SSID';
  fields.wifi5.bssid = 'Device.WiFi.SSID.3.BSSID';
  fields.wifi5.password = 'Device.WiFi.AccessPoint.3.Security.KeyPassphrase';
  fields.wifi5.channel = 'Device.WiFi.MultiAP.APDevice.1.Radio.2.Channel';
  fields.wifi5.auto = 'Device.WiFi.Radio.2.AutoChannelEnable';
  fields.wifi5.mode = 'Device.WiFi.Radio.2.OperatingStandards';
  fields.wifi5.enable = 'Device.WiFi.SSID.2.Enable';
  delete fields.wifi5.beacon_type;
  fields.mesh2 = {};
  fields.mesh5 = {};
  fields.devices.hosts = 'Device.Hosts';
  fields.devices.hosts_template = 'Device.Hosts.Host';
  fields.devices.host_mac = 'Device.Hosts.Host.*.PhysAddress';
  fields.devices.host_name = 'Device.Hosts.Host.*.HostName';
  fields.devices.host_ip = 'Device.Hosts.Host.*.IPAddress';
  // fields.devices.host_layer2 = 'Device.Ethernet.Interface.*'; ??
  fields.devices.associated = 'Device.WiFi.AccessPoint.*.AssociatedDevice';
  fields.devices.assoc_mac = 'Device.WiFi.AccessPoint.*.MaxAssociatedDevices';
  Object.keys(fields.diagnostics.ping).forEach((k) => {
    fields.diagnostics.ping[k] = fields.diagnostics.ping[k].replace(
      'IPPingDiagnostics', 'IP.Diagnostics.IPPing');
  });
  Object.keys(fields.diagnostics.speedtest).forEach((k) => {
    fields.diagnostics.speedtest[k] = fields.diagnostics.speedtest[k].replace(
      'DownloadDiagnostics', 'IP.Diagnostics.DownloadDiagnostics');
  });
  delete fields.diagnostics.speedtest.full_load_bytes_rec;
  delete fields.diagnostics.speedtest.full_load_period;
  return fields;
};

module.exports = tplinkModel;
