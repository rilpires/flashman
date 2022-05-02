let basicCPEModel = {};

basicCPEModel.portForwardPermissions = {
  noRanges: {
   simpleSymmetric: true,
   simpleAsymmetric: true,
   rangeSymmetric: false,
   rangeAsymmetric: false,
  },
  noAsym: {
   simpleSymmetric: true,
   simpleAsymmetric: false,
   rangeSymmetric: true,
   rangeAsymmetric: false,
  },
  noAsymRanges: {
   simpleSymmetric: true,
   simpleAsymmetric: true,
   rangeSymmetric: true,
   rangeAsymmetric: false,
  },
  fullSupport: {
   simpleSymmetric: true,
   simpleAsymmetric: true,
   rangeSymmetric: true,
   rangeAsymmetric: true,
  },
};

basicCPEModel.vendor = 'None';

basicCPEModel.modelPermissions = function() {
  return {
    features: {
      firmwareUpgrade: false, // support for tr-069 firmware upgrade
      mesh: false, // can create a mesh network with Anlix firmwares
      pingTest: false, // will enable ping test dialog
      ponSignal: false, // will measure pon rx/tx power
      portForward: false, // will enable port forward dialogs
      speedTest: false, // will enable speed test dialogs
      stun: false, // will automatically apply stun configurations if configured
      upnp: false, // will enable upnp configs (to be implemented)
      wps: false, // will enable wps configs (to be implemented)
    },
    firmwareUpgrades: {
      'v0.0.0': [],
    },
    lan: {
      blockLANDevices: false, // will enable block device buttons
      blockWiredLANDevices: false, // support for blocking non-wireless devices
      listLANDevices: false, // list connected LAN devices
      needEnableConfig: false, // will force lan enable on registry (Tenda AC10)
    },
    wan: {
      dhcpUptime: true, // will display wan uptime if in DHCP mode (Archer C6)
      portForwardPermissions: null, // specifies range/asym support
      speedTestLimit: 0, // speedtest limit, values above show as "limit+ Mbps"
    },
    wifi: {
      dualBand: false, // specifies if model has 2 different Wi-Fi radios
      axWiFiMode: false, // will enable AX mode for 5GHz Wi-Fi network
      bandRead: true, // will display current wifi band
      bandWrite: true, // can change current wifi band
      extended2GhzChannels: false, // allow channels 12 and 13
      modeRead: true, // will display current wifi mode
      modeWrite: true, // can change current wifi mode
    },
    mesh: {
      bssidOffsets2Ghz: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x0'],
      bssidOffsets5Ghz: ['0x0', '0x0', '0x0', '0x0', '0x0', '002'],
      hardcodedBSSIDOffset: false, // special flag for mesh BSSIDs
    },
    usesStavixXMLConfig: false, // special flag for stavix-like models
  };
};

basicCPEModel.allowedFirmwareUpgrades = function(fwVersion) {
  // No upgrades allowed
  return [];
};

basicCPEModel.getFieldType = function(masterKey, key) {
  switch (masterKey+'-'+key) {
    case 'wifi2-channel':
    case 'wifi5-channel':
    case 'mesh2-channel':
    case 'mesh5-channel':
    case 'stun-port':
    case 'common-interval':
      return 'xsd:unsignedInt';
    case 'wifi2-enable':
    case 'wifi5-enable':
    case 'wifi2-auto':
    case 'wifi5-auto':
    case 'mesh2-enable':
    case 'mesh5-enable':
    case 'mesh2-auto':
    case 'mesh5-auto':
    case 'mesh2-advertise':
    case 'mesh5-advertise':
    case 'common-stun_enable':
      return 'xsd:boolean';
    default:
      return 'xsd:string';
  }
};

basicCPEModel.convertWifiMode = function(mode) {
  switch (mode) {
    case '11g':
      return '11bg';
    case '11n':
      return '11bgn';
    case '11na':
      return '11na';
    case '11ac':
      return '11ac';
    case '11ax':
      return '11ax';
    default:
      return '';
  }
};

basicCPEModel.convertWifiBand = function(band, is5ghz=false) {
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
      return 'auto';
    default:
      return '';
  }
};

basicCPEModel.convertWifiRate = function(rate) {
  return parseInt(rate);
};

basicCPEModel.convertSubnetIntToMask = function(mask) {
  if (mask === 24) {
    return '255.255.255.0';
  } else if (mask === 25) {
    return '255.255.255.128';
  } else if (mask === 26) {
    return '255.255.255.192';
  }
  return '';
};

