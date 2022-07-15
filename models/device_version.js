const util = require('../controllers/handlers/util');

let DeviceVersion = {};

const versionRegex = util.flashboxVersionRegex;
const devVersionRegex = util.flashboxDevVerRegex;

const portForwardNoRanges = {
 simpleSymmetric: true,
 simpleAsymmetric: true,
 rangeSymmetric: false,
 rangeAsymmetric: false,
};

const portForwardNoAsym = {
 simpleSymmetric: true,
 simpleAsymmetric: false,
 rangeSymmetric: true,
 rangeAsymmetric: false,
};

const portForwardNoAsymRanges = {
 simpleSymmetric: true,
 simpleAsymmetric: true,
 rangeSymmetric: true,
 rangeAsymmetric: false,
};

const portForwardFullSupport = {
 simpleSymmetric: true,
 simpleAsymmetric: true,
 rangeSymmetric: true,
 rangeAsymmetric: true,
};

const tr069Devices = {
  'F660': {
    vendor: 'Multilaser',
    versions_upgrade: {
      'V7.1.10P1T1': [],
      'V7.1.10P1T2': ['V7.1.10P1N8'],
      'V7.1.10P1N8': [],
    },
    port_forward_opts: {
      'V7.1.10P1T1': portForwardNoRanges,
      'V7.1.10P1T2': portForwardNoRanges,
      'V7.1.10P1N8': portForwardNoRanges,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: true,
      block_wired_devices: false,
      connected_devices: true,
      pon_signal: true,
      firmware_upgrade: true,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: true,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x2', '0x0', '0x0', '0x0', '0x0', '0x0'],
    mesh5_bssid_offset: ['0x2', '0x0', '0x0', '0x0', '0x0', '0x2'],
    mesh_ssid_object_exists: true,
  },
  'F670L': {
    vendor: 'Multilaser',
    versions_upgrade: {
      'V1.1.20P1T4': ['V1.1.20P1T18', 'V1.1.20P3N3'],
      'V1.1.20P1T18': ['V1.1.20P3N3'],
      'V1.1.20P3N3': ['V1.1.20P3N4D', 'V1.1.20P3N6B'],
      'V1.1.20P3N4C': ['V1.1.20P3N4D'],
      'V1.1.20P3N4D': ['V1.1.20P3N6B'],
      'V1.1.20P3N6B': [],
    },
    port_forward_opts: {
      'V1.1.20P1T18': portForwardNoRanges,
      'V1.1.20P1T4': portForwardNoRanges,
      'V1.1.20P3N3': portForwardNoRanges,
      'V1.1.20P3N4C': portForwardNoRanges,
      'V1.1.20P3N4D': portForwardNoRanges,
      'V1.1.20P3N6B': portForwardNoRanges,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: true,
      block_wired_devices: false,
      connected_devices: true,
      pon_signal: true,
      firmware_upgrade: true,
      stun: false,
      mesh_v2_primary_support: true,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x2', '0x0', '0x0', '0x0', '0x0', '0x0'],
    mesh5_bssid_offset: ['0x2', '0x0', '0x0', '0x0', '0x0', '0x2'],
    mesh_ssid_object_exists: true,
  },
  'F680': {
    vendor: 'Multilaser',
    versions_upgrade: {
      'V6.0.10P3N9': ['V6.0.10P3N12B'],
      'V6.0.10P3N12B': [],
    },
    port_forward_opts: {
      'V6.0.10P3N9': portForwardNoAsymRanges,
      'V6.0.10P3N12B': portForwardNoAsymRanges,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: true,
      block_wired_devices: false,
      connected_devices: true,
      pon_signal: true,
      firmware_upgrade: true,
      stun: false,
      mesh_v2_primary_support: true,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x2', '0x0', '0x0', '-0x20', '0x0', '0x0'],
    mesh5_bssid_offset: ['0x2', '0x0', '0x0', '-0x20', '0x0', '0x2'],
    mesh_ssid_object_exists: true,
  },
  'ZXHN H198A V3.0': {
    vendor: 'Multilaser',
    versions_upgrade: {
      'V3.0.0C5_MUL': ['V3.0.0C6_MUL'],
      'V3.0.0C6_MUL': [],
    },
    port_forward_opts: {
      'V3.0.0C5_MUL': portForwardNoAsymRanges,
      'V3.0.0C6_MUL': portForwardNoAsymRanges,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 100,
      block_devices: true,
      block_wired_devices: false,
      connected_devices: true,
      pon_signal: false,
      firmware_upgrade: true,
      stun: true,
      mesh_v2_primary_support: true,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
    mesh_ssid_object_exists: true,
  },
  'ZT199': {
    vendor: 'Multilaser',
    versions_upgrade: {
      'V9.1.0P3_MUL': [],
    },
    port_forward_opts: {
      'V9.1.0P3_MUL': portForwardNoAsymRanges,

    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 550,
      block_devices: true,
      block_wired_devices: false,
      connected_devices: true,
      pon_signal: false,
      firmware_upgrade: false,
      stun: true,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x2', '0x0', '0x0', '-0x20', '0x0', '0x0'],
    mesh5_bssid_offset: ['0x2', '0x0', '0x0', '-0x20', '0x0', '0x1'],
    mesh_ssid_object_exists: true,
  },
  'ZXHN H199A': {
    vendor: 'Multilaser',
    versions_upgrade: {
      'V9.1.0P1_MUL': ['V9.1.0P3N2_MUL', 'V9.1.0P4N1_MUL'],
      'V9.1.0P3N2_MUL': ['V9.1.0P4N1_MUL'],
      'V9.1.0P4N1_MUL': [],
    },
    port_forward_opts: {
      'V9.1.0P1_MUL': portForwardNoAsymRanges,
      'V9.1.0P3N2_MUL': portForwardNoAsymRanges,
      'V9.1.0P4N1_MUL': portForwardNoAsymRanges,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 550,
      block_devices: true,
      block_wired_devices: false,
      connected_devices: true,
      pon_signal: false,
      firmware_upgrade: true,
      stun: true,
      mesh_v2_primary_support: true,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x2', '0x0', '0x0', '-0x20', '0x0', '0x0'],
    mesh5_bssid_offset: ['0x2', '0x0', '0x0', '-0x20', '0x0', '0x1'],
    mesh_ssid_object_exists: true,
  },
  'GWR-1200AC': {
    versions_upgrade: {
      '638.112.100.1383': [],
    },
    port_forward_opts: {
      '638.112.100.1383': portForwardNoRanges,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: false,
      wifi_ax_mode: false,
      port_forward: true,
      pon_signal: false,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 300,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: true,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: false,
    mesh_bssid_offset_hardcoded: true,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x6'],
    mesh5_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x1'],
    mesh_ssid_object_exists: true,
  },
  'GONUAC001': {
    vendor: 'Greatek',
    versions_upgrade: {
      'V1.2.3': [],
    },
    port_forward_opts: {
      'V1.2.3': portForwardFullSupport,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 250,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: false,
    mesh_bssid_offset_hardcoded: true,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x6'],
    mesh5_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x1'],
    mesh_ssid_object_exists: true,
  },
  'GONUAC002': {
    vendor: 'Greatek',
    versions_upgrade: {
      'V2.2.0': [],
      'V2.2.3': [],
      'V2.2.7': [],
    },
    port_forward_opts: {
      'V2.2.0': portForwardFullSupport,
      'V2.2.3': portForwardFullSupport,
      'V2.2.7': portForwardFullSupport,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 250,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: false,
    mesh_bssid_offset_hardcoded: true,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x6'],
    mesh5_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x1'],
    mesh_ssid_object_exists: true,
  },
  'MP-G421R': {
    vendor: 'UNEE',
    versions_upgrade: {
      'V1.2.9': [],
      'V1.3.4': [],
    },
    port_forward_opts: {
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: true,
      upnp: false,
      wps: false,
      stun: false,
      speed_test: true,
      speed_test_limit: 300,
      ping_test: true,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: false,
    mesh_bssid_offset_hardcoded: true,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x6'],
    mesh5_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x1'],
    mesh_ssid_object_exists: true,
  },
  'HG9': {
    vendor: 'Tenda',
    versions_upgrade: {
      'v1.0.1': [],
    },
    port_forward_opts: {
      'v1.0.1': portForwardFullSupport,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      pon_signal: true,
      upnp: false,
      wps: false,
      stun: false,
      speed_test: false,
      speed_test_limit: 0,
      ping_test: true,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: true,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x6'],
    mesh5_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x1'],
    mesh_ssid_object_exists: true,
  },
  'IGD': {
    vendor: 'Realtek',
    versions_upgrade: {
      'V2.0.08-191129': [],
    },
    port_forward_opts: {
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 250,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: true,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x5'],
    mesh5_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x1'],
  },
  'FW323DAC': {
    vendor: 'Realtek',
    versions_upgrade: {
      'V2.0.08-191129': [],
    },
    port_forward_opts: {
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 250,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: true,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x5'],
    mesh5_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x1'],
  },
  'BEACON 1 HA-020W-B': {
    vendor: 'Nokia',
    versions_upgrade: {
      '3FE49127HJII42': [],
    },
    port_forward_opts: {
      '3FE49127HJII42': portForwardNoAsymRanges,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      pon_signal: false, // no fiber
      upnp: false,
      speed_test: true,
      speed_test_limit: 800,
      ping_test: true,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: false,
    mesh_bssid_offset_hardcoded: true,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x6'],
    mesh5_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x1'],
    mesh_ssid_object_exists: true,
  },
  'G-2425G-A': {
    vendor: 'Nokia',
    versions_upgrade: {
      '3FE49025IJHK03': [],
    },
    port_forward_opts: {
      '3FE49025IJHK03': portForwardNoRanges,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      pon_signal: true,
      upnp: false,
      speed_test: true,
      speed_test_limit: 850,
      ping_test: true,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wps: false,
      stun: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: false,
    mesh_bssid_offset_hardcoded: false,
  },
  '121AC': {
    vendor: 'Intelbras',
    versions_upgrade: {
      'V210414': ['1.0-210917'],
      '1.0-210917': [],
    },
    port_forward_opts: {
      'V210414': portForwardFullSupport,
      '1.0-210917': portForwardFullSupport,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 350,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: true,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: false,
    mesh_bssid_offset_hardcoded: true,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x3'],
    mesh5_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x2'],
    // Some models have absolute values for some octets of the mesh virtual APs
    // The mask indicates which octets these are and the absolute value
    // indicates what value this is
    mesh2_bssid_absolute_mask: [0, 0, 0, 1, 1, 0],
    mesh5_bssid_absolute_mask: [0, 0, 0, 1, 1, 0],
    mesh2_bssid_absolute: ['0x0', '0x0', '0x0', '0x01', '0x01', '0x0'],
    mesh5_bssid_absolute: ['0x0', '0x0', '0x0', '0x00', '0x00', '0x0'],
    mesh_ssid_object_exists: true,
  },
  'G-140W-C': {
    vendor: 'Nokia',
    versions_upgrade: {
      '3FE46343AFIA57': [],
      '3FE46343AFIA89': [],
      '3FE46343AFIA94': [],
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: true,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x2', '0x0', '0x0', '0x0', '0x0', '0x4'],
    mesh5_bssid_offset: ['0x2', '0x0', '0x0', '-0x1', '0x0', '0x0'],
    mesh_ssid_object_exists: true,
  },
  'G-140W-CS': {
    vendor: 'Nokia',
    versions_upgrade: {
      '3FE46343AFIA94': [],
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: true,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x2', '0x0', '0x0', '0x0', '0x0', '0x4'],
    mesh5_bssid_offset: ['0x2', '0x0', '0x0', '-0x1', '0x0', '0x0'],
    mesh_ssid_object_exists: true,
  },
  'G-140W-UD': {
    vendor: 'Nokia',
    versions_upgrade: {
      '3FE46343AFIA94': [],
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: true,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x2', '0x0', '0x0', '0x0', '0x0', '0x4'],
    mesh5_bssid_offset: ['0x2', '0x0', '0x0', '-0x1', '0x0', '0x0'],
    mesh_ssid_object_exists: true,
  },
  'HG8245Q2': {
    vendor: 'Huawei',
    versions_upgrade: {
      'V3R017C10S100': [],
    },
    port_forward_opts: {
      'V3R017C10S100': portForwardNoAsymRanges,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 250,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: true,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x7'],
    mesh5_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x8'],
    mesh_ssid_object_exists: false,
  },
  'EG8145V5': {
    port_forward_opts: {
      'V5R019C10S350': portForwardNoAsymRanges,
      'V5R020C00S280': portForwardNoAsymRanges,
    },
    vendor: 'Huawei',
    versions_upgrade: {
      'V5R019C10S350': ['V5R020C00S280'],
      'V5R020C00S280': [],
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 850,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: true,
      stun: false,
      mesh_v2_primary_support: true,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x7'],
    mesh5_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x8'],
    mesh_ssid_object_exists: false,
  },
  'EG8145X6': {
    port_forward_opts: {
      'V5R020C00S060': portForwardNoAsymRanges,
    },
    vendor: 'Huawei',
    versions_upgrade: {
      'V5R020C00S060': [],
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: true,
      port_forward: true,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 700,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
  },
  'HG8121H': {
    vendor: 'Huawei',
    versions_upgrade: {
      'V3R018C00S128': [],
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 150,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: true,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: false,
    mesh_ssid_object_exists: false,
  },
  'WS5200-21': {
    vendor: 'Huawei',
    versions_upgrade: {
      '10.0.5.9(C506)': [],
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: false,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
  },
  'WS5200-40': {
    vendor: 'Huawei',
    versions_upgrade: {
      '10.0.5.5(C947)': [],
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: false,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
  },
  'WS7001-40': {
    vendor: 'Huawei',
    versions_upgrade: {
      '2.0.0.315(SP2C947)': [],
    },
    port_forward_opts: {
      '2.0.0.315(SP2C947)': portForwardFullSupport,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: true,
      port_forward: false,
      pon_signal: false,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
  },
  'WS7100-30': {
    vendor: 'Huawei',
    versions_upgrade: {
      '10.0.5.29(C947)': [],
    },
    port_forward_opts: {
      '10.0.5.29(C947)': portForwardFullSupport,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: true,
      port_forward: false,
      pon_signal: false,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
  },
  'DIR-842': {
    vendor: 'DLink',
    versions_upgrade: {
      '3.0.3': [],
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: false,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 180,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
  },
  'DIR-841': {
    vendor: 'DLink',
    versions_upgrade: {
      '3.0.4': [],
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: false,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 180,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
  },
  'DIR-615': {
    vendor: 'DLink',
    versions_upgrade: {
      '3.0.7': [],
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: false,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
  },
  'AC10': {
    vendor: 'Tenda',
    versions_upgrade: {
      'V16.03.06.05_multi_BR01': [],
    },
    port_forward_opts: {
      'V16.03.06.05_multi_BR01': portForwardNoRanges,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      pon_signal: false,
      upnp: false,
      wps: false,
      ping_test: false, // Practical tests doesnt worked properly
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: true,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
  },
  'Archer C6': {
    vendor: 'TP-Link',
    versions_upgrade: {
      '1.0.14 Build 20211118 rel.43110(5553)': [],
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: false,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
  },
  'ST-1001-FL': {
    vendor: 'Hurakall',
    versions_upgrade: {
      'V1.0.8': [],
    },
    port_forward_opts: {
      'V1.0.8': portForwardFullSupport,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: false,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: false,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
  },
  'DM985-424 HW3': {
    vendor: 'Datacom',
    versions_upgrade: {
      'V3.2.0': [],
    },
    port_forward_opts: {
      'V3.2.0': portForwardNoRanges,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: true,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: false,
      speed_test: false,
      speed_test_limit: 0,
      block_devices: false,
      block_wired_devices: false,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      connected_devices: true,
      wan_bytes: true,
    },
  },
  'DM986-414': {
    vendor: 'Datacom',
    versions_upgrade: {
      'V4.6.0-210709': [],
    },
    port_forward_opts: {
      'V4.6.0-210709': portForwardNoRanges,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: true,
      upnp: false,
      wps: false,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 200,
      block_devices: false,
      block_wired_devices: false,
      firmware_upgrade: false,
      stun: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      connected_devices: true,
    },
  },
  'EC220-G5': {
    vendor: 'TP-Link',
    versions_upgrade: {
      '3.16.0 0.9.1 v6055.0 Build 201228 Rel.13643n': [],
    },
    port_forward_opts: {
      '3.16.0 0.9.1 v6055.0 Build 201228 Rel.13643n': portForwardNoRanges,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      pon_signal: false,
      port_forward: true,
      ping_test: true,
      speed_test: true,
      speed_test_limit: 230,
      stun: false,
      upnp: false,
      wps: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
  },
  'EMG3524-T10A': {
    vendor: 'Zyxel',
    versions_upgrade: {
      'V1.42(ABXU.1)b6_0118': [],
    },
    port_forward_opts: {
      'V1.42(ABXU.1)b6_0118': portForwardFullSupport,
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: true,
      lan_read: true,
      lan_edit: true,
      wifi_ax_mode: false,
      port_forward: false,
      pon_signal: false,
      upnp: false,
      wps: false,
      stun: true,
      speed_test: false,
      speed_test_limit: 0,
      ping_test: false,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: true,
    // offset of each BSSID octet in relation
    // to the MAC address (first element corresponds to
    // offset of the leftmost octet, and so forth)
    mesh2_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x6'],
    mesh5_bssid_offset: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x1'],
    mesh_ssid_object_exists: true,
  },
  'P20': {
    vendor: 'PhyHome',
    versions_upgrade: {
      'V6.1.6T1': [],
    },
    feature_support: {
      wifi_ssid_read: true,
      wifi_ssid_write: false,
      lan_read: true,
      lan_edit: false,
      port_forward: false,
      wifi_ax_mode: false,
      pon_signal: true,
      ping_test: false,
      speed_test: false,
      speed_test_limit: 0,
      stun: false,
      upnp: false,
      wps: false,
      block_devices: false,
      block_wired_devices: false,
      connected_devices: true,
      firmware_upgrade: false,
      mesh_v2_primary_support: false,
      mesh_v2_secondary_support: false,
      wan_bytes: true,
    },
    wifi2_extended_channels_support: true,
    mesh_bssid_offset_hardcoded: false,
  },
};

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
  if (Object.keys(tr069Devices).includes(model)) {
    return false;
  }
  // Enabled in all supported versions
  return true;
};

const grantResetDevices = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return false;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.10.0') >= 0);
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
  if (Object.keys(tr069Devices).includes(model)) {
    return false;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.14.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPortOpenIpv6 = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return false;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.15.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifi2ghzEdit = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.wifi_ssid_write;
  }
  // Every firmware has this feature
  return true;
};

const grantWifi5ghz = function(version, is5ghzCapable, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return true;
  }
  if (version.match(versionRegex)) {
    return (is5ghzCapable && (DeviceVersion.versionCompare(version,
                                                           '0.13.0') >= 0));
  } else {
    // Development version, enable everything by default
    return is5ghzCapable;
  }
};

const grantWifiBand = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return true;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifiBandAuto = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return true;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.29.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifiPowerHiddenIpv6 = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return false;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.28.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifiState = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return true;
  }
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
  } else if (Object.keys(tr069Devices).includes(model) &&
             tr069Devices[model].wifi2_extended_channels_support
  ) {
    return true;
  } else {
    return false;
  }
};

const grantPingTest = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.ping_test;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantLanRead = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.lan_read;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantLanEdit = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.lan_edit;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

// Capability of the LAN Gateway IP being different from the first available IP
const grantLanGwEdit = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.lan_edit;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.23.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantLanDevices = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.connected_devices;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.14.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantSiteSurvey = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return false;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.29.0') >= 0);
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
    return (DeviceVersion.versionCompare(version, '0.21.0') >= 0);
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
    return (DeviceVersion.versionCompare(version, '0.24.0') >= 0);
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

const grantBlockWiredDevices = function(model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.block_wired_devices;
  }
  // Enabled for all Flashbox firmwares
  return true;
};

const grantOpmode = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.mesh_v2_primary_support;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.25.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantVlanSupport = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return false;
  }
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

const grantWanBytesSupport = function(version, model) {
  if (Object.keys(tr069Devices).includes(model) &&
      tr069Devices[model].feature_support.wan_bytes
  ) {
    return true;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.25.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPonSignalSupport = function(model) {
  if (Object.keys(tr069Devices).includes(model) &&
      tr069Devices[model].feature_support.pon_signal
  ) {
    // Compatible TR-069 ONU
    return true;
  } else {
    return false;
  }
};

const grantMeshV1Mode = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return false;
  }
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
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.mesh_v2_primary_support;
  }
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
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.mesh_v2_secondary_support;
  }
  if (grantMeshV2SecondaryModeUpgrade(version, model)) {
    return (DeviceVersion.versionCompare(version, '0.32.0') >= 0);
  } else {
    return false;
  }
};

const grantMeshV2HardcodedBssid = function(model) {
  if (Object.keys(tr069Devices).includes(model) &&
      tr069Devices[model].mesh_bssid_offset_hardcoded
  ) {
    return true;
  } else {
    return false;
  }
};

const grantUpdateAck = function(version, model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return false;
  }
  if (version.match(versionRegex)) {
    return (DeviceVersion.versionCompare(version, '0.27.0') >= 0);
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
    return (DeviceVersion.versionCompare(version, '0.28.0') >= 0);
  } else {
    // Development version, no way to know version so disable by default
    return true;
  }
};

const grantWiFiAXSupport = function(model) {
  if (Object.keys(tr069Devices).includes(model)) {
    return tr069Devices[model].feature_support.wifi_ax_mode;
  }
  // Firmware CPEs do not have AX mode support
  return false;
};

const hasSTUNSupport = function(model) {
  let STUNEnable = false;
  if (tr069Devices[model]) {
    STUNEnable = tr069Devices[model].feature_support.stun;
  }
  return STUNEnable;
};

const grantMeshVAPObject = function(model) {
  if (Object.keys(tr069Devices).includes(model) &&
    tr069Devices[model].mesh_ssid_object_exists) {
    return true;
  } else {
    return false;
  }
};

DeviceVersion.findByVersion = function(version, is5ghzCapable, model) {
  let result = {};
  result.grantViewLogs = grantViewLogs(version, model);
  result.grantResetDevices = grantResetDevices(version, model);
  result.grantPortForward = grantPortForward(version, model);
  result.grantPortForwardAsym = grantPortForwardAsym(version, model);
  result.grantPortOpenIpv6 = grantPortOpenIpv6(version, model);
  result.grantWifi2ghzEdit = grantWifi2ghzEdit(version, model);
  result.grantWifi5ghz = grantWifi5ghz(version, is5ghzCapable);
  result.grantWifiBand = grantWifiBand(version, model);
  result.grantWifiBandAuto = grantWifiBandAuto(version, model);
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
  result.grantWanBytesSupport = grantWanBytesSupport(version, model);
  result.grantPonSignalSupport = grantPonSignalSupport(model);
  result.grantMeshMode = grantMeshV1Mode(version, model);
  result.grantMeshV2PrimaryModeUpgrade =
    grantMeshV2PrimaryModeUpgrade(version, model);
  result.grantMeshV2PrimaryMode = grantMeshV2PrimaryMode(version, model);
  result.grantMeshV2SecondaryModeUpgrade =
    grantMeshV2SecondaryModeUpgrade(version, model);
  result.grantMeshV2SecondaryMode = grantMeshV2SecondaryMode(version, model);
  result.grantMeshV2HardcodedBssid = grantMeshV2HardcodedBssid(model);
  result.grantMeshVAPObject = grantMeshVAPObject(model);
  result.grantUpdateAck = grantUpdateAck(version, model);
  result.grantWpsFunction = grantWpsFunction(version, model);
  result.grantSTUN = hasSTUNSupport(model);
  result.grantWiFiAXSupport = grantWiFiAXSupport(model);
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

DeviceVersion.getPortForwardTr069Compatibility = function(model, version) {
  return tr069Devices[model].port_forward_opts[version];
};

DeviceVersion.getTr069ModelsAndVersions = function() {
  let ret = {};
  // only send models that support firmware upgrade
  ret.models = Object.entries(tr069Devices)
    .filter((dev) => dev[1].feature_support.firmware_upgrade)
    .map((dev) => dev[0]);
  ret.versions = {};
  ret.models.forEach((m) => {
    ret.versions[m] = Object.keys(tr069Devices[m].versions_upgrade);
  });
  return ret;
};

DeviceVersion.getVendorByModel = function(model) {
  let ret = '';
  if (tr069Devices[model]) {
    ret = tr069Devices[model].vendor;
  }
  return ret;
};

DeviceVersion.getFirmwaresUpgradesByVersion = function(model, version) {
  let versions = [];
  if (tr069Devices[model]) {
    if (Array.isArray(tr069Devices[model].versions_upgrade[version])) {
      versions = tr069Devices[model].versions_upgrade[version];
    }
  }
  return versions;
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

DeviceVersion.isUpgradeSupport = function(model) {
  let upgradeAvailable = false;
  if (tr069Devices[model]) {
    upgradeAvailable = tr069Devices[model].feature_support.firmware_upgrade;
  }
  return upgradeAvailable;
};

// Virtual APs BSSIDs are hardcoded
DeviceVersion.getMeshBSSIDs = function(model, MAC) {
  let meshBSSIDs = {};
  if (tr069Devices[model] &&
      tr069Devices[model].feature_support.mesh_v2_primary_support &&
      tr069Devices[model].mesh2_bssid_offset &&
      tr069Devices[model].mesh5_bssid_offset
  ) {
    let MACOctets2 = MAC.split(':');
    let MACOctets5 = MAC.split(':');
    for (let i = 0; i < MACOctets2.length; i++) {
      if (tr069Devices[model].mesh2_bssid_absolute_mask &&
          tr069Devices[model].mesh2_bssid_absolute_mask[i]
      ) {
        MACOctets2[i] = tr069Devices[model].mesh2_bssid_absolute[i]
                                           .replace('0x', '');
      } else {
        MACOctets2[i] = (parseInt(`0x${MACOctets2[i]}`) +
                         parseInt(tr069Devices[model].mesh2_bssid_offset[i]))
                         .toString(16)
                         .toUpperCase();
        // We need the second hex digit for BSSID addresses
        if (MACOctets2[i].length === 1) {
          MACOctets2[i] = `0${MACOctets2[i]}`;
        }
      }
      if (tr069Devices[model].mesh5_bssid_absolute_mask &&
          tr069Devices[model].mesh5_bssid_absolute_mask[i]
      ) {
        MACOctets5[i] = tr069Devices[model].mesh5_bssid_absolute[i]
                                           .replace('0x', '');
      } else {
        MACOctets5[i] = (parseInt(`0x${MACOctets5[i]}`) +
                         parseInt(tr069Devices[model].mesh5_bssid_offset[i]))
                         .toString(16)
                         .toUpperCase();
        // We need the second hex digit for BSSID addresses
        if (MACOctets5[i].length === 1) {
          MACOctets5[i] = `0${MACOctets5[i]}`;
        }
      }
    }
    meshBSSIDs.mesh2 = MACOctets2.join(':');
    meshBSSIDs.mesh5 = MACOctets5.join(':');
  } else {
    meshBSSIDs.mesh2 = '';
    meshBSSIDs.mesh5 = '';
  }
  return meshBSSIDs;
};

module.exports = DeviceVersion;
