/* global __line */

const DeviceModel = require('../models/device');
const Config = require('../models/config');
const Role = require('../models/role');
const DeviceVersion = require('../models/device_version');
const mqtt = require('../mqtts');
const messaging = require('./messaging');
const deviceListController = require('./device_list');
const meshHandler = require('./handlers/mesh');
const deviceHandlers = require('./handlers/devices');
const util = require('./handlers/util');
const t = require('./language').i18next.t;

const csvParse = require('csvtojson');
const Mutex = require('async-mutex').Mutex;

const maxRetries = 3;
const maxDownloads = process.env.FLM_CONCURRENT_UPDATES_LIMIT;
let mutex = new Mutex();
let mutexRelease = null;
let watchdogIntervalID = null;
let scheduleController = {};

const returnStringOrEmptyStr = function(query) {
  if (typeof query === 'string' && query) {
    return query;
  } else {
    return '';
  }
};

const weekDayStrToInt = function(day) {
  if (day === t('Sunday')) return 0;
  if (day === t('Monday')) return 1;
  if (day === t('Tuesday')) return 2;
  if (day === t('Wednesday')) return 3;
  if (day === t('Thursday')) return 4;
  if (day === t('Friday')) return 5;
  if (day === t('Saturday')) return 6;
  return -1;
};

const weekDayCompare = function(foo, bar) {
  // Returns like C strcmp: 0 if equal, -1 if foo < bar, 1 if foo > bar
  if (foo.day > bar.day) return 1;
  if (foo.day < bar.day) return -1;
  if (foo.hour > bar.hour) return 1;
  if (foo.hour < bar.hour) return -1;
  if (foo.minute > bar.minute) return 1;
  if (foo.minute < bar.minute) return -1;
  return 0;
};

const checkValidRange = function(config) {
  let now = new Date();
  now = {
    day: now.getDay(),
    hour: now.getHours(),
    minute: now.getMinutes(),
  };
  if (!config.device_update_schedule.used_time_range) return true;
  return config.device_update_schedule.allowed_time_ranges.reduce((v, r)=>{
    if (v) return true;
    let start = {
      day: r.start_day,
      hour: parseInt(r.start_time.substring(0, 2)),
      minute: parseInt(r.start_time.substring(3, 5)),
    };
    let end = {
      day: r.end_day,
      hour: parseInt(r.end_time.substring(0, 2)),
      minute: parseInt(r.end_time.substring(3, 5)),
    };
    if (weekDayCompare(now, start) === 0 || weekDayCompare(now, end) === 0) {
      // Now is equal to either extreme, validate as true
      return true;
    }
    if (weekDayCompare(now, start) > 0) {
      // Now ahead of start
      if (weekDayCompare(end, start) > 0) {
        // End ahead of start, now must be before end
        return (weekDayCompare(now, end) < 0);
      } else {
        // End behind start, always valid
        return true;
      }
    } else {
      // Now behind start
      if (weekDayCompare(end, start) > 0) {
        // End ahead of start, never valid
        return false;
      } else {
        // End behind start, now must be before end
        return (weekDayCompare(now, end) < 0);
      }
    }
  }, false);
};

const scheduleOfflineWatchdog = function() {
  // Check for update slots every minute
  const interval = 1*60*1000;
  if (watchdogIntervalID) return;
  /*
  set interval call a anonymous function that call a single async function,
  so isn't necessary await
  */
  watchdogIntervalID = setInterval(
  () => markSeveral(),
  interval);
};

const removeOfflineWatchdog = function() {
  // Clear interval if set
  if (watchdogIntervalID) {
    clearInterval(watchdogIntervalID);
    watchdogIntervalID = null;
  }
};

const resetMutex = function() {
  if (mutex.isLocked()) mutexRelease();
};

