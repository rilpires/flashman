
const express = require('express');

let router = express.Router();

router.use('/login', require('./login'));
router.use('/devicelist', require('./device_list'));
router.use('/deviceinfo', require('./device_info'));
router.use('/data_collecting', require('./data_collecting'));
router.use('/user', require('./user'));
router.use('/firmware', require('./firmware'));
router.use('/language', require('./language'));
router.use('/upgrade', require('./upgrade'));
router.use('/notification', require('./notification'));
router.use('/api', require('./api/api'));
router.use('/acs', require('./genieacs'));
router.use('/vlan', require('./vlan'));
router.use('/factory_credentials', require('./factory_credentials'));

router.get('/', function(req, res) {
  res.redirect('/devicelist');
});

router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/login');
});

module.exports = router;
