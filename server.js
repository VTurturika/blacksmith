'use strict';

const restify = require('restify');
const server = restify.createServer();
const constants = require('./constants');

server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

Promise.resolve()
  .then(() => server.listen(constants.server.port, onServerStarted))
  .catch(err => onServerFailed(err));


function onServerStarted() {
  console.log(`${server.name} listening at ${server.url}`);
}

function onServerFailed(err) {
  console.log(err);
  process.exit(1);
}