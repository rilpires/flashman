/* global __line */
require('../../bin/globals.js');
const mockingoose = require('mockingoose');
process.env.FLM_GENIE_IGNORED = 'asd';
const acsPortForwardHandler = require(
  '../../controllers/handlers/acs/port_forward');
const deviceListController = require('../../controllers/device_list');
const acsDeviceInfo = require('../../controllers/acs_device_info');
const meshHandlers = require('../../controllers/handlers/mesh');
const utilsHandlers = require('../../controllers/handlers/util');
const TasksAPI = require('../../controllers/external-genieacs/tasks-api');
const DeviceVersion = require('../../models/device_version');
const DeviceModel = require('../../models/device');
const ConfigModel = require('../../models/config');
const RoleModel = require('../../models/role');
const UserModel = require('../../models/user');
const mqtt = require('../../mqtts');
const sio = require('../../sio');

let portForwardPermissions = [
  { // noAsymNoRanges: {
    simpleSymmetric: true,
    simpleAsymmetric: false,
    rangeSymmetric: false,
    rangeAsymmetric: false,
  },
  {// noRanges: {
   simpleSymmetric: true,
   simpleAsymmetric: true,
   rangeSymmetric: false,
   rangeAsymmetric: false,
  },
  {// noAsym: {
   simpleSymmetric: true,
   simpleAsymmetric: false,
   rangeSymmetric: true,
   rangeAsymmetric: false,
  },
  {// noAsymRanges: {
   simpleSymmetric: true,
   simpleAsymmetric: true,
   rangeSymmetric: true,
   rangeAsymmetric: false,
  },
  {// fullSupport: {
   simpleSymmetric: true,
   simpleAsymmetric: true,
   rangeSymmetric: true,
   rangeAsymmetric: true,
  }];

const utils = require('../utils');
const testUtils = require('../common/utils');
const models = require('../common/models');

jest.mock('../../mqtts', () => ({
  anlixMessageRouterUpdate: jest.fn(() => undefined),
  anlixMessageRouterWanInfo: jest.fn(() => undefined),
  anlixMessageRouterLanInfo: jest.fn(() => undefined),
  anlixMessageRouterUpStatus: jest.fn(() => undefined),
}));

const t = require('../../controllers/language').i18next.t;

const audit = require('../../controllers/audit');
jest.mock('../../controllers/audit', () => require('../fake_Audit'));

let testSetPortForwardTr069 = async function(device, content, permissions,
  rulesDiff, expectedSuccess, expectedMessage,
  expectedWrongPortMapping, calledChange) {
  // 'get permissions' mock
  jest.spyOn(DeviceVersion, 'devicePermissions')
    .mockReturnValue(permissions);
  // changePortForwardRules mock
  jest.spyOn(acsPortForwardHandler, 'changePortForwardRules');
  jest.spyOn(TasksAPI, 'getFromCollection')
    .mockReturnValue([]);
  jest.spyOn(TasksAPI, 'addTask')
    .mockReturnValue({success: true, executed: true});
  let ret = await deviceListController.setPortForwardTr069(device, content, {});
  expect(ret.message).toMatch(expectedMessage);
  expect(ret.success).toBe(expectedSuccess);
  if (calledChange) {
    expect(acsPortForwardHandler.changePortForwardRules)
      .toHaveBeenCalledWith(
        device, rulesDiff, null, expectedWrongPortMapping,
      );
  }
};

