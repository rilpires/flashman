/* eslint-disable no-prototype-builtins */
/* global __line */


/**
 * Utilities functions.
 * @namespace controllers/handlers/util
 */


const t = require('../language').i18next.t;
const certman = require('../external-api/certman');
const fs = require('fs');

let utilHandlers = {};

// Patterns external reference obj based on actual language and ext. ref. kind
utilHandlers.getExtRefPattern = function(kind, data) {
  switch (kind.toLowerCase()) {
    case (t('personIdentificationSystem').toLowerCase()):
      return {
        kind: t('personIdentificationSystem'),
        data: data.replace(
          new RegExp(t('personIdentificationPattern')),
          t('personIdentificationPatternGroups'),
        ).toUpperCase(),
      };
    case (t('enterpriseIdentificationSystem').toLowerCase()):
      return {
        kind: t('enterpriseIdentificationSystem'),
        data: data.replace(
          new RegExp(t('enterpriseIdentificationPattern')),
          t('enterpriseIdentificationPatternGroups'),
        ).toUpperCase(),
      };
    default:
      return {
        kind: t('Other'),
        data: data,
      };
  }
};

utilHandlers.orderNumericGenieKeys = function(keys) {
  let onlyNumbers = keys.filter((k)=>!k.includes('_') && !isNaN(parseInt(k)));
  return onlyNumbers.sort((a, b)=>a-b);
};

utilHandlers.traverseNestedKey = function(
  data, key, useLastIndexOnWildcard = false,
) {
  // Validate inputs
  if (!data || !key) return {success: false};

  let current = data;
  let splitKey = key.split('.');
  for (let i = 0; i < splitKey.length; i++) {
    if (splitKey[i] === '*') {
      let orderedKeys = utilHandlers.orderNumericGenieKeys(
        Object.keys(current),
      );
      let targetIndex;
      if (useLastIndexOnWildcard) {
        targetIndex = orderedKeys[orderedKeys.length - 1];
      } else {
        targetIndex = orderedKeys[0];
      }
      splitKey[i] = targetIndex;
    }
    if (!current.hasOwnProperty(splitKey[i])) {
      return {success: false};
    }
    current = current[splitKey[i]];
  }
  return {
    success: true,
    key: splitKey.join('.'),
    value: current,
  };
};

utilHandlers.chooseWan = function(data, useLastIndexOnWildcard) {
  data = utilHandlers.convertWanToFlashmanFormat(data);
  let idealCandidates = [];
  let possibleCandidates = [];

  // Checks if there are WANs that meet the ideal conditions, that is:
  // Status = Connected and Enable = true
  for (const key of Object.keys(data)) {
    const wan = data[key];

    let enable = (key.includes('ppp')) ? wan.pppoe_enable : wan.dhcp_enable;
    let status = (key.includes('ppp')) ? wan.pppoe_status : wan.dhcp_status;

    if (enable && enable.hasOwnProperty('value')) {
      enable = enable.value;
    }
    if (status && status.hasOwnProperty('value')) {
      status = status.value;
    }

    if (enable === true && (status === 'Connected' || status === 'Up')) {
      // Ideal conditions: Status = Connected and Enable = true
      idealCandidates.push(key);
    } else if (enable === true || (status === 'Dormant' ||
        status === 'Connected' || status === 'Up')) {
      // In the absence of WANs in ideal conditions, we map those that have at
      // least one of the conditions met
      possibleCandidates.push(key);
    }
  }

  // No WANs meet any of the conditions. Keeps legacy case of returning the
  // first or last WAN without criteria (remembering that the keys in data are
  // already sorted!)
  if (idealCandidates.length === 0 && possibleCandidates.length === 0) {
    const keys = Object.keys(data);
    const firstKey = keys[0];
    const lastKey = keys[keys.length - 1];
    const correctKey = (useLastIndexOnWildcard) ? lastKey : firstKey;
    return {key: correctKey, value: data[correctKey]};
  }

  if (idealCandidates.length === 1) {
    // There is only one WAN that has the ideal conditions
    return {key: idealCandidates[0], value: data[idealCandidates[0]]};
  } else if (idealCandidates.length > 1) {
    // There are multiple candidates. Verifies ideal candidates, giving
    // preference to ppp-type WANs
    let pppWans = idealCandidates.filter((key) => key.includes('ppp'));
    if (pppWans.length > 0) {
      if (pppWans.length === 1) {
        // There is only one ppp-type WAN that meets the ideal conditions
        return {key: pppWans[0], value: data[pppWans[0]]};
      } else {
        // There are multiple ppp-type WANs with ideal conditions and it is not
        // possible to make a decision
        const firstKey = pppWans[0];
        const lastKey = pppWans[pppWans.length - 1];
        const correctKey = (useLastIndexOnWildcard) ? lastKey : firstKey;
        return {key: correctKey, value: data[correctKey]};
      }
    } else {
      // There are multiple DHCP-type WANs that meet the ideal conditions
      const firstKey = idealCandidates[0];
      const lastKey = idealCandidates[idealCandidates.length - 1];
      const correctKey = (useLastIndexOnWildcard) ? lastKey : firstKey;
      return {key: correctKey, value: data[correctKey]};
    }
  }

  // In case there is no WAN that meets the ideal conditions, we have to choose
  // one that partially meets it. In this case, to preserve the legacy behavior,
  // we select the first or the last
  const firstKey = possibleCandidates[0];
  const lastKey = possibleCandidates[possibleCandidates.length - 1];
  const correctKey = (useLastIndexOnWildcard) ? lastKey : firstKey;
  return {key: correctKey, value: data[correctKey]};
};

