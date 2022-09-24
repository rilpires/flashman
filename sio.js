/* eslint-disable no-prototype-builtins */
const {Server} = require('socket.io');
const {createClient} = require('redis');
const {createAdapter} = require('@socket.io/redis-adapter');
const sharedsession = require('express-socket.io-session');
const debug = require('debug')('SIO');

const sio = new Server();

const REDISHOST = (process.env.FLM_REDIS_HOST || 'localhost');
const REDISPORT = (process.env.FLM_REDIS_PORT || 6379);

// Redis use for comm between multiple processes
if (process.env.FLM_USE_MQTT_PERSISTENCE) {
  sio.pubClient = createClient({socket: {host: REDISHOST, port: REDISPORT}});
  sio.subClient = sio.pubClient.duplicate();
  sio.pubClient.on('error', (err) => {
    console.log('Error on SIO publish client: ' + err.message);
  });
  sio.subClient.on('error', (err) => {
    console.log('Error on SIO subscribe client: ' + err.message);
  });

  sio.adapter(createAdapter(sio.pubClient, sio.subClient));
}

const SIO_NOTIFICATION_LIVELOG = 'LIVELOG';
const SIO_NOTIFICATION_ONLINEDEVS = 'ONLINEDEVS';
const SIO_NOTIFICATION_DEVICE_STATUS = 'DEVICESTATUS';
const SIO_NOTIFICATION_PING_TEST = 'PINGTEST';
const SIO_NOTIFICATION_UP_STATUS = 'UPSTATUS';
const SIO_NOTIFICATION_STATISTICS = 'STATISTICS';
const SIO_NOTIFICATION_WAN_INFO = 'WANINFO';
const SIO_NOTIFICATION_LAN_INFO = 'LANINFO';
const SIO_NOTIFICATION_TRACEROUTE = 'TRACEROUTE';
const SIO_NOTIFICATION_SPEED_TEST = 'SPEEDTEST';
const SIO_NOTIFICATION_SPEED_ESTIMATIVE = 'SPEEDESTIMATIVE';
const SIO_NOTIFICATION_PON_SIGNAL = 'PONSIGNAL';
const SIO_NOTIFICATION_SITESURVEY = 'SITESURVEY';

sio.anlixConnections = {};

sio.on('connection', function(socket) {
  debug(socket.handshake.address + ' (' + socket.handshake.sessionID +
              ') connected on Notification Broker');
  // just save connections of authenticated users
  if (socket.handshake.session.passport) {
    sio.anlixConnections[socket.handshake.sessionID] = socket;
  } else {
    socket.disconnect(true);
    debug(socket.handshake.address + ' (' + socket.handshake.sessionID +
                ') BLOCKED: not authenticated!');
  }

  socket.on('disconnect', function(reason) {
    if (sio.anlixConnections[socket.handshake.sessionID]) {
      delete sio.anlixConnections[socket.handshake.sessionID];
    }
    debug(socket.handshake.address + ' (' + socket.handshake.sessionID +
          ') disconnect from Notification Broker: '+ reason);
  });
});

const registerNotification = function(sessionId, type, macaddr=null) {
  if (sio.anlixConnections[sessionId]) {
    sio.anlixConnections[sessionId].join(type);
  }
};

const emitNotification = function(type, macaddr, data, removeMeKey=null) {
  debug('SIO: Send ' + type +' of ' + macaddr);
  sio.to(type).emit(type, macaddr, data);
  return true;
};

sio.anlixSendDeviceStatusNotification = function(mac, data) {
  if (!mac) {
    debug(
      'ERROR: SIO: ' +
      'Try to send status notification to an invalid mac address!');
    return false;
  }
  let found = emitNotification(SIO_NOTIFICATION_DEVICE_STATUS, mac, data);
  if (!found) {
    debug('SIO: NO Session found for ' + mac + '! Discarding message...');
  }
  return found;
};

sio.anlixBindSession = function(session) {
  sio.use(sharedsession(session, {
    autoSave: true,
  }));
};

sio.anlixWaitForLiveLogNotification = function(session, macaddr) {
  if (!session) {
    debug('ERROR: SIO: ' +
                'Try to add livelog notification with an invalid session!');
    return false;
  }
  if (!macaddr) {
    debug('ERROR: SIO: ' +
                'Try to add livelog notification with an invalid mac address!');
    return false;
  }

  registerNotification(session, SIO_NOTIFICATION_LIVELOG, macaddr);
  return true;
};

