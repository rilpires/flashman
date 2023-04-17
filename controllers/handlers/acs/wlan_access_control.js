/* eslint-disable no-prototype-builtins */
/* global __line */
const TasksAPI = require('../../external-genieacs/tasks-api');
const DeviceVersion = require('../../../models/device_version');
const DevicesAPI = require('../../external-genieacs/devices-api');
const DeviceModel = require('../../../models/device');
const utilHandlers = require('../util.js');
const http = require('http');
const debug = require('debug')('ACS_ACCESS_CONTROL');
const t = require('../../language').i18next.t;

let acsAccessControlHandler = {};
let GENIEHOST = (process.env.FLM_NBI_ADDR || 'localhost');
let GENIEPORT = (process.env.FLM_NBI_PORT || 7557);

// Adds a new rule in the rules tree of each WLAN and assumes an id for this
// rule from the id of the last rule.
// This makes it possible for us to save a get and a projection.
const addAcRules = async function(
  device, acSubtreeRoots, numberOfRules, maxId, grantWifi5ghz,
) {
  let currentMaxId = parseInt(maxId, 10);
  if (isNaN(currentMaxId)) {
    debug('maxId is not an number');
  }
  let acRulesAdded = {'wifi2': []};
  if (grantWifi5ghz) {
    acRulesAdded['wifi5'] = [];
  }
  for (let i = 0; i < numberOfRules; i++) {
    // Adding at wifi2 WLAN
    currentMaxId = currentMaxId + 1;
    let result = await TasksAPI.addOrDeleteObject(
      device.acs_id, acSubtreeRoots['wifi2'], 'addObject');
    if (result) {
      acRulesAdded['wifi2'].push(
        acSubtreeRoots['wifi2']+'.'+currentMaxId.toString(),
      );
    } else {
      console.log('addAcRules error');
      return {'success': false};
    }
    if (grantWifi5ghz) {
      // Adding at wifi5 WLAN
      currentMaxId = currentMaxId + 1;
      result = await TasksAPI.addOrDeleteObject(
        device.acs_id, acSubtreeRoots['wifi5'], 'addObject');
      if (result) {
        acRulesAdded['wifi5'].push(
          acSubtreeRoots['wifi5']+'.'+currentMaxId.toString(),
        );
      // If we were not successful adding a rule to the subtree of wifi5 WLAN,
      // then we need to rollback the added rule to wifi2 WLAN.
      } else {
        await deleteAcRules(device, acRulesAdded['wifi2'].slice(-1));
        console.log('addAcRules error');
        return {'success': false};
      }
    }
  }
  return {'success': true, 'added_rules': acRulesAdded};
};

const deleteAcRules = async function(device, rulesToDelete) {
  try {
    for (let acRule of rulesToDelete) {
      let result = await TasksAPI.addOrDeleteObject(
        device.acs_id, acRule, 'deleteObject',
      );
      if (!result) {
        console.log('deleteAcRules error');
        return false;
      }
    }
  } catch (e) {
    console.log('Exception deleting AC rules for device ' + device.acs_id);
    return false;
  }
  return true;
};

