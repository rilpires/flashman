/* eslint-disable no-prototype-builtins */
/* global __line */


/**
 * Interface functions with the ACS.
 * @namespace controllers/acsDeviceInfo
 */


const DevicesAPI = require('./external-genieacs/devices-api');
const TasksAPI = require('./external-genieacs/tasks-api');
const SchedulerCommon = require('./update_scheduler_common');
const controlApi = require('./external-api/control');
const DeviceModel = require('../models/device');
const DeviceVersion = require('../models/device_version');
const Notification = require('../models/notification');
const Config = require('../models/config');
const deviceHandlers = require('./handlers/devices');
const meshHandlers = require('./handlers/mesh');
const utilHandlers = require('./handlers/util.js');
const acsPortForwardHandler = require('./handlers/acs/port_forward.js');
const acsDiagnosticsHandler = require('./handlers/acs/diagnostics.js');
const acsMeshDeviceHandler = require('./handlers/acs/mesh.js');
const acsDeviceLogsHandler = require('./handlers/acs/logs.js');
const acsConnDevicesHandler = require('./handlers/acs/connected_devices.js');
const acsMeasuresHandler = require('./handlers/acs/measures.js');
const acsXMLConfigHandler = require('./handlers/acs/xmlconfig.js');
const macAccessControl = require('./handlers/acs/mac_access_control.js');
const wlanAccessControl = require('./handlers/acs/wlan_access_control.js');
const debug = require('debug')('ACS_DEVICE_INFO');
const t = require('./language').i18next.t;

let acsDeviceInfoController = {};

// Max number of sync requests concorrent (0 = disable)
const SYNCMAX = (process.env.FLM_SYNC_MAX || 0);

// Max time to wait for sync response (default to 30s)
const SYNCTIME = (process.env.FLM_SYNC_TIME || 30);

let syncStats = {
  cpes: 0,
  time: 0,
  timeout: 0,
};

// Show statistics every 10 minutes if have sync
if (SYNCMAX > 0) {
  setInterval(() => {
    if (syncStats.cpes > 0) {
      console.log(`RC STAT: CPEs: ${syncStats.cpes } `+
        `Time: ${(syncStats.time/syncStats.cpes ).toFixed(2)} ms `+
        `Timeouts: ${syncStats.timeout}`);
      syncStats.cpes = 0;
      syncStats.time = 0;
      syncStats.timeout = 0;
    }
  }, 10 * 60 * 1000);
}

let syncRateControl = new Map();

const addRCSync = function(acsID) {
  // RC Disabled
  if (SYNCMAX == 0) return true;

  const _now = new Date();

  for (const [_id, _startTime] of syncRateControl.entries()) {
    // Search for an old position
    if (_startTime + (SYNCTIME*1000) < _now) {
      syncStats.timeout++;
      syncRateControl.delete(_id);
    }
    // search for repeted acsID (sanity check, must not occour)
    if (_id == acsID) return false;
  }

  if (syncRateControl.size < SYNCMAX) {
    // we have slots.
    syncStats.cpes++;
    syncRateControl.set(acsID, _now);
    return true;
  }

  // we dont have more slots
  return false;
};

const removeRCSync = function(acsID) {
  if (SYNCMAX == 0) return;

  if (syncRateControl.has(acsID)) {
    const _now = new Date();
    const _startTime = syncRateControl.get(acsID);
    syncStats.time += _now - _startTime;
    syncRateControl.delete(acsID);
  }
};

const convertSubnetMaskToInt = function(mask) {
  if (mask === '255.255.255.0') {
    return 24;
  } else if (mask === '255.255.255.128') {
    return 25;
  } else if (mask === '255.255.255.192') {
    return 26;
  }
  return 0;
};

const convertWifiMode = function(mode, is5ghz) {
  switch (mode) {
    case '11b':
    case '11g':
    case '11bg':
    case 'b':
    case 'g':
    case 'bg':
    case 'b,g':
    case 'b/g':
    case 'g-only':
      return '11g';
    case '11bgn':
    case '11a':
    case '11na':
    case '11n':
    case 'a':
    case 'n':
    case 'g,n':
    case 'gn':
    case 'b,g,n':
    case 'b/g/n':
    case 'bgn':
    case 'an':
    case 'a,n':
    case 'a/n':
      return (is5ghz) ? '11na' : '11n';
    case '11ac':
    case 'ac':
    case 'nac':
    case 'anac':
    case 'a,n,ac':
    case 'a/n/ac':
    case 'ac,n,a':
    case 'ac,a,n':
    case 'ac,n':
    case 'an+ac':
      return (is5ghz) ? '11ac' : undefined;
    case '11ax':
    case 'ax':
    case 'a/n/ac/ax':
      return (is5ghz) ? '11ax' : undefined;
    default:
      return undefined;
  }
};

const convertWifiBand = function(cpe, band, mode, is5ghz) {
  let convertedMode = convertWifiMode(mode, is5ghz);
  let isAC = (convertedMode === '11ac' || convertedMode === '11ax');
  return cpe.convertWifiBandToFlashman(band, isAC);
};

const processHostFromURL = function(url) {
  if (typeof url !== 'string') return '';
  let doubleSlash = url.indexOf('//');
  if (doubleSlash < 0) {
    return url.split(':')[0];
  }
  let checkIpv6 = url.indexOf('[');
  if (checkIpv6 > 0) {
    return url.split('[')[1].split(']')[0];
  }
  let pathStart = url.substring(doubleSlash+2).indexOf('/');
  let endIndex = (pathStart >= 0) ? doubleSlash+2+pathStart : url.length;
  let hostAndPort = url.substring(doubleSlash+2, endIndex);
  return hostAndPort.split(':')[0];
};

const getPPPoEenabledMultiWan = function(cpe, multiwan, idx) {
  let hasPPPoE = false;
  let wan = multiwan[idx];
  if (wan.pppoe_enable && wan.pppoe_enable.value) {
    hasPPPoE = utilHandlers.convertToBoolean(wan.pppoe_enable.value);
  }
  return hasPPPoE;
};

