let secret = undefined;
module.exports.setSecret = (newValue) => secret = newValue;
module.exports.getSecret = () => secret;

let appVersion = undefined;
module.exports.setAppVersion = (newValue) => appVersion = newValue;
module.exports.getAppVersion = () => appVersion;
