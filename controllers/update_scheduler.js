const DeviceModel = require('../models/device');
const Config = require('../models/config');
const Role = require('../models/role');
const mqtt = require('../mqtts');
const messaging = require('./messaging');
const deviceListController = require('./device_list');
const meshHandler = require('./handlers/mesh');
const deviceHandlers = require('./handlers/devices');
const util = require('./handlers/util');

const csvParse = require('csvtojson');
const Mutex = require('async-mutex').Mutex;
const async = require('asyncawait/async');
const await = require('asyncawait/await');

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
  if (day === 'Domingo') return 0;
  if (day === 'Segunda') return 1;
  if (day === 'Terça') return 2;
  if (day === 'Quarta') return 3;
  if (day === 'Quinta') return 4;
  if (day === 'Sexta') return 5;
  if (day === 'Sábado') return 6;
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
  watchdogIntervalID = setInterval(async(()=>markSeveral()), interval);
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

const getConfig = async(function(lean=true, needActive=true) {
  let config = null;
  try {
    if (lean) {
      config = await(Config.findOne({is_default: true}).lean());
    } else {
      config = await(Config.findOne({is_default: true}));
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
});

const getDevice = async(function(mac, lean=false) {
  let device = null;
  try {
    if (lean) {
      device = await(DeviceModel.findById(mac.toUpperCase()).lean());
    } else {
      device = await(DeviceModel.findById(mac.toUpperCase()));
    }
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
  if (pushQuery) query ['$push'] = pushQuery;
  return Config.updateOne({'is_default': true}, query);
};

const markSeveral = async(function() {
  let config = await(getConfig());
  if (!config) return; // this should never happen
  let inProgress = config.device_update_schedule.rule.in_progress_devices.length;
  let slotsAvailable = maxDownloads - inProgress;
  for (let i = 0; i < slotsAvailable; i++) {
    let result = await(markNextForUpdate());
    if (!result.success) {
      return;
    } else if (result.success && !result.marked) {
      break;
    }
  }
});

scheduleController.recoverFromOffline = async(function(config) {
  // Move those in doing status downloading back to to_do
  let rule = config.device_update_schedule.rule;
  let pullArray = rule.in_progress_devices.filter((d)=>d.state==='downloading');
  pullArray = pullArray.map((d)=>d.mac.toUpperCase());
  let pushArray = pullArray.map((mac)=>{
    return {mac: mac, state: 'update', retry_count: 0};
  });
  await(configQuery(
    null,
    {'device_update_schedule.rule.in_progress_devices': {
      'mac': {'$in': pullArray},
    }},
    {'device_update_schedule.rule.to_do_devices': {'$each': pushArray}}
  ));
  // Mark next for updates after 5 minutes - we leave time for mqtt to return
  setTimeout(async(function() {
    await(markSeveral());
    scheduleOfflineWatchdog();
  }), 5*60*1000);
});

const markNextForUpdate = async(function() {
  // This function should not have 2 running instances at the same time, since
  // async database access can lead to no longer valid reads after one instance
  // writes. This is necessary because mongo does not implement "table locks",
  // so we may end up marking the same device to update twice, as 2 reads before
  // the first write will yield the same device as a result of this function.
  // And so, we use a mutex to lock instances outside database access scope.
  // In addition, we add a random sleep to spread out requests a bit.
  let interval = Math.random() * 500; // scale to seconds, cap at 500ms
  await(new Promise((resolve)=>setTimeout(resolve, interval)));
  mutexRelease = await(mutex.acquire());
  let config = await(getConfig());
  if (!config) {
    mutexRelease();
    console.log('Scheduler: não há um agendamento');
    return {success: false, error: 'Não há um agendamento ativo'};
  } else if (config.is_aborted) {
    mutexRelease();
    console.log('Scheduler: agendamento abortado');
    return {success: true, marked: false};
  }
  // Check if we are in a valid date range before doing DB operations
  if (!checkValidRange(config)) {
    mutexRelease();
    console.log('Scheduler: fora do horário válido');
    return {success: true, marked: false};
  }
  let devices = config.device_update_schedule.rule.to_do_devices;
  if (devices.length === 0) {
    mutexRelease();
    console.log('Scheduler: não há dispositivos para atualizar');
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
      await(configQuery({
        'device_update_schedule.rule.to_do_devices.$[].state': 'offline',
      }, null, null));
    } catch (err) {
      console.log(err);
    }
    mutexRelease();
    console.log('Scheduler: não há dispositivos online');
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
          'slave_count': nextDevice.slave_count,
          'slave_updates_remaining': nextDevice.slave_count,
        },
      }
    ));
    mutexRelease();
    console.log('Scheduler: agendado update MAC ' + nextDevice.mac);
  } catch (err) {
    console.log(err);
    mutexRelease();
    return {success: false, error: 'Erro alterando base de dados'};
  }
  try {
    // Mark device for update
    let device = await(getDevice(nextDevice.mac));
    device.do_update = true;
    device.do_update_status = 0;
    device.release = config.device_update_schedule.rule.release;
    await(device.save());
    messaging.sendUpdateMessage(device);
    mqtt.anlixMessageRouterUpdate(device._id);
    // Start ack timeout
    deviceHandlers.timeoutUpdateAck(device._id);
  } catch (err) {
    console.log(err);
    return {success: false, error: 'Erro alterando base de dados'};
  }
  return {success: true, marked: true};
});

