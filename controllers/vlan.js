/* eslint-disable max-len, camelcase */

const mqtt = require('../mqtts');
let User = require('../models/user');
let Config = require('../models/config');
let DeviceModel = require('../models/device');
const DeviceVersion = require('../models/device_version');
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

vlanController.updateVlanProfile = function(req, res) {
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

            let exist_vlan_profile = false;

            for (let i = 0; i < matchedConfig.vlans_profiles.length; i++) {
              if (matchedConfig.vlans_profiles[i].vlan_id == req.params.vid) {
                exist_vlan_profile = true;
                indexContent.vlanprofile = matchedConfig.vlans_profiles[i];
              }
            }

            if (exist_vlan_profile) {
              return res.render('vlanprofile', indexContent);
            } else {
              indexContent.type = 'danger';
              indexContent.message = 'VLAN ID não encontrado';
              return res.render('error', indexContent);
            }
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
  Config.findOne({is_default: true}, function(err, config) {
    if (err) {
      return res.json({success: false, type: 'danger',
                       message: 'Erro ao buscar perfis de VLAN'});
    } else {
      return res.json({success: true, type: 'success', vlanProfiles: config.vlans_profiles});
    }
  });
};

vlanController.addVlanProfile = async function(req, res) {
  let newVlanProfile = {vlan_id: req.body.id, profile_name: req.body.name};
  
  // restricted to this range of value by the definition of 802.1q protocol
  // vlan 2 is restricted to wan
  if (newVlanProfile.vlan_id != 1 && (newVlanProfile.vlan_id < 3 || newVlanProfile.vlan_id > 4094)) {
    return res.json({success: false, type: 'danger', message: 'O VLAN ID não pode ser menor que 3 ou maior que 4094!'});
  }
  if (/^[A-Za-z][A-Za-z\-0-9_]+$/.test(newVlanProfile.profile_name) == false) {
    return res.json({success: false, type: 'danger', message: 'O nome do Perfil de VLAN deve começar com um caractere do alfabeto, conter caracteres alfanuméricos, hífen ou sublinhado, não pode ser vazio e deve ser distinto dos já existentes!'});
  }
  if (newVlanProfile.profile_name.length > 32) {
    return res.json({success: false, type: 'danger', message: 'Nome do Perfil de VLAN não deve ser maior do que 32 caracteres!'});
  }

  let config = await Config.findOne({is_default: true}).catch(function(rej) {
    return res.json({success: false, type: 'danger', message: rej.message});
  });
  if (config && config.vlans_profiles) {
    let is_vlan_id_unique = true;
    let is_profile_name_unique = true;
    for (let i = 0; i < config.vlans_profiles.length; i++) {
      if (config.vlans_profiles[i].vlan_id == newVlanProfile.vlan_id) {
        is_vlan_id_unique = false;
      }
      if (config.vlans_profiles[i].profile_name == newVlanProfile.profile_name) {
        is_profile_name_unique = false;
      }
    }
    if (is_vlan_id_unique && is_profile_name_unique) {
      config.vlans_profiles.push(newVlanProfile);
      config.save().then(function() {
        return res.json({success: true, type: 'success', message: 'Perfil de VLAN criado com sucesso!'});
      }).catch(function(rej) {
        return res.json({success: false, type: 'danger', message: rej.message});
      });
    } else if (!is_vlan_id_unique) {
      return res.json({success: false, type: 'danger', message: 'Já existe um perfil de VLAN com esse ID fornecido!'});
    } else if (!is_profile_name_unique) {
      return res.json({success: false, type: 'danger', message: 'Já existe um perfil de VLAN com esse nome fornecido!'});
    }
  } else {
    return res.json({success: false, type: 'danger', message: 'Erro ao acessar a configuração ao adicionar perfil de VLAN'});
  }
};

