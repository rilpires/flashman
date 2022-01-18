const DevicesAPI = require('./external-genieacs/devices-api');
const TasksAPI = require('./external-genieacs/tasks-api');
const FirmwaresAPI = require('./external-genieacs/firmwares-api');
const controlApi = require('./external-api/control');
const DeviceModel = require('../models/device');
const DeviceVersion = require('../models/device_version');
const FirmwareModel = require('../models/firmware');
const Notification = require('../models/notification');
const Config = require('../models/config');
const sio = require('../sio');
const deviceHandlers = require('./handlers/devices');
const meshHandlers = require('./handlers/mesh');
const acsHandlers = require('./handlers/acs');
const utilHandlers = require('./handlers/util');

const pako = require('pako');
const http = require('http');

let acsDeviceInfoController = {};

const checkForNestedKey = function(data, key) {
  if (!data) return false;
  let current = data;
  let splitKey = key.split('.');
  for (let i = 0; i < splitKey.length; i++) {
    if (!current.hasOwnProperty(splitKey[i])) return false;
    current = current[splitKey[i]];
  }
  return true;
};

const getFromNestedKey = function(data, key) {
  if (!data) return undefined;
  let current = data;
  let splitKey = key.split('.');
  for (let i = 0; i < splitKey.length; i++) {
    if (!current.hasOwnProperty(splitKey[i])) return undefined;
    current = current[splitKey[i]];
  }
  return current;
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
    case 'anac':
    case 'a,n,ac':
    case 'a/n/ac':
    case 'ac,n,a':
      return (is5ghz) ? '11ac' : undefined;
    case 'ax':
    default:
      return undefined;
  }
};

const convertToDbm = function(model, rxPower) {
  switch (model) {
    case 'IGD':
    case 'FW323DAC':
    case 'F660':
    case 'F670L':
    case 'F680':
    case 'G-140W-C':
    case 'G-140W-CS':
    case 'G-140W-UD':
      return rxPower = parseFloat((10 * Math.log10(rxPower*0.0001)).toFixed(3));
    case 'GONUAC001':
    default:
      return rxPower;
  }
};

const convertWifiBand = function(band, mode) {
  let isAC = convertWifiMode(mode) === '11ac';
  switch (band) {
    case 'auto':
      return 'auto';
    case '20MHz':
      return (isAC) ? 'VHT20' : 'HT20';
    case '40MHz':
      return (isAC) ? 'VHT40' : 'HT40';
    case '80MHz':
      return (isAC) ? 'VHT80' : undefined;
    case '160MHz':
    default:
      return undefined;
  }
};

