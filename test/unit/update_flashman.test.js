/* eslint require-jsdoc: 0 */
/* global __line */

require('../../bin/globals.js');
const mockingoose = require('mockingoose');
process.env.FLM_GENIE_IGNORED = 'asd';
const updateFlashmanController = require('../../controllers/update_flashman');
const ConfigModel = require('../../models/config');
const utils = require('../utils');
const commonUtils = require('../common/utils');
const models = require('../common/models');
const t = require('../../controllers/language').i18next.t;
const fs = require('fs');
const TasksAPI = require('../../controllers/external-genieacs/tasks-api');

// Mock the mqtts (avoid aedes)
jest.mock('../../mqtts', () => {
  return {
    __esModule: false,
    unifiedClientsMap: {},
    anlixMessageRouterUpdate: () => undefined,
    getConnectedClients: () => [],
  };
});

describe('Controllers - Update Flashman', () => {
  /* list of functions that may be mocked:
    Config.findOne
    Role.findOne
    Config.save
  */
  /*
  function: setAutoConfig
  input:
    req.user:
      role
      is_superuser
    req.body:
      autoupdate
      minlength-pass-pppoe
      bypass-mqtt-secret-check
      measure-server-ip
      measure-server-port
      must-block-license-at-removal
      pon-signal-threshold
      pon-signal-threshold-critical
      is-ssid-prefix-enabled
      ssid-prefix
      pon-signal-threshold-critical-high
      tr069-server-url
      onu-web-login
      onu-web-password
      onu_web_remote
      inform-interval
      sync-interval
      lost-informs-recovery-threshold
      lost-informs-offline-threshold
      stun_enable
      insecure_enable
      wan-step-required
      ipv4-step-required
      speedtest-step-required
      ipv6-step-required
      dns-step-required
      flashman-step-required
      selected-language
  output:
    res.status - 200, 500, status from language.updateLanguage
    res.json:
      [ ] - ({type: 'danger', message: t('fieldsInvalid')}) measureServerIP
      [ ] - ({type: 'danger', message: t('fieldsInvalid')}) measureServerPort
      [ ] - ({type: 'danger', message: t('fieldsInvalid')}) ponSignalThreshold
      [ ] - ({type: 'danger', message: t('fieldsInvalid')})
        ponSignalThresholdCritical
      [ ] - ({type: 'danger', message: t('fieldsInvalid')}) validateSSIDPrefix
      [ ] - ({type: 'danger', message: t('ssidPrefixEmptyError')})
      [ ] - ({type: 'danger', message: t('roleFindError')})
      [x] - ({type: 'danger', message: t('acceptableCharOnly0-9a-zA-Z @ul-.')})
      [x] - ({type: 'danger', message: t('tr069WebPasswordValidationError')})
      [ ] - ({type: 'danger', message: t('fieldsInvalid')}) tr069InformInterval
      [ ] - ({type: 'danger', message: message}) language.updateLanguage
      [x] - ({type: 'success', message: t('operationSuccessful')})
      [ ] - ({type: 'danger', message:
        t('configSaveError' || t('configNotFound')})
  total tests = 13 + x */
  describe('setAutoConfig function', () => {
    test('acceptableCharOnly0-9a-zA-Z @ul-.', async () => {
      const configMock = {
        is_default: true,
        tr069: {
          insecure_enable: true,
          web_login: '',
          web_password: '',
        },
        certification: undefined,
      };
      const returnConfigMock = (query) => {
        if (query.getQuery().is_default == configMock.is_default) {
          return configMock;
        } else {
          return null;
        }
      };
      mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
      const req = {
        params: {
          id: '',
        },
        user: {
          is_superuser: true,
        },
        body: {
          'selected-language': 'en',
          'insecure_enable': 'on',
          'ssid-prefix': '',
          'onu-web-login': 'admin!',
          'onu-web-password': 'Q!1wE@2r',
        },
      };
      const res = utils.mockResponse();
      // Test
      await updateFlashmanController.setAutoConfig(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json.mock.lastCall[0].message[0])
        .toMatch(utils.tt('acceptableCharOnly0-9a-zA-Z @ul-.',
          {errorline: __line}));
    });
    test('tr069WebPasswordValidationError', async () => {
      const configMock = {
        is_default: true,
        tr069: {
          insecure_enable: true,
          web_login: '',
          web_password: '',
        },
        certification: undefined,
      };
      const returnConfigMock = (query) => {
        if (query.getQuery().is_default == configMock.is_default) {
          return configMock;
        } else {
          return null;
        }
      };
      mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
      const req = {
        params: {
          id: '',
        },
        user: {
          is_superuser: true,
        },
        body: {
          'selected-language': 'en',
          'insecure_enable': 'on',
          'ssid-prefix': '',
          'onu-web-login': 'admin',
          'onu-web-password': '@aT1234567',
        },
      };
      const res = utils.mockResponse();
      // Test
      await updateFlashmanController.setAutoConfig(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json.mock.lastCall[0].message)
        .toMatch(utils.tt('tr069WebPasswordValidationError',
          {errorline: __line}));
    });
    test('operationSuccessful', async () => {
      const configMock = {
        is_default: true,
        tr069: {
          web_login: 'a',
          web_password: 'Q!1wE@2r',
          onu_factory_credentials: {
            credentials: [],
          },
          remote_access: true,
          inform_interval: 60000,
          sync_interval: 60000,
          recovery_threshold: 6,
          offline_threshold: 8,
          pon_signal_threshold: -18,
          pon_signal_threshold_critical: -23,
          pon_signal_threshold_critical_high: 3,
          stun_enable: true,
          insecure_enable: true,
          has_never_enabled_insecure: false,
          server_url: '192.168.0.1',
        },
        certification: undefined,
      };
      const returnConfigMock = (query) => {
        if (query.getQuery().is_default == configMock.is_default) {
          return configMock;
        } else {
          return null;
        }
      };
      const returnModifiedConfigMock = {};
      mockingoose(ConfigModel).toReturn(returnConfigMock, 'findOne');
      mockingoose(ConfigModel).toReturn(returnModifiedConfigMock, 'save');
      const req = {
        params: {
          id: '',
        },
        user: {
          is_superuser: true,
        },
        body: {
          'minlength-pass-pppoe': '1',
          'bypass-mqtt-secret-check': 'false',
          'must-block-license-at-removal': 'false',
          'selected-language': 'pt-BR',
          'autoupdate': 'on',
          'pon-signal-threshold': '-18',
          'pon-signal-threshold-critical': '-23',
          'pon-signal-threshold-critical-high': '3',
          'ssid-prefix': '',
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '2121',
          'wan-step-required': 'true',
          'flashman-step-required': 'true',
          'speedtest-step-required': 'false',
          'ipv4-step-required': 'true',
          'ipv6-step-required': 'false',
          'dns-step-required': 'true',
          'tr069-server-url': '192.168.0.1',
          'onu-web-login': '',
          'onu-web-password': '',
          'onu_web_remote': 'on',
          'stun_enable': 'on',
          'insecure_enable': 'on',
          'inform-interval': '60',
          'sync-interval': '60',
          'lost-informs-recovery-threshold': '6',
          'lost-informs-offline-threshold': '8',
        },
      };
      const res = utils.mockResponse();
      // Test
      await updateFlashmanController.setAutoConfig(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.lastCall[0].message)
        .toMatch(utils.tt('operationSuccessful',
          {errorline: __line}));
    });


    test('Invalid config', async () => {
      // Mocks
      commonUtils.common.mockConfigs(null, 'findOne');

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        undefined,
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('configNotFound').replace('({{errorline}})', ''),
      );
    });


    test('Invalid measureServerIP', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid measureServerIP regex', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.01',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid measureServerPort', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid measureServerPort range low', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '0',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid measureServerPort range high', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '9999999',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid ponSignalThreshold', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid ponSignalThreshold range low', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '-200',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid ponSignalThreshold range high', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '200',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid ponSignalThresholdCritical', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical-high': '50',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid ponSignalThresholdCritical range low', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '-200',
          'pon-signal-threshold-critical-high': '50',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid ponSignalThresholdCritical range high', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '200',
          'pon-signal-threshold-critical-high': '50',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid ssid-prefix', async () => {
      // Mocks
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          personalizationHash: '123',
          ssidPrefix: '321',
        },
      );
      commonUtils.common.mockConfigs(config, 'findOne');

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid ssid-prefix invalid characters', async () => {
      // Mocks
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          personalizationHash: '123',
          ssidPrefix: '321',
        },
      );
      commonUtils.common.mockConfigs(config, 'findOne');

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
          'ssid-prefix': '/;`',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid ssid-prefix empty', async () => {
      // Mocks
      let config = models.copyConfigFrom(
        models.defaultMockConfigs[0]._id,
        {
          personalizationHash: '123',
          ssidPrefix: '321',
        },
      );
      commonUtils.common.mockConfigs(config, 'findOne');

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
          'ssid-prefix': '',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(t('ssidPrefixEmptyError'));
    });


    test('Invalid pon-signal-threshold-critical-high', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid pon-signal-threshold-critical-high range low', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '-200',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid pon-signal-threshold-critical-high range high', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '200',
        },
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('Invalid Role', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();
      commonUtils.common.mockRoles({}, 'findOne');
      jest.spyOn(ConfigModel.prototype, 'save')
        .mockImplementation(() => Promise.resolve(),
      );

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
          'selected-language': 'pt-BR',
        },
        undefined,
        undefined,
        {role: '456', is_superuser: false},
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.type).toBe('success');
      expect(result.body.message).toContain(t('operationSuccessful'));
    });


    test('Invalid language', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();
      commonUtils.common.mockRoles({}, 'findOne');
      jest.spyOn(ConfigModel.prototype, 'save')
        .mockImplementation(() => Promise.resolve(),
      );

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
        },
        undefined,
        undefined,
        {role: '456', is_superuser: false},
      );

      // Validate
      expect(result.statusCode).toBe(400);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldMissing').replace('({{errorline}})', ''),
      );
    });


    test('Invalid language empty', async () => {
      // Mocks
      commonUtils.common.mockDefaultConfigs();
      commonUtils.common.mockRoles({}, 'findOne');
      jest.spyOn(ConfigModel.prototype, 'save')
        .mockImplementation(() => Promise.resolve(),
      );

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
          'selected-language': '',
        },
        undefined,
        undefined,
        {role: '456', is_superuser: false},
      );

      // Validate
      expect(result.statusCode).toBe(400);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldMissing').replace('({{errorline}})', ''),
      );
    });


    test('Grant with invalid fields', async () => {
      let role = models.copyRoleFrom(
        models.defaultMockRoles[0]._id,
        {grantMonitorManage: true},
      );

      // Mocks
      commonUtils.common.mockDefaultConfigs();
      commonUtils.common.mockRoles(role, 'findOne');
      jest.spyOn(ConfigModel.prototype, 'save')
        .mockImplementation(() => Promise.resolve(),
      );

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
          'selected-language': 'pt-BR',
        },
        undefined,
        undefined,
        {role: '456', is_superuser: false},
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });


    test('No grant', async () => {
      let role = models.copyRoleFrom(
        models.defaultMockRoles[0]._id,
        {grantMonitorManage: false},
      );

      // Mocks
      commonUtils.common.mockDefaultConfigs();
      commonUtils.common.mockRoles(role, 'findOne');
      jest.spyOn(ConfigModel.prototype, 'save')
        .mockImplementation(() => Promise.resolve(),
      );

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
          'selected-language': 'pt-BR',
        },
        undefined,
        undefined,
        {role: '456', is_superuser: false},
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.type).toBe('success');
      expect(result.body.message).toContain(t('operationSuccessful'));
    });


    test('Grant with invalid web login', async () => {
      let role = models.copyRoleFrom(
        models.defaultMockRoles[0]._id,
        {grantMonitorManage: true},
      );

      // Mocks
      commonUtils.common.mockDefaultConfigs();
      commonUtils.common.mockRoles(role, 'findOne');
      jest.spyOn(ConfigModel.prototype, 'save')
        .mockImplementation(() => Promise.resolve(),
      );

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
          'selected-language': 'pt-BR',
          'onu-web-login': '/*|',
          'onu-web-password': 'Aa345678!',
        },
        undefined,
        undefined,
        {role: '456', is_superuser: false},
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('acceptableCharOnly0-9a-zA-Z @ul-.'),
      );
    });


    test('Grant with invalid web password', async () => {
      let role = models.copyRoleFrom(
        models.defaultMockRoles[0]._id,
        {grantMonitorManage: true},
      );

      // Mocks
      commonUtils.common.mockDefaultConfigs();
      commonUtils.common.mockRoles(role, 'findOne');
      jest.spyOn(ConfigModel.prototype, 'save')
        .mockImplementation(() => Promise.resolve(),
      );

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
          'selected-language': 'pt-BR',
          'onu-web-login': '123456789',
          'onu-web-password': '/*|',
        },
        undefined,
        undefined,
        {role: '456', is_superuser: false},
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('tr069WebPasswordValidationError'),
      );
    });


    test('Grant with invalid tr069 connection login', async () => {
      let role = models.copyRoleFrom(
        models.defaultMockRoles[0]._id,
        {grantMonitorManage: true},
      );

      // Mocks
      commonUtils.common.mockDefaultConfigs();
      commonUtils.common.mockRoles(role, 'findOne');
      jest.spyOn(ConfigModel.prototype, 'save')
        .mockImplementation(() => Promise.resolve(),
      );

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
          'selected-language': 'pt-BR',
          'onu-web-login': '123456789',
          'onu-web-password': 'Aa345678!',
          'tr069-connection-login': '/*|',
          'tr069-connection-password': '123456789',
        },
        undefined,
        undefined,
        {role: '456', is_superuser: false},
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('tr069ConnectionFieldTooltip'),
      );
    });


    test('Grant with invalid tr069 connection password', async () => {
      let role = models.copyRoleFrom(
        models.defaultMockRoles[0]._id,
        {grantMonitorManage: true},
      );

      // Mocks
      commonUtils.common.mockDefaultConfigs();
      commonUtils.common.mockRoles(role, 'findOne');
      jest.spyOn(ConfigModel.prototype, 'save')
        .mockImplementation(() => Promise.resolve(),
      );

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
          'selected-language': 'pt-BR',
          'onu-web-login': '123456789',
          'onu-web-password': 'Aa345678!',
          'tr069-connection-login': '123456789',
          'tr069-connection-password': '/*|',
        },
        undefined,
        undefined,
        {role: '456', is_superuser: false},
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('tr069ConnectionFieldTooltip'),
      );
    });


    test('Grant with invalid tr069 fields', async () => {
      let role = models.copyRoleFrom(
        models.defaultMockRoles[0]._id,
        {grantMonitorManage: true},
      );

      // Mocks
      commonUtils.common.mockDefaultConfigs();
      commonUtils.common.mockRoles(role, 'findOne');
      jest.spyOn(ConfigModel.prototype, 'save')
        .mockImplementation(() => Promise.resolve(),
      );

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.setAutoConfig,
        {
          'measure-server-ip': '192.168.0.1',
          'measure-server-port': '123',
          'pon-signal-threshold': '50',
          'pon-signal-threshold-critical': '50',
          'pon-signal-threshold-critical-high': '50',
          'selected-language': 'pt-BR',
          'onu-web-login': '123456789',
          'onu-web-password': 'Aa345678!',
          'tr069-connection-login': '123456789',
          'tr069-connection-password': '123456789',
        },
        undefined,
        undefined,
        {role: '456', is_superuser: false},
      );

      // Validate
      expect(result.statusCode).toBe(500);
      expect(result.body.type).toBe('danger');
      expect(result.body.message).toContain(
        t('fieldsInvalid').replace('({{errorline}})', ''),
      );
    });
  });


  describe('getAutoConfig function', () => {
    test('Invalid config', async () => {
      // Mocks
      commonUtils.common.mockConfigs(null, 'findOne');

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.getAutoConfig,
        undefined,
        undefined,
        undefined,
      );

      // Validate
      expect(result.statusCode).toBe(200);
      expect(result.body.auto).toBe(null);
      expect(result.body.minlengthpasspppoe).toBe(8);
    });


    test('Check missing fields', async () => {
      let config = models.defaultMockConfigs[0];

      // Mocks
      commonUtils.common.mockDefaultConfigs();

      // Execute
      let result = await commonUtils.common.sendFakeRequest(
        updateFlashmanController.getAutoConfig,
        undefined,
        undefined,
        undefined,
      );

      let data = result.body;

      // Validate
      expect(result.statusCode)
        .toBe(200);
      expect(data.auto)
        .toBe(config.autoUpdate);
      expect(data.minlengthpasspppoe)
        .toBe(config.pppoePassLength);
      expect(data.bypassMqttSecretCheck)
        .toBe(config.mqtt_secret_bypass);
      expect(data.measureServerIP)
        .toBe(config.measureServerIP);
      expect(data.measureServerPort)
        .toBe(config.measureServerPort);
      expect(data.blockLicenseAtDeviceRemoval)
        .toBe(config.blockLicenseAtDeviceRemoval);
      expect(data.tr069ServerURL)
        .toBe(config.tr069.server_url);
      expect(data.tr069WebLogin)
        .toBe(config.tr069.web_login);
      expect(data.tr069WebPassword)
        .toBe(config.tr069.web_password);
      expect(data.tr069WebRemote)
        .toBe(config.tr069.remote_access);
      expect(data.tr069ConnectionLogin)
        .toBe(config.tr069.connection_login);
      expect(data.tr069ConnectionPassword)
        .toBe(config.tr069.connection_password);
      expect(data.tr069InformInterval)
        .toBe(config.tr069.inform_interval/1000);
      expect(data.tr069SyncInterval)
        .toBe(config.tr069.sync_interval/1000);
      expect(data.tr069RecoveryThreshold)
        .toBe(config.tr069.recovery_threshold);
      expect(data.tr069OfflineThreshold)
        .toBe(config.tr069.offline_threshold);
      expect(data.tr069STUNEnable)
        .toBe(config.tr069.stun_enable);
      expect(data.tr069InsecureEnable)
        .toBe(config.tr069.insecure_enable);
      expect(data.hasNeverEnabledInsecureTR069)
        .toBe(config.tr069.has_never_enabled_insecure);
      expect(data.pon_signal_threshold).toBe(config.tr069.pon_signal_threshold);
      expect(data.pon_signal_threshold_critical)
        .toBe(config.tr069.pon_signal_threshold_critical);
      expect(data.pon_signal_threshold_critical_high)
        .toBe(config.tr069.pon_signal_threshold_critical_high);
      expect(data.isClientPayingPersonalizationApp)
        .toBe(config.personalizationHash !== '' ? true : false);
      expect(data.isSsidPrefixEnabled)
        .toBe(config.isSsidPrefixEnabled);
      expect(data.ssidPrefix).toBe(config.ssidPrefix);
      expect(data.wanStepRequired)
        .toBe(config.certification.wan_step_required);
      expect(data.ipv4StepRequired)
        .toBe(config.certification.ipv4_step_required);
      expect(data.speedTestStepRequired)
        .toBe(config.certification.speedtest_step_required);
      expect(data.ipv6StepRequired)
        .toBe(config.certification.ipv6_step_required);
      expect(data.dnsStepRequired)
        .toBe(config.certification.dns_step_required);
      expect(data.flashStepRequired)
        .toBe(config.certification.flashman_step_required);
      expect(data.language)
        .toBe(config.language);
    });
  });


  // updateProvisionsPresets
  describe('updateProvisionsPresets function', () => {
    const presets = [
      {type: 'provision', path: 'provision', name: 'flashman'},
      {type: 'provision', path: 'diagnostic-provision', name: 'diagnostic'},
      {type: 'preset', path: 'bootstrap-preset'},
      {type: 'preset', path: 'boot-preset'},
      {type: 'preset', path: 'periodic-preset'},
      {type: 'preset', path: 'diagnostic-preset'},
      {type: 'preset', path: 'changes-preset'},
      {type: 'delete', path: 'inform'},
    ];


    // Empty file
    test('Empty file', async () => {
      // Mocks
      let fsSpy = jest.spyOn(fs, 'readFileSync')
        .mockImplementation(() => '');
      let putProvisionSpy = jest.spyOn(TasksAPI, 'putProvision')
        .mockImplementation(() => Promise.resolve());
      let putPresetSpy = jest.spyOn(TasksAPI, 'putPreset')
        .mockImplementation(() => Promise.resolve());
      let deletePresetSpy = jest.spyOn(TasksAPI, 'deletePreset')
        .mockImplementation(() => Promise.resolve());


      // Execute
      await updateFlashmanController.updateProvisionsPresets();


      // Validate
      let provisionsArray = presets.filter((obj) => obj.type === 'provision');
      let presetsArray = presets.filter((obj) => obj.type === 'preset');
      let deletesArray = presets.filter((obj) => obj.type === 'delete');
      let quantProvisions = provisionsArray.length;
      let quantPresets = presetsArray.length;
      let quantDeletes = deletesArray.length;

      expect(fsSpy).toHaveBeenCalledTimes(quantProvisions + quantPresets);
      expect(putProvisionSpy).toHaveBeenCalledTimes(quantProvisions);
      expect(putPresetSpy).not.toHaveBeenCalled();
      expect(deletePresetSpy).toHaveBeenCalledTimes(quantDeletes);

      let call = 0;
      provisionsArray.forEach((obj) => {
        expect(fsSpy.mock.calls[call][0]).toContain(obj.path);
        call += 1;
      });
    });


    // Empty JSON string
    test('Empty JSON string', async () => {
      // Mocks
      let fsSpy = jest.spyOn(fs, 'readFileSync')
        .mockImplementation(() => 'abcdef');
      let putProvisionSpy = jest.spyOn(TasksAPI, 'putProvision')
        .mockImplementation(() => Promise.resolve());
      let putPresetSpy = jest.spyOn(TasksAPI, 'putPreset')
        .mockImplementation(() => Promise.resolve());
      let deletePresetSpy = jest.spyOn(TasksAPI, 'deletePreset')
        .mockImplementation(() => Promise.resolve());


      // Execute
      await updateFlashmanController.updateProvisionsPresets();


      // Validate
      let provisionsArray = presets.filter((obj) => obj.type === 'provision');
      let presetsArray = presets.filter((obj) => obj.type === 'preset');
      let deletesArray = presets.filter((obj) => obj.type === 'delete');
      let quantProvisions = provisionsArray.length;
      let quantPresets = presetsArray.length;
      let quantDeletes = deletesArray.length;

      expect(fsSpy).toHaveBeenCalledTimes(quantProvisions + quantPresets);
      expect(putProvisionSpy).toHaveBeenCalledTimes(quantProvisions);
      expect(putPresetSpy).not.toHaveBeenCalled();
      expect(deletePresetSpy).toHaveBeenCalledTimes(quantDeletes);

      let call = 0;
      provisionsArray.forEach((obj) => {
        expect(fsSpy.mock.calls[call][0]).toContain(obj.path);
        call += 1;
      });
    });


    // Normal operation
    test('Normal operation', async () => {
      // Mocks
      let fsSpy = jest.spyOn(fs, 'readFileSync')
        .mockImplementation(() => '{"data": "123"}');
      let putProvisionSpy = jest.spyOn(TasksAPI, 'putProvision')
        .mockImplementation(() => Promise.resolve());
      let putPresetSpy = jest.spyOn(TasksAPI, 'putPreset')
        .mockImplementation(() => Promise.resolve());
      let deletePresetSpy = jest.spyOn(TasksAPI, 'deletePreset')
        .mockImplementation(() => Promise.resolve());


      // Execute
      await updateFlashmanController.updateProvisionsPresets();


      // Validate
      let provisionsArray = presets.filter((obj) => obj.type === 'provision');
      let presetsArray = presets.filter((obj) => obj.type === 'preset');
      let deletesArray = presets.filter((obj) => obj.type === 'delete');
      let quantProvisions = provisionsArray.length;
      let quantPresets = presetsArray.length;
      let quantDeletes = deletesArray.length;

      expect(fsSpy).toHaveBeenCalledTimes(quantProvisions + quantPresets);
      expect(putProvisionSpy).toHaveBeenCalledTimes(quantProvisions);
      expect(putPresetSpy).toHaveBeenCalledTimes(quantPresets);
      expect(deletePresetSpy).toHaveBeenCalledTimes(quantDeletes);

      let call = 0;
      provisionsArray.forEach((obj) => {
        expect(fsSpy.mock.calls[call][0]).toContain(obj.path);
        call += 1;
      });
      presetsArray.forEach((obj) => {
        expect(fsSpy.mock.calls[call][0]).toContain(obj.path);
        call += 1;
      });
    });


    // Rejected
    test('Rejected', async () => {
      // Mocks
      let fsSpy = jest.spyOn(fs, 'readFileSync')
        .mockImplementation(() => '{"data": "123"}');
      let putProvisionSpy = jest.spyOn(TasksAPI, 'putProvision')
        .mockImplementation(() => Promise.reject());
      let putPresetSpy = jest.spyOn(TasksAPI, 'putPreset')
        .mockImplementation(() => Promise.reject());
      let deletePresetSpy = jest.spyOn(TasksAPI, 'deletePreset')
        .mockImplementation(() => Promise.reject());


      // Execute
      await updateFlashmanController.updateProvisionsPresets();


      // Validate
      let provisionsArray = presets.filter((obj) => obj.type === 'provision');
      let presetsArray = presets.filter((obj) => obj.type === 'preset');
      let deletesArray = presets.filter((obj) => obj.type === 'delete');
      let quantProvisions = provisionsArray.length;
      let quantPresets = presetsArray.length;
      let quantDeletes = deletesArray.length;

      expect(fsSpy).toHaveBeenCalledTimes(quantProvisions + quantPresets);
      expect(putProvisionSpy).toHaveBeenCalledTimes(quantProvisions);
      expect(putPresetSpy).toHaveBeenCalledTimes(quantPresets);
      expect(deletePresetSpy).toHaveBeenCalledTimes(quantDeletes);

      let call = 0;
      provisionsArray.forEach((obj) => {
        expect(fsSpy.mock.calls[call][0]).toContain(obj.path);
        call += 1;
      });
      presetsArray.forEach((obj) => {
        expect(fsSpy.mock.calls[call][0]).toContain(obj.path);
        call += 1;
      });
    });
  });
});