const getAcRuleTrees = async function(
  acsID, acSubtreeRoots, supportedWlans, wlanAcRulesTrees, maxId,
) {
  let wlanAcRulesIds = {};
  // ===== Get device AC tree =====
  let query = {_id: acsID};
  let path = '/devices/?query='+JSON.stringify(query)+
    '&projection='+Object.values(acSubtreeRoots).join(',');
  let options = {
    method: 'GET',
    hostname: GENIEHOST,
    port: GENIEPORT,
    path: encodeURI(path),
  };
  // Projection Promise
  return new Promise(function(resolve, reject) {
    let req = http.request(options, (resp)=>{
      resp.setEncoding('utf8');
      let data = '';
      resp.on('error', (error) => {
        console.log('Error ('+ error +') removing an AC rule at '+acsID);
        reject({
          'success': false, 'error_code': 'acRuleGetError',
          'message': t('acRuleGetError', {errorline: __line}),
        });
      });
      resp.on('data', (chunk) => data+=chunk);
      resp.on('end', async () => {
        if (data.length > 0) {
          try {
            // Get data
            data = JSON.parse(data)[0];
            for (let wlanType of supportedWlans) {
              let wlanTreeRoot = acSubtreeRoots[wlanType];
              let wlanTreeRules = [];
              let wlanTreeRuleIds = [];
              // Populates the WLAN subtree rule structure
              if (utilHandlers.checkForNestedKey(data, wlanTreeRoot)) {
                let wlanSubtree = utilHandlers.getFromNestedKey(
                  data, wlanTreeRoot,
                );
                Object.entries(wlanSubtree).forEach((acRule) => {
                  let acRuleId = acRule[0];
                  if (acRuleId && !acRuleId.startsWith('_')) {
                    maxId = Math.max(Number(acRuleId), maxId);
                    wlanTreeRuleIds.push(acRuleId);
                    wlanTreeRules.push(wlanTreeRoot+'.'+acRuleId);
                  }
                });
              }
              wlanAcRulesIds[wlanType] = wlanTreeRuleIds;
              wlanAcRulesTrees[wlanType] = wlanTreeRules;
            }
            // If success, Resolve
            console.log('Successfully obtained AC rule trees');
            return resolve({
              'success': true,
              'max_id': maxId,
              'rule_ids': wlanAcRulesIds,
              'rule_trees': wlanAcRulesTrees,
            });
          } catch (e) {
            // If error, Reject
            console.log(
              'Error ('+e+') retrieving Access Control Rules at '+acsID);
            return reject({
              'success': false, 'error_code': 'acRuleGetError',
              'message': t('acRuleGetError', {errorline: __line}),
            });
          }
        }
      });
    });
    req.end();
  });
};

const updateAcRules = async function(
  device, supportedWlans, acSubtreeRoots, rulesToEdit, blockedDevices,
) {
  let acsID = device.acs_id;
  let serial = device.serial_tr069;
  let parameterValues = [];
  try {
    for (let wlanType of supportedWlans) {
      if (rulesToEdit[wlanType].length !== blockedDevices.length) {
        return;
      }
      let acSubtreeRoot = acSubtreeRoots[wlanType];
      parameterValues.push([acSubtreeRoot+'Mode', 'Ban', 'xsd:string']);
      for (let i = 0; i < blockedDevices.length; i++) {
        let ruleArr = (rulesToEdit[wlanType][i]).split('.');
        let ruleId = ruleArr[ruleArr.length - 1];
        // While we need to add rules to block devices, we fill the name and MAC
        // fields with the necessary values.
        let ruleMac = blockedDevices[i]['mac'];
        // Generating a random string combined with last 4 digits of devices mac
        let ruleName = ruleId + '-' + ruleMac.replace(/:/g, '').slice(-4);
        // Just one more check step. This model only accepts 10 caracteres in
        // the name field.
        ruleName = (ruleName.length > 10) ? ruleName.slice(-10) : ruleName;
        parameterValues.push(
          [rulesToEdit[wlanType][i]+'.'+'Name', ruleName, 'xsd:string'],
          [rulesToEdit[wlanType][i]+'.'+'MACAddress', ruleMac, 'xsd:string'],
        );
      }
    }
  } catch (e) {
    return;
  }
  if (parameterValues.length > 0) {
    try {
      let task = {
        name: 'setParameterValues',
        parameterValues: parameterValues,
      };
      let result = await TasksAPI.addTask(acsID, task);
      if (!result || !result.success) {
        console.log('Error in editing Access Control rules task at '+serial);
      }
    } catch (e) {
      console.log('Error: failed to edit Access Control rules at '+serial);
    }
  }
};

