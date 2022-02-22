const express = require('express');
const authController = require('../controllers/auth');
const language = require('../controllers/language.js');

const handlers = language.handlers;
const router = express.Router();

// router.use( // all paths will use these middlewares.
//   authController.ensureLogin(),
// );

router.route('/translation.json')
  .get(handlers.getTranslation);

router.route('/config')
  .get(authController.ensureLogin(), handlers.getLanguage)
  .post(authController.ensureLogin(), handlers.updateLanguage);

module.exports = router;
