
const User = require('../models/user');
const Role = require('../models/role');
const Config = require('../models/config');
const Notification = require('../models/notification');
const controlApi = require('./external-api/control');

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
    console.log('Error creating user: ' + err);
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
    grantLanDevices: parseInt(req.body['grant-lan-devices']),
    grantLanDevicesBlock: req.body['grant-lan-devices-block'],
    grantSiteSurvey: req.body['grant-site-survey'],
    grantMeasureDevices: parseInt(req.body['grant-measure-devices']),
    grantCsvExport: req.body['grant-csv-export'],
    grantWanBytesView: req.body['grant-wan-bytes'],
    grantSearchLevel: parseInt(req.body['grant-search-level']),
    grantShowSearchSummary: req.body['grant-search-summary'],
    grantFirmwareBetaUpgrade: req.body['grant-firmware-beta-upgrade'],
    grantFirmwareRestrictedUpgrade: req.body['grant-firmware-restricted-upgrade'],
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

userController.getUsers = function(req, res) {
  User.find(function(err, users) {
    if (err) {
      return res.json({success: false, type: 'danger', message: err});
    }
    return res.json({success: true, type: 'success', users: users});
  });
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
    role.grantLanDevices = parseInt(req.body['grant-lan-devices']);
    role.grantLanDevicesBlock = req.body['grant-lan-devices-block'];
    role.grantSiteSurvey = req.body['grant-site-survey'];
    role.grantMeasureDevices = parseInt(req.body['grant-measure-devices']);
    role.grantCsvExport = req.body['grant-csv-export'];
    role.grantWanBytesView = req.body['grant-wan-bytes'];
    role.grantSearchLevel = parseInt(req.body['grant-search-level']);
    role.grantShowSearchSummary = req.body['grant-search-summary'];
    role.grantFirmwareBetaUpgrade = req.body['grant-firmware-beta-upgrade'];
    role.grantFirmwareRestrictedUpgrade = req.body['grant-firmware-restricted-upgrade'];

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
    if (err || !users) {
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
        if (err || !roles) {
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
        let active = matchedConfig.measure_configs.is_active;
          indexContent.measure_active = active;
          indexContent.measure_token = (active) ?
              matchedConfig.measure_configs.auth_token : '';
        let license = matchedConfig.measure_configs.is_license_active;
        indexContent.measure_license = license;
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
              let active = matchedConfig.measure_configs.is_active;
                indexContent.measure_active = active;
                indexContent.measure_token = (active) ?
                    matchedConfig.measure_configs.auth_token : '';
              let license = matchedConfig.measure_configs.is_license_active;
              indexContent.measure_license = license;
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
              let active = matchedConfig.measure_configs.is_active;
                indexContent.measure_active = active;
                indexContent.measure_token = (active) ?
                    matchedConfig.measure_configs.auth_token : '';
              let license = matchedConfig.measure_configs.is_license_active;
              indexContent.measure_license = license;
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
            let active = matchedConfig.measure_configs.is_active;
              indexContent.measure_active = active;
              indexContent.measure_token = (active) ?
                  matchedConfig.measure_configs.auth_token : '';
            let license = matchedConfig.measure_configs.is_license_active;
            indexContent.measure_license = license;
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

module.exports = userController;
