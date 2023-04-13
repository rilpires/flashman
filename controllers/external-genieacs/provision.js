/*
This script should be added to GenieACS as a provision, linked to a preset
profile with no precondition, so that it runs for every device on every inform

Create a provision with the code below as the script argument on the API call
Make sure you properly escape quotation marks
curl -X PUT -i 'http://localhost:7557/provisions/mynewprovision' --data \\
'log(\"Provision started at \" + Date.now());'

The preset should follow this format, linking to the provision created above:
{
  \"precondition\": true,
  \"configurations\": [{
    \"type\" : \"provision\",
    \"name\" : \"mynewprovision\"
  }],
}

You can add it to genieacs via the API:
curl -i 'http://localhost:7557/presets/inform' -X PUT --data \\
'{\"precondition\":true,\"configurations\":[{\"type\":\"provision\",\"name\":\\
\"mynewprovision\"}]}'

Command to update preset on genie:
  curl -i 'http://localhost:7557/presets/inform' -X PUT --data "$(cat controllers/external-genieacs/flashman-preset.json)"
Command to update provision on genie:
  curl -X PUT -i 'http://localhost:7557/provisions/flashman' --data "$(cat controllers/external-genieacs/provision.js)"
*/

const now = Date.now();

const updateConfiguration = function(fields, useLastIndexOnWildcard) {
  // Request field updates from the CPE
  let result = {};
  Object.keys(fields).forEach((key)=>{
    let resp = declare(fields[key], {value: now, writable: now});
    if (resp.value) {
      let target = resp;
      if (useLastIndexOnWildcard) {
        for (let i of resp) {
          target = i;
        }
      }
      result[key] = {value: target.value[0], writable: target.writable};
    }
  });
  return result;
};

const getParentNode = function(fields, isTR181) {
  let nodes = [];
  const hasNumericKey = /\.\d+\./;
  const hasWildcardKey = /\.\*\./;
  Object.keys(fields).forEach((key) => {
    let node;
    if (!hasNumericKey.test(fields[key]) && !hasWildcardKey.test(fields[key])) {
      // If the field does not have numeric keys or wildcards, it must not be
      // changed
      node = fields[key];
    } else {
      // Otherwise, the last substring is discarded and we add the string '.*.*'
      // to update the entire parent node of the given field
      let tmp = fields[key].split('.').slice(0, -1);
      if (tmp[tmp.length - 1] === '*') {
        // If the parent node already ends with the string '.*', just add '.*'
        node = tmp.join('.') + '.*';
      } else if (!isNaN(parseInt(tmp[tmp.length - 1]))) {
        // If the parent node already ends with a numerical key, it is discarded
        // and '.*.*' is added
        node = tmp.slice(0, -1).join('.') + '.*.*';
      } else {
        // If none of the previous cases is true, it is only necessary to add
        // the string '.*.*'
        node = tmp.join('.') + '.*.*';
      }
    }
    if (!nodes.includes(node)) {
      nodes.push(node);
    }
  });
  if (isTR181) {
    // Additional information not required for TR-181 devices
    nodes.push('Device.Ethernet.VLANTermination.*.*');
    nodes.push('Device.Ethernet.Link.*.*');
    nodes.push('Device.NAT.PortMapping.*.*');
    nodes.push('Device.NAT.*.*');
    nodes.push('Device.IP.*.*');
    nodes.push('Device.PPP.*.*');
  }
  return nodes;
};

const getFieldProperty = function(fields, value) {
  let properties = [];
  for (let key of Object.keys(fields)) {
    let regex = new RegExp(`^${fields[key].replace('*', '\\d+')}$`);
    if (regex.test(value)) {
      properties.push(key);
    }
  }
  return properties;
};

const extractIndexes = function(path, isTR181) {
  // For TR-181 devices, only the first numeric key is used as a reference.
  // For TR-098 devices, a maximum of the first three numeric keys are used as
  // references. The surplus will be used to tag repeat properties later
  const endIndex = isTR181 ? 1 : 3;
  const keys = path.split('.').filter((key) => !isNaN(parseInt(key)))
                .map((key) => parseInt(key, 10));
  const indexes = keys.slice(0, endIndex);
  const surplus = keys.slice(endIndex);
  return [indexes, surplus];
};