const createRegistry = async function(req, cpe, permissions) {
  let data = req.body.data;
  let changes = {wan: {}, lan: {}, wifi2: {}, wifi5: {}, common: {}, stun: {}};
  let doChanges = false;
  let cpePermissions = cpe.modelPermissions();

  // Define WAN information before device creation
  let multiwan = utilHandlers.convertWanToFlashmanFormat(data.wan);
  let chosenWan = utilHandlers.chooseWan(multiwan,
    cpePermissions.useLastIndexOnWildcard);
  if (!chosenWan) {
    console.error(t('wanInformationCannotBeEmpty'));
    return false;
  }

  const hasPPPoE = getPPPoEenabledMultiWan(cpe, multiwan, chosenWan);
  data.wan = multiwan[chosenWan];
  data.wan.chosen_wan = chosenWan;

  // From now on, data.wan is a single chosen wan!
  const suffixPPPoE = hasPPPoE ? '_ppp' : '';

  let subnetNumber = convertSubnetMaskToInt(data.lan.subnet_mask.value);

  // Check for common.stun_udp_conn_req_addr to
  // get public IP address from STUN discovery
  let cpeIP;
  if (data.common.stun_enable &&
      data.common.stun_enable.value.toString() === 'true' &&
      data.common.stun_udp_conn_req_addr &&
      typeof data.common.stun_udp_conn_req_addr.value === 'string' &&
      data.common.stun_udp_conn_req_addr.value !== '') {
    cpeIP = processHostFromURL(data.common.stun_udp_conn_req_addr.value);
  } else {
    cpeIP = processHostFromURL(data.common.ip.value);
  }
  let splitID = req.body.acs_id.split('-');

  let matchedConfig = await Config.findOne({is_default: true},
    {device_update_schedule: false}).lean().catch(function(err) {
      console.error('Error creating entry: ' + err);
      return false;
    },
  );
  if (!matchedConfig) {
    console.error('Error creating entry. Config does not exists.');
    return false;
  }
  let macAddr = data.common.mac.value.toUpperCase();
  let model = (data.common.model) ? data.common.model.value : '';
  let wifi5Capable = cpePermissions.wifi.dualBand;
  let ssid = data.wifi2.ssid.value.trim();
  let ssid5ghz = '';
  if (wifi5Capable) {
    if (!data.wifi5.ssid || !data.wifi5.ssid.value) {
      console.log(`Error Creating entry in wifi5.ssid: ${req.body.acs_id}`);
      return false;
    }
    ssid5ghz = data.wifi5.ssid.value.trim();
  }
  let isSsidPrefixEnabled = false;
  let createPrefixErrNotification = false;
  // -> 'new registry' scenario
  let checkResponse = deviceHandlers.checkSsidPrefix(
    matchedConfig, ssid, ssid5ghz, false, true);
  // The function already returns what SSID we should be saving in the database
  // and what the local flag value should be, based on the global flag and SSID
  // values.
  isSsidPrefixEnabled = checkResponse.enablePrefix;
  ssid = checkResponse.ssid2;
  if (wifi5Capable) {
    ssid5ghz = checkResponse.ssid5;
  }
  // If the global flag was set to true and the function returned a false value
  // for the local flag, this means the prefix could not be activated - thus we
  // issue a warning notification for this device
  createPrefixErrNotification = (
    !checkResponse.enablePrefix &&
    matchedConfig.personalizationHash !== '' &&
    matchedConfig.isSsidPrefixEnabled
  );

  // Check for an alternative UID to replace serial field
  let altUid;
  if (data.common.alt_uid) {
    altUid = data.common.alt_uid.value;
  }

  let newMeshId = meshHandlers.genMeshID();
  let newMeshKey = meshHandlers.genMeshKey();

  let meshBSSIDs = {mesh2: '', mesh5: ''};
  if (!permissions.grantMeshV2HardcodedBssid) {
    if (
      data.mesh2 && data.mesh2.bssid && data.mesh2.bssid.value &&
      data.mesh2.bssid.value !== '00:00:00:00:00:00'
    ) {
      meshBSSIDs.mesh2 = data.mesh2.bssid.value.toUpperCase();
    }
    if (
      data.mesh5 && data.mesh5.bssid && data.mesh5.bssid.value &&
      data.mesh5.bssid.value !== '00:00:00:00:00:00'
    ) {
      meshBSSIDs.mesh5 = data.mesh5.bssid.value.toUpperCase();
    }
  } else {
    meshBSSIDs = await acsMeshDeviceHandler.getMeshBSSIDs(cpe, macAddr);
  }

  // Get channel information here to avoid ternary mess
  let wifi2Channel;
  let wifi5Channel;
  if (data.wifi2.channel && data.wifi2.auto) {
    let value = data.wifi2.auto.value;
    if (typeof value === 'string') {
      let isAuto = utilHandlers.isTrueValueString(value);
      wifi2Channel = (isAuto) ? 'auto' : data.wifi2.channel.value;
    } else {
      wifi2Channel = (value) ? 'auto' : data.wifi2.channel.value;
    }
  }
  if (wifi5Capable && data.wifi5.channel && data.wifi5.auto) {
    let value = data.wifi5.auto.value;
    if (typeof value === 'string') {
      let isAuto = utilHandlers.isTrueValueString(value);
      wifi5Channel = (isAuto) ? 'auto' : data.wifi5.channel.value;
    } else {
      wifi5Channel = (value) ? 'auto' : data.wifi5.channel.value;
    }
  }

  // Remove DHCP uptime for Archer C6
  let wanUptime;
  if (cpePermissions.wan.hasUptimeField) {
    if (hasPPPoE && data.wan.uptime_ppp && data.wan.uptime_ppp.value) {
      wanUptime = data.wan.uptime_ppp.value;
    } else if (data.wan.uptime && data.wan.uptime.value) {
      wanUptime = data.wan.uptime.value;
    }
    if (!hasPPPoE && !cpePermissions.wan.dhcpUptime) {
      wanUptime = undefined;
    }
  }

  let wanIP;
  if (hasPPPoE && data.wan.wan_ip_ppp && data.wan.wan_ip_ppp.value) {
    wanIP = data.wan.wan_ip_ppp.value;
  } else if (data.wan.wan_ip && data.wan.wan_ip.value) {
    wanIP = data.wan.wan_ip.value;
  }


  let maskIPv4;
  let pppoeIp;
  let pppoeMac;
  let defaultGatewayV4;
  let dnsServers;

  // WAN and LAN information
  if (permissions.grantWanLanInformation) {
    // IPv4 Mask
    if (
      cpePermissions.wan.hasIpv4MaskField &&
      data.wan['mask_ipv4' + suffixPPPoE] &&
      data.wan['mask_ipv4' + suffixPPPoE].value
    ) {
      let mask = parseInt(data.wan['mask_ipv4' + suffixPPPoE].value, 10);

      // Validate the mask as number
      if (!isNaN(mask) && mask >= 0 && mask <= 32) {
        maskIPv4 = mask;
      }
    }

    // Remote IP Address
    if (
      cpePermissions.wan.hasIpv4RemoteAddressField &&
      data.wan['remote_address' + suffixPPPoE] &&
      data.wan['remote_address' + suffixPPPoE].value
    ) {
      pppoeIp = data.wan['remote_address' + suffixPPPoE].value;
    }

    // Remote MAC
    if (
      cpePermissions.wan.hasIpv4RemoteMacField &&
      data.wan['remote_mac' + suffixPPPoE] &&
      data.wan['remote_mac' + suffixPPPoE].value
    ) {
      pppoeMac = data.wan['remote_mac' + suffixPPPoE].value;
    }

    // Default Gateway
    if (
      cpePermissions.wan.hasIpv4DefaultGatewayField &&
      data.wan['default_gateway' + suffixPPPoE] &&
      data.wan['default_gateway' + suffixPPPoE].value
    ) {
      defaultGatewayV4 = data.wan['default_gateway' + suffixPPPoE].value;
    }

    // DNS Servers
    if (
      cpePermissions.wan.hasDnsServerField &&
      data.wan['dns_servers' + suffixPPPoE] &&
      data.wan['dns_servers' + suffixPPPoE].value
    ) {
      dnsServers = data.wan['dns_servers' + suffixPPPoE].value;
    }
  }


  // IPv6
  let wanIPv6;
  let maskIPv6 = 0;
  let defaultGatewayIPv6;
  let prefixAddress;
  let prefixMask;
  let prefixLocal;

  if (
    permissions.grantWanLanInformation &&
    cpePermissions.features.hasIpv6Information
  ) {
    // Address
    if (
      cpePermissions.ipv6.hasAddressField &&
      data.ipv6['address' + suffixPPPoE] &&
      data.ipv6['address' + suffixPPPoE].value
    ) {
      let ip6addr = data.ipv6['address' + suffixPPPoE].value;
      // some devices (fiberhome) bring null sometimes
      if (ip6addr != 'null') {
        wanIPv6 = data.ipv6['address' + suffixPPPoE].value;
      }
    }

    // Mask
    if (
      cpePermissions.ipv6.hasMaskField &&
      data.ipv6['mask' + suffixPPPoE] &&
      data.ipv6['mask' + suffixPPPoE].value
    ) {
      let mask = parseInt(data.ipv6['mask' + suffixPPPoE].value, 10);

      // Validate the mask as number
      if (!isNaN(mask) && mask >= 0 && mask <= 128) {
        maskIPv6 = mask;
      }
    }

    // Default Gateway
    if (
      cpePermissions.ipv6.hasDefaultGatewayField &&
      data.ipv6['default_gateway' + suffixPPPoE] &&
      data.ipv6['default_gateway' + suffixPPPoE].value
    ) {
      defaultGatewayIPv6 = data.ipv6['default_gateway' + suffixPPPoE].value;
    }

    // Prefix Delegation Address
    if (
      cpePermissions.ipv6.hasPrefixDelegationAddressField &&
      data.ipv6['prefix_address' + suffixPPPoE] &&
      data.ipv6['prefix_address' + suffixPPPoE].value
    ) {
      prefixAddress = data.ipv6['prefix_address' + suffixPPPoE].value;

      // Try getting the mask from address
      let mask = utilHandlers.getMaskFromAddress(
        data.ipv6['prefix_address' + suffixPPPoE].value,
        true,
      );

      // If prefixAddress has '/', remove it
      prefixAddress = prefixAddress.split('/')[0];

      prefixMask = (mask ? mask : '');
    }

    // Prefix Delegation Mask
    // This value might have been setted from address, but this field has
    // precedence over extracting it from address, thus override the device
    if (
      cpePermissions.ipv6.hasPrefixDelegationMaskField &&
      data.ipv6['prefix_mask' + suffixPPPoE] &&
      data.ipv6['prefix_mask' + suffixPPPoE].value
    ) {
      prefixMask = data.ipv6['prefix_mask' + suffixPPPoE].value;
    }

    // Prefix Delegation Local Address
    if (
      cpePermissions.ipv6.hasPrefixDelegationLocalAddressField &&
      data.ipv6['prefix_local_address' + suffixPPPoE] &&
      data.ipv6['prefix_local_address' + suffixPPPoE].value
    ) {
      prefixLocal = data.ipv6['prefix_local_address' + suffixPPPoE].value;
    }
  }


  // WAN MAC Address - Device Model: wan_bssid
  let wanMacAddr;
  if (
    hasPPPoE && data.wan.wan_mac_ppp && data.wan.wan_mac_ppp.value
    && utilHandlers.isMacValid(data.wan.wan_mac_ppp.value)
  ) {
    wanMacAddr = data.wan.wan_mac_ppp.value.toUpperCase();
  } else if (
    data.wan.wan_mac && data.wan.wan_mac.value
    && utilHandlers.isMacValid(data.wan.wan_mac.value)
  ) {
    wanMacAddr = data.wan.wan_mac.value.toUpperCase();
  }


  let serialTR069 = cpe.convertGenieSerial(
    splitID[splitID.length - 1], macAddr,
  );

  // Collect PON signal, if available
  let rxPowerPon;
  let txPowerPon;
  if (data.wan.pon_rxpower && data.wan.pon_rxpower.value) {
    rxPowerPon = cpe.convertToDbm(data.wan.pon_rxpower.value);
  } else if (data.wan.pon_rxpower_epon && data.wan.pon_rxpower_epon.value) {
    rxPowerPon = cpe.convertToDbm(data.wan.pon_rxpower_epon.value);
  }
  if (data.wan.pon_txpower && data.wan.pon_txpower.value) {
    txPowerPon = cpe.convertToDbm(data.wan.pon_txpower.value);
  } else if (data.wan.pon_txpower_epon && data.wan.pon_txpower_epon.value) {
    txPowerPon = cpe.convertToDbm(data.wan.pon_txpower_epon.value);
  }

  // Force a web credentials sync
  let webAdminUser;
  let webAdminPass;
  let syncXmlConfigs = false;
  if (
    data.common.web_admin_username &&
    data.common.web_admin_username.writable &&
    matchedConfig.tr069.web_login
  ) {
    webAdminUser = matchedConfig.tr069.web_login;
    changes.common.web_admin_username = matchedConfig.tr069.web_login;
    doChanges = true;
  } else if (
    cpePermissions.stavixXMLConfig.webCredentials &&
    matchedConfig.tr069.web_login &&
    cpe.isAllowedWebadminUsername(matchedConfig.tr069.web_login)
  ) {
    webAdminUser = matchedConfig.tr069.web_login;
    syncXmlConfigs = true;
  }
  if (
    data.common.web_admin_password &&
    data.common.web_admin_password.writable &&
    matchedConfig.tr069.web_password
  ) {
    webAdminPass = matchedConfig.tr069.web_password;
    changes.common.web_admin_password = matchedConfig.tr069.web_password;
    doChanges = true;
  } else if (
    cpePermissions.stavixXMLConfig.webCredentials &&
    matchedConfig.tr069.web_password
  ) {
    webAdminPass = matchedConfig.tr069.web_password;
    syncXmlConfigs = true;
  }

  let wanMtu;
  if (hasPPPoE && data.wan.mtu_ppp && data.wan.mtu_ppp.value) {
    wanMtu = data.wan.mtu_ppp.value;
  } else if (!hasPPPoE && data.wan.mtu && data.wan.mtu.value) {
    wanMtu = data.wan.mtu.value;
  }
  let wanVlan;
  if (hasPPPoE && data.wan.vlan_ppp && data.wan.vlan_ppp.value) {
    wanVlan = data.wan.vlan_ppp.value;
  } else if (!hasPPPoE && data.wan.vlan && data.wan.vlan.value) {
    wanVlan = data.wan.vlan.value;
  }

  // Collect WAN max transmit rate, if available
  let wanRate;
  if (data.wan.rate && data.wan.rate.value
      && cpePermissions.wan.canTrustWanRate) {
    wanRate = cpe.convertWanRate(data.wan.rate.value);
  }
  let wanDuplex;
  if (data.wan.duplex && data.wan.duplex.value &&
    cpePermissions.wan.canTrustWanRate) {
    wanDuplex = data.wan.duplex.value;
  }

  let mode2;
  let band2;
  if (data.wifi2.mode && data.wifi2.mode.value) {
    mode2 = convertWifiMode(data.wifi2.mode.value, false);
    if (data.wifi2.band && data.wifi2.band.value) {
      band2 = convertWifiBand(
        cpe, data.wifi2.band.value, data.wifi2.mode.value, true,
      );
    }
  }

  let mode5;
  let band5;
  if (data.wifi5.mode && data.wifi5.mode.value) {
    mode5 = convertWifiMode(data.wifi5.mode.value, true);
    if (data.wifi5.band && data.wifi5.band.value) {
      band5 = convertWifiBand(
        cpe, data.wifi5.band.value, data.wifi5.mode.value, true,
      );
    }
  }

  let defaultPingHosts = matchedConfig.default_ping_hosts;
  // If config doesn't have a default, we force it to the legacy value here
  if (typeof defaultPingHosts == 'undefined' || defaultPingHosts.length == 0) {
    defaultPingHosts = [
      'www.google.com',
      'www.youtube.com',
      'www.facebook.com',
      'www.instagram.com',
    ];
  }

  // Update inform interval - compute custom based on config
  let customInterval = 300;
  if (data.common.interval && data.common.interval.value) {
    if (matchedConfig && matchedConfig.tr069) {
      let interval = parseInt(data.common.interval.value);
      let configInterval = matchedConfig.tr069.inform_interval;
      customInterval = deviceHandlers.makeCustomInformInterval(
        {use_tr069: true, acs_id: req.body.acs_id},
        parseInt(configInterval/1000),
      );
      if (!isNaN(interval) && interval !== customInterval) {
        changes.common.interval = customInterval;
        doChanges = true;
      }
    }
  }
  /* only process port mapping coming from sync if
    the feature is enabled to that device */
  let wrongPortMapping = false;
  let portMapping = [];
  if (cpePermissions.features.portForward &&
    ((data.wan.port_mapping_entries_ppp &&
      data.wan.port_mapping_entries_ppp.value > 0) ||
     (data.wan.port_mapping_entries_dhcp &&
      data.wan.port_mapping_entries_dhcp.value > 0))) {
    wrongPortMapping = true;
  }

  // Contains optionaly a list of DNS servers collected from the CPE
  let parsedDnsServers = [];
  // Contains optionaly a list of ipv4 and ipv6 DNS addresses
  // to be applied at LAN
  const defaultLanDnsServersObj = matchedConfig.default_dns_servers;

  // Logic that either sets a default list of DNS servers at LAN or get existing
  // ones from the CPE
  if ((defaultLanDnsServersObj.ipv4.length > 0) &&
      cpePermissions.lan.dnsServersWrite
  ) {
    const dnsLimit = cpePermissions.lan.dnsServersLimit;
    // Save the list at the CPE registry also
    parsedDnsServers = defaultLanDnsServersObj.ipv4.slice(0, dnsLimit);
    changes.lan.dns_servers = parsedDnsServers.join(',');
    doChanges = true;
  } else {
    // Collect DNS servers info and does not allow repeated values
    if (data.lan.dns_servers && data.lan.dns_servers.value) {
      let dnsServers = data.lan.dns_servers.value.split(',');
      for (let i=0; i<dnsServers.length; i++) {
        if (!parsedDnsServers.includes(dnsServers[i])) {
          parsedDnsServers.push(dnsServers[i]);
        }
      }
    }
  }

  let newDevice = new DeviceModel({
    _id: macAddr,
    use_tr069: true,
    secure_tr069: data.common.acs_url.value.includes('https'),
    serial_tr069: serialTR069,
    alt_uid_tr069: altUid,
    acs_id: req.body.acs_id,
    custom_inform_interval: customInterval,
    model: model,
    version: data.common.version.value,
    hw_version: data.common.hw_version.value,
    installed_release: data.common.version.value,
    release: data.common.version.value,
    connection_type: (hasPPPoE) ? 'pppoe' : 'dhcp',
    pppoe_user: (hasPPPoE) ? data.wan.pppoe_user.value : undefined,
    pppoe_password: (hasPPPoE) ? data.wan.pppoe_pass.value : undefined,
    pon_rxpower: rxPowerPon,
    pon_txpower: txPowerPon,
    wan_chosen: data.wan.chosen_wan,
    wan_vlan_id: wanVlan,
    wan_mtu: wanMtu,
    wan_bssid: wanMacAddr,
    wifi_ssid: ssid,
    wifi_bssid: (data.wifi2.bssid && data.wifi2.bssid.value) ?
      data.wifi2.bssid.value.toUpperCase() : undefined,
    wifi_channel: wifi2Channel,
    wifi_mode: mode2,
    wifi_band: band2,
    wifi_state: (data.wifi2.enable && data.wifi2.enable.value) ? 1 : 0,
    wifi_is_5ghz_capable: wifi5Capable,
    wifi_ssid_5ghz: ssid5ghz,
    wifi_bssid_5ghz: (data.wifi5.bssid && data.wifi5.bssid.value) ?
      data.wifi5.bssid.value.toUpperCase() : undefined,
    wifi_channel_5ghz: wifi5Channel,
    wifi_mode_5ghz: mode5,
    wifi_band_5ghz: band5,
    wifi_state_5ghz: (
      wifi5Capable && data.wifi5.enable && data.wifi5.enable.value
    ) ? 1 : 0,
    lan_subnet: data.lan.router_ip.value,
    lan_netmask: (subnetNumber > 0) ? subnetNumber : undefined,
    lan_dns_servers: (parsedDnsServers.length > 0) ?
                     parsedDnsServers.join(',') : undefined,
    port_mapping: portMapping,
    wrong_port_mapping: wrongPortMapping,
    ip: (cpeIP) ? cpeIP : undefined,
    wan_ip: wanIP,
    wan_ipv6: wanIPv6,
    wan_ipv4_mask: maskIPv4,
    wan_ipv6_mask: maskIPv6,
    wan_negociated_speed: wanRate,
    wan_negociated_duplex: wanDuplex,
    sys_up_time: data.common.uptime.value,
    wan_up_time: wanUptime,
    default_gateway_v4: defaultGatewayV4,
    default_gateway_v6: defaultGatewayIPv6,
    dns_server: dnsServers,
    pppoe_mac: pppoeMac,
    pppoe_ip: pppoeIp,
    prefix_delegation_addr: prefixAddress,
    prefix_delegation_mask: prefixMask,
    prefix_delegation_local: prefixLocal,
    created_at: Date.now(),
    last_contact: Date.now(),
    last_tr069_sync: Date.now(),
    isSsidPrefixEnabled: isSsidPrefixEnabled,
    web_admin_username: webAdminUser,
    web_admin_password: webAdminPass,
    mesh_mode: 0,
    mesh_key: newMeshKey,
    mesh_id: newMeshId,
    bssid_mesh2: meshBSSIDs.mesh2,
    bssid_mesh5: meshBSSIDs.mesh5,
    ping_hosts: defaultPingHosts,
  });
  try {
    await newDevice.save();
    await acsDeviceInfoController.reportOnuDevices(req.app, [newDevice]);
  } catch (err) {
    console.error('Error on device tr-069 creation: ' + err);
    return false;
  }
  // Update SSID prefix on CPE if enabled
  if (isSsidPrefixEnabled) {
    changes.wifi2.ssid = ssid;
    changes.wifi5.ssid = ssid5ghz;
    doChanges = true;
  }
  // If has STUN Support in the model and
  // if STUN Enable flag is different from actual configuration
  if (permissions.grantSTUN &&
      data.common.stun_enable.value.toString() !==
      matchedConfig.tr069.stun_enable.toString()) {
    changes.common.stun_enable = matchedConfig.tr069.stun_enable;
    changes.stun.address = matchedConfig.tr069.server_url;
    changes.stun.port = 3478;
    doChanges = true;
  }
  if (cpePermissions.lan.needEnableConfig) {
    changes.lan.enable_config = '1';
  }

  if (doChanges) {
    // Increment sync task loops
    newDevice.acs_sync_loops += 1;
    // Possibly TODO: Let acceptLocalChanges be configurable for the admin
    let acceptLocalChanges = false;
    if (!acceptLocalChanges) {
      // Delay the execution of this function as it needs the device to exists
      // in genie database, but the device will only be created at the end of
      // this function, thus causing a racing condition.
      acsDeviceInfoController.delayExecutionGenie(
        newDevice,
        async () => {
          await acsDeviceInfoController
            .updateInfo(newDevice, changes, false);
        },
      );
    }
  }

  if (syncXmlConfigs) {
    // Delay the execution of this function as it needs the device to exists in
    // genie database, but the device will only be created at the end of this
    // function, thus causing a racing condition.
    acsDeviceInfoController.delayExecutionGenie(
      newDevice,
      async () => {
        await acsXMLConfigHandler
          .configFileEditing(newDevice, ['web-admin']);
      },
    );
  }

  if (createPrefixErrNotification) {
    // Notify if ssid prefix was impossible to be assigned
    let matchedNotif = await Notification
    .findOne({'message_code': 5, 'target': newDevice._id})
    .catch(function(err) {
      console.error('Error fetching database: ' + err);
    });
    if (!matchedNotif || matchedNotif.allow_duplicate) {
      let notification = new Notification({
        'message': t('ssidPrefixInvalidLength', {errorline: __line}),
        'message_code': 5,
        'severity': 'alert',
        'type': 'communication',
        'action_title': t('Ok'),
        'allow_duplicate': false,
        'target': newDevice._id,
      });
      await notification.save().catch(
        function(err) {
          console.error('Error creating notification: ' + err);
      });
    }
  }
  return true;
};
/*
 * This function is being exported in order to test it.
 * The ideal way is to have a condition to only export it when testing
 */
