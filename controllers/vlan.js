let User = require('../models/user');
let Config = require('../models/config');
let Device = require('../models/device');
const Role = require('../models/role');

let vlanController = {};

vlanController.showVlanProfiles = function(req, res) {
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

            return res.render('showvlanprofiles', indexContent);
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


vlanController.getAllVlanProfiles = function(req, res) {
  next();
};

vlanController.addVlanProfile = function(req, res) {
  next();
};

vlanController.editVlanProfile = function(req, res) {
  next();
};

vlanController.removeVlanProfile = function(req, res) {
  next();
};

module.exports = vlanController;
