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

const createRegistry = async function(req) {
  let data = req.body.data;
  let hasPPPoE = (data.wan.pppoe_user && data.wan.pppoe_pass);
  let subnetNumber = convertSubnetMaskToInt(data.lan.subnet_mask);
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
    wifi_mode: data.wifi2.mode,
    wifi_state: (data.wifi2.enable) ? 1 : 0,
    wifi_is_5ghz_capable: true,
    wifi_ssid_5ghz: data.wifi5.ssid,
    wifi_channel_5ghz: data.wifi5.channel,
    wifi_mode_5ghz: data.wifi5.mode,
    wifi_state_5ghz: (data.wifi5.enable) ? 1 : 0,
    lan_subnet: data.lan.router_ip,
    lan_netmask: (subnetNumber > 0) ? subnetNumber : undefined,
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
  device.acs_id = req.body.acs_id;
  if (data.common.model) device.model = data.common.model;
  if (data.common.version) device.version = data.common.version;
  if (hasPPPoE) {
    device.connection_type = 'pppoe';
    device.pppoe_user = data.wan.pppoe_user;
    device.pppoe_password = data.wan.pppoe_pass;
  } else {
    device.connection_type = 'dhcp';
    device.pppoe_user = undefined;
    device.pppoe_password = undefined;
  }
  if (data.wifi2.ssid) device.wifi_ssid = data.wifi2.ssid;
  if (data.wifi2.channel) device.wifi_channel = data.wifi2.channel;
  if (data.wifi2.mode) device.wifi_mode = data.wifi2.mode;
  if (data.wifi5.ssid) device.wifi_ssid_5ghz = data.wifi5.ssid;
  if (data.wifi5.channel) device.wifi_channel_5ghz = data.wifi5.channel;
  if (data.wifi5.mode) device.wifi_mode_5ghz = data.wifi5.mode;
  if (typeof data.wifi2.enable !== 'undefined') {
    device.wifi_state = (data.wifi2.enable) ? 1 : 0;
  }
  if (typeof data.wifi5.enable !== 'undefined') {
    device.wifi_state_5ghz = (data.wifi5.enable) ? 1 : 0;
  }
  if (data.lan.router_ip) device.lan_subnet = data.lan.router_ip;
  if (subnetNumber > 0) device.lan_netmask = subnetNumber;
  if (data.wan.wan_ip) device.wan_ip = data.wan.wan_ip;
  if (data.wan.rate) device.wan_negociated_speed = data.wan.rate;
  if (data.wan.duplex) device.wan_negociated_duplex = data.wan.duplex;
  if (data.common.uptime) device.sys_up_time = data.common.uptime;
  if (data.wan.uptime) device.wan_up_time = data.wan.uptime;
  device.last_contact = Date.now();
  await device.save();
  return res.status(200).json({success: true});
};

module.exports = acsDeviceInfoController;