basicCPEModel.convertField = function(
  masterKey, key, value, typeFunc, modeFunc, bandFunc,
) {
  let result = {value: null, type: typeFunc(masterKey, key)};
  switch (masterKey+'-'+key) {
    case 'lan-subnet_mask':
      // convert to ip subnet
      result.value = basicCPEModel.convertSubnetIntToMask(value);
      break;
    case 'wifi2-enable':
    case 'wifi5-enable':
    case 'mesh2-enable':
    case 'mesh5-enable':
    case 'mesh2-advertise':
    case 'mesh5-advertise':
      result.value = (value > 0) ? true : false; // convert to boolean
      break;
    case 'common-interval':
    case 'wifi2-channel':
    case 'wifi5-channel':
    case 'mesh2-channel':
    case 'mesh5-channel':
      result.value = parseInt(value); // convert to integer
      break;
    case 'wifi2-mode':
    case 'wifi5-mode':
    case 'mesh2-mode':
    case 'mesh5-mode':
      result.value = modeFunc(value); // convert to TR-069
      break;
    case 'wifi2-band':
    case 'mesh2-band':
      result.value = bandFunc(value); // convert to TR-069
      break;
    case 'wifi5-band':
    case 'mesh5-band':
      // convert to TR-069 format
      result.value = bandFunc(value, true); // convert to TR-069
      break;
    default:
      result.value = value; // no transformation necessary
  }
  return result;
};

basicCPEModel.getBeaconType = function() {
  return '11i';
};

basicCPEModel.convertGenieSerial = function(serial) {
  // No conversion necessary
  return serial;
};

basicCPEModel.forbiddenWebUsernames = function() {
  // No forbidden usernames
  return [];
};

