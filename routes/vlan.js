
const express = require('express');
const vlanController = require('../controllers/vlan');
const authController = require('../controllers/auth');
const permissionVlan = 'grantVlan';
const permissionProfile = 'grantVlanProfileEdit';

// eslint-disable-next-line new-cap
let router = express.Router();

router.route('/profile').get(
  authController.ensureLogin(),
  authController.ensurePermission(permissionProfile),
  vlanController.showVlanProfiles);

router.route('/profile/fetch').get(
  authController.ensureLogin(),
  authController.ensurePermission(permissionVlan, 0),
  vlanController.getAllVlanProfiles);

router.route('/profile/new').post(
  authController.ensureLogin(),
  authController.ensurePermission(permissionProfile),
  vlanController.addVlanProfile);

router.route('/profile/:vid').get(
  authController.ensureLogin(),
  authController.ensurePermission(permissionProfile),
  vlanController.updateVlanProfile);

router.route('/profile/edit/:vid').post(
  authController.ensureLogin(),
  authController.ensurePermission(permissionProfile),
  vlanController.editVlanProfile);

router.route('/profile/del').delete(
  authController.ensureLogin(),
  authController.ensurePermission(permissionProfile),
  vlanController.removeVlanProfile);

router.route('/profile/check/:profileid').get(
  authController.ensureLogin(),
  authController.ensurePermission(permissionProfile),
  vlanController.checkDevicesAffected);

router.route('/fetch/:deviceid').get(
  authController.ensureLogin(),
  authController.ensurePermission(permissionVlan, 1),
  vlanController.getVlans);

router.route('/fetchmaxvid').post(
  authController.ensureLogin(),
  authController.ensurePermission(permissionVlan, 1),
  vlanController.getMaxVid);

router.route('/fetchvlancompatible').get(
  authController.ensureLogin(),
  authController.ensurePermission(permissionVlan, 1),
  vlanController.getVlanCompatibleModels);

router.route('/update/:deviceid').post(
  authController.ensureLogin(),
  authController.ensurePermission(permissionVlan, 2),
  vlanController.updateVlans);

module.exports = router;
