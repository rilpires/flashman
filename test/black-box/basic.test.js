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

  /* Basic stuffs */
  test('Login page',
  async () => {
    let res = await request('localhost:8000')
      .get('/login');
    expect(res.statusCode).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
    expect(res.header['content-type']).toContain('charset=utf-8');
  });

  afterAll(async () => {
    // clean database?
  });
});
