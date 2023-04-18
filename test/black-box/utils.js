// sleeps for a given 't' milliseconds.
const sleep = (t) => new Promise((resolve) => setTimeout(resolve, t));
exports.sleep = sleep;

// Executes given 'repeatFunc'. If it returns a falsy value, sleeps for
// 'sleeptime' milliseconds and re-executes 'repeatFunc'. 'repeatFunc' will be
// repeated until 'maxTimeout' has passed, which will make 'pulling()' return
// false. If 'repeatFunc' returns a truthy value, 'pulling()' returns true
// immediately;
const pulling = async function(repeatFunc, sleeptime, maxTimeout) {
  const start = new Date();
  let ready = false;
  while ( !(ready = !!(await repeatFunc())) ) {
    if (new Date() - start >= maxTimeout - sleeptime) break;
    sleep(sleeptime);
  }
  return ready;
};
exports.pulling = pulling;