acsDeviceInfoController.__testCreateRegistry = createRegistry;


/**
 * This function calls an async function (`func`) after `delayTime`. If it
 * fails, the `func` will be called again with twice the time it was executed.
 * It will repeat this process until the device exists in genie or the
 * `repeatQuantity` reaches zero. Every iteration, the `repeatQuantity` will be
 * reduced by one and `delayTime` will doubled from what it was before.
 *
 * @memberof controllers/acsDeviceInfo
 *
 * @param {Device} device - The device to execute the function on.
 * @param {Function} func - The function that will be called.
 * @param {Integer} repeatQuantity - Amount of repetitions until giving up.
 * calling the function
 * @param {Integer} delayTime - Amount of time to call the function again.
 *
 * @return {Object} The object containing:
 *  - `success`: If could start the delay loop;
 *  - `executed`: If could execute the `func`;
 *  - `message`: An error or okay message about what happened;
 *  - `result`: the return of `func`, only included if could ran the `func`.
 */
acsDeviceInfoController.delayExecutionGenie = async function(
  device,
  func,
  repeatQuantity = 3,
  delayTime = 1000,
) {
  // Exit if repeatQuantity or delayTime is less than 0
  if (repeatQuantity <= 0 || delayTime <= 0) {
    console.log('Invalid parameters passed');
    return {
      success: false,
      executed: false,
      message: t('parametersError', {errorline: __line}),
    };
  }

  let sleepTime = delayTime;

  // Loop the amount of repeatQuantity
  for (let repeat = repeatQuantity; repeat > 0; repeat--) {
    // Try getting the device from genie database
    let query = {_id: device.acs_id};
    let genieDevice = await TasksAPI
        .getFromCollection('devices', query, '_id');


    // Check if device does exist
    if (
      genieDevice && genieDevice.length > 0 &&
      genieDevice[0]._id === device.acs_id
    ) {
      // Call the function
      let result = await func();

      return {
        success: true,
        executed: true,
        result: result,
        message: t('Ok'),
      };
    }

    // Wait until timeout sleepTime timer
    await utilHandlers.sleep(sleepTime);

    // Double the timer
    sleepTime = 2 * sleepTime;
  }


  return {
    success: true,
    executed: false,
    message: t('noDevicesFound'),
  };
};


/**
 * Receives GenieACS inform event, to register the CPE as online - updating last
 * contact information. For new CPEs, it replies with "measure" as true, to
 * signal that GenieACS needs to collect information manually. For registered
 * CPEs, it calls `requestSync` to check for fields that need syncing.
 *
 * @memberof controllers/acsDeviceInfo
 *
 * @param {Request} req - The http request.
 * @param {Response} res - The http response.
 *
 * @return {Response} The body of the response might contains:
 *  - `success`: If could execute the operation;
 *  - `measure`: If needs to update measures;
 *  - `measure_type`: If it is a new device or just updating one;
 *  - `connection_login`: The TR-069 connection username;
 *  - `connection_password`: The TR-069 connection password;
 *  - `sync_connection_login`: If needs to sync.
 */
acsDeviceInfoController.informDevice = async function(req, res) {
  let dateNow = Date.now();
  let id = req.body.acs_id;
  let config = undefined;
  let device = undefined;

  try {
    device = await DeviceModel.findOne({acs_id: id});
  } catch (error) {
    console.log('Error getting device in informDevice: ('
      + id +'):' + error);
    return res.status(500).json({success: false,
      message: t('cpeFindError', {errorline: __line})});
  }

  let doFullSync = false;
  let doChangeSync = false;
  let doSync = false;
  let incorrectLogin = false;

  if (device) {
    // Why is a non tr069 device calling this function? Just a sanity check
    if (!device.use_tr069) {
      return res.status(500).json({
        success: false,
        message: t('nonTr069AcsSyncError', {errorline: __line}),
      });
    }

    device.last_contact = dateNow;
    doFullSync = ((device.do_update && device.do_update_status === 0) ||
    device.recovering_tr069_reset);

    if (req.body.events) {
      // Check if this is a bootstrap event
      // Bootstrap events happens when CPE is Factory Reset
      if (req.body.events.bootstrap) {
        // Do a full sync
        doFullSync = true;
      } else
      // Changes need to ask for information from the CPE
      if (req.body.events.change) {
        // Do a full sync
        doChangeSync = true;
      }
    }

    // Check if connection password is empty
    // this can happen when update information of TR069
    // from CPE
    if (req.body.connection && req.body.connection.password === '') {
      incorrectLogin = true;
    }

    // Return fast if we do not need to do a Sync
    // And we do not need to update connection login.
    //
    // Registered devices should always collect information through
    // flashman, never using genieacs provision
    if (!doFullSync && !device.do_tr069_update_connection_login
      && !incorrectLogin) {
      res.status(200).json({success: true, measure: false});
    }
  }

  // Get the config
  // From now on, everything needs the config
  try {
    config = await Config.findOne(
      {is_default: true},
      {tr069: true},
    ).lean();
  } catch (error) {
    console.log('Error getting config in informDevice: ' + error);
  }

  if (!config && !res.headersSent) {
    return res.status(500).json({
      success: false,
      message: t('configFindError', {errorline: __line}),
    });
  }

  if (config && config.tr069) {
    let connection = {
      login: config.tr069.connection_login,
      password: config.tr069.connection_password,
    };

    // New devices need to sync immediately
    // Always update login in new devices
    // As device is new, it has not returned yet
    if (!device) {
      return res.status(200).json({
        success: true,
        measure: true,
        measure_type: 'newDevice',
        connection: connection,
      });
    }

    // Devices recovering from hard reset or upgrading their firmware need to go
    // through an immediate full sync
    if (doFullSync) {
      if (device.do_tr069_update_connection_login) {
        device.do_tr069_update_connection_login = false;
      }

      device.last_tr069_sync = dateNow;

      res.status(200).json({
        success: true,
        measure: true,
        measure_type: 'updateDevice',
        connection: connection,
      });
    } else {
      // Only request a sync if over the sync threshold
      let syncDiff = dateNow - device.last_tr069_sync;
      // Give an extra 10 seconds to buffer out race conditions
      syncDiff += 10000;

      // For now, a ChangeSync is the same as the normal sync
      // In the future, put the changes in a "fast lane"
      // Only updating ip information or other things
      if (doChangeSync || (syncDiff >= config.tr069.sync_interval)) {
        if (addRCSync(id)) {
          device.last_tr069_sync = dateNow;
          doSync = true;
        }
      }

      if (device.do_tr069_update_connection_login || incorrectLogin) {
        // Need to update connection request login
        // If its a mass change in CR, do the update only at sync
        if (doSync || incorrectLogin) {
          device.do_tr069_update_connection_login = false;
        } else {
          connection = undefined;
        }

        res.status(200).json({
          success: true,
          measure: false,
          connection: connection,
        });
      }
    }
  }

  if (!res.headersSent) {
    // Check if result has been sent
    // Sanity check - We can never reach this
    // as a result must be answered above!
    console.log('Error: No result in InformDevice');
    return res.status(500).json({
      success: false,
      message: t('Error'),
    });
  }

  await device.save().catch((err) => {
    console.log('Error saving last contact and last tr-069 sync');
  });

  if (doSync) {
    acsDeviceInfoController.requestSync(device);
  }
};

// Builds and sends getParameterValues task to cpe - should only ask for
// parameters that make sense in this cpe's context
acsDeviceInfoController.requestSync = async function(device) {
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let permissions = DeviceVersion.devicePermissions(device);
  let cpePermissions = cpe.modelPermissions();
  let isTR181 = cpePermissions.isTR181;
  let dataToFetch = {
    basic: false,
    alt_uid: false,
    web_admin_user: false,
    web_admin_pass: false,
    wan: false,
    ipv6: false,
    vlan: false,
    bytes: false,
    pon: false,
    lan: false,
    wifi2: false,
    wifi5: false,
    wifiMode: false,
    wifiBand: false,
    mesh2: false,
    mesh5: false,
    port_forward: false,
    stun: false,
    fields: fields,
  };
  let parameterNames = [];
  // Basic fields that should be updated often
  dataToFetch.basic = true;
  parameterNames.push(fields.common.ip);
  parameterNames.push(fields.common.version);
  parameterNames.push(fields.common.uptime);
  parameterNames.push(fields.common.acs_url);
  parameterNames.push(fields.common.interval);
  if (fields.common.alt_uid) {
    dataToFetch.alt_uid = true;
    parameterNames.push(fields.common.alt_uid);
  }
  if (fields.common.web_admin_username) {
    dataToFetch.web_admin_user = true;
    parameterNames.push(fields.common.web_admin_username);
  }
  if (fields.common.web_admin_password) {
    dataToFetch.web_admin_pass = true;
    parameterNames.push(fields.common.web_admin_password);
  }

  // WAN configuration fields
  dataToFetch.wan = true;
  dataToFetch.bytes = true;
  if (permissions.grantPonSignalSupport) {
    dataToFetch.pon = true;
  }
  if (fields.wan.vlan_ppp) {
    dataToFetch.vlan_ppp = true;
  }
  if (fields.wan.vlan) {
    dataToFetch.vlan = true;
  }
  if (
    permissions.grantPortForward &&
    fields.wan.port_mapping_entries_dhcp &&
    fields.wan.port_mapping_entries_ppp
  ) {
    dataToFetch.port_forward = true;
  }

  let result = DevicesAPI.getWanNodes(fields, isTR181, false);
  parameterNames = parameterNames.concat(result);

  // WAN and LAN information - IPv6
  if (
    permissions.grantWanLanInformation &&
    cpePermissions.features.hasIpv6Information
  ) {
    dataToFetch.ipv6 = true;

    // Get all fields that can be requested
    // Address
    if (cpePermissions.ipv6.hasAddressField) {
      if (fields.ipv6.address) {
        parameterNames.push(fields.ipv6.address);
      }

      if (fields.ipv6.address_ppp) {
        parameterNames.push(fields.ipv6.address_ppp);
      }
    }

    // Mask
    if (cpePermissions.ipv6.hasMaskField) {
      if (fields.ipv6.mask) {
        parameterNames.push(fields.ipv6.mask);
      }

      if (fields.ipv6.mask_ppp) {
        parameterNames.push(fields.ipv6.mask_ppp);
      }
    }

    // Default Gateway
    if (cpePermissions.ipv6.hasDefaultGatewayField) {
      if (fields.ipv6.default_gateway) {
        parameterNames.push(fields.ipv6.default_gateway);
      }

      if (fields.ipv6.default_gateway_ppp) {
        parameterNames.push(fields.ipv6.default_gateway_ppp);
      }
    }

    // Prefix Delegation Address
    if (cpePermissions.ipv6.hasPrefixDelegationAddressField) {
      if (fields.ipv6.prefix_delegation_address) {
        parameterNames.push(fields.ipv6.prefix_delegation_address);
      }

      if (fields.ipv6.prefix_delegation_address_ppp) {
        parameterNames.push(fields.ipv6.prefix_delegation_address_ppp);
      }
    }

    // Prefix Delegation Mask
    if (cpePermissions.ipv6.hasPrefixDelegationMaskField) {
      if (fields.ipv6.prefix_delegation_mask) {
        parameterNames.push(fields.ipv6.prefix_delegation_mask);
      }

      if (fields.ipv6.prefix_delegation_mask_ppp) {
        parameterNames.push(fields.ipv6.prefix_delegation_mask_ppp);
      }
    }

    // Prefix Delegation Local Address
    if (cpePermissions.ipv6.hasPrefixDelegationLocalAddressField) {
      if (fields.ipv6.prefix_delegation_local_address) {
        parameterNames.push(fields.ipv6.prefix_delegation_local_address);
      }

      if (fields.ipv6.prefix_delegation_local_address_ppp) {
        parameterNames.push(fields.ipv6.prefix_delegation_local_address_ppp);
      }
    }
  }

  // LAN configuration fields
  dataToFetch.lan = true;
  parameterNames.push(fields.lan.router_ip);
  parameterNames.push(fields.lan.subnet_mask);
  // WiFi configuration fields
  dataToFetch.wifi2 = true;
  parameterNames.push(fields.wifi2.enable);
  parameterNames.push(fields.wifi2.bssid);
  parameterNames.push(fields.wifi2.ssid);
  parameterNames.push(fields.wifi2.password);
  parameterNames.push(fields.wifi2.channel);
  parameterNames.push(fields.wifi2.auto);
  if (fields.wifi2.mode && permissions.grantWifiModeRead) {
    dataToFetch.wifiMode = true;
    parameterNames.push(fields.wifi2.mode);
  }
  if (fields.wifi2.band && permissions.grantWifiBandRead2) {
    dataToFetch.wifiBand = true;
    parameterNames.push(fields.wifi2.band);
  }
  if (device.wifi_is_5ghz_capable) {
    dataToFetch.wifi5 = true;
    parameterNames.push(fields.wifi5.enable);
    parameterNames.push(fields.wifi5.bssid);
    parameterNames.push(fields.wifi5.ssid);
    parameterNames.push(fields.wifi5.password);
    parameterNames.push(fields.wifi5.channel);
    parameterNames.push(fields.wifi5.auto);
    if (fields.wifi5.mode && permissions.grantWifiModeRead) {
      dataToFetch.wifiMode = true;
      parameterNames.push(fields.wifi5.mode);
    }
    if (fields.wifi5.band && permissions.grantWifiBandRead5) {
      dataToFetch.wifiBand = true;
      parameterNames.push(fields.wifi5.band);
    }
  }
  // Mesh WiFi configuration fields - only if in wifi mesh mode
  if (device.mesh_mode === 2 || device.mesh_mode === 4) {
    dataToFetch.mesh2 = true;
    parameterNames.push(fields.mesh2.enable);
    parameterNames.push(fields.mesh2.bssid);
    parameterNames.push(fields.mesh2.ssid);
  }
  if (
    device.wifi_is_5ghz_capable &&
    (device.mesh_mode === 3 || device.mesh_mode === 4)
  ) {
    dataToFetch.mesh5 = true;
    parameterNames.push(fields.mesh5.enable);
    parameterNames.push(fields.mesh5.bssid);
    parameterNames.push(fields.mesh5.ssid);
  }
  // Stun configuration fields - only if has support
  if (permissions.grantSTUN) {
    dataToFetch.stun = true;
    parameterNames.push(fields.common.stun_enable);
    parameterNames.push(fields.common.stun_udp_conn_req_addr);
  }

  // Send task to GenieACS
  let task = {name: 'getParameterValues', parameterNames: parameterNames};
  let cback = (acsID)=>fetchSyncResult(acsID, dataToFetch, parameterNames, cpe);
  TasksAPI.addTask(device.acs_id, task, cback);
};

