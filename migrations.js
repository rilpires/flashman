/* eslint-disable no-async-promise-executor */
const controlApi = require('./controllers/external-api/control');
const User = require('./models/user');
const Role = require('./models/role');
const Device = require('./models/device');
const DevicesAPI = require('./controllers/external-genieacs/devices-api');
const meshHandlers = require('./controllers/handlers/mesh');
const utilHandlers = require('./controllers/handlers/util');
const deviceHandlers = require('./controllers/handlers/devices');
const acsMeshDeviceHandler = require('./controllers/handlers/acs/mesh');
const Config = require('./models/config');
const objectId = require('mongoose').Types.ObjectId;

let instanceNumber = parseInt(process.env.NODE_APP_INSTANCE ||
                              process.env.FLM_DOCKER_INSTANCE || 0);
if (process.env.FLM_DOCKER_INSTANCE && instanceNumber > 0) {
  instanceNumber = instanceNumber - 1; // Docker swarm starts counting at 1
}

let runMigrations = () => {
  let migrations = [
    {
      promiseCallback: controlApi.checkPubKey,
      message: 'Checking config and pubkey with control',
    },
    {
      promiseCallback: updateDefaultConfig,
      message: 'Updating default values on config',
    },
    {
      promiseCallback: assureAdminUser,
      message: 'Checking administration user existence',
    },
    {
      promiseCallback: updateDefaultUsers,
      message: 'Updating default values on users',
    },
    {
      promiseCallback: assureRoles,
      message: 'Checking default roles existence',
    },
    {
      promiseCallback: updateDefaultRoles,
      message: 'Updating default values on roles',
    },
    {
      promiseCallback: assureDevicesCollection,
      message: 'Assuring devices collection existence',
    },
    {
      promiseCallback: updateDefaultDevices,
      message: 'Updating default values on devices',
    },
    {
      promiseCallback: updateDeviceIndexes,
      message: 'Updating device indexes',
    },
  ];

  return new Promise( async (resolve, reject)=>{
    for (let i = 0; i < migrations.length; i++) {
      console.log(
        `Migration step #${i+1}/${migrations.length}: ` +
        `"${migrations[i].message}"`,
      );
      await migrations[i].promiseCallback().catch(reject);
    }
    return resolve();
  });
};

let updateDefaultConfig = function() {
  return new Promise(async (resolve, reject)=>{
    let config = await Config
      .findOne({is_default: true}, {device_update_schedule: false})
      .exec().catch(reject);
    if (config) {
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
      await config.save();
    }
    return resolve();
  });
};


let updateDefaultUsers = function() {
  return new Promise(async (resolve, reject)=>{
    let users = await User
      .find({is_hidden: {$exists: false}}, {_id: true})
      .lean().exec().catch(reject);
    if (users && users.length > 0) {
      for (let idx = 0; idx < users.length; idx++) {
        await User.findOneAndUpdate(
          {_id: objectId(users[idx]._id)},
          {is_hidden: false}).exec().catch(reject);
      }
    }
    resolve();
  });
};

