
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

let Schema = mongoose.Schema;

let firmwareSchema = new Schema({
  vendor: {type: String, required: true},
  // productClass == model
  model: {type: String, required: true},
  // hardware version of a cpe
  version: {type: String, required: true},
  release: {type: String, required: true},
  wan_proto: {type: String, default: ''},
  flashbox_version: {type: String, default: ''},
  filename: {type: String, required: true},
  is_beta: {type: Boolean, default: false},
  is_restricted: {type: Boolean, default: false},
  cpe_type: {
    type: String,
    enum: ['flashbox', 'tr069'],
    default: 'flashbox',
  },
});

firmwareSchema.plugin(mongoosePaginate);

firmwareSchema.statics.findByReleaseCombinedModel = function(
  release,
  combinedModel,
) {
  if (typeof release === 'undefined' || typeof combinedModel === 'undefined') {
    return [];
  }
  return this.aggregate([
    {$match: {release: release}},
    {$addFields: {modelver: {$concat: ['$model', '$version']}}},
    {$match: {modelver: combinedModel}},
  ]);
};

let Firmware = mongoose.model('Firmware', firmwareSchema);

module.exports = Firmware;
