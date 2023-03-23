const promClient = require('prom-client');
const genie = require('../../external-genieacs/tasks-api');

/**
 *  Check about metric types on Prometheus documentation
 *  https://prometheus.io/docs/concepts/metric_types/
*/

/**
 *
 * This is our custom metrics. Please, prefix them all with 'flm'
 * Be careful when creating labels that may have many values, since
 * it will create many entries on metrics list and probably blow up RAM
 *
 * Some metrics will be updated elsewhere, i.e. when a diagnostic is triggered,
 * where we will just "inc()" the metric, don't care what previous value were.
 * Don't forget to create a proper wrap method to each one of those metrics.
 *
 * Some other metrics is not cool to be updated everytime, since it can be
 * difficult to keep track where it changes its value. In those metrics, we
 * provide a "on-point observation" callback, which will be called every 15~30s.
 * Tasks-api's watch list length is a good example: We add/remove/modify this
 * list in so many ways but we can just provide something like
 * "Object(...).keys().length" when prometheus collector asks for it.
 *
*/

let metrics = {
  // Diagnostics
  flm_diagnostics_states: new promClient.Gauge({
    name: 'flm_diagnostics_states',
    help: 'A diagnostic state was changed to "diagnostic_state".',
    labelNames: ['diagnostic_type', 'diagnostic_state'],
  }),
  flm_tasks_api: new promClient.Gauge({
    name: 'flm_tasks_api',
    help: 'Pushed tasks to tasks-api queue',
    labelNames: ['task_name'],
  }),
  flm_tasks_api_list_length: new promClient.Gauge({
    name: 'flm_tasks_api_list_length',
    help: 'Length of current task watch list',
    labelNames: [],
    collect: function() {
      this.set( genie.getTaskWatchListLength() );
    },
  }),
};

// Exported wrappers for usage out there
let metricsApi = {
  newDiagnosticState: function(type, state) {
    metrics.flm_diagnostics_states
      .inc({'diagnostic_type': type, 'diagnostic_state': state});
  },
  addedTask: function(taskName) {
    metrics.flm_tasks_api
      .inc({'task_name': taskName});
  },

  // Below functions register a metric with a provided collector function

  // This callback has no parameters
  registerAuditMemoryQueueSize: function(callback) {
    if (typeof(callback)=='function') {
      new promClient.Gauge({
        name: 'flm_audit_memory_queue_size',
        help: 'Length of the list where not sent audit messages are queued',
        collect: function() {
          let value = callback();
          if (typeof(value)=='number' && !isNaN(value)) {
            this.set(value);
          }
        },
      });
    }
  },
};

module.exports = metricsApi;
