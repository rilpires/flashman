const express = require('express');
let genieDeviceInfoController = require('../controllers/acs_device_info');
let genieCalls = require('../controllers/external-genieacs/genie.js');

let router = express.Router();

router.route('/device/syn').post(genieDeviceInfoController.syncDevice);

router.route('/test').post(genieCalls.test);

module.exports = router;
