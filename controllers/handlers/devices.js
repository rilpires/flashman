const Config = require('../../models/config');
const DeviceModel = require('../../models/device');
const DeviceVersion = require('../../models/device_version');
const sio = require('../../sio');
const util = require('./util');
const Mutex = require('async-mutex').Mutex;
const request = require('request-promise-native');

let mutex = new Mutex();
let mutexRelease = null;
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

deviceHandlers.syncUpdateScheduler = async function(mac) {
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
    let nextState = 'error';
    if (device.state === 'topology') {
      nextState = 'error_topology';
    }
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
          'state': nextState,
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

deviceHandlers.timeoutUpdateAck = function(mac, timeoutType) {
  let timeout;
  let targetStatus; // waiting status
  let errStatus; // timeout status
  let timeoutMsg;
  if (timeoutType === 'update') {
    // Default timeout is 3 minutes, enough time to download 16MB over a 1Mbps
    // connection, with enough breathing room
    timeout = 3*60*1000;
    targetStatus = 0;
    errStatus = 5;
    timeoutMsg = 'UPDATE: Did not receive update ack for MAC ' + mac;
    if (process.env.FLM_UPDATE_ACK_TIMEOUT_SECONDS) {
      timeout = parseInt(process.env.FLM_UPDATE_ACK_TIMEOUT_SECONDS) * 1000;
      if (isNaN(timeout)) {
        timeout = 3*60*1000; // just in case someone messes up the parameter
      }
    }
  } else if (timeoutType === 'onlinedevs') {
    // Default timeout is 25 seconds
    timeout = 25*1000;
    targetStatus = 20;
    errStatus = 6;
    timeoutMsg = 'UPDATE: Did not receive topology info for all devices in '+
    'mesh network of master with MAC ' + mac;
    if (process.env.FLM_TOPOLOGY_INFO_TIMEOUT_SECONDS) {
      timeout = parseInt(process.env.FLM_TOPOLOGY_INFO_TIMEOUT_SECONDS) * 1000;
      if (isNaN(timeout)) {
        timeout = 25*1000; // just in case someone messes up the parameter
      }
    }
  } else {
    console.log('Invalid timeout type');
    return;
  }
  setTimeout(()=>{
    DeviceModel.findById(mac, function(err, matchedDevice) {
      if (err || !matchedDevice) return;
      let permissions = DeviceVersion.findByVersion(
        matchedDevice.version,
        matchedDevice.wifi_is_5ghz_capable,
        matchedDevice.model,
      );
      if (timeoutType === 'update' && !permissions.grantUpdateAck) return;
      if (matchedDevice.do_update_status === targetStatus) {
        // Ack expected but not received after timeout - assume error and cancel
        console.log(timeoutMsg);
        matchedDevice.do_update_status = errStatus; // ack not received
        matchedDevice.save().catch((err) => {
          console.log('Error saving ack update status: ' + err);
        });
        // Sync with update scheduler to signal error for that update
        // TODO: Find a way to use the function in update_scheduler.js instead
        //       We have to use a local one here because of circular dependency
        if (matchedDevice.mesh_master) {
          // Slave routers call the function with their master's mac
          deviceHandlers.syncUpdateScheduler(matchedDevice.mesh_master);
        } else {
          deviceHandlers.syncUpdateScheduler(mac);
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
        masterDevice.save().catch((err) => {
          console.log('Error saving mesh slave remove operation: ' + err);
        });
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

// getting values for inform configurations for tr069 from Config.
const getOnlyTR069Configs = async function() {
  let configsWithTr069 = await Config.findOne({is_default: true}, 'tr069')
    .lean().exec()
    .catch((err) => err); // in case of error, return error in await.
  // it's very unlikely that we will incur in any error but,
  if (configsWithTr069.constructor === Error) { // if we returned an error.
    // print error message.
    console.log('Error when getting user config from database.'+
      '\nUsing default values for tr069 config.');
    return { // build a default configuration.
      inform_interval: 5*60*1000,
      offline_threshold: 1,
      recovery_threshold: 3,
    };
  } else { // if no error.
    return configsWithTr069.tr069; // get only tr069 config inside the document.
  }
};

// returns an object containing the tr069 time threshold used when defining
// device status (to give it a color). Will return an Error Object in case
// of any error.
deviceHandlers.buildTr069Thresholds = async function(currentTimestamp) {
  // in some places this function is called, the current time was not taken.
  currentTimestamp = currentTimestamp || Date.now();

  // getting user configured tr069 parameters.
  let tr069Config = await getOnlyTR069Configs();
  return { // thresholds for tr069 status classification.
    // time when devices are considered in recovery for tr069.
    recovery: new Date(currentTimestamp - (tr069Config.inform_interval*
      tr069Config.recovery_threshold)),
    // time when devices are considered offline for tr069.
    offline: new Date(currentTimestamp - (tr069Config.inform_interval*
      tr069Config.offline_threshold)),
  };
};

deviceHandlers.sendPingToTraps = function(id, results) {
  sio.anlixSendPingTestNotifications(id, results);
  // No await needed
  let query = {is_default: true};
  let projection = {traps_callbacks: true};
  Config.findOne(query, projection, function(err, matchedConfig) {
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
            'id': id,
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
            return;
          }, (err) => {
            // Ignore API endpoint errors
            return;
          });
        }
      }
    }
  });
};

deviceHandlers.storeSpeedtestResult = async function(device, result) {
  let randomString = parseInt(Math.random()*10000000).toString();
  let now = new Date();
  let formattedDate = '' + now.getDate();
  formattedDate += '/' + (now.getMonth()+1);
  formattedDate += '/' + now.getFullYear();
  formattedDate += ' ' + (''+now.getHours()).padStart(2, '0');
  formattedDate += ':' + (''+now.getMinutes()).padStart(2, '0');

  // This function should not have 2 running instances at the same time, since
  // async database access can lead to no longer valid reads after one instance
  // writes. This is necessary because mongo does not implement "table locks",
  // so we may end up marking the same device to update the speedresult array at
  // the same time.
  // And so, we use a mutex to lock instances outside database access scope.
  // In addition, we add a random sleep to spread out requests a bit.
  let interval = Math.random() * 500; // scale to seconds, cap at 500ms
  await new Promise((resolve) => setTimeout(resolve, interval));
  mutexRelease = await mutex.acquire();

  try {
    device = await DeviceModel.findById(device._id);
  } catch (e) {
    console.log('Error:', e);
    if (mutex.isLocked()) mutexRelease();
    return {success: false, processed: 0};
  }
  if (!device) {
    return {success: false, processed: 0};
  }

  if (result && result.downSpeed) {
    if (result.downSpeed.includes('503 Server')) {
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
    }
  } else {
    result = {downSpeed: 'Error'};
    device.last_speedtest_error.unique_id = randomString;
    device.last_speedtest_error.error = 'Error';
  }

  await device.save().catch((err) => {
    console.log('Error saving device speedtest: ' + err);
  });
  if (mutex.isLocked()) mutexRelease();

  sio.anlixSendSpeedTestNotifications(device._id, result);
  return {success: true, processed: 1};
};

module.exports = deviceHandlers;
