'use strict';
const Server = require('core-server').Server;

const securityServiceFactory = (callback) => {
    let server = null;
    server = new Server("SecurityService", null, {types:[]}, {});

    server.init().then(() => {
        server.loadHttpRoutes();
        server.listen().then(() => {
            console.log('Up and running..');
            server.query();
            callback(null, server);
        }).catch((err) => {
            console.log(err);
            callback(err, null);
        });
    }).catch((err) => {
        console.log(err);
        callback(err, null);
    });
}

module.exports.securityServiceFactory = securityServiceFactory;