const convertWifiRate = function(model, rate) {
  switch (model) {
    case 'F660':
    case 'F670L':
    case 'F680':
      return rate = parseInt(rate) / 1000;
    default:
      return rate = parseInt(rate);
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

const appendBytesMeasure = function(original, recv, sent) {
  let now = Math.floor(Date.now()/1000);
  if (!original) original = {};
  let bytes = JSON.parse(JSON.stringify(original));
  if (Object.keys(bytes).length >= 300) {
    let keysNum = Object.keys(bytes).map((k)=>parseInt(k));
    let smallest = Math.min(...keysNum);
    delete bytes[smallest];
  }
  bytes[now] = [recv, sent];
  return bytes;
};

const appendPonSignal = function(original, rxPower, txPower) {
  let now = Math.floor(Date.now() / 1000);
  if (!original) original = {};
  let dbms = JSON.parse(JSON.stringify(original));
  if (Object.keys(dbms).length >= 100) {
    let keysNum = Object.keys(dbms).map((k) => parseInt(k));
    let smallest = Math.min(...keysNum);
    delete dbms[smallest];
  }
  dbms[now] = [rxPower, txPower];
  return dbms;
};

const processHostFromURL = function(url) {
  if (typeof url !== 'string') return '';
  let doubleSlash = url.indexOf('//');
  let pathStart = url.substring(doubleSlash+2).indexOf('/');
  let endIndex = (pathStart >= 0) ? doubleSlash+2+pathStart : url.length;
  let hostAndPort = url.substring(doubleSlash+2, endIndex);
  return hostAndPort.split(':')[0];
};

const saveDeviceData = async function(mac, landevices) {
  if (!mac || !landevices) return;
  let device = await DeviceModel.findById(mac.toUpperCase());
  landevices.forEach((lanDev)=>{
    let lanMac = lanDev.mac.toUpperCase();
    let registered = device.lan_devices.find((d)=>d.mac===lanMac);
    if (registered) {
      registered.dhcp_name = lanDev.name;
      registered.ip = lanDev.ip;
      registered.conn_type = (lanDev.wifi) ? 1 : 0;
      if (lanDev.rate) registered.conn_speed = lanDev.rate;
      if (lanDev.wifi_freq) registered.wifi_freq = lanDev.wifi_freq;
      if (lanDev.rssi) registered.wifi_signal = lanDev.rssi;
      if (lanDev.snr) registered.wifi_snr = lanDev.snr;
      registered.last_seen = Date.now();
    } else {
      device.lan_devices.push({
        mac: lanMac,
        dhcp_name: lanDev.name,
        ip: lanDev.ip,
        conn_type: (lanDev.wifi) ? 1 : 0,
        conn_speed: (lanDev.rate) ? lanDev.rate : undefined,
        wifi_signal: (lanDev.rssi) ? lanDev.rssi : undefined,
        wifi_freq: (lanDev.wifi_freq) ? lanDev.wifi_freq : undefined,
        wifi_snr: (lanDev.snr) ? lanDev.snr : undefined,
        last_seen: Date.now(),
        first_seen: Date.now(),
      });
    }
  });
  device.last_devices_refresh = Date.now();
  await device.save();
};

const createRegistry = async function(req, permissions) {
  let data = req.body.data;
  let hasPPPoE = (data.wan.pppoe_user &&
                  typeof data.wan.pppoe_user.value === 'string' &&
                  data.wan.pppoe_user.value !== '');
  let subnetNumber = convertSubnetMaskToInt(data.lan.subnet_mask.value);
  let cpeIP = processHostFromURL(data.common.ip.value);
  let splitID = req.body.acs_id.split('-');

  let matchedConfig = await Config.findOne({is_default: true}).catch(
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

  let meshBSSIDs = {};
  if (!permissions.grantMeshV2HardcodedBssid && data.mesh2 &&
      data.mesh2.bssid
  ) {
    meshBSSIDs.mesh2 = data.mesh2.bssid.value.toUpperCase();
    if (data.mesh5 && data.mesh5.bssid) {
      meshBSSIDs.mesh5 = data.mesh5.bssid.value.toUpperCase();
    } else {
      meshBSSIDs.mesh5 = '';
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

  let newDevice = new DeviceModel({
    _id: macAddr,
    use_tr069: true,
    serial_tr069: splitID[splitID.length - 1],
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
      convertWifiBand(data.wifi2.band.value, data.wifi2.mode.value) : undefined,
    wifi_state: (data.wifi2.enable.value) ? 1 : 0,
    wifi_is_5ghz_capable: wifi5Capable,
    wifi_ssid_5ghz: ssid5ghz,
    wifi_bssid_5ghz:
      (data.wifi5.bssid) ? data.wifi5.bssid.value.toUpperCase() : undefined,
    wifi_channel_5ghz: wifi5Channel,
    wifi_mode_5ghz: (data.wifi5.mode) ?
      convertWifiMode(data.wifi5.mode.value, true) : undefined,
    wifi_band_5ghz: (data.wifi5.band) ?
      convertWifiBand(data.wifi5.band.value, data.wifi5.mode.value) : undefined,
    wifi_state_5ghz: (wifi5Capable && data.wifi5.enable.value) ? 1 : 0,
    lan_subnet: data.lan.router_ip.value,
    lan_netmask: (subnetNumber > 0) ? subnetNumber : undefined,
    ip: (cpeIP) ? cpeIP : undefined,
    wan_ip: (hasPPPoE) ? data.wan.wan_ip_ppp.value : data.wan.wan_ip.value,
    wan_negociated_speed: (data.wan.rate) ? data.wan.rate.value : undefined,
    wan_negociated_duplex:
      (data.wan.duplex) ? data.wan.duplex.value : undefined,
    sys_up_time: data.common.uptime.value,
    wan_up_time: (hasPPPoE) ? data.wan.uptime_ppp.value : data.wan.uptime.value,
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
    console.error(err);
    return false;
  }
  // Update SSID prefix on CPE if enabled
  if (isSsidPrefixEnabled) {
    let changes = {wan: {}, lan: {}, wifi2: {}, wifi5: {}, common: {}};
    changes.wifi2.ssid = ssid;
    changes.wifi5.ssid = ssid5ghz;
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
        'message': 'Não foi possível habilitar o prefixo SSID ' +
                   'pois o tamanho máximo de 32 caracteres foi excedido.',
        'message_code': 5,
        'severity': 'alert',
        'type': 'communication',
        'action_title': 'Ok',
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
  let id = req.body.acs_id;
  let device = await DeviceModel.findOne({acs_id: id}).catch((err)=>{
    return res.status(500).json({success: false, message: 'Error in database'});
  });
  // New devices need to sync immediately
  if (!device) {
    return res.status(200).json({success: true, measure: true});
  }
  // Why is a non tr069 device calling this function? Just a sanity check
  if (!device.use_tr069) {
    return res.status(500).json({
      success: false,
      message: 'Attempt to sync acs data with non-tr-069 device',
    });
  }
  // Devices updating need to return immediately
  // Devices with no last sync need to sync immediately
  // Devices recovering from hard reset need to sync immediately
  if (
    device.do_update || !device.last_tr069_sync || device.recovering_tr069_reset
  ) {
    return res.status(200).json({success: true, measure: true});
  }
  let config = await Config.findOne({is_default: true}).catch((err)=>{
    return res.status(500).json({success: false, message: 'Error in database'});
  });
  // Devices that havent synced in (config interval) need to sync immediately
  let syncDiff = Date.now() - device.last_tr069_sync;
  if (syncDiff >= config.tr069.sync_interval) {
    return res.status(200).json({success: true, measure: true});
  }
  // Simply update last_contact to keep device online, no need to sync
  device.last_contact = Date.now();
  await device.save();
  return res.status(200).json({success: true, measure: false});
};

// Complete CPE information synchronization gets done here. This function
// call is controlled by "informDevice" function when setting "measure" as
// true
acsDeviceInfoController.syncDevice = async function(req, res) {
  let data = req.body.data;
  if (!data || !data.common || !data.common.mac.value) {
    return res.status(500).json({
      success: false,
      message: 'Missing mac field',
    });
  }
  let config = await Config.findOne({is_default: true}, {tr069: true}).lean()
  .catch((err) => {
    return res.status(500).json({success: false,
                                 message: 'Error finding Config in database'});
  });
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
      message: 'Cannot find device permissions',
    });
  }

  if (!device) {
    if (await createRegistry(req, permissions)) {
      return res.status(200).json({success: true});
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to create device registry',
      });
    }
  }
  if (!device.use_tr069) {
    return res.status(500).json({
      success: false,
      message: 'Attempt to sync acs data with non-tr-069 device',
    });
  }
  let hasPPPoE = (data.wan.pppoe_user &&
                  typeof data.wan.pppoe_user.value === 'string' &&
                  data.wan.pppoe_user.value !== '');
  let subnetNumber = convertSubnetMaskToInt(data.lan.subnet_mask.value);
  let cpeIP = processHostFromURL(data.common.ip.value);
  let changes = {wan: {}, lan: {}, wifi2: {}, wifi5: {}, common: {}};
  let hasChanges = false;
  let splitID = req.body.acs_id.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  device.acs_id = req.body.acs_id;
  device.serial_tr069 = splitID[splitID.length - 1];

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

  if (data.common.model.value) device.model = data.common.model.value.trim();
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
    if (data.wan.uptime.value) device.wan_up_time = data.wan.uptime.value;
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
  if (data.wifi2.auto && data.wifi2.channel) {
    let channel2 =
      (data.wifi2.auto.value) ? 'auto' : data.wifi2.channel.value.toString();
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
    let band2 = convertWifiBand(data.wifi2.band.value, data.wifi2.mode.value);
    if (data.wifi2.band.value && !device.wifi_band) {
      device.wifi_band = band2;
    } else if (device.wifi_band !== band2) {
      changes.wifi2.band = device.wifi_band;
    }
  }
  if (!permissions.grantMeshV2HardcodedBssid && data.mesh2 &&
      data.mesh2.bssid
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
  if (data.wifi5.auto && data.wifi5.channel) {
    let channel5 =
      (data.wifi5.auto.value) ? 'auto' : data.wifi5.channel.value.toString();
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
    let band5 = convertWifiBand(data.wifi5.band.value, data.wifi5.mode.value);
    if (data.wifi5.band.value && !device.wifi_band_5ghz) {
      device.wifi_band_5ghz = band5;
    } else if (device.wifi_band_5ghz !== band5) {
      changes.wifi5.band = device.wifi_band_5ghz;
    }
  }
  if (!permissions.grantMeshV2HardcodedBssid && data.mesh5 &&
      data.mesh5.bssid
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
    device.wan_bytes = appendBytesMeasure(
      device.wan_bytes,
      data.wan.recv_bytes.value,
      data.wan.sent_bytes.value,
    );
  }
  let isPonRxValOk = false;
  let isPonTxValOk = false;
  if (data.wan.pon_rxpower && data.wan.pon_rxpower.value) {
    device.pon_rxpower = convertToDbm(data.common.model.value,
                                      data.wan.pon_rxpower.value);
    isPonRxValOk = true;
  } else if (data.wan.pon_rxpower_epon && data.wan.pon_rxpower_epon.value) {
    device.pon_rxpower = convertToDbm(data.common.model.value,
                                      data.wan.pon_rxpower_epon.value);
    isPonRxValOk = true;
  }
  if (data.wan.pon_txpower && data.wan.pon_txpower.value) {
    device.pon_txpower = convertToDbm(data.common.model.value,
                                      data.wan.pon_txpower.value);
    isPonTxValOk = true;
  } else if (data.wan.pon_txpower_epon && data.wan.pon_txpower_epon.value) {
    device.pon_txpower = convertToDbm(data.common.model.value,
                                      data.wan.pon_txpower_epon.value);
    isPonTxValOk = true;
  }
  if (isPonRxValOk && isPonTxValOk) {
    device.pon_signal_measure = appendPonSignal(
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
      if (model == 'GONUAC001' || model == 'xPON') {
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
          acsDeviceInfoController.changePortForwardRules(device, entriesDiff);
        } else {
          acsDeviceInfoController.checkPortForwardRules(device);
        }
      }
    }
    if (model == 'GONUAC001' || model == 'xPON' || model == 'IGD') {
      // Trigger xml config syncing for
      // web admin user and password
      device.web_admin_user = config.tr069.web_login;
      device.web_admin_password = config.tr069.web_password;
      targets.push('web-admin');
      configFileEditing(device, targets);
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
  }
  await device.save();
  return res.status(200).json({success: true});
};

acsDeviceInfoController.rebootDevice = function(device, res) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let task = {name: 'reboot'};
  TasksAPI.addTask(acsID, task, true, 10000, [], (result)=>{
    if (result.task.name !== 'reboot') return;
    if (!res) return; // Prevent crash in case res is not defined
    if (result.finished) res.status(200).json({success: true});
    else {
      res.status(200).json({
        success: false,
        message: 'Dispositivos não respondeu à requisição',
      });
    }
  });
};

// TODO: Move this function to external-genieacs?
const fetchLogFromGenie = function(success, mac, acsID) {
  if (!success) {
    // Return with log unavailable
    let data = 'Log não disponível!';
    let compressedLog = pako.gzip(data);
    sio.anlixSendLiveLogNotifications(mac, compressedLog);
    return;
  }
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let logField = DevicesAPI.getModelFields(splitID[0], model).fields.log;
  let query = {_id: acsID};
  let path = '/devices/?query='+JSON.stringify(query)+'&projection='+logField;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let data = '';
    resp.on('data', (chunk)=>data+=chunk);
    resp.on('end', async ()=>{
      if (data.length > 0) {
        data = JSON.parse(data)[0];
      }
      let success = false;
      if (!checkForNestedKey(data, logField+'._value')) {
        data = 'Log não disponível!';
      } else {
        success = true;
        data = getFromNestedKey(data, logField+'._value');
      }
      let compressedLog = pako.gzip(data);
      if (success) {
        let deviceEdit = await DeviceModel.findById(mac);
        deviceEdit.last_contact = Date.now();
        deviceEdit.lastboot_date = Date.now();
        deviceEdit.lastboot_log = Buffer.from(compressedLog);
        await deviceEdit.save();
      }
      sio.anlixSendLiveLogNotifications(mac, compressedLog);
    });
  });
  req.end();
};

