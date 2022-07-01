/* eslint-disable no-prototype-builtins */
/* global __line */

const t = require('./language').i18next.t;
const ConfigModel = require('../models/config');
const DevicesAPI = require('./external-genieacs/devices-api');

const factoryCredentialsController = {};

// TODO: Usar esse objeto para compor os dropdowns na tela de adição de preset
factoryCredentialsController.TR069Models = DevicesAPI.getTR069Models();

factoryCredentialsController.getVendorList = function() {
  return Array.from(factoryCredentialsController.TR069Models.keys());
};

factoryCredentialsController.getModelListByVendor = function(vendor) {
  return factoryCredentialsController.TR069Models[vendor];
};


factoryCredentialsController.getCredentialsAtConfig = async function() {
  // TODO: editar esse firmwaresFindError para um
  // genericFactoryCredentialsFindError
  let message = t('firmwaresFindError', {errorline: __line});
  const config = await ConfigModel.findOne(
    {is_default: true}, {tr069: true},
  ).lean().catch(function(err) {
    // TODO: editar esse firmwaresFindError para um
    // factoryCredentialsFindExceptionError
    message = t('firmwaresFindError', {errorline: __line});
  });
  // Get onu credentials inside config, if present
  if (config && config.tr069) {
    if (config.tr069.onu_factory_credentials &&
        config.tr069.onu_factory_credentials.timestamp &&
        config.tr069.onu_factory_credentials.credentials) {
      return {
        success: true, credentials: config.tr069.onu_factory_credentials,
      };
    }
  }
  return {success: false, message: message};
};

// Routes functions
// Get credentials data
factoryCredentialsController.getCredentialsData = async function(req, res) {
  const getCredentials =
    await factoryCredentialsController.getCredentialsAtConfig();
  if (getCredentials.success) {
    return res.json(getCredentials);
  } else {
    return res.json({
      success: false, type: 'danger', message: getCredentials.message,
    });
  }
};

// Set credentials data
factoryCredentialsController.setCredentialsData = async function(req, res) {
  if (!req.body.credentials) {
    return res.json({
      success: false, type: 'danger',
      // TODO: editar esse firmwaresFindError para um
      // factoryCredentialsSetError
      message: t('firmwaresFindError', {errorline: __line}),
    });
  }
  let credentials = req.body.credentials;
  credentials.forEach((cpe) => {
    if (!cpe.vendor ||
        !(cpe.vendor in factoryCredentialsController.TR069Models)) {
      return res.json({
        success: false, type: 'danger',
        // TODO: editar esse firmwaresFindError para um
        // factoryCredentialsInvalidVendor
        message: t('firmwaresFindError', {errorline: __line}),
      });
    }
    let vendor = factoryCredentialsController.TR069Models[cpe.vendor];
    if (!cpe.model || !vendor.includes(cpe.model)) {
      return res.json({
        success: false, type: 'danger',
        // TODO: editar esse firmwaresFindError para um
        // factoryCredentialsInvalidModel
        message: t('firmwaresFindError', {errorline: __line}),
      });
    }
    if (!cpe.username || cpe.username.length == 0) {
      return res.json({
        success: false, type: 'danger',
        // TODO: editar esse firmwaresFindError para um
        // factoryCredentialsInvalidUsername
        message: t('firmwaresFindError', {errorline: __line}),
      });
    }
    if (!cpe.password || cpe.password.length == 0) {
      return res.json({
        success: false, type: 'danger',
        // TODO: editar esse firmwaresFindError para um
        // factoryCredentialsInvalidPassword
        message: t('firmwaresFindError', {errorline: __line}),
      });
    }
  });
  // TODO: editar esse firmwaresFindError para um
  // genericFactoryCredentialsSetError
  let message = t('firmwaresFindError', {errorline: __line});
  const config = await ConfigModel.findOne(
    {is_default: true}, {tr069: true},
  ).catch(function(err) {
    // TODO: editar esse firmwaresFindError para um
    // factoryCredentialsSetExceptionError
    message = t('firmwaresFindError', {errorline: __line});
  });
  // Get onu credentials inside config, if present
  if (config && config.tr069) {
    // TODO: remove this
    config.tr069.onu_factory_credentials = {
      timestamp: new Date(),
      credentials: credentials,
    };
    config.save().then(function() {
      return res.json({success: true, type: 'success',
                       message: t('operationSuccessful')});
    }).catch(function(rej) {
      return res.json({success: false, type: 'danger',
        message: t('configSaveError', {errorline: __line})});
    });
  }
  return {success: false, message: message};
};

module.exports = factoryCredentialsController;
