/*
This script should be added to GenieACS as a provision, linked to a preset
profile with no precondition, so that it runs for every device on every inform

Create a provision with the code below as the script argument on the API call
Make sure you properly escape quotation marks!
curl -X PUT -i 'http://localhost:7557/provisions/mynewprovision' --data \
'log("Provision started at " + Date.now());'

The preset should follow this format, linking to the provision created above:
{
  "precondition": true,
  "configurations": [{
    "type" : "provision",
    "name" : "mynewprovision"
  }],
}

You can add it to genieacs via the API:
curl -i 'http://localhost:7557/presets/inform' -X PUT --data \
'{"precondition":true,"configurations":[{"type":"provision","name":\
"mynewprovision"}]}'
*/

const now = Date.now();

let oui = declare('DeviceID.OUI', {value: 1}).value[0];
let model = declare('InternetGatewayDevice.DeviceInfo.ModelName', {value: 1}).value[0];
let serial = declare('DeviceID.SerialNumber', {value: 1}).value[0];
let genieID = oui + '-' + model + '-' + serial;
let mac = declare('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.MACAddress', {value: 1}).value[0];

log('Provision for device ' + genieID + ' started at ' + now.toString());

let args = {mac: mac, acs_id: genieID};
let result = ext('devices-api', 'syncDeviceData', JSON.stringify(args));
if (!result.success) {
  log('Provision sync for device ' + genieID + ' failed: ' + result.message);
}
