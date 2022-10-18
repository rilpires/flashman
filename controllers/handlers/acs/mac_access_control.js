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

// Auxiliary Array functions
const sort = (arr1) => arr1.sort((a, b) => a-b);
const difference = (arr1, arr2) => arr1.filter((x) => !arr2.includes(x));

// If there is a gap at Genie's AC rules, return an array containing the rules
// from the gap to the end. {[1, 2, 4, 5] will return [4, 5]}
const dismatch = function(arr1) {
  let antId = null;
  let gap = false;
  let dismatch = [];
  try {
    for (let i = 0; i < arr1.length; i++) {
      if (antId && !gap && (arr1[i] - antId) > 1) {
        gap = true;
      }
      if (gap) dismatch.push(arr1[i]);
      antId = arr1[i];
    }
    return dismatch;
  } catch (e) {
    console.log('Exception catched checking AC rules gaps:', e);
    return [];
  }
};

// Return rules that must be removed and added to Genie's database.
const checkRules = function(arr1, n) {
  try {
    // New array of needed ids, from 1 to n.
    let neddedIds = Array.from({length: n}, (_, i) => i + 1);
    // Getting a dismatch from the sequency that array must have (a gap).
    let gap = dismatch(arr1);
    // Getting residual rules at Genie's database.
    let residue = difference(arr1, neddedIds);
    // Getting missing rules that must be added to Genie's database.
    let missing = difference(neddedIds, arr1);
    // Getting elements that need to be removed from Genie's database
    // (all unique elements from the gap to the end plus the residual rules).
    let toDelete = sort([...new Set([...gap, ...residue])]);
    // Getting elements that need to be added to Genie's database.
    let toAdd = sort(difference(gap.concat(missing), residue));
    return {to_delete: toDelete, to_add: toAdd};
  } catch (e) {
    console.log('Exception catched checking AC rules:', e);
  }
};

let root = 'InternetGatewayDevice.Firewall.X_ZTE-COM_MacFilterService.Filter';

// Generate AC rule for Genie's patterns with the blocked device MAC address
// and Genie's rule index (id).
const newRule = function(mac, id) {
  if (mac == '') return [];
  try {
    let rule = [];
    let params = {
      'DestinationMACAddress': '00:00:00:00:00:00',
      'Name': 'AC'+id+mac.replace(/:/g, '').slice(-4), // Rule name
      'Protocol': 'Any',
      'SourceMACAddress': mac, // Device mac
      'Type': 'Routing',
    };
    Object.entries(params).forEach(([key, value]) =>
      rule.push([[root, id, key].join('.'), value, 'xsd:string']));
    return rule;
  } catch (e) {
    console.log('Exception catched generating new AC rule:', e);
    return [];
  }
};

// Try to delete (backwards) AC rules from Genie's database. Enquee deleteObject
// tasks until reach last deleteObject task. Then request a connection at the
// last task, to run all enqueed tasks.
const deleteRules = async function(acsID, arr1) {
  try {
    for (let i = arr1.length-1; i > 0; i--) {
      let rule = [root, arr1[0]].join('.');
      let res = // "requestConn" parameter is set to false to enquee tasks.
        await TasksAPI.addOrDeleteObject(acsID, rule, 'deleteObject', false);
      if (!res) return false;
    }
    let rule = [root, arr1[0]].join('.');
    let res = await TasksAPI.addOrDeleteObject(acsID, rule, 'deleteObject');
    if (!res || !res.success) {
      console.log('An error has occurred at', acsID, '(DELETE) AC rules task');
      return false;
    }
  } catch (e) {
    console.log('Error for device:', acsID);
    console.log('Exception catched deleting AC rules:', e);
    return false;
  }
  return true;
};

// Try to add AC rules to Genie's database. Enquee addObject tasks until reach
// last addObject task. Then request a connection at the last task, to run all
// enqueed tasks.
const addRules = async function(acsID, arr1) {
  try {
    for (let i = 0; i < arr1.length-1; i++) {
      let rule = root;
      let res = // "requestConn" parameter is set to false to enquee tasks.
        await TasksAPI.addOrDeleteObject(acsID, rule, 'addObject', false);
      if (!res) return false;
    }
    let rule = root;
    let res = await TasksAPI.addOrDeleteObject(acsID, rule, 'addObject');
    if (!res || !res.success) {
      console.log('An error has occurred at', acsID, '(ADD) AC rules task');
      return false;
    }
  } catch (e) {
    console.log('Error for device:', acsID);
    console.log('Exception catched adding AC rules:', e);
    return false;
  }
  return true;
};

