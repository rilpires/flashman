
const aedes = require('aedes');
const sio = require('./sio');
const DeviceModel = require('./models/device');
const Notification = require('./models/notification');
const Config = require('./models/config');
const debug = require('debug')('MQTT');

let mqtts = null;
if (('FLM_USE_MQTT_PERSISTENCE' in process.env) &&
    (process.env.FLM_USE_MQTT_PERSISTENCE === true ||
     process.env.FLM_USE_MQTT_PERSISTENCE === 'true')
) {
  const mq = require('mqemitter-redis')();
  const persistence = require('aedes-persistence-redis')({
    // Do not store messages to deliver when device is offline
    maxSessionDelivery: 0,
  });
  mqtts = aedes({mq: mq, persistance: persistence, queueLimit: 2,
                 concurrency: 500});
  // Fix broker id in case of instance restart
  mqtts.id = process.env.name + process.env.NODE_APP_INSTANCE;
} else {
  debug('Instance ID is: ' + process.env.NODE_APP_INSTANCE);
  mqtts = aedes({queueLimit: 2});
}

// This object will contain clients ids
// from all flashman mqtt brokers
mqtts.unifiedClientsMap = {};

const findServerId = function(id) {
  let correctServerId = null;
  for (let serverId in mqtts.unifiedClientsMap) {
    if (Object.prototype.hasOwnProperty.call(mqtts.unifiedClientsMap,
                                             serverId)) {
      let clientsMap = mqtts.unifiedClientsMap[serverId];
      if (Object.prototype.hasOwnProperty.call(clientsMap, id)) {
        correctServerId = serverId;
        break;
      }
    }
  }
  return correctServerId;
};

const toPublishPacket = function(serverId, packet) {
  mqtts.publish({
    cmd: 'publish',
    qos: 2,
    retain: false,
    topic: '$SYS/' + serverId + '/publish',
    payload: Buffer.from(JSON.stringify(packet)),
  });
  debug('MQTT server id ' + serverId + ' publishing packet');
  debug('Packet to publish is ' + JSON.stringify(packet));
};

mqtts.subscribe('$SYS/+/add/client', function(packet, done) {
  const serverId = packet.topic.split('/')[1];
  const clientId = packet.payload.toString();
  if (serverId !== mqtts.id) {
    sio.anlixSendDeviceStatusNotification(clientId, 'online');
  }
  done();
});

mqtts.subscribe('$SYS/+/drop/client', function(packet, done) {
  const serverId = packet.topic.split('/')[1];
  const clientId = packet.payload.toString();
  if (serverId !== mqtts.id) {
    sio.anlixSendDeviceStatusNotification(clientId, 'recovery');
  }
  done();
});

mqtts.subscribe('$SYS/+/current/clients', function(packet, done) {
  const serverId = packet.topic.split('/')[1];
  const rawMqttClients = JSON.parse(packet.payload.toString());
  if (serverId !== mqtts.id) {
    mqtts.unifiedClientsMap[serverId] = rawMqttClients;
  }
  done();
});

mqtts.subscribe('$SYS/' + mqtts.id + '/publish', function(packet, done) {
  const packetToSend = JSON.parse(packet.payload.toString());
  mqtts.publish({
    cmd: 'publish',
    qos: packetToSend.qos,
    retain: packetToSend.retain,
    topic: 'flashman/update/' + packetToSend.id,
    payload: packetToSend.payload,
  });
  debug('Packet published: ' + packetToSend);
  done();
});

mqtts.on('client', function(client, err) {
  debug('Router connected on MQTT: ' + client.id);
  sio.anlixSendDeviceStatusNotification(client.id, 'online');
  // Notify other Flashman MQTT broker instances
  const rawMqttClients = Object.keys(mqtts.clients).reduce(
    (accumulator, current) => {
      accumulator[current] = true;
      return accumulator;
    }, {});
  // Update unified map
  mqtts.unifiedClientsMap[mqtts.id] = rawMqttClients;
  mqtts.publish({
    cmd: 'publish',
    qos: 2,
    retain: true,
    topic: '$SYS/' + mqtts.id + '/current/clients',
    payload: Buffer.from(JSON.stringify(rawMqttClients)),
  });
  mqtts.publish({
    cmd: 'publish',
    qos: 2,
    retain: false,
    topic: '$SYS/' + mqtts.id + '/add/client',
    payload: Buffer.from(client.id, 'utf8'),
  });
});

