
const express = require('express');
const deviceListController = require('../../controllers/device_list');
const userController = require('../../controllers/user');
const authController = require('../../controllers/auth');

let router = express.Router();

// ***************
// *** Devices ***
// ***************

// Query devices
router.route('/device/search').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.searchDeviceReg);

// Change device update/upgrade status
router.route('/device/update/:id/:release').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.changeUpdate);

// Delete device
router.route('/device/delete/:id').delete(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.delDeviceReg);

// Get device registry
router.route('/device/update/:id').get(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getDeviceReg);

// Change device registry
router.route('/device/update/:id').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.setDeviceReg);

// Create device registry
router.route('/device/create').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.createDeviceReg);

// Get first boot logs
router.route('/device/firstlog/:id').get(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getFirstBootLog);

// GET last boot logs
router.route('/device/lastlog/:id').get(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getLastBootLog);

// Send a message using MQTT
router.route('/device/command/:id/:msg').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.sendMqttMsg);

// Set/Get Port forward
router.route('/device/portforward/:id').get(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getPortForward)
                                .put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.setPortForward);

// Set/Get Ping hosts list
router.route('/device/pinghostslist/:id').get(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getPingHostsList)
                                  .put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.setPingHostsList);

// Set traps URL for devices CRUD operations
router.route('/device/traps/callback').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.setDeviceCrudTrap);

// *************
// *** Users ***
// *************

router.route('/user/get/all').get(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.getUsers);

router.route('/user/edit/:id').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.editUser);

router.route('/user/new').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.postUser);

router.route('/user/del').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.deleteUser);

// Set traps URL for users CRUD operations
router.route('/user/traps/callback').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.setUserCrudTrap);

// *************
// *** Roles ***
// *************

router.route('/role/get/all').get(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.getRoles);

router.route('/role/new').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.postRole);

router.route('/role/edit/:id').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.editRole);

router.route('/role/del').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.deleteRole);

// Set traps URL for role CRUD operations
router.route('/role/traps/callback').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.setRoleCrudTrap);

module.exports = router;
