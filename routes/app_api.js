let express = require('express');

let router = express.Router();
let authController = require('../controllers/auth');
let appAPIController = require('../controllers/app_device_api');
let diagAPIController = require('../controllers/app_diagnostic_api');

router.route('/add').post(appAPIController.registerApp);
router.route('/del').post(appAPIController.removeApp);
router.route('/addpass').post(appAPIController.registerPassword);
router.route('/resetpass').post(appAPIController.resetPassword);
router.route('/reboot').post(appAPIController.rebootRouter);
router.route('/refreshinfo').post(appAPIController.refreshInfo);
router.route('/speedtest').post(appAPIController.doSpeedtest);
router.route('/wps').post(appAPIController.activateWpsButton);
router.route('/validateserial').post(appAPIController.validateDeviceSerial);
router.route('/get/logininfo').post(appAPIController.appGetLoginInfo);
router.route('/get/devices').post(appAPIController.appGetDevices);
router.route('/get/version').post(appAPIController.appGetVersion);
router.route('/get/portforward').post(appAPIController.appGetPortForward);
router.route('/get/speedtest').post(appAPIController.appGetSpeedtest);
router.route('/get/devicesbywifi').post(appAPIController.getDevicesByWifiData);
router.route('/get/wps').post(appAPIController.appGetWpsState);
router.route('/set').post(appAPIController.appSetWifi);
router.route('/set/config').post(appAPIController.appSetConfig);
router.route('/set/wifi').post(appAPIController.appSetWifi);
router.route('/set/password').post(appAPIController.appSetPassword);
router.route('/set/passwordbyapp').post(appAPIController.appSetPasswordFromApp);
router.route('/set/blacklist').post(appAPIController.appSetBlacklist);
router.route('/set/whitelist').post(appAPIController.appSetWhitelist);
router.route('/set/editdevice').post(appAPIController.appSetDeviceInfo);
router.route('/set/portforward').post(appAPIController.appSetPortForward);

router.route('/diagnostic/login').post(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantDiagAppAccess'),
  diagAPIController.sessionLogin,
);

router.route('/diagnostic/verify').post(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantDiagAppAccess'),
  diagAPIController.verifyFlashman,
);

router.route('/diagnostic/tr069config').post(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantDiagAppAccess'),
  diagAPIController.getTR069Config,
);

router.route('/diagnostic/wan').post(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantDiagAppAccess'),
  diagAPIController.configureWanOnu,
);

router.route('/diagnostic/wifi').post(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantDiagAppAccess'),
  diagAPIController.configureWifi,
);

router.route('/diagnostic/meshmode').post(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantDiagAppAccess'),
  diagAPIController.configureMeshMode,
);

router.route('/diagnostic/meshstatus').post(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantDiagAppAccess'),
  diagAPIController.checkMeshStatus,
);

router.route('/diagnostic/certificate').post(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantDiagAppAccess'),
  diagAPIController.receiveCertification,
);

router.route('/diagnostic/getConfig').post(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantDiagAppAccess'),
  diagAPIController.fetchOnuConfig,
);

router.route('/diagnostic/assocslave').post(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantDiagAppAccess'),
  diagAPIController.associateSlave,
);

router.route('/diagnostic/poollastbootdate').post(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantDiagAppAccess'),
  diagAPIController.poolLastBootDate,
);

router.route('/diagnostic/disassocslave').post(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantDiagAppAccess'),
  diagAPIController.disassociateSlave,
);

module.exports = router;
