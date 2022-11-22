
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
    const now = Date.now();
    let c = await redis.zcount("last_contact", 0, now - 90000)
    while (c > 0) {
      // We have CPEs that have not contacted in time
      // Remove
      let cpe = await redis.zpopmin("last_contact");
      if(!cpe)
        break;
      if(parseInt(cpe[1]) > (now - 90000)) {
        // sanity check... we poped a cpe that reported in time!
        // Return the cpe to the list and end the cleanup
        await redis.zadd("last_contact", parseInt(cpe[1]), cpe[0]);
        break;
      }

      let device = await DeviceModel.findOne({_id: cpe[0]});
      if(device) {
        console.log(`MOVE DEVICE ${cpe[0]} to offline`);
        // move device to offline
        device.cpe_status.status = 0;
        device.cpe_status.last_status_change = now;
        await device.save().catch((err) => {
          console.log('Error saving cpe_status to offline');
        });
      }

      // Refresh, as another instance can clean it up
      c = await redis.zcount("last_contact", 0, now - 90000)
    }
  }, 30000);
}, desync);

