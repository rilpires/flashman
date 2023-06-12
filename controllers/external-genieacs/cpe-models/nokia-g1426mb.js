const basicCPEModel = require('./nokia-g1426ma');

let nokiaModel = Object.assign({}, basicCPEModel);

nokiaModel.identifier = {vendor: 'Nokia', model: 'G-1426-MB'};

module.exports = nokiaModel;
