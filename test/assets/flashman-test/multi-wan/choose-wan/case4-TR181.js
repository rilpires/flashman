const wanList = {
  'wan_ip_1': {
    'dhcp_enable': {
      'path': 'Device.IP.Interface.1.Enable',
      'writable': true,
      'value': false,
    },
    'dhcp_status': {
      'path': 'Device.IP.Interface.1.Status',
      'writable': false,
      'value': 'Down',
    },
  },
  'wan_ip_2': {
    'dhcp_enable': {
      'path': 'Device.IP.Interface.2.Enable',
      'writable': true,
      'value': true,
    },
    'dhcp_status': {
      'path': 'Device.IP.Interface.2.Status',
      'writable': false,
      'value': 'Up',
    },
  },
  'wan_ppp_3': {
    'pppoe_enable': {
      'path': 'Device.PPP.Interface.3.Enable',
      'writable': true,
      'value': true,
    },
    'pppoe_status': {
      'path': 'Device.PPP.Interface.3.Status',
      'writable': false,
      'value': 'Up',
    },
  },
  'wan_ppp_4': {
    'pppoe_enable': {
      'path': 'Device.PPP.Interface.4.Enable',
      'writable': true,
      'value': true,
    },
    'pppoe_status': {
      'path': 'Device.PPP.Interface.4.Status',
      'writable': false,
      'value': 'Up',
    },
  },
  'wan_ppp_5': {
    'pppoe_enable': {
      'path': 'Device.PPP.Interface.5.Enable',
      'writable': true,
      'value': true,
    },
    'pppoe_status': {
      'path': 'Device.PPP.Interface.5.Status',
      'writable': false,
      'value': 'Down',
    },
  },
};

module.exports = wanList;