scheduleController.initialize = async(function(macList, slaveCountPerMac) {
  let config = await(getConfig());
  if (!config) return {success: false, error: 'Não há um agendamento ativo'};
  let devices = macList.map((mac)=>{
    return {
      mac: mac.toUpperCase(),
      state: 'update',
      slave_count: slaveCountPerMac[mac],
      retry_count: 0,
    };
  });
  try {
    await(configQuery(
      {
        'device_update_schedule.rule.to_do_devices': devices,
        'device_update_schedule.rule.in_progress_devices': [],
        'device_update_schedule.rule.done_devices': [],
      },
      null,
      null,
    ));
    for (let i = 0; i < maxDownloads; i++) {
      let result = await(markNextForUpdate());
      if (!result.success) {
        return {success: false, error: result.error};
      } else if (result.success && !result.marked) {
        break;
      }
    }
  } catch (err) {
    console.log(err);
    return {success: false, error: 'Erro alterando base de dados'};
  }
  scheduleOfflineWatchdog();
  return {success: true};
});

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
  return {success: true};
});

scheduleController.successUpdate = async(function(mac) {
  let config = await(getConfig());
  if (!config) return {success: false, error: 'Não há um agendamento ativo'};
  let count = config.device_update_schedule.device_count;
  let rule = config.device_update_schedule.rule;
  let device = rule.in_progress_devices.find((d)=>d.mac === mac);
  if (!device) return {success: false, error: 'MAC não encontrado'};
  // Change from status updating to ok
  try {
    if (device.slave_updates_remaining > 0 && device.state !== 'slave') {
      // This is a mesh master, simply update status to "slave" and reset retry
      // Mesh handler will properly propagate update to next slave
      await(Config.updateOne({
        'is_default': true,
        'device_update_schedule.rule.in_progress_devices.mac': mac,
      }, {
        '$set': {
          'device_update_schedule.rule.in_progress_devices.$.state': 'slave',
          'device_update_schedule.rule.in_progress_devices.$.retry_count': 0,
        },
      }));
    } else if (device.slave_updates_remaining > 1) {
      // This is a mesh slave, and not the last slave in the network.
      // Decrement remain counter and reset retry count, mesh handler propagates
      let remain = device.slave_updates_remaining - 1;
      await(Config.updateOne({
        'is_default': true,
        'device_update_schedule.rule.in_progress_devices.mac': mac,
      }, {
        '$set': {
          'device_update_schedule.rule.in_progress_devices.$.slave_updates_remaining': remain,
          'device_update_schedule.rule.in_progress_devices.$.retry_count': 0,
        },
      }));
    } else {
      // This is either a regular router or the last slave in a mesh network
      // Move from in progress to done, with status ok
      await(configQuery(
        // Make schedule inactive if this is last device to enter done state
        {'device_update_schedule.is_active': (rule.done_devices.length+1 !== count)},
        // Remove from in progress state
        {'device_update_schedule.rule.in_progress_devices': {'mac': mac}},
        // Add to done, status ok
        {
          'device_update_schedule.rule.done_devices': {
            'mac': mac,
            'state': 'ok',
            'slave_count': device.slave_count,
            'slave_updates_remaining': 0,
          },
        }
      ));
    }
  } catch (err) {
    console.log(err);
    return {success: false, error: 'Erro alterando base de dados'};
  }
  if (rule.done_devices.length+1 === count) {
    // This was last device to enter done state, schedule is done
    removeOfflineWatchdog();
  }
  return {success: true};
});

