const wanList = {
  'wan_ppp_1_1_1': {
    'recv_bytes': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANCommonInterfaceConfig.TotalBytesReceived',
      'writable': false,
      'value': 18390,
    },
    'sent_bytes': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANCommonInterfaceConfig.TotalBytesSent',
      'writable': false,
      'value': 20211,
    },
    'pppoe_status': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.ConnectionStatus',
      'writable': false,
      'value': 'Connected',
    },
    'dns_servers_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.DNSServers',
      'writable': true,
      'value': '192.168.88.1',
    },
    'default_gateway_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.DefaultGateway',
      'writable': false,
      'value': '192.168.89.1',
    },
    'pppoe_enable': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.Enable',
      'writable': true,
      'value': true,
    },
    'wan_ip_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress',
      'writable': false,
      'value': '192.168.89.221',
    },
    'wan_mac_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.MACAddress',
      'writable': false,
      'value': 'c8:3a:35:09:08:93',
    },
    'mtu_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.MaxMRUSize',
      'writable': true,
      'value': 1492,
    },
    'name_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.Name',
      'writable': true,
      'value': '',
    },
    'pppoe_pass': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.Password',
      'writable': true,
      'value': '',
    },
    'port_mapping_entries_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.PortMappingNumberOfEntries',
      'writable': false,
      'value': 0,
    },
    'remote_address_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.RemoteIPAddress',
      'writable': false,
      'value': '192.168.89.1',
    },
    'uptime_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.Uptime',
      'writable': false,
      'value': 5,
    },
    'pppoe_user': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.Username',
      'writable': true,
      'value': 'admin123',
    },
    'service_type_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.WANPPPConnection.1.X_TDTC_ServiceList',
      'writable': true,
      'value': 'INTERNET_TR069',
    },
    'vlan': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.X_TDTC_VLAN',
      'writable': true,
      'value': 1,
    },
    'vlan_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.1.X_TDTC_VLAN',
      'writable': true,
      'value': 1,
    },
    'pon_rxpower': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANGponInterfaceConfig.RXPower',
      'writable': false,
      'value': '-13.344190  dBm',
    },
    'pon_txpower': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANGponInterfaceConfig.TXPower',
      'writable': false,
      'value': '1.928773  dBm',
    }
  },
  'wan_ip_1_2_1': {
    'recv_bytes': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANCommonInterfaceConfig.TotalBytesReceived',
      'writable': false,
      'value': 18390,
    },
    'sent_bytes': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANCommonInterfaceConfig.TotalBytesSent',
      'writable': false,
      'value': 20211,
    },
    'dhcp_status': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.2.WANIPConnection.1.ConnectionStatus',
      'writable': false,
      'value': 'Connected',
    },
    'dns_servers': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.2.WANIPConnection.1.DNSServers',
      'writable': true,
      'value': '192.168.88.1',
    },
    'default_gateway': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.2.WANIPConnection.1.DefaultGateway',
      'writable': true,
      'value': '192.168.88.1',
    },
    'dhcp_enable': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.2.WANIPConnection.1.Enable',
      'writable': true,
      'value': true,
    },
    'wan_ip': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.2.WANIPConnection.1.ExternalIPAddress',
      'writable': true,
      'value': '192.168.88.68',
    },
    'wan_mac': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.2.WANIPConnection.1.MACAddress',
      'writable': false,
      'value': 'c8:3a:35:09:08:94',
    },
    'mtu': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.2.WANIPConnection.1.MaxMTUSize',
      'writable': true,
      'value': 1500,
    },
    'name': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.2.WANIPConnection.1.Name',
      'writable': true,
      'value': '',
    },
    'port_mapping_entries_dhcp': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.2.WANIPConnection.1.PortMappingNumberOfEntries',
      'writable': false,
      'value': 0,
    },
    'uptime': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.2.WANIPConnection.1.Uptime',
      'writable': false,
      'value': 78,
    },
    'service_type': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.2.WANIPConnection.1.X_TDTC_ServiceList',
      'writable': true,
      'value': 'INTERNET',
    },
    'vlan': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.2.X_TDTC_VLAN',
      'writable': true,
      'value': 1,
    },
    'vlan_ppp': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANConnectionDevice.2.X_TDTC_VLAN',
      'writable': true,
      'value': 1,
    },
    'pon_rxpower': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANGponInterfaceConfig.RXPower',
      'writable': false,
      'value': '-13.344190  dBm',
    },
    'pon_txpower': {
      'path': 'InternetGatewayDevice.WANDevice.1.' +
        'WANGponInterfaceConfig.TXPower',
      'writable': false,
      'value': '1.928773  dBm',
    },
  },
};

module.exports = wanList;