const compareNewACRulesWithTree = async function(acsID, blockedDevices) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID}).lean();
  } catch (e) {
    return;
  }
  if (!device || !device.use_tr069) {
    return;
  }
  let permissions = DeviceVersion.devicePermissions(device);

  let maxId = 0;
  let acRulesResult = {};
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();

  let supportedWlans = ['wifi2'];
  let acSubtreeRoots = {'wifi2': fields.access_control.wifi2};
  let wlanAcRulesTrees = {'wifi2': []};
  if (device.wifi_is_5ghz_capable) {
    supportedWlans.push('wifi5');
    acSubtreeRoots['wifi5'] = fields.access_control.wifi5;
    wlanAcRulesTrees['wifi5'] = [];
  }

  try {
    acRulesResult = await getAcRuleTrees(
      acsID, acSubtreeRoots, supportedWlans, wlanAcRulesTrees, maxId,
    );
    if (!('success' in acRulesResult) || !acRulesResult.success) {
      console.log('Error getting AC rules for device ' + acsID);
      return;
    }
  } catch (e) {
    console.log('Exception getting AC rules for device ' + acsID);
    return;
  }

  let rulesToEdit = {'wifi2': {}};
  let rulesToDelete = {'wifi2': {}};
  if (device.wifi_is_5ghz_capable) {
    rulesToEdit['wifi5'] = {};
    rulesToDelete['wifi5'] = {};
  }
  let ids = acRulesResult['rule_ids'];
  wlanAcRulesTrees = acRulesResult['rule_trees'];
  maxId = acRulesResult['max_id'];
  // If there is an imbalance in the tree or if the tree has a gap, it will
  // delete all the rules in the tree and force the algorithm to re-populate
  // all the rules in the tree.
  // If the algorithm got this far and it has a rule with the id equal to
  // the limit of 64, then there is a problem, because there are not 64
  // blocked devices. It will also force the algorithm to repopulate the
  // rule tree.
  let condA = !device.wifi_is_5ghz_capable && ids['wifi2'].length != maxId;
  let condBA;
  let condBB;
  if (device.wifi_is_5ghz_capable) {
    condBA = (ids['wifi2'].length + ids['wifi5'].length) != maxId;
    condBB = ids['wifi2'].length != ids['wifi5'].length;
  } else {
    condBA = ids['wifi2'].length != maxId;
    condBB = false;
  }
  let condB = condBA || condBB;
  let condC = device.wifi_is_5ghz_capable;
  if (condA || (condB && condC) || maxId >= 64) {
    for (let wlanType of supportedWlans) {
      let deleteRulesResult = await deleteAcRules(
        device, wlanAcRulesTrees[wlanType],
      );
      if (!deleteRulesResult) {
        console.log('Error deleting AC rules for redo device ' + acsID);
        return;
      }
    }
    maxId = 0;
    wlanAcRulesTrees = {'wifi2': []};
    if (permissions.grantWifi5ghz) {
      wlanAcRulesTrees['wifi5'] = [];
    }
  }
  let diff = blockedDevices.length - (maxId/2);
  if (!device.wifi_is_5ghz_capable) {
    diff = blockedDevices.length - maxId;
  }
  // If the difference is positive then you need to add rules to the tree.
  if (diff > 0) {
    rulesToEdit = wlanAcRulesTrees;
    let addedRules;
    try {
      let addRulesResult =
        await addAcRules(
          device, acSubtreeRoots, diff, maxId, device.wifi_is_5ghz_capable,
        );
      if ('success' in addRulesResult && addRulesResult['success']) {
        addedRules = addRulesResult['added_rules'];
      }
    } catch (e) {
      console.log('Error ('+e+') at AC rules add');
      return;
    }
    // Get the rules that need to be edited (old + new).
    for (let wlanType of supportedWlans) {
      if (rulesToEdit[wlanType].length > 0) {
        rulesToEdit[wlanType] =
          rulesToEdit[wlanType].concat(addedRules[wlanType]);
      } else {
        rulesToEdit[wlanType] = addedRules[wlanType];
      }
    }
  // If the difference is negative, then we need to remove rules from the
  // tree. The algorithm will reserve the lowest id rules, which are at the
  // beginning of the rules array, and will delete as many as necessary
  // until it has the right number of rules.
  } else if (diff < 0) {
    for (let wlanType of supportedWlans) {
      let deleteSuccess = true;
      let wlanTreeRules = wlanAcRulesTrees[wlanType];
      // This sort solves the TR-069 sorting problem (eg 1, 11, 2, 3, ..., 10)
      wlanTreeRules = wlanTreeRules.sort((a, b) => {
        let aArr = a.split('.');
        let aId = parseInt(aArr[aArr.length - 1], 10);
        if (isNaN(aId)) {
          debug(`wlanTreeRules aId is not an number`);
        }
        let bArr = b.split('.');
        let bId = parseInt(bArr[bArr.length - 1], 10);
        if (isNaN(bId)) {
          debug(`wlanTreeRules bId is not an number`);
        }
        return aId - bId;
      });
      let wlanNumOfRules = wlanTreeRules.length;
      rulesToEdit[wlanType] =
        wlanTreeRules.slice(0, wlanNumOfRules+diff);
      rulesToDelete =
        wlanTreeRules.slice(wlanNumOfRules+diff, wlanNumOfRules);
      try {
        let deleteRulesResult =
          await deleteAcRules(device, rulesToDelete);
        if (!deleteRulesResult) {
          deleteSuccess = false;
        }
      } catch (e) {
        console.log('Error ('+e+') at AC rules delete');
        deleteSuccess = false;
      }
      if (!deleteSuccess) {
        return;
      }
    }
  // If the difference is zero then we just need to edit the existing rules.
  } else {
    rulesToEdit = wlanAcRulesTrees;
  }
  // Checks if the rules in the TR-069 tree are in accordance with the
  // number of blocked devices. For devices without 5Ghz, check step needs
  // to be different
  let allOkWithWifi2 = (rulesToEdit['wifi2'] && (
    rulesToEdit['wifi2'].length == blockedDevices.length));
  let allOkWithWifi5 = (permissions.grantWifi5ghz && (
    rulesToEdit['wifi5'] && (
    rulesToEdit['wifi5'].length == blockedDevices.length)));
  // At this point the number of rules that exist in each WLAN tree and the
  // number of blocked devices must be equal. Otherwise, it returns an error
  if (allOkWithWifi2) {
    if (!permissions.grantWifi5ghz || allOkWithWifi5) {
      try {
        await updateAcRules(
          device, supportedWlans, acSubtreeRoots, rulesToEdit, blockedDevices,
        );
        console.log('Updated Access Control tree successfully');
      } catch (e) {
        console.log('Error ('+e+') at AC rules update');
      }
    }
  } else {
    console.log('Error at AC rules update. Number of rules doesn\'t match');
  }
};

