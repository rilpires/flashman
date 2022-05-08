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
    let permissions = DeviceVersion.findByVersion('0.30.0', true, 'ARCHERC5V4');

    expect(permissions.grantViewLogs).toStrictEqual(true);
    expect(permissions.grantResetDevices).toStrictEqual(true);
    expect(permissions.grantPortForward).toStrictEqual(true);
    expect(permissions.grantPortForwardAsym).toStrictEqual(true);
    expect(permissions.grantPortOpenIpv6).toStrictEqual(true);
    expect(permissions.grantWifi5ghz).toStrictEqual(true);
    expect(permissions.grantWifiBand).toStrictEqual(true);
    expect(permissions.grantWifiBandAuto).toStrictEqual(true);
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
    let permissionsP1T4 = DeviceVersion.findByVersion(
      'V1.1.20P1T4', true, 'F670L',
    );
    let permissionsP1T18 = DeviceVersion.findByVersion(
      'V1.1.20P1T18', true, 'F670L',
    );
    let permissionsP3N3 = DeviceVersion.findByVersion(
      'V1.1.20P3N3', true, 'F670L',
    );

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
    let permissionsC5 = DeviceVersion.findByVersion(
      'V3.0.0C5_MUL', true, 'ZXHN H198A V3.0',
    );
    let permissionsC6 = DeviceVersion.findByVersion(
      'V3.0.0C6_MUL', true, 'ZXHN H198A V3.0',
    );

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
    let permissions123 = DeviceVersion.findByVersion(
      'V1.2.3', true, 'GONUAC001',
    );

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
    let permissionsA89 = DeviceVersion.findByVersion(
      '3FE46343AFIA89', true, 'G-140W-C',
    );

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
    let permissionsV3 = DeviceVersion.findByVersion(
      'V3R017C10S100', true, 'HG8245Q2',
    );

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
