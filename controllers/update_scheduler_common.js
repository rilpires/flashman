/* global __line */

const Config = require('../models/config');
const meshHandler = require('./handlers/mesh');
const t = require('./language').i18next.t;

const maxRetries = 3;

let watchdogIntervalID = null;
let commonScheduleController = {};

commonScheduleController.scheduleOfflineWatchdog = function(func) {
    // Check for update slots every minute
    const interval = 1*60*1000;
    if (watchdogIntervalID) return;
    /*
    set interval call a anonymous function that call a single async function,
    so isn't necessary await
    */
    watchdogIntervalID = setInterval(
    () => func(),
    interval);
};


commonScheduleController.removeOfflineWatchdog = function() {
    // Clear interval if set
    if (watchdogIntervalID) {
      clearInterval(watchdogIntervalID);
      watchdogIntervalID = null;
    }
};


commonScheduleController.getConfig = async function(
  lean=true,
  needActive=true,
) {
  let config = null;
  try {
    if (lean) {
      config = await Config.findOne({is_default: true}).lean();
    } else {
      config = await Config.findOne({is_default: true});
    }
    if (!config || !config.device_update_schedule ||
        (needActive && !config.device_update_schedule.is_active)) {
      return null;
    }
  } catch (err) {
    console.log(err);
    return null;
  }
  return config;
};


commonScheduleController.configQuery = function(
  setQuery,
  pullQuery,
  pushQuery,
) {
  let query = {};
  if (setQuery) query ['$set'] = setQuery;
  if (pullQuery) query ['$pull'] = pullQuery;
  if (pushQuery) query ['$push'] = pushQuery;
  return Config.updateOne({'is_default': true}, query);
};


commonScheduleController.successUpdate = async function(mac) {
  let config = await commonScheduleController.getConfig();
  if (!config) {
    return {success: false, error: t('noSchedulingActive',
                                     {errorline: __line})};
  }
  let count = config.device_update_schedule.device_count;
  let rule = config.device_update_schedule.rule;
  let device = rule.in_progress_devices.find((d)=>d.mac === mac);
  if (!device) {
    return {success: false, error: t('macNotFound',
                                     {errorline: __line})};
  }
  if (config.device_update_schedule.is_aborted) {
    return {success: false, error: t('schedulingAlreadyAborted',
                                     {errorline: __line})};
  }
  // Change from status updating to ok
  try {
    let remain = device.slave_updates_remaining - 1;
    if (remain === 0) {
      // This is either a regular router or the last device in a mesh network
      // Move from in progress to done, with status ok
      await commonScheduleController.configQuery(
        // Make schedule inactive if this is last device to enter done state
        {'device_update_schedule.is_active':
          (rule.done_devices.length+1 !== count)},
        // Remove from in progress state
        {'device_update_schedule.rule.in_progress_devices': {'mac': mac}},
        // Add to done, status ok
        {
          'device_update_schedule.rule.done_devices': {
            'mac': mac,
            'state': 'ok',
            'slave_count': device.slave_count,
            'slave_updates_remaining': 0,
            'mesh_current': device.mesh_current,
            'mesh_upgrade': device.mesh_upgrade,
          },
        },
      );
    } else {
      // Update remaining devices to update on a mesh network
      await Config.updateOne({
        'is_default': true,
        'device_update_schedule.rule.in_progress_devices.mac': mac,
      }, {
        '$set': {
          'device_update_schedule.rule.in_progress_devices.$.state':
            'downloading',
          'device_update_schedule.rule.in_progress_devices.$.slave_updates_remaining': remain,
          'device_update_schedule.rule.in_progress_devices.$.retry_count': 0,
        },
      });
    }
  } catch (err) {
    console.log(err);
    return {success: false, error: t('saveError', {errorline: __line})};
  }
  if (rule.done_devices.length+1 === count) {
    // This was last device to enter done state, schedule is done
    commonScheduleController.removeOfflineWatchdog();
  }
  return {success: true};
};


