/* eslint require-jsdoc: 0 */

const vlanController = require('../../controllers/vlan.js');
const reqMaker = require("supertest");
const fs = require('fs');

var loginCookie = '';
/*
useful way to log response in file

fs.writeFile('./vlan_unit_test.log', JSON.stringify(res), (e) => {if (e) throw e;});

*/
var vlanProfilesBeforeTest = [];

// login to flashman
beforeAll(async () => {
  var resAdmin = await reqMaker('localhost:8000').post('/login').send({name:'admin', password: 'landufrj123'}); // put the admin password that is in your current database
  resTeste = await reqMaker('localhost:8000').post('/login').send({name:'teste123', password: 'teste123'}); // create a test user and put here the credentials
  
  adminCk = resAdmin.header['set-cookie'];
  testeCk = resTeste.header['set-cookie'];
  
  vlanProfilesBeforeTest = (await reqMaker('localhost:8000').get('/vlan/profile/fetch').set('Cookie', adminCk).set('Accept', 'application/json')).body.vlanProfiles;
  
  expect(resAdmin.redirect).toBeTruthy();
  expect(resTeste.redirect).toBeTruthy();
});

// clean database
afterAll(async () => {
  var res;
  
// fetch current vlan profiles to delete
  let vlanProfilesAfterTest = (await reqMaker('localhost:8000').get('/vlan/profile/fetch').set('Cookie', adminCk).set('Accept', 'application/json')).body.vlanProfiles;

  // order to delete current vlan profiles
  var vlans_profiles_to_delete = [];
  for(let i = 0 ; i < vlanProfilesAfterTest.length ; i++) {
    if(vlanProfilesAfterTest[i]._id == null) {
      vlans_profiles_to_delete.push(vlanProfilesAfterTest[i].vlan_id);
    }
    else {
      vlans_profiles_to_delete.push(vlanProfilesAfterTest[i]._id);
    }
  }
  res = await reqMaker('localhost:8000').delete('/vlan/profile/del').send({ids: vlans_profiles_to_delete}).set('Cookie', adminCk).set('Accept', 'application/json');
  expect(res.body.success).toBeTruthy();

  // order to create vlan profiles before the test battery
  for(let i = 0 ; i < vlanProfilesBeforeTest.length ; i++) {
    res = await reqMaker('localhost:8000').post('/vlan/profile/new').send({id: vlanProfilesBeforeTest[i].vlan_id, name: vlanProfilesBeforeTest[i].profile_name}).set('Cookie', adminCk).set('Accept', 'application/json');
  }
  expect(res.body.success).toBeTruthy();
});


describe('VLAN Controller : showVlanProfiles', () => {
  test('Requesting as admin, permission to access vlan profiles is granted', async () => {
    const res = await reqMaker('localhost:8000').get('/vlan/profile').set('Cookie', adminCk);
    expect(res.statusCode).toBe(200);
  });

  test('Requesting as user without permission, forbidden http status code should be expected', async () => {
    const res = await reqMaker('localhost:8000').get('/vlan/profile').set('Cookie', testeCk);
    expect(res.statusCode).toBe(403);
  });
});

