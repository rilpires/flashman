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
    used_time_range: {type: Boolean},
    used_csv: {type: Boolean},
    used_search: {type: String},
    date: {type: Date},
    device_count: {type: Number, default: 0},
    allowed_time_ranges: [{
      start_day: {type: Number, enum: [0, 1, 2, 3, 4, 5, 6]},
      end_day: {type: Number, enum: [0, 1, 2, 3, 4, 5, 6]},
      start_time: {type: String},
      end_time: {type: String},
    }],
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
