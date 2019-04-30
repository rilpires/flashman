const socketio = require('socket.io');
const sharedsession = require('express-socket.io-session');

let sio = socketio();

const SIO_NOTIFICATION_LIVELOG = 'LIVELOG';
const SIO_NOTIFICATION_ONLINEDEVS = 'ONLINEDEVS';
const SIO_NOTIFICATION_DEVICE_STATUS = 'DEVICESTATUS';
const SIO_NOTIFICATION_PING_TEST = 'PINGTEST';

sio.anlixConnections = {};
sio.anlixNotifications = {};

sio.on('connection', function(socket) {
  console.log(socket.handshake.address + ' (' + socket.handshake.sessionID +
              ') connected on Notification Broker');
  // just save connections of authenticated users
  if (socket.handshake.session.passport) {
    // We keep only one connection for each session
    if (sio.anlixConnections[socket.handshake.sessionID]) {
      oldsock = sio.anlixConnections[socket.handshake.sessionID];
      oldsock.disconnect(true);
      if (sio.anlixNotifications[socket.handshake.sessionID]) {
        delete sio.anlixNotifications[socket.handshake.sessionID];
      }
      console.log(oldsock.handshake.address + ' (' +
                  oldsock.handshake.sessionID +
                  ') disconnect from Notification Broker: Overwrite');
    }
    sio.anlixConnections[socket.handshake.sessionID] = socket;
  } else {
    socket.disconnect(true);
    console.log(socket.handshake.address + ' (' + socket.handshake.sessionID +
                ') BLOCKED: not authenticated!');
  }

  socket.on('disconnect', function(reason) {
    if (sio.anlixConnections[socket.handshake.sessionID]) {
      delete sio.anlixConnections[socket.handshake.sessionID];
    }
    if (sio.anlixNotifications[socket.handshake.sessionID]) {
      delete sio.anlixNotifications[socket.handshake.sessionID];
    }
    console.log(socket.handshake.address + ' (' + socket.handshake.sessionID +
                ') disconnect from Notification Broker: '+ reason);
  });
});

const registerNotification = function(sessionId, type, macaddr=null) {
  let notification = {};
  notification.type = type;
  notification.timer = Date.now();
  if (macaddr) {
    notification.macaddr = macaddr;
  }
  if (!sio.anlixNotifications[sessionId]) {
    sio.anlixNotifications[sessionId] = [];
  }
  if (!sio.anlixNotifications[sessionId].find((notif) => {
    const sameType = notif.type == notification.type;
    let sameMac = true;
    if (sameType && macaddr) {
      sameMac = notif.macaddr == macaddr;
    }
    return sameType && sameMac;
  })) {
    sio.anlixNotifications[sessionId].push(notification);
  }
};

const emitNotification = function(type, macaddr, data, removeMeKey=null) {
  let found = false;
  // Get who is waiting for this notification
  for (let sessionId in sio.anlixNotifications) {
    if (sio.anlixNotifications.hasOwnProperty(sessionId)) {
      let notifications = sio.anlixNotifications[sessionId];
      for (let nIdx = 0; nIdx < notifications.length; nIdx++) {
        let notification = notifications[nIdx];
        if (notification.type == type) {
          if (removeMeKey) {
            if (notification.macaddr == removeMeKey) {
              console.log('SIO: Send ' + type +' of ' + macaddr +
                          ' information for ' + sessionId);
              sio.anlixConnections[sessionId].emit(type, macaddr, data);
              found = true;
              // Remove from notifications array
              notifications.splice(nIdx, 1);
              break;
            }
          } else {
            console.log('SIO: Send ' + type +' of ' + macaddr +
                        ' information for ' + sessionId);
            sio.anlixConnections[sessionId].emit(type, macaddr, data);
            found = true;
            break;
          }
        }
      }
      if (found) {
        break;
      }
    }
  }
  return found;
};

sio.anlixSendDeviceStatusNotification = function(mac, data) {
  if (!mac) {
    console.log(
      'ERROR: SIO: ' +
      'Try to send status notification to an invalid mac address!'
    );
    return false;
  }
  let found = emitNotification(SIO_NOTIFICATION_DEVICE_STATUS, mac, data);
  if (!found) {
    console.log('SIO: NO Session found for ' + mac + '! Discarding message...');
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
    console.log('ERROR: SIO: ' +
                'Try to add livelog notification with an invalid session!');
    return false;
  }
  if (!macaddr) {
    console.log('ERROR: SIO: ' +
                'Try to add livelog notification with an invalid mac address!');
    return false;
  }

  registerNotification(session, SIO_NOTIFICATION_LIVELOG, macaddr);
  return true;
};

sio.anlixSendLiveLogNotifications = function(macaddr, logdata) {
  if (!macaddr) {
    console.log('ERROR: SIO: ' +
                'Try to send livelog notification to an invalid mac address!');
    return false;
  }
  let found = emitNotification(SIO_NOTIFICATION_LIVELOG,
                               macaddr, logdata, macaddr);
  if (!found) {
    console.log('SIO: NO Session found for ' +
                macaddr + '! Discarding message...');
  }
  return found;
};

sio.anlixWaitForOnlineDevNotification = function(session, macaddr) {
  if (!session) {
    console.log('ERROR: SIO: ' +
                'Try to add onlinedev notification with an invalid session!');
    return false;
  }
  if (!macaddr) {
    console.log('ERROR: SIO: Try to add onlinedev ' +
                'notification with an invalid mac address!');
    return false;
  }

  registerNotification(session, SIO_NOTIFICATION_ONLINEDEVS, macaddr);
  return true;
};

sio.anlixSendOnlineDevNotifications = function(macaddr, devsData) {
  if (!macaddr) {
    console.log(
      'ERROR: SIO: ' +
      'Try to send onlinedev notification to an invalid mac address!'
    );
    return false;
  }

  let found = emitNotification(SIO_NOTIFICATION_ONLINEDEVS,
                               macaddr, devsData, macaddr);
  if (!found) {
    console.log('SIO: NO Session found for ' +
                macaddr + '! Discarding message...');
  }
  return found;
};

sio.anlixWaitDeviceStatusNotification = function(session) {
  if (!session) {
    console.log('ERROR: SIO: Try to add device status ' +
                'notification with an invalid session!');
    return false;
  }
  registerNotification(session, SIO_NOTIFICATION_DEVICE_STATUS);
  // Debug
  // console.log('SIO: Notification added to DEVICESTATUS of for ' + session);
  return true;
};

sio.anlixWaitForPingTestNotification = function(session, macaddr) {
  if (!session) {
    console.log('ERROR: SIO: ' +
                'Try to add ping notification with an invalid session!');
    return false;
  }
  if (!macaddr) {
    console.log('ERROR: SIO: Try to add ping ' +
                'notification with an invalid mac address!');
    return false;
  }

  registerNotification(session, SIO_NOTIFICATION_PING_TEST, macaddr);
  return true;
};

sio.anlixSendPingTestNotifications = function(macaddr, pingdata) {
  if (!macaddr) {
    console.log('ERROR: SIO: ' +
                'Try to send ping test results notification ' +
                'to an invalid mac address!');
    return false;
  }
  let found = emitNotification(SIO_NOTIFICATION_PING_TEST,
                               macaddr, pingdata, macaddr);
  if (!found) {
    console.log('SIO: NO Session found for ' +
                macaddr + '! Discarding message...');
  }
  return found;
};

module.exports = sio;