scheduleController.failedDownloadAck = async(function(mac) {
  let config = await(getConfig());
  if (!config) return {success: false, error: 'Não há um agendamento ativo'};
  let count = config.device_update_schedule.device_count;
  let rule = config.device_update_schedule.rule;
  let device = rule.in_progress_devices.find((d)=>d.mac === mac);
  if (!device) return {success: false, error: 'MAC não encontrado'};
  try {
    // Move from in progress to done, with status error
    await(configQuery(
      // Make schedule inactive if this is last device to enter done state
      {'device_update_schedule.is_active': (rule.done_devices.length+1 !== count)},
      // Remove from in progress state
      {'device_update_schedule.rule.in_progress_devices': {'mac': mac}},
      // Add to done, status error
      {
        'device_update_schedule.rule.done_devices': {
          'mac': mac,
          'state': 'error',
          'slave_count': device.slave_count,
          'slave_updates_remaining': device.slave_updates_remaining,
        },
      }
    ));
  } catch (err) {
    console.log(err);
    return {success: false, error: 'Erro alterando base de dados'};
  }
  if (rule.done_devices.length+1 === count) {
    // This was last device to enter done state, schedule is done
    removeOfflineWatchdog();
  }
  return {success: true};
});

scheduleController.failedDownload = async(function(mac, slave='') {
  let config = await(getConfig());
  if (!config) return {success: false, error: 'Não há um agendamento ativo'};
  let count = config.device_update_schedule.device_count;
  let rule = config.device_update_schedule.rule;
  let device = rule.in_progress_devices.find((d)=>d.mac === mac);
  if (!device) return {success: false, error: 'MAC não encontrado'};
  try {
    let setQuery = null;
    let pullQuery = null;
    if (device.retry_count >= maxRetries || config.is_aborted) {
      // Will not try again or move to to_do, so check if last device to update
      setQuery = {
        'device_update_schedule.is_active': (rule.done_devices.length+1 !== count)
      };
      if (rule.done_devices.length+1 === count) {
        // This was last device to enter done state, schedule is done
        removeOfflineWatchdog();
      }
      // Force remove from in progress regardless of slave or not
      pullQuery = {
        'device_update_schedule.rule.in_progress_devices': {'mac': mac},
      };
    }
    // Remove from in progress state only if not a slave
    if (slave === '') {
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
          },
        };
      }
    } else if (slave !== '') {
      // Is a mesh slave, will retry immediately
      let retry = device.retry_count + 1;
      await(Config.updateOne({
        'is_default': true,
        'device_update_schedule.rule.in_progress_devices.mac': mac,
      }, {
        '$set': {
          'device_update_schedule.rule.in_progress_devices.$.retry_count': retry,
        },
      }));
      meshHandler.propagateUpdate(slave, rule.release);
      return {success: true};
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
  return {success: true};
});

