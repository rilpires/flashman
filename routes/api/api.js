
const express = require('express');

let router = express.Router();

router.use('/v2', require('./v2'));

module.exports = router;
