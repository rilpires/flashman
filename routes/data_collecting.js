let express = require('express');

let router = express.Router();
const authController = require('../controllers/auth');
let dataCollectingController = require('../controllers/data_collecting');

router.route('/fqdn')
.post(dataCollectingController.updateDataCollectingServerFqdn);

router.route('/set')
.post(dataCollectingController.setLicenses);

module.exports = router;