scheduleController.abortSchedule = async(function(req, res) {
  let config = await(getConfig());
  if (!config) return {success: false, error: 'Não há um agendamento ativo'};
  // Mark scheduled update as aborted - separately to mitigate racing conditions
  try {
    await(configQuery({'device_update_schedule.is_aborted': true}, null, null));
    // Mark all todo devices as aborted
    let count = config.device_update_schedule.device_count;
    let rule = config.device_update_schedule.rule;
    let pushArray = rule.to_do_devices.map((d)=>{
      let state = 'aborted' + ((d.state === 'offline') ? '_off' : '');
      return {
        mac: d.mac,
        state: state,
        slave_count: d.slave_count,
        slave_updates_remaining: d.slave_updates_remaining,
      };
    });
    rule.in_progress_devices.forEach((d)=>{
      let stateSuffix = '_update';
      if (d.state === 'downloading') {
        stateSuffix = '_down';
      } else if (d.state === 'slave') {
        stateSuffix = '_slave';
      }
      let state = 'aborted' + stateSuffix;
      pushArray.push({
        mac: d.mac,
        state: state,
        slave_count: d.slave_count,
        slave_updates_remaining: d.slave_updates_remaining,
      });
    });
    // Avoid repeated entries by rare race conditions
    pushArray = pushArray.filter((item, idx) => {
      return pushArray.indexOf(item) === idx;
    });

    let setQuery = {
      'device_update_schedule.rule.to_do_devices': [],
      'device_update_schedule.rule.in_progress_devices': [],
    };
    // We allow device counting to be greater than assigned schedule count
    // due to some rare racing conditions that count the same device more
    // then once. No harm.
    if ((rule.done_devices.length + pushArray.length) >= count) {
      setQuery['device_update_schedule.is_active'] = false;
    }
    await(configQuery(
      setQuery,
      null,
      {'device_update_schedule.rule.done_devices': {'$each': pushArray}}
    ));
    // Remove do_update from in_progress devices
    rule.in_progress_devices.forEach(async((d)=>{
      let device = await(getDevice(d.mac));
      device.do_update = false;
      device.do_update_status = 4;
      await(device.save());
      meshHandler.syncUpdateCancel(d, 4);
    }));
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Erro alterando base de dados',
    });
  }
  removeOfflineWatchdog();
  resetMutex();
  return res.status(200).json({
    success: true,
  });
});

