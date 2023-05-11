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
/**
 * @openapi
 *  /api/v3/device/pppoe-username/{pppoeUsername}:
 *    get:
 *      summary: Get a device by it's PPPoE username.
 *
 *      description: Query the first device that has the same PPPoE username
 *        passed as a URL parameter.
 *
 *      tags: ['Get Device | PPPoE Username']
 *
 *      parameters:
 *        - in: path
 *          name: pppoeUsername
 *          schema:
 *            type: string
 *          required: true
 *          description: The PPPoE username of the device to be returned.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
/**
 * @openapi
 *  /api/v3/device/pppoe-username/{pppoeUsername}/{field}:
 *    get:
 *      summary: Get a device by it's PPPoE username.
 *
 *      description: Query the first device that has the same PPPoE username
 *        passed as a URL parameter.
 *
 *      tags: ['Get Device | PPPoE Username']
 *
 *      parameters:
 *        - in: path
 *          name: pppoeUsername
 *          schema:
 *            type: string
 *          required: true
 *          description: The PPPoE username of the device to be returned.
 *
 *        - in: path
 *          name: field
 *          schema:
 *            type: string
 *          required: true
 *          description: The specific field to be returned from the device
 *            instead of the whole information. If the field is not one of
 *            the device's, it will return the error explaining what happenned.
 *            Multiple fields can be passed and must be separated by semicolons
 *            (';'). Do not add a semicolon at the end.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
router.get(
  '/device/pppoe-username/:pppoeUsername/:field?',
  (request, response) => apiController.defaultGetRoute(
    request, response, null, 'pppoeUsername',
  ),
);


/**
 * @openapi
 *  /api/v3/device/mac/{mac}/lan-devices/:
 *    get:
 *      summary: Get all LAN Devices by the MAC address of the router.
 *
 *      description: Query the first device that has the same MAC address
 *        passed as a URL parameter and returns all LAN Devices connected to
 *        the router.
 *
 *      tags: ['Get Device | MAC', 'Get Device | MAC | LAN Devices']
 *
 *      parameters:
 *        - in: path
 *          name: mac
 *          schema:
 *            type: string
 *          required: true
 *          description: The MAC address of the router.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200 - LAN Devices'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
/**
 * @openapi
 *  /api/v3/device/mac/{mac}/lan-devices/{field}:
 *    get:
 *      summary: Get all LAN Devices by the MAC address of the router.
 *
 *      description: Query the first device that has the same MAC address
 *        passed as a URL parameter and returns the field specified of all LAN
 *        Devices connected to the router.
 *
 *      tags: ['Get Device | MAC', 'Get Device | MAC | LAN Devices']
 *
 *      parameters:
 *        - in: path
 *          name: mac
 *          schema:
 *            type: string
 *          required: true
 *          description: The MAC address of the router.
 *
 *        - in: path
 *          name: field
 *          schema:
 *            type: string
 *          required: true
 *          description: The specific field to be returned from the device
 *            instead of the whole information. If the field is not one of
 *            the device's, it will return the error explaining what happenned.
 *            Multiple fields can be passed and must be separated by semicolons
 *            (';'). Do not add a semicolon at the end.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200 - LAN Devices'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
router.get(
  '/device/mac/:mac/lan-devices/:field?',
  (request, response) => apiController.defaultGetRoute(
    request, response, 'lan_devices', 'mac',
  ),
);


/**
 * @openapi
 *  /api/v3/device/mac/{mac}/lan-devices/mac/{lanDeviceMac}/:
 *    get:
 *      summary: Get the LAN Device with the MAC address that matches
 *        `lanDeviceMac` of the MAC address of the router.
 *
 *      description: Query the first device that has the same MAC address
 *        passed as a URL parameter and returns the LAN Device connected to
 *        the router.
 *
 *      tags: ['Get Device | MAC', 'Get Device | MAC | LAN Devices']
 *
 *      parameters:
 *        - in: path
 *          name: mac
 *          schema:
 *            type: string
 *          required: true
 *          description: The MAC address of the router.
 *
 *        - in: path
 *          name: lanDeviceMac
 *          schema:
 *            type: string
 *          required: true
 *          description: The MAC address of the LAN device.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200 - LAN Devices'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
/**
 * @openapi
 *  /api/v3/device/mac/{mac}/lan-devices/mac/{lanDeviceMac}/{field}:
 *    get:
 *      summary: Get the LAN Device with the MAC address that matches
 *        `lanDeviceMac` of the MAC address of the router.
 *
 *      description: Query the first device that has the same MAC address
 *        passed as a URL parameter and returns the specified filter field of
 *        the LAN Devices connected to the router.
 *
 *      tags: ['Get Device | MAC', 'Get Device | MAC | LAN Devices']
 *
 *      parameters:
 *        - in: path
 *          name: mac
 *          schema:
 *            type: string
 *          required: true
 *          description: The MAC address of the router.
 *
 *        - in: path
 *          name: lanDeviceMac
 *          schema:
 *            type: string
 *          required: true
 *          description: The MAC address of the LAN device.
 *
 *        - in: path
 *          name: field
 *          schema:
 *            type: string
 *          required: true
 *          description: The specific field to be returned from the device
 *            instead of the whole information. If the field is not one of
 *            the device's, it will return the error explaining what happenned.
 *            Multiple fields can be passed and must be separated by semicolons
 *            (';'). Do not add a semicolon at the end.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200 - LAN Devices'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
router.get(
  '/device/mac/:mac/lan-devices/mac/:lanDeviceMac/:field?',
  (request, response) => apiController.defaultGetRoute(
    request, response, 'lan_devices', 'mac', 'lanDeviceMac',
  ),
);


/**
 * @openapi
 *  /api/v3/device/mac/{mac}/lan-devices/name/{lanDeviceName}/:
 *    get:
 *      summary: Get the LAN Device with the name that matches `lanDeviceName`
 *        and the MAC address of the router.
 *
 *      description: Query the first device that has the same name passed as a
 *        URL parameter and returns the matched LAN Device connected to the
 *        router.
 *
 *      tags: ['Get Device | MAC', 'Get Device | MAC | LAN Devices']
 *
 *      parameters:
 *        - in: path
 *          name: mac
 *          schema:
 *            type: string
 *          required: true
 *          description: The MAC address of the router.
 *
 *        - in: path
 *          name: lanDeviceName
 *          schema:
 *            type: string
 *          required: true
 *          description: The name of the LAN device.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200 - LAN Devices'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
/**
 * @openapi
 *  /api/v3/device/mac/{mac}/lan-devices/name/{lanDeviceName}/{field}:
 *    get:
 *      summary: Get the LAN Device with the name that matches `lanDeviceName`
 *        and the MAC address of the router.
 *
 *      description: Query the first device that has the same name passed as a
 *        URL parameter and returns the fields specified of the matched LAN
 *        Device connected to the router.
 *
 *      tags: ['Get Device | MAC', 'Get Device | MAC | LAN Devices']
 *
 *      parameters:
 *        - in: path
 *          name: mac
 *          schema:
 *            type: string
 *          required: true
 *          description: The MAC address of the router.
 *
 *        - in: path
 *          name: lanDeviceName
 *          schema:
 *            type: string
 *          required: true
 *          description: The name of the LAN device.
 *
 *        - in: path
 *          name: field
 *          schema:
 *            type: string
 *          required: true
 *          description: The specific field to be returned from the device
 *            instead of the whole information. If the field is not one of
 *            the device's, it will return the error explaining what happenned.
 *            Multiple fields can be passed and must be separated by semicolons
 *            (';'). Do not add a semicolon at the end.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200 - LAN Devices'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
router.get(
  '/device/mac/:mac/lan-devices/name/:lanDeviceName/:field?',
  (request, response) => apiController.defaultGetRoute(
    request, response, 'lan_devices', 'mac', 'lanDeviceName',
  ),
);


/**
 * @openapi
 *  /api/v3/device/mac/{mac}/site-survey/:
 *    get:
 *      summary: Gets the last executed site survey.
 *
 *      description: Query the first device that has the same MAC address
 *        passed as a URL parameter and get it's site survey.
 *
 *      tags: ['Get Device | MAC', 'Get Device | MAC | Site Survey']
 *
 *      parameters:
 *        - in: path
 *          name: mac
 *          schema:
 *            type: string
 *          required: true
 *          description: The MAC address of the device' to the return the site
 *            survey.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200 - Site Survey'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
/**
 * @openapi
 *  /api/v3/device/mac/{mac}/site-survey/{field}:
 *    get:
 *      summary: Gets the last executed site survey.
 *
 *      description: Query the first device that has the same MAC address
 *        passed as a URL parameter and get it's site survey.
 *
 *      tags: ['Get Device | MAC', 'Get Device | MAC | Site Survey']
 *
 *      parameters:
 *        - in: path
 *          name: mac
 *          schema:
 *            type: string
 *          required: true
 *          description: The MAC address of the device' to the return the site
 *            survey.
 *
 *        - in: path
 *          name: field
 *          schema:
 *            type: string
 *          required: true
 *          description: The specific field to be returned from the device
 *            instead of the whole information. If the field is not one of
 *            the device's, it will return the error explaining what happenned.
 *            Multiple fields can be passed and must be separated by semicolons
 *            (';'). Do not add a semicolon at the end.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200 - Site Survey'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
router.get(
  '/device/mac/:mac/site-survey/:field?',
  (request, response) => apiController.defaultGetRoute(
    request, response, 'ap_survey', 'mac',
  ),
);


/**
 * @openapi
 *  /api/v3/device/mac/{mac}/:
 *    get:
 *      summary: Get a device by it's MAC address.
 *
 *      description: Query the first device that has the same MAC address
 *        passed as a URL parameter.
 *
 *      tags: ['Get Device | MAC']
 *
 *      parameters:
 *        - in: path
 *          name: mac
 *          schema:
 *            type: string
 *          required: true
 *          description: The MAC address of the device to be returned.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
/**
 * @openapi
 *  /api/v3/device/mac/{mac}/{field}:
 *    get:
 *      summary: Get a device by it's MAC address.
 *
 *      description: Query the first device that has the same MAC address
 *        passed as a URL parameter and return the field specified.
 *
 *      tags: ['Get Device | MAC']
 *
 *      parameters:
 *        - in: path
 *          name: mac
 *          schema:
 *            type: string
 *          required: true
 *          description: The MAC address of the device to be returned.
 *
 *        - in: path
 *          name: field
 *          schema:
 *            type: string
 *          required: true
 *          description: The specific field to be returned from the device
 *            instead of the whole information. If the field is not one of
 *            the device's, it will return the error explaining what happenned.
 *            Multiple fields can be passed and must be separated by semicolons
 *            (';'). Do not add a semicolon at the end.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
router.get(
  '/device/mac/:mac/:field?',
  (request, response) => apiController.defaultGetRoute(
    request, response, null, 'mac',
  ),
);


/**
 * @openapi
 *  /api/v3/device/serial-tr069/{serialTR069}/:
 *    get:
 *      summary: Get a device by it's TR069 Serial.
 *
 *      description: Query the first device that has the same TR069 Serial
 *        passed as a URL parameter.
 *
 *      tags: ['Get Device | Serial TR-069']
 *
 *      parameters:
 *        - in: path
 *          name: serialTR069
 *          schema:
 *            type: string
 *          required: true
 *          description: The TR069 Serial of the device to be returned.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
/**
 * @openapi
 *  /api/v3/device/serial-tr069/{serialTR069}/{field}:
 *    get:
 *      summary: Get a device by it's TR069 Serial.
 *
 *      description: Query the first device that has the same TR069 Serial
 *        passed as a URL parameter and return the specified field.
 *
 *      tags: ['Get Device | Serial TR-069']
 *
 *      parameters:
 *        - in: path
 *          name: serialTR069
 *          schema:
 *            type: string
 *          required: true
 *          description: The TR069 Serial of the device to be returned.
 *
 *        - in: path
 *          name: field
 *          schema:
 *            type: string
 *          required: true
 *          description: The specific field to be returned from the device
 *            instead of the whole information. If the field is not one of
 *            the device's, it will return the error explaining what happenned.
 *            Multiple fields can be passed and must be separated by semicolons
 *            (';'). Do not add a semicolon at the end.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
router.get(
  '/device/serial-tr069/:serialTR069/:field?',
  (request, response) => apiController.defaultGetRoute(
    request, response, null, 'serialTR069',
  ),
);


/**
 * @openapi
 *  /api/v3/device/external-reference-data/{externalReferenceData}/:
 *    get:
 *      summary: Get a device by it's External Reference.
 *
 *      description: Query the first device that has the same External Reference
 *        passed as a URL parameter.
 *
 *      tags: ['Get Device | External Reference Data']
 *
 *      parameters:
 *        - in: path
 *          name: externalReferenceData
 *          schema:
 *            type: string
 *          required: true
 *          description: The External Reference of the device to be returned.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
/**
 * @openapi
 *  /api/v3/device/external-reference-data/{externalReferenceData}/{field}:
 *    get:
 *      summary: Get a device by it's External Reference.
 *
 *      description: Query the first device that has the same External Reference
 *        passed as a URL parameter and return the specified field.
 *
 *      tags: ['Get Device | External Reference Data']
 *
 *      parameters:
 *        - in: path
 *          name: externalReferenceData
 *          schema:
 *            type: string
 *          required: true
 *          description: The External Reference of the device to be returned.
 *
 *        - in: path
 *          name: field
 *          schema:
 *            type: string
 *          required: true
 *          description: The specific field to be returned from the device
 *            instead of the whole information. If the field is not one of
 *            the device's, it will return the error explaining what happenned.
 *            Multiple fields can be passed and must be separated by semicolons
 *            (';'). Do not add a semicolon at the end.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
router.get(
  '/device/external-reference-data/:externalReferenceData/:field?',
  (request, response) => apiController.defaultGetRoute(
    request, response, null, 'externalReferenceData',
  ),
);


/**
 * @openapi
 *  /api/v3/device/wan-mac/{wanMac}/:
 *    get:
 *      summary: Get a device by it's WAN MAC address.
 *
 *      description: Query the first device that has the same WAN MAC address
 *        passed as a URL parameter
 *
 *      tags: ['Get Device | WAN MAC']
 *
 *      parameters:
 *        - in: path
 *          name: wanMac
 *          schema:
 *            type: string
 *          required: true
 *          description: The WAN MAC address of the device to be returned.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
/**
 * @openapi
 *  /api/v3/device/wan-mac/{wanMac}/{field}:
 *    get:
 *      summary: Get a device by it's WAN MAC address.
 *
 *      description: Query the first device that has the same WAN MAC address
 *        passed as a URL parameter and return the field specified.
 *
 *      tags: ['Get Device | WAN MAC']
 *
 *      parameters:
 *        - in: path
 *          name: wanMac
 *          schema:
 *            type: string
 *          required: true
 *          description: The WAN MAC address of the device to be returned.
 *
 *        - in: path
 *          name: field
 *          schema:
 *            type: string
 *          required: true
 *          description: The specific field to be returned from the device
 *            instead of the whole information. If the field is not one of
 *            the device's, it will return the error explaining what happenned.
 *            Multiple fields can be passed and must be separated by semicolons
 *            (';'). Do not add a semicolon at the end.
 *
 *      security:
 *        - basicAuth: []
 *
 *      responses:
 *        200:
 *          $ref: '#/components/responses/200'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 *
 *        401:
 *          $ref: '#/components/responses/401'
 *
 *        403:
 *          $ref: '#/components/responses/403'
 *
 *        404:
 *          $ref: '#/components/responses/404'
 *
 *        500:
 *          $ref: '#/components/responses/500'
 */
router.get(
  '/device/wan-mac/:wanMac/:field?',
  (request, response) => apiController.defaultGetRoute(
    request, response, null, 'wanMac',
  ),
);


module.exports = router;
