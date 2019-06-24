const mongoose = require('mongoose');

let configSchema = new mongoose.Schema({
  is_default: {type: Boolean, required: true, default: false},
  autoUpdate: {type: Boolean, default: true},
  hasUpdate: {type: Boolean, default: false},
  pppoePassLength: {type: Number, default: 8},
  measure_configs: {
    is_active: {type: Boolean, default: false},
    is_license_active: {type: Boolean, default: false},
    auth_token: {type: String},
    controller_fqdn: String,
    zabbix_fqdn: String,
  },
  traps_callbacks: {
    device_crud: {url: String, user: String, secret: String},
    user_crud: {url: String, user: String, secret: String},
    role_crud: {url: String, user: String, secret: String},
  },
});

let config = mongoose.model('config', configSchema);

module.exports = config;
