
const Redis = require("ioredis");
const DeviceModel = require('./models/device');

const REDISHOST = (process.env.FLM_REDIS_HOST || 'localhost');
const REDISPORT = (process.env.FLM_REDIS_PORT || 6379);

const redis = new Redis({port: REDISPORT, host: REDISHOST});

/* A CPE made contact
   Update the contact list

   Return 1 on change offline to online
   Return 0 on CPE already online
*/
exports.contactedCPE = async function(device) {
  if(!device)
    return -1;
  const now = Date.now();
  const r = await redis.zadd("last_contact", now, device._id);
  if(device.cpe_status.status != 1) {
    // The CPE became online
    // Store the information in the database
    console.log(`MOVE DEVICE ${device._id} to online`);
    device.cpe_status.status = 1;
    device.cpe_status.last_status_change = now;
  }

  return r;
}

// Run cleanup every 30 seconds
// Random interval to desync node instances
const desync = Math.floor(Math.random() * 30000);
setTimeout(() => {
  setInterval(async () => {
    console.log("Running Cleanup!");

   // Get TR-069 configs from database
    let matchedConfig = await Config.findOne(
      {is_default: true}, 'tr069',
    ).lean().exec().catch((err) => err);
    if (matchedConfig.constructor === Error) {
      console.log('Error getting user config in database to ping offline CPEs');
      return;
    }
    // Compute offline threshold from options
    let currentTime = Date.now();
    let interval = matchedConfig.tr069.inform_interval;
    let threshold = matchedConfig.tr069.offline_threshold;
    let offlineThreshold = new Date(currentTime - (interval*threshold));

    let c = await redis.zcount("last_contact", 0, offlineThreshold)
    while (c > 0) {
      // We have CPEs that have not contacted in time
      // Remove
      let cpe = await redis.zpopmin("last_contact");
      if(!cpe)
        break;
      if(parseInt(cpe[1]) > (offlineThreshold)) {
        // sanity check... we poped a cpe that reported in time!
        // Return the cpe to the list and end the cleanup
        await redis.zadd("last_contact", parseInt(cpe[1]), cpe[0]);
        break;
      }

      let device = await DeviceModel.findById(cpe[0], 'cpe_status');
      if(device) {
        console.log(`MOVE DEVICE ${cpe[0]} to offline`);
        // move device to offline
        device.cpe_status.status = 0;
        device.cpe_status.last_status_change = currentTime;
        await device.save().catch((err) => {
          console.log('Error saving cpe_status to offline');
        });
      }

      // Refresh, as another instance can clean it up
      c = await redis.zcount("last_contact", 0, offlineThreshold)
    }
  }, 30000);
}, desync);

