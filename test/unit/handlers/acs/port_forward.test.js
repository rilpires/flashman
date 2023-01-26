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
  /*
    input:
      rawPortForward: [{
        path: String
        value: String
      }]
      fields:
        {
          port_mapping_dhcp: String,
          port_mapping_ppp: String,
          port_mapping_fields: {
            client: Array,
            external_port_start: Array,
            external_port_end: Array,
            internal_port_start: Array,
            internal_port_end: Array,
          },
        }
    output:
      port_mapping: [{
        ip: String,
        external_port_start: Number,
        external_port_end: Number,
        internal_port_start: Number,
        internal_port_end: Number,
      }]
      total tests = x */
  describe('convertPortForwardFromGenieToFlashman', () => {
    test('...', async () => {
      let rawPortForward = {};
      let fields = {};
      // let pm = await pfAcsHandlers
        // .convertPortForwardFromGenieToFlashman(rawPortForward, fields);
      expect(true).toBe(true);
    });
  });
});