const extractInterfacePath = function(path, addLowerLayer = false) {
  const parts = path.split('.');
  let linkPath = '';
  for (let i = 0; i < parts.length; i++) {
    const curr = parts[i];
    // If is a number, add and break the loop, so only the first index is added
    if (!isNaN(parseInt(curr))) {
      linkPath += curr + ((addLowerLayer) ? '.LowerLayers' : '.');
      break;
    }
    linkPath += curr + '.';
  }
  return linkPath;
};

const verifyIndexesMatch = function(keyIndexes, indexes) {
  return keyIndexes.every((k, i) => parseInt(k) === indexes[i]);
};

let findInterfaceLink = function(data, path, i) {
  // Device.IP.Interface.*.LowerLayers -> Device.PPP.Interface.*.
  let connectionPath = path.replace('*', i);
  let interfPPP = 'Device.PPP.Interface.';
  let interfIP = 'Device.IP.Interface.';
  for (let j = 0; j < data.length; j++) {
    if (connectionPath === data[j].path && (data[j].value[0].includes(interfPPP) || data[j].value[0].includes(interfIP))) {
      return data[j].value[0];
    }
  }
  return null;
};

let findEthernetLink = function(data, path, i) {
  // Device.Ethernet.Interface.*. -> Device.Ethernet.Link.*.LowerLayers
  // Device.Ethernet.Link.*.LowerLayers -> Device.Ethernet.VLANTermination.*.LowerLayers
  // Device.Ethernet.VLANTermination.*. -> Device.PPP.Interface.*.LowerLayers
  let connectionPath = path.replace('*', i);
  let ethernetLink;
  let vlanLink;
  for (let j = 0; j < data.length; j++) {
    if (connectionPath === data[j].value[0]) {
      ethernetLink = extractInterfacePath(data[j].path, false);
    }
  }
  for (let j = 0; j < data.length; j++) {
    if (ethernetLink === data[j].value[0]) {
      vlanLink = extractInterfacePath(data[j].path, false);
    }
  }
  for (let j = 0; j < data.length; j++) {
    if (vlanLink === data[j].value[0]) {
      return data[j].path;
    }
  }
  return null;
};

let checkIfWanIsUp = function(data, path, suffix) {
  let enablePath = path + suffix;
  for (let j = 0; j < data.length; j++) {
    if (enablePath === data[j].path) {
      if (data[j].value[0] === 'Up' || data[j].value[0] ===  true ||
          data[j].value[0] ===  'true')
      return true;
    }
  }
  return false;
};

const assembleWanObj = function(result, data, fields, isTR181) {
  let tmp = result;
  for (let obj of data) {
    let [indexes, surplus] = extractIndexes(obj.path, isTR181);
    // Addition of obj to WANs: depending on the property's match, since there
    // may be PPP-type properties associated with IP-type paths
    let properties = getFieldProperty(fields, obj.path);
    if (properties.length === 0) continue;

    // Looks for the correct WAN: This depends on the prop match type and the
    // path index
    for (let prop of properties) {
      let pathType = obj.path.includes('PPP') ? 'ppp' :
                     obj.path.includes('IP') ? 'dhcp' :
                     obj.path.includes('Ethernet') ? 'ethernet' : 'common';
      let propType = prop.includes('ppp') ? 'ppp' : 'dhcp';

      let field = {};
      if (surplus.length > 0) prop += '_' + surplus.join('_');
      field[prop] = obj;

      for (let key of Object.keys(tmp)) {
        const keyType = key.split('_')[1];
        const keyIndexes = key.split('_').filter(key => !isNaN(key));
        let typeMatch = (keyType === propType);
        if (!typeMatch) continue;
        if (indexes.length === 0) {
          tmp[key].push(field);
          continue;
        }
        // The TR-181 works with a stack of links to connect the trees. Whenever
        // the type of the path is different from the type of the property, it
        // means that we must disregard the current indices and look for the
        // correct ones to insert the field
        if (propType !== pathType && isTR181) {
          let linkPath;
          let correctPath;
          if (pathType === 'dhcp') {
            linkPath = extractInterfacePath(obj.path, true);
            correctPath = findInterfaceLink(data, linkPath, indexes[0]);
          } else if (pathType === 'ethernet') {
            linkPath = extractInterfacePath(obj.path, false);
            correctPath = findEthernetLink(data, linkPath, indexes[0])
          }
          if (!correctPath) continue;
          // Update indexes with correct path
          indexes = extractIndexes(correctPath, isTR181)[0];
        }
        if (verifyIndexesMatch(keyIndexes, indexes)) {
          tmp[key].push(field);
        }
      }
    }
  }
  return tmp;
};

