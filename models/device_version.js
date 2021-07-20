let DeviceVersion = {};

const versionRegex = /^[0-9]+\.[0-9]+\.[0-9A-Za-b]+$/;
const devVersionRegex = /^[0-9]+\.[0-9]+\.[0-9A-Za-b]+-[0-9]+-.*$/;

const tr069Devices = {
  'F670L': {
    versions_upgrade: {
      'V1.1.20P1T18': ['V1.1.20P1T4', 'V1.1.20P3N3', 'V1.1.20P3N4D'],
      'V1.1.20P1T4': ['V1.1.20P3N3', 'V1.1.20P3N4D'],
      'V1.1.20P3N3': ['V1.1.20P3N4D'],
      'V1.1.20P3N4D': [],
    },
    port_forward_opts: {
      'V1.1.20P1T18': {
       simpleSymmetric: true,
       simpleAsymmetric: true,
       rangeSymmetric: false,
       rangeAsymmetric: false,
      },
      'V1.1.20P1T4': {
       simpleSymmetric: true,
       simpleAsymmetric: true,
       rangeSymmetric: false,
       rangeAsymmetric: false,
      },
      'V1.1.20P3N3': {
       simpleSymmetric: true,
       simpleAsymmetric: true,
       rangeSymmetric: false,
       rangeAsymmetric: false,
      },
      'V1.1.20P3N4D': {
       simpleSymmetric: true,
       simpleAsymmetric: true,
       rangeSymmetric: false,
       rangeAsymmetric: false,
      },
    },
    feature_support: {
      port_forward: true,
      upnp: false,
      wps: false,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      pon_signal: true,
      firmware_upgrade: true,
    },
    wifi2_extended_channels_support: true,
  },
  'ZXHN H198A V3.0': {
    versions_upgrade: {
      'V3.0.0C5_MUL': ['V3.0.0C6_MUL'],
      'V3.0.0C6_MUL': ['V3.0.0C5_MUL'],
    },
    port_forward_opts: {
      'V3.0.0C5_MUL': {
       simpleSymmetric: true,
       simpleAsymmetric: true,
       rangeSymmetric: true,
       rangeAsymmetric: false,
      },
      'V3.0.0C6_MUL': {
       simpleSymmetric: true,
       simpleAsymmetric: true,
       rangeSymmetric: true,
       rangeAsymmetric: false,
      },
    },
    feature_support: {
      port_forward: true,
      upnp: false,
      wps: false,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      pon_signal: false,
      firmware_upgrade: true,
    },
  },
  'GONUAC001': {
    versions_upgrade: {
      'V1.2.3': [],
    },
    feature_support: {
      port_forward: false,
      pon_signal: true,
      upnp: false,
      wps: false,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      firmware_upgrade: true,
    },
    wifi2_extended_channels_support: false,
  },
  'G-140W-C': {
    versions_upgrade: {
      '3FE46343AFIA89': [],
    },
    feature_support: {
      port_forward: false,
      pon_signal: true,
      upnp: false,
      wps: false,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      firmware_upgrade: false,
    },
    wifi2_extended_channels_support: true,
  },
  'HG8245Q2': {
    versions_upgrade: {
      'V3R017C10S100': [],
    },
    feature_support: {
      port_forward: false,
      pon_signal: true,
      upnp: false,
      wps: false,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      firmware_upgrade: false,
    },
    wifi2_extended_channels_support: true,
  },
};

