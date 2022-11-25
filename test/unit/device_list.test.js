/* global __line */
require('../../bin/globals.js');
const {MongoClient} = require('mongodb');
const mockingoose = require('mockingoose');
process.env.FLM_GENIE_IGNORED = 'asd';
const deviceListController = require('../../controllers/device_list');
const acsDeviceInfo = require('../../controllers/acs_device_info');
const meshHandlers = require('../../controllers/handlers/mesh');
const TasksAPI = require('../../controllers/external-genieacs/tasks-api');
const DeviceModel = require('../../models/device');
const ConfigModel = require('../../models/config');
const RoleModel = require('../../models/role');
const utils = require('../utils');
const t = require('../../controllers/language').i18next.t;

const tt = function(msg) {
  return msg.replace(/ \(.*\)/, '');
};

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

  /* list of functions that may be mocked:
    DeviceModel.findByMacOrSerial
    Config.findOne
    meshHandlers.validateMeshMode
    meshHandlers.syncSlaves
    Role.findOne
      acsDeviceInfo.configTR069VirtualAP
      deviceListController.ensureBssidCollected
      mqtt.anlixMessageRouterUpdate
      acsDeviceInfo.updateInfo
    matchedDevice.save
  */
  /*
    input:
      req.params.id - valid (mac|serial|alt_uid)
      req.body.content: - valid values
        connection_type
        pppoe_user
        pppoe_password
        wan_mtu
        wan_vlan
        ipv6_enabled
        lan_subnet
        lan_netmask
        wifi_ssid
        wifi_password
        wifi_channel
        wifi_band
        wifi_mode
        wifi_power
        wifi_state
        wifi_hidden
        wifi_ssid_5ghz
        wifi_password_5ghz
        wifi_channel_5ghz
        wifi_band_5ghz
        wifi_mode_5ghz
        wifi_power_5ghz
        wifi_state_5ghz
        wifi_hidden_5ghz
        isSsidPrefixEnabled
        bridgeEnabled
        bridgeDisableSwitch
        bridgeFixIP
        bridgeFixGateway
        bridgeFixDNS
        mesh_mode
        external_reference
        slave_custom_configs
    output:
      res.status - (500), (403), (200)
      res.json :
        [x] - ({success: false, message: t('cpeFindError'), errors : []}),
        [x] - ({success: false, message: t('cpeNotFound'), errors : []}),
        [x] - ({success: false, message: t('configFindError'), errors : []}),
        [x] - ({success: false, message: t('connectionTypeShouldBePppoeDhcp'),
                errors : []}),
        [x] - ({success: false, type: 'danger',
                message: t('errorSendingMeshParamtersToCpe')}),
        [x] - ({success: false, type: 'danger',
                message: '[!] -> 'task error' in ${acsID}'}),
        [x] - ({success: false, message: t('enabledToModifyFields'),
                errors : []}),
        [x] - ({success: false, message: t('notEnoughPermissionsForFields'),
                errors : []}),
        [x] - Trying modify WAN and MTU values without permission
        [x] - ({success: false, message: t('cpeSaveError'), errors : []}),
        [x] - ({[ -- matchedDevice --]}),
        [x] - modify WAN and MTU with success
        [x] - ({success: false, message: t('fieldsInvalidCheckErrors'),
                errors : {pppoe_user: ''}}),
        [x] - ({success: false, message: t('fieldNameInvalid'), errors : []})
    total test = 12 */
  test('setDeviceReg: Find error', async () => {
    mockingoose(DeviceModel).toReturn(new Error('test'), 'find');
    const req = {
      params: {
        id: '',
      },
      body: {
        content: {},
      },
    };
    const res = utils.mockResponse();
    // Test
    await deviceListController.setDeviceReg(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].message)
      .toMatch(tt(t('cpeFindError', {errorline: __line})));
    expect(res.json.mock.lastCall[0].errors.length).toBe(0);
  });

  test('setDeviceReg: CPE not found', async () => {
    const deviceMock = [{
      _id: 'AB:AB:AB:AB:AB:AB',
      version: '0.40.0',
      model: 'Router Model',
      wifi_is_5ghz_capable: true,
      mesh_mode: 0,
      pppoe_password: 'dummypass',
    }];
    const returnDeviceMock = (query) => {
      if (query.getQuery()['$or'][0]._id['$regex']
          .toString().includes(deviceMock[0]._id)) {
        return deviceMock;
      }
    };

    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'find');
    const req = {
      params: {
        id: 'BA:BA:BA:BA:BA:BA',
      },
      body: {
        content: {},
      },
    };
    const res = utils.mockResponse();
    // Test
    await deviceListController.setDeviceReg(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].message)
      .toMatch(tt(t('cpeNotFound', {errorline: __line})));
    expect(res.json.mock.lastCall[0].errors.length).toBe(0);
  });

  test('setDeviceReg: Config find error', async () => {
    const deviceMock = [{
      _id: 'AB:AB:AB:AB:AB:AB',
      version: '0.40.0',
      model: 'Router Model',
      wifi_is_5ghz_capable: true,
      mesh_mode: 0,
      pppoe_password: 'dummypass',
    }];
    const returnDeviceMock = (query) => {
      if (query.getQuery()['$or'][0]._id['$regex']
          .toString().includes(deviceMock[0]._id)) {
        return deviceMock;
      }
    };
    const configMock = {
      is_default: false,
      tr069: undefined,
      certification: undefined,
    };
    const returnConfigMock = (query) => {
      if (query.getQuery().is_default == configMock.is_default) {
        return configMock;
      } else {
        return null;
      }
    };
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'find');
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    const req = {
      params: {
        id: 'AB:AB:AB:AB:AB:AB',
      },
      body: {
        content: {},
      },
    };
    const res = utils.mockResponse();
    // Test
    await deviceListController.setDeviceReg(req, res);
    await new Promise((resolve)=>setTimeout(resolve, 55));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].message)
      .toMatch(tt(t('configFindError', {errorline: __line})));
    expect(res.json.mock.lastCall[0].errors.length).toBe(0);
  });

  test('setDeviceReg: Connection type should be pppoe or dhcp', async () => {
    const deviceMock = [{
      _id: 'AB:AB:AB:AB:AB:AB',
      version: '0.40.0',
      model: 'Router Model',
      wifi_is_5ghz_capable: true,
      mesh_mode: 0,
      pppoe_password: 'dummypass',
    }];
    const returnDeviceMock = (query) => {
      if (query.getQuery()['$or'][0]._id['$regex']
          .toString().includes(deviceMock[0]._id)) {
        return deviceMock;
      }
    };
    const configMock = {
      is_default: true,
      tr069: undefined,
      certification: undefined,
    };
    const returnConfigMock = (query) => {
      if (query.getQuery().is_default == configMock.is_default) {
        return configMock;
      } else {
        return null;
      }
    };
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'find');
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    const req = {
      params: {
        id: 'AB:AB:AB:AB:AB:AB',
      },
      body: {
        content: {
          connection_type: 'asd',
        },
      },
    };
    const res = utils.mockResponse();
    // Test
    await deviceListController.setDeviceReg(req, res);
    await new Promise((resolve)=>setTimeout(resolve, 55));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].message)
      .toMatch(tt(t('connectionTypeShouldBePppoeDhcp', {errorline: __line})));
  });

  test('setDeviceReg: Error sending mesh paramaters to CPE', async () => {
    const deviceMock = [{
      _id: 'AB:AB:AB:AB:AB:AB',
      version: '0.40.0',
      model: 'F670L',
      acs_id: 'test-F670L-test',
      use_tr069: true,
      wifi_is_5ghz_capable: true,
      mesh_mode: 0,
      pppoe_password: 'dummypass',
    }];
    const returnDeviceMock = (query) => {
      if (query.getQuery()['$or'][0]._id['$regex']
          .toString().includes(deviceMock[0]._id)) {
        return deviceMock;
      }
    };
    const configMock = {
      is_default: true,
      tr069: undefined,
      certification: undefined,
    };
    const returnConfigMock = (query) => {
      if (query.getQuery().is_default == configMock.is_default) {
        return configMock;
      } else {
        return null;
      }
    };
    const roleMock = {
      name: 'tester',
      grantOpmodeEdit: true,
    };
    const returnRoleMock = (query) => {
      if (query.getQuery().name == roleMock.name) {
        return roleMock;
      } else {
        return null;
      }
    };
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'find');
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    mockingoose(RoleModel).toReturn(returnRoleMock, 'findOne');
    acsDeviceInfo.updateInfo = function(a, b) {
      return;
    };
    const req = {
      params: {
        id: 'AB:AB:AB:AB:AB:AB',
      },
      body: {
        content: {
          mesh_mode: 1,
        },
      },
      user: {
        role: 'tester',
      },
    };
    const res = utils.mockResponse();
    // Test
    await deviceListController.setDeviceReg(req, res);
    await new Promise((resolve)=>setTimeout(resolve, 55));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].message)
      .toMatch(tt(t('errorSendingMeshParamtersToCpe', {errorline: __line})));
  });

  test('setDeviceReg: Ensure bssid collect error', async () => {
    const deviceMock = [{
      _id: 'AB:AB:AB:AB:AB:AB',
      version: '0.40.0',
      model: 'F670L',
      acs_id: 'test-F670L-test',
      use_tr069: true,
      wifi_is_5ghz_capable: true,
      mesh_mode: 0,
      pppoe_password: 'dummypass',
    }];
    const returnDeviceMock = (query) => {
      if (query.getQuery()['$or'][0]._id['$regex']
          .toString().includes(deviceMock[0]._id)) {
        return deviceMock;
      }
    };
    const configMock = {
      is_default: true,
      tr069: undefined,
      certification: undefined,
    };
    const returnConfigMock = (query) => {
      if (query.getQuery().is_default == configMock.is_default) {
        return configMock;
      } else {
        return null;
      }
    };
    const roleMock = {
      name: 'tester',
      grantOpmodeEdit: true,
    };
    const returnRoleMock = (query) => {
      if (query.getQuery().name == roleMock.name) {
        return roleMock;
      } else {
        return null;
      }
    };
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'find');
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    mockingoose(RoleModel).toReturn(returnRoleMock, 'findOne');
    acsDeviceInfo.updateInfo = function(a, b) {
      return true;
    };
    meshHandlers.validateMeshMode = function(a, b, c) {
      return {success: true};
    };
    TasksAPI.addTask = function(a, b) {
      return;
    };
    const req = {
      params: {
        id: 'AB:AB:AB:AB:AB:AB',
      },
      body: {
        content: {
          mesh_mode: 4,
        },
      },
      user: {
        role: 'tester',
      },
    };
    const res = utils.mockResponse();
    // Test
    await deviceListController.setDeviceReg(req, res);
    await new Promise((resolve)=>setTimeout(resolve, 4555));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].type).toBe('danger');
    expect(res.json.mock.lastCall[0].message)
      .toMatch('task error');
  }, 10000);

  test('setDeviceReg: CPE save error', async () => {
    const deviceMock = [{
      _id: 'AB:AB:AB:AB:AB:AB',
      version: '0.40.0',
      model: 'Router Model',
      wifi_is_5ghz_capable: true,
      mesh_mode: 0,
      pppoe_password: 'dummypass',
    }];
    const returnDeviceMock = (query) => {
      if (query.getQuery()['$or'][0]._id['$regex']
          .toString().includes(deviceMock[0]._id)) {
        return deviceMock;
      }
    };
    const configMock = {
      is_default: true,
      tr069: undefined,
      certification: undefined,
    };
    const returnConfigMock = (query) => {
      if (query.getQuery().is_default == configMock.is_default) {
        return configMock;
      } else {
        return null;
      }
    };
    const roleMock = {
      name: 'tester',
    };
    const returnRoleMock = (query) => {
      if (query.getQuery().name == roleMock.name) {
        return roleMock;
      } else {
        return null;
      }
    };
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'find');
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    mockingoose(RoleModel).toReturn(returnRoleMock, 'findOne');
    mockingoose(DeviceModel).toReturn(new Error('test'), 'save');
    const req = {
      params: {
        id: 'AB:AB:AB:AB:AB:AB',
      },
      body: {
        content: {},
      },
      user: {
        role: 'tester',
      },
    };
    const res = utils.mockResponse();
    // Test
    await deviceListController.setDeviceReg(req, res);
    await new Promise((resolve)=>setTimeout(resolve, 55));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].message)
      .toMatch(tt(t('cpeSaveError', {errorline: __line})));
  });

  test('setDeviceReg: CPE matchedDevice save success', async () => {
    const deviceMock = [{
      _id: 'AB:AB:AB:AB:AB:AB',
      version: '0.42.0',
      model: 'test',
      wifi_is_5ghz_capable: true,
      mesh_mode: 0,
      pppoe_password: 'dummypass',
      wifi_ssid: 'old-wifi-test',
      wifi_ssid_5ghz: 'old-wifi-test-5g',
      wifi_state: 0,
      wifi_state_5ghz: 1,
    }];
    const returnDeviceMock = (query) => {
      if (query.getQuery()['$or'][0]._id['$regex']
          .toString().includes(deviceMock[0]._id)) {
        return deviceMock;
      }
    };
    const configMock = {
      is_default: true,
      tr069: undefined,
      certification: undefined,
    };
    const returnConfigMock = (query) => {
      if (query.getQuery().is_default == configMock.is_default) {
        return configMock;
      } else {
        return null;
      }
    };
    const roleMock = {
      name: 'tester',
      grantWifiInfo: 2,
    };
    const returnRoleMock = (query) => {
      if (query.getQuery().name == roleMock.name) {
        return roleMock;
      } else {
        return null;
      }
    };
    const returnModifiedDeviceMock = {};
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'find');
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    mockingoose(RoleModel).toReturn(returnRoleMock, 'findOne');
    mockingoose(DeviceModel).toReturn(returnModifiedDeviceMock, 'save');
    acsDeviceInfo.updateInfo = function(a, b) {
      return 'ok';
    };
    meshHandlers.syncSlaves = function(a, b) {
      return 'ok';
    };
    const req = {
      params: {
        id: 'AB:AB:AB:AB:AB:AB',
      },
      body: {
        content: {
          wifi_ssid: 'new-wifi-test',
          wifi_ssid_5ghz: 'new-wifi-test-5g',
        },
      },
      user: {
        role: 'tester',
      },
    };
    const res = utils.mockResponse();
    // Test
    await deviceListController.setDeviceReg(req, res);
    await new Promise((resolve)=>setTimeout(resolve, 55));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.lastCall[0]._id).toBe('AB:AB:AB:AB:AB:AB');
    expect(res.json.mock.lastCall[0].wifi_ssid).toBe('new-wifi-test');
    expect(res.json.mock.lastCall[0].wifi_ssid_5ghz).toBe('new-wifi-test-5g');
  });

  test('setDeviceReg: modify WAN and MTU with success', async () => {
    const deviceMock = [{
      _id: 'AB:AB:AB:AB:AB:AB',
      version: '0.42.0',
      model: 'test',
      wifi_is_5ghz_capable: true,
      mesh_mode: 0,
      pppoe_password: 'dummypass',
      wan_vlan_id: 1,
      wan_mtu: 1500,
    }];
    const returnDeviceMock = (query) => {
      if (query.getQuery()['$or'][0]._id['$regex']
          .toString().includes(deviceMock[0]._id)) {
        return deviceMock;
      }
    };
    const configMock = {
      is_default: true,
      tr069: undefined,
      certification: undefined,
    };
    const returnConfigMock = (query) => {
      if (query.getQuery().is_default == configMock.is_default) {
        return configMock;
      } else {
        return null;
      }
    };
    const roleMock = {
      name: 'tester',
      grantWanAdvancedInfo: 2,
    };
    const returnRoleMock = (query) => {
      if (query.getQuery().name == roleMock.name) {
        return roleMock;
      } else {
        return null;
      }
    };
    const returnModifiedDeviceMock = {};
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'find');
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    mockingoose(RoleModel).toReturn(returnRoleMock, 'findOne');
    mockingoose(DeviceModel).toReturn(returnModifiedDeviceMock, 'save');
    acsDeviceInfo.updateInfo = function(a, b) {
      return 'ok';
    };
    meshHandlers.syncSlaves = function(a, b) {
      return 'ok';
    };
    const req = {
      params: {
        id: 'AB:AB:AB:AB:AB:AB',
      },
      body: {
        content: {
          wan_mtu: 1492,
          wan_vlan: 2,
        },
      },
      user: {
        role: 'tester',
      },
    };
    const res = utils.mockResponse();
    // Test
    await deviceListController.setDeviceReg(req, res);
    await new Promise((resolve)=>setTimeout(resolve, 55));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.lastCall[0]._id).toBe('AB:AB:AB:AB:AB:AB');
    expect(res.json.mock.lastCall[0].wan_mtu).toBe(1492);
    expect(res.json.mock.lastCall[0].wan_vlan_id).toBe(2);
  });

  test('setDeviceReg: Enabled to modify fields', async () => {
    const deviceMock = [{
      _id: 'AB:AB:AB:AB:AB:AB',
      acs_id: 'test-AC10-test',
      version: 'V16.03.06.05_multi_BR01',
      // model: 'AC10',
      wifi_is_5ghz_capable: true,
      pppoe_password: 'dummypass',
      wifi_ssid: 'old-wifi-test',
      wifi_ssid_5ghz: 'old-wifi-test-5g',
      wifi_state: 0,
      wifi_state_5ghz: 0,
    }];
    const returnDeviceMock = (query) => {
      if (query.getQuery()['$or'][0]._id['$regex']
          .toString().includes(deviceMock[0]._id)) {
        return deviceMock;
      }
    };
    const configMock = {
      is_default: true,
      tr069: undefined,
      certification: undefined,
    };
    const returnConfigMock = (query) => {
      if (query.getQuery().is_default == configMock.is_default) {
        return configMock;
      } else {
        return null;
      }
    };
    const roleMock = {
      name: 'tester',
      grantWifiInfo: 2,
    };
    const returnRoleMock = (query) => {
      if (query.getQuery().name == roleMock.name) {
        return roleMock;
      } else {
        return null;
      }
    };
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'find');
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    mockingoose(RoleModel).toReturn(returnRoleMock, 'findOne');
    const req = {
      params: {
        id: 'AB:AB:AB:AB:AB:AB',
      },
      body: {
        content: {
          wifi_ssid: 'new-wifi-test',
          wifi_ssid_5ghz: 'new-wifi-test-5g',
        },
      },
      user: {
        role: 'tester',
      },
    };
    const res = utils.mockResponse();
    // Test
    await deviceListController.setDeviceReg(req, res);
    await new Promise((resolve)=>setTimeout(resolve, 55));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].message)
      .toMatch(tt(t('enabledToModifyFields', {errorline: __line})));
    expect(res.json.mock.lastCall[0].errors.length).toBe(0);
  });

  test('setDeviceReg: Not enough permissions fields', async () => {
    const deviceMock = [{
      _id: 'AB:AB:AB:AB:AB:AB',
      version: '0.40.0',
      model: 'W5-1200FV1',
      wifi_is_5ghz_capable: true,
      mesh_mode: 2,
      pppoe_password: 'dummypass',
    }];
    const returnDeviceMock = (query) => {
      if (query.getQuery()['$or'][0]._id['$regex']
          .toString().includes(deviceMock[0]._id)) {
        return deviceMock;
      }
    };
    const configMock = {
      is_default: true,
      tr069: undefined,
      certification: undefined,
      pppoePassLength: 10,
    };
    const returnConfigMock = (query) => {
      if (query.getQuery().is_default == configMock.is_default) {
        return configMock;
      } else {
        return null;
      }
    };
    const roleMock = {
      name: 'tester',
    };
    const returnRoleMock = (query) => {
      if (query.getQuery().name == roleMock.name) {
        return roleMock;
      } else {
        return null;
      }
    };
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'find');
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    mockingoose(RoleModel).toReturn(returnRoleMock, 'findOne');
    const req = {
      params: {
        id: 'AB:AB:AB:AB:AB:AB',
      },
      body: {
        content: {
          mesh_mode: 1,
        },
      },
      user: {
        role: 'tester',
      },
    };
    const res = utils.mockResponse();
    // Test
    await deviceListController.setDeviceReg(req, res);
    await new Promise((resolve)=>setTimeout(resolve, 55));
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].type).toBe('danger');
    expect(res.json.mock.lastCall[0].message)
      .toMatch(tt(t('notEnoughPermissionsForFields', {errorline: __line})));
  });

  test('setDeviceReg: Trying modify WAN'+
    ' and MTU values without permission', async () => {
    const deviceMock = [{
      _id: 'AB:AB:AB:AB:AB:AB',
      version: '0.40.0',
      model: 'W5-1200FV1',
      wifi_is_5ghz_capable: true,
      mesh_mode: 2,
      wan_vlan_id: 10,
      wan_mtu: 1480,
      pppoe_password: 'dummypass',
    }];
    const returnDeviceMock = (query) => {
      if (query.getQuery()['$or'][0]._id['$regex']
          .toString().includes(deviceMock[0]._id)) {
        return deviceMock;
      }
    };
    const configMock = {
      is_default: true,
      tr069: undefined,
      certification: undefined,
      pppoePassLength: 10,
    };
    const returnConfigMock = (query) => {
      if (query.getQuery().is_default == configMock.is_default) {
        return configMock;
      } else {
        return null;
      }
    };
    const roleMock = {
      name: 'tester',
      grantWanAdvancedInfo: 1,
    };
    const returnRoleMock = (query) => {
      if (query.getQuery().name == roleMock.name) {
        return roleMock;
      } else {
        return null;
      }
    };
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'find');
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    mockingoose(RoleModel).toReturn(returnRoleMock, 'findOne');
    const req = {
      params: {
        id: 'AB:AB:AB:AB:AB:AB',
      },
      body: {
        content: {
          mesh_mode: 1,
          wan_mtu: 1490,
          wan_vlan: 5,
        },
      },
      user: {
        role: 'tester',
      },
    };
    const res = utils.mockResponse();
    // Test
    await deviceListController.setDeviceReg(req, res);
    await new Promise((resolve)=>setTimeout(resolve, 55));
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].type).toBe('danger');
    expect(res.json.mock.lastCall[0].message)
      .toMatch(tt(t('notEnoughPermissionsForFields', {errorline: __line})));
  });

  test('setDeviceReg: Fields invalid check errors', async () => {
    const deviceMock = [{
      _id: 'AB:AB:AB:AB:AB:AB',
      version: '0.40.0',
      model: 'Router Model',
      wifi_is_5ghz_capable: true,
      mesh_mode: 0,
      pppoe_password: 'dummypass',
    }];
    const returnDeviceMock = (query) => {
      if (query.getQuery()['$or'][0]._id['$regex']
          .toString().includes(deviceMock[0]._id)) {
        return deviceMock;
      }
    };
    const configMock = {
      is_default: true,
      tr069: undefined,
      certification: undefined,
      pppoePassLength: 10,
    };
    const returnConfigMock = (query) => {
      if (query.getQuery().is_default == configMock.is_default) {
        return configMock;
      } else {
        return null;
      }
    };
    const roleMock = {
      name: 'tester',
    };
    const returnRoleMock = (query) => {
      if (query.getQuery().name == roleMock.name) {
        return roleMock;
      } else {
        return null;
      }
    };
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'find');
    mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
    mockingoose(RoleModel).toReturn(returnRoleMock, 'findOne');
    const req = {
      params: {
        id: 'AB:AB:AB:AB:AB:AB',
      },
      body: {
        content: {
          pppoe_user: 'test%user',
          pppoe_password: '12345',
        },
      },
      user: {
        role: 'tester',
      },
    };
    const res = utils.mockResponse();
    // Test
    await deviceListController.setDeviceReg(req, res);
    await new Promise((resolve)=>setTimeout(resolve, 55));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].message)
      .toMatch(tt(t('fieldsInvalidCheckErrors', {errorline: __line})));
    expect(res.json.mock.lastCall[0].errors.length).toBe(2);
  });

  test('setDeviceReg: Field name invalid', async () => {
    const deviceMock = [{
      _id: 'AB:AB:AB:AB:AB:AB',
      version: '0.40.0',
      model: 'Router Model',
      wifi_is_5ghz_capable: true,
      mesh_mode: 0,
      pppoe_password: 'dummypass',
    }];
    const returnDeviceMock = (query) => {
      if (query.getQuery()['$or'][0]._id['$regex']
          .toString().includes(deviceMock[0]._id)) {
        return deviceMock;
      }
    };
    mockingoose(DeviceModel).toReturn(returnDeviceMock, 'find');
    const req = {
      params: {
        id: 'AB:AB:AB:AB:AB:AB',
      },
      body: {
        content: '{}',
      },
    };
    const res = utils.mockResponse();
    // Test
    await deviceListController.setDeviceReg(req, res);
    await new Promise((resolve)=>setTimeout(resolve, 55));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].message)
      .toMatch(tt(t('fieldNameInvalid', {name: 'content', errorline: __line})));
  });
});
