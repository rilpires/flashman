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

// Extend a mock implementation to wait execution of function
// Usefull in functions that are not async but need to wait for
// a return async funcion
const waitableMock = () => {
  let resolve;
  let times;
  let calledCount = 0;
  const mock = jest.fn();
  mock.mockImplementation(() => {
    calledCount +=1;
    if (resolve && calledCount >= times) {
      resolve();
    }
  });

  mock.waitToHaveBeenCalled = (t) => {
    times = t;
    return new Promise((r) => {
      resolve = r;
    });
  };

  return mock;
};

// mock a response. Wait for the json function
// to be called in the test
const waitableMockResponse = () => {
  let res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = waitableMock(res);
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
  waitableMock,
  waitableMockResponse,
  flashmanLogin,
  tt,
};
