/* eslint-disable no-prototype-builtins */
/* global __line */
const TasksAPI = require('../../external-genieacs/tasks-api');
const DevicesAPI = require('../../external-genieacs/devices-api');
const utilHandlers = require('../util.js');
const http = require('http');
const t = require('../../language').i18next.t;

let acsAccessControlHandler = {};
let GENIEHOST = (process.env.FLM_NBI_ADDR || 'localhost');
let GENIEPORT = (process.env.FLM_NBI_PORT || 7557);

// Auxiliary error constructor.
const sendError = (code, line) => ({
  'success': false,
  'error_code': code,
  'message': t(code, {errorline: line}),
});

// Generate AC rule for Genie's patterns with the blocked device MAC address
// and Genie's rule index (id).
const newRule = function(mac, id, root) {
  if (mac == '') return [];
  let params = {
    'DestinationMACAddress': '00:00:00:00:00:00',
    'Name': 'AC'+id+mac.replace(/:/g, '').slice(-4), // Rule name
    'Protocol': 'Any',
    'SourceMACAddress': mac, // Device mac
    'Type': 'Routing',
  };
  return Object.keys(params).map((key)=>{
    let field = [root, id, key].join('.');
    return [field, params[key], 'xsd:string'];
  });
};

// Try to delete (backwards) AC rules from Genie's database. Queue deleteObject
// tasks until reach last deleteObject task. Then request a connection at the
// last task, to run all queued tasks.
const deleteRules = async function(acsID, rootField, indexesToDelete) {
  let reverseIndexOrder = [...indexesToDelete].reverse();
  let indexCount = indexesToDelete.length;
  for (let i = 0; i < indexCount; i++) {
    let deletePath = rootField + '.' + reverseIndexOrder[i];
    let deleteOK = await TasksAPI.addOrDeleteObject(
      acsID, deletePath, 'deleteObject', null, (i == indexCount-1),
    );
    if (!deleteOK) return false;
  }
  return true;
};

// Try to add AC rules to Genie's database. Queue addObject tasks until reach
// last addObject task. Then request a connection at the last task, to run all
// queued tasks.
const addRules = async function(acsID, rootField, indexesToAdd) {
  for (let i = 0; i < indexesToAdd; i++) {
    let addOK = await TasksAPI.addOrDeleteObject(
      acsID, rootField, 'addObject', null, (i == indexesToAdd-1),
    );
    if (!addOK) return false;
  }
  return true;
};

// Send a setParameterValues task to GenieACS. The parameters are created using
// the newRule function, that generates an AC rule with Genie's patterns.
const setRules = async function(acsID, rootField, blockedDevices) {
  let task = {
    name: 'setParameterValues',
    parameterValues: [
      [rootField.replace(/Filter$/, 'Enable'), true, 'xsd:boolean'],
      [rootField.replace(/Filter$/, 'Mode'), 'Black List', 'xsd:string'],
    ],
  };
  for (let i = 0; i < blockedDevices.length; i++) {
    let mac = blockedDevices[i].mac;
    let rule = newRule(mac, i+1, rootField);
    task.parameterValues = task.parameterValues.concat(rule);
  }
  let result = await TasksAPI.addTask(acsID, task);
  if (!result || !result.success) {
    return false;
  }
  return true;
};

