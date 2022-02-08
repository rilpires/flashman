
const express = require('express');
const notificationController = require('../controllers/notification');
const authController = require('../controllers/auth');
const i18nextMiddleware = require('../controllers/language.js').middleware

let router = express.Router();

router.use( // all paths will use these middlewares.
  authController.ensureLogin(),
  i18nextMiddleware
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
