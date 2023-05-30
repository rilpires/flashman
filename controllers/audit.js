const FlashAudit = require('@anlix-io/flashaudit-node-client');
const Mongoose = require('mongoose');
const Validator = require('../public/javascripts/device_validator');
const ConfigModel = require('../models/config');
const {registerMetricGauge} = require('./handlers/metrics/custom_metrics');

// returns true if environment variable value can be recognized as true.
const isEnvTrue = (envVar) => /^(true|t|1)$/i.test(envVar);

// reads a string of addresses (with ports) separated by comma, validates them
// and returns an array with the valid addresses. Returns undefined if no valid
// addresses.
const validatesListOfAddresses = (env) => {
  if (!env) return;
  const addresses = env.split(',');
  const validated = [];
  for (let url of addresses) {
    const columnIndex = url.indexOf(':'); // port separator.
    if (columnIndex < 0) continue;
    const fqdn = url.slice(0, columnIndex);
    if (!Validator.validateFqdn(fqdn)) continue;
    let port = parseInt(url.slice(columnIndex+1));
    if (isNaN(port)) continue;
    if (port > 65536) continue;
    validated.push(url);
  }
  if (validated.length === 0) return;
  return validated;
};

let client = process.env.AIX_FLASHAUDIT_CLIENT || process.env.AIX_PROVIDER;
const product = 'flashman';
const serverBrokers =
  validatesListOfAddresses(process.env.FLASHAUDIT_SERVER_BROKERS) || [
  'redaudit01.anlix.io:8082',
  'redaudit02.anlix.io:8082',
  'redaudit03.anlix.io:8082',
];
const turnedOff = !isEnvTrue(process.env.FLASHAUDIT_ENABLED);

const controller = {}; // to be exported.

// reexporting function from module.
controller.buildAttributeChange = FlashAudit.audit.buildAttributeChange;

// Creating an audit message operation for a CPE.
controller.cpe = function(user, cpe, operation, values) {
  // building the values this device could be searched by so users can
  // find it in FlashAudit.
  const searchable = controller.appendCpeIds([], cpe);
  return buildAndSendMessage(user, 'cpe', searchable, operation, values);
};

// Creating an audit message operation for several CPEs. Argument 'cpes'
// can be an array with all identifications of all CPEs involved or an array of
// CPEs.
controller.cpes = function(user, cpes, operation, values) {
  let searchable = cpes;
  if (cpes[0].constructor !== String) {
    searchable = [];
    for (const cpe of cpes) controller.appendCpeIds(searchable, cpe);
  }
  return buildAndSendMessage(user, 'cpe', searchable, operation, values);
};

// Creating an audit message operation for a User.
controller.user = function(user, targetUser, operation, values) {
  const searchable = [targetUser._id.toString()];
  return buildAndSendMessage(user, 'user', searchable, operation, values);
};

// Creating an audit message operation for several Users. Argument 'users'
// should be an array with the stringifyed '_id's of all Users involved or an
// array of users.
controller.users = function(user, users, operation, values) {
  let searchable = users;
  if (users[0].constructor !== String) {
    searchable = users.map((u) => u._id.toString());
  }
  return buildAndSendMessage(user, 'user', searchable, operation, values);
};

// Creating an audit message operation for a Role.
controller.role = function(user, role, operation, values) {
  const searchable = [role.name];
  return buildAndSendMessage(user, 'role', searchable, operation, values);
};

// Creating an audit message operation for several Roles. Argument 'roles'
// should be an array with the names of all Roles involved or an array of roles.
controller.roles = function(user, roles, operation, values) {
  let searchable = roles;
  if (roles[0].constructor !== String) searchable = roles.map((r) => r.name);
  return buildAndSendMessage(user, 'role', searchable, operation, values);
};

// Creating an audit message operation for a VLAN profile.
controller.vlan = function(user, vlan, operation, values) {
  const searchable = [vlan.vlan_id.toString()];
  return buildAndSendMessage(user, 'vlan', searchable, operation, values);
};

// Creating an audit message operation for several VLANs. Argument 'vlans'
// should be an array with the stringifyed 'vlan_id' of all VLANs involved or an
// array of 'config.vlan_profiles' objects.
controller.vlans = function(user, vlans, operation, values) {
  let searchable = vlans;
  if (vlans[0].constructor !== String) searchable = vlans.map((r) => r.vlan_id);
  return buildAndSendMessage(user, 'vlan', searchable, operation, values);
};

