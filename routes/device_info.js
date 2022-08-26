
let express = require('express');

// eslint-disable-next-line new-cap
let router = express.Router();
let deviceInfoController = require('../controllers/device_info');


// Synchronization
router.route('/syn').post(deviceInfoController.updateDevicesInfo);

// Acknowledge
router.route('/ack').post(deviceInfoController.confirmDeviceUpdate);

// Logs
router.route('/logs').post(deviceInfoController.receiveLog);

// NTP time
router.route('/ntp').post(deviceInfoController.syncDate);

// Register MQTT
router.route('/mqtt/add').post(deviceInfoController.registerMqtt);

// Add Mesh Slave
router.route('/mesh/add').post(deviceInfoController.registerMeshSlave);

// Port Forward
router.route('/get/portforward').post(deviceInfoController.getPortForward);

// Ping Hosts
router.route('/get/pinghosts').post(deviceInfoController.getPingHosts);

// UPNP Devices
router.route('/get/upnpdevices').post(deviceInfoController.getUpnpDevsPerm);

// Receive UPNP
router.route('/receive/upnp').post(deviceInfoController.receiveUpnp);

// Receive Devices
router.route('/receive/devices').post(deviceInfoController.receiveDevices);

// Site Survey
// eslint-disable-next-line max-len
router.route('/receive/sitesurvey').post(deviceInfoController.receiveSiteSurvey);

// Ping
router.route('/receive/pingresult').post(
  deviceInfoController.receivePingResult);

// Router Status
router.route('/receive/routerstatus').post(
  deviceInfoController.receiveRouterUpStatus);

// Wan Information
router.route('/receive/waninfo').post(
  deviceInfoController.receiveWanInfo);

// Lan Information
router.route('/receive/laninfo').post(
  deviceInfoController.receiveLanInfo);

// Traceroute
router.route('/receive/traceroute').post(
  deviceInfoController.receiveTraceroute);

// WPS
router.route('/receive/wps').post(
  deviceInfoController.receiveWpsResult);

// SpeedTest
router.route('/receive/speedtestresult').post(
  deviceInfoController.receiveSpeedtestResult);

// SpeedTest Hosts
router.route('/get/speedtesthost').post(deviceInfoController.getSpeedtestHost);

router.use('/app', require('./app_api'));

module.exports = router;