scheduleController.getDevicesReleases = async function(req, res) {
  let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
  let useCsv = (req.body.use_csv === 'true');
  let useAllDevices = (req.body.use_all === 'true');
  let pageNumber = parseInt(req.body.page_num);
  let pageCount = parseInt(req.body.page_count);
  let queryContents = req.body.filter_list.split(',');

  const userRole = await Role.findOne(
    {name: util.returnObjOrEmptyStr(req.user.role)});

  let finalQuery = null;
  let deviceList = [];
  if (!useCsv) {
    finalQuery = await deviceListController.complexSearchDeviceQuery(
     queryContents);
  } else {
    try {
      let csvContents = await(
        csvParse({noheader: true}).fromFile('./tmp/massUpdate.csv')
      );
      if (csvContents) {
        let promises = csvContents.map((line)=>{
          return new Promise(async((resolve)=>{
            if (!line.field1.match(macRegex)) return resolve(null);
            resolve(await(getDevice(line.field1, true)));
          }));
        });
        let values = await(Promise.all(promises));
        deviceList = values.filter((value)=>value!==null);
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao processar o arquivo',
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
  queryPromise.then((matchedDevices)=>{
    deviceListController.getReleases(userRole, req.user.is_superuser, true)
    .then(function(releasesAvailable) {
      let modelsNeeded = {};
      let isOnu = {};
      let modelMeshIntersections = [];
      if (!useCsv && !useAllDevices) matchedDevices = matchedDevices.docs;
      meshHandler.enhanceSearchResult(matchedDevices).then((extraDevices) => {
        matchedDevices = matchedDevices.concat(extraDevices);
        matchedDevices.forEach((device)=>{
          let model = device.model.replace('N/', '');
          isOnu[model] = device.use_tr069;
          let weight = 1;
          if (device.mesh_master) return; // Ignore mesh slaves
          if (device.mesh_slaves && device.mesh_slaves.length > 0) {
            // Check for slave model, if it's different than master's, add it to
            // intersections so we can couple them
            let meshModels = {};
            device.mesh_slaves.forEach((slave)=>{
              let slaveDevice = matchedDevices.find((d) => d._id === slave);
              let slaveModel = slaveDevice.model.replace('N/', '');
              if (model === slaveModel) {
                weight += 1;
              } else {
                // Add slave model to models needed
                if (slaveModel in modelsNeeded) {
                  modelsNeeded[slaveModel] += 1;
                } else {
                  modelsNeeded[slaveModel] = 1;
                }
                // Add slave model to mesh models
                if (slaveModel in meshModels) {
                  meshModels[slaveModel] += 1;
                } else {
                  meshModels[slaveModel] = 1;
                }
              }
            });
            meshModels[model] = weight;
            modelMeshIntersections.push(meshModels);
          }
          if (model in modelsNeeded) {
            modelsNeeded[model] += weight;
          } else {
            modelsNeeded[model] = weight;
          }
        });
        let releasesMissing = releasesAvailable.map((release)=>{
          let modelsMissing = [];
          for (let model in modelsNeeded) {
            /* below if is true if array of strings contains model name
               inside any of its strings, where each string is a
               concatenation of both model name and version. */
            if (!release.model.some((modelAndVersion) => {
              return modelAndVersion.includes(model);
            })) {
              modelsMissing.push({model: model, count: modelsNeeded[model],
              isOnu: isOnu[model]});
            }
          }
          return {
            id: release.id,
            models: modelsMissing,
          };
        });
        return res.status(200).json({
          success: true,
          releases: releasesMissing,
          intersections: modelMeshIntersections,
        });
      });
    });
  }, (err)=>{
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno na base',
    });
  });
};

scheduleController.uploadDevicesFile = function(req, res) {
  if (!req.files) {
    return res.status(500).json({
      success: false,
      message: 'Nenhum arquivo enviado',
    });
  }

  let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
  let csvFile = req.files.schedulefile;

  csvFile.mv('./tmp/massUpdate.csv', (err)=>{
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Erro movendo o arquivo',
      });
    }
    csvParse({noheader: true}).fromFile('./tmp/massUpdate.csv').then((result)=>{
      let promises = result.map((line)=>{
        return new Promise(async((resolve)=>{
          if (!line.field1.match(macRegex)) return resolve(0);
          if (await(getDevice(line.field1, true)) !== null) return resolve(1);
          else return resolve(0);
        }));
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
  let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
  let searchTags = returnStringOrEmptyStr(req.body.use_search);
  let useCsv = (req.body.use_csv === 'true');
  let useAllDevices = (req.body.use_all === 'true');
  let hasTimeRestriction = (req.body.use_time_restriction === 'true');
  let release = returnStringOrEmptyStr(req.body.release);
  let pageNumber = parseInt(req.body.page_num);
  let pageCount = parseInt(req.body.page_count);
  let timeRestrictions = JSON.parse(req.body.time_restriction);
  let queryContents = req.body.filter_list.split(',');
  /* Below line adds 'flashbox' tag if it doesn't already belongs to
    'queryContents'. this prevents ONUs devices being included in search. */
  if (!queryContents.includes('flashbox')) queryContents.push('flashbox');

  let finalQuery = null;
  let deviceList = [];

  const userRole = await Role.findOne(
    {name: util.returnObjOrEmptyStr(req.user.role)});

  if (!useCsv) {
    finalQuery = await deviceListController.complexSearchDeviceQuery(
     queryContents);
  } else {
    try {
      let csvContents = await(
        csvParse({noheader: true}).fromFile('./tmp/massUpdate.csv')
      );
      if (csvContents) {
        let promises = csvContents.map((line)=>{
          return new Promise(async((resolve)=>{
            if (!line.field1.match(macRegex)) return resolve(null);
            resolve(await(getDevice(line.field1, true)));
          }));
        });
        let values = await(Promise.all(promises));
        deviceList = values.filter((value)=>value!==null);
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao processar o arquivo',
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
      let modelsAvailable = releasesAvailable.find((r) => r.id === release);
      if (!modelsAvailable) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao processar os parâmetros',
        });
      }
      modelsAvailable = modelsAvailable.model;
      // Filter devices that have a valid model
      if (!useCsv && !useAllDevices) matchedDevices = matchedDevices.docs;
      let extraDevices = await meshHandler.enhanceSearchResult(matchedDevices);
      matchedDevices = matchedDevices.concat(extraDevices);
      matchedDevices = matchedDevices.filter((device)=>{
        if (device.mesh_master) return false; // Discard mesh slaves
        if (device.mesh_slaves && device.mesh_slaves.length > 0) {
          // Discard master if any slave has incompatible model
          let valid = true;
          device.mesh_slaves.forEach((slave)=>{
            if (!valid) return;
            let slaveDevice = matchedDevices.find((d)=>d._id===slave);
            let slaveModel = slaveDevice.model.replace('N/', '');
            valid = modelsAvailable.includes(slaveModel);
          });
          if (!valid) return false;
        }
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
          message: 'Erro ao processar os parâmetros: nenhum roteador encontrado',
        });
      }
      let slaveCount = {};
      let macList = matchedDevices.map((device)=>{
        if (device.mesh_slaves && device.mesh_slaves.length > 0) {
          slaveCount[device._id] = device.mesh_slaves.length;
        } else {
          slaveCount[device._id] = 0;
        }
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
          let hourRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
          let valid = timeRestrictions.filter((r)=>{
            let startDay = weekDayStrToInt(r.startWeekday);
            let endDay = weekDayStrToInt(r.endWeekday);
            if (startDay < 0) return false;
            if (endDay < 0) return false;
            if (!r.startTime.match(hourRegex)) return false;
            if (!r.endTime.match(hourRegex)) return false;
            if (startDay === endDay && r.startTime === r.endTime) return false;
            return true;
          });
          if (valid.length === 0) {
            return res.status(500).json({
              success: false,
              message: 'Erro ao processar parâmetros: ranges de tempo inválidos',
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
          message: 'Erro interno na base',
        });
      }
      // Start updating
      let result = await scheduleController.initialize(macList, slaveCount);
      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
        });
      }
      // Schedule job to init whenever a time range starts
      config.device_update_schedule.allowed_time_ranges.forEach((r)=>{
      });
      return res.status(200).json({
        success: true,
      });
    });
  }, (err)=>{
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno na base',
    });
  });
};

