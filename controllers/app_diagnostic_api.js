const DeviceModel = require('../models/device');
const UserModel = require('../models/user');
const Config = require('../models/config');
const mqtt = require('../mqtts');
const async = require('asyncawait/async');
const await = require('asyncawait/await');

let diagAppAPIController = {};

const deepCopyObject = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

const pushCertification = function(arr, c, finished) {
  arr.push({
    finished: finished,
    mac: c.mac,
    localEpochTimestamp: (c.timestamp) ? c.timestamp : 0,
    didDiagnose: (c.didDiagnose) ? c.didDiagnose : false,
    didConfigureWan: (c.didWan) ? c.didWan : false,
    didConfigureWifi: (c.didWifi) ? c.didWifi : false,
    didConfigureMesh: (c.didMesh) ? c.didMesh : false,
    didConfigureContract: (c.didContract) ? c.didContract : false,
    didConfigureObservation: (c.didObservation) ? c.didObservation : false,
    contract: (c.contract) ? c.contract : "",
    observations: (c.observations) ? c.observations : "",
    cancelReason: (c.reason) ? c.reason : "",
    latitude: (c.latitude) ? c.latitude : 0,
    longitude: (c.longitude) ? c.longitude : 0,
  });
};

diagAppAPIController.sessionLogin = function(req, res) {
  // For now we simply return 200 with static data
  // Eventually we must reply with the public key for router communication
  return res.status(200).json({credential: "temp"});
};

diagAppAPIController.configureWifi = async(function(req, res) {
  try {
    // Make sure we have a mac to verify in database
    if (req.body.mac) {
      // Fetch device from database
      let device = await(DeviceModel.findById(req.body.mac));
      if (!device) {
        return res.status(404).json({"error": "MAC not found"});
      }
      let content = req.body;
      let updateParameters = false;
      // Replace relevant wifi fields with new values
      if (content.wifi_ssid) {
        device.wifi_ssid = content.wifi_ssid;
        updateParameters = true;
      }
      if (content.wifi_ssid_5ghz) {
        device.wifi_ssid_5ghz = content.wifi_ssid_5ghz;
        updateParameters = true;
      }
      if (content.wifi_password) {
        device.wifi_password = content.wifi_password;
        updateParameters = true;
      }
      if (content.wifi_password_5ghz) {
        device.wifi_password_5ghz = content.wifi_password_5ghz;
        updateParameters = true;
      }
      if (content.wifi_channel) {
        device.wifi_channel = content.wifi_channel;
        updateParameters = true;
      }
      if (content.wifi_band) {
        device.wifi_band = content.wifi_band;
        updateParameters = true;
      }
      if (content.wifi_mode) {
        device.wifi_mode = content.wifi_mode;
        updateParameters = true;
      }
      if (content.wifi_channel_5ghz) {
        device.wifi_channel_5ghz = content.wifi_channel_5ghz;
        updateParameters = true;
      }
      if (content.wifi_band_5ghz) {
        device.wifi_band_5ghz = content.wifi_band_5ghz;
        updateParameters = true;
      }
      if (content.wifi_mode_5ghz) {
        device.wifi_mode_5ghz = content.wifi_mode_5ghz;
        updateParameters = true;
      }
      // If no fields were changed, we can safely reply here
      if (!updateParameters) {
        return res.status(200).json({"success": true});
      }
      // Apply changes to database and send mqtt message
      device.do_update_parameters = true;
      await(device.save());
      mqtt.anlixMessageRouterUpdate(device._id);
      return res.status(200).json({"success": true});
    } else {
      return res.status(403).json({"error": "Did not specify MAC"});
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({"error": "Internal error"});
  }
});

diagAppAPIController.receiveCertification = async(function(req, res) {
  try {
    let result = await(UserModel.find({'name': req.body.user}));
    if (!result) {
      return res.status(404).json({"error": "User not found"});
    }
    let user = result[0]; // Should only match one since name is unique
    let content = req.body;
    let certifications = user.deviceCertifications;
    if (!certifications) {
      certifications = [];
    }
    // Save cancelled certifications, if any
    if (content.cancelled) {
      content.cancelled.forEach((c)=>{
        if (!c.mac) return; // MAC is mandatory
        pushCertification(certifications, c, false);
      });
    }
    // Save current certification, if any
    if (content.current && content.current.mac) {
      pushCertification(certifications, content.current, true);
    }
    // Save changes to database and respond
    await(user.save());
    return res.status(200).json({"success": true});
  } catch(err) {
    console.log(err);
    return res.status(500).json({"error": "Internal error"});
  }
});

module.exports = diagAppAPIController;
