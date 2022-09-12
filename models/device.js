
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const request = require('request-promise-native');

const Config = require('./config');

let Schema = mongoose.Schema;

let deviceSchema = new Schema({
  _id: String,
  use_tr069: {type: Boolean, default: false},
  secure_tr069: {type: Boolean, default: true},
  serial_tr069: {type: String, sparse: true},
  // Used when serial is not reliable for crossing data
  alt_uid_tr069: {type: String, sparse: true},
  acs_id: {type: String, sparse: true},
  acs_sync_loops: {type: Number, default: 0},
  last_tr069_sync: Date,
  // Used to signal inform to sync all data after recovering from hard reset
  recovering_tr069_reset: {type: Boolean, default: false},
  created_at: {type: Date},
  external_reference: {
    // 'kind' will have to be translated according to region.
    // In 'pt' language will be 'CPF', 'CNPJ' or 'Outros'.
    kind: String,
    data: {type: String, sparse: true},
  },
  model: String,
  version: {type: String, default: '0.0.0'},
  hw_version: {type: String},
  installed_release: String,
  release: String,
  is_license_active: Boolean,
  data_collecting: {
    is_active: Boolean, // logical AND with config.js value.
    has_latency: Boolean, // logical AND with config.js value.
    ping_fqdn: String, // should use config.js val if this value is falsifiable.
    burst_loss: Boolean, // logical AND with config.js value.
    wifi_devices: Boolean, // logical AND with config.js value.
    ping_and_wan: Boolean, // logical AND with config.js value.
  },
  connection_type: {type: String, enum: ['pppoe', 'dhcp']},
  pppoe_user: {type: String, sparse: true},
  pppoe_password: String,
  pon_rxpower: {type: Number},
  pon_txpower: {type: Number},
  pon_signal_measure: Object,
  wan_vlan_id: Number,
  wan_mtu: Number,
  wifi_ssid: String,
  wifi_bssid: String,
  wifi_password: String,
  wifi_channel: String,
  wifi_last_channel: String, // last channel in use reported from router
  wifi_band: String,
  wifi_last_band: String, // last band in use reported from router
  wifi_mode: String,
  wifi_state: {type: Number, default: 1},
  wifi_hidden: {type: Number, default: 0},
  wifi_power: {
    type: Number, default: 100, enum: [ // Percentage
      25, 50, 75, 100,
    ],
  },
  wifi_is_5ghz_capable: {type: Boolean, default: false},
  wifi_ssid_5ghz: String,
  wifi_bssid_5ghz: String,
  wifi_password_5ghz: String,
  wifi_channel_5ghz: String,
  wifi_last_channel_5ghz: String,
  wifi_band_5ghz: String,
  wifi_last_band_5ghz: String,
  wifi_mode_5ghz: String,
  wifi_state_5ghz: {type: Number, default: 1},
  wifi_hidden_5ghz: {type: Number, default: 0},
  wifi_power_5ghz: {
    type: Number, default: 100, enum: [ // Percentage
      25, 50, 75, 100,
    ],
  },
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
    conn_type: {
      type: Number, enum: [
        0, // cable
        1, // wireless
      ],
    },
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
    upnp_permission: {
      type: String, default: 'none', enum: [
        'accept', // explicit user ok
        'reject', // explicit user reject
        'none', // never asked
      ],
    },
    ping: Number,
  }],
  port_mapping: [{
    ip: String,
    external_port_start: {
      type: Number, required: true, min: 1,
      max: 65535,
    },
    external_port_end: {
      type: Number, required: true, min: 1,
      max: 65535,
    },
    internal_port_start: {type: Number, required: true, min: 1, max: 65535},
    internal_port_end: {type: Number, required: true, min: 1, max: 65535},
  }],
  ap_survey: [{
    mac: String,
    ssid: String,
    freq: Number,
    signal: Number,
    width: Number,
    VHT: Boolean,
    offset: String,
    last_seen: {type: Date},
    first_seen: {type: Date},
  }],
  upnp_requests: [String], // Array of macs, use lan_devices for all device info
  mesh_mode: {
    type: Number, default: 0, enum: [
      0, // disable mesh
      1, // Cable only
      2, // Wifi 2.4Ghz as backhaul
      3, // Wifi 5Ghz as backhaul
      4, // Use both wifi
    ],
  },
  mesh_master: String, // Used for slaves only (Master is null)
  mesh_slaves: [String], // Used for master only (Slave is null)
  mesh_id: String, // Used to identify the mesh network (SSID of backhaul)
  mesh_key: String, // Security key in mesh network (key for backhaul)
  bssid_mesh2: String, // BSSID of 2.4GHz mesh Virtual AP
  bssid_mesh5: String, // Same as above but for 5GHz
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
    iface: {
      type: Number, default: 1, enum: [
        1, // Cable
        2, // 2.4 Radio
        3, // 5.0 Radio
      ],
    },
    n_conn_dev: {type: Number, default: 0},
  }],
  mesh_father: {type: String, default: ''},
  bridge_mode_enabled: {type: Boolean, default: false},
  bridge_mode_switch_disable: {type: Boolean, default: true},
  bridge_mode_ip: String,
  bridge_mode_gateway: String,
  bridge_mode_dns: String,
  wan_ip: String,
  wan_ipv6: String,
  wan_ipv4_mask: {type: Number, default: 0},
  wan_ipv6_mask: {type: Number, default: 0},
  wan_negociated_speed: String,
  wan_negociated_duplex: String,
  ipv6_enabled: {
    type: Number, default: 2, enum: [
      0, 1, 2, // 0 - false, 1 - true, 2 - unknown (old firmware)
    ],
  },
  ip: String,
  ntp_status: String,
  last_site_survey: Date,
  last_devices_refresh: Date,
  last_contact: Date,
  last_contact_daily: Date,
  last_hardreset: Date,
  do_update: Boolean,
  do_update_parameters: Boolean,
  do_update_status: {
    type: Number, default: 1, enum: [
      0, // waiting status update
      1, // success
      2, // error, image download failed
      3, // error, image check failed
      4, // error, update aborted manually
      5, // error, update ack not received in time
      6, // error, topology info not received in time
      7, // error, invalid topology
      10, // ack received
      20, // waiting for topology info
      30, // topology received
    ],
  },
  // Next device to update in a mesh network.
  // Only master will have this
  mesh_next_to_update: String,
  // How many devices in a mesh network must still send onlinedevs info
  // Only master will have this
  mesh_onlinedevs_remaining: {type: Number, default: 0},
  // Devices in a mesh network that must still update
  // Only master will have this
  mesh_update_remaining: [String],
  mqtt_secret: String,
  mqtt_secret_bypass: {type: Boolean, default: false},
  firstboot_log: Buffer,
  firstboot_date: Date,
  lastboot_log: Buffer, // used as simply last requested live log for TR-069
  lastboot_date: Date, // used as simply last requested live log for TR-069
  apps: [{id: String, secret: String}],
  pending_app_secret: String, // used as tr069 secret authentication
  // For port forward
  forward_index: String,
  // For blocked devices
  blocked_devices_index: String,
  // For upnp devices permissions
  upnp_devices_index: String,
  // Store hosts to measure against.
  // These are only used by the generic 'ping' command.
  ping_hosts: {
    type: [String],
  },
  // Store pingtest results
  pingtest_results: [{
    host: String,
    lat: {type: String, default: '---'},
    loss: {type: String, default: '---'},
    count: {type: String, default: '---'},
    completed: {type: Boolean, default: false},
  }],
  sys_up_time: {type: Number, default: 0}, // seconds
  wan_up_time: {type: Number, default: 0}, // seconds
  default_gateway_v4: String,
  default_gateway_v6: String,
  dns_server: String,
  pppoe_mac: String,
  pppoe_ip: String,
  prefix_delegation_addr: String,
  prefix_delegation_mask: String,
  prefix_delegation_local: String,
  // Wan Bytes Format: {epoch: [down bytes, up bytes]} Bytes are cumulative
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
  current_diagnostic: {
    type: {
      type: String,
      enum: ['speedtest', 'ping', 'traceroute', 'sitesurvey'],
    },
    stage: {
      type: String,
      enum: ['', 'estimative', 'measure', 'initiating', 'error', 'done'],
    },
    customized: {type: Boolean},
    recursion_state: {type: Number, default: 5},
    in_progress: {type: Boolean},
    started_at: {type: Date},
    last_modified_at: {type: Date},
    targets: [String],
    user: {type: String},
    webhook_url: {type: String, default: ''},
    webhook_user: {type: String, default: ''},
    webhook_secret: {type: String, default: ''},
  },
  latitude: {type: Number, default: 0},
  longitude: {type: Number, default: 0},
  stop_coordinates_update: {type: Boolean, default: false},
  last_location_date: {type: Date},
  wps_is_active: {type: Boolean, default: false},
  wps_last_connected_date: {type: Date},
  wps_last_connected_mac: {type: String, default: ''},
  vlan: [{
    port: {type: Number, required: true, min: 1, max: 32},
    // restricted to this range of value by the definition of 802.1q protocol
    vlan_id: {type: Number, required: true, min: 1, max: 4095, default: 1},
  }],
  isSsidPrefixEnabled: {type: Boolean},
  web_admin_username: String,
  web_admin_password: String,
  custom_tr069_fields: {
    intelbras_omci_mode: String, // used by WiFiber to specifiy OLT OMCI mode
    voip_enabled: {type: Boolean, default: false},
    ipv6_enabled: {type: Boolean, default: false},
    ipv6_mode: {type: String, default: ''},
  },
  // They are expressed in percentage, without %
  // The value of 101 is invalid, used to represent a not setted state
  cpu_usage: {type: Number, min: 0, max: 101, default: 101},
  memory_usage: {type: Number, min: 0, max: 101, default: 101},
  // Traceroute parameters like max_hops are only valid in firmwares
  traceroute_max_hops: {type: Number, min: 1, max: 50, default: 20},
  traceroute_number_probes: {type: Number, min: 1, max: 5, default: 3},
  traceroute_max_wait: {type: Number, min: 1, max: 5, default: 1},
  traceroute_results: [{
    all_hops_tested: {type: Boolean, default: false},
    reached_destination: {type: Boolean, default: false},
    address: {type: String, default: '---'},
    tries_per_hop: {type: Number, default: 0},
    hops: [{
      ip: {type: String, default: '---'},
      ms_values: [String],
    }],
    completed: {type: Boolean, default: false},
  }],
});

