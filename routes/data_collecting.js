let express = require('express');

let router = express.Router();
const authController = require('../controllers/auth');
let dataCollectingController = require('../controllers/data_collecting');

router.route('/set/parameters')
.post(dataCollectingController.updateDataCollectingParameters);

module.exports = router;
