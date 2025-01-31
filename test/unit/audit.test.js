process.env.FLASHAUDIT_ENABLED = 'true';

require('../../bin/globals.js');
const {ObjectID} = require('mongodb');
const mockingoose = require('mockingoose');
const utils = require('../utils');
const FlashAudit = require('@anlix-io/flashaudit-node-client');
const Audit = require('../../controllers/audit');
const ConfigModel = require('../../models/config');
const DeviceModel = require('../../models/device');
const UserModel = require('../../models/user');
const RoleModel = require('../../models/role');

// mocked CPEs to be used in all tests.
const cpesMock = [{
  _id: 'AB:AB:AB:AB:AB:AA',
  version: '0.42.0',
  model: 'W5-1200FV1',
  wifi_is_5ghz_capable: true,
  mesh_mode: 0,
  pppoe_password: 'dummypass',
  wifi_ssid: 'old-wifi-test',
  wifi_ssid_5ghz: 'old-wifi-test-5g',
  wifi_state: 0,
  wifi_state_5ghz: 1,
  ping_hosts: ['www.tiktok.com.br'],
  lan_devices: [
    {mac: 'ab:ab:ab:ab:ab:ac', port: [44], router_port: [44]},
    {mac: 'ab:ab:ab:ab:ab:ad'},
    {mac: 'ab:ab:ab:ab:ab:ae'},
  ],
  vlan: [
    {port: 1, vlan_id: 100},
    {port: 2, vlan_id: 500},
    {port: 4, vlan_id: 900},
  ],
}, {
  _id: 'AB:AB:AB:AB:AB:AB',
  version: '0.42.0',
  model: 'W5-1200FV1',
  mesh_slaves: ['AB:AB:AB:AB:AB:AC'],
  mesh_mode: 1,
}, {
  _id: 'AB:AB:AB:AB:AB:AC',
  version: '0.42.0',
  model: 'W5-1200FV1',
  mesh_master: 'AB:AB:AB:AB:AB:AB',
}, {
  _id: 'AB:AB:AB:AB:AB:AF',
  serial_tr069: 'serial_tr069_AB:AB:AB:AB:AB:AF',
  alt_uid_tr069: 'alt_uid_tr069_AB:AB:AB:AB:AB:AF',
  use_tr069: true,
  version: '0.40.0',
  model: 'F670L',
  acs_id: 'test-F670L-test',
  lan_subnet: '192.168.0.1',
  port_mapping: [{
    ip: '192.168.0.33',
    external_port_start: 44,
    external_port_end: 44,
    internal_port_start: 44,
    internal_port_end: 44,
  }, {
    ip: '192.168.0.32',
    external_port_start: 44,
    external_port_end: 44,
    internal_port_start: 44,
    internal_port_end: 44,
  }],
}];

// mocked Users to be used in all tests.
const usersMock = [{
  // eslint-disable-next-line new-cap
  _id: ObjectID(),
  name: 'test_user',
  password: '123456',
  role: 'tester',
}, {
  // eslint-disable-next-line new-cap
  _id: ObjectID(),
  name: 'test_user_2',
  password: '123456',
  role: 'tester',
}];

// mocked Roles to be used in all tests.
const rolesMock = [{
  // eslint-disable-next-line new-cap
  _id: ObjectID(),
  name: 'tester',
  grantWifiInfo: 1,
  grantPPPoEInfo: 2,
  grantLanDevices: 2,
  grantSearchLevel: 2,
  grantNotificationPopups: true,
  // default values for bellow attributes are different.
  grantCsvExport: false,
  grantLanEdit: false,
  grantMassFirmwareUpgrade: false,
  grantMeasureDevices: 0,
  grantShowRowsPerPage: false,
  grantShowSearchSummary: false,
  grantSiteSurvey: false,
  grantWanAdvancedInfo: 0,
}, {
  // eslint-disable-next-line new-cap
  _id: ObjectID(),
  name: 'better tester',
}, {
  // eslint-disable-next-line new-cap
  _id: ObjectID(),
  name: 'much better tester',
}];

// mocked Config to be used in all tests.
const configMock = {
  is_default: true,
  tr069: undefined,
  certification: undefined,
  measureServerIP: true,
  measureServerPort: true,
  device_update_schedule: {
    rule: {
      to_do_devices: [],
      in_progress_devices: [],
      done_devices: [],
      release: 'release1',
    },
    is_active: true,
    is_aborted: false,
    device_count: 1,
    allowed_time_ranges: [],
    used_time_range: false,
    used_csv: false,
    used_search: 'AB:AB:AB:AB:AB:AA',
    date: new Date('2023-01-31T04:25:23.393Z'),
  },
  vlans_profiles: [{
    vlan_id: 100,
    profile_name: 'vlanName1',
  }, {
    vlan_id: 200,
    profile_name: 'vlanName2',
  }],
};

// mocking FlashAudit node client.
const sendMock = jest.spyOn(FlashAudit.FlashAudit.prototype, 'send');
// mocking promisified timeout functions.
const waitPromises = {
  exponential: () => Promise.resolve(undefined),
  short: () => Promise.resolve(undefined),
};


// Mocking dependencies.

// mocking MQTTS.
jest.mock('../../mqtts', () => {
  let map = {};
  for (let d of cpesMock) map[d._id] = {[d._id]: true};
  return {
    __esModule: false,
    unifiedClientsMap: map,
    anlixMessageRouterUpdate: () => undefined,
    anlixMessageRouterWpsButton: () => undefined,
    anlixMessageRouterUpStatus: () => undefined,
    anlixMessageRouterOnlineLanDevs: () => undefined,
    anlixMessageRouterReboot: () => undefined,
    anlixMessageRouterLog: () => undefined,
    anlixMessageRouterResetApp: () => undefined,
    anlixMessageRouterSiteSurvey: () => undefined,
    anlixMessageRouterSpeedTestRaw: () => undefined,
    anlixMessageRouterSpeedTest: () => undefined,
    anlixMessageRouterPingTest: () => undefined,
    anlixMessageRouterTraceroute: () => undefined,
  };
});

// mocking socket io.
jest.mock('../../sio', () => {
  const originalModule = jest.requireActual('../../sio');
  return {
    __esModule: true,
    ...originalModule,
    anlixConnections: {'sessionID': true},
  };
});

jest.mock('../../controllers/language', () => ({
  __esModule: true,
  i18next: {
    t: (text) => text,
  },
}));

jest.mock('../../controllers/external-genieacs/tasks-api', () => ({
  __esModule: true,
  // deleteCacheAndFaultsForDevice: () => undefined,
  // deleteGetParamTasks: () => undefined,
  // request: () => undefined,
  // getFromCollection: () => undefined,
  // putProvision: () => undefined,
  // deletePreset: () => undefined,
  // addOrDeleteObject: () => true,
  addTask: () => ({success: true}),
}));

jest.mock('../../controllers/handlers/acs/firmware', () => ({
  upgradeFirmware: () => ({success: true}),
}));

jest.mock('../../controllers/handlers/acs/diagnostics', () => ({
  firePingDiagnose: () => ({success: true}),
  fireSpeedDiagnose: () => ({success: true}),
  fireSiteSurveyDiagnose: () => ({success: true}),
  fireTraceDiagnose: () => ({success: true}),
}));

jest.mock('../../controllers/handlers/acs/port_forward', () => {
  const originalModule =
    jest.requireActual('../../controllers/handlers/acs/port_forward');
  return {
    __esModule: true,
    ...originalModule,
    changePortForwardRules: () => undefined,
  };
});

jest.mock('../../controllers/handlers/acs/mesh', () => ({
  getMeshBSSIDFromGenie: () => ({success: true}),
}));

jest.mock('../../controllers/handlers/devices', () => {
  const originalModule =
    jest.requireActual('../../controllers/handlers/devices');
  return {
    __esModule: true,
    ...originalModule,
    timeoutUpdateAck: () => undefined,
  };
});

