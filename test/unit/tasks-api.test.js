require('../../bin/globals.js');
const nock = require('nock');
process.env.FLM_GENIE_IGNORED = 'asd';
const TasksAPI = require('../../controllers/external-genieacs/tasks-api');

let nbiTest1 = nock('http://localhost:7557')
  .delete('/devices/test-AC10-test1')
  .reply(200, '');
let nbiTest2 = nock('http://localhost:7557')
  .delete('/devices/acs-id-of-cpe-not-in-database')
  .reply(200, '');
let nbiTest4 = nock('http://localhost:7557')
  .delete('/devices/test-AC10-test4')
  .replyWithError('Error: connect ECONNREFUSED localhost:7557');

describe('Controllers - External GenieACS - TasksAPI', () => {
  /* list of functions that may be mocked:
    http.request
  */
  /*
    input:
      device:
        acs_id - valid _id, _id not in database, undefined
        use_tr069 - true, false, undefined
    output:
      result - true, false
      total tests = 6 */
  describe('deleteDeviceFromGenie', () => {
    test('acs_id -> valid _id', async () => {
      let device = {
        acs_id: 'test-AC10-test1',
        use_tr069: true,
      };
      let result = await TasksAPI.deleteDeviceFromGenie(device);
      expect(result).toBe(true);
    });
    test('acs_id -> _id not in database', async () => {
      let device = {
        acs_id: 'acs-id-of-cpe-not-in-database',
        use_tr069: true,
      };
      let result = await TasksAPI.deleteDeviceFromGenie(device);
      expect(result).toBe(true);
    });
    test('acs_id -> undefined', async () => {
      let device = {
        use_tr069: true,
      };
      let result = await TasksAPI.deleteDeviceFromGenie(device);
      expect(result).toBe(true);
    });
    test('use_tr069 -> false', async () => {
      let device = {
        acs_id: 'test-AC10-test2',
        use_tr069: false,
      };
      let result = await TasksAPI.deleteDeviceFromGenie(device);
      expect(result).toBe(true);
    });
    test('use_tr069 -> undefined', async () => {
      let device = {
        acs_id: 'test-AC10-test3',
      };
      let result = await TasksAPI.deleteDeviceFromGenie(device);
      expect(result).toBe(true);
    });
    test('failed communication with nbi', async () => {
      let device = {
        acs_id: 'test-AC10-test4',
        use_tr069: true,
      };
      let result = await TasksAPI.deleteDeviceFromGenie(device);
      expect(result).toBe(false);
    });
  });
});