const getConfig = async function(lean=true, needActive=true) {
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

const getDevice = async function(mac, lean=false) {
  let device = null;
  const projection = {
    lan_devices: false, port_mapping: false, ap_survey: false,
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

const configQuery = function(setQuery, pullQuery, pushQuery) {
  let query = {};
  if (setQuery) query ['$set'] = setQuery;
  if (pullQuery) query ['$pull'] = pullQuery;
  if (pushQuery) query ['$push'] = pushQuery;
  return Config.updateOne({'is_default': true}, query);
};

const markSeveral = async function() {
  let config = await getConfig();
  if (!config) return; // this should never happen
  let inProgress =
    config.device_update_schedule.rule.in_progress_devices.length;
  let slotsAvailable = maxDownloads - inProgress;
  for (let i = 0; i < slotsAvailable; i++) {
    let result = await markNextForUpdate();
    if (!result.success) {
      return;
    } else if (result.success && !result.marked) {
      break;
    }
  }
};

scheduleController.recoverFromOffline = async function(config) {
  // Move those in doing status downloading back to to_do
  let rule = config.device_update_schedule.rule;
  let pullArray = rule.in_progress_devices.filter((d)=>d.state==='downloading');
  pullArray = pullArray.map((d)=>d.mac.toUpperCase());
  let pushArray = pullArray.map((mac)=>{
    return {mac: mac, state: 'update', retry_count: 0};
  });
  await configQuery(
    null,
    {'device_update_schedule.rule.in_progress_devices': {
      'mac': {'$in': pullArray},
    }},
    {'device_update_schedule.rule.to_do_devices': {'$each': pushArray}},
  );
  // Mark next for updates after 5 minutes - we leave time for mqtt to return
  setTimeout(async function() {
    await markSeveral();
    scheduleOfflineWatchdog();
  }, 5*60*1000);
};

const markNextForUpdate = async function() {
  // This function should not have 2 running instances at the same time, since
  // async database access can lead to no longer valid reads after one instance
  // writes. This is necessary because mongo does not implement "table locks",
  // so we may end up marking the same device to update twice, as 2 reads before
  // the first write will yield the same device as a result of this function.
  // And so, we use a mutex to lock instances outside database access scope.
  // In addition, we add a random sleep to spread out requests a bit.
  let interval = Math.random() * 500; // scale to seconds, cap at 500ms
  await new Promise((resolve) => setTimeout(resolve, interval));
  mutexRelease = await mutex.acquire();
  let config = await getConfig();
  if (!config) {
    mutexRelease();
    console.log('Scheduler: No active schedule found');
    return {success: false,
            error: t('noSchedulingActive', {errorline: __line})};
  } else if (config.is_aborted) {
    mutexRelease();
    console.log('Scheduler: Schedule aborted');
    return {success: true, marked: false};
  }
  // Check if we are in a valid date range before doing DB operations
  if (!checkValidRange(config)) {
    mutexRelease();
    console.log('Scheduler: Invalid time range');
    return {success: true, marked: false};
  }
  let devices = config.device_update_schedule.rule.to_do_devices;
  if (devices.length === 0) {
    mutexRelease();
    console.log('Scheduler: No devices to update');
    return {success: true, marked: false};
  }
  let nextDevice = null;

  for (let i = 0; i < devices.length; i++) {
    const isDevOn = Object.values(mqtt.unifiedClientsMap).some((map)=>{
      return map[devices[i].mac];
    });
    if (isDevOn) {
      nextDevice = devices[i];
      break;
    }
  }
  if (!nextDevice) {
    // No online devices, mark them all as offline
    try {
      await configQuery({
        'device_update_schedule.rule.to_do_devices.$[].state': 'offline',
      }, null, null);
    } catch (err) {
      console.log(err);
    }
    mutexRelease();
    console.log('Scheduler: No online devices to update');
    return {success: true, marked: false};
  }
  try {
    let device = await getDevice(nextDevice.mac);
    device.release = config.device_update_schedule.rule.release;
    if (nextDevice.slave_count) {
      let nextState;
      const isV1ToV2 = (device.mesh_current === 1 && device.mesh_upgrade === 2);
      if (isV1ToV2) {
        // If this is mesh v1 -> v2 upgrade we need the topology
        nextState = 'v1tov2';
      } else {
        // all other cases can change to download step
        nextState = 'downloading';
      }
      await configQuery(
        null,
        // Remove from to do state
        {'device_update_schedule.rule.to_do_devices': {'mac': nextDevice.mac}},
        // Add to in progress, status topology
        {
          'device_update_schedule.rule.in_progress_devices': {
            'mac': nextDevice.mac,
            'state': nextState,
            'retry_count': nextDevice.retry_count,
            'slave_count': nextDevice.slave_count,
            'slave_updates_remaining': nextDevice.slave_count + 1,
            'mesh_current': nextDevice.mesh_current,
            'mesh_upgrade': nextDevice.mesh_upgrade,
          },
        },
      );
      mutexRelease();
      console.log(
        'Scheduler: Mesh update scheduled for MAC ' + nextDevice.mac,
      );
      const meshUpdateStatus = await meshHandler.beginMeshUpdate(
        device,
      );
      if (!meshUpdateStatus.success) {
        throw new Error(t('updateStartFailedMeshNetwork'));
      }
    } else {
      await configQuery(
        null,
        // Remove from to do state
        {'device_update_schedule.rule.to_do_devices': {'mac': nextDevice.mac}},
        // Add to in progress, status downloading
        {
          'device_update_schedule.rule.in_progress_devices': {
            'mac': nextDevice.mac,
            'state': 'downloading',
            'retry_count': nextDevice.retry_count,
            'slave_count': nextDevice.slave_count,
            'slave_updates_remaining': nextDevice.slave_count + 1,
            'mesh_current': nextDevice.mesh_current,
            'mesh_upgrade': nextDevice.mesh_upgrade,
          },
        },
      );
      mutexRelease();
      console.log('Scheduler: agendado update MAC ' + nextDevice.mac);
      // Mark device for update
      device.do_update = true;
      device.do_update_status = 0;
      await device.save();
      messaging.sendUpdateMessage(device);
      mqtt.anlixMessageRouterUpdate(device._id);
      // Start ack timeout
      deviceHandlers.timeoutUpdateAck(device._id, 'update');
    }
  } catch (err) {
    console.log(err.message ? err.message : err);
    mutexRelease();
    return {success: false, error: t('saveError', {errorline: __line})};
  }
  return {success: true, marked: true};
};

scheduleController.initialize = async function(
  macList, slaveCountPerMac, currentMeshVerPerMac, upgradeMeshVerPerMac,
) {
  let config = await getConfig();
  if (!config) {
    return {success: false, error: t('noSchedulingActive',
                                     {errorline: __line})};
  }
  let devices = macList.map((mac)=>{
    return {
      mac: mac.toUpperCase(),
      state: 'update',
      slave_count: slaveCountPerMac[mac],
      retry_count: 0,
      mesh_current: currentMeshVerPerMac[mac],
      mesh_upgrade: upgradeMeshVerPerMac[mac],
    };
  });
  try {
    await configQuery(
      {
        'device_update_schedule.rule.to_do_devices': devices,
        'device_update_schedule.rule.in_progress_devices': [],
        'device_update_schedule.rule.done_devices': [],
      },
      null,
      null,
    );
    for (let i = 0; i < maxDownloads; i++) {
      let result = await markNextForUpdate();
      if (!result.success) {
        return {success: false, error: result.error};
      } else if (result.success && !result.marked) {
        break;
      }
    }
  } catch (err) {
    console.log(err);
    return {success: false, error: t('saveError', {errorline: __line})};
  }
  scheduleOfflineWatchdog();
  return {success: true};
};

scheduleController.successUpdate = async function(mac) {
  let config = await getConfig();
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
      await configQuery(
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
    removeOfflineWatchdog();
  }
  return {success: true};
};

scheduleController.failedDownload = async function(mac, slave='') {
  let config = await getConfig();
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
        removeOfflineWatchdog();
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
      if (slave) {
        meshHandler.updateMeshDevice(slave, fieldsToUpdate);
      } else {
        meshHandler.updateMeshDevice(mac, fieldsToUpdate);
      }
      return {success: true};
    }
    await configQuery(setQuery, pullQuery, pushQuery);
  } catch (err) {
    console.log(err);
    return {success: false, error: t('saveError', {errorline: __line})};
  }
  return {success: true};
};

scheduleController.abortSchedule = async function(req, res) {
  let config = await getConfig();
  if (!config) {
    return res.status(500).json({
      success: false, error: t('noSchedulingActive', {errorline: __line})});
  }
  // Mark scheduled update as aborted - separately to mitigate racing conditions
  if (config.device_update_schedule.is_aborted) {
    return res.status(500).json({success: false,
      error: t('schedulingAlreadyAborted', {errorline: __line})});
  }
  try {
    await configQuery({'device_update_schedule.is_aborted': true}, null, null);
    // Mark all todo devices as aborted
    let rule = config.device_update_schedule.rule;
    let pushArray = rule.to_do_devices.map((d)=>{
      let state = 'aborted' + ((d.state === 'offline') ? '_off' : '');
      return {
        mac: d.mac,
        state: state,
        slave_count: d.slave_count,
        slave_updates_remaining: d.slave_updates_remaining,
        mesh_current: d.mesh_current,
        mesh_upgrade: d.mesh_upgrade,
      };
    });
    rule.in_progress_devices.forEach((d)=>{
      let stateSuffix = '_update';
      if (d.state === 'downloading') {
        stateSuffix = '_down';
      } else if (d.state === 'v1tov2') {
        stateSuffix = '_v1tov2';
      }
      let state = 'aborted' + stateSuffix;
      pushArray.push({
        mac: d.mac,
        state: state,
        slave_count: d.slave_count,
        slave_updates_remaining: d.slave_updates_remaining,
        mesh_current: d.mesh_current,
        mesh_upgrade: d.mesh_upgrade,
      });
    });
    // Avoid repeated entries by rare race conditions
    pushArray = pushArray.filter((item, idx) => {
      return pushArray.indexOf(item) === idx;
    });
    let setQuery = {
      'device_update_schedule.is_active': false,
      'device_update_schedule.rule.to_do_devices': [],
      'device_update_schedule.rule.in_progress_devices': [],
    };
    await configQuery(
      setQuery,
      null,
      {'device_update_schedule.rule.done_devices': {'$each': pushArray}},
    );
    rule.in_progress_devices.forEach(async (d) => {
      let device = await getDevice(d.mac);
      await meshHandler.syncUpdateCancel(device, 4);
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: t('saveError', {errorline: __line}),
    });
  }
  removeOfflineWatchdog();
  resetMutex();
  return res.status(200).json({
    success: true,
  });
};

scheduleController.getDevicesReleases = async function(req, res) {
  let useCsv = (req.body.use_csv === 'true');
  let useAllDevices = (req.body.use_all === 'true');
  let pageNumber = parseInt(req.body.page_num);
  let pageCount = parseInt(req.body.page_count);
  let queryContents = req.body.filter_list.split(',');

  const userRole = await Role.findOne(
    {name: util.returnObjOrEmptyStr(req.user.role)});

  let finalQuery = null;
  let deviceList = [];
  const deviceProjection = {
    _id: true,
    mesh_master: true,
    mesh_slaves: true,
    model: true,
    use_tr069: true,
    version: true,
    wifi_is_5ghz_capable: true,
    acs_id: true,
  };

  if (!useCsv) {
    finalQuery = await deviceListController.complexSearchDeviceQuery(
     queryContents);
  } else {
    try {
      let csvContents =
        await csvParse({noheader: true}).fromFile('./tmp/massUpdate.csv');
      if (csvContents) {
        let promises = csvContents.map(async (line) => {
          if (!line.field1.match(util.macRegex)) {
            return null;
          } else {
            let device = await getDevice(line.field1, true);
            return device;
          }
        });
        let values = await Promise.all(promises);
        deviceList = values.filter((value)=>value!==null);
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: t('errorProcessingFile', {errorline: __line}),
      });
    }
  }

  let queryPromise = null;
  if (useCsv) {
    queryPromise = Promise.resolve(deviceList);
  } else if (useAllDevices) {
    queryPromise = DeviceModel.find(finalQuery, deviceProjection).lean();
  } else {
    queryPromise = DeviceModel.paginate(finalQuery, {
      page: pageNumber,
      limit: pageCount,
      projection: deviceProjection,
      lean: true,
    });
  }
  queryPromise.then((matchedDevices)=>{
    deviceListController.getReleases(userRole, req.user.is_superuser, true)
    .then(function(releasesAvailable) {
      let devicesByModel = {};
      let meshNetworks = [];
      let onuCount = 0;
      let totalCount = 0;
      let releaseInfo = [];
      if (!useCsv && !useAllDevices) matchedDevices = matchedDevices.docs;
      meshHandler.enhanceSearchResult(matchedDevices)
        .then(async (extraDevices) => {
        matchedDevices = matchedDevices.concat(extraDevices);
        for (let i=0; i<matchedDevices.length; i++) {
          let device = matchedDevices[i];
          totalCount += 1;
          let model = device.model.replace('N/', '');
          if (device.use_tr069) {
            onuCount += 1 + (device.mesh_slaves ?
              device.mesh_slaves.length : 0);
          } else if (!device.mesh_master && !(device.mesh_slaves
            && device.mesh_slaves.length > 0)) {
            // not a mesh device
            if (!devicesByModel[model]) {
              devicesByModel[model] = 1;
            } else {
              devicesByModel[model] += 1;
            }
          } else if (device.mesh_slaves && device.mesh_slaves.length > 0) {
            const allowUpgrade = deviceHandlers.isUpgradePossible(device,
                                                                  '0.32.0');
            const meshVersion =
              DeviceVersion.versionCompare(device.version, '0.32.0') < 0 ?
              1 : 2;
            let models = [];
            models.push(model);
            for (let i = 0; i < device.mesh_slaves.length; i++) {
              let slaveDevice = matchedDevices.find(
                (d) => d._id === device.mesh_slaves[i],
              );
              if (slaveDevice && ('model' in slaveDevice)) {
                let slaveModel = slaveDevice.model.replace('N/', '');
                if (!models.includes(slaveModel)) {
                  models.push(slaveModel);
                }
              }
            }
            meshNetworks.push({
              deviceCount: 1 + device.mesh_slaves.length,
              version: meshVersion,
              models: models,
              allowMeshV2: allowUpgrade,
            });
          }
        }
        releasesAvailable.forEach((release)=>{
          let count = 0;
          let meshIncompatibles = 0;
          let meshRolesIncompatibles = 0;
          let missingModels = [];
          const validModels = release.model;
          if (devicesByModel && Object.keys(devicesByModel).length) {
            Object.keys(devicesByModel).forEach(function eachKey(model) {
              if (validModels.includes(model)) {
                count += devicesByModel[model];
              } else {
                missingModels.push(model);
              }
            });
          }
          const releaseMeshVersion =
            DeviceVersion.versionCompare(release.flashbox_version, '0.32.0')
            < 0 ? 1 : 2;
          meshNetworks.forEach((mesh)=>{
            if (mesh.version > releaseMeshVersion) {
              // mesh v2 -> v1
              meshIncompatibles += mesh.deviceCount;
              return;
            }
            if (mesh.version < releaseMeshVersion) {
              // mesh v1 -> v2
              if (!mesh.allowMeshV2) {
                /*
                  we only allow mesh v1 -> v2 upgrade if mesh v1 master
                  is compatible as master in v2 and all slaves in mesh v1
                  are compatible as slaves in v2
                */
                meshRolesIncompatibles += mesh.deviceCount;
                return;
              }
            }
            let allModelsOK = true;
            for (let i=0; i<mesh.models.length; i++) {
              if (!validModels.includes(mesh.models[i])) {
                // if one of the slaves can't upgrade then none of the devices
                // in the mesh network will be allowed to upgrade
                allModelsOK = false;
                if (!missingModels.includes(mesh.models[i])) {
                  missingModels.push(mesh.models[i]);
                }
                break;
              }
            }
            if (allModelsOK) count += mesh.deviceCount;
          });
          releaseInfo.push({
            id: release.id,
            count: count,
            meshIncompatibles: meshIncompatibles,
            meshRolesIncompatibles: meshRolesIncompatibles,
            missingModels: missingModels,
          });
        });
        return res.status(200).json({
          success: true,
          onuCount: onuCount,
          totalCount: totalCount,
          releaseInfo: releaseInfo,
        });
      });
    });
  }, (err)=>{
    console.log(err);
    return res.status(500).json({
      success: false,
      message: t('serverError', {errorline: __line}),
    });
  });
};

