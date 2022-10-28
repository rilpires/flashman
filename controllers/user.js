/* eslint-disable no-prototype-builtins */
/* global __line */

const User = require('../models/user');
const Role = require('../models/role');
const Config = require('../models/config');
const Notification = require('../models/notification');
const controlApi = require('./external-api/control');
const {Parser} = require('json2csv');
const t = require('./language').i18next.t;

let userController = {};

userController.changePassword = function(req, res) {
  Role.findOne({name: req.user.role}, function(err, role) {
    return res.render('changepassword',
                      {user: req.user,
                       username: req.user.name,
                       message: t('passwordExpired', {errorline: __line}),
                       type: 'danger',
                       superuser: req.user.is_superuser,
                       role: role});
  });
};

userController.changeElementsPerPage = function(req, res) {
  if (isNaN(parseInt(req.body.elementsperpage))) {
    return res.json({
      type: 'danger',
      message: t('valueInvalid', {errorline: __line}),
    });
  }
  // Use the User model to find a specific user
  User.findById(req.user._id, function(err, user) {
    if (err) {
      return res.json({
        type: 'danger',
        message: t('userFindError', {errorline: __line}),
      });
    }

    user.maxElementsPerPage = req.body.elementsperpage;
    user.save(function(err) {
      if (err) {
        return res.json({
          type: 'danger',
          message: t('saveError', {errorline: __line}),
        });
      }
      return res.json({
        type: 'success',
        message: t('operationSuccessful'),
      });
    });
  });
};

userController.changeVisibleColumnsOnPage = function(req, res) {
  if (!Array.isArray(req.body.visiblecolumnsperpage)) {
    return res.json({
      type: 'danger',
      message: t('valueInvalid', {errorline: __line}),
    });
  }
  // Use the User model to find a specific user
  User.findById(req.user._id, function(err, user) {
    if (err) {
      return res.json({
        type: 'danger',
        message: t('userFindError', {errorline: __line}),
      });
    }

    user.visibleColumnsOnPage = req.body.visiblecolumnsperpage;
    user.save(function(err) {
      if (err) {
        return res.json({
          type: 'danger',
          message: t('saveError', {errorline: __line}),
        });
      }
      return res.json({
        type: 'success',
        message: t('operationSuccessful'),
      });
    });
  });
};

userController.postUser = function(req, res) {
  // 23 Chars is maximum allowed currently due to MQTT body message limitations
  if (req.body.name.length > 23) {
    console.log('Error creating user');
    return res.json({
      success: false,
      type: 'danger',
      message: t('nameCantBeBiggerThan23', {errorline: __line}),
    });
  }
  let user = new User({
    name: req.body.name,
    password: req.body.password,
    role: req.body.role,
    is_superuser: false,
  });
  user.save(function(err) {
    if (err) {
      console.log('Error creating user: ' + err);
      return res.json({
        success: false,
        type: 'danger',
        message: t('userMightAlreadyExist', {errorline: __line}),
      });
    }
    return res.json({
      success: true,
      type: 'success',
      message: t('operationSuccessful'),
    });
  });
};

userController.postRole = function(req, res) {
  let basicFirmwareUpgrade = false;
  let massFirmwareUpgrade = false;
  if (req.body['grant-firmware-upgrade'] == 2) {
    basicFirmwareUpgrade = true;
    massFirmwareUpgrade = true;
  } else if (req.body['grant-firmware-upgrade'] == 1) {
    basicFirmwareUpgrade = true;
  }
  let basicDeviceRemoval = false;
  let massDeviceRemoval = false;
  if (req.body['grant-device-removal'] == 2) {
    basicDeviceRemoval = true;
    massDeviceRemoval = true;
  } else if (req.body['grant-device-removal'] == 1) {
    basicDeviceRemoval = true;
  }
  let role = new Role({
    name: req.body.name,
    grantWifiInfo: parseInt(req.body['grant-wifi-info']),
    grantPPPoEInfo: parseInt(req.body['grant-pppoe-info']),
    grantPassShow: req.body['grant-pass-show'],
    grantFirmwareUpgrade: basicFirmwareUpgrade,
    grantMassFirmwareUpgrade: massFirmwareUpgrade,
    grantWanType: req.body['grant-wan-type'],
    grantDeviceId: req.body['grant-device-id'],
    grantDeviceActions: req.body['grant-device-actions'],
    grantDeviceRemoval: basicDeviceRemoval,
    grantDeviceMassRemoval: massDeviceRemoval,
    grantDeviceLicenseBlock: req.body['grant-block-license-at-removal'],
    grantFactoryReset: req.body['grant-factory-reset'],
    grantDeviceAdd: req.body['grant-device-add'],
    grantMonitorManage: req.body['grant-monitor-manage'],
    grantFirmwareManage: req.body['grant-firmware-manage'],
    grantUserManage: req.body['grant-user-manage'],
    grantFlashmanManage: req.body['grant-flashman-manage'],
    grantAPIAccess: req.body['grant-api-access'],
    grantDiagAppAccess: req.body['grant-diag-app-access'],
    grantCertificationAccess: req.body['grant-certification-access'],
    grantLOGAccess: req.body['grant-log-access'],
    grantNotificationPopups: req.body['grant-notification-popups'],
    grantLanEdit: req.body['grant-lan-edit'],
    grantOpmodeEdit: req.body['grant-opmode-edit'],
    grantSlaveDisassociate: req.body['grant-slave-disassociate'],
    grantLanDevices: parseInt(req.body['grant-lan-devices']),
    grantLanDevicesBlock: req.body['grant-lan-devices-block'],
    grantSiteSurvey: req.body['grant-site-survey'],
    grantMeasureDevices: parseInt(req.body['grant-measure-devices']),
    grantCsvExport: req.body['grant-csv-export'],
    grantVlan: req.body['grant-vlan'],
    grantVlanProfileEdit: req.body['grant-vlan-profile-edit'],
    grantStatisticsView: req.body['grant-statistics'],
    grantSearchLevel: parseInt(req.body['grant-search-level']),
    grantShowSearchSummary: req.body['grant-search-summary'],
    grantShowRowsPerPage: req.body['grant-rows-per-page'],
    grantFirmwareBetaUpgrade: req.body['grant-firmware-beta-upgrade'],
    grantFirmwareRestrictedUpgrade:
      req.body['grant-firmware-restricted-upgrade'],
    grantWanMtuEdit: req.body['grant-wan-mtu-edit'],
    grantWanVlanEdit: req.body['grant-wan-vlan-edit'],
  });

  if (role.grantFirmwareRestrictedUpgrade && !role.grantFirmwareUpgrade) {
    console.log('Role conflict error');
    return res.json({
      success: false,
      type: 'danger',
      message: t('firmwareUpdateControllConflict', {errorline: __line}),
    });
  } else if (role.grantFirmwareBetaUpgrade && !role.grantFirmwareUpgrade) {
    console.log('Role conflict error');
    return res.json({
      success: false,
      type: 'danger',
      message: t('firmwareBetaUpdateControllConflict', {errorline: __line}),
    });
  }

  role.save(function(err) {
    if (err) {
      console.log('Error creating role: ' + err);
      return res.json({
        success: false,
        type: 'danger',
        message: t('roleMightAlreadyExist', {errorline: __line}),
      });
    }
    return res.json({
      success: true,
      type: 'success',
      message: t('operationSuccessful'),
    });
  });
};

