const socketio = require('socket.io');
const sharedsession = require('express-socket.io-session');
const mqtt = require('./mqtts');

let sio = socketio();

const SIO_NOTIFICATION_LIVELOG = 'LIVELOG';
const SIO_NOTIFICATION_ONLINEDEVS = 'ONLINEDEVS';
const SIO_NOTIFICATION_DEVICE_STATUS = 'DEVICESTATUS';

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
  sio.anlixNotifications[sessionId].push(notification);
};

const emitNotification = function(type, macaddr,
                                  data, removeMeKey=null) {
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

sio.anlixBindSession = function(session) {
  sio.use(sharedsession(session, {
    autoSave: true,
  }));
};

sio.removeOldNotification = function(timer) {
  sio.anlixNotifications = sio.anlixNotifications.filter((item) => {
    if (item.timer >= timer) {
      console.log('SIO WARNING: Remove notification for ' +
                  item.session + ': Timeout');
    }
    return item.timer >= timer;
  });
};

sio.anlixWaitForLiveLogNotification = function(session, macaddr, timeout) {
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
  if (!timeout || timeout == 0) {
    timeout = 5000;
  } // 5s default

  registerNotification(session, SIO_NOTIFICATION_LIVELOG, macaddr);

  // set a timer to remove the notification if it takes too long
  // set a 100ms error (to only remove AFTER timeout)
  const timelimit = Date.now() + timeout;
  setTimeout(function() {
    sio.removeOldNotification(timelimit);
  }, timeout + 100);
  console.log('SIO: Notification added to LIVELOG of ' +
              macaddr + ' for ' + session);

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

sio.anlixWaitForOnlineDevNotification = function(session, macaddr, timeout) {
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
  if (!timeout || timeout == 0) {
    timeout = 5000;
  } // 5s default

  registerNotification(session, SIO_NOTIFICATION_ONLINEDEVS, macaddr);

  // set a timer to remove the notification if it takes too long
  // set a 100ms error (to only remove AFTER timeout)
  const timelimit = Date.now() + timeout;
  setTimeout(function() {
    sio.removeOldNotification(timelimit);
  }, timeout + 100);
  console.log('SIO: Notification added to ONLINEDEVS of ' +
              macaddr + ' for ' + session);

  return true;
};

sio.anlixSendOnlineDevNotifications = function(matchedDevice, devsData) {
  if (!matchedDevice) {
    console.log(
      'ERROR: SIO: ' +
      'Try to send onlinedev notification to an invalid mac address!'
    );
    return false;
  }
  // Enrich information about connected devices
  for (let connDeviceMac in devsData.Devices) {
    if (devsData.Devices.hasOwnProperty(connDeviceMac)) {
      let upConnDevMac = connDeviceMac.toLowerCase();
      let lanDevice = matchedDevice.lan_devices.filter(function(lanDev) {
        return lanDev.mac.toLowerCase() == upConnDevMac;
      });
      if (lanDevice[0] && ('name' in lanDevice[0]) && lanDevice[0].name != '') {
        devsData.Devices[connDeviceMac].hostname = lanDevice[0].name;
      } else if (lanDevice[0] && ('dhcp_name' in lanDevice[0]) &&
                 lanDevice[0].dhcp_name != '') {
        devsData.Devices[connDeviceMac].hostname = lanDevice[0].dhcp_name;
      }
    }
  }
  let found = emitNotification(SIO_NOTIFICATION_ONLINEDEVS,
                               matchedDevice._id, devsData, matchedDevice._id);
  if (!found) {
    console.log('SIO: NO Session found for ' +
                matchedDevice._id + '! Discarding message...');
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
  console.log('SIO: Notification added to DEVICESTATUS of for ' + session);
  return true;
};

sio.anlixSendDeviceStatusNotification = function(mac) {
  if (!mac) {
    console.log(
      'ERROR: SIO: ' +
      'Try to send status notification to an invalid mac address!'
    );
    return false;
  }
  let status = 'red-text';
  if (mqtt.clients[mac.toUpperCase()]) {
    status = 'green-text';
  }
  let found = emitNotification(SIO_NOTIFICATION_DEVICE_STATUS, mac, status);
  if (!found) {
    console.log('SIO: NO Session found for ' + mac + '! Discarding message...');
  }
  return found;
};

module.exports = sio;
