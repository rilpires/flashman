
const express = require('express');
const deviceListController = require('../controllers/device_list');
const authController = require('../controllers/auth');

let router = express.Router();

// Query devices
router.route('/search').get(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.searchDeviceReg);

// Change device update/upgrade status
router.route('/update/:id/:release').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.changeUpdate);

// Delete device
router.route('/delete/:id').delete(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.delDeviceReg);

// Get device registry
router.route('/update/:id').get(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getDeviceReg);

// Change device registry
router.route('/update/:id').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.setDeviceReg);

// Create device registry
router.route('/create').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.createDeviceReg);

// Get first boot logs
router.route('/firstlog/:id').get(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getFirstBootLog);

// GET last boot logs
router.route('/lastlog/:id').get(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getLastBootLog);

// Send a message using MQTT
router.route('/command/:id/:msg').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.sendMqttMsg);

// Set/Get Port forward
router.route('/portforward/:id').get(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getPortForward)
                                .put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.setPortForward);

// Set/Get Ping hosts list
router.route('/pinghostslist/:id').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.setPingHostsList);

module.exports = router;
