/* eslint-disable no-undef */
Object.defineProperty(global, '__stack', {
  get: function() {
    let orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack) {
      return stack;
    };
    let err = new Error;
    // eslint-disable-next-line no-caller
    Error.captureStackTrace(err, arguments.callee);
    let stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  },
});

Object.defineProperty(global, '__line', {
  get: function() {
    return __stack[1].getLineNumber();
  },
});

Object.defineProperty(global, '__function', {
get: function() {
    return __stack[1].getFunctionName();
  },
});

Object.defineProperty(global, '__function_and_line', {
get: function() {
    return [__stack[1].getFunctionName(), __stack[1].getLineNumber()];
  },
});

// Returns the resolved value and the error value at the same time.
// Assign them like this variables in the current scope:
// let [value, error] = await go(PROMISE);
global.go = function(p) {
  // if p is not a Promise, we make it a promise that resolves to itself.
  if (!(p instanceof Promise)) p = Promise.resolve(p);
  // if there's no error, error will be undefined.
  // if there's any error, value will be undefined.
  return p.then((x) => [x, undefined], (e) => [undefined, e]);
};
