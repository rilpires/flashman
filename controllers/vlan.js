/* eslint-disable camelcase */

const mqtt = require('../mqtts');
let User = require('../models/user');
let Config = require('../models/config');
let DeviceModel = require('../models/device');
const DeviceVersion = require('../models/device_version');
const Role = require('../models/role');
const crypto = require('crypto');
const util = require('./handlers/util');

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
      return res.json({success: true, type: 'success',
                       vlanProfiles: config.vlans_profiles});
    }
  });
};

vlanController.addVlanProfile = async function(req, res) {
  let newVlanProfile = {vlan_id: req.body.id, profile_name: req.body.name};

  // restricted to this range of value by the definition of 802.1q protocol
  // vlan 2 is restricted to wan
  if (newVlanProfile.vlan_id != 1 &&
     (newVlanProfile.vlan_id < 3 || newVlanProfile.vlan_id > 4094)) {
    return res.json({
      success: false,
      type: 'danger',
      message: 'O VLAN ID não pode ser menor que 3 ou maior que 4094!',
    });
  }
  if (/^[A-Za-z][A-Za-z\-0-9_]+$/.test(newVlanProfile.profile_name) == false) {
    return res.json({
      success: false,
      type: 'danger',
      message: 'O nome do Perfil de VLAN deve começar com um caractere ' +
               'do alfabeto, conter caracteres alfanuméricos, hífen ou ' +
               'sublinhado, não pode ser vazio e ' +
               'deve ser distinto dos já existentes!'});
  }
  if (newVlanProfile.profile_name.length > 32) {
    return res.json({
      success: false,
      type: 'danger',
      message: 'Nome do Perfil de VLAN não deve ser ' +
               'maior do que 32 caracteres!'});
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
      if (config.vlans_profiles[i].profile_name == newVlanProfile.profile_name
      ) {
        is_profile_name_unique = false;
      }
    }
    if (is_vlan_id_unique && is_profile_name_unique) {
      config.vlans_profiles.push(newVlanProfile);
      config.save().then(function() {
        return res.json({success: true, type: 'success',
                         message: 'Perfil de VLAN criado com sucesso!'});
      }).catch(function(rej) {
        return res.json({success: false, type: 'danger', message: rej.message});
      });
    } else if (!is_vlan_id_unique) {
      return res.json({
        success: false,
        type: 'danger',
        message: 'Já existe um perfil de VLAN com esse ID fornecido!'});
    } else if (!is_profile_name_unique) {
      return res.json({
        success: false,
        type: 'danger',
        message: 'Já existe um perfil de VLAN com esse nome fornecido!'});
    }
  } else {
    return res.json({
      success: false,
      type: 'danger',
      message: 'Erro ao acessar a configuração ao adicionar perfil de VLAN'});
  }
};

vlanController.editVlanProfile = async function(req, res) {
  let config = await Config.findOne({is_default: true}).catch(function(rej) {
    return res.json({success: false, type: 'danger', message: rej.message});
  });
  if (config && config.vlans_profiles) {
    let exist_vlan_profile = false;
    if (/^[A-Za-z][A-Za-z\-0-9_]+$/.test(req.body.profilename) == false) {
      return res.json({
        success: false,
        type: 'danger',
        message: 'O nome do Perfil de VLAN deve começar com ' +
                 'um caractere do alfabeto, conter caracteres ' +
                 'alfanuméricos, hífen ou sublinhado, não pode ' +
                 'ser vazio e deve ser distinto dos já existentes!'});
    }
    if (req.body.profilename.length > 32) {
      return res.json({
        success: false,
        type: 'danger',
        message: 'Nome do Perfil de VLAN não ' +
                 'deve ser maior do que 32 caracteres!'});
    }

    for (let i = 0; i < config.vlans_profiles.length; i++) {
      if (config.vlans_profiles[i].profile_name === req.body.profilename) {
        return res.json({
          success: false, type: 'danger',
          message: 'Nome do Perfil de VLAN deve ' +
                   'ser distinto dos já existentes!'});
      }

      if (config.vlans_profiles[i].vlan_id == parseInt(req.params.vid)) {
        exist_vlan_profile = true;
        config.vlans_profiles[i].profile_name = req.body.profilename;
      }
    }

    if (exist_vlan_profile) {
      config.save().then(function() {
        return res.json({
          success: true,
          type: 'success',
          message: 'Perfil de VLAN atualizado com sucesso!'});
      }).catch(function(rej) {
        return res.json({success: false, type: 'danger', message: rej.message});
      });
    } else {
      return res.json({success: false, type: 'danger',
                       message: 'VLAN ID não foi encontrado!'});
    }
  } else {
    res.json({success: false, type: 'danger', message: config});
  }
};