// Configure a new set AC of rules at Genie's database based on Flashman's
// blocked devices.
const configureRules = async function(acsID, rootField, blockedDevices, rules) {
  let blockCount = blockedDevices.length;
  // Check integrity of current rules - they must follow sequence 1,2,3 ...
  // If there is a gap, delete every index after that, then recreate indexes
  // If there aren't enough rules, add indexes as needed
  // "rules" array is ALWAYS a sorted array of ints
  // Examples:
  // 5 blocked devices, current rules = 1,2,3,4,5 (Do nothing)
  // 4 blocked devices, current rules = 1,2,5 (Delete 5 / Add twice)
  // 2 blocked devices, current rules = 1,2,3 (Delete 3)
  // 2 blocked devices, current rules = 1 (Add once)
  let sliceIndex = -1;
  // If there are rules, figure out which ones must be deleted
  if (rules.length > 0) {
    // We need indices 1,2,3,4,5 for blockCount 5
    // If rules don't match exactly, use mismatched index as slicer. Example:
    // 3 blocked devices, current rules = 1,2,4 (slicer = 2) (Delete 4)
    // 3 blocked devices, current rules = 2,3,4 (slicer = 0) (Delete all)
    for (let i = 0; i < blockCount; i++) {
      if (rules[i] !== i+1) {
        sliceIndex = i;
        break;
      }
    }
    // If rules were fine, delete everything from blockCount index onwards,
    // since they won't be necessary, example:
    // 3 blocked devices, current rules = 1,2,3,4,5 (Delete 4 and 5)
    if (sliceIndex < 0) {
      sliceIndex = blockCount;
    }
  }
  // Perform the array slicing to find which indexes to delete and how many
  // indexes to add after deleting
  let indexesToDelete = [];
  let rulesAfterDelete = rules;
  if (sliceIndex >= 0) {
    indexesToDelete = rules.slice(sliceIndex); // Delete from slicer onwards
    rulesAfterDelete = rules.slice(0, sliceIndex); // Keep all up to slicer
  }
  let indexesToAdd = (blockCount - rulesAfterDelete.length);
  // Actually delete the indexes that need deleting
  let deleteOK = await deleteRules(acsID, rootField, indexesToDelete);
  if (!deleteOK) {
    console.log('Error deleting AC rules for device ' + acsID);
    return;
  }
  // Actually add the indexes that need to be introduced
  let addOK = await addRules(acsID, rootField, indexesToAdd);
  if (!addOK) {
    console.log('Error adding AC rules for device ' + acsID);
    return;
  }
  // The amount of rules in tree now matches number of blocked devices, so we
  // can properly set the parameters
  let setOK = await setRules(acsID, rootField, blockedDevices);
  if (!setOK) {
    console.log('Error setting AC rules for device' + acsID);
    return;
  }
};

const getAcRuleIds = async function(acsID, rootField, blockedDevices) {
  let query = {_id: acsID};
  let path = '/devices/?query='+JSON.stringify(query)+'&projection='+rootField;
  let options = {
    method: 'GET',
    hostname: GENIEHOST,
    port: GENIEPORT,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let data = '';
    resp.on('data', (chunk) => data+=chunk);
    resp.on('end', async () => {
      if (data.length == 0) return;
      try {
        // Get data after the request ends.
        data = JSON.parse(data)[0];
        let rulesIDs = [];
        if (utilHandlers.checkForNestedKey(data, rootField)) {
          let acTree = utilHandlers.getFromNestedKey(data, rootField);
          rulesIDs = utilHandlers.orderNumericGenieKeys(Object.keys(acTree));
        }
        rulesIDs = rulesIDs.map(Number);
        configureRules(acsID, rootField, blockedDevices, rulesIDs);
      } catch (e) {
        console.log('Error for device:', acsID);
        console.log('Exception caught retrieving AC rules IDs:', e);
      }
    });
  });
  req.end();
};

acsAccessControlHandler.changeAcRules = async function(device) {
  // Make sure we only work with TR-069 devices with a valid ID.
  if (!device || !device.use_tr069 || !device.acs_id) {
    return sendError('macNotFound', __line);
  }
  let acsID = device.acs_id;

  // Instantiate CPE by model
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  if (!fields) return sendError('fieldNotFound', __line);

  let blockedDevices = device.lan_devices.filter((d)=>d.is_blocked);
  // Check for number of rules limits.
  if (blockedDevices.length >= 64) {
    console.log('Error for device:', acsID);
    console.log('Number of rules has reached its limits');
    return sendError('acRuleLimits', __line);
  }

  // Getting AC tree root.
  if (!fields.access_control || fields.access_control.length == 0) {
    console.log('Error for device:', acsID);
    console.log('Undefined AC tree root');
    return sendError('fieldNotFound', __line);
  }
  let rootField = fields.access_control.mac;

  // Update CPE AC rules tree.
  let task = {name: 'getParameterValues', parameterNames: [rootField]};
  let cback = (acsID)=>getAcRuleIds(acsID, rootField, blockedDevices);
  let res = await TasksAPI.addTask(acsID, task, cback);
  if (!res || !res.success) {
    console.log('An error has occurred at', acsID, '(GET) AC rules task');
    return sendError('acRuleGetError', __line);
  }
  return {success: true};
};

module.exports = acsAccessControlHandler;