acsDeviceInfoController.fetchDiagnosticsFromGenie = async function(req, res) {
  let acsID = req.body.acs_id;
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let serial = splitID[splitID.length-1];

  let device;
  try {
    device = await DeviceModel.findByMacOrSerial(serial);
    if (Array.isArray(device) && device.length > 0) {
      device = device[0];
    } else {
      return res.status(500).json({
        success: false,
        message: 'Dispositivo não encontrado',
      });
    }
  } catch (e) {
    return res.status(500).json({success: false,
      message: 'Erro ao encontrar dispositivo'});
  }
  if (!device || !device.use_tr069 || !device.acs_id) {
    return res.status(500).json({success: false,
      message: 'Erro ao encontrar dispositivo'});
  }

  // We don't need to wait the diagnostics to complete
  res.status(200).json({success: true});

  let mac = device._id;
  let success = false;
  let parameters = [];
  let diagNecessaryKeys = {
    ping: {
      diag_state: '',
      num_of_rep: '',
      failure_count: '',
      success_count: '',
      host: '',
      avg_resp_time: '',
      max_resp_time: '',
      min_resp_time: '',
    },
    speedtest: {
      diag_state: '',
      num_of_conn: '',
      download_url: '',
      bgn_time: '',
      end_time: '',
      test_bytes_rec: '',
      down_transports: '',
      full_load_bytes_rec: '',
      full_load_period: '',
    },
  };

  let fields = DevicesAPI.getModelFields(splitID[0], model).fields;

  for (let masterKey in diagNecessaryKeys) {
    if (
      diagNecessaryKeys.hasOwnProperty(masterKey) &&
      fields.diagnostics.hasOwnProperty(masterKey)
    ) {
      let keys = diagNecessaryKeys[masterKey];
      let genieFields = fields.diagnostics[masterKey];
      for (let key in keys) {
        if (genieFields.hasOwnProperty(key)) {
          parameters.push(genieFields[key]);
        }
      }
    }
  }

  // We need to update the parameter values after the diagnostics complete
  try {
    let task = {
      name: 'getParameterValues',
      parameterNames: parameters,
    };
    const result = await TasksAPI.addTask(acsID, task, true, 10000, []);
    if (
      !result || !result.finished || result.task.name !== 'getParameterValues'
    ) {
      console.log('Failed: genie diagnostics can\'t be updated');
    } else {
      success = true;
    }
  } catch (e) {
    console.log('Error:', e);
    console.log('Failed: genie diagnostics can\'t be updated');
  }
  if (!success) return;
  success = false;
  let query = {_id: acsID};
  let path = '/devices/?query='+JSON.stringify(query)+
              '&projection='+parameters.join(',');
  let options = {
    protocol: 'http:',
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let request = http.request(options, (response)=>{
    let chunks = [];
    response.on('error', (error) => console.log(error));
    response.on('data', async (chunk)=>chunks.push(chunk));
    response.on('end', async (chunk)=>{
      let body = Buffer.concat(chunks);
      try {
        let data = JSON.parse(body)[0];
        permissions = DeviceVersion.findByVersion(
          device.version,
          device.wifi_is_5ghz_capable,
          device.model,
        );
        if (permissions) {
          if (permissions.grantPingTest) {
            await acsDeviceInfoController.calculatePingDiagnostic(
              device, model, data, diagNecessaryKeys.ping, fields.diagnostics.ping,
            );
          }
          if (permissions.grantSpeedTest) {
            await acsDeviceInfoController.calculateSpeedDiagnostic(
              device, data, diagNecessaryKeys.speedtest,
              fields.diagnostics.speedtest,
            );
          }
        } else {
          console.log('Failed: genie can\'t check device permissions');
        }
      } catch (e) {
        console.log('Failed: genie response was not valid');
        console.log('Error:', e);
      }
    });
  });
  request.end();
};

acsDeviceInfoController.getAllNestedKeysFromObject = function(
  data, target, genieFields,
) {
  let result = {};
  Object.keys(target).forEach((key)=>{
    if (checkForNestedKey(data, genieFields[key]+'._value')) {
      result[key] = getFromNestedKey(data, genieFields[key]+'._value');
    }
  });
  return result;
};

acsDeviceInfoController.firePingDiagnose = async function(mac) {
  let device;
  try {
    device = await DeviceModel.findById(mac).lean();
  } catch (e) {
    console.log('Error:', e);
    return {success: false,
            message: 'Erro ao encontrar dispositivo'};
  }
  if (!device || !device.use_tr069 || !device.acs_id) {
    return {success: false,
            message: 'Erro ao encontrar dispositivo'};
  }
  let acsID = device.acs_id;
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let fields = DevicesAPI.getModelFields(splitID[0], model).fields;

  let diagnIPPingDiagnostics = fields.diagnostics.ping.root;
  let diagnStateField = fields.diagnostics.ping.diag_state;
  let diagnNumRepField = fields.diagnostics.ping.num_of_rep;
  let diagnURLField = fields.diagnostics.ping.host;
  let diagnTimeoutField = fields.diagnostics.ping.timeout;

  let numberOfRep = 10;
  let pingHostUrl = device.ping_hosts[0];
  let timeout = 1000;

  // We need to update the parameter values before we fire the ping test
  let success = false;
  try {
    let task = {
      name: 'getParameterValues',
      parameterNames: [diagnIPPingDiagnostics],
    };
    const result = await TasksAPI.addTask(acsID, task, true, 10000, []);
    if (
      !result || !result.finished || result.task.name !== 'getParameterValues'
    ) {
      console.log('Failed: genie diagnostic fields can\'t be updated');
    } else {
      success = true;
    }
  } catch (e) {
    console.log('Failed: genie diagnostic fields can\'t be updated');
    console.log('Error:', e);
  }
  if (!success) {
    return {success: false,
            message: 'Error: Could not fire TR-069 ping measure'};
  }

  let task = {
    name: 'setParameterValues',
    parameterValues: [[diagnStateField, 'Requested', 'xsd:string'],
                      [diagnNumRepField, numberOfRep, 'xsd:unsignedInt'],
                      [diagnURLField, pingHostUrl, 'xsd:string'],
                      [diagnTimeoutField, timeout, 'xsd:unsignedInt']],
  };
  try {
    const result = await TasksAPI.addTask(acsID, task, true, 10000, []);
    if (!result || !result.finished) {
      return {success: false,
              message: 'Error: Could not fire TR-069 ping measure'};
    } else {
      return {success: true,
              message: 'Success: TR-069 ping measure fired'};
    }
  } catch (err) {
      return {success: false,
              message: err.message+' in '+acsID};
  }
};

acsDeviceInfoController.calculatePingDiagnostic = function(device, model, data,
                                                           pingKeys,
                                                           pingFields) {
  pingKeys = acsDeviceInfoController.getAllNestedKeysFromObject(
    data, pingKeys, pingFields,
  );
  if (pingKeys.diag_state !== 'Requested' &&
             pingKeys.diag_state !== 'None') {
    let result = {};
    device.ping_hosts.forEach((host) => {
      if (host) {
        result[host] = {
          lat: '---',
          loss: '--- ',
        };
      }
    });
    if (pingKeys.diag_state === 'Complete') {
      result[pingKeys.host] = {
        lat: pingKeys.avg_resp_time.toString(),
        loss: parseInt(pingKeys.failure_count * 100 /
               (pingKeys.success_count + pingKeys.failure_count)).toString(),
      };
      if (model === 'HG8245Q2' || model === 'EG8145V5') {
        if (pingKeys.success_count === 1) result[pingKeys.host]['loss'] = '0';
        else result[pingKeys.host]['loss'] = '100';
      }
    }
    deviceHandlers.sendPingToTraps(device._id, {results: result});
  }
};

acsDeviceInfoController.getSpeedtestFile = async function(device) {
  let matchedConfig = await Config.findOne({is_default: true}).catch(
    function(err) {
      console.error('Error creating entry: ' + err);
      return '';
    },
  );
  if (!matchedConfig) {
    console.error('Error creating entry. Config does not exists.');
    return '';
  }
  let stage = device.current_speedtest.stage;
  let band = device.current_speedtest.band_estimative;
  let url = 'http://' + matchedConfig.measureServerIP + ':' +
                  matchedConfig.measureServerPort + '/measure/tr069/';
  if (stage) {
    if (stage == 'estimative') {
      return url + 'file_512KB.bin';
    }
    if (stage == 'measure') {
      if (band >= 700) {
        return url + 'file_640000KB.bin';
      } else if (band >= 500) {
        return url + 'file_448000KB.bin';
      } else if (band >= 300) {
        return url + 'file_320000KB.bin';
      } else if (band >= 100) {
        return url + 'file_192000KB.bin';
      } else if (band >= 50) {
        return url + 'file_64000KB.bin';
      } else if (band >= 30) {
        return url + 'file_32000KB.bin';
      } else if (band >= 10) {
        return url + 'file_19200KB.bin';
      } else if (band >= 5) {
        return url + 'file_6400KB.bin';
      } else if (band >= 3) {
        return url + 'file_1920KB.bin';
      } else if (band < 3) {
        return url + 'file_512KB.bin';
      }
    }
  }
  return '';
};

acsDeviceInfoController.fireSpeedDiagnose = async function(mac) {
  let device;
  try {
    device = await DeviceModel.findById(mac).lean();
  } catch (e) {
    console.log('Error:', e);
    return {success: false,
            message: 'Erro ao encontrar dispositivo'};
  }
  if (!device || !device.use_tr069 || !device.acs_id) {
    return {success: false,
            message: 'Erro ao encontrar dispositivo'};
  }
  let acsID = device.acs_id;
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let fields = DevicesAPI.getModelFields(splitID[0], model).fields;

  let diagnSpeedtestDiagnostics = fields.diagnostics.speedtest.root;
  let diagnStateField = fields.diagnostics.speedtest.diag_state;
  let diagnNumConnField = fields.diagnostics.speedtest.num_of_conn;
  let diagnURLField = fields.diagnostics.speedtest.download_url;

  let numberOfCon = 3;
  let speedtestHostUrl = await acsDeviceInfoController.getSpeedtestFile(device);

  if (!speedtestHostUrl || speedtestHostUrl === '') {
    return {success: false,
            message: 'Error: Could not get speedtest measure file'};
  }

  // We need to update the parameter values before we fire the ping test
  let success = false;
  try {
    let task = {
      name: 'getParameterValues',
      parameterNames: [diagnSpeedtestDiagnostics],
    };
    const result = await TasksAPI.addTask(acsID, task, true, 10000, []);
    if (
      !result || !result.finished || result.task.name !== 'getParameterValues'
    ) {
      console.log('Failed: genie diagnostic fields can\'t be updated');
    } else {
      success = true;
    }
  } catch (e) {
    console.log('Failed: genie diagnostic fields can\'t be updated');
    console.log('Error:', e);
  }
  if (!success) {
    return {success: false,
            message: 'Error: Could not fire TR-069 speedtest'};
  }

  let task = {
    name: 'setParameterValues',
    parameterValues: [[diagnStateField, 'Requested', 'xsd:string'],
                      [diagnNumConnField, numberOfCon, 'xsd:unsignedInt'],
                      [diagnURLField, speedtestHostUrl, 'xsd:string']],
  };
  try {
    const result = await TasksAPI.addTask(acsID, task, true, 10000, []);
    if (!result || !result.finished) {
      return {success: false,
              message: 'Error: Could not fire TR-069 speedtest'};
    } else {
      console.log('Success: TR-069 speedtest fired');
      return {success: true,
              message: 'Success: TR-069 speedtest fired'};
    }
  } catch (err) {
      return {success: false,
              message: err.message+' in '+acsID};
  }
};

acsDeviceInfoController.calculateSpeedDiagnostic = async function(device, data,
                                                                  speedKeys,
                                                                  speedFields) {
  speedKeys = acsDeviceInfoController.getAllNestedKeysFromObject(
    data, speedKeys, speedFields,
  );
  let result;
  let speedValueBasic;
  let speedValueFullLoad;
  let rqstTime;
  let lastTime = (new Date(1970, 0, 1)).valueOf();

  if ('current_speedtest' in device &&
      'timestamp' in device.current_speedtest) {
    rqstTime = device.current_speedtest.timestamp.valueOf();
  }

  if (!device.current_speedtest.timestamp || (rqstTime > lastTime)) {
    if (speedKeys.diag_state == 'Completed') {
      if (device.speedtest_results.length > 0) {
        lastTime = utilHandlers.parseDate(
          device.speedtest_results[device.speedtest_results.length-1].timestamp,
        );
      }

      let beginTime = (new Date(speedKeys.bgn_time)).valueOf();
      let endTime = (new Date(speedKeys.end_time)).valueOf();
      // 10**3 => seconds to miliseconds (because of valueOf() notation)
      let deltaTime = (endTime - beginTime) / (10**3);

      // 8 => byte to bit
      // 1024**2 => bit to megabit
      speedValueBasic = (8/(1024**2))*(speedKeys.test_bytes_rec/deltaTime);

      if (speedKeys.full_load_bytes_rec && speedKeys.full_load_period) {
        // 10**6 => microsecond to second
        // 8 => byte to bit
        // 1024**2 => bit to megabit
        speedValueFullLoad = ((8*(10**6))/(1024**2)) *
                    (speedKeys.full_load_bytes_rec/speedKeys.full_load_period);
      }

      // Speedtest's estimative / real measure step
      if (device.current_speedtest.stage == 'estimative') {
        device.current_speedtest.band_estimative = speedValueBasic;
        device.current_speedtest.stage = 'measure';
        await device.save();
        await sio.anlixSendSpeedTestNotifications(device._id, {
          stage: 'estimative_finished',
          user: device.current_speedtest.user,
        });
        acsDeviceInfoController.fireSpeedDiagnose(device._id);
        return;
      } else if (device.current_speedtest.stage == 'measure') {
        result = {
          downSpeed: '',
          user: device.current_speedtest.user,
        };
        if (speedKeys.full_load_bytes_rec && speedKeys.full_load_period) {
          result.downSpeed = parseInt(speedValueFullLoad).toString() + ' Mbps';
        } else {
          result.downSpeed = parseInt(speedValueBasic).toString() + ' Mbps';
        }
        deviceHandlers.storeSpeedtestResult(device, result);
        return;
      }
    } else {
      // Error treatment (switch-case for future error handling)
      switch (speedKeys.diag_state) {
        case ('Error_InitConnectionFailed' ||
              'Error_NoResponse' ||
              'Error_Other'):
        console.log('Failure at TR-069 speedtest:', speedKeys.diag_state);
        result = {
          downSpeed: '503 Server',
          user: device.current_speedtest.user,
        };
        break;
        default:
        result = {
          user: device.current_speedtest.user,
        };
        break;
      }
      deviceHandlers.storeSpeedtestResult(device, result);
      return;
    }
  }
};

// TODO: Move this function to external-genieacs?
const fetchWanBytesFromGenie = function(mac, acsID) {
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let fields = DevicesAPI.getModelFields(splitID[0], model).fields;
  let recvField = fields.wan.recv_bytes;
  let sentField = fields.wan.sent_bytes;
  let query = {_id: acsID};
  let projection = recvField + ',' + sentField;
  let path = '/devices/?query='+JSON.stringify(query)+'&projection='+projection;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let data = '';
    let wanBytes = {};
    resp.on('data', (chunk)=>data+=chunk);
    resp.on('end', async ()=>{
      if (data.length > 0) {
        data = JSON.parse(data)[0];
      }
      let success = false;
      if (checkForNestedKey(data, recvField+'._value') &&
          checkForNestedKey(data, sentField+'._value')) {
        success = true;
        wanBytes = {
          recv: getFromNestedKey(data, recvField+'._value'),
          sent: getFromNestedKey(data, sentField+'._value'),
        };
      }
      if (success) {
        let deviceEdit = await DeviceModel.findById(mac);
        deviceEdit.last_contact = Date.now();
        wanBytes = appendBytesMeasure(
          deviceEdit.wan_bytes,
          wanBytes.recv,
          wanBytes.sent,
        );
        deviceEdit.wan_bytes = wanBytes;
        await deviceEdit.save();
      }
      sio.anlixSendWanBytesNotification(mac, {wanbytes: wanBytes});
    });
  });
  req.end();
};

