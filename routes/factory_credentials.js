const express = require('express');
const onuFactoryCredentialsController =
  require('../controllers/factory_credentials.js');
const authController = require('../controllers/auth');

let router = express.Router();

router.use( // all paths will use these middlewares.
  authController.ensureLogin(),
);

router.route('/get').get(
  authController.ensurePermission('superuser'),
  onuFactoryCredentialsController.getCredentialsData,
);

router.route('/set').post(
  authController.ensurePermission('superuser'),
  onuFactoryCredentialsController.setCredentialsData,
);


module.exports = router;
