
const express = require('express');
const notificationController = require('../controllers/notification');
const authController = require('../controllers/auth');

let router = express.Router();

// POST hook registration for device status updates
router.route('/register/devicestatus').post(
  authController.ensureLogin(),
  notificationController.registerStatusNotification);

router.route('/fetch').post(
  authController.ensureLogin(),
  notificationController.fetchNotifications);

router.route('/del').post(
  authController.ensureLogin(),
  notificationController.delNotification);


router.route('/seen').post(
  authController.ensureLogin(),
  notificationController.SeeNotification);

module.exports = router;
