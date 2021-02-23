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

      if (req.user.is_superuser || indexContent.role.grantVlanProfileEdit) {
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

vlanController.getVlanProfile = function(req, res) {
  next();
};

vlanController.getAllVlanProfiles = function(req, res) {
  Config.findOne({is_default: true}, function(err, config) {
    if(err) {
      return res.json({success: false, type: 'danger',
                       message: 'Erro ao buscar perfis de VLAN'});
    }
    else {
      return res.json({success: true, type: 'success', vlanProfiles: config.vlans_profiles});
    }
  });
};

vlanController.addVlanProfile = async function(req, res) {
  let newVlanProfile = {vlan_id : req.body.id, profile_name : req.body.name};
  try {
    let config = await Config.findOne({is_default: true}).catch(function(rej) {
      res.json({success: false, type: 'danger', message : rej.message});
    });
    if(config && config.vlans_profiles) {
      config.vlans_profiles.push(newVlanProfile);
      config.save().then(function() {
        res.json({ success: true, type: 'success', message: 'Perfil de VLAN criado com sucesso!'});
      }).catch(function(rej) {
        res.json({success: false, type: 'danger', message : rej.message});
      });
    }
    else {
      res.json({success: false, type: 'danger', message : "Erro ao acessar a configuração ao adicionar perfil de VLAN"});
    }
  }
  catch {
    res.json({message : "Erro ao acessar a configuração ao adicionar perfil de VLAN"});
  }
};

vlanController.editVlanProfile = async function(req, res) {
  next();
};

vlanController.removeVlanProfile = async function(req, res) {
  try {
    let config = await Config.findOne({is_default: true}).catch(function(rej) {
      res.json({success: false, type: 'danger', message : rej.message});
    });
    if(config && config.vlans_profiles) {
      var is_to_delete, i, where_to_delete;
      
      for(i = 0; i < req.body.ids.length ; i++) {
        is_to_delete = false;
        where_to_delete = 0;
        for(j = 0; j < config.vlans_profiles.length ; j++) {
          if(config.vlans_profiles[j]._id.toString() === req.body.ids[i]) {
            is_to_delete = true;
            where_to_delete = j;
          }
        }
        if(is_to_delete) {
          config.vlans_profiles.splice(where_to_delete, 1);
        }
      }
      config.save().then(function() {
        res.json({ success: true, type: 'success', message: 'Perfis de VLAN deletados com sucesso!'});
      }).catch(function(rej) {
        res.json({success: false, type: 'danger', message : rej.message});
      });
    }
    else {
      res(500).json({success: false, type: 'danger', message : config});
    }
  }
  catch {
    res.json({success: false, type: 'danger', message : "Erro ao acessar a configuração ao remover perfil de VLAN"});
  }
};

module.exports = vlanController;
