const Notification = require('../models/notification');
const sio = require('../sio');
let notificationController = {};

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
  Notification.findByIdAndDelete(req.body.id, function(err) {
    if (err) {
      return res.status(500).json({success: false,
                                   message: 'Entrada não pode ser removida'});
    }
    return res.status(200).json({success: true});
  });
};

module.exports = notificationController;
