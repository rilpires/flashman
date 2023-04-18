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
  let wanFields = fields.wan;
  Object.keys(wanFields).forEach((key) => {
    let node;
    if (!hasNumericKey.test(wanFields[key]) && !hasWildcardKey.test(wanFields[key])) {
      // If the field does not have numeric keys or wildcards, it must not be
      // changed
      node = wanFields[key];
    } else {
      // Otherwise, the last substring is discarded and we add the string '.*.*'
      // to update the entire parent node of the given field
      let tmp = wanFields[key].split('.').slice(0, -1);
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
    // Additional information required for TR-181 devices
    nodes.push('Device.Ethernet.VLANTermination.*.*');
    nodes.push('Device.Ethernet.Link.*.*');
    nodes.push('Device.NAT.PortMapping.*.*');
    nodes.push('Device.NAT.*.*');
    nodes.push('Device.IP.*.*');
    nodes.push('Device.PPP.*.*');
  }
  nodes.push(fields.port_mapping_dhcp + '.*.*');
  nodes.push(fields.port_mapping_ppp + '.*.*');
  return nodes;
};

const convertIndexIntoWildcard = function(path) {
  return path.split('.').map((part, i) => {
    if (isNaN(parseInt(part))) {
      return part;
    } else {
      return '*';
    }
  }).join('.');
};

const getFieldProperties = function(fields, path) {
  let properties = [];
  let pattern = convertIndexIntoWildcard(path);
  for (let key of Object.keys(fields)) {
    let prop = convertIndexIntoWildcard(fields[key]);
    if (pattern === prop) {
      properties.push(key);
    }
  }
  if (path.includes('PortMapping') && properties.length === 0) {
    properties.push('port_mapping');
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

const verifyIndexesMatch = function(keyIndexes, indexes) {
  return keyIndexes.every((k, i) => parseInt(k) === indexes[i]);
};

const extractLinkPath = function(path, addLowerLayer = false) {
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

let findInterfaceLink = function(data, path, i) {
  // Device.IP.Interface.*.LowerLayers -> Device.PPP.Interface.*.
  let connectionPath = path.replace('*', i);
  let interfPPP = 'Device.PPP.Interface.';
  let interfIP = 'Device.IP.Interface.';
  for (let j = 0; j < data.length; j++) {
    if (connectionPath === data[j].path && (data[j].value[0].includes(interfPPP)
        || data[j].value[0].includes(interfIP))) {
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
      ethernetLink = extractLinkPath(data[j].path);
    }
  }
  for (let j = 0; j < data.length; j++) {
    if (ethernetLink === data[j].value[0]) {
      vlanLink = extractLinkPath(data[j].path);
    }
  }
  for (let j = 0; j < data.length; j++) {
    if (vlanLink === data[j].value[0]) {
      return data[j].path;
    }
  }
  return null;
};

function findPortMappingLink(data, path) {
  // If the connection is IP:
  // Device.NAT.PortMapping.*.Interface -> Device.IP.Interface.*.
  // If the connection is PPP:
  // Device.NAT.PortMapping.*.Interface -> Device.IP.Interface.*.
  // Device.IP.Interface.*.LowerLayers -> Device.PPP.Interface.*.
  let ipLink = null;
  for (let j = 0; j < data.length; j++) {
    if (path === data[j].path) {
      ipLink = extractLinkPath(data[j].value[0]);
      break;
    }
  }
  let pppLink = ipLink + 'LowerLayers';
  for (let j = 0; j < data.length; j++) {
    if (pppLink === data[j].path) {
      if (data[j].value[0].includes('PPP')) {
        return data[j].value[0];
      }
    }
  }
  return ipLink;
};

const assembleWanObj = function(result, data, fields, isTR181) {
  let tmp = result;
  let port = {};
  for (let obj of data) {
    let [indexes, surplus] = extractIndexes(obj.path, isTR181);
    // Addition of obj to WANs: depending on the property's match, since there
    // may be PPP-type properties associated with IP-type paths
    let properties = getFieldProperties(fields, obj.path);
    if (properties.length === 0) continue;

    // Looks for the correct WAN: This depends on the prop match type and the
    // path index
    for (let prop of properties) {
      let pathType = obj.path.includes('PPP') ? 'ppp' :
                     obj.path.includes('IP') ? 'dhcp' :
                     obj.path.includes('Ethernet') ? 'ethernet' : 'undefined';
      let propType = prop.includes('ppp') ? 'ppp' : 'dhcp';

      // The keys associated with port mapping must be treated differently
      // because, in the TR-098, they will be classified as dhcp or ppp
      let isPortMapping = (obj.path.includes('PortMapping') &&
                           properties.length === 1 &&
                           properties[0] === 'port_mapping');
      if (isPortMapping) pathType = 'port_mapping';

      let field = {};
      if (surplus.length > 0) prop += '_' + surplus.join('_');
      field[prop] = obj;

      for (let key of Object.keys(tmp)) {
        const keyType = key.split('_')[1];
        const keyIndexes = key.split('_').filter(key => !isNaN(key));
        let typeMatch = (keyType === propType);
        if (!typeMatch && !isPortMapping) continue;
        // If the path does not have indexes, the same must be added on all WANs
        if (indexes.length === 0) {
          Object.assign(result[key], field);
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
            linkPath = extractLinkPath(obj.path, true);
            correctPath = findInterfaceLink(data, linkPath, indexes[0]);
          } else if (pathType === 'ethernet') {
            linkPath = extractLinkPath(obj.path);
            correctPath = findEthernetLink(data, linkPath, indexes[0])
          } else if (pathType === 'port_mapping') {
            linkPath = extractLinkPath(obj.path) + 'Interface';
            correctPath = findPortMappingLink(data, linkPath)
          }
          if (!correctPath) continue;
          // Update indexes with correct path
          indexes = extractIndexes(correctPath, isTR181)[0];
        }
        // If the flow reached this point, it means that we have a path with
        // indixes and these must be an exact match of the key
        if (verifyIndexesMatch(keyIndexes, indexes)) {
          if (isPortMapping) {
            tmp[key]['port_mapping'].push(obj);
          } else {
            Object.assign(result[key], field);
          }
        }
      }
    }
  }
  return tmp;
};

let wanKeyCriation = function(data, fields, isTR181) {
  let result = {};
  for (let obj of data) {
    let pathType = obj.path.includes('PPP') ? 'ppp' :
                   obj.path.includes('IP') ? 'dhcp' : 'common';
    let indexes = [];
    if (isTR181) {
      // TR-181 devices, it is necessary to filter the interfaces, because not
      // all of them are WANs. To decide whether a path should generate a new
      // key, we evaluate the AddressingType node, which receives the conn type
      if (obj.path.includes('AddressingType')) {
        let correctPath;
        if (obj.value[0] === 'DHCP') {
          // If the connection is DHCP, the path index already represents a
          // physical connection
          correctPath = extractLinkPath(obj.path);
        } else if (obj.value[0] === 'IPCP') {
          let linkPath = extractLinkPath(obj.path, true);
          correctPath = findInterfaceLink(data, linkPath, indexes[0]);
        }
        if (correctPath) {
          // Update indexes and path type
          indexes = extractIndexes(correctPath, isTR181)[0];
          pathType = correctPath.includes('PPP') ? 'ppp' :
                     correctPath.includes('IP') ? 'dhcp' : 'common';
        }
      }
    } else {
      // For TR-098 devices, key creation is straightforward
      indexes = extractIndexes(obj.path, isTR181)[0];
    }
    // Once we have the correct indexes, a new key is created
    let key = 'wan_' + pathType + '_' + indexes.join('_');
    if (indexes.length > 0 && !result[key] && (pathType === 'ppp' ||
        pathType === 'dhcp')) {
      result[key] = {};
      result[key]['port_mapping'] = [];
    }
  }
  return result;
};

const updateWanConfiguration = function(fields, isTR181) {
  let nodes = getParentNode(fields,  isTR181);
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
          // Ensures that no duplicate paths will be added
          if (!addedPaths.has(resp.path)) {
            data.push(obj);
            addedPaths.add(resp.path);
          }
        }
      }
    }
  }
  let result = wanKeyCriation(data, fields.wan, isTR181);
  result = assembleWanObj(result, data, fields.wan, isTR181);
  log(JSON.stringify(result));
  return result;
};