jest.mock('../../controllers/handlers/mesh', () => {
  const originalModule = jest.requireActual('../../controllers/handlers/mesh');
  return {
    __esModule: true,
    ...originalModule,
    updateMeshDevice: () => undefined,
  };
});

jest.mock('../../controllers/messaging', () => ({
  sendUpdateMessage: () => undefined,
}));

jest.mock('../../controllers/external-api/control', () => ({
  changeLicenseStatus: () => ({success: true}),
  meshLicenseCredit: () => ({success: true}),
}));

jest.mock('../../controllers/acs_device_info', () => ({
  requestSync: () => undefined,
  requestLogs: () => undefined,
  rebootDevice: () => undefined,
  requestConnectedDevices: () => undefined,
  requestUpStatus: () => undefined,
  requestStatistics: () => undefined,
  requestPonData: () => undefined,
  configTR069VirtualAP: () => ({success: true}),
  updateInfo: () => undefined,
  changeAcRules: () => ({success: true}),
}));

jest.mock('../../controllers/external-genieacs/tasks-api', () => ({
  deleteDeviceFromGenie: async () => true,
}));

// Modules to be tested.
const deviceListController = require('../../controllers/device_list');
const userController = require('../../controllers/user');
const updateScheduler = require('../../controllers/update_scheduler');
const technicianAppController = require('../../controllers/app_diagnostic_api');
const updateSchedulerCommon =
  require('../../controllers/update_scheduler_common');
const vlanController = require('../../controllers/vlan');

// eslint-disable-next-line no-multiple-empty-lines
let db = {
  collection: () => {
    return {
      deleteMany: async () => {
        return;
      },
      updateMany: async () => {
        return;
      },
      insertOne: async () => {
        return {
          acknowledged: true,
          insertedId: ObjectID(),
        };
      },
      updateOne: async () => {
        return {
          acknowledged: true,
          modifiedCount: 1,
          upsertedId: null,
          upsertedCount: 0,
          matchedCount: 1,
        };
      },
      deleteOne: async () => {
        return {
          acknowledged: true,
          deletedCount: 1,
        };
      },
      findOneAndUpdate: async () => {
        return {value: {
          _id: ObjectID(),
          s: false,
          d: new Date(),
          p: 0,
          m: {
            a: 10,
            b: 'abc',
          },
        }};
      },
    };
  },
};

