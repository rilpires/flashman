const mongoose = require('mongoose');

let configSchema = new mongoose.Schema({
  is_default: {type: Boolean, required: true, default: false},
  language: String,
  autoUpdate: {type: Boolean, default: true},
  hasUpdate: {type: Boolean, default: false},
  hasMajorUpdate: {type: Boolean, default: false},
  pppoePassLength: {type: Number, default: 1, min: 1, max: 64},
  measureServerIP: {type: String},
  measureServerPort: {type: Number, default: 80},
  messaging_configs: {
    functions_fqdn: String,
    secret_token: String,
  },
  blockLicenseAtDeviceRemoval: {
    type: Boolean, required: true, default: false},
  tr069: {
    server_url: String,
    web_login: String,
    web_password: String,
    web_login_user: String,
    web_password_user: String,
    connection_login: {type: String, default: 'anlix'},
    connection_password: {type: String, default: 'landufrj123'},
    remote_access: {type: Boolean, default: false},
    inform_interval: {type: Number, required: true, default: 5*60*1000}, // ms
    sync_interval: {type: Number, required: true, default: 5*60*1000}, // ms
    recovery_threshold: {type: Number, required: true, default: 1}, // intervals
    offline_threshold: {type: Number, required: true, default: 3}, // intervals
    pon_signal_threshold: {type: Number, default: -18},
    pon_signal_threshold_critical: {type: Number, default: -23},
    pon_signal_threshold_critical_high: {type: Number, default: 3},
    stun_enable: {type: Boolean, default: false},
    insecure_enable: {type: Boolean, default: false},
    has_never_enabled_insecure: {type: Boolean, default: true},
    onu_factory_credentials: {
      timestamp: {type: Date},
      credentials: [{
        vendor: {type: String},
        model: {type: String},
        username: {type: String},
        password: {type: String},
      }],
    },
  },
  certification: {
    // WAN steps required here are:
    // - Response of a ping to gateway must succeed
    wan_step_required: {type: Boolean, required: true, default: true},
    ipv4_step_required: {type: Boolean, required: true, default: true},
    ipv6_step_required: {type: Boolean, required: true, default: false},
    dns_step_required: {type: Boolean, required: true, default: true},
    // Flashman steps required here are:
    // - CPE must have a registry created successfully at Flashman DB
    // - CPE must be present at MQTT list of connected devices if it is a
    //   CPE using Flashbox firmware
    flashman_step_required: {type: Boolean, required: true, default: true},
    speedtest_step_required: {type: Boolean, default: false},
  },
  data_collecting: {
    is_active: Boolean,
    has_latency: Boolean,
    alarm_fqdn: String,
    ping_fqdn: String,
    ping_packets: Number,
    burst_loss: Boolean,
    wifi_devices: Boolean,
    ping_and_wan: Boolean,
  },
  default_ping_hosts: {type: [String]},
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
      // Time in minutes to consider a router update timed out,
      // default is 1440 minutes, or a whole day
      timeout_enable: {type: Boolean, default: false},
      timeout_period: {type: Number, default: 1440},

      release: {type: String},
      cpes_wont_return: {type: Boolean, default: false},
      to_do_devices: [{
        mac: {type: String, required: true},
        state: {type: String},
        slave_count: {type: Number, default: 0},
        retry_count: {type: Number, default: 0},
        // mesh version of current release
        mesh_current: {type: Number, default: 1},
        // mesh version of release after upgrade
        mesh_upgrade: {type: Number, default: 1},
      }],
      in_progress_devices: [{
        mac: {type: String, required: true},
        // slave state is legacy, can't be changed, simply means that the first
        // device has already updated
        state: {type: String},
        slave_count: {type: Number, default: 0},
        // legacy name that we can't change, it's just number of devices
        // remaining
        slave_updates_remaining: {type: Number, default: 0},
        retry_count: {type: Number, default: 0},
        mesh_current: {type: Number, default: 1},
        mesh_upgrade: {type: Number, default: 1},

        // Date that the update for this router started
        marked_update_date: {type: Date},
      }],
      done_devices: [{
        mac: {type: String, required: true},
        slave_count: {type: Number, default: 0},
        // legacy name that we can't change, it's just number of devices
        // remaining
        slave_updates_remaining: {type: Number, default: 0},
        state: {type: String},
        mesh_current: {type: Number, default: 1},
        mesh_upgrade: {type: Number, default: 1},
      }],
    },
  },
  traps_callbacks: {
    device_crud: {url: String, user: String, secret: String},
    user_crud: {url: String, user: String, secret: String},
    role_crud: {url: String, user: String, secret: String},
    certification_crud: {url: String, user: String, secret: String},
    devices_crud: [{url: String, user: String, secret: String}],
    users_crud: [{url: String, user: String, secret: String}],
    roles_crud: [{url: String, user: String, secret: String}],
    certifications_crud: [{url: String, user: String, secret: String}],
  },
  auth_pubkey: {type: String, default: ''},
  auth_privkey: {type: String, default: ''},
  androidLink: {type: String, default: ''},
  iosLink: {type: String, default: ''},
  personalizationHash: {type: String, default: ''},
  vlans_profiles: [{
    // restricted to this range of value by the definition of 802.1q protocol
    vlan_id: {type: Number, required: true, min: 1, max: 4094},
    profile_name: {type: String,
                   required: true,
                   match: /[A-Za-z0-9_-]/,
                   maxLength: 32},
  }],
  isSsidPrefixEnabled: {type: Boolean},
  ssidPrefix: {type: String},
  licenseApiSecret: {type: String, default: ''},
  company: {type: String, default: ''},
  mqtt_secret_bypass: {type: Boolean, default: false},
  specificAppTechnicianWebLogin: {type: Boolean, default: false},
});

let config = mongoose.model('config', configSchema);

module.exports = config;
