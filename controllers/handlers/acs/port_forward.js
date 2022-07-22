const DevicesAPI = require('../../external-genieacs/devices-api');
const DeviceModel = require('../../../models/device');
const TasksAPI = require('../../external-genieacs/tasks-api');
const acsXMLConfigHandler = require('./xmlconfig.js');
const utilHandlers = require('../util.js');
const http = require('http');
const debug = require('debug')('ACS_DEVICES_MEASURES');

let acsPortForwardHandler = {};

const fetchAndComparePortForward = async function(acsID) {
  let device;
  try {
    device = await DeviceModel.findOne({acs_id: acsID}).lean();
  } catch (e) {
    return;
  }
  if (!device || !device.use_tr069) {
    return;
  }
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let portMappingTemplate = '';
  if (device.connection_type === 'pppoe') {
    portMappingTemplate = fields.port_mapping_ppp;
  } else {
    portMappingTemplate = fields.port_mapping_dhcp;
  }

  let query = {_id: acsID};
  let projection1 = portMappingTemplate.replace('*', '1').replace('*', '1');
  let projection2 = portMappingTemplate.replace('*', '1').replace('*', '2');
  let path = '/devices/?query=' + JSON.stringify(query) + '&projection=' +
             projection1 + ',' + projection2;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp) => {
    resp.setEncoding('utf8');
    let data = '';
    let i;
    resp.on('data', (chunk)=>data+=chunk);
    resp.on('end', async ()=>{
      if (data.length > 0) {
        data = JSON.parse(data)[0];
      }
      let isDiff = false;
      let template = '';
      if (utilHandlers.checkForNestedKey(data, projection1)) {
        template = projection1;
      } else if (utilHandlers.checkForNestedKey(data, projection2)) {
        template = projection2;
      }
      if (template != '') {
        // Check how many rules are in the current tree
        // If sizes are different, call changePortForwardRules immediately
        let portMappingObj = utilHandlers.getFromNestedKey(data, template);
        let keysCount = Object.keys(portMappingObj).filter((k)=>k[0]!='_');
        if (keysCount.length !== device.port_mapping.length) {
          let diff = device.port_mapping.length - keysCount.length;
          return acsPortForwardHandler.changePortForwardRules(device, diff);
        }

        for (i = 0; i < device.port_mapping.length; i++) {
          let iterateTemplate = template+'.'+(i+1)+'.';
          let portMapEnablePath = iterateTemplate +
                                  fields.port_mapping_values.enable[0];
          if (utilHandlers.checkForNestedKey(data, portMapEnablePath)) {
            if (
              utilHandlers.getFromNestedKey(data, portMapEnablePath) != true
            ) {
              isDiff = true;
              break;
            }
          }
          let portMapLeasePath = iterateTemplate +
                                  fields.port_mapping_values.lease[0];
          if (utilHandlers.checkForNestedKey(data, portMapLeasePath)) {
            if (utilHandlers.getFromNestedKey(data, portMapLeasePath) != 0) {
              isDiff = true;
              break;
            }
          }
          let portMapProtocolPath = iterateTemplate +
                                    fields.port_mapping_values.protocol[0];
          if (utilHandlers.checkForNestedKey(data, portMapProtocolPath)) {
            if (utilHandlers.getFromNestedKey(data,
              portMapProtocolPath) != fields.port_mapping_values.protocol[1]
            ) {
              isDiff = true;
              break;
            }
          }
          let portMapDescriptionPath = iterateTemplate +
                                    fields.port_mapping_values.description[0];
          if (utilHandlers.checkForNestedKey(data, portMapDescriptionPath)) {
            if (
              utilHandlers.getFromNestedKey(data, portMapDescriptionPath) !=
              fields.port_mapping_values.description[1]
            ) {
              isDiff = true;
              break;
            }
          }
          let portMapClientPath = iterateTemplate +
                                  fields.port_mapping_fields.client[0];
          if (utilHandlers.checkForNestedKey(data, portMapClientPath)) {
            if (utilHandlers.getFromNestedKey(data,
              portMapClientPath) != device.port_mapping[i].ip
            ) {
              isDiff = true;
              break;
            }
          }
          let portMapExtStart = iterateTemplate +
            fields.port_mapping_fields.external_port_start[0];
          if (utilHandlers.checkForNestedKey(data, portMapExtStart)) {
            if (utilHandlers.getFromNestedKey(data, portMapExtStart) !=
              device.port_mapping[i].external_port_start) {
              isDiff = true;
              break;
            }
          }
          if (fields.port_mapping_fields.external_port_end) {
            let portMapExtEnd = iterateTemplate +
              fields.port_mapping_fields.external_port_end[0];
            if (utilHandlers.checkForNestedKey(data, portMapExtEnd)) {
              if (utilHandlers.getFromNestedKey(data, portMapExtEnd) !=
                device.port_mapping[i].external_port_end) {
                isDiff = true;
                break;
              }
            }
          }
          let portMapIntStart = iterateTemplate +
            fields.port_mapping_fields.internal_port_start[0];
          if (utilHandlers.checkForNestedKey(data, portMapIntStart)) {
            if (utilHandlers.getFromNestedKey(data, portMapIntStart) !=
              device.port_mapping[i].internal_port_start) {
              isDiff = true;
              break;
            }
          }
          if (fields.port_mapping_fields.internal_port_end) {
            let portMapIntEnd = iterateTemplate +
              fields.port_mapping_fields.internal_port_end[0];
            if (utilHandlers.checkForNestedKey(data, portMapIntEnd)) {
              if (utilHandlers.getFromNestedKey(data, portMapIntEnd) !=
                device.port_mapping[i].internal_port_end) {
                isDiff = true;
                break;
              }
            }
          }
        }
        if (isDiff) {
          acsPortForwardHandler.changePortForwardRules(device, 0);
        }
      } else {
        console.log('Wrong PortMapping in the device tree ' +
                    'from genie. ACS ID is ' + acsID);
      }
    });
  });
  req.end();
};

