require('../../bin/globals.js');
const {MongoClient} = require('mongodb');
const mockingoose = require('mockingoose');
const deviceListController = require('../../controllers/device_list');
const DeviceModel = require('../../models/device');
const ConfigModel = require('../../models/config');
const RoleModel = require('../../models/role');
const utils = require('../utils');

describe('Controllers - Device List', () => {
  let connection;

  beforeAll(async () => {
    connection = await MongoClient.connect(global.__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await connection.db();
  });

  afterAll(async () => {
    await connection.close();
  });

  /* list of functions to mock:
    DeviceModel.findByMacOrSerial
    Config.findOne
    Role.findOne
      acsDeviceInfo.configTR069VirtualAP
      deviceListController.ensureBssidCollected
      mqtt.anlixMessageRouterUpdate
      acsDeviceInfo.updateInfo
    matchedDevice.save
  */
  /*
    input:
      req.params.id - valid (mac|serial|alt_uid)
      req.body.content: - valid values
        connection_type
        pppoe_user
        pppoe_password
        wan_mtu
        wan_vlan
        ipv6_enabled
        lan_subnet
        lan_netmask
        wifi_ssid
        wifi_password
        wifi_channel
        wifi_band
        wifi_mode
        wifi_power
        wifi_state
        wifi_hidden
        wifi_ssid_5ghz
        wifi_password_5ghz
        wifi_channel_5ghz
        wifi_band_5ghz
        wifi_mode_5ghz
        wifi_power_5ghz
        wifi_state_5ghz
        wifi_hidden_5ghz
        isSsidPrefixEnabled
        bridgeEnabled
        bridgeDisableSwitch
        bridgeFixIP
        bridgeFixGateway
        bridgeFixDNS
        mesh_mode
        external_reference
        slave_custom_configs
    output:
      res.status - (500), (403), (200)
      res.json - ({success: false, message: cpeFindError, errors : []}),
        ({success: false, message: t('cpeFindError'), errors : []}),
        ({success: false, message: t('cpeNotFound'), errors : []}),
        ({success: false, message: t('configFindError'), errors : []}),
        ({success: false, message: t('connectionTypeShould...'), errors : []}),
        ({success: false, type: 'danger', message: t('errorSendingMesh...')}),
        ({success: false, type: 'danger', message:
          '[!] -> 'task error' in ${acsID}'}),
        ({success: false, type: 'danger', message:
          '[!] -> 'invalid data' in ${acsID}'}),
        ({success: false, message: t('enabledToModifyFields'), errors : []}),
        ({success: false, message: t('notEnoughPermissions...'), errors : []}),
        ({success: false, message: cpeSaveError, errors : []}),
        ({[ -- matchedDevice --]}),
        ({success: false, message: t('fieldsInvalidCheckErrors'),
          errors : {pppoe_user: ''}}),
        ({success: false, message: t('fieldNameInvalid'), errors : []})
    total test = 17 */
  test('setDeviceReg: ', async () => { expect(true).toBe(true); });
});