let assureAdminUser = function() {
  return new Promise( async (resolve, reject)=>{
    try {
      let adminUsers = await User.find({is_superuser: true});
      if (!adminUsers || adminUsers.length === 0 ) {
        let newSuperUser = new User({
          name: process.env.FLM_ADM_USER,
          password: process.env.FLM_ADM_PASS,
          is_superuser: true,
        });
        await newSuperUser.save();
      }
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

// Check default roles existence
let assureRoles = function() {
  return new Promise( async (resolve, reject)=>{
    let role = await Role.findOne({}).catch(reject);
    if (!role) {
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
        grantStatisticsView: true,
        grantCsvExport: true,
        grantFirmwareBetaUpgrade: true,
        grantFirmwareRestrictedUpgrade: true,
        grantDiagAppAccess: true,
      });
      await managerRole.save().catch(reject);
    }
    // Check API role existence
    let apiRole = await Role
      .findOne({name: 'anlix-statistics-api'})
      .catch(reject);
    if (!apiRole) {
      let apiRole = new Role({
        name: 'anlix-statistics-api',
        is_hidden: true,
        grantAPIAccess: true,
        grantWanType: true,
        grantWifiInfo: 2,
        grantPPPoEInfo: 2,
        grantLanEdit: true,
        grantDeviceId: true,
        grantOpmodeEdit: true,
        grantSearchLevel: 2,
      });
      await apiRole.save().catch(reject);
    }
    resolve();
  });
};

let updateDefaultRoles = function() {
  return new Promise( async (resolve, reject)=>{
    let roles = await Role.find({}).lean().catch(reject);
    if (roles && roles.length > 0) {
      for (let idx = 0; idx < roles.length; idx++) {
        if (typeof roles[idx].grantShowRowsPerPage == 'undefined') {
          await Role.findOneAndUpdate(
            {name: roles[idx].name},
            {grantShowRowsPerPage: true},
          ).catch(reject);
        }
        if (typeof roles[idx].grantStatisticsView == 'undefined') {
          await Role.findOneAndUpdate(
            {name: roles[idx].name},
            {grantStatisticsView: roles[idx].grantWanBytesView},
          ).catch(reject);
          console.log(
            'Role updated: Renamed grantWanBytesView to grantStatisticsView',
          );
          await Role.collection.updateOne(
            {name: roles[idx].name},
            {$unset: {grantWanBytesView: 1}},
          );
          console.log('Role updated: Removed grantWanBytesView');
        }
        if (typeof roles[idx].is_hidden == 'undefined') {
          await Role.findOneAndUpdate(
            {name: roles[idx].name},
            {is_hidden: false},
          );
          console.log(`Role "${roles[idx].name}" visibility updated`);
        }
      }
    }
    resolve();
  });
};

let assureDevicesCollection = function() {
  return new Promise( async (resolve, reject)=>{
    await Device.createCollection().catch(reject);
    return resolve();
  });
};

let updateDefaultDevices = function() {
  return new Promise( async (resolve, reject)=>{
    let config = await Config.findOne({is_default: true}).catch(reject);
    let devices = await Device.find({$or: [
      {installed_release: {$exists: false}},
      {mesh_key: {$exists: false}},
      {bridge_mode_enabled: true, connection_type: 'pppoe'},
      {isSsidPrefixEnabled: {$exists: false}},
      {connection_type: 'dhcp', pppoe_user: {$ne: ''}},
      {$and: [{bssid_mesh2: {$exists: false}}, {use_tr069: true}]},
      {$and: [{bssid_mesh5: {$exists: false}}, {use_tr069: true}]},
      {wifi_mode: {$nin: ['11g', '11n']}},
      {$and: [{use_tr069: true}, {custom_inform_interval: {$exists: false}}]},
    ]},
    {installed_release: true, do_update: true,
      do_update_status: true, release: true,
      mesh_key: true, mesh_id: true,
      bridge_mode_enabled: true, connection_type: true,
      pppoe_user: true, pppoe_password: true,
      isSsidPrefixEnabled: true, bssid_mesh2: true, wifi_mode: true,
      bssid_mesh5: true, use_tr069: true, _id: true, model: true,
      custom_inform_interval: true, acs_id: true},
    ).catch(reject);
    if (!devices) return resolve();
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
        Check if tr-069 device doesnt have a custom inform interval,
        calculated based on the config's inform interval
      */
      if (devices[idx].use_tr069 && !devices[idx].custom_inform_interval) {
        let customInform = deviceHandlers.makeCustomInformInterval(
          devices[idx], parseInt(config.tr069.inform_interval/1000),
        );
        devices[idx].custom_inform_interval = customInform;
        saveDevice = true;
      }
      /*
        Check if tr-069 device has mesh bssids registered
      */
      if (devices[idx].use_tr069 &&
        (!devices[idx].bssid_mesh2 || !devices[idx].bssid_mesh5)) {
        let cpe =
          DevicesAPI.instantiateCPEByModelFromDevice(devices[idx]).cpe;
        let meshBSSIDs =
          acsMeshDeviceHandler.getMeshBSSIDs(cpe, devices[idx]._id);
        devices[idx].bssid_mesh2 = meshBSSIDs.mesh2;
        devices[idx].bssid_mesh5 = meshBSSIDs.mesh5;
        saveDevice = true;
      }
      if (saveDevice) {
        await devices[idx].save();
      }
    }
    return resolve();
  });
};

let updateDeviceIndexes = function() {
  return new Promise( async (resolve, reject)=>{
    let idxs = await Device.collection.getIndexes({full: true}).catch(reject);
    let neededIndexes = [
      '_id_', 'search_texts', 'simple_search_index',
      // Below indexes has both collation and no-collation versions
      'alt_uid_tr069_1', 'alt_uid_tr069_collation',
      'acs_id_1', 'acs_id_collation',
      'serial_tr069_1', 'serial_tr069_collation',
      'pppoe_user_1', 'pppoe_user_collation',
      'external_reference.data_1', 'external_reference.data_collation',
      'wan_bssid_1', 'wan_bssid_collation',
    ];
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
    return resolve();
  });
};

module.exports = runMigrations;
