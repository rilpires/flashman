const wanList = {
  'wan_ppp_1_1_1': {
    'pppoe_status': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.ConnectionStatus',
      'writable': false,
      'value': 'Disonnected',
    },
    'pppoe_enable': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        'WANPPPConnection.1.Enable',
      'writable': true,
      'value': false,
    },
  },
  'wan_ip_1_2_1': {
    'dhcp_status': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.' +
        'WANIPConnection.1.ConnectionStatus',
      'writable': false,
      'value': 'Disonnected',
    },
    'dhcp_enable': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.' +
        'WANIPConnection.1.Enable',
      'writable': true,
      'value': false,
    },
  },
  'wan_ppp_1_3_1': {
    'pppoe_status': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.ConnectionStatus',
      'writable': false,
      'value': 'Disonnected',
    },
    'pppoe_enable': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.' +
        'WANPPPConnection.1.Enable',
      'writable': true,
      'value': false,
    },
  },
  'wan_ip_1_4_1': {
    'dhcp_status': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.' +
        'WANIPConnection.1.ConnectionStatus',
      'writable': false,
      'value': 'Disonnected',
    },
    'dhcp_enable': {
      'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.' +
        'WANIPConnection.1.Enable',
      'writable': true,
      'value': false,
    },
  },
};

module.exports = wanList;