userController.getUsers = async function(req, res) {
  try {
    let users = await User.find({is_hidden: false}).lean().exec();
    return res.json({success: true, type: 'success', users: users});
  } catch (err) {
    return res.json({success: false, type: 'danger', message: err});
  }
};

userController.getUsersForDisplay = async function(req, res) {
  try {
    let usersProjection = {deviceCertifications: false, is_hidden: false};
    let users = await User.find({}, usersProjection).lean().exec();
    return res.json({success: true, type: 'success', users: users});
  } catch (err) {
    return res.json({success: false, type: 'danger', message: err});
  }
};

userController.getUserById = function(req, res) {
  User.findById(req.params.id, function(err, user) {
    if (err || !user) {
      return res.json({success: false, type: 'danger', message: err});
    }
    return res.json({success: true, type: 'success', user: user});
  });
};

userController.getRoles = function(req, res) {
  Role.find({is_hidden: false}, function(err, roles) {
    if (err) {
      return res.json({success: false, type: 'danger', message: err});
    }
    return res.json({success: true, type: 'success', roles: roles});
  });
};

userController.editUser = function(req, res) {
  // Use the User model to find a specific user
  User.findById(req.params.id, function(err, user) {
    if (err) {
      console.log('Error finding user: ' + err);
      return res.status(500).json({
        success: false,
        type: 'danger',
        message: t('userFindError', {errorline: __line}),
      });
    }

    if ('name' in req.body) {
      user.name = req.body.name;
    }
    if ('password' in req.body && 'passwordack' in req.body) {
      if (req.body.password == req.body.passwordack) {
        // Test if password is not empty nor contains only whitespaces
        if (/\S/.test(req.body.password)) {
          user.password = req.body.password;
        }
      } else {
        return res.status(500).json({
          success: false,
          type: 'danger',
          message: t('passwordsDiffer', {errorline: __line}),
        });
      }
    }

    Role.findOne({name: req.user.role}, function(err, role) {
      if (err || (!role && !req.user.is_superuser)) {
        return res.status(500).json({
          success: false,
          type: 'danger',
          message: t('saveError', {errorline: __line}),
        });
      }

      if (req.user.is_superuser) {
        if ('is_superuser' in req.body) {
          user.is_superuser = req.body.is_superuser;
        }
      }

      if (req.user.is_superuser || role.grantUserManage) {
        if ('role' in req.body) {
          user.role = req.body.role;
        }
      }

      if (req.user.is_superuser ||
          role.grantUserManage ||
          req.user._id.toString() === user._id.toString()) {
        user.lastLogin = new Date();
        user.save(function(err) {
          if (err) {
            console.log('Error saving user entry: ' + err);
            return res.status(500).json({
              success: false,
              type: 'danger',
              message: t('saveError', {errorline: __line}),
            });
          } else {
            return res.json({
              success: true,
              type: 'success',
              message: t('operationSuccessful'),
            });
          }
        });
      } else {
        return res.status(403).json({
          success: false,
          type: 'danger',
          message: t('permissionDenied', {errorline: __line}),
        });
      }
    });
  });
};

