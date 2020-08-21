/*
The scripts in this directory are loaded by genieacs along with the provision
script. Configure genieacs' cwmp server parameter EXT_DIR to the following:
"path/to/flashman/controllers/external-genieacs"
*/

const API_URL = 'http://localhost:8000/acs/';
const request = require('request');

const syncDeviceData = function(args, callback) {
  let params = JSON.parse(args[0]);
  if (!params || !params.mac || !params.acs_id) {
    return callback(null, {
      success: false,
      message: 'Incomplete arguments',
    });
  }
  request({
    url: API_URL + 'device/syn',
    method: 'POST',
    json: params,
  },
  function(error, response, body) {
    if (error) {
      return callback(null, {
        success: false,
        message: 'Error contacting Flashman',
      });
    }
    if (response.statusCode === 200) {
      if (body.success) {
        return callback(null, {success: true});
      } else if (body.message) {
        return callback(null, {
          success: false,
          message: body.message,
        });
      } else {
        return callback(null, {
          success: false,
          message: 'Error in Flashman processing',
        });
      }
    } else {
      return callback(null, {
        success: false,
        message: 'Error in Flashman request',
      });
    }
  });
};

exports.syncDeviceData = syncDeviceData;