// 1. Collect information
// Collect basic CPE information from database
let genieID = declare('DeviceID.ID', {value: 1});
let oui = declare('DeviceID.OUI', {value: 1});
let modelClass = declare('DeviceID.ProductClass', {value: 1});

// Detect TR-098 or TR-181 data model based on database value
let isIGDModel = declare('InternetGatewayDevice.ManagementServer.URL', {value: 1}).value;
let prefix = (isIGDModel) ? 'InternetGatewayDevice' : 'Device';
let isTR181 = (prefix === 'Device') ? true : false;

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

let data = {
  common: updateConfiguration(fields.common, result.useLastIndexOnWildcard),
  wan: updateWanConfiguration(fields, isTR181),
  lan: updateConfiguration(fields.lan, result.useLastIndexOnWildcard),
  ipv6: updateConfiguration(fields.ipv6, result.useLastIndexOnWildcard),
  wifi2: updateConfiguration(fields.wifi2, result.useLastIndexOnWildcard),
  wifi5: updateConfiguration(fields.wifi5, result.useLastIndexOnWildcard),
  mesh2: updateConfiguration(fields.mesh2, result.useLastIndexOnWildcard),
  mesh5: updateConfiguration(fields.mesh5, result.useLastIndexOnWildcard),
};

args = {acs_id: genieID, data: data};

// Send data to Flashman via HTTP request
result = ext('devices-api', 'syncDeviceData', JSON.stringify(args));
if (!result.success) {
  log('Provision sync for device ' + genieID + ' failed: ' + result.message);
}
