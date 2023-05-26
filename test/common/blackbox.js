/**
 * This file includes test utilities for black box tests.
 * @namespace test/common/blackbox
 */
const constants = require('./constants');
const request = require('supertest');


let blackbox = {};


/**
 * Login as admin in flashman and return the response that can be used to
 * access the api.
 *
 * @memberOf test/common/blackbox
 *
 * @async
 *
 * @return {Response} The login response with the cookie to be setted.
 */
blackbox.loginAsAdmin = async function() {
  return (await request(constants.FLASHMAN_HOST)
    .post('/login')
    .send({
      name: constants.BASIC_AUTH_USER,
      password: constants.BASIC_AUTH_PASS,
    })
    .catch((error) => console.error(error))
  );
};


/**
 * Deletes the CPE passed to this function from Flashman.
 *
 * @memberOf test/common/blackbox
 *
 * @async
 *
 * @param {String} cpeID - The cpeID to be deleted from Flahsman.
 * @param {Cookie} cookie - The login cookie.
 *
 * @return {Response} The delete response.
 */
blackbox.deleteCPE = async function(cpeID, cookie) {
  return (await request(constants.FLASHMAN_HOST)
    .delete('/api/v2/device/delete/' + cpeID)
    .set('Cookie', cookie)
    .auth(constants.BASIC_AUTH_USER, constants.BASIC_AUTH_PASS)
    .send()
    .catch((error) => console.error(error))
  );
};


/**
 * Delete ALL devices on Flashman's "devices" collection
 * directly from MongoDB
 *
 * @memberOf test/common/blackbox
 *
 * @async
 * @param {Cookie} cookie - The login cookie.
 *
 * @return {Response} The deleteMany response from Mongoose.
 */
blackbox.deleteAllDevices = async function(cookie) {
  let response = await request(constants.FLASHMAN_HOST)
    .post('/api/v2/device/get')
    .set('Cookie', cookie)
    .auth(constants.BASIC_AUTH_USER, constants.BASIC_AUTH_PASS)
    .send()
    .catch((error) => console.error(error));
  for (let device of response.body) {
    await blackbox.deleteCPE(device._id, cookie);
  }
};

/**
 * Delete devices in Flashman with an array of IDs.
 *
 * @memberOf test/common/blackbox
 *
 * @async
 *
 * @param {Array<String>} cpes - An array of ID strings. Those ID's are the MAC
 * address of the devices to remove from Flashman.
 * @param {Cookie} cookie - The login cookie.
 */
blackbox.deleteDevices = async function(cpes, cookie) {
  for (let id of cpes) {
    await blackbox.deleteCPE(id, cookie);
  }
};

/**
 * Sends the request to the route specified to Flashman, with the data passed.
 *
 * @memberOf test/common/blackbox
 *
 * @async
 *
 * @param {String} type - The type of request(`put`, `delete`, `get`,
 * `post`...).
 * @param {String} route - The cpeID to be deleted from Flahsman.
 * @param {Cookie} cookie - The cookie login.
 * @param {Object} data - The data to be sent to the route.
 * @param {Object} query - The query parameters to be passed.
 *
 * @return {Response} The response.
 */
blackbox.sendRequestAdmin = async function(type, route, cookie, data, query) {
  let flashmanRequest = request(constants.FLASHMAN_HOST);

  flashmanRequest = flashmanRequest[type](route);
  if (cookie) {
    flashmanRequest.set('Cookie', cookie);
  }

  return await flashmanRequest
    .auth(constants.BASIC_AUTH_USER, constants.BASIC_AUTH_PASS)
    .query(query)
    .send(data)
    .catch((error) => console.error(error));
};

/**
 * Sends the request to the route specified to Flashman, with the data passed.
 *
 * @memberOf test/common/blackbox
 *
 * @async
 *
 * @param {String} type - The type of request(`put`, `delete`, `get`,
 * `post`...).
 * @param {String} route - The cpeID to be deleted from Flahsman.
 * @param {Cookie} cookie - The cookie login.
 * @param {String} user - The user to login.
 * @param {String} password - The password to login.
 * @param {Object} data - The data to be sent to the route.
 *
 * @return {Response} The response.
 */
blackbox.sendRequestUser = async function(type, route, cookie,
  user, password, data) {
  let flashmanRequest = request(constants.FLASHMAN_HOST);

  flashmanRequest = flashmanRequest[type](route);
  if (cookie) {
    flashmanRequest.set('Cookie', cookie);
  }

  return (await flashmanRequest
    .auth(user, password)
    .send(data)
    .catch((error) => console.error(error))
  );
};

/**
 * @exports test/common/blackbox
 */
module.exports = blackbox;
