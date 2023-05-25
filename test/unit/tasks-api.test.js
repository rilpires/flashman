require('../../bin/globals.js');
const nock = require('nock');
const utils = require('../common/utils');
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

  describe('joinTasks method', () => {
    test('joinTasks - Inserting when empty', () => {
      let currentTasks = [];
      let newTask = {
         name: 'getParameterValues',
         parameterNames:
            [
               'InternetGatewayDevice.WANDevice',
               'InternetGatewayDevice.Time.NTPServer1',
               'InternetGatewayDevice.Time.Status',
            ],
      };
      let [toAdd, toDelete]
        = TasksAPI.tests.joinAllTasks([...currentTasks, newTask]);

      expect(toAdd).toHaveLength(1);
      expect(toDelete).toHaveLength(0);
      expect(toAdd[0]).toStrictEqual(newTask);
    });

    test('joinTasks - concatenating arguments', () => {
      let currentTasks = [{
        _id: '0',
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.Time.Status',
        ]},
      ];
      let newTask = {
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.WANDevice',
        ],
      };
      let [toAdd, toDelete]
        = TasksAPI.tests.joinAllTasks([...currentTasks, newTask]);
      expect(toAdd).toHaveLength(1);
      expect(toDelete).toHaveLength(1);
      expect(toDelete[0]).toBe('0');
      expect(toAdd[0]).toStrictEqual({
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.Time.Status',
          'InternetGatewayDevice.WANDevice',
      ]});
    });

    test('joinTasks - should ignore new task', () => {
      // Should ignore new task but if we add the same one is also ok
      let currentTasks = [{
        _id: '0',
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.WANDevice',
          'InternetGatewayDevice.Time.Status',
        ]},
      ];
      let newTask = {
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.WANDevice',
        ],
      };
      let [toAdd, toDelete]
        = TasksAPI.tests.joinAllTasks([...currentTasks, newTask]);
      expect(toAdd).toStrictEqual([{
          name: 'getParameterValues',
          parameterNames: [
            'InternetGatewayDevice.WANDevice',
            'InternetGatewayDevice.Time.Status',
        ]},
      ]);
      expect(toDelete).toStrictEqual(['0']);
    });

    test('joinTasks - should not concatenate', () => {
      let currentTasks = [{
        _id: '0',
        name: 'setParameterValues',
        parameterValues: [
          ['InternetGatewayDevice.LANDevice', 'foo', 'xsd:string'],
          ['InternetGatewayDevice.WANDevice', 'foo', 'xsd:string'],
        ]},
      ];
      let newTask = {
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.WANDevice',
        ],
      };
      let [toAdd, toDelete]
        = TasksAPI.tests.joinAllTasks([...currentTasks, newTask]);
      expect(toAdd).toHaveLength(1);
      expect(toDelete).toHaveLength(0);
      expect(toAdd[0]).toStrictEqual(newTask);
    });

    test('joinTasks - partial concatenation', () => {
      let currentTasks = [{
        _id: '0',
        name: 'setParameterValues',
        parameterValues: [
          ['InternetGatewayDevice.LANDevice', 'foo', 'xsd:string'],
          ['InternetGatewayDevice.WANDevice', 'foo', 'xsd:string'],
        ]}, {
        _id: '1',
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.LANDevice',
        ],
      }];
      let newTask = {
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.WANDevice',
        ],
      };
      let [toAdd, toDelete]
        = TasksAPI.tests.joinAllTasks([...currentTasks, newTask]);
      expect(toAdd).toHaveLength(1);
      expect(toDelete).toHaveLength(1);
      expect(toDelete[0]).toBe('1');
      expect(toAdd[0]).toStrictEqual({
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.LANDevice',
          'InternetGatewayDevice.WANDevice',
        ],
      });
    });

    test('joinTasks - partial concatenation (2)', () => {
      let currentTasks = [{
        _id: '0',
        name: 'setParameterValues',
        parameterValues: [
          ['InternetGatewayDevice.LANDevice', 'foo', 'xsd:string'],
          ['InternetGatewayDevice.WANDevice', 'foo', 'xsd:string'],
        ]}, {
        _id: '1',
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.LANDevice.WHATEVER',
        ],
      }];
      let newTask = {
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.WANDevice.*',
        ],
      };
      let [toAdd, toDelete]
        = TasksAPI.tests.joinAllTasks([...currentTasks, newTask]);
      expect(toAdd).toHaveLength(1);
      expect(toDelete).toHaveLength(1);
      expect(toDelete[0]).toBe('1');
      expect(toAdd[0]).toStrictEqual({
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.LANDevice.WHATEVER',
          'InternetGatewayDevice.WANDevice.*',
        ],
      });
    });

    test('joinTasks - not inserting because already included', () => {
      // We dont cut subpaths when joining paths because code would
      // be ugly and this works lol
      let currentTasks = [{
        _id: '0',
        name: 'setParameterValues',
        parameterValues: [
          ['InternetGatewayDevice.LANDevice', 'foo', 'xsd:string'],
          ['InternetGatewayDevice.WANDevice', 'foo', 'xsd:string'],
        ]}, {
        _id: '1',
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.LANDevice.*',
        ],
      }];
      let newTask = {
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.LANDevice.WHATEVER',
        ],
      };
      let [toAdd, toDelete]
        = TasksAPI.tests.joinAllTasks([...currentTasks, newTask]);
      expect(toDelete).toStrictEqual(['1']);
      expect(toAdd).toStrictEqual([{
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.LANDevice.*',
          'InternetGatewayDevice.LANDevice.WHATEVER',
        ]},
      ]);
    });

    test('joinTasks - partial concatenation (3)', () => {
      let currentTasks = [{
        _id: '0',
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.WANDevice.*',
        ]}, {
        _id: '1',
        name: 'setParameterValues',
        parameterValues: [
          ['InternetGatewayDevice.LANDevice', 'foo1', 'xsd:string'],
          ['InternetGatewayDevice.WANDevice', 'foo2', 'xsd:string'],
          ['InternetGatewayDevice.WhateverDevice', 'foo3', 'xsd:string'],
        ],
      }];
      let newTask = {
        name: 'setParameterValues',
        parameterValues: [
          ['InternetGatewayDevice.LANDevice', 'bar1', 'xsd:string'],
          ['InternetGatewayDevice.WANDevice', 'bar2', 'xsd:string'],
        ],
      };
      let [toAdd, toDelete]
        = TasksAPI.tests.joinAllTasks([...currentTasks, newTask]);
      expect(toAdd[0]).toStrictEqual({
        name: 'setParameterValues',
        parameterValues: [
          ['InternetGatewayDevice.WANDevice', 'bar2', 'xsd:string'],
          ['InternetGatewayDevice.LANDevice', 'bar1', 'xsd:string'],
          ['InternetGatewayDevice.WhateverDevice', 'foo3', 'xsd:string'],
        ],
      });
      expect(toDelete).toStrictEqual(['1']);
    });

    test('joinTasks - full substitution', () => {
      // This case shouldnt even be possible to occur but anyway
      let currentTasks = [{
        _id: '0',
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.LANDevice.Whatever',
        ],
      }, {
        _id: '1',
        name: 'setParameterValues',
        parameterValues: [
          'IgnoreMeDevice.Whatever', 'fooo', 'xsd:string',
        ],
      }, {
        _id: '2',
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.WANDevice.AlsoWhatever',
        ],
      }];
      let newTask = {
        name: 'getParameterValues',
        parameterNames: [
          'InternetGatewayDevice.LANDevice.Whatever',
          'InternetGatewayDevice.WANDevice.AlsoWhatever',
          'InternetGatewayDevice.LANDevice.*',
          'InternetGatewayDevice.WANDevice.*',
        ],
      };
      let [toAdd, toDelete]
        = TasksAPI.tests.joinAllTasks([...currentTasks, newTask]);
      expect(toDelete).toStrictEqual(['0', '2']);
      expect(toAdd).toStrictEqual([newTask]);
    });

    test('joinTasks - substitute download', () => {
      let currentTasks = [{
        _id: '0',
        name: 'getParamaterValues',
        parameterNames: [
          'InternetGatewayDevice.LANDevice.*',
        ],
      }, {
        _id: '1',
        name: 'download',
        file: 'oldfile.bin',
      }];
      let newTask = {
        name: 'download',
        file: 'newfile.bin',
      };
      let [toAdd, toDelete]
        = TasksAPI.tests.joinAllTasks([...currentTasks, newTask]);
      expect(toDelete).toStrictEqual(['1']);
      expect(toAdd).toStrictEqual([newTask]);
    });
  });
});
