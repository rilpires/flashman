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

utilHandlers.returnObjOrEmptyStr = function(query) {
  if (typeof query !== 'undefined' && query) {
    return query;
  } else {
    return '';
  }
};

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

utilHandlers.deepCopyObject = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

utilHandlers.getRandomInt = function(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = utilHandlers;
