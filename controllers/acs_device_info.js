/* eslint-disable no-prototype-builtins */
/* global __line */
const DevicesAPI = require('./external-genieacs/devices-api');
const TasksAPI = require('./external-genieacs/tasks-api');
const controlApi = require('./external-api/control');
const DeviceModel = require('../models/device');
const DeviceVersion = require('../models/device_version');
const Notification = require('../models/notification');
const Config = require('../models/config');
const deviceHandlers = require('./handlers/devices');
const meshHandlers = require('./handlers/mesh');
const acsAccessControlHandler = require('./handlers/acs/access_control.js');
const acsPortForwardHandler = require('./handlers/acs/port_forward.js');
const acsDiagnosticsHandler = require('./handlers/acs/diagnostics.js');
const acsMeshDeviceHandler = require('./handlers/acs/mesh.js');
const acsDeviceLogsHandler = require('./handlers/acs/logs.js');
const acsConnDevicesHandler = require('./handlers/acs/connected_devices.js');
const acsMeasuresHandler = require('./handlers/acs/measures.js');
const acsXMLConfigHandler = require('./handlers/acs/xmlconfig.js');
const debug = require('debug')('ACS_DEVICE_INFO');
const t = require('./language').i18next.t;


let acsDeviceInfoController = {};

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
      return '11g';
    case '11bgn':
    case '11a':
    case '11na':
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
    case 'an+ac':
      return (is5ghz) ? '11ac' : undefined;
    case 'ax':
    default:
      return undefined;
  }
};

const convertWifiBand = function(band, mode, is5ghz) {
  let isAC = convertWifiMode(mode, is5ghz) === '11ac';
  switch (band) {
    case '2':
    case 'auto':
    case 'Auto':
    case '20/40MHz Coexistence':
      return 'auto';
    case '20MHz':
    case '20Mhz':
    case '0':
      return (isAC) ? 'VHT20' : 'HT20';
    case '40MHz':
    case '40Mhz':
    case '20/40MHz':
    case '1':
      return (isAC) ? 'VHT40' : 'HT40';
    case '80MHz':
    case '80Mhz':
    case '20/40/80MHz':
    case '3':
      return (isAC) ? 'VHT80' : undefined;
    case '160MHz':
    default:
      return undefined;
  }
};

