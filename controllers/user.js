const User = require('../models/user');
const Role = require('../models/role');
const Config = require('../models/config');
const Notification = require('../models/notification');
const controlApi = require('./external-api/control');
const {Parser, transforms: {unwind}} = require('json2csv');

let userController = {};

userController.changePassword = function(req, res) {
  Role.findOne({name: req.user.role}, function(err, role) {
    return res.render('changepassword',
                      {user: req.user,
                       username: req.user.name,
                       message: 'Sua senha expirou. Insira uma nova senha',
                       type: 'danger',
                       superuser: req.user.is_superuser,
                       role: role});
  });
};

userController.changeElementsPerPage = function(req, res) {
  if (isNaN(parseInt(req.body.elementsperpage))) {
    return res.json({
      type: 'danger',
      message: 'Valor inválido',
    });
  }
  // Use the User model to find a specific user
  User.findById(req.user._id, function(err, user) {
    if (err) {
      return res.json({
        type: 'danger',
        message: 'Erro ao encontrar usuário',
      });
    }

    user.maxElementsPerPage = req.body.elementsperpage;
    user.save(function(err) {
      if (err) {
        return res.json({
          type: 'danger',
          message: 'Erro gravar alteração',
        });
      }
      return res.json({
        type: 'success',
        message: 'Alteração feita com sucesso!',
      });
    });
  });
};

