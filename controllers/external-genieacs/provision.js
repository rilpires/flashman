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
const getParentNode = function(fields) {
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
  return nodes;
}

const getFieldProperty = function(fields, value) {
  let property = '';
  for (let key of Object.keys(fields)) {
    let regex = new RegExp(`^${fields[key].replace('*', '\\d+')}$`);
    if (regex.test(value)) {
      property = key;
      break;
    }
  }
  return property;
};

const updateWanConfiguration = function(fields, useLastIndexOnWildcard) {
  let nodes = getParentNode(fields);
  log(JSON.stringify(nodes));
  let result = {};
  for (let node of nodes) {
    let type = node.includes('PPP') ? 'ppp_' :
               node.includes('IP') ? 'dhcp_' : 'common';
    // Update node
    let responses = declare(node, {value: now, writable: now});
    if (responses.value) {
      for (let resp of responses) {
        if (resp.value) {
          // Collect field properties
          let field = {};
          field.field = getFieldProperty(fields, resp.path);
          if (field.field === '') continue;
          field.path = resp.path;
          field.writable = resp.writable;
          field.value = resp.value;
          // Extract numeric index from path, if exists
          let regex = useLastIndexOnWildcard ?
                        /\b(\d+)./ :         // First index
                        /\.(\d+)(?!.*\.\d+)/ // Last index
          let match = field.path.match(regex);
          let i = (match !== null) ? match[1] : null; // Variable is null if it
                                                      // has no numeric keys
          if (type !== 'common' && i !== null) {
            // If the field is clearly WAN PPP or DHCP, add the element
            // straightforward
            let currentKey = 'wan_' + type + i;
            if (!result[currentKey]) {
              result[currentKey] = [];
            }
            result[currentKey].push(field);
          } else if (type === 'common' && i !== null) {
            // If the field is common but has an index, add it to all WANs that
            // match the path's index
            Object.keys(result).forEach((key) => {
              let keyLastIndex = key.split('_').slice(-1)[0];
              if (keyLastIndex === i.toString()) {
                result[key].push(field);
              }
            });
          } else if (type === 'common' && i === null) {
            // If there is no numerical key, it means that the field must be
            // added on all WANs
            Object.keys(result).forEach((key) => {
              result[key].push(field);
            });
          }
        }
      }
    }
  }
  log(JSON.stringify(result));
  return result;
}

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
