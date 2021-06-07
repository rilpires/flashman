let express = require('express');

let router = express.Router();
const authController = require('../controllers/auth');
let dataCollectingController = require('../controllers/data_collecting');

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
