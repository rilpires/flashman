const wanList = {
  'wan_ip_14': {
    'dhcp_enable': {
      'path': 'Device.IP.Interface.14.Enable',
      'writable': true,
      'value': true,
    },
    'wan_ip_1': {
      'path': 'Device.IP.Interface.14.IPv4Address.1.IPAddress',
      'writable': true,
      'value': '192.168.88.71',
    },
    'wan_ip_ppp_1': {
      'path': 'Device.IP.Interface.14.IPv4Address.1.IPAddress',
      'writable': true,
      'value': '192.168.88.71',
    },
    'mtu': {
      'path': 'Device.IP.Interface.14.MaxMTUSize',
      'writable': true,
      'value': 1493,
    },
    'mtu_ppp': {
      'path': 'Device.IP.Interface.14.MaxMTUSize',
      'writable': true,
      'value': 1493,
    },
    'sent_bytes': {
      'path': 'Device.IP.Interface.14.Stats.BytesReceived',
      'writable': false,
      'value': 252767173,
    },
    'recv_bytes': {
      'path': 'Device.IP.Interface.14.Stats.BytesSent',
      'writable': false,
      'value': 130036257,
    },
    'dhcp_status': {
      'path': 'Device.IP.Interface.14.Status',
      'writable': false,
      'value': 'Up',
    }
  },
  'wan_ip_15': {
    'dhcp_enable': {
      'path': 'Device.IP.Interface.15.Enable',
      'writable': true,
      'value': true,
    },
    'wan_ip_1': {
      'path': 'Device.IP.Interface.15.IPv4Address.1.IPAddress',
      'writable': true,
      'value': '0.0.0.0',
    },
    'wan_ip_ppp_1': {
      'path': 'Device.IP.Interface.15.IPv4Address.1.IPAddress',
      'writable': true,
      'value': '0.0.0.0',
    },
    'mtu': {
      'path': 'Device.IP.Interface.15.MaxMTUSize',
      'writable': true,
      'value': 1492,
    },
    'mtu_ppp': {
      'path': 'Device.IP.Interface.15.MaxMTUSize',
      'writable': true,
      'value': 1492,
    },
    'sent_bytes': {
      'path': 'Device.IP.Interface.15.Stats.BytesReceived',
      'writable': false,
      'value': 0,
    },
    'recv_bytes': {
      'path': 'Device.IP.Interface.15.Stats.BytesSent',
      'writable': false,
      'value': 0,
    },
    'dhcp_status': {
      'path': 'Device.IP.Interface.15.Status',
      'writable': false,
      'value': 'Down',
    },
    'pppoe_enable': {
      'path': 'Device.PPP.Interface.6.Enable',
      'writable': true,
      'value': true,
    },
    'dns_servers_ppp': {
      'path': 'Device.PPP.Interface.6.IPCP.DNSServers',
      'writable': false,
      'value': '',
    },
    'remote_address_ppp': {
      'path': 'Device.PPP.Interface.6.IPCP.RemoteIPAddress',
      'writable': false,
      'value': '',
    },
    'pppoe_pass': {
      'path': 'Device.PPP.Interface.6.Password',
      'writable': true,
      'value': '',
    },
    'pppoe_status': {
      'path': 'Device.PPP.Interface.6.Status',
      'writable': false,
      'value': 'Dormant',
    },
    'pppoe_user': {
      'path': 'Device.PPP.Interface.6.Username',
      'writable': true,
      'value': 'admin123',
    },
  },
};

module.exports = wanList;
