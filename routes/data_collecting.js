const express = require('express');
const dataCollectingController = require('../controllers/data_collecting');
const i18nextMiddleware = require('./language.js').middleware

let router = express.Router();

router.use( // all paths will use these middlewares.
  authController.ensureLogin(),
  i18nextMiddleware
);

router.route('/service/parameters')
  .get(dataCollectingController.returnServiceParameters)
  .post(dataCollectingController.updateServiceParameters);

router.route('/massupdate/parameters')
  .post(dataCollectingController.updateManyParameters);

router.route('/:id/parameters')
  .get(dataCollectingController.returnDeviceParameters)
  .post(dataCollectingController.updateDeviceParameters);

router.route('/config')
  .get(dataCollectingController.getConfig);

module.exports = router;
