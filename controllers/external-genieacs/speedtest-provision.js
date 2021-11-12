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

Command to update provision on genie:
  curl -X PUT -i 'http://localhost:7557/provisions/speedtest' --data "$(cat controllers/external-genieacs/speedtest-provision.js)"
*/

const now = Date.now();

const updateConfiguration = function(fields) {
  // Request field updates from the CPE
  let result = {};
  Object.keys(fields).forEach((key)=>{
    let resp = declare(fields[key], {value: now, writable: now});
    if (resp.value) {
      let value = resp.value[0];
      result[key] = {value: value, writable: resp.writable};
    }
  });
  return result;
};

let genieID = declare('DeviceID.ID', {value: 1}).value[0];
let oui = declare('DeviceID.OUI', {value: 1}).value[0];
let modelClass = declare('DeviceID.ProductClass', {value: 1}).value[0];

log('Provision speedtest for device ' + genieID + ' started at ' + now.toString());

let pingDiagnosticState = declare('InternetGatewayDevice.IPPingDiagnostics', {value: now}).value[0];
log(JSON.stringify(pingDiagnosticState));



// let args = {oui: oui, model: modelClass, acs_id: genieID};
// let result = ext('devices-api', 'getDeviceFields', JSON.stringify(args));

// if (!result.success || !result.fields) {
//   log('Provision sync fields for device ' + genieID + ' failed: ' + result.message);
//   log('OUI identified: ' + oui);
//   log('Model identified: ' + modelClass);
//   return;
// }
// if (!result.measure) {
//   return;
// }

// log ('Provision collecting data for device ' + genieID + '...');
// let fields = result.fields;
// log(fields);
// let data = {
//   common: updateConfiguration(fields.common),
//   wan: updateConfiguration(fields.wan),
//   lan: updateConfiguration(fields.lan),
//   wifi2: updateConfiguration(fields.wifi2),
//   wifi5: updateConfiguration(fields.wifi5),
//   mesh2: updateConfiguration(fields.mesh2),
//   mesh5: updateConfiguration(fields.mesh5),
// };
// args = {acs_id: genieID, data: data};
// result = ext('devices-api', 'syncDeviceData', JSON.stringify(args));
// if (!result.success) {
//   log('Provision sync for device ' + genieID + ' failed: ' + result.message);
// }