mqtts.on('clientDisconnect', function(client, err) {
  debug('Router disconnected on MQTT: ' + client.id);
  sio.anlixSendDeviceStatusNotification(client.id, 'recovery');

  // Notify other Flashman MQTT broker instances
  const rawMqttClients = Object.keys(mqtts.clients).reduce(
    (accumulator, current) => {
      accumulator[current] = true;
      return accumulator;
    }, {});
  // Update unified map
  mqtts.unifiedClientsMap[mqtts.id] = rawMqttClients;
  mqtts.publish({
    cmd: 'publish',
    qos: 2,
    retain: true,
    topic: '$SYS/' + mqtts.id + '/current/clients',
    payload: Buffer.from(JSON.stringify(rawMqttClients)),
  });
  mqtts.publish({
    cmd: 'publish',
    qos: 2,
    retain: false,
    topic: '$SYS/' + mqtts.id + '/drop/client',
    payload: Buffer.from(client.id, 'utf8'),
  });
});

mqtts.on('ack', function(packet, client, err) {
// packet is always undefined... maybe a bug?
  if (client.id) {
    debug('MQTT Message Delivered successfully for ' + client.id);
  }
});


mqtts.getConnectedClients = function() {
  return Object.values(mqtts.unifiedClientsMap)
    .reduce((acc, clients) => acc.concat(Object.keys(clients)), []);
};

mqtts.authenticate = function(client, username, password, cb) {
  let needauth = true;
  if (process.env.FLM_TEMPORARY_MQTT_BROKER_PORT) {
    // Temporary disabled auth for old routers
    if (client.id) {
      if (client.id.startsWith('mosqsub')) {
        debug('MQTT AUTH on INSECURE SERVER: Device ' + client.id);
        cb(null, true);
        needauth = false;
      }
    }
  }

  if (needauth) {
    let error = new Error('Auth error');
    if (!username) {
      debug('MQTT AUTH ERROR - Username not specified: Device ' +
                  client.id);
      error.returnCode = 2;
      cb(error, null);
    } else {
      DeviceModel.findById(username, async function(err, matchedDevice) {
        if (err) {
          debug('MQTT AUTH ERROR: Device ' + username +
                      ' internal error: ' + err);
          error.returnCode = 2;
          cb(error, null);
        } else {
          if (matchedDevice == null) {
            debug('MQTT AUTH ERROR: Device ' + username +
                        ' not registred!');
            error.returnCode = 2;
            cb(error, null);
          } else {
            if (password == matchedDevice.mqtt_secret) {
              debug('MQTT AUTH OK: id ' + username);
              cb(null, true);
            } else {
              let config = await Config.findOne(
                {is_default: true}, {mqtt_secret_bypass: true},
              ).lean().catch(
                (err) => {
                  debug('MQTT AUTH ERROR: Config not found!');
                },
              );
              if (process.env.FLM_BYPASS_MQTTS_PASSWD ||
                  matchedDevice.mqtt_secret_bypass ||
                  (config && config.mqtt_secret_bypass)) {
                debug('MQTT AUTH WARNING: Device ' + username +
                            ' wrong password! Bypass allowed...');
                matchedDevice.mqtt_secret_bypass = false;
                matchedDevice.mqtt_secret = password;
                await matchedDevice.save().catch((err) => {
                  console.log('Error saving MQTT data to matched device: ' +
                              err);
                });
                cb(null, true);
              } else {
                debug('MQTT AUTH ERROR: Device ' + username +
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

// TODO: Refactor functions bellow.
// All those functions have the same code.
// Use this common publish function to avoiding repeating code.
mqtts.commonPublishPacket = function(id, qos, retain, payload) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: qos,
      retain: retain,
      payload: payload,
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message ' + payload + ' to ' + id);
  }

  return serverId === null;
};


mqtts.anlixMessageRouterUpdate = function(id, hashSuffix) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: true,
      payload: (hashSuffix) ? '1' + hashSuffix : '1',
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message UPDATE to ' + id);
  }
};

mqtts.anlixMessageRouterReset = function(id) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: true,
      payload: null,
    };
    toPublishPacket(serverId, packet);
    debug('MQTT Clean Messages for router ' + id);
  }
};

mqtts.anlixMessageRouterReboot = function(id) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: false,
      payload: 'boot',
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message REBOOT to ' + id);
  }
};

mqtts.anlixMessageRouterResetApp = function(id) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: false,
      payload: 'rstapp',
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message RSTAPP to ' + id);
  }
};

