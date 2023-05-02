require('../../bin/globals');

const utils = require('../common/utils');
const models = require('../common/models');

const DevicesAPI = require('../../controllers/external-genieacs/devices-api');
const DeviceVersion = require('../../models/device_version');
const ACSDeviceInfo = require('../../controllers/acs_device_info');
const TasksAPI = require('../../controllers/external-genieacs/tasks-api');
const utilHandlers = require('../../controllers/handlers/util');

const path = '../assets/flashman-test/multi-wan/';

// Huaewi EG8145V5
const eg8145v5 = require(path + 'huawei-eg8145v5/wanData.json');
const eg8WanKeys = require(path + 'huawei-eg8145v5/wanKeys.js');
const eg8WanList = require(path + 'huawei-eg8145v5/wanList.js');

// TP Link HX220
const hx220 = require(path + 'tplink-hx220/wanData.json');
const hxWanKeys = require(path + 'tplink-hx220/wanKeys.js');
const hxWanList = require(path + 'tplink-hx220/wanList.js');

// Tenda HG9
const hg9 = require(path + 'tenda-hg9/wanData.json');
const hg9WanKeys = require(path + 'tenda-hg9/wanKeys.js');
const hg9WanList = require(path + 'tenda-hg9/wanList.js');

// Choose WAN
const case1TR098 = require(path + 'choose-wan/case1-TR098.js');
const case1TR181 = require(path + 'choose-wan/case1-TR181.js');
const case2TR098 = require(path + 'choose-wan/case2-TR098.js');
const case2TR181 = require(path + 'choose-wan/case2-TR181.js');
const case3TR098 = require(path + 'choose-wan/case3-TR098.js');
const case3TR181 = require(path + 'choose-wan/case3-TR181.js');
const case4TR098 = require(path + 'choose-wan/case4-TR098.js');
const case4TR181 = require(path + 'choose-wan/case4-TR181.js');
const case5TR098 = require(path + 'choose-wan/case5-TR098.js');
const case5TR181 = require(path + 'choose-wan/case5-TR181.js');
const case6TR098 = require(path + 'choose-wan/case6-TR098.js');
const case6TR181 = require(path + 'choose-wan/case6-TR181.js');

const cb = (err, res) => {
  return res;
};

