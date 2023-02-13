/* eslint-disable camelcase */
/* global __line */

const mqtt = require('../mqtts');
let User = require('../models/user');
let Config = require('../models/config');
let DeviceModel = require('../models/device');
const DeviceVersion = require('../models/device_version');
const Role = require('../models/role');
const crypto = require('crypto');
const util = require('./handlers/util');
const t = require('./language').i18next.t;

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
        indexContent.message = t('permissionDenied', {errorline: __line});
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
              indexContent.message = t('vlanIdNotFound',
                                           {errorline: __line});
              return res.render('error', indexContent);
            }
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

vlanController.getAllVlanProfiles = function(req, res) {
  Config.findOne({is_default: true}, function(err, config) {
    if (err) {
      return res.json({success: false, type: 'danger',
                       message: t('configFindError', {errorline: __line})});
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
      message: t('vlanIdOutOfRange', {errorline: __line}),
    });
  }
  if (util.vlanNameRegex.test(newVlanProfile.profile_name) == false) {
    return res.json({
      success: false,
      type: 'danger',
      message: t('vlanProfileNameInvalidCharacter', {errorline: __line})});
  }
  if (newVlanProfile.profile_name.length > 32) {
    return res.json({
      success: false,
      type: 'danger',
      message: t('vlanProfileNameInvalidLength', {errorline: __line})});
  }

  let config = await Config.findOne({is_default: true}).exec().catch((e) => e);
  if (config instanceof Error) {
    return res.json({success: false, type: 'danger',
                     message: t('configFindError', {errorline: __line})});
  }
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
      if ((await config.save().catch((e) => e)) instanceof Error) {
        return res.json({success: false, type: 'danger',
          message: t('configSaveError', {errorline: __line})});
      }
      return res.json({success: true, type: 'success',
                       message: t('operationSuccessful')});
    } else if (!is_vlan_id_unique) {
      return res.json({
        success: false,
        type: 'danger',
        message: t('vlanProfileIdExists', {errorline: __line})});
    } else if (!is_profile_name_unique) {
      return res.json({
        success: false,
        type: 'danger',
        message: t('vlanProfileNameExists', {errorline: __line})});
    }
  } else {
    return res.json({
      success: false,
      type: 'danger',
      message: t('vlanProfileFindError', {errorline: __line})});
  }
};

vlanController.editVlanProfile = async function(req, res) {
  let config = await Config.findOne({is_default: true}).exec().catch((e) => e);
  if (config instanceof Error) {
    return res.json({success: false, type: 'danger',
                     message: t('configFindError', {errorline: __line})});
  }
  if (config && config.vlans_profiles) {
    let exist_vlan_profile = false;
    if (util.vlanNameRegex.test(req.body.profilename) == false) {
      return res.json({
        success: false,
        type: 'danger',
        message: t('vlanProfileNameInvalidCharacter', {errorline: __line})});
    }
    if (req.body.profilename.length > 32) {
      return res.json({
        success: false,
        type: 'danger',
        message: t('vlanProfileNameInvalidLength', {errorline: __line})});
    }

    for (let i = 0; i < config.vlans_profiles.length; i++) {
      if (config.vlans_profiles[i].profile_name === req.body.profilename) {
        return res.json({
          success: false, type: 'danger',
          message: t('vlanProfileNameShouldBeDifferent',
                     {errorline: __line})});
      }

      if (config.vlans_profiles[i].vlan_id == parseInt(req.params.vid)) {
        exist_vlan_profile = true;
        config.vlans_profiles[i].profile_name = req.body.profilename;
      }
    }

    if (exist_vlan_profile) {
      if ((await config.save().catch((e) => e)) instanceof Error) {
        return res.json({success: false, type: 'danger',
          message: t('configSaveError', {errorline: __line})});
      }
      return res.json({success: true, type: 'success',
                       message: t('operationSuccessful')});
    } else {
      return res.json({success: false, type: 'danger',
                       message: t('vlanIdNotFound', {errorline: __line})});
    }
  } else {
    res.json({success: false, type: 'danger', message: config});
  }
};

