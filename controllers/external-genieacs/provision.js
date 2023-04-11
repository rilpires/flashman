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

// Function explodes the keys according to the points and excludes the field
// name in order to generate the parent tree from this node. Returns an array
// with the name of the parent nodes plus '.*.*' at the end
const getParentNode = function(fields, useLastIndexOnWildcard) {
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
  if (useLastIndexOnWildcard) {
    nodes.push('Device.Ethernet.VLANTermination.*.*');
    nodes.push('Device.Ethernet.Link.*.*');
    nodes.push('Device.NAT.PortMapping.*.*');
    nodes.push('Device.NAT.*.*');
    nodes.push('Device.IP.*.*');
    nodes.push('Device.PPP.*.*');
  }
  return nodes;
}

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

const extractIndex = function(path, useLastIndexOnWildcard) {
  if (!path) return null;
  // Extract numeric index from path, if exists
  let regex = useLastIndexOnWildcard ?
                /\b(\d+)./ :         // First index
                /\.(\d+)(?!.*\.\d+)/ // Last index
  let match = path.match(regex);
  // Return null if it has no numeric keys
  return (match !== null) ? match[1] : null;
};

function findInterfaceLink(data, path, i) {
  // Device.IP.Interface.*.LowerLayers <- Device.PPP.Interface.*.
  if (path === null) return null;
  const regex = new RegExp(path.replace("*", i));
  for (let j = 0; j < data.length; j++) {
    if (regex.test(data[j].value)) {
      return data[j].path;
    }
  }
  return null; // Object not found
};

function findEthernetLink(data, path, i) {
   // Device.PPP.Interface.2.LowerLayers -> Device.Ethernet.VLANTermination.*.
   // Device.Ethernet.VLANTermination.*.LowerLayers -> Device.Ethernet.Link.*.
   // Device.Ethernet.Link.*.LowerLayers -> Device.Ethernet.Interface.*.
   if (path === null) return null;
   const pathRegex = new RegExp(path.replace("*", i));
   const valueRegex = new RegExp(
    `^${'Device.Ethernet.VLANTermination.*.'.replace('*', '\\d+')}$`);

   let vlanTerminationLink = '';
   let ethernetLink = '';
   for (let j = 0; j < data.length; j++) {
     if (pathRegex.test(data[j].path) && valueRegex.test(data[j].value[0])) {
       vlanTerminationLink = data[j].value[0] + 'LowerLayers';
     }
   }
   for (let j = 0; j < data.length; j++) {
     if (data[j].path === vlanTerminationLink) {
       ethernetLink = data[j].value[0] + 'LowerLayers';
     }
   }
   for (let j = 0; j < data.length; j++) {
     if (data[j].path === ethernetLink) {
       return data[j].value[0];
     }
   }
   return null;
};

const assembleWanObj = function(result, data, fields, useLastIndexOnWildcard) {
  let tmp = result;
  for (let obj of data) {
    let i = extractIndex(obj.path, useLastIndexOnWildcard);
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
      field[prop] = obj;

      for (let k of Object.keys(tmp)) {
        let currentKey = k.split('_');
        let currPathType = currentKey[1]; // 'ppp' or 'dhcp'
        let currIndex = currentKey[2];
        if (currPathType !== propType) continue;
        if (i === null) {
          // If the variable is equal to null, it means that this path has no
          // index, and this must be added to all WANs
          tmp[k].push(field);
        } else if (pathType !== propType && pathType !== 'common') {
          // The TR-181 works with a stack of links to connect the trees.
          // Whenever the type of the path is different from the type of the
          // property, it means that we have to disregard the index i and look
          // for the correct index. The field is added whenever there is a match
          // of: the index path (i) and the correct path (j); the prop type and
          // the path type
          let nodeType = (currPathType === 'ppp') ? 'PPP' : 'IP';
          let linkPath = 'Device.' + nodeType + '.Interface.*.';
          let correctPath;
          if (pathType === 'dhcp') {
            correctPath = findInterfaceLink(data, linkPath, currIndex);
          } else if (pathType === 'ethernet') {
            correctPath = findEthernetLink(data, linkPath, currIndex);
          }
          let j = extractIndex(correctPath, useLastIndexOnWildcard);
          if (i === j) {
            tmp[k].push(field);
          }
        } else if (currIndex === i.toString()) {
          // Otherwise we have to look for the correct WAN
          tmp[k].push(field);
        }
      }
    }
  }
  return tmp;
};

const updateWanConfiguration = function(fields, useLastIndexOnWildcard) {
  let nodes = getParentNode(fields, useLastIndexOnWildcard);
  log(JSON.stringify(nodes));
  let result = {};
  let data = [];
  let addedPaths = new Set();
  for (let node of nodes) {
    // Key creation: depending on the path type
    let pathType = node.includes('PPP') ? 'ppp' :
                   node.includes('IP') ? 'dhcp' : 'common';
    let i = extractIndex(node, useLastIndexOnWildcard);
    let key = 'wan_' + pathType + '_' + i;
    if (i !== null && !result[key] && (pathType === 'ppp' ||
        pathType === 'dhcp')) {
      result[key] = [];
    }
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
  log(JSON.stringify(data));
  result = assembleWanObj(result, data, fields, useLastIndexOnWildcard);
  // log(JSON.stringify(result));
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
