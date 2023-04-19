/**
 * This file includes test constants.
 * @namespace test/common/constants
 */


let constants = {};


/**
 * The development Flashman host string.
 *
 * @memberof test/common/constants
 *
 * @type {String}
 */
constants.FLASHMAN_HOST = 'http://localhost:8000';

/**
 * The development Flashman authentication username.
 *
 * @memberof test/common/constants
 *
 * @type {String}
 */
constants.BASIC_AUTH_USER = 'admin';

/**
 * The development Flashman authentication password.
 *
 * @memberof test/common/constants
 *
 * @type {String}
 */
constants.BASIC_AUTH_PASS = 'flashman';


/**
 * The development GenieACS host string.
 *
 * @memberof test/common/constants
 *
 * @type {String}
 */
constants.GENIEACS_HOST = 'http://localhost:57547';

/**
 * @exports test/common/constants
 */
module.exports = constants;