acsPortForwardHandler.checkPortForwardRules = async function(device) {
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let acsID = device.acs_id;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  let task = {
    name: 'getParameterValues',
    parameterNames: [],
  };
  let portMappingTemplate = '';
  if (device.connection_type === 'pppoe') {
    portMappingTemplate = fields.port_mapping_ppp;
  } else {
    portMappingTemplate = fields.port_mapping_dhcp;
  }
  task.parameterNames.push(portMappingTemplate);
  let result = await TasksAPI.addTask(acsID, task, fetchAndComparePortForward);
  if (!result || !result.success) {
    console.log('Error getting port forward fields on device ' + acsID);
  }
};

acsPortForwardHandler.getLastIndexInterface = async function(device, acsID, rulesDiffLength) {
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let query = {_id: acsID};
  let key = 'Device.IP.Interface';
  let path = '/devices/?query='+JSON.stringify(query)+'&projection='+key;
  let options = {
    method: 'GET',
    hostname: 'localhost',
    port: 7557,
    path: encodeURI(path),
  };
  let req = http.request(options, (resp)=>{
    resp.setEncoding('utf8');
    let data = '';
    let lastIndex = 0;
    resp.on('data', (chunk)=>data+=chunk);
    resp.on('end', async () => {
      if (data.length > 0) {
        try {
          data = JSON.parse(data)[0];
        } catch (err) {
          debug(err);
          data = '';
        }
      }
      let success = false;
      let wildcardFlag = cpe.modelPermissions().useLastIndexOnWildcard;
      if (utilHandlers.checkForNestedKey(data, key, wildcardFlag)) {
        let ret = utilHandlers.getLastIndexOfNestedKey(data, key, wildcardFlag);
        success = ret.success;
        lastIndex = ret.lastIndex;
      }
      if (success && lastIndex) {
        return acsPortForwardHandler.changePortForwardRules(
          device, rulesDiffLength, lastIndex,
        );
      }
    });
  });
  req.end();
};

acsPortForwardHandler.getIPInterface = async function(device, rulesDiffLength) {
  let acsID = device.acs_id;
  let interf = 'Device.IP.Interface';
  let task = {
    name: 'getParameterValues',
    parameterNames: [interf],
  };
  let cback=(acsID)=>acsPortForwardHandler.getLastIndexInterface(
    device, acsID, rulesDiffLength,
  );
  let result = await TasksAPI.addTask(acsID, task, cback);
  if (!result || !result.success) {
    return;
  }
};

