
let express = require('express');

let router = express.Router();
let deviceInfoController = require('../controllers/device_info');

router.route('/syn').post(deviceInfoController.updateDevicesInfo);
router.route('/ack').post(deviceInfoController.confirmDeviceUpdate);
router.route('/logs').post(deviceInfoController.receiveLog);
router.route('/ntp').post(deviceInfoController.syncDate);
router.route('/mqtt/add').post(deviceInfoController.registerMqtt);
router.route('/mesh/add').post(deviceInfoController.registerMeshSlave);
router.route('/get/portforward').post(deviceInfoController.getPortForward);
router.route('/get/pinghosts').post(deviceInfoController.getPingHosts);
router.route('/get/upnpdevices').post(deviceInfoController.getUpnpDevsPerm);
router.route('/receive/upnp').post(deviceInfoController.receiveUpnp);
router.route('/receive/devices').post(deviceInfoController.receiveDevices);
// eslint-disable-next-line max-len
router.route('/receive/sitesurvey').post(deviceInfoController.receiveSiteSurvey);
router.route('/receive/pingresult').post(
  deviceInfoController.receivePingResult);
router.route('/receive/routerstatus').post(
  deviceInfoController.receiveRouterUpStatus);
router.route('/receive/waninfo').post(
  deviceInfoController.receiveWanInfo);
  router.route('/receive/laninfo').post(
    deviceInfoController.receiveLanInfo);

// Traceroute
router.route('/receive/traceroute').post(
  deviceInfoController.receiveTraceroute);

router.route('/receive/wps').post(
  deviceInfoController.receiveWpsResult);
router.route('/receive/speedtestresult').post(
  deviceInfoController.receiveSpeedtestResult);
router.use('/app', require('./app_api'));

module.exports = router;