describe('Controllers - Device List', () => {
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
        connection_type, pppoe_user, pppoe_password, wan_mtu, wan_vlan,
        ipv6_enabled, lan_subnet, lan_netmask, wifi_ssid, wifi_password,
        wifi_channel, wifi_band, wifi_mode, wifi_power, wifi_state,
        wifi_hidden, wifi_ssid_5ghz, wifi_password_5ghz, wifi_channel_5ghz,
        wifi_band_5ghz, wifi_mode_5ghz, wifi_power_5ghz, wifi_state_5ghz,
        wifi_hidden_5ghz, isSsidPrefixEnabled, bridgeEnabled,
        bridgeDisableSwitch, bridgeFixIP, bridgeFixGateway,
        bridgeFixDNS, mesh_mode, external_reference, slave_custom_configs
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
    total test = 14 */
  describe('setDeviceReg', () => {
    test('Find error', async () => {
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
        .toMatch(utils.tt('cpeFindError', {errorline: __line}));
      expect(res.json.mock.lastCall[0].errors.length).toBe(0);
      expect(audit.cpe).toHaveBeenCalledTimes(0);
    });
    test('CPE not found', async () => {
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
      const res = utils.waitableMockResponse();
      // Test
      deviceListController.setDeviceReg(req, res);
      await res.json.waitToHaveBeenCalled(1);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json.mock.lastCall[0].success).toBe(false);
      expect(res.json.mock.lastCall[0].message)
        .toMatch(utils.tt('cpeNotFound', {errorline: __line}));
      expect(res.json.mock.lastCall[0].errors.length).toBe(0);
      expect(audit.cpe).toHaveBeenCalledTimes(0);
    });
    test('Config find error', async () => {
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
        .toMatch(utils.tt('configFindError', {errorline: __line}));
      expect(res.json.mock.lastCall[0].errors.length).toBe(0);
      expect(audit.cpe).toHaveBeenCalledTimes(0);
    });
    test('Connection type should be pppoe or dhcp', async () => {
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
        .toMatch(utils.tt('connectionTypeShouldBePppoeDhcp',
          {errorline: __line}));
      expect(audit.cpe).toHaveBeenCalledTimes(0);
    });
    test('Error sending mesh paramaters to CPE', async () => {
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
        .toMatch(utils.tt('errorSendingMeshParamtersToCpe',
        {errorline: __line}));
      expect(audit.cpe).toHaveBeenCalledTimes(0);
    });
    test('Ensure bssid collect error', async () => {
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
      const res = utils.waitableMockResponse();
      utilsHandlers.sleep = jest.fn().mockResolvedValue();

      // Test
      deviceListController.setDeviceReg(req, res);
      await res.json.waitToHaveBeenCalled(1);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json.mock.lastCall[0].success).toBe(false);
      expect(res.json.mock.lastCall[0].type).toBe('danger');
      expect(res.json.mock.lastCall[0].message)
        .toMatch('task error');
      expect(audit.cpe).toHaveBeenCalledTimes(0);
    });
    test('CPE save error', async () => {
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
        .toMatch(utils.tt('cpeSaveError', {errorline: __line}));
      expect(audit.cpe).toHaveBeenCalledTimes(0);
    });
    test('CPE matchedDevice save success', async () => {
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
      const res = utils.waitableMockResponse();
      // Test
      deviceListController.setDeviceReg(req, res);
      await res.json.waitToHaveBeenCalled(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.lastCall[0]._id).toBe('AB:AB:AB:AB:AB:AB');
      expect(res.json.mock.lastCall[0].wifi_ssid).toBe('new-wifi-test');
      expect(res.json.mock.lastCall[0].wifi_ssid_5ghz).toBe('new-wifi-test-5g');

      expect(audit.cpe).toHaveBeenCalledTimes(1);
      expect(audit.cpe.mock.lastCall[2]).toBe('edit');
      expect(audit.cpe.mock.lastCall[3]).toEqual({
        wifi2Ssid: {old: 'old-wifi-test', new: 'new-wifi-test'},
        wifi5Ssid: {old: 'old-wifi-test-5g', new: 'new-wifi-test-5g'},
      });
    });
    test('modify WAN and MTU with success', async () => {
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
      const res = utils.waitableMockResponse();
      // Test
      deviceListController.setDeviceReg(req, res);
      await res.json.waitToHaveBeenCalled(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.lastCall[0]._id).toBe('AB:AB:AB:AB:AB:AB');
      expect(res.json.mock.lastCall[0].wan_mtu).toBe(1492);
      expect(res.json.mock.lastCall[0].wan_vlan_id).toBe(2);

      expect(audit.cpe).toHaveBeenCalledTimes(1);
      expect(audit.cpe.mock.lastCall[2]).toBe('edit');
      expect(audit.cpe.mock.lastCall[3]).toEqual({
        wan_vlan: {old: 1, new: 2},
        wan_mtu: {old: 1500, new: 1492},
      });
    });
    test('Enabled to modify fields', async () => {
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
        .toMatch(utils.tt('enabledToModifyFields', {errorline: __line}));
      expect(res.json.mock.lastCall[0].errors.length).toBe(0);
      expect(audit.cpe).toHaveBeenCalledTimes(0);
    });
    test('Not enough permissions fields', async () => {
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
        .toMatch(utils.tt('notEnoughPermissionsForFields',
        {errorline: __line}));
      expect(audit.cpe).toHaveBeenCalledTimes(0);
    });

    test('Trying modify WAN'+
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
        .toMatch(utils.tt('notEnoughPermissionsForFields',
        {errorline: __line}));
      expect(audit.cpe).toHaveBeenCalledTimes(0);
    });
    test('Fields invalid check errors', async () => {
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
        .toMatch(utils.tt('fieldsInvalidCheckErrors', {errorline: __line}));
      expect(res.json.mock.lastCall[0].errors.length).toBe(2);
      expect(audit.cpe).toHaveBeenCalledTimes(0);
    });

    test('Field name invalid', async () => {
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
        .toMatch(utils.tt('fieldNameInvalid',
          {name: 'content', errorline: __line}));
    });
  });
  /* input:
      device:
        lan_subnet
        lan_netmask
        port_mapping
        wrong_port_mapping
      content:
        [{ip, external_port_start, external_port_end
          internal_port_start, internal_port_end}]
      user - {}
    output:
      'success-message object':
        success(2) - true, false
        message(12) - t('jsonError'), t('jsonInvalidFormat'),
          t('outOfSubnetRangeError'), t('fieldShouldBeFilledError'),
          t('portsSouldBeNumberError'), t('portsSouldBeBetweenError'),
          t('portRangesAreDifferentError'), t('portRangesInvertedLimitsError'),
          t('overlappingMappingError'), t('incompatibleRulesError'),
          t('cpeSaveError'), t('operationSuccessful')
    total tests = 13 */
  describe('setPortForwardTr069 function(device, content, user)', () => {
    it('jsonError', async () => {
      let device = {
        save: jest.fn(),
        lan_subnet: '192.168.1.1',
        lan_netmask: 24,
        port_mapping: [],
        wrong_port_mapping: false,
      };
      let content = '[{ip:192.168.10.10,external_port_start:1010,'+
        'external_port_end:1020,internal_port_start:1010,'+
        'internal_port_end:1020}]';
      let perms = {grantPortForwardOpts: portForwardPermissions[3]};
      await testSetPortForwardTr069(device, content, perms, 1, false,
        utils.tt('fieldNameInvalid', {name: 'content',
          errorline: __line}, false, false));
    });
    it('jsonInvalidFormat', async () => {
      let device = {
        save: jest.fn(),
        lan_subnet: '192.168.1.1',
        lan_netmask: 24,
        port_mapping: [],
        wrong_port_mapping: false,
      };
      let content = '[{"ip":"192.168.10.10","external_port_start":"1010",'+
        '"external_port_end":"1020"}]';
      let perms = {grantPortForwardOpts: portForwardPermissions[3]};
      await testSetPortForwardTr069(device, content, perms, 1, false,
        utils.tt('jsonInvalidFormat', {errorline: __line}, false, false));
    });
    it('outOfSubnetRangeError', async () => {
      let device = {
        save: jest.fn(),
        lan_subnet: '192.168.1.1',
        lan_netmask: 24,
        port_mapping: [],
        wrong_port_mapping: false,
      };
      let content = '[{"ip":"192.168.10.10","external_port_start":"1010",'+
        '"external_port_end":"1020","internal_port_start":"1010",'+
        '"internal_port_end":"1020"}]';
      let perms = {grantPortForwardOpts: portForwardPermissions[3]};
      await testSetPortForwardTr069(device, content, perms, 1, false,
        utils.tt('outOfSubnetRangeError',
        {ip: '192.168.10.10'}, false, false));
    });
    it('fieldShouldBeFilledError', async () => {
      let device = {
        save: jest.fn(),
        lan_subnet: '192.168.1.1',
        lan_netmask: 24,
        port_mapping: [],
        wrong_port_mapping: false,
      };
      let content = '[{"ip":"192.168.1.10","external_port_start":"",'+
        '"external_port_end":"","internal_port_start":"",'+
        '"internal_port_end":""}]';
      let perms = {grantPortForwardOpts: portForwardPermissions[3]};
      await testSetPortForwardTr069(device, content, perms, 1, false,
        utils.tt('fieldShouldBeFilledError',
        {ip: '192.168.1.10'}, false, false));
    });
    it('portsSouldBeNumberError', async () => {
      let device = {
        save: jest.fn(),
        lan_subnet: '192.168.1.1',
        lan_netmask: 24,
        port_mapping: [],
        wrong_port_mapping: false,
      };
      let content = '[{"ip":"192.168.1.10","external_port_start":"abc",'+
        '"external_port_end":"cde","internal_port_start":"abc",'+
        '"internal_port_end":"cde"}]';
      let perms = {grantPortForwardOpts: portForwardPermissions[3]};
      await testSetPortForwardTr069(device, content, perms, 1, false,
        utils.tt('portsSouldBeNumberError',
        {ip: '192.168.1.10'}, false, false));
    });
    it('portsSouldBeBetweenError', async () => {
      let device = {
        save: jest.fn(),
        lan_subnet: '192.168.1.1',
        lan_netmask: 24,
        port_mapping: [],
        wrong_port_mapping: false,
      };
      let content = '[{"ip":"192.168.1.10","external_port_start":"101042",'+
        '"external_port_end":"102042","internal_port_start":"101042",'+
        '"internal_port_end":"102042"}]';
      let perms = {grantPortForwardOpts: portForwardPermissions[3]};
      await testSetPortForwardTr069(device, content, perms, 1, false,
        utils.tt('portsSouldBeBetweenError',
        {ip: '192.168.1.10'}, false, false));
    });
    it('portRangesAreDifferentError', async () => {
      let device = {
        save: jest.fn(),
        lan_subnet: '192.168.1.1',
        lan_netmask: 24,
        port_mapping: [],
        wrong_port_mapping: false,
      };
      let content = '[{"ip":"192.168.1.10","external_port_start":"1010",'+
        '"external_port_end":"1020","internal_port_start":"1010",'+
        '"internal_port_end":"1030"}]';
      let perms = {grantPortForwardOpts: portForwardPermissions[3]};
      await testSetPortForwardTr069(device, content, perms, 1, false,
        utils.tt('portRangesAreDifferentError',
        {ip: '192.168.1.10'}, false, false));
    });
    it('portRangesInvertedLimitsError', async () => {
      let device = {
        save: jest.fn(),
        lan_subnet: '192.168.1.1',
        lan_netmask: 24,
        port_mapping: [],
        wrong_port_mapping: false,
      };
      let content = '[{"ip":"192.168.1.10","external_port_start":"1010",'+
        '"external_port_end":"920","internal_port_start":"1010",'+
        '"internal_port_end":"920"}]';
      let perms = {grantPortForwardOpts: portForwardPermissions[3]};
      await testSetPortForwardTr069(device, content, perms, 1, false,
        utils.tt('portRangesInvertedLimitsError',
        {ip: '192.168.1.10'}, false, false));
    });
    it('overlappingMappingError', async () => {
      let device = {
        save: jest.fn(),
        lan_subnet: '192.168.1.1',
        lan_netmask: 24,
        port_mapping: [],
        wrong_port_mapping: false,
      };
      let content = '[{"ip":"192.168.1.10","external_port_start":"1010",'+
        '"external_port_end":"1020","internal_port_start":"1010",'+
        '"internal_port_end":"1020"},{"ip":"192.168.1.20",'+
        '"external_port_start":"1020","external_port_end":"1030",'+
        '"internal_port_start":"1020","internal_port_end":"1030"}]';
      let perms = {grantPortForwardOpts: portForwardPermissions[3]};
      await testSetPortForwardTr069(device, content, perms, 2, false,
        utils.tt('overlappingMappingError',
        {ip: '192.168.1.10'}, false, false));
    });
    it('incompatibleRulesError', async () => {
      let device = {
        save: jest.fn(),
        lan_subnet: '192.168.1.1',
        lan_netmask: 24,
        port_mapping: [],
        wrong_port_mapping: false,
      };
      let content = '[{"ip": "192.168.1.10", "external_port_start": "1010",'+
        '"external_port_end": "1020", "internal_port_start": "1010",'+
        '"internal_port_end": "1020"}]';
      let perms = {grantPortForwardOpts: portForwardPermissions[0]};
      await testSetPortForwardTr069(device, content, perms, 1, false,
        utils.tt('incompatibleRulesError', {ip: '192.168.1.10'}, false, false));
    });
    it('cpeSaveError', async () => {
      let device = {
        save: jest.fn(() => {
          throw new Error('cpeSaveError test');
        }),
        lan_subnet: '192.168.1.1',
        lan_netmask: 24,
        port_mapping: [{ip: '192.168.1.10', external_port_start: 1010,
          external_port_end: 1010, internal_port_start: 1010,
          internal_port_end: 1010}],
        wrong_port_mapping: false,
      };
      let content = '[{"ip": "192.168.1.10", "external_port_start": "1010",'+
        '"external_port_end": "1010", "internal_port_start": "1010",'+
        '"internal_port_end": "1010"}]';
      let perms = {grantPortForwardOpts: portForwardPermissions[4]};
      await testSetPortForwardTr069(device, content, perms, 0, false,
        utils.tt('cpeSaveError', {errorline: __line}, false, false));
    });
    it('operationSuccessful', async () => {
      let device = {
        save: jest.fn(),
        lan_subnet: '192.168.1.1',
        lan_netmask: 24,
        port_mapping: [{ip: '192.168.1.10', external_port_start: 1010,
          external_port_end: 1010, internal_port_start: 1010,
          internal_port_end: 1010}],
        wrong_port_mapping: false,
      };
      let content = '[{"ip": "192.168.1.10", "external_port_start": "1010",'+
        '"external_port_end": "1010", "internal_port_start": "1010",'+
        '"internal_port_end": "1010"}]';
      let perms = {grantPortForwardOpts: portForwardPermissions[4]};
      await testSetPortForwardTr069(device, content, perms,
        0, true, utils.tt('operationSuccessful'), false, true);
    });
    it('operationSuccessful with wrong_port_mapping', async () => {
      let device = {
        save: jest.fn(),
        lan_subnet: '192.168.1.1',
        lan_netmask: 24,
        port_mapping: [],
        wrong_port_mapping: true,
      };
      let content = '[{"ip": "192.168.1.10", "external_port_start": "1010",'+
        '"external_port_end": "1010", "internal_port_start": "1010",'+
        '"internal_port_end": "1010"}]';
      let perms = {grantPortForwardOpts: portForwardPermissions[4]};
      await testSetPortForwardTr069(device, content, perms,
        1, true, utils.tt('operationSuccessful'), true, true);
    });
  });

  // Index route: Invalid filter
  test('Index: Invalid filter', async () => {
    // Mocks
    jest.spyOn(UserModel, 'findOne')
      .mockImplementationOnce(
        (query, callback) => callback(false, {is_superuser: true}),
      );
    jest.spyOn(ConfigModel, 'findOne')
      .mockImplementationOnce(
        // findOne receives the query parameter
        (query) => {
          // findOne returns a lean function
          return {lean: () => {
            // lean returns a exec function
            return {exec: (callback) => {
              // exec calls callback
              callback(true, false);
            }};
          }};
        },
      );


    // Execute and validate
    let response = await testUtils.common.sendFakeRequest(
      deviceListController.index,
      undefined, undefined,
      {},
    );
    expect(response.statusCode).toBe(200);
    expect(response.body.urlqueryfilterlist).toBe(undefined);
  });
  // Index route: Empty filter
  test('Index: Empty filter', async () => {
    // Mocks
    jest.spyOn(UserModel, 'findOne')
      .mockImplementationOnce(
        (query, callback) => callback(false, {is_superuser: true}),
      );
    jest.spyOn(ConfigModel, 'findOne')
      .mockImplementationOnce(
        // findOne receives the query parameter
        (query) => {
          // findOne returns a lean function
          return {lean: () => {
            // lean returns a exec function
            return {exec: (callback) => {
              // exec calls callback
              callback(true, false);
            }};
          }};
        },
      );


    // Execute and validate
    let response = await testUtils.common.sendFakeRequest(
      deviceListController.index,
      undefined, undefined,
      {
        filter: '',
      },
    );
    expect(response.statusCode).toBe(200);
    expect(response.body.urlqueryfilterlist).toBe(undefined);
  });


  // Index route: Invalid characters filter
  test('Index: Invalid characters filter', async () => {
    // Mocks
    jest.spyOn(UserModel, 'findOne')
      .mockImplementationOnce(
        (query, callback) => callback(false, {is_superuser: true}),
      );
    jest.spyOn(ConfigModel, 'findOne')
      .mockImplementationOnce(
        // findOne receives the query parameter
        (query) => {
          // findOne returns a lean function
          return {lean: () => {
            // lean returns a exec function
            return {exec: (callback) => {
              // exec calls callback
              callback(true, false);
            }};
          }};
        },
      );


    // Execute and validate
    let response = await testUtils.common.sendFakeRequest(
      deviceListController.index,
      undefined, undefined,
      {
        filter: ',,A,D,EEE,,,!,",,,<script>alert(1)</script>,/,/ou,',
      },

    );
    expect(response.statusCode).toBe(200);
    expect(response.body.urlqueryfilterlist).toBe('A,D,EEE,!,/,/ou');
    expect(audit.cpe).toHaveBeenCalledTimes(0);
  });


  // sendCommandMsg
  describe('sendCommandMsg', () => {
    // Invalid route
    test('Invalid route', async () => {
      // Mocks
      let device = models.defaultMockDevices[0];
      jest.spyOn(console, 'log').mockImplementationOnce(() => true);
      testUtils.common.mockDevices([device], 'find');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'abcdef',
          id: 'aa:bb:cc:dd:ee:ff',
        }, {id: '12345'},
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('commandNotFound').replace('({{errorline}})', ''),
      );
    });


    // No device found
    test('No device found', async () => {
      // Mocks
      testUtils.common.mockDevices(null, 'find');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'abcdef',
          id: 'aa:bb:cc:dd:ee:ff',
        }, {id: '12345'},
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('cpeNotFound').replace('({{errorline}})', ''),
      );
    });


    // Device not online
    test('Device not online', async () => {
      // Mocks
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0],
        {
          use_tr069: false,
        }, {id: '12345'},
      );
      testUtils.common.mockDevices([device], 'find');
      mqtt.unifiedClientsMap = {};

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'log',
          id: 'aa:bb:cc:dd:ee:ff',
        },
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('cpeNotOnline').replace('({{errorline}})', ''),
      );
    });


    // No permission - wanbytes
    test('No permission - wanbytes', async () => {
      // Mocks
      let device = models.defaultMockDevices[0];
      testUtils.common.mockDevices([device], 'find');
      testUtils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true, {grantStatisticsSupport: false}, {},
      );

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'wanbytes',
          id: 'aa:bb:cc:dd:ee:ff',
        }, {id: '12345'},
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('cpeWithoutFunction').replace('({{errorline}})', ''),
      );
    });


    // No permission - waninfo
    test('No permission - waninfo', async () => {
      // Mocks
      let device = models.defaultMockDevices[0];
      testUtils.common.mockDevices([device], 'find');
      testUtils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true, {grantWanLanInformation: false}, {},
      );

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'waninfo',
          id: 'aa:bb:cc:dd:ee:ff',
        }, {id: '12345'},
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('cpeWithoutFunction').replace('({{errorline}})', ''),
      );
    });


    // No permission - laninfo
    test('No permission - laninfo', async () => {
      // Mocks
      let device = models.defaultMockDevices[0];
      testUtils.common.mockDevices([device], 'find');
      testUtils.devicesAPICommon.mockInstantiateCPEByModelFromDevice(
        true, {grantWanLanInformation: false}, {},
      );

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'laninfo',
          id: 'aa:bb:cc:dd:ee:ff',
        }, {id: '12345'},
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('cpeWithoutFunction').replace('({{errorline}})', ''),
      );
    });


    // No sessionID - wanbytes
    test('No sessionID - wanbytes', async () => {
      // Mocks
      let device = models.defaultMockDevices[0];
      testUtils.common.mockDevices([device], 'find');
      jest.spyOn(DeviceVersion, 'devicePermissions')
        .mockImplementation(() => {
          return {grantStatisticsSupport: true};
        });
      let waitForSpy = jest.spyOn(sio, 'anlixWaitForStatisticsNotification')
        .mockImplementation(() => true);
      let requestStatsTR069Spy = jest.spyOn(acsDeviceInfo, 'requestStatistics')
        .mockImplementation(() => true);
      let requestStatsFirmSpy = jest.spyOn(mqtt, 'anlixMessageRouterUpStatus')
        .mockImplementation(() => true);

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'wanbytes',
          id: 'aa:bb:cc:dd:ee:ff',
        },
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(waitForSpy).not.toBeCalled();
      expect(requestStatsTR069Spy).toBeCalled();
      expect(requestStatsFirmSpy).not.toBeCalled();
    });


    // No sessionID - waninfo
    test('No sessionID - waninfo', async () => {
      // Mocks
      let device = models.defaultMockDevices[0];
      testUtils.common.mockDevices([device], 'find');
      jest.spyOn(DeviceVersion, 'devicePermissions')
        .mockImplementation(() => {
          return {grantWanLanInformation: true};
        });
      let waitForWanSpy = jest.spyOn(sio, 'anlixWaitForWanInfoNotification')
        .mockImplementation(() => true);
      let waitForLanSpy = jest.spyOn(sio, 'anlixWaitForLanInfoNotification')
        .mockImplementation(() => true);
      let requestWanSpy = jest.spyOn(acsDeviceInfo, 'requestWanInformation')
        .mockImplementation(() => true);
      let requestLanSpy = jest.spyOn(acsDeviceInfo, 'requestLanInformation')
        .mockImplementation(() => true);

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'waninfo',
          id: 'aa:bb:cc:dd:ee:ff',
        },
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(waitForWanSpy).not.toBeCalled();
      expect(waitForLanSpy).not.toBeCalled();
      expect(requestWanSpy).toBeCalled();
      expect(requestLanSpy).not.toBeCalled();
    });


    // No sessionID - laninfo
    test('No sessionID - laninfo', async () => {
      // Mocks
      let device = models.defaultMockDevices[0];
      testUtils.common.mockDevices([device], 'find');
      jest.spyOn(DeviceVersion, 'devicePermissions')
        .mockImplementation(() => {
          return {grantWanLanInformation: true};
        });
      let waitForWanSpy = jest.spyOn(sio, 'anlixWaitForWanInfoNotification')
        .mockImplementation(() => true);
      let waitForLanSpy = jest.spyOn(sio, 'anlixWaitForLanInfoNotification')
        .mockImplementation(() => true);
      let requestWanSpy = jest.spyOn(acsDeviceInfo, 'requestWanInformation')
        .mockImplementation(() => true);
      let requestLanSpy = jest.spyOn(acsDeviceInfo, 'requestLanInformation')
        .mockImplementation(() => true);

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'laninfo',
          id: 'aa:bb:cc:dd:ee:ff',
        },
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(waitForWanSpy).not.toBeCalled();
      expect(waitForLanSpy).not.toBeCalled();
      expect(requestWanSpy).not.toBeCalled();
      expect(requestLanSpy).toBeCalled();
    });


    // No sio connection - wanbytes
    test('No sio connection - wanbytes', async () => {
      // Mocks
      let device = models.defaultMockDevices[0];
      testUtils.common.mockDevices([device], 'find');
      jest.spyOn(DeviceVersion, 'devicePermissions')
        .mockImplementation(() => {
          return {grantStatisticsSupport: true};
        });
      let waitForSpy = jest.spyOn(sio, 'anlixWaitForStatisticsNotification')
        .mockImplementation(() => true);
      let requestStatsTR069Spy = jest.spyOn(acsDeviceInfo, 'requestStatistics')
        .mockImplementation(() => true);
      let requestStatsFirmSpy = jest.spyOn(mqtt, 'anlixMessageRouterUpStatus')
        .mockImplementation(() => true);
      let sessionID = 'sessionID';
      sio.anlixConnections[sessionID] = false;

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'wanbytes',
          id: 'aa:bb:cc:dd:ee:ff',
        }, sessionID,
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(waitForSpy).not.toBeCalled();
      expect(requestStatsTR069Spy).toBeCalled();
      expect(requestStatsFirmSpy).not.toBeCalled();
    });


    // No sio connection - waninfo
    test('No sio connection - waninfo', async () => {
      // Mocks
      let device = models.defaultMockDevices[0];
      testUtils.common.mockDevices([device], 'find');
      jest.spyOn(DeviceVersion, 'devicePermissions')
        .mockImplementation(() => {
          return {grantWanLanInformation: true};
        });
      let waitForWanSpy = jest.spyOn(sio, 'anlixWaitForWanInfoNotification')
        .mockImplementation(() => true);
      let waitForLanSpy = jest.spyOn(sio, 'anlixWaitForLanInfoNotification')
        .mockImplementation(() => true);
      let requestWanSpy = jest.spyOn(acsDeviceInfo, 'requestWanInformation')
        .mockImplementation(() => true);
      let requestLanSpy = jest.spyOn(acsDeviceInfo, 'requestLanInformation')
        .mockImplementation(() => true);
      let sessionID = 'sessionID';
      sio.anlixConnections[sessionID] = false;

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'waninfo',
          id: 'aa:bb:cc:dd:ee:ff',
        }, sessionID,
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(waitForWanSpy).not.toBeCalled();
      expect(waitForLanSpy).not.toBeCalled();
      expect(requestWanSpy).toBeCalled();
      expect(requestLanSpy).not.toBeCalled();
    });


    // No sio connection - laninfo
    test('No sio connection - laninfo', async () => {
      // Mocks
      let device = models.defaultMockDevices[0];
      testUtils.common.mockDevices([device], 'find');
      jest.spyOn(DeviceVersion, 'devicePermissions')
        .mockImplementation(() => {
          return {grantWanLanInformation: true};
        });
      let waitForWanSpy = jest.spyOn(sio, 'anlixWaitForWanInfoNotification')
        .mockImplementation(() => true);
      let waitForLanSpy = jest.spyOn(sio, 'anlixWaitForLanInfoNotification')
        .mockImplementation(() => true);
      let requestWanSpy = jest.spyOn(acsDeviceInfo, 'requestWanInformation')
        .mockImplementation(() => true);
      let requestLanSpy = jest.spyOn(acsDeviceInfo, 'requestLanInformation')
        .mockImplementation(() => true);
        let sessionID = 'sessionID';
        sio.anlixConnections[sessionID] = false;

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'laninfo',
          id: 'aa:bb:cc:dd:ee:ff',
        }, sessionID,
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(waitForWanSpy).not.toBeCalled();
      expect(waitForLanSpy).not.toBeCalled();
      expect(requestWanSpy).not.toBeCalled();
      expect(requestLanSpy).toBeCalled();
    });


    // TR069 - wanbytes
    test('TR069 - wanbytes', async () => {
      // Mocks
      let device = models.defaultMockDevices[0];
      testUtils.common.mockDevices([device], 'find');
      jest.spyOn(DeviceVersion, 'devicePermissions')
        .mockImplementation(() => {
          return {grantStatisticsSupport: true};
        });
      let waitForSpy = jest.spyOn(sio, 'anlixWaitForStatisticsNotification')
        .mockImplementation(() => true);
      let requestStatsTR069Spy = jest.spyOn(acsDeviceInfo, 'requestStatistics')
        .mockImplementation(() => true);
      let requestStatsFirmSpy = jest.spyOn(mqtt, 'anlixMessageRouterUpStatus')
        .mockImplementation(() => true);
      let sessionID = 'sessionID';
      sio.anlixConnections[sessionID] = true;

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'wanbytes',
          id: 'aa:bb:cc:dd:ee:ff',
        }, sessionID,
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(waitForSpy).toBeCalled();
      expect(requestStatsTR069Spy).toBeCalled();
      expect(requestStatsFirmSpy).not.toBeCalled();
    });


    // TR-069 - waninfo
    test('TR-069 - waninfo', async () => {
      // Mocks
      let device = models.defaultMockDevices[0];
      testUtils.common.mockDevices([device], 'find');
      jest.spyOn(DeviceVersion, 'devicePermissions')
        .mockImplementation(() => {
          return {grantWanLanInformation: true};
        });
      let waitForWanSpy = jest.spyOn(sio, 'anlixWaitForWanInfoNotification')
        .mockImplementation(() => true);
      let waitForLanSpy = jest.spyOn(sio, 'anlixWaitForLanInfoNotification')
        .mockImplementation(() => true);
      let requestWanSpy = jest.spyOn(acsDeviceInfo, 'requestWanInformation')
        .mockImplementation(() => true);
      let requestLanSpy = jest.spyOn(acsDeviceInfo, 'requestLanInformation')
        .mockImplementation(() => true);
      let sessionID = 'sessionID';
      sio.anlixConnections[sessionID] = true;

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'waninfo',
          id: 'aa:bb:cc:dd:ee:ff',
        }, sessionID,
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(waitForWanSpy).toBeCalled();
      expect(waitForLanSpy).not.toBeCalled();
      expect(requestWanSpy).toBeCalled();
      expect(requestLanSpy).not.toBeCalled();
    });


    // TR-069 - laninfo
    test('TR-069 - laninfo', async () => {
      // Mocks
      let device = models.defaultMockDevices[0];
      testUtils.common.mockDevices([device], 'find');
      jest.spyOn(DeviceVersion, 'devicePermissions')
        .mockImplementation(() => {
          return {grantWanLanInformation: true};
        });
      let waitForWanSpy = jest.spyOn(sio, 'anlixWaitForWanInfoNotification')
        .mockImplementation(() => true);
      let waitForLanSpy = jest.spyOn(sio, 'anlixWaitForLanInfoNotification')
        .mockImplementation(() => true);
      let requestWanSpy = jest.spyOn(acsDeviceInfo, 'requestWanInformation')
        .mockImplementation(() => true);
      let requestLanSpy = jest.spyOn(acsDeviceInfo, 'requestLanInformation')
        .mockImplementation(() => true);
      let sessionID = 'sessionID';
      sio.anlixConnections[sessionID] = true;

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'laninfo',
          id: 'aa:bb:cc:dd:ee:ff',
        }, sessionID,
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(waitForWanSpy).not.toBeCalled();
      expect(waitForLanSpy).toBeCalled();
      expect(requestWanSpy).not.toBeCalled();
      expect(requestLanSpy).toBeCalled();
    });


    // Flashbox - wanbytes
    test('Flashbox - wanbytes', async () => {
      // Mocks
      let device = models.defaultMockDevices[1];
      testUtils.common.mockDevices([device], 'find');
      jest.spyOn(DeviceVersion, 'devicePermissions')
        .mockImplementation(() => {
          return {grantStatisticsSupport: true};
        });
      let waitForSpy = jest.spyOn(sio, 'anlixWaitForStatisticsNotification')
        .mockImplementation(() => true);
      let requestStatsTR069Spy = jest.spyOn(acsDeviceInfo, 'requestStatistics')
        .mockImplementation(() => true);
      let requestStatsFirmSpy = jest.spyOn(mqtt, 'anlixMessageRouterUpStatus')
        .mockImplementation(() => true);
      let sessionID = 'sessionID';
      sio.anlixConnections[sessionID] = true;
      mqtt.unifiedClientsMap = {client: {'AA:BB:CC:DD:EE:FF': true}};

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'wanbytes',
          id: 'aa:bb:cc:dd:ee:ff',
        }, sessionID,
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(waitForSpy).toBeCalled();
      expect(requestStatsTR069Spy).not.toBeCalled();
      expect(requestStatsFirmSpy).toBeCalled();
    });


    // Flashbox - waninfo
    test('Flashbox - waninfo', async () => {
      // Mocks
      let device = models.defaultMockDevices[1];
      testUtils.common.mockDevices([device], 'find');
      jest.spyOn(DeviceVersion, 'devicePermissions')
        .mockImplementation(() => {
          return {grantWanLanInformation: true};
        });
      let waitForWanSpy = jest.spyOn(sio, 'anlixWaitForWanInfoNotification')
        .mockImplementation(() => true);
      let waitForLanSpy = jest.spyOn(sio, 'anlixWaitForLanInfoNotification')
        .mockImplementation(() => true);
      // Those functions were spied at the beginning of this file
      let requestWanSpy = mqtt.anlixMessageRouterWanInfo;
      let requestLanSpy = mqtt.anlixMessageRouterLanInfo;
      let sessionID = 'sessionID';
      sio.anlixConnections[sessionID] = true;
      mqtt.unifiedClientsMap = {client: {'AA:BB:CC:DD:EE:FF': true}};

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'waninfo',
          id: 'aa:bb:cc:dd:ee:ff',
        }, sessionID,
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(waitForWanSpy).toBeCalled();
      expect(waitForLanSpy).not.toBeCalled();
      expect(requestWanSpy).toBeCalled();
      expect(requestLanSpy).not.toBeCalled();
    });


    // Flashbox - laninfo
    test('Flashbox - laninfo', async () => {
      // Mocks
      let device = models.defaultMockDevices[1];
      testUtils.common.mockDevices([device], 'find');
      jest.spyOn(DeviceVersion, 'devicePermissions')
        .mockImplementation(() => {
          return {grantWanLanInformation: true};
        });
      let waitForWanSpy = jest.spyOn(sio, 'anlixWaitForWanInfoNotification')
        .mockImplementation(() => true);
      let waitForLanSpy = jest.spyOn(sio, 'anlixWaitForLanInfoNotification')
        .mockImplementation(() => true);
      // Those functions were spied at the beginning of this file
      let requestWanSpy = mqtt.anlixMessageRouterWanInfo;
      let requestLanSpy = mqtt.anlixMessageRouterLanInfo;
      let sessionID = 'sessionID';
      sio.anlixConnections[sessionID] = true;
      mqtt.unifiedClientsMap = {client: {'AA:BB:CC:DD:EE:FF': true}};

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.sendCommandMsg,
        null, null, null, null, {
          msg: 'laninfo',
          id: 'aa:bb:cc:dd:ee:ff',
        }, sessionID,
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(waitForWanSpy).not.toBeCalled();
      expect(waitForLanSpy).toBeCalled();
      expect(requestWanSpy).not.toBeCalled();
      expect(requestLanSpy).toBeCalled();
    });
  });


  // getWanInfo
  describe('getWanInfo', () => {
    // Invalid device
    test('Invalid device', async () => {
      // Mocks
      testUtils.common.mockDevices(null, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.getWanInfo,
        null, null, null, null, {
          id: '12345',
        },
      );

      // Validate
      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
    });


    // Empty device
    test('Empty device', async () => {
      // Mocks
      testUtils.common.mockDevices({_id: '1234'}, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.getWanInfo,
        null, null, null, null, {
          id: '12345',
        },
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.default_gateway_v4).toBe('');
      expect(response.body.default_gateway_v6).toBe('');
      expect(response.body.dns_server).toBe('');
      expect(response.body.pppoe_mac).toBe('');
      expect(response.body.pppoe_ip).toBe('');
      expect(response.body.ipv4_address).toBe('');
      expect(response.body.ipv4_mask).toBe('');
      expect(response.body.ipv6_address).toBe('');
      expect(response.body.ipv6_mask).toBe('');
    });


    // Full report - pppoe
    test('Full report - pppoe', async () => {
      // Mocks
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0],
        {
          connection_type: 'pppoe',
          default_gateway_v4: '192.168.0.1',
          default_gateway_v6: '2804::a1',
          dns_server: '8.8.8.8',
          pppoe_mac: 'aa:bb:cc:dd:ee:ff',
          pppoe_ip: '192.168.0.2',
          wan_ip: '192.168.0.3',
          wan_ipv4_mask: 15,
          wan_ipv6: '2804::a2',
          wan_ipv6_mask: 45,
        },
      );
      testUtils.common.mockDevices(device, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.getWanInfo,
        null, null, null, null, {
          id: '12345',
        },
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.default_gateway_v4).toBe(device.default_gateway_v4);
      expect(response.body.default_gateway_v6).toBe(device.default_gateway_v6);
      expect(response.body.dns_server).toBe(device.dns_server);
      expect(response.body.pppoe_mac).toBe(device.pppoe_mac);
      expect(response.body.pppoe_ip).toBe(device.pppoe_ip);
      expect(response.body.ipv4_address).toBe(device.wan_ip);
      expect(response.body.ipv4_mask).toBe(device.wan_ipv4_mask);
      expect(response.body.ipv6_address).toBe(device.wan_ipv6);
      expect(response.body.ipv6_mask).toBe(device.wan_ipv6_mask);
    });


    // Full report - dhcp
    test('Full report - dhcp', async () => {
      // Mocks
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0],
        {
          connection_type: 'dhcp',
          default_gateway_v4: '192.168.0.1',
          default_gateway_v6: '2804::a1',
          dns_server: '8.8.8.8',
          pppoe_mac: 'aa:bb:cc:dd:ee:ff',
          pppoe_ip: '192.168.0.2',
          wan_ip: '192.168.0.3',
          wan_ipv4_mask: 15,
          wan_ipv6: '2804::a2',
          wan_ipv6_mask: 45,
        },
      );
      testUtils.common.mockDevices(device, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.getWanInfo,
        null, null, null, null, {
          id: '12345',
        },
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.default_gateway_v4).toBe(device.default_gateway_v4);
      expect(response.body.default_gateway_v6).toBe(device.default_gateway_v6);
      expect(response.body.dns_server).toBe(device.dns_server);
      expect(response.body.pppoe_mac).toBe('');
      expect(response.body.pppoe_ip).toBe('');
      expect(response.body.ipv4_address).toBe(device.wan_ip);
      expect(response.body.ipv4_mask).toBe(device.wan_ipv4_mask);
      expect(response.body.ipv6_address).toBe(device.wan_ipv6);
      expect(response.body.ipv6_mask).toBe(device.wan_ipv6_mask);
    });
  });


  // getLanInfo
  describe('getLanInfo', () => {
    // Invalid device
    test('Invalid device', async () => {
      // Mocks
      testUtils.common.mockDevices(null, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.getLanInfo,
        null, null, null, null, {
          id: '12345',
        },
      );

      // Validate
      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
    });


    // Empty device
    test('Empty device', async () => {
      // Mocks
      testUtils.common.mockDevices({_id: '1234'}, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.getLanInfo,
        null, null, null, null, {
          id: '12345',
        },
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.prefix_delegation_addr).toBe('');
      expect(response.body.prefix_delegation_mask).toBe('');
      expect(response.body.prefix_delegation_local).toBe('');
    });


    // Full report - pppoe
    test('Full report - pppoe', async () => {
      // Mocks
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0],
        {
          connection_type: 'pppoe',
          prefix_delegation_addr: '2804::a5',
          prefix_delegation_mask: '76',
          prefix_delegation_local: '2804::a6',
        },
      );
      testUtils.common.mockDevices(device, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.getLanInfo,
        null, null, null, null, {
          id: '12345',
        },
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.prefix_delegation_addr)
        .toBe(device.prefix_delegation_addr);
      expect(response.body.prefix_delegation_mask)
        .toBe(device.prefix_delegation_mask);
      expect(response.body.prefix_delegation_local)
        .toBe(device.prefix_delegation_local);
    });


    // Full report - dhcp
    test('Full report - dhcp', async () => {
      // Mocks
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0],
        {
          connection_type: 'dhcp',
          prefix_delegation_addr: '2804::a5',
          prefix_delegation_mask: '76',
          prefix_delegation_local: '2804::a6',
        },
      );
      testUtils.common.mockDevices(device, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.getLanInfo,
        null, null, null, null, {
          id: '12345',
        },
      );

      // Validate
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.prefix_delegation_addr)
        .toBe(device.prefix_delegation_addr);
      expect(response.body.prefix_delegation_mask)
        .toBe(device.prefix_delegation_mask);
      expect(response.body.prefix_delegation_local)
        .toBe(device.prefix_delegation_local);
    });
  });


  // getDefaultLanDNSServers
  describe('getDefaultLanDNSServers', () => {
    test('Happy path', async () => {
      // Mocks
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0],
        {
          default_dns_servers: {ipv4: ['8.8.8.8'], ipv6: ['2800::1']},
        },
      );
      testUtils.common.mockConfigs(config, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.getDefaultLanDNSServers,
        null, null, null, null, {
          id: '12345',
        },
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.default_dns_servers)
        .toStrictEqual(config.default_dns_servers);
    });

    test('DB returns invalid Config', async () => {
      // Mocks
      testUtils.common.mockConfigs(null, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.getDefaultLanDNSServers,
        null, null, null, null, {
          id: '12345',
        },
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
    });
  });


  // setDefaultLanDNSServers
  describe('setDefaultLanDNSServers', () => {
    test('Happy path', async () => {
      // Mocks
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0],
        {
          default_dns_servers: {ipv4: ['8.8.8.8'], ipv6: ['2800::1']},
        },
      );
      testUtils.common.mockAwaitConfigs(config, 'findOne');

      let saveSpy = jest.spyOn(config, 'save');

      // Request data
      let newDNS = {ipv4: [], ipv6: []};
      let reqData = {default_dns_servers: newDNS};

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setDefaultLanDNSServers,
        reqData, null, null, null, {
          id: '12345',
        },
      );

      expect(saveSpy).toBeCalled();
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(config.default_dns_servers)
        .toStrictEqual(newDNS);
    });


    describe('Error on request format', () => {
      test.each(testUtils.common.TEST_PARAMETERS)(
        'Invalid field: %p', async (reqWrongData) => {
        // Mocks
        let config = models.copyConfigFrom(
          models.defaultMockConfigs[0],
          {
            default_dns_servers: {ipv4: ['8.8.8.8'], ipv6: ['2800::1']},
          },
        );
        testUtils.common.mockConfigs(config, 'findOne');

        let saveSpy = jest.spyOn(ConfigModel.prototype, 'save')
          .mockImplementationOnce(() => Promise.resolve());

        // Execute
        let response = await testUtils.common.sendFakeRequest(
          deviceListController.setDefaultLanDNSServers,
          reqWrongData, null, null, null, {
            id: '12345',
          },
        );

        expect(saveSpy).not.toBeCalled();
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
      });
    });


    test('Error on IPv4 format', async () => {
      // Mocks
      testUtils.common.mockConfigs(models.defaultMockConfigs[0], 'findOne');

      // Request data
      let reqData =
        {default_dns_servers: {ipv4: ['444.444.444.444'], ipv6: []}};

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setDefaultLanDNSServers,
        reqData, null, null, null, {
          id: '12345',
        },
      );
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
    });
  });


  // setLanDeviceName
  describe('setLanDeviceName', () => {
    // Invalid request
    test('Invalid request', async () => {
      // Mocks
      let jsonSpy = jest.fn();
      let responseMock = {status: () => ({
        json: jsonSpy,
      })};


      // Execute
      await deviceListController.setLanDeviceName(
        undefined, responseMock,
      );

      // Validate
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining(
          t('requestError').replace('({{errorline}})', ''),
        ),
      });
    });


    // Invalid body
    test('Invalid body', async () => {
      // Mocks
      let jsonSpy = jest.fn();
      let responseMock = {status: () => ({
        json: jsonSpy,
      })};


      // Execute
      await deviceListController.setLanDeviceName(
        {}, responseMock,
      );

      // Validate
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining(
          t('requestError').replace('({{errorline}})', ''),
        ),
      });
    });


    // Invalid device_id: invalid
    test('Invalid device_id: invalid', async () => {
      let data = {lan_device_id: '5678', name: 'teste123'};

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('parametersError').replace('({{errorline}})', ''),
      );
    });


    // Invalid device_id: undefined
    test('Invalid device_id: undefined', async () => {
      let data = {
        device_id: undefined, lan_device_id: '5678', name: 'teste123',
      };

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('parametersError').replace('({{errorline}})', ''),
      );
    });


    // Invalid device_id: not a string
    test('Invalid device_id: not a string', async () => {
      let data = {device_id: 867, lan_device_id: '5678', name: 'teste123'};

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('parametersError').replace('({{errorline}})', ''),
      );
    });


    // Invalid lan_device_id: invalid
    test('Invalid lan_device_id: invalid', async () => {
      let data = {device_id: '5678', name: 'teste123'};

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('parametersError').replace('({{errorline}})', ''),
      );
    });


    // Invalid lan_device_id: undefined
    test('Invalid lan_device_id: undefined', async () => {
      let data = {
        lan_device_id: undefined, device_id: '5678', name: 'teste123',
      };

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('parametersError').replace('({{errorline}})', ''),
      );
    });


    // Invalid lan_device_id: not a string
    test('Invalid lan_device_id: not a string', async () => {
      let data = {lan_device_id: 867, device_id: '5678', name: 'teste123'};

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('parametersError').replace('({{errorline}})', ''),
      );
    });


    // Invalid name: invalid
    test('Invalid name: invalid', async () => {
      let data = {device_id: '1234', lan_device_id: '5678'};

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('parametersError').replace('({{errorline}})', ''),
      );
    });


    // Invalid name: undefined
    test('Invalid name: undefined', async () => {
      let data = {
        name: undefined, device_id: '1234', lan_device_id: '5678',
      };

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('parametersError').replace('({{errorline}})', ''),
      );
    });


    // Invalid name: not a string
    test('Invalid name: not a string', async () => {
      let data = {name: 867, device_id: '1234', lan_device_id: '5678'};

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('parametersError').replace('({{errorline}})', ''),
      );
    });


    // Invalid name: Minimun length
    test('Invalid name: Minimun length', async () => {
      let data = {name: 'aa', device_id: '1234', lan_device_id: '5678'};

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('thisFieldMustHaveAtLeastMinChars', {min: 3}),
      );
    });


    // Invalid name: Maximun length
    test('Invalid name: Maximun length', async () => {
      let data = {
        name: 'a'.repeat(129), device_id: '1234', lan_device_id: '5678',
      };

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('thisFieldCannotHaveMoreThanMaxChars', {max: 128}),
      );
    });


    // Invalid name: Not accepted chars
    test.each([
      '"', '\'', '!', '@', '#', '$', '%', '&', '*', '(', ')',
      '+', '=', '`', '\'', '[', '{', '}', ']', '^', '~', 'ç',
      'Ç', '?', '/', '\\', '|', '<', '>',
    ])('Invalid name: Not accepted chars: %s', async (char) => {
      let data = {
        name: 'aaaa' + char, device_id: '1234', lan_device_id: '5678',
      };

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('acceptableCharsAre0-9a-zA-Z .-_,:;'),
      );
    });


    // Invalid device_id MAC
    test('Invalid device_id MAC', async () => {
      let data = {
        name: 'aaaaa', device_id: '1234', lan_device_id: '56:78:90:12:34:56',
      };

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('macInvalid').replace('({{errorline}})', ''),
      );
    });


    // Invalid lan_device_id MAC
    test('Invalid lan_device_id MAC', async () => {
      let data = {
        name: 'aaaaa', device_id: '12:34:56:78:90:12', lan_device_id: '5678',
      };

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('macInvalid').replace('({{errorline}})', ''),
      );
    });


    // No device found
    test('No device found', async () => {
      let data = {
        name: 'aaaaa',
        device_id: '12:34:56:78:90:12',
        lan_device_id: '56:78:90:12:34:56',
      };

      // Mocks
      testUtils.common.mockDevices(null, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('cpeFindError').replace('({{errorline}})', ''),
      );
    });


    // Device with no LAN device
    test('Device with no LAN device', async () => {
      let data = {
        name: 'aaaaa',
        device_id: '12:34:56:78:90:12',
        lan_device_id: '56:78:90:12:34:56',
      };
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {lan_devices: []},
      );

      // Mocks
      testUtils.common.mockDevices(device, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('lanDeviceFindError').replace('({{errorline}})', ''),
      );
    });


    // LAN device with invalid id
    test('LAN device with invalid id', async () => {
      let data = {
        name: 'aaaaa',
        device_id: '12:34:56:78:90:12',
        lan_device_id: '56:78:90:12:34:56',
      };
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {lan_devices: [{name: 'teste1'}]},
      );

      // Mocks
      testUtils.common.mockDevices(device, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('lanDeviceFindError').replace('({{errorline}})', ''),
      );
    });


    // LAN device with undefined id
    test('LAN device with undefined id', async () => {
      let data = {
        name: 'aaaaa',
        device_id: '12:34:56:78:90:12',
        lan_device_id: '56:78:90:12:34:56',
      };
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {lan_devices: [{mac: undefined, name: 'teste1'}]},
      );

      // Mocks
      testUtils.common.mockDevices(device, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('lanDeviceFindError').replace('({{errorline}})', ''),
      );
    });


    // LAN devices without wanted MAC
    test('LAN devices without wanted MAC', async () => {
      let data = {
        name: 'aaaaa',
        device_id: '12:34:56:78:90:12',
        lan_device_id: '56:78:90:12:34:56',
      };
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {lan_devices: [
          {mac: '12:34:56:78:90:12', name: 'teste1'},
          {mac: '12:34:56:78:90:13', name: 'teste2'},
          {mac: '12:34:56:78:90:14', name: 'teste3'},
        ]},
      );

      // Mocks
      testUtils.common.mockDevices(device, 'findOne');

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        t('lanDeviceFindError').replace('({{errorline}})', ''),
      );
    });


    // Normal operation
    test('Normal operation', async () => {
      const mac = '56:78:90:12:34:56';
      const oldName = 'teste2';
      const newName = 'aaaaa';

      let data = {
        name: newName,
        device_id: '12:34:56:78:90:12',
        lan_device_id: mac,
      };
      let device = models.copyDeviceFrom(
        models.defaultMockDevices[0]._id,
        {lan_devices: [
          {mac: '12:34:56:78:90:12', name: 'teste1'},
          {mac: mac, name: oldName},
          {mac: '12:34:56:78:90:14', name: 'teste3'},
        ]},
      );

      // Mocks
      let saveSpy = jest.fn();
      device.save = saveSpy;
      jest.spyOn(DeviceModel, 'findOne').mockImplementation(() => device);
      let auditSpy = jest.spyOn(audit, 'cpe').mockImplementation(() => true);

      // Execute
      let response = await testUtils.common.sendFakeRequest(
        deviceListController.setLanDeviceName, data,
      );

      // Validate
      let auditDevices = {lan_devices: {}};
      auditDevices.lan_devices[mac] = {name: {new: newName, old: oldName}};
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeUndefined();
      expect(saveSpy).toBeCalled();
      expect(device.lan_devices[1].name).toBe(data.name);
      expect(auditSpy).toHaveBeenCalledWith(
        {is_superuser: true, role: undefined},
        expect.anything(),
        'edit',
        auditDevices,
      );
    });
  });
});
