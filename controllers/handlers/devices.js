const Config = require('../../models/config');
const DeviceModel = require('../../models/device');
const DeviceVersion = require('../../models/device_version');
const util = require('./util');

let deviceHandlers = {};

deviceHandlers.diffDateUntilNowInSeconds = function(pastDate) {
  let pastDateParsed = NaN;
  const dateObjType = Object.prototype.toString.call(pastDate);

  if (dateObjType === '[object Date]') {
    // Remove any timezone representation and convert to UTC
    pastDateParsed = pastDate.toISOString();
    pastDateParsed = Date.parse(pastDateParsed);
  } else if (dateObjType === '[object String]') {
    // Always UTC conversion
    pastDateParsed = Date.parse(pastDate);
  }
  // Assume old date if can't be parsed
  if (isNaN(pastDateParsed)) {
    pastDateParsed = new Date(1970, 1, 1);
  }
  let justNow = Date.now();
  let devTimeDiff = Math.abs(justNow - pastDateParsed);
  let devTimeDiffSeconds = Math.floor(devTimeDiff / 1000);

  return devTimeDiffSeconds;
};

deviceHandlers.isOnline = function(dateLastSeen) {
  let isOnline = false;
  let offlineThresh = 10; // seconds

  const diffInSeconds = deviceHandlers.diffDateUntilNowInSeconds(dateLastSeen);

  if (diffInSeconds <= offlineThresh) {
    isOnline = true;
  } else {
    isOnline = false;
  }
  return isOnline;
};

const isTooOld = function(dateLastSeen, thresholdInMinutes) {
  let isOld = false;
  let secondsThreshold = thresholdInMinutes * 60;

  const diffInSeconds = deviceHandlers.diffDateUntilNowInSeconds(dateLastSeen);

  if (diffInSeconds >= secondsThreshold) {
    isOld = true;
  }
  return isOld;
};

deviceHandlers.isDeviceTooOld = function(dateLastSeen) {
  // 24 hours
  return isTooOld(dateLastSeen, 1440);
};

deviceHandlers.isApTooOld = function(dateLastSeen) {
  return isTooOld(dateLastSeen, 60);
};

const syncUpdateScheduler = async function(mac) {
  try {
    let config = await Config.findOne({is_default: true}).lean();
    if (!config || !config.device_update_schedule ||
        !config.device_update_schedule.is_active) {
      return;
    }
    let count = config.device_update_schedule.device_count;
    let rule = config.device_update_schedule.rule;
    let device = rule.in_progress_devices.find((d)=>d.mac === mac);
    let doneLength = rule.done_devices.length;
    if (!device) return;
    // Move from in progress to done, with status error
    let query = {
      '$set': {
        'device_update_schedule.is_active': (doneLength+1 !== count),
      },
      '$pull': {
        'device_update_schedule.rule.in_progress_devices': {'mac': mac},
      },
      '$push': {
        'device_update_schedule.rule.done_devices': {
          'mac': mac,
          'state': 'error',
          'slave_count': device.slave_count,
          'slave_updates_remaining': device.slave_updates_remaining,
        },
      },
    };
    await Config.updateOne({'is_default': true}, query);
  } catch (err) {
    console.log(err);
    return;
  }
};

deviceHandlers.timeoutUpdateAck = function(mac) {
  // Default timeout is 3 minutes, enough time to download 16MB over a 1Mbps
  // connection, with enough breathing room
  let timeout = 3*60*1000;
  if (process.env.FLM_UPDATE_ACK_TIMEOUT_SECONDS) {
    timeout = parseInt(process.env.FLM_UPDATE_ACK_TIMEOUT_SECONDS) * 1000;
    if (isNaN(timeout)) {
      timeout = 3*60*1000; // just in case someone messes up the parameter
    }
  }
  setTimeout(()=>{
    DeviceModel.findById(mac, function(err, matchedDevice) {
      if (err || !matchedDevice) return;
      let permissions = DeviceVersion.findByVersion(
        matchedDevice.version,
        matchedDevice.wifi_is_5ghz_capable,
        matchedDevice.model,
      );
      if (permissions.grantUpdateAck && matchedDevice.do_update_status === 0) {
        // Ack expected but not received after timeout - assume error and cancel
        console.log('UPDATE: Device '+mac+' did not send ack, aborting update');
        matchedDevice.do_update_status = 5; // ack not received
        matchedDevice.save();
        // Sync with update scheduler to signal error for that update
        // TODO: Find a way to use the function in update_scheduler.js instead
        //       We have to use a local one here because of circular dependency
        if (matchedDevice.mesh_master) {
          // Slave routers call the function with their master's mac
          syncUpdateScheduler(matchedDevice.mesh_master);
        } else {
          syncUpdateScheduler(mac);
        }
      }
    });
  }, timeout);
};

deviceHandlers.removeDeviceFromDatabase = function(device) {
  let meshMaster = device.mesh_master;
  // Use this .remove method so middleware post hook receives object info
  device.remove();
  if (meshMaster) {
    // This is a mesh slave. Remove master registration
    DeviceModel.findById(meshMaster, function(err, masterDevice) {
      if (!err && masterDevice) {
        let index = masterDevice.mesh_slaves.indexOf(device._id.toUpperCase());
        if (index > -1) {
          masterDevice.mesh_slaves.splice(index, 1);
        }
        masterDevice.save();
        console.log('Slave ' + device._id.toUpperCase() +
          ' removed from Master ' + meshMaster + ' successfully.');
      }
    });
  }
};

// Test if prefix is possible on a new registry and if ssid
// already contains it
deviceHandlers.checkSsidPrefixNewRegistry = function(prefix, ssid) {
  const escapedSsidPrefix = util.escapeRegExp(prefix);
  const rePrefix = new RegExp('^' + escapedSsidPrefix + '.*$', 'g');
  // Test if incoming SSID already have the prefix
  if (rePrefix.test(ssid)) {
    // Remove prefix from incoming SSID
    const toRemove = new RegExp('^' + util.escapeRegExp(prefix), 'i');
    const finalSsid = ssid.replace(toRemove, '');
    return {enablePrefix: true, ssidPrefix: prefix, ssid: finalSsid};
  } else {
    const combinedSsid = prefix + ssid;
    if (combinedSsid.length > 32) {
      return {enablePrefix: false, ssidPrefix: '', ssid: ssid};
    } else {
      // Enable prefix on registry
      return {enablePrefix: true, ssidPrefix: prefix, ssid: ssid};
    }
  }
};

module.exports = deviceHandlers;