describe('VLAN Controller : getAllVlanProfiles', () => {
  test('Retrieving list of vlan profiles, as admin', async () => {
    const res = await reqMaker('localhost:8000').get('/vlan/profile/fetch').set('Cookie', adminCk).set('Accept', 'application/json');
    expect(res.body.success).toBeTruthy();
    expect(res.body.type).toMatch(/success/);
    expect(res.body.vlanProfiles instanceof Array).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  test('Retrieving list of vlan profiles, as test user', async () => {
    const res = await reqMaker('localhost:8000').get('/vlan/profile/fetch').set('Cookie', testeCk).set('Accept', 'application/json');
    expect(res.body.success).toBeTruthy();
    expect(res.body.type).toMatch(/success/);
    expect(res.body.vlanProfiles instanceof Array).toBe(true);
    expect(res.statusCode).toBe(200);
  });
});

describe('VLAN Controller : addVlanProfile', () => {
  test('Trying to add a vlan profile that probably the vlan_id is unique', async () => {
    const res = await reqMaker('localhost:8000').post('/vlan/profile/new').send({id: '123', name: 'Test123'}).set('Cookie', adminCk).set('Accept', 'application/json');
    expect(res.body.success).toBeTruthy();
    expect(res.body.type).toMatch(/success/);
    expect(res.statusCode).toBe(200);
  });

  test('Trying to add a vlan profile with a vid out of bounds', async () => {
    const res = await reqMaker('localhost:8000').post('/vlan/profile/new').send({id: '4096', name: 'fourhundred'}).set('Cookie', adminCk).set('Accept', 'application/json');
    expect(res.body.success).toBeFalsy();
    expect(res.body.type).toMatch(/danger/);
    expect(res.body.message).toMatch(/O VLAN ID não pode ser menor que 10 ou maior que 127/);
    expect(res.statusCode).toBe(200);
  });

  test('Trying to add a vlan profile with a name out of pattern', async () => {
    const res = await reqMaker('localhost:8000').post('/vlan/profile/new').send({id: '124', name: 'teste!@#'}).set('Cookie', adminCk).set('Accept', 'application/json');
    expect(res.body.success).toBeFalsy();
    expect(res.body.type).toMatch(/danger/);
    expect(res.body.message).toMatch(/O nome do Perfil de VLAN deve começar com um caractere do alfabeto, conter caracteres alfanuméricos, hífen ou sublinhado, não pode ser vazio e deve ser distinto dos já existentes/);
    expect(res.statusCode).toBe(200);
  });



  test('Trying to add a vlan profile with a name more than 32 characters', async () => {
    const res = await reqMaker('localhost:8000').post('/vlan/profile/new').send({id: '125', name: 'teste_teste_teste_teste_teste_teste'}).set('Cookie', adminCk).set('Accept', 'application/json');
    expect(res.body.success).toBeFalsy();
    expect(res.body.type).toMatch(/danger/);
    expect(res.body.message).toMatch(/Nome do Perfil de VLAN não deve ser maior do que 32 caracteres/);
    expect(res.statusCode).toBe(200);
  });

  test('Trying to add a vlan profile with vid already used', async () => {
    const res = await reqMaker('localhost:8000').post('/vlan/profile/new').send({id: '1', name: 'Ethernet'}).set('Cookie', adminCk).set('Accept', 'application/json');
    expect(res.body.success).toBeFalsy();
    expect(res.body.type).toMatch(/danger/);
    expect(res.body.message).toMatch(/Já existe um perfil de VLAN com esse ID fornecido/);
    expect(res.statusCode).toBe(200);
  });

  test('Trying to add a vlan profile with name already used', async () => {
    const res = await reqMaker('localhost:8000').post('/vlan/profile/new').send({id: '126', name: 'Internet'}).set('Cookie', adminCk).set('Accept', 'application/json');
    expect(res.body.success).toBeFalsy();
    expect(res.body.type).toMatch(/danger/);
    expect(res.body.message).toMatch(/Já existe um perfil de VLAN com esse nome fornecido/);
    expect(res.statusCode).toBe(200);
  });
});

describe('VLAN Controller : updateVlanProfile', () => {
  test('Requesting as admin to edit vid 1', async () => {
    const res = await reqMaker('localhost:8000').get('/vlan/profile/1').set('Cookie', adminCk);
    expect(res.statusCode).toBe(200);
  });

  test('Requesting as user without permission, forbidden http status code should be expected', async () => {
    const res = await reqMaker('localhost:8000').get('/vlan/profile/1').set('Cookie', testeCk);
    expect(res.statusCode).toBe(403);
  });

  test('Requesting to edit vlan profile that doesnt exist', async () => {
    const res = await reqMaker('localhost:8000').get('/vlan/profile/5000').set('Cookie', adminCk);
    expect(res.text).toMatch(/VLAN ID não encontrado/);
    expect(res.statusCode).toBe(200);
  });
});

describe('VLAN Controller : editVlanProfile', () => {
});

describe('VLAN Controller : getVlans', () => {
});

describe('VLAN Controller : updateVlans', () => {
});

describe('VLAN Controller : retrieveVlansToDevice', () => {
});