vlanController.editVlanProfile = async function(req, res) {
  let config = await Config.findOne({is_default: true}).catch(function(rej) {
    return res.json({success: false, type: 'danger', message: rej.message});
  });
  if (config && config.vlans_profiles) {
    let exist_vlan_profile = false;
    for (let i = 0; i < config.vlans_profiles.length; i++) {
      if (/^[A-Za-z][A-Za-z\-0-9_]+$/.test(req.body.profilename) == false) {
        return res.json({success: false, type: 'danger', message: 'O nome do Perfil de VLAN deve começar com um caractere do alfabeto, conter caracteres alfanuméricos, hífen ou sublinhado, não pode ser vazio e deve ser distinto dos já existentes!'});
      }
      if (req.body.profilename.length > 32) {
        return res.json({success: false, type: 'danger', message: 'Nome do Perfil de VLAN não deve ser maior do que 32 caracteres!'});
      }
      if (config.vlans_profiles[i].profile_name === req.body.profilename) {
        return res.json({success: false, type: 'danger', message: 'Nome do Perfil de VLAN deve ser distinto dos já existentes!'});
      }

      if (config.vlans_profiles[i].vlan_id == parseInt(req.params.vid)) {
        exist_vlan_profile = true;

        config.vlans_profiles[i].profile_name = req.body.profilename;
      }
    }

    if (exist_vlan_profile) {
      config.save().then(function() {
        return res.json({success: true, type: 'success', message: 'Perfil de VLAN atualizado com sucesso!'});
      }).catch(function(rej) {
        return res.json({success: false, type: 'danger', message: rej.message});
      });
    } else {
      return res.json({success: false, type: 'danger', message: 'VLAN ID não foi encontrado!'});
    }
  } else {
    res.json({success: false, type: 'danger', message: config});
  }
};

vlanController.removeVlanProfile = async function(req, res) {
  let config = await Config.findOne({is_default: true}).catch(function(rej) {
    return res.json({success: false, type: 'danger', message: rej.message});
  });
  if (config) {
    if (typeof req.body.ids === 'string') {
      req.body.ids = [req.body.ids];
    }

    config.vlans_profiles = config.vlans_profiles.filter((obj) => !req.body.ids.includes(obj.vlan_id.toString()) && !req.body.ids.includes(obj._id.toString()));

    config.save().then(function() {
      return res.json({success: true, type: 'success', message: 'Perfis de VLAN deletados com sucesso!'});
    }).catch(function(rej) {
      return res.json({success: false, type: 'danger', message: rej.message});
    });
  } else {
    res.json({success: false, type: 'danger', message: config});
  }
};

vlanController.getVlans = function(req, res) {
  DeviceModel.findById(req.params.deviceid, function(err, matchedDevice) {
    if (err || !matchedDevice) {
      console.log(err);
      return res.json({success: false, type: 'danger', message: 'Erro ao encontrar dispositivo'});
    } else {
      return res.json({success: true, type: 'success', vlan: matchedDevice.vlan});
    }
  });
};

vlanController.updateVlans = async function(req, res) {
  let device = await DeviceModel.findById(req.params.deviceid).catch(function(rej) {
    return res.json({success: false, type: 'danger', message: rej.message});
  });
  if (device) {
    let is_vlans_valid = true;
    req.body.vlans = JSON.parse(req.body.vlans);

    if (Array.isArray(req.body.vlans)) {
      for (let v of req.body.vlans) {
        if (v.port !== undefined || v.vlan_id !== undefined) {
          // restricted to this range of value by the definition of 802.1q protocol
          // vlan 2 is restricted to wan
          if (typeof v.port !== 'number' || v.port < 1 || v.port > 4 ||
            typeof v.vlan_id !== 'number' || v.vlan_id < 1 || v.vlan_id > 4094 || v.vlan_id == 2) {
            is_vlans_valid = false;
          }
        } else {
          is_vlans_valid = false;
        }
      }
    } else {
      is_vlans_valid = false;
    }

    if (is_vlans_valid) {
      device.vlan = req.body.vlans;

      mqtt.anlixMessageRouterUpdate(device._id);

      device.save().then(function() {
        return res.json({success: true, type: 'success', message: 'VLANs do dispositivo '+req.params.deviceid+' atualizada com sucesso!'});
      }).catch(function(rej) {
        return res.json({success: false, type: 'danger', message: rej.message});
      });
    } else {
      return res.json({success: false, type: 'danger', message: 'Formato de VLANs inválido!'});
    }
  } else {
    res.json({success: false, type: 'danger', message: 'Dispositivo não encontrado.'});
  }
};

