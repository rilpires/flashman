let DeviceVersion = {};

const versionRegex = /^[0-9]+\.[0-9]+\.[0-9]+$/;

const speedTestCompatibleModels = {
  'ACTIONRF1200V1': 100,
  'ACTIONRG1200V1': 200,
  'ARCHERC5V4': 300,
  'ARCHERC20V4': 100,
  'ARCHERC20V5': 100,
  'ARCHERC50V3': 100,
  'ARCHERC50V4': 100,
  'ARCHERC60V2': 100,
  'DIR-819A1': 100,
  'DIR-815D1': 100,
  'DWR-116A1': 100,
  'DWR-116A2': 100,
  'DWR-116A3': 100,
  'EMG1702-T10AA1': 100,
  'GWR-1200ACV1': 200,
  'NCLOUD': 100,
  'RE708V1': 200,
  'TL-MR3020V1': 100,
  'TL-WDR3500V1': 100,
  'TL-WDR3600V1': 150,
  'TL-WDR4300V1': 150,
  'TL-WR2543N/NDV1': 120,
  'TL-WR741N/NDV4': 100,
  'TL-WR741N/NDV5': 100,
  'TL-WR840NV4': 100,
  'TL-WR840NV5': 100,
  'TL-WR840NV6': 100,
  'TL-WR840NV62': 100,
  'TL-WR840NV5PRESET': 100,
  'TL-WR840NV6PRESET': 100,
  'TL-WR841N/NDV7': 100,
  'TL-WR841N/NDV8': 100,
  'TL-WR842N/NDV3': 100,
  'TL-WR849NV4': 100,
  'TL-WR849NV5': 100,
  'TL-WR849NV6': 100,
  'TL-WR849NV62': 100,
  'TL-WR940NV4': 100,
  'TL-WR940NV5': 100,
  'TL-WR940NV6': 100,
  'TL-WR949NV6': 100,
  'TL-WR845NV3': 100,
  'TL-WR845NV4': 100,
};

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

const grantPortForwardAsym = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.14.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantPortOpenIpv6 = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.15.0') >= 0);
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

const grantWifiState = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.23.0') >= 0);
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

const grantLanGwEdit = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.23.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
  return false;
};

const grantLanDevices = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.14.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantUpnp = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.21.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
  return false;
};

const grantSpeedTest = function(version, model) {
  if (version.match(versionRegex)) {
    if (!model || !(model in speedTestCompatibleModels)) {
      // Unspecified model or model is not compatible with feature
      return false;
    }
    return (versionCompare(version, '0.24.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
};

const grantSpeedTestLimit = function(version, model) {
  if (grantSpeedTest(version, model)) {
    return speedTestCompatibleModels[model];
  }
  return 0;
};

const grantOpmode = function(version) {
  if (version.match(versionRegex)) {
    return (versionCompare(version, '0.25.0') >= 0);
  } else {
    // Development version, enable everything by default
    return true;
  }
  return false;
};

DeviceVersion.findByVersion = function(version, is5ghzCapable, model) {
  let result = {};
  result.grantViewLogs = grantViewLogs(version);
  result.grantResetDevices = grantResetDevices(version);
  result.grantPortForward = grantPortForward(version);
  result.grantPortForwardAsym = grantPortForwardAsym(version);
  result.grantPortOpenIpv6 = grantPortOpenIpv6(version);
  result.grantWifi5ghz = grantWifi5ghz(version, is5ghzCapable);
  result.grantWifiBand = grantWifiBand(version);
  result.grantWifiState = grantWifiState(version);
  result.grantPingTest = grantPingTest(version);
  result.grantLanEdit = grantLanEdit(version);
  result.grantLanGwEdit = grantLanGwEdit(version);
  result.grantLanDevices = grantLanDevices(version);
  result.grantUpnp = grantUpnp(version);
  result.grantSpeedTest = grantSpeedTest(version, model);
  result.grantSpeedTestLimit = grantSpeedTestLimit(version, model);
  result.grantOpmode = grantOpmode(version);
  return result;
};

module.exports = DeviceVersion;
