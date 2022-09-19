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


// Collect basic CPE information from database
let genieID = declare('DeviceID.ID', {value: 1}).value[0];
log('Provision for device ' + genieID + ' started at ' + now.toString());
let oui = declare('DeviceID.OUI', {value: 1}).value[0];
let modelClass = declare('DeviceID.ProductClass', {value: 1}).value[0];

// Detect TR-098 or TR-181 data model based on database value
let isIGDModel = declare('InternetGatewayDevice.ManagementServer.URL', {value: 1}).value;
log('Detected device ' + genieID + ' as ' + (isIGDModel ? 'IGD model' : 'Device model'));
let prefix = (isIGDModel) ? 'InternetGatewayDevice' : 'Device';

// Apply connection request credentials preset configuration
let usernameField = prefix + '.ManagementServer.ConnectionRequestUsername';
let currentUsername = declare(usernameField, {value: 1}).value[0];
if (currentUsername !== 'anlix') {
  declare(usernameField, null, {value: 'anlix'});
}
let passwordField = prefix + '.ManagementServer.ConnectionRequestPassword';
let currentPassword = declare(passwordField, {value: 1}).value[0];
if (currentPassword !== 'landufrj123') {
  declare(passwordField, null, {value: 'landufrj123'});
}

// Collect extra information for Flashman model detection
let modelName = declare(prefix + '.DeviceInfo.ModelName', {value: 1}).value[0];
let firmwareVersion = declare(prefix + '.DeviceInfo.SoftwareVersion', {value: 1}).value[0];
let hardwareVersion = declare(prefix + '.DeviceInfo.HardwareVersion', {value: 1}).value[0];

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
  wan: updateConfiguration(fields.wan, result.useLastIndexOnWildcard),
  lan: updateConfiguration(fields.lan, result.useLastIndexOnWildcard),
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
