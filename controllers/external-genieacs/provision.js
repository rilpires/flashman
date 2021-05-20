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
  curl -X PUT -i 'http://localhost:7557/provisions/flashman' --data "$(cat controllers/external-genieacs/provision.js)"
*/

const now = Date.now();

const updateConfiguration = function(fields) {
  // Request field updates from the CPE
  let result = {};
  Object.keys(fields).forEach((key)=>{
    let resp = declare(fields[key], {value: now});
    if (resp.value) {
      let value = resp.value[0];
      result[key] = value;
    }
  });
  return result;
};

const fetchPortMappingValues = function(pmFields, pmEntries) {
  let i;
  let resp;
  let entriesLength;
  let pmValues = [];
  let pmObj = {};
  resp = declare(pmEntries, {value: now});
  if (resp.value) {
    entriesLength = resp.value[0];
  }
  for (i = 1; i <= entriesLength; i++) {
    resp = declare(pmFields['template'] + '.' + i +
     '.' + pmFields['external_port_start'], {value: now});
    if (resp.value) {
      pmObj.external_port_start = resp.value[0];
    }

    if (pmFields['external_port_end'] != '') {
      resp = declare(pmFields['template'] + '.' + i +
       '.' + pmFields['external_port_end'], {value: now});
      if (resp.value) {
        pmObj.external_port_end = resp.value[0];
      }
    } else {
      pmObj.external_port_end = resp.value[0];
    }

    resp = declare(pmFields['template'] + '.' + i +
     '.' + pmFields['internal_port_start'], {value: now});
    if (resp.value) {
      pmObj.internal_port_start = resp.value[0];
    }

    if (pmFields['internal_port_end'] != '') {
      resp = declare(pmFields['template'] + '.' + i +
       '.' + pmFields['internal_port_end'], {value: now});
      if (resp.value) {
        pmObj.internal_port_end = resp.value[0];
      }
    } else {
      pmObj.internal_port_end = resp.value[0];
    }

    resp = declare(pmFields['template'] + '.' + i +
     '.' + pmFields['client'], {value: now});
    if (resp.value) {
      pmObj.ip = resp.value[0];
    }
    pmValues.push(pmObj);
  }
  return JSON.stringify(pmValues);
};

let genieID = declare('DeviceID.ID', {value: 1}).value[0];
let oui = declare('DeviceID.OUI', {value: 1}).value[0];
let modelClass = declare('DeviceID.ProductClass', {value: 1}).value[0];

log('Provision for device ' + genieID + ' started at ' + now.toString());

let args = {oui: oui, model: modelClass};
let result = ext('devices-api', 'getDeviceFields', JSON.stringify(args));
if (!result.success || !result.fields) {
  log('Provision sync fields for device ' + genieID + ' failed: ' + result.message);
  log('OUI identified: ' + oui);
  log('Model identified: ' + modelClass);
  return;
}
let fields = result.fields;

let data = {
  common: updateConfiguration(fields.common),
  wan: updateConfiguration(fields.wan),
  lan: updateConfiguration(fields.lan),
  wifi2: updateConfiguration(fields.wifi2),
  wifi5: updateConfiguration(fields.wifi5),
  port_mapping: fetchPortMappingValues(fields.port_mapping,
    fields.wan.port_mapping_entries),
};

args = {acs_id: genieID, data: data};
result = ext('devices-api', 'syncDeviceData', JSON.stringify(args));
if (!result.success) {
  log('Provision sync for device ' + genieID + ' failed: ' + result.message);
}
