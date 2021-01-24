
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

let Schema = mongoose.Schema;

let firmwareSchema = new Schema({
  vendor: {type: String, required: true},
  model: {type: String, required: true},
  version: {type: String, required: true},
  release: {type: String, required: true},
  wan_proto: {type: String, default: ''},
  flashbox_version: {type: String, default: ''},
  filename: {type: String, required: true},
  is_beta: {type: Boolean, default: false},
  is_restricted: {type: Boolean, default: false},
});

firmwareSchema.plugin(mongoosePaginate);

let Firmware = mongoose.model('Firmware', firmwareSchema);

module.exports = Firmware;
