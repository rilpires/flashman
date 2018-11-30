let express = require('express');

let router = express.Router();
const authController = require('../controllers/auth');
let measureController = require('../controllers/measure');

router.route('/')
.get(authController.ensureLogin(),
     measureController.renderIndex);

router.route('/activate')
.post(measureController.activateDevices);

router.route('/deactivate')
.post(measureController.deactivateDevices);

module.exports = router;
