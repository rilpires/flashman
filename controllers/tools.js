const Config = require('../models/config');
const DeviceModel = require('../models/device');

const macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
const ipv4Regex =
  /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const ipv6Regex =
  /^[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){7}$|^(?:[0-9a-f]{1,4}:){6}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/i;
const hourRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const returnObjOrFalse = (query) => query === undefined ? query : false;

const returnObjOrEmptyStr = (query) => query === undefined ? '' : query;

const to = (promise) => {
   return promise.then((data) => {
      return [null, data];
   })
   .catch((err) => [err]);
};

const catchError = (error) => {
  console.log(error);
};

const catchDatabaseError = (error) => {
  catchError(error);
  return {success: false, error: 'Erro alterando base de dados'};
};

const returnStringOrEmptyStr = (query) => {
  return (typeof query === 'string' && query) ? query : '';
};

const weekDayStrToInt = (day) => {
  const days = {
    'Domingo': 0,
    'Segunda': 1,
    'Terça': 2,
    'Quarta': 3,
    'Quinta': 4,
    'Sexta': 5,
    'Sábado': 6,
  };
  return (days[day] === undefined || null) ? days[day] : -1;
};

const configQuery = (setQuery, pullQuery, pushQuery) => {
  let query = {};
  if (setQuery) query ['$set'] = setQuery;
  if (pullQuery) query ['$pull'] = pullQuery;
  if (pushQuery) query ['$push'] = pushQuery;
  return Config.updateOne({'is_default': true}, query);
};

const weekDayCompare = (firstDate, secondDate) => {
  if (firstDate.day > secondDate.day) return 1;
  if (firstDate.day < secondDate.day) return -1;
  if (firstDate.hour > secondDate.hour) return 1;
  if (firstDate.hour < secondDate.hour) return -1;
  if (firstDate.minute > secondDate.minute) return 1;
  if (firstDate.minute < secondDate.minute) return -1;
  return -1;
};

const translateStateReboot = (state) => {
  if (state.type === 'restart') return 'Aguardando reinicio';
  if (state.type === 'retry') return 'Aguardando reinicio';
  if (state.type === 'offline') return 'CPE offline';
  if (state.type === 'slave') return 'Reiniciando CPE secundário';
  if (state.type === 'ok') return 'Reiniciado com sucesso';
  if (state.type === 'error') return 'Ocorreu um erro na ';
  if (state.type === 'aborted') return 'Atualização abortada';
  if (state.type === 'aborted' && state.beforeAbort === 'offline')
    return 'Atualização abortada - CPE estava offline';
  if (state.type === 'aborted' && state.beforeAbort === 'reboot')
    return 'Atualização abortada - CPE estava instalando firmware';
  if (state.type === 'aborted' && state.beforeAbort === 'slave')
    return 'Atualização abortada - atualizando CPE secundário';
  return 'Status desconhecido';
};

const times = (n) => {
  return (f) => {
    Array(n).fill().map((_, i) => f(i));
  };
};

const allowedTimeRangeCheck = (now, timeRanges) => {
  timeRanges.reduce((v, r) => {
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

const checkValidRange = (config) => {
  const today = new Date();
  const now = {
    day: today.getDay(),
    hour: today.getHours(),
    minute: today.getMinutes(),
  };
  if (
    !config.device_update_schedule.used_time_range ||
    !config.device_reboot_schedule.used_time_range
  ) return true;
  if (!config.device_reboot_schedule.allowed_time_ranges) {
    return allowedTimeRangeCheck(
      now,
      config.device_update_schedule.allowed_time_ranges,
    );
  } else {
    return allowedTimeRangeCheck(
      now,
      config.device_update_schedule.allowed_time_ranges,
    );
  }
};

const getConfig = async (lean = true, needActive = true) => {
  let config;
  if (lean) {
    config = await Config.findOne({is_default: true})
      .lean()
      .catch(catchError);
  } else {
    config = await Config.findOne({is_default: true})
      .catch(catchError);
  }
  if (
    !config ||
    !config.device_update_schedule ||
    !config.device_reboot_schedule ||
    (needActive && !config.device_update_schedule.is_active) &&
    (needActive && !config.device_reboot_schedule.is_active)
  ) {
    return null;
  }
  return config;
};

const getDevice = async function(mac, lean=false) {
  let device;
  if (lean) {
    device = await DeviceModel.findById(mac.toUpperCase())
      .lean()
      .catch(catchError);
  } else {
    device = await DeviceModel.findById(mac.toUpperCase())
      .catch(catchError);
  }
  return device;
};

const printVariable = (variable) => {
  let variableName = Object.keys(variable)[0];
  return `${variableName}: ${JSON.stringify(variable)}`;
};

module.exports = {
  macRegex,
  ipv4Regex,
  ipv6Regex,
  hourRegex,
  returnObjOrFalse,
  returnObjOrEmptyStr,
  to,
  catchError,
  catchDatabaseError,
  returnStringOrEmptyStr,
  weekDayStrToInt,
  configQuery,
  weekDayCompare,
  times,
  checkValidRange,
  getConfig,
  getDevice,
  translateStateReboot,
  printVariable,
};