sio.anlixSendLiveLogNotifications = function(macaddr, logdata) {
  if (!macaddr) {
    debug('ERROR: SIO: ' +
                'Try to send livelog notification to an invalid mac address!');
    return false;
  }
  let found = emitNotification(SIO_NOTIFICATION_LIVELOG,
                               macaddr, logdata, macaddr);
  if (!found) {
    debug('SIO: NO Session found for ' +
                macaddr + '! Discarding message...');
  }
  return found;
};

sio.anlixWaitForOnlineDevNotification = function(session, macaddr) {
  if (!session) {
    debug('ERROR: SIO: ' +
                'Try to add onlinedev notification with an invalid session!');
    return false;
  }
  if (!macaddr) {
    debug('ERROR: SIO: Try to add onlinedev ' +
                'notification with an invalid mac address!');
    return false;
  }

  registerNotification(session, SIO_NOTIFICATION_ONLINEDEVS, macaddr);
  return true;
};

sio.anlixSendOnlineDevNotifications = function(macaddr, devsData) {
  if (!macaddr) {
    debug(
      'ERROR: SIO: ' +
      'Try to send onlinedev notification to an invalid mac address!');
    return false;
  }

  let found = emitNotification(SIO_NOTIFICATION_ONLINEDEVS,
                               macaddr, devsData, macaddr);
  if (!found) {
    debug('SIO: NO Session found for ' +
                macaddr + '! Discarding message...');
  }
  return found;
};

sio.anlixWaitForSiteSurveyNotification = function(session, macaddr) {
  if (!session) {
    debug('ERROR: SIO: ' +
                'Try to add sitesurvey notification with an invalid session!');
    return false;
  }
  if (!macaddr) {
    debug('ERROR: SIO: Try to add sitesurvey ' +
                'notification with an invalid mac address!');
    return false;
  }

  registerNotification(session, SIO_NOTIFICATION_SITESURVEY, macaddr);
  return true;
};

sio.anlixSendSiteSurveyNotifications = function(macaddr, devsData) {
  if (!macaddr) {
    debug(
      'ERROR: SIO: ' +
      'Try to send sitesurvey notification to an invalid mac address!');
    return false;
  }

  let found = emitNotification(SIO_NOTIFICATION_SITESURVEY,
                               macaddr, devsData, macaddr);
  if (!found) {
    debug('SIO: NO Session found for ' +
                macaddr + '! Discarding message...');
  }
  return found;
};

sio.anlixWaitDeviceStatusNotification = function(session) {
  if (!session) {
    debug('ERROR: SIO: Try to add device status ' +
                'notification with an invalid session!');
    return false;
  }
  registerNotification(session, SIO_NOTIFICATION_DEVICE_STATUS);
  // Debug
  // debug('SIO: Notification added to DEVICESTATUS of for ' + session);
  return true;
};

sio.anlixWaitForPingTestNotification = function(session, macaddr) {
  if (!session) {
    debug('ERROR: SIO: ' +
                'Try to add ping notification with an invalid session!');
    return false;
  }
  if (!macaddr) {
    debug('ERROR: SIO: Try to add ping ' +
                'notification with an invalid mac address!');
    return false;
  }

  registerNotification(session, SIO_NOTIFICATION_PING_TEST, macaddr);
  return true;
};

sio.anlixSendPingTestNotifications = function(macaddr, pingdata) {
  if (!macaddr) {
    debug('ERROR: SIO: ' +
                'Try to send ping test results notification ' +
                'to an invalid mac address!');
    return false;
  }
  let found = emitNotification(SIO_NOTIFICATION_PING_TEST,
                               macaddr, pingdata, macaddr);
  if (!found) {
    debug('SIO: NO Session found for ' +
                macaddr + '! Discarding message...');
  }
  return found;
};

sio.anlixWaitForUpStatusNotification = function(session, macaddr) {
  if (!session) {
    return false;
  }
  if (!macaddr) {
    return false;
  }
  registerNotification(session, SIO_NOTIFICATION_UP_STATUS, macaddr);
  return true;
};

sio.anlixSendUpStatusNotification = function(macaddr, upStatusData) {
  if (!macaddr) {
    return false;
  }
  let found = emitNotification(SIO_NOTIFICATION_UP_STATUS,
                               macaddr, upStatusData, macaddr);
  return found;
};

