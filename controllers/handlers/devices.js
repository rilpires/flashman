
let deviceHandlers = {};

deviceHandlers.diffDateUntilNowInSeconds = function(pastDate) {
  let pastDateParsed = NaN;
  const dateObjType = Object.prototype.toString.call(pastDate);

  if (dateObjType === '[object Date]') {
    // Remove any timezone representation and convert to UTC
    pastDateParsed = pastDate.toISOString();
    pastDateParsed = Date.parse(pastDateParsed);
  } else if (dateObjType === '[object String]') {
    // Always UTC conversion
    pastDateParsed = Date.parse(pastDate);
  }
  // Assume old date if can't be parsed
  if (isNaN(pastDateParsed)) {
    pastDateParsed = new Date(1970, 1, 1);
  }
  let justNow = Date.now();
  let devTimeDiff = Math.abs(justNow - pastDateParsed);
  let devTimeDiffSeconds = Math.floor(devTimeDiff / 1000);

  return devTimeDiffSeconds;
};

deviceHandlers.isOnline = function(dateLastSeen) {
  let isOnline = false;
  let offlineThresh = 3; // seconds

  const diffInSeconds = deviceHandlers.diffDateUntilNowInSeconds(dateLastSeen);

  if (diffInSeconds <= offlineThresh) {
    isOnline = true;
  } else {
    isOnline = false;
  }
  return isOnline;
};

deviceHandlers.isTooOld = function(dateLastSeen) {
  let isOld = false;

  const diffInSeconds = deviceHandlers.diffDateUntilNowInSeconds(dateLastSeen);

  // 24 hours
  if (diffInSeconds >= 86400) {
    isOld = true;
  }
  return isOld;
};

module.exports = deviceHandlers;
