
const mongoose = require('mongoose');
const request = require('request-promise-native');

const Config = require('./config');

let roleSchema = new mongoose.Schema({
  name: {type: String, unique: true, required: true},
  grantWifiInfo: {type: Number, required: true, default: 0},
  grantPPPoEInfo: {type: Number, required: true, default: 0},
  grantPassShow: {type: Boolean, required: true, default: false},
  grantFirmwareUpgrade: {type: Boolean, required: true, default: false},
  grantMassFirmwareUpgrade: {type: Boolean, required: true, default: true},
  grantWanType: {type: Boolean, required: true, default: false},
  grantDeviceId: {type: Boolean, required: true, default: false},
  grantDeviceActions: {type: Boolean, required: true, default: false},
  grantDeviceRemoval: {type: Boolean, required: true, default: false},
  grantDeviceMassRemoval: {type: Boolean, required: true, default: false},
  grantDeviceLicenseBlock: {type: Boolean, required: true, default: false},
  grantFactoryReset: {type: Boolean, required: true, default: false},
  grantDeviceAdd: {type: Boolean, required: true, default: false},
  grantMonitorManage: {type: Boolean, required: true, default: false},
  grantFirmwareManage: {type: Boolean, required: true, default: false},
  grantUserManage: {type: Boolean, required: true, default: false},
  grantFlashmanManage: {type: Boolean, required: true, default: false},
  grantAPIAccess: {type: Boolean, required: true, default: false},
  grantDiagAppAccess: {type: Boolean, required: true, default: false},
  grantCertificationAccess: {type: Number, required: true, default: 0},
  grantLOGAccess: {type: Boolean, required: true, default: false},
  grantNotificationPopups: {type: Boolean, required: true, default: true},
  grantLanEdit: {type: Boolean, required: true, default: true},
  grantLanDevices: {type: Number, required: true, default: 2},
  grantSiteSurvey: {type: Boolean, required: true, default: true},
  grantLanDevicesBlock: {type: Boolean, required: true, default: false},
  grantMeasureDevices: {type: Number, required: true, default: 1},
  grantOpmodeEdit: {type: Boolean, required: true, default: false},
  grantVlan: {type: Number, required: true, default: 0},
  grantVlanProfileEdit: {type: Boolean, required: true, default: false},
  grantWanBytesView: {type: Boolean, required: true, default: false},
  grantCsvExport: {type: Boolean, required: true, default: true},
  // 2 is the complete search mode, 1 is simple search, 0 no search available
  grantSearchLevel: {type: Number, required: true, default: 2},
  grantShowSearchSummary: {type: Boolean, required: true, default: true},
  grantShowRowsPerPage: {type: Boolean, required: true, default: true},
  grantFirmwareBetaUpgrade: {type: Boolean, default: false},
  grantFirmwareRestrictedUpgrade: {type: Boolean, default: false},
  grantSlaveDisassociate: {type: Boolean, required: true, default: false},
});

// Hooks traps notifications
roleSchema.pre('save', function(callback) {
  let role = this;
  let changedAttrs = {};
  let requestOptions = {};
  const attrsList = role.modifiedPaths();

  if (attrsList.length > 0) {
    // Send modified fields if callback exists
    Config.findOne({is_default: true}, {traps_callbacks: true}).lean()
    .exec(function(err, defConfig) {
      if (err || !defConfig.traps_callbacks ||
                 !defConfig.traps_callbacks.roles_crud) {
        return callback(err);
      }
      const promises = defConfig.traps_callbacks.roles_crud.map((roleCrud) => {
        let callbackUrl = roleCrud.url;
        let callbackAuthUser = roleCrud.user;
        let callbackAuthSecret = roleCrud.secret;
        if (callbackUrl) {
          attrsList.forEach((attr) => {
            changedAttrs[attr] = role[attr];
          });
          requestOptions.url = callbackUrl;
          requestOptions.method = 'PUT';
          requestOptions.json = {
            'id': role._id,
            'type': 'role',
            'name': role.name,
            'changes': changedAttrs,
          };
          if (callbackAuthUser && callbackAuthSecret) {
            requestOptions.auth = {
              user: callbackAuthUser,
              pass: callbackAuthSecret,
            };
          }
          return request(requestOptions);
        }
      });
      Promise.all(promises).then((resp) => {
        // Ignore API response
        return;
      }, (err) => {
        // Ignore API endpoint errors
        return;
      });
    });
  }
  callback();
});

roleSchema.post('remove', function(role, callback) {
  let requestOptions = {};

  // Send modified fields if callback exists
  Config.findOne({is_default: true}, {traps_callbacks: true}).lean()
  .exec(function(err, defConfig) {
    if (err || !defConfig.traps_callbacks ||
               !defConfig.traps_callbacks.role_crud) {
      return callback(err);
    }
    const promises = defConfig.traps_callbacks.roles_crud.map((roleCrud) => {
      let callbackUrl = roleCrud.url;
      let callbackAuthUser = roleCrud.user;
      let callbackAuthSecret = roleCrud.secret;
      if (callbackUrl) {
        requestOptions.url = callbackUrl;
        requestOptions.method = 'PUT';
        requestOptions.json = {
          'id': role._id,
          'type': 'role',
          'name': role.name,
          'removed': true,
        };
        if (callbackAuthUser && callbackAuthSecret) {
          requestOptions.auth = {
            user: callbackAuthUser,
            pass: callbackAuthSecret,
          };
        }
        return request(requestOptions);
      }
    });
    Promise.all(promises).then((resp) => {
      // Ignore API response
      return;
    }, (err) => {
      // Ignore API endpoint errors
      return;
    });
  });
  callback();
});

let Role = mongoose.model('Role', roleSchema);

module.exports = Role;