scheduleController.uploadDevicesFile = function(req, res) {
  if (!req.files) {
    return res.status(500).json({
      success: false,
      message: t('noFileSent', {errorline: __line}),
    });
  }
  let csvFile = req.files.schedulefile;

  csvFile.mv('./tmp/massUpdate.csv', (err)=>{
    if (err) {
      return res.status(500).json({
        success: false,
        message: t('errorMovingFile', {errorline: __line}),
      });
    }
    csvParse({noheader: true}).fromFile('./tmp/massUpdate.csv').then((result)=>{
      let promises = result.map(async (line) => {
        if (!line.field1.match(util.macRegex)) {
          return 0;
        } else if (await getDevice(line.field1, true) !== null) {
          return 1;
        } else {
          return 0;
        }
      });
      Promise.all(promises).then((values)=>{
        return res.status(200).json({
          success: true,
          result: values.reduce((a, b)=>a+b, 0),
        });
      });
    });
  });
};

scheduleController.startSchedule = async function(req, res) {
  let searchTags = returnStringOrEmptyStr(req.body.use_search);
  let useCsv = (req.body.use_csv === 'true');
  let useAllDevices = (req.body.use_all === 'true');
  let hasTimeRestriction = (req.body.use_time_restriction === 'true');
  let release = returnStringOrEmptyStr(req.body.release);
  let pageNumber = parseInt(req.body.page_num);
  let pageCount = parseInt(req.body.page_count);
  let timeRestrictions = JSON.parse(req.body.time_restriction);
  let queryContents = req.body.filter_list.split(',');

  let finalQuery = null;
  let deviceList = [];

  const userRole = await Role.findOne(
    {name: util.returnObjOrEmptyStr(req.user.role)});

  if (!useCsv) {
    finalQuery = await deviceListController.complexSearchDeviceQuery(
     queryContents);
  } else {
    try {
      let csvContents =
        await csvParse({noheader: true}).fromFile('./tmp/massUpdate.csv');
      if (csvContents) {
        let promises = csvContents.map(async (line) => {
          if (!line.field1.match(util.macRegex)) {
            return null;
          } else {
            let device = await getDevice(line.field1, true);
            return device;
          }
        });
        let values = await Promise.all(promises);
        deviceList = values.filter((value)=>value!==null);
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: t('errorProcessingFile', {errorline: __line}),
      });
    }
  }

  let queryPromise = null;
  if (useCsv) {
    queryPromise = Promise.resolve(deviceList);
  } else if (useAllDevices) {
    queryPromise = DeviceModel.find(finalQuery).lean();
  } else {
    queryPromise = DeviceModel.paginate(finalQuery, {
      page: pageNumber,
      limit: pageCount,
      lean: true,
    });
  }

  queryPromise.then((matchedDevices) => {
    // Get valid models for this release
    deviceListController.getReleases(userRole, req.user.is_superuser, true)
    .then(async function(releasesAvailable) {
      let matchedRelease = releasesAvailable.find((r) => r.id === release);
      if (!matchedRelease) {
        return res.status(500).json({
          success: false,
          message: t('parametersError', {errorline: __line}),
        });
      }
      let modelsAvailable = matchedRelease.model;
      // Filter devices that have a valid model
      if (!useCsv && !useAllDevices) matchedDevices = matchedDevices.docs;
      let extraDevices = await meshHandler.enhanceSearchResult(matchedDevices);
      matchedDevices = matchedDevices.concat(extraDevices);
      matchedDevices = matchedDevices.filter((device)=>{
        if (device.use_tr069) return false; // Discard TR-069 devices
        if (device.mesh_master) return false; // Discard mesh slaves
        if (device.mesh_slaves && device.mesh_slaves.length > 0) {
          // Discard master if any slave has incompatible model
          let valid = true;
          device.mesh_slaves.forEach((slave)=>{
            if (!valid) return;
            let slaveDevice = matchedDevices.find((d)=>d._id===slave);
            let slaveModel = slaveDevice.model.replace('N/', '');
            valid = modelsAvailable.includes(slaveModel);
            const allowMeshUpgrade = deviceHandlers.isUpgradePossible(
              slaveDevice, matchedRelease.flashbox_version);
            if (!allowMeshUpgrade) valid = false;
          });
          if (!valid) return false;
        }
        const allowMeshUpgrade = deviceHandlers.isUpgradePossible(
          device, matchedRelease.flashbox_version);
        if (!allowMeshUpgrade) return false;
        let model = device.model.replace('N/', '');
        /* below return is true if array of strings contains model name
           inside any of its strings, where each string is a concatenation of
           both model name and version. */
        return modelsAvailable.some(
          (modelAndVersion) => modelAndVersion.includes(model));
      });
      if (matchedDevices.length === 0) {
        return res.status(500).json({
          success: false,
          message: t('parametersErrorNoCpe', {errorline: __line}),
        });
      }
      let slaveCount = {};
      let currentMeshVersion = {};
      let upgradeMeshVersion = {};
      let macList = matchedDevices.map((device)=>{
        if (device.mesh_slaves && device.mesh_slaves.length > 0) {
          slaveCount[device._id] = device.mesh_slaves.length;
        } else {
          slaveCount[device._id] = 0;
        }
        const typeUpgrade = DeviceVersion.mapFirmwareUpgradeMesh(
          device.version, matchedRelease.flashbox_version);
        currentMeshVersion[device._id] = typeUpgrade.current;
        upgradeMeshVersion[device._id] = typeUpgrade.upgrade;
        return device._id;
      });
      // Save scheduler configs to database
      let config = null;
      try {
        config = await getConfig(false, false);
        config.device_update_schedule.is_active = true;
        config.device_update_schedule.is_aborted = false;
        config.device_update_schedule.used_time_range = hasTimeRestriction;
        config.device_update_schedule.used_csv = useCsv;
        config.device_update_schedule.used_search = searchTags;
        config.device_update_schedule.device_count = macList.length;
        config.device_update_schedule.date = Date.now();
        if (hasTimeRestriction) {
          let valid = timeRestrictions.filter((r)=>{
            let startDay = weekDayStrToInt(r.startWeekday);
            let endDay = weekDayStrToInt(r.endWeekday);
            if (startDay < 0) return false;
            if (endDay < 0) return false;
            if (!r.startTime.match(util.hourRegex)) return false;
            if (!r.endTime.match(util.hourRegex)) return false;
            if (startDay === endDay && r.startTime === r.endTime) return false;
            return true;
          });
          if (valid.length === 0) {
            return res.status(500).json({
              success: false,
              message: t('parametersErrorTimeRangesInvalid',
                {errorline: __line}),
            });
          }
          config.device_update_schedule.allowed_time_ranges = valid.map((r)=>{
            return {
              start_day: weekDayStrToInt(r.startWeekday),
              end_day: weekDayStrToInt(r.endWeekday),
              start_time: r.startTime,
              end_time: r.endTime,
            };
          });
        } else {
          config.device_update_schedule.allowed_time_ranges = [];
        }
        config.device_update_schedule.rule.release = release;
        await config.save();
      } catch (err) {
        console.log(err);
        return res.status(500).json({
          success: false,
          message: t('serverError', {errorline: __line}),
        });
      }
      // Start updating
      let result = await scheduleController.initialize(
        macList, slaveCount, currentMeshVersion, upgradeMeshVersion,
      );
      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
        });
      }
      return res.status(200).json({
        success: true,
      });
    });
  }, (err)=>{
    console.log(err);
    return res.status(500).json({
      success: false,
      message: t('serverError', {errorline: __line}),
    });
  });
};

