
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const request = require('request-promise-native');

const Config = require('./config');

let Schema = mongoose.Schema;

let deviceSchema = new Schema({
  _id: String,
  created_at: {type: Date},
  external_reference: {kind: String, data: String},
  model: String,
  version: {type: String, default: '0.0.0'},
  installed_release: String,
  release: String,
  is_license_active: Boolean,
  measure_config: {
    measure_psk: String,
    is_active: {type: Boolean, default: false},
  },
  connection_type: {type: String, enum: ['pppoe', 'dhcp']},
  pppoe_user: String,
  pppoe_password: String,
  wifi_ssid: String,
  wifi_password: String,
  wifi_channel: String,
  wifi_band: String,
  wifi_mode: String,
  wifi_state: {type: Number, default: 1},
  wifi_is_5ghz_capable: {type: Boolean, default: false},
  wifi_ssid_5ghz: String,
  wifi_password_5ghz: String,
  wifi_channel_5ghz: String,
  wifi_band_5ghz: String,
  wifi_mode_5ghz: String,
  wifi_state_5ghz: {type: Number, default: 1},
  app_password: String,
  lan_subnet: String,
  lan_netmask: Number,
  lan_devices: [{
    mac: String,
    dhcp_name: String,
    upnp_name: String,
    is_blocked: {type: Boolean, default: false},
    name: String,
    port: [Number],
    router_port: [Number],
    dmz: {type: Boolean, default: false},
    last_seen: {type: Date},
    first_seen: {type: Date},
    ip: String,
    ipv6: [String],
    dhcpv6: [String],
    conn_type: {type: Number, enum: [
      0, // cable
      1, // wireless
    ]},
    conn_speed: Number, // Mbps. Bitrate value in case of wireless
    wifi_freq: Number, // GHz
    wifi_signal: Number, // dBm
    wifi_snr: Number, // dB
    wifi_mode: String, // G, N, AC
    wifi_fingerprint: String, // from hostapd
    dhcp_fingerprint: String,
    dhcp_vendor_class: String,
    app_uid: String, // App unique identification, should match with apps field
    fcm_uid: String, // FCM unique id, app should provide it on login
    upnp_permission: {type: String, default: 'none', enum: [
      'accept', // explicit user ok
      'reject', // explicit user reject
      'none', // never asked
    ]},
  }],
  upnp_requests: [String], // Array of macs, use lan_devices for all device info
  mesh_mode: {type: Number, default: 0, enum: [
    0, // disable mesh
    1, // Cable only
    2, // Wifi 2.4Ghz as backhaul
    3, // Wifi 5Ghz as backhaul
    4, // Use both wifi
  ]},
  mesh_master: String, // Used for slaves only (Master is null)
  mesh_slaves: [String], // Used for master only (Slave is null)
  mesh_id: String, // Used to identify the mesh network (SSID of backhaul)
  mesh_key: String, // Security key in mesh network (key for backhaul)
  mesh_routers: [{ // Info from a point of view of each AP connected to mesh
    mac: String,
    last_seen: {type: Date},
    conn_time: {type: Number, default: 0}, // seconds
    rx_bytes: {type: Number, default: 0}, // bytes
    tx_bytes: {type: Number, default: 0}, // bytes
    signal: {type: Number, default: 0}, // dBm
    rx_bit: {type: Number, default: 0}, // Mbps
    tx_bit: {type: Number, default: 0}, // Mbps
    latency: {type: Number, default: 0}, // ms
    iface: {type: Number, default: 1, enum: [
      1, // Cable
      2, // 2.4 Radio
      3, // 5.0 Radio
    ]},
  }],
  bridge_mode_enabled: {type: Boolean, default: false},
  bridge_mode_switch_disable: {type: Boolean, default: true},
  bridge_mode_ip: String,
  bridge_mode_gateway: String,
  bridge_mode_dns: String,
  wan_ip: String,
  wan_negociated_speed: String,
  wan_negociated_duplex: String,
  ip: String,
  ntp_status: String,
  last_devices_refresh: Date,
  last_contact: Date,
  last_hardreset: Date,
  do_update: Boolean,
  do_update_parameters: Boolean,
  do_update_status: {type: Number, default: 1, enum: [
    0, // waiting status update
    1, // success
    2, // error, image download failed
    3, // error, image check failed
    4, // error, update aborted manually
    5, // error, ack not received in time
    10, // ack recevied
  ]},
  do_update_mesh_remaining: {type: Number, default: 0},
  mqtt_secret: String,
  mqtt_secret_bypass: {type: Boolean, default: false},
  firstboot_log: Buffer,
  firstboot_date: Date,
  lastboot_log: Buffer,
  lastboot_date: Date,
  apps: [{id: String, secret: String}],
  // For port forward
  forward_index: String,
  // For blocked devices
  blocked_devices_index: String,
  // For upnp devices permissions
  upnp_devices_index: String,
  // Store hosts to measure against
  ping_hosts: {
    type: [String],
    default: [
      'www.google.com',
      'www.youtube.com',
      'www.facebook.com',
      'www.instagram.com',
    ],
  },
  sys_up_time: {type: Number, default: 0},
  wan_up_time: {type: Number, default: 0},
  wan_bytes: Object,
  speedtest_results: [{
    down_speed: String,
    timestamp: String,
    user: String,
  }],
  last_speedtest_error: {
    unique_id: String,
    error: String,
  },
  latitude: {type: Number, default: 0},
  longitude: {type: Number, default: 0},
  wps_is_active: {type: Boolean, default: false},
  wps_last_connected_date: {type: Date},
  wps_last_connected_mac: {type: String, default: ''},
});

