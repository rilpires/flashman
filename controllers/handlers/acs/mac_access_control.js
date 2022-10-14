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


/*
Gerar um array de N numeros sequenciais, sendo N o número de disp. bloqueados
Comparar arrays de regras de cada Wlan com o array gerado acima
  Se forem iguais, passar direto
  Se fore diferentes, então precisa deletar regras a partir do 1 ID divergente
Adicionar regras faltantes usando n-len(array) para cada Wlan
*/

const sort = (arr1) => arr1.sort((a, b) => a-b);
const difference = (arr1, arr2) => arr1.filter((x) => !arr2.includes(x));

// Checa se existe buraco nas regras, se tiver, retorna os índices das regras do
// buraco em diante
const dismatch = function(arr1) {
  let antId = null;
  let gap = false;
  let dismatch = [];
  for (let i = 0; i < arr1.length; i++) {
    if (antId && !gap && (arr1[i] - antId) > 1) {
      gap = true;
    }
    if (gap) dismatch.push(arr1[i]);
    antId = arr1[i];
  }
  return dismatch;
};

// Checa se precisa deletar ou adicionar regras na árvore
const checkRules = function(arr1, n) {
  let neddedIds = Array.from({length: n}, (_, i) => i + 1);
  let gap = dismatch(arr1);
  let residue = difference(arr1, neddedIds);
  let missing = difference(neddedIds, arr1);
  let toDelete = (gap.length > 0) ? sort(gap.concat(residue)) : residue;
  let toAdd = (gap.length > 0) ? sort(toDelete.concat(missing)) : missing;
  return {to_delete: toDelete, to_add: toAdd};
};

//
//
// ACS operations

let root = 'InternetGatewayDevice.Firewall.X_ZTE-COM_MacFilterService.Filter';

const newRule = function(mac, id) {
  if (mac == '') return [];
  try {
    let rule = [];
    let params = {
      'DestinationMACAddress': '00:00:00:00:00:00',
      'Name': 'AC'+id+mac.replace(/:/g, '').slice(-4), // rule name
      'Protocol': 'Any',
      'SourceMACAddress': mac, // device mac
      'Type': 'Routing',
    };
    Object.entries(params).forEach(([key, value]) =>
      rule.push([[root, id, key].join('.'), value, 'xsd:string']));
    return rule;
  } catch (e) {
    console.log('Exception catched while trying to generate new AC rule:', e);
    return [];
  }
};

// Fazer o delete de regras de trás pra frente
const deleteRules = async function(acsID, arr1) {
  try {
    for (let i = arr1.length-1; i > 0; i--) {
      let rule = [root, arr1[0]].join('.');
      let res = // requestConn parameter setted to false to enquee tasks
        await TasksAPI.addOrDeleteObject(acsID, rule, 'deleteObject', false);
      if (!res) return false;
    }
    let rule = [root, arr1[0]].join('.');
    let res = await TasksAPI.addOrDeleteObject(acsID, rule, 'deleteObject');
    if (!res) return false;
  } catch (e) {
    console.log('Exception deleting AC rules for device ' + acsID);
    return false;
  }
  return true;
};

// Fazer o add com a flag de execução como false e na ultima task enviar a flag
// de execução como true
const addRules = async function(acsID, arr1) {
  try {
    for (let i = 0; i < arr1.length-1; i++) {
      let rule = root;
      let res = // requestConn parameter setted to false to enquee tasks
        await TasksAPI.addOrDeleteObject(acsID, rule, 'addObject', false);
      if (!res) return false;
    }
    let rule = root;
    let res = await TasksAPI.addOrDeleteObject(acsID, rule, 'addObject');
    if (!res) return false;
  } catch (e) {
    console.log('Exception adding AC rules for device ' + acsID);
    return false;
  }
  return true;
};