const updateWanConfiguration = function(fields, isTR181) {
  let nodes = getParentNode(fields,  isTR181);
  let result = {};
  let data = [];
  let addedPaths = new Set();
  for (let node of nodes) {
    // Update node
    let responses = declare(node, {value: now, writable: now});
    if (responses.value) {
      for (let resp of responses) {
        if (resp.value) {
          // Collect field properties
          let obj = {};
          obj.path = resp.path;
          obj.writable = resp.writable;
          obj.value = resp.value;

          // Key creation: depending on the path type
          let pathType = obj.path.includes('PPP') ? 'ppp' :
                         obj.path.includes('IP') ? 'dhcp' : 'common';
          let indexes = [];
          if (isTR181) {
            // TR-181 devices, it is necessary to filter the interfaces, because
            // not all of them are WANs. To decide whether a path should
            // generate a new key, is evaluated the AddressingType node, which
            // receives the connection type. If the connection type is supported
            // by Flashman, it evaluates whether the WAN is enabled by analyzing
            // the Enable/Status field
            if (obj.path.includes('AddressingType')) {
              let correctPath;
              if (obj.value[0] === 'DHCP') {
                let linkPath = extractInterfacePath(obj.path, true);
                correctPath = findInterfaceLink(data, linkPath, indexes[0]);
                correctPath = extractInterfacePath(obj.path);
              } else if (obj.value[0] === 'IPCP') {
                let linkPath = extractInterfacePath(obj.path, true);
                correctPath = findInterfaceLink(data, linkPath, indexes[0]);
              }
              if (correctPath) {
                let enableField = fields.pppoe_enable.split('.').pop();
                let isUp = checkIfWanIsUp(data, correctPath, enableField);
                if (isUp) {
                  // Update indexes and path type
                  indexes = extractIndexes(correctPath, isTR181)[0];
                  pathType = extractType(correctPath, true);
                }
              }
            }
          } else {
            // For TR-098 devices, there is no need to be concerned about the
            // object not representing a physical WAN
            indexes = extractIndexes(obj.path, isTR181)[0];
          }
          let key = 'wan_' + pathType + '_' + indexes.join('_');
          if (indexes.length > 0 && !result[key] && (pathType === 'ppp' ||
              pathType === 'dhcp')) {
            result[key] = [];
          }

          // Ensures that no duplicate paths will be added
          if (!addedPaths.has(resp.path)) {
            data.push(obj);
            addedPaths.add(resp.path);
          }
        }
      }
    }
  }
  result = assembleWanObj(result, data, fields, isTR181);
  return result;
};

const fetchPortFoward = function(fields, data) {
  let base = '';
  let ret = [];
  if (data.port_mapping_entries_dhcp &&
      data.port_mapping_entries_dhcp.value) {
    base = fields.port_mapping_dhcp;
  } else if(data.port_mapping_entries_ppp &&
    data.port_mapping_entries_ppp.value) {
    base = fields.port_mapping_ppp;
  }
  let subtree = declare(base+'.*.*', {value: now});
  for (let st of subtree) {
    let obj = {};
    obj.path = st.path;
    obj.value = st.value;
    ret.push(obj);
  }
  return ret;
};

// 1. Collect information
// Collect basic CPE information from database
let genieID = declare('DeviceID.ID', {value: 1});
let oui = declare('DeviceID.OUI', {value: 1});
let modelClass = declare('DeviceID.ProductClass', {value: 1});

