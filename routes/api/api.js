
const express = require('express');

let router = express.Router();

router.use('/v2', require('./v2'));
router.use('/v3', require('./v3'));

module.exports = router;
