require('../../../../bin/globals.js');

let cPath = '../../../../controllers';
const pfAcsHandlers = require(cPath + '/handlers/acs/port_forward');
const TasksAPI = require(cPath + '/external-genieacs/tasks-api');
const acsXMLConfigHandler = require(cPath + '/handlers/acs/xmlconfig');
const DevicesAPI = require(cPath + '/external-genieacs/devices-api');
const basicCPEModel = require(cPath +
  '/external-genieacs/cpe-models/base-model');
process.env.FLM_GENIE_IGNORED = 'test';

let testChangePortForwardRules = async function(device, rulesDiff,
  interfaceValue, deleteAllRules, retFromTask, retFromCollection,
  calledTask, timesCalledAddTask, callback = null) {
  jest.spyOn(TasksAPI, 'getFromCollection')
    .mockReturnValue(retFromCollection);
  jest.spyOn(TasksAPI, 'addTask')
    .mockReturnValue(retFromTask);
  await pfAcsHandlers.changePortForwardRules(device,
    rulesDiff, interfaceValue, deleteAllRules);
  expect(TasksAPI.addTask)
    .toHaveBeenCalledTimes(timesCalledAddTask);
  if (timesCalledAddTask > 0) {
    expect(TasksAPI.addTask)
      .toHaveBeenCalledWith(device.acs_id, calledTask, callback);
  }
};

describe('Controllers - Handlers - Port Forward', () => {
  /* list of functions that may be mocked:
    http.request
    TasksAPI.getFromCollection
    TasksAPI.addTask
    DeviceModel.findOne
  */
  /*
    input:
      device:
        acs_id - String
        model - String
        version - String
        hw_version - String
        use_tr069 - true, false
        connection_type - 'pppoe', 'dhcp'
        port_mapping - [{}]
      rulesDiffLength - Number
      interfaceValue - null
      deleteAllRules - true, false
    output:
      check TasksAPI.addTask
        toHaveBeenCalledWith
        toHaveBeenCalledTimes
    possible cases:
      ( ) - bogus device (0 addTask, 0 instantiateCPEByModelFromDevice)
      ( ) - check if configFileEditing is called (0 addTask)
      ( ) - check if getIPInterface is called (0 addTask)
      ( ) - tasks not being a array (0 addTask)
      ( ) - tasks array with faulty object without name property (0 addTask)
      ( ) - tasks array with (add|delete)Object name (0 addTask)
      ( ) - deleteAllRules call (2 + rules.length addTask)
      ( ) - no connection_type property (0 addTask)
      ( ) - connection_type with wrong string (0 addTask)
      ( ) - from 0 to 2 rules (connection_type dhcp) [check calledTask]
      ( ) - from 3 to 4 rules [check calledTask]
      ( ) - from 5 to 2 rules [check calledTask]
      ( ) - from 3 to 0 rules [check calledTask]
    total tests = 19 */
  describe('changePortForwardRules function(device, rulesDiffLength'+
    ', interfaceValue, deleteAllRules)', () => {
    test.each([[0],
      ['test'],
      [{}],
      [{use_tr069: true}],
      [{use_tr069: true, acs_id: 'test'}],
      [{use_tr069: true, acs_id: 'test', model: 'test',
        version: 'test', hw_version: 'test'}],
      [{use_tr069: true, acs_id: 'test', model: 'ZXHN H199A',
        version: 'test', hw_version: 'test', port_mapping: 'test'}],
      ])('bogus device (0 addTask, 0 getModelFields) %o',
      async (device) => {
      jest.spyOn(basicCPEModel, 'getModelFields');
      await testChangePortForwardRules(device, 0, null, false, {}, [], {}, 0);
      expect(basicCPEModel.getModelFields)
        .toHaveBeenCalledTimes(0);
    });
    it('check if configFileEditing is called (0 addTask)', async () => {
      jest.spyOn(acsXMLConfigHandler, 'configFileEditing')
        .mockReturnValue(undefined);
      let device = {
        acs_id: 'test',
        model: '120AC',
        version: 'test',
        hw_version: 'test',
        use_tr069: true,
        connection_type: 'test',
        port_mapping: [{ip: '192.168.1.10',
          external_port_start: '1010',
          external_port_end: '1010',
          internal_port_start: '1010',
          internal_port_end: '1010'}]};
      await testChangePortForwardRules(device, 0, null,
        false, {}, [], {}, 0);
      expect(acsXMLConfigHandler.configFileEditing).toHaveBeenCalledTimes(1);
      expect(acsXMLConfigHandler.configFileEditing)
        .toHaveBeenCalledWith(device, ['port-forward']);
    });
      // await testChangePortForwardRules(device, rulesDiff, interfaceValue,
      //   deleteAllRules, retFromTask, retFromCollection, calledTask,
      //   timesCalledAddTask);
    /*
    it('check if getIPInterface is called (0 addTask)', async () => {
      expect(true).toBe(true);
    });
    it('tasks not being a array (0 addTask)', async () => {
      expect(true).toBe(true);
    });
    it('tasks array with faulty object without name property (0 addTask)',
      async () => {
      expect(true).toBe(true);
    });
    it('tasks array with (add|delete)Object name (0 addTask)', async () => {
      expect(true).toBe(true);
    });
    it('deleteAllRules call (2 + rules.length addTask)', async () => {
      expect(true).toBe(true);
    });
    it('no connection_type property (0 addTask)', async () => {
      expect(true).toBe(true);
    });
    it('connection_type with wrong string (0 addTask)', async () => {
      expect(true).toBe(true);
    });
    it('from 0 to 2 rules (connection_type dhcp) [check calledTask]',
      async () => {
      expect(true).toBe(true);
    });
    it('from 3 to 4 rules [check calledTask]', async () => {
      expect(true).toBe(true);
    });
    it('from 5 to 2 rules [check calledTask]', async () => {
      expect(true).toBe(true);
    });
    it('from 3 to 0 rules [check calledTask]', async () => {
      expect(true).toBe(true);
    });
    */
  });
});