const fetchUpStatusFromGenie = function(mac, acsID) {
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let fields = DevicesAPI.getModelFields(splitID[0], model).fields;
  let upTimeField = fields.wan.uptime.replace('*', 1);
  let upTimePPPField1 = fields.wan.uptime_ppp.replace('*', 1).replace('*', 1);
  let upTimePPPField2 = fields.wan.uptime_ppp.replace('*', 1).replace('*', 2);
  let PPPoEUser1 = fields.wan.pppoe_user.replace('*', 1).replace('*', 1);
  let PPPoEUser2 = fields.wan.pppoe_user.replace('*', 1).replace('*', 2);
  let query = {_id: acsID};
  let projection = fields.common.uptime +
      ',' + upTimeField +
      ',' + upTimePPPField1 +
      ',' + upTimePPPField2 +
      ',' + PPPoEUser1 +
      ',' + PPPoEUser2;
  let path = '/devices/?query='+JSON.stringify(query)+'&projection='+projection;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let data = '';
    let sysUpTime = 0;
    let wanUpTime = 0;
    resp.on('data', (chunk)=>data+=chunk);
    resp.on('end', async ()=>{
      if (data.length > 0) {
        data = JSON.parse(data)[0];
      }
      let successSys = false;
      let successWan = false;
      if (checkForNestedKey(data, fields.common.uptime+'._value')) {
        successSys = true;
        sysUpTime = getFromNestedKey(data, fields.common.uptime+'._value');
      }
      if (checkForNestedKey(data, PPPoEUser1+'._value')) {
        successWan = true;
        let hasPPPoE = getFromNestedKey(data, PPPoEUser1+'._value');
        if (hasPPPoE && checkForNestedKey(data, upTimePPPField1+'._value')) {
          wanUpTime = getFromNestedKey(data, upTimePPPField1+'._value');
        }
      } else if (checkForNestedKey(data, PPPoEUser2+'._value')) {
        successWan = true;
        let hasPPPoE = getFromNestedKey(data, PPPoEUser2+'._value');
        if (hasPPPoE && checkForNestedKey(data, upTimePPPField2+'._value')) {
          wanUpTime = getFromNestedKey(data, upTimePPPField2+'._value');
        }
      } else {
          successWan = true;
          if (checkForNestedKey(data, upTimeField+'._value')) {
            wanUpTime = getFromNestedKey(data, upTimeField+'._value');
          }
      }
      if (successSys || successWan) {
        let deviceEdit = await DeviceModel.findById(mac);
        deviceEdit.last_contact = Date.now();
        deviceEdit.sys_up_time = sysUpTime;
        deviceEdit.wan_up_time = wanUpTime;
        await deviceEdit.save();
      }
      sio.anlixSendUpStatusNotification(mac, {
        sysuptime: sysUpTime,
        wanuptime: wanUpTime,
      });
    });
  });
  req.end();
};