// Detect TR-098 or TR-181 data model based on database value
let isIGDModel = declare('InternetGatewayDevice.ManagementServer.URL', {value: 1}).value;
let prefix = (isIGDModel) ? 'InternetGatewayDevice' : 'Device';

let modelName = declare(prefix + '.DeviceInfo.ModelName', {value: 1});
let firmwareVersion = declare(prefix + '.DeviceInfo.SoftwareVersion', {value: 1});
let hardwareVersion = declare(prefix + '.DeviceInfo.HardwareVersion', {value: 1});

// 2. Run the script
genieID = genieID.value[0];
log('Provision for device ' + genieID + ' started at ' + now.toString());
oui = oui.value[0];
modelClass = modelClass.value[0];

log('Detected device ' + genieID + ' as ' + (isIGDModel ? 'IGD model' : 'Device model'));

// Collect extra information for Flashman model detection
modelName = modelName.value[0];
firmwareVersion = firmwareVersion.value[0];
hardwareVersion = hardwareVersion.value[0];

let args = {
  oui: oui,
  model: modelClass,
  modelName: modelName,
  firmwareVersion: firmwareVersion,
  hardwareVersion: hardwareVersion,
  acs_id: genieID,
};

// Get configs and model fields from Flashman via HTTP request
let result = ext('devices-api', 'getDeviceFields', JSON.stringify(args));

// Error contacting Flashman - could be network issue or unknown model
if (!result.success || !result.fields) {
  log('Provision sync fields for device ' + genieID + ' failed: ' + result.message);
  log('OUI identified: ' + oui);
  log('Model identified: ' + modelClass);
  return;
}

// Apply connection request credentials preset configuration
if (result.connection) {
  let usernameField = prefix + '.ManagementServer.ConnectionRequestUsername';
  let passwordField = prefix + '.ManagementServer.ConnectionRequestPassword';

  let targetLogin = (result.connection.login) ?
    result.connection.login : 'anlix';
  declare(usernameField, null, {value: targetLogin});

  let targetPassword = (result.connection.password) ?
    result.connection.password : 'landufrj123';
  declare(passwordField, null, {value: targetPassword});
}

// Flashman did not ask for a full provision sync - provision is done
if (!result.measure) {
  return;
}

// Collect all CPE data through provision to send to Flashman
// Expected to run on creation, fware upgrade and cpe reset recovery
log ('Provision collecting data for device ' + genieID + '...');
let fields = result.fields;
updateWanConfiguration(fields.wan, result.useLastIndexOnWildcard);
let data = {
  common: updateConfiguration(fields.common, result.useLastIndexOnWildcard),
  wan: updateConfiguration(fields.wan, result.useLastIndexOnWildcard),
  lan: updateConfiguration(fields.lan, result.useLastIndexOnWildcard),
  ipv6: updateConfiguration(fields.ipv6, result.useLastIndexOnWildcard),
  wifi2: updateConfiguration(fields.wifi2, result.useLastIndexOnWildcard),
  wifi5: updateConfiguration(fields.wifi5, result.useLastIndexOnWildcard),
  mesh2: updateConfiguration(fields.mesh2, result.useLastIndexOnWildcard),
  mesh5: updateConfiguration(fields.mesh5, result.useLastIndexOnWildcard),
};

/*if the nature of sync is for create a device and the device already
  had previous port mapping entries, then we send back these entries
  on creation to avoid sync race condition after the creation of
  device in flashman database */
if ((result.measure_type && result.measure_type === 'newDevice' &&
  ((data.wan.port_mapping_entries_dhcp && data.wan.port_mapping_entries_dhcp.value > 0) ||
  (data.wan.port_mapping_entries_ppp && data.wan.port_mapping_entries_ppp.value > 0)))) {
  data.port_mapping = fetchPortFoward(fields, data.wan);
}
args = {acs_id: genieID, data: data};

// Send data to Flashman via HTTP request
result = ext('devices-api', 'syncDeviceData', JSON.stringify(args));
if (!result.success) {
  log('Provision sync for device ' + genieID + ' failed: ' + result.message);
}
