let basicCPEModel = {};

// These should not be copied over to each model, only referenced
basicCPEModel.portForwardPermissions = {
  noAsymNoRanges: {
    simpleSymmetric: true,
    simpleAsymmetric: false,
    rangeSymmetric: false,
    rangeAsymmetric: false,
  },
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
      cableRxRate: false, // can get RX rate from devices connected by cable
      firmwareUpgrade: true, // support for tr-069 firmware upgrade
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
      macAccessControl: false,
      wlanAccessControl: false,
      hasIpv6Information: false, // Has any information about IPv6
      hasCPUUsage: false, // Has any info about CPU Usage
      hasMemoryUsage: false, // Has any info about Memory Usage
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
      sendRoutersOnLANChange: true, // will send lease config on LAN IP/mask chg
      dnsServersWrite: true, // can change LAN DNS servers
      dnsServersLimit: 1, // Number of DNS servers accepted by the router
    },
    wan: {
      allowReadMacAddress: true, // can read WAN MAC address at flashman's wan
        // tab, as the mac might come wrong in some devices
      allowReadWanMtu: true, // can read wan mtu at flashman's wan tab
      allowEditWanMtu: true, // can edit wan mtu at flashman's wan tab
      allowReadWanVlan: false, // can read wan vlan at flashman's wan tab
      allowEditWanVlan: false, // can edit wan vlan at flashman's wan tab
      dhcpUptime: true, // will display wan uptime if in DHCP mode (Archer C6)
      pingTestSingleAttempt: false, // pingtest will ignore test count and use 1
      pingTestSetInterface: false, // pingtest will set device interface
      speedTestSetInterface: false, // speedtest will set device interface
      traceRouteSetInterface: false, // traceroute will set device interface
      portForwardQueueTasks: true, // queue tasks and only send request on last
      portForwardPermissions: null, // specifies range/asym support
      speedTestLimit: 0, // speedtest limit, values above show as "limit+ Mbps"
      hasUptimeField: true, // flag to handle devices that don't have uptime
      mustRebootAfterChanges: false, // must reboot after change wan parameters
      canTrustWanRate: true, // has wan rate field trustworthy
      hasIpv4MaskField: false, // If the cpe can send IPv4 mask
      hasIpv4RemoteAddressField: false, // If the cpe can send IPv4 remote ip
      hasIpv4RemoteMacField: false, // If the cpe can send IPv4 remote mac
      hasIpv4DefaultGatewayField: false, // If the cpe can send IPv4 default
                                          // gateway
      hasDnsServerField: false, // If the cpe can send the DNS server
    },
    ipv6: {
      // Address, Mask Gateway
      hasAddressField: false, // If the cpe can send IPv6 address
      hasMaskField: false, // If the cpe can send IPv6 mask
      hasDefaultGatewayField: false, // If the cpe can send IPv6 default
                                      // gateway

      // Prefix Delegation
      hasPrefixDelegationAddressField: false, // IPv6 prefix delegation address
                                              // propagated to lan
      hasPrefixDelegationMaskField: false, // IPv6 prefix delegation mask
      hasPrefixDelegationLocalAddressField: false, // IPv6 prefix delegation
                                                    // self address
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
      /**
      * - maxProbesPerHop:
      *     We won't allow setting 'traceroute_number_probes' w/ a lower value.
      * - minProbesPerHop:
      *     We won't allow setting 'traceroute_number_probes' w/ a bigger value
      * - completeAsRequested:
      *     This will allow flashman to proceed with traceroute diagnostic even
      *     when 'DiagnosticsState' field is 'Requested'
      * - hopCountExceededState:
      *     The 'DiagnosticsState' value that appears when traceroute hops
      *     wasnt enough.
      * - protocol:
      *     Although we prioritize ICMP when available, UDP is most likely
      *     the only protocol supported
      **/
      maxProbesPerHop: 3,
      minProbesPerHop: 1,
      completeAsRequested: false,
      hopCountExceededState: 'Error_MaxHopCountExceeded',
      protocol: 'UDP',
    },
    onlineAfterReset: false, // flag for devices that stay online post reset
    useLastIndexOnWildcard: false, // flag for devices that uses last index,
    needInterfaceInPortFoward: false, // flag for devices that need interf tree
    stavixXMLConfig: {
      portForward: false, // uses xml for port forward editing
      webCredentials: false, // uses xml for web credentials editing
    },
    isTR181: false, // flag for devices that implements TR-181
  };
};

