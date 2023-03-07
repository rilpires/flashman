// this test need to be run InBand (synchronous)
require('../../bin/globals.js');
const request = require('supertest');
const {runSimulation} = require('genieacs-sim');


describe('api_v2', () => {
  const basicAuthUser = 'admin';
  const basicAuthPass = 'flashman';
  const deviceModelH199 = './test/assets/data_models/H199.csv';
  const flashmanHost = 'http://localhost:8000';
  const genieCwmpHost = 'http://localhost:57547';

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
      throw new Error('Failed to get admin cookie');
    }
  });

  // Device search
  test('/api/v2/device/search - Before and After creation',
  async () => {
    let res = await request(flashmanHost)
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
    expect(res.body.status.onlinenum).toEqual(0);
    expect(res.body.status.recoverynum).toEqual(0);
    expect(res.body.status.offlinenum).toEqual(0);
    expect(res.body.status.totalnum).toEqual(0);

    // Creating a device
    // runSimulation(acsUrl, dataModel, serialNumber, macAddr)
    runSimulation(genieCwmpHost, deviceModelH199, 1000, '00:00:00:00:00:02'),
    await new Promise((resolve, reject)=>setTimeout(resolve, 5000));

    // Checking new result
    res = await request(flashmanHost)
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
    expect(res.body.status.onlinenum).toBeGreaterThan(0);
    expect(res.body.status.totalnum).toBeGreaterThan(0);
    expect(res.body.status.offlinenum).toEqual(0);
  });


  afterAll(async () => {
    // Clean database? Close connections? Say goodbye?
  });
});