const extractGreatekCredentials = function(config) {
  let usernameRegex = /SUSER_NAME(.+?)\//g;
  let passwordRegex = /SUSER_PASSWORD(.+?)\//g;
  let usernameMatches = config.match(usernameRegex);
  let passwordMatches = config.match(passwordRegex);
  let username;
  let password;
  if (usernameMatches.length > 0) {
    username = usernameMatches[0].split('=')[1];
    username = username.substring(1, username.length - 2);
  }
  if (passwordMatches.length > 0) {
    password = passwordMatches[0].split('=')[1];
    password = password.substring(1, password.length - 2);
  }
  return {username: username, password: password};
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

const createRegistry = async function(req, permissions) {
  let data = req.body.data;
  let hasPPPoE = false;
  if (data.wan.pppoe_enable && data.wan.pppoe_enable.value) {
    if (typeof data.wan.pppoe_enable.value === 'string') {
      hasPPPoE = (data.wan.pppoe_enable.value == '0') ? false : true;
    } else if (typeof data.wan.pppoe_enable.value === 'number') {
      hasPPPoE = (data.wan.pppoe_enable.value == 0) ? false : true;
    } else if (typeof data.wan.pppoe_enable.value === 'boolean') {
      hasPPPoE = data.wan.pppoe_enable.value;
    }
  }
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

  let matchedConfig = await Config.findOne({is_default: true}).lean().catch(
    function(err) {
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
  let wifi5Capable = false;
  if (data.wifi5.ssid && data.wifi5.ssid.value) {
    wifi5Capable = true;
  }
  let ssid = data.wifi2.ssid.value.trim();
  let ssid5ghz = '';
  if (wifi5Capable) {
    ssid5ghz = data.wifi5.ssid.value.trim();
  }
  let isSsidPrefixEnabled = false;
  let createPrefixErrNotification = false;
  // -> 'new registry' scenario
  let checkResponse = deviceHandlers.checkSsidPrefix(
    matchedConfig, ssid, ssid5ghz, false, true);
  /* if in the check is not enabled but hash exists and is
    enabled in config, so we have an error */
  createPrefixErrNotification = !checkResponse.enablePrefix &&
    matchedConfig.personalizationHash !== '' &&
    matchedConfig.isSsidPrefixEnabled;
  isSsidPrefixEnabled = checkResponse.enablePrefix;
  // cleaned ssid
  ssid = checkResponse.ssid2;
  if (wifi5Capable) {
    ssid5ghz = checkResponse.ssid5;
  }

  // Check for an alternative UID to replace serial field
  let altUid;
  if (data.common.alt_uid) {
    altUid = data.common.alt_uid.value;
  }

  // Greatek does not expose these fields normally, only under this config file,
  // a XML with proprietary format. We parse it using regex to get what we want
  if (data.common.greatek_config && data.common.greatek_config.value) {
    let webCredentials = extractGreatekCredentials(
      data.common.greatek_config.value);
    data.common.web_admin_username = {};
    data.common.web_admin_password = {};
    data.common.web_admin_username.value = webCredentials.username;
    data.common.web_admin_password.value = webCredentials.password;
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
    meshBSSIDs = DeviceVersion.getMeshBSSIDs(model, macAddr);
  }

  // Get channel information here to avoid ternary mess
  let wifi2Channel;
  let wifi5Channel;
  if (data.wifi2.channel && data.wifi2.auto) {
    wifi2Channel = (data.wifi2.auto.value) ? 'auto' : data.wifi2.channel.value;
  }
  if (wifi5Capable && data.wifi5.channel && data.wifi5.auto) {
    wifi5Channel = (data.wifi5.auto.value) ? 'auto' : data.wifi5.channel.value;
  }

  // Remove DHCP uptime for Archer C6
  let wanUptime = (hasPPPoE) ?
    data.wan.uptime_ppp.value : data.wan.uptime.value;
  if (!hasPPPoE && model == 'Archer C6') {
    wanUptime = undefined;
  }

  let serialTR069 = splitID[splitID.length - 1];
  // Convert Hurakall serial information
  if (model === 'ST-1001-FL') {
    let serialPrefix = serialTR069.substring(0, 8); // 4 chars in base 16
    let serialSuffix = serialTR069.substring(8); // remaining chars in utf8
    serialPrefix = serialPrefix.match(/[0-9]{2}/g); // split in groups of 2
    // decode from base16 to utf8
    serialPrefix = serialPrefix.map((prefix) => {
      prefix = parseInt(prefix, 16);
      if (isNaN(prefix)) {
        debug('prefix on serialPrefix is not an number');
      }
      return String.fromCharCode(prefix);
    });
    // join parts in final format
    serialTR069 = (serialPrefix.join('') + serialSuffix).toUpperCase();
  }

  let newDevice = new DeviceModel({
    _id: macAddr,
    use_tr069: true,
    secure_tr069: data.common.acs_url.value.includes('https'),
    serial_tr069: serialTR069,
    alt_uid_tr069: altUid,
    acs_id: req.body.acs_id,
    model: model,
    version: data.common.version.value,
    installed_release: data.common.version.value,
    release: data.common.version.value,
    connection_type: (hasPPPoE) ? 'pppoe' : 'dhcp',
    pppoe_user: (hasPPPoE) ? data.wan.pppoe_user.value : undefined,
    pppoe_password: (hasPPPoE) ? data.wan.pppoe_pass.value : undefined,
    wan_vlan_id: (data.wan.vlan) ? data.wan.vlan.value : undefined,
    wan_mtu: (hasPPPoE) ? data.wan.mtu_ppp.value : data.wan.mtu.value,
    wifi_ssid: ssid,
    wifi_bssid:
      (data.wifi2.bssid) ? data.wifi2.bssid.value.toUpperCase() : undefined,
    wifi_channel: wifi2Channel,
    wifi_mode: (data.wifi2.mode) ?
      convertWifiMode(data.wifi2.mode.value, false) : undefined,
    wifi_band: (data.wifi2.band) ?
      convertWifiBand(data.wifi2.band.value, data.wifi2.mode.value, false) :
       undefined,
    wifi_state: (data.wifi2.enable.value) ? 1 : 0,
    wifi_is_5ghz_capable: wifi5Capable,
    wifi_ssid_5ghz: ssid5ghz,
    wifi_bssid_5ghz:
      (data.wifi5.bssid) ? data.wifi5.bssid.value.toUpperCase() : undefined,
    wifi_channel_5ghz: wifi5Channel,
    wifi_mode_5ghz: (data.wifi5.mode) ?
      convertWifiMode(data.wifi5.mode.value, true) : undefined,
    wifi_band_5ghz: (data.wifi5.band) ?
      convertWifiBand(data.wifi5.band.value, data.wifi5.mode.value, true) :
       undefined,
    wifi_state_5ghz: (wifi5Capable && data.wifi5.enable.value) ? 1 : 0,
    lan_subnet: data.lan.router_ip.value,
    lan_netmask: (subnetNumber > 0) ? subnetNumber : undefined,
    ip: (cpeIP) ? cpeIP : undefined,
    wan_ip: (hasPPPoE) ? data.wan.wan_ip_ppp.value : data.wan.wan_ip.value,
    wan_negociated_speed: (data.wan.rate) ? data.wan.rate.value : undefined,
    wan_negociated_duplex:
      (data.wan.duplex) ? data.wan.duplex.value : undefined,
    sys_up_time: data.common.uptime.value,
    wan_up_time: wanUptime,
    created_at: Date.now(),
    last_contact: Date.now(),
    isSsidPrefixEnabled: isSsidPrefixEnabled,
    web_admin_username: (data.common.web_admin_username) ?
      data.common.web_admin_username.value : undefined,
    web_admin_password: (data.common.web_admin_password) ?
      data.common.web_admin_password.value : undefined,
    mesh_mode: 0,
    mesh_key: newMeshKey,
    mesh_id: newMeshId,
    bssid_mesh2: meshBSSIDs.mesh2,
    bssid_mesh5: meshBSSIDs.mesh5,
  });
  try {
    await newDevice.save();
    await acsDeviceInfoController.reportOnuDevices(req.app, [newDevice]);
  } catch (err) {
    console.error('Error on device tr-069 creation: ' + err);
    return false;
  }
  // Update SSID prefix on CPE if enabled
  let changes = {wan: {}, lan: {}, wifi2: {}, wifi5: {}, common: {}, stun: {}};
  let doChanges = false;
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
  /* For Tenda AC10 model is mandatory to set
   LANHostConfigManagement.DHCPServerConfigurable field
   to be allowed to change CPE IP and Subnet Mask */
  if (model == 'AC10') {
    changes.lan.enable_config = '1';
  }
  if (doChanges) {
    // Increment sync task loops
    newDevice.acs_sync_loops += 1;
    // Possibly TODO: Let acceptLocalChanges be configurable for the admin
    let acceptLocalChanges = false;
    if (!acceptLocalChanges) {
      acsDeviceInfoController.updateInfo(newDevice, changes);
    }
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

// Essential information sent from CPE gets handled here.
// It will also check for complete synchronization necessity by dispatching
// "measure" as true. Complete synchronization is done by "syncDevice" function
acsDeviceInfoController.informDevice = async function(req, res) {
  let dateNow = Date.now();
  let id = req.body.acs_id;
  let device = await DeviceModel.findOne({acs_id: id}).catch((err)=>{
    return res.status(500).json({success: false,
      message: t('cpeFindError', {errorline: __line})});
  });
  // New devices need to sync immediately
  if (!device) {
    return res.status(200).json({success: true, measure: true});
  }
  // Why is a non tr069 device calling this function? Just a sanity check
  if (!device.use_tr069) {
    return res.status(500).json({
      success: false,
      message: t('nonTr069AcsSyncError', {errorline: __line}),
    });
  }
  // Devices updating need to return immediately
  // Devices with no last sync need to sync immediately
  // Devices recovering from hard reset need to sync immediately
  if (
    device.do_update || !device.last_tr069_sync || device.recovering_tr069_reset
  ) {
    device.last_tr069_sync = dateNow;
    device.last_contact = dateNow;
    await device.save().catch((err) => {
      console.log('Error saving last contact and last tr-069 sync');
    });
    return res.status(200).json({success: true, measure: true});
  }
  let config = await Config.findOne({is_default: true}, {tr069: true}).lean()
  .catch((err)=>{
    return res.status(500).json({success: false,
      message: t('configFindError', {errorline: __line})});
  });
  // Devices that havent synced in (config interval) need to sync immediately
  let syncDiff = dateNow - device.last_tr069_sync;
  if (syncDiff >= config.tr069.sync_interval) {
    device.last_tr069_sync = dateNow;
    res.status(200).json({success: true, measure: true});
  } else {
    res.status(200).json({success: true, measure: false});
  }
  // Always update last_contact to keep device online
  device.last_contact = dateNow;
  await device.save().catch((err) => {
    console.log('Error saving last contact');
  });
};

// Complete CPE information synchronization gets done here. This function
// call is controlled by "informDevice" function when setting "measure" as
// true
acsDeviceInfoController.syncDevice = async function(req, res) {
  let data = req.body.data;
  if (!data || !data.common || !data.common.mac || !data.common.mac.value) {
    return res.status(500).json({
      success: false,
      message: t('fieldNameMissing', {name: 'mac', errorline: __line}),
    });
  }
  let config = await Config.findOne({is_default: true}, {tr069: true}).lean()
  .catch((err) => {
    return res.status(500).json({success: false,
      message: t('configFindError', {errorline: __line})});
  });
  // Convert mac field from - to : if necessary
  if (data.common.mac.value.includes('-')) {
    data.common.mac.value = data.common.mac.value.replace(/-/g, ':');
  }
  let device = await DeviceModel.findById(data.common.mac.value.toUpperCase());

  // Fetch functionalities of CPE
  let permissions = null;
  if (!device && data.common.version && data.common.model) {
    permissions = DeviceVersion.findByVersion(
      data.common.version.value,
      (data.wifi5.ssid ? true : false),
      data.common.model.value,
    );
  } else {
    permissions = DeviceVersion.findByVersion(
      device.version,
      device.wifi_is_5ghz_capable,
      device.model,
    );
  }
  if (!permissions) {
    return res.status(500).json({
      success: false,
      message: t('permissionFindError', {errorline: __line}),
    });
  }

  if (!device) {
    if (await createRegistry(req, permissions)) {
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
  let hasPPPoE = false;
  if (data.wan.pppoe_enable && data.wan.pppoe_enable.value) {
    if (typeof data.wan.pppoe_enable.value === 'string') {
      hasPPPoE = (data.wan.pppoe_enable.value == '0') ? false : true;
    } else if (typeof data.wan.pppoe_enable.value === 'number') {
      hasPPPoE = (data.wan.pppoe_enable.value == 0) ? false : true;
    } else if (typeof data.wan.pppoe_enable.value === 'boolean') {
      hasPPPoE = data.wan.pppoe_enable.value;
    }
  }
  let subnetNumber = convertSubnetMaskToInt(data.lan.subnet_mask.value);
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
  let changes = {wan: {}, lan: {}, wifi2: {}, wifi5: {}, common: {}, stun: {}};
  let hasChanges = false;
  let splitID = req.body.acs_id.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  device.acs_id = req.body.acs_id;

  if (data.common.model.value) device.model = data.common.model.value.trim();

  let serialTR069 = splitID[splitID.length - 1];
  // Convert Hurakall serial information
  if (device.model === 'ST-1001-FL') {
    let serialPrefix = serialTR069.substring(0, 8); // 4 chars in base 16
    let serialSuffix = serialTR069.substring(8); // remaining chars in utf8
    serialPrefix = serialPrefix.match(/[0-9]{2}/g); // split in groups of 2
    // decode from base16 to utf8
    serialPrefix = serialPrefix.map((prefix) => {
      prefix = parseInt(prefix, 16);
      if (isNaN(prefix)) {
        debug('prefix on serialPrefix are not an number');
      }
      return String.fromCharCode(prefix);
    });
    // join parts in final format
    serialTR069 = (serialPrefix.join('') + serialSuffix).toUpperCase();
  }
  device.serial_tr069 = serialTR069;

  device.secure_tr069 = data.common.acs_url.value.includes('https');

  // Check for an alternative UID to replace serial field
  if (data.common.alt_uid && data.common.alt_uid.value) {
    let altUid = data.common.alt_uid.value;
    device.alt_uid_tr069 = altUid;
  }

  // Greatek does not expose these fields normally, only under this config file,
  // a XML with proprietary format. We parse it using regex to get what we want
  if (data.common.greatek_config && data.common.greatek_config.value) {
    let webCredentials =
      extractGreatekCredentials(data.common.greatek_config.value);
    data.common.web_admin_username = {};
    data.common.web_admin_password = {};
    data.common.web_admin_username.value = webCredentials.username;
    data.common.web_admin_password.value = webCredentials.password;
  }

  if (data.common.version.value) {
    device.version = data.common.version.value.trim();
  }
  device.connection_type = (hasPPPoE) ? 'pppoe' : 'dhcp';
  if (hasPPPoE) {
    if (!device.pppoe_user) {
      device.pppoe_user = data.wan.pppoe_user.value.trim();
    } else if (device.pppoe_user.trim() !== data.wan.pppoe_user.value.trim()) {
      changes.wan.pppoe_user = device.pppoe_user.trim();
      hasChanges = true;
    }
    if (!device.pppoe_password) {
      device.pppoe_password = data.wan.pppoe_pass.value.trim();
      // make sure this onu reports the password
    } else if (data.wan.pppoe_pass.value &&
               device.pppoe_password.trim() !== data.wan.pppoe_pass.value.trim()
    ) {
      changes.wan.pppoe_pass = device.pppoe_password.trim();
      hasChanges = true;
    }
    if (data.wan.wan_ip_ppp.value) device.wan_ip = data.wan.wan_ip_ppp.value;
    if (data.wan.uptime_ppp.value) {
      device.wan_up_time = data.wan.uptime_ppp.value;
    }
    if (data.wan.mtu_ppp && data.wan.mtu_ppp.value) {
      let mtu = data.wan.mtu_ppp.value;
      device.wan_mtu = mtu;
    }
  } else {
    if (data.wan.wan_ip.value) device.wan_ip = data.wan.wan_ip.value;
    // Do not store DHCP uptime for Archer C6
    if (data.wan.uptime.value && device.model != 'Archer C6') {
      device.wan_up_time = data.wan.uptime.value;
    }
    device.pppoe_user = '';
    device.pppoe_password = '';
    if (data.wan.mtu && data.wan.mtu.value) {
      let mtu = data.wan.mtu.value;
      device.wan_mtu = mtu;
    }
  }

  if (data.wan.vlan && data.wan.vlan.value) {
    let vlan = data.wan.vlan.value;
    device.wan_vlan_id = vlan;
  }

  if (data.wifi2.enable && typeof data.wifi2.enable.value !== 'undefined') {
    let enable = (data.wifi2.enable.value) ? 1 : 0;
    if (device.wifi_state !== enable) {
      changes.wifi2.enable = device.wifi_state;
      // When enabling Wi-Fi set beacon type
      if (device.wifi_state) {
        changes.wifi2.beacon_type = DevicesAPI.getBeaconTypeByModel(model);
      }
      hasChanges = true;
    }
  }
  if (data.wifi5.enable && typeof data.wifi5.enable.value !== 'undefined') {
    let enable = (data.wifi5.enable.value) ? 1 : 0;
    if (device.wifi_state_5ghz !== enable) {
      changes.wifi5.enable = device.wifi_state_5ghz;
      // When enabling Wi-Fi set beacon type
      if (device.wifi_state_5ghz) {
        changes.wifi5.beacon_type = DevicesAPI.getBeaconTypeByModel(model);
      }
      hasChanges = true;
    }
  }

  let checkResponse = await getSsidPrefixCheck(device);
  let ssidPrefix = checkResponse.prefix;
  // apply cleaned ssid
  device.wifi_ssid = checkResponse.ssid2;
  device.wifi_ssid_5ghz = checkResponse.ssid5;
  if (data.wifi2.ssid) {
    if (data.wifi2.ssid.value && !device.wifi_ssid) {
      device.wifi_ssid = data.wifi2.ssid.value.trim();
    }
    if (ssidPrefix + device.wifi_ssid.trim() !== data.wifi2.ssid.value.trim()) {
      changes.wifi2.ssid = device.wifi_ssid.trim();
      hasChanges = true;
    }
  }
  // Force a wifi password sync after a hard reset
  if (device.recovering_tr069_reset) {
    changes.wifi2.password = device.wifi_password.trim();
    hasChanges = true;
  }
  if (data.wifi2.bssid) {
    let bssid2 = data.wifi2.bssid.value;
    if ((bssid2 && !device.wifi_bssid) ||
        (device.wifi_bssid !== bssid2.toUpperCase())) {
      device.wifi_bssid = bssid2.toUpperCase();
    }
  }
  if (data.wifi2.channel) {
    let channel2 = data.wifi2.channel.value.toString();
    if (data.wifi2.auto && data.wifi2.auto.value) {
      // Explicit auto option, use that
      channel2 = 'auto';
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
  if (data.wifi2.mode) {
    let mode2 = convertWifiMode(data.wifi2.mode.value, false);
    if (data.wifi2.mode.value && !device.wifi_mode) {
      device.wifi_mode = mode2;
    } else if (device.wifi_mode !== mode2) {
      changes.wifi2.mode = device.wifi_mode;
      hasChanges = true;
    }
  }
  if (data.wifi2.band) {
    let band2 = convertWifiBand(data.wifi2.band.value,
     data.wifi2.mode.value, false);
    if (data.wifi2.band.value && !device.wifi_band) {
      device.wifi_band = band2;
    } else if (device.wifi_band !== band2) {
      changes.wifi2.band = device.wifi_band;
    }
  }
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
  if (data.wifi5.ssid) {
    if (data.wifi5.ssid.value && !device.wifi_ssid_5ghz) {
      device.wifi_ssid_5ghz = data.wifi5.ssid.value.trim();
    }
    if (ssidPrefix + device.wifi_ssid_5ghz.trim() !==
        data.wifi5.ssid.value.trim()
    ) {
      changes.wifi5.ssid = device.wifi_ssid_5ghz.trim();
      hasChanges = true;
    }
  }
  // Force a wifi password sync after a hard reset
  if (device.recovering_tr069_reset && device.wifi_is_5ghz_capable) {
    changes.wifi5.password = device.wifi_password_5ghz.trim();
    hasChanges = true;
  }
  if (data.wifi5.bssid) {
    let bssid5 = data.wifi5.bssid.value;
    if ((bssid5 && !device.wifi_bssid_5ghz) ||
        (device.wifi_bssid_5ghz !== bssid5.toUpperCase())) {
      device.wifi_bssid_5ghz = bssid5.toUpperCase();
    }
  }
  if (data.wifi5.channel) {
    let channel5 = data.wifi5.channel.value.toString();
    if (data.wifi5.auto && data.wifi5.auto.value) {
      // Explicit auto option, use that
      channel5 = 'auto';
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
  if (data.wifi5.mode) {
    let mode5 = convertWifiMode(data.wifi5.mode.value, true);
    if (data.wifi5.mode.value && !device.wifi_mode_5ghz) {
      device.wifi_mode_5ghz = mode5;
    } else if (device.wifi_mode_5ghz !== mode5) {
      changes.wifi5.mode = device.wifi_mode_5ghz;
      hasChanges = true;
    }
  }
  if (data.wifi5.band && data.wifi5.mode) {
    let band5 = convertWifiBand(data.wifi5.band.value,
     data.wifi5.mode.value, true);
    if (data.wifi5.band.value && !device.wifi_band_5ghz) {
      device.wifi_band_5ghz = band5;
    } else if (device.wifi_band_5ghz !== band5) {
      changes.wifi5.band = device.wifi_band_5ghz;
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
    const meshBSSIDs = DeviceVersion.getMeshBSSIDs(device.model, device._id);
    device.bssid_mesh2 = meshBSSIDs.mesh2.toUpperCase();
    device.bssid_mesh5 = meshBSSIDs.mesh5.toUpperCase();
  }
  if (data.lan.router_ip) {
    if (data.lan.router_ip.value && !device.lan_subnet) {
      device.lan_subnet = data.lan.router_ip.value;
    } else if (device.lan_subnet !== data.lan.router_ip.value) {
      changes.lan.router_ip = device.lan_subnet;
      hasChanges = true;
    }
  }
  if (subnetNumber > 0 && !device.lan_netmask) {
    device.lan_netmask = subnetNumber;
  } else if (device.lan_netmask !== subnetNumber) {
    changes.lan.subnet_mask = device.lan_netmask;
    hasChanges = true;
  }
  if (data.wan.recv_bytes && data.wan.recv_bytes.value &&
      data.wan.sent_bytes && data.wan.sent_bytes.value) {
    device.wan_bytes = acsMeasuresHandler.appendBytesMeasure(
      device.wan_bytes,
      data.wan.recv_bytes.value,
      data.wan.sent_bytes.value,
    );
  }
  let isPonRxValOk = false;
  let isPonTxValOk = false;
  if (data.wan.pon_rxpower && data.wan.pon_rxpower.value) {
    device.pon_rxpower = acsMeasuresHandler.convertToDbm(
      data.common.model.value, data.wan.pon_rxpower.value,
    );
    isPonRxValOk = true;
  } else if (data.wan.pon_rxpower_epon && data.wan.pon_rxpower_epon.value) {
    device.pon_rxpower = acsMeasuresHandler.convertToDbm(
      data.common.model.value, data.wan.pon_rxpower_epon.value,
    );
    isPonRxValOk = true;
  }
  if (data.wan.pon_txpower && data.wan.pon_txpower.value) {
    device.pon_txpower = acsMeasuresHandler.convertToDbm(
      data.common.model.value, data.wan.pon_txpower.value,
    );
    isPonTxValOk = true;
  } else if (data.wan.pon_txpower_epon && data.wan.pon_txpower_epon.value) {
    device.pon_txpower = acsMeasuresHandler.convertToDbm(
      data.common.model.value, data.wan.pon_txpower_epon.value,
    );
    isPonTxValOk = true;
  }
  if (isPonRxValOk && isPonTxValOk) {
    device.pon_signal_measure = acsMeasuresHandler.appendPonSignal(
      device.pon_signal_measure,
      device.pon_rxpower,
      device.pon_txpower,
    );
  }
  if (data.common.web_admin_username && data.common.web_admin_username.value) {
    if (typeof config.tr069.web_login !== 'undefined' &&
        data.common.web_admin_username.writable &&
        config.tr069.web_login !== data.common.web_admin_username.value) {
      changes.common.web_admin_username = config.tr069.web_login;
      hasChanges = true;
    }
    device.web_admin_username = data.common.web_admin_username.value;
  }
  if (data.common.web_admin_password && data.common.web_admin_password.value) {
    if (typeof config.tr069.web_password !== 'undefined' &&
        data.common.web_admin_password.writable &&
        config.tr069.web_password !== data.common.web_admin_password.value) {
      changes.common.web_admin_password = config.tr069.web_password;
      hasChanges = true;
    }
    device.web_admin_password = data.common.web_admin_password.value;
  }
  if (
    device.recovering_tr069_reset &&
    data.common.web_admin_username &&
    data.common.web_admin_username.writable
  ) {
    changes.common.web_admin_username = config.tr069.web_login;
    hasChanges = true;
  }
  if (
    device.recovering_tr069_reset &&
    data.common.web_admin_password &&
    data.common.web_admin_password.writable
  ) {
    changes.common.web_admin_password = config.tr069.web_password;
    hasChanges = true;
  }
  if (data.common.version &&
      data.common.version.value !== device.installed_release) {
    device.installed_release = data.common.version.value;
  }
  if (device.installed_release === device.release) {
    device.do_update = false;
    device.do_update_status = 1;
  }
  if (data.wan.rate && data.wan.rate.value) {
    device.wan_negociated_speed = data.wan.rate.value;
  }
  if (data.wan.duplex && data.wan.duplex.value) {
    device.wan_negociated_duplex = data.wan.duplex.value;
  }
  if (data.common.uptime && data.common.uptime.value) {
    device.sys_up_time = data.common.uptime.value;
  }
  if (cpeIP) device.ip = cpeIP;
  // If has STUN Support in the model and
  // STUN Enable flag is different from actual configuration
  if (permissions.grantSTUN &&
      data.common.stun_enable.value.toString() !==
      config.tr069.stun_enable.toString()) {
    hasChanges = true;
    changes.common.stun_enable = config.tr069.stun_enable;
    changes.stun.address = config.tr069.server_url;
    changes.stun.port = 3478;
  }

  if (hasChanges) {
    // Increment sync task loops
    device.acs_sync_loops += 1;
    let syncLimit = 5;
    if (device.acs_sync_loops === syncLimit) {
      // Inform via log that this device has entered a sync loop
      let serialChanges = JSON.stringify(changes);
      console.log(
        'Device '+device.acs_id+' has entered a sync loop: '+serialChanges,
      );
    } else if (
      device.recovering_tr069_reset || device.acs_sync_loops <= syncLimit
    ) {
      // Guard against looping syncs - do not force changes if over limit
      // Possibly TODO: Let acceptLocalChanges be configurable for the admin
      // Bypass if recovering from hard reset
      let acceptLocalChanges = false;
      if (!acceptLocalChanges) {
        if (hasChanges) {
          acsDeviceInfoController.updateInfo(device, changes);
        }
      }
    }
  } else {
    let informDiff = Date.now() - device.last_contact;
    if (informDiff >= 20000) {
      // 20s - Guard against any very short inform repetitions from GenieACS
      device.acs_sync_loops = 0;
    }
  }
  device.recovering_tr069_reset = false;
  let now = Date.now();
  device.last_contact = now;
  device.last_tr069_sync = now;
  // daily data fetching
  let previous = device.last_contact_daily;
  if (!previous || (now - previous) > 24*60*60*1000) {
    device.last_contact_daily = now;
    let targets = [];
    // Every day fetch device port forward entries
    if (permissions.grantPortForward) {
      if (device.model === 'GONUAC001' || device.model === '121AC' ||
        device.model === 'HG9') {
        targets.push('port-forward');
      } else {
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
          acsPortForwardHandler.changePortForwardRules(device, entriesDiff);
        } else {
          acsPortForwardHandler.checkPortForwardRules(device);
        }
      }
    }
    if (
      device.model === 'GONUAC001' ||
      device.model === '121AC' ||
      device.model === 'IGD' ||
      device.model === 'MP_G421R' ||
      device.model === 'HG9'
    ) {
      // Trigger xml config syncing for
      // web admin user and password
      device.web_admin_user = config.tr069.web_login;
      device.web_admin_password = config.tr069.web_password;
      if (model === 'MP_G421R' && config.tr069.web_login === 'admin') {
        // this model can't have two users as "admin", if this happens you
        // can't access it anymore and will be only using normal user account
        device.web_admin_user = 'root';
      }
      targets.push('web-admin');
      acsXMLConfigHandler.configFileEditing(device, targets);
    } else {
      // Send web admin password correct setup for those CPEs that always
      // retrieve blank on this field
      if (typeof config.tr069.web_password !== 'undefined' &&
          data.common.web_admin_password &&
          data.common.web_admin_password.writable &&
          data.common.web_admin_password.value === '') {
        let passChange = {common: {}};
        passChange.common.web_admin_password = config.tr069.web_password;
        device.web_admin_password = config.tr069.web_password;
        acsDeviceInfoController.updateInfo(device, passChange);
      }
    }
    if (permissions.grantBlockDevices) {
      console.log('Will update device Access Control Rules');
      await acsAccessControlHandler.changeAcRules(device);
    }
  }
  await device.save().catch((err) => {
    console.log('Error saving device sync data to database: ' + err);
  });
};

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

  let fields = DevicesAPI.getModelFieldsFromDevice(device).fields;
  let task = {
    name: 'getParameterValues',
    parameterNames: [
      fields.diagnostics.ping.root, fields.diagnostics.speedtest.root,
    ],
  };
  TasksAPI.addTask(
    acsID, task, acsDiagnosticsHandler.fetchDiagnosticsFromGenie,
  );
};

acsDeviceInfoController.requestLogs = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let logField = DevicesAPI.getModelFieldsFromDevice(device).fields.log;
  let task = {
    name: 'getParameterValues',
    parameterNames: [logField],
  };
  TasksAPI.addTask(acsID, task, acsDeviceLogsHandler.fetchLogFromGenie);
};

acsDeviceInfoController.requestWanBytes = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let fields = DevicesAPI.getModelFieldsFromDevice(device).fields;
  let recvField = fields.wan.recv_bytes;
  let sentField = fields.wan.sent_bytes;
  let task = {
    name: 'getParameterValues',
    parameterNames: [
      recvField,
      sentField,
    ],
  };
  TasksAPI.addTask(acsID, task, acsMeasuresHandler.fetchWanBytesFromGenie);
};

acsDeviceInfoController.requestUpStatus = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let fields = DevicesAPI.getModelFieldsFromDevice(device).fields;
  let task = {
    name: 'getParameterValues',
    parameterNames: [
      fields.common.uptime,
    ],
  };
  if (device.connection_type === 'pppoe') {
    task.parameterNames.push(fields.wan.uptime_ppp);
    task.parameterNames.push(fields.wan.pppoe_user);
  } else if (device.connection_type === 'dhcp') {
    task.parameterNames.push(fields.wan.uptime);
  }
  let permissions = DeviceVersion.findByVersion(
    device.version, device.wifi_is_5ghz_capable, device.model,
  );
  if (permissions.grantPonSignalSupport) {
    task.parameterNames.push(fields.wan.pon_rxpower);
    task.parameterNames.push(fields.wan.pon_txpower);
    if (fields.wan.pon_rxpower_epon && fields.wan.pon_txpower_epon) {
      task.parameterNames.push(fields.wan.pon_rxpower_epon);
      task.parameterNames.push(fields.wan.pon_txpower_epon);
    }
  }
  TasksAPI.addTask(acsID, task, acsMeasuresHandler.fetchUpStatusFromGenie);
};

acsDeviceInfoController.requestConnectedDevices = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let fields = DevicesAPI.getModelFieldsFromDevice(device).fields;
  let hostsField = fields.devices.hosts;
  let assocField = fields.devices.associated;
  let totalAssocField = fields.devices.assoc_total;
  let task = {
    name: 'getParameterValues',
    parameterNames: [hostsField, assocField, totalAssocField],
  };
  if (fields.devices.associated_5) {
    task.parameterNames.push(fields.devices.associated_5);
  }
  TasksAPI.addTask(acsID, task, acsConnDevicesHandler.fetchDevicesFromGenie);
};

const getSsidPrefixCheck = async function(device) {
  let config;
  try {
    config = await Config.findOne({is_default: true}).lean();
    if (!config) throw new Error('Config not found');
  } catch (error) {
    console.log(error.message);
  }
  // -> 'updating registry' scenario
  return deviceHandlers.checkSsidPrefix(
    config, device.wifi_ssid, device.wifi_ssid_5ghz,
    device.isSsidPrefixEnabled);
};

acsDeviceInfoController.updateInfo = async function(
  device, changes, awaitUpdate = false,
) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  // let mac = device._id;
  let acsID = device.acs_id;
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let modelName = device.model;
  let fields = DevicesAPI.getModelFieldsFromDevice(device).fields;
  let hasChanges = false;
  let hasUpdatedDHCPRanges = false;
  let rebootAfterUpdate = false;
  let task = {name: 'setParameterValues', parameterValues: []};
  let ssidPrefixObj = await getSsidPrefixCheck(device);
  let ssidPrefix = ssidPrefixObj.prefix;
  // Some Nokia models have a bug where changing the SSID without changing the
  // password as well makes the password reset to default value, so we force the
  // password to be updated as well - this also takes care of any possible wifi
  // password resets
  if (changes.wifi2 && changes.wifi2.ssid) {
    changes.wifi2.password = device.wifi_password;
  }
  if (changes.wifi5 && changes.wifi5.ssid) {
    changes.wifi5.password = device.wifi_password_5ghz;
  }
  Object.keys(changes).forEach((masterKey)=>{
    Object.keys(changes[masterKey]).forEach((key)=>{
      if (!fields[masterKey][key]) return;
      if (key === 'channel') {
        // Special case since channel relates to 2 fields
        let channel = changes[masterKey][key];
        let auto = channel === 'auto';
        if (model == 'AC10') {
          // Special case - fields are treated as strings
          task.parameterValues.push([
            fields[masterKey]['auto'], (auto)? '1':'0', 'xsd:string',
          ]);
          if (!auto) {
            task.parameterValues.push([
              fields[masterKey][key], channel, 'xsd:string',
            ]);
          }
        } else if (model === 'ST-1001-FL') {
          // Special case - there is no auto field, use channel 0
          if (auto) channel = '0';
          const parsedChannel = parseInt(channel);
          // this should never happen if auto is true
          if (isNaN(parsedChannel)) {
            debug('Wrong channel, auto but not an number!!!');
          }
          task.parameterValues.push([
            fields[masterKey][key], parsedChannel, 'xsd:unsignedInt',
          ]);
        } else {
          task.parameterValues.push([
            fields[masterKey]['auto'], auto, 'xsd:boolean',
          ]);
          if (!auto) {
            const parsedChannel = parseInt(channel);
            if (isNaN(parsedChannel)) {
              debug('Wrong channel, not auto but not an number!!!');
            }
            task.parameterValues.push([
              fields[masterKey][key], parsedChannel, 'xsd:unsignedInt',
            ]);
          }
        }
        hasChanges = true;
        return;
      }
      if ((key === 'router_ip' || key === 'subnet_mask') &&
          !hasUpdatedDHCPRanges) {
        // Special case for lan ip/mask since we need to update dhcp range
        let dhcpRanges = convertSubnetMaskToRange(device.lan_netmask);
        if (dhcpRanges.min && dhcpRanges.max) {
          let subnet = device.lan_subnet;
          let networkPrefix = subnet.split('.').slice(0, 3).join('.');
          let minIP = networkPrefix + '.' + dhcpRanges.min;
          let maxIP = networkPrefix + '.' + dhcpRanges.max;
          task.parameterValues.push([
            fields['lan']['lease_min_ip'], minIP, 'xsd:string',
          ]);
          task.parameterValues.push([
            fields['lan']['lease_max_ip'], maxIP, 'xsd:string',
          ]);
          task.parameterValues.push([
            fields['lan']['ip_routers'], subnet, 'xsd:string',
          ]);
          task.parameterValues.push([
            fields['lan']['dns_servers'], subnet, 'xsd:string',
          ]);
          hasUpdatedDHCPRanges = true; // Avoid editing this field twice
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
        // In IGD aka FW323DAC, need reboot when change 2.4GHz wifi settings
        if (masterKey === 'wifi2' && model === 'IGD' && modelName === 'IGD') {
          rebootAfterUpdate = true;
        }
      }
      if (key === 'web_admin_password') {
        // Validate if matches 8 char minimum, 16 char maximum, has upper case,
        // at least one number, lower case and special char.
        // Special char cant be the first one an will be validated
        // at config setup since there is legacy support needed
        let password = changes[masterKey][key];
        let passRegex= new RegExp(''
          + /(?=.{8,16}$)/.source
          + /(?=.*[A-Z])/.source
          + /(?=.*[a-z])/.source
          + /(?=.*[0-9])/.source
          + /(?=.*[-!@#$%^&*+_.]).*/.source);
        if (!passRegex.test(password)) return;
      }
      let convertedValue = DevicesAPI.convertField(
        masterKey, key, splitID[0], modelName, changes[masterKey][key],
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
      if (!result || !result.success || !result.executed) {
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
    let fields = DevicesAPI.getModelFieldsFromDevice(offlineDevices[i]).fields;
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

  const hasMeshVAPObject = DeviceVersion.findByVersion(
    device.version,
    device.wifi_is_5ghz_capable,
    device.model,
  ).grantMeshVAPObject;
  /*
    If device doesn't have SSID Object by default, then
    we need to check if it has been created already.
    If it hasn't, we will create both the 2.4 and 5GHz mesh AP objects
    IMPORTANT: even if target mode is 1 (cable) we must create these
    objects because, in that case, we disable the virtual APs. If the
    objects don't exist yet this will cause an error!
  */
  let createOk = {populate: false};
  if (!hasMeshVAPObject && targetMode > 0) {
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
  const updated =
    await acsDeviceInfoController.updateInfo(device, changes, true);
  if (!updated) {
    return {success: false, msg: t('errorSendingMeshParamtersToCpe')};
  }
  return {success: true};
};

module.exports = acsDeviceInfoController;
