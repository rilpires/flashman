
const express = require('express');
const firmwareController = require('../controllers/firmware');
const authController = require('../controllers/auth');
const permission = 'grantFirmwareManage';

let router = express.Router();

router.use( // all paths will use these middlewares.
  authController.ensureLogin(),
);

router.route('/').get(authController.ensurePermission(permission),
                      firmwareController.index);

router.route('/fetch').get(authController.ensurePermission(permission),
                           firmwareController.fetchFirmwares);

router.route('/del').post(authController.ensurePermission(permission),
                          firmwareController.delFirmware);

router.route('/upload').post(authController.ensurePermission(permission),
                             firmwareController.uploadFirmware);

router.route('/sync').post(authController.ensurePermission(permission),
                           firmwareController.syncRemoteFirmwareFiles);

router.route('/add').post(authController.ensurePermission(permission),
                          firmwareController.addRemoteFirmwareFile);

module.exports = router;