userController.editRole = function(req, res) {
  Role.findById(req.params.id, function(err, role) {
    if (err || !role) {
      console.log('Error editing role: ' + err);
      return res.json({
        success: false,
        type: 'danger',
        message: t('roleFindError', {errorline: __line}),
      });
    }
    let basicFirmwareUpgrade = false;
    let massFirmwareUpgrade = false;
    if (req.body['grant-firmware-upgrade'] == 2) {
      basicFirmwareUpgrade = true;
      massFirmwareUpgrade = true;
    } else if (req.body['grant-firmware-upgrade'] == 1) {
      basicFirmwareUpgrade = true;
    }
    let basicDeviceRemoval = false;
    let massDeviceRemoval = false;
    if (req.body['grant-device-removal'] == 2) {
      basicDeviceRemoval = true;
      massDeviceRemoval = true;
    } else if (req.body['grant-device-removal'] == 1) {
      basicDeviceRemoval = true;
    }
    role.grantWifiInfo = parseInt(req.body['grant-wifi-info']);
    role.grantPPPoEInfo = parseInt(req.body['grant-pppoe-info']);
    role.grantPassShow = req.body['grant-pass-show'];
    role.grantFirmwareUpgrade = basicFirmwareUpgrade;
    role.grantMassFirmwareUpgrade = massFirmwareUpgrade;
    role.grantWanType = req.body['grant-wan-type'];
    role.grantDeviceId = req.body['grant-device-id'];
    role.grantDeviceActions = req.body['grant-device-actions'];
    role.grantFactoryReset = req.body['grant-factory-reset'];
    role.grantDeviceRemoval = basicDeviceRemoval;
    role.grantDeviceMassRemoval = massDeviceRemoval;
    role.grantDeviceLicenseBlock = req.body['grant-block-license-at-removal'];
    role.grantDeviceAdd = req.body['grant-device-add'];
    role.grantMonitorManage = req.body['grant-monitor-manage'];
    role.grantFirmwareManage = req.body['grant-firmware-manage'];
    role.grantUserManage = req.body['grant-user-manage'];
    role.grantFlashmanManage = req.body['grant-flashman-manage'];
    role.grantAPIAccess = req.body['grant-api-access'];
    role.grantDiagAppAccess = req.body['grant-diag-app-access'];
    role.grantCertificationAccess = req.body['grant-certification-access'];
    role.grantLOGAccess = req.body['grant-log-access'];
    role.grantNotificationPopups = req.body['grant-notification-popups'];
    role.grantLanEdit = req.body['grant-lan-edit'];
    role.grantOpmodeEdit = req.body['grant-opmode-edit'];
    role.grantSlaveDisassociate = req.body['grant-slave-disassociate'];
    role.grantLanDevices = parseInt(req.body['grant-lan-devices']);
    role.grantLanDevicesBlock = req.body['grant-lan-devices-block'];
    role.grantSiteSurvey = req.body['grant-site-survey'];
    role.grantMeasureDevices = parseInt(req.body['grant-measure-devices']);
    role.grantCsvExport = req.body['grant-csv-export'];
    role.grantVlan = req.body['grant-vlan'];
    role.grantVlanProfileEdit = req.body['grant-vlan-profile-edit'];
    role.grantStatisticsView = req.body['grant-statistics'];
    role.grantSearchLevel = parseInt(req.body['grant-search-level']);
    role.grantShowSearchSummary = req.body['grant-search-summary'];
    role.grantShowRowsPerPage = req.body['grant-rows-per-page'];
    role.grantFirmwareBetaUpgrade = req.body['grant-firmware-beta-upgrade'];
    role.grantFirmwareRestrictedUpgrade =
      req.body['grant-firmware-restricted-upgrade'];
    role.grantWanMtuEdit = req.body['grant-wan-mtu-edit'];
    role.grantWanVlanEdit = req.body['grant-wan-vlan-edit'];

    if (role.grantFirmwareRestrictedUpgrade && !role.grantFirmwareUpgrade) {
      console.log('Role conflict error');
      return res.json({
        success: false,
        type: 'danger',
        message: t('firmwareUpdateControllConflict', {errorline: __line}),
      });
    } else if (role.grantFirmwareBetaUpgrade && !role.grantFirmwareUpgrade) {
      console.log('Role conflict error');
      return res.json({
        success: false,
        type: 'danger',
        message: t('firmwareBetaUpdateControllConflict', {errorline: __line}),
      });
    }

    role.save(function(err) {
      if (err) {
        console.log('Error saving role: ' + err);
        return res.json({
          success: false,
          type: 'danger',
          message: t('roleSaveError', {errorline: __line}),
        });
      }
      return res.json({
        success: true,
        type: 'success',
        message: t('operationSuccessful'),
      });
    });
  });
};

userController.deleteCertificates = async function(req, res) {
  let items = req.body.items;
  if (!items) {
    return res.status(500).json({
      success: false,
      type: 'danger',
      message: t('certificateDeleteErrorContactDev', {errorline: __line}),
    });
  }
  items = JSON.parse(items);
  let itemsById = {};
  let idList = [];
  for (let item of items) {
    if (itemsById.hasOwnProperty(item.user)) {
      itemsById[item.user].push(item.timestamp);
    } else {
      idList.push(item.user);
      itemsById[item.user] = [item.timestamp];
    }
  }
  try {
    for (let userId of idList) {
      let user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      let timestamps = itemsById[userId];
      for (let timestamp of timestamps) {
        let idx = user.deviceCertifications.findIndex(
          (c) => c.localEpochTimestamp === parseInt(timestamp));
        if (idx != -1) {
          user.deviceCertifications.splice(idx, 1);
        }
      }
      await user.save();
    }
    return res.status(200).json({
      success: true,
      type: 'success',
      message: t('operationSuccessful'),
    });
  } catch (err) {
    console.error(err.message ? err.message : err);
    return res.status(500).json({
      success: false,
      type: 'danger',
      message: t('certificateDeleteErrorContactDev', {errorline: __line}),
    });
  }
};

userController.deleteUser = function(req, res) {
  User.find({'_id': {$in: req.body.ids}}, function(err, users) {
    if (err || users.length === 0) {
      console.log('User delete error: ' + err);
      return res.json({
        success: false,
        type: 'danger',
        message: t('userDeleteErrorContactDev', {errorline: __line}),
      });
    }
    users.forEach((user) => {
      user.remove();
    });
    return res.json({
      success: true,
      type: 'success',
      message: t('operationSuccessful'),
    });
  });
};

userController.deleteRole = function(req, res) {
  User.countDocuments({'role': {$in: req.body.names}}, function(err, count) {
    if (count == 0) {
      Role.find({'_id': {$in: req.body.ids}}, function(err, roles) {
        if (err || roles.length === 0) {
          console.log('Role delete error: ' + err);
          return res.json({
            success: false,
            type: 'danger',
            message: t('roleDeleteErrorContactDev', {errorline: __line}),
          });
        }
        roles.forEach((role) => {
          role.remove();
        });
        return res.json({
          success: true,
          type: 'success',
          message: t('operationSuccessful'),
        });
      });
    } else {
      return res.json({
        success: false,
        type: 'danger',
        message: t('rolesStillInUse', {errorline: __line}),
      });
    }
  });
};

