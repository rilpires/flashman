require('../../../../bin/globals.js');
const pfAcsHandlers = require(
  '../../../../controllers/handlers/acs/port_forward');
process.env.FLM_GENIE_IGNORED = 'asd';

describe('Controllers - Handlers - Port Forward', () => {
  /* list of functions that may be mocked:
    http.request
    TasksAPI.getFromCollection
    TasksAPI.addTask
    DeviceModel.findOne
  */
  describe('', () => {
    test('', async () => {
      expect(true).toBe(true);
    });
  });
});
