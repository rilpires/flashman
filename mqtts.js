
const aedes = require('aedes');
const sio = require('./sio');
const DeviceModel = require('./models/device');
const Notification = require('./models/notification');

let mqtts = aedes();

mqtts.on('client', function(client, err) {
  console.log('Router connected on MQTT: ' + client.id);
  sio.anlixSendDeviceStatusNotification(client.id, 'online');
});

mqtts.on('clientDisconnect', function(client, err) {
  console.log('Router disconnected on MQTT: ' + client.id);
  sio.anlixSendDeviceStatusNotification(client.id, 'recovery');
});

mqtts.on('ack', function(packet, client, err) {
// packet is always undefined... maybe a bug?
  if (client.id) {
    console.log('MQTT Message Delivered successfully for ' + client.id);
  }
});

mqtts.authenticate = function(client, username, password, cb) {
  let needauth = true;
  if (process.env.FLM_TEMPORARY_MQTT_BROKER_PORT) {
    // Temporary disabled auth for old routers
    if (client.id) {
      if (client.id.startsWith('mosqsub')) {
        console.log('MQTT AUTH on INSECURE SERVER: Device ' + client.id);
        cb(null, true);
        needauth = false;
      }
    }
  }

  if (needauth) {
    let error = new Error('Auth error');
    if (!username) {
      console.log('MQTT AUTH ERROR - Username not specified: Device ' +
                  client.id);
      error.returnCode = 2;
      cb(error, null);
    } else {
      DeviceModel.findById(username, function(err, matchedDevice) {
        if (err) {
          console.log('MQTT AUTH ERROR: Device ' + username +
                      ' internal error: ' + err);
          error.returnCode = 2;
          cb(error, null);
        } else {
          if (matchedDevice == null) {
            console.log('MQTT AUTH ERROR: Device ' + username +
                        ' not registred!');
            error.returnCode = 2;
            cb(error, null);
          } else {
            if (password == matchedDevice.mqtt_secret) {
              console.log('MQTT AUTH OK: id ' + username);
              cb(null, true);
            } else {
              if (process.env.FLM_BYPASS_MQTTS_PASSWD ||
                  matchedDevice.mqtt_secret_bypass) {
                console.log('MQTT AUTH WARNING: Device ' + username +
                            ' wrong password! Bypass allowed...');
                matchedDevice.mqtt_secret_bypass = false;
                matchedDevice.mqtt_secret = password;
                matchedDevice.save();
                cb(null, true);
              } else {
                console.log('MQTT AUTH ERROR: Device ' + username +
                            ' wrong password!');
                // Send notification
                Notification.findOne({
                  'message_code': 1,
                  'target': matchedDevice._id},
                function(err, matchedNotif) {
                  if (!err && (!matchedNotif || matchedNotif.allow_duplicate)) {
                    let notification = new Notification({
                      'message': 'Este firmware Flashbox teve ' +
                                 'seu identificador de segurança alterado',
                      'message_code': 1,
                      'severity': 'alert',
                      'type': 'communication',
                      'action_title': 'Permitir comunicação',
                      'action_url': '/devicelist/command/' +
                                    matchedDevice._id + '/rstmqtt',
                      'allow_duplicate': false,
                      'target': matchedDevice._id,
                    });
                    notification.save(function(err) {
                      if (!err) {
                        sio.anlixSendDeviceStatusNotification(matchedDevice._id,
                                                              notification);
                      }
                    });
                  } else {
                    sio.anlixSendDeviceStatusNotification(matchedDevice._id,
                                                          matchedNotif);
                  }
                });
                error.returnCode = 4;
                cb(error, null);
              }
            }
          }
        }
      });
    }
  }
};

mqtts.anlixMessageRouterUpdate = function(id, hashSuffix) {
  mqtts.publish({
      cmd: 'publish',
      qos: 2,
      retain: true,
      topic: 'flashman/update/' + id,
      payload: (hashSuffix) ? '1' + hashSuffix : '1',
    });
  console.log('MQTT SEND Message UPDATE to ' + id);
};

mqtts.anlixMessageRouterReset = function(id) {
  mqtts.publish({
      cmd: 'publish',
      retain: true,
      topic: 'flashman/update/' + id,
      payload: null,
    });
  console.log('MQTT Clean Messages for router ' + id);
};

mqtts.anlixMessageRouterReboot = function(id) {
  mqtts.publish({
      cmd: 'publish',
      qos: 2,
      retain: false,
      topic: 'flashman/update/' + id,
      payload: 'boot',
    });
  console.log('MQTT SEND Message REBOOT to ' + id);
};

mqtts.anlixMessageRouterResetApp = function(id) {
  mqtts.publish({
      cmd: 'publish',
      qos: 2,
      retain: false,
      topic: 'flashman/update/' + id,
      payload: 'rstapp',
    });
  console.log('MQTT SEND Message RSTAPP to ' + id);
};

mqtts.anlixMessageRouterResetMqtt = function(id) {
  mqtts.publish({
      cmd: 'publish',
      qos: 2,
      retain: false,
      topic: 'flashman/update/' + id,
      payload: 'rstmqtt',
    });
  console.log('MQTT SEND Message RSTMQTT to ' + id);
};

mqtts.anlixMessageRouterLog = function(id) {
  mqtts.publish({
      cmd: 'publish',
      qos: 2,
      retain: false,
      topic: 'flashman/update/' + id,
      payload: 'log',
    });
  console.log('MQTT SEND Message LOG to ' + id);
};

mqtts.anlixMessageRouterOnlineLanDevs = function(id) {
  mqtts.publish({
      cmd: 'publish',
      qos: 2,
      retain: false,
      topic: 'flashman/update/' + id,
      payload: 'onlinedev',
    });
  console.log('MQTT SEND Message ONLINEDEVS to ' + id);
};

mqtts.anlixMessageRouterMeasure = function(id, psk) {
  mqtts.publish({
    cmd: 'publish',
    qos: 2,
    retain: true,
    topic: 'flashman/update/' + id,
    payload: (psk) ? 'measure '+psk : 'measure',
  });
  console.log('MQTT SEND Message MEASURE to '+id);
};

mqtts.anlixMessageRouterPingTest = function(id) {
  mqtts.publish({
      cmd: 'publish',
      qos: 2,
      retain: false,
      topic: 'flashman/update/' + id,
      payload: 'ping',
    });
  console.log('MQTT SEND Message PING to ' + id);
};

module.exports = mqtts;
