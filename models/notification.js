
const mongoose = require('mongoose');

let notificationSchema = new mongoose.Schema({
  created_at: {type: Date, default: new Date()},
  message: {
    type: String,
    required: [true, 'Ops! Insira a mensagem.'],
  },
  // Code makes each notification message unique
  message_code: {
    type: Number,
    enum: [1, // MQTT secret doesn't match
    ],
    required: true,
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'alert', 'danger'],
    required: [true, 'Ops! Insira a severidade da notificação.'],
  },
  // Type will help with roles permissions
  type: {
    type: String,
    enum: ['communication', 'wan-network', 'lan-network'],
    required: [true, 'Ops! Insira o tipo desta notificação.'],
  },
  // Notification can happen more than once
  allow_duplicate: {
    type: Boolean,
    required: true,
    default: true,
  },
  action_title: String,
  action_url: String,
  target: String,
});

let Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
module.exports.notificationSchema = notificationSchema;
