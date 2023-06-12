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

const updateWanConfiguration = function(fields, isTR181) {
  let args = {
    fields: fields,
    isTR181: isTR181,
  };
  let nodes = ext('devices-api', 'getWanNodesProvision', JSON.stringify(args));
  let data = [];
  let addedPaths = new Set();
  let NodesDeclares = new Map();
  // First, ask for all nodes to the CPE
  for (let node of nodes) {
    NodesDeclares[node] = declare(node, {value: now, writable: now});
  }
  // Then, execute all gets at once and use their values
  for (let node of nodes) {
    // Update node
    let responses = NodesDeclares[node];
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
  args.data = data;
  args.fields = fields.wan;
  let result = ext('devices-api', 'assembleWanObjProvision', JSON.stringify(args));
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

let bootstrapEvent = declare('Events.0_BOOTSTRAP', {value: 1});
let bootEvent = declare('Events.1_BOOT', {value: 1});

let usernameField = prefix + '.ManagementServer.ConnectionRequestUsername';
let passwordField = prefix + '.ManagementServer.ConnectionRequestPassword';
let connUserName = declare(usernameField, {value: 1});
let connPassword = declare(passwordField, {value: 1});

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

// Pass event type to flashman
let event = {boot: false, bootstrap: false, change: false};
if(bootstrapEvent && bootstrapEvent.value && bootstrapEvent.value[0] >= now)
  event.bootstrap = true;
if(bootEvent && bootEvent.value && bootEvent.value[0] >= now)
  event.boot = true;
if(args[0] === 'CHANGE')
  event.change = true;

// Pass connection request credentials to flashman
let connection = {
  login: '',
  password: '',
};

if(connUserName && connUserName.value && connUserName.value[0] != '')
  connection.login = connUserName.value[0];
if(connPassword && connPassword.value && connPassword.value[0] != '')
  connection.password = connPassword.value[0];

let Fargs = {
  oui: oui,
  model: modelClass,
  modelName: modelName,
  firmwareVersion: firmwareVersion,
  hardwareVersion: hardwareVersion,
  acs_id: genieID,
  events: event,
  connection: connection,
};

// Get configs and model fields from Flashman via HTTP request
let result = ext('devices-api', 'getDeviceFields', JSON.stringify(Fargs));

// Error contacting Flashman - could be network issue or unknown model
if (!result.success || !result.fields) {
  log('Provision sync fields for device ' + genieID + ' failed: ' + result.message);
  log('OUI identified: ' + oui);
  log('Model identified: ' + modelClass);
  return;
}

// Apply connection request credentials preset configuration
if (result.connection) {
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

Fargs = {acs_id: genieID, data: data, events: event};

// Send data to Flashman via HTTP request
result = ext('devices-api', 'syncDeviceData', JSON.stringify(Fargs));

if (!result.success) {
  log('Provision sync for device ' + genieID + ' failed: ' + result.message);
}
