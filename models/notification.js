
const mongoose = require('mongoose');

let notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Ops! Insira o título da notificação.'],
  },
  created_at: {type: Date, default: new Date()},
  message: {
    type: String,
    required: [true, 'Ops! Insira a mensagem.'],
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'alert', 'danger'],
    required: [true, 'Ops! Insira a severidade da notificação.'],
  },
  type: {
    type: String,
    enum: ['communication', 'wan-network', 'lan-network'],
    required: [true, 'Ops! Insira o tipo desta notificação.'],
  },
  action_title: {
    type: String,
  },
  action_url: {
    type: String,
  },
});

let Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
module.exports.notificationSchema = notificationSchema;