// Extract data from raw GenieACS json output, in value/writable format
const getFieldFromGenieData = function(data, field, useLastIndexOnWildcard) {
  if (typeof field === 'undefined') return {};
  let obj = utilHandlers.getFromNestedKey(data, field, useLastIndexOnWildcard);
  if (typeof obj === 'undefined') return {};
  if (!('_value' in obj) || !('_writable' in obj)) return {};
  return {value: obj['_value'], writable: obj['_writable']};
};

// Collect sync data from cpe using genie database api - should then format it
// according to legacy genieacs provision format and send it to syncDeviceData
const fetchSyncResult = async function(
  acsID, dataToFetch, parameterNames, cpe,
) {
  removeRCSync(acsID);

  let query = {_id: acsID};
  let useLastIndexOnWildcard = cpe.modelPermissions().useLastIndexOnWildcard;
  // Remove * from each field - projection does not work with wildcards
  parameterNames = parameterNames.map((p) => {
    return p.replace(/\.\*.*/g, '');
  });
  // Remove duplicated elements
  parameterNames = [...new Set(parameterNames)];
  // Remove repeted leafs (remove A.B.C if A.B exist)
  parameterNames = parameterNames.filter(
    (r) => !parameterNames.some((a) => r.startsWith(a+'.')));

  let projection = parameterNames.join(',');

  let data = await TasksAPI.getFromCollection('devices', query, projection)
    .catch((err) => {
      console.log(`ERROR IN fetchSyncResult TaskAPI: ${err}`);
      return undefined;
    });
  if (!data) return;
  data = data[0];

  let device = await DeviceModel.findOne({acs_id: acsID},
    {ap_survey: 0})
    .exec().catch((err) => {
      console.log(`ERROR IN fetchSyncResult Device find: ${err}`);
      return undefined;
    });

  if (!device || !device.use_tr069) {
    console.log(`Device not found in fetchSyncResult: ${acsID}`);
    return;
  }

  let fields = dataToFetch.fields;
  let acsData = {
   common: {}, wan: {}, lan: {}, wifi2: {}, wifi5: {}, mesh2: {}, mesh5: {},
   ipv6: {},
  };
  if (dataToFetch.basic) {
    let common = fields.common;
    acsData.common.ip = getFieldFromGenieData(
      data, common.ip, useLastIndexOnWildcard,
    );
    acsData.common.version = getFieldFromGenieData(
      data, common.version, useLastIndexOnWildcard,
    );
    acsData.common.uptime = getFieldFromGenieData(
      data, common.uptime, useLastIndexOnWildcard,
    );
    acsData.common.acs_url = getFieldFromGenieData(
      data, common.acs_url, useLastIndexOnWildcard,
    );
    acsData.common.interval = getFieldFromGenieData(
      data, common.interval, useLastIndexOnWildcard,
    );
  }
  if (dataToFetch.alt_uid) {
    acsData.common.alt_uid = getFieldFromGenieData(
      data, fields.common.alt_uid, useLastIndexOnWildcard,
    );
  }
  if (dataToFetch.web_admin_user) {
    acsData.common.web_admin_username = getFieldFromGenieData(
      data, fields.common.web_admin_username, useLastIndexOnWildcard,
    );
  }
  if (dataToFetch.web_admin_pass) {
    acsData.common.web_admin_password = getFieldFromGenieData(
      data, fields.common.web_admin_password, useLastIndexOnWildcard,
    );
  }

  // WAN
  if (dataToFetch.wan || dataToFetch.vlan || dataToFetch.vlan_ppp
    || dataToFetch.bytes || dataToFetch.pon || dataToFetch.port_forward) {
    acsData.wan = await
      acsDeviceInfoController.getMultiWan(acsID, cpe);
  }

  // IPv6
  if (dataToFetch.ipv6) {
    // Address
    acsData.ipv6.address = getFieldFromGenieData(
      data, fields.ipv6.address, useLastIndexOnWildcard,
    );
    acsData.ipv6.address_ppp = getFieldFromGenieData(
      data, fields.ipv6.address_ppp, useLastIndexOnWildcard,
    );

    // Mask
    acsData.ipv6.mask = getFieldFromGenieData(
      data, fields.ipv6.mask, useLastIndexOnWildcard,
    );
    acsData.ipv6.mask_ppp = getFieldFromGenieData(
      data, fields.ipv6.mask_ppp, useLastIndexOnWildcard,
    );

    // Default Gateway
    acsData.ipv6.default_gateway = getFieldFromGenieData(
      data, fields.ipv6.default_gateway, useLastIndexOnWildcard,
    );
    acsData.ipv6.default_gateway_ppp = getFieldFromGenieData(
      data, fields.ipv6.default_gateway_ppp, useLastIndexOnWildcard,
    );

    // Prefix Delegation Address
    acsData.ipv6.prefix_address = getFieldFromGenieData(
      data,
      fields.ipv6.prefix_delegation_address,
      useLastIndexOnWildcard,
    );
    acsData.ipv6.prefix_address_ppp = getFieldFromGenieData(
      data,
      fields.ipv6.prefix_delegation_address_ppp,
      useLastIndexOnWildcard,
    );

    // Prefix Delegation Mask
    acsData.ipv6.prefix_mask = getFieldFromGenieData(
      data,
      fields.ipv6.prefix_delegation_mask,
      useLastIndexOnWildcard,
    );
    acsData.ipv6.prefix_mask_ppp = getFieldFromGenieData(
      data,
      fields.ipv6.prefix_delegation_mask_ppp,
      useLastIndexOnWildcard,
    );

    // Prefix Delegation Local Address
    acsData.ipv6.prefix_local_address = getFieldFromGenieData(
      data,
      fields.ipv6.prefix_delegation_local_address,
      useLastIndexOnWildcard,
    );
    acsData.ipv6.prefix_local_address_ppp = getFieldFromGenieData(
      data,
      fields.ipv6.prefix_delegation_local_address,
      useLastIndexOnWildcard,
    );
  }

  if (dataToFetch.lan) {
    let lan = fields.lan;
    acsData.lan.router_ip = getFieldFromGenieData(
      data, lan.router_ip, useLastIndexOnWildcard);
    acsData.lan.subnet_mask = getFieldFromGenieData(
      data, lan.subnet_mask, useLastIndexOnWildcard,
    );
  }
  if (dataToFetch.wifi2) {
    let wifi2 = fields.wifi2;
    acsData.wifi2.enable = getFieldFromGenieData(
      data, wifi2.enable, useLastIndexOnWildcard,
    );
    acsData.wifi2.bssid = getFieldFromGenieData(
      data, wifi2.bssid, useLastIndexOnWildcard,
    );
    acsData.wifi2.ssid = getFieldFromGenieData(
      data, wifi2.ssid, useLastIndexOnWildcard,
    );
    acsData.wifi2.password = getFieldFromGenieData(
      data, wifi2.password, useLastIndexOnWildcard,
    );
    acsData.wifi2.channel = getFieldFromGenieData(
      data, wifi2.channel, useLastIndexOnWildcard,
    );
    acsData.wifi2.auto = getFieldFromGenieData(
      data, wifi2.auto, useLastIndexOnWildcard,
    );
    if (dataToFetch.wifiMode) {
      acsData.wifi2.mode = getFieldFromGenieData(
        data, wifi2.mode, useLastIndexOnWildcard,
      );
    }
    if (dataToFetch.wifiBand) {
      acsData.wifi2.band = getFieldFromGenieData(
        data, wifi2.band, useLastIndexOnWildcard,
      );
    }
  }
  if (dataToFetch.wifi5) {
    let wifi5 = fields.wifi5;
    acsData.wifi5.enable = getFieldFromGenieData(
      data, wifi5.enable, useLastIndexOnWildcard,
    );
    acsData.wifi5.bssid = getFieldFromGenieData(
      data, wifi5.bssid, useLastIndexOnWildcard,
    );
    acsData.wifi5.ssid = getFieldFromGenieData(
      data, wifi5.ssid, useLastIndexOnWildcard,
    );
    acsData.wifi5.password = getFieldFromGenieData(
      data, wifi5.password, useLastIndexOnWildcard,
    );
    acsData.wifi5.channel = getFieldFromGenieData(
      data, wifi5.channel, useLastIndexOnWildcard,
    );
    acsData.wifi5.auto = getFieldFromGenieData(
      data, wifi5.auto, useLastIndexOnWildcard,
    );
    if (dataToFetch.wifiMode) {
      acsData.wifi5.mode = getFieldFromGenieData(
        data, wifi5.mode, useLastIndexOnWildcard,
      );
    }
    if (dataToFetch.wifiBand) {
      acsData.wifi5.band = getFieldFromGenieData(
        data, wifi5.band, useLastIndexOnWildcard,
      );
    }
  }
  if (dataToFetch.mesh2) {
    let mesh2 = fields.mesh2;
    acsData.mesh2.enable = getFieldFromGenieData(
      data, mesh2.enable, useLastIndexOnWildcard,
    );
    acsData.mesh2.bssid = getFieldFromGenieData(
      data, mesh2.bssid, useLastIndexOnWildcard,
    );
    acsData.mesh2.ssid = getFieldFromGenieData(
      data, mesh2.ssid, useLastIndexOnWildcard,
    );
  }
  if (dataToFetch.mesh5) {
    let mesh5 = fields.mesh5;
    acsData.mesh5.enable = getFieldFromGenieData(
      data, mesh5.enable, useLastIndexOnWildcard,
    );
    acsData.mesh5.bssid = getFieldFromGenieData(
      data, mesh5.bssid, useLastIndexOnWildcard,
    );
    acsData.mesh5.ssid = getFieldFromGenieData(
      data, mesh5.ssid, useLastIndexOnWildcard,
    );
  }
  if (dataToFetch.stun) {
    acsData.common.stun_enable = getFieldFromGenieData(
      data, fields.common.stun_enable, useLastIndexOnWildcard,
    );
    acsData.common.stun_udp_conn_req_addr = getFieldFromGenieData(
      data, fields.common.stun_udp_conn_req_addr, useLastIndexOnWildcard,
    );
  }

  let permissions = DeviceVersion.devicePermissions(device);
  syncDeviceData(acsID, device, acsData, permissions);
};
/*
 * This function is being exported in order to test it.
 * The ideal way is to have a condition to only export it when testing
 */
acsDeviceInfoController.__testFetchSyncResult = fetchSyncResult;

/**
 * Legacy GenieACS sync function that is still used for new devices and devices
 * that are recovering from hard reset or from a new firmware upgrade - should
 * only query the database and call `createRegistry`/`syncDeviceData`
 * accordingly.
 *
 * @memberof controllers/acsDeviceInfo
 *
 * @param {Request} req - The HTTP request.
 * @param {Response} res - The HTTP response.
 *
 * @return {Response} The body of the response might contains:
 *  - `success`: If could execute the function properly;
 *  - `message`: The message of what happenned if `success` is false.
 */
