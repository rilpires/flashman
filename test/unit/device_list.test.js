/* global __line */
require('../../bin/globals.js');
const {MongoClient} = require('mongodb');
const mockingoose = require('mockingoose');
process.env.FLM_GENIE_IGNORED = 'asd';
const deviceListController = require('../../controllers/device_list');
const DeviceModel = require('../../models/device');
const ConfigModel = require('../../models/config');
const RoleModel = require('../../models/role');
const UserModel = require('../../models/user');
const FirmwareModel = require('../../models/firmware');
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

  /* list of functions to mock:
    DeviceModel.findByMacOrSerial
    Config.findOne
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
      res.json - ({success: false, message: t('cpeFindError'), errors : []}),
        [x] - ({success: false, message: t('cpeNotFound'), errors : []}),
        [x] - ({success: false, message: t('configFindError'), errors : []}),
        [x] - ({success: false, message: t('connectionTypeShouldBePppoeDhcp'),
                errors : []}),
        [ ] - ({success: false, type: 'danger',
                message: t('errorSendingMeshParamtersToCpe')}),
        [ ] - ({success: false, type: 'danger', message:
                '[!] -> 'task error' in ${acsID}'}),
        [ ] - ({success: false, type: 'danger', message:
                '[!] -> 'invalid data' in ${acsID}'}),
        [x] - ({success: false, message: t('enabledToModifyFields'),
                errors : []}),
        [x] - ({success: false, message: t('notEnoughPermissionsForFields'),
                errors : []}),
        [x] - ({success: false, message: t('cpeSaveError'), errors : []}),
        [ ] - ({[ -- matchedDevice --]}),
        [x] - ({success: false, message: t('fieldsInvalidCheckErrors'),
                errors : {pppoe_user: ''}}),
        [x] - ({success: false, message: t('fieldNameInvalid'), errors : []})
    total test = 16 */
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
    await new Promise((resolve)=>setTimeout(resolve, 555));
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
    await new Promise((resolve)=>setTimeout(resolve, 555));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].message)
      .toMatch(tt(t('connectionTypeShouldBePppoeDhcp', {errorline: __line})));
  });

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
    await new Promise((resolve)=>setTimeout(resolve, 555));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].message)
      .toMatch(tt(t('cpeSaveError', {errorline: __line})));
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
    await new Promise((resolve)=>setTimeout(resolve, 555));
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
    await new Promise((resolve)=>setTimeout(resolve, 555));
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
    await new Promise((resolve)=>setTimeout(resolve, 555));
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
    await new Promise((resolve)=>setTimeout(resolve, 555));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.lastCall[0].success).toBe(false);
    expect(res.json.mock.lastCall[0].message)
      .toMatch(tt(t('fieldNameInvalid', {name: 'content', errorline: __line})));
  });
});