// Creating a audit message that will end up in the audit server. Returns
// an Error object in case of invalid arguments.
const buildAndSendMessage = async function(
  user, object, searchable, operation, values,
) {
  if (turnedOff) return; // ignoring FlashAudit.
  if (!hasInitialized) return; // if 'init()' hasn't run, ignore FlashAudit.

  // empty users and hidden users should not create audits.
  if (!user || !user._id || user.is_hidden) return;

  // building audit message.
  // eslint-disable-next-line new-cap
  let [message, err] = new FlashAudit.audit.buildMessageForJS(
    client, product, user._id.toString(), object, searchable, operation, values,
  );
  if (err) {
    return console.error(
      `Error creating Audit message. `+
      `operation: ${operation}, object: ${object}, searchables: ${searchable}.`,
      err,
    );
  }
  if (message === undefined) return; // skipping send if message discarded.
  // console.log('FlashAudit message', JSON.stringify(message, null, '  '));

  // sending message.
  return sendFunc(message, waitPromisesForNetworking);
};

// append to given 'array' the 'cpe' identifications that users may search for.
controller.appendCpeIds = (array, cpe) => {
  if (cpe.use_tr069) {
    const tr069Id = cpe.alt_uid_tr069 || cpe.serial_tr069;
    if (!tr069Id) {
      console.log('Audit received a CPE that uses TR069 but does not have'+
                    ' tr069 identifications.');
    } else if (tr069Id !== cpe._id) {
      array.push(cpe._id, tr069Id);
      return array;
    }
  }
  array.push(cpe._id);
  return array;
};

// putting a string into FlashAudit i18n syntax for tag recursion.
controller.toTranslate = (s) => `$t("${s}")`;

module.exports = controller;

// returns a Promise that will resolve after an elapsed given milliseconds.
const someTime = (milliseconds) => new Promise(
  (resolve) => setTimeout(resolve, milliseconds),
);

// grows until 2030 seconds max (33 minutes and 50 seconds) but will have
// a random 10% added or removed.
controller.exponentialTime = (x, uniformRandom) => {
  const b = x > 0 ? 5 : 0; // when x == 0, we want to return 0 milliseconds.
  let t = (Math.min(x, 45)**2 + b); // stops growing at 45.
  t += uniformRandom()*t/5-(t/10); // adding a 10% random variation up or down.
  return t*1000; // returns time in milliseconds.
};

// random milliseconds from 150 until 250.
controller.shortTime = (uniformRandom) => 150+uniformRandom()*100;

// the timers to be injected in the code when waiting on consecutive attempts
// on trying to send data.
const waitPromisesForNetworking = {
  exponential: (x) => someTime(controller.exponentialTime(x, Math.random)),
  short: () => someTime(controller.shortTime(Math.random)),
};

// process instance.
const p = parseInt(process.env.NODE_APP_INSTANCE ||
                   process.env.FLM_DOCKER_INSTANCE) || 0;

// Reference to FlashAudit client instance that will send messages to server.
let flashAuditServer;
// temporary local store of unsent audit messages so we never lose any.
let localStore = []; // memory only.
let audits; // persisted.
let sendFunc; // reference for send function assigned at 'init()'.

// Temporary flag to indicate that init() has finished. Until we make Flashman
// start it's modules according the order of modules dependencies.
let hasInitialized = false;