acsDeviceInfoController.syncDevice = async function(req, res) {
  let data = req.body.data;
  if (!data || !data.common || !data.common.mac || !data.common.mac.value) {
    return res.status(500).json({
      success: false,
      message: t('fieldNameMissing', {name: 'mac', errorline: __line}),
    });
  }
  let splitID = req.body.acs_id.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  // Convert mac field from - to : if necessary
  if (data.common.mac.value.includes('-')) {
    data.common.mac.value = data.common.mac.value.replace(/-/g, ':');
  }

  let bootstrap = false;
  if (req.body.events && req.body.events.bootstrap) {
    bootstrap = true;
  }

  let device = await DeviceModel.findById(data.common.mac.value.toUpperCase());
  // Fetch functionalities of CPE
  let permissions = null;
  if (!device && data.common.model &&
      data.common.version && data.common.hw_version) {
    permissions = DeviceVersion.devicePermissionsNotRegistered(
      model, data.common.model.value,
      data.common.version.value, data.common.hw_version.value,
    );
  } else {
    permissions = DeviceVersion.devicePermissions(device);
  }
  if (!permissions) {
    return res.status(500).json({
      success: false,
      message: t('permissionFindError', {errorline: __line}),
    });
  }
  if (!device) {
    let cpe = DevicesAPI.instantiateCPEByModel(
      model, data.common.model.value,
      data.common.version.value, data.common.hw_version.value,
    ).cpe;
    if (await createRegistry(req, cpe, permissions)) {
      return res.status(200).json({success: true});
    } else {
      return res.status(500).json({
        success: false,
        message: t('acsCreateCpeRegistryError', {errorline: __line}),
      });
    }
  }
  if (!device.use_tr069) {
    return res.status(500).json({
      success: false,
      message: t('nonTr069AcsSyncError', {errorline: __line}),
    });
  }
  // We don't need to wait - can free session immediately
  res.status(200).json({success: true});
  // And finally, we sync data if CPE was already registered
  syncDeviceData(req.body.acs_id, device, data, permissions, bootstrap);
};

const syncWanData = function(device, multiwan, chosenWan, cpe, hardReset) {
  let cpePermissions = cpe.modelPermissions();
  let changes = {};

  const hasPPPoE = getPPPoEenabledMultiWan(cpe, multiwan, chosenWan);
  const suffixPPPoE = hasPPPoE ? '_ppp' : '';

  device.connection_type = (hasPPPoE) ? 'pppoe' : 'dhcp';
  device.wan_chosen = chosenWan;
  let data = multiwan[chosenWan];

  // Process WAN fields, separated by connection type
  if (hasPPPoE === true) {
    // Process PPPoE user field
    let localPPPUser = '';
    let remotePPPUser = '';
    let localPPPPassword = '';
    let remotePPPPassword = '';

    if (data.pppoe_user && data.pppoe_user.value) {
      remotePPPUser = data.pppoe_user.value.trim();
    }
    if (device.pppoe_user) {
      localPPPUser = device.pppoe_user.trim();
    }

    if (data.pppoe_pass && data.pppoe_pass.value) {
      remotePPPPassword = data.pppoe_pass.value.trim();
    }
    if (device.pppoe_password) {
      localPPPPassword = device.pppoe_password.trim();
    }

    // BASE -> CPE
    // 1) HAve user and pass in DB
    // 2) hard reset event
    // CPE -> BASE
    // 1) Do not have user in DB
    // 2) If have user and user is different from DB
    //    Update user and pass even if pass is empty
    //    But only if not a hard reset

    if (!localPPPUser || (localPPPUser!=remotePPPUser && !hardReset)) {
      // DB do not have PPP user
      // OR DB User is different from remote user and is not a hardReset
      // Get information from the CPE
      device.pppoe_user = remotePPPUser;
      device.pppoe_password = remotePPPPassword;
    } else {
      // DB have a user
      if (localPPPPassword && hardReset && (localPPPUser!==remotePPPUser)) {
        // DB have user and password
        // And is a hard reset
        // Define PPP in CPE
        changes.pppoe_user = localPPPUser;
        changes.pppoe_pass = localPPPPassword;
      }
    }

    // Process other fields like IP, uptime and MTU
    if (data.wan_ip_ppp && data.wan_ip_ppp.value) {
      device.wan_ip = data.wan_ip_ppp.value;
    }
    // Get WAN MAC address
    if (data.wan_mac_ppp && data.wan_mac_ppp.value
        && utilHandlers.isMacValid(data.wan_mac_ppp.value)) {
      device.wan_bssid = data.wan_mac_ppp.value.toUpperCase();
    }

    if (data.uptime_ppp && data.uptime_ppp.value) {
      device.wan_up_time = data.uptime_ppp.value;
    }
    if (data.mtu_ppp && data.mtu_ppp.value) {
      device.wan_mtu = data.mtu_ppp.value;
    }
    if (data.vlan_ppp && data.vlan_ppp.value) {
      device.wan_vlan_id = data.vlan_ppp.value;
    }
  } else {
    // Only have to process fields like IP, uptime and MTU
    if (data.wan_ip && data.wan_ip.value) {
      device.wan_ip = data.wan_ip.value;
    }

    // Get WAN MAC address
    if (data.wan_mac && data.wan_mac.value
        && utilHandlers.isMacValid(data.wan_mac.value)) {
      device.wan_bssid = data.wan_mac.value.toUpperCase();
    }

    if (
      data.uptime && data.uptime.value &&
      cpePermissions.wan.dhcpUptime
    ) {
      device.wan_up_time = data.uptime.value;
    }
    if (data.mtu && data.mtu.value) {
      device.wan_mtu = data.mtu.value;
    }
    if (data.vlan && data.vlan.value) {
      device.wan_vlan_id = data.vlan.value;
    }
    device.pppoe_user = '';
    device.pppoe_password = '';
  }

  // IPv4 Mask
  if (cpePermissions.wan.hasIpv4MaskField &&
    data['mask_ipv4' + suffixPPPoE] &&
    data['mask_ipv4' + suffixPPPoE].value
  ) {
    let mask = parseInt(data['mask_ipv4' + suffixPPPoE].value, 10);

    // Validate the mask as number
    if (!isNaN(mask) && mask >= 0 && mask <= 32) {
      device.wan_ipv4_mask = mask;
    }
  }

  // Remote IP Address
  if (
    cpePermissions.wan.hasIpv4RemoteAddressField &&
    data['remote_address' + suffixPPPoE] &&
    data['remote_address' + suffixPPPoE].value
  ) {
    device.pppoe_ip = data['remote_address' + suffixPPPoE].value;
  }

  // Remote MAC
  if (
    cpePermissions.wan.hasIpv4RemoteMacField &&
    data['remote_mac' + suffixPPPoE] &&
    data['remote_mac' + suffixPPPoE].value
  ) {
    device.pppoe_mac = data['remote_mac' + suffixPPPoE].value;
  }

  // Default Gateway
  if (
    cpePermissions.wan.hasIpv4DefaultGatewayField &&
    data['default_gateway' + suffixPPPoE] &&
    data['default_gateway' + suffixPPPoE].value
  ) {
    device.default_gateway_v4 =
      data['default_gateway' + suffixPPPoE].value;
  }

  // DNS Servers
  if (
    cpePermissions.wan.hasDnsServerField &&
    data['dns_servers' + suffixPPPoE] &&
    data['dns_servers' + suffixPPPoE].value
  ) {
    device.dns_server = data['dns_servers' + suffixPPPoE].value;
  }

  // Rate and Duplex WAN fields are processed separately, since connection
  // type does not matter
  if (data.rate && data.rate.value &&
      cpePermissions.wan.canTrustWanRate) {
    device.wan_negociated_speed = cpe.convertWanRate(data.rate.value);
  }
  if (data.duplex && data.duplex.value &&
      cpePermissions.wan.canTrustWanRate) {
    device.wan_negociated_duplex = data.duplex.value;
  }

  // Collect WAN bytes, if available
  if (data.recv_bytes && data.recv_bytes.value &&
      data.sent_bytes && data.sent_bytes.value) {
    device.wan_bytes = acsMeasuresHandler.appendBytesMeasure(
      device.wan_bytes,
      data.recv_bytes.value,
      data.sent_bytes.value,
    );
  }

  // Collect PON signal, if available
  let isPonRxValOk = false;
  let isPonTxValOk = false;
  if (data.pon_rxpower && data.pon_rxpower.value) {
    device.pon_rxpower = cpe.convertToDbm(data.pon_rxpower.value);
    isPonRxValOk = true;
  } else if (data.pon_rxpower_epon && data.pon_rxpower_epon.value) {
    device.pon_rxpower = cpe.convertToDbm(data.pon_rxpower_epon.value);
    isPonRxValOk = true;
  }
  if (data.pon_txpower && data.pon_txpower.value) {
    device.pon_txpower = cpe.convertToDbm(data.pon_txpower.value);
    isPonTxValOk = true;
  } else if (data.pon_txpower_epon && data.pon_txpower_epon.value) {
    device.pon_txpower = cpe.convertToDbm(data.pon_txpower_epon.value);
    isPonTxValOk = true;
  }
  if (isPonRxValOk && isPonTxValOk) {
    device.pon_signal_measure = acsMeasuresHandler.appendPonSignal(
      device.pon_signal_measure,
      device.pon_rxpower,
      device.pon_txpower,
    );
  }

  return changes;
};

