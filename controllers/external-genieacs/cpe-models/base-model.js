let basicCPEModel = {};

// These should not be copied over to each model, only referenced
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

// Must be changed for every model, used when importing firmwares
// MUST MATCH APP VENDOR AND MODEL EXACTLY!
basicCPEModel.identifier = {vendor: 'NoVendor', model: 'NoName'};

// Must be tweaked by models to reflect their features and permissions
// IF YOU NEED A NEW KEY, ADD IT TO THIS BASE MODEL AS WELL!
basicCPEModel.modelPermissions = function() {
  return {
    features: {
      customAppPassword: true, // can override default login/pass for app access
      firmwareUpgrade: false, // support for tr-069 firmware upgrade
      meshCable: true, // can create a cable mesh network with Anlix firmwares
      meshWifi: false, // can create a wifi mesh network with Anlix firmwares
      pingTest: false, // will enable ping test dialog
      ponSignal: false, // will measure pon rx/tx power
      portForward: false, // will enable port forward dialogs
      siteSurvey: false, // will enable site survey dialogs
      speedTest: false, // will enable speed test dialogs
      stun: false, // will automatically apply stun configurations if configured
      traceroute: false, // will enable traceroute diagnostics
      upnp: false, // will enable upnp configs (to be implemented)
      wanBytes: true, // will enable wan bytes plot
      wps: false, // will enable wps configs (to be implemented)
    },
    firmwareUpgrades: {
      'v0.0.0': [],
    },
    lan: {
      configRead: true, // will display current lan configuration
      configWrite: true, // can change current lan configuration
      blockLANDevices: false, // will enable block device buttons
      blockWiredLANDevices: false, // support for blocking non-wireless devices
      listLANDevices: true, // list connected LAN devices
      LANDeviceCanTrustActive: true, // has host active field trustworthy
      LANDeviceHasSNR: false, // has explicit SNR field on connected devices
      LANDeviceHasAssocTree: true, // devices that have the Assoc Devices tree
      LANDeviceSkipIfNoWifiMode: false, // will skip devices with no host mode
                                      // info (developed for Nokia models)
      needEnableConfig: false, // will force lan enable on registry (Tenda AC10)
      needConfigOnLANChange: false, // will force lan enable on edit (GWR1200)
      sendDnsOnLANChange: true, // will send dns config on LAN IP/mask change
      sendRoutersOnLANChange: true, // will send lease config on LAN IP/mask chg
    },
    wan: {
      dhcpUptime: true, // will display wan uptime if in DHCP mode (Archer C6)
      pingTestSingleAttempt: false, // pingtest will ignore test count and use 1
      pingTestSetInterface: false, // pingtest will set device interface
      traceRouteSetInterface: false, // traceroute will set device interface
      portForwardQueueTasks: false, // queue tasks and only send request on last
      portForwardPermissions: null, // specifies range/asym support
      speedTestLimit: 0, // speedtest limit, values above show as "limit+ Mbps"
      hasUptimeField: true, // flag to handle devices that don't have uptime
    },
    wifi: {
      list5ghzChannels: [36, 40, 44, 48, 149, 153, 157, 161, 165],
      allowDiacritics: false, // allows accented chars for ssid and password
      allowSpaces: true, // allows space char for ssid
      dualBand: true, // specifies if model has 2 different Wi-Fi radios
      axWiFiMode: false, // will enable AX mode for 5GHz Wi-Fi network
      extended2GhzChannels: true, // allow channels 12 and 13
      ssidRead: true, // will display current wifi ssid and password
      ssidWrite: true, // can change current wifi ssid and password
      bandRead2: true, // will display current wifi 2.4 band
      bandRead5: true, // will display current wifi 5 band
      bandWrite2: true, // can change current wifi 2.4 band
      bandWrite5: true, // can change current wifi 5 band
      bandAuto2: true, // can change current wifi 2.4 band to auto mode
      bandAuto5: true, // can change current wifi 5 band to auto mode
      modeRead: true, // will display current wifi mode
      modeWrite: true, // can change current wifi mode
      rebootAfterWiFi2SSIDChange: false, // will cause a reboot on ssid change
      mustBeEnabledToConfigure: false, // wiill block changes if wifi is down
    },
    mesh: {
      bssidOffsets2Ghz: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x0'],
      bssidOffsets5Ghz: ['0x0', '0x0', '0x0', '0x0', '0x0', '0x0'],
      hardcodedBSSIDOffset: false, // special flag for mesh BSSIDs
      objectExists: false, // special flag for mesh xml object
      setEncryptionForCable: false, // special flag for cable mesh
    },
    siteSurvey: {
      requiresPolling: false, // Flashman must poll for result in genieacs
      requiresSeparateTasks: false, // Flashman must split 2.4 and 5ghz tasks
      survey2Index: '', // For devices with split state/result fields (2.4GHz)
      survey5Index: '', // For devices with split state/result fields (5GHz)
    },
    traceroute: {
      maxProbesPerHop: 3, // Flashman's device.model limit is 5
      // If 'fixedProbesPerHop' is a valid number, it does not allow setting
      // a custom 'traceroute_number_probes' value, except fixedProbesPerHop
      fixedProbesPerHop: NaN,
      // Sometimes... it completes traceroute diagnostic successfully,
      // and even fills hops values, but DiagnosticState value
      // is still 'Requested'.
      completeAsRequested: false,
      hopCountExceededState: 'Error_MaxHopCountExceeded',
      dnsPrefersIpv6: false, // If no IPv6 interface is available, no guarantees
      dataBlockSizeToSet: NaN, // If NaN, use default value
      // allowTriesPerHop: 0, //
    },
    onlineAfterReset: false, // flag for devices that stay online post reset
    useLastIndexOnWildcard: false, // flag for devices that uses last index,
    needInterfaceInPortFoward: false, // flag for devices that need interf tree
    stavixXMLConfig: {
      portForward: false, // uses xml for port forward editing
      webCredentials: false, // uses xml for web credentials editing
    },
  };
};

