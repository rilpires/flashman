const express = require('express');
let genieDeviceInfoController = require('../controllers/acs_device_info');

let router = express.Router();

router.route('/device/inform').post(genieDeviceInfoController.informDevice);
router.route('/device/syn').post(genieDeviceInfoController.syncDevice);
router.route('/receive/diagnostic').post(
	genieDeviceInfoController.fetchDiagnosticsFromGenie);
// router.route('/receive/pingresult').post(
//   	genieDeviceInfoController.receivePingResult);

module.exports = router;
