const DeviceModel = require('../models/device');

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

const convertWifiMode = function(mode, is5ghz) {
  switch (mode) {
    case 'a':
    case 'b':
    case 'g':
      return '11g';
    case 'n':
      return (is5ghz) ? '11na' : '11n';
    case 'ac':
      return (is5ghz) ? '11ac' : undefined;
    case 'ax':
    default:
      return undefined;
  }
};

const convertWifiBand = function(band, mode) {
  let isAC = convertWifiMode(mode) === '11ac';
  switch (band) {
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

const processHostFromURL = function(url) {
  if (typeof url !== 'string') return '';
  let doubleSlash = url.indexOf('//');
  let pathStart = url.substring(doubleSlash+2).indexOf('/');
  let endIndex = (pathStart >= 0) ? doubleSlash+2+pathStart : url.length;
  let hostAndPort = url.substring(doubleSlash+2, endIndex);
  return hostAndPort.split(':')[0];
};

const createRegistry = async function(req) {
  let data = req.body.data;
  let hasPPPoE = (data.wan.pppoe_user && data.wan.pppoe_pass);
  let subnetNumber = convertSubnetMaskToInt(data.lan.subnet_mask);
  let cpeIP = processHostFromURL(data.common.ip);
  let newDevice = new DeviceModel({
    _id: data.common.mac,
    use_tr069: true,
    acs_id: req.body.acs_id,
    model: (data.common.model) ? data.common.model : '',
    version: data.common.version,
    installed_release: '0000-ONU',
    release: '0000-ONU',
    connection_type: (hasPPPoE) ? 'pppoe' : 'dhcp',
    pppoe_user: (hasPPPoE) ? data.wan.pppoe_user : undefined,
    pppoe_password: (hasPPPoE) ? data.wan.pppoe_pass : undefined,
    wifi_ssid: data.wifi2.ssid,
    wifi_channel: data.wifi2.channel,
    wifi_mode: convertWifiMode(data.wifi2.mode, false),
    wifi_band: convertWifiBand(data.wifi2.band, data.wifi2.mode),
    wifi_state: (data.wifi2.enable) ? 1 : 0,
    wifi_is_5ghz_capable: true,
    wifi_ssid_5ghz: data.wifi5.ssid,
    wifi_channel_5ghz: data.wifi5.channel,
    wifi_mode_5ghz: convertWifiMode(data.wifi5.mode, true),
    wifi_state_5ghz: (data.wifi5.enable) ? 1 : 0,
    lan_subnet: data.lan.router_ip,
    lan_netmask: (subnetNumber > 0) ? subnetNumber : undefined,
    ip: (cpeIP) ? cpeIP : undefined,
    wan_ip: data.wan.wan_ip,
    wan_negociated_speed: data.wan.rate,
    wan_negociated_duplex: data.wan.duplex,
    sys_up_time: data.common.uptime,
    wan_up_time: data.wan.uptime,
    created_at: Date.now(),
    last_contact: Date.now(),
  });
  try {
    await newDevice.save();
  } catch (err) {
    console.log(err);
    return false;
  }
  return true;
};

acsDeviceInfoController.syncDevice = async function(req, res) {
  let data = req.body.data;
  if (!data || !data.common || !data.common.mac) {
    return res.status(500).json({
      success: false,
      message: 'Missing mac field',
    });
  }

  let device = await DeviceModel.findById(data.common.mac);
  if (!device) {
    if (await createRegistry(req)) {
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
  let hasPPPoE = (data.wan.pppoe_user && data.wan.pppoe_pass);
  let subnetNumber = convertSubnetMaskToInt(data.lan.subnet_mask);
  let cpeIP = processHostFromURL(data.common.ip);
  let changes = {};
  device.acs_id = req.body.acs_id;
  if (data.common.model) device.model = data.common.model;
  if (data.common.version) device.version = data.common.version;
  if (hasPPPoE) {
    if (device.connection_type !== 'pppoe') {
      changes['connection_type'] = 'pppoe';
      changes['pppoe_user'] = data.wan.pppoe_user;
      changes['pppoe_pass'] = data.wan.pppoe_pass;
    }
    if (!device.pppoe_user) {
      device.pppoe_user = data.wan.pppoe_user;
    } else if (device.pppoe_user !== data.wan.pppoe_user) {
      changes['pppoe_user'] = data.wan.pppoe_user;
    }
    if (!device.pppoe_password) {
      device.pppoe_password = data.wan.pppoe_pass;
    } else if (device.pppoe_password !== data.wan.pppoe_pass) {
      changes['pppoe_pass'] = data.wan.pppoe_pass;
    }
  } else {
    if (device.connection_type !== 'dhcp') {
      changes['connection_type'] = 'dhcp';
      changes['pppoe_user'] = undefined;
      changes['pppoe_pass'] = undefined;
    }
    device.pppoe_user = undefined;
    device.pppoe_password = undefined;
  }

  if (typeof data.wifi2.enable !== 'undefined') {
    let enable = (data.wifi2.enable) ? 1 : 0;
    if (device.wifi_state !== enable) {
      changes['wifi2_enable'] = enable;
    }
  }
  if (data.wifi2.ssid && !device.wifi_ssid) {
    device.wifi_ssid = data.wifi2.ssid;
  } else if (device.wifi_ssid !== data.wifi2.ssid) {
    changes['wifi2_ssid'] = data.wifi2.ssid;
  }
  if (data.wifi2.channel && !device.wifi_channel) {
    device.wifi_channel = data.wifi2.channel;
  } else if (device.wifi_channel !== data.wifi2.channel) {
    changes['wifi2_channel'] = data.wifi2.channel;
  }
  let mode2 = convertWifiMode(data.wifi2.mode, false);
  if (data.wifi2.mode && !device.wifi_mode) {
    device.wifi_mode = mode2;
  } else if (device.wifi_mode !== mode2) {
    changes['wifi2_mode'] = mode2;
  }
  let band2 = convertWifiMode(data.wifi2.band, data.wifi2.mode);
  if (data.wifi2.band && !device.wifi_band) {
    device.wifi_band = band2;
  } else if (device.wifi_band !== band2) {
    changes['wifi2_band'] = band2;
  }

  if (data.wifi5.ssid && !device.wifi_ssid) {
    device.wifi_ssid_5ghz = data.wifi5.ssid;
  } else if (device.wifi_ssid_5ghz !== data.wifi5.ssid) {
    changes['wifi5_ssid'] = data.wifi5.ssid;
  }
  if (data.wifi5.channel && !device.wifi_channel_5ghz) {
    device.wifi_channel_5ghz = data.wifi5.channel;
  } else if (device.wifi_channel_5ghz !== data.wifi5.channel) {
    changes['wifi5_channel'] = data.wifi5.channel;
  }
  let mode5 = convertWifiMode(data.wifi5.mode, true);
  if (data.wifi5.mode && !device.wifi_mode_5ghz) {
    device.wifi_mode_5ghz = mode5;
  } else if (device.wifi_mode_5ghz !== mode5) {
    changes['wifi5_mode'] = mode5;
  }
  let band5 = convertWifiMode(data.wifi5.band, data.wifi5.mode);
  if (data.wifi5.band && !device.wifi_band_5ghz) {
    device.wifi_band_5ghz = band5;
  } else if (device.wifi_band_5ghz !== band5) {
    changes['wifi5_band'] = band5;
  }

  if (data.lan.router_ip && !device.lan_subnet) {
    device.lan_subnet = data.lan.router_ip;
  } else if (device.lan_subnet !== data.lan.router_ip) {
    changes['lan_subnet'] = data.lan.router_ip;
  }
  if (subnetNumber > 0 && !device.lan_netmask) {
    device.lan_netmask = subnetNumber;
  } else if (device.lan_netmask !== subnetNumber) {
    changes['lan_netmask'] = subnetNumber;
  }
  if (data.wan.wan_ip) device.wan_ip = data.wan.wan_ip;
  if (data.wan.rate) device.wan_negociated_speed = data.wan.rate;
  if (data.wan.duplex) device.wan_negociated_duplex = data.wan.duplex;
  if (data.common.uptime) device.sys_up_time = data.common.uptime;
  if (data.wan.uptime) device.wan_up_time = data.wan.uptime;
  if (cpeIP) device.ip = cpeIP;
  device.last_contact = Date.now();
  // Possibly TODO: Save changes object in the device if supposed to accept
  //                changes from CPE that are not synced with Flashman
  await device.save();
  return res.status(200).json({success: true});
};

module.exports = acsDeviceInfoController;
