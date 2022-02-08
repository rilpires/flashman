const Notification = require('../models/notification');
const sio = require('../sio');
let TasksAPI = require('./external-genieacs/tasks-api');

let notificationController = {};

notificationController.fetchNotifications = function(req, res) {
  Notification.find({'target': {$in: req.body.targets}},
    function(err, notifications) {
      if (err) {
        console.log('Error retrieving notifications: ' + err);
        return res.status(500).json({success: false, type: 'danger',
                                     message: 'Erro ao buscar notificações'});
      }
      return res.status(200).json({success: true, type: 'success',
                                   notifications: notifications});
    },
  );
};

notificationController.registerStatusNotification = function(req, res) {
  if (sio.anlixWaitDeviceStatusNotification(req.sessionID)) {
    return res.status(200).json({success: true});
  } else {
    return res.status(500).json({
      success: false,
      type: 'danger',
      message: 'Erro no registro de notificação de status',
    });
  }
};

notificationController.delNotification = function(req, res) {
  Notification.findByIdAndRemove(req.body.id, {select: 'genieDeviceId'},
   function(err, notification) {
    if (err) {
      return res.status(500).json({success: false,
                                   message: 'Entrada não pode ser removida'});
    }
    if (notification.genieDeviceId !== undefined) {
      TasksAPI.deleteCacheAndFaultsForDevice(notification.genieDeviceId);
    }
    return res.status(200).json({success: true});
  });
};

// sets a notification's 'seen' attribute to 'true'.
notificationController.SeeNotification = async function(req, res) {
  // sets 'seen' attribute to 'true'.
  let op = await Notification.updateOne({_id: req.body.id}, {seen: true})
    .catch((err) => err); // in case of error, return the error.
  if (op.constructor === Error) { // if the update returned a error.
    return res.status(500).json({success: false, message: 'Não foi possível '+
      'marcar notificação como vista para aparelho '+req.body.id});
  }
  return res.status(200).json({success: true});
};

module.exports = notificationController;
