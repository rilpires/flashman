/**
 * This file includes API V3 routes.
 * @namespace routes/api/v3
 */


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
 *      tags: ['Get Device']
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
 *                    properties:
 *                      _id:
 *                        type: string
 *                        description: The MAC address of the device.
 *                        example: 'AA:BB:CC:DD:EE:FF'
 *
 *                      resources_usage:
 *                        type: object
 *                        description: The CPU and Memory usage of the device.
 *                        properties:
 *                          cpu_usage:
 *                            type: integer
 *                            description: The CPU usage in percentage.
 *                            example: 57
 *
 *                          memory_usage:
 *                            type: integer
 *                            description: The Memory usage in percentage.
 *                            example: 34
 *
 *                      version:
 *                        type: string
 *                        description: The firmware version.
 *                        example: '0.35.3'
 *
 *                      wifi_state:
 *                        type: integer
 *                        description: If the 2.4GHz Wi-Fi is turned on or not.
 *                          0 means turned off and 1 means turned on.
 *                        example: 1
 *
 *                      wifi_hidden:
 *                        type: integer
 *                        description: If the 2.4GHz Wi-Fi is hidden or not.
 *                        example: 0
 *
 *                      wifi_power:
 *                        type: integer
 *                        description: The 2.4GHz Wi-Fi power.
 *                        example: 100
 *
 *                      wifi_is_5ghz_capable:
 *                        type: boolean
 *                        description: If the router supports 5GHz Wi-Fi.
 *                        example: true
 *
 *                      wifi_state_5ghz:
 *                        type: integer
 *                        description: If the 5GHz Wi-Fi is turned on or not.
 *                          0 means turned off and 1 means turned on.
 *                        example: 1
 *
 *                      wifi_hidden_5ghz:
 *                        type: integer
 *                        description: If the 5GHz Wi-Fi is hidden or not.
 *                        example: 0
 *
 *                      wifi_power_5ghz:
 *                        type: integer
 *                        description: The 5GHz Wi-Fi power.
 *                        example: 100
 *
 *                      mesh_mode:
 *                        type: integer
 *                        description: The mode of the mesh (
 *                          0 -> Disabled mesh;
 *                          1 -> Cable only;
 *                          2 -> Wi-Fi 2.4Ghz as backhaul;
 *                          3 -> Wi-Fi 5Ghz as backhaul;
 *                          4 -> Use both Wi-Fi. )
 *                        example: 0
 *
 *                      mesh_father:
 *                        type: string
 *                        description: The MAC address of the .
 *                        example: 100
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
 *                    example: 'Error accessing database (xxxx)'
 *                  device:
 *                    type: object
 *                    description: The device if could found one.
 *                    example: {}
 */
router.get(
  '/device/getByPPPoEUser/:PPPoEUsername',
  apiController.getDeviceByField,
);


/**
 * Get a device by it's MAC address. It's an API route to query the first
 * device that has the same MAC address as passed in URL as a parameter.
 *
 * @memberof routes/api/v3
 *
 * @param {String} MAC - The MAC address of the device to be returned.
 *
 * @return {Model} The first device that matched the `MAC`.
 *
 * @openapi
 *  /api/v3/device/getByMAC/{MAC}:
 *    get:
 *      summary: Get a device by it's MAC address.
 *
 *      description: Query the first device that has the same MAC address
 *        passed as a URL parameter.
 *
 *      tags: ['Get Device']
 *
 *      parameters:
 *        - in: path
 *          name: MAC
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
 *          description: The first device found that matches the `MAC`
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
 *            missing `MAC` parameter, an invalid request or if could not read
 *            the database.
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
 *                    example: 'Error accessing database (xxxx)'
 *                  device:
 *                    type: object
 *                    description: The device if could found one.
 *                    example: {}
 */
router.get(
  '/device/getByMAC/:MAC',
  apiController.getDeviceByField,
);


/**
 * Get a device by it's TR069 Serial. It's an API route to query the first
 * device that has the same TR069 Serial as passed in URL as a parameter.
 *
 * @memberof routes/api/v3
 *
 * @param {String} SerialTR069 - The TR069 Serial of the device to be returned.
 *
 * @return {Model} The first device that matched the `SerialTR069`.
 *
 * @openapi
 *  /api/v3/device/getBySerialTR069/{SerialTR069}:
 *    get:
 *      summary: Get a device by it's TR069 Serial.
 *
 *      description: Query the first device that has the same TR069 Serial
 *        passed as a URL parameter.
 *
 *      tags: ['Get Device']
 *
 *      parameters:
 *        - in: path
 *          name: SerialTR069
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
 *          description: The first device found that matches the `SerialTR069`
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
 *            missing `SerialTR069` parameter, an invalid request or if could
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
 *                    example: 'Error accessing database (xxxx)'
 *                  device:
 *                    type: object
 *                    description: The device if could found one.
 *                    example: {}
 */
router.get(
  '/device/getBySerialTR069/:SerialTR069',
  apiController.getDeviceByField,
);


/**
 * Get a device by it's External Reference. It's an API route to query the first
 * device that has the same External Reference as passed in URL as a parameter.
 *
 * @memberof routes/api/v3
 *
 * @param {String} ExternalReferenceData - The External Reference of the device
 * to be returned.
 *
 * @return {Model} The first device that matched the `ExternalReferenceData`.
 *
 * @openapi
 *  /api/v3/device/getByExternalReferenceData/{ExternalReferenceData}:
 *    get:
 *      summary: Get a device by it's External Reference.
 *
 *      description: Query the first device that has the same External Reference
 *        passed as a URL parameter.
 *
 *      tags: ['Get Device']
 *
 *      parameters:
 *        - in: path
 *          name: ExternalReferenceData
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
 *          description: The first device found that matches the
 *            `ExternalReferenceData` or an empty device with success false as
 *             it could not find the device.
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
 *            missing `ExternalReferenceData` parameter, an invalid request or
 *            if could not read
 *            the database.
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
 *                    example: 'Error accessing database (xxxx)'
 *                  device:
 *                    type: object
 *                    description: The device if could found one.
 *                    example: {}
 */
router.get(
  '/device/getByExternalReferenceData/:ExternalReferenceData',
  apiController.getDeviceByField,
);


/**
 * Get a device by it's WAN MAC address. It's an API route to query the first
 * device that has the same WAN MAC address as passed in URL as a parameter.
 *
 * @memberof routes/api/v3
 *
 * @param {String} WANMAC - The WAN MAC address of the device to be returned.
 *
 * @return {Model} The first device that matched the `WANMAC`.
 *
 * @openapi
 *  /api/v3/device/getByWANMAC/{WANMAC}:
 *    get:
 *      summary: Get a device by it's WAN MAC address.
 *
 *      description: Query the first device that has the same WAN MAC address
 *        passed as a URL parameter.
 *
 *      tags: ['Get Device']
 *
 *      parameters:
 *        - in: path
 *          name: WANMAC
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
 *          description: The first device found that matches the `WANMAC`
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
 *            missing `WANMAC` parameter, an invalid request or if could not
 *            read the database.
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
 *                    example: 'Error accessing database (xxxx)'
 *                  device:
 *                    type: object
 *                    description: The device if could found one.
 *                    example: {}
 */
router.get(
  '/device/getByWANMAC/:WANMAC',
  apiController.getDeviceByField,
);


/**
 * @exports routes/api/v3
 */
module.exports = router;
