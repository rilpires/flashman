const mongodb = require('mongodb');

// sleeps for a given 't' milliseconds.
const sleep = (t) => new Promise((resolve) => setTimeout(resolve, t));
exports.sleep = sleep;

// Executes given 'repeatFunc'. If it returns a falsy value, sleeps for
// 'sleeptime' milliseconds and re-executes 'repeatFunc'. 'repeatFunc' will be
// repeated until 'timeout' has passed, which will make 'pulling()' return
// false. If 'repeatFunc' returns a truthy value, 'pulling()' returns true
// immediately;
const pulling = async function(repeatFunc, sleeptime, timeout) {
  const start = new Date();
  let ready = false;
  while ( !(ready = !!(await repeatFunc())) ) {
    if (new Date() - start >= timeout - sleeptime) break;
    await sleep(sleeptime);
  }
  return ready;
};
exports.pulling = pulling;


let mongodbClient;
const startFlashmanDbConnection = async function() {
  const MONGOHOST = process.env.FLM_MONGODB_HOST || 'localhost';
  const MONGOPORT = process.env.FLM_MONGODB_PORT || 27017;
  const mongoURI = process.env.MONGODB_USE_HA === true || 
                   process.env.MONGODB_USE_HA === 'true' 
    // FLM_MONGODB_HA_LIST format 'mongodb,mongoha_mongodb2,mongoha_mongodb2'
    ? `mongodb://${process.env.FLM_MONGODB_HA_LIST}/?replicaSet=rs0`
    : `mongodb://${MONGOHOST}:${MONGOPORT}`;
  return mongodb.MongoClient.connect(mongoURI, {
    useUnifiedTopology: true,
    maxPoolSize: 100000,
  }).then((client) => {
    mongodbClient = client;
    return client.db(process.env.FLM_DATABASE_NAME || 'flashman-blackbox');
  }).catch((e) => {
    console.log('Error connecting to Flashman database in MongoDB', e);
    throw e;
  })
}
exports.startFlashmanDbConnection = startFlashmanDbConnection;

const closeFlashmanDbConnection = async function () {
  if (mongodbClient) return mongodbClient.close();
}
exports.closeFlashmanDbConnection = closeFlashmanDbConnection;