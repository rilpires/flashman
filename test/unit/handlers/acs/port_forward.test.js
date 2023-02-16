require('../../../../bin/globals.js');
const pfAcsHandlers = require(
  '../../../../controllers/handlers/acs/port_forward');
const {MongoClient} = require('mongodb');
process.env.FLM_GENIE_IGNORED = 'asd';

describe('Controllers - Handlers - Port Forward', () => {
  let connection;

  beforeAll(async () => {
    connection = await MongoClient.connect(global.__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await connection.db();
  });

  afterAll(async () => {
    await connection.close();
  });

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