// Fazer o add com a flag de execução como false e na ultima task enviar a flag
// de execução como true
const setRules = async function(acsID, arr1) {
  try {
    let task = {
      name: 'setParameterValues',
      parameterValues: [
        [root.replace('Filter', 'Enable'), 'true', 'xsd:boolean'],
        [root.replace('Filter', 'Mode'), 'Black List', 'xsd:string'],
      ],
    };
    for (let i = 0; i < arr1.length-1; i++) {
      let rule = arr1[i];
      task.parameterValues =
        task.parameterValues.concat(newRule(rule['mac'], i+1));
    }
    let rule = arr1[arr1.length-1];
    task.parameterValues =
      task.parameterValues.concat(newRule(rule['mac'], arr1.length));
    console.log(task);
    let res = await TasksAPI.addTask(acsID, task);
    if (!res || !res.success) {
      console.log('Error in editing Access Control rules task at '+acsID);
      return false;
    }
  } catch (e) {
    console.log('Error: failed to edit Access Control rules at '+acsID);
    return false;
  }
};


//
//
// Flows

const normalFlow = async function(acsID, rulesIDs = null, blockedDevices) {
  let n = blockedDevices.length;
  let rules = rulesIDs;
  if (rulesIDs) {
    let result = checkRules(rulesIDs, n);
    if (result.to_delete.length > 0) {
      let res = await deleteRules(acsID, result.to_delete);
      if (res) rules = difference(rules, result.to_delete);
      else return false;
    }
    if (result.to_add.length > 0) {
      let res = await addRules(acsID, result.to_add);
      if (res) rules = rules.concat(result.to_add);
      else return false;
    }
  }
  if (rules.length == n) {
    await setRules(acsID, blockedDevices);
  }
  return true;
};

//
//
//
const getAcRuleIds = async function(acsID) {
  // ===== Get device AC tree =====
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
            // Get data
            data = JSON.parse(data)[0];
            let acTreeRuleIds = [];
            if (utilHandlers.checkForNestedKey(data, root)) {
              let acSubtree = utilHandlers.getFromNestedKey(
                data, root,
              );
              Object.entries(acSubtree).forEach((acRule) => {
                let acRuleId = acRule[0];
                if (acRuleId && !acRuleId.startsWith('_')) {
                  acTreeRuleIds.push(acRuleId);
                }
              });
            }
            // If success, Resolve
            console.log('Successfully obtained AC rule trees');
            return resolve(acTreeRuleIds);
          } catch (e) {
            // If error, Reject
            console.log(
              'Error ('+e+') retrieving Access Control Rules at '+acsID);
            return reject([]);
          }
        }
      });
    });
    req.end();
  });
};


acsAccessControlHandler.changeAcRules = async function(device) {
  // ===== Check device =====
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let serial = device.serial_tr069;
  // Make sure that this device is abled to do access control
  // let permissions = DeviceVersion.devicePermissions(device);
  // if (!permissions || !permissions.grantBlockDevices) return;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  if (!fields) return;
  // ===== Get blockedDevices and AC rules trees =====
  // Creates the structures related to WLAN subtrees
  // Make sure there are no more than 64 devices to block - limit of 64 rules
  let blockedDevices = Object.values(device.lan_devices).filter(
    (d)=>d.is_blocked,
  );
  let blockedDevicesCount = blockedDevices.length;
  if (blockedDevicesCount >= 64) {
    console.log('Number of rules has reached its limit for device ' + acsID);
    return {
      success: false,
      error_code: 'acRuleLimits',
      message: t('acRuleLimits', {errorline: __line}),
    };
  }
  // ===== Update device tree =====
  let task = {
    name: 'getParameterValues',
    parameterNames: Object.values(root),
  };
  // let cback = (acsID) => getAcRuleIds(acsID);

  let cback = null;
  let result = await TasksAPI.addTask(acsID, task, cback);
  if (!result || !result.success) {
    console.log('Error: failed to retrieve Access Control Rules at '+serial);
    return {
      'success': false, 'error_code': 'acRuleGetError',
      'message': t('acRuleGetError', {errorline: __line}),
    };
  }

  let res = await normalFlow(acsID, await getAcRuleIds(acsID), blockedDevices);
  return {'success': res};
};

module.exports = acsAccessControlHandler;
