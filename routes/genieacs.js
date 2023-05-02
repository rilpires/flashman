const express = require('express');
const authController = require('../controllers/auth');
let genieDeviceInfoController = require('../controllers/acs_device_info');

// eslint-disable-next-line new-cap
let router = express.Router();

router.route('/device/inform')
  .post(genieDeviceInfoController.informDevice);
router.route('/device/syn')
  .post(genieDeviceInfoController.syncDevice);
router.route('/receive/diagnostic')
  .post(genieDeviceInfoController.requestDiagnosticsResults);
router.route('/device/syncchanges')
  .post(genieDeviceInfoController.syncDeviceChangedValues);
router.route('/forceOfflineReconnect').post(
  authController.ensurePermission('grantFlashmanManage'),
  genieDeviceInfoController.forcePingOfflineDevices,
);
router.route('/device/instantiatecpe')
  .post(genieDeviceInfoController.instantiateCPE);
module.exports = router;