userController.getProfile = function(req, res) {
  let indexContent = {};
  let queryUserId = req.user._id;

  if ('id' in req.params) {
    queryUserId = req.params.id;
  }

  // Check Flashman automatic update availability
  if (typeof process.env.FLM_DISABLE_AUTO_UPDATE !== 'undefined' && (
             process.env.FLM_DISABLE_AUTO_UPDATE === 'true' ||
             process.env.FLM_DISABLE_AUTO_UPDATE === true)
  ) {
    indexContent.disableAutoUpdate = true;
  } else {
    indexContent.disableAutoUpdate = false;
  }

  User.findById(queryUserId, function(err, user) {
    let query = {is_default: true};
    let projection = {hasUpdate: true, hasMajorUpdate: true};
    Config.findOne(query, projection, function(err, matchedConfig) {
      if (err || !matchedConfig) {
        indexContent.update = false;
      } else {
        indexContent.update = matchedConfig.hasUpdate;
        indexContent.majorUpdate = matchedConfig.hasMajorUpdate;
      }
      indexContent.superuser = req.user.is_superuser;
      indexContent.username = req.user.name;
      indexContent.user = user;

      Role.find(function(err, roles) {
        if (err) {
          console.log(err);
          indexContent.type = 'danger';
          indexContent.message = t('roleFindError', {errorline: __line});
          return res.render('error', indexContent);
        }
        let userRole = roles.find(function(role) {
          return role.name === req.user.role;
        });
        if (typeof userRole === 'undefined' && !req.user.is_superuser) {
          indexContent.type = 'danger';
          indexContent.message = t('permissionNotFound', {errorline: __line});
          return res.render('error', indexContent);
        } else {
          indexContent.role = userRole;

          // List roles if superuser or has permission and not on profile
          if ((req.user.is_superuser || indexContent.role.grantUserManage) &&
              queryUserId != req.user._id) {
            indexContent.roles = roles;
          }
          return res.render('profile', indexContent);
        }
      });
    });
  });
};

userController.showCertificates = function(req, res) {
  let indexContent = {};

  // Check Flashman automatic update availability
  if (typeof process.env.FLM_DISABLE_AUTO_UPDATE !== 'undefined' && (
             process.env.FLM_DISABLE_AUTO_UPDATE === 'true' ||
             process.env.FLM_DISABLE_AUTO_UPDATE === true)
  ) {
    indexContent.disableAutoUpdate = true;
  } else {
    indexContent.disableAutoUpdate = false;
  }

  Role.find(function(err, roles) {
    if (err) {
      console.log(err);
      indexContent.type = 'danger';
      indexContent.message = t('permissionNotFound', {errorline: __line});
      return res.render('error', indexContent);
    }
    let userRole = roles.find(function(role) {
      return role.name === req.user.role;
    });
    if (typeof userRole === 'undefined' && !req.user.is_superuser) {
      indexContent.type = 'danger';
      indexContent.message = t('permissionNotFound', {errorline: __line});
      return res.render('error', indexContent);
    } else {
      indexContent.roles = roles;
      indexContent.role = userRole;

      if (req.user.is_superuser || indexContent.role.grantCertificationAccess) {
        User.findOne({name: req.user.name}, function(err, user) {
          if (err || !user) {
            indexContent.superuser = false;
          } else {
            indexContent.superuser = user.is_superuser;
          }

          let query = {is_default: true};
          let projection = {hasUpdate: true, hasMajorUpdate: true};
          Config.findOne(query, projection, function(err, matchedConfig) {
            if (err || !matchedConfig) {
              indexContent.update = false;
            } else {
              indexContent.update = matchedConfig.hasUpdate;
              indexContent.majorUpdate = matchedConfig.hasMajorUpdate;
            }
            indexContent.username = req.user.name;

            return res.render('showusercertificates', indexContent);
          });
        });
      } else {
        indexContent.type = 'danger';
        indexContent.message = t('permissionDenied', {errorline: __line});
        return res.render('error', indexContent);
      }
    }
  });
};

userController.showAll = function(req, res) {
  let indexContent = {};

  // Check Flashman automatic update availability
  if (typeof process.env.FLM_DISABLE_AUTO_UPDATE !== 'undefined' && (
             process.env.FLM_DISABLE_AUTO_UPDATE === 'true' ||
             process.env.FLM_DISABLE_AUTO_UPDATE === true)
  ) {
    indexContent.disableAutoUpdate = true;
  } else {
    indexContent.disableAutoUpdate = false;
  }

  Role.find(function(err, roles) {
    if (err) {
      console.log(err);
      indexContent.type = 'danger';
      indexContent.message = t('permissionNotFound', {errorline: __line});
      return res.render('error', indexContent);
    }
    let userRole = roles.find(function(role) {
      return role.name === req.user.role;
    });
    if (typeof userRole === 'undefined' && !req.user.is_superuser) {
      indexContent.type = 'danger';
      indexContent.message = t('permissionNotFound', {errorline: __line});
      return res.render('error', indexContent);
    } else {
      indexContent.roles = roles;
      indexContent.role = userRole;

      if (req.user.is_superuser || indexContent.role.grantUserManage) {
        User.findOne({name: req.user.name}, function(err, user) {
          if (err || !user) {
            indexContent.superuser = false;
          } else {
            indexContent.superuser = user.is_superuser;
          }

          let query = {is_default: true};
          let projection = {hasUpdate: true, hasMajorUpdate: true};
          Config.findOne(query, projection, function(err, matchedConfig) {
            if (err || !matchedConfig) {
              indexContent.update = false;
            } else {
              indexContent.update = matchedConfig.hasUpdate;
              indexContent.majorUpdate = matchedConfig.hasMajorUpdate;
            }
            indexContent.username = req.user.name;

            return res.render('showusers', indexContent);
          });
        });
      } else {
        indexContent.type = 'danger';
        indexContent.message = t('permissionDenied', {errorline: __line});
        return res.render('error', indexContent);
      }
    }
  });
};

