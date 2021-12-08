
const express = require('express');
const userController = require('../controllers/user');
const authController = require('../controllers/auth');

let router = express.Router();

// GET change password page
router.route('/changepassword').get(
  authController.ensureLogin(),
  userController.changePassword);

// POST change number of elements per page on table
router.route('/elementsperpage').post(
  authController.ensureLogin(),
  userController.changeElementsPerPage);

router.route('/visiblecolumnsperpage').post(
  authController.ensureLogin(),
  userController.changeVisibleColumnsOnPage);

router.route('/profile').get(
  authController.ensureLogin(),
  userController.getProfile);

router.route('/profile/:id').get(
  authController.ensureLogin(),
  userController.getProfile);

router.route('/certificates/del').post(
  authController.ensureLogin(),
  userController.deleteCertificates);

router.route('/certificates').get(
  authController.ensureLogin(),
  userController.showCertificates);

router.route('/showall').get(
  authController.ensureLogin(),
  userController.showAll);

router.route('/roles').get(
  authController.ensureLogin(),
  userController.showRoles);

router.route('/edit/:id').post(
  authController.ensureLogin(),
  userController.editUser);

router.route('/settings').get(
  authController.ensureLogin(),
  userController.settings
);

router.route('/certificates/search').post(
  authController.ensureLogin(),
  userController.certificateSearch,
);

// ** DEPRECATED **
                         .put(
  authController.ensureAPIAccess,
  userController.editUser);

router.route('/get/all').get(
  authController.ensureLogin(),
  userController.getUsers)

router.route('/get/one/:id').get(
  authController.ensureLogin(),
  userController.getUserById)

// ** DEPRECATED **
                        .get(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.getUsers);

router.route('/new').post(
  authController.ensureLogin(),
  userController.postUser)

// ** DEPRECATED **
                    .put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.postUser);

router.route('/del').post(
  authController.ensureLogin(),
  userController.deleteUser)

// ** DEPRECATED **
                    .put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.deleteUser);

router.route('/role/get/all').get(
  authController.ensureLogin(),
  userController.getRoles)

// ** DEPRECATED **
                             .get(
  authController.ensureAPIAccess,
  userController.getRoles);

router.route('/role/new').post(
  authController.ensureLogin(),
  userController.postRole)

// ** DEPRECATED **
                         .put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.postRole);

router.route('/role/edit/:id').post(
  authController.ensureLogin(),
  userController.editRole)

// ** DEPRECATED **
                              .put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.editRole);

router.route('/role/del').post(
  authController.ensureLogin(),
  userController.deleteRole)

// ** DEPRECATED **
                         .put(
  authController.ensureAPIAccess,
  authController.ensurePermission('grantAPIAccess'),
  userController.deleteRole);

module.exports = router;
