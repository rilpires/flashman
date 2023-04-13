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

const setFirmwareStorage = function(key, val) {
  setCommonStorage('firmware', key, val);
};

const setFactoryCredentialsStorage = function(key, val) {
  setCommonStorage('factoryCredentials', key, val);
};

const setPingHostsList = function(key, val) {
  setCommonStorage('pingHosts', key, val);
};

const setDefaultPingHostsList = function(key, val) {
  setCommonStorage('defaultPingHosts', key, val);
};

const setDefaultDnsServersList = function(key, val) {
  setCommonStorage('defaultDnsServers', key, val);
};

const getPortForwardStorage = function(key) {
  return getCommonStorage('portForwardTr069', key);
};

const getConfigStorage = function(key) {
  return getCommonStorage('config', key);
};

const getFirmwareStorage = function(key) {
  return getCommonStorage('firmware', key);
};

const getFactoryCredentialsStorage = function(key) {
  return getCommonStorage('factoryCredentials', key);
};

const getPingHostsList = function(key) {
  return getCommonStorage('pingHosts', key);
};

const getDefaultPingHostsList = function(key) {
  return getCommonStorage('defaultPingHosts', key);
};

const getDefaultDnsServersList = function(key) {
  return getCommonStorage('defaultDnsServers', key);
};

const deletePortForwardStorage = function() {
  deleteCommonStorage('portForwardTr069');
};

const deleteConfigStorage = function() {
  deleteCommonStorage('config');
};

const deleteFirmwareStorage = function() {
  deleteCommonStorage('firmware');
};

const deleteFactoryCredentialsStorage = function() {
  deleteCommonStorage('factoryCredentials');
};

const deletePingHostsList = function() {
  deleteCommonStorage('pingHosts');
};

const deleteDefaultPingHostsList = function() {
  deleteCommonStorage('defaultPingHosts');
};

const getDNSServersList = function(key) {
  return getCommonStorage('dnsServers', key);
};

const setDNSServersList = function(key, val) {
  setCommonStorage('dnsServers', key, val);
};

const deleteDNSServersList = function() {
  deleteCommonStorage('dnsServers');
};

export {setPortForwardStorage,
        setConfigStorage,
        setFirmwareStorage,
        setPingHostsList,
        setDefaultPingHostsList,
        setDefaultDnsServersList,
        setFactoryCredentialsStorage,
        getPortForwardStorage,
        getConfigStorage,
        getFirmwareStorage,
        getFactoryCredentialsStorage,
        getPingHostsList,
        getDefaultPingHostsList,
        getDefaultDnsServersList,
        deletePortForwardStorage,
        deleteConfigStorage,
        deleteFirmwareStorage,
        deleteFactoryCredentialsStorage,
        deletePingHostsList,
        deleteDefaultPingHostsList,
        getDNSServersList,
        setDNSServersList,
        deleteDNSServersList};