deviceSchema.set('autoIndex', false);

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

deviceSchema.methods.getAPSurveyDevice = function(mac) {
  return this.ap_survey.find(function(device, idx) {
    return device.mac == mac;
  });
};

deviceSchema.statics.findByMacOrSerial = function(
  id, useLean = false, projection = null,
) {
  let query;
  if (Array.isArray(id)) {
    let regexList = [];
    id.forEach((i) => {
      let regex = new RegExp(i, 'i');
      regexList.push(regex);
    });
    query = {'$in': regexList};
  } else if (id !== undefined) {
    let regex = new RegExp(id, 'i');
    query = {'$regex': regex};
  } else {
    return [];
  }
  if (useLean) {
    return this.find({
      $or: [
        {'_id': query}, // mac address
        {'serial_tr069': query}, // serial
        {'alt_uid_tr069': query}],
    }, // mac address
      projection).lean();
  } else {
    return this.find({
      $or: [
        {'_id': query}, // mac address
        {'serial_tr069': query}, // serial
        {'alt_uid_tr069': query}],
    }, // mac address
      projection);
  }
};

// Hooks for device traps notifications
deviceSchema.pre('save', function(callback) {
  let device = this;
  let changedAttrs = {};
  let requestOptions = {};
  const attrsList = device.modifiedPaths();

  if (attrsList.length > 0) {
    // Send modified fields if callback exists
    Config.findOne({is_default: true},
                   {traps_callbacks: true}).lean()
    .exec(function(err, defConfig) {
      if (err || !defConfig.traps_callbacks ||
                 !defConfig.traps_callbacks.devices_crud) {
        return callback(err);
      }
      const promises =
        defConfig.traps_callbacks.devices_crud.map((deviceCrud) => {
          let callbackUrl = deviceCrud.url;
          let callbackAuthUser = deviceCrud.user;
          let callbackAuthSecret = deviceCrud.secret;
          if (callbackUrl) {
            attrsList.forEach((attr) => {
              if (!attr.includes('pingtest_results')) {
                changedAttrs[attr] = device[attr];
              }
            });
            // Nothing to send - don't call trap
            if (Object.keys(changedAttrs).length === 0) {
              return Promise.resolve();
            }
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
            return request(requestOptions);
          }
        });
      Promise.all(promises).then((resp) => {
        // Ignore API response
        return;
      }, (err) => {
        // Ignore API endpoint errors
        return;
      });
    });
  }
  callback();
});

deviceSchema.post('remove', function(device, callback) {
  let requestOptions = {};

  // Send modified fields if callback exists
  Config.findOne({is_default: true},
    {traps_callbacks: true}).lean()
    .exec(function(err, defConfig) {
      if (err || !defConfig.traps_callbacks ||
                 !defConfig.traps_callbacks.device_crud) {
        return callback(err);
      }
      let promises =
        defConfig.traps_callbacks.devices_crud.map((deviceCrud) => {
        let callbackUrl = deviceCrud.url;
        let callbackAuthUser = deviceCrud.user;
        let callbackAuthSecret = deviceCrud.secret;
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
          return request(requestOptions);
        }
      });
      Promise.all(promises).then((resp) => {
        // Ignore API response
        return;
      }, (err) => {
        // Ignore API endpoint errors
        return;
      });
    });
  callback();
});

let Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
