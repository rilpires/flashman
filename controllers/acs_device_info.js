const DevicesAPI = require('.devices-api');
const DeviceModel = require('../models/device');
const sio = require('../sio');

const pako = require('pako');
const http = require('http');

let acsDeviceInfoController = {};

const checkForNestedKey = function(data, key) {
  if (!data) return false;
  let current = data;
  let splitKey = key.split('.');
  for (let i = 0; i < splitKey.length; i++) {
    if (!current[splitKey[i]]) return false;
    current = current[splitKey[i]];
  }
  return true;
};

const getFromNestedKey = function(data, key) {
  if (!data) return undefined;
  let current = data;
  let splitKey = key.split('.');
  for (let i = 0; i < splitKey.length; i++) {
    if (!current[splitKey[i]]) return undefined;
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
    _id: data.common.mac.toUpperCase(),
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
    wan_ip: (hasPPPoE) ? data.wan.wan_ip_ppp : data.wan.wan_ip,
    wan_negociated_speed: data.wan.rate,
    wan_negociated_duplex: data.wan.duplex,
    sys_up_time: data.common.uptime,
    wan_up_time: (hasPPPoE) ? data.wan.uptime_ppp : data.wan.uptime,
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

  let device = await DeviceModel.findById(data.common.mac.toUpperCase());
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
  if (data.wan.recv_bytes && data.wan.sent_bytes) {
    device.wan_bytes = appendBytesMeasure(
      device.wan_bytes,
      data.wan.recv_bytes,
      data.wan.sent_bytes,
    );
  }
  if (data.wan.rate) device.wan_negociated_speed = data.wan.rate;
  if (data.wan.duplex) device.wan_negociated_duplex = data.wan.duplex;
  if (data.common.uptime) device.sys_up_time = data.common.uptime;
  if (hasPPPoE && data.wan.wan_ip_ppp) device.wan_ip = data.wan.wan_ip_ppp;
  else if (!hasPPPoE && data.wan.wan_ip) device.wan_ip = data.wan.wan_ip;
  if (hasPPPoE && data.wan.uptime_ppp) device.wan_up_time = data.wan.uptime_ppp;
  else if (!hasPPPoE && data.wan.uptime) device.wan_up_time = data.wan.uptime;
  if (cpeIP) device.ip = cpeIP;
  device.last_contact = Date.now();
  // Possibly TODO: Save changes object in the device if supposed to accept
  //                changes from CPE that are not synced with Flashman
  await device.save();
  return res.status(200).json({success: true});
};

acsDeviceInfoController.rebootDevice = function(device) {
  // TODO: Use tasks framework instead of requesting manually
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let options = {
    method: 'POST',
    hostname: 'localhost',
    // hostname: '207.246.65.243',
    port: 7557,
    path: '/devices/'+acsID+'/tasks?timeout=3000&connection_request',
  };
  let body = {name: 'reboot'};
  let req = http.request(options);
  req.write(JSON.stringify(body));
  req.end();
};

// TODO: Move this function to external-genieacs?
const fetchLogFromGenie = function(mac, acsID) {
  let splitID = acsID.split('-');
  let logField = DevicesAPI.getModelFields(splitID[0], splitID[1]).fields.log;
  let query = {_id: acsID};
  let path = '/devices/?query='+JSON.stringify(query)+'&projection='+logField;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    // hostname: '207.246.65.243',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let data = '';
    resp.on('data', (chunk)=>data+=chunk);
    resp.on('end', async ()=>{
      data = JSON.parse(data)[0];
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

// TODO: Move this function to external-genieacs?
const fetchWanBytesFromGenie = function(mac, acsID) {
  let splitID = acsID.split('-');
  let fields = DevicesAPI.getModelFields(splitID[0], splitID[1]).fields;
  let recvField = fields.wan.recv_bytes;
  let sentField = fields.wan.sent_bytes;
  let query = {_id: acsID};
  let projection = recvField + ',' + sentField;
  let path = '/devices/?query='+JSON.stringify(query)+'&projection='+projection;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    // hostname: '207.246.65.243',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let data = '';
    let wanBytes = {};
    resp.on('data', (chunk)=>data+=chunk);
    resp.on('end', async ()=>{
      data = JSON.parse(data)[0];
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
      sio.anlixSendUpStatusNotification(mac, {wanbytes: wanBytes});
    });
  });
  req.end();
};

acsDeviceInfoController.requestLogs = function(device) {
  // TODO: Use tasks framework instead of requesting manually
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let mac = device._id;
  let acsID = device.acs_id;
  let splitID = acsID.split('-');
  let logField = DevicesAPI.getModelFields(splitID[0], splitID[1]).fields.log;
  let options = {
    method: 'POST',
    hostname: 'localhost',
    // hostname: '207.246.65.243',
    port: 7557,
    path: '/devices/'+acsID+'/tasks?timeout=3000&connection_request',
  };
  let body = {
    name: 'getParameterValues',
    parameterNames: [logField],
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    resp.on('data', (data)=>{});
    resp.on('end', ()=>{
      // TODO: Only call this function after task is executed (handle 202 resp)
      //       Will be done when integrated with tasks framewowrk
      fetchLogFromGenie(mac, acsID);
    });
  });
  req.write(JSON.stringify(body));
  req.end();
};

acsDeviceInfoController.requestWanBytes = function(device) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let mac = device._id;
  let acsID = device.acs_id;
  let splitID = acsID.split('-');
  let fields = DevicesAPI.getModelFields(splitID[0], splitID[1]).fields;
  let recvField = fields.wan.recv_bytes;
  let sentField = fields.wan.sent_bytes;
  let options = {
    method: 'POST',
    hostname: 'localhost',
    // hostname: '207.246.65.243',
    port: 7557,
    path: '/devices/'+acsID+'/tasks?timeout=3000&connection_request',
  };
  let body = {
    name: 'getParameterValues',
    parameterNames: [recvField, sentField],
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    resp.on('data', (data)=>{});
    resp.on('end', ()=>{
      // TODO: Only call this function after task is executed (handle 202 resp)
      //       Will be done when integrated with tasks framewowrk
      fetchWanBytesFromGenie(mac, acsID);
    });
  });
  req.write(JSON.stringify(body));
  req.end();
};

module.exports = acsDeviceInfoController;
