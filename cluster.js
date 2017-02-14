'use strict';
const config = require('config');
const Cluster = require('core-server').Cluster;

const optimist = require('optimist');

/**
 * Start Cluster
 * --numWorkers       How many child processes do we manager?  Default matches the number of cpu cores available.
 * --discoveryHost    Where do I Announce myself?  Where is my Discovery Service
 */
const main = () => {
  console.log("Starting Cluster");
  let options = {};
  if(optimist.argv.numWorkers) {
    options.numWorkers = optimist.argv.numWorkers;
  }

  if(optimist.argv.discoveryHost) {
    options.discoveryHost = optimist.argv.discoveryHost;
  }

  let announcement = require('./announcement.json');
  let cluster = new Cluster(announcement.name, announcement, options);
  //let exitHandler = proxy.exitHandlerFactory(cluster.id, model);
  //cluster.bindExitHandler(exitHandler);

  cluster.start();
}


if(require.main === module) {
  main();
}
