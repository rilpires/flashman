/* eslint require-jsdoc: 0 */
/* global __line */

require('../../bin/globals.js');
const {MongoClient} = require('mongodb');
const mockingoose = require('mockingoose');
process.env.FLM_GENIE_IGNORED = 'asd';
const updateFlashmanController = require('../../controllers/update_flashman');
const ConfigModel = require('../../models/config');
const utils = require('../utils');

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
  });
});