// Complete CPE information synchronization gets done here - compare cpe data
// with registered device data and sync fields accordingly
const syncDeviceData = async function(
  acsID, device, data, permissions, hardReset = false,
  ) {
  let config = await Config.findOne(
    {is_default: true},
    {tr069: true},
  ).lean()
  .catch((err) => {
    debug(err);
    return null;
  });
  if (!config || !device) return;

  // Initialize structures
  let changes = {wan: {}, lan: {}, wifi2: {}, wifi5: {}, common: {}, stun: {}};
  let hasChanges = false;
  let splitID = acsID.split('-');
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let cpePermissions = cpe.modelPermissions();

  // Always update ACS ID and serial info, based on ID
  device.acs_id = acsID;
  // Always update serial info based on ACS ID
  let serialTR069 = cpe.convertGenieSerial(
    splitID[splitID.length - 1], device._id,
  );
  device.serial_tr069 = serialTR069;

  // Update model, if data available
  if (data.common.model && data.common.model.value) {
    device.model = data.common.model.value.trim();
  }

  let cpeDidUpdate = false;

  // Update firmware version, if data available
  if (data.common.version && data.common.version.value) {
    device.version = data.common.version.value.trim();


    // Check if the device is updating
    if (device.do_update) {
      // If the device is updating with a different release than it is
      // installed
      if (device.release !== device.installed_release) {
        // The version that device informed is different than the installed one
        cpeDidUpdate = (device.version !== device.installed_release);
      } else {
        /*
         * This is the case where the device is updating to the same version
         * For now, it is not possible to know if the device is already updated
         * or waiting for update (and sent this sync) because the version is
         * the same as the installed version. So assume it was updated.
         */
        cpeDidUpdate = true;
      }

      // Remove the flags if updated
      if (cpeDidUpdate) {
        device.do_update = false;
        device.do_update_status = 1;

        // Tell the scheduler that it might have been updated
        SchedulerCommon.successUpdate(device._id);
      }
    }

    // Always update this parameter, as the user could have made a manual
    // upgrade
    device.installed_release = device.version;
  }

  // Update hardware version, if data available
  if (data.common.hw_version && data.common.hw_version.value) {
    device.hw_version = data.common.hw_version.value.trim();
  }

  // Update secure tr069 flag, if data available
  if (data.common.acs_url && data.common.acs_url.value) {
    device.secure_tr069 = data.common.acs_url.value.includes('https');
  }

  // Check for an alternative UID to replace serial field
  if (data.common.alt_uid && data.common.alt_uid.value) {
    let altUid = data.common.alt_uid.value;
    device.alt_uid_tr069 = altUid;
  }

  // Process CPE IP information
  let cpeIP;
  if (data.common.stun_enable && data.common.stun_enable.value &&
      data.common.stun_enable.value.toString() === 'true' &&
      data.common.stun_udp_conn_req_addr &&
      typeof data.common.stun_udp_conn_req_addr.value === 'string' &&
      data.common.stun_udp_conn_req_addr.value !== '') {
    cpeIP = processHostFromURL(data.common.stun_udp_conn_req_addr.value);
  } else if (data.common.ip && data.common.ip.value) {
    cpeIP = processHostFromURL(data.common.ip.value);
  }
  if (cpeIP) device.ip = cpeIP;

  // Process CPE uptime
  if (data.common.uptime && data.common.uptime.value) {
    device.sys_up_time = data.common.uptime.value;
  }

  // Process inform interval
  if (data.common.interval && data.common.interval.value) {
    let interval = parseInt(data.common.interval.value);
    if (!isNaN(interval) && interval !== device.custom_inform_interval) {
      changes.common.interval = device.custom_inform_interval;
      hasChanges = true;
    }
  }

  // Always update WAN data before sync
  let multiwan = utilHandlers.convertWanToFlashmanFormat(data.wan);
  let chosenWan = utilHandlers.chooseWan(multiwan,
    cpePermissions.useLastIndexOnWildcard);
  if (!chosenWan) {
    console.error(`Error chosenWan Undefined!!! (${acsID})`);
    return;
  }

  if (device.wan_chosen && (device.wan_chosen !== chosenWan)) {
    console.error(
      `Chosen WAN was changed from ${device.wan_chosen} to ${chosenWan}`);
  }

  let wanChanges = syncWanData(device, multiwan, chosenWan, cpe, hardReset);
  // Any change in the wan only happens if we are recovering from hard reset
  if (hardReset && Object.keys(wanChanges).length > 0) {
    changes.wan = wanChanges;
    hasChanges = true;
  }

  // Process wan connection type, but only if data sent
  const hasPPPoE = getPPPoEenabledMultiWan(cpe, multiwan, chosenWan);
  const suffixPPPoE = hasPPPoE ? '_ppp' : '';

  // IPv6
  if (
    permissions.grantWanLanInformation &&
    cpePermissions.features.hasIpv6Information
  ) {
    // Address
    if (
      cpePermissions.ipv6.hasAddressField &&
      data.ipv6['address' + suffixPPPoE] &&
      data.ipv6['address' + suffixPPPoE].value
    ) {
      let ip6addr = data.ipv6['address' + suffixPPPoE].value;
      // some devices (fiberhome) bring null sometimes
      if (ip6addr != 'null') {
        device.wan_ipv6 = data.ipv6['address' + suffixPPPoE].value;
      }
    }

    // Mask
    if (
      cpePermissions.ipv6.hasMaskField &&
      data.ipv6['mask' + suffixPPPoE] &&
      data.ipv6['mask' + suffixPPPoE].value
    ) {
      let mask = parseInt(data.ipv6['mask' + suffixPPPoE].value, 10);

      // Validate the mask as number
      if (!isNaN(mask) && mask >= 0 && mask <= 128) {
        device.wan_ipv6_mask = mask;
      }
    }

    // Default Gateway
    if (
      cpePermissions.ipv6.hasDefaultGatewayField &&
      data.ipv6['default_gateway' + suffixPPPoE] &&
      data.ipv6['default_gateway' + suffixPPPoE].value
    ) {
      device.default_gateway_v6 =
        data.ipv6['default_gateway' + suffixPPPoE].value;
    }

    // Prefix Delegation Address
    if (
      cpePermissions.ipv6.hasPrefixDelegationAddressField &&
      data.ipv6['prefix_address' + suffixPPPoE] &&
      data.ipv6['prefix_address' + suffixPPPoE].value
    ) {
      device.prefix_delegation_addr =
        data.ipv6['prefix_address' + suffixPPPoE].value;

      // Try getting the mask from address
      let mask = utilHandlers.getMaskFromAddress(
        data.ipv6['prefix_address' + suffixPPPoE].value,
        true,
      );

      // If prefix_delegation_addr has '/', remove it
      device.prefix_delegation_addr =
        device.prefix_delegation_addr.split('/')[0];

      device.prefix_delegation_mask = (mask ? mask : '');
    }

    // Prefix Delegation Mask
    // This value might have been setted from address, but this field has
    // precedence over extracting it from address, thus override the device
    if (
      cpePermissions.ipv6.hasPrefixDelegationMaskField &&
      data.ipv6['prefix_mask' + suffixPPPoE] &&
      data.ipv6['prefix_mask' + suffixPPPoE].value
    ) {
      device.prefix_delegation_mask =
        data.ipv6['prefix_mask' + suffixPPPoE].value;
    }

    // Prefix Delegation Local Address
    if (
      cpePermissions.ipv6.hasPrefixDelegationLocalAddressField &&
      data.ipv6['prefix_local_address' + suffixPPPoE] &&
      data.ipv6['prefix_local_address' + suffixPPPoE].value
    ) {
      device.prefix_delegation_local =
        data.ipv6['prefix_local_address' + suffixPPPoE].value;
    }
  }

  // Process LAN configuration - current IP and subnet mask
  let canChangeLAN = cpe.modelPermissions().lan.configWrite;
  if (data.lan.router_ip && data.lan.router_ip.value) {
    if (!canChangeLAN || !device.lan_subnet) {
      device.lan_subnet = data.lan.router_ip.value;
    } else if (canChangeLAN && device.lan_subnet !== data.lan.router_ip.value) {
      changes.lan.router_ip = device.lan_subnet;
      hasChanges = true;
    }
  }
  if (data.lan.subnet_mask && data.lan.subnet_mask.value) {
    let subnetNumber = convertSubnetMaskToInt(data.lan.subnet_mask.value);
    if (subnetNumber > 0 && (!canChangeLAN || !device.lan_netmask)) {
      device.lan_netmask = subnetNumber;
    } else if (
      subnetNumber > 0 && canChangeLAN && device.lan_netmask !== subnetNumber
    ) {
      changes.lan.subnet_mask = device.lan_netmask;
      hasChanges = true;
    }
  }

  // Process Wi-Fi enable fields - careful with non-boolean values
  if (data.wifi2.enable && typeof data.wifi2.enable.value !== 'undefined') {
    let enable = 1; // if something goes wrong, just enable wifi
    if (typeof data.wifi2.enable.value === 'boolean') {
      enable = (data.wifi2.enable.value) ? 1 : 0;
    } else if (typeof data.wifi2.enable.value === 'string') {
      enable = (utilHandlers.isTrueValueString(data.wifi2.enable.value)) ?
        1 : 0;
    }
    if (device.wifi_state !== enable) {
      changes.wifi2.enable = device.wifi_state;
      // When enabling Wi-Fi set beacon type
      if (device.wifi_state) {
        changes.wifi2.beacon_type = cpe.getBeaconType();
      }
      hasChanges = true;
    }
  }
  if (data.wifi5.enable && typeof data.wifi5.enable.value !== 'undefined') {
    let enable = 1; // if something goes wrong, just enable wifi
    if (typeof data.wifi5.enable.value === 'boolean') {
      enable = (data.wifi5.enable.value) ? 1 : 0;
    } else if (typeof data.wifi5.enable.value === 'string') {
      enable = (utilHandlers.isTrueValueString(data.wifi5.enable.value)) ?
        1 : 0;
    }
    if (device.wifi_state_5ghz !== enable) {
      changes.wifi5.enable = device.wifi_state_5ghz;
      // When enabling Wi-Fi set beacon type
      if (device.wifi_state_5ghz) {
        changes.wifi5.beacon_type = cpe.getBeaconType();
      }
      hasChanges = true;
    }
  }

  // Verify ssid prefix necessity - remove prefix from database object
  let checkPrefixLocal = await getSsidPrefixCheck(device);
  // This function returns what prefix we should be using for this device, based
  // on the local flag and what the saved SSID values are. We use the prefix to
  // then prepend it to the saved SSID, so we can compare it to what the CPE
  // sent to Flashman
  let ssidPrefix = checkPrefixLocal.prefixToUse;

  // Compare prefix database SSIDs with device's current SSIDs
  if (data.wifi2.ssid && data.wifi2.ssid.value) {
    if (!device.wifi_ssid) {
      device.wifi_ssid = data.wifi2.ssid.value.trim();
    }
    // If database prefix + SSID differs from received SSID, we force a sync
    // based on what is in database. Changes structure should receive ONLY
    // the part that isn't the prefix
    if (ssidPrefix + device.wifi_ssid.trim() !== data.wifi2.ssid.value.trim()) {
      changes.wifi2.ssid = device.wifi_ssid.trim();
      hasChanges = true;
    }
  }
  if (data.wifi5.ssid && data.wifi5.ssid.value) {
    if (!device.wifi_ssid_5ghz) {
      device.wifi_ssid_5ghz = data.wifi5.ssid.value.trim();
    }
    // If database prefix + SSID differs from received SSID, we force a sync
    // based on what is in database. Changes structure should receive ONLY
    // the part that isn't the prefix
    if (ssidPrefix + device.wifi_ssid_5ghz.trim() !==
        data.wifi5.ssid.value.trim()
    ) {
      changes.wifi5.ssid = device.wifi_ssid_5ghz.trim();
      hasChanges = true;
    }
  }

  // Force a wifi password sync after a hard reset
  if (device.recovering_tr069_reset) {
    if (device.wifi_password) {
      changes.wifi2.password = device.wifi_password.trim();
    }
    if (device.wifi_is_5ghz_capable && device.wifi_password_5ghz) {
      changes.wifi5.password = device.wifi_password_5ghz.trim();
    }
    hasChanges = true;
  }

  // Collect Wi-Fi BSSID information, if available
  if (data.wifi2.bssid && data.wifi2.bssid.value) {
    let bssid2 = data.wifi2.bssid.value;
    if (!device.wifi_bssid || device.wifi_bssid !== bssid2.toUpperCase()) {
      device.wifi_bssid = bssid2.toUpperCase();
    }
  }
  if (data.wifi5.bssid && data.wifi5.bssid.value) {
    let bssid5 = data.wifi5.bssid.value;
    if (
      !device.wifi_bssid_5ghz || device.wifi_bssid_5ghz !== bssid5.toUpperCase()
    ) {
      device.wifi_bssid_5ghz = bssid5.toUpperCase();
    }
  }

  // Collect Wi-Fi channel information, converting auto mode
  if (data.wifi2.channel && data.wifi2.channel.value) {
    let channel2 = data.wifi2.channel.value.toString();
    if (channel2 !== '0' && channel2.match(/[0-9]+/)) {
      device.wifi_last_channel = channel2;
    }
    if (data.wifi2.auto && typeof data.wifi2.auto.value !== 'undefined') {
      // Explicit auto option, use that
      if (typeof data.wifi2.auto.value === 'boolean') {
        if (data.wifi2.auto.value) {
          channel2 = 'auto';
        }
      } else if (typeof data.wifi2.auto.value === 'string') {
        if (data.wifi2.auto.value === '1' || data.wifi2.auto.value === 'true') {
          channel2 = 'auto';
        }
      }
    } else if (channel2 === '0') {
      // No explicit auto option, assume channel 0 encodes auto
      channel2 = 'auto';
    }
    if (channel2 && !device.wifi_channel) {
      device.wifi_channel = channel2;
    } else if (device.wifi_channel !== channel2) {
      changes.wifi2.channel = device.wifi_channel;
      hasChanges = true;
    }
  }
  if (data.wifi5.channel && data.wifi5.channel.value) {
    let channel5 = data.wifi5.channel.value.toString();
    if (channel5 !== '0' && channel5.match(/[0-9]+/)) {
      device.wifi_last_channel_5ghz = channel5;
    }
    if (data.wifi5.auto && typeof data.wifi5.auto.value !== 'undefined') {
      // Explicit auto option, use that
      if (typeof data.wifi5.auto.value === 'boolean') {
        if (data.wifi5.auto.value) {
          channel5 = 'auto';
        }
      } else if (typeof data.wifi5.auto.value === 'string') {
        if (data.wifi5.auto.value === '1' || data.wifi5.auto.value === 'true') {
          channel5 = 'auto';
        }
      }
    } else if (channel5 === '0') {
      // No explicit auto option, assume channel 0 encodes auto
      channel5 = 'auto';
    }
    if (channel5 && !device.wifi_channel_5ghz) {
      device.wifi_channel_5ghz = channel5;
    } else if (device.wifi_channel_5ghz !== channel5) {
      changes.wifi5.channel = device.wifi_channel_5ghz;
      hasChanges = true;
    }
  }

  // Collect Wi-Fi mode and band information, converting to Flashman format
  if (data.wifi2.mode && data.wifi2.mode.value) {
    let mode2 = convertWifiMode(data.wifi2.mode.value, false);
    if (!device.wifi_mode) {
      device.wifi_mode = mode2;
    } else if (device.wifi_mode !== mode2) {
      if (permissions.grantWifiModeEdit) {
        changes.wifi2.mode = device.wifi_mode;
        hasChanges = true;
      } else {
        device.wifi_mode = mode2;
      }
    }
  }
  if (data.wifi2.band && data.wifi2.band.value) {
    let mode2 = (device.wifi_mode) ? device.wifi_mode : '11n';
    let band2 = convertWifiBand(cpe, data.wifi2.band.value, mode2, false);
    // Special legacy case - remove auto from database if no longer supported
    let autoWithNoPermission = (
      device.wifi_band === 'auto' && !permissions.grantWifiBandAuto2
    );
    if (band2 && (!device.wifi_band || autoWithNoPermission)) {
      device.wifi_band = band2;
    } else if (device.wifi_band !== band2) {
      if (permissions.grantWifiBandEdit2) {
        changes.wifi2.band = device.wifi_band;
        hasChanges = true;
      } else {
        device.wifi_band = band2;
      }
    }
  }
  if (data.wifi5.mode && data.wifi5.mode.value) {
    let mode5 = convertWifiMode(data.wifi5.mode.value, true);
    if (!device.wifi_mode_5ghz) {
      device.wifi_mode_5ghz = mode5;
    } else if (device.wifi_mode_5ghz !== mode5) {
      if (permissions.grantWifiModeEdit) {
        changes.wifi5.mode = device.wifi_mode_5ghz;
        hasChanges = true;
      } else {
        device.wifi_mode_5ghz = mode5;
      }
    }
  }
  if (data.wifi5.band && data.wifi5.band.value) {
    let mode5 = (device.wifi_mode_5ghz) ? device.wifi_mode_5ghz : '11ac';
    let band5 = convertWifiBand(cpe, data.wifi5.band.value, mode5, true);
    // Special legacy case - remove auto from database if no longer supported
    let autoWithNoPermission = (
      device.wifi_band_5ghz === 'auto' && !permissions.grantWifiBandAuto5
    );
    if (band5 && (!device.wifi_band_5ghz || autoWithNoPermission)) {
      device.wifi_band_5ghz = band5;
    } else if (device.wifi_band_5ghz !== band5) {
      if (permissions.grantWifiBandEdit5) {
        changes.wifi5.band = device.wifi_band_5ghz;
        hasChanges = true;
      } else {
        device.wifi_band_5ghz = band5;
      }
    }
  }

  // Collect Wi-Fi Mesh BSSID information, if available
  if (
    !permissions.grantMeshV2HardcodedBssid && data.mesh2 &&
    data.mesh2.bssid && data.mesh2.bssid.value &&
    data.mesh2.bssid.value !== '00:00:00:00:00:00'
  ) {
    let bssid2 = data.mesh2.bssid.value;
    if (bssid2 && (device.bssid_mesh2 !== bssid2.toUpperCase())) {
      device.bssid_mesh2 = bssid2.toUpperCase();
    }
  }
  if (
    !permissions.grantMeshV2HardcodedBssid && data.mesh5 &&
    data.mesh5.bssid && data.mesh5.bssid.value &&
    data.mesh5.bssid.value !== '00:00:00:00:00:00'
  ) {
    let bssid5 = data.mesh5.bssid.value;
    if (bssid5 && (device.bssid_mesh5 !== bssid5.toUpperCase())) {
      device.bssid_mesh5 = bssid5.toUpperCase();
    }
  }
  if (permissions.grantMeshV2HardcodedBssid &&
    (!device.bssid_mesh2 || !device.bssid_mesh5)) {
    const meshBSSIDs =
      await acsMeshDeviceHandler.getMeshBSSIDs(cpe, device._id);
    device.bssid_mesh2 = meshBSSIDs.mesh2.toUpperCase();
    device.bssid_mesh5 = meshBSSIDs.mesh5.toUpperCase();
  }

  // If has STUN Support in the model and
  // STUN Enable flag is different from actual configuration
  if (permissions.grantSTUN &&
      data.common.stun_enable && data.common.stun_enable.value &&
      data.common.stun_enable.value.toString() !==
      config.tr069.stun_enable.toString()) {
    hasChanges = true;
    changes.common.stun_enable = config.tr069.stun_enable;
    changes.stun.address = config.tr069.server_url;
    changes.stun.port = 3478;
  }

  // If device contacted Flashman, then it is no longer in hard reset state
  let wasRecoveringHardReset = device.recovering_tr069_reset;
  device.recovering_tr069_reset = false;

  // Update last contact and sync dates
  let now = Date.now();
  device.last_contact = now;
  device.last_tr069_sync = now;
  let previousDaily = device.last_contact_daily;
  let doDailySync = false;
  if (!previousDaily || (now - previousDaily) > 24*60*60*1000) {
    device.last_contact_daily = now;
    doDailySync = true;
  }

  // Collect admin web credentials, if available
  if (data.common.web_admin_username && data.common.web_admin_username.value) {
    // Save the current web admin username
    device.web_admin_username = data.common.web_admin_username.value;
  }

  if (data.common.web_admin_password && data.common.web_admin_password.value) {
    // Save the current web admin password
    device.web_admin_password = data.common.web_admin_password.value;
  }

  // If the web login was modified, change for the cpe
  // Force a web credentials sync when device is recovering from hard reset

  if (
    typeof config.tr069.web_login !== 'undefined' &&
    data.common.web_admin_username &&
    data.common.web_admin_username.writable &&
    config.tr069.web_login !== '' &&

    ( cpeDidUpdate ||
      device.recovering_tr069_reset ||
      config.tr069.web_login !== device.web_admin_username )

  ) {
    // Update the current web admin username in database
    device.web_admin_username = config.tr069.web_login;

    // Update in cpe
    changes.common.web_admin_username = config.tr069.web_login;
    hasChanges = true;
  }

  if (
    typeof config.tr069.web_password !== 'undefined' &&
    data.common.web_admin_password &&
    data.common.web_admin_password.writable &&
    config.tr069.web_password !== '' &&

    ( cpeDidUpdate ||
      device.recovering_tr069_reset ||
      config.tr069.web_password !== device.web_admin_password ||

      // On daily sync, Send web admin password correct setup for
      // those CPEs that always retrieve blank on this field
      (doDailySync && !cpe.modelPermissions().stavixXMLConfig.webCredentials &&
        data.common.web_admin_password.value === '')
    )

  ) {
    // Update the current web admin password in database
    device.web_admin_password = config.tr069.web_password;

    // Update in cpe
    changes.common.web_admin_password = config.tr069.web_password;
    hasChanges = true;
  }

  await device.save().catch((err) => {
    console.log('Error saving device sync data to database: ' + err);
  });

  if (hasChanges) {
    // Possibly TODO: Let acceptLocalChanges be configurable for the admin
    // Bypass if recovering from hard reset
    let acceptLocalChanges = false;
    if (wasRecoveringHardReset || cpeDidUpdate || !acceptLocalChanges) {
      await acsDeviceInfoController.updateInfo(device, changes);
    }
  }

  // Aditional Tasks for daily update
  if (doDailySync) {
    // Update Blocked Devices
    if (permissions.grantBlockDevices) {
      await acsDeviceInfoController.changeAcRules(device);
    }

    /* Every day fetch device port forward entries, except in the case
      which device is registred with upcoming port mapping values */
    if (permissions.grantPortForward && !device.wrong_port_mapping) {
      // Stavix XML devices should not sync port forward daily
      if (!cpe.modelPermissions().stavixXMLConfig.portForward) {
        let entriesDiff = 0;
        if (device.connection_type === 'pppoe' &&
            data.wan.port_mapping_entries_ppp) {
          entriesDiff = device.port_mapping.length -
            data.wan.port_mapping_entries_ppp.value;
        } else if (data.wan.port_mapping_entries_dhcp) {
          entriesDiff = device.port_mapping.length -
            data.wan.port_mapping_entries_dhcp.value;
        }
        if (entriesDiff != 0) {
          // If entries sizes are not the same, no need to check
          // entry by entry differences
          await acsPortForwardHandler.changePortForwardRules(
            device, entriesDiff,
          );
        } else {
          acsPortForwardHandler.checkPortForwardRules(device);
        }
      }
    }
  }
};
/*
 * This function is being exported in order to test it.
 * The ideal way is to have a condition to only export it when testing
 */