utilHandlers.convertWanToFlashmanFormat = function(data) {
  const result = {};
  for (const key in data) {
    if (!data.hasOwnProperty(key)) continue;
    const obj = data[key];
    const temp = {};
    for (const prop in obj) {
      if (!obj.hasOwnProperty(prop)) continue;
      if (obj[prop] === undefined) continue;
      if (obj[prop].hasOwnProperty('value')) {
        let value = Array.isArray(obj[prop].value) ?
          obj[prop].value[0] : obj[prop].value;
        temp[prop] = {
          writable: obj[prop].writable,
          value: value,
        };
      }
    }
    result[key] = temp;
  }
  return result;
};

utilHandlers.convertWanToProvisionFormat = function(data) {
  const result = [];
  const traverse = (node, path) => {
    for (let key in node) {
      if (!node.hasOwnProperty(key)) continue;
      let field = node[key];
      if (field.hasOwnProperty('_writable') &&
          field.hasOwnProperty('_value') &&
          !field._object) {
        result.push({
          path: path.concat(key).join('.'),
          writable: field._writable,
          value: field._value,
        });
      } else if (typeof field === 'object') {
        traverse(field, path.concat(key));
      }
    }
  };
  traverse(data, []);
  return result;
};

utilHandlers.checkForNestedKey = function(
  data, key, useLastIndexOnWildcard = false,
) {
  let ret = utilHandlers.traverseNestedKey(data, key, useLastIndexOnWildcard);
  return ret.success;
};

// Iterates from data as a JSON like format and retrieves value or object if
// it matches the key argument.
// Example:
// data: {a: 1, b: {c: {d: 2}}} ; key = 'b.c'; returns {d: 2}
utilHandlers.getFromNestedKey = function(
  data, key, useLastIndexOnWildcard = false,
) {
  let ret = utilHandlers.traverseNestedKey(data, key, useLastIndexOnWildcard);
  if (!ret.success) return undefined;
  return ret.value;
};

utilHandlers.replaceNestedKeyWildcards = function(
  data, key, useLastIndexOnWildcard = false, checkForWanEnable = false,
) {
  let ret = utilHandlers.traverseNestedKey(
    data, key, useLastIndexOnWildcard, checkForWanEnable,
  );
  if (!ret.success) return undefined;
  return ret.key;
};

// Returns {key: genieFieldValue}
utilHandlers.getAllNestedKeysFromObject = function(
  data, keys, genieFieldsFromKey, root,
) {
  let result = {};
  keys.forEach((key) => {
    if (typeof genieFieldsFromKey[key] === 'undefined') return;

    let completeValueField = genieFieldsFromKey[key] + '._value';
    let completeField = genieFieldsFromKey[key];
    if (root) {
      completeValueField = root + '.' + completeValueField;
      completeField = root + '.' + completeField;
    }
    if (utilHandlers.checkForNestedKey(data, completeValueField)) {
      result[key] = utilHandlers.getFromNestedKey(
        data, completeValueField,
      );
    } else if (utilHandlers.checkForNestedKey(data, completeField)) {
      result[key] = utilHandlers.getFromNestedKey(
        data, completeField,
      );
    }
  });
  return result;
};

utilHandlers.getLastIndexOfNestedKey = function(
  data, key, useLastIndexOnWildcard = false,
) {
  let tree = utilHandlers.getFromNestedKey(data, key, useLastIndexOnWildcard);
  let orderedKeys = utilHandlers.orderNumericGenieKeys(Object.keys(tree));
  let lastIndex = orderedKeys.length - 1;
  return {
    success: (lastIndex >= 0),
    lastIndex: (lastIndex >= 0) ? orderedKeys[lastIndex] : undefined,
  };
};

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