vlanController.checkDevicesAffected = async function(req, res) {
  let config = await Config.findOne({is_default: true}).exec().catch((e) => e);
  if (config instanceof Error) {
    return res.json({success: false, type: 'danger',
                     message: t('configFindError', {errorline: __line})});
  }
  if (config) {
    let vlanProfile = config.vlans_profiles.find(
      (vlanProfile) => vlanProfile._id == req.params.profileid);
    if (typeof vlanProfile === 'undefined') {
      return res.json({success: false, type: 'danger',
        message: t('vlanProfileNotFound', {errorline: __line})});
    }
    let vlanId = vlanProfile.vlan_id;

    let matchedDevices = await DeviceModel.find(
      {vlan: {$exists: true, $not: {$size: 0}}},
      {_id: true, vlan: true},
    ).exec().catch((e) => e);
    if (matchedDevices instanceof Error) {
      return res.json({success: false, type: 'danger',
                       message: t('cpesNotFound', {errorline: __line})});
    }
    for (let device of matchedDevices) {
      let doUpdate = false;
      for (let vlan of device.vlan) {
        if (vlanId == vlan.vlan_id) {
          vlan.vlan_id = 1;
          doUpdate = true;
        }
      }
      if (doUpdate) {
        if ((await device.save().catch((e) => e)) instanceof Error) {
          return res.json({success: false, type: 'danger',
                           message: t('cpeSaveError', {errorline: __line})});
        }
        mqtt.anlixMessageRouterUpdate(device._id);
      }
    }
    return res.json({success: true, type: 'success',
                     message: t('operationSuccessful')});
  } else {
    return res.json({success: false, type: 'danger',
                     message: t('configNotFound', {errorline: __line})});
  }
};

vlanController.removeVlanProfile = async function(req, res) {
  let config = await Config.findOne({is_default: true}).exec().catch((e) => e);
  if (config instanceof Error) {
    return res.json({success: false, type: 'danger',
                     message: t('configFindError', {errorline: __line})});
  }
  if (config) {
    if (typeof req.body.ids === 'string' ||
     typeof req.body.ids === 'number') {
      req.body.ids = [req.body.ids.toString()];
    } else if (!Array.isArray(req.body.ids)) {
      return res.json({success: false, type: 'danger',
        message: t('fieldNameInvalid', {name: 'ids', errorline: __line})});
    }

    req.body.ids = req.body.ids.map((i) => i.toString());

    config.vlans_profiles = config.vlans_profiles.filter(
      (obj) => !req.body.ids.includes(obj.vlan_id.toString()) &&
               !req.body.ids.includes(obj._id.toString()));

    if ((config.save().catch((e) => e)) instanceof Error) {
      return res.json({success: false, type: 'danger',
        message: t('configSaveError', {errorline: __line})});
    }
    return res.json({success: true, type: 'success',
                     message: t('operationSuccessful')});
  } else {
    res.json({success: false, type: 'danger',
      message: t('configNotFound', {errorline: __line})});
  }
};

vlanController.getVlans = function(req, res) {
  DeviceModel.findById(req.params.deviceid, function(err, matchedDevice) {
    if (err || !matchedDevice) {
      console.log(err);
      return res.json({success: false, type: 'danger',
                       message: t('cpeFindError', {errorline: __line})});
    } else {
      return res.json({success: true,
                       type: 'success', vlan: matchedDevice.vlan});
    }
  });
};

vlanController.updateVlans = async function(req, res) {
  let device = await DeviceModel.findById(req.params.deviceid).exec()
    .catch((e) => e);
  if (device instanceof Error) {
    return res.json({success: false, type: 'danger',
                     message: t('cpeFindError', {errorline: __line})});
  }
  if (device) {
    let is_vlans_valid = true;
    if (util.isJsonString(req.body.vlans)) {
      req.body.vlans = JSON.parse(req.body.vlans);
    } else {
      return res.json({success: false, type: 'danger',
        message: t('fieldNameInvalid', {errorline: __line, name: 'vlans'})});
    }

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

      if ((await device.save().catch((e) => e)) instanceof Error) {
        return res.json({success: false, type: 'danger',
          message: t('cpeSaveError', {errorline: __line})});
      }
      return res.json({success: true, type: 'success',
                       message: t('operationSuccessful')});
    } else {
      return res.json({success: false, type: 'danger',
        message: t('fieldNameInvalid', {errorline: __line, name: 'vlans'})});
    }
  } else {
    res.json({success: false, type: 'danger',
              message: t('cpeNotFound', {errorline: __line})});
  }
};

