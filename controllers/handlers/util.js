const util = require('util');
let utilHandlers = {};

utilHandlers.isJSONObject = function(val) {
  return val instanceof Object ? true : false;
};

utilHandlers.isJsonString = function(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

utilHandlers.returnObjOrFalse = (query) => query === undefined ? false : query;

utilHandlers.returnObjOrEmptyStr = (query) => query === undefined ? '' : query;

utilHandlers.returnStrOrEmptyStr = (query) => query !== undefined &&
  query.constructor === String ? query : '';

utilHandlers.returnObjOrNum = function(query, num) {
  query = parseInt(query);
  if (typeof query !== 'undefined' && !isNaN(query)) {
    return query;
  } else {
    return num;
  }
};

utilHandlers.returnObjOrStr = function(query, str) {
  if (typeof query !== 'undefined' && query) {
    return query;
  } else {
    return str;
  }
};

utilHandlers.deepCopyObject = function(objArr) {
  try {
    return JSON.parse(JSON.stringify(objArr));
  } catch (e) {
    console.log(`deepCopyObject failed error: ${e}`);
    return [];
  }
};

const macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
const ipv4Regex = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const ipv6Regex = /^[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){7}$|^(?:[0-9a-f]{1,4}:){6}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/i;
// const ipv6Regexp = /^[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){7}$|^::(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?$|^(?:[0-9a-f]{1,4}:){1,6}:$|^(?:[0-9a-f]{1,4}:)+(?::[0-9a-f]{1,4})+$/i
const domainNameRegex = /^[0-9a-z]+(?:-[0-9a-z]+)*(?:\.[0-9a-z]+(?:-[0-9a-z]+)*)+$/i;
const testIPv6 = function (ipv6) {
  if (ipv6 !== undefined && ipv6.constructor !== String) return false;
  let parts = ipv6.split(':');
  let maxparts = /:\d{1,3}\./.test(ipv6) ? 7 : 8; // has an ipv4 at the end or not.
  if (parts.length > maxparts || parts.length < 3) return false;
  let hasDoubleColon = ipv6.indexOf('::') > -1;
  if (parts.length === maxparts && hasDoubleColon) return false;
  if (hasDoubleColon) {
    let notEmptyCounter = 0;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length > 0) notEmptyCounter++;
    }
    let remaining = maxparts-notEmptyCounter;
    let substitute = ipv6[0] === ':' ? '' : ':';
    for (let i = 0; i < remaining; i++) substitute += '0:';
    if (ipv6[ipv6.length-1] === ':') substitute = substitute.slice(0, -1);
    ipv6 = ipv6.replace('::', substitute);
  }
  return ipv6Regex.test(ipv6);
};

// returns true of false if given fully qualified dominion name is valid.
utilHandlers.isFqdnValid = (fqdn) => fqdn !== undefined &&
  fqdn.constructor === String && (domainNameRegex.test(fqdn) ||
  ipv4Regex.test(fqdn) || testIPv6(fqdn));

// returns true if given mac address is valid.
utilHandlers.isMacValid = (mac) => mac !== undefined &&
  mac.constructor === String && macRegex.test(mac);

utilHandlers.isArrayObject = (val) => val instanceof Array ? true : false;

utilHandlers.getRandomInt = function(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

utilHandlers.escapeRegExp = function(string) {
  // $& means the whole matched string
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

utilHandlers.parseDate = function(dateString) {
  'dd/mm/aaaa hh:mm'
  let dayAndTime = dateString.split(' ');
  let dayMonthAndYear = dayAndTime[0].split('/');
  let hourAndMinute = dayAndTime[1].split(':');
  let day = parseInt(dayMonthAndYear[0], 10);
  let month = parseInt(dayMonthAndYear[1], 10);
  let year = parseInt(dayMonthAndYear[2], 10);
  let hour = parseInt(hourAndMinute[0], 10);
  let minute = parseInt(hourAndMinute[1], 10);
  if (
    isNaN(day) ||
    isNaN(month) ||
    isNaN(year) ||
    isNaN(hour) ||
    isNaN(minute)
  ) {
    console.log('dateString error NaN was passed');
    console.log(`day: ${isNaN(day)}`);
    console.log(`month: ${isNaN(month)}`);
    console.log(`year: ${isNaN(year)}`);
    console.log(`hour: ${isNaN(hour)}`);
    console.log(`minute: ${isNaN(minute)}`);
  }
  return new Date(year, month-1, day, hour, minute, 0, 0);
}

utilHandlers.jsonParse = util.promisify(JSON.parse);

utilHandlers.jsonStringify = util.promisify(JSON.stringify);

module.exports = utilHandlers;
