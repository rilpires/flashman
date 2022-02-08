
const express = require('express');
const vlanController = require('../controllers/vlan');
const authController = require('../controllers/auth');
const permissionVlan = 'grantVlan';
const permissionProfile = 'grantVlanProfileEdit';
const i18nextMiddleware = require('../controllers/language.js').middleware

// eslint-disable-next-line new-cap
let router = express.Router();

router.use( // all paths will use these middlewares.
  authController.ensureLogin(),
  i18nextMiddleware
);

router.route('/profile').get(
  authController.ensurePermission(permissionProfile),
  vlanController.showVlanProfiles);

router.route('/profile/fetch').get(
  authController.ensurePermission(permissionVlan, 0),
  vlanController.getAllVlanProfiles);

router.route('/profile/new').post(
  authController.ensurePermission(permissionProfile),
  vlanController.addVlanProfile);

router.route('/profile/:vid').get(
  authController.ensurePermission(permissionProfile),
  vlanController.updateVlanProfile);

router.route('/profile/edit/:vid').post(
  authController.ensurePermission(permissionProfile),
  vlanController.editVlanProfile);

router.route('/profile/del').delete(
  authController.ensurePermission(permissionProfile),
  vlanController.removeVlanProfile);

router.route('/profile/check/:profileid').get(
  authController.ensurePermission(permissionProfile),
  vlanController.checkDevicesAffected);

router.route('/fetch/:deviceid').get(
  authController.ensurePermission(permissionVlan, 1),
  vlanController.getVlans);

router.route('/fetchmaxvid').post(
  authController.ensurePermission(permissionVlan, 1),
  vlanController.getMaxVid);

router.route('/fetchvlancompatible').get(
  authController.ensurePermission(permissionVlan, 1),
  vlanController.getVlanCompatibleModels);

router.route('/update/:deviceid').post(
  authController.ensurePermission(permissionVlan, 2),
  vlanController.updateVlans);

module.exports = router;