acsAccessControlHandler.changeAcRules = async function(device) {
  // ===== Check device =====
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let serial = device.serial_tr069;
  // Make sure that this device is abled to do access control
  let permissions = DeviceVersion.devicePermissions(device);
  if (!permissions || !permissions.grantBlockDevices) return;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  if (!fields || !device.lan_devices) return;
  // ===== Get blockedDevices and AC rules trees =====
  // Creates the structures related to WLAN subtrees
  // Make sure there are no more than 31 devices to block - limit of 64 rules
  let blockedDevices = Object.values(device.lan_devices).filter(
    (d)=>d.is_blocked,
  );
  let blockedDevicesCount = blockedDevices.length;
  if (blockedDevicesCount >= 32) {
    console.log('Number of rules has reached its limit for device ' + acsID);
    return {
      success: false,
      error_code: 'acRuleLimits',
      message: t('acRuleLimits', {errorline: __line}),
    };
  }
  let acSubtreeRoots = {'wifi2': fields.access_control.wifi2};
  if (device.wifi_is_5ghz_capable) {
    acSubtreeRoots['wifi5'] = fields.access_control.wifi5;
  }
  // ===== Update device tree =====
  let task = {
    name: 'getParameterValues',
    parameterNames: Object.values(acSubtreeRoots),
  };
  let cback = (acsID)=>compareNewACRulesWithTree(acsID, blockedDevices);
  let result = await TasksAPI.addTask(acsID, task, cback);
  if (!result || !result.success) {
    console.log('Error: failed to retrieve Access Control Rules at '+serial);
    return {
      'success': false, 'error_code': 'acRuleGetError',
      'message': t('acRuleGetError', {errorline: __line}),
    };
  }
  return {'success': true};
};

module.exports = acsAccessControlHandler;