describe('Controllers - Audit', () => {
  let connection;
  let mockExpressResponse;

  let auditMessageFunctions =
    ['cpe', 'cpes', 'user', 'users', 'role', 'roles'];

  beforeAll(async () => {
    /*connection = await MongoClient.connect(global.__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = await connection.db();*/

    mockExpressResponse = (responseFinished) => {
      const res = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn(() => {
        responseFinished && responseFinished();
        return res;
      });
      return res;
    };

    mockingoose(ConfigModel).toReturn(configMock, 'findOne');

    const mockFindBySerialOrId = (query) =>
      cpesMock.filter((device) => {
        const q = query.getQuery()['$or'][0]._id;
        if (q['$regex']) return q['$regex'].test(device._id);
        else if (q['$in']) return q['$in'].some((rg) => rg.test(device._id));
        else {
          console.log(`mockingoose 'mockFindBySerialOrId' received an `+
            `unknown query format:`,
            JSON.stringify(query.getQuery(), null, '  '));
          return [];
        }
      });
    mockingoose(DeviceModel).toReturn(mockFindBySerialOrId, 'find');

    const mockFindOne = (array) =>
      (query) => array.find((doc) => {
        const q = query.getQuery();
        const attributes = Object.keys(q);
        for (let attr of attributes) {
          if (q[attr] === doc[attr]) return true;
        }
        return false;
      });
    mockingoose(DeviceModel).toReturn(mockFindOne(cpesMock), 'findOne');
    mockingoose(UserModel).toReturn(mockFindOne(usersMock), 'findOne');
    mockingoose(RoleModel).toReturn(mockFindOne(rolesMock), 'findOne');

    const filter = (array, query) =>
      array.filter((doc) => {
        const q = query.getQuery();
        const attributes = Object.keys(q);
        for (let attr of attributes) {
          if (q[attr]['$in'].some((val) => doc[attr] === val)) return true;
        }
        return false;
      });
    const mockFind = (array) => (query) => filter(array, query);
    mockingoose(UserModel).toReturn(mockFind(usersMock), 'find');
    mockingoose(RoleModel).toReturn(mockFind(rolesMock), 'find');

    const mockCount = (array) => (query) => filter(array, query).length;
    mockingoose(UserModel).toReturn(mockCount(usersMock), 'countDocuments');

    for (const name of auditMessageFunctions) jest.spyOn(Audit, name);

    sendMock.mockResolvedValue(undefined);
    process.env.FLASHAUDIT_MEMORY_ONLY = 'true';
    await Audit.init('flashman_secret', waitPromises);
  });

  describe('Checking Audit values in Device', () => {
    describe('Creating Device', () => {
      let req;

      beforeEach(() => {
        req = {
          body: {
            content: {
              mac_address: 'AB:AB:AB:AB:AB:BB',
              release: 'some release name',
              pppoe_user: 'user name',
              pppoe_password: 'pppoe_password',
              wifi_ssid: 'some ssid',
              wifi_password: 'wifi_password',
              wifi_channel: 'auto',
              wifi_band: 'auto',
              wifi_mode: '11n',
              external_reference: {kind: utils.tt('Other'), data: 'HAHAHA'},
            },
          },
          user: {_id: '1234', role: 'tester'},
        };
      });

      test('Successfully', (done) => {
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([req.body.content.mac_address]);
            expect(message.operation).toBe('create');
            expect(message.values).toEqual({
              release: 'some release name',
              pppoe_user: 'user name',
              pppoe_password: 'pppoe_password',
              connection_type: 'pppoe',
              wifi2Ssid: 'some ssid',
              wifi2Password: 'wifi_password',
              wifi2Channel: 'auto',
              wifi2Band: 'auto',
              wifi2Mode: '11n',
              userIdKind: 'Other',
              userId: 'HAHAHA',
            });
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        deviceListController.createDeviceReg(req, utils.mockResponse());
      });

      test('Unsuccessfully', (done) => {
        req.body.content.pppoe_user = '%^&*'; // field invalid.
        const res = mockExpressResponse(() => {
          try {
            expect(res.json.mock.lastCall[0].success).toBe(false);
            expect(Audit.cpe).toHaveBeenCalledTimes(0);
            done();
          } catch (e) {
            done(e);
          }
        });
        deviceListController.createDeviceReg(req, res);
      });
    });

    describe('Delete Devices', () => {
      let req;
      let res;

      beforeEach(async () => {
        req = {
          params: {},
          body: {},
          user: {_id: '1234', role: 'tester'},
        };
        res = utils.mockResponse();
      });

      describe('No Licenses Blocked', () => {
        test('Single CPE Firmware', (done) => {
          req.params.id = cpesMock[0]._id;
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              const searchable = [];
              Audit.appendCpeIds(searchable, cpesMock[0]);
              expect(message.searchable).toEqual(searchable);
              expect(message.operation).toBe('delete');
              expect(message.values).toEqual({
                licenseBlocked: false,
                totalRemoved: 1,
              });
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.delDeviceReg(req, res);
        });

        test('Single CPE TR069', (done) => {
          req.params.id = cpesMock[3]._id;
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              const searchable = [];
              Audit.appendCpeIds(searchable, cpesMock[3]);
              expect(message.searchable).toEqual(searchable);
              expect(message.operation).toBe('delete');
              expect(message.values).toEqual({
                licenseBlocked: false,
                totalRemoved: 1,
              });
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.delDeviceReg(req, res);
        });

        test('Many CPEs', (done) => {
          req.body.ids = [cpesMock[0]._id, cpesMock[2]._id];
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              const searchable = [];
              Audit.appendCpeIds(searchable, cpesMock[0]);
              Audit.appendCpeIds(searchable, cpesMock[2]);
              expect(message.searchable).toEqual(searchable);
              expect(message.operation).toBe('delete');
              expect(message.values).toEqual({
                licenseBlocked: false,
                totalRemoved: 2,
              });
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.delDeviceReg(req, res);
        });

        test('Many CPEs one failing', (done) => {
          req.body.ids = [cpesMock[0]._id, cpesMock[1]._id];
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              const searchable = [];
              Audit.appendCpeIds(searchable, cpesMock[0]);
              expect(message.searchable).toEqual(searchable);
              expect(message.operation).toBe('delete');
              expect(message.values).toEqual({
                licenseBlocked: false,
                totalRemoved: 1,
              });
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.delDeviceReg(req, res);
        });
      });

      describe('Licenses Blocked', () => {
        test('Single CPE Firmware', (done) => {
          req.body.ids = cpesMock[0]._id;
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              const searchable = [];
              Audit.appendCpeIds(searchable, cpesMock[0]);
              expect(message.searchable).toEqual(searchable);
              expect(message.operation).toBe('delete');
              expect(message.values).toEqual({
                licenseBlocked: true,
                totalRemoved: 1,
              });
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.delDeviceAndBlockLicense(req, res);
        });

        test('Single CPE TR069', (done) => {
          req.body.ids = cpesMock[3]._id;
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              const searchable = [];
              Audit.appendCpeIds(searchable, cpesMock[3]);
              expect(message.searchable).toEqual(searchable);
              expect(message.operation).toBe('delete');
              expect(message.values).toEqual({
                licenseBlocked: true,
                totalRemoved: 1,
              });
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.delDeviceAndBlockLicense(req, res);
        });

        test('Many CPEs', (done) => {
          req.body.ids = [cpesMock[0]._id, cpesMock[2]._id];
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              const searchable = [];
              Audit.appendCpeIds(searchable, cpesMock[0]);
              Audit.appendCpeIds(searchable, cpesMock[2]);
              expect(message.searchable).toEqual(searchable);
              expect(message.operation).toBe('delete');
              expect(message.values).toEqual({
                licenseBlocked: true,
                totalRemoved: 2,
              });
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.delDeviceAndBlockLicense(req, res);
        });

        test('Many CPEs one failing', (done) => {
          req.body.ids = [cpesMock[0]._id, cpesMock[1]._id];
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              const searchable = [];
              Audit.appendCpeIds(searchable, cpesMock[0]);
              expect(message.searchable).toEqual(searchable);
              expect(message.operation).toBe('delete');
              expect(message.values).toEqual({
                licenseBlocked: true,
                totalRemoved: 1,
              });
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.delDeviceAndBlockLicense(req, res);
        });
      });
    });

    describe('Sending commands to device', () => {
      let req;
      let res;

      beforeEach(async () => {
        req = {
          params: {
            msg: '',
            id: cpesMock[0]._id,
            activate: true,
          },
          body: {
            content: {
              hosts: ['abcd.com'],
              url: 'http://abcd.com',
              webhook: {
                url: 'abcd.com',
                user: 'user',
                secret: 'secret',
              },
            },
            lanid: 'AB:AB:AB:AB:AB:AC',
            permission: 'accept',
          },
          user: {_id: '1234', role: 'tester'},
          sessionID: 'sessionID',
        };
        res = utils.mockResponse();
      });

      describe('Trace route', () => {
        beforeEach(() => {
          req.params.msg = 'traceroute';
        });

        test('Generic', (done) => {
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              expect(message.searchable).toEqual([req.params.id]);
              expect(message.operation).toBe('trigger');
              expect(message.values).toEqual({cmd: 'traceroute'});
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.sendGenericTraceRouteAPI(req, res);
        });

        test('Custom', (done) => {
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              expect(message.searchable).toEqual([req.params.id]);
              expect(message.operation).toBe('trigger');
              expect(message.values).toEqual({cmd: 'traceroute'});
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.sendCustomTraceRouteAPI(req, res);
        });
      });

      describe('Ping', () => {
        beforeEach(() => {
          req.params.msg = 'ping';
        });

        test('Generic', (done) => {
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              expect(message.searchable).toEqual([req.params.id]);
              expect(message.operation).toBe('trigger');
              expect(message.values).toEqual({cmd: 'ping'});
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.sendGenericPingAPI(req, res);
        });

        test('Custom', (done) => {
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              expect(message.searchable).toEqual([req.params.id]);
              expect(message.operation).toBe('trigger');
              expect(message.values).toEqual({cmd: 'ping'});
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.sendCustomPingAPI(req, res);
        });
      });

      describe('Speed Test', () => {
        beforeEach(() => {
          req.params.msg = 'speedtest';
        });

        test('Generic', (done) => {
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              expect(message.searchable).toEqual([req.params.id]);
              expect(message.operation).toBe('trigger');
              expect(message.values).toEqual({cmd: 'speedtest'});
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.sendGenericSpeedTestAPI(req, res);
        });

        test('Custom', (done) => {
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              expect(message.searchable).toEqual([req.params.id]);
              expect(message.operation).toBe('trigger');
              expect(message.values).toEqual({cmd: 'speedtest'});
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.sendCustomSpeedTestAPI(req, res);
        });
      });

      test('Site Survey', (done) => {
        req.params.msg = 'sitesurvey';
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([req.params.id]);
            expect(message.operation).toBe('trigger');
            expect(message.values).toEqual({cmd: 'sitesurvey'});
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        deviceListController.sendGenericSiteSurveyAPI(req, res);
      });

      test('Reset App', (done) => {
        req.params.msg = 'rstapp';
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([req.params.id]);
            expect(message.operation).toBe('trigger');
            expect(message.values).toEqual({cmd: 'resetApp'});
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        deviceListController.sendCommandMsg(req, res);
      });

      test('Reset Devices', (done) => {
        req.params.msg = 'rstdevices';
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([req.params.id]);
            expect(message.operation).toBe('trigger');
            expect(message.values).toEqual({cmd: 'resetDevices'});
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        deviceListController.sendCommandMsg(req, res);
      });

      test('Update upnp', (done) => {
        req.params.msg = 'updateupnp';
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([req.params.id]);
            expect(message.operation).toBe('edit');
            expect(message.values).toEqual({
              'lan_devices': {
                'AB:AB:AB:AB:AB:AC': {
                  upnp_permission: {old: 'none', new: 'accept'},
                },
              },
            });
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        deviceListController.sendCommandMsg(req, res);
      });

      test('Log', (done) => {
        req.params.msg = 'log';
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([req.params.id]);
            expect(message.operation).toBe('trigger');
            expect(message.values).toEqual({cmd: 'readLog'});
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        deviceListController.sendCommandMsg(req, res);
      });

      test('Reboot', (done) => {
        req.params.msg = 'boot';
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([req.params.id]);
            expect(message.operation).toBe('trigger');
            expect(message.values).toEqual({cmd: 'reboot'});
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        deviceListController.sendCommandMsg(req, res);
      });

      test('Online devices', (done) => {
        req.params.msg = 'onlinedevs';
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([req.params.id]);
            expect(message.operation).toBe('trigger');
            expect(message.values).toEqual({cmd: 'readOnlineDevices'});
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        deviceListController.sendCommandMsg(req, res);
      });

      test('Up status', (done) => {
        req.params.msg = 'upstatus';
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([req.params.id]);
            expect(message.operation).toBe('trigger');
            expect(message.values).toEqual({cmd: 'upstatus'});
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        deviceListController.sendCommandMsg(req, res);
      });

      test('WPS', (done) => {
        req.params.msg = 'wps';
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([req.params.id]);
            expect(message.operation).toBe('trigger');
            expect(message.values).toEqual({
              cmd: 'wps',
              activated: true,
            });
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        deviceListController.sendCommandMsg(req, res);
      });
    });

    describe('Port forward', () => {
      let req;

      beforeAll(() => {
        req = {
          params: {},
          body: {},
          user: {_id: '1234', role: 'tester'},
        };
      });

      describe('Firmware', () => {
        beforeAll(() => {
          req.params.id = cpesMock[0]._id;
        });

        test('Badges', () => {
          const array = [{
            mac: 'abc',
            dmz: true,
            port: [40, 50],
            router_port: [40, 50],
          }, {
            mac: 'abcd',
            dmz: false,
            port: [40, 50],
            router_port: [42, 52],
          }, {
            mac: 'abcde',
            dmz: false,
            port: [40, 50],
          }, {
            mac: 'abcdef',
            dmz: false,
            port: [],
          }];
          let ret = deviceListController.mapFirmwarePortRulesForDevices(array);
          expect(ret).toEqual({
            'abc': {
              dmz: true,
              ports: ['40', '50'],
            },
            'abcd': {
              dmz: false,
              ports: ['42:40', '52:50'],
            },
            'abcde': {
              dmz: false,
              ports: ['40', '50'],
            },
          });
        });

        test('Successful', (done) => {
          req.body.content = [{
            mac: 'ab:ab:ab:ab:ab:ac',
            dmz: false,
            port: [44, 56],
            router_port: [44, 60],
          }, {
            mac: 'ab:ab:ab:ab:ab:ae',
            dmz: true,
            port: [45, 57],
            router_port: [45, 61],
          }];
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              expect(message.searchable).toEqual([cpesMock[0]._id]);
              expect(message.operation).toBe('edit');
              expect(message.values).toEqual({
                port_forward: {
                  'ab:ab:ab:ab:ab:ac': {
                    ports: {
                      old: ['44'],
                      new: ['44', '60:56'],
                    },
                  },
                  'ab:ab:ab:ab:ab:ae': {dmz: true, ports: ['45', '61:57']},
                },
              });
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.setPortForward(req, utils.mockResponse());
        });

        test('Unsuccessful', (done) => {
          req.body.content = [{
            mac: 'ab:ab:ab:ab:ab:ac',
            dmz: false,
            port: [44, 56],
            router_port: [44],
          }];
          const res = mockExpressResponse(() => {
            try {
              expect(res.json.mock.lastCall[0].success).toBe(false);
              expect(Audit.cpe).toHaveBeenCalledTimes(0);
              done();
            } catch (e) {
              done(e);
            }
          });
          deviceListController.setPortForward(req, res);
        });
      });

      describe('TR069', () => {
        beforeAll(() => {
          req.params.id = cpesMock[3]._id;
        });

        test('Badges', () => {
          const array = [{
            ip: '192.168.0.33',
            external_port_start: 44,
            external_port_end: 44,
            internal_port_start: 44,
            internal_port_end: 44,
          }, {
            ip: '192.168.0.33',
            external_port_start: 45,
            external_port_end: 45,
            internal_port_start: 65,
            internal_port_end: 65,
          }, {
            ip: '192.168.0.34',
            external_port_start: 46,
            external_port_end: 49,
            internal_port_start: 46,
            internal_port_end: 49,
          }, {
            ip: '192.168.0.34',
            external_port_start: 50,
            external_port_end: 55,
            internal_port_start: 70,
            internal_port_end: 75,
          }];
          let ret = deviceListController.mapTr069PortRulesToIps(array);
          expect(ret).toEqual({
            '192.168.0.33': {ports: ['44', '45:65']},
            '192.168.0.34': {ports: ['46-49', '50-55:70-75']},
          });
        });

        test('Successful', (done) => {
          req.body.content = JSON.stringify([{
            ip: '192.168.0.33',
            external_port_start: 45,
            external_port_end: 45,
            internal_port_start: 45,
            internal_port_end: 45,
          }, {
            ip: '192.168.0.34',
            external_port_start: 46,
            external_port_end: 46,
            internal_port_start: 46,
            internal_port_end: 46,
          }]);
          sendMock.mockImplementationOnce((message) => {
            try {
              expect(message.user).toBe('1234');
              const searchable = [];
              Audit.appendCpeIds(searchable, cpesMock[3]);
              expect(message.searchable).toEqual(searchable);
              expect(message.operation).toBe('edit');
              expect(message.values).toEqual({
                  port_forward: {
                    '192.168.0.33': {
                      ports: {
                        old: ['44'],
                        new: ['45'],
                      },
                    },
                    '192.168.0.34': {ports: ['46']},
                    '192.168.0.32': null,
                  },
                });
              done();
            } catch (e) {
              done(e);
            }
            return Promise.resolve(undefined);
          });
          deviceListController.setPortForward(req, utils.mockResponse());
        });

        test('Unsuccessful', (done) => {
          req.body.content = JSON.stringify([{
            ip: '192.168.0.33',
            external_port_start: 45,
            external_port_end: 45,
            internal_port_start: 45,
            internal_port_end: 45,
          }, {
            ip: '192.168.0.34',
            external_port_start: 45,
            external_port_end: 45,
            internal_port_start: 45,
            internal_port_end: 45,
          }]);
          const res = mockExpressResponse(() => {
            try {
              expect(res.json.mock.lastCall[0].success).toBe(false);
              expect(Audit.cpe).toHaveBeenCalledTimes(0);
              done();
            } catch (e) {
              done(e);
            }
          });
          deviceListController.setPortForward(req, res);
        });
      });
    });

    describe('Firmware Upgrade', () => {
      let req;
      let res;

      beforeEach(async () => {
        req = {
          params: {
            id: cpesMock[0]._id,
            release: 'abcd',
          },
          body: {},
          user: {_id: '1234', role: 'tester'},
        };
        res = utils.mockResponse();
      });

      test('Do Upgrade', (done) => {
        req.body.do_update = true;
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([req.params.id]);
            expect(message.operation).toBe('trigger');
            expect(message.values).toEqual({
              cmd: 'firmware_upgrade',
              release: 'abcd',
              currentRelease: undefined,
            });
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        deviceListController.changeUpdate(req, res);
      });

      test('Cancel Upgrade', (done) => {
        req.body.do_update = false;
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([req.params.id]);
            expect(message.operation).toBe('trigger');
            expect(message.values).toEqual({
              cmd: 'firmware_upgrade',
              release: 'abcd',
              canceled: true,
            });
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        deviceListController.changeUpdate(req, res);
      });
    });

    describe('Lan Devices Block State', () => {
      let req;

      beforeAll(() => {
        req = {
          params: { },
          body: {
            id: cpesMock[0]._id,
            isblocked: true,
          },
          user: {_id: '1234', role: 'tester'},
        };
      });

      test('Block', (done) => {
        req.body.lanid = 'ab:ab:ab:ab:ab:ac';
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([req.body.id]);
            expect(message.operation).toBe('edit');
            expect(message.values).toEqual({
              'lan_devices': {
                'ab:ab:ab:ab:ab:ac': {
                  is_blocked: {
                    old: false,
                    new: true,
                  },
                },
              },
            });
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        deviceListController.setLanDeviceBlockState(req, utils.mockResponse());
      });

      test('Block Non existing device', (done) => {
        req.body.lanid = 'ab:ab:ab:ab:ab:aa';
        const res = mockExpressResponse(() => {
          try {
            expect(res.json.mock.lastCall[0].success).toBe(false);
            expect(Audit.cpe).toHaveBeenCalledTimes(0);
            done();
          } catch (e) {
            done(e);
          }
        });
        deviceListController.setLanDeviceBlockState(req, res);
      });
    });

    describe('Factory Reset', () => {
      let req;

      beforeAll(() => {
        req = {
          params: {id: cpesMock[0]._id},
          user: {_id: '1234', role: 'tester'},
        };
      });

      test('CPE', (done) => {
        jest.spyOn(deviceListController, 'downloadStockFirmware')
          .mockImplementation(() => true);

        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([req.params.id]);
            expect(message.operation).toBe('trigger');
            expect(message.values).toEqual({cmd: 'factoryReset'});
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        deviceListController.factoryResetDevice(req, utils.mockResponse());
      });
    });
  });

  describe('Checking Audit values in User and Roles', () => {
    describe('Manipulating User', () => {
      test('Create User', (done) => {
        const req = {
          body: {
            name: 'unitTest_user',
            password: '1233456',
            role: 'tester',
          },
          user: {_id: '1234'},
        };
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable.length).toBe(1);
            expect(message.searchable[0].constructor).toBe(String);
            expect(message.operation).toBe('create');
            expect(message.values).toEqual({
              name: 'unitTest_user',
              password: '******',
              role: 'tester',
            });
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        userController.postUser(req, utils.mockResponse());
      });

      test('Edit User', (done) => {
        const req = {
          params: {id: usersMock[0]._id},
          body: {
            name: 'new name',
            password: '123345678',
            passwordack: '123345678',
            is_superuser: true,
            role: 'better tester',
          },
          user: {_id: '1234', role: 'tester', is_superuser: true},
        };
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([usersMock[0]._id.toString()]);
            expect(message.operation).toBe('edit');
            expect(message.values).toEqual({
              name: {old: 'test_user', new: 'new name'},
              password: {new: '******', old: '******'},
              is_superuser: {old: false, new: true},
              role: {old: 'tester', new: 'better tester'},
            });
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        userController.editUser(req, utils.mockResponse());
      });

      test('Delete Single User', (done) => {
        const req = {
          body: {ids: [usersMock[0]._id]},
          user: {_id: '1234'},
        };
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([usersMock[0]._id.toString()]);
            expect(message.operation).toBe('delete');
            expect(message.values).toBe(undefined);
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        userController.deleteUser(req, utils.mockResponse());
      });

      test('Delete Many Users', (done) => {
        const req = {
          body: {ids: usersMock.map((u) => u._id)},
          user: {_id: '1234'},
        };
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable)
              .toEqual(usersMock.map((u) => u._id.toString()));
            expect(message.operation).toBe('delete');
            expect(message.values).toBe(undefined);
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        userController.deleteUser(req, utils.mockResponse());
      });
    });

    describe('Manipulating Role', () => {
      let req;

      beforeAll(() => {
        req = {
          body: { // an almost empty role.
            'name': 'tester',
            'grant-wifi-info': '1',
            'grant-pppoe-info': '2',
            'grant-wan-advanced-info': '0',
            'grant-pass-show': false,
            'grant-wan-type': false,
            'grant-device-id': false,
            'grant-device-actions': false,
            'grant-lan-edit': false,
            'grant-lan-devices-block': false,
            'grant-opmode-edit': false,
            'grant-log-access': false,
            'grant-device-removal': '0',
            'grant-block-license-at-removal': false,
            'grant-device-add': false,
            'grant-notification-popups': true, // only permission.
            'grant-lan-devices': '2',
            'grant-site-survey': false,
            'grant-measure-devices': '0',
            'grant-statistics': false,
            'grant-vlan': '0',
            'grant-firmware-manage': false,
            'grant-firmware-upgrade': '0',
            'grant-firmware-beta-upgrade': false,
            'grant-firmware-restricted-upgrade': false,
            'grant-monitor-manage': false,
            'grant-api-access': false,
            'grant-user-manage': false,
            'grant-diag-app-access': false,
            'grant-search-summary': false,
            'grant-rows-per-page': false,
            'grant-search-level': '2',
            'grant-csv-export': false,
            'grant-flashman-manage': false,
            'grant-certification-access': '0',
            'grant-vlan-profile-edit': false,
            'grant-factory-reset': false,
            'grant-slave-disassociate': false,
          },
          user: {_id: '1234'},
        };
      });

      test('Create Role', (done) => {
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual(['tester']);
            expect(message.operation).toBe('create');
            expect(message.values).toEqual({
              grantWifiInfo: `$t("view")`,
              grantPPPoEInfo: `$t("view&edit")`,
              grantLanDevices: `$t("view&actions")`,
              grantSearchLevel: `$t("complexSearch")`,
              grantNotificationPopups: true,
            });
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        userController.postRole(req, utils.mockResponse());
      });

      test('Edit Role', (done) => {
        req.params = {id: rolesMock[0]._id};
        req.body['grant-vlan'] = 1;
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual(['tester']);
            expect(message.operation).toBe('edit');
            expect(message.values).toEqual({
              grantVlan: {old: `$t("!view")`, new: `$t("view")`},
            });
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        userController.editRole(req, utils.mockResponse());
      });

      test('Delete Role still assigned to Users', (done) => {
        const req = {
          body: {
            names: [rolesMock[0].name],
            ids: [rolesMock[0]._id],
          },
        };
        const res = mockExpressResponse(() => {
          try {
            expect(res.json.mock.lastCall[0].success).toBe(false);
            expect(Audit.roles).toHaveBeenCalledTimes(0);
            done();
          } catch (e) {
            done(e);
          }
        });
        userController.deleteRole(req, res);
      });

      test('Delete Single Role unassigned to Users', (done) => {
        const req = {
          body: {
            names: [rolesMock[1].name],
            ids: [rolesMock[1]._id],
          },
          user: {_id: '1234'},
        };
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable).toEqual([rolesMock[1].name]);
            expect(message.operation).toBe('delete');
            expect(message.values).toBe(undefined);
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        userController.deleteRole(req, utils.mockResponse());
      });

      test('Delete Many Roles unassigned to Users', (done) => {
        const req = {
          body: {
            names: [rolesMock[1].name, rolesMock[2].name],
            ids: [rolesMock[1]._id, rolesMock[2]._id],
          },
          user: {_id: '1234'},
        };
        sendMock.mockImplementationOnce((message) => {
          try {
            expect(message.user).toBe('1234');
            expect(message.searchable)
              .toEqual([rolesMock[1].name, rolesMock[2].name]);
            expect(message.operation).toBe('delete');
            expect(message.values).toBe(undefined);
            done();
          } catch (e) {
            done(e);
          }
          return Promise.resolve(undefined);
        });
        userController.deleteRole(req, utils.mockResponse());
      });
    });
  });

  describe('Checking Audit values in update scheduler', () => {
    beforeAll(() => {
      jest.spyOn(deviceListController, 'getReleases')
      .mockImplementation(async () => [{
        id: 'release1',
        model: ['W5-1200FV1', 'F670L'],
        flashbox_version: '0.42.0',
      }]);
      mockingoose(DeviceModel).toReturn(cpesMock, 'find');
    });

    test('Start schedule', async () => {
      const req = {
        body: {
          use_search: 'lala',
          use_csv: 'false',
          use_all: 'true',
          use_time_restriction: 'false',
          time_restriction: '10',
          release: 'release1',
          filter_list: cpesMock[0]._id,
          cpes_wont_return: 'false',
          page_num: '1',
          page_count: '1',
          timeout_enable: 'false',
        },
        user: {_id: '1234', role: 'tester'},
      };

      let auditResolved;
      const auditCallPromise = new Promise((r) => auditResolved = r);
      sendMock.mockImplementationOnce((message) => {
        auditResolved(message);
        return Promise.resolve(undefined);
      });

      let responseResolved;
      const responsePromise = new Promise((r) => responseResolved = r);
      const res = {
        status: (n) => res,
        json: (json) => {
          responseResolved(json);
          return res;
        },
      };

      updateScheduler.startSchedule(req, res);
      await responsePromise;
      const message = await auditCallPromise;

      expect(message.user).toBe('1234');
      const searchable = [];
      const cpes = cpesMock.filter((cpe) => !cpe.mesh_master);
      cpes.forEach((cpe) => Audit.appendCpeIds(searchable, cpe));
      expect(message.searchable).toEqual(searchable);
      expect(message.operation).toBe('trigger');
      expect(message.values).toEqual({
        cmd: 'update_scheduler',
        searchTerms: [cpesMock[0]._id],
        started: true,
        release: 'release1',
        total: cpes.length,
        allCpes: true,
      });
    });

    test('Start schedule with time restrictions', async () => {
      const req = {
        body: {
          use_search: 'lala',
          use_csv: 'false',
          use_all: 'true',
          use_time_restriction: 'true',
          time_restriction: JSON.stringify([{
            startWeekday: 'Sunday', endWeekday: 'Monday',
            startTime: '10:00', endTime: '22:00',
          }, {
            startWeekday: 'Wednesday', endWeekday: 'Friday',
            startTime: '22:00', endTime: '06:00',
          }]),
          release: 'release1',
          filter_list: cpesMock[0]._id,
          cpes_wont_return: 'false',
          page_num: '1',
          page_count: '1',
          timeout_enable: 'false',
        },
        user: {_id: '1234', role: 'tester'},
      };

      let auditResolved;
      const auditCallPromise = new Promise((r) => auditResolved = r);
      sendMock.mockImplementationOnce((message) => {
        auditResolved(message);
        return Promise.resolve(undefined);
      });

      let responseResolved;
      const responsePromise = new Promise((r) => responseResolved = r);
      const res = {
        status: (n) => res,
        json: (json) => {
          responseResolved(json);
          return res;
        },
      };

      updateScheduler.startSchedule(req, res);
      await responsePromise;
      const message = await auditCallPromise;

      expect(message.user).toBe('1234');
      const searchable = [];
      const cpes = cpesMock.filter((cpe) => !cpe.mesh_master);
      cpes.forEach((cpe) => Audit.appendCpeIds(searchable, cpe));
      expect(message.searchable).toEqual(searchable);
      expect(message.operation).toBe('trigger');
      expect(message.values).toEqual({
        cmd: 'update_scheduler',
        searchTerms: [cpesMock[0]._id],
        started: true,
        release: 'release1',
        total: cpes.length,
        allowedTimeRanges: [{
          start_day: '$t("Sunday")', end_day: '$t("Monday")',
          start_time: '10:00', end_time: '22:00',
        }, {
          start_day: '$t("Wednesday")', end_day: '$t("Friday")',
          start_time: '22:00', end_time: '06:00',
        }],
        allCpes: true,
      });
    });

    test('Abort schedule', (done) => {
      jest.spyOn(updateSchedulerCommon, 'getConfig')
      .mockImplementationOnce(() => ({
        device_update_schedule: {
          rule: {
            // all mocked cpes will be returned but at least one should be
            // provided to allow the abort to execute.
            to_do_devices: [{
              mac: cpesMock[0]._id,
              state: 'offline',
              slave_count: 0,
              slave_updates_remaining: 0,
              mesh_current: 0,
              mesh_upgrade: 0,
            }],
            in_progress_devices: [],
            done_devices: [],
            release: 'release1',
          },
          is_aborted: false,
          timeout_enable: 'false',
        },
      }));

      const req = {
        user: {_id: '1234', role: 'tester'},
      };
      sendMock.mockImplementationOnce((message) => {
        try {
          expect(message.user).toBe('1234');
          const searchable = [];
          cpesMock.forEach((cpe) => Audit.appendCpeIds(searchable, cpe));
          expect(message.searchable).toEqual(searchable);
          expect(message.operation).toBe('trigger');
          expect(message.values).toEqual({
            cmd: 'update_scheduler',
            aborted: true,
            total: cpesMock.length,
          });
          done();
        } catch (e) {
          done(e);
        }
        return Promise.resolve(undefined);
      });
      updateScheduler.abortSchedule(req, utils.mockResponse());
    });

    test('Abort schedule when it is already inactive', (done) => {
      configMock.device_update_schedule = undefined;
      const res = mockExpressResponse(() => {
        try {
          expect(res.json.mock.lastCall[0].success).toBe(false);
          expect(Audit.cpes).toHaveBeenCalledTimes(0);
          done();
        } catch (e) {
          done(e);
        }
      });
      updateScheduler.abortSchedule({}, res);
    });
  });

  describe('Checking Audit values in technician app api', () => {
    test('Wifi configuration', (done) => {
      const req = {
        body: {
          mac: cpesMock[0]._id,
          wifi_ssid: 'some ssid',
          wifi_password: 'some password',
          wifi_ssid_5ghz: 'some ssid 5G',
          wifi_password_5ghz: 'some password 5G',
        },
        user: {_id: '1234'},
      };
      sendMock.mockImplementationOnce((message) => {
        try {
          expect(message.user).toBe('1234');
          expect(message.searchable.length).toBe(1);
          const searchable = [];
          Audit.appendCpeIds(searchable, cpesMock[0]);
          expect(message.searchable).toEqual(searchable);
          expect(message.operation).toBe('edit');
          expect(message.values).toEqual({
            wifi2Ssid: {old: 'old-wifi-test', new: 'some ssid'},
            wifi2Password: {new: 'some password'},
            wifi5Ssid: {old: 'old-wifi-test-5g', new: 'some ssid 5G'},
            wifi5Password: {new: 'some password 5G'},
          });
          done();
        } catch (e) {
          done(e);
        }
        return Promise.resolve(undefined);
      });
      technicianAppController.configureWifi(req, utils.mockResponse());
    });

    test('Mesh mode configuration', (done) => {
      const req = {
        body: {
          mac: cpesMock[0]._id,
          mesh_mode: 1,
        },
        user: {_id: '1234'},
      };
      sendMock.mockImplementationOnce((message) => {
        try {
          expect(message.user).toBe('1234');
          expect(message.searchable.length).toBe(1);
          const searchable = [];
          Audit.appendCpeIds(searchable, cpesMock[0]);
          expect(message.searchable).toEqual(searchable);
          expect(message.operation).toBe('edit');
          expect(message.values).toEqual({
            meshMode: {old: `$t("Disabled")`, new: `$t("Cable")`},
          });
          done();
        } catch (e) {
          done(e);
        }
        return Promise.resolve(undefined);
      });
      technicianAppController.configureMeshMode(req, utils.mockResponse());
    });

    test('Remove mesh slave v1', (done) => {
      const req = {
        body: {
          remove_mac: cpesMock[2]._id,
        },
        user: {_id: '1234'},
      };
      sendMock.mockImplementationOnce((message) => {
        try {
          expect(message.user).toBe('1234');
          expect(message.searchable.length).toBe(2);
          const searchable = [];
          Audit.appendCpeIds(searchable, cpesMock[1]);
          Audit.appendCpeIds(searchable, cpesMock[2]);
          expect(message.searchable).toEqual(searchable);
          expect(message.operation).toBe('trigger');
          expect(message.values).toEqual({
            cmd: 'disassociatedSlaveMesh',
            primary: cpesMock[1]._id,
            secondary: cpesMock[2]._id,
          });
          done();
        } catch (e) {
          done(e);
        }
        return Promise.resolve(undefined);
      });
      technicianAppController.removeSlaveMeshV1(req, utils.mockResponse());
    });

    test('ONU WAN configuration', (done) => {
      const req = {
        body: {
          mac: cpesMock[0]._id,
          pppoe_user: 'pppoe_user',
          pppoe_password: 'password',
          connection_type: 'dhcp',
        },
        user: {_id: '1234'},
      };
      sendMock.mockImplementationOnce((message) => {
        try {
          expect(message.user).toBe('1234');
          expect(message.searchable.length).toBe(1);
          const searchable = [];
          Audit.appendCpeIds(searchable, cpesMock[0]);
          expect(message.searchable).toEqual(searchable);
          expect(message.operation).toBe('edit');
          expect(message.values).toEqual({
            pppoe_user: {new: 'pppoe_user'},
            pppoe_password: {old: 'dummypass', new: 'password'},
            connection_type: {new: 'dhcp'},
          });
          done();
        } catch (e) {
          done(e);
        }
        return Promise.resolve(undefined);
      });
      technicianAppController.configureWanOnu(req, utils.mockResponse());
    });

    test('Associate mesh slave v2', (done) => {
      const req = {
        body: {
          master: cpesMock[1]._id,
          slave: cpesMock[0]._id,
        },
        user: {_id: '1234'},
      };
      sendMock.mockImplementationOnce((message) => {
        try {
          expect(message.user).toBe('1234');
          expect(message.searchable.length).toBe(2);
          const searchable = [];
          Audit.appendCpeIds(searchable, cpesMock[1]);
          Audit.appendCpeIds(searchable, cpesMock[0]);
          expect(message.searchable).toEqual(searchable);
          expect(message.operation).toBe('trigger');
          expect(message.values).toEqual({
            cmd: 'associatedSlaveMesh',
            primary: cpesMock[1]._id,
            secondary: cpesMock[0]._id,
          });
          done();
        } catch (e) {
          done(e);
        }
        return Promise.resolve(undefined);
      });
      technicianAppController.associateSlaveMeshV2(req, utils.mockResponse());
    });

    test('Disassociate mesh slave v2', (done) => {
      const req = {
        body: {
          master: cpesMock[1]._id,
          slave: cpesMock[2]._id,
        },
        user: {_id: '1234'},
      };
      sendMock.mockImplementationOnce((message) => {
        try {
          expect(message.user).toBe('1234');
          expect(message.searchable.length).toBe(2);
          const searchable = [];
          Audit.appendCpeIds(searchable, cpesMock[1]);
          Audit.appendCpeIds(searchable, cpesMock[2]);
          expect(message.searchable).toEqual(searchable);
          expect(message.operation).toBe('trigger');
          expect(message.values).toEqual({
            cmd: 'disassociatedSlaveMesh',
            primary: cpesMock[1]._id,
            secondary: cpesMock[2]._id,
          });
          done();
        } catch (e) {
          done(e);
        }
        return Promise.resolve(undefined);
      });
      technicianAppController.disassociateSlaveMeshV2(req,
        utils.mockResponse());
    });
  });

  describe('Checking Audit values in VLAN', () => {
    test('Adding VLAN Profile', (done) => {
      const req = {
        body: {
          id: 99,
          name: 'testVlan',
        },
        user: {_id: '1234'},
      };
      sendMock.mockImplementationOnce((message) => {
        try {
          expect(message.user).toBe('1234');
          expect(message.searchable).toEqual([String(req.body.id)]);
          expect(message.operation).toBe('create');
          expect(message.values).toEqual({
            name: req.body.name,
          });
          done();
        } catch (e) {
          done(e);
        }
        return Promise.resolve(undefined);
      });
      vlanController.addVlanProfile(req, utils.mockResponse());
    });

    test('Editing VLAN Profile', (done) => {
      const req = {
        body: {
          profilename: 'testVlan',
        },
        params: {
          vid: '100',
        },
        user: {_id: '1234'},
      };
      sendMock.mockImplementationOnce((message) => {
        try {
          expect(message.user).toBe('1234');
          expect(message.searchable).toEqual(
            [String(configMock.vlans_profiles[0].vlan_id)],
          );
          expect(message.operation).toBe('edit');
          expect(message.values).toEqual({
            name: {
              old: configMock.vlans_profiles[0].profile_name,
              new: req.body.profilename,
            },
          });
          done();
        } catch (e) {
          done(e);
        }
        return Promise.resolve(undefined);
      });
      vlanController.editVlanProfile(req, utils.mockResponse());
    });

    test('Remove VLAN Profiles', (done) => {
      const req = {
        body: {
          ids: ['100', '200'],
        },
        user: {_id: '1234'},
      };
      sendMock.mockImplementationOnce((message) => {
        try {
          expect(message.user).toBe('1234');
          expect(message.searchable).toEqual(req.body.ids);
          expect(message.operation).toBe('delete');
          expect(message.values).toEqual({
            totalRemoved: req.body.ids.length,
          });
          done();
        } catch (e) {
          done(e);
        }
        return Promise.resolve(undefined);
      });
      vlanController.removeVlanProfile(req, utils.mockResponse());
    });

    test('Edit VLAN Profiles in CPE', (done) => {
      const req = {
        body: {
          vlans: JSON.stringify([
            {port: 1, vlan_id: 100},
            {port: 2, vlan_id: 200},
            {port: 3, vlan_id: 300},
          ]),
        },
        params: {
          deviceid: cpesMock[0]._id,
        },
        user: {_id: '1234'},
      };
      sendMock.mockImplementationOnce((message) => {
        try {
          expect(message.user).toBe('1234');
          expect(message.searchable).toEqual([cpesMock[0]._id]);
          expect(message.operation).toBe('edit');
          expect(message.values).toEqual({
            vlans: {
              2: {
                vlan_id: {
                  old: cpesMock[0].vlan[1].vlan_id,
                  new: req.body.vlans[1].vlan_id,
                },
              },
              3: {
                vlan_id: req.body.vlans[2].vlan_id,
              },
              4: null,
            },
          });
          done();
        } catch (e) {
          done(e);
        }
        return Promise.resolve(undefined);
      });
      vlanController.updateVlans(req, utils.mockResponse());
    });
  });

  describe('Try later logic', () => {
    const m = {a: 10, b: 'abc'}; // mocked message.

    test('ExponentialTime', async () => {
      const midPointUniform = () => 0.5;
      const expected = (x) => (x**2+5)*1000;
      expect(Audit.exponentialTime(0, midPointUniform)).toBe(0);
      expect(Audit.exponentialTime(1, midPointUniform)).toBe(expected(1));
      expect(Audit.exponentialTime(2, midPointUniform)).toBe(expected(2));
      expect(Audit.exponentialTime(45, midPointUniform)).toBe(expected(45));
      expect(Audit.exponentialTime(46, midPointUniform)).toBe(expected(45));
    });

    describe('Without persistence', () => {
      afterAll(() => {
        process.env.FLASHAUDIT_MEMORY_ONLY = '';
      });

      test('Good connectivity', async () => {
        sendMock.mockResolvedValue(undefined);

        await Audit.sendWithoutPersistence(m, waitPromises);
        expect(sendMock).toHaveBeenCalledTimes(1);
        expect(Audit.getServerAvailability()).toBe(true);
      });

      test('No connectivity', async () => {
        const original = Audit.tryLaterWithoutPersistence;
        let tryLaterFunc = jest.spyOn(Audit, 'tryLaterWithoutPersistence')
          .mockImplementationOnce(() => undefined)
          .mockImplementationOnce(original)
          .mockImplementationOnce(() => undefined);
        sendMock.mockResolvedValue(new Error('forced a mocked error.'));

        // first attempt to 'send' after losing connectivity will try to send.
        await Audit.sendWithoutPersistence(m, waitPromises);
        expect(Audit.getServerAvailability()).toBe(false);
        // another 'send' will not actually send.
        await Audit.sendWithoutPersistence(m, waitPromises);
        expect(tryLaterFunc).toHaveBeenCalledTimes(1);
        expect(sendMock).toHaveBeenCalledTimes(1);

        // only try later can attempt to 'send' after connectivity was lost.
        // it will send once per stored message.
        await Audit.tryLaterWithoutPersistence(waitPromises);
        expect(Audit.getServerAvailability()).toBe(false);
        expect(sendMock).toHaveBeenCalledTimes(2);
        // 'tryLaterWithoutPersistence' will be recalled from inside it self but
        // the 3rd call is a mock.
        expect(tryLaterFunc).toHaveBeenCalledTimes(3);

        // Regaining connectivity.
        sendMock.mockResolvedValue(undefined);

        // replicating the recall of 'tryLaterWithoutPersistence'
        tryLaterFunc.mockClear();
        await Audit.tryLaterWithoutPersistence(waitPromises);
        expect(Audit.getServerAvailability()).toBe(true);
        // expecting to all accumulated messages to be sent.
        expect(sendMock).toHaveBeenCalledTimes(4);
        expect(tryLaterFunc).toHaveBeenCalledTimes(1); // no more recalls.
      });
    });
  });
