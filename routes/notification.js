
const express = require('express');
const notificationController = require('../controllers/notification');
const authController = require('../controllers/auth');

let router = express.Router();

router.use( // all paths will use these middlewares.
  authController.ensureLogin(),
);

// POST hook registration for device status updates
router.route('/register/devicestatus').post(
  notificationController.registerStatusNotification);

router.route('/fetch').post(
  notificationController.fetchNotifications);

router.route('/del').post(
  notificationController.delNotification);


router.route('/seen').post(
  notificationController.SeeNotification);

module.exports = router;
