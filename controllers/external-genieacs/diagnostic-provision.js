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
  curl -X PUT -i 'http://localhost:7557/provisions/diagnostic' --data "$(cat controllers/external-genieacs/diagnostic-provision.js)"
*/

let genieID = declare('DeviceID.ID', {value: 1}).value[0];

args = {acs_id: genieID};
result = ext('devices-api', 'syncDeviceDiagnostics', JSON.stringify(args));
if (!result.success) {
  log('Diagnostics provision sync for device ' + genieID); 
}
