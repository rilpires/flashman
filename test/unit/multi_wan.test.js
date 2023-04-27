require('../../bin/globals');

const utils = require('../common/utils');

const DevicesAPI = require('../../controllers/external-genieacs/devices-api');
const utilHandlers = require('../../controllers/handlers/util');

let jsonPath = '../assets/flashman-test/genie-data/wan/';
let eg8145v5 = require(jsonPath + 'huawei-eg8145v5.json');
let hx220 = require(jsonPath + 'tplink-hx220.json');

describe('Multi WAN Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('Devices API', () => {
    describe('wanKeyCreation Tests', () => {
      test('wanKeyCriation for TR-098', async () => {
        let isTR181 = false;
        let data = utilHandlers.convertToProvisionFormat(eg8145v5);
        let wanKeyCriation = DevicesAPI.wanKeyCriation(data, isTR181);
        let expected = {
          wan_ppp_1_1_1: {port_mapping: []},
          wan_dhcp_1_2_1: {port_mapping: []},
          wan_ppp_1_3_1: {port_mapping: []},
          wan_dhcp_1_4_1: {port_mapping: []},
        };
        expect(wanKeyCriation).toStrictEqual(expected);
      });

      test('wanKeyCriation for TR-181', async () => {
        let isTR181 = true;
        let data = utilHandlers.convertToProvisionFormat(hx220);
        let wanKeyCriation = DevicesAPI.wanKeyCriation(data, isTR181);
        let expected = {
          wan_dhcp_3: {port_mapping: []},
          wan_dhcp_14: {port_mapping: []},
          wan_ppp_6: {port_mapping: []},
        };
        expect(wanKeyCriation).toStrictEqual(expected);
      });
    });
  });
});