// Should be tweaked if the tr-069 xml has special types for some fields
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

// Conversion from Flashman format to CPE format
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

// Conversion from Flashman format to CPE format
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

basicCPEModel.convertWifiBandToFlashman = function(band, isAC) {
  switch (band) {
    // String input
    case 'auto':
    case 'Auto':
    case '20/40MHz Coexistence':
      return 'auto';
    case '20M':
    case '20MHz':
    case '20Mhz':
      return (isAC) ? 'VHT20' : 'HT20';
    case '40M':
    case '40MHz':
    case '40Mhz':
    case '20/40MHz':
      return (isAC) ? 'VHT40' : 'HT40';
    case '80M':
    case '80MHz':
    case '80Mhz':
    case '20/40/80MHz':
      return (isAC) ? 'VHT80' : undefined;
    case '160MHz':
    default:
      return undefined;
  }
};

// Conversion from Flashman format to TR-069 format
const convertSubnetIntToMask = function(mask) {
  if (mask === 24) {
    return '255.255.255.0';
  } else if (mask === 25) {
    return '255.255.255.128';
  } else if (mask === 26) {
    return '255.255.255.192';
  }
  return '';
};

// Convert values from Flashman format to CPE format
// Expected return example is {value: "mynetwork", type: "xsd:string"}
// TypeFunc should always be an implementation of getFieldType
// ModeFunc should always be an implementation of convertWifiMode
// BandFunc should always be an implementation of convertWifiBand
basicCPEModel.convertField = function(
  masterKey, key, value, typeFunc, modeFunc, bandFunc,
) {
  let result = {value: null, type: typeFunc(masterKey, key)};
  switch (masterKey+'-'+key) {
    case 'lan-subnet_mask':
      // convert to ip subnet
      result.value = convertSubnetIntToMask(value);
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

// Used when setting up a mesh network
basicCPEModel.getBeaconType = function() {
  return '11i';
};

basicCPEModel.convertIGDtoDevice = function(fields) {
  Object.keys(fields).forEach((k) => {
    if (typeof fields[k] === 'object' && !Array.isArray(fields[k])) {
      return basicCPEModel.convertIGDtoDevice(fields[k]);
    } else if (!Array.isArray(fields[k])) {
      fields[k] = fields[k].replace(/InternetGatewayDevice/g, 'Device');
    }
  });

  return fields;
};

basicCPEModel.getWPAEncryptionMode = function() {
  return '';
};

basicCPEModel.getIeeeEncryptionMode = function() {
  return '';
};

// Used to override GenieACS serial in some way, used only on Hurakall for now
basicCPEModel.convertGenieSerial = function(serial, mac) {
  // No conversion necessary
  return serial;
};

// Some CPEs provide rx/tx power in some format other than dBm
basicCPEModel.convertToDbm = function(power) {
  // No conversion necessary
  return power;
};

// Some CPEs inform WAN transmit rate in different scales
basicCPEModel.convertWanRate = function(rate) {
  // No conversion necessary
  return rate;
};

// CPEs that can customize web admin username can reject certain usernames to
// avoid conflict with other credentials
basicCPEModel.isAllowedWebadminUsername = function(name) {
  return true;
};

// Since Flashman stores auto channel flag within channel field itself, we
// need to specify how to split them up when sending a task to CPE
basicCPEModel.convertChannelToTask = function(channel, fields, masterKey) {
  let auto = (channel === 'auto');
  let values = [];
  values.push([
    fields[masterKey]['auto'], auto, 'xsd:boolean',
  ]);
  if (!auto) {
    const parsedChannel = parseInt(channel);
    values.push([
      fields[masterKey]['channel'], parsedChannel, 'xsd:unsignedInt',
    ]);
  }
  return values;
};

// Used to convert the ping test result value for devices with different formats
basicCPEModel.convertPingTestResult = function(latency) {
  return latency; // No conversion necessary
};

// Used to convert the speed test result for devices that do not FullLoad
basicCPEModel.convertSpeedValueBasic = function(endTime, beginTime, bytesRec) {
  // 10**3 => seconds to miliseconds (because of valueOf() notation)
  // 8 => byte to bit
  // 1024**2 => bit to megabit
  let deltaTime = (endTime - beginTime) / (10**3);
  return (8/(1024**2)) * (bytesRec/deltaTime);
};

// Used to convert the speed test result for devices that do FullLoad
basicCPEModel.convertSpeedValueFullLoad = function(period, bytesRec) {
  // 10**6 => microsecond to second
  // 8 => byte to bit
  // 1024**2 => bit to megabit
  return ((8*(10**6))/(1024**2)) * (bytesRec/period);
};

// Used when computing dhcp ranges
const convertSubnetMaskToRange = function(mask) {
  // Convert masks to dhcp ranges - reserve 32+1 addresses for fixed ip/gateway
  if (mask === '255.255.255.0' || mask === 24) {
    return {min: '33', max: '254'};
  } else if (mask === '255.255.255.128' || mask === 25) {
    return {min: '161', max: '254'};
  } else if (mask === '255.255.255.192' || mask === 26) {
    return {min: '225', max: '254'};
  }
  return {};
};

// Editing the gateway ip or subnet length implies a change to other fields,
// so we do those here, for the devices that need it
basicCPEModel.convertLanEditToTask = function(device, fields, permissions) {
  let values = [];
  let dhcpRanges = convertSubnetMaskToRange(device.lan_netmask);
  if (dhcpRanges.min && dhcpRanges.max) {
    let subnet = device.lan_subnet;
    let networkPrefix = subnet.split('.').slice(0, 3).join('.');
    let minIP = networkPrefix + '.' + dhcpRanges.min;
    let maxIP = networkPrefix + '.' + dhcpRanges.max;
    if (permissions.lan.sendDnsOnLANChange) {
      values.push([fields['lan']['dns_servers'], subnet, 'xsd:string']);
    }
    if (permissions.lan.sendRoutersOnLANChange) {
      values.push([fields['lan']['ip_routers'], subnet, 'xsd:string']);
      values.push([fields['lan']['lease_min_ip'], minIP, 'xsd:string']);
      values.push([fields['lan']['lease_max_ip'], maxIP, 'xsd:string']);
    }
    if (permissions.lan.needConfigOnLANChange) {
      values.push([fields['lan']['config_enable'], true, 'xsd:boolean']);
    }
  }
  return values;
};

// List of allowed firmware upgrades for each known firmware version
basicCPEModel.allowedFirmwareUpgrades = function(fwVersion, permissions) {
  if (
    permissions.features.firmwareUpgrade &&
    Array.isArray(permissions.firmwareUpgrades[fwVersion])
  ) {
    return permissions.firmwareUpgrades[fwVersion];
  }
  // No upgrades allowed
  return [];
};

// Used on devices whose ModelName does not match with actual model name
basicCPEModel.useModelAlias = function(fwVersion) {
  // No alias
  return '';
};

// Used on devices that list wifi rate for each connected device
basicCPEModel.convertWifiRate = function(rate) {
  return parseInt(rate);
};

// Used when fetching connected devices to identify if device is cable or wifi
basicCPEModel.isDeviceConnectedViaWifi = function(
  layer2iface, wifi2iface, wifi5iface,
) {
  if (layer2iface === wifi2iface || layer2iface === wifi2iface + '.') {
    return 'wifi2';
  } else if (layer2iface === wifi5iface || layer2iface === wifi5iface + '.') {
    return 'wifi5';
  }
  return 'cable';
};

basicCPEModel.convertPPPoEEnable = function(value) {
  return value;
};

// Used when fetching connected devices' rssi data, it might need conversions
basicCPEModel.convertRssiValue = function(rssiValue) {
  // Return undefined in case anything goes wrong
  let result;
  if (typeof rssiValue !== 'undefined') {
    result = rssiValue;
    // Casts to string if is a number so we can replace 'dBm'
    if (typeof result === 'number') {
      result = result.toString();
    }
    result = result.replace('dBm', '');
    // Cast back to number to avoid converting issues
    result = parseInt(result);
    if (isNaN(result)) {
      return undefined;
    }
  }
  return result;
};

basicCPEModel.getPortForwardRuleName = function(index) {
  return 'Anlix_PortForwarding_' + index.toString();
};

// If you are going to overwrite this function, check out the others
// specialized ones, maybe there is already a useful one
basicCPEModel.readTracerouteRTTs = function(genieHopRoot) {
  let rttTimesField
    = this.getModelFields().diagnostics.traceroute.hop_rtt_times;
  let RTTs = genieHopRoot[rttTimesField]['_value'];
  return RTTs
    .split(',')
    .filter((e)=>!isNaN(parseFloat(e)))
    .map((e)=>parseFloat(e).toString());
};

// Map TR-069 XML fields to Flashman fields
basicCPEModel.getModelFields = function() {
  return {
    common: {
      mac: 'InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.1.'+
        'MACAddress',
      model: 'InternetGatewayDevice.DeviceInfo.ModelName',
      version: 'InternetGatewayDevice.DeviceInfo.SoftwareVersion',
      hw_version: 'InternetGatewayDevice.DeviceInfo.HardwareVersion',
      uptime: 'InternetGatewayDevice.DeviceInfo.UpTime',
      ip: 'InternetGatewayDevice.ManagementServer.ConnectionRequestURL',
      acs_url: 'InternetGatewayDevice.ManagementServer.URL',
      interval: 'InternetGatewayDevice.ManagementServer.PeriodicInformInterval',
      // These should only be added whenever they exist, for legacy reasons:
        // web_admin_user: 'InternetGatewayDevice.User.1.Username',
        // web_admin_password: 'InternetGatewayDevice.User.1.Password',
        // stun_enable: 'InternetGatewayDevice.ManagementServer.STUNEnable',
        // stun_udp_conn_req_addr: 'InternetGatewayDevice.ManagementServer.' +
        //   'UDPConnectionRequestAddress',
        // alt_uid: 'InternetGatewayDevice.LANDevice.1.' +
        //   'LANEthernetInterfaceConfig.1.MACAddress',
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
      // These should only be added whenever they exist, for legacy reasons:
        // vlan: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.' +
        //   'GponLinkConfig.VLANIDMark',
        // pon_rxpower: 'InternetGatewayDevice.WANDevice.1.'+
        //   'GponInterfaceConfig.RXPower',
        // pon_txpower: 'InternetGatewayDevice.WANDevice.1.'+
        //   'GponInterfaceConfig.TXPower',
        // pon_rxpower_epon: 'InternetGatewayDevice.WANDevice.1.'+
        //   'EponInterfaceConfig.RXPower',
        // pon_txpower_epon: 'InternetGatewayDevice.WANDevice.1.'+
        //   'EponInterfaceConfig.TXPower',
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
      config_enable: 'InternetGatewayDevice.LANDevice.1.' +
        'LANHostConfigManagement.IPInterface.1.Enable',
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
    stun: {
      address: 'InternetGatewayDevice.ManagementServer.STUNServerAddress',
      port: 'InternetGatewayDevice.ManagementServer.STUNServerPort',
    },
    access_control: {
      wifi2: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.' +
        'AccessControl',
      wifi5: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.' +
        'AccessControl',
    },
    devices: {
      hosts: 'InternetGatewayDevice.LANDevice.1.Hosts',
      hosts_template: 'InternetGatewayDevice.LANDevice.1.Hosts.Host',
      host_mac: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.MACAddress',
      host_name: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.HostName',
      host_ip: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.IPAddress',
      host_layer2: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.'+
        'Layer2Interface',
      host_active: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.Active',
      host_rssi: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.' +
        'AssociatedDevice.*.SignalStrength',
      host_snr: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.' +
        'AssociatedDevice.*.SignalNoiseRatio',
      host_rate: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.' +
        'AssociatedDevice.*.LastDataTransmitRate',
      associated: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.' +
        'AssociatedDevice',
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
        interface: 'InternetGatewayDevice.IPPingDiagnostics.Interface',
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
      /**
       * <---- Traceroute ---->
       *  ip_version:
       *    this field is rarely present as an option to set IPv4 or IPv6.
       *    We only want IPv4, so don't bother filling this fields when the
       *    default value is already as '4' or 'IPv4', something like that.
       *    For now, this field sets the field as 'IPv4'(string), when present.
       *  protocol:
       *    We prefer ICMP over UDP (most likely the default). If this field is
       *    present, we set it to 'ICMP'(string).
       */
      traceroute: {
        root: 'InternetGatewayDevice.TraceRouteDiagnostics',
        diag_state: 'DiagnosticsState',
        interface: 'Interface',
        target: 'Host',
        tries_per_hop: 'NumberOfTries',
        timeout: 'Timeout',
        data_block_size: 'DataBlockSize',
        diff_serv: 'DSCP',
        max_hop_count: 'MaxHopCount',
        response_time: 'ResponseTime',
        number_of_hops: 'RouteHopsNumberOfEntries',
        protocol: '',
        ip_version: '',
        hops_root: 'RouteHops',
        hop_host: 'HopHost',
        hop_ip_address: 'HopHostAddress',
        hop_error_code: 'HopErrorCode',
        hop_rtt_times: 'HopRTTimes',
      },
      sitesurvey: {
        // Some of these fields have no defaults, as they are vendor-specific
        root: '',
        diag_state: 'DiagnosticsState',
        result: 'Result',
        mac: 'BSSID',
        ssid: 'SSID',
        channel: 'Channel',
        signal: 'RSSI',
        band: 'BandWidth',
        mode: 'Standard',
      },
    },
  };
};

// This function can be called to apply changes to the functions declared above
// based on firmware/hardware versions, to avoid creating entirely new files for
// very basic changes. "Base" is exactly what is exported below: basicCPEModel.
// Functions can be altered through a copy of it, returned with altered values
basicCPEModel.applyVersionDifferences = function(base, fwVersion, hwVersion) {
  return base;
};

module.exports = basicCPEModel;