commonScheduleController.failedDownload = async function(mac, slave='') {
  let config = await commonScheduleController.getConfig();

  if (!config) {
    return {success: false, error: t('noSchedulingActive',
                                     {errorline: __line})};
  }

  let count = config.device_update_schedule.device_count;
  let rule = config.device_update_schedule.rule;
  let device = rule.in_progress_devices.find((d)=>d.mac === mac);

  if (!device) {
    return {success: false, error: t('macNotFound',
                                     {errorline: __line})};
  }

  if (config.device_update_schedule.is_aborted) {
    return {success: false, error: t('schedulingAlreadyAborted',
                                     {errorline: __line})};
  }

  try {
    let setQuery = null;
    let pullQuery = null;
    if (device.retry_count >= maxRetries || config.is_aborted) {
      // Will not try again or move to to_do, so check if last device to update
      setQuery = {
        'device_update_schedule.is_active':
          (rule.done_devices.length+1 !== count)};

      if (rule.done_devices.length+1 === count) {
        // This was last device to enter done state, schedule is done
        commonScheduleController.removeOfflineWatchdog();
      }
      // Force remove from in progress regardless of slave or not
      pullQuery = {
        'device_update_schedule.rule.in_progress_devices': {'mac': mac},
      };
    }

    let pushQuery = null;
    if (device.retry_count >= maxRetries) {
      // Too many retries, add to done, status error
      pushQuery = {
        'device_update_schedule.rule.done_devices': {
          'mac': mac,
          'state': 'error',
          'slave_count': device.slave_count,
          'slave_updates_remaining': device.slave_updates_remaining,
          'mesh_current': device.mesh_current,
          'mesh_upgrade': device.mesh_upgrade,
        },
      };
    } else if (config.is_aborted) {
      // Avoid racing conditions by checking if device is already added
      let device = rule.done_devices.find((d)=>d.mac === mac);
      if (!device) {
        // Schedule is aborted, add to done, status aborted
        pushQuery = {
          'device_update_schedule.rule.done_devices': {
            'mac': mac,
            'state': 'aborted',
            'slave_count': device.slave_count,
            'slave_updates_remaining': device.slave_updates_remaining,
            'mesh_current': device.mesh_current,
            'mesh_upgrade': device.mesh_upgrade,
          },
        };
      }
    } else {
      let retry = device.retry_count + 1;
      await Config.updateOne({
        'is_default': true,
        'device_update_schedule.rule.in_progress_devices.mac': mac,
      }, {
        '$set': {
          'device_update_schedule.rule.in_progress_devices.$.retry_count':
            retry,
        },
      });

      let fieldsToUpdate = {release: rule.release};
      if (slave && device.use_tr069 === false) {
        meshHandler.updateMeshDevice(slave, fieldsToUpdate);
      } else if (device.use_tr069 === false) {
        meshHandler.updateMeshDevice(mac, fieldsToUpdate);

      // Handle TR-069 Devices
      } else {
        // Remove from in_progress, move back to to_do
        await commonScheduleController.configQuery(
          null,

          {
            'device_update_schedule.rule.in_progress_devices': {'mac': mac},
          },

          {
            'device_update_schedule.rule.to_do_devices': {
              'mac': mac,
              'state': 'retry',
              'retry_count': retry,
              'slave_count': device.slave_count,
              'slave_updates_remaining': device.slave_updates_remaining,
              'mesh_current': device.mesh_current,
              'mesh_upgrade': device.mesh_upgrade,
            },
          },
        );
      }

      return {success: true};
    }

    await commonScheduleController.configQuery(
      setQuery,
      pullQuery,
      pushQuery,
    );
  } catch (err) {
    console.log(err);
    return {success: false, error: t('saveError', {errorline: __line})};
  }
  return {success: true};
};


module.exports = commonScheduleController;
