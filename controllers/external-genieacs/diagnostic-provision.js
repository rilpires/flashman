/*
Command to update provision on genie:
  curl -X PUT -i 'http://localhost:7557/provisions/diagnostic' --data "$(cat controllers/external-genieacs/diagnostic-provision.js)"
  curl -i 'http://localhost:7557/presets/diagnostic' -X PUT --data "$(cat controllers/external-genieacs/diagnostic-preset.json)"
*/

log('Success: Diagnostics completed.');

let genieID = declare('DeviceID.ID', {value: 1}).value[0];

let result = ext('devices-api', 'syncDeviceDiagnostics',
                  JSON.stringify({acs_id: genieID}));
if (!result.success) {
  log('Diagnostics provision sync for device ' + genieID + ' failed');
} else {
  log('Diagnostics provision sync for device ' + genieID +
      ' successfully added');
}
