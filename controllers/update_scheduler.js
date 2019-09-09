const DeviceModel = require('../models/device');
const Config = require('../models/config');
const mqtt = require('../mqtts');
const messaging = require('./messaging');

const async = require('asyncawait/async');
const await = require('asyncawait/await');

const maxRetries = 3;
let scheduleController = {};

const getConfig = async(function() {
  let config = null;
  try {
    config = await(Config.findOne({is_default: true}).lean());
    if (!config || !config.device_update_schedule ||
        !config.device_update_schedule.is_active) {
      return null;
    }
  } catch (err) {
    console.log(err);
    return null;
  }
  return config;
});

const getDevice = async(function(mac) {
  let device = null;
  try {
    device = await(DeviceModel.findById(mac));
  } catch (err) {
    console.log(err);
    return null;
  }
  return device;
});

const configQuery = function(setQuery, pullQuery, pushQuery) {
  let query = {};
  if (setQuery) query ['$set'] = setQuery;
  if (pullQuery) query ['$pull'] = pullQuery;
  if (setQuery) query ['$push'] = pushQuery;
  return Config.updateOne({'is_default': true}, query);
};

const markNextForUpdate = async(function(config) {
  let devices = config.device_update_schedule.rule.to_do_devices;
  if (devices.length === 0) return {success: true, marked: false};
  let nextDevice = null;
  for (let device in devices) {
    if (!Object.prototype.hasOwnProperty.call(devices, device)) continue;
    if (device.mac in mqtt.clients) {
      nextDevice = device;
      break;
    }
  }
  if (!nextDevice) {
    // No online devices, mark them all as offline
    try {
      await(configQuery(null, null, {
        'device_update_schedule.rule.to_do_devices.$[].state': 'offline',
      }));
    } catch (err) {
      console.log(err);
    }
    return {success: true, marked: false};
  }
  try {
    await(configQuery(
      null,
      // Remove from to do state
      {'device_update_schedule.rule.to_do_devices': {'mac': nextDevice.mac}},
      // Add to in progress, status downloading
      {
        'device_update_schedule.rule.in_progress_devices': {
          'mac': nextDevice.mac,
          'state': 'downloading',
          'retry_count': nextDevice.retry_count,
        },
      }
    ));
    // Mark device for update
    let device = await(getDevice(nextDevice.mac));
    device.do_update = true;
    device.do_update_status = 0;
    device.release = config.device_update_schedule.rule.release;
    messaging.sendUpdateMessage(device);
    mqtt.anlixMessageRouterUpdate(device._id);
    await(device.save());
  } catch (err) {
    console.log(err);
    return {success: false, error: 'Erro alterando base de dados'};
  }
  return {success: true, marked: true};
});

scheduleController.initialize = function() {
  let config = await(getConfig());
  if (!config) return {success: false, error: 'Não há um agendamento ativo'};
};

scheduleController.successDownload = async(function(mac) {
  let config = await(getConfig());
  if (!config) return {success: false, error: 'Não há um agendamento ativo'};
  let rule = config.device_update_schedule.rule;
  let device = rule.in_progress_devices.find((d)=>d.mac === mac);
  if (!device) return {success: false, error: 'MAC não encontrado'};
  // Change from status downloading to updating
  try {
    await(Config.updateOne({
      'is_default': true,
      'device_update_schedule.rule.in_progress_devices.mac': mac,
    }, {
      '$set': {
        'device_update_schedule.rule.in_progress_devices.$.state': 'updating',
      },
    }));
  } catch (err) {
    console.log(err);
    return {success: false, error: 'Erro alterando base de dados'};
  }
  return markNextForUpdate(config);
});

scheduleController.successUpdate = async(function(mac) {
  let config = await(getConfig());
  if (!config) return {success: false, error: 'Não há um agendamento ativo'};
  let rule = config.device_update_schedule.rule;
  let device = rule.in_progress_devices.find((d)=>d.mac === mac);
  if (!device) return {success: false, error: 'MAC não encontrado'};
  // Change from status updating to ok
  try {
    await(configQuery(
      // Make schedule inactive if this is last device
      {'is_active': (rule.in_progress_devices.length > 1)},
      // Remove from in progress state
      {'device_update_schedule.rule.in_progress_devices': {'mac': mac}},
      // Add to done, status ok
      {
        'device_update_schedule.rule.done_devices': {
          'mac': mac,
          'state': 'ok',
        },
      }
    ));
  } catch (err) {
    console.log(err);
    return {success: false, error: 'Erro alterando base de dados'};
  }
  return {success: true};
});

scheduleController.failedDownload = async(function(mac) {
  let config = await(getConfig());
  if (!config) return {success: false, error: 'Não há um agendamento ativo'};
  let rule = config.device_update_schedule.rule;
  let device = rule.in_progress_devices.find((d)=>d.mac === mac);
  if (!device) return {success: false, error: 'MAC não encontrado'};
  try {
    let setQuery = null;
    if (device.retry_count >= maxRetries || config.is_aborted) {
      // Will not try again or move to to_do, so check if last device to update
      setQuery = {'is_active': (rule.in_progress_devices.length > 1)};
    }
    // Remove from in progress state
    let pullQuery = {
      'device_update_schedule.rule.in_progress_devices': {'mac': mac},
    };
    let pushQuery = null;
    if (device.retry_count >= maxRetries) {
      // Too many retries, add to done, status error
      pushQuery = {
        'device_update_schedule.rule.done_devices': {
          'mac': mac,
          'state': 'error',
        },
      };
    } else if (config.is_aborted) {
      // Schedule is aborted, add to done, status aborted
      pushQuery = {
        'device_update_schedule.rule.done_devices': {
          'mac': mac,
          'state': 'aborted',
        },
      };
    } else {
      // Will retry, add to to_do, status retry
      pushQuery = {
        'device_update_schedule.rule.to_do_devices': {
          'mac': mac,
          'state': 'retry',
          'retry_count': device.retry_count + 1,
        },
      };
    }
    await(configQuery(setQuery, pullQuery, pushQuery));
  } catch (err) {
    console.log(err);
    return {success: false, error: 'Erro alterando base de dados'};
  }
  return markNextForUpdate(config);
});

scheduleController.abortSchedule = function() {
  let config = await(getConfig());
  if (!config) return {success: false, error: 'Não há um agendamento ativo'};
  // Mark scheduled update as aborted - separately to mitigate racing conditions
  try {
    await(configQuery({'device_update_schedule.is_aborted': true}, null, null));
    // Mark all todo devices as aborted
    let rule = config.device_update_schedule.rule;
    let pushArray = rule.to_do_devices.map((d)=>{
      let state = 'aborted' + ((d.state === 'offline') ? '_off' : '');
      return {mac: d.mac, state: state};
    });
    await(configQuery(
      {'device_update_schedule.rule.to_do_devices': []},
      null,
      {'device_update_schedule.rule.done_devices': {'$each': pushArray}}
    ));
  } catch (err) {
    console.log(err);
    return {success: false, error: 'Erro alterando base de dados'};
  }
  return {success: true};
};

module.exports = scheduleController;