acsDeviceInfoController.__testSyncDeviceData = syncDeviceData;

const sendRebootCommand = async function(acsID) {
  let task = {name: 'reboot'};
  let result = await TasksAPI.addTask(acsID, task);
  return result;
};

acsDeviceInfoController.rebootDevice = async function(device, res) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let result = await sendRebootCommand(acsID);
  if (!res) return; // Prevent crash in case res is not defined
  if (result.success) {
    return res.status(200).json({success: true});
  } else {
    return res.status(200).json({
      success: false,
      message: t('cpeDidNotRespond', {errorline: __line}),
    });
  }
};

acsDeviceInfoController.requestDiagnosticsResults = async function(req, res) {
  let acsID = req.body.acs_id;
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID}).lean();
  } catch (e) {
    return res.status(500).json({success: false,
      message: t('cpeFindError', {errorline: __line})});
  }
  if (!device || !device.use_tr069 || !device.acs_id) {
    return res.status(500).json({success: false,
      message: t('cpeFindError', {errorline: __line})});
  }

  // We don't need to wait to free up tr-069 session
  res.status(200).json({success: true});

  acsDiagnosticsHandler.triggerDiagnosticResults(device);
};

acsDeviceInfoController.requestLogs = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let logField = cpe.getModelFields().log;
  let task = {
    name: 'getParameterValues',
    parameterNames: [logField],
  };
  TasksAPI.addTask(acsID, task, acsDeviceLogsHandler.fetchLogFromGenie);
};


/**
 * This functions sends a request to GenieACS to gather received and sent bytes,
 * CPU usage, total memory and free memory from CPE.
 *
 * @memberof controllers/acsDeviceInfo
 *
 * @param {Model} device - The device model.
 */
acsDeviceInfoController.requestStatistics = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) {
    console.error('Invalid device received in requestStatistics!');
    return;
  }

  // Create the instance of the cpe
  let cpeInstance = DevicesAPI.instantiateCPEByModelFromDevice(device);

  // If it is not a valid cpe, return
  if (!cpeInstance.success) return;

  let acsID = device.acs_id;
  let cpe = cpeInstance.cpe;
  let fields = cpe.getModelFields();
  let permissions = cpe.modelPermissions();
  let parameterNames = [];

  // Fields
  let parameterFields = {
    receivedBytes: {
      permission: true,
      field: fields.wan.recv_bytes,
    },

    sentBytes: {
      permission: true,
      field: fields.wan.sent_bytes,
    },

    cpuUsage: {
      permission: permissions.features.hasCPUUsage,
      field: fields.diagnostics.statistics.cpu_usage,
    },

    memoryUsage: {
      permission: permissions.features.hasMemoryUsage,
      field: fields.diagnostics.statistics.memory_usage,
    },

    memoryFree: {
      permission: permissions.features.hasMemoryUsage,
      field: fields.diagnostics.statistics.memory_free,
    },

    memoryTotal: {
      permission: permissions.features.hasMemoryUsage,
      field: fields.diagnostics.statistics.memory_total,
    },
  };


  // Run through every parameter and push to array of parameterNames
  Object.keys(parameterFields).forEach((parameterKey) => {
    let parameter = parameterFields[parameterKey];

    // Continue if does not have permission or has an invalid field
    if (!parameter.permission || !parameter.field) return;

    // Push to array
    parameterNames.push(parameter.field);
  });


  // Return if the router does not have any of these features
  if (parameterNames.length <= 0) return;


  let task = {
    name: 'getParameterValues',
    parameterNames: parameterNames,
  };

  // Send the task
  TasksAPI.addTask(acsID, task, acsMeasuresHandler.fetchWanBytesFromGenie);
};


/**
 * Request WAN information from CPE.
 *
 * @memberOf controllers/acsDeviceInfo
 *
 * @param {Model} device - The CPE device to send the request to.
 */
acsDeviceInfoController.requestWanInformation = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) {
    console.error('Invalid device received in requestWanInformation!');
    return;
  }


  // Create the instance of the cpe
  let cpeInstance = DevicesAPI.instantiateCPEByModelFromDevice(device);

  // If it is not a valid cpe, return
  if (!cpeInstance.success) return;


  let acsID = device.acs_id;
  let cpe = cpeInstance.cpe;
  let permissions = cpe.modelPermissions();
  let fields = cpe.getModelFields();

  // Get all fields
  let parameterNames = [];
  let hasPPPoE = (device.connection_type === 'pppoe' ? true : false);
  let suffixPPPoE = (hasPPPoE ? '_ppp' : '');

  let assignFields = {
    wanIpv4: {
      permission: true,
      field: 'wan_ip',
    },
    wanIpv4Mask: {
      permission: permissions.wan.hasIpv4MaskField,
      field: 'mask_ipv4',
    },
    remoteAddress: {
      permission: permissions.wan.hasIpv4RemoteAddressField,
      field: 'remote_address',
    },
    remoteMac: {
      permission: permissions.wan.hasIpv4RemoteMacField,
      field: 'remote_mac',
    },
    defaultGatewayV4: {
      permission: permissions.wan.hasIpv4DefaultGatewayField,
      field: 'default_gateway',
    },
    dnsServers: {
      permission: permissions.wan.hasDnsServerField,
      field: 'dns_servers',
    },
    wanIpv6: {
      permission: permissions.ipv6.hasAddressField,
      field: 'address',
      isIPv6: true,
    },
    wanIpv6Mask: {
      permission: permissions.ipv6.hasMaskField,
      field: 'mask',
      isIPv6: true,
    },
    defaultGatewayV6: {
      permission: permissions.ipv6.hasDefaultGatewayField,
      field: 'default_gateway',
      isIPv6: true,
    },
  };


  // Push all parameters
  Object.keys(assignFields).forEach((fieldName) => {
    let fieldObject = assignFields[fieldName];
    let fieldParam = null;

    // If is IPv6 and does not have permission, continue to the next field
    if (fieldObject.isIPv6 && !permissions.features.hasIpv6Information) return;

    // If does not have permission continue to the next field
    if (!fieldObject.permission) return;

    // Set the field according
    if (fieldObject.isIPv6) {
      fieldParam = fields.ipv6[fieldObject.field + suffixPPPoE];
    } else {
      fieldParam = fields.wan[fieldObject.field + suffixPPPoE];
    }

    // Push the parameter
    if (fieldParam) {
      parameterNames.push(fieldParam);
    }
  });


  // Return if the router does not have any of these features
  if (parameterNames.length <= 0) return;


  let task = {
    name: 'getParameterValues',
    parameterNames: parameterNames,
  };

  // Send the task
  TasksAPI.addTask(
    acsID,
    task,
    acsMeasuresHandler.fetchWanInformationFromGenie,
  );
};


/**
 * Request LAN information from CPE.
 *
 * @memberOf controllers/acsDeviceInfo
 *
 * @param {Model} device - The CPE device to send the request to.
 */
acsDeviceInfoController.requestLanInformation = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) {
    console.error('Invalid device received in requestLanInformation!');
    return;
  }


  // Create the instance of the cpe
  let cpeInstance = DevicesAPI.instantiateCPEByModelFromDevice(device);

  // If it is not a valid cpe, return
  if (!cpeInstance.success) return;


  let acsID = device.acs_id;
  let cpe = cpeInstance.cpe;
  let permissions = cpe.modelPermissions();
  let fields = cpe.getModelFields();


  // If there is no information to request, return
  if (!permissions.features.hasIpv6Information) return;


  // Get all fields
  let parameterNames = [];
  let suffixPPPoE = (device.connection_type === 'pppoe' ? '_ppp' : '');

  if (
    permissions.ipv6.hasPrefixDelegationAddressField &&
    fields.ipv6['prefix_delegation_address' + suffixPPPoE]
  ) {
    parameterNames.push(
      fields.ipv6['prefix_delegation_address' + suffixPPPoE],
    );
  }

  if (
    permissions.ipv6.hasPrefixDelegationMaskField &&
    fields.ipv6['prefix_delegation_mask' + suffixPPPoE]
  ) {
    parameterNames.push(
      fields.ipv6['prefix_delegation_mask' + suffixPPPoE],
    );
  }

  if (
    permissions.ipv6.hasPrefixDelegationLocalAddressField &&
    fields.ipv6['prefix_delegation_local_address' + suffixPPPoE]
  ) {
    parameterNames.push(
      fields.ipv6['prefix_delegation_local_address' + suffixPPPoE],
    );
  }


  // Return if the router does not have any of these features
  if (parameterNames.length <= 0) return;


  let task = {
    name: 'getParameterValues',
    parameterNames: parameterNames,
  };

  // Send the task
  TasksAPI.addTask(
    acsID,
    task,
    acsMeasuresHandler.fetchLanInformationFromGenie,
  );
};


acsDeviceInfoController.requestPonData = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let rxPowerField = fields.wan.pon_rxpower;
  let txPowerField = fields.wan.pon_txpower;
  let taskParameterNames = [rxPowerField, txPowerField];
  if (fields.wan.pon_rxpower_epon && fields.wan.pon_txpower_epon) {
    taskParameterNames.push(fields.wan.pon_rxpower_epon);
    taskParameterNames.push(fields.wan.pon_txpower_epon);
  }
  let task = {
    name: 'getParameterValues',
    parameterNames: taskParameterNames,
  };
  TasksAPI.addTask(acsID, task, acsMeasuresHandler.fetchPonSignalFromGenie);
};

acsDeviceInfoController.requestUpStatus = async function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let permissions = DeviceVersion.devicePermissions(device);
  let parameterNames = [];
  // Basic fields should always be updated
  parameterNames.push(fields.common.uptime);
  parameterNames.push(fields.common.ip);
  if (device.wan_chosen) {
    let wanFields = await acsDeviceInfoController.getMultiWan(acsID, cpe);
    wanFields = wanFields[device.wan_chosen];
    if (wanFields) {
      // Request WAN IP
      if (device.connection_type === 'pppoe') {
        parameterNames.push(wanFields.wan_ip_ppp.path);
      } else if (device.connection_type === 'dhcp') {
        parameterNames.push(wanFields.wan_ip.path);
      }
      // Request uptime, if the device has this field
      if (cpe.modelPermissions().wan.hasUptimeField) {
        if (device.connection_type === 'pppoe') {
          parameterNames.push(wanFields.uptime_ppp.path);
          parameterNames.push(wanFields.pppoe_user.path);
        } else if (device.connection_type === 'dhcp') {
          parameterNames.push(wanFields.uptime.path);
        }
      }
      // Request pon signal, if the device is an ONU
      if (permissions.grantPonSignalSupport) {
        parameterNames.push(wanFields.pon_rxpower.path);
        parameterNames.push(wanFields.pon_txpower.path);
        if (wanFields.pon_rxpower_epon && wanFields.pon_txpower_epon) {
          parameterNames.push(wanFields.pon_rxpower_epon.path);
          parameterNames.push(wanFields.pon_txpower_epon.path);
        }
      }
    } else {
      console.error(`requestUpStatus chosenWAN index `+
         `not exist! ${device.wan_chosen} -> (${acsID})`);
    }
  } else {
    console.error(`requestUpStatus change WAN is undefined! (${acsID})`);
  }
  let task = {name: 'getParameterValues', parameterNames: parameterNames};
  TasksAPI.addTask(acsID, task, acsMeasuresHandler.fetchUpStatusFromGenie);
};

