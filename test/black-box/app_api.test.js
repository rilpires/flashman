// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const request = require('supertest');
// const utils = require('../utils.js');

describe('/Deviceinfo/app', () => {
  const basicAuthUser = 'admin';
  const basicAuthPass = 'flashman';
  const flashmanHost = 'http://localhost:8000';

  let adminCookie = null;

  jest.setTimeout( 15*1000 );

  beforeAll(async () => {
    const adminLogin = await request(flashmanHost)
      .post('/login')
      .send({
        name: basicAuthUser,
        password: basicAuthPass,
      });

    adminCookie = adminLogin.header['set-cookie'];

    if (adminCookie === undefined) {
      throw new Error(`Failed to get admin cookie.\n`
      + `Status code: ${adminLogin.statusCode}\n`,
      + `HTTP error: ${adminLogin.error}\n`,
      );
    }
  });

  describe('/deviceinfo/app/diagnostic/login', () => {
    test('Check if specificWebLogin exists', async () => {
      let res = await request(flashmanHost)
        .post('/deviceinfo/app/diagnostic/login')
        .auth(basicAuthUser, basicAuthPass)
        .send({user: 'admin'});
      expect(res.statusCode).toBe(200);
      expect(res.header['content-type']).toContain('application/json');
      expect(res.header['content-type']).toContain('charset=utf-8');
      expect(typeof res.body.specificWebLogin)
        .toMatch(/^boolean$/);
    });
  });
  describe('/deviceinfo/app/diagnostic/certificate', () => {
    test('Check if specificWebLogin exists', async () => {
      let res = await request(flashmanHost)
        .post('/deviceinfo/app/diagnostic/certificate')
        .auth(basicAuthUser, basicAuthPass)
        .send({user: 'admin'});
      expect(res.statusCode).toBe(200);
      expect(res.header['content-type']).toContain('application/json');
      expect(res.header['content-type']).toContain('charset=utf-8');
      expect(typeof res.body.specificWebLogin)
        .toMatch(/^boolean$/);
    });
  });
  describe('/deviceinfo/app/diagnostic/verify', () => {
    test('Check if specificWebLogin exists', async () => {
      let res = await request(flashmanHost)
        .post('/deviceinfo/app/diagnostic/verify')
        .auth(basicAuthUser, basicAuthPass)
        .send({mac: 'FF:FF:FF:FF:FF:FF'});
      expect(res.statusCode).toBe(200);
      expect(res.header['content-type']).toContain('application/json');
      expect(res.header['content-type']).toContain('charset=utf-8');
      expect(typeof res.body.onuConfig.specificWebLogin)
        .toMatch(/^boolean$/);
    });
  });

  afterAll(async () => {
    // Clean database? Close connections? Say goodbye?
  });
});
