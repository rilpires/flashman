
let deviceHandlers = {};

deviceHandlers.isOnline = function(dateLastSeen) {
  let isOnline = false;
  let offlineThresh = 3; // seconds

  let lastSeen = ((dateLastSeen) ?
                  Date.parse(dateLastSeen) : new Date(1970, 1, 1));
  let justNow = Date.now();
  let devTimeDiff = Math.abs(justNow - lastSeen);
  let devTimeDiffSeconds = Math.floor(devTimeDiff / 1000);

  if (devTimeDiffSeconds <= offlineThresh) {
    isOnline = true;
  } else {
    isOnline = false;
  }
  return isOnline;
};

deviceHandlers.isTooOld = function(dateLastSeen) {
  let isOld = false;
  let lastSeen = ((dateLastSeen) ?
                  Date.parse(dateLastSeen) : new Date(1970, 1, 1));
  let justNow = Date.now();
  let devTimeDiff = Math.abs(justNow - lastSeen);
  let devTimeDiffSeconds = Math.floor(devTimeDiff / 1000);

  // 24 hours
  if (devTimeDiffSeconds >= 86400) {
    isOld = true;
  }
  return isOld;
};

module.exports = deviceHandlers;
