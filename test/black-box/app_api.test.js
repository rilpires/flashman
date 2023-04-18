// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const request = require('supertest');

describe('Diagnostic App API: /deviceinfo/app/diagnostic/', () => {
  const basicAuthUser = 'admin';
  const basicAuthPass = 'flashman';
  const flashmanHost = 'http://localhost:8000';

  jest.setTimeout( 15*1000 );

  const validateSuccessfulResponse = function(res) {
    expect(res.statusCode).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(res.header['content-type']).toContain('charset=utf-8');
  };

  describe('/login', () => {
    test('Check if specificWebLogin exists', async () => {
      let res = await request(flashmanHost)
        .post('/deviceinfo/app/diagnostic/login')
        .auth(basicAuthUser, basicAuthPass)
        .send({user: 'admin'});
      validateSuccessfulResponse(res);
      expect(res.body).toHaveProperty('specificWebLogin');
      expect(typeof res.body.specificWebLogin).toBe('boolean');
    });
  });

  describe('/certificate', () => {
    test('Check if specificWebLogin exists', async () => {
      let res = await request(flashmanHost)
        .post('/deviceinfo/app/diagnostic/certificate')
        .auth(basicAuthUser, basicAuthPass)
        .send({user: 'admin'});
      validateSuccessfulResponse(res);
      expect(res.body).toHaveProperty('specificWebLogin');
      expect(typeof res.body.specificWebLogin).toBe('boolean');
    });
  });

  describe('/verify', () => {
    test('Check if specificWebLogin exists', async () => {
      let res = await request(flashmanHost)
        .post('/deviceinfo/app/diagnostic/verify')
        .auth(basicAuthUser, basicAuthPass)
        .send({mac: 'FF:FF:FF:FF:FF:FF'});
      validateSuccessfulResponse(res);
      expect(res.body).toHaveProperty('onuConfig');
      expect(res.body.onuConfig).toHaveProperty('specificWebLogin');
      expect(typeof res.body.onuConfig.specificWebLogin).toBe('boolean');
    });
  });
});
