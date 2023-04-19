const geanieacsSim = require('@anlix-io/genieacs-sim');

const formatXML = geanieacsSim.formatXML;

const createSimulator = (...args) => {
  let simulator = geanieacsSim.createSimulator(...args)
  .on('task', (task) => {
    if (errorReject) {
      // rejecting error if 'task' event has been emitted.
      errorReject();
      errorResolve = null;
      errorReject = null;
    }
    if (
      // if 'taskResolve' reference is assigned.
      taskResolve &&
      // if there's no specific task name to await for or the task name to
      // await for is the current task name.
      (taskName === undefined || taskName === task.localName)
    ) {
      taskResolve(task); // resolving promise.
      taskResolve = null; // clearing reference.
      taskName = undefined; // clearing name to await for.
    }
  }).on('diagnostic', (name) => {
    if (debug.diagnostic) console.log(`- PROCESSED task ${name}`);
    if (
      // if 'diagnosticResolve' reference is assigned.
      diagnosticResolve &&
      // if there's no specific diagnostic name to await for or the diagnostic
      // name to await for is the current diagnostic name.
      (diganosticName === name || diganosticName === undefined)
    ) {
      diagnosticResolve(name); // resolving promise.
      diagnosticResolve = null; // clearing reference.
      diganosticName = undefined; // clearing name to await for.
    }
  }).on('error', (e) => {
    if (debug.error) console.log(`- Simulator error`, e);
    // error can be either communication error or wrong task name.
    if (!errorResolve) return;
    errorResolve(e);
    // clearing both promises fulfillment callbacks.
    errorResolve = null;
    errorReject = null;
  }).on('response', (response) => {
    if (!errorReject) return;
    // rejecting error if 'response' event has been emitted.
    errorReject();
    errorResolve = null;
    errorReject = null;
  });

  let taskResolve;
  let taskName;
  // can be awaited. Example: let task = await simulator.nextTask();
  simulator.nextTask = (nameToWaitFor) => {
    // name of the task to trigger the 'taskResolve' callback.
    taskName = nameToWaitFor;
    // instancing a promise and assigning the resolve to 'taskResolve'.
    return new Promise((resolve) => taskResolve = resolve);
  };
  let diagnosticResolve;
  let diganosticName;
  // can be awaited. Example: let task = await simulator.nextDiagnostic();
  simulator.nextDiagnostic = (nameToWaitFor) => {
    // name of the diagnostic to trigger the 'diagnosticResolve' callback.
    diganosticName = nameToWaitFor;
    // instancing a promise and assigning the resolve to 'diagnosticResolve'.
    return new Promise((resolve) => diagnosticResolve = resolve);
  };
  let errorResolve;
  let errorReject;
  // 'catch' will return the response, 'then' will return the error.
  simulator.nextError = () => {
    // instancing a promise and assigning the resolve, to be called
    // when an error is emitted, and assigning the reject to be called
    // when no error is found until next "response" or "task" event.
    new Promise((resolve, reject) => {
      errorResolve = resolve;
      errorReject = reject;
    });
  };

  let debug = {
    beforeReady: false,
    error: false,
    xml: false,
    requested: false,
    response: false,
    sent: false,
    task: false,
    diagnostic: false,
  };
  simulator.debug = (options) => {
    // eslint-disable-next-line guard-for-in
    for (const k in options) debug[k] = options[k];

    const verboseDebug = () => {
      simulator.on('requested', (request) => {
        if (!debug.requested) return;
        console.log(`- CPE RECEIVED REQUEST BODY.`);
      }).on('sent', (request) => {
        if (!debug.sent) return;
        const xml = debug.xml ? '\n\''+formatXML(request.body)+'\'.' : '.';
        console.log(`- CPE SENT BODY${xml}`);
      }).on('response', (response) => {
        if (!debug.response) return;
        const xml = debug.xml ? '\n\''+formatXML(response.body)+'\'.' : '.';
        console.log(`- CPE RECEIVED RESPONSE BODY${xml}`);
      }).on('task', (task) => {
        if (!debug.task) return;
        const body = debug.xml ?
          `'${JSON.stringify(task, null, '  ')}'.` : task.localName;
        console.log(`- CPE PROCESSED task ${body}`);
      });
    };

    if (debug.beforeReady) {
      verboseDebug();
    } else {
      simulator.on('ready', verboseDebug);
    }

    return simulator;
  };

  return simulator;
};

exports.createSimulator = createSimulator;
exports.formatXML = geanieacsSim.formatXML;
exports.InvalidTaskNameError = geanieacsSim.InvalidTaskNameError;
