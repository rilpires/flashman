const promClient = require('prom-client');

/**
 *  Check about metric types on Prometheus documentation
 *  https://prometheus.io/docs/concepts/metric_types/
*/

/**
 *
 * This is our custom metrics. Please, prefix them all with 'flm'
 * Also, be very aware of changing existent metrics
 * Be careful when creating labels that may have many values, since
 * it will create many entries on metrics list and probably blow up RAM
 *
*/

let metrics = {
  // Diagnostics
  flm_diagnostics_states: new promClient.Gauge({
    name: 'flm_diagnostics_states',
    help: 'Diagnostics finished & calculated',
    labelNames: ['diagnostic_type', 'diagnostic_state'],
  }),
  flm_diagnostics_started: new promClient.Gauge({
    name: 'flm_diagnostics_started',
    help: 'Diagnostics started by any means',
    labelNames: ['diagnostic_type'],
  }),
};

module.exports = metrics;
