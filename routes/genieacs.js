const express = require('express');
let genieDeviceInfoController = require('../controllers/acs_device_info');

let router = express.Router();

router.route('/device/inform').post(genieDeviceInfoController.informDevice);
router.route('/device/syn').post(genieDeviceInfoController.syncDevice);

module.exports = router;
