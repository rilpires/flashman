process.env.FLASHAUDIT_ENABLED = 'true';

require('../../bin/globals.js');
const {MongoClient, ObjectID} = require('mongodb');
const mockingoose = require('mockingoose');
const ConfigModel = require('../../models/config');
const DeviceModel = require('../../models/device');
const UserModel = require('../../models/user');
const RoleModel = require('../../models/role');
const deviceListController = require('../../controllers/device_list');
const userController = require('../../controllers/user');
const updateScheduler = require('../../controllers/update_scheduler');
const updateSchedulerCommon =
  require('../../controllers/update_scheduler_common');
const utils = require('../utils');
const FlashAudit = require('@anlix-io/flashaudit-node-client');
const Audit = require('../../controllers/audit');


// mocked CPEs to be used in all tests.
const cpesMock = [{
  _id: 'AB:AB:AB:AB:AB:AB',
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
}, {
  _id: 'AB:AB:AB:AB:AB:BA',
  version: '0.42.0',
  model: 'W5-1200FV1',
}, {
  _id: 'AB:AB:AB:AB:AB:BB',
  version: '0.42.0',
  model: 'W5-1200FV1',
  mesh_slaves: ['AB:AB:AB:AB:AB:BC'],
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

// mocked User to be used in all tests.
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
  // personalizationHash: '',
  // isSsidPrefixEnabled: false,
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
    used_search: 'AB:AB:AB:AB:AB:AB',
    date: new Date('2023-01-31T04:25:23.393Z'),
  },
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

// eslint-disable-next-line no-multiple-empty-lines

describe('Controllers - Audit', () => {
  let connection;
  let db;
  let mockExpressResponse;

  let mockedAuditMessageFunctions =
    ['cpe', 'cpes', 'user', 'users', 'role', 'roles'];

  beforeAll(async () => {
    connection = await MongoClient.connect(global.__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = await connection.db();

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

    for (const name of mockedAuditMessageFunctions) {
      jest.spyOn(Audit, name).mockImplementation(() => undefined);
    }

    sendMock.mockResolvedValue(undefined);
    process.env.FLASHAUDIT_MEMORY_ONLY = 'true';
    await Audit.init('flashman_secret', waitPromises);
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('Checking Audit values in Device', () => {
    describe('Creating Device', () => {
      let req;

      beforeEach(() => {
        req = {
          body: {
            content: {
              mac_address: 'AB:AB:AB:AB:AB:AA',
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
          user: {_id: '123456', role: 'tester'},
        };
      });

      test('Successfully', (done) => {
        const res = mockExpressResponse(() => {
          try {
            expect(res.json.mock.lastCall[0].success).toBe(true);
            expect(Audit.cpe).toHaveBeenCalledTimes(1);
            expect(Audit.cpe.mock.lastCall[2]).toBe('create');
            expect(Audit.cpe.mock.lastCall[3]).toEqual({
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
        });
        deviceListController.createDeviceReg(req, res);
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
          user: {_id: '123456', role: 'tester'},
        };
        res = utils.mockResponse();
      });

      describe('No Licenses Blocked', () => {
        test('Single CPE Firmware', async () => {
          req.params.id = 'AB:AB:AB:AB:AB:AB';
          await deviceListController.delDeviceReg(req, res);
          expect(res.json.mock.lastCall[0].success).toBe(true);
          expect(Audit.cpes).toHaveBeenCalledTimes(1);
          expect(Audit.cpes.mock.lastCall[1].length).toBe(1);
          expect(Audit.cpes.mock.lastCall[2]).toBe('delete');
          expect(Audit.cpes.mock.lastCall[3]).toEqual({
            licenseBlocked: false,
            totalRemoved: 1,
          });
        });

        test('Single CPE TR069', async () => {
          req.params.id = 'AB:AB:AB:AB:AB:AF';
          await deviceListController.delDeviceReg(req, res);
          expect(res.json.mock.lastCall[0].success).toBe(true);
          expect(Audit.cpes).toHaveBeenCalledTimes(1);
          expect(Audit.cpes.mock.lastCall[1].length).toBeGreaterThan(1);
          expect(Audit.cpes.mock.lastCall[2]).toBe('delete');
          expect(Audit.cpes.mock.lastCall[3]).toEqual({
            licenseBlocked: false,
            totalRemoved: 1,
          });
        });

        test('Many CPEs', async () => {
          req.body.ids = ['AB:AB:AB:AB:AB:AB', 'AB:AB:AB:AB:AB:BA'];
          await deviceListController.delDeviceReg(req, res);
          expect(res.json.mock.lastCall[0].success).toBe(true);
          expect(Audit.cpes).toHaveBeenCalledTimes(1);
          expect(Audit.cpes.mock.lastCall[1].length).toBe(2);
          expect(Audit.cpes.mock.lastCall[2]).toBe('delete');
          expect(Audit.cpes.mock.lastCall[3]).toEqual({
            licenseBlocked: false,
            totalRemoved: 2,
          });
        });

        test('Many CPEs one failing', async () => {
          req.body.ids = ['AB:AB:AB:AB:AB:AB', 'AB:AB:AB:AB:AB:BB'];
          await deviceListController.delDeviceReg(req, res);
          expect(res.json.mock.lastCall[0].success).toBe(false);
          expect(Audit.cpes).toHaveBeenCalledTimes(1);
          expect(Audit.cpes.mock.lastCall[1].length).toBe(1);
          expect(Audit.cpes.mock.lastCall[2]).toBe('delete');
          expect(Audit.cpes.mock.lastCall[3]).toEqual({
            licenseBlocked: false,
            totalRemoved: 1,
          });
        });
      });

      describe('Licenses Blocked', () => {
        test('Single CPE Firmware', async () => {
          req.body.ids = 'AB:AB:AB:AB:AB:AB';
          await deviceListController.delDeviceAndBlockLicense(req, res);
          expect(res.json.mock.lastCall[0].success).toBe(true);
          expect(Audit.cpes).toHaveBeenCalledTimes(1);
          expect(Audit.cpes.mock.lastCall[1].length).toBe(1);
          expect(Audit.cpes.mock.lastCall[2]).toBe('delete');
          expect(Audit.cpes.mock.lastCall[3]).toEqual({
            licenseBlocked: true,
            totalRemoved: 1,
          });
        });

        test('Single CPE TR069', async () => {
          req.body.ids = 'AB:AB:AB:AB:AB:AF';
          await deviceListController.delDeviceAndBlockLicense(req, res);
          expect(res.json.mock.lastCall[0].success).toBe(true);
          expect(Audit.cpes).toHaveBeenCalledTimes(1);
          expect(Audit.cpes.mock.lastCall[1].length).toBeGreaterThan(1);
          expect(Audit.cpes.mock.lastCall[2]).toBe('delete');
          expect(Audit.cpes.mock.lastCall[3]).toEqual({
            licenseBlocked: true,
            totalRemoved: 1,
          });
        });

        test('Many CPEs', async () => {
          req.body.ids = ['AB:AB:AB:AB:AB:AB', 'AB:AB:AB:AB:AB:BA'];
          await deviceListController.delDeviceAndBlockLicense(req, res);
          expect(res.json.mock.lastCall[0].success).toBe(true);
          expect(Audit.cpes).toHaveBeenCalledTimes(1);
          expect(Audit.cpes.mock.lastCall[1].length).toBe(2);
          expect(Audit.cpes.mock.lastCall[2]).toBe('delete');
          expect(Audit.cpes.mock.lastCall[3]).toEqual({
            licenseBlocked: true,
            totalRemoved: 2,
          });
        });

        test('Many CPEs one failing', async () => {
          req.body.ids = ['AB:AB:AB:AB:AB:AB', 'AB:AB:AB:AB:AB:BB'];
          await deviceListController.delDeviceAndBlockLicense(req, res);
          expect(res.json.mock.lastCall[0].success).toBe(false);
          expect(Audit.cpes).toHaveBeenCalledTimes(1);
          expect(Audit.cpes.mock.lastCall[1].length).toBe(1);
          expect(Audit.cpes.mock.lastCall[2]).toBe('delete');
          expect(Audit.cpes.mock.lastCall[3]).toEqual({
            licenseBlocked: true,
            totalRemoved: 1,
          });
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
            id: 'AB:AB:AB:AB:AB:AB',
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
          user: {_id: '123456', role: 'tester'},
          sessionID: 'sessionID',
        };
        res = utils.mockResponse();
      });

      describe('Trace route', () => {
        beforeEach(() => {
          req.params.msg = 'traceroute';
        });

        test('Generic', async () => {
          await deviceListController.sendGenericTraceRouteAPI(req, res);
          expect(res.json.mock.lastCall[0].success).toBe(true);
          expect(Audit.cpe).toHaveBeenCalledTimes(1);
          expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
          expect(Audit.cpe.mock.lastCall[3]).toEqual({cmd: 'traceroute'});
        });

        test('Custom', async () => {
          await deviceListController.sendCustomTraceRouteAPI(req, res);
          expect(res.json.mock.lastCall[0].success).toBe(true);
          expect(Audit.cpe).toHaveBeenCalledTimes(1);
          expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
          expect(Audit.cpe.mock.lastCall[3]).toEqual({cmd: 'traceroute'});
        });
      });

      describe('Ping', () => {
        beforeEach(() => {
          req.params.msg = 'ping';
        });

        test('Generic', async () => {
          await deviceListController.sendGenericPingAPI(req, res);
          expect(res.json.mock.lastCall[0].success).toBe(true);
          expect(Audit.cpe).toHaveBeenCalledTimes(1);
          expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
          expect(Audit.cpe.mock.lastCall[3]).toEqual({cmd: 'ping'});
        });

        test('Custom', async () => {
          await deviceListController.sendCustomPingAPI(req, res);
          expect(res.json.mock.lastCall[0].success).toBe(true);
          expect(Audit.cpe).toHaveBeenCalledTimes(1);
          expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
          expect(Audit.cpe.mock.lastCall[3]).toEqual({cmd: 'ping'});
        });
      });

      describe('Speed Test', () => {
        beforeEach(() => {
          req.params.msg = 'speedtest';
        });

        test('Generic', async () => {
          await deviceListController.sendGenericSpeedTestAPI(req, res);
          expect(res.json.mock.lastCall[0].success).toBe(true);
          expect(Audit.cpe).toHaveBeenCalledTimes(1);
          expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
          expect(Audit.cpe.mock.lastCall[3]).toEqual({cmd: 'speedtest'});
        });

        test('Custom', async () => {
          await deviceListController.sendCustomSpeedTestAPI(req, res);
          expect(res.json.mock.lastCall[0].success).toBe(true);
          expect(Audit.cpe).toHaveBeenCalledTimes(1);
          expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
          expect(Audit.cpe.mock.lastCall[3]).toEqual({cmd: 'speedtest'});
        });
      });

      test('Site Survey', async () => {
        req.params.msg = 'sitesurvey';
        await deviceListController.sendGenericSiteSurveyAPI(req, res);
        expect(res.json.mock.lastCall[0].success).toBe(true);
        expect(Audit.cpe).toHaveBeenCalledTimes(1);
        expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
        expect(Audit.cpe.mock.lastCall[3]).toEqual({cmd: 'sitesurvey'});
      });

      test('Reset App', async () => {
        req.params.msg = 'rstapp';
        await deviceListController.sendCommandMsg(req, res);
        expect(res.json.mock.lastCall[0].success).toBe(true);
        expect(Audit.cpe).toHaveBeenCalledTimes(1);
        expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
        expect(Audit.cpe.mock.lastCall[3]).toEqual({cmd: 'resetApp'});
      });

      test('Reset Devices', async () => {
        req.params.msg = 'rstdevices';
        await deviceListController.sendCommandMsg(req, res);
        expect(res.json.mock.lastCall[0].success).toBe(true);
        expect(Audit.cpe).toHaveBeenCalledTimes(1);
        expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
        expect(Audit.cpe.mock.lastCall[3]).toEqual({cmd: 'resetDevices'});
      });

      test('Update upnp', async () => {
        req.params.msg = 'updateupnp';
        await deviceListController.sendCommandMsg(req, res);
        expect(res.json.mock.lastCall[0].success).toBe(true);
        expect(Audit.cpe).toHaveBeenCalledTimes(1);
        expect(Audit.cpe.mock.lastCall[2]).toBe('edit');
        expect(Audit.cpe.mock.lastCall[3]).toEqual({
          'lan_devices': {
            'AB:AB:AB:AB:AB:AC': {
              upnp_permission: {old: 'none', new: 'accept'},
            },
          },
        });
      });

      test('Log', async () => {
        req.params.msg = 'log';
        await deviceListController.sendCommandMsg(req, res);
        expect(Audit.cpe).toHaveBeenCalledTimes(1);
        expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
        expect(Audit.cpe.mock.lastCall[3]).toEqual({cmd: 'readLog'});
      });

      test('Reboot', async () => {
        req.params.msg = 'boot';
        await deviceListController.sendCommandMsg(req, res);
        expect(Audit.cpe).toHaveBeenCalledTimes(1);
        expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
        expect(Audit.cpe.mock.lastCall[3]).toEqual({cmd: 'reboot'});
      });

      test('Online devices', async () => {
        req.params.msg = 'onlinedevs';
        await deviceListController.sendCommandMsg(req, res);
        expect(Audit.cpe).toHaveBeenCalledTimes(1);
        expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
        expect(Audit.cpe.mock.lastCall[3]).toEqual({cmd: 'readOnlineDevices'});
      });

      test('Up status', async () => {
        req.params.msg = 'upstatus';
        await deviceListController.sendCommandMsg(req, res);
        expect(Audit.cpe).toHaveBeenCalledTimes(1);
        expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
        expect(Audit.cpe.mock.lastCall[3]).toEqual({cmd: 'upstatus'});
      });

      test('WPS', async () => {
        req.params.msg = 'wps';
        await deviceListController.sendCommandMsg(req, res);
        expect(Audit.cpe).toHaveBeenCalledTimes(1);
        expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
        expect(Audit.cpe.mock.lastCall[3]).toEqual({
          cmd: 'wps',
          activated: true,
        });
      });
    });

    describe('Port forward', () => {
      let req;

      beforeAll(() => {
        req = {
          params: {},
          body: {},
          user: {_id: '123456', role: 'tester'},
        };
      });

      describe('Firmware', () => {
        beforeAll(() => {
          req.params.id = 'AB:AB:AB:AB:AB:AB';
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
          const res = mockExpressResponse(() => {
            try {
              expect(res.json.mock.lastCall[0].success).toBe(true);
              expect(Audit.cpe).toHaveBeenCalledTimes(1);
              expect(Audit.cpe.mock.lastCall[2]).toBe('edit');
              expect(Audit.cpe.mock.lastCall[3]).toEqual({
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
          });
          deviceListController.setPortForward(req, res);
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
          req.params.id = 'AB:AB:AB:AB:AB:AF';
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
          const res = mockExpressResponse(() => {
            try {
              expect(res.json.mock.lastCall[0].success).toBe(true);
              expect(Audit.cpe).toHaveBeenCalledTimes(1);
              expect(Audit.cpe.mock.lastCall[2]).toBe('edit');
              expect(Audit.cpe.mock.lastCall[3]).toEqual({
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
          });
          deviceListController.setPortForward(req, res);
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
            id: 'AB:AB:AB:AB:AB:AB',
            release: 'abcd',
          },
          body: {},
          user: {_id: '123456', role: 'tester'},
        };
        res = utils.mockResponse();
      });

      test('Do Upgrade', async () => {
        req.body.do_update = true;
        await deviceListController.changeUpdate(req, res);
        expect(res.json.mock.lastCall[0].success).toBe(true);
        expect(Audit.cpe).toHaveBeenCalledTimes(1);
        expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
        expect(Audit.cpe.mock.lastCall[3]).toEqual({
          cmd: 'firmware_upgrade',
          release: 'abcd',
          currentRelease: undefined,
        });
      });

      test('Cancel Upgrade', async () => {
        req.body.do_update = false;
        await deviceListController.changeUpdate(req, res);
        expect(res.json.mock.lastCall[0].success).toBe(true);
        expect(Audit.cpe).toHaveBeenCalledTimes(1);
        expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
        expect(Audit.cpe.mock.lastCall[3]).toEqual({
          cmd: 'firmware_upgrade',
          release: 'abcd',
          canceled: true,
        });
      });
    });

    describe('Lan Devices Block State', () => {
      let req;

      beforeAll(() => {
        req = {
          params: { },
          body: {
            id: 'AB:AB:AB:AB:AB:AB',
            isblocked: true,
          },
          user: {_id: '123456', role: 'tester'},
        };
      });

      test('Block', (done) => {
        req.body.lanid = 'ab:ab:ab:ab:ab:ac';
        const res = mockExpressResponse(() => {
          try {
            expect(res.json.mock.lastCall[0].success).toBe(true);
            expect(Audit.cpe).toHaveBeenCalledTimes(1);
            expect(Audit.cpe.mock.lastCall[2]).toBe('edit');
            expect(Audit.cpe.mock.lastCall[3]).toEqual({
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
        });
        deviceListController.setLanDeviceBlockState(req, res);
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
          params: {id: 'AB:AB:AB:AB:AB:AB'},
          user: {_id: '123456', role: 'tester'},
        };
      });

      test('CPE', (done) => {
        jest.spyOn(deviceListController, 'downloadStockFirmware')
          .mockImplementation(() => true);
        const res = mockExpressResponse(() => {
          try {
            expect(res.json.mock.lastCall[0].success).toBe(true);
            expect(Audit.cpe).toHaveBeenCalledTimes(1);
            expect(Audit.cpe.mock.lastCall[2]).toBe('trigger');
            expect(Audit.cpe.mock.lastCall[3]).toEqual({cmd: 'factoryReset'});
            done();
          } catch (e) {
            done(e);
          }
        });
        deviceListController.factoryResetDevice(req, res);
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
        };
        const res = mockExpressResponse(() => {
          try {
            expect(res.json.mock.lastCall[0].success).toBe(true);
            expect(Audit.user).toHaveBeenCalledTimes(1);
            expect(Audit.user.mock.lastCall[2]).toBe('create');
            expect(Audit.user.mock.lastCall[3]).toEqual({
              name: 'unitTest_user',
              password: '******',
              role: 'tester',
            });
            done();
          } catch (e) {
            done(e);
          }
        });
        userController.postUser(req, res);
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
          user: {_id: 'user1', role: 'tester', is_superuser: true},
        };
        const res = mockExpressResponse(() => {
          try {
            expect(res.json.mock.lastCall[0].success).toBe(true);
            expect(Audit.user).toHaveBeenCalledTimes(1);
            expect(Audit.user.mock.lastCall[2]).toBe('edit');
            expect(Audit.user.mock.lastCall[3]).toEqual({
              name: {old: 'test_user', new: 'new name'},
              password: {new: '******', old: '******'},
              is_superuser: {old: false, new: true},
              role: {old: 'tester', new: 'better tester'},
            });
            done();
          } catch (e) {
            done(e);
          }
        });
        userController.editUser(req, res);
      });

      test('Delete Single User', (done) => {
        const req = {
          body: {ids: [usersMock[0]._id]},
        };
        const res = mockExpressResponse(() => {
          try {
            expect(res.json.mock.lastCall[0].success).toBe(true);
            expect(Audit.users).toHaveBeenCalledTimes(1);
            expect(Audit.users.mock.lastCall[1].length).toBe(1);
            expect(Audit.users.mock.lastCall[2]).toBe('delete');
            expect(Audit.users.mock.lastCall[3]).toBe(undefined);
            done();
          } catch (e) {
            done(e);
          }
        });
        userController.deleteUser(req, res);
      });

      test('Delete Many Users', (done) => {
        const req = {
          body: {ids: usersMock.map((u) => u._id)},
        };
        const res = mockExpressResponse(() => {
          try {
            expect(res.json.mock.lastCall[0].success).toBe(true);
            expect(Audit.users).toHaveBeenCalledTimes(1);
            expect(Audit.users.mock.lastCall[1].length).toBe(2);
            expect(Audit.users.mock.lastCall[2]).toBe('delete');
            expect(Audit.users.mock.lastCall[3]).toBe(undefined);
            done();
          } catch (e) {
            done(e);
          }
        });
        userController.deleteUser(req, res);
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
        };
      });

      test('Create Role', (done) => {
        const res = mockExpressResponse(() => {
          try {
            expect(res.json.mock.lastCall[0].success).toBe(true);
            expect(Audit.role).toHaveBeenCalledTimes(1);
            expect(Audit.role.mock.lastCall[2]).toBe('create');
            expect(Audit.role.mock.lastCall[3]).toEqual({
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
        });
        userController.postRole(req, res);
      });

      test('Edit Role', (done) => {
        req.params = {id: rolesMock[0]._id};
        req.body['grant-vlan'] = 1;
        const res = mockExpressResponse(() => {
          try {
            expect(res.json.mock.lastCall[0].success).toBe(true);
            expect(Audit.role).toHaveBeenCalledTimes(1);
            expect(Audit.role.mock.lastCall[2]).toBe('edit');
            expect(Audit.role.mock.lastCall[3]).toEqual({
              grantVlan: {old: `$t("!view")`, new: `$t("view")`},
            });
            done();
          } catch (e) {
            done(e);
          }
        });
        userController.editRole(req, res);
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
        };
        const res = mockExpressResponse(() => {
          try {
            expect(res.json.mock.lastCall[0].success).toBe(true);
            expect(Audit.roles).toHaveBeenCalledTimes(1);
            expect(Audit.roles.mock.lastCall[1].length).toBe(1);
            expect(Audit.roles.mock.lastCall[2]).toBe('delete');
            expect(Audit.roles.mock.lastCall[3]).toBe(undefined);
            done();
          } catch (e) {
            done(e);
          }
        });
        userController.deleteRole(req, res);
      });

      test('Delete Many Roles unassigned to Users', (done) => {
        const req = {
          body: {
            names: [rolesMock[1].name, rolesMock[2].name],
            ids: [rolesMock[1]._id, rolesMock[2]._id],
          },
        };
        const res = mockExpressResponse(() => {
          try {
            expect(res.json.mock.lastCall[0].success).toBe(true);
            expect(Audit.roles).toHaveBeenCalledTimes(1);
            expect(Audit.roles.mock.lastCall[1].length).toBe(2);
            expect(Audit.roles.mock.lastCall[2]).toBe('delete');
            expect(Audit.roles.mock.lastCall[3]).toBe(undefined);
            done();
          } catch (e) {
            done(e);
          }
        });
        userController.deleteRole(req, res);
      });
    });
  });

  describe('Checking Audit values in update scheduler', () => {
    beforeAll(() => {
      jest.spyOn(deviceListController, 'getReleases')
        .mockImplementationOnce(async () => [{
          id: 'release1',
          model: ['W5-1200FV1'],
        }]);
      mockingoose(DeviceModel).toReturn([cpesMock[0]], 'find');
    });

    test('Start schedule', (done) => {
      const req = {
        body: {
          use_search: 'lala',
          use_csv: 'false',
          use_all: 'true',
          use_time_restriction: 'false',
          time_restriction: '10',
          release: 'release1',
          filter_list: 'AB:AB:AB:AB:AB:AB',
          cpes_wont_return: 'false',
          page_num: '1',
          page_count: '1',
        },
        user: {
          role: 'tester',
        },
      };
      const res = mockExpressResponse(() => {
        try {
          expect(res.json.mock.lastCall[0].success).toBe(true);
          expect(Audit.cpes).toHaveBeenCalledTimes(1);
          expect(Audit.cpes.mock.lastCall[1].length).toBe(1);
          expect(Audit.cpes.mock.lastCall[2]).toBe('trigger');
          expect(Audit.cpes.mock.lastCall[3]).toEqual({
            cmd: 'update_scheduler',
            searchTerms: ['AB:AB:AB:AB:AB:AB'],
            started: true,
            release: 'release1',
            total: 1,
            allCpes: true,
          });
          done();
        } catch (e) {
          done(e);
        }
      });
      updateScheduler.startSchedule(req, res);
    });

    test('Abort schedule', (done) => {
      jest.spyOn(updateSchedulerCommon, 'getConfig')
      .mockImplementationOnce(() => ({
        device_update_schedule: {
          rule: {
            to_do_devices: [{
              mac: 'AB:AB:AB:AB:AB:AB',
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
        },
      }));

      const req = {};
      const res = mockExpressResponse(() => {
        try {
          expect(res.json.mock.lastCall[0].success).toBe(true);
          expect(Audit.cpes).toHaveBeenCalledTimes(1);
          expect(Audit.cpes.mock.lastCall[2]).toBe('trigger');
          expect(Audit.cpes.mock.lastCall[3]).toEqual({
            cmd: 'update_scheduler',
            aborted: true,
          });
          done();
        } catch (e) {
          done(e);
        }
      });
      updateScheduler.abortSchedule(req, res);
    });

    test('Abort schedule when it is already inactive', (done) => {
      configMock.device_update_schedule = undefined;
      const req = {};
      const res = mockExpressResponse(() => {
        try {
          expect(res.json.mock.lastCall[0].success).toBe(false);
          expect(Audit.cpes).toHaveBeenCalledTimes(0);
          done();
        } catch (e) {
          done(e);
        }
      });
      updateScheduler.abortSchedule(req, res);
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
    beforeAll(() => {
      for (const name of mockedAuditMessageFunctions) {
        Audit[name].mockRestore();
      }
    });

    afterAll(() => {
      for (const name of mockedAuditMessageFunctions) {
        jest.spyOn(Audit, name).mockImplementation(() => undefined);
      }
    });

    test('CPE', async () => {
      const operation = 'create';
      const values = {cmd: 'abc'};

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
  });
});