vlanController.convertFlashmanVlan = function(model, vlanObj) {
  let digestedVlans = {};
  let deviceInfo = DeviceVersion.getDeviceInfo(model);

  let lan_ports = deviceInfo['lan_ports'];
  let wan_port = deviceInfo['wan_port'];
  let cpu_port = deviceInfo['cpu_port'];
  let max_vid = deviceInfo['max_vid'];
  let qtd_ports = deviceInfo['num_usable_lan_ports'];
  let vlan_of_lan = '1';
  let vlan_of_wan = '2';

  if (!vlanObj) {
    vlanObj = '';
  } else {
    try {
      vlanObj = JSON.parse(vlanObj);
    } catch (e) {
      vlanObj = '';
    }
  }
  // sanity check of vlanObj
  if (Array.isArray(vlanObj)) {
    let isInShape = vlanObj.every((v) => {
      let z = false;
      let a = !!v.vlan_id && !!v.port;
      let b = v.vlan_id <= max_vid;
      let c = Number.isInteger(v.vlan_id);
      let d = v.port <= qtd_ports;
      let e = Number.isInteger(v.port);
      z = a && b && c && d && e;
      return z;
    });
    if (!isInShape) vlanObj = '';
  } else vlanObj = '';

  // on well behavior object of vlan that needs to treat others vlans
  let aux_idx;
  if (vlanObj.length > 0) {
    // initialize keys values with empty string
    for (let i = 0; i < vlanObj.length; i++) {
      aux_idx = ((vlanObj[i].vlan_id == 1) ? vlan_of_lan : vlanObj[i].vlan_id);
      digestedVlans[aux_idx] = '';
    }
    // put on every key an append to the value as the matching port
    for (let i = 0; i < vlanObj.length; i++) {
      aux_idx = ((vlanObj[i].vlan_id == 1) ? vlan_of_lan : vlanObj[i].vlan_id);
      if (aux_idx == vlan_of_lan) {
        digestedVlans[aux_idx] += lan_ports[vlanObj[i].port-1].toString()+' ';
      } else if (aux_idx != vlan_of_wan) {
        digestedVlans[aux_idx] += lan_ports[vlanObj[i].port-1].toString()+'t ';
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
      digestedVlans[key] += cpu_port.toString() + 't';
    } else if (key != vlan_of_wan) {
      digestedVlans[key] += wan_port.toString()+'t';
    }
  }
  digestedVlans[vlan_of_wan] = wan_port.toString() +
    ' ' + cpu_port.toString() + 't';

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
/* This function clean outcome vlan from router
  that profile is no more recorded in flashman */
vlanController.getValidVlan = async function(model, convertedVlan) {
  let lanVlan = 1;
  let filteredVlan = [];
  let didChange = false;
  let config = await Config.findOne({is_default: true}).exec().catch((e) => e);
  if (config instanceof Error) {
    return {success: false, type: 'danger',
            message: t('configFindError', {errorline: __line})};
  }
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
      if (!vlanParsed.port) {
        vlanParsed.port = i+1;
      }
      filteredVlan.push(JSON.stringify(vlanParsed));
    }
  } else {
    return {success: false, type: 'danger',
      message: t('configNotFound', {errorline: __line})};
  }
  return {
    success: true,
    vlan: filteredVlan,
    didChange: didChange,
  };
};

vlanController.convertDeviceVlan = function(model, vlanObj) {
  let defaultVlan = ['{"port":1,"vlan_id":1}',
    '{"port":2,"vlan_id":1}',
    '{"port":3,"vlan_id":1}',
    '{"port":4,"vlan_id":1}'];
  let deviceInfo = DeviceVersion.getDeviceInfo(model);
  let receivedVlan;
  if (!vlanObj) {
    return defaultVlan;
  } else {
    try {
      receivedVlan = JSON.parse(vlanObj);
    } catch (e) {
      return defaultVlan;
    }
  }
  if (!(receivedVlan instanceof Object)) return defaultVlan;
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
        if (!vid) {
          vid = 1;
        }
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
      message: t('fieldNameInvalid', {errorline: __line, name: 'models'}),
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