userController.showRoles = function(req, res) {
  let indexContent = {};

  // Check Flashman automatic update availability
  if (typeof process.env.FLM_DISABLE_AUTO_UPDATE !== 'undefined' && (
             process.env.FLM_DISABLE_AUTO_UPDATE === 'true' ||
             process.env.FLM_DISABLE_AUTO_UPDATE === true)
  ) {
    indexContent.disableAutoUpdate = true;
  } else {
    indexContent.disableAutoUpdate = false;
  }

  Role.findOne({name: req.user.role}, function(err, role) {
    if (err || (!role && !req.user.is_superuser)) {
      console.log(err);
      indexContent.type = 'danger';
      indexContent.message = t('permissionNotFound', {errorline: __line});
      return res.render('error', indexContent);
    }

    indexContent.role = role;

    if (req.user.is_superuser || indexContent.role.grantUserManage) {
      User.findOne({name: req.user.name}, function(err, user) {
        if (err || !user) {
          indexContent.superuser = false;
        } else {
          indexContent.superuser = user.is_superuser;
        }

        let query = {is_default: true};
        let projection = {hasUpdate: true, hasMajorUpdate: true};
        Config.findOne(query, projection, function(err, matchedConfig) {
          if (err || !matchedConfig) {
            indexContent.update = false;
          } else {
            indexContent.update = matchedConfig.hasUpdate;
            indexContent.majorUpdate = matchedConfig.hasMajorUpdate;
          }
          indexContent.username = req.user.name;

          return res.render('showroles', indexContent);
        });
      });
    } else {
      indexContent.type = 'danger';
      indexContent.message = t('permissionDenied', {errorline: __line});
      return res.render('error', indexContent);
    }
  });
};

userController.setUserCrudTrap = function(req, res) {
  // Store callback URL for users
  let query = {is_default: true};
  let projection = {traps_callbacks: true};
  Config.findOne(query, projection).exec(function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: t('configFindError', {errorline: __line}),
      });
    } else {
      if (typeof req.body.url === 'string' && req.body.url) {
        let userCrud = {url: req.body.url};
        if (req.body.user && req.body.secret) {
          userCrud.user = req.body.user;
          userCrud.secret = req.body.secret;
        }
        let index = matchedConfig.traps_callbacks.users_crud.findIndex(
          (d)=>d.url===req.body.url,
        );
        if (index > -1) {
          matchedConfig.traps_callbacks.users_crud[index] = userCrud;
        } else {
          matchedConfig.traps_callbacks.users_crud.push(userCrud);
        }
        matchedConfig.save((err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: t('cpeSaveError', {errorline: __line}),
            });
          }
          return res.status(200).json({
            success: true,
            message: t('operationSuccessful'),
          });
        });
      } else {
        return res.status(500).json({
          success: false,
          message: t('fieldNameMissing', {name: 'url', errorline: __line}),
        });
      }
    }
  });
};

userController.deleteUserCrudTrap = function(req, res) {
  let query = {is_default: true};
  let projection = {traps_callbacks: true};
  const userCrudIndex = req.body.index;
  if (typeof userCrudIndex !== 'number' || userCrudIndex < 0) {
    return res.status(500).send({
      success: false,
      message: t('fieldNameInvalid', {name: 'index', errorline: __line}),
    });
  }
  Config.findOne(query, projection).exec(function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: t('configFindError', {errorline: __line}),
      });
    } else {
      if (!matchedConfig.traps_callbacks.users_crud[userCrudIndex]) {
        return res.status(500).json({
          success: false,
          message: t('arrayElementNotFound'),
        });
      }
      matchedConfig.traps_callbacks.users_crud.splice(userCrudIndex, 1);
      matchedConfig.save((err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: t('cpeSaveError', {errorline: __line}),
          });
        }
        return res.status(200).json({
          success: true,
          message: t('operationSuccessful'),
        });
      });
    }
  });
};

userController.getUserCrudTrap = function(req, res) {
  // get callback url and user
  let query = {is_default: true};
  let projection = {traps_callbacks: true};
  Config.findOne(query, projection).exec(function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: t('configFindError', {errorline: __line}),
      });
    } else {
      const usersCrud = matchedConfig.traps_callbacks.users_crud.map(
        (d)=>({url: d.url, user: (d.user) ? d.user : ''}),
      );
      if (usersCrud.length == 0) {
        return res.status(200).json({
          success: true,
          exists: false,
        });
      }
      return res.status(200).json({
        success: true,
        exists: true,
        url: usersCrud[0].url,
        user: (usersCrud[0].user) ? usersCrud[0].user : '',
        usersCrud: usersCrud,
      });
    }
  });
};

userController.setRoleCrudTrap = function(req, res) {
  // Store callback URL for roles
  let query = {is_default: true};
  let projection = {traps_callbacks: true};
  Config.findOne(query, projection).exec(function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: t('configFindError', {errorline: __line}),
      });
    } else {
      if (typeof req.body.url === 'string' && req.body.url) {
        let roleCrud = {url: req.body.url};
        if (req.body.user && req.body.secret) {
          roleCrud.user = req.body.user;
          roleCrud.secret = req.body.secret;
        }
        let index = matchedConfig.traps_callbacks.roles_crud.findIndex(
          (d)=>d.url===req.body.url,
        );
        if (index > -1) {
          matchedConfig.traps_callbacks.roles_crud[index] = roleCrud;
        } else {
          matchedConfig.traps_callbacks.roles_crud.push(roleCrud);
        }
        matchedConfig.save((err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: t('cpeSaveError', {errorline: __line}),
            });
          }
          return res.status(200).json({
            success: true,
            message: t('operationSuccessful'),
          });
        });
      } else {
        return res.status(500).json({
          success: false,
          message: t('fieldNameMissing', {name: 'url', errorline: __line}),
        });
      }
    }
  });
};

