// mock for request express tests
const mockRequest = (bodyData) => {
  return {
    body: bodyData,
  };
};

// mock for response express teste
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

module.exports = {
  mockResponse,
  mockRequest
};