userController.changeVisibleColumnsOnPage = function(req, res) {
  if (!Array.isArray(req.body.visiblecolumnsperpage)) {
    return res.json({
      type: 'danger',
      message: 'Valor inválido',
    });
  }
  // Use the User model to find a specific user
  User.findById(req.user._id, function(err, user) {
    if (err) {
      return res.json({
        type: 'danger',
        message: 'Erro ao encontrar usuário',
      });
    }

    user.visibleColumnsOnPage = req.body.visiblecolumnsperpage;
    user.save(function(err) {
      if (err) {
        return res.json({
          type: 'danger',
          message: 'Erro gravar alteração',
        });
      }
      return res.json({
        type: 'success',
        message: 'Alteração feita com sucesso!',
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
      message: 'Erro ao criar usuário. ' +
               'O nome não pode conter mais de 23 caracteres.',
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
        message: 'Erro ao criar usuário. Verifique se o usuário já existe.',
      });
    }
    return res.json({
      success: true,
      type: 'success',
      message: 'Usuário criado com sucesso!',
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
    grantWanBytesView: req.body['grant-wan-bytes'],
    grantSearchLevel: parseInt(req.body['grant-search-level']),
    grantShowSearchSummary: req.body['grant-search-summary'],
    grantFirmwareBetaUpgrade: req.body['grant-firmware-beta-upgrade'],
    grantFirmwareRestrictedUpgrade:
      req.body['grant-firmware-restricted-upgrade'],
  });

  if (role.grantFirmwareRestrictedUpgrade && !role.grantFirmwareUpgrade) {
    console.log('Role conflict error');
    return res.json({
      success: false,
      type: 'danger',
      message: 'Erro de conflito de classe: Controle de Atualização ' +
               'de Firmware Restrita sem Controle de Atualização de Firmware',
    });
  } else if (role.grantFirmwareBetaUpgrade && !role.grantFirmwareUpgrade) {
    console.log('Role conflict error');
    return res.json({
      success: false,
      type: 'danger',
      message: 'Erro de conflito de classe: Controle de Atualização ' +
               'de Firmware Beta sem Controle de Atualização de Firmware',
    });
  }

  role.save(function(err) {
    if (err) {
      console.log('Error creating role: ' + err);
      return res.json({
        success: false,
        type: 'danger',
        message: 'Erro ao criar classe. Verifique se já existe.',
      });
    }
    return res.json({
      success: true,
      type: 'success',
      message: 'Classe de permissões criada com sucesso!',
    });
  });
};

userController.getUsers = async function(req, res) {
  try {
    let users = await User.find().lean().exec();
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
  Role.find(function(err, roles) {
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
        message: 'Erro ao encontrar usuário',
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
          message: 'As senhas estão diferentes',
        });
      }
    }

    Role.findOne({name: req.user.role}, function(err, role) {
      if (err || (!role && !req.user.is_superuser)) {
        return res.status(500).json({
          success: false,
          type: 'danger',
          message: 'Erro ao salvar alterações',
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
              message: 'Erro ao salvar alterações',
            });
          } else {
            return res.json({
              success: true,
              type: 'success',
              message: 'Editado com sucesso!',
            });
          }
        });
      } else {
        return res.status(403).json({
          success: false,
          type: 'danger',
          message: 'Permissão negada',
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
        message: 'Erro ao encontrar classe.',
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
    role.grantWanBytesView = req.body['grant-wan-bytes'];
    role.grantSearchLevel = parseInt(req.body['grant-search-level']);
    role.grantShowSearchSummary = req.body['grant-search-summary'];
    role.grantFirmwareBetaUpgrade = req.body['grant-firmware-beta-upgrade'];
    role.grantFirmwareRestrictedUpgrade =
      req.body['grant-firmware-restricted-upgrade'];

    if (role.grantFirmwareRestrictedUpgrade && !role.grantFirmwareUpgrade) {
      console.log('Role conflict error');
      return res.json({
        success: false,
        type: 'danger',
        message: 'Erro de conflito de classe: Controle de Atualização ' +
                 'de Firmware Restrita sem Controle de Atualização de Firmware',
      });
    } else if (role.grantFirmwareBetaUpgrade && !role.grantFirmwareUpgrade) {
      console.log('Role conflict error');
      return res.json({
        success: false,
        type: 'danger',
        message: 'Erro de conflito de classe: Controle de Atualização ' +
                 'de Firmware Beta sem Controle de Atualização de Firmware',
      });
    }

    role.save(function(err) {
      if (err) {
        console.log('Error saving role: ' + err);
        return res.json({
          success: false,
          type: 'danger',
          message: 'Erro ao editar classe.',
        });
      }
      return res.json({
        success: true,
        type: 'success',
        message: 'Classe de permissões editada com sucesso!',
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
      message: 'Erro interno ao deletar certificações. '+
      'Entre em contato com o desenvolvedor',
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
      if (!user) throw ('Usuário não existe');
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
      message: 'Certificações deletadas com sucesso',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      type: 'danger',
      message: 'Erro interno ao deletar certificações. ' +
               'Entre em contato com o desenvolvedor',
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
        message: 'Erro interno ao deletar usuário(s). ' +
        'Entre em contato com o desenvolvedor',
      });
    }
    users.forEach((user) => {
      user.remove();
    });
    return res.json({
      success: true,
      type: 'success',
      message: 'Usuário(s) deletado(s) com sucesso!',
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
            message: 'Erro interno ao deletar classe(s). ' +
            'Entre em contato com o desenvolvedor',
          });
        }
        roles.forEach((role) => {
          role.remove();
        });
        return res.json({
          success: true,
          type: 'success',
          message: 'Classe(s) deletada(s) com sucesso!',
        });
      });
    } else {
      return res.json({
        success: false,
        type: 'danger',
        message: 'Erro ao deletar classe(s). ' +
        'Uma ou mais classes ainda estão em uso por seus usuários.',
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
    Config.findOne({is_default: true}, function(err, matchedConfig) {
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
          indexContent.message = 'Erro ao acessar base de dados';
          return res.render('error', indexContent);
        }
        let userRole = roles.find(function(role) {
          return role.name === req.user.role;
        });
        if (typeof userRole === 'undefined' && !req.user.is_superuser) {
          indexContent.type = 'danger';
          indexContent.message = 'Permissão não encontrada';
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
      indexContent.message = 'Permissão não encontrada';
      return res.render('error', indexContent);
    }
    let userRole = roles.find(function(role) {
      return role.name === req.user.role;
    });
    if (typeof userRole === 'undefined' && !req.user.is_superuser) {
      indexContent.type = 'danger';
      indexContent.message = 'Permissão não encontrada';
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

          Config.findOne({is_default: true}, function(err, matchedConfig) {
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
        indexContent.message = 'Permissão negada';
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
      indexContent.message = 'Permissão não encontrada';
      return res.render('error', indexContent);
    }
    let userRole = roles.find(function(role) {
      return role.name === req.user.role;
    });
    if (typeof userRole === 'undefined' && !req.user.is_superuser) {
      indexContent.type = 'danger';
      indexContent.message = 'Permissão não encontrada';
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

          Config.findOne({is_default: true}, function(err, matchedConfig) {
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
        indexContent.message = 'Permissão negada';
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
      indexContent.message = 'Permissão não encontrada';
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

        Config.findOne({is_default: true}, function(err, matchedConfig) {
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
      indexContent.message = 'Permissão negada';
      return res.render('error', indexContent);
    }
  });
};

userController.setUserCrudTrap = function(req, res) {
  // Store callback URL for users
  Config.findOne({is_default: true}, function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao acessar dados na base',
      });
    } else {
      if ('url' in req.body) {
        matchedConfig.traps_callbacks.user_crud.url = req.body.url;

        if ('user' in req.body && 'secret' in req.body) {
          matchedConfig.traps_callbacks.user_crud.user = req.body.user;
          matchedConfig.traps_callbacks.user_crud.secret = req.body.secret;
        }
        matchedConfig.save((err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Erro ao gravar dados na base',
            });
          }
          return res.status(200).json({
            success: true,
            message: 'Endereço salvo com sucesso',
          });
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Formato invalido',
        });
      }
    }
  });
};

userController.setRoleCrudTrap = function(req, res) {
  // Store callback URL for roles
  Config.findOne({is_default: true}, function(err, matchedConfig) {
    if (err || !matchedConfig) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao acessar dados na base',
      });
    } else {
      if ('url' in req.body) {
        matchedConfig.traps_callbacks.role_crud.url = req.body.url;
        if ('user' in req.body && 'secret' in req.body) {
          matchedConfig.traps_callbacks.role_crud.user = req.body.user;
          matchedConfig.traps_callbacks.role_crud.secret = req.body.secret;
        }
        matchedConfig.save((err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Erro ao gravar dados na base',
            });
          }
          return res.status(200).json({
            success: true,
            message: 'Endereço salvo com sucesso',
          });
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Formato invalido',
        });
      }
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
            'message': 'A conta Anlix de seu provedor está bloqueada. ' +
                       'Verifique se há faturas vencidas e entre em ' +
                       'contato com seu representante comercial',
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
    return {success: false, message: 'Erro ao verificar status'};
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
    Config.findOne({is_default: true}, function(err, matchedConfig) {
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
          indexContent.message = 'Erro ao acessar base de dados';
          return res.render('error', indexContent);
        }
        let userRole = roles.find(function(role) {
          return role.name === req.user.role;
        });
        if (typeof userRole === 'undefined' && !req.user.is_superuser) {
          indexContent.type = 'danger';
          indexContent.message = 'Permissão não encontrada';
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
        error: 'Failed to query users',
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
      {label: 'Técnico', value: 'name', default: ''},
      {label: 'Concluído', value: 'certifications.finished', default: ''},
      {
        label: 'Motivo de interrupção na certificação',
        value: 'certifications.cancelReason',
        default: '',
      },
      {label: 'Identificador único', value: 'certifications.mac', default: ''},
      {label: 'CPE TR-069?', value: 'certifications.isOnu', default: ''},
      {label: 'Modelo', value: 'certifications.routerModel', default: ''},
      {
        label: 'Versão do firmware da CPE',
        value: 'certifications.routerVersion',
        default: '',
      },
      {
        label: 'Release/Versão do hardware',
        value: 'certifications.routerRelease',
        default: '',
      },
      {
        label: 'Data do atendimento',
        value: 'certifications.localEpochTimestamp',
        default: '',
      },
      {
        label: 'Foi diagnosticado',
        value: 'certifications.didDiagnose',
        default: '',
      },
      {
        label: 'Nível de sinal recebido na CPE em dBm',
        value: 'certifications.diagnostic.rxpower',
        default: '',
      },
      {
        label: 'Sinal recebido em dBm ok?',
        value: 'certifications.diagnostic.pon',
        default: '',
      },
      {
        label: 'Diagnostico da WAN ok?',
        value: 'certifications.diagnostic.wan',
        default: '',
      },
      {
        label: 'IPv4 ok?',
        value: 'certifications.diagnostic.ipv4',
        default: '',
      },
      {
        label: 'IPv6 ok?',
        value: 'certifications.diagnostic.ipv6',
        default: '',
      },
      {
        label: 'DNS ok?',
        value: 'certifications.diagnostic.dns',
        default: '',
      },
      {
        label: 'Licenciamento ok?',
        value: 'certifications.diagnostic.anlix',
        default: '',
      },
      {
        label: 'Registro no flashman ok?',
        value: 'certifications.diagnostic.flashman',
        default: '',
      },
      {
        label: 'Configuração TR-069 foi aplicada?',
        value: 'certifications.didConfigureTR069',
        default: '',
      },
      {
        label: 'Configuração Wi-Fi foi alterada?',
        value: 'certifications.didConfigureWifi',
        default: '',
      },
      {
        label: 'Teste de velocidade habilitado',
        value: 'certifications.diagnostic.speedtest',
        default: '',
      },
      {
        label: 'Resultado do teste de velocidade (Mbps)',
        value: 'certifications.diagnostic.speedValue',
        default: '',
      },
      {
        label: 'Valor limite do teste de velocidade (Mbps)',
        value: 'certifications.diagnostic.speedTestLimit',
        default: '',
      },
      {
        label: 'Tipo de conexão na WAN',
        value: 'certifications.routerConnType',
        default: '',
      },
      {
        label: 'Usuario PPPoE',
        value: 'certifications.pppoeUser',
        default: '',
      },
      {
        label: 'Modo bridge: Endereço de IP',
        value: 'certifications.bridgeIP',
        default: '',
      },
      {
        label: 'Modo bridge: Gateway',
        value: 'certifications.bridgeGateway',
        default: '',
      },
      {
        label: 'Modo bridge: Endereço de DNS',
        value: 'certifications.bridgeDNS',
        default: '',
      },
      {
        label: 'É dual band?',
        value: 'certifications.wifiConfig.hasFive',
        default: '',
      },
      {
        label: 'SSID 2.4GHz',
        value: 'certifications.wifiConfig.two.ssid',
        default: '',
      },
      {
        label: 'Canal 2.4GHz',
        value: 'certifications.wifiConfig.two.channel',
        default: '',
      },
      {
        label: 'Largura de banda 2.4GHz',
        value: 'certifications.wifiConfig.two.band',
        default: '',
      },
      {
        label: 'Modo de operação 2.4GHz',
        value: 'certifications.wifiConfig.two.mode',
        default: '',
      },
      {
        label: 'SSID 5GHz',
        value: 'certifications.wifiConfig.five.ssid',
        default: '',
      },
      {
        label: 'Canal 5GHz',
        value: 'certifications.wifiConfig.five.channel',
        default: '',
      },
      {
        label: 'Largura de banda 5GHz',
        value: 'certifications.wifiConfig.five.band',
        default: '',
      },
      {
        label: 'Modo de operação 5GHz',
        value: 'certifications.wifiConfig.five.mode',
        default: '',
      },
      {
        label: 'Mesh foi configurado?',
        value: 'certifications.didConfigureMesh',
        default: '',
      },
      {
        label: 'Modo mesh configurado',
        value: 'certifications.mesh.mode',
        default: '',
      },
      {
        label: 'CPF/CNPJ/Número de contrato',
        value: 'certifications.contract',
        default: '',
      },
      {
        label: 'Observações',
        value: 'certifications.observations',
        default: '',
      },

      {
        label: 'Latitude no momento da certificação',
        value: 'certifications.latitude',
        default: '',
      },
      {
        label: 'Longitude no momento da certificação',
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
      deviceCertifications: 'No certifications found!',
    });
  }

  return res.status(500).json({
    success: false,
    error: 'Error on query user certifications',
  });
};

module.exports = userController;