const checkMeshObjsCreated = function(acsID) {
  return new Promise((resolve, reject) => {
    let splitID = acsID.split('-');
    let model = splitID.slice(1, splitID.length-1).join('-');
    let fields = DevicesAPI.getModelFields(splitID[0], model).fields;
    let query = {_id: acsID};
    let projection = `${fields.mesh2.ssid}, ${fields.mesh5.ssid}`;
    let path =
      `/devices/?query=${JSON.stringify(query)}&projection=${projection}`;
    let options = {
      method: 'GET',
      hostname: 'localhost',
      port: 7557,
      path: encodeURI(path),
    };
    let result = {
      mesh2: false,
      mesh5: false,
      success: true,
    };
    let req = http.request(options, (resp)=>{
      resp.setEncoding('utf8');
      let data = '';
      resp.on('data', (chunk)=>data+=chunk);
      resp.on('end', async ()=>{
        try {
          data = JSON.parse(data)[0];
        } catch (e) {
          result.success = false;
          resolve(result);
        }
        if (checkForNestedKey(data, `${fields.mesh2.ssid}._value`)) {
          result.mesh2 = true;
        }
        if (checkForNestedKey(data, `${fields.mesh5.ssid}._value`)) {
          result.mesh5 = true;
        }
        resolve(result);
      });
    });
    req.end();
  });
};

// TODO: Move this function to external-genieacs?
acsDeviceInfoController.fetchPonSignalFromGenie = function(mac, acsID) {
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let fields = DevicesAPI.getModelFields(splitID[0], model).fields;
  let rxPowerField = fields.wan.pon_rxpower;
  let txPowerField = fields.wan.pon_txpower;
  let rxPowerFieldEpon = '';
  let txPowerFieldEpon = '';
  let projection = rxPowerField + ',' + txPowerField;

  if (fields.wan.pon_rxpower_epon && fields.wan.pon_txpower_epon) {
    rxPowerFieldEpon = fields.wan.pon_rxpower_epon;
    txPowerFieldEpon = fields.wan.pon_txpower_epon;
    projection += ',' + rxPowerFieldEpon + ',' + txPowerFieldEpon;
  }

  let query = {_id: acsID};
  let path = '/devices/?query='+JSON.stringify(query)+'&projection='+projection;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let data = '';
    let ponSignal = {};
    resp.on('data', (chunk)=>data+=chunk);
    resp.on('end', async ()=>{
      if (data.length > 0) {
        data = JSON.parse(data)[0];
      }
      let success = false;
      if (checkForNestedKey(data, rxPowerField + '._value') &&
          checkForNestedKey(data, txPowerField + '._value')) {
        success = true;
        ponSignal = {
          rxpower: getFromNestedKey(data, rxPowerField + '._value'),
          txpower: getFromNestedKey(data, txPowerField + '._value'),
        };
      } else if (checkForNestedKey(data, rxPowerFieldEpon + '._value') &&
                 checkForNestedKey(data, txPowerFieldEpon + '._value')) {
        success = true;
        ponSignal = {
          rxpower: getFromNestedKey(data, rxPowerFieldEpon + '._value'),
          txpower: getFromNestedKey(data, txPowerFieldEpon + '._value'),
        };
      }
      if (success) {
        let deviceEdit = await DeviceModel.findById(mac);
        deviceEdit.last_contact = Date.now();
        if (ponSignal.rxpower) {
          ponSignal.rxpower = convertToDbm(deviceEdit.model, ponSignal.rxpower);
        }
        if (ponSignal.txpower) {
          ponSignal.txpower = convertToDbm(deviceEdit.model, ponSignal.txpower);
        }
        ponSignal = appendPonSignal(
          deviceEdit.pon_signal_measure,
          ponSignal.rxpower,
          ponSignal.txpower,
        );
        deviceEdit.pon_signal_measure = ponSignal;
        await deviceEdit.save();
      }
      sio.anlixSendPonSignalNotification(mac, {ponsignalmeasure: ponSignal});
      return ponSignal;
    });
  });
  req.end();
};

