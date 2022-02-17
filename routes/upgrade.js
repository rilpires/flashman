
const express = require('express');
const authController = require('../controllers/auth');
const upgradeController = require('../controllers/update_flashman');
const i18nextMiddleware = require('../controllers/language.js').middleware;

let router = express.Router();

router.use( // all paths will use these middlewares.
  authController.ensureLogin(),
  i18nextMiddleware
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