const flashboxFirmwareDevices = {
  'W5-1200FV1': {
    'vlan_support': true,
    'lan_ports': [1, 2, 3],
    'num_usable_lan_ports': 3,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ACTIONRF1200V1': {
    'vlan_support': true,
    'lan_ports': [4, 3, 2, 1], // inverted
    'num_usable_lan_ports': 3,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ACTIONRG1200V1': {
    'vlan_support': true,
    'lan_ports': [2, 1, 0], // inverted
    'num_usable_lan_ports': 3,
    'wan_port': 3,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '8367r',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC2V1': {
    'vlan_support': true,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 31,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 300,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC5V4': {
    'vlan_support': true,
    'lan_ports': [3, 2, 1, 0], // inverted
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 5,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 300,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC20V1': {
    'vlan_support': false,
    'lan_ports': [3, 4, 1, 2], // 2 lshifts
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC20V4': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC20V5': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC20V5PRESET': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC50V3': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC50V4': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC60V2': {
    'vlan_support': false, // even though it's in openwrt 19 it splits wan/lan
                           // into different interfaces
    'lan_ports': [4, 3, 2, 1], // inverted
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC60V3': {
    'vlan_support': false, // even though it's in openwrt 19 it splits
                           // wan/lan into different interfaces
    'lan_ports': [4, 3, 2, 1], // inverted
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC6V2US': {
    'vlan_support': true,
    'lan_ports': [2, 3, 4, 5],
    'num_usable_lan_ports': 4,
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC7V5': {
    'vlan_support': true,
    'lan_ports': [2, 3, 4, 5],
    'num_usable_lan_ports': 4,
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 300,
    'wifi2_extended_channels_support': false,
  },
  'COVR-C1200A1': {
    'vlan_support': true,
    'lan_ports': [2],
    'num_usable_lan_ports': 1,
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'DIR-819A1': {
    'vlan_support': true,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 15,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'DIR-815D1': {
    'vlan_support': false,
    'lan_ports': [0, 1, 2, 3],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'DWR-116A1': {
    'vlan_support': false,
    'lan_ports': [0, 1, 2, 3],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'DWR-116A2': {
    'vlan_support': false,
    'lan_ports': [0, 1, 2, 3],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'DWR-116A3': {
    'vlan_support': false,
    'lan_ports': [0, 1, 2, 3],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'EMG1702-T10AA1': {
    'vlan_support': true,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 15,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'EC220-G5V2': {
    'vlan_support': true,
    'lan_ports': [2, 1, 0], // inverted
    'num_usable_lan_ports': 3,
    'wan_port': 3,
    'cpu_port': 5,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 300,
    'wifi2_extended_channels_support': false,
  },
  'GWR1200ACV1': {
    'vlan_support': true,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 3,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '8367r',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'GWR1200ACV2': {
    'vlan_support': true,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 3,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '83xx',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'GWR300NV1': {
    'vlan_support': false,
    'lan_ports': [0, 1, 2, 3],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': false,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'GF1200V1': {
    'vlan_support': true,
    'lan_ports': [3, 2, 1], // inverted
    'num_usable_lan_ports': 3,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'MAXLINKAC1200GV1': {
    'vlan_support': true,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 3,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '8367r',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'NCLOUD': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': '',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'RE708V1': {
    'vlan_support': true,
    'lan_ports': [0, 1, 2, 3],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '8367r',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'RE172V1': {
    'vlan_support': false,
    'lan_ports': [0, 1, 2, 3],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': false,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-MR3020V1': {
    'vlan_support': false, // even though it's in openwrt 19
                           // it doesn't have lan ports
    'lan_ports': [],
    'num_usable_lan_ports': 0,
    'wan_port': 0,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WDR3500V1': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WDR3600V1': {
    'vlan_support': true,
    'lan_ports': [2, 3, 4, 5],
    'num_usable_lan_ports': 4,
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 150,
    'wifi2_extended_channels_support': false,
  },
  'TL-WDR4300V1': {
    'vlan_support': true,
    'lan_ports': [2, 3, 4, 5],
    'num_usable_lan_ports': 4,
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 150,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR2543N/NDV1': {
    'vlan_support': true,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 9,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 31,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 120,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR740N/NDV4': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1], // 1 lshift
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR740NDV4': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1], // 1 lshift
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR740N/NDV5': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1], // 1 lshift
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR740NDV5': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1], // 1 lshift
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR740N/NDV6': {
    'vlan_support': false, // even though it's in openwrt 19 it splits
                           // wan/lan into different interfaces
    'lan_ports': [4, 3, 2, 1], // inverted
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR740NDV6': {
    'vlan_support': false, // even though it's in openwrt 19 it splits
                           // wan/lan into different interfaces
    'lan_ports': [4, 3, 2, 1], // inverted
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR741N/NDV4': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR741NDV4': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1], // 1 lshift
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR741N/NDV5': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR741NDV5': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR840NV4': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR840NV5': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR840NV6': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR840NV62': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR840NV5PRESET': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR840NV6PRESET': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR841N/NDV7': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 1,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR841NDV7': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR841N/NDV8': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1], // 1 lshift
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR841NDV8': {
    'vlan_support': false,
    'lan_ports': [2, 3, 4, 1], // 1 lshift
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR842N/NDV3': {
    'vlan_support': false, // even though it's in openwrt 19 it splits
                           // lan/wan into different interfaces
    'lan_ports': [4, 3, 2, 1], // lshift
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR842NDV3': {
    'vlan_support': false, // even though it's in openwrt 19 it splits
                           // lan/wan into different interfaces
    'lan_ports': [4, 3, 2, 1], // 1 lshift
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR849NV4': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR849NV5': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR849NV6': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR849NV62': {
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR940NV4': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR940NV5': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR940NV6': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR949NV6': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR845NV3': {
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR845NV4': { //
    'vlan_support': false,
    'lan_ports': [4, 3, 2, 1], // inverted
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
};

const versionCompare = function(foo, bar) {
  // Returns like C strcmp: 0 if equal, -1 if foo < bar, 1 if foo > bar
  let fooVer = foo.split('.').map((val) => {
   return parseInt(val);
  });
  let barVer = bar.split('.').map((val) => {
   return parseInt(val);
  });
  for (let i = 0; i < fooVer.length; i++) {
    if (fooVer[i] < barVer[i]) return -1;
    if (fooVer[i] > barVer[i]) return 1;
  }
  return 0;
};

const grantViewLogs = function(version) {
  // Enabled in all supported versions
  return true;
};

const grantResetDevices = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.10.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPortForward = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    if (tr069Devices[model].feature_support.port_forward &&
        tr069Devices[model].port_forward_opts[version] !== undefined) {
      return true;
    }
    return false;
  }
  if (version.match(versionRegex)) {
    // Oficial Flashbox firmware
    return (versionCompare(version, '0.10.0') >= 0);
  } else if (version.match(devVersionRegex)) {
    // Development version, enable everything by default
    return true;
  } else {
    // Unknown device and or version
    return false;
  }
};

const grantPortForwardAsym = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.14.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPortOpenIpv6 = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.15.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifi5ghz = function(version, is5ghzCapable) {
  if (version.match(versionRegex)) {
    return (is5ghzCapable && (versionCompare(version, '0.13.0') >= 0));
  } else {
    // Development version, enable everything by default
    return is5ghzCapable;
  }
};

const grantWifiBand = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifiBandAuto = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.29.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifiPowerHiddenIpv6 = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.28.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifiState = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.23.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifiExtendedChannels = function(version, model) {
  if (Object.keys(flashboxFirmwareDevices).includes(model) &&
      flashboxFirmwareDevices[model].wifi2_extended_channels_support
  ) {
    return true;
  } else if (Object.keys(tr069Devices).includes(model) &&
             tr069Devices[model].wifi2_extended_channels_support
  ) {
    return true;
  } else {
    return false;
  }
};

const grantPingTest = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantLanEdit = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantLanGwEdit = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.23.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantLanDevices = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.14.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantSiteSurvey = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.29.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantUpnp = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.upnp;
  }
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.21.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantSpeedTest = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.speed_test;
  }
  if (version.match(versionRegex)) {
    if (!model || !Object.keys(flashboxFirmwareDevices).includes(model)) {
      // Unspecified model
      return false;
    }
    if (!flashboxFirmwareDevices[model].speedtest_support) {
      // Model is not compatible with feature
      return false;
    }
    return (versionCompare(version, '0.24.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantSpeedTestLimit = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.speed_test_limit;
  }
  if (grantSpeedTest(version, model) &&
      Object.keys(flashboxFirmwareDevices).includes(model)) {
    return flashboxFirmwareDevices[model].speedtest_limit;
  }

  return 0;
};

const grantBlockDevices = function(model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.block_devices;
  }
  // Enabled for all Flashbox firmwares
  return true;
};

const grantOpmode = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.25.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantVlanSupport = function(version, model) {
  let ret = { // default return value
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': '',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': false,
    'speedtest_support': false,
    'speedtest_limit': 100,
  };

  if (flashboxFirmwareDevices[model] !== undefined) {
    ret = flashboxFirmwareDevices[model];
  }
  if (version.match(versionRegex)) {
    if (versionCompare(version, '0.31.0') >= 0) {
      return ret['vlan_support'];
    } else {
      return false;
    }
  } else {
    // Development version, enable everything by default
    return ret['vlan_support'];
  }
};

const grantWanBytesSupport = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.25.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPonSignalSupport = function(version, model) {
  if (Object.keys(tr069Devices).includes(model) &&
      tr069Devices[model].feature_support.pon_signal
  ) {
    // Compatible TR-069 ONU
    return true;
  } else {
    return false;
  }
};

const grantMeshMode = function(version, model) {
  if (version.match(versionRegex)) {
    if (!model || !Object.keys(flashboxFirmwareDevices).includes(model)) {
      // Unspecified model
      return false;
    }
    if (!flashboxFirmwareDevices[model].mesh_support) {
      // Model is not compatible with feature
      return false;
    }
    return (versionCompare(version, '0.27.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantUpdateAck = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.27.0') >= 0);
  } else {
    // Development version, no way to know version so disable by default
    return false;
  }
};

const grantWpsFunction = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.wps;
  }
  if (version.match(versionRegex)) {
    if (!model || !Object.keys(flashboxFirmwareDevices).includes(model)) {
      // Unspecified model
      return false;
    }
    if (!flashboxFirmwareDevices[model].wps_support) {
      // Model is not compatible with feature
      return false;
    }
    return (versionCompare(version, '0.28.0') >= 0);
  } else {
    // Development version, no way to know version so disable by default
    return true;
  }
};

DeviceVersion.findByVersion = function(version, is5ghzCapable, model) {
  let result = {};
  result.grantViewLogs = grantViewLogs(version);
  result.grantResetDevices = grantResetDevices(version);
  result.grantPortForward = grantPortForward(version, model);
  result.grantPortForwardAsym = grantPortForwardAsym(version);
  result.grantPortOpenIpv6 = grantPortOpenIpv6(version);
  result.grantWifi5ghz = grantWifi5ghz(version, is5ghzCapable);
  result.grantWifiBand = grantWifiBand(version);
  result.grantWifiBandAuto = grantWifiBandAuto(version);
  result.grantWifiState = grantWifiState(version);
  result.grantWifiPowerHiddenIpv6Box = grantWifiPowerHiddenIpv6(version);
  result.grantWifiExtendedChannels = grantWifiExtendedChannels(version, model);
  result.grantPingTest = grantPingTest(version);
  result.grantLanEdit = grantLanEdit(version);
  result.grantLanGwEdit = grantLanGwEdit(version);
  result.grantLanDevices = grantLanDevices(version);
  result.grantSiteSurvey = grantSiteSurvey(version);
  result.grantUpnp = grantUpnp(version, model);
  result.grantSpeedTest = grantSpeedTest(version, model);
  result.grantSpeedTestLimit = grantSpeedTestLimit(version, model);
  result.grantBlockDevices = grantBlockDevices(model);
  result.grantOpmode = grantOpmode(version);
  result.grantVlanSupport = grantVlanSupport(version, model);
  result.grantWanBytesSupport = grantWanBytesSupport(version);
  result.grantPonSignalSupport = grantPonSignalSupport(version, model);
  result.grantMeshMode = grantMeshMode(version, model);
  result.grantUpdateAck = grantUpdateAck(version);
  result.grantWpsFunction = grantWpsFunction(version, model);
  if (result.grantPortForward && Object.keys(tr069Devices).includes(model)) {
    result.grantPortForwardOpts =
      DeviceVersion.getPortForwardTr069Compatibility(model, version);
  }
  return result;
};


DeviceVersion.getPortsQuantity = function(model) {
  // to check the list of supported devices and the quantity of ports
  let ret = 4;
  // The default quantity of ports is 4, as checked
  if (Object.keys(flashboxFirmwareDevices).includes(model)) {
    ret = flashboxFirmwareDevices[model].num_usable_lan_ports;
  }
  return ret;
};

DeviceVersion.getDeviceInfo = function(model) {
  let ret = { // default return value
    'vlan_support': false,
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': '',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'wps_support': false,
    'speedtest_support': false,
    'speedtest_limit': 100,
  };

  if (flashboxFirmwareDevices[model] !== undefined) {
    ret = flashboxFirmwareDevices[model];
  }

  return ret;
};

DeviceVersion.getVlanCompatible = function() {
  let vlanCompatible = Object.fromEntries(
    Object.entries(flashboxFirmwareDevices).filter(
      ([k, device]) => device.vlan_support));
  return Object.keys(vlanCompatible);
};

DeviceVersion.getPortForwardTr069Compatibility = function(model, version) {
  return tr069Devices[model].port_forward_opts[version];
};

DeviceVersion.getTr069ProductClassList = function() {
  let ret = [];
  for (let [model, obj] of Object.entries(tr069Devices)) {
    ret.push(model);
  }
  return ret;
};

DeviceVersion.getTr069VersionByModel = function(model) {
  let ret = [];
  if (tr069Devices.hasOwnProperty(model)) {
    for (let [ver, obj] of
     Object.entries(tr069Devices[model].versions_upgrade)) {
      ret.push(ver);
    }
  }
  return ret;
};

DeviceVersion.getAlltr069Devices = function() {
  return tr069Devices;
};

module.exports = DeviceVersion;
