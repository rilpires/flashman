
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
let Schema = mongoose.Schema;

let deviceSchema = new Schema({
  _id: String,
  external_reference: {kind: String, data: String},
  model: String,
  version: {type: String, default: '0.0.0'},
  installed_release: String,
  release: String,
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
  wifi_is_5ghz_capable: {type: Boolean, default: false},
  wifi_ssid_5ghz: String,
  wifi_password_5ghz: String,
  wifi_channel_5ghz: String,
  wifi_band_5ghz: String,
  wifi_mode_5ghz: String,
  app_password: String,
  lan_subnet: String,
  lan_netmask: Number,
  lan_devices: [{
    mac: String,
    dhcp_name: String,
    is_blocked: {type: Boolean, default: false},
    name: String,
    port: [Number],
    router_port: [Number],
    dmz: {type: Boolean, default: false},
    last_seen: {type: Date, default: Date.now},
    first_seen: {type: Date, default: Date.now},
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
  }],
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
  ]},
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
});

deviceSchema.plugin(mongoosePaginate);

deviceSchema.methods.getLanDevice = function(mac) {
  return this.lan_devices.find(function(device, idx) {
    return device.mac == mac;
  });
};

let Device = mongoose.model('Device', deviceSchema );

module.exports = Device;