/*
    describe('With persistence', () => {
      beforeAll(async () => {
        await Audit.init('flashman_secret', waitPromises, db);
      });

      beforeEach(async () => {
        await db.collection('audits').deleteMany({});
      });

      test('Good connectivity', async () => {
        sendMock.mockResolvedValue(undefined);

        await Audit.sendWithPersistence(m, waitPromises);
        expect(sendMock).toHaveBeenCalledTimes(1);
        expect(Audit.getServerAvailability()).toBe(true);
      });

      test('No connectivity', async () => {
        const original = Audit.tryLaterWithPersistence;
        let tryLaterFunc = jest.spyOn(Audit, 'tryLaterWithPersistence')
          .mockImplementationOnce(() => undefined)
          .mockImplementationOnce(original)
          .mockImplementationOnce(() => undefined);
        sendMock.mockResolvedValue(new Error('forced a mocked error.'));

        // first attempt to send after losing connectivity will try to send.
        await Audit.sendWithPersistence(m, waitPromises);
        expect(Audit.getServerAvailability()).toBe(false);
        // another send will not actually send.
        await Audit.sendWithPersistence(m, waitPromises);
        expect(tryLaterFunc).toHaveBeenCalledTimes(1);
        expect(sendMock).toHaveBeenCalledTimes(1);

        // only try later can attempt to 'send' after connectivity was lost.
        // it will send once per stored message.
        await Audit.tryLaterWithPersistence(waitPromises);
        expect(Audit.getServerAvailability()).toBe(false);
        expect(sendMock).toHaveBeenCalledTimes(2);
        // 'tryLaterWithPersistence' will be recalled from inside it self but
        // the 3rd call is a mock.
        expect(tryLaterFunc).toHaveBeenCalledTimes(3);

        // Regaining connectivity.
        sendMock.mockResolvedValue(undefined);

        // replicating the recall of 'tryLaterWithPersistence'
        tryLaterFunc.mockClear();
        await Audit.tryLaterWithPersistence(waitPromises);
        expect(Audit.getServerAvailability()).toBe(true);
        // expecting to all accumulated messages to be sent.
        expect(sendMock).toHaveBeenCalledTimes(4);
        expect(tryLaterFunc).toHaveBeenCalledTimes(1); // no more recalls.
      });
    });
  });

  describe('Creating Audit Message', () => {
    test('CPE', async () => {
      const operation = 'create';
      const values = {cmd: 'abc'};
      db.collection().findOneAndUpdate = async () => {
        return {
          _id: ObjectID(),
          s: false,
          d: new Date(),
          p: 0,
          m: {
            client: 'test_client',
            product: 'flashman',
            user: '640a3eda47ca01dda68ee10b',
            date: 1678393051650,
            version: 1,
            object: 'cpe',
            searchable: ['AB:AB:AB:AB:AB:AA'],
            operation: 'create',
            values: {
              cmd: 'abc',
            },
          },
        };
      };

      await Audit.cpe(usersMock[0], cpesMock[0], operation, values);
      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.lastCall[0].object).toBe('cpe');
      expect(sendMock.mock.lastCall[0].user).toBe(usersMock[0]._id.toString());
      expect(sendMock.mock.lastCall[0].searchable.length).toBe(1);
      expect(sendMock.mock.lastCall[0].searchable[0])
        .toBe(cpesMock[0]._id.toString());
      expect(sendMock.mock.lastCall[0].operation).toBe(operation);
      expect(sendMock.mock.lastCall[0].values).toEqual(values);
    });

    test('CPEs', async () => {
      const cpes = [{
        _id: 'AA:AA:AA:AA:AA:AA',
      }, {
        _id: 'AA:AA:AA:AA:AA:AB',
        use_tr069: true,
        serial_tr069: 'serial',
        alt_uid_tr069: 'alt_uid',
      }, {
        _id: 'AA:AA:AA:AA:AA:AC',
        use_tr069: true,
        serial_tr069: 'serial',
      }];
      const operation = 'trigger';
      const values = {cmd: 'abc'};

      await Audit.cpes(usersMock[0], cpes, operation, values);
      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.lastCall[0].object).toBe('cpe');
      expect(sendMock.mock.lastCall[0].user).toBe(usersMock[0]._id.toString());
      expect(sendMock.mock.lastCall[0].searchable.length)
        .toBe(cpes.length + cpes.filter((c) => c.use_tr069).length);
      expect(sendMock.mock.lastCall[0].searchable).toEqual([
        'AA:AA:AA:AA:AA:AA',
        'AA:AA:AA:AA:AA:AB',
        'alt_uid',
        'AA:AA:AA:AA:AA:AC',
        'serial',
      ]);
      expect(sendMock.mock.lastCall[0].operation).toBe(operation);
      expect(sendMock.mock.lastCall[0].values).toEqual(values);
    });

    test('User', async () => {
      const operation = 'create';
      const values = {cmd: 'abc'};

      await Audit.user(usersMock[0], usersMock[1], operation, values);
      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.lastCall[0].object).toBe('user');
      expect(sendMock.mock.lastCall[0].user).toBe(usersMock[0]._id.toString());
      expect(sendMock.mock.lastCall[0].searchable.length).toBe(1);
      expect(sendMock.mock.lastCall[0].searchable[0])
        .toBe(usersMock[1]._id.toString());
      expect(sendMock.mock.lastCall[0].operation).toBe(operation);
      expect(sendMock.mock.lastCall[0].values).toEqual(values);
    });

    test('Users', async () => {
      const operation = 'trigger';
      const values = {cmd: 'abc'};

      await Audit.users(usersMock[0], usersMock, operation, values);
      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.lastCall[0].object).toBe('user');
      expect(sendMock.mock.lastCall[0].user).toBe(usersMock[0]._id.toString());
      expect(sendMock.mock.lastCall[0].searchable.length)
        .toBe(usersMock.length);
      expect(sendMock.mock.lastCall[0].searchable)
        .toEqual(usersMock.map((u) => u._id.toString()));
      expect(sendMock.mock.lastCall[0].operation).toBe(operation);
      expect(sendMock.mock.lastCall[0].values).toEqual(values);
    });

    test('Role', async () => {
      const operation = 'create';
      const values = {cmd: 'abc'};

      await Audit.role(usersMock[0], rolesMock[0], operation, values);
      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.lastCall[0].object).toBe('role');
      expect(sendMock.mock.lastCall[0].user).toBe(usersMock[0]._id.toString());
      expect(sendMock.mock.lastCall[0].searchable.length).toBe(1);
      expect(sendMock.mock.lastCall[0].searchable[0]).toBe(rolesMock[0].name);
      expect(sendMock.mock.lastCall[0].operation).toBe(operation);
      expect(sendMock.mock.lastCall[0].values).toEqual(values);
    });

    test('Roles', async () => {
      const operation = 'trigger';
      const values = {cmd: 'abc'};

      await Audit.roles(usersMock[0], rolesMock, operation, values);
      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.lastCall[0].object).toBe('role');
      expect(sendMock.mock.lastCall[0].user).toBe(usersMock[0]._id.toString());
      expect(sendMock.mock.lastCall[0].searchable.length)
        .toBe(rolesMock.length);
      expect(sendMock.mock.lastCall[0].searchable)
        .toEqual(rolesMock.map((r) => r.name));
      expect(sendMock.mock.lastCall[0].operation).toBe(operation);
      expect(sendMock.mock.lastCall[0].values).toEqual(values);
    });
  });*/
});
