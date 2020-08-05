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
  if (query === undefined || query === null)
    return ''
  return query
};

utilHandlers.returnObjOrNum = function(query, num) {
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

module.exports = utilHandlers;
