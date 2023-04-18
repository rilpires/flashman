// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const testUtils = require('../common/utils.js');
const blackbox = require('../common/blackbox.js');

testUtils.common.mockConfigs(null, 'findOne');
const utils = require('../utils.js');

describe('/Upgrade', () => {
  let configValues;
  let adminCookie = null;

  jest.setTimeout( 15*1000 );

  beforeAll(async () => {
    const adminLogin = await blackbox.loginAsAdmin();
    adminCookie = adminLogin.header['set-cookie'];

    if (adminCookie === undefined) {
      throw new Error(`Failed to get admin cookie.\n`
      + `Status code: ${adminLogin.statusCode}\n`,
      + `HTTP error: ${adminLogin.error}\n`,
      );
    }
    configValues = {
      'minlength-pass-pppoe': '1',
      'bypass-mqtt-secret-check': 'false',
      'must-block-license-at-removal': 'false',
      'selected-language': 'pt-BR',
      'autoupdate': 'on',
      'pon-signal-threshold': '-18',
      'pon-signal-threshold-critical': '-23',
      'pon-signal-threshold-critical-high': '3',
      'ssid-prefix': '',
      'measure-server-ip': '',
      'measure-server-port': '80',
      'wan-step-required': 'true',
      'flashman-step-required': 'true',
      'speedtest-step-required': 'false',
      'ipv4-step-required': 'true',
      'ipv6-step-required': 'false',
      'dns-step-required': 'true',
      'tr069-server-url': '',
      'onu-web-login': '',
      'onu-web-password': '',
      'tr069-connection-login': 'anlix',
      'tr069-connection-password': 'landufrj123',
      'inform-interval': '300',
      'sync-interval': '300',
      'lost-informs-recovery-threshold': '1',
      'lost-informs-offline-threshold': '3',
    };
  });

  describe('/upgrade/config', () => {
    test('specificAppTechnicianWebLogin existence when get',
    async () => {
      let res = await blackbox.sendRequest(
        'get', '/upgrade/config', adminCookie,
      );
      expect(res.statusCode).toBe(200);
      expect(res.header['content-type']).toContain('application/json');
      expect(res.header['content-type']).toContain('charset=utf-8');
      expect(typeof res.body.specificAppTechnicianWebLogin)
        .toMatch(/^boolean$/);
    });
    test('specificAppTechnicianWebLogin change to true',
    async () => {
      configValues['specific-app-technician-web-login'] = 'on';
      let res1 = await blackbox.sendRequest(
        'post', '/upgrade/config', adminCookie, configValues,
      );
      let res2 = await blackbox.sendRequest(
        'get', '/upgrade/config', adminCookie,
      );
      expect(res1.statusCode).toBe(200);
      expect(res1.header['content-type']).toContain('application/json');
      expect(res1.header['content-type']).toContain('charset=utf-8');
      expect(res1._body.type).toMatch(/^success$/);
      expect(res1._body.message).toMatch(new RegExp(
        utils.tt('operationSuccessful')));
      expect(res2.statusCode).toBe(200);
      expect(res2.header['content-type']).toContain('application/json');
      expect(res2.header['content-type']).toContain('charset=utf-8');
      expect(res2.body.specificAppTechnicianWebLogin)
        .toBe(true);
    });
    test('specificAppTechnicianWebLogin change to false',
    async () => {
      configValues['specific-app-technician-web-login'] = '';
      let res1 = await blackbox.sendRequest(
        'post', '/upgrade/config', adminCookie, configValues,
      );
      let res2 = await blackbox.sendRequest(
        'get', '/upgrade/config', adminCookie,
      );
      expect(res1.statusCode).toBe(200);
      expect(res1.header['content-type']).toContain('application/json');
      expect(res1.header['content-type']).toContain('charset=utf-8');
      expect(res1._body.type).toMatch(/^success$/);
      expect(res1._body.message).toMatch(new RegExp(
        utils.tt('operationSuccessful')));
      expect(res2.statusCode).toBe(200);
      expect(res2.header['content-type']).toContain('application/json');
      expect(res2.header['content-type']).toContain('charset=utf-8');
      expect(res2.body.specificAppTechnicianWebLogin)
        .toBe(false);
    });
  });

  afterAll(async () => {
    // Clean database? Close connections? Say goodbye?
  });
});
