
const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const request = require('request-promise-native');

const Config = require('./config');

let userSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    unique: true,
    required: true,
  },
  lastLogin: {type: Date},
  createdAt: {type: Date, default: new Date()},
  autoUpdate: {type: Boolean, default: true},
  maxElementsPerPage: {type: Number, default: 10},
  visibleColumnsOnPage: {type: [Number], default: [4, 5, 6, 7, 8]},
  is_superuser: {type: Boolean, default: false},
  role: {type: String, required: false},
  deviceCertifications: [{
    finished: {type: Boolean, default: true},
    mac: {type: String},
    onuMac: {type: String},
    isOnu: {type: Boolean, default: false},
    routerModel: {type: String},
    routerVersion: {type: String},
    routerRelease: {type: String},
    timestamp: {type: Date, default: new Date()},
    localEpochTimestamp: {type: Number},
    didDiagnose: {type: Boolean, default: false},
    diagnostic: {
      wan: {type: Boolean, default: false},
      tr069: {type: Boolean, default: false},
      pon: {type: Number, default: -1},
      rxpower: {type: Number, default: 0},
      ipv4: {type: Boolean, default: false},
      ipv6: {type: Boolean, default: false},
      dns: {type: Boolean, default: false},
      anlix: {type: Boolean, default: false},
      flashman: {type: Boolean, default: false},
      speedtest: {type: Boolean, default: false},
      speedValue: {type: Number, default: -1},
      speedTestLimit: {type: Number, default: -1},
    },
    didConfigureTR069: {type: Boolean, default: false},
    didConfigureWan: {type: Boolean, default: false},
    wanConfigOnu: {type: String},
    routerConnType: {type: String},
    pppoeUser: {type: String},
    bridgeIP: {type: String},
    bridgeGateway: {type: String},
    bridgeDNS: {type: String},
    bridgeSwitch: {type: Boolean, default: true},
    didConfigureWifi: {type: Boolean, default: false},
    wifiConfig: {
      hasFive: {type: Boolean, default: false},
      two: {
        ssid: {type: String},
        channel: {type: String},
        band: {type: String},
        mode: {type: String},
      },
      five: {
        ssid: {type: String},
        channel: {type: String},
        band: {type: String},
        mode: {type: String},
      },
    },
    didConfigureMesh: {type: Boolean, default: false},
    mesh: {
      mode: {type: Number, default: 0},
      updatedSlaves: [String],
      originalSlaves: [String],
    },
    didConfigureContract: {type: Boolean, default: false},
    didConfigureObservation: {type: Boolean, default: false},
    contract: {type: String, required: false},
    observations: {type: String, required: false},
    cancelReason: {type: String, required: false},
    latitude: {type: Number, default: 0},
    longitude: {type: Number, default: 0},
    didSpeedTest: {type: Boolean, default: false},
  }]
});

// Execute before each user.save() call
userSchema.pre('save', function(callback) {
  let user = this;
  let changedAttrs = {};
  let requestOptions = {};
  const attrsList = user.modifiedPaths();

  // Verify if password has changed
  if (user.isModified('password')) {
    // Password changed so we need to hash it again
    bcrypt.genSalt(5, function(err, salt) {
      if (err) return callback(err);
      bcrypt.hash(user.password, salt, null, function(err, hash) {
        if (err) return callback(err);
        user.password = hash;
      });
    });
  }

  // Verify modified fields and trigger trap
  if (attrsList.length > 0) {
    // Send modified fields if callback exists
    Config.findOne({is_default: true}).lean().exec(function(err, defConfig) {
      if (err || !defConfig.traps_callbacks ||
                 !defConfig.traps_callbacks.user_crud) {
        return callback(err);
      }
      let callbackUrl = defConfig.traps_callbacks.user_crud.url;
      let callbackAuthUser = defConfig.traps_callbacks.user_crud.user;
      let callbackAuthSecret = defConfig.traps_callbacks.user_crud.secret;
      if (callbackUrl) {
        attrsList.forEach((attr) => {
          changedAttrs[attr] = user[attr];
        });
        requestOptions.url = callbackUrl;
        requestOptions.method = 'PUT';
        requestOptions.json = {
          'id': user._id,
          'type': 'user',
          'name': user.name,
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

userSchema.post('remove', function(user, callback) {
  let requestOptions = {};

  // Send modified fields if callback exists
  Config.findOne({is_default: true}).lean().exec(function(err, defConfig) {
    if (err || !defConfig.traps_callbacks ||
               !defConfig.traps_callbacks.user_crud) {
      return callback(err);
    }
    let callbackUrl = defConfig.traps_callbacks.user_crud.url;
    let callbackAuthUser = defConfig.traps_callbacks.user_crud.user;
    let callbackAuthSecret = defConfig.traps_callbacks.user_crud.secret;
    if (callbackUrl) {
      requestOptions.url = callbackUrl;
      requestOptions.method = 'PUT';
      requestOptions.json = {
        'id': user._id,
        'type': 'user',
        'name': user.name,
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

// Function that verifies if hashed password inside model is equal
// to another
userSchema.methods.verifyPassword = function(password, callback) {
  bcrypt.compare(password, this.password, function(err, isMatch) {
    if (err) return callback(err);
    callback(null, isMatch);
  });
};

let User = mongoose.model('User', userSchema);

module.exports = User;
