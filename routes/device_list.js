
const express = require('express');
const updaterScheduleController = require('../controllers/update_scheduler');
const deviceListController = require('../controllers/device_list');
const authController = require('../controllers/auth');

let router = express.Router();

// Home page
router.route('/').get(authController.ensureLogin(),
                      deviceListController.index);

// Force mesh slave to do a device update
router.route('/updatemesh/:id/:release').post(
  authController.ensureLogin(),
  authController.ensurePermission('grantFirmwareUpgrade'),
  deviceListController.changeUpdateMesh);

// Change device update status
router.route('/update/:id/:release').post(
  authController.ensureLogin(),
  authController.ensurePermission('grantFirmwareUpgrade'),
  deviceListController.changeUpdate);

// Change all device status
router.route('/updateall').post(
  authController.ensureLogin(),
  authController.ensurePermission('grantFirmwareUpgrade'),
  deviceListController.changeAllUpdates);

// Search device
router.route('/search').put(
  authController.ensureLogin(),
  deviceListController.searchDeviceReg);

// Update schedule configuration
router.route('/scheduler/start').post(
  authController.ensureLogin(),
  authController.ensurePermission('grantMassFirmwareUpgrade'),
  updaterScheduleController.startSchedule);

router.route('/scheduler/update').post(
  authController.ensureLogin(),
  authController.ensurePermission('grantMassFirmwareUpgrade'),
  updaterScheduleController.updateScheduleStatus);

router.route('/scheduler/results').post(
  authController.ensureLogin(),
  authController.ensurePermission('grantMassFirmwareUpgrade'),
  updaterScheduleController.scheduleResult);

router.route('/scheduler/abort').post(
  authController.ensureLogin(),
  authController.ensurePermission('grantMassFirmwareUpgrade'),
  updaterScheduleController.abortSchedule);

router.route('/scheduler/releases').put(
  authController.ensureLogin(),
  authController.ensurePermission('grantMassFirmwareUpgrade'),
  updaterScheduleController.getDevicesReleases);

router.route('/scheduler/upload').post(
  authController.ensureLogin(),
  authController.ensurePermission('grantMassFirmwareUpgrade'),
  updaterScheduleController.uploadDevicesFile);

// Factory reset device
router.route('/factoryreset/:id').post(
  authController.ensureLogin(),
  authController.ensurePermission('grantFactoryReset'),
  deviceListController.factoryResetDevice);

// Delete device
router.route('/delete').post(
  authController.ensureLogin(),
  authController.ensurePermission('grantDeviceRemoval'),
  deviceListController.delDeviceReg);

// Change device registry
router.route('/update/:id').post(
  authController.ensureLogin(),
  deviceListController.setDeviceReg);

// Create device registry
router.route('/create').post(
  authController.ensureLogin(),
  authController.ensurePermission('grantDeviceAdd'),
  deviceListController.createDeviceReg);

// First boot logs from user interface
router.route('/uifirstlog/:id').get(
  authController.ensureLogin(),
  authController.ensurePermission('grantLOGAccess'),
  deviceListController.getFirstBootLog);

// Last boot logs from user interface
router.route('/uilastlog/:id').get(
  authController.ensureLogin(),
  authController.ensurePermission('grantLOGAccess'),
  deviceListController.getLastBootLog);

// Send a message using MQTT
router.route('/command/:id/:msg').post(
  authController.ensureLogin(),
  authController.ensurePermission('grantDeviceActions'),
  deviceListController.sendMqttMsg);

// For user Interface - Set/Get Port forward
router.route('/uiportforward/:id').get(
  authController.ensureLogin(),
  deviceListController.getPortForward)
                                  .post(
  authController.ensureLogin(),
  deviceListController.setPortForward);

// Set/Get Speed test results
router.route('/speedtest/:id').get(
  authController.ensureLogin(),
  authController.ensurePermission('grantMeasureDevices'),
  deviceListController.getSpeedtestResults)
                              .post(
  authController.ensureLogin(),
  authController.ensurePermission('grantMeasureDevices', 2),
  deviceListController.doSpeedTest);

// Set/Get Ping hosts list
router.route('/pinghostslist/:id').get(
  authController.ensureLogin(),
  deviceListController.getPingHostsList)
                                  .post(
  authController.ensureLogin(),
  deviceListController.setPingHostsList);

router.route('/landevices/:id').get(
  authController.ensureLogin(),
  deviceListController.getLanDevices);

router.route('/uiupdate/:id').get(
  authController.ensureLogin(),
  deviceListController.getDeviceReg);

router.route('/landevice/block').post(
  authController.ensureLogin(),
  authController.ensurePermission('grantLanDevicesBlock'),
  deviceListController.setLanDeviceBlockState);

router.route('/license').post(
  authController.ensureLogin(),
  deviceListController.updateLicenseStatus);

router.route('/export').get(
  authController.ensureLogin(),
  deviceListController.exportDevicesCsv);

module.exports = router;