// Send a setParameterValues task to GenieACS. The parameters are created using
// the newRule function, that generates an AC rule at Genie's patterns.
const setRules = async function(acsID, arr1) {
  try {
    let task = {
      name: 'setParameterValues',
      parameterValues: [
        [root.replace('Filter', 'Enable'), 'true', 'xsd:boolean'],
        [root.replace('Filter', 'Mode'), 'Black List', 'xsd:string'],
      ],
    };
    for (let i = 0; i < arr1.length; i++) {
      let mac = arr1[i]['mac'];
      task.parameterValues = task.parameterValues.concat(newRule(mac, i+1));
    }
    let res = await TasksAPI.addTask(acsID, task);
    if (!res || !res.success) {
      console.log('An error has occurred at', acsID, '(SET) AC rules task');
      return false;
    }
  } catch (e) {
    console.log('Error for device:', acsID);
    console.log('Exception catched setting AC rules:', e);
    return false;
  }
};

// Configure a new set AC of rules at Genie's database based on Flashman's
// blocked devices
const configureAC = async function(acsID, rules = null, blockedDevices) {
  // Error constructor
  const sendError = (line) => ({
    'success': false,
    'error_code': 'acRuleDefaultError',
    'message': t('acRuleDefaultError', {errorline: line}),
  });
  try {
    let n = blockedDevices.length;
    if (rules) {
      let result = checkRules(rules, n);
      if (result.to_delete.length > 0) { // Rules needed to be removed.
        let res = await deleteRules(acsID, result.to_delete);
        // If rules are successfully removed, set new rules array without the
        // removed ones.
        if (res) rules = difference(rules, result.to_delete);
        else return sendError(__line);
      }
      if (result.to_add.length > 0) { // Rules needed to be added.
        let res = await addRules(acsID, result.to_add);
        // If rules are successfully added, set rules array with the new rules.
        if (res) rules = rules.concat(result.to_add);
        else return sendError(__line);
      }
    }
    if (rules.length != n) { // An inconsistency exists
      console.log('Error for device:', acsID);
      console.log('There is an inconsistency between the number of rules in',
                  'Genie\'s and Flashman\'s databases');
      return sendError(__line);
    }
    await setRules(acsID, blockedDevices);
    return {'success': true};
  } catch (e) {
    console.log('Error for device:', acsID);
    console.log('Exception catched running AC configuration:', e);
    return sendError(__line);
  }
};

const getAcRuleIds = async function(acsID) {
  let query = {_id: acsID};
  let path = '/devices/?query='+JSON.stringify(query)+'&projection='+root;
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
        reject([]);
      });
      resp.on('data', (chunk) => data+=chunk);
      resp.on('end', async () => {
        if (data.length > 0) {
          try {
            // Get data after the request ends
            data = JSON.parse(data)[0];
            let rulesIDs = [];
            if (utilHandlers.checkForNestedKey(data, root)) {
              let ACTree = utilHandlers.getFromNestedKey(data, root);
              Object.entries(ACTree).forEach((rule) => {
                // Checks for a real rule ID, that not starts with underscore
                if (rule[0] && !rule[0].startsWith('_')) {
                  rulesIDs.push(rule[0]);
                }
              });
            }
            return resolve({success: true, ids: rulesIDs});
          } catch (e) {
            console.log('Error for device:', acsID);
            console.log('Exception catched retrieving AC rules IDs:', e);
            return reject({success: false});
          }
        }
      });
    });
    req.end();
  });
};

acsAccessControlHandler.changeAcRules = async function(device) {
  // Error constructor
  const sendError = (line) => ({
    'success': false,
    'error_code': 'acRuleGetError',
    'message': t('acRuleGetError', {errorline: line}),
  });
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  // Make sure that this device is abled to do access control
  let permissions = DeviceVersion.devicePermissions(device);
  if (!permissions || !permissions.grantBlockDevices) return;
  // Instantiate CPE by model
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  if (!fields) return;
  let blockedDevices = // Get CPE blocked devices
    Object.values(device.lan_devices).filter((d)=>d.is_blocked);
  // Check for number of rules limits
  if (blockedDevices.length >= 64) {
    console.log('Error for device:', acsID);
    console.log('Number of rules has reached its limits');
    return {
      success: false,
      error_code: 'acRuleLimits',
      message: t('acRuleLimits', {errorline: __line}),
    };
  }
  // Update CPE AC rules tree
  let task = {
    name: 'getParameterValues',
    parameterNames: Object.values(root),
  };
  let res = await TasksAPI.addTask(acsID, task);
  if (!res || !res.success) {
    console.log('An error has occurred at', acsID, '(GET) AC rules task');
    return sendError(__line);
  }
  res = await getAcRuleIds(acsID);
  if (!res || !res.success) {
    console.log('Error retrieving', acsID, 'AC rules IDs');
    return sendError(__line);
  }
  // Check Genie's AC rules IDs
  if (!res.ids) {
    console.log('Error retrieving', acsID, 'AC rules IDs.',
                'Received an undefined or null value');
    return sendError(__line);
  }
  // Configure a new set of rules
  return await configureAC(acsID, res.ids, blockedDevices);
};

module.exports = acsAccessControlHandler;