vlanController.checkDevicesAffected = async function(req, res) {
  let config = await Config.findOne({is_default: true}).catch(function(rej) {
    return res.json({success: false, type: 'danger', message: rej.message});
  });
  if (config) {
    let vlanProfile = config.vlans_profiles.find(
      (vlanProfile) => vlanProfile._id == req.params.profileid);
    if (typeof vlanProfile === undefined) {
      return res.json({success: false, type: 'danger',
                       message: 'Perfil de VLAN não encontrado'});
    }
    let vlanId = vlanProfile.vlan_id;

    let matchedDevices = await DeviceModel
    .find(
      {vlan: {$exists: true, $not: {$size: 0}}},
      {_id: true, vlan: true})
    .catch((err) => {
      return res.json({success: false, type: 'danger',
                       message: 'Dispositivos não encontrados'});
    });
    for (let device of matchedDevices) {
      let doUpdate = false;
      for (let vlan of device.vlan) {
        if (vlanId == vlan.vlan_id) {
          vlan.vlan_id = 1;
          doUpdate = true;
        }
      }
      // TODO Test vlan final array
      if (doUpdate) {
        await device.save().catch((err) => {
          return res.json({success: false, type: 'danger',
                           message: 'Erro ao gravar na base de dados'});
        });
        mqtt.anlixMessageRouterUpdate(device._id);
      }
    }
    return res.json({success: true, type: 'success',
                     message: 'Realizado com sucesso'});
  } else {
    return res.json({success: false, type: 'danger',
                     message: 'Configuração não encontrada'});
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

    config.vlans_profiles = config.vlans_profiles.filter(
      (obj) => !req.body.ids.includes(obj.vlan_id.toString()) &&
               !req.body.ids.includes(obj._id.toString()));

    config.save().then(function() {
      return res.json({
        success: true,
        type: 'success',
        message: 'Perfis de VLAN deletados com sucesso!'});
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
      return res.json({success: false, type: 'danger',
                       message: 'Erro ao encontrar dispositivo'});
    } else {
      return res.json({success: true,
                       type: 'success', vlan: matchedDevice.vlan});
    }
  });
};

