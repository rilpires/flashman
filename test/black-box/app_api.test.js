// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const request = require('supertest');

describe('Diagnostic App API: /deviceinfo/app/diagnostic/', () => {
  const basicAuthUser = 'admin';
  const basicAuthPass = 'flashman';
  const flashmanHost = 'http://localhost:8000';

  jest.setTimeout( 15*1000 );

  const validateSuccessfulJsonResponse = function(res) {
    expect(res.statusCode).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(res.header['content-type']).toContain('charset=utf-8');
  };

  describe('Specific web login enable flag', () => {
    test('Check if flag exists in login', async () => {
      let res = await request(flashmanHost)
        .post('/deviceinfo/app/diagnostic/login')
        .auth(basicAuthUser, basicAuthPass)
        .send({user: 'admin'});
      validateSuccessfulJsonResponse(res);
      expect(res.body).toHaveProperty('specificWebLogin');
      expect(typeof res.body.specificWebLogin).toBe('boolean');
    });

    test('Check if flag exists in diagnostic response', async () => {
      let res = await request(flashmanHost)
        .post('/deviceinfo/app/diagnostic/verify')
        .auth(basicAuthUser, basicAuthPass)
        .send({mac: 'FF:FF:FF:FF:FF:FF'});
      validateSuccessfulJsonResponse(res);
      expect(res.body).toHaveProperty('onuConfig');
      expect(res.body.onuConfig).toHaveProperty('specificWebLogin');
      expect(typeof res.body.onuConfig.specificWebLogin).toBe('boolean');
    });

    test('Check if flag exists in certification save', async () => {
      let res = await request(flashmanHost)
        .post('/deviceinfo/app/diagnostic/certificate')
        .auth(basicAuthUser, basicAuthPass)
        .send({user: basicAuthUser});
      validateSuccessfulJsonResponse(res);
      expect(res.body).toHaveProperty('specificWebLogin');
      expect(typeof res.body.specificWebLogin).toBe('boolean');
    });
  });

  describe('Store certification specific web login credentials', () => {
    const sendCertification = async function(asset) {
      // Send the asset to Flashman, expect to insert it successfully
      let recvCertificateResponse = await request(flashmanHost)
        .post('/deviceinfo/app/diagnostic/certificate')
        .auth(basicAuthUser, basicAuthPass)
        .send(asset);
      validateSuccessfulJsonResponse(recvCertificateResponse);
    };

    const getUserAndCertifications = async function() {
      // Query all certifications, expect successful response
      let userQueryResponse = await request(flashmanHost)
        .get('/api/v2/user/certifications')
        .auth(basicAuthUser, basicAuthPass);
      validateSuccessfulJsonResponse(userQueryResponse);

      // Validate the reply, should only have 1 user
      expect(userQueryResponse.body).toHaveProperty('success', true);
      expect(userQueryResponse.body).toHaveProperty('users');
      expect(userQueryResponse.body.users).toHaveLength(1);

      // For that user, make sure we have the required data
      let user = userQueryResponse.body.users[0];
      expect(user).toHaveProperty('_id');
      expect(user).toHaveProperty('deviceCertifications');
      return user;
    };

    const validateCertification = function(asset, certification) {
      // Every certification needs a mac and a timestamp
      expect(certification).toHaveProperty('mac', asset.current.mac);
      expect(certification).toHaveProperty(
        'localEpochTimestamp', asset.current.timestamp,
      );
      // If a specificUser was provided from the asset, it MUST show up in the
      // Flashman registry - otherwise we expect the default empty string
      let expectedUser = '';
      if (asset.current.specificUser) {
        expectedUser = asset.current.specificUser;
      }
      // If a specificPasswd was provided from the asset, it MUST show up in the
      // Flashman registry - otherwise we expect the default empty string
      let expectedPass = '';
      if (asset.current.specificPasswd) {
        expectedPass = asset.current.specificPasswd;
      }
      expect(certification).toHaveProperty('specificUsername', expectedUser);
      expect(certification).toHaveProperty('specificPassword', expectedPass);
    };

    const deleteCertification = async function(userId, timestamp) {
      // Deleting a certification requires knowing its timestamp and user id
      let deleteBody = {
        items: JSON.stringify([{
          user: userId,
          timestamp: timestamp,
        }]),
      };
      // Send a request to Flashman, expect successful response
      let certDeleteResponse = await request(flashmanHost)
        .delete('/api/v2/user/certifications')
        .auth(basicAuthUser, basicAuthPass)
        .send(deleteBody);
      validateSuccessfulJsonResponse(certDeleteResponse);
      expect(certDeleteResponse.body).toHaveProperty('success', true);
    };

    const performTest = async function(asset) {
      // Receive certification from app - should store it in database
      await sendCertification(asset);

      // Query database to see if the newly added certification is there
      let user = await getUserAndCertifications();
      expect(user.deviceCertifications).toHaveLength(1);
      let cert = user.deviceCertifications[0];
      validateCertification(asset, cert);

      // Delete it from the database so it doesn't affect other tests
      await deleteCertification(user._id, cert.localEpochTimestamp);
      user = await getUserAndCertifications();
      expect(user.deviceCertifications).toHaveLength(0);
    };

    test('No specific credentials', async () => {
      await performTest({
        user: basicAuthUser,
        current: {
          mac: 'AA:AA:AA:AA:AA:AA',
          timestamp: 1,
        },
      });
    });

    test('With specific credentials', async () => {
      await performTest({
        user: basicAuthUser,
        current: {
          mac: 'AA:AA:AA:AA:AA:AA',
          timestamp: 1,
          specificUser: 'user123',
          specificPasswd: 'pass123',
        },
      });
    });

    test('With specific credentials, only password', async () => {
      await performTest({
        user: basicAuthUser,
        current: {
          mac: 'AA:AA:AA:AA:AA:AA',
          timestamp: 1,
          specificPasswd: 'pass123',
        },
      });
    });
  });
});
