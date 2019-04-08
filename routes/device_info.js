
let express = require('express');

let router = express.Router();
let deviceInfoController = require('../controllers/device_info');

router.route('/syn').post(deviceInfoController.updateDevicesInfo);
router.route('/ack').post(deviceInfoController.confirmDeviceUpdate);
router.route('/logs').post(deviceInfoController.receiveLog);
router.route('/ntp').post(deviceInfoController.syncDate);
router.route('/mqtt/add').post(deviceInfoController.registerMqtt);
router.route('/get/portforward').post(deviceInfoController.getPortForward);
router.route('/get/pinghosts').post(deviceInfoController.getPingHosts);
router.route('/get/measureconfig').post(deviceInfoController.getZabbixConfig);
router.route('/receive/devices').post(deviceInfoController.receiveDevices);
router.route('/receive/pingresult').post(deviceInfoController.receivePingResult);
router.route('/app/add').post(deviceInfoController.registerApp);
router.route('/app/del').post(deviceInfoController.removeApp);
router.route('/app/addpass').post(deviceInfoController.registerPassword);
router.route('/app/get/version').post(deviceInfoController.appGetVersion);
router.route('/app/get/portforward').post(deviceInfoController.appGetPortForward);
router.route('/app/set').post(deviceInfoController.appSetWifi);
router.route('/app/set/wifi').post(deviceInfoController.appSetWifi);
router.route('/app/set/password').post(deviceInfoController.appSetPassword);
router.route('/app/set/blacklist').post(deviceInfoController.appSetBlacklist);
router.route('/app/set/whitelist').post(deviceInfoController.appSetWhitelist);
router.route('/app/set/editdevice').post(deviceInfoController.appSetDeviceInfo);

module.exports = router;