vlanController.updateVlans = async function(req, res) {
  let device = await DeviceModel.findById(req.params.deviceid)
  .catch(function(rej) {
    return res.json({success: false, type: 'danger', message: rej.message});
  });
  if (device) {
    let is_vlans_valid = true;
    req.body.vlans = JSON.parse(req.body.vlans);

    if (Array.isArray(req.body.vlans)) {
      for (let v of req.body.vlans) {
        if (v.port !== undefined && v.vlan_id !== undefined) {
          // restricted to this range of value by the definition
          // of 802.1q protocol vlan 2 is restricted to wan
          if (typeof v.port !== 'number' || v.port < 1 || v.port > 4 ||
              typeof v.vlan_id !== 'number' || v.vlan_id < 1 ||
              v.vlan_id > 4094 || v.vlan_id == 2) {
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
        return res.json({
          success: true,
          type: 'success',
          message: 'VLANs do dispositivo ' +
                   req.params.deviceid + ' atualizada com sucesso!'});
      }).catch(function(rej) {
        return res.json({success: false, type: 'danger', message: rej.message});
      });
    } else {
      return res.json({success: false, type: 'danger',
                       message: 'Formato de VLANs inválido!'});
    }
  } else {
    res.json({success: false, type: 'danger',
              message: 'Dispositivo não encontrado.'});
  }
};

vlanController.convertFlashmanVlan = function(model, vlanObj) {
  let digestedVlans = {};

  if (typeof vlanObj === undefined) {
    vlanObj = '';
  } else {
    vlanObj = JSON.parse(vlanObj);
  }

  let deviceInfo = DeviceVersion.getDeviceInfo(model);

  let lan_ports = deviceInfo['lan_ports'];
  let wan_port = deviceInfo['wan_port'];
  let cpu_port = deviceInfo['cpu_port'];
  let vlan_of_lan = '1';
  let vlan_of_wan = '2';

  // on well behavior object of vlan that needs to treat others vlans
  let vlan_ports = '';
  let aux_idx; // auxiliar index to toggle vid 1 or 9
  if ((typeof vlanObj !== undefined) && (vlanObj.length > 0)) {
    // initialize keys values with empty string
    for (let i = 0; i < vlanObj.length; i++) {
      // check vlan_id to pass the right vid in case device is realtek or not
      aux_idx = ((vlanObj[i].vlan_id == 1) ? vlan_of_lan : vlanObj[i].vlan_id);

      digestedVlans[aux_idx] = '';
    }
    // put on every key an append to the value as the matching port
    for (let i = 0; i < vlanObj.length; i++) {
      // check vlan_id to pass the right vid in case device is realtek or not
      aux_idx = ((vlanObj[i].vlan_id == 1) ? vlan_of_lan : vlanObj[i].vlan_id);

      if (aux_idx == vlan_of_lan) {
        digestedVlans[aux_idx] += lan_ports[vlanObj[i].port-1].toString()+' ';
      } else if (aux_idx != vlan_of_wan) {
        digestedVlans[aux_idx] += lan_ports[vlanObj[i].port-1].toString()+'t ';

        vlan_ports += lan_ports[vlanObj[i].port-1].toString()+' ';
      }
    }
  } else {
  // in the case of misconfiguration or none configuration of
  // vlan at all, set the default configuration for vlan
    let classic_vlan_config = '';
    for (let i = 0; i < lan_ports.length; i++) {
      classic_vlan_config += lan_ports[i].toString()+' ';
    }
    digestedVlans[vlan_of_lan] = classic_vlan_config;
  }

  // put the tagged ports
  for (let key in digestedVlans) {
    if (key == vlan_of_lan) {
      digestedVlans[key] += cpu_port.toString();
      if (deviceInfo['soc'] != 'realtek' ||
        (deviceInfo['network_chip'] != '8367r' &&
        deviceInfo['network_chip'] != '83xx')) {
        digestedVlans[key] += 't';
      }
    } else if (key != vlan_of_wan) {
      digestedVlans[key] += wan_port.toString()+'t';
      if (deviceInfo['soc'] == 'realtek' &&
        (deviceInfo['network_chip'] == '8367r' ||
        deviceInfo['network_chip'] == '83xx')) {
        digestedVlans[key] += ' ' + cpu_port.toString()+'t';
      }
    }
  }
  digestedVlans[vlan_of_wan] = wan_port.toString() + ' ' +
                               vlan_ports + cpu_port.toString();
  if (deviceInfo['soc'] != 'realtek' ||
        (deviceInfo['network_chip'] != '8367r' &&
        deviceInfo['network_chip'] != '83xx')) {
    digestedVlans[vlan_of_wan] += 't';
  }

  return digestedVlans;
};

vlanController.retrieveVlansToDevice = function(device) {
  /*
    lack the sync by hash
  */

  let digestedVlans = vlanController.convertFlashmanVlan(
    device.model, JSON.stringify(device.vlan));
  let hashVlan = '';

  if (JSON.stringify(digestedVlans) != JSON.stringify({})) {
    hashVlan = crypto.createHash('md5').update(
      JSON.stringify(digestedVlans)).digest('base64');
  }
  return {
    vlans: digestedVlans,
    hash: hashVlan,
  };
};

vlanController.getValidVlan = async function(model, convertedVlan) {
  let lanVlan = 1;
  let filteredVlan = [];
  let didChange = false;
  let config = await Config.findOne({is_default: true}).catch(function(rej) {
    return {success: false, type: 'danger', message: rej.message};
  });
  if (config && config.vlans_profiles) {
    let vlans = [];
    for (let i = 0; i < config.vlans_profiles.length; i++) {
      vlans.push(config.vlans_profiles[i].vlan_id);
    }
    for (let i = 0; i < convertedVlan.length; i++) {
      let vlanParsed = JSON.parse(convertedVlan[i]);
      if (! vlans.includes(vlanParsed.vlan_id)) {
        didChange = true;
        vlanParsed.vlan_id = lanVlan;
      } else {
        vlanParsed.vlan_id = parseInt(vlanParsed.vlan_id);
      }
      filteredVlan.push(JSON.stringify(vlanParsed));
    }
  } else {
    return {success: false, type: 'danger', message: config};
  }
  return {
    success: true,
    vlan: filteredVlan,
    didChange: didChange,
  };
};

vlanController.convertDeviceVlan = function(model, vlanObj) {
  let receivedVlan = JSON.parse(vlanObj);
  let deviceInfo = DeviceVersion.getDeviceInfo(model);
  let lanPorts = deviceInfo.lan_ports;
  let wanPort = deviceInfo.wan_port;
  let cpuPort = deviceInfo.cpu_port;
  let lanVlan;
  let wanVlan;
  lanVlan = 1;
  wanVlan = 2;
  let vids = Object.keys(receivedVlan);
  let idxLan = vids.indexOf(lanVlan.toString());
  vids.splice(idxLan, 1);
  let idxWan = vids.indexOf(wanVlan.toString());
  vids.splice(idxWan, 1);
  // now vidsFiltered only has ids of vlans that were added
  let vlan = [];
  for (let i = 0; i < lanPorts.length; i++) {
    let port = i+1;
    let vid = lanVlan;
    for (let j = 0; j < vids.length; j++) {
      let ports = receivedVlan[vids[j].toString()].replace(/t/g, '');
      ports = ports.replace(cpuPort.toString(), '');
      ports = ports.replace(wanPort.toString(), '');
      ports = ports.split(' ');
      if (ports.includes(lanPorts[i].toString())) {
        vid = parseInt(vids[j]);
        break;
      }
    }
    let vlanObj = {
      port: port,
      vlan_id: vid,
    };
    vlan.push(JSON.stringify(vlanObj));
  }
  return vlan;
};

vlanController.getMaxVid = function(req, res) {
  let maxVids = {};
  let models = req.body.models;
  if (util.isJsonString(models)) {
    models = JSON.parse(models);
    for (let model of models) {
      let deviceInfo = DeviceVersion.getDeviceInfo(model);
      maxVids[model] = deviceInfo.max_vid;
    }
    return res.json({
      success: true,
      type: 'success',
      maxVids: maxVids,
    });
  } else {
    return res.status(500).json({
      success: false,
      message: 'Erro ao tratar JSON',
      errors: [],
    });
  }
};

vlanController.getVlanCompatibleModels = function(req, res) {
  return res.json({
    success: true,
    type: 'success',
    compatibleModels: DeviceVersion.getVlanCompatible(),
  });
};

module.exports = vlanController;
