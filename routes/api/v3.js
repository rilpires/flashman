const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();

const authController = require('../../controllers/auth');
const apiController = require('../../controllers/api/v3');


// Enable CORS to all V3 routes as it is necessary for Swagger to send commands.
router.use((_request, response, next) => {
  // Set the headers
  response.header('Access-Control-Allow-Origin', '*');
  response.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Authorization, Accept',
  );

  next();
});


/**
 * This function is necessary to allow getting header parameters when all
 * endpoints need authentication due to `CORS` issues.
 */
router.options('/*', function(_request, response) {
  response.sendStatus(200);
});


// Ensure that the user has access to API routes in this file.
router.use(
  authController.ensureAPIAccess,
);
router.use(
  authController.ensurePermission('grantAPIAccess'),
);


// Routes
router.get(
  '/device/pppoe-username/:pppoeUsername/',
  (request, response) => apiController.defaultGetRoute(
    request, response, null, 'pppoeUsername',
  ),
);


router.get(
  '/device/mac/:mac/lan-devices/',
  (request, response) => apiController.defaultGetRoute(
    request, response, 'lan_devices', 'mac',
  ),
);


router.get(
  '/device/mac/:mac/lan-devices/mac/:lanDeviceMac/',
  (request, response) => apiController.defaultGetRoute(
    request, response, 'lan_devices', 'mac', 'lanDeviceMac',
  ),
);


router.get(
  '/device/mac/:mac/lan-devices/name/:lanDeviceName/',
  (request, response) => apiController.defaultGetRoute(
    request, response, 'lan_devices', 'mac', 'lanDeviceName',
  ),
);


router.get(
  '/device/mac/:mac/site-survey/',
  (request, response) => apiController.defaultGetRoute(
    request, response, 'ap_survey', 'mac',
  ),
);


router.get(
  '/device/mac/:mac/',
  (request, response) => apiController.defaultGetRoute(
    request, response, null, 'mac',
  ),
);


router.get(
  '/device/serial-tr069/:serialTR069/',
  (request, response) => apiController.defaultGetRoute(
    request, response, null, 'serialTR069',
  ),
);


router.get(
  '/device/external-reference-data/:externalReferenceData/',
  (request, response) => apiController.defaultGetRoute(
    request, response, null, 'externalReferenceData',
  ),
);


router.get(
  '/device/wan-mac/:wanMac/',
  (request, response) => apiController.defaultGetRoute(
    request, response, null, 'wanMac',
  ),
);


router.get(
  '/device/search/',
  apiController.search,
);


module.exports = router;