scheduleController.updateScheduleStatus = async(function(req, res) {
  let config = await(getConfig(true, false));
  if (!config) {
    return res.status(500).json({
      message: 'Não há um agendamento cadastrado',
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
});

const translateState = function(state) {
  if (state === 'update') return 'Aguardando atualização';
  if (state === 'retry') return 'Aguardando atualização';
  if (state === 'offline') return 'Roteador offline';
  if (state === 'downloading') return 'Baixando firmware';
  if (state === 'updating') return 'Atualizando firmware';
  if (state === 'slave') return 'Atualizando roteador slave';
  if (state === 'ok') return 'Atualizado com sucesso';
  if (state === 'error') return 'Ocorreu um erro na atualização';
  if (state === 'aborted') return 'Atualização abortada';
  if (state === 'aborted_off') return 'Atualização abortada - roteador estava offline';
  if (state === 'aborted_down') return 'Atualização abortada - roteador estava baixando firmware';
  if (state === 'aborted_update') return 'Atualização abortada - roteador estava instalando firmware';
  if (state === 'aborted_slave') return 'Atualização abortada - atualizando roteador slave';
  return 'Status desconhecido';
};

scheduleController.scheduleResult = async(function(req, res) {
  let config = await(getConfig(true, false));
  if (!config) {
    return res.status(500).json({
      message: 'Não há um agendamento cadastrado',
    });
  }
  let csvData = '';
  let rule = config.device_update_schedule.rule;
  rule.to_do_devices.forEach((d)=>{
    csvData += d.mac + ',' + translateState(d.state) + '\n';
  });
  rule.in_progress_devices.forEach((d)=>{
    let state = translateState(d.state);
    if (d.slave_count > 0 && d.state === 'slave') {
      let current = d.slave_count - d.slave_updates_remaining + 1;
      state += ' ' + current + ' de ' + d.slave_count;
    }
    csvData += d.mac + ',' + state + '\n';
  });
  rule.done_devices.forEach((d)=>{
    let state = translateState(d.state);
    if (d.slave_count > 0) {
      let current = d.slave_count - d.slave_updates_remaining + 1;
      if (d.state === 'error') {
        state += ' do roteador slave ' + current + ' de ' + d.slave_count;
      } else if (d.state === 'aborted_slave') {
        state += ' ' + current + ' de ' + d.slave_count;
      }
    }
    csvData += d.mac + ',' + state + '\n';
  });
  res.set('Content-Disposition', 'attachment; filename=agendamento.csv');
  res.set('Content-Type', 'text/csv');
  res.status(200).send(csvData);
});

module.exports = scheduleController;