// Should be tweaked if the tr-069 xml has special types for some fields
basicCPEModel.getFieldType = function(masterKey, key) {
  switch (masterKey+'-'+key) {
    case 'wan-mtu':
    case 'wan-mtu_ppp':
    case 'wan-vlan':
    case 'wan-vlan_ppp':
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
    case 'mesh2-mode':
      result.value = modeFunc(value); // convert to TR-069
      break;
    case 'wifi5-mode':
    case 'mesh5-mode':
      result.value = modeFunc(value, true); // convert to TR-069
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
    let dnsServers = device.lan_dns_servers;
    if (permissions.lan.dnsServersWrite) {
      values.push([fields['lan']['dns_servers'], dnsServers, 'xsd:string']);
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

// Used on devices that list cable rate for each connected device
basicCPEModel.convertCableRate = function(rate) {
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

basicCPEModel.assocFieldWildcardReplacer = function(assocFieldKey, ifaceIndex) {
  return assocFieldKey.replace(
    /WLANConfiguration\.[0-9*]+\./g,
    'WLANConfiguration.' + ifaceIndex + '.',
  );
};

basicCPEModel.getAssociatedInterfaces = function(fields) {
  return {
    iface2: fields.wifi2.channel.replace('.Channel', ''),
    iface5: fields.wifi5.channel.replace('.Channel', ''),
  };
};

basicCPEModel.assocDevicesWildcardReplacer = function(assocDevicesKey,
                                                      ifaceIndex, deviceIndex) {
  return assocDevicesKey.replace('*', ifaceIndex).replace('*', deviceIndex);
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

basicCPEModel.getTR181Roots = function() {
  return {
    wan: {
      ip: 'Device.IP.Interface.*.',
      ppp: 'Device.PPP.Interface.*.',
      iface: 'Device.Ethernet.Interface.*.',
      link: 'Device.Ethernet.Link.*.',
      vlan: 'Device.Ethernet.VLANTermination.*.',
      port_mapping: 'Device.NAT.PortMapping.*.',
    },
  };
};

basicCPEModel.getRoots = function() {
  return {
    wan: {
      ip: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.' +
        'WANIPConnection.*.',
      ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        'WANPPPConnection.*.',
      iface: 'InternetGatewayDevice.WANDevice.1.'+
        'WANEthernetInterfaceConfig.',
    },
  };
};

basicCPEModel.getTR181ModelFields = function(newroots) {
  let roots = basicCPEModel.getTR181Roots();
  let fields = basicCPEModel.getModelFields(roots);

  fields = basicCPEModel.convertIGDtoDevice(fields);
  let wanRoot = fields.roots.wan;

  // Wan
  fields.wan.dhcp_status = wanRoot.ip+'Status';

  fields.wan.wan_ip = wanRoot.ip+'IPv4Address.*.IPAddress';
  fields.wan.wan_ip_ppp = fields.wan.wan_ip;
  fields.wan.mtu = wanRoot.ip+'MaxMTUSize';
  fields.wan.mtu_ppp = fields.wan.mtu;
  fields.wan.vlan_ppp = wanRoot.vlan+'VLANID';
  fields.wan.vlan = wanRoot.vlan+'VLANID';
  fields.wan.recv_bytes = wanRoot.ip+'Stats.BytesReceived';
  fields.wan.sent_bytes = wanRoot.ip+'Stats.BytesSent';
  fields.wan.wan_mac = wanRoot.link+'MACAddress';
  fields.wan.wan_mac_ppp = fields.wan.wan_mac;
  fields.wan.remote_address_ppp = wanRoot.ppp+'IPCP.RemoteIPAddress';
  fields.wan.dns_servers_ppp = wanRoot.ppp+'IPCP.DNSServers';
  fields.wan.port_mapping_entries_dhcp =
    'Device.NAT.PortMappingNumberOfEntries';
  fields.wan.port_mapping_entries_ppp =
    'Device.NAT.PortMappingNumberOfEntries';

  return fields;
};

// Map TR-069 XML fields to Flashman fields
basicCPEModel.getModelFields = function(newroots) {
  let roots = basicCPEModel.getRoots();
  if (newroots) {
    roots = newroots;
  }

  return {
    roots: roots,
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
        // web_admin_username: 'InternetGatewayDevice.User.1.Username',
        // web_admin_password: 'InternetGatewayDevice.User.1.Password',
        // stun_enable: 'InternetGatewayDevice.ManagementServer.STUNEnable',
        // stun_udp_conn_req_addr: 'InternetGatewayDevice.ManagementServer.' +
        //   'UDPConnectionRequestAddress',
        // alt_uid: 'InternetGatewayDevice.LANDevice.1.' +
        //   'LANEthernetInterfaceConfig.1.MACAddress',
    },
    wan: {
      name: roots.wan.ip+'Name',
      name_ppp: roots.wan.ppp+'Name',

      // PPPoE
      pppoe_enable: roots.wan.ppp+'Enable',
      pppoe_status: roots.wan.ppp+'ConnectionStatus',
      pppoe_user: roots.wan.ppp+'Username',
      pppoe_pass: roots.wan.ppp+'Password',

      // DHCP
      dhcp_enable: roots.wan.ip+'Enable',
      dhcp_status: roots.wan.ip+'ConnectionStatus',

      // Mode
      rate: roots.wan.iface+'MaxBitRate',
      duplex: roots.wan.iface+'DuplexMode',

      // WAN IP
      wan_ip: roots.wan.ip+'ExternalIPAddress',
      wan_ip_ppp: roots.wan.ppp+'ExternalIPAddress',

      // WAN MAC address
      wan_mac: roots.wan.ip+'MACAddress',
      wan_mac_ppp: roots.wan.ppp+'MACAddress',

      // IPv4 Mask
      // mask_ipv4: '',
      // mask_ipv4_ppp: '',

      // Remote Address
      // remote_address: '',
      remote_address_ppp: roots.wan.ppp+'RemoteIPAddress',

      // Remote Mac
      // remote_mac: '',
      // remote_mac_ppp: '',

      // Default Gateway
      default_gateway: roots.wan.ip+'DefaultGateway',
      default_gateway_ppp: roots.wan.ppp+'DefaultGateway',

      // DNS Server
      dns_servers: roots.wan.ip+'DNSServers',
      dns_servers_ppp: roots.wan.ppp+'DNSServers',

      // Uptime
      uptime: roots.wan.ip+'Uptime',
      uptime_ppp: roots.wan.ppp+'Uptime',

      // MTU
      mtu: roots.wan.ip+'MaxMTUSize',
      mtu_ppp: roots.wan.ppp+'MaxMRUSize',

      // Bytes
      recv_bytes: roots.wan.iface+'Stats.BytesReceived',
      sent_bytes: roots.wan.iface+'Stats.BytesSent',

      // Port Mapping
      port_mapping_entries_dhcp: roots.wan.ip+'PortMappingNumberOfEntries',
      port_mapping_entries_ppp: roots.wan.ppp+'PortMappingNumberOfEntries',
      // These should only be added whenever they exist, for legacy reasons:
        // service_type: InternetGatewayDevice.WANDevice.1.
        //   WANConnectionDevice.*.WANIPConnection.*.X_HW_SERVICELIST
        // service_type_ppp: InternetGatewayDevice.WANDevice.1.
        //   WANConnectionDevice.*.WANPPPConnection.*.X_HW_SERVICELIST
        // vlan: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
        //   'GponLinkConfig.VLANIDMark',
        // vlan_ppp: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.'+
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

    ipv6: {
      /*
       * These fields are solely for helping creating support for routers with
       * IPv6 that contains those proprietary fields, as those fields does not
       * belong to TR-069 documentation.
       *
       * address: '',
       * address_ppp: '',
       *
       * mask: '',
       * mask_ppp: '',
       *
       * default_gateway: '',
       * default_gateway_ppp: '',
       *
       * prefix_delegation_address: '',
       * prefix_delegation_address_ppp: '',
       *
       * prefix_delegation_mask: '',
       * prefix_delegation_mask_ppp: '',
       *
       * prefix_delegation_local_address: '',
       * prefix_delegation_local_address_ppp: '',
       */
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
      mac: 'InternetGatewayDevice.Firewall.MacFilterService',
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
      host_cable_rate: 'InternetGatewayDevice.LANDevice.1.Hosts.Host.*.'+
        'NegotiatedRate',
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
        interface: 'InternetGatewayDevice.DownloadDiagnostics.Interface',
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
      statistics: {
        cpu_usage: 'InternetGatewayDevice.DeviceInfo.ProcessStatus.CPUUsage',
        memory_free: 'InternetGatewayDevice.DeviceInfo.MemoryStatus.Free',
        memory_total: 'InternetGatewayDevice.DeviceInfo.MemoryStatus.Total',
        memory_usage: '', // Some routers come with only the percentage in this
        // field, instead of both free and total memory
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