userController.deleteRoleCrudTrap = function(req, res) {
  // Delete callback URL for roles
  let query = {is_default: true};
  let projection = {traps_callbacks: true};
  const roleCrudIndex = req.body.index;
  if (typeof roleCrudIndex !== 'number' || roleCrudIndex < 0) {
    return res.status(500).send({
      success: false,
      message: t('fieldNameInvalid', {name: 'index', errorline: __line}),
    });
  }
  Config.findOne(query, projection).exec(function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: t('configFindError', {errorline: __line}),
      });
    } else {
      if (!matchedConfig.traps_callbacks.roles_crud[roleCrudIndex]) {
        return res.status(500).json({
          success: false,
          message: t('arrayElementNotFound'),
        });
      }
      matchedConfig.traps_callbacks.roles_crud.splice(roleCrudIndex, 1);
      matchedConfig.save((err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: t('cpeSaveError', {errorline: __line}),
          });
        }
        return res.status(200).json({
          success: true,
          message: t('operationSuccessful'),
        });
      });
    }
  });
};

userController.getRoleCrudTrap = function(req, res) {
  // get callback url and user
  let query = {is_default: true};
  let projection = {traps_callbacks: true};
  Config.findOne(query, projection).exec(function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: t('configFindError', {errorline: __line}),
      });
    } else {
      const rolesCrud = matchedConfig.traps_callbacks.roles_crud.map(
        (d)=>({url: d.url, user: (d.user) ? d.user : ''}),
      );
      if (rolesCrud.length == 0) {
        return res.status(200).json({
          success: true,
          exists: false,
        });
      }
      return res.status(200).json({
        success: true,
        exists: true,
        url: rolesCrud[0].url,
        user: (rolesCrud[0].user) ? rolesCrud[0].user : '',
        rolesCrud: rolesCrud,
      });
    }
  });
};

userController.setCertificationCrudTrap = function(req, res) {
  // Store callback URL for users
  let query = {is_default: true};
  let projection = {traps_callbacks: true};
  Config.findOne(query, projection).exec(function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: t('configFindError', {errorline: __line}),
      });
    } else {
      if (typeof req.body.url === 'string' && req.body.url) {
        let certCrud = {url: req.body.url};
        if (req.body.user && req.body.secret) {
          certCrud.user = req.body.user;
          certCrud.secret = req.body.secret;
        }
        let index = matchedConfig.traps_callbacks.certifications_crud.findIndex(
          (d)=>d.url===req.body.url,
        );
        if (index > -1) {
          matchedConfig.traps_callbacks.certifications_crud[index] = certCrud;
        } else {
          matchedConfig.traps_callbacks.certifications_crud.push(certCrud);
        }
        matchedConfig.save((err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: t('cpeSaveError', {errorline: __line}),
            });
          }
          return res.status(200).json({
            success: true,
            message: t('operationSuccessful'),
          });
        });
      } else {
        return res.status(500).json({
          success: false,
          message: t('fieldNameMissing', {name: 'url', errorline: __line}),
        });
      }
    }
  });
};

userController.deleteCertificationCrudTrap = function(req, res) {
  let query = {is_default: true};
  let projection = {traps_callbacks: true};
  const certCrudIndex = req.body.index;
  if (typeof certCrudIndex !== 'number' || certCrudIndex < 0) {
    return res.status(500).send({
      success: false,
      message: t('fieldNameInvalid', {name: 'index', errorline: __line}),
    });
  }
  Config.findOne(query, projection).exec(function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: t('configFindError', {errorline: __line}),
      });
    } else {
      if (!matchedConfig.traps_callbacks.certifications_crud[certCrudIndex]) {
        return res.status(500).json({
          success: false,
          message: t('arrayElementNotFound'),
        });
      }
      matchedConfig.traps_callbacks.certifications_crud.splice(
        certCrudIndex, 1,
      );
      matchedConfig.save((err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: t('cpeSaveError', {errorline: __line}),
          });
        }
        return res.status(200).json({
          success: true,
          message: t('operationSuccessful'),
        });
      });
    }
  });
};

userController.getCertificationCrudTrap = function(req, res) {
  // Get callback url and user
  let query = {is_default: true};
  let projection = {traps_callbacks: true};
  Config.findOne(query, projection).exec(function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: t('configFindError', {errorline: __line}),
      });
    } else {
      const certsCrud = matchedConfig.traps_callbacks.certifications_crud.map(
        (d)=>({url: d.url, user: (d.user) ? d.user : ''}),
      );
      if (certsCrud.length == 0) {
        return res.status(200).json({
          success: true,
          exists: false,
        });
      }
      return res.status(200).json({
        success: true,
        exists: true,
        url: certsCrud[0].url,
        user: (certsCrud[0].user) ? certsCrud[0].user : '',
        certsCrud: certsCrud,
      });
    }
  });
};

userController.checkAccountIsBlocked = async function(app) {
  try {
    let response = await controlApi.isAccountBlocked(app);
    if (response.success) {
      if (response.isBlocked) {
        let matchedNotif = await Notification.findOne({
          'message_code': 2,
          'target': 'general'});
        if (!matchedNotif || matchedNotif.allow_duplicate) {
          let notification = new Notification({
            'message': t('accountCreditsExpired', {errorline: __line}),
            'message_code': 2,
            'severity': 'danger',
            'type': 'communication',
            'allow_duplicate': false,
            'target': 'general',
          });
          await notification.save();
        }
      }
    } else {
      console.error('Error checking account status: ' + response.message);
    }
  } catch (err) {
    console.error('Error checking if user account is blocked: ' + err);
    return {success: false, message: t('statusVerificationError',
      {errorline: __line})};
  }
};

