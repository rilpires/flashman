require('../../../../bin/globals.js');

let cPath = '../../../../controllers';
const pfAcsHandlers = require(cPath + '/handlers/acs/port_forward');
const TasksAPI = require(cPath + '/external-genieacs/tasks-api');
const acsXMLConfigHandler = require(cPath + '/handlers/acs/xmlconfig');
const DevicesAPI = require(cPath + '/external-genieacs/devices-api');
const util = require(cPath + '/handlers/util');
const basicCPEModel = require(cPath +
  '/external-genieacs/cpe-models/base-model');
const fs = require('fs');
process.env.FLM_GENIE_IGNORED = 'test';

let createSimplePortMapping = function(ip, port) {
  return {ip: ip, external_port_start: port, external_port_end: port,
  internal_port_start: port, internal_port_end: port};
};

let almostValidDevice = function(m) {
  return {use_tr069: true, acs_id: 'test', model: m,
        version: 'test', hw_version: 'test', port_mapping: 'test'};
};

let deviceH199A;

let testChangePortForwardRules = async function(device, rulesDiff,
  interfaceValue, deleteAllRules, retFromTask, retFromCollection,
  calledTask, timesCalledAddTask) {
  jest.spyOn(TasksAPI, 'getFromCollection')
    .mockReturnValue(retFromCollection);
  let calls = [];
  let addTaskSpy = jest.spyOn(TasksAPI, 'addTask')
    .mockImplementation(async (deviceid, task, callback=null,
      legacyTimeout=0, requestConn=true) => {
      calls.push(util.deepCopyObject(task));
      return {success: true, executed: true};
    });
  await pfAcsHandlers.changePortForwardRules(device,
    rulesDiff, interfaceValue, deleteAllRules);
  expect(addTaskSpy)
    .toHaveBeenCalledTimes(timesCalledAddTask);
  if (timesCalledAddTask > 0 && calledTask.length > 0) {
    let i = 0;
    calledTask.forEach((ct) => {
      expect(addTaskSpy.mock.calls[i][0]).toBe(device.acs_id);
      expect(JSON.stringify(calls[i]))
        .toBe(JSON.stringify(ct));
      i++;
    });
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
    beforeAll(async () => {
      deviceH199A = almostValidDevice('ZXHN H199A');
      deviceH199A.port_mapping = [
        createSimplePortMapping('192.168.1.10', '1010')];
    });
    test.each([[0],
      ['test'],
      [{}],
      [{use_tr069: true}],
      [{use_tr069: true, acs_id: 'test'}],
      [{use_tr069: true, acs_id: 'test', model: 'test',
        version: 'test', hw_version: 'test'}],
      [almostValidDevice('ZXHN H199A')],
      ])('bogus device (0 addTask, 0 getModelFields) %o',
      async (device) => {
      jest.spyOn(basicCPEModel, 'getModelFields');
      await testChangePortForwardRules(device, 0, null, false, {}, [], [], 0);
      expect(basicCPEModel.getModelFields)
        .toHaveBeenCalledTimes(0);
    });
    it('check if configFileEditing is called (0 addTask)', async () => {
      jest.spyOn(acsXMLConfigHandler, 'configFileEditing')
        .mockReturnValue(undefined);
      let device = almostValidDevice('120AC');
      device.port_mapping = [createSimplePortMapping('192.168.1.10', '1010')];
      await testChangePortForwardRules(device, 0, null,
        false, {}, [], [], 0);
      expect(acsXMLConfigHandler.configFileEditing).toHaveBeenCalledTimes(1);
      expect(acsXMLConfigHandler.configFileEditing)
        .toHaveBeenCalledWith(device, ['port-forward']);
    });
    it('check if getIPInterface is called (0 addTask)', async () => {
      jest.spyOn(pfAcsHandlers, 'getIPInterface')
        .mockReturnValue(undefined);
      let device = almostValidDevice('HC220-G5');
      device.port_mapping = [createSimplePortMapping('192.168.1.10', '1010')];
      await testChangePortForwardRules(device, 0, null,
        false, {}, [], [], 0);
      expect(pfAcsHandlers.getIPInterface).toHaveBeenCalledTimes(1);
      expect(pfAcsHandlers.getIPInterface)
        .toHaveBeenCalledWith(device, 0, 'Device.IP.Interface');
    });
    it('tasks not being a array (0 addTask)', async () => {
      await testChangePortForwardRules(deviceH199A, 0, null,
        false, {}, 'test', [], 0);
    });
    it('tasks array with faulty object without name property (0 addTask)',
      async () => {
      await testChangePortForwardRules(deviceH199A, 0, null,
        false, {}, [{test: 'test'}], [], 0);
    });
    it('tasks array with (add|delete)Object name (0 addTask)', async () => {
      await testChangePortForwardRules(deviceH199A, 0, null,
        false, {}, [{name: 'addObject'}], [], 0);
    });
    it('deleteAllRules call (2 + rules.length addTask)', async () => {
      let tasks = [];
      let filePath = './test/assets/set_port_mapping.values.1.txt';
      let setParameterValues = fs.readFileSync(filePath, 'utf8');
      let pmBase = basicCPEModel.getModelFields().port_mapping_dhcp;
      tasks.push({name: 'deleteObject', objectName: pmBase + '.*'});
      // tasks.push({name: 'addObject', objectName: pmBase});
      tasks.push({name: 'addObject', objectName: pmBase});
      tasks.push(JSON.parse(setParameterValues));
      deviceH199A.connection_type = 'dhcp';
      await testChangePortForwardRules(deviceH199A, 1, null,
        true, {success: true, executed: true}, [], tasks, 3);
      deviceH199A.connection_type = 'test';
    });
    it('no connection_type property (0 addTask)', async () => {
      delete deviceH199A['connection_type'];
      await testChangePortForwardRules(deviceH199A, 1, null,
        true, {success: true, executed: true}, [], [], 0);
      expect(TasksAPI.getFromCollection).toHaveBeenCalledTimes(0);
      deviceH199A['connection_type'] = 'test';
    });
    it('connection_type with wrong string (0 addTask)', async () => {
      await testChangePortForwardRules(deviceH199A, 1, null,
        true, {success: true, executed: true}, [], [], 0);
      expect(TasksAPI.getFromCollection).toHaveBeenCalledTimes(0);
    });
    /*
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
    // await testChangePortForwardRules(device, rulesDiff, interfaceValue,
    //   deleteAllRules, retFromTask, retFromCollection, calledTask,
    //   timesCalledAddTask);
    */
  });
});