describe('Multi WAN Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('Devices API', () => {
    describe('verifyIndexesMatch Tests', () => {
      test('Exact match', () => {
        expect(DevicesAPI.verifyIndexesMatch(['1', '2', '3'], [1, 2, 3]))
          .toStrictEqual(true);
      });

      test('Subtree match', () => {
        expect(DevicesAPI.verifyIndexesMatch(['1', '2', '3'], [1, 2]))
          .toStrictEqual(true);
      });

      test('Indexes variable should never be greater then keyIndexes', () => {
        expect(DevicesAPI.verifyIndexesMatch(['1'], [1, 2]))
          .toStrictEqual(false);
      });
    });

    describe('wanKeyCreation Tests', () => {
      test('wanKeyCriation for TR-098', () => {
        let isTR181 = false;
        let data = utilHandlers.convertWanToProvisionFormat(eg8145v5);
        let wanKeyCriation = DevicesAPI.wanKeyCriation(data, isTR181);
        expect(wanKeyCriation).toStrictEqual(eg8WanKeys);
      });

      test('wanKeyCriation for TR-098', () => {
        let isTR181 = false;
        let data = utilHandlers.convertWanToProvisionFormat(hg9);
        let wanKeyCriation = DevicesAPI.wanKeyCriation(data, isTR181);
        expect(wanKeyCriation).toStrictEqual(hg9WanKeys);
      });

      test('wanKeyCriation for TR-181', () => {
        let isTR181 = true;
        let data = utilHandlers.convertWanToProvisionFormat(hx220);
        let wanKeyCriation = DevicesAPI.wanKeyCriation(data, isTR181);
        expect(wanKeyCriation).toStrictEqual(hxWanKeys);
      });
    });

    describe('assembleWanObj Tests', () => {
      test('assembleWanObj for TR-098 - Called from Provision', () => {
        const id = models.defaultMockDevices[0]._id;
        let device = models.copyDeviceFrom(
          id,
          {
            _id: '94:25:33:3B:D1:C2',
            acs_id: '00259E-EG8145V5-48575443A94196A5',
            model: 'EG8145V5',
            version: 'V5R020C00S280',
          },
        );
        let fields = DevicesAPI.instantiateCPEByModelFromDevice(device)
          .cpe.getModelFields();
        let permissions = DeviceVersion.devicePermissions(device);
        let isTR181 = permissions.grantIsTR181;
        let data = utilHandlers.convertWanToProvisionFormat(eg8145v5);
        let args = {
          fields: fields,
          isTR181: isTR181,
          data: data,
        };
        let result = DevicesAPI.assembleWanObj([JSON.stringify(args)], cb);
        expect(Object.keys(result)).toStrictEqual(Object.keys(eg8WanKeys));
        expect(result).toStrictEqual(eg8WanList);
      });

      test('assembleWanObj for TR-098 - Called from Provision', () => {
        const id = models.defaultMockDevices[0]._id;
        let device = models.copyDeviceFrom(
          id,
          {
            _id: 'C8:3A:35:09:08:90',
            acs_id: 'C83A35-HG9-TDTC35090890',
            model: 'HG9',
            version: 'v1.0.1',
          },
        );
        let fields = DevicesAPI.instantiateCPEByModelFromDevice(device)
          .cpe.getModelFields();
        let permissions = DeviceVersion.devicePermissions(device);
        let isTR181 = permissions.grantIsTR181;
        let data = utilHandlers.convertWanToProvisionFormat(hg9);
        let args = {
          fields: fields,
          isTR181: isTR181,
          data: data,
        };
        let result = DevicesAPI.assembleWanObj([JSON.stringify(args)], cb);
        expect(Object.keys(result)).toStrictEqual(Object.keys(hg9WanKeys));
        expect(result).toStrictEqual(hg9WanList);
      });

      test('assembleWanObj for TR-181 - Called from Provision', () => {
        const id = models.defaultMockDevices[0]._id;
        let device = models.copyDeviceFrom(
          id,
          {
            _id: 'B0A7B9-Device2-32180H5000090',
            acs_id: 'B0A7B9-Device2-32180H5000090',
            model: 'HX220',
            version: '0.12.0 2.0.0 v605f.0 Build 220710 Rel.13422n',
          },
        );
        let fields = DevicesAPI.instantiateCPEByModelFromDevice(device)
          .cpe.getModelFields();
        let permissions = DeviceVersion.devicePermissions(device);
        let isTR181 = permissions.grantIsTR181;
        let data = utilHandlers.convertWanToProvisionFormat(hx220);
        let args = {
          fields: fields,
          isTR181: isTR181,
          data: data,
        };
        let result = DevicesAPI.assembleWanObj([JSON.stringify(args)], cb);
        expect(Object.keys(result)).toStrictEqual(Object.keys(hxWanKeys));
        expect(result).toStrictEqual(hxWanList);
      });
    });
  });

  describe('Handler Utils', () => {
    describe('chooseWan Tests - Best WAN choice heuristic', () => {
      test('Case 1 TR-098: Empty obj', () => {
        let result = utilHandlers.chooseWan(case1TR098, false);
        expect(result.key).toStrictEqual('wan_ppp_1_1_1');
      });

      test('Case 1 TR-181: Empty obj', () => {
        let result = utilHandlers.chooseWan(case1TR181, true);
        expect(result.key).toStrictEqual('wan_ppp_4');
      });

      test('Case 2 TR-098: Only one WAN with ideal conditions', () => {
        let result = utilHandlers.chooseWan(case2TR098, false);
        expect(result.key).toStrictEqual('wan_dhcp_1_2_1');
      });

      test('Case 2 TR-181: Only one WAN with ideal conditions', () => {
        let result = utilHandlers.chooseWan(case2TR181, true);
        expect(result.key).toStrictEqual('wan_dhcp_2');
      });

      test('Case 3 TR-098: Multiples options but only one ppp-type with ideal' +
          'conditions', () => {
        let result = utilHandlers.chooseWan(case3TR098, false);
        expect(result.key).toStrictEqual('wan_ppp_1_1_1');
      });

      test('Case 3 TR-181: Multiples options but only one ppp-type with ideal' +
          'conditions', () => {
        let result = utilHandlers.chooseWan(case3TR181, true);
        expect(result.key).toStrictEqual('wan_ppp_3');
      });

      test('Case 4 TR-098: Multiple ppp-type with ideal conditions', () => {
        // The first ppp-type WAN with ideal conditions should be chosen
        let result = utilHandlers.chooseWan(case4TR098, false);
        expect(result.key).toStrictEqual('wan_ppp_1_3_1');
      });

      test('Case 4 TR-181: Multiple ppp-type with ideal conditions', () => {
        // The last ppp-type WAN with ideal conditions should be chosen
        let result = utilHandlers.chooseWan(case4TR181, true);
        expect(result.key).toStrictEqual('wan_ppp_4');
      });

      test('Case 5 TR-098: Multiple dhcp-type with ideal conditions', () => {
        // The first dhcp-type WAN with ideal conditions should be chosen
        let result = utilHandlers.chooseWan(case5TR098, false);
        expect(result.key).toStrictEqual('wan_dhcp_1_2_1');
      });

      test('Case 5 TR-181: Multiple dhcp-type with ideal conditions', () => {
        // The last dhcp-type WAN with ideal conditions should be chosen
        let result = utilHandlers.chooseWan(case5TR181, true);
        expect(result.key).toStrictEqual('wan_dhcp_5');
      });

      test('Case 6 TR-098: No WANs with ideal conditions', () => {
        // The first WAN with partial conditions should be chosen
        let result = utilHandlers.chooseWan(case6TR098, false);
        expect(result.key).toStrictEqual('wan_ppp_1_1_1');
      });

      test('Case 6 TR-181: No WANs with ideal conditions', () => {
        // The last WAN with partial conditions should be chosen
        let result = utilHandlers.chooseWan(case6TR181, true);
        expect(result.key).toStrictEqual('wan_ppp_4');
      });
    });
  });

  describe('ACS Device Info', () => {
    describe('replaceWanFieldsWildcards Tests', () => {
      test('Happy Case - TR-098', async () => {
        const id = models.defaultMockDevices[0]._id;
        let device = models.copyDeviceFrom(
          id,
          {
            _id: '94:25:33:3B:D1:C2',
            acs_id: '00259E-EG8145V5-48575443A94196A5',
            model: 'EG8145V5',
            version: 'V5R020C00S280',
          },
        );
        let deviceFields = DevicesAPI.instantiateCPEByModelFromDevice(device)
          .cpe.getModelFields();

        // Correct WAN is InternetGatewayDevice.WANDevice.1.
        //   WANConnectionDevice.1.WANPPPConnection.1
        let expectedFieldName =
          deviceFields['wan']['mtu_ppp'].replace(/\*/g, '1');

        let changes = {
          wan: {mtu_ppp: 1487},
          lan: {},
          wifi2: {ssid: 'Anlix-Teste'},
          wifi5: {},
          mesh2: {},
          mesh5: {},
        };

        let task = {
          name: 'setParameterValues',
          parameterValues: [
            [
              deviceFields['wan']['mtu_ppp'],
              changes.wan.mtu_ppp,
              'xsd:unsignedInt',
            ],
            [
              deviceFields['wifi2']['ssid'],
              changes.wifi2.ssid,
              'xsd:string',
            ],
          ],
        };

        // It is expected that the function will change only the fields of the
        // task referring to the WAN
        let expectedTask = {
          name: 'setParameterValues',
          parameterValues: [
            [
              expectedFieldName,
              changes.wan.mtu_ppp,
              'xsd:unsignedInt',
            ],
            [
              deviceFields['wifi2']['ssid'],
              changes.wifi2.ssid,
              'xsd:string',
            ],
          ],
        };

        // Spies
        jest.spyOn(TasksAPI, 'getFromCollection')
          .mockImplementation(() => JSON.parse(
            '[' + JSON.stringify(eg8145v5) + ']'),
          );

        // Execute function
        let ret = await ACSDeviceInfo.__testReplaceWanFieldsWildcards(
          id, false, false, deviceFields, changes, task,
        );

        expect(ret).toStrictEqual({'success': true, 'task': expectedTask});
      });

      test('Happy Case - TR-181', async () => {
        const id = models.defaultMockDevices[0]._id;
        let device = models.copyDeviceFrom(
          id,
          {
            _id: 'B0A7B9-Device2-32180H5000090',
            acs_id: 'B0A7B9-Device2-32180H5000090',
            model: 'HX220',
            version: '0.12.0 2.0.0 v605f.0 Build 220710 Rel.13422n',
          },
        );
        let deviceFields = DevicesAPI.instantiateCPEByModelFromDevice(device)
          .cpe.getModelFields();

        // Correct WAN is Device.IP.Interface.14
        let expectedFieldName =
          deviceFields['wan']['mtu_ppp'].replace(/\*/g, '14');

        let changes = {
          wan: {mtu_ppp: 1487},
          lan: {},
          wifi2: {ssid: 'Anlix-Teste'},
          wifi5: {},
          mesh2: {},
          mesh5: {},
        };

        let task = {
          name: 'setParameterValues',
          parameterValues: [
            [
              deviceFields['wan']['mtu_ppp'],
              changes.wan.mtu_ppp,
              'xsd:unsignedInt',
            ],
            [
              deviceFields['wifi2']['ssid'],
              changes.wifi2.ssid,
              'xsd:string',
            ],
          ],
        };

        // It is expected that the function will change only the fields of the
        // task referring to the WAN
        let expectedTask = {
          name: 'setParameterValues',
          parameterValues: [
            [
              expectedFieldName,
              changes.wan.mtu_ppp,
              'xsd:unsignedInt',
            ],
            [
              deviceFields['wifi2']['ssid'],
              changes.wifi2.ssid,
              'xsd:string',
            ],
          ],
        };

        // Spies
        jest.spyOn(TasksAPI, 'getFromCollection')
          .mockImplementation(() => JSON.parse(
            '[' + JSON.stringify(hx220) + ']'),
          );

        // Execute function
        let ret = await ACSDeviceInfo.__testReplaceWanFieldsWildcards(
          id, true, true, deviceFields, changes, task,
        );

        expect(ret).toStrictEqual({'success': true, 'task': expectedTask});
      });

      test('Unable to replace wildcards', async () => {
        const id = models.defaultMockDevices[0]._id;
        let device = models.copyDeviceFrom(
          id,
          {
            _id: '94:25:33:3B:D1:C2',
            acs_id: '00259E-EG8145V5-48575443A94196A5',
            model: 'EG8145V5',
            version: 'V5R020C00S280',
          },
        );
        let deviceFields = DevicesAPI.instantiateCPEByModelFromDevice(device)
          .cpe.getModelFields();

        let changes = {
          wan: {mtu_ppp: 1487},
          lan: {},
          wifi2: {ssid: 'Anlix-Teste'},
          wifi5: {},
          mesh2: {},
          mesh5: {},
        };

        let task = {}; // Empty task - It doesn't matter

        // Spies
        jest.spyOn(TasksAPI, 'getFromCollection')
          .mockImplementation(() => [{_id: id}]);

        // Execute
        let ret = await ACSDeviceInfo.__testReplaceWanFieldsWildcards(
          id, false, false, deviceFields, changes, task,
        );

        // Validate
        expect(ret).toStrictEqual({'success': false, 'task': undefined});
      });
    });
  });
});
