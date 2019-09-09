const mongoose = require('mongoose');

let configSchema = new mongoose.Schema({
  is_default: {type: Boolean, required: true, default: false},
  autoUpdate: {type: Boolean, default: true},
  hasUpdate: {type: Boolean, default: false},
  pppoePassLength: {type: Number, default: 8},
  messaging_configs: {
    functions_fqdn: String,
    secret_token: String,
  },
  measure_configs: {
    is_active: {type: Boolean, default: false},
    is_license_active: {type: Boolean, default: false},
    auth_token: {type: String},
    controller_fqdn: String,
    zabbix_fqdn: String,
  },
  device_update_schedule: {
    is_active: {type: Boolean, default: false},
    is_aborted: {type: Boolean, default: false},
    date: {type: Date},
    allowed_time_range: {
      start: {type: Date},
      end: {type: Date},
    },
    rule: {
      release: {type: String},
      to_do_devices: [{
        mac: {type: String, required: true},
        state: {type: String, enum: ['update', 'retry', 'offline']},
        retry_count: {type: Number, default: 0},
      }],
      in_progress_devices: [{
        mac: {type: String, required: true},
        state: {type: String, enum: ['downloading', 'updating']},
        retry_count: {type: Number, default: 0},
      }],
      done_devices: [{
        mac: {type: String, required: true},
        state: {type: String, enum: ['ok', 'error', 'aborted', 'aborted_off']},
      }],
    },
  },
  traps_callbacks: {
    device_crud: {url: String, user: String, secret: String},
    user_crud: {url: String, user: String, secret: String},
    role_crud: {url: String, user: String, secret: String},
  },
});

let config = mongoose.model('config', configSchema);

module.exports = config;
