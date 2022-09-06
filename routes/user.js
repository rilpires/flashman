
const express = require('express');
const userController = require('../controllers/user');
const authController = require('../controllers/auth');

// eslint-disable-next-line new-cap
let router = express.Router();

router.use( // all paths will use these middlewares.
  authController.ensureLogin(),
);

// GET change password page
router.route('/changepassword').get(
  userController.changePassword);

// POST change number of elements per page on table
router.route('/elementsperpage').post(
  userController.changeElementsPerPage);

router.route('/visiblecolumnsperpage').post(
  userController.changeVisibleColumnsOnPage);

router.route('/profile').get(
  userController.getProfile);

router.route('/profile/:id').get(
  userController.getProfile);

router.route('/certificates/del').post(
  userController.deleteCertificates);

router.route('/certificates').get(
  userController.showCertificates);

router.route('/showall').get(
  userController.showAll);

router.route('/roles').get(
  userController.showRoles);

router.route('/edit/:id').post(
  userController.editUser);

router.route('/settings').get(
  userController.settings);

router.route('/certificates/search').post(
  userController.certificateSearch);

router.route('/get/all').get(
  userController.getUsers);

router.route('/get/one/:id').get(
  userController.getUserById);

router.route('/new').post(
  userController.postUser);

router.route('/del').post(
  userController.deleteUser);

router.route('/role/get/all').get(
  userController.getRoles);

router.route('/role/new').post(
  userController.postRole);

router.route('/role/edit/:id').post(
  userController.editRole);

router.route('/role/del').post(
  userController.deleteRole);


module.exports = router;
