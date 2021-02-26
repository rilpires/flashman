
const express = require('express');
const vlanController = require('../controllers/vlan');
const authController = require('../controllers/auth');
const permission = 'grantVlan';
const permissionProfile = 'grantVlanProfileEdit';

let router = express.Router();

router.route('/profile').get(authController.ensureLogin(),
                           authController.ensurePermission(permissionProfile),
                           vlanController.showVlanProfiles);

router.route('/profile/fetch').get(authController.ensureLogin(), vlanController.getAllVlanProfiles);

router.route('/profile/new').post(authController.ensureLogin(),
                           authController.ensurePermission(permissionProfile),
                           vlanController.addVlanProfile);


router.route('/profile/:vid').get(authController.ensureLogin(),
                           authController.ensurePermission(permissionProfile),
                           vlanController.getVlanProfile);

router.route('/profile/edit/:vid').post(authController.ensureLogin(),
                           authController.ensurePermission(permissionProfile),
                           vlanController.editVlanProfile);

router.route('/profile/del').delete(authController.ensureLogin(),
                           authController.ensurePermission(permissionProfile),
                           vlanController.removeVlanProfile);

router.route('/fetch/:deviceid').get(authController.ensureLogin(),
                           authController.ensurePermission(permission),
                           vlanController.getVlansFromDevice);

/*

router.route('/del').post(authController.ensureLogin(),
                          authController.ensurePermission(permission),
                          vlanController.delVlan);

router.route('/upload').post(authController.ensureLogin(),
                             authController.ensurePermission(permission),
                             vlanController.uploadVlan);

router.route('/sync').post(authController.ensureLogin(),
                           authController.ensurePermission(permission),
                           vlanController.syncRemoteVlanFiles);

router.route('/add').post(authController.ensureLogin(),
                          authController.ensurePermission(permission),
                          vlanController.addRemoteVlanFile);

*/

module.exports = router;
