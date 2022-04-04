const request = require('supertest');

// mock for request express tests
const mockRequest = (bodyData, userData) => {
  return {
    body: bodyData,
    user: userData,
  };
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
}

module.exports = {
  mockResponse,
  mockRequest,
  flashmanLogin,
};
