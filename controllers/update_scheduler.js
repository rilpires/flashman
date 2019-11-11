const DeviceModel = require('../models/device');
const Config = require('../models/config');
const mqtt = require('../mqtts');
const messaging = require('./messaging');
const deviceListController = require('./device_list');

const nodeSchedule = require('node-schedule');
const csvParse = require('csvtojson');
const Mutex = require('async-mutex').Mutex;
const async = require('asyncawait/async');
const await = require('asyncawait/await');

const maxRetries = 3;
const maxDownloads = process.env.FLM_CONCURRENT_UPDATES_LIMIT;
let mutex = new Mutex();
let mutexRelease = null;
let watchdogIntervalID = null;
let initSchedules = [];
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
    if (devices[i].mac in mqtt.clients) {
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
    messaging.sendUpdateMessage(device);
    mqtt.anlixMessageRouterUpdate(device._id);
    await(device.save());
  } catch (err) {
    console.log(err);
    return {success: false, error: 'Erro alterando base de dados'};
  }
  return {success: true, marked: true};
});

scheduleController.initialize = async(function(macList) {
  let config = await(getConfig());
  if (!config) return {success: false, error: 'Não há um agendamento ativo'};
  devices = macList.map((mac)=>{
    return {mac: mac.toUpperCase(), state: 'update', retry_count: 0};
  });
  try {
    await(configQuery(
      {
        'device_update_schedule.rule.to_do_devices': devices,
        'device_update_schedule.rule.in_progress_devices': [],
        'device_update_schedule.rule.done_devices': [],
      },
      null,
      null
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

scheduleController.failedDownload = async(function(mac) {
  let config = await(getConfig());
  if (!config) return {success: false, error: 'Não há um agendamento ativo'};
  let count = config.device_update_schedule.device_count;
  let rule = config.device_update_schedule.rule;
  let device = rule.in_progress_devices.find((d)=>d.mac === mac);
  if (!device) return {success: false, error: 'MAC não encontrado'};
  try {
    let setQuery = null;
    if (device.retry_count >= maxRetries || config.is_aborted) {
      // Will not try again or move to to_do, so check if last device to update
      setQuery = {
        'device_update_schedule.is_active': (rule.done_devices.length+1 !== count)
      };
      if (rule.done_devices.length+1 === count) {
        // This was last device to enter done state, schedule is done
        removeOfflineWatchdog();
      }
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
      return {mac: d.mac, state: state};
    });
    rule.in_progress_devices.forEach((d)=>{
      let stateSuffix = (d.state === 'downloading') ? '_down' : '_update';
      let state = 'aborted' + stateSuffix;
      pushArray.push({mac: d.mac, state: state});
    });
    let setQuery = {
      'device_update_schedule.rule.to_do_devices': [],
      'device_update_schedule.rule.in_progress_devices': [],
    };
    if (rule.done_devices.length + pushArray.length === count) {
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

scheduleController.getDevicesReleases = async(function(req, res) {
  let macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
  let useCsv = (req.body.use_csv === 'true');
  let useAllDevices = (req.body.use_all === 'true');
  let pageNumber = parseInt(req.body.page_num);
  let pageCount = parseInt(req.body.page_count);
  let queryContents = req.body.filter_list.split(',');

  let finalQuery = null;
  let deviceList = [];
  if (!useCsv) {
    finalQuery = deviceListController.searchDeviceQuery(queryContents);
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
    let releasesAvailable = deviceListController.getReleases(true);
    let modelsNeeded = {};
    if (!useCsv && !useAllDevices) matchedDevices = matchedDevices.docs;
    matchedDevices.forEach((device)=>{
      let model = device.model.replace('N/', '');
      if (model in modelsNeeded) {
        modelsNeeded[model] += 1;
      } else {
        modelsNeeded[model] = 1;
      }
    });
    let releasesMissing = releasesAvailable.map((release)=>{
      let modelsMissing = [];
      for (let model in modelsNeeded) {
        if (!release.model.includes(model)) {
          modelsMissing.push({model: model, count: modelsNeeded[model]});
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
    });
  }, (err)=>{
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno na base',
    });
  });
});

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

scheduleController.startSchedule = async(function(req, res) {
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

  let finalQuery = null;
  let deviceList = [];
  if (!useCsv) {
    finalQuery = deviceListController.searchDeviceQuery(queryContents);
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

  queryPromise.then(async((matchedDevices)=>{
    // Get valid models for this release
    let releasesAvailable = deviceListController.getReleases(true);
    let modelsAvailable = releasesAvailable.find((r)=>r.id===release);
    if (!modelsAvailable) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao processar os parâmetros',
      });
    }
    modelsAvailable = modelsAvailable.model;
    // Filter devices that have a valid model
    if (!useCsv && !useAllDevices) matchedDevices = matchedDevices.docs;
    matchedDevices = matchedDevices.filter((device)=>{
      let model = device.model.replace('N/', '');
      return modelsAvailable.includes(model);
    });
    if (matchedDevices.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao processar os parâmetros: nenhum roteador encontrado',
      });
    }
    let macList = matchedDevices.map((device)=>device._id);
    // Save scheduler configs to database
    let config = null;
    try {
      config = await(getConfig(false, false));
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
      }
      else {
        config.device_update_schedule.allowed_time_ranges = [];
      }
      config.device_update_schedule.rule.release = release;
      await(config.save());
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno na base',
      });
    }
    // Start updating
    let result = await(scheduleController.initialize(macList));
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
  }, (err)=>{
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno na base',
    });
  }));
});

scheduleController.updateScheduleStatus = async(function(req, res) {
  let config = await(getConfig(true, false));
  if (!config) {
    return res.status(500).json({
      message: 'Não há um agendamento cadastrado',
    });
  }
  let rule = config.device_update_schedule.rule;
  return res.status(200).json({
    total: config.device_update_schedule.device_count,
    todo: rule.to_do_devices.length + rule.in_progress_devices.length,
    doing: rule.in_progress_devices.length > 0,
    done: rule.done_devices.filter((d)=>d.state==='ok').length,
    error: rule.done_devices.filter((d)=>d.state!=='ok').length,
  });
});

const translateState = function(state) {
  if (state === 'update') return 'Aguardando atualização';
  if (state === 'retry') return 'Aguardando atualização';
  if (state === 'offline') return 'Roteador offline';
  if (state === 'downloading') return 'Baixando firmware';
  if (state === 'updating') return 'Atualizando firmware';
  if (state === 'ok') return 'Atualizado com sucesso';
  if (state === 'error') return 'Ocorreu um erro na atualização';
  if (state === 'aborted') return 'Atualização abortada';
  if (state === 'aborted_off') return 'Atualização abortada - roteador estava offline';
  if (state === 'aborted_down') return 'Atualização abortada - roteador estava baixando firmware';
  if (state === 'aborted_update') return 'Atualização abortada - roteador estava instalando firmware';
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
    csvData += d.mac + ',' + translateState(d.state) + '\n';
  });
  rule.done_devices.forEach((d)=>{
    csvData += d.mac + ',' + translateState(d.state) + '\n';
  });
  res.set('Content-Disposition', 'attachment; filename=agendamento.csv');
  res.set('Content-Type', 'text/csv');
  res.status(200).send(csvData);
});

module.exports = scheduleController;
