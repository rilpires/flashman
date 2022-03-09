
const express = require('express');
const authController = require('../controllers/auth');
const upgradeController = require('../controllers/update_flashman');

let router = express.Router();

router.use( // all paths will use these middlewares.
  authController.ensureLogin(),
);

router.route('/').post(authController.ensurePermission('superuser'),
                       upgradeController.apiUpdate);

router.route('/force').post(authController.ensurePermission('superuser'),
                            upgradeController.apiForceUpdate);

router.route('/config').get(authController.ensurePermission('grantFlashmanManage'),
                            upgradeController.getAutoConfig)
                       .post(authController.ensurePermission('grantFlashmanManage'),
                             upgradeController.setAutoConfig);

module.exports = router;
