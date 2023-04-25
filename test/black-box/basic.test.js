// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const blackbox = require('../common/blackbox.js');

describe('api_v2', () => {
  let adminCookie = null;

  jest.setTimeout( 15*1000 );

  beforeAll(async () => {
    const adminLogin = await blackbox.loginAsAdmin();
    adminCookie = adminLogin.header['set-cookie'];
    if (adminCookie === undefined) {
      throw new Error('Failed to get admin cookie');
    }
  });

  /* Basic stuffs */
  test('Login page',
  async () => {
    let res = await blackbox.sendRequestAdmin('get', '/login', null);
    expect(res.statusCode).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
    expect(res.header['content-type']).toContain('charset=utf-8');
  });

  afterAll(async () => {
    // clean database?
  });
});
