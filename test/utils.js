const request = require('supertest');
const t = require('../controllers/language').i18next.t;

// mock for request express tests
const mockRequest = (bodyData, userData) => {
  return {
    body: bodyData,
    user: userData,
  };
};

/* function to get the translation text without the errorline embed,
   useful in unit test context where you want just the message
   without the errorline */
const tt = function(translationKey, errorObj) {
  let ret = t(translationKey, errorObj);
  ret = ret.replace(/ \(.*\)/, '');
  return ret;
};

// mock for response express teste
const mockResponse = () => {
  let res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const flashmanLogin = async (user, password) => {
  const login = await request('localhost:8000')
    .post('/login')
    .send({
      name: user,
      password: password,
    })
    .catch(console.log);
  if (typeof login.header['set-cookie'] === undefined) {
    throw new Error('Failed to get admin cookie');
  }

  return {
    cookie: login.header['set-cookie'],
  };
};

module.exports = {
  mockResponse,
  mockRequest,
  flashmanLogin,
  tt,
};
