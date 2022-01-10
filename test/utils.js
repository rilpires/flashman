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

module.exports = {
  mockResponse,
  mockRequest,
};