userController.settings = function(req, res) {
  let indexContent = {};
  let queryUserId = req.user._id;

  if ('id' in req.params) {
    queryUserId = req.params.id;
  }

  // Check Flashman automatic update availability
  if (typeof process.env.FLM_DISABLE_AUTO_UPDATE !== 'undefined' && (
             process.env.FLM_DISABLE_AUTO_UPDATE === 'true' ||
             process.env.FLM_DISABLE_AUTO_UPDATE === true)
  ) {
    indexContent.disableAutoUpdate = true;
  } else {
    indexContent.disableAutoUpdate = false;
  }

  User.findById(queryUserId, function(err, user) {
    let query = {is_default: true};
    let projection = {hasUpdate: true, hasMajorUpdate: true};
    Config.findOne(query, projection, function(err, matchedConfig) {
      if (err || !matchedConfig) {
        indexContent.update = false;
      } else {
        indexContent.update = matchedConfig.hasUpdate;
        indexContent.majorUpdate = matchedConfig.hasMajorUpdate;
      }
      indexContent.superuser = req.user.is_superuser;
      indexContent.username = req.user.name;
      indexContent.user = user;

      Role.find(function(err, roles) {
        if (err) {
          console.log(err);
          indexContent.type = 'danger';
          indexContent.message = t('roleFindError', {errorline: __line});
          return res.render('error', indexContent);
        }
        let userRole = roles.find(function(role) {
          return role.name === req.user.role;
        });
        if (typeof userRole === 'undefined' && !req.user.is_superuser) {
          indexContent.type = 'danger';
          indexContent.message = t('permissionNotFound', {errorline: __line});
          return res.render('error', indexContent);
        } else {
          indexContent.role = userRole;

          // List roles if superuser or has permission and not on profile
          if ((req.user.is_superuser || indexContent.role.grantUserManage) &&
              queryUserId != req.user._id) {
            indexContent.roles = roles;
          }
          return res.render('settings', indexContent);
        }
      });
    });
  });
};