basicCPEModel.getModelFields = function() {
  return {
    common: {
      mac: 'InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.1.'+
        'MACAddress',
      model: 'InternetGatewayDevice.DeviceInfo.ModelName',
      version: 'InternetGatewayDevice.DeviceInfo.SoftwareVersion',
      uptime: 'InternetGatewayDevice.DeviceInfo.UpTime',
      ip: 'InternetGatewayDevice.ManagementServer.ConnectionRequestURL',
      acs_url: 'InternetGatewayDevice.ManagementServer.URL',
      interval: 'InternetGatewayDevice.ManagementServer.PeriodicInformInterval',
    },
    wan: {
      pppoe_enable: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANPPPConnection.*.Enable',
      pppoe_user: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANPPPConnection.*.Username',
      pppoe_pass: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANPPPConnection.*.Password',
      rate: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.'+
        'MaxBitRate',
      duplex: 'InternetGatewayDevice.WANDevice.1.WANEthernetInterfaceConfig.'+
        'DuplexMode',
      wan_ip: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANIPConnection.1.ExternalIPAddress',
      wan_ip_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANPPPConnection.*.ExternalIPAddress',
      uptime: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANIPConnection.1.Uptime',
      uptime_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANPPPConnection.*.Uptime',
      mtu: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANIPConnection.*.MaxMTUSize',
      mtu_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANPPPConnection.*.MaxMRUSize',
      recv_bytes: 'InternetGatewayDevice.WANDevice.1.'+
        'WANEthernetInterfaceConfig.Stats.BytesReceived',
      sent_bytes: 'InternetGatewayDevice.WANDevice.1.'+
        'WANEthernetInterfaceConfig.Stats.BytesSent',
      port_mapping_entries_dhcp: 'InternetGatewayDevice.WANDevice.1.'+
        'WANConnectionDevice.*.WANIPConnection.*.PortMappingNumberOfEntries',
      port_mapping_entries_ppp: 'InternetGatewayDevice.WANDevice.1.'+
        'WANConnectionDevice.*.WANPPPConnection.*.PortMappingNumberOfEntries',
    },
    port_mapping_dhcp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.'+
      '*.WANIPConnection.*.PortMapping',
    port_mapping_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.'+
      '*.WANPPPConnection.*.PortMapping',
    /* The port_mapping_(values|fields) is a auxiliary sub object to dispatch
      setParameterValues task in genie. Its works on the settings below:
        First array element - Field on tr-069 xml spec;
        Second array element - Default value or field in port_mapping
          definition of models/device.js that carry the value;
        Third array element - The xml data type specification; */
    port_mapping_fields: {
      external_port_start: ['ExternalPort', 'external_port_start',
        'xsd:unsignedInt'],
      internal_port_start: ['InternalPort', 'internal_port_start',
        'xsd:unsignedInt'],
      client: ['InternalClient', 'ip', 'xsd:string'],
    },
    port_mapping_values: {
      enable: ['PortMappingEnabled', true, 'xsd:boolean'],
      lease: ['PortMappingLeaseDuration', 0, 'xsd:unsignedInt'],
      // hardcoded for every device
      protocol: ['PortMappingProtocol', '',
        'xsd:string'],
      description: ['PortMappingDescription', '', 'xsd:string'],
      remote_host: ['RemoteHost', '0.0.0.0', 'xsd:string'],
    },
    lan: {
      router_ip: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.'+
        'IPInterface.1.IPInterfaceIPAddress',
      subnet_mask: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.'+
        'IPInterface.1.IPInterfaceSubnetMask',
      lease_min_ip: 'InternetGatewayDevice.LANDevice.1.'+
        'LANHostConfigManagement.MinAddress',
      lease_max_ip: 'InternetGatewayDevice.LANDevice.1.'+
        'LANHostConfigManagement.MaxAddress',
      ip_routers: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.'+
        'IPRouters',
      dns_servers: 'InternetGatewayDevice.LANDevice.1.'+
        'LANHostConfigManagement.DNSServers',
    },
    wifi2: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      bssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BSSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.'+
        'KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel',
      auto: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.'+
        'AutoChannelEnable',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable',
      beacon_type: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.'+
        'BeaconType',
      band: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BandWidth',
    },
    wifi5: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID',
      bssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.BSSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.'+
        'KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Channel',
      auto: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.'+
        'AutoChannelEnable',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Enable',
      beacon_type: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.'+
        'BeaconType',
      band: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.BandWidth',
    },
    mesh2: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID',
      bssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.BSSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.'+
        'KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Channel',
      auto: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.'+
        'AutoChannelEnable',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Enable',
      advertise: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.'+
        'SSIDAdvertisementEnabled',
      encryption: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.'+
        'WPAEncryptionModes',
      beacon_type: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.'+
        'BeaconType',
    },
    mesh5: {
      ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.SSID',
      bssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.BSSID',
      password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.'+
        'KeyPassphrase',
      channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Channel',
      auto: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.'+
        'AutoChannelEnable',
      mode: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Standard',
      enable: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.Enable',
      advertise: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.'+
        'SSIDAdvertisementEnabled',
      encryption: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.'+
        'WPAEncryptionModes',
      beacon_type: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.'+
        'BeaconType',
    },
    log: 'InternetGatewayDevice.DeviceInfo.DeviceLog',
    devices: {
      hosts: 'InternetGatewayDevice.LANDevice.1.Hosts',
      hosts_template: 'InternetGatewayDevice.LANDevice.1.Hosts.Host',
      host_mac: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.MACAddress',
      host_name: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.HostName',
      host_ip: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.IPAddress',
      host_layer2: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.'+
        'Layer2Interface',
      associated: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.'+
        'AssociatedDevice',
      assoc_total: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.'+
        'TotalAssociations',
      assoc_mac: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.'+
        'AssociatedDevice.*.AssociatedDeviceMACAddress',
    },
    diagnostics: {
      ping: {
        root: 'InternetGatewayDevice.IPPingDiagnostics',
        diag_state: 'InternetGatewayDevice.IPPingDiagnostics.DiagnosticsState',
        failure_count: 'InternetGatewayDevice.IPPingDiagnostics.FailureCount',
        success_count: 'InternetGatewayDevice.IPPingDiagnostics.SuccessCount',
        host: 'InternetGatewayDevice.IPPingDiagnostics.Host',
        num_of_rep: 'InternetGatewayDevice.IPPingDiagnostics.'+
          'NumberOfRepetitions',
        avg_resp_time: 'InternetGatewayDevice.IPPingDiagnostics.'+
          'AverageResponseTime',
        max_resp_time: 'InternetGatewayDevice.IPPingDiagnostics.'+
          'MaximumResponseTime',
        min_resp_time: 'InternetGatewayDevice.IPPingDiagnostics.'+
          'MinimumResponseTime',
        timeout: 'InternetGatewayDevice.IPPingDiagnostics.Timeout',
      },
      speedtest: {
        root: 'InternetGatewayDevice.DownloadDiagnostics',
        diag_state: 'InternetGatewayDevice.DownloadDiagnostics.'+
          'DiagnosticsState',
        num_of_conn: 'InternetGatewayDevice.DownloadDiagnostics.'+
          'NumberOfConnections',
        download_url: 'InternetGatewayDevice.DownloadDiagnostics.DownloadURL',
        bgn_time: 'InternetGatewayDevice.DownloadDiagnostics.BOMTime',
        end_time: 'InternetGatewayDevice.DownloadDiagnostics.EOMTime',
        test_bytes_rec: 'InternetGatewayDevice.DownloadDiagnostics.'+
          'TestBytesReceived',
        down_transports: 'InternetGatewayDevice.DownloadDiagnostics.'+
          'DownloadTransports',
        full_load_bytes_rec: 'InternetGatewayDevice.DownloadDiagnostics.'+
          'TestBytesReceivedUnderFullLoading',
        full_load_period: 'InternetGatewayDevice.DownloadDiagnostics.'+
          'PeriodOfFullLoading',
      },
    },
  };
};

module.exports = basicCPEModel;
