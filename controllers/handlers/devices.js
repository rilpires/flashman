const Config = require('../../models/config');
const DeviceModel = require('../../models/device');
const DeviceVersion = require('../../models/device_version');
const sio = require('../../sio');
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

/*
  Function to validate ssid and remove prefix
  if it already in the start of ssid
*/
deviceHandlers.cleanAndCheckSsid = function(prefix, ssid) {
  let strPrefix = '';
  if (typeof prefix !== 'undefined') {
    strPrefix = prefix;
  }
  if (typeof ssid === 'undefined') {
    // If no SSID provided it will not be this call
    // that will decide prefix, so return true
    return {enablePrefix: true, ssid: ''};
  }
  const escapedSsidPrefix = util.escapeRegExp(strPrefix);
  const rePrefix = new RegExp('^' + escapedSsidPrefix + '.*$', 'g');
  // Test if incoming SSID already have the prefix
  if (rePrefix.test(ssid)) {
    // Remove prefix from incoming SSID
    const toRemove = new RegExp('^' + util.escapeRegExp(strPrefix), 'i');
    const finalSsid = ssid.replace(toRemove, '');
    const combinedSsid = strPrefix + finalSsid;
    if (combinedSsid.length > 32) {
      return {enablePrefix: false, ssid: finalSsid};
    } else {
      // Enable prefix on registry
      return {enablePrefix: true, ssid: finalSsid};
    }
  } else {
    const combinedSsid = strPrefix + ssid;
    if (combinedSsid.length > 32) {
      return {enablePrefix: false, ssid: ssid};
    } else {
      // Enable prefix on registry
      return {enablePrefix: true, ssid: ssid};
    }
  }
};

/*
  Function to be called in all points of the system
  where ssid of a device is verified to be sent to a
  device or saved in the database

  warning to the cases below:
  -> new registry:
    Enabled only when hash AND config is enabled.
    If the client stop paying the personalization app
    him new devices registry will be prefix free.
    So in new registries is to be called with deviceEnabled as disabled;

  -> updating registry:
    In the scenario where the client disable the configEnabled flag
    or stop paying the personalization the app, we want to avoid
    mass disabling ssid prefix. First to avoid stressing the system,
    second because will be odd if the system by itself remove prefix
    of already set devices.
    What only matters in this case is the deviceEnabled flag.
    So in updating registries hash and configEnabled shall be disabled;

*/

deviceHandlers.checkSsidPrefix = function(config, ssid2ghz, ssid5ghz,
  keepDevicePrefix, isNewRegistry=false) {
  // default configuration return
  let prefixObj = {
    enablePrefix: false,
    ssid2: ssid2ghz,
    ssid5: ssid5ghz,
    prefix: '',
  };
  // clean and check the ssid regardless the flags
  let valObj2 = deviceHandlers.cleanAndCheckSsid(config.ssidPrefix, ssid2ghz);
  let valObj5 = deviceHandlers.cleanAndCheckSsid(config.ssidPrefix, ssid5ghz);
  // set the cleaned ssid to be returned
  prefixObj.ssid2 = valObj2.ssid;
  prefixObj.ssid5 = valObj5.ssid;

  // try to enable prefix
  if ((isNewRegistry && config.personalizationHash !== '' &&
     config.isSsidPrefixEnabled) || keepDevicePrefix) {
    // only enable if is the clean and check for both ssid
    //  (2ghz and 5ghz) is alright
    prefixObj.enablePrefix = valObj2.enablePrefix && valObj5.enablePrefix;
    // return a empty prefix case something goes wrong
    prefixObj.prefix = prefixObj.enablePrefix ? config.ssidPrefix : '';
  }
  return prefixObj;
};

deviceHandlers.sendPingToTraps = function(id, results) {
  sio.anlixSendPingTestNotifications(id, results);
  console.log('Ping results for device ' +
    id + ' received successfully.');

  // No await needed
  Config.findOne({is_default: true}, function(err, matchedConfig) {
    if (!err && matchedConfig) {
      // Send ping results if device traps are activated
      if (matchedConfig.traps_callbacks &&
          matchedConfig.traps_callbacks.device_crud) {
        let requestOptions = {};
        let callbackUrl =
        matchedConfig.traps_callbacks.device_crud.url;
        let callbackAuthUser =
        matchedConfig.traps_callbacks.device_crud.user;
        let callbackAuthSecret =
        matchedConfig.traps_callbacks.device_crud.secret;
        if (callbackUrl) {
          requestOptions.url = callbackUrl;
          requestOptions.method = 'PUT';
          requestOptions.json = {
            'id': matchedDevice._id,
            'type': 'device',
            'changes': {ping_results: results},
          };
          if (callbackAuthUser && callbackAuthSecret) {
            requestOptions.auth = {
              user: callbackAuthUser,
              pass: callbackAuthSecret,
            };
          }
          request(requestOptions).then((resp) => {
            // Ignore API response
            console.log(resp);
            return;
          }, (err) => {
            // Ignore API endpoint errors
            console.log(err);
            return;
          });
        }
      }
    }
  });
};

deviceHandlers.storeSpeedtestResult = function(device, result) {
  let randomString = parseInt(Math.random()*10000000).toString();
  let now = new Date();
  let formattedDate = '' + now.getDate();
  formattedDate += '/' + (now.getMonth()+1);
  formattedDate += '/' + now.getFullYear();
  formattedDate += ' ' + (''+now.getHours()).padStart(2, '0');
  formattedDate += ':' + (''+now.getMinutes()).padStart(2, '0');

  if (!result.downSpeed) {
    result.downSpeed = 'Error';
    device.last_speedtest_error.unique_id = randomString;
    device.last_speedtest_error.error = 'Error';
  } else if (result.downSpeed.includes('503 Server')) {
    result.downSpeed = 'Unavailable';
    device.last_speedtest_error.unique_id = randomString;
    device.last_speedtest_error.error = 'Unavailable';
  } else if (result.downSpeed.includes('Mbps')) {
    device.speedtest_results.push({
      down_speed: result.downSpeed,
      user: result.user,
      timestamp: formattedDate,
    });
    if (device.speedtest_results.length > 5) {
      device.speedtest_results.shift();
    }
    let permissions = DeviceVersion.findByVersion(
      device.version,
      device.wifi_is_5ghz_capable,
      device.model,
    );
    result.limit = permissions.grantSpeedTestLimit;
  } else {
    result.downSpeed = 'Error';
    device.last_speedtest_error.unique_id = randomString;
    device.last_speedtest_error.error = 'Error';
  }

  device.save();
  sio.anlixSendSpeedTestNotifications(device._id, result);
  console.log('Speedtest results for device ' +
    device._id + ' received successfully.');

  return {success: true, processed: 1};
};

module.exports = deviceHandlers;