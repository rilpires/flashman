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
/**
 * GenieACS provision that is called when any value, marked to notify Flashman,
 * in a CPE is changed. 
 * @namespace controllers/external-genieacs/changes-provision
 */

const now = Date.now();

const getDeclare = function(field, updated = false) {
  let lastTime = (updated ? now : 1);
  // Request field updates from the CPE
  return declare(field, {value: lastTime, writable: lastTime});
}

/**
 * Reads the field from GenieACS and returns an object telling the value of the
 * field and if the field is writable. If `updated` is `true`, request the new
 * value from CPE, instead of using the last value known by GenieACS.
 *
 * @memberof controllers/external-genieacs/changes-provision
 *
 * @param {String} field - The field path to get from GenieACS.
 * @param {Boolean} useLastIndexOnWildcard - If should use the last index.
 * @param {Boolean} updated - If must use the last data on CPE or can use the
 * value already saved in GenieACS. (Default: `false`)
 *
 * @return {Object} The object containing:
 *  - `value`: The value that came from GenieACS or the CPE.
 *  - `writable`: If the field is writable or not.
 */
const getValue = function(resp, useLastIndexOnWildcard) {
  let result = {};

  // Check if the value came valid
  if (resp.value) {
    let target = resp;

    // Get the last item if needed
    if (useLastIndexOnWildcard) {
      for (let i of resp) {
        target = i;
      }
    }
  
    // Build the object
    result = {value: target.value[0], writable: target.writable};
  }

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

let modelName = declare(prefix + '.DeviceInfo.ModelName', {value: 1});
let firmwareVersion = declare(prefix + '.DeviceInfo.SoftwareVersion', {value: 1});
let hardwareVersion = declare(prefix + '.DeviceInfo.HardwareVersion', {value: 1});

// 2. Run the script
genieID = genieID.value[0];
log('Change Values for device ' + genieID + ' started at ' + now.toString());
oui = oui.value[0];
modelClass = modelClass.value[0];

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
if (
  !result.success ||
  !result.fields ||
  !result.fields.common || !result.fields.wan || !result.fields.ipv6
) {
  log(
    'Provision change value fields for device ' + genieID +
    ' failed: ' + result.message
  );
  log('OUI identified: ' + oui);
  log('Model identified: ' + modelClass);

  return;
}

let fields = result.fields;
let lastIndex = result.useLastIndexOnWildcard;

let mac = getDeclare(fields.common.mac);
let wan_ip = getDeclare(fields.wan.wan_ip);
let wan_ip_ppp = getDeclare(fields.wan.wan_ip_ppp);
let pppoe_enable = getDeclare(fields.wan.pppoe_enable);
let common_ip;
if (fields.common.ip) {
  let common_ip = getDeclare(fields.common.ip);
}
let ipv6_address;
if (fields.ipv6.address) {
  ipv6_address = getDeclare(fields.ipv6.address);
}
let ipv6_address_ppp;
if (fields.ipv6.address_ppp) {
  ipv6_address_ppp = getDeclare(fields.ipv6.address_ppp);
}
let stun_enable;
let stun_udp_conn_req_addr;
if (fields.common.stun_enable && fields.common.stun_udp_conn_req_addr) {
  stun_enable = getDeclare(fields.common.stun_enable);
  stun_udp_conn_req_addr = getDeclare(fields.common.stun_udp_conn_req_addr);
}

// Assign the values to data
let data = {
  common: {
    mac: getValue(mac, lastIndex),
  },
  wan: {
    wan_ip: getValue(wan_ip, lastIndex),
    wan_ip_ppp: getValue(wan_ip_ppp, lastIndex),
    pppoe_enable: getValue(pppoe_enable, lastIndex),
  },
  ipv6: {},
};

// Append other parameters to data
// STUN
if (stun_enable && stun_udp_conn_req_addr) {
  data.common.stun_enable = getValue(stun_enable, lastIndex);
  data.common.stun_udp_conn_req_addr = getValue(stun_udp_conn_req_addr, lastIndex);
}

// IP
if (common_ip) {
  data.common.ip = getValue(common_ip, lastIndex);
}

// IPv6
if (ipv6_address) {
  data.ipv6.address = getValue(ipv6_address, lastIndex);
}

if (ipv6_address_ppp) {
  data.ipv6.address_ppp = getValue(ipv6_address_ppp, lastIndex);
}

args = {acs_id: genieID, data: data};

// Update the values by sending data to Flashman via HTTP request
result = ext('devices-api', 'syncDeviceChanges', JSON.stringify(args));
if (!result.success) {
  log(
    'Provision change values sync for device ' + genieID +
    ' failed: ' + result.message
  );
}
