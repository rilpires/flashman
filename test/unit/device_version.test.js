require('../../bin/globals.js');
const DeviceVersion = require('../../models/device_version');

const noRangePortForwawrdOpts = {
 simpleSymmetric: true,
 simpleAsymmetric: true,
 rangeSymmetric: false,
 rangeAsymmetric: false,
};

const noAsymRangePortForwawrdOpts = {
 simpleSymmetric: true,
 simpleAsymmetric: true,
 rangeSymmetric: true,
 rangeAsymmetric: false,
};

const fullSupportPortForwawrdOpts = {
  simpleSymmetric: true,
  simpleAsymmetric: true,
  rangeSymmetric: true,
  rangeAsymmetric: true,
};

describe('DeviceVersion API', () => {
  test('findByVersion on 0.30.0', () => {
    let permissions = DeviceVersion.devicePermissions(
      {version: '0.30.0', wifi_is_5ghz_capable: true, model: 'ARCHERC5V4'},
    );

    expect(permissions.grantViewLogs).toStrictEqual(true);
    expect(permissions.grantResetDevices).toStrictEqual(true);
    expect(permissions.grantPortForward).toStrictEqual(true);
    expect(permissions.grantPortForwardAsym).toStrictEqual(true);
    expect(permissions.grantPortOpenIpv6).toStrictEqual(true);
    expect(permissions.grantWifi5ghz).toStrictEqual(true);
    expect(permissions.grantWifiBandEdit).toStrictEqual(true);
    expect(permissions.grantWifiBandAuto2).toStrictEqual(true);
    expect(permissions.grantWifiState).toStrictEqual(true);
    expect(permissions.grantWifiPowerHiddenIpv6Box).toStrictEqual(true);
    expect(permissions.grantWifiExtendedChannels).toStrictEqual(false);
    expect(permissions.grantPingTest).toStrictEqual(true);
    expect(permissions.grantLanEdit).toStrictEqual(true);
    expect(permissions.grantLanGwEdit).toStrictEqual(true);
    expect(permissions.grantLanDevices).toStrictEqual(true);
    expect(permissions.grantSiteSurvey).toStrictEqual(true);
    expect(permissions.grantUpnp).toStrictEqual(true);
    expect(permissions.grantSpeedTest).toStrictEqual(true);
    expect(permissions.grantSpeedTestLimit).toStrictEqual(300);
    expect(permissions.grantBlockDevices).toStrictEqual(true);
    expect(permissions.grantOpmode).toStrictEqual(true);
    expect(permissions.grantVlanSupport).toStrictEqual(false);
    expect(permissions.grantWanBytesSupport).toStrictEqual(true);
    expect(permissions.grantPonSignalSupport).toStrictEqual(false);
    expect(permissions.grantMeshMode).toStrictEqual(true);
    expect(permissions.grantUpdateAck).toStrictEqual(true);
    expect(permissions.grantWpsFunction).toStrictEqual(true);
    expect(permissions.grantPortForwardOpts).toStrictEqual(undefined);
  });

  // TR-069 tests

  test('findByVersion on ZTE F670L', () => {
    let permissionsP1T4 = DeviceVersion.devicePermissions({
      version: 'V1.1.20P1T4',
      wifi_is_5ghz_capable: true,
      model: 'F670L',
      acs_id: '000000-F670L-000000',
    });
    let permissionsP1T18 = DeviceVersion.devicePermissions({
      version: 'V1.1.20P1T18',
      wifi_is_5ghz_capable: true,
      model: 'F670L',
      acs_id: '000000-F670L-000000',
    });
    let permissionsP3N3 = DeviceVersion.devicePermissions({
      version: 'V1.1.20P3N3',
      wifi_is_5ghz_capable: true,
      model: 'F670L',
      acs_id: '000000-F670L-000000',
    });

    [permissionsP1T4, permissionsP1T18, permissionsP3N3].forEach((permission)=>{
      expect(permission.grantPortForward).toStrictEqual(true);
      expect(permission.grantUpnp).toStrictEqual(false);
      expect(permission.grantWpsFunction).toStrictEqual(false);
      expect(permission.grantSpeedTest).toStrictEqual(false);
      expect(permission.grantSpeedTestLimit).toStrictEqual(0);
      expect(permission.grantBlockDevices).toStrictEqual(true);
      expect(permission.grantPonSignalSupport).toStrictEqual(true);
      expect(permission.grantPortForwardOpts).toStrictEqual(
        noRangePortForwawrdOpts,
      );
    });
  });

  test('findByVersion on ZTE H198A', () => {
    let permissionsC5 = DeviceVersion.devicePermissions({
      version: 'V3.0.0C5_MUL',
      wifi_is_5ghz_capable: true,
      model: 'ZXHN H198A V3.0',
      acs_id: '000000-ZXHN%20H198A%20V3%2E0-000000',
    });
    let permissionsC6 = DeviceVersion.devicePermissions({
      version: 'V3.0.0C6_MUL',
      wifi_is_5ghz_capable: true,
      model: 'ZXHN H198A V3.0',
      acs_id: '000000-ZXHN%20H198A%20V3%2E0-000000',
    });

    [permissionsC5, permissionsC6].forEach((permission)=>{
      expect(permission.grantPortForward).toStrictEqual(true);
      expect(permission.grantUpnp).toStrictEqual(false);
      expect(permission.grantWpsFunction).toStrictEqual(false);
      expect(permission.grantSpeedTest).toStrictEqual(true);
      expect(permission.grantSpeedTestLimit).toStrictEqual(100);
      expect(permission.grantBlockDevices).toStrictEqual(true);
      expect(permission.grantPonSignalSupport).toStrictEqual(false);
      expect(permission.grantPortForwardOpts).toStrictEqual(
        noAsymRangePortForwawrdOpts,
      );
    });
  });

  test('findByVersion on GONUAC001', () => {
    let permissions123 = DeviceVersion.devicePermissions({
      version: 'V1.2.3',
      wifi_is_5ghz_capable: true,
      model: 'GONUAC001',
      acs_id: '000000-GONUAC001-000000',
    });

    [permissions123].forEach((permission)=>{
      expect(permission.grantPortForward).toStrictEqual(true);
      expect(permission.grantUpnp).toStrictEqual(false);
      expect(permission.grantWpsFunction).toStrictEqual(false);
      expect(permission.grantSpeedTest).toStrictEqual(true);
      expect(permission.grantSpeedTestLimit).toStrictEqual(250);
      expect(permission.grantBlockDevices).toStrictEqual(false);
      expect(permission.grantPonSignalSupport).toStrictEqual(true);
      expect(permission.grantPortForwardOpts).toStrictEqual(
        fullSupportPortForwawrdOpts);
    });
  });

  test('findByVersion on G-140W-C', () => {
    let permissionsA89 = DeviceVersion.devicePermissions({
      version: '3FE46343AFIA89',
      wifi_is_5ghz_capable: true,
      model: 'G-140W-C',
      acs_id: '000000-G%2D140W%2DC-000000',
    });

    [permissionsA89].forEach((permission)=>{
      expect(permission.grantPortForward).toStrictEqual(false);
      expect(permission.grantUpnp).toStrictEqual(false);
      expect(permission.grantWpsFunction).toStrictEqual(false);
      expect(permission.grantSpeedTest).toStrictEqual(false);
      expect(permission.grantSpeedTestLimit).toStrictEqual(0);
      expect(permission.grantBlockDevices).toStrictEqual(false);
      expect(permission.grantPonSignalSupport).toStrictEqual(true);
      expect(permission.grantPortForwardOpts).toStrictEqual(undefined);
    });
  });

  test('findByVersion on HG8245Q2', () => {
    let permissionsV3 = DeviceVersion.devicePermissions({
      version: 'V3R017C10S100',
      wifi_is_5ghz_capable: true,
      model: 'HG8245Q2',
      acs_id: '000000-HG8245Q2-000000',
    });

    [permissionsV3].forEach((permission)=>{
      expect(permission.grantPortForward).toStrictEqual(true);
      expect(permission.grantUpnp).toStrictEqual(false);
      expect(permission.grantWpsFunction).toStrictEqual(false);
      expect(permission.grantSpeedTest).toStrictEqual(true);
      expect(permission.grantSpeedTestLimit).toStrictEqual(250);
      expect(permission.grantBlockDevices).toStrictEqual(false);
      expect(permission.grantPonSignalSupport).toStrictEqual(true);
      expect(permission.grantPortForwardOpts).toStrictEqual(
        noAsymRangePortForwawrdOpts);
    });
  });
});
