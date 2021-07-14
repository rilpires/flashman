# README #

Tool created to manage CPEs with Flashbox firmware or TR-069 compatible

## INSTRUCTIONS ##

### DEVELOPMENT SETUP ###

1. install mongodb 3.6+.
    * make sure to not change the default port 27017.
	* see https://docs.mongodb.com/manual/installation/
2. install nodejs 12.19.0+.
	* see https://nodejs.org/en/download/package-manager/

* install pm2 via npm `$ npm install pm2 -g`
* install dependencies: `$ npm install`
* generate frontend files `$ npm run dev`
* to start it: `$ pm2 start environment.config.js`
* to stop it: `$ pm2 stop environment.config.js`
* generate a startup script to start the app at boot: `pm2 startup`
* save startup configurations with `pm2 save`

### DOCKER SETUP ###

* please use this [repository](https://github.com/anlixhub/flashman) and follow its instructions
* in case you want just to build this docker image:
	* `sudo docker build -t anlixhub/flashman -f docker/Dockerfile .`

## COPYRIGHT ##

Copyright (C) 2017-2021 Anlix

## LICENSE ##

This is free software, licensed under the GNU General Public License v2.
The formal terms of the GPL can be found at http://www.fsf.org/licenses/