scheduleController.updateScheduleStatus = async function(req, res) {
  let config = await getConfig(true, false);
  if (!config) {
    return res.status(500).json({
      message: t('noSchedulingRegistered', {errorline: __line}),
    });
  }
  let rule = config.device_update_schedule.rule;
  let todo = rule.to_do_devices.length;
  let inProgress = rule.in_progress_devices.length;
  let doneList = rule.done_devices.filter((d)=>d.state==='ok');
  let done = doneList.length;
  let errorList = rule.done_devices.filter((d)=>d.state!=='ok');
  let error = errorList.length;
  rule.to_do_devices.forEach((d)=>{
    if (d.slave_count > 0) {
      todo += d.slave_count;
    }
  });
  rule.in_progress_devices.forEach((d)=>{
    if (d.slave_count > 0) {
      inProgress += d.slave_count;
    }
  });
  doneList.forEach((d)=>{
    if (d.slave_count > 0) {
      done += d.slave_count;
    }
  });
  errorList.forEach((d)=>{
    if (d.slave_count > 0) {
      error += d.slave_count;
    }
  });
  return res.status(200).json({
    total: todo + inProgress + done + error,
    todo: todo + inProgress,
    doing: rule.in_progress_devices.length > 0,
    done: done,
    error: error,
  });
};

