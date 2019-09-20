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

const mutex = new Mutex();
const maxRetries = 3;
const maxDownloads = 50;
let watchdogIntervalID = null;
let scheduleController = {};

const returnStringOrEmptyStr = function(query) {
  if (typeof query === 'string' && query) {
    return query;
  } else {
    return '';
  }
};

const scheduleOfflineWatchdog = function() {
  // Check for online devices every 5 minutes
  const interval = 5*60*1000;
  if (watchdogIntervalID) return;
  watchdogIntervalID = setInterval(()=>{
    markNextForUpdate();
  }, interval);
};

const removeOfflineWatchdog = function() {
  // Clear interval if set
  if (watchdogIntervalID) {
    clearInterval(watchdogIntervalID);
    watchdogIntervalID = null;
  }
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
  let mutexRelease = await(mutex.acquire());
  let config = await(getConfig());
  if (!config) {
    mutexRelease();
    return {success: false, error: 'Não há um agendamento ativo'};
  }
  let devices = config.device_update_schedule.rule.to_do_devices;
  if (devices.length === 0) {
    mutexRelease();
    return {success: true, marked: false};
  }
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
      await(configQuery({
        'device_update_schedule.is_on_watch': true,
        'device_update_schedule.rule.to_do_devices.$[].state': 'offline',
      }, null, null));
    } catch (err) {
      console.log(err);
    }
    mutexRelease();
    scheduleOfflineWatchdog();
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
    if (devices.length === 1) {
      // Last device on to_do, remove watchdog
      removeOfflineWatchdog();
    }
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
    return {mac: mac, state: 'update', retry_count: 0};
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
  return await(markNextForUpdate());
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
  return await(markNextForUpdate());
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
      if (device.model in modelsNeeded) {
        modelsNeeded[device.model] += 1;
      } else {
        modelsNeeded[device.model] = 1;
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
  let useCsv = (req.body.use_csv === 'true');
  let useAllDevices = (req.body.use_all === 'true');
  let hasTimeRestriction = (req.body.use_time_restriction === 'true');
  let release = returnStringOrEmptyStr(req.body.release);
  let pageNumber = parseInt(req.body.page_num);
  let pageCount = parseInt(req.body.page_count);
  let timeRestrictions = req.body.time_restriction;
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
      return modelsAvailable.includes(device.model);
    });
    if (matchedDevices.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao processar os parâmetros: nenhum roteador encontrado',
      });
    }
    let macList = matchedDevices.map((device)=>device._id);
    // Save scheduler configs to database
    try {
      let config = await(getConfig(false, false));
      config.device_update_schedule.is_active = true;
      config.device_update_schedule.used_time_range = hasTimeRestriction;
      config.device_update_schedule.used_csv = useCsv;
      config.device_update_schedule.device_count = macList.length;
      config.device_update_schedule.date = Date.now();
      if (hasTimeRestriction) {
        config.device_update_schedule.allowed_time_range.start = startTime;
        config.device_update_schedule.allowed_time_range.end = endTime;
        config.device_update_schedule.allowed_time_range.weekdays = weekDays;
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

module.exports = scheduleController;
