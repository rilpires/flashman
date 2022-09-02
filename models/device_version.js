const util = require('../controllers/handlers/util');
const DevicesAPI = require('../controllers/external-genieacs/devices-api');

let DeviceVersion = {};

const versionRegex = util.flashboxVersionRegex;
const devVersionRegex = util.flashboxDevVerRegex;

const flashboxFirmwareDevices = {
  'W5-1200FV1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [1, 2, 3],
    'num_usable_lan_ports': 3,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ACTIONRF1200V1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [3, 2, 1],
    'num_usable_lan_ports': 3,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ACTIONRG1200V1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [2, 1, 0],
    'num_usable_lan_ports': 3,
    'wan_port': 3,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '8367r',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC2V1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 31,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 300,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC5V4': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [3, 2, 1, 0],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 5,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 300,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC20V1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [3, 4, 1, 2],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7620',
    'wifi_chip': '',
    'max_vid': 15,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC20V4': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC20V5': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC20V5PRESET': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC50V3': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC50V4': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC60V2': {
    'vlan_support': false, // even though it's in openwrt 19 it splits wan/lan
                           // into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC60V3': {
    'vlan_support': false, // even though it's in openwrt 19 it splits
                           // wan/lan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC6V2US': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [2, 3, 4, 5],
    'num_usable_lan_ports': 4,
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'ARCHERC7V5': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [2, 3, 4, 5],
    'num_usable_lan_ports': 4,
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 300,
    'wifi2_extended_channels_support': false,
  },
  'COVR-C1200A1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [2],
    'num_usable_lan_ports': 1,
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'DIR-819A1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 15,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'DIR-815D1': {
    'vlan_support': false,
    'vlan_support_since': '1.0.0',
    'lan_ports': [0, 1, 2, 3],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'DWR-116A1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [0, 1, 2, 3],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 15,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'DWR-116A2': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [0, 1, 2, 3],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 15,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'DWR-116A3': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [0, 1, 2, 3],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 15,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'EMG1702-T10AA1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 15,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'EC220-G5V2': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [2, 1, 0],
    'num_usable_lan_ports': 3,
    'wan_port': 3,
    'cpu_port': 5,
    'soc': 'ramips',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 300,
    'wifi2_extended_channels_support': false,
  },
  'GWR1200ACV1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [1, 2, 3],
    'num_usable_lan_ports': 3,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '8367r',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'GWR1200ACV2': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [1, 2, 3],
    'num_usable_lan_ports': 3,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '83xx',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'GWR300NV1': {
    'vlan_support': false, // Frozen in kernel 3 without VLAN support
    'vlan_support_since': '1.0.0',
    'lan_ports': [0, 1, 2, 3],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': false,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'GF1200V1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [3, 2, 1],
    'num_usable_lan_ports': 3,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'MAXLINKAC1200GV1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [1, 2, 3],
    'num_usable_lan_ports': 3,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '8367r',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'NCLOUD': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': '',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'RE708V1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [0, 1, 2, 3],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '8367r',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 200,
    'wifi2_extended_channels_support': false,
  },
  'RE172V1': {
    'vlan_support': false, // Frozen in kernel 3 without VLAN support
    'vlan_support_since': '1.0.0',
    'lan_ports': [0, 1, 2, 3],
    'num_usable_lan_ports': 4,
    'wan_port': 4,
    'cpu_port': 6,
    'soc': 'realtek',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': false,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-MR3020V1': {
    'vlan_support': false, // even though it's in openwrt 19
                           // it doesn't have lan ports
    'vlan_support_since': '1.0.0',
    'lan_ports': [],
    'num_usable_lan_ports': 0,
    'wan_port': 0,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': false,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WDR3500V1': {
    'vlan_support': false, // even though it's in openwrt 19 it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WDR3600V1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [2, 3, 4, 5],
    'num_usable_lan_ports': 4,
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 150,
    'wifi2_extended_channels_support': false,
  },
  'TL-WDR4300V1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [2, 3, 4, 5],
    'num_usable_lan_ports': 4,
    'wan_port': 1,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': true,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 150,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR2543N/NDV1': {
    'vlan_support': true,
    'vlan_support_since': '0.30.2',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 9,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 31,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 120,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR740N/NDV4': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [2, 3, 4, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR740NDV4': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [2, 3, 4, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR740N/NDV5': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [2, 3, 4, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR740NDV5': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [2, 3, 4, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR740N/NDV6': {
    'vlan_support': false, // it splits
                           // wan/lan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR740NDV6': {
    'vlan_support': false, // it splits
                           // wan/lan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR741N/NDV4': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [2, 3, 4, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR741NDV4': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [2, 3, 4, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR741N/NDV5': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [2, 3, 4, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR741NDV5': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [2, 3, 4, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR840NV4': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR840NV5': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR840NV6': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR840NV62': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR840NV5PRESET': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR840NV6PRESET': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR841N/NDV7': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 1,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR841NDV7': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR841N/NDV8': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [2, 3, 4, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR841NDV8': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [2, 3, 4, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR842N/NDV3': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR842NDV3': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ath79',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR849NV4': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR849NV5': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR849NV6': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR849NV62': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR940NV4': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR940NV5': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR940NV6': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR949NV6': {
    'vlan_support': false, // it splits
                           // lan/wan into different interfaces
    'vlan_support_since': '1.0.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 5,
    'cpu_port': 0,
    'soc': 'ar71xx',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': true,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR845NV3': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
  'TL-WR845NV4': {
    'vlan_support': true,
    'vlan_support_since': '0.32.0',
    'lan_ports': [4, 3, 2, 1],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': 'ramips',
    'network_chip': 'mt7628',
    'wifi_chip': '',
    'max_vid': 4094,
    'mesh_support': false,
    'mesh_v2_primary_support': true,
    'mesh_v2_secondary_support': true,
    'wps_support': false,
    'speedtest_support': true,
    'speedtest_limit': 100,
    'wifi2_extended_channels_support': false,
  },
};

DeviceVersion.versionCompare = function(foo, bar) {
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

const grantViewLogs = function(version, model) {
  // Enabled in all supported versions
  return true;
};

const grantResetDevices = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.10.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPortForward = function(version, model) {
  if (version.match(versionRegex)) {
    // Oficial Flashbox firmware
    return (DeviceVersion.versionCompare(version, '0.10.0') >= 0);
  } else if (version.match(devVersionRegex)) {
    // Development version, enable everything by default
    return true;
  } else {
    // Unknown device and or version
    return false;
  }
};

const grantPortForwardAsym = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.14.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPortOpenIpv6 = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.15.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifi2ghzEdit = function(version, model) {
  // Every firmware has this feature
  return true;
};

const grantWifi5ghz = function(version, is5ghzCapable, model) {
  if (version.match(versionRegex)) {
    return (is5ghzCapable && (DeviceVersion.versionCompare(version,
                                                           '0.13.0') >= 0));
  } else {
    // Development version, enable everything by default
    return is5ghzCapable;
  }
};

const grantWifiBand = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifiBandAuto = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.29.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifiPowerHiddenIpv6 = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.28.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifiState = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.23.0') >= 0);
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
  } else {
    return false;
  }
};

const grantPingTest = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantLanRead = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantLanEdit = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

// Capability of the LAN Gateway IP being different from the first available IP
const grantLanGwEdit = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.23.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantLanDevices = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.14.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantSiteSurvey = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.29.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantUpnp = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.21.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

// WAN and LAN Information
const grantWanLanInformation = function(version) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.34.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

// Traceroute
const grantTraceroute = function(version) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.35.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantSpeedTest = function(version, model) {
  if (version.match(versionRegex)) {
    if (!model || !Object.keys(flashboxFirmwareDevices).includes(model)) {
      // Unspecified model
      return false;
    }
    if (!flashboxFirmwareDevices[model].speedtest_support) {
      // Model is not compatible with feature
      return false;
    }
    return (DeviceVersion.versionCompare(version, '0.24.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};


const grantSpeedTestLimit = function(version, model) {
  if (grantSpeedTest(version, model) &&
      Object.keys(flashboxFirmwareDevices).includes(model)) {
    return flashboxFirmwareDevices[model].speedtest_limit;
  }

  return 0;
};

const grantBlockDevices = function(model) {
  // Enabled for all Flashbox firmwares
  return true;
};

const grantBlockWiredDevices = function(model) {
  // Enabled for all Flashbox firmwares
  return true;
};

const grantOpmode = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.25.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantVlanSupport = function(version, model) {
  let ret = { // default return value
    'vlan_support': false,
    'vlan_support_since': '0.30.2',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': '',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
    'wps_support': false,
    'speedtest_support': false,
    'speedtest_limit': 100,
  };

  if (flashboxFirmwareDevices[model] !== undefined) {
    ret = flashboxFirmwareDevices[model];
  }
  if (version.match(versionRegex)) {
    if (DeviceVersion.versionCompare(version, ret['vlan_support_since']) >= 0) {
      return ret['vlan_support'];
    } else {
      return false;
    }
  } else {
    // Development version, enable everything by default
    return ret['vlan_support'];
  }
};

const grantStatisticsSupport = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.25.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPonSignalSupport = function(model) {
  return false;
};

const grantMeshV1Mode = function(version, model) {
  if (version.match(versionRegex)) {
    if (!model || !Object.keys(flashboxFirmwareDevices).includes(model)) {
      // Unspecified model
      return false;
    }
    if (!flashboxFirmwareDevices[model].mesh_support) {
      // Model is not compatible with feature
      return false;
    }
    return (DeviceVersion.versionCompare(version, '0.27.0') >= 0 &&
    DeviceVersion.versionCompare(version, '0.32.0') < 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

// No need to check version, just used to check if device in correct release
// could be a mesh v2 primary device
const grantMeshV2PrimaryModeUpgrade = function(version, model) {
  if (version.match(versionRegex)) {
    if (!model || !Object.keys(flashboxFirmwareDevices).includes(model)) {
      // Unspecified model
      return false;
    }
    if (!flashboxFirmwareDevices[model].mesh_v2_primary_support) {
      // Model is not compatible with feature
      return false;
    }
    return true;
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantMeshV2PrimaryMode = function(version, model) {
  if (grantMeshV2PrimaryModeUpgrade(version, model)) {
    return (DeviceVersion.versionCompare(version, '0.32.0') >= 0);
  } else {
    return false;
  }
};

// No need to check version, just used to check if device in correct release
// could be a mesh v2 secondary device
const grantMeshV2SecondaryModeUpgrade = function(version, model) {
  if (version.match(versionRegex)) {
    if (!model || !Object.keys(flashboxFirmwareDevices).includes(model)) {
      // Unspecified model
      return false;
    }
    if (!flashboxFirmwareDevices[model].mesh_v2_secondary_support) {
      // Model is not compatible with feature
      return false;
    }
    return true;
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantMeshV2SecondaryMode = function(version, model) {
  if (grantMeshV2SecondaryModeUpgrade(version, model)) {
    return (DeviceVersion.versionCompare(version, '0.32.0') >= 0);
  } else {
    return false;
  }
};

const grantMeshV2HardcodedBssid = function(model) {
  return false;
};

const grantUpdateAck = function(version, model) {
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.27.0') >= 0);
  } else {
    // Development version, no way to know version so disable by default
    return false;
  }
};

const grantWpsFunction = function(version, model) {
  if (version.match(versionRegex)) {
    if (!model || !Object.keys(flashboxFirmwareDevices).includes(model)) {
      // Unspecified model
      return false;
    }
    if (!flashboxFirmwareDevices[model].wps_support) {
      // Model is not compatible with feature
      return false;
    }
    return (DeviceVersion.versionCompare(version, '0.28.0') >= 0);
  } else {
    // Development version, no way to know version so disable by default
    return true;
  }
};

const grantWiFiAXSupport = function(model) {
  // Firmware CPEs do not have AX mode support
  return false;
};

const hasSTUNSupport = function(model) {
  return false;
};

const grantMeshVAPObject = function(model) {
  return false;
};

const grantDiacritics = function(model) {
  return false;
};

const convertTR069Permissions = function(cpePermissions) {
  let permissions = {
    grantViewLogs: false,
    grantResetDevices: false,
    grantPortForward: cpePermissions.features.portForward,
    grantPortForwardAsym: false,
    grantPortOpenIpv6: false,
    grantDiacritics: cpePermissions.wifi.allowDiacritics,
    grantWifi2ghzEdit: cpePermissions.wifi.ssidWrite,
    grantWifi5ghz: cpePermissions.wifi.dualBand,
    grantWifiModeRead: cpePermissions.wifi.modeRead,
    grantWifiModeEdit: cpePermissions.wifi.modeWrite,
    grantWifiBandRead2: cpePermissions.wifi.bandRead2,
    grantWifiBandRead5: cpePermissions.wifi.bandRead5,
    grantWifiBandEdit2: cpePermissions.wifi.bandWrite2,
    grantWifiBandEdit5: cpePermissions.wifi.bandWrite5,
    grantWifiBandAuto2: cpePermissions.wifi.bandAuto2,
    grantWifiBandAuto5: cpePermissions.wifi.bandAuto5,
    grantWifi5ChannelList: cpePermissions.wifi.list5ghzChannels,
    grantWifiState: true,
    grantWifiPowerHiddenIpv6Box: false,
    grantWifiExtendedChannels: cpePermissions.wifi.extended2GhzChannels,
    grantPingTest: cpePermissions.features.pingTest,
    grantLanRead: cpePermissions.lan.configRead,
    grantLanEdit: cpePermissions.lan.configWrite,
    grantLanGwEdit: cpePermissions.lan.configWrite,
    grantLanDevices: cpePermissions.lan.listLANDevices,
    grantSiteSurvey: cpePermissions.features.siteSurvey,
    grantUpnp: false,
    grantSpeedTest: cpePermissions.features.speedTest,
    grantSpeedTestLimit: cpePermissions.wan.speedTestLimit,
    grantBlockDevices: cpePermissions.lan.blockLANDevices,
    grantBlockWiredDevices: cpePermissions.lan.blockWiredLANDevices,
    grantOpmode: cpePermissions.features.meshCable ||
      cpePermissions.features.meshWifi,
    grantVlanSupport: false,
    grantStatisticsSupport: true,
    grantPonSignalSupport: cpePermissions.features.ponSignal,
    grantMeshMode: false,
    grantMeshV2PrimaryModeUpgrade: false,
    grantMeshV2PrimaryModeCable: cpePermissions.features.meshCable,
    grantMeshV2PrimaryModeWifi: cpePermissions.features.meshWifi,
    grantMeshV2SecondaryModeUpgrade: false,
    grantMeshV2SecondaryMode: false,
    grantMeshV2HardcodedBssid: cpePermissions.mesh.hardcodedBSSIDOffset,
    grantMeshVAPObject: cpePermissions.mesh.objectExists,
    grantUpdateAck: false,
    grantWpsFunction: false,
    grantSTUN: cpePermissions.features.stun,
    grantWiFiAXSupport: cpePermissions.wifi.axWiFiMode,
    grantWanLanInformation: false,
    grantTraceroute: false,
  };
  if (permissions.grantPortForward) {
    permissions.grantPortForwardOpts =
      cpePermissions.wan.portForwardPermissions;
  }
  return permissions;
};

DeviceVersion.devicePermissionsNotRegistered = function(
  model, modelName, fwVersion,
) {
  // Only TR-069 instances should call this function
  let cpeResult = DevicesAPI.instantiateCPEByModel(model, modelName, fwVersion);
  if (cpeResult.success) {
    return convertTR069Permissions(cpeResult.cpe.modelPermissions());
  }
  return null;
};

DeviceVersion.devicePermissionsNotRegisteredFirmware = function(
  version, is5ghzCapable, model,
) {
  // Only Anlix firmware instances should call this function
  return DeviceVersion.devicePermissions({
    version: version,
    wifi_is_5ghz_capable: is5ghzCapable,
    model: model,
  });
};

DeviceVersion.devicePermissions = function(device) {
  // TR-069 instances have a separate flow
  let cpeResult = DevicesAPI.instantiateCPEByModelFromDevice(device);
  if (cpeResult.success) {
    return convertTR069Permissions(cpeResult.cpe.modelPermissions());
  }
  // Firmware instances use the legacy flow
  // WARNING!! If adding a new field to be read from "device" below, make sure
  // you alter the call in devicePermissionsNotRegisteredFirmware right above,
  // and wherever others call that function
  let version = device.version;
  let model = device.model;
  let is5ghzCapable = device.wifi_is_5ghz_capable;
  let result = {};
  result.grantViewLogs = grantViewLogs(version, model);
  result.grantResetDevices = grantResetDevices(version, model);
  result.grantPortForward = grantPortForward(version, model);
  result.grantPortForwardAsym = grantPortForwardAsym(version, model);
  result.grantPortOpenIpv6 = grantPortOpenIpv6(version, model);
  result.grantDiacritics = grantDiacritics(version, model);
  result.grantWifi2ghzEdit = grantWifi2ghzEdit(version, model);
  result.grantWifi5ghz = grantWifi5ghz(version, is5ghzCapable);
  result.grantWifiModeRead = grantWifiBand(version, model);
  result.grantWifiModeEdit = grantWifiBand(version, model);
  result.grantWifiBandRead2 = grantWifiBand(version, model);
  result.grantWifiBandRead5 = grantWifiBand(version, model);
  result.grantWifiBandEdit2 = grantWifiBand(version, model);
  result.grantWifiBandEdit5 = grantWifiBand(version, model);
  result.grantWifiBandAuto2 = grantWifiBandAuto(version, model);
  result.grantWifiBandAuto5 = grantWifiBandAuto(version, model);
  result.grantWifi5ChannelList = [36, 40, 44, 48, 149, 153, 157, 161, 165];
  result.grantWifiState = grantWifiState(version, model);
  result.grantWifiPowerHiddenIpv6Box = grantWifiPowerHiddenIpv6(version, model);
  result.grantWifiExtendedChannels = grantWifiExtendedChannels(version, model);
  result.grantPingTest = grantPingTest(version, model);
  result.grantLanRead = grantLanRead(version, model);
  result.grantLanEdit = grantLanEdit(version, model);
  result.grantLanGwEdit = grantLanGwEdit(version, model);
  result.grantLanDevices = grantLanDevices(version, model);
  result.grantSiteSurvey = grantSiteSurvey(version, model);
  result.grantUpnp = grantUpnp(version, model);
  result.grantSpeedTest = grantSpeedTest(version, model);
  result.grantSpeedTestLimit = grantSpeedTestLimit(version, model);
  result.grantBlockDevices = grantBlockDevices(model);
  result.grantBlockWiredDevices = grantBlockWiredDevices(model);
  result.grantOpmode = grantOpmode(version, model);
  result.grantVlanSupport = grantVlanSupport(version, model);
  result.grantStatisticsSupport = grantStatisticsSupport(version, model);
  result.grantPonSignalSupport = grantPonSignalSupport(model);
  result.grantMeshMode = grantMeshV1Mode(version, model);
  result.grantMeshV2PrimaryModeUpgrade =
    grantMeshV2PrimaryModeUpgrade(version, model);
  result.grantMeshV2PrimaryModeCable = grantMeshV2PrimaryMode(version, model);
  result.grantMeshV2PrimaryModeWifi = result.grantMeshV2PrimaryModeCable;
  result.grantMeshV2SecondaryModeUpgrade =
    grantMeshV2SecondaryModeUpgrade(version, model);
  result.grantMeshV2SecondaryMode = grantMeshV2SecondaryMode(version, model);
  result.grantMeshV2HardcodedBssid = grantMeshV2HardcodedBssid(model);
  result.grantMeshVAPObject = grantMeshVAPObject(model);
  result.grantUpdateAck = grantUpdateAck(version, model);
  result.grantWpsFunction = grantWpsFunction(version, model);
  result.grantSTUN = hasSTUNSupport(model);
  result.grantWiFiAXSupport = grantWiFiAXSupport(model);
  result.grantWanLanInformation = grantWanLanInformation(version);
  result.grantTraceroute = grantTraceroute(version);
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
    'vlan_support_since': '0.30.2',
    'lan_ports': [1, 2, 3, 4],
    'num_usable_lan_ports': 4,
    'wan_port': 0,
    'cpu_port': 6,
    'soc': '',
    'network_chip': '',
    'wifi_chip': '',
    'max_vid': 0,
    'mesh_support': false,
    'mesh_v2_primary_support': false,
    'mesh_v2_secondary_support': false,
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

DeviceVersion.mapFirmwareUpgradeMesh = function(curVersion, nextVersion) {
  let result = {unknownVersion: false, current: 0, upgrade: 0};
  const currVer = util.returnStrOrEmptyStr(curVersion);
  const nextVer = util.returnStrOrEmptyStr(nextVersion);
  if (currVer.match(versionRegex) && nextVer.match(versionRegex)) {
    if (DeviceVersion.versionCompare(currVer, '0.32.0') < 0) {
      result.current = 1;
    } else {
      result.current = 2;
    }
    if (DeviceVersion.versionCompare(nextVer, '0.32.0') < 0) {
      result.upgrade = 1;
    } else {
      result.upgrade = 2;
    }
  } else {
    // either current or target release are development version
    result.unknownVersion = true;
  }
  return result;
};

module.exports = DeviceVersion;
