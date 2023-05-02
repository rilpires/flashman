const wanList = {
  'wan_ppp_1_1_1': {
    'port_mapping': [],
    'pppoe_status': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.ConnectionStatus',
      'writable': false,
      'value': 'Connected',
    },
    'dns_servers_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.DNSServers',
      'writable': true,
      'value': '192.168.88.1',
    },
    'default_gateway_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.DefaultGateway',
      'writable': false,
      'value': '192.168.89.1',
    },
    'pppoe_enable': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.Enable',
      'writable': true,
      'value': true,
    },
    'wan_ip_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.ExternalIPAddress',
      'writable': false,
      'value': '192.168.89.246',
    },
    'wan_mac_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.MACAddress',
      'writable': false,
      'value': '94:25:33:3B:D1:C3',
    },
    'mtu_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.MaxMRUSize',
      'writable': true,
      'value': 1427,
    },
    'pppoe_pass': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.Password',
      'writable': true,
      'value': '',
    },
    'port_mapping_entries_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.PortMappingNumberOfEntries',
      'writable': false,
      'value': 0,
    },
    'remote_address_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.RemoteIPAddress',
      'writable': false,
      'value': '192.168.89.1',
    },
    'uptime_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.Uptime',
      'writable': false,
      'value': 66,
    },
    'pppoe_user': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.Username',
      'writable': true,
      'value': 'admin123',
    },
    'vlan_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.X_HW_VLAN',
      'writable': true,
      'value': 1,
    },
  },
  'wan_dhcp_1_2_1': {
    'port_mapping': [],
    'dhcp_status': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.' +
        'WANIPConnection.1.ConnectionStatus',
      'writable': false,
      'value': 'Connecting',
    },
    'dns_servers': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.' +
        'WANIPConnection.1.DNSServers',
      'writable': true,
      'value': '',
    },
    'default_gateway': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.' +
        'WANIPConnection.1.DefaultGateway',
      'writable': true,
      'value': '0.0.0.0',
    },
    'dhcp_enable': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.' +
        'WANIPConnection.1.Enable',
      'writable': true,
      'value': true,
    },
    'wan_ip': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.' +
        'WANIPConnection.1.ExternalIPAddress',
      'writable': true,
      'value': '0.0.0.0',
    },
    'wan_mac': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.' +
        'WANIPConnection.1.MACAddress',
      'writable': false,
      'value': '94:25:33:3B:D1:C4',
    },
    'mtu': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.' +
        'WANIPConnection.1.MaxMTUSize',
      'writable': true,
      'value': 1500,
    },
    'port_mapping_entries_dhcp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.' +
        'WANIPConnection.1.PortMappingNumberOfEntries',
      'writable': false,
      'value': 0,
    },
    'uptime': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.' +
        'WANIPConnection.1.Uptime',
      'writable': false,
      'value': 0,
    },
    'vlan': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.' +
        'WANIPConnection.1.X_HW_VLAN',
      'writable': true,
      'value': 2,
    },
    'pon_rxpower': {
      'path': 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower',
      'writable': false,
      'value': -3,
    },
    'recv_bytes': {
      'path': 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.' +
        'Stats.BytesReceived',
      'writable': false,
      'value': 7412326259,
    },
    'sent_bytes': {
      'path': 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.' +
        'Stats.BytesSent',
      'writable': false,
      'value': 312287362,
    },
    'pon_txpower': {
      'path': 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.TXPower',
      'writable': false,
      'value': 2,
    },
  },
  'wan_ppp_1_3_1': {
    'port_mapping': [],
    'pppoe_status': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.ConnectionStatus',
      'writable': false,
      'value': 'Connecting',
    },
    'dns_servers_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.DNSServers',
      'writable': true,
      'value': '',
    },
    'default_gateway_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.DefaultGateway',
      'writable': false,
      'value': '0.0.0.0',
    },
    'pppoe_enable': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.Enable',
      'writable': true,
      'value': true,
    },
    'wan_ip_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.ExternalIPAddress',
      'writable': false,
      'value': '0.0.0.0',
    },
    'wan_mac_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.MACAddress',
      'writable': false,
      'value': '94:25:33:3B:D1:C5',
    },
    'mtu_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.MaxMRUSize',
      'writable': true,
      'value': 1492,
    },
    'pppoe_pass': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.Password',
      'writable': true,
      'value': '',
    },
    'port_mapping_entries_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.PortMappingNumberOfEntries',
      'writable': false,
      'value': 0,
    },
    'remote_address_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.RemoteIPAddress',
      'writable': false,
      'value': '',
    },
    'uptime_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.Uptime',
      'writable': false,
      'value': 0,
    },
    'pppoe_user': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.Username',
      'writable': true,
      'value': 'iadtest@pppoe',
    },
    'vlan_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.X_HW_VLAN',
      'writable': true,
      'value': 3,
    },
  },
  'wan_dhcp_1_4_1': {
    'port_mapping': [],
    'dhcp_status': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.' +
        'WANIPConnection.1.ConnectionStatus',
      'writable': false,
      'value': 'Connecting',
    },
    'dns_servers': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.' +
        'WANIPConnection.1.DNSServers',
      'writable': true,
      'value': '',
    },
    'default_gateway': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.' +
        'WANIPConnection.1.DefaultGateway',
      'writable': true,
      'value': '0.0.0.0',
    },
    'dhcp_enable': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.' +
        'WANIPConnection.1.Enable',
      'writable': true,
      'value': true,
    },
    'wan_ip': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.' +
        'WANIPConnection.1.ExternalIPAddress',
      'writable': true,
      'value': '0.0.0.0',
    },
    'wan_mac': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.' +
        'WANIPConnection.1.MACAddress',
      'writable': false,
      'value': '94:25:33:3B:D1:C6',
    },
    'mtu': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.' +
        'WANIPConnection.1.MaxMTUSize',
      'writable': true,
      'value': 1500,
    },
    'port_mapping_entries_dhcp': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.' +
        'WANIPConnection.1.PortMappingNumberOfEntries',
      'writable': false,
      'value': 0,
    },
    'uptime': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.' +
        'WANIPConnection.1.Uptime',
      'writable': false,
      'value': 0,
    },
    'vlan': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.' +
        'WANIPConnection.1.X_HW_VLAN',
      'writable': true,
      'value': 4,
    },
    'pon_rxpower': {
      'path': 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower',
      'writable': false,
      'value': -3,
    },
    'recv_bytes': {
      'path': 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.Stats.' +
        'BytesReceived',
      'writable': false,
      'value': 7412326259,
    },
    'sent_bytes': {
      'path': 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.Stats.' +
        'BytesSent',
      'writable': false,
      'value': 312287362,
    },
    'pon_txpower': {
      'path': 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.TXPower',
      'writable': false,
      'value': 2,
    },
  },
};

module.exports = wanList;
