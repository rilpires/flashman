/* eslint-disable new-cap */

const express = require('express');
const deviceListController = require('../../controllers/device_list');
const userController = require('../../controllers/user');
const authController = require('../../controllers/auth');

let router = express.Router();

// **************************
// *** OPEN HEALTH STATUS ***
// **************************

router.route('/health')
  .get((req, res) => res.json({
    version: req.app.locals.appVersion,
    uptime: process.uptime(),
  }));

// Include restricted access for below endpoints

router.use( // all paths will use these middlewares.
  authController.ensureAPIAccess,
);

// ***************
// *** Devices ***
// ***************

// Returns all devices
router.route('/device/get').post(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getDevices);

// Query devices
router.route('/device/search').put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.searchDeviceReg);

// Change device update/upgrade status
router.route('/device/update/:id/:release').put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.changeUpdate);

// Delete device
router.route('/device/delete/:id').delete(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.delDeviceReg);

// Get device registry
router.route('/device/update/:id').get(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getDeviceReg);

// Change device registry
router.route('/device/update/:id').put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.setDeviceReg);

// Create device registry
router.route('/device/create').put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.createDeviceReg);

// Get first boot logs
router.route('/device/firstlog/:id').get(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getFirstBootLog);

// GET last boot logs
router.route('/device/lastlog/:id').get(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getLastBootLog);

// Send a message using MQTT
router.route('/device/command/:id/:msg').put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.sendCommandMsg);

// Send a sync request for TR-069 devices
router.route('/device/sync/:id').put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.syncDevice);

// Send a customized ping command
router.route('/device/pingdiagnostic/:id').put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.sendCustomPingAPI);

// Send a customized speedtest command
router.route('/device/speeddiagnostic/:id').put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.sendCustomSpeedTestAPI);

// Send a customized traceroute command
router.route('/device/tracediagnostic/:id').put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.sendCustomTraceRouteAPI);

// Set/Get Port forward
router.route('/device/portforward(tr069)?/:id').get(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getPortForward)
                                .put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.setPortForward);

// Set/Get Ping hosts list
router.route('/device/pinghostslist/:id').get(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getPingHostsList)
                                  .put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.setPingHostsList);

// Set traps URL for devices CRUD operations
router.route('/device/traps/callback').put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.setDeviceCrudTrap);

router.route('/device/traps/callback').delete(
    authController.ensurePermission('grantAPIAccess'),
    deviceListController.deleteDeviceCrudTrap);

router.route('/device/traps/callback').get(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.getDeviceCrudTrap);

// Set LAN device block state
router.route('/device/landevice/block').put(
  authController.ensurePermission('grantAPIAccess'),
  authController.ensurePermission('grantLanDevicesBlock'),
  deviceListController.setLanDeviceBlockState);

// Set latitude/longitude values
router.route('/device/coordinates').put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.editCoordinates,
);

// Get license status of desired CPE
router.route('/device/license/get').put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.updateLicenseStatus,
);

// Set license status of desired CPEs
router.route('/device/license/set').put(
  authController.ensurePermission('grantAPIAccess'),
  deviceListController.changeLicenseStatus,
);

// *************
// *** Users ***
// *************

router.route('/user/get/all').get(
  authController.ensurePermission('grantAPIAccess'),
  userController.getUsersForDisplay);

router.route('/user/certifications')
.get(
  authController.ensurePermission('grantAPIAccess'),
  userController.getUsersCertifications,
)
.delete(
  authController.ensurePermission('grantAPIAccess'),
  userController.deleteCertificates,
);

router.route('/user/edit/:id').put(
  authController.ensurePermission('grantAPIAccess'),
  userController.editUser);

router.route('/user/new').put(
  authController.ensurePermission('grantAPIAccess'),
  userController.postUser);

router.route('/user/del').put(
  authController.ensurePermission('grantAPIAccess'),
  userController.deleteUser);

// Set traps URL for users CRUD operations
router.route('/user/traps/callback').put(
  authController.ensurePermission('grantAPIAccess'),
  userController.setUserCrudTrap);

// Set traps URL for users CRUD operations
router.route('/user/traps/callback').delete(
  authController.ensurePermission('grantAPIAccess'),
  userController.deleteUserCrudTrap);

router.route('/user/traps/callback').get(
  authController.ensurePermission('grantAPIAccess'),
  userController.getUserCrudTrap);

// *************
// *** Roles ***
// *************

router.route('/role/get/all').get(
  authController.ensurePermission('grantAPIAccess'),
  userController.getRoles);

router.route('/role/new').put(
  authController.ensurePermission('grantAPIAccess'),
  userController.postRole);

router.route('/role/edit/:id').put(
  authController.ensurePermission('grantAPIAccess'),
  userController.editRole);

router.route('/role/del').put(
  authController.ensurePermission('grantAPIAccess'),
  userController.deleteRole);

// Set traps URL for role CRUD operations
router.route('/role/traps/callback').put(
  authController.ensurePermission('grantAPIAccess'),
  userController.setRoleCrudTrap);

router.route('/role/traps/callback').delete(
  authController.ensurePermission('grantAPIAccess'),
  userController.deleteRoleCrudTrap);

router.route('/role/traps/callback').get(
  authController.ensurePermission('grantAPIAccess'),
  userController.getRoleCrudTrap);

// *********************
// *** Certification ***
// *********************

// Set traps URL for certifications CRUD operations
router.route('/certification/traps/callback').put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.setCertificationCrudTrap);

router.route('/certification/traps/callback').delete(
  authController.ensurePermission('grantAPIAccess'),
  userController.deleteCertificationCrudTrap);

router.route('/certification/traps/callback').get(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.getCertificationCrudTrap);

module.exports = router;
