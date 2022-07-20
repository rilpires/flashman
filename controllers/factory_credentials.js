/* eslint-disable no-prototype-builtins */
/* global __line */

const t = require('./language').i18next.t;
const ConfigModel = require('../models/config');
const DevicesAPI = require('./external-genieacs/devices-api');

const factoryCredentialsController = {};

const allowedCustomFactoryModels = DevicesAPI.getTR069CustomFactoryModels();

factoryCredentialsController.getVendorList = function() {
  return Array.from(allowedCustomFactoryModels.keys());
};

factoryCredentialsController.getModelListByVendor = function(vendor) {
  return allowedCustomFactoryModels[vendor];
};


factoryCredentialsController.getCredentialsAtConfig = async function() {
  let message = t('factoryCredentialsGenericError', {errorline: __line});
  let config = {};
  try {
    config = await ConfigModel.findOne(
      {is_default: true}, {tr069: true},
    ).lean();
  } catch (err) {
    message = t('configFindError', {errorline: __line});
  }
  // Get onu credentials inside config, if present
  if (config && config.tr069) {
    if (config.tr069.onu_factory_credentials &&
        config.tr069.onu_factory_credentials.timestamp &&
        config.tr069.onu_factory_credentials.credentials) {
      return {
        success: true, credentials: config.tr069.onu_factory_credentials,
        vendors_info: allowedCustomFactoryModels,
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
    getCredentials.type = 'success';
    getCredentials.message = t('operationSuccessful');
    return res.status(200).json(getCredentials);
  } else {
    return res.status(200).json({
      success: false, type: 'error', message: getCredentials.message,
    });
  }
};

// Set credentials data
factoryCredentialsController.setCredentialsData = async function(req, res) {
  if (!req.body.credentials) {
    return res.status(200).json({
      success: false, type: 'error',
      message: t('factoryCredentialsNotFound', {errorline: __line}),
    });
  }
  let credentials = req.body.credentials;
  for (let i = 0; i < credentials.length; i++) {
    if (!credentials[i].vendor ||
        !(credentials[i].vendor in allowedCustomFactoryModels)) {
      return res.status(200).json({
        success: false, type: 'error',
        message: t('invalidManufacturer', {errorline: __line}),
      });
    }
    let vendor = allowedCustomFactoryModels[credentials[i].vendor];
    if (!credentials[i].model || !vendor.includes(credentials[i].model)) {
      return res.status(200).json({
        success: false, type: 'error',
        message: t('invalidModel', {errorline: __line}),
      });
    }
    if (!credentials[i].username || credentials[i].username.length == 0) {
      return res.status(200).json({
        success: false, type: 'error',
        message: t('emptyUserError', {errorline: __line}),
      });
    }
    if (!credentials[i].password || credentials[i].password.length == 0) {
      return res.status(200).json({
        success: false, type: 'error',
        message: t('emptyPasswordError', {errorline: __line}),
      });
    }
    let hasDuplicate = credentials.reduce((acc, cur, index) => {
      // "acc" is sended to the next iteration, so, if we have
      // a duplicated credentials config at the iteration i,
      // then "acc" will be true in the iteration i+1.
      // If "acc" is true at the beginning of the (i+1) loop,
      // we have a duplicated, so we must to exit the reduce
      // returning true.
      if (acc) return true;
      for (let i = index+1; i < credentials.length; i++) {
        if (credentials[i].model == cur.model) return true;
      }
      return false;
    }, false);
    // If the user has already defined a preset for the selected model,
    // then we must not allow the user to set a new preset for this model
    if (hasDuplicate) {
      return res.status(200).json({
        success: false, type: 'error',
        message: t('duplicatedCredentials', {
          errorline: __line, model: credentials[i].model,
        }),
      });
    }
  }
  let config = {};
  try {
    config = await ConfigModel.findOne(
      {is_default: true}, {tr069: true},
    );
  } catch (err) {
    return res.status(200).json({
      success: false, type: 'error',
      message: t('configFindError', {errorline: __line}),
    });
  }
  // Get onu credentials inside config, if present
  if (config && config.tr069) {
    config.tr069.onu_factory_credentials = {
      timestamp: new Date(),
      credentials: credentials,
    };
    try {
      await config.save();
    } catch (err) {
      return res.status(200).json({
        success: false, type: 'error',
        message: t('configSaveError', {errorline: __line}),
      });
    }
  }
  return res.status(200).json({
    success: true, type: 'success',
    message: t('operationSuccessful'),
  });
};

module.exports = factoryCredentialsController;
