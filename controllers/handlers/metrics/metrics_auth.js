const basicAuthEncoded = process.env.FLM_PROM_METRICS_BASIC_AUTH;

let metricsAuth = function(req, res, next) {
  if (!basicAuthEncoded
  || req.headers.authorization == `Basic ${basicAuthEncoded}`) {
    next();
  } else {
    res.sendStatus(401);
  }
};

module.exports = metricsAuth;
