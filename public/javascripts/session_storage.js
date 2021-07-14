const setCommonStorage = function(storageKey, objKey, objVal) {
  let storageObj = sessionStorage.getItem(storageKey);
  if (!storageObj) {
    storageObj = {};
  } else {
    storageObj = JSON.parse(storageObj);
  }
  storageObj[objKey] = objVal;
  storageObj = JSON.stringify(storageObj);
  sessionStorage.setItem(storageKey, storageObj);
};

const getCommonStorage = function(storageKey, objKey) {
  let storageObj = sessionStorage.getItem(storageKey);
  if (!storageObj) {
    return null;
  } else {
    storageObj = JSON.parse(storageObj);
  }
  return storageObj[objKey];
};

const deleteCommonStorage = function(storageKey) {
  sessionStorage.removeItem(storageKey);
};

const setPortForwardStorage = function(key, val) {
  setCommonStorage('portForwardTr069', key, val);
};

const setConfigStorage = function(key, val) {
  setCommonStorage('config', key, val);
};

const getPortForwardStorage = function(key) {
  return getCommonStorage('portForwardTr069', key);
};

const getConfigStorage = function(key) {
  return getCommonStorage('config', key);
};

const deletePortForwardStorage = function() {
  deleteCommonStorage('portForwardTr069');
};

const deleteConfigStorage = function() {
  deleteCommonStorage('config');
};

export {setPortForwardStorage,
        setConfigStorage,
        getPortForwardStorage,
        getConfigStorage,
        deletePortForwardStorage,
        deleteConfigStorage};
