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
