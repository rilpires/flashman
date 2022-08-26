
const express = require('express');
const updaterScheduleController = require('../controllers/update_scheduler');
const deviceListController = require('../controllers/device_list');
const authController = require('../controllers/auth');
const diagAPIController = require('../controllers/app_diagnostic_api');

// eslint-disable-next-line new-cap
let router = express.Router();

router.use( // all paths will use these middlewares.
  authController.ensureLogin(),
);

// Home page
router.route('/').get(deviceListController.index);

// Retry mesh device update
router.route('/retryupdate/:id/:release').post(
  authController.ensurePermission('grantFirmwareUpgrade'),
  deviceListController.retryMeshUpdate);

// Change device update status
router.route('/update/:id/:release').post(
  authController.ensurePermission('grantFirmwareUpgrade'),
  deviceListController.changeUpdate);

// Search device
router.route('/search').put(
  deviceListController.searchDeviceReg);

// Update schedule configuration
router.route('/scheduler/start').post(
  authController.ensurePermission('grantMassFirmwareUpgrade'),
  updaterScheduleController.startSchedule);

router.route('/scheduler/update').post(
  authController.ensurePermission('grantMassFirmwareUpgrade'),
  updaterScheduleController.updateScheduleStatus);

router.route('/scheduler/results').post(
  authController.ensurePermission('grantMassFirmwareUpgrade'),
  updaterScheduleController.scheduleResult);

router.route('/scheduler/abort').post(
  authController.ensurePermission('grantMassFirmwareUpgrade'),
  updaterScheduleController.abortSchedule);

router.route('/scheduler/releases').put(
  authController.ensurePermission('grantMassFirmwareUpgrade'),
  updaterScheduleController.getDevicesReleases);

router.route('/scheduler/upload').post(
  authController.ensurePermission('grantMassFirmwareUpgrade'),
  updaterScheduleController.uploadDevicesFile);

// Factory reset device
router.route('/factoryreset/:id').post(
  authController.ensurePermission('grantFactoryReset'),
  deviceListController.factoryResetDevice);

// Delete device
router.route('/delete').post(
  authController.ensurePermission('grantDeviceRemoval'),
  deviceListController.delDeviceReg);

// Disassociate slave
router.route('/disassociate').post(
  authController.ensurePermission('grantSlaveDisassociate'),
  diagAPIController.disassociateSlaveMeshV2);

// Change device registry
router.route('/update/:id').post(
  deviceListController.setDeviceReg);

// Create device registry
router.route('/create').post(
  authController.ensurePermission('grantDeviceAdd'),
  deviceListController.createDeviceReg);

// First boot logs from user interface
router.route('/uifirstlog/:id').get(
  authController.ensurePermission('grantLOGAccess'),
  deviceListController.getFirstBootLog);

// Last boot logs from user interface
router.route('/uilastlog/:id').get(
  authController.ensurePermission('grantLOGAccess'),
  deviceListController.getLastBootLog);

// Send a message using MQTT
router.route('/command/:id/:msg').post(
  authController.ensurePermission('grantDeviceActions'),
  deviceListController.sendMqttMsg);

// For user Interface - Set/Get Port forward
router.route('/uiportforward/:id').get(
  deviceListController.getPortForward)
                                  .post(
  deviceListController.setPortForward);

// Set/Get Speed test results
router.route('/speedtest/:id').get(
  authController.ensurePermission('grantMeasureDevices'),
  deviceListController.getSpeedtestResults)
                              .post(
  authController.ensurePermission('grantMeasureDevices', 2),
  deviceListController.doSpeedTest);

// Set/Get Ping hosts list
router.route('/pinghostslist/:id').get(
  deviceListController.getPingHostsList)
                                  .post(
  deviceListController.setPingHostsList);

// Set/Get Default Ping hosts list
router.route('/defaultpinghostslist')
.get(
  authController.ensurePermission('grantFlashmanManage'),
  deviceListController.getDefaultPingHosts,
)
.post(
  authController.ensurePermission('grantFlashmanManage'),
  deviceListController.setDefaultPingHosts,
);

router.route('/landevices/:id').get(
  deviceListController.getLanDevices);

router.route('/sitesurvey/:id').get(
  deviceListController.getSiteSurvey);

router.route('/uiupdate/:id').get(
  deviceListController.getDeviceReg);

router.route('/landevice/block').post(
  authController.ensurePermission('grantLanDevicesBlock'),
  deviceListController.setLanDeviceBlockState);

router.route('/license').post(
  deviceListController.updateLicenseStatus);

// Set license status of desired CPEs
router.route('/deleteandblock').post(
  authController.ensurePermission('grantDeviceRemoval'),
  authController.ensurePermission('grantDeviceLicenseBlock'),
  deviceListController.delDeviceAndBlockLicense,
);

router.route('/export').get(
  deviceListController.exportDevicesCsv);

router.route('/ponsignal/:deviceId').get(
  deviceListController.receivePonSignalMeasure);

// WAN Informations
router.route('/waninfo/:id').get(
  deviceListController.getWanInfo);

// LAN Informations
router.route('/laninfo/:id').get(
  deviceListController.getLanInfo);

module.exports = router;