// TODO: Move this function to external-genieacs?
const fetchDevicesFromGenie = function(mac, acsID) {
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let fields = DevicesAPI.getModelFields(splitID[0], model).fields;
  let hostsField = fields.devices.hosts;
  let assocField = fields.devices.associated;
  assocField = assocField.split('.').slice(0, -2).join('.');
  let query = {_id: acsID};
  let projection = hostsField + ',' + assocField;
  let path = '/devices/?query='+JSON.stringify(query)+'&projection='+projection;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let data = '';
    resp.on('data', (chunk)=>data+=chunk);
    resp.on('end', async ()=>{
      if (data.length > 0) {
        data = JSON.parse(data)[0];
      }
      let success = true;
      let hostKeys = [];
      let hostCountField = hostsField+'.HostNumberOfEntries._value';
      // Make sure we have a host count and assodicated devices fields
      if (checkForNestedKey(data, hostCountField) &&
          checkForNestedKey(data, assocField)) {
        getFromNestedKey(data, hostCountField);
        // Host indexes might not respect order because of expired leases, so
        // we just use whatever keys show up
        let hostBaseField = fields.devices.hosts_template;
        let hostKeysRaw = getFromNestedKey(data, hostBaseField);
        if (hostKeysRaw) {
          hostKeys = Object.keys(hostKeysRaw);
        }
        // Filter out meta fields from genieacs
        hostKeys = hostKeys.filter((k)=>k[0] && k[0]!=='_');
      } else {
        success = false;
      }
      if (success) {
        let iface2 = fields.wifi2.ssid.replace('.SSID', '');
        let iface5 = fields.wifi5.ssid.replace('.SSID', '');
        let devices = [];
        hostKeys.forEach((i)=>{
          let device = {};
          // Collect device mac
          let macKey = fields.devices.host_mac.replace('*', i);
          device.mac = getFromNestedKey(data, macKey+'._value');
          if (typeof device.mac === 'string') {
            device.mac = device.mac.toUpperCase();
          } else {
            // MAC is a mandatory string
            return;
          }
          // Collect device hostname
          let nameKey = fields.devices.host_name.replace('*', i);
          device.name = getFromNestedKey(data, nameKey+'._value');
          if (typeof device.name !== 'string' || device.name === '') {
            // Needs a default name, use mac
            device.name = device.mac;
          }
          // Collect device ip
          let ipKey = fields.devices.host_ip.replace('*', i);
          device.ip = getFromNestedKey(data, ipKey+'._value');
          if (typeof device.ip !== 'string') {
            // IP is mandatory
            return;
          }
          // Collect layer 2 interface
          let ifaceKey = fields.devices.host_layer2.replace('*', i);
          let l2iface = getFromNestedKey(data, ifaceKey+'._value');
          if (l2iface === iface2) {
            device.wifi = true;
            device.wifi_freq = 2.4;
          } else if (l2iface === iface5) {
            device.wifi = true;
            device.wifi_freq = 5;
          }
          // Push basic device information
          devices.push(device);
        });

        if (fields.devices.host_rssi || fields.devices.host_snr) {
          // Change iface identifiers to use only numerical identifier
          iface2 = iface2.split('.');
          iface5 = iface5.split('.');
          iface2 = iface2[iface2.length-1];
          iface5 = iface5[iface5.length-1];
          // Filter wlan interfaces
          let interfaces = Object.keys(getFromNestedKey(data, assocField));
          interfaces = interfaces.filter((i)=>i[0]!='_');
          if (fields.devices.associated_5) {
            interfaces.push('5');
          }
          interfaces.forEach((iface)=>{
            // Get active indexes, filter metadata fields
            assocField = fields.devices.associated.replace('*', iface);
            let assocIndexes = getFromNestedKey(data, assocField);
            if (assocIndexes) {
              assocIndexes = Object.keys(assocIndexes);
            } else {
              assocIndexes = [];
            }
            assocIndexes = assocIndexes.filter((i)=>i[0]!='_');
            assocIndexes.forEach((index)=>{
              // Collect associated mac
              let macKey = fields.devices.assoc_mac;
              macKey = macKey.replace('*', iface).replace('*', index);
              let macVal = getFromNestedKey(data, macKey+'._value');
              if (typeof macVal === 'string') {
                macVal = macVal.toUpperCase();
              } else {
                // MAC is mandatory
                return;
              }
              let device = devices.find((d)=>d.mac.toUpperCase()===macVal);
              if (!device) return;
              // Mark device as a wifi device
              device.wifi = true;
              if (iface == iface2) {
                device.wifi_freq = 2.4;
              } else if (iface == iface5) {
                device.wifi_freq = 5;
              }
              // Collect rssi, if available
              if (fields.devices.host_rssi) {
                let rssiKey = fields.devices.host_rssi;
                rssiKey = rssiKey.replace('*', iface).replace('*', index);
                device.rssi = getFromNestedKey(data, rssiKey+'._value');
              }
              // Collect snr, if available
              if (fields.devices.host_snr) {
                let snrKey = fields.devices.host_snr;
                snrKey = snrKey.replace('*', iface).replace('*', index);
                device.snr = getFromNestedKey(data, snrKey+'._value');
              }
              // Collect connection speed, if available
              if (fields.devices.host_rate) {
                let rateKey = fields.devices.host_rate;
                rateKey = rateKey.replace('*', iface).replace('*', index);
                device.rate = getFromNestedKey(data, rateKey+'._value');
                device.rate = convertWifiRate(model, device.rate);
              }
            });
          });
        }
        await saveDeviceData(mac, devices);
      }
      sio.anlixSendOnlineDevNotifications(mac, null);
    });
  });
  req.end();
};

acsDeviceInfoController.requestLogs = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let mac = device._id;
  let acsID = device.acs_id;
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let logField = DevicesAPI.getModelFields(splitID[0], model).fields.log;
  let task = {
    name: 'getParameterValues',
    parameterNames: [logField],
  };
  TasksAPI.addTask(acsID, task, true, 10000, [], (result)=>{
    if (result.task.name !== 'getParameterValues') return;
    fetchLogFromGenie(result.finished, mac, acsID);
  });
};

acsDeviceInfoController.requestWanBytes = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let mac = device._id;
  let acsID = device.acs_id;
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let fields = DevicesAPI.getModelFields(splitID[0], model).fields;
  let recvField = fields.wan.recv_bytes;
  let sentField = fields.wan.sent_bytes;
  let task = {
    name: 'getParameterValues',
    parameterNames: [
      recvField,
      sentField,
    ],
  };
  TasksAPI.addTask(acsID, task, true, 10000, [], (result)=>{
    if (result.task.name !== 'getParameterValues') return;
    if (result.finished) fetchWanBytesFromGenie(mac, acsID);
  });
};

acsDeviceInfoController.requestUpStatus = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let mac = device._id;
  let acsID = device.acs_id;
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let fields = DevicesAPI.getModelFields(splitID[0], model).fields;
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
  TasksAPI.addTask(acsID, task, true, 10000, [15000, 30000], (result)=>{
    if (result.task.name !== 'getParameterValues') return;
    if (result.finished) fetchUpStatusFromGenie(mac, acsID);
  });
};

acsDeviceInfoController.requestConnectedDevices = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let mac = device._id;
  let acsID = device.acs_id;
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let fields = DevicesAPI.getModelFields(splitID[0], model).fields;
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
  TasksAPI.addTask(acsID, task, true, 10000, [5000, 10000], (result)=>{
    if (result.task.name !== 'getParameterValues') return;
    if (result.finished) fetchDevicesFromGenie(mac, acsID);
  });
};

const getSsidPrefixCheck = async function(device) {
  let config;
  try {
    config = await Config.findOne({is_default: true}).lean();
    if (!config) throw new Error('Config not found');
  } catch (error) {
    console.log(error);
  }
  // -> 'updating registry' scenario
  return deviceHandlers.checkSsidPrefix(
    config, device.wifi_ssid, device.wifi_ssid_5ghz,
    device.isSsidPrefixEnabled);
};

acsDeviceInfoController.coordVAPObjects = async function(acsID) {
  let populateVAPObjects = false;
  let returnObj = {
    code: 200,
    msg: 'Success',
    populate: populateVAPObjects,
  };
  const splitID = acsID.split('-');
  const model = splitID.slice(1, splitID.length-1).join('-');
  // We have to check if the virtual AP object has been created already
  const meshField = DevicesAPI.getModelFields(splitID[0], model)
    .fields.mesh2.ssid.replace('.SSID', '');
  const meshField5 = DevicesAPI.getModelFields(splitID[0], model)
    .fields.mesh5.ssid.replace('.SSID', '');
  const getObjTask = {
    name: 'getParameterValues',
    parameterNames: [
      meshField,
      meshField5,
    ],
  };
  let meshObjsStatus;
  try {
    let ret = await TasksAPI.addTask(acsID, getObjTask, true, 10000, []);
    if (!ret || !ret.finished ||
      ret.task.name !== 'getParameterValues') {
      throw new Error('task error');
    }
    if (ret.finished) {
      meshObjsStatus = await checkMeshObjsCreated(acsID);
      if (!meshObjsStatus.success) {
        throw new Error('invalid data');
      }
    }
  } catch (e) {
    const msg = `[!] -> ${e.message} in ${acsID}`;
    console.log(msg);
    returnObj.code = 500;
    returnObj.msg = msg;
    returnObj.populate = populateVAPObjects;
    return returnObj;
  }
  let deleteMesh5VAP = false;
  let createMesh2VAP = false;
  let createMesh5VAP = false;
  /*
    If the 2.4GHz virtual AP object hasn't been created
    we must create it. Since the objects are created in order we
    must delete the 5GHz virtual AP object if it exists and then
    recreate it.
  */
  if (!meshObjsStatus.mesh2) {
    populateVAPObjects = true;
    createMesh2VAP = true;
    createMesh5VAP = true;
    if (meshObjsStatus.mesh5) {
      deleteMesh5VAP = true;
    }
  } else {
    /*
      2.4GHz virtual AP object is created. Here we treat only the
      5GHz case.
    */
    if (!meshObjsStatus.mesh5) {
      populateVAPObjects = true;
      createMesh5VAP = true;
    }
  }
  /*
    We never delete the 2.4GHz VAP object,
    only the 5GHz one in specific cases
  */
  if (deleteMesh5VAP) {
    let delObjTask = {
      name: 'deleteObject',
      objectName: meshField5,
    };
    try {
      let ret = await TasksAPI.addTask(acsID, delObjTask, true,
        10000, [5000, 10000]);
      if (!ret || !ret.finished||
        ret.task.name !== 'deleteObject') {
        throw new Error('delObject task error');
      }
    } catch (e) {
      const msg = `[!] -> ${e.message} in ${acsID}`;
      console.log(msg);
      returnObj.code = 500;
      returnObj.msg = msg;
      returnObj.populate = populateVAPObjects;
      return returnObj;
    }
  }
  /*
    Virtual APs objects haven't been created yet.
    We must do that
  */
  if (createMesh2VAP || createMesh5VAP) {
    let addObjTask = {
      name: 'addObject',
      // Removes index of the WLANConfiguration field name.
      // Will work only if 2.4GHz VAP WLANConfiguration index is lower than 10
      objectName: meshField.slice(0, -2),
    };
    /*
      Regardless of which mesh mode is being set we create both
      virtual AP objects. If 2.4GHz virtual AP object is already OK
      then we only create the 5GHz virtual AP object.
    */
    let numObjsToCreate;
    createMesh2VAP ? numObjsToCreate = 2 : numObjsToCreate = 1;

    for (let i = 0; i < numObjsToCreate; i++) {
      try {
        let ret = await TasksAPI.addTask(acsID, addObjTask, true,
          10000, [5000, 10000]);
        if (!ret || !ret.finished||
          ret.task.name !== 'addObject') {
          throw new Error('task error');
        }
      } catch (e) {
        const msg = `[!] -> ${e.message} in ${acsID}`;
        console.log(msg);
        returnObj.code = 500;
        returnObj.msg = msg;
        returnObj.populate = populateVAPObjects;
        return returnObj;
      }

      // A getParameterValues call forces the whole object to be created
      try {
        let ret = await TasksAPI.addTask(
          acsID, getObjTask, true, 10000, []);
        if (!ret || !ret.finished||
          ret.task.name !== 'getParameterValues') {
          throw new Error('task error');
        }
      } catch (e) {
        const msg = `[!] -> ${e.message} in ${acsID}`;
        console.log(msg);
        returnObj.code = 500;
        returnObj.msg = msg;
        returnObj.populate = populateVAPObjects;
        return returnObj;
      }
    }
  }
  // Success
  returnObj.populate = populateVAPObjects;
  return returnObj;
};