acsDeviceInfoController.requestConnectedDevices = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let hostsField = fields.devices.hosts;
  let assocField = fields.devices.associated;
  let task = {
    name: 'getParameterValues',
    parameterNames: [hostsField, assocField],
  };
  if (fields.devices.associated_5) {
    task.parameterNames.push(fields.devices.associated_5);
  }
  TasksAPI.addTask(acsID, task, acsConnDevicesHandler.fetchDevicesFromGenie);
};

const getSsidPrefixCheck = async function(device) {
  let config;
  try {
    config = await Config.findOne({is_default: true},
                                  {device_update_schedule: false}).lean();
    if (!config) throw new Error('Config not found');
  } catch (error) {
    console.log(error.message);
  }
  // -> 'updating registry' scenario
  return deviceHandlers.checkSsidPrefix(
    config, device.wifi_ssid, device.wifi_ssid_5ghz,
    device.isSsidPrefixEnabled);
};

acsDeviceInfoController.getMultiWan = async function(
  acsId, cpe,
) {
  let data = {};
  let fields = cpe.getModelFields();
  let isTR181 = cpe.modelPermissions().isTR181;
  let query = {_id: acsId};
  let projection = DevicesAPI.getWanNodes(fields, isTR181, true);

  if (projection === null) {
    console.error('projection is null in getMultiWan');
    return undefined;
  }
  // Fetch Genie database and retrieve data
  try {
    data = await TasksAPI.getFromCollection('devices', query, projection);
    data = utilHandlers.convertWanToProvisionFormat(data[0]);
  } catch (e) {
    console.error(
      'Exception fetching Genie database (getMultiWan): ' + e);
    return undefined;
  }
  return DevicesAPI.assembleWanObj(data, fields.wan, isTR181);
};

acsDeviceInfoController.updateInfo = async function(
  device, changes, awaitUpdate = false, mustExecute = true,
) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  // let mac = device._id;
  let acsID = device.acs_id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let hasChanges = false;
  let hasUpdatedDHCPRanges = false;
  let rebootAfterUpdate = false;
  let task = {name: 'setParameterValues', parameterValues: []};
  let ssidPrefixObj = await getSsidPrefixCheck(device);
  // This function returns what prefix we should be using for this device, based
  // on the local flag and what the saved SSID values are. We use the prefix to
  // then prepend it to the saved SSID, so we send the full SSID in the task
  let ssidPrefix = ssidPrefixObj.prefixToUse;

  if (
    changes.common && changes.common.web_admin_username &&
    !cpe.isAllowedWebadminUsername(changes.common.web_admin_username)
  ) {
    delete changes.common.web_admin_username;
  }
  // Some Nokia models have a bug where changing the SSID without changing the
  // password as well makes the password reset to default value, so we force the
  // password to be updated as well - this also takes care of any possible wifi
  // password resets
  if (changes.wifi2 && changes.wifi2.ssid && device.wifi_password) {
    changes.wifi2.password = device.wifi_password;
  }
  if (changes.wifi5 && changes.wifi5.ssid && device.wifi_password_5ghz) {
    changes.wifi5.password = device.wifi_password_5ghz;
  }

  // If there are changes in the WAN fields, we have to replace the fields that
  // have wildcards with the correct indexes. Only the fields referring to the
  // WAN are changed
  if (changes.wan && Object.keys(changes.wan).length > 0) {
    if (device.wan_chosen) {
      let wanFields = await acsDeviceInfoController.getMultiWan(acsID, cpe);
      wanFields = wanFields[device.wan_chosen];
      if (wanFields) {
        // Validate WAN: Check if all fields exist
        let valid = true;
        Object.keys(changes.wan).forEach((key)=>{
          if (!(key in wanFields)) {
            valid = false;
            console.error(`updateInfo invalid wanFields ` +
              `(${key}): ${device.wan_chosen} -> (${acsID})`);
          }
        });

        if (valid) {
          Object.keys(changes.wan).forEach((key)=>{
            let convertedValue = cpe.convertField(
              'wan', key, // key to be changed, eg: wifi2, ssid
              changes.wan[key], // new value
              cpe.getFieldType, // convert type function
              cpe.convertWifiMode, // convert wifi mode function
              cpe.convertWifiBand, // convert wifi band function
            );
            task.parameterValues.push([
              wanFields[key].path, // tr-069 field name
              convertedValue.value, // value to change to
              convertedValue.type, // genieacs type
            ]);
            hasChanges = true;
          });

          // CPEs needs to reboot after change PPPoE parameters
          if (
            cpe.modelPermissions().wan.mustRebootAfterChanges &&
            (changes.wan.pppoe_user || changes.wan.pppoe_pass)
          ) {
            rebootAfterUpdate = true;
          }
        }
      } else {
        console.error(`updateInfo chosenWAN index `+
         `not exist! ${device.wan_chosen} -> (${acsID})`);
      }
    } else {
      console.error(`updateInfo change WAN is undefined! (${acsID})`);
    }
  }

  // Remove wan changes (we have already proccessed them)
  changes.wan = {};

  Object.keys(changes).forEach((masterKey)=>{
    Object.keys(changes[masterKey]).forEach((key)=>{
      if (!fields[masterKey][key]) return;
      if (key === 'channel') {
        // Special case since channel relates to 2 fields
        let channel = changes[masterKey][key];
        let values = cpe.convertChannelToTask(channel, fields, masterKey);
        if (values.length > 0) {
          task.parameterValues = task.parameterValues.concat(values);
          hasChanges = true;
        }
        return;
      }
      if (
        (key === 'router_ip' || key === 'subnet_mask') && !hasUpdatedDHCPRanges
      ) {
        // Special case for lan ip/mask, we need to update dhcp range and dns
        let values = cpe.convertLanEditToTask(
          device, fields, cpe.modelPermissions(),
        );
        if (values.length > 0) {
          task.parameterValues = task.parameterValues.concat(values);
          hasUpdatedDHCPRanges = true; // Avoid editing these fields twice
          hasChanges = true;
        }
      }
      if (key === 'ssid' && (masterKey === 'wifi2' || masterKey === 'wifi5')) {
        // Append ssid prefix here before sending changes to genie - doing it
        // here saves replicating this logic all over flashman (device_list,
        // app_diagnostic_api, etc)
        if (ssidPrefix != '') {
          changes[masterKey][key] = ssidPrefix+changes[masterKey][key];
        }
        if (
          masterKey === 'wifi2' &&
          cpe.modelPermissions().wifi.rebootAfterWiFi2SSIDChange
        ) {
          rebootAfterUpdate = true;
        }
      }
      let convertedValue = cpe.convertField(
        masterKey, key, // key to be changed, eg: wifi2, ssid
        changes[masterKey][key], // new value
        cpe.getFieldType, // convert type function
        cpe.convertWifiMode, // convert wifi mode function
        cpe.convertWifiBand, // convert wifi band function
      );
      task.parameterValues.push([
        fields[masterKey][key], // tr-069 field name
        convertedValue.value, // value to change to
        convertedValue.type, // genieacs type
      ]);
      hasChanges = true;
    });
  });

  if (!hasChanges) return; // No need to sync data with genie
  let taskCallback = (acsID)=>{
    if (rebootAfterUpdate) {
      sendRebootCommand(acsID);
    }
    return true;
  };

  try {
    if (awaitUpdate) {
      // We need to wait for task to be completed before we can return - caller
      // expects a return "true" after task is done
      let result = await TasksAPI.addTask(acsID, task);

      if (!result || !result.success || (mustExecute && !result.executed)) {
        return;
      }
      return taskCallback(acsID);
    } else {
      // Simply call addTask and free up this context
      TasksAPI.addTask(acsID, task, taskCallback);
    }
  } catch (e) {
    return;
  }
};
/*
 * This function is being exported in order to test it.
 * The ideal way is to have a condition to only export it when testing
 */
acsDeviceInfoController.__testUpdateInfo = acsDeviceInfoController.updateInfo;

acsDeviceInfoController.forcePingOfflineDevices = async function(req, res) {
  acsDeviceInfoController.pingOfflineDevices();
  setTimeout(()=>{
    TasksAPI.deleteGetParamTasks();
  }, (60 * 60 * 1000)); // One hour
  return res.status(200).json({
    type: 'success',
    message: t('operationStartSuccessful'),
  });
};

acsDeviceInfoController.pingOfflineDevices = async function() {
  // Get TR-069 configs from database
  let matchedConfig = await Config.findOne(
    {is_default: true}, 'tr069',
  ).lean().exec().catch((err) => err);
  if (matchedConfig.constructor === Error) {
    console.log('Error getting user config in database to ping offline CPEs');
    return;
  }
  // Compute offline threshold from options
  let currentTime = Date.now();
  let interval = matchedConfig.tr069.inform_interval;
  let threshold = matchedConfig.tr069.offline_threshold;
  let offlineThreshold = new Date(currentTime - (interval*threshold));
  // Query database for offline TR-069 CPE devices
  let offlineDevices = await DeviceModel.find({
    use_tr069: true,
    last_contact: {$lt: offlineThreshold},
  }, {
    acs_id: true,
  }).lean();
  // Issue a task for every offline device to try and force it to reconnect
  for (let i = 0; i < offlineDevices.length; i++) {
    let id = offlineDevices[i].acs_id;
    let cpe = DevicesAPI.instantiateCPEByModelFromDevice(offlineDevices[i]).cpe;
    let fields = cpe.getModelFields();
    let task = {
      name: 'getParameterValues',
      parameterNames: [fields.common.uptime],
    };
    await TasksAPI.addTask(id, task, null, 50);
  }
};

acsDeviceInfoController.reportOnuDevices = async function(app, devices=null) {
  try {
    let devicesArray = null;
    if (!devices) {
      devicesArray = await DeviceModel.find({
        use_tr069: true,
        is_license_active: {$exists: false}},
      {
        serial_tr069: true,
        model: true,
        version: true,
        is_license_active: true});
    } else {
      devicesArray = devices;
    }
    if (!devicesArray || devicesArray.length == 0) {
      // Nothing to report
      return {success: false,
        message: t('nothingToReport', {errorline: __line})};
    }
    let response = await controlApi.reportDevices(app, devicesArray);
    if (response.success) {
      for (let device of devicesArray) {
        device.is_license_active = true;
        await device.save().catch((err) => {
          console.log('Error saving reported devices to ' +
          device.serial_tr069 + ' : ' + err);
        });
      }
      if (response.noLicenses) {
        let matchedNotif = await Notification.findOne({
          'message_code': 4,
          'target': 'general'});
        if (!matchedNotif || matchedNotif.allow_duplicate) {
          let notification = new Notification({
            'message': t('noMoreTr069Licences', {errorline: __line}),
            'message_code': 4,
            'severity': 'danger',
            'type': 'communication',
            'allow_duplicate': false,
            'target': 'general',
          });
          await notification.save();
        }
      } else if (response.licensesNum < 50) {
        let matchedNotif = await Notification.findOne({
          'message_code': 3,
          'target': 'general'});
        if (!matchedNotif || matchedNotif.allow_duplicate) {
          let notification = new Notification({
            'message': t('tr069LicencesLeft',
              {n: response.licensesNum, errorline: __line}),
            'message_code': 3,
            'severity': 'alert',
            'type': 'communication',
            'allow_duplicate': false,
            'target': 'general',
          });
          await notification.save();
        }
      }
    }
  } catch (err) {
    console.error('Error in license report: ' + err);
    return {success: false, message: t('requestError', {errorline: __line})};
  }
};

// Should be called after validating mesh configuration
acsDeviceInfoController.configTR069VirtualAP = async function(
  device, targetMode,
) {
  const wifiRadioState = 1;
  const meshChannel = 7;
  const meshChannel5GHz = 40; // Value has better results on some routers

  let permissions = DeviceVersion.devicePermissions(device);
  const hasMeshVAPObject = permissions.grantMeshVAPObject;
  const hasMeshV2ModeWifi = permissions.grantMeshV2PrimaryModeWifi;
  /*
    If device doesn't have SSID Object by default, then
    we need to check if it has been created already.
    If it hasn't, we will create both the 2.4 and 5GHz mesh AP objects
    IMPORTANT: even if target mode is 1 (cable) we must create these
    objects because, in that case, we disable the virtual APs. If the
    objects don't exist yet this will cause an error!
  */
  let createOk = {populate: false};
  if (!hasMeshVAPObject && hasMeshV2ModeWifi
     && targetMode > 1) {
    createOk = await acsMeshDeviceHandler.createVirtualAPObjects(device);
    if (!createOk.success) {
      return {success: false, msg: createOk.msg};
    }
  }
  // Set the mesh parameters on the TR-069 fields
  let changes = meshHandlers.buildTR069Changes(
    device,
    targetMode,
    wifiRadioState,
    meshChannel,
    meshChannel5GHz,
    createOk.populate,
  );

  // If the task must be executed, only if it is not going to disable or cable
  const mustExecute = (targetMode !== 0 && targetMode !== 1);

  const updated = await acsDeviceInfoController.updateInfo(
    device,
    changes,
    true,
    mustExecute,
  );

  if (!updated) {
    return {success: false, msg: t('errorSendingMeshParamtersToCpe')};
  }
  return {success: true};
};

acsDeviceInfoController.changeAcRules = async function(device) {
  const cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  if (cpe.modelPermissions().features.macAccessControl) {
    return await macAccessControl.changeAcRules(device);
  } else if (cpe.modelPermissions().features.wlanAccessControl) {
    return await wlanAccessControl.changeAcRules(device);
  } else {
    return {
      success: false,
      error_code: 'permissionDenied',
      message: t('permissionDenied', {errorline: __line}),
    };
  }
};

/**
 * @exports controllers/acsDeviceInfo
 */
module.exports = acsDeviceInfoController;