mqtts.anlixMessageRouterResetMqtt = function(id) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: false,
      payload: 'rstmqtt',
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message RSTMQTT to ' + id);
  }
};

mqtts.anlixMessageRouterLog = function(id) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: false,
      payload: 'log',
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message LOG to ' + id);
  }
};

mqtts.anlixMessageRouterOnlineLanDevs = function(id) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: false,
      payload: 'onlinedev',
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message ONLINEDEVS to ' + id);
  }
};


// WAN Information
mqtts.anlixMessageRouterWanInfo = function(id) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: false,
      payload: 'waninfo',
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message WANINFO to ' + id);
  }
};


// LAN Information
mqtts.anlixMessageRouterLanInfo = function(id) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: false,
      payload: 'laninfo',
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message LANINFO to ' + id);
  }
};


// Traceroute
mqtts.anlixMessageRouterTraceroute = function(
  id,
  route,
  maxHops,
  numberProbes,
  maxTime,
) {
  const payload = 'traceroute ' +
    route + ' ' +
    maxHops + ' ' +
    numberProbes + ' ' +
    maxTime;

  mqtts.commonPublishPacket(id, 2, false, payload);
};


mqtts.anlixMessageRouterSiteSurvey = function(id) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: false,
      payload: 'sitesurvey',
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message SITESURVEY to ' + id);
  }
};

mqtts.anlixMessageRouterDataCollecting = function(id, status) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: true,
      payload: 'datacollecting ' + status,
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message DATACOLLECTING to '+ id);
  }
};

mqtts.anlixMessageRouterDataCollectingLatency = function(id, status) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: true,
      payload: 'collectlatency ' + status,
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message COLLECTLATENCY to '+ id);
  }
};

mqtts.anlixMessageRouterPingTest = function(id) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: false,
      payload: 'ping',
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message PING to ' + id);
  }
};

mqtts.anlixMessageRouterUpStatus = function(id) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: false,
      payload: 'status',
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message STATUS to ' + id);
  }
};

mqtts.anlixMessageRouterWifiState = function(id, state, wirelessRadio) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: true,
      payload: 'wifistate ' + state + ' ' + wirelessRadio,
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message WIFISTATE to '+ id);
  }
};

mqtts.anlixMessageRouterSpeedTest = function(id, ip, username) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const name = username.replace(/ /g, '_');
    const packet = {
      id: id,
      qos: 2,
      retain: true,
      payload: 'speedtest ' + ip + ' ' + name + ' 3 15',
      // Fix parallel connections to 3 and timeout to 15 seconds
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message SPEEDTEST to ' + id);
  }
};


mqtts.anlixMessageRouterSpeedTestRaw = function(id, username) {
  const serverId = findServerId(id);
  if (serverId !== null) {
    const name = username.replace(/ /g, '_');
    const packet = {
      id: id,
      qos: 2,
      retain: true,
      payload: 'rawspeedtest ' + name + ' 3 15',
      // Fix parallel connections to 3 and timeout to 15 seconds
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message SPEEDTEST to ' + id);
  }
};

mqtts.anlixMessageRouterWpsButton = function(id, state) {
  let wpsState = '1';
  if (state) {
    wpsState = '0';
  } else {
    wpsState = '1';
  }
  const serverId = findServerId(id);
  if (serverId !== null) {
    const packet = {
      id: id,
      qos: 2,
      retain: true,
      payload: 'wps ' + wpsState,
    };
    toPublishPacket(serverId, packet);
    debug('MQTT SEND Message WPS to ' + id);
  }
};

module.exports = mqtts;
