
let mqtt = require('mqtt');

let mac = 'AA:AA:AA:AA:AA:AA';
// let mqttsecret = 'dummymqttsecret';
let mqttsecret = 'dummymqttsecret_altered';

let client = mqtt.connect('mqtt://localhost', {
  'username': mac,
  'clientId': mac,
  'password': mqttsecret,
});

client.on('connect', function() {
  console.log('Client connected!');
  client.subscribe('flashman/update/' + mac, function(err) {
    console.log('Subscribed to flashman/update');
  });
});

client.on('error', function(err) {
  console.log('Error on client: ' + err);
});
