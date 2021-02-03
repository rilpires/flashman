let express = require('express');

let router = express.Router();
const authController = require('../controllers/auth');
let dataCollectingController = require('../controllers/data_collecting');

router.route('/set/fqdn')
.post(dataCollectingController.updateDataCollectingServerFqdn);

router.route('/set/licenses')
.post(dataCollectingController.setLicenses);

module.exports = router;
