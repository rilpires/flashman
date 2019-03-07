let DeviceVersion = {};

const versionRegex = /^[0-9]+\.[0-9]+\.[0-9]+$/;

const versionCompare = function(foo, bar) {
  // Returns like C strcmp: 0 if equal, -1 if foo < bar, 1 if foo > bar
  let fooVer = foo.split('.').map((val) => {
   return parseInt(val);
  });
  let barVer = bar.split('.').map((val) => {
   return parseInt(val);
  });
  for (let i = 0; i < fooVer.length; i++) {
    if (fooVer[i] < barVer[i]) return -1;
    if (fooVer[i] > barVer[i]) return 1;
  }
  return 0;
};

const grantViewLogs = function(version) {
  // Enabled in all supported versions
  return true;
};

const grantResetDevices = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.10.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPortForward = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.10.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantWifi5ghz = function(version, is5ghzCapable) {
  if (version.match(versionRegex)) {
    return (is5ghzCapable && (versionCompare(version, '0.13.0') >= 0));
  } else {
    // Development version, enable everything by default
    return is5ghzCapable;
  }
};

const grantWifiBand = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPingTest = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantLanEdit = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.13.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

DeviceVersion.findByVersion = function(version, is5ghzCapable) {
  let result = {};
  result.grantViewLogs = grantViewLogs(version);
  result.grantResetDevices = grantResetDevices(version);
  result.grantPortForward = grantPortForward(version);
  result.grantWifi5ghz = grantWifi5ghz(version, is5ghzCapable);
  result.grantWifiBand = grantWifiBand(version);
  result.grantPingTest = grantPingTest(version);
  result.grantLanEdit = grantLanEdit(version);
  return result;
};

module.exports = DeviceVersion;
