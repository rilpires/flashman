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
      rawPortForward: undefined, String, random Object,
        invalid Array, valid Array of Object
      [{
        path: undefined, String
        value: undefined, String
      }]
      fields: undefined, String, invalid Object, valid Object
        {
          port_mapping_dhcp: valid String, matchless String, undefined
          port_mapping_ppp: valid String, matchless String, undefined
          port_mapping_fields: undefined, String, Object
          {
            client: empty Array, Array[3],
            external_port_start: empty Array, Array[3],
            external_port_end: empty Array, Array[3],
            internal_port_start: empty Array, Array[3],
            internal_port_end: empty Array, Array[3],
          },
        }
    output:
      port_mapping: empty Array, Array
      [{
        ip: String,
        external_port_start: Number,
        external_port_end: Number,
        internal_port_start: Number,
        internal_port_end: Number,
      }]
      total tests = 7 */
  describe('convertPortForwardFromGenieToFlashman', () => {
    test('rawPortForward(undefined), fields(undefined)', async () => {
      let rawPortForward = undefined;
      let fields = undefined;
      let pm = await pfAcsHandlers
        .convertPortForwardFromGenieToFlashman(rawPortForward, fields);
      expect(Array.isArray(pm)).toBe(true);
      expect(pm.length).toBe(0);
    });
    test('rawPortForward(String), fields(undefined)', async () => {
      let rawPortForward = 'hf03h01391h309fh';
      let fields = undefined;
      let pm = await pfAcsHandlers
        .convertPortForwardFromGenieToFlashman(rawPortForward, fields);
      expect(Array.isArray(pm)).toBe(true);
      expect(pm.length).toBe(0);
    });
    test('rawPortForward(random Object), fields(undefined)', async () => {
      let rawPortForward = {'a': 1, 'b': 2, 'c': 3};
      let fields = undefined;
      let pm = await pfAcsHandlers
        .convertPortForwardFromGenieToFlashman(rawPortForward, fields);
      expect(Array.isArray(pm)).toBe(true);
      expect(pm.length).toBe(0);
    });
    test('rawPortForward(invalid Array), fields(undefined)', async () => {
      let rawPortForward = [123, 'abc', {'a': 1, 'b': 2, 'c': 3}];
      let fields = undefined;
      let pm = await pfAcsHandlers
        .convertPortForwardFromGenieToFlashman(rawPortForward, fields);
      expect(Array.isArray(pm)).toBe(true);
      expect(pm.length).toBe(0);
    });
    // ---
    test('rawPortForward(invalid Array), fields(String)', async () => {
      let rawPortForward = [123, 'abc', {'a': 1, 'b': 2, 'c': 3}];
      let fields = 'thgb013hrn028h4h12f0j';
      let pm = await pfAcsHandlers
        .convertPortForwardFromGenieToFlashman(rawPortForward, fields);
      expect(Array.isArray(pm)).toBe(true);
      expect(pm.length).toBe(0);
    });
    test('rawPortForward(invalid Array), fields(invalid Object)', async () => {
      let rawPortForward = [123, 'abc', {'a': 1, 'b': 2, 'c': 3}];
      let fields = {'a': 1, 'b': 2, 'c': 3};
      let pm = await pfAcsHandlers
        .convertPortForwardFromGenieToFlashman(rawPortForward, fields);
      expect(Array.isArray(pm)).toBe(true);
      expect(pm.length).toBe(0);
    });
    test('rawPortForward(valid/invalid Array), fields'+
      '(valid/invalid Object)', async () => {
      let rawPortForward = [
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.2.ExternalPort',
          'value': ['222']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.2.InternalPort',
          'value': ['222']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.2.X_HW_InternalEndPort',
          'value': ['222']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.2.ExternalPortEndRange',
          'value': ['222']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.2.InternalClient',
          'value': ['192.168.10.2']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.4.ExternalPort',
          'value': ['444']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.4.InternalPort',
          'value': ['444']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.4.X_HW_InternalEndPort',
          'value': ['444']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.4.ExternalPortEndRange',
          'value': ['444']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.4.InternalClient',
          'value': ['192.168.10.40']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.6.ExternalPort',
          'value': ['666']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.6.InternalPort',
          'value': ['666']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.6.X_HW_InternalEndPort',
          'value': ['666']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.6.ExternalPortEndRange',
          'value': ['666']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.6.InternalClient',
          'value': ['192.168.10.66']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.8.ExternalPort',
          'value': ['777']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.8.ExternalPort',
          'value': ['888']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.8.InternalPort',
          'value': ['777']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.8.InternalPort',
          'value': ['888']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.8.X_HW_InternalEndPort',
          'value': ['777']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.8.X_HW_InternalEndPort',
          'value': ['888']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.8.ExternalPortEndRange',
          'value': ['777']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.8.ExternalPortEndRange',
          'value': ['888']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.8.InternalClient',
          'value': ['192.168.10.77']},
        {'path': 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice'+
          '.2.WANIPConnection.3.PortMapping.8.InternalClient',
          'value': ['192.168.10.88']}, {}, {'value': ''}, {'path': ''},
        {'path': '', 'value': ''}, {'path': '123', 'value': 'abc'},
        {'value': '123'}, {'path': 'abc'}, {'path': '123', 'value': 'abc'},
      ];
      let fields = {
        port_mapping_dhcp: 'InternetGatewayDevice.WANDevice.1.'+
          'WANConnectionDevice.*.WANIPConnection.*.PortMapping',
        port_mapping_ppp: 'InternetGatewayDevice.WANDevice.1.'+
          'WANConnectionDevice.*.WANPPPConnection.*.PortMapping',
        port_mapping_fields: {
          external_port_start: ['ExternalPort', 'external_port_start',
            'xsd:unsignedInt'],
          internal_port_end: [
            'X_HW_InternalEndPort', 'internal_port_end', 'xsd:unsignedInt',
          ],
          internal_port_start: ['InternalPort', 'internal_port_start',
            'xsd:unsignedInt'],
          external_port_end: [
            'ExternalPortEndRange', 'external_port_end', 'xsd:unsignedInt',
          ],
          client: ['InternalClient', 'ip', 'xsd:string'],
          abc: [1, 2, 3],
        },
      };
      let pm = await pfAcsHandlers
        .convertPortForwardFromGenieToFlashman(rawPortForward, fields);
      console.log(pm);
      expect(Array.isArray(pm)).toBe(true);
      expect(pm.length).toBe(4);
    });
  });
});