utilHandlers.isTrueValueString = (value) => {
  return ['1', 'true', 'TRUE'].includes(value);
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

utilHandlers.flashboxVersionRegex = /^[0-9]+\.[0-9]+\.[0-9A-Za-b]+$/;
utilHandlers.flashboxDevVerRegex = /^[0-9]+\.[0-9]+\.[0-9A-Za-b]+-[0-9]+-.*$/;
/*
 *  Description:
 *    This regex is meant to avoid XSS attacks by removing special characters
 *    used in this type of attack. Might not avoid all XSS cases.
 *    Matches everything that is not &, \, ", ', `, < or >
 *    matches if it is smaller than 128 characters
 */
// eslint-disable-next-line max-len
utilHandlers.xssValidationRegex = /^[^&\\"'`<>]{1,128}$/;
utilHandlers.hourRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
utilHandlers.vlanNameRegex = /^[A-Za-z][A-Za-z\-0-9_]+$/;
// eslint-disable-next-line max-len
utilHandlers.fqdnLengthRegex = /^([0-9a-z][-0-9a-z]{0,62}\.)+([0-9a-z][-0-9a-z]{0,62})$/;
utilHandlers.macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
// eslint-disable-next-line max-len
utilHandlers.ipv4Regex = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
// eslint-disable-next-line max-len
const ipv6Regex = /^[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){7}$|^(?:[0-9a-f]{1,4}:){6}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/i;
// eslint-disable-next-line max-len
const domainNameRegex = /^[0-9a-z]+(?:-[0-9a-z]+)*(?:\.[0-9a-z]+(?:-[0-9a-z]+)*)+$/i;
// eslint-disable-next-line max-len
utilHandlers.portRegex = /^()([1-9]|[1-5]?[0-9]{2,4}|6[1-4][0-9]{3}|65[1-4][0-9]{2}|655[1-2][0-9]|6553[1-5])$/;
// eslint-disable-next-line max-len
utilHandlers.urlRegex = /^(?:http:\/\/)[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.%]+$/;
// eslint-disable-next-line max-len
utilHandlers.flashboxFirmFileRegex = /^([A-Z\-0-9]+)_([A-Z\-0-9]+)_([A-Z0-9]+)_([0-9]{4}-[a-z]{3})\.(bin)$/;
// Matches DD/DD/DDDD DD:DD format
// eslint-disable-next-line max-len
utilHandlers.dateRegex = /^((\d{2})|(\d{1}))\/((\d{2})|(\d{1}))\/(\d{4}) (\d{2}):(\d{2})$/;

utilHandlers.testIPv6 = function(ipv6) {
  if (ipv6 !== undefined && ipv6.constructor !== String) return false;
  let parts = ipv6.split(':');
  // has an ipv4 at the end or not.
  let maxparts = /:\d{1,3}\./.test(ipv6) ? 7 : 8;
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
  utilHandlers.ipv4Regex.test(fqdn) || utilHandlers.testIPv6(fqdn));

// returns true if given mac address is valid.
utilHandlers.isMacValid = (mac) => mac !== undefined &&
  mac.constructor === String && utilHandlers.macRegex.test(mac);

utilHandlers.isArrayObject = (val) => val instanceof Array ? true : false;

utilHandlers.getRandomInt = function(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

utilHandlers.escapeRegExp = function(string) {
  // $& means the whole matched string
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

utilHandlers.simpleStringHash = function(string) {
  return string.split('').reduce((hash, char)=>hash+=char.charCodeAt(0), 0);
};

utilHandlers.parseDate = function(dateString) {
  // dd/mm/aaaa hh:mm
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
};

utilHandlers.getTr069CACert = async function() {
  // For docker instances, we need to fetch the CA from Certman service
  // For bare metal instances, we simply fetch it from local file system
  if (process.env.FLM_DOCKER_INSTANCE) {
    return await certman.getCertmanCACert();
  }
  return fs.readFileSync('./certs/onu-certs/onuCA.pem', 'utf8');
};

/*
 *  Description:
 *    This function returns a promise and only resolves when the time in
 *    miliseconds timeout after calling this function.
 *
 *  Inputs:
 *    miliseconds - Amount of time in miliseconds to sleep
 *
 *  Outputs:
 *    promise - The promise that is only resolved when the timer ends.
 *
 */
utilHandlers.sleep = function(miliseconds) {
  let promise = new Promise(
    (resolve) => setTimeout(resolve, miliseconds),
  );

  return promise;
};

/* ****Functions for test utilities**** */

utilHandlers.errorHandler = function(message) {
  return function(err) {
    throw Error(`${message}, ${err}`);
  };
};

utilHandlers.catchDatabaseError = function(error) {
  utilHandlers.catchError(error);
  return {success: false, error: t('saveError', {errorline: __line})};
};


/**
 * Try to get the mask from an address. The address must be in the format
 * `1234:5678::/xx` or `192.168.0.1/xx`. This function splits the `/` and
 * returns the mask as `String` or a `null` if the mask is invalid.
 *
 * @memberof controllers/handlers/util
 *
 * @param {String} address - The IPv4 or IPv6 address.
 * @param {Boolean} isIPv6 - If the field is IPv6 or not.
 *
 * @return {String | Null} The mask as `String` or `null`.
 */
utilHandlers.getMaskFromAddress = function(address, isIPv6) {
  if (!address || address.constructor !== String || address.length <= 0) {
    return null;
  }

  // Split the / and get the second item from array
  const mask = address.split('/')[1];
  if (!mask) return null;

  let maskMax = 32;
  if (isIPv6) maskMax = 128;

  // Check if the mask is a valid value
  const maskInteger = parseInt(mask, 10);
  if (!maskInteger || maskInteger < 0 || maskInteger > maskMax) return null;

  return mask;
};


/**
 * @exports controllers/handlers/util
 */
module.exports = utilHandlers;