acsDeviceInfoController.updateInfo = async function(device, changes) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  // let mac = device._id;
  let acsID = device.acs_id;
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let fields = DevicesAPI.getModelFields(splitID[0], model).fields;
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
        task.parameterValues.push([
          fields[masterKey]['auto'], auto, 'xsd:boolean',
        ]);
        if (!auto) {
          task.parameterValues.push([
            fields[masterKey][key], parseInt(channel), 'xsd:unsignedInt',
          ]);
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
        /* In IGD aka FW323DAC, need reboot when change
         2.4GHz wifi settings */
        if (masterKey === 'wifi2' && model === 'IGD') {
          rebootAfterUpdate = true;
        }
      }
      if (key === 'web_admin_password') {
        // Validate if matches 8 char minimum, 16 char maximum, has upper case,
        // at least one number, lower case and special char
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
        masterKey, key, splitID[0], splitID[1], changes[masterKey][key],
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
  TasksAPI.addTask(acsID, task, true, 10000, [5000, 10000], (result)=>{
    // TODO: Do something with task complete?
    if (result.task.name !== 'setParameterValues') return;
    if (result.finished && rebootAfterUpdate) {
      acsDeviceInfoController.rebootDevice(device);
    }
  });
};

acsDeviceInfoController.changePortForwardRules = async function(device,
                                                                rulesDiffLength,
) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let i;
  let ret;
  // let mac = device._id;
  let acsID = device.acs_id;
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  // redirect to config file binding instead of setParametervalues
  if (model == 'GONUAC001' || model == 'xPON') {
    configFileEditing(device, ['port-forward']);
    return;
  }
  let fields = DevicesAPI.getModelFields(splitID[0], model).fields;
  let changeEntriesSizeTask = {name: 'addObject', objectName: ''};
  let updateTasks = {name: 'setParameterValues', parameterValues: []};
  let portMappingTemplate = '';
  if (device.connection_type === 'pppoe') {
    portMappingTemplate = fields.port_mapping_ppp;
  } else {
    portMappingTemplate = fields.port_mapping_dhcp;
  }
  // check if already exists add, delete, set sent tasks
  // getting older tasks for this device id.
  let query = {device: acsID}; // selecting all tasks for a given device id.
  let tasks;
  try {
    tasks = await TasksAPI.getFromCollection('tasks', query);
  } catch (e) {
    console.log('[!] -> '+e.message+' in '+acsID);
  }
  if (!Array.isArray(tasks)) return;
  // if find some task with name addObject or deleteObject
  let hasAlreadySentTasks = tasks.some((t) => {
    return t.name === 'addObject' ||
    t.name === 'deleteObject';
  });
  // drop this call of changePortForwardRules
  if (hasAlreadySentTasks) {
    console.log('[#] -> DC in '+acsID);
    return;
  }
  // change array size via addObject or deleteObject
  if (rulesDiffLength < 0) {
    rulesDiffLength = -rulesDiffLength;
    changeEntriesSizeTask.name = 'deleteObject';
    for (i = (device.port_mapping.length + rulesDiffLength);
        i > device.port_mapping.length;
        i--) {
      changeEntriesSizeTask.objectName = portMappingTemplate + '.' + i;
      try {
        ret = await TasksAPI.addTask(acsID, changeEntriesSizeTask, true,
          10000, [5000, 10000]);
        if (!ret || !ret.finished) {
          return;
        }
      } catch (e) {
        console.log('[!] -> '+e.message+' in '+acsID);
      }
    }
    console.log('[#] -> D('+rulesDiffLength+') in '+acsID);
  } else if (rulesDiffLength > 0) {
    changeEntriesSizeTask.objectName = portMappingTemplate;
    for (i = 0; i < rulesDiffLength; i++) {
      try {
        ret = await TasksAPI.addTask(acsID, changeEntriesSizeTask, true,
          10000, [5000, 10000]);
        if (!ret || !ret.finished) {
          return;
        }
      } catch (e) {
        console.log('[!] -> '+e.message+' in '+acsID);
      }
    }
    console.log('[#] -> A('+rulesDiffLength+') in '+acsID);
  }
  // set entries values for respective array in the device
  for (i = 0; i < device.port_mapping.length; i++) {
    const iterateTemplate = portMappingTemplate + '.' + (i+1) + '.';
    Object.entries(fields.port_mapping_fields).forEach((v) => {
      updateTasks.parameterValues.push([
        iterateTemplate+v[1][0],
        device.port_mapping[i][v[1][1]], v[1][2]]);
    });
    Object.entries(fields.port_mapping_values).forEach((v) => {
      updateTasks.parameterValues.push([
        iterateTemplate+v[1][0], v[1][1], v[1][2]]);
    });
  }
  // just send tasks if there are port mappings to fill/set
  if (updateTasks.parameterValues.length > 0) {
    console.log('[#] -> U in '+acsID);
    TasksAPI.addTask(acsID, updateTasks,
        true, 10000, [5000, 10000]).catch((e) => {
          console.error('[!] -> '+e.message+' in '+acsID);
        });
  }
};

const configFileEditing = async function(device, target) {
  let acsID = device.acs_id;
  let serial = device.serial_tr069;
  // get xml config file to genieacs
  let configField = 'InternetGatewayDevice.DeviceConfig.ConfigFile';
  let task = {
    name: 'getParameterValues',
    parameterNames: [configField],
  };
  let result = await TasksAPI.addTask(acsID, task, true, 10000, []);
  if (!result || !result.finished ||
      result.task.name !== 'getParameterValues') {
    console.log('Error: failed to retrieve ConfigFile at '+serial);
    return;
  }
  // get xml config file from genieacs
  let query = {_id: acsID};
  let path = '/devices/?query='+JSON.stringify(query)+
    '&projection='+configField;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let rawConfigFile = '';
    resp.on('data', (chunk)=>rawConfigFile+=chunk);
    resp.on('end', async ()=>{
      if (rawConfigFile.length > 0) {
        rawConfigFile = JSON.parse(rawConfigFile)[0];
      }
      if (checkForNestedKey(rawConfigFile, configField+'._value')) {
        // modify xml config file
        rawConfigFile = getFromNestedKey(rawConfigFile, configField+'._value');
        let xmlConfigFile = acsHandlers
          .digestXmlConfig(device, rawConfigFile, target);
        if (xmlConfigFile != '') {
          // set xml config file to genieacs
          task = {
            name: 'setParameterValues',
            parameterValues: [[configField, xmlConfigFile, 'xsd:string']],
          };
          result = await TasksAPI.addTask(acsID, task, true, 10000, []);
          if (!result || !result.finished ||
              result.task.name !== 'setParameterValues') {
            console.log('Error: failed to write ConfigFile at '+serial);
            return;
          }
        } else {
          console.log('Error: failed xml validation at '+serial);
        }
      } else {
        console.log('Error: no config file retrieved at '+serial);
      }
    });
  });
  req.end();
};

