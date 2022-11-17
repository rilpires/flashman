require('../../bin/globals.js');
const {MongoClient} = require('mongodb');
const mockingoose = require('mockingoose');
const deviceListController = require('../../controllers/device_list');
const DeviceModel = require('../../models/device');
const ConfigModel = require('../../models/config');
const RoleModel = require('../../models/role');
const utils = require('../utils');

describe('Controllers - Device List', () => {
  let connection;

  beforeAll(async () => {
    connection = await MongoClient.connect(global.__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await connection.db();
  });

  afterAll(async () => {
    await connection.close();
  });

  /* list of functions to mock:
    Config.findOne
    new DeviceModel (?)
    newDevice.save
    acsDeviceInfoController.reportOnuDevices
    acsDeviceInfoController.updateInfo
    TasksAPI.addTask
    acsDeviceInfoController.syncDeviceData
    acsDeviceInfoController.changeAcRules
    http.request
  */
  /*
    input:
      req.body.data: - valid values
        wan:
        common:
          stun_enable
          stun_udp_conn_req_addr
          ip
          mac
          model
          alt_uid
          web_admin_username
          web_admin_password
          interval
          acs_url
          version
          hw_version
          uptime
        lan:
          subnet_mask
          router_ip
        wifi2, wifi5:
          ssid
          channel
          auto
          mode
          band
          bssid
          enable
        mesh2, mesh5:
          bssid
      cpe - DevicesAPI.instantiateCPEByModel(...).cpe
        modelSerial
        modelName
        fwVersion
        hwVersion
      permissions - DeviceVersion.devicePermissions([-- device --])
        device.acs_id *(defines if is tr069 or firmware)
        device.model
        device.version
        device.hw_version
        device.wifi_is_5ghz_capable
    output:
      result - true, false
    total test = 4 */
  test('createRegistry: ', async () => { expect(true).toBe(true); });
  /*
    input:
      device: - valid, invalid
        device.acs_id *(defines if is tr069 or firmware)
        device.model
        device.version
        device.hw_version
        device.wifi_is_5ghz_capable
    output:
      have been called -> TasksAPI.addTask(device.acs_id, task, cback)
    total test = 2 */
  test('requestSync: ', async () => { expect(true).toBe(true); });
  /*
    input:
      acsID
      dataToFetch
      parameterNames:
      cpe
    output:
      have been called -> syncDeviceData(acsID, device, acsData, permissions)
    total test = x (?) */
  test('fetchSyncResult: ', async () => { expect(true).toBe(true); });
  /*
    input:
      acsID
      device
      data
      permissions
    output:
    have been called -> acsDeviceInfoController.updateInfo(device, changes)
    total test = x (?) */
  test('syncDeviceData: ', async () => { expect(true).toBe(true); });
});
