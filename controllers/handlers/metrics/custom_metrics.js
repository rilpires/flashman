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
};

// Exported wrappers for usage out there
let metricsApi = {
  newDiagnosticState: function(type, state) {
    metrics.flm_diagnostics_states
      .inc({'diagnostic_type': type, 'diagnostic_state': state});
  },

  // This function should be called once for each new metric to be registered,
  // passing a callback to be executed every sample
  registerMetricGauge: function(params) {
    let error = undefined;
    if (typeof(params)!='object') {
      error = '"registerMetricGauge" params should be an object';
    } else if (!params.collect || (typeof(params.collect) != 'function')) {
      error = 'params of "registerMetricGauge" doesnt have a "collect" func';
    } else if (typeof(params.name)!='string') {
      error = 'params of "registerMetricGauge" should have a name string field';
    } else if (typeof(params.help)!='string') {
      error = 'params of "registerMetricGauge" should have a help string field';
    } else if (params.labels && !Array.isArray(params.labels)) {
      error = 'params.labels from "registerMetricGauge" should be an array';
    }
    if (error) {
      console.error(`Error registering gauge metric: ${error}`);
      console.error(`params: ${params}`);
      return;
    }
    if (!params.name.startsWith('flm_')) {
      params.name = `flm_${params.name}`;
    }
    params.labels = params.labels || [];
    new promClient.Gauge({
      name: params.name,
      help:
        params.help || 'Someone was lazy enough to not provide any help here',
      labelNames: params.labels,
      collect: async function() {
        try {
          let collectResponse = params.collect();
          let isPromise = (
            typeof(collectResponse)=='object'
            && typeof(collectResponse.then)=='function'
          );
          if (isPromise) collectResponse = await collectResponse;
          let collectResponses;
          if (Array.isArray(collectResponse)) {
            collectResponses = collectResponse;
          } else {
            collectResponses = [collectResponse];
          }
          for (let metric of collectResponses) {
            if (typeof(metric)=='number') {
              this.set(metric);
            } else if (typeof(metric)=='object'
              && typeof(metric.value)=='number'
            ) {
              if (typeof(metric.labels)=='object') {
                this.set(metric.labels, metric.value);
              } else {
                this.set(metric.value);
              }
            } else {
              console.error(
                `Invalid "collect" return value from metric "${params.name}":`);
              console.error(metric);
            }
          }
        } catch (err) {
          console.error(
            `Error calling callback on metric "${params.name}": ${err}`);
        }
      },
    });
  },
};

module.exports = metricsApi;