acsDeviceInfoController.checkPortForwardRules = async function(device) {
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let splitID = acsID.split('-');
  let model = splitID.slice(1, splitID.length-1).join('-');
  let fields = DevicesAPI.getModelFields(splitID[0], model).fields;
  let task = {
    name: 'getParameterValues',
    parameterNames: [],
  };
  let portMappingTemplate = '';
  if (device.connection_type === 'pppoe') {
    portMappingTemplate = fields.port_mapping_ppp;
  } else {
    portMappingTemplate = fields.port_mapping_dhcp;
  }
  task.parameterNames.push(portMappingTemplate);
  let result = await TasksAPI.addTask(acsID, task, true, 10000, []);
  if (result && result.finished == true &&
      result.task.name === 'getParameterValues') {
    let query = {_id: acsID};
    let projection1 = portMappingTemplate
    .replace('*', '1').replace('*', '1');
    let projection2 = portMappingTemplate
    .replace('*', '1').replace('*', '2');
    let path = '/devices/?query=' + JSON.stringify(query) + '&projection=' +
               projection1 + ',' + projection2;
    let options = {
      method: 'GET',
      hostname: 'localhost',
      port: 7557,
      path: encodeURI(path),
    };
    let req = http.request(options, (resp) => {
      resp.setEncoding('utf8');
      let data = '';
      let i;
      resp.on('data', (chunk)=>data+=chunk);
      resp.on('end', async ()=>{
        if (data.length > 0) {
          data = JSON.parse(data)[0];
        }
        let isDiff = false;
        let template = '';
        if (checkForNestedKey(data, projection1)) {
          template = projection1;
        } else if (checkForNestedKey(data, projection2)) {
          template = projection2;
        }
        if (template != '') {
          for (i = 0; i < device.port_mapping.length; i++) {
            let iterateTemplate = template+'.'+(i+1)+'.';
            let portMapEnablePath = iterateTemplate +
                                    fields.port_mapping_values.enable[0];
            if (checkForNestedKey(data, portMapEnablePath)) {
              if (getFromNestedKey(data, portMapEnablePath) != true) {
                isDiff = true;
                break;
              }
            }
            let portMapLeasePath = iterateTemplate +
                                    fields.port_mapping_values.lease[0];
            if (checkForNestedKey(data, portMapLeasePath)) {
              if (getFromNestedKey(data, portMapLeasePath) != 0) {
                isDiff = true;
                break;
              }
            }
            let portMapProtocolPath = iterateTemplate +
                                      fields.port_mapping_values.protocol[0];
            if (checkForNestedKey(data, portMapProtocolPath)) {
              if (getFromNestedKey(data,
                portMapProtocolPath) != fields.port_mapping_values.protocol[1]
              ) {
                isDiff = true;
                break;
              }
            }
            let portMapClientPath = iterateTemplate +
                                    fields.port_mapping_fields.client[0];
            if (checkForNestedKey(data, portMapClientPath)) {
              if (getFromNestedKey(data,
                portMapClientPath) != device.port_mapping[i].ip
              ) {
                isDiff = true;
                break;
              }
            }
            let portMapExtStart = iterateTemplate +
              fields.port_mapping_fields.external_port_start[0];
            if (checkForNestedKey(data, portMapExtStart)) {
              if (getFromNestedKey(data, portMapExtStart) !=
                device.port_mapping[i].external_port_start) {
                isDiff = true;
                break;
              }
            }
            if (fields.port_mapping_fields.external_port_end) {
              let portMapExtEnd = iterateTemplate +
                fields.port_mapping_fields.external_port_end[0];
              if (checkForNestedKey(data, portMapExtEnd)) {
                if (getFromNestedKey(data, portMapExtEnd) !=
                  device.port_mapping[i].external_port_end) {
                  isDiff = true;
                  break;
                }
              }
            }
            let portMapIntStart = iterateTemplate +
              fields.port_mapping_fields.internal_port_start[0];
            if (checkForNestedKey(data, portMapIntStart)) {
              if (getFromNestedKey(data, portMapIntStart) !=
                device.port_mapping[i].internal_port_start) {
                isDiff = true;
                break;
              }
            }
            if (fields.port_mapping_fields.internal_port_end) {
              let portMapIntEnd = iterateTemplate +
                fields.port_mapping_fields.internal_port_end[0];
              if (checkForNestedKey(data, portMapIntEnd)) {
                if (getFromNestedKey(data, portMapIntEnd) !=
                  device.port_mapping[i].internal_port_end) {
                  isDiff = true;
                  break;
                }
              }
            }
          }
          if (isDiff) {
            acsDeviceInfoController.changePortForwardRules(device, 0);
          }
        } else {
          console.log('Wrong PortMapping in the device tree ' +
                      'from genie. ACS ID is ' + acsID);
        }
      });
    });
    req.end();
  }
};

acsDeviceInfoController.pingOfflineDevices = async function() {
  // Get TR-069 configs from database
  let matchedConfig = await Config.findOne(
    {is_default: true}, 'tr069',
  ).exec().catch((err) => err);
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
  });
  // Issue a task for every offline device to try and force it to reconnect
  for (let i = 0; i < offlineDevices.length; i++) {
    let id = offlineDevices[i].acs_id;
    let splitID = id.split('-');
    let model = splitID.slice(1, splitID.length-1).join('-');
    let fields = DevicesAPI.getModelFields(splitID[0], model).fields;
    let task = {
      name: 'getParameterValues',
      parameterNames: [fields.common.uptime],
    };
    await TasksAPI.addTask(id, task, true, 50, [], null);
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
      return {success: false, message: 'Nenhum a reportar'};
    }
    let response = await controlApi.reportDevices(app, devicesArray);
    if (response.success) {
      for (let device of devicesArray) {
        device.is_license_active = true;
        await device.save();
      }
      if (response.noLicenses) {
        let matchedNotif = await Notification.findOne({
          'message_code': 4,
          'target': 'general'});
        if (!matchedNotif || matchedNotif.allow_duplicate) {
          let notification = new Notification({
            'message': 'Sua conta está sem licenças para CPEs TR-069 ' +
                       'sobrando. Entre em contato com seu representante ' +
                       'comercial',
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
            'message': 'Sua conta está com apenas ' + response.licensesNum +
                       ' licenças CPE TR-069 sobrando. ' +
                       'Entre em contato com seu representante comercial',
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
    return {success: false, message: 'Erro na requisição'};
  }
};

acsDeviceInfoController.addFirmwareInACS = async function(firmware) {
  let binData;
  try {
    binData = await FirmwaresAPI.receiveFile(firmware.filename);
  } catch (e) {
    return false;
  }
  try {
    await FirmwaresAPI.uploadToGenie(binData, firmware);
  } catch (e) {
    return false;
  }
  return true;
};

acsDeviceInfoController.delFirmwareInACS = async function(filename) {
  await FirmwaresAPI.delFirmwareInGenie(filename);
};

acsDeviceInfoController.upgradeFirmware = async function(device) {
  let firmwares;
  // verify existence in nbi through 7557/files/
  firmwares = await FirmwaresAPI.getFirmwaresFromGenie();

  let firmware = firmwares.find((f) => f.metadata.version == device.release);
  // if not exists, then add
  if (!firmware) {
    firmware = await FirmwareModel.findOne({
      model: device.model,
      release: device.release,
      cpe_type: 'tr069',
    });
    if (!firmware) {
      return {success: false, message: 'Não existe firmware com essa versão'};
    } else {
      let response = await acsDeviceInfoController.addFirmwareInACS(firmware);
      if (!response) {
        return {success: false, message: 'Erro ao adicionar firmware'};
      }
    }
  }
  // trigger 7557/devices/<acs_id>/tasks POST 'name': 'download'
  let response = '';
  try {
    response = await FirmwaresAPI.sendUpgradeFirmware(firmware, device);
  } catch (e) {
    return {success: false, message: e.message};
  }
  return {success: true, message: response};
};

module.exports = acsDeviceInfoController;
