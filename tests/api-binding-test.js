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
      assert(service.api !== null, "Binding didn't fail");
      assert(service.api.health !== null, "Health Endpoints Exist");

      assert(service.api.oauth !== null, "Oauth Endpoints Exist");
      assert(service.api.token !== null, "Token Endpoints Exist");
      done();
    }).catch((err) => {
      assert(err === undefined, "Error didn't occur");
      done();
    });

  }).timeout(2000);

  after(() => {

  });
});
