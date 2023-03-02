// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const request = require('supertest');

describe('api_v2', () => {
  const basicAuthUser = 'admin';
  const basicAuthPass = 'flashman';
  let adminCookie = null;

  jest.setTimeout( 15*1000 );

  beforeAll(async () => {
    const adminLogin = await request('localhost:8000')
      .post('/login')
      .send({
        name: basicAuthUser,
        password: basicAuthPass,
      });
    adminCookie = adminLogin.header['set-cookie'];

    if (adminCookie === undefined) {
      throw new Error('Failed to get admin cookie');
    }
  });

  // Device search
  test('/api/v2/device/search',
  async () => {
    let res = await request('localhost:8000')
      .put('/api/v2/device/search')
      .set('Cookie', adminCookie)
      .auth(basicAuthUser, basicAuthPass)
      .send({
        filter_list: 'online',
      });
    expect(res.statusCode).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(res.header['content-type']).toContain('charset=utf-8');
    expect(res.body.success).toBe(true);
    expect(res.body.status.onlinenum).toBeGreaterThanOrEqual(0);
    expect(res.body.status.recoverynum).toBeGreaterThanOrEqual(0);
    expect(res.body.status.offlinenum).toBeGreaterThanOrEqual(0);
    expect(res.body.status.totalnum).toBeGreaterThanOrEqual(0);
  });

  afterAll(async () => {
    // clean database?
  });
});