// check initializes configs based on environment variables received an entry
controller.init = async function(
  secret, waitPromises=waitPromisesForNetworking, db,
) {
  if (turnedOff) return;

  if (!client) {
    const config = await ConfigModel.findOne(
      {is_default: true},
      {company: true},
    ).lean().catch((e) => e);
    // if config is instance of Error or there is no company set in config
    // default value will be used.
    client = config && config.company || 'test_client';
  }

  // starting FlashAudit client.
  flashAuditServer = new FlashAudit.FlashAudit({
    client,
    product,
    serverBrokers,
    sslEnabled: !isEnvTrue(process.env.KAFKA_SSL_DISABLED),
    auth: {username: client, password: secret},
    runtimeValidation: false,
  });

  registerMetricGauge({
    name: 'flm_audit_queue_size',
    help: 'Length of the list where not sent audit messages are queued',
    labels: ['type'],
    collect: async ()=>[
      {
        labels: {'type': 'db'},
        value: await audits.countDocuments(),
      },
      {
        labels: {'type': 'mem'},
        value: localStore.length,
      },
    ],
  });

  sendFunc = controller.sendWithPersistence;

  // ignore setup if audit messages should remain only in process memory.
  if (process.env.FLASHAUDIT_MEMORY_ONLY) {
    sendFunc = controller.sendWithoutPersistence;
    hasInitialized = true;
    return;
  }

  const setup = async () => {
    if (!db) db = Mongoose.connection.db;
    audits = db.collection('audits');

    const d = Date.now()-5*60*1000; // milliseconds at 5 minutes ago.
    await audits.updateMany(
      // audits stuck at sending state or audits that belong to this process
      // will have their send state set to false.
      {s: true, $or: [{'m.date': {$lte: d}}, {p}]}, {$set: {s: false}},
    ).catch((e) => console.error('Error resetting audits state at setup.', e));

    // if audits are cached in database, send all audits, if any.
    flushCachedAudits();
    setInterval(flushCachedAudits, 1000*60*5 );


    hasInitialized = true;
  };

  if (!db) {
    if (Mongoose.connection.readyState === 1) {
      return setup();
    } else {
      return new Promise((resolve) =>
        Mongoose.connection.on('connected', () => setup().then(resolve)));
    }
  } else {
    return setup();
  }
};

// flag marking if the last attempt to contact flashAudit was successful.
let isFlashAuditAvailable = true;

// reader function for 'isFlashAuditAvailable';
controller.getServerAvailability = () => isFlashAuditAvailable;

// sends message and returns true if successful. Else, return false.
const sendToFlashAudit = async function(message) {
  let err = await flashAuditServer.send(message).catch((e) => e);
  if (err instanceof Error) {
    console.error(`Error sending audit message: ${err.message}`);
    isFlashAuditAvailable = false;
  } else {
    isFlashAuditAvailable = true;
  }
  return isFlashAuditAvailable;
};

// keeps unsent audit messages in memory.
controller.sendWithoutPersistence = async function(message, waitPromises) {
  if (!isFlashAuditAvailable) return localStore.push(message);
  if (!(await sendToFlashAudit(message))) {
    localStore.push(message);
    controller.tryLaterWithoutPersistence(waitPromises);
  }
};

// keeps trying to send unsent audit messages that are in memory.
controller.tryLaterWithoutPersistence = async function(waitPromises, attempt) {
  await waitPromises.exponential(attempt);
  while (localStore.length > 0) {
    let message = localStore[0]; // getting message at head.
    if (!(await sendToFlashAudit(message))) { // sending.
      // if send is unsuccessful, will try again later.
      controller.tryLaterWithoutPersistence(waitPromises, attempt+1);
      return;
    }
    attempt = 0; // after a successful attempt, we reset attempts counter.
    localStore.shift(); // removing message from head;
    await waitPromises.short(); // will send next message in a short while.
  }
};

// persists unsent audit messages.
controller.sendWithPersistence = async function(message, waitPromises) {
  if (await sendToFlashAudit(message)) {
    isFlashAuditAvailable = true;
  } else {
    isFlashAuditAvailable = false;
    console.error('Error sending message to flashaudit, caching on DB');
    const cached = {s: false, d: new Date(), p, m: message};
    const insert = await audits.insertOne(cached).catch((e) => e);
    if (insert instanceof Error) {
      console.error('...but caching on DB has also failed, oops?');
    }
  }
};

// keeps trying to send unsent audit messages that are persisted.
let flushCachedAudits = async function() {
  try {
    let cached;
    while (cached = await audits.findOne({s: false})) {
      let sent = await sendToFlashAudit(cached.m);
      if (sent) {
        isFlashAuditAvailable = true;
        await audits.deleteOne({_id: cached._id});
        await waitPromisesForNetworking.short();
      } else {
        isFlashAuditAvailable = false;
        return;
      }
    }
  } catch (e) {
    console.error('Database error dealing with audits cache:', e);
    return;
  }
};
