let express = require('express');

let router = express.Router();
let appAPIController = require('../controllers/app_device_api');

router.route('/add').post(appAPIController.registerApp);
router.route('/del').post(appAPIController.removeApp);
router.route('/addpass').post(appAPIController.registerPassword);
router.route('/get/refreshdevices').post(appAPIController.refreshDevices);
router.route('/get/logininfo').post(appAPIController.appGetLoginInfo);
router.route('/get/devices').post(appAPIController.appGetDevices);
router.route('/get/version').post(appAPIController.appGetVersion);
router.route('/get/portforward').post(appAPIController.appGetPortForward);
router.route('/set').post(appAPIController.appSetWifi);
router.route('/set/config').post(appAPIController.appSetConfig);
router.route('/set/wifi').post(appAPIController.appSetWifi);
router.route('/set/password').post(appAPIController.appSetPassword);
router.route('/set/blacklist').post(appAPIController.appSetBlacklist);
router.route('/set/whitelist').post(appAPIController.appSetWhitelist);
router.route('/set/editdevice').post(appAPIController.appSetDeviceInfo);

module.exports = router;
