
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
router.route('/get/upnpdevices').post(deviceInfoController.getUpnpDevsPerm);
router.route('/receive/upnp').post(deviceInfoController.receiveUpnp);
router.route('/receive/devices').post(deviceInfoController.receiveDevices);
router.route('/receive/pingresult').post(deviceInfoController.receivePingResult);
router.use('/app', require('./app_api'));

module.exports = router;
