const controlApi = require('./controllers/external-api/control');
const User = require('./models/user');
const Role = require('./models/role');
const Device = require('./models/device');
const DevicesAPI = require('./controllers/external-genieacs/devices-api');
const meshHandlers = require('./controllers/handlers/mesh');
const utilHandlers = require('./controllers/handlers/util');
const acsMeshDeviceHandler = require('./controllers/handlers/acs/mesh');
const Config = require('./models/config');


module.exports = (app) => {
  if (parseInt(process.env.NODE_APP_INSTANCE) === 0) {
    // Check default config
    controlApi.checkPubKey(app).then(() => {
      // Get message configs from control
      controlApi.getMessageConfig(app);
    });

    // Check administration user existence
    User.find({is_superuser: true}, function(err, matchedUsers) {
      if (err || !matchedUsers || 0 === matchedUsers.length) {
        let newSuperUser = new User({
          name: process.env.FLM_ADM_USER,
          password: process.env.FLM_ADM_PASS,
          is_superuser: true,
        });
        newSuperUser.save();
      }
    });
    // Check roles
    Role.findOne({}, function(err, role) {
      // Check default role existence
      if (err || !role) {
        let managerRole = new Role({
          name: 'Gerente',
          grantWifiInfo: 2,
          grantPPPoEInfo: 2,
          grantPassShow: true,
          grantFirmwareUpgrade: true,
          grantWanType: true,
          grantDeviceId: true,
          grantDeviceActions: true,
          grantDeviceRemoval: true,
          grantDeviceAdd: true,
          grantFirmwareManage: true,
          grantAPIAccess: false,
          grantNotificationPopups: true,
          grantLanEdit: true,
          grantLanDevices: 2,
          grantLanDevicesBlock: true,
          grantSiteSurvey: true,
          grantMeasureDevices: 2,
          grantOpmodeEdit: true,
          grantVlan: 2,
          grantVlanProfileEdit: true,
          grantWanBytesView: true,
          grantCsvExport: true,
          grantFirmwareBetaUpgrade: true,
          grantFirmwareRestrictedUpgrade: true,
        });
        managerRole.save();
      }
    });
    // Use lean to check missing fields
    Role.find({}).lean().exec(function(err, roles) {
      if (!err && roles) {
        for (let idx = 0; idx < roles.length; idx++) {
          if (typeof roles[idx].grantShowRowsPerPage == 'undefined') {
            Role.findOneAndUpdate(
              {name: roles[idx].name},
              {grantShowRowsPerPage: true}, (err) => {
                console.log('Role updated');
              });
          }
        }
      }
    });
    // Check migration for devices checked for upgrade
    // Check mesh key existence or generate it
    Device.find({$or: [
      {installed_release: {$exists: false}},
      {mesh_key: {$exists: false}},
      {bridge_mode_enabled: true, connection_type: 'pppoe'},
      {isSsidPrefixEnabled: {$exists: false}},
      {connection_type: 'dhcp', pppoe_user: {$ne: ''}},
      {$and: [{bssid_mesh2: {$exists: false}}, {use_tr069: true}]},
      {$and: [{bssid_mesh5: {$exists: false}}, {use_tr069: true}]},
      {wifi_mode: {$nin: ['11g', '11n']}},
    ]},
    {installed_release: true, do_update: true,
     do_update_status: true, release: true,
     mesh_key: true, mesh_id: true,
     bridge_mode_enabled: true, connection_type: true,
     pppoe_user: true, pppoe_password: true,
     isSsidPrefixEnabled: true, bssid_mesh2: true, wifi_mode: true,
     bssid_mesh5: true, use_tr069: true, _id: true, model: true},
    function(err, devices) {
      if (!err && devices) {
        for (let idx = 0; idx < devices.length; idx++) {
          let saveDevice = false;
          if (!devices[idx].installed_release) {
            if (devices[idx].do_update == true) {
              devices[idx].do_update_status = 0; // waiting
            } else {
              devices[idx].installed_release = devices[idx].release;
            }
            saveDevice = true;
          }
          // Check mesh key existence or generate it
          if (!devices[idx].mesh_key || !devices[idx].mesh_id) {
            devices[idx].mesh_id = meshHandlers.genMeshID();
            devices[idx].mesh_key = meshHandlers.genMeshKey();
            saveDevice = true;
          }
          // Fix bugs of bridge mode present in version 0.26.0
          // of Flashbox firmware
          if (devices[idx].bridge_mode_enabled === true &&
              devices[idx].connection_type === 'pppoe'
          ) {
            devices[idx].connection_type = 'dhcp';
            saveDevice = true;
          }
          // Remove pppoe credentials from dhcp devices
          if (devices[idx].connection_type === 'dhcp' &&
              (devices[idx].pppoe_user !== '' ||
               devices[idx].pppoe_password !== '')
          ) {
            devices[idx].pppoe_user = '';
            devices[idx].pppoe_password = '';
            saveDevice = true;
          }
          // Fix bugged wifi mode for TR-069 devices - createRegistry had 5ghz
          // flag set for both networks instead of just 5ghz
          if (!['11n', '11g'].includes(devices[idx].wifi_mode)) {
            devices[idx].wifi_mode = '11n';
            saveDevice = true;
          }
          /*
            Check isSsidPrefixEnabled existence and
            set it to default (false for old devices regs)
          */
          if (typeof devices[idx].isSsidPrefixEnabled === 'undefined') {
            devices[idx].isSsidPrefixEnabled = false;
            saveDevice = true;
          }
          /*
            Check if tr-069 device has mesh bssids registered
          */
          if (devices[idx].use_tr069 &&
            (!devices[idx].bssid_mesh2 || !devices[idx].bssid_mesh5)) {
            let cpe = DevicesAPI.instantiateCPEByModelFromDevice(
              devices[idx]).cpe;
            let meshBSSIDs = acsMeshDeviceHandler.getMeshBSSIDs(
              cpe, devices[idx]._id);
            devices[idx].bssid_mesh2 = meshBSSIDs.mesh2;
            devices[idx].bssid_mesh5 = meshBSSIDs.mesh5;
            saveDevice = true;
          }
          if (saveDevice) {
            devices[idx].save();
          }
        }
      }
    });
    /* Check if not exists indexes and sync them */
    Device.collection.getIndexes({full: true}).then(async (idxs) => {
      let neededIndexes = ['_id_', 'serial_tr069_1',
                           'alt_uid_tr069_1', 'acs_id_1',
                           'pppoe_user_1', 'external_reference.data_1'];
      let idxNames = idxs.map((idx) => idx.name);
      let reloadIndexes = false;
      for (let neededIdx of neededIndexes) {
        if (!(idxNames.includes(neededIdx))) {
          reloadIndexes = true;
          break;
        }
      }
      if (reloadIndexes) {
        console.log('Creating devices indexes');
        await Device.syncIndexes();
      }
    }).catch(console.error);

    // put default values in old config
    Config.findOne({is_default: true}, {device_update_schedule: false},
    function(err, config) {
      if (!err && config) {
        if (typeof config.isSsidPrefixEnabled === 'undefined') {
          config.isSsidPrefixEnabled = false;
        }
        if (typeof config.ssidPrefix === 'undefined') {
          config.ssidPrefix = '';
        }
        let vlans = [];
        for (let i = 0; i < config.vlans_profiles.length; i++) {
          vlans.push(config.vlans_profiles[i].vlan_id);
        }
        // 1 is the mandatory lan vlan id
        if (! vlans.includes(1)) {
          config.vlans_profiles.push({vlan_id: 1, profile_name: 'LAN'});
        }
        let cbacks = config.traps_callbacks;
        if (cbacks.device_crud.url && cbacks.devices_crud.length == 0) {
          const deviceCrud = utilHandlers.deepCopyObject(cbacks.device_crud);
          cbacks.device_crud.url = '';
          cbacks.devices_crud.push(deviceCrud);
        }
        if (cbacks.user_crud.url && cbacks.users_crud.length == 0) {
          const userCrud = utilHandlers.deepCopyObject(cbacks.user_crud);
          cbacks.user_crud.url = '';
          cbacks.users_crud.push(userCrud);
        }
        if (cbacks.role_crud.url && cbacks.roles_crud.length == 0) {
          const roleCrud = utilHandlers.deepCopyObject(cbacks.role_crud);
          cbacks.role_crud.url = '';
          cbacks.roles_crud.push(roleCrud);
        }
        if (
          cbacks.certification_crud.url &&
          cbacks.certifications_crud.length == 0
        ) {
          const certCrud = utilHandlers.deepCopyObject(
            cbacks.certification_crud,
          );
          cbacks.certification_crud.url = '';
          cbacks.certifications_crud.push(certCrud);
        }
        // THIS SAVE CREATES DEFAULT FIELDS ON DATABASE
        // *** DO NOT TOUCH ***
        config.save();
      }
    });
  }
};
