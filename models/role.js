
const mongoose = require('mongoose');
const request = require('request');

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
  grantFactoryReset: {type: Boolean, required: true, default: false},
  grantDeviceAdd: {type: Boolean, required: true, default: false},
  grantMonitorManage: {type: Boolean, required: true, default: false},
  grantFirmwareManage: {type: Boolean, required: true, default: false},
  grantUserManage: {type: Boolean, required: true, default: false},
  grantFlashmanManage: {type: Boolean, required: true, default: false},
  grantAPIAccess: {type: Boolean, required: true, default: false},
  grantLOGAccess: {type: Boolean, required: true, default: false},
  grantNotificationPopups: {type: Boolean, required: true, default: true},
  grantLanEdit: {type: Boolean, required: true, default: true},
  grantLanDevices: {type: Number, required: true, default: 2},
  grantLanDevicesBlock: {type: Boolean, required: true, default: false},
  grantMeasureDevices: {type: Number, required: true, default: 1},
  grantOpmodeEdit: {type: Boolean, required: true, default: false},
  grantCsvExport: {type: Boolean, required: true, default: true},
});

// Hooks traps notifications
roleSchema.pre('save', function(callback) {
  let role = this;
  let changedAttrs = {};
  let requestOptions = {};
  const attrsList = role.modifiedPaths();

  if (attrsList.length > 0) {
    // Send modified fields if callback exists
    Config.findOne({is_default: true}).lean().exec(function(err, defConfig) {
      if (err || !defConfig.traps_callbacks ||
                 !defConfig.traps_callbacks.role_crud) {
        return callback(err);
      }
      let callbackUrl = defConfig.traps_callbacks.role_crud.url;
      let callbackAuthUser = defConfig.traps_callbacks.role_crud.user;
      let callbackAuthSecret = defConfig.traps_callbacks.role_crud.secret;
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
        request(requestOptions);
      }
    });
  }
  callback();
});

roleSchema.post('remove', function(role, callback) {
  let requestOptions = {};

  // Send modified fields if callback exists
  Config.findOne({is_default: true}).lean().exec(function(err, defConfig) {
    if (err || !defConfig.traps_callbacks ||
               !defConfig.traps_callbacks.role_crud) {
      return callback(err);
    }
    let callbackUrl = defConfig.traps_callbacks.role_crud.url;
    let callbackAuthUser = defConfig.traps_callbacks.role_crud.user;
    let callbackAuthSecret = defConfig.traps_callbacks.role_crud.secret;
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
      request(requestOptions);
    }
  });
  callback();
});

let Role = mongoose.model('Role', roleSchema);

module.exports = Role;
