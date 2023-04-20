const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();

const authController = require('../../controllers/auth');


// Ensure that the user has access to API routes in this file
router.use(
  authController.ensureAPIAccess,
);


// Routes
/**
 * @swagger
 */
router.get('/', function(req, res) {
  res.status(200).json({test: true});
});