acsPortForwardHandler.changePortForwardRules = async function(
  device, rulesDiffLength, interf = null,
) {
  // Make sure we only work with TR-069 devices with a valid ID
  if (!device || !device.use_tr069 || !device.acs_id) return;
  let i;
  let ret;
  // let mac = device._id;
  let acsID = device.acs_id;
  let model = device.model;
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  // redirect to config file binding instead of setParametervalues
  if (cpe.modelPermissions().usesStavixXMLConfig) {
    acsXMLConfigHandler.configFileEditing(device, ['port-forward']);
    return;
  }
  // For TP Link HC220 G5 device, it is necessary to pass the
  // last index interface tree
  if (cpe.modelPermissions().needInterfaceInPortFoward &&
  interf === null) {
    acsPortForwardHandler.getIPInterface(device, rulesDiffLength);
    return;
  }
  let fields = cpe.getModelFields();
  let changeEntriesSizeTask = {name: 'addObject', objectName: ''};
  let updateTasks = {name: 'setParameterValues', parameterValues: []};
  let portMappingTemplate = '';
  if (device.connection_type === 'pppoe') {
    portMappingTemplate = fields.port_mapping_ppp;
  } else {
    portMappingTemplate = fields.port_mapping_dhcp;
  }
  // check if already exists add, delete, set sent tasks
  // getting older tasks for this device id.
  let query = {device: acsID}; // selecting all tasks for a given device id.
  let tasks;
  try {
    tasks = await TasksAPI.getFromCollection('tasks', query);
  } catch (e) {
    console.log('[!] -> '+e.message+' in '+acsID);
  }
  if (!Array.isArray(tasks)) return;
  // if find some task with name addObject or deleteObject
  let hasAlreadySentTasks = tasks.some((t) => {
    return t.name === 'addObject' ||
    t.name === 'deleteObject';
  });
  // drop this call of changePortForwardRules
  if (hasAlreadySentTasks) {
    console.log('[#] -> DC in '+acsID);
    return;
  }
  let currentLength = device.port_mapping.length;
  // The flag needsToQueueTasks marks the models that need to queue the tasks of
  // addObject and deleteObject - this happens because they reboot or lose
  // connection while running the task
  let needsToQueueTasks = cpe.modelPermissions().wan.portForwardQueueTasks;
  if (rulesDiffLength < 0) {
    rulesDiffLength = -rulesDiffLength;
    changeEntriesSizeTask.name = 'deleteObject';
    for (i = 0; i < rulesDiffLength; i++) {
      // If, for example, we had 8 rules and now have 5, we need to delete
      // indexes 6, 7, and 8 (TR-069 starts indexes at 1 rather than 0)
      let index = i + currentLength + 1;
      changeEntriesSizeTask.objectName = portMappingTemplate + '.' + index;
      try {
        // When we're in the last iteration, and we're not going to do a
        // setParameterValues task, so we need to request the connection
        // on the last deleteObject task
        let isLastIter = (i+1 == rulesDiffLength); // Last iteration flag
        let noRuleToAdd = (currentLength == 0); // Won't do a setParameterValues
        let requestConn = ((!needsToQueueTasks) || (noRuleToAdd && isLastIter));
        ret = await TasksAPI.addTask(
          acsID, changeEntriesSizeTask, null, 0, requestConn,
        );
        // Need to check for executed flag if we sent requestConn flag to true
        if (!ret || !ret.success || (requestConn && !ret.executed)) {
          return;
        }
      } catch (e) {
        console.log('[!] -> '+e.message+' in '+acsID);
      }
    }
    console.log('[#] -> D('+rulesDiffLength+') in '+acsID);
  } else if (rulesDiffLength > 0) {
    changeEntriesSizeTask.objectName = portMappingTemplate;
    for (i = 0; i < rulesDiffLength; i++) {
      try {
        let requestConn = (!needsToQueueTasks);
        ret = await TasksAPI.addTask(
          acsID, changeEntriesSizeTask, null, 0, requestConn);
        // Need to check for executed flag if we sent requestConn flag to true
        if (!ret || !ret.success || (requestConn && !ret.executed)) {
          return;
        }
      } catch (e) {
        console.log('[!] -> '+e.message+' in '+acsID);
      }
    }
    console.log('[#] -> A('+rulesDiffLength+') in '+acsID);
  }
  // set entries values for respective array in the device
  for (i = 0; i < currentLength; i++) {
    const iterateTemplate = portMappingTemplate + '.' + (i+1) + '.';
    Object.entries(fields.port_mapping_fields).forEach((v) => {
      updateTasks.parameterValues.push([
        iterateTemplate+v[1][0],
        device.port_mapping[i][v[1][1]], v[1][2]]);
      });
      Object.entries(fields.port_mapping_values).forEach((v) => {
      if (v[0] == 'description') {
        let ruleName = cpe.getPortForwardRuleName(i+1);
        v[1][1] = ruleName;
      }
      updateTasks.parameterValues.push([
        iterateTemplate+v[1][0], v[1][1], v[1][2]]);
    });
    if (cpe.modelPermissions().needInterfaceInPortFoward && interf) {
        updateTasks.parameterValues.push([
          'Device.NAT.PortMapping.1.Interface',
          `Device.IP.Interface.${interf}.`,
          'xsd:string',
        ]);
    }
  }
  // just send tasks if there are port mappings to fill/set
  if (updateTasks.parameterValues.length > 0) {
    console.log('[#] -> U('+currentLength+') in '+acsID);
    await TasksAPI.addTask(acsID, updateTasks);
  }
};

module.exports = acsPortForwardHandler;
