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
      test.each([
        ['Exact match', ['1', '2', '3'], [1, 2, 3], true],
        ['Subtree match', ['1', '2', '3'], [1, 2], true],
        ['It is not a match', ['1', '2'], [1, 1], false],
        ['Indexes  must not be greater than keyIndexes', ['1'], [1, 2], false],
      ])('%s', (description, keyIndexes, indexes, expectedResult) => {
        expect(DevicesAPI.verifyIndexesMatch(keyIndexes, indexes))
          .toStrictEqual(expectedResult);
      });
    });

    describe('wanKeyCreation Tests', () => {
      test.each([
        ['TR-098', eg8145v5, eg8WanKeys],
        ['TR-098', hg9, hg9WanKeys],
        ['TR-181', hx220, hxWanKeys],
      ])('wanKeyCriation for %s', (trType, cpeData, expectedWanKeys) => {
        let isTR181 = (trType === 'TR-181');
        let data = utilHandlers.convertWanToProvisionFormat(cpeData);
        let wanKeyCriation = DevicesAPI.wanKeyCriation(data, isTR181);
        expect(Object.keys(wanKeyCriation))
          .toStrictEqual(Object.keys(expectedWanKeys));
      });
    });

    describe('assembleWanObj Tests', () => {
      const id = models.defaultMockDevices[0]._id;
      let eg8145v5Device;
      let hg9Device;
      let hx220Device;

      beforeEach(() => {
        eg8145v5Device = models.copyDeviceFrom(
          id,
          {
            _id: '94:25:33:3B:D1:C2',
            acs_id: '00259E-EG8145V5-48575443A94196A5',
            model: 'EG8145V5',
            version: 'V5R020C00S280',
          },
        );

        hg9Device = models.copyDeviceFrom(
          id,
          {
            _id: 'C8:3A:35:09:08:90',
            acs_id: 'C83A35-HG9-TDTC35090890',
            model: 'HG9',
            version: 'v1.0.1',
          },
        );

        hx220Device = models.copyDeviceFrom(
          id,
          {
            _id: 'B0A7B9-Device2-32180H5000090',
            acs_id: 'B0A7B9-Device2-32180H5000090',
            model: 'HX220',
            version: '0.12.0 2.0.0 v605f.0 Build 220710 Rel.13422n',
          },
        );
      });

      test('assembleWanObj for TR-098 - Called from Flashman', () => {
        let fields = DevicesAPI.instantiateCPEByModelFromDevice(eg8145v5Device)
          .cpe.getModelFields();
        let permissions = DeviceVersion.devicePermissions(eg8145v5Device);
        let isTR181 = permissions.grantIsTR181;
        let data = utilHandlers.convertWanToProvisionFormat(eg8145v5);
        let result = DevicesAPI.assembleWanObj(data, fields.wan, isTR181);
        expect(Object.keys(result)).toStrictEqual(Object.keys(eg8WanKeys));
        expect(result).toStrictEqual(eg8WanList);
      });

      test('assembleWanObj for TR-098 - Called from Flashman', () => {
        let fields = DevicesAPI.instantiateCPEByModelFromDevice(hg9Device)
          .cpe.getModelFields();
        let permissions = DeviceVersion.devicePermissions(hg9Device);
        let isTR181 = permissions.grantIsTR181;
        let data = utilHandlers.convertWanToProvisionFormat(hg9);
        let result = DevicesAPI.assembleWanObj(data, fields.wan, isTR181);
        expect(Object.keys(result)).toStrictEqual(Object.keys(hg9WanKeys));
        expect(result).toStrictEqual(hg9WanList);
      });

      test('assembleWanObj for TR-181 - Called from Flashman', () => {
        let fields = DevicesAPI.instantiateCPEByModelFromDevice(hx220Device)
          .cpe.getModelFields();
        let permissions = DeviceVersion.devicePermissions(hx220Device);
        let isTR181 = permissions.grantIsTR181;
        let data = utilHandlers.convertWanToProvisionFormat(hx220);
        let result = DevicesAPI.assembleWanObj(data, fields.wan, isTR181);
        expect(Object.keys(result)).toStrictEqual(Object.keys(hxWanKeys));
        expect(result).toStrictEqual(hxWanList);
      });
    });
  });

  describe('Handler Utils', () => {
    describe('chooseWan Tests - Best WAN choice heuristic', () => {
      [
        [case1TR098, 'Empty obj', 'wan_ppp_1_1_1'],
        [case2TR098, 'Only one WAN with ideal conditions', 'wan_ip_1_2_1'],
        [case3TR098, 'Multiples options, 1 ideal ppp-type', 'wan_ppp_1_1_1'],
        [case4TR098, 'Multiple ideal ppp-type', 'wan_ppp_1_3_1'],
        [case5TR098, 'Multiple options, 1 ideal dhcp-type', 'wan_ip_1_2_1'],
        [case6TR098, 'No WANs with ideal conditions', 'wan_ppp_1_1_1'],
      ].forEach((testCase, index) => {
        const [testInput, testDescription, expectedResult] = testCase;
        test(`Case ${index + 1} TR-098: ${testDescription}`, () => {
          let result = utilHandlers.chooseWan(testInput, false);
          expect(result).toStrictEqual(expectedResult);
        });
      });

      [
        [case1TR181, 'Empty obj', 'wan_ppp_4'],
        [case2TR181, 'Only one WAN with ideal conditions', 'wan_ip_2'],
        [case3TR181, 'Multiples options, 1 ideal ppp-type', 'wan_ppp_3'],
        [case4TR181, 'Multiple ideal ppp-type', 'wan_ppp_5'],
        [case5TR181, 'Multiple options, 1 ideal dhcp-type', 'wan_ip_5'],
        [case6TR181, 'No WANs with ideal conditions', 'wan_ppp_4'],
      ].forEach((testCase, index) => {
        const [testInput, testDescription, expectedResult] = testCase;
        test(`Case ${index + 1} TR-181: ${testDescription}`, () => {
          let result = utilHandlers.chooseWan(testInput, true);
          expect(result).toStrictEqual(expectedResult);
        });
      });
    });
  });
});