sio.anlixWaitForStatisticsNotification = function(session, macaddr) {
  if (!session) {
    return false;
  }
  if (!macaddr) {
    return false;
  }
  registerNotification(session, SIO_NOTIFICATION_STATISTICS, macaddr);
  return true;
};

sio.anlixSendStatisticsNotification = function(macaddr, upStatusData) {
  if (!macaddr) {
    return false;
  }
  let found = emitNotification(SIO_NOTIFICATION_STATISTICS,
                               macaddr, upStatusData, macaddr);
  return found;
};


// WAN Information
sio.anlixWaitForWanInfoNotification = function(session, macaddr) {
  if (!session) {
    return false;
  }

  if (!macaddr) {
    return false;
  }

  registerNotification(session, SIO_NOTIFICATION_WAN_INFO, macaddr);

  return true;
};

sio.anlixSendWanInfoNotification = function(macaddr, wanInfoData) {
  if (!macaddr) {
    return false;
  }

  let found = emitNotification(SIO_NOTIFICATION_WAN_INFO,
                               macaddr, wanInfoData, macaddr);

  return found;
};


// LAN Information
sio.anlixWaitForLanInfoNotification = function(session, macaddr) {
  if (!session) {
    return false;
  }

  if (!macaddr) {
    return false;
  }

  registerNotification(session, SIO_NOTIFICATION_LAN_INFO, macaddr);

  return true;
};

sio.anlixSendLanInfoNotification = function(macaddr, lanInfoData) {
  if (!macaddr) {
    return false;
  }

  let found = emitNotification(SIO_NOTIFICATION_LAN_INFO,
                               macaddr, lanInfoData, macaddr);

  return found;
};


// Traceroute
sio.anlixWaitForTracerouteNotification = function(session, macaddr) {
  if (!session) {
    return false;
  }

  if (!macaddr) {
    return false;
  }

  registerNotification(session, SIO_NOTIFICATION_TRACEROUTE, macaddr);

  return true;
};

sio.anlixSendTracerouteNotification = function(macaddr, tracerouteData) {
  if (!macaddr) {
    return false;
  }

  let found = emitNotification(SIO_NOTIFICATION_TRACEROUTE,
                               macaddr, tracerouteData, macaddr);

  return found;
};


sio.anlixWaitForPonSignalNotification = function(session, macaddr) {
  if (!session) {
    debug('ERROR: SIO: ' +
                'Try to add ponsignal notification with an invalid session!');
    return false;
  }
  if (!macaddr) {
    debug('ERROR: SIO: Try to add ponsignal ' +
                'notification with an invalid mac address!');
    return false;
  }
  registerNotification(session, SIO_NOTIFICATION_PON_SIGNAL, macaddr);
  return true;
};

sio.anlixSendPonSignalNotification = function(macaddr, ponSignalMeasure) {
  if (!macaddr) {
    return false;
  }
  let found = emitNotification(SIO_NOTIFICATION_PON_SIGNAL,
                               macaddr, ponSignalMeasure, macaddr);
  if (!found) {
    debug('SIO: NO Session found for ' +
                macaddr + '! Discarding message...');
  }
  return found;
};

sio.anlixWaitForSpeedTestNotification = function(session, macaddr) {
  if (!session) {
    debug('ERROR: SIO: ' +
                'Try to add speedtest notification with an invalid session!');
    return false;
  }
  if (!macaddr) {
    debug('ERROR: SIO: Try to add speedtest ' +
                'notification with an invalid mac address!');
    return false;
  }

  registerNotification(session, SIO_NOTIFICATION_SPEED_TEST, macaddr);
  registerNotification(session, SIO_NOTIFICATION_SPEED_ESTIMATIVE, macaddr);
  return true;
};

sio.anlixSendSpeedTestNotifications = function(macaddr, testdata) {
  if (!macaddr) {
    debug('ERROR: SIO: ' +
                'Try to send speedtest results notification ' +
                'to an invalid mac address!');
    return false;
  }
  let found;
  if (testdata.stage && testdata.stage == 'estimative_finished') {
    found = emitNotification(SIO_NOTIFICATION_SPEED_ESTIMATIVE,
                               macaddr, testdata, macaddr);
  } else {
    found = emitNotification(SIO_NOTIFICATION_SPEED_TEST,
                               macaddr, testdata, macaddr);
  }
  if (!found) {
    debug('SIO: NO Session found for ' +
                macaddr + '! Discarding message...');
  } else {
    console.log('Speedtest results for device ' +
    macaddr + ' received successfully.');
  }
  return found;
};

module.exports = sio;
