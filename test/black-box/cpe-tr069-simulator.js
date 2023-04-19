const geanieacsSim = require('@anlix-io/genieacs-sim');

const createSimulator = (...args) => {
  let simulator = geanieacsSim.createSimulator(...args)
  .on('task', (task) => {
    if (!taskResolve) return;
    // if 'taskResolve' reference is assigned.
    taskResolve(task); // resolve promise.
    taskResolve = null; // clear reference.
  }).on('error', (e) => {
    // error can be either communication error or wrong task name.
    if (!errorResolve) return;
    errorResolve(e);
    // clearing both promises fulfillment functions.
    errorResolve = null;
    errorReject = null;
  }).on('response', (response) => {
    if (!errorReject) return;
    // rejecting error if 'response' event has been emitted.
    errorReject(response);
    errorResolve = null;
    errorReject = null;
  }).on('task', (task) => {
    if (!errorReject) return;
    // rejecting error if 'task' event has been emitted.
    errorReject(task);
    errorResolve = null;
    errorReject = null;
  });

  let taskResolve;
  // can be awaited. Example: let task = await simulator.nextTask();
  simulator.nextTask = () => new Promise((resolve) => taskResolve = resolve);

  let errorResolve;
  let errorReject;
  // catch will return the response, then will return the error.
  simulator.nextError = () => new Promise((resolve, reject) => {
    errorResolve = resolve;
    errorReject = reject;
  });

  return simulator;
};

const formatXML = (xml, tab = '\t', nl = '\n') => {
  if (xml.indexOf('<') < 0) return xml;
  let formatted = '';
  let indent = '';
  const nodes = xml.slice(1, -1).split(/>\s*</);
  if (nodes[0][0] === '?') formatted += '<' + nodes.shift() + '>' + nl;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node[0] === '/') indent = indent.slice(tab.length); // decrease indent
    formatted += indent + '<' + node + '>' + nl;
    if (
      node[0] !== '/' && node[node.length-1] !== '/' && node.indexOf('</') < 0
    ) {
      indent += tab; // increase indent
    }
  }
  return formatted;
};

exports.createSimulator = createSimulator;
exports.formatXML = formatXML;
exports.InvalidTaskNameError = geanieacsSim.InvalidTaskNameError;
