'use strict';
const ApiBinding = require('discovery-proxy').ApiBinding;
const assert = require('assert');

/**
 * Discovery model
 * Find service
 */
describe('security-api-binding', () => {
  let Server = require('core-server').Server;
  let server = null;
  before((done) => {
    server = new Server("SecurityService", null, null, {});

    server.init().then(() => {
      server.loadHttpRoutes();
      server.listen().then(() => {
        console.log('Up and running..');
        done();
      }).catch((err) => {
        console.log(err);
        done();
      });
    }).catch((err) => {
      console.log(err);
      done();
    });

  });

  it('api created when binding occurs', (done) => {

    let service = {
      endpoint: 'http://localhost:12616',
      schemaRoute: '/swagger.json'
    };
    console.log("Creating Binding");
    let apiBinding = new ApiBinding(service);

    apiBinding.bind().then((service) => {
      console.log(`Checking Api...`);
      if(service.api === undefined) {
        done(new Error("Api is null"));
      } else if(service.api.health === undefined) {
        done(new Error("Health Api is null"));
      } else if(service.api.oauth === undefined) {
        done(new Error("Oauth Api is null"));
      } else if(service.api.token === undefined) {
        done(new Error("Token api is null"));
      } else {
        done();
      }
    }).catch((err) => {
      assert(err === undefined, "Error didn't occur");
      done();
    });

  }).timeout(2000);

  after(() => {

  });
});