vlanController.retrieveVlansToDevice = function(device) {
  /*
    lack the sync by hash
  */

  let retObj = {};

  let device_info = DeviceVersion.getDeviceInfo(device.model);

  let lan_ports = device_info['lan_ports'];
  let wan_port = device_info['wan_port'];
  let cpu_port = device_info['cpu_port'];
  let vlan_of_lan = '1';
  let vlan_of_wan = '2';
  if (device_info['soc'] === 'realtek') {
    vlan_of_lan = '9';
    vlan_of_wan = '8';
  }

  // in bridge mode there is no particular vlan configuration
  if (device.bridge_mode_enabled) {
    let bridge_vlan_config = '';

    // if lan ports are enabled, add them to vid 1 config
    if (!device.bridge_mode_switch_disable) {
      for (let i = 0; i < lan_ports.length; i++) {
        bridge_vlan_config += lan_ports[i].toString()+' ';
      }
    }
    bridge_vlan_config += wan_port.toString()+' ';
    bridge_vlan_config += cpu_port.toString();
    if (device_info['soc'] !== 'realtek') {
      bridge_vlan_config += 't';
    }
    if (device_info['soc'] !== 'realtek') {
      retObj[vlan_of_lan] = bridge_vlan_config;
    } else {
      retObj[vlan_of_wan] = bridge_vlan_config;
    }
  } else {
    // on well behavior object of vlan that needs to treat others vlans
    let vlan_ports = '';
    let aux_idx; // auxiliar index to toggle vid 1 or 9
    if (device.vlan !== undefined && device.vlan.length > 0) {
      // initialize keys values with empty string
      for (let i = 0; i < device.vlan.length; i++) {
        // check vlan_id to pass the right vid in case device is realtek or not
        aux_idx = ((device.vlan[i].vlan_id === '1') ? vlan_of_lan : device.vlan[i].vlan_id);

        retObj[aux_idx] = '';
      }

      // put on every key an append to the value as the matching port
      for (let i = 0; i < device.vlan.length; i++) {
        // check vlan_id to pass the right vid in case device is realtek or not
        aux_idx = ((device.vlan[i].vlan_id === '1') ? vlan_of_lan : device.vlan[i].vlan_id);

        if (aux_idx == '1' || aux_idx == '9') {
          retObj[aux_idx] += lan_ports[device.vlan[i].port-1].toString()+' ';
        } else {
          retObj[aux_idx] += lan_ports[device.vlan[i].port-1].toString()+'t ';

          vlan_ports += lan_ports[device.vlan[i].port-1].toString()+' ';
        }
      }

      // put the tagged ports
      for (let key in retObj) {
        if (key === '1' || key === '9') {
          retObj[key] += cpu_port.toString()+'t';
        } else {
          retObj[key] += wan_port.toString()+'t';
        }
      }
    } else {
    // in the case of misconfiguration or none configuration of vlan at all, set the default configuration for vlan
      let classic_vlan_config = '';
      for (let i = 0; i < lan_ports.length; i++) {
        classic_vlan_config += lan_ports[i].toString()+' ';
      }
      classic_vlan_config += cpu_port.toString()+'t';
      retObj[vlan_of_lan] = classic_vlan_config;
    }

    retObj[vlan_of_wan] = wan_port.toString() + ' ' + vlan_ports + cpu_port.toString() + 't';
  }
  console.log('retObj -> ', retObj);

  return retObj;
};

module.exports = vlanController;
