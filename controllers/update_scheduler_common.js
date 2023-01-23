/* global __line */

const Config = require('../models/config');
const meshHandler = require('./handlers/mesh');
const t = require('./language').i18next.t;
const DeviceModel = require('../models/device');

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


commonScheduleController.getDevice = async function(mac, lean=false) {
  let device = null;
  const projection = {
    port_mapping: false, ap_survey: false,
    pingtest_results: false, speedtest_results: false,
    firstboot_log: false, lastboot_log: false,
  };
  try {
    if (lean) {
      device = await DeviceModel.findById(mac.toUpperCase(), projection).lean();
    } else {
      device = await DeviceModel.findById(mac.toUpperCase(), projection);
    }
  } catch (err) {
    console.log(err);
    return null;
  }
  return device;
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


commonScheduleController.successUpdate = async function(
  mac,
  config = null,
) {
  // If the config is not passed, get the config
  if (!config) {
    config = await commonScheduleController.getConfig();
  }

  // If a failed occured when getting the config
  if (!config) {
    return {
      success: false,
      error: t('noSchedulingActive', {errorline: __line}),
    };
  }

  // Check if the device is updating
  let isDeviceUpdating = await isUpdating(mac, config);

  // Otherwise, return
  if (
    !isDeviceUpdating.success ||
    !isDeviceUpdating.updating
  ) {
    return {
      success: false,
      error: t('macNotFound', {errorline: __line}),
    };
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
          // eslint-disable-next-line max-len
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

  // Check if this function was called due to update procedure
  let isDeviceUpdating = await isUpdating(mac, config);

  // Otherwise, just return
  if (!isDeviceUpdating.success || !isDeviceUpdating.updating) {
    return {
      success: false,
      error: t('macNotFound', {errorline: __line}),
    };
  }

  let count = config.device_update_schedule.device_count;
  let rule = config.device_update_schedule.rule;
  let upgradeDevice = rule.in_progress_devices.find((d)=>d.mac === mac);
  let device = await commonScheduleController.getDevice(mac);

  if (!upgradeDevice) {
    return {success: false, error: t('macNotFound',
                                     {errorline: __line})};
  }

  if (config.device_update_schedule.is_aborted) {
    return {success: false, error: t('schedulingAlreadyAborted',
                                     {errorline: __line})};
  }

  if (!device) {
    return {
      success: false,
      error: t('macNotFound', {errorline: __line}),
    };
  }

  try {
    let setQuery = null;
    let pullQuery = null;
    if (upgradeDevice.retry_count >= maxRetries || config.is_aborted) {
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

    // Reached max retries
    if (upgradeDevice.retry_count >= maxRetries) {
      // Too many retries, add to done, status error
      pushQuery = {
        'device_update_schedule.rule.done_devices': {
          'mac': mac,
          'state': 'error',
          'slave_count': upgradeDevice.slave_count,
          'slave_updates_remaining': upgradeDevice.slave_updates_remaining,
          'mesh_current': upgradeDevice.mesh_current,
          'mesh_upgrade': upgradeDevice.mesh_upgrade,
        },
      };

      // Set the update status to image download failed
      device.do_update_status = 2;
      await device.save();
    } else if (config.is_aborted) {
      // Aborted case
      // Avoid racing conditions by checking if device is already added
      let doneDevice = rule.done_devices.find((d)=>d.mac === mac);
      if (!doneDevice) {
        // Schedule is aborted, add to done, status aborted
        pushQuery = {
          'device_update_schedule.rule.done_devices': {
            'mac': mac,
            'state': 'aborted',
            'slave_count': upgradeDevice.slave_count,
            'slave_updates_remaining': upgradeDevice.slave_updates_remaining,
            'mesh_current': upgradeDevice.mesh_current,
            'mesh_upgrade': upgradeDevice.mesh_upgrade,
          },
        };
      }
    } else {
      let retry = upgradeDevice.retry_count + 1;
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
      if (slave && !device.use_tr069) {
        meshHandler.updateMeshDevice(slave, fieldsToUpdate);
      } else if (!device.use_tr069) {
        meshHandler.updateMeshDevice(mac, fieldsToUpdate);

      // Handle TR-069 Devices
      } else {
        // Remove from in_progress, move back to to_do in order to avoid trying
        // to update the router immediately and wait a little to try it again
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
              'slave_count': upgradeDevice.slave_count,
              'slave_updates_remaining': upgradeDevice.slave_updates_remaining,
              'mesh_current': upgradeDevice.mesh_current,
              'mesh_upgrade': upgradeDevice.mesh_upgrade,
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


// Return if the device is updating or not
const isUpdating = async function(mac, config = null) {
  if (!config) {
    config = await commonScheduleController.getConfig();
  }

  // Check if the config is valid
  if (!config) {
    return {
      success: false,
      error: t('noSchedulingActive', {errorline: __line}),
    };
  }

  let rule = config.device_update_schedule.rule;

  let isDeviceUpdating = rule.in_progress_devices.some(
    (device)=>device.mac === mac,
  );


  return {
    success: true,
    updating: isDeviceUpdating,
  };
};
/*
 * This function is being exported in order to test it.
 * The ideal way is to have a condition to only export it when testing
 */
commonScheduleController.__testIsUpdating = isUpdating;


/*
 *  Description:
 *    This function mark the cpe as success if the option that the cpe will not
 *    return to flashman is marked.
 *
 *  Inputs:
 *    mac - The mac address of the cpe
 *
 *  Outputs:
 *    boolean - If the update for the cpe was marked as success or not
 */
commonScheduleController.successUpdateIfCpeWontReturn = async function(
  mac,
) {
  let schedulerConfig = await commonScheduleController.getConfig();

  // Validate the config
  if (
    !schedulerConfig || !schedulerConfig.device_update_schedule ||
    !schedulerConfig.device_update_schedule.rule
  ) {
    return false;
  }


  // Check if the device is updating
  let isCpeUpdating = await isUpdating(mac, schedulerConfig);

  if (!isCpeUpdating.success || !isCpeUpdating.updating) {
    return false;
  }


  // Check if cpe will not return to flashman
  let rule = schedulerConfig.device_update_schedule.rule;
  if (rule.cpes_wont_return) {
    console.log(
      'CPE ' + mac +
      ' was considered updated because it will not return to Flashman',
    );

    // Mark as success
    commonScheduleController.successUpdate(mac, schedulerConfig);
    return true;
  }

  return false;
};


module.exports = commonScheduleController;
