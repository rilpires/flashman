
const express = require('express');
const firmwareController = require('../controllers/firmware');
const authController = require('../controllers/auth');
const permission = 'grantFirmwareManage';

let router = express.Router();

router.route('/').get(authController.ensureLogin(),
                      authController.ensurePermission(permission),
                      firmwareController.index);

router.route('/fetch').get(authController.ensureLogin(),
                           authController.ensurePermission(permission),
                           firmwareController.fetchFirmwares);

router.route('/tr069productclass').get(authController.ensureLogin(),
                           authController.ensurePermission(permission),
                           firmwareController.fetchTr069ProductClassList);

router.route('/tr069versions/:model').get(authController.ensureLogin(),
                           authController.ensurePermission(permission),
                           firmwareController.fetchTr069VersionList);

router.route('/del').post(authController.ensureLogin(),
                          authController.ensurePermission(permission),
                          firmwareController.delFirmware);

router.route('/upload').post(authController.ensureLogin(),
                             authController.ensurePermission(permission),
                             firmwareController.uploadFirmware);

router.route('/sync').post(authController.ensureLogin(),
                           authController.ensurePermission(permission),
                           firmwareController.syncRemoteFirmwareFiles);

router.route('/add').post(authController.ensureLogin(),
                          authController.ensurePermission(permission),
                          firmwareController.addRemoteFirmwareFile);

module.exports = router;