deviceSchema.plugin(mongoosePaginate);

deviceSchema.methods.getLanDevice = function(mac) {
  return this.lan_devices.find(function(device, idx) {
    return device.mac == mac;
  });
};

deviceSchema.methods.getRouterDevice = function(mac) {
  return this.mesh_routers.find(function(router, idx) {
    return router.mac == mac;
  });
};

// Hooks for device traps notifications
deviceSchema.pre('save', function(callback) {
  let device = this;
  let changedAttrs = {};
  let requestOptions = {};
  const attrsList = device.modifiedPaths();

  if (attrsList.length > 0) {
    // Send modified fields if callback exists
    Config.findOne({is_default: true}).lean().exec(function(err, defConfig) {
      if (err || !defConfig.traps_callbacks ||
                 !defConfig.traps_callbacks.device_crud) {
        return callback(err);
      }
      let callbackUrl = defConfig.traps_callbacks.device_crud.url;
      let callbackAuthUser = defConfig.traps_callbacks.device_crud.user;
      let callbackAuthSecret = defConfig.traps_callbacks.device_crud.secret;
      if (callbackUrl) {
        attrsList.forEach((attr) => {
          changedAttrs[attr] = device[attr];
        });
        requestOptions.url = callbackUrl;
        requestOptions.method = 'PUT';
        requestOptions.json = {
          'id': device._id,
          'type': 'device',
          'changes': changedAttrs,
        };
        if (callbackAuthUser && callbackAuthSecret) {
          requestOptions.auth = {
            user: callbackAuthUser,
            pass: callbackAuthSecret,
          };
        }
        request(requestOptions).then((resp) => {
          // Ignore API response
          return;
        }, (err) => {
          // Ignore API endpoint errors
          return;
        });
      }
    });
  }
  callback();
});

deviceSchema.post('remove', function(device, callback) {
  let requestOptions = {};

  // Send modified fields if callback exists
  Config.findOne({is_default: true}).lean().exec(function(err, defConfig) {
    if (err || !defConfig.traps_callbacks ||
               !defConfig.traps_callbacks.device_crud) {
      return callback(err);
    }
    let callbackUrl = defConfig.traps_callbacks.device_crud.url;
    let callbackAuthUser = defConfig.traps_callbacks.device_crud.user;
    let callbackAuthSecret = defConfig.traps_callbacks.device_crud.secret;
    if (callbackUrl) {
      requestOptions.url = callbackUrl;
      requestOptions.method = 'PUT';
      requestOptions.json = {
        'id': device._id,
        'type': 'device',
        'removed': true,
      };
      if (callbackAuthUser && callbackAuthSecret) {
        requestOptions.auth = {
          user: callbackAuthUser,
          pass: callbackAuthSecret,
        };
      }
      request(requestOptions).then((resp) => {
        // Ignore API response
        return;
      }, (err) => {
        // Ignore API endpoint errors
        return;
      });
    }
  });
  callback();
});

let Device = mongoose.model('Device', deviceSchema );

module.exports = Device;
