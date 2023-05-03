/**
 * This file includes API V3 routes.
 * @namespace routes/api/v3
 */


const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();

const authController = require('../../controllers/auth');
const deviceListController = require('../../controllers/device_list');


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


// Routes
/**
 * Get a device by it's PPPoE username. It's an API route to query the first
 * device that has the same PPPoE username as passed in URL as a parameter.
 *
 * @memberof routes/api/v3
 *
 * @param {String} PPPoEUsername - The PPPoE username of the device to be
 * returned.
 *
 * @return {Model} The first device that matched the `PPPoEUsername`.
 *
 * @openapi
 *  /api/v3/device/getByPPPoEUser/{PPPoEUsername}:
 *    get:
 *      summary: Get a device by it's PPPoE username.
 *
 *      description: Query the first device that has the same PPPoE username
 *        passed as a URL parameter.
 *
 *      parameters:
 *        - in: path
 *          name: PPPoEUsername
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
 *          description: The first device found that matches the `PPPoEUsername`
 *            or an empty device with success false as it could not find the
 *            device.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  success:
 *                    type: boolean
 *                    description: If could find the device or not.
 *                    example: true
 *                  message:
 *                    type: string
 *                    description: The error message if one occurred.
 *                    example: 'OK'
 *                  device:
 *                    type: object
 *                    description: The device if could found one.
 *                    example: {_id: 'AA:BB:CC:DD:EE:FF'}
 *
 *        401:
 *          description: Authentication information is missing or invalid. Send
 *            the correct user and password as basic auth.
 *
 *        500:
 *          description: An internal error happenned. It can be caused by the
 *            missing `PPPoEUsername` parameter, an invalid request or if could
 *            not read the database.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  success:
 *                    type: boolean
 *                    description: If could find the device or not.
 *                    example: false
 *                  message:
 *                    type: string
 *                    description: The error message if one occurred.
 *                    example: 'No Device Found'
 *                  device:
 *                    type: object
 *                    description: The device if could found one.
 *                    example: {}
 */
router.get(
  '/device/getByPPPoEUser/:PPPoEUsername',
  deviceListController.getByPPPoEUser,
);


/**
 * @exports routes/api/v3
 */
module.exports = router;