const translateState = function(state) {
  if (state === 'update') return t('waitingUpdate');
  if (state === 'retry') return t('waitingUpdate');
  if (state === 'offline') return t('cpeOffline');
  if (state === 'downloading') return t('downloadingFirmware');
  if (state === 'updating') return t('updatingCpe');
  if (state === 'ok') return t('updatedSuccessfully');
  if (state === 'error') return t('errorDuringUpdate');
  if (state === 'aborted') return t('updateAborted');
  if (state === 'aborted_off') {
    return t('updateAbortedCpeOffline');
  }
  if (state === 'aborted_down') {
    return t('updateAbortedCpeDownloadingFirmware');
  }
  if (state === 'aborted_update') {
    return t('updateAbortedCpeUpdating');
  }
  if (state === 'aborted_v1tov2') {
    return t('updateAbortedUpdatingMeshOldToNew');
  }
  return t('unknownStatus');
};

scheduleController.scheduleResult = async function(req, res) {
  let config = await getConfig(true, false);
  if (!config) {
    return res.status(500).json({
      message: t('noSchedulingRegistered', {errorline: __line}),
    });
  }
  let csvData = '';
  let rule = config.device_update_schedule.rule;
  rule.to_do_devices.forEach((d)=>{
    csvData += d.mac + ',' + translateState(d.state) + '\n';
  });
  rule.in_progress_devices.forEach((d)=>{
    let state = translateState(d.state);
    if ((d.state === 'updating' || d.state === 'downloading') &&
      d.slave_count > 0) {
      let current = d.slave_count + 1 - d.slave_updates_remaining;
      state += ' '+t('xOfY', {x: current, y: d.slave_count + 1});
    }
    csvData += `${d.mac},${state}\n`;
  });
  rule.done_devices.forEach((d)=>{
    let state = translateState(d.state);
    if (d.slave_count > 0) {
      let current = d.slave_count - d.slave_updates_remaining + 1;
      if (d.state === 'error') {
        state += ' '+t('ofCpeXOfY', {x: current, y: d.slave_count + 1});
      } else if (d.state === 'aborted_update' || d.state === 'aborted_down') {
        state += ' '+t('xOfY', {x: current, y: d.slave_count + 1});
      }
    }
    csvData += `${d.mac},${state}\n`;
  });
  res.set('Content-Disposition', `attachment; filename=${t('scheduling')}.csv`);
  res.set('Content-Type', 'text/csv');
  res.status(200).send(csvData);
};

module.exports = scheduleController;
