const express = require('express');
const authController = require('../controllers/auth');
const dataCollectingController = require('../controllers/data_collecting');

let router = express.Router();

router.use( // all paths will use these middlewares.
  authController.ensureLogin(),
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
