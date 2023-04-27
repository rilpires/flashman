require('../../bin/globals');

const utils = require('../common/utils');
const models = require('../common/models');

const DevicesAPI = require('../../controllers/external-genieacs/devices-api');
const DeviceVersion = require('../../models/device_version');
const utilHandlers = require('../../controllers/handlers/util');

let path = '../assets/flashman-test/multi-wan/';
let eg8145v5 = require(path + 'huawei-eg8145v5.json');
let hx220 = require(path + 'tplink-hx220.json');
let hg9 = require(path + 'tenda-hg9.json');

const eg8WanKeys = require(path + 'eg8145v5WanKeys.js');
const hg9WanKeys = require(path + 'hg9WanKeys.js');
const hxWanKeys = require(path + 'hx220WanKeys.js');

const eg8WanList = require(path + 'eg8145v5WanList.js');
const hg9WanList = require(path + 'hg9WanList.js');
const hxWanList = require(path + 'hx220WanList.js');

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

    describe('getParentNode Tests', () => {
      test('getParentNode for TR-098 - Called from Provision', () => {
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
        let args = {
          fields: fields,
          isTR181: isTR181,
        };
        let result = DevicesAPI.getParentNode([JSON.stringify(args)], cb);
        console.log(result)
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

  // describe('Handler Utils', () => {
  //   describe('chooseWan Tests - Best WAN choice heuristic', () => {

  //   });
  // });
});