userController.certificateSearch = async (req, res) => {
  let firstDate = new Date(0); // 1/1/1970
  let secondDate = new Date(); // Now
  if (!isNaN(parseInt(req.body.first_date))) {
    firstDate = new Date(parseInt(req.body.first_date));
    firstDate.setUTCHours(0, 0, 0);
  }
  if (!isNaN(parseInt(req.body.second_date))) {
    secondDate = new Date(parseInt(req.body.second_date));
    secondDate.setUTCHours(23, 59, 59);
  }

  const name = typeof req.body.name === 'undefined' ? '' : req.body.name;
  const deviceId = typeof req.body.device_id === 'undefined' ?
    '' : req.body.device_id;
  const csv = typeof req.body.csv === 'undefined' ?
    false : req.body.csv === 'true' ? true : false;

  let query = {};
  query.deviceCertifications = {};
  if (name.length >= 1) {
    query.name = name;
  } else {
    query.name = '';
  }
  if (deviceId.length >= 1) {
    query.mac = deviceId;
  } else {
    query.mac = '';
  }

  const deviceCertifications = await User
    .aggregate([
      {
        $unwind: '$deviceCertifications',
      },
      {
        $redact: {
          $cond: {
            if: {
              $or: [
                {
                  $eq: [
                    '$name',
                    query.name,
                  ],
                },
                query.name.length === 0,
              ],
            },
            then: '$$KEEP',
            else: '$$PRUNE',
          },
        },
      },
      {
        $redact: {
          $cond: {
            if: {
              $or: [
                {
                  $eq: [
                    '$deviceCertifications.mac',
                    query.mac,
                  ],
                },
                query.mac.length === 0,
              ],
            },
            then: '$$KEEP',
            else: '$$PRUNE',
          },
        },
      },
      {
        $redact: {
          $cond: {
            if: {
              $and: [
                {
                  $gte: [
                    '$deviceCertifications.localEpochTimestamp',
                    firstDate.getTime(),
                  ],
                },
                {
                  $lte: [
                    '$deviceCertifications.localEpochTimestamp',
                    secondDate.getTime(),
                  ],
                },
              ],
            },
            then: '$$KEEP',
            else: '$$PRUNE',
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          deviceCertifications: 1,
        },
      },
    ])
    .catch((err) => {
      console.log(err);
      return res.status(500).json({
        success: false,
        error: t('userQueryError', {errorline: __line}),
      });
    })
    .then((users) =>
      users.map((certifications) => {
        return {
          _id: certifications._id,
          name: certifications.name,
          certifications: certifications.deviceCertifications,
        };
      })
      .flat());

  if (csv && deviceCertifications.length >= 1) {
    const fields = [
      {label: t('Technician'), value: 'name', default: ''},
      {
        label: t('Concluded'),
        value: 'certifications.finished',
        default: '',
      },
      {
        label: t('certificateInterruptionReason'),
        value: 'certifications.cancelReason',
        default: '',
      },
      {label: t('uniqueIdentifier'), value: 'certifications.mac', default: ''},
      {
        label: t('cpeIsTr069?'),
        value: 'certifications.isOnu',
        default: '',
      },
      {label: t('Model'), value: 'certifications.routerModel', default: ''},
      {
        label: t('cpeFirmwareVersion'),
        value: 'certifications.routerVersion',
        default: '',
      },
      {
        label: t('harwareVersion/Release'),
        value: 'certifications.routerRelease',
        default: '',
      },
      {
        label: t('serviceDate'),
        value: 'certifications.localEpochTimestamp',
        default: '',
      },
      {
        label: t('hasBeenDiagnosed'),
        value: 'certifications.didDiagnose',
        default: '',
      },
      {
        label: t('cpeSignalLevelReceivedInDbm'),
        value: 'certifications.diagnostic.rxpower',
        default: '',
      },
      {
        label: t('receivedSignalInDbmOk?'),
        value: 'certifications.diagnostic.pon',
        default: '',
      },
      {
        label: t('wanDiagnosticOk?'),
        value: 'certifications.diagnostic.wan',
        default: '',
      },
      {
        label: t('ipvxOk?', {x: 4}),
        value: 'certifications.diagnostic.ipv4',
        default: '',
      },
      {
        label: t('ipvxOk?', {x: 6}),
        value: 'certifications.diagnostic.ipv6',
        default: '',
      },
      {
        label: t('dnsOk?'),
        value: 'certifications.diagnostic.dns',
        default: '',
      },
      {
        label: t('licensingOk?'),
        value: 'certifications.diagnostic.anlix',
        default: '',
      },
      {
        label: t('flashmanRegisterOk?'),
        value: 'certifications.diagnostic.flashman',
        default: '',
      },
      {
        label: t('tr069ConfigApplied?'),
        value: 'certifications.didConfigureTR069',
        default: '',
      },
      {
        label: t('wifiConfigChanged?'),
        value: 'certifications.didConfigureWifi',
        default: '',
      },
      {
        label: t('speedTestEnabled'),
        value: 'certifications.diagnostic.speedtest',
        default: '',
      },
      {
        label: t('speedTestResultsMbps'),
        value: 'certifications.diagnostic.speedValue',
        default: '',
      },
      {
        label: t('speedTestLimitMbps'),
        value: 'certifications.diagnostic.speedTestLimit',
        default: '',
      },
      {
        label: t('connectionTypeInWan'),
        value: 'certifications.routerConnType',
        default: '',
      },
      {
        label: t('pppoeUser'),
        value: 'certifications.pppoeUser',
        default: '',
      },
      {
        label: t('bridgeModeIpAddress'),
        value: 'certifications.bridgeIP',
        default: '',
      },
      {
        label: t('bridgeModeGateway'),
        value: 'certifications.bridgeGateway',
        default: '',
      },
      {
        label: t('bridgeModeDnsAddress'),
        value: 'certifications.bridgeDNS',
        default: '',
      },
      {
        label: t('isDualBand?'),
        value: 'certifications.wifiConfig.hasFive',
        default: '',
      },
      {
        label: t('xGhzSsid', {x: 2.4}),
        value: 'certifications.wifiConfig.two.ssid',
        default: '',
      },
      {
        label: t('xGhzChannel', {x: 2.4}),
        value: 'certifications.wifiConfig.two.channel',
        default: '',
      },
      {
        label: t('xGhzBandwidth', {x: 2.4}),
        value: 'certifications.wifiConfig.two.band',
        default: '',
      },
      {
        label: t('xGhzOperationMode', {x: 2.4}),
        value: 'certifications.wifiConfig.two.mode',
        default: '',
      },
      {
        label: t('xGhzSsid', {x: 5}),
        value: 'certifications.wifiConfig.five.ssid',
        default: '',
      },
      {
        label: t('xGhzChannel', {x: 5}),
        value: 'certifications.wifiConfig.five.channel',
        default: '',
      },
      {
        label: t('xGhzBandwidth', {x: 5}),
        value: 'certifications.wifiConfig.five.band',
        default: '',
      },
      {
        label: t('xGhzOperationMode', {x: 5}),
        value: 'certifications.wifiConfig.five.mode',
        default: '',
      },
      {
        label: t('hasMeshBeenConfigured'),
        value: 'certifications.didConfigureMesh',
        default: '',
      },
      {
        label: t('configuredMeshMode'),
        value: 'certifications.mesh.mode',
        default: '',
      },
      {
        label: t('contractNumber'),
        value: 'certifications.contract',
        default: '',
      },
      {
        label: t('observations'),
        value: 'certifications.observations',
        default: '',
      },

      {
        label: t('certificateLatitute'),
        value: 'certifications.latitude',
        default: '',
      },
      {
        label: t('certificateLongitude'),
        value: 'certifications.longitude',
        default: '',
      },
    ];
    const transforms = (item) => {
      if (item.certifications.diagnostic) {
        if (item.certifications.diagnostic.pon === -1) {
          item.certifications.diagnostic.pon = '';
        } else if (item.certifications.diagnostic.pon === 0) {
          item.certifications.diagnostic.pon = 'ok';
        } else if (item.certifications.diagnostic.pon >= 0) {
          item.certifications.diagnostic.pon = 'erro';
        }
      }
      if (item.certifications.mesh) {
        if (item.certifications.mesh.mode === 0) {
          item.certifications.mesh.mode = '';
        } else if (item.certifications.mesh.mode === 1) {
          item.certifications.mesh.mode = 'cabo';
        } else if (item.certifications.mesh.mode === 2) {
          item.certifications.mesh.mode = 'cabo e wi-fi 2.4';
        } else if (item.certifications.mesh.mode === 3) {
          item.certifications.mesh.mode = 'cabo e wi-fi 5.0';
        } else if (item.certifications.mesh.mode === 4) {
          item.certifications.mesh.mode = 'cabo e ambos wi-fi';
        }
      }
      item.certifications.localEpochTimestamp =
        new Date(item.certifications.localEpochTimestamp);
      return item;
    };
    const json2csvParser = new Parser({fields, transforms});
    const certificationsCsv = json2csvParser.parse(deviceCertifications);

    return res
      .set('Content-Type', 'text/csv')
      .status(200)
      .send(certificationsCsv);
  } else if (deviceCertifications.length >= 1) {
    return res.status(200).json({
      success: true,
      deviceCertifications: deviceCertifications,
    });
  } else if (deviceCertifications.length <= 0) {
    return res.status(404).json({
      success: true,
      deviceCertifications: t('certificatesNotFound', {errorline: __line}),
    });
  }

  return res.status(500).json({
    success: false,
    error: t('certificatesNotFound', {errorline: __line}),
  });
};

module.exports = userController;
