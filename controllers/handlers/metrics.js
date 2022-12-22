const promClient = require('prom-client');

/**
 *  Check about metric types on Prometheus documentation
 *  https://prometheus.io/docs/concepts/metric_types/
*/

let metrics = {
  dummy_counter: new promClient.Counter({
    name: 'dummy_counter',
    help: 'This shouldnt be here',
    labelNames: ['location'],
  }),
};

module.exports = metrics;
