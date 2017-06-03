'use strict';
const ApiBinding = require('discovery-proxy').ApiBinding;
const assert = require('assert');
const startTestService = require('discovery-test-tools').startTestService;
const jwt = require('jsonwebtoken');
const sha1 = require('sha1');
const model = require('security-model').model;
const sideLoadTenantDescriptor = require('discovery-test-tools').sideLoadServiceDescriptor;

const TENANT_PORT = 8718;

const SECRET = 'shhhhhh!';

const startSecurityService = () => {
    let p = new Promise((resolve, reject) => {
        startTestService('SecurityService', {}, (err, server) => {
            resolve(server);
          });
      });
    return p;
  };

describe('check-token', () => {
    /**
     * Setup all Test Fixtures
     * Security Url
     * Security Service Descriptor
     * Client Id
     * Client Secret
     * Auth Request
     */
    let securityUrl = 'mongodb://localhost:27017/cdspSecurity';
    let securityService = null;
    let clearSecurityDB = require('mocha-mongoose')(securityUrl, { noClear: true });

    let tenantDescriptor = {
        docsPath: 'http://cloudfront.mydocs.com/tenant',
        endpoint: `http://localhost:${TENANT_PORT}`,
        healthCheckRoute:  '/health',
        region:  'us-east-1',
        schemaRoute:  '/swagger.json',
        stage:  'dev',
        status:  'Online',
        timestamp: Date.now(),
        type:  'TenantService',
        version:  'v1',
      };

    let token;

    let clientId = '11111';
    let clientSecret = 'dfdfadffd';

    let authReq = {
        scope: ['all'],
        grant_type: 'grant',
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
      };

    before((done) => {
        // Need to shove access_token into db.
        token = jwt.sign(JSON.stringify(authReq), SECRET);
        let hash = sha1(token);
        model.saveAccessToken({
            access_token: token,
            hash: hash,
            tenantName: 'Fubu',
            scope: ['all'],
          }).then((access) => {
          return startSecurityService();
        }).then((server) => {
            securityService = server;
            setTimeout(() => {
                securityService.getApp().dependencies = { types: ['TenantService'] };
                console.log(securityService.getApp().dependencies);

                sideLoadTenantDescriptor(securityService, tenantDescriptor).then(() => {
                    console.log(securityService.getApp().dependencies);
                    console.log(securityService.getApp().proxy);
                    done();
                  }).catch((err) => {
                    done(err);
                  });
              }, 1500);
          }).catch((err) => {
            done(err);
          });
      });

    it('auth validity check succeeds', (done) => {
        let securityDescriptor = {
            endpoint: `http://localhost:${securityService.getApp().listeningPort}`,
            schemaRoute: '/swagger.json',
          };
        let apiBinding = new ApiBinding(securityDescriptor);

        apiBinding.bind().then((service) => {
            if (service) {
              service.api.tokens.check({
                  'access-token': token,
                }, (response) => {
                  console.log(response.obj);
                  if (response.status != 200) {
                    done(new Error(`Expected Response Status 200 - got ${response.status}`));
                  } else if (response.obj.valid !== true) {
                    done(new Error(`Expected Response token validity ${response.obj.valid} to be equal to  true`));
                  } else {
                    done();
                  }
                }, (err) => {
                  console.log(err);
                  done(err);
                });
            } else {
              done(new Error('Missing Security Service'));
            }

          });
      });

    it('auth validity check fails', (done) => {
        let securityDescriptor = {
            endpoint: `http://localhost:${securityService.getApp().listeningPort}`,
            schemaRoute: '/swagger.json',
          };
        let apiBinding = new ApiBinding(securityDescriptor);

        apiBinding.bind().then((service) => {
            if (service) {
              service.api.tokens.check({
                  'access-token': token.substring(0, 10),
                }, (response) => {
                  console.log(response.obj);
                  if (response.status != 200) {
                    done(new Error(`Expected Response Status 200 - got ${response.status}`));
                  } else if (response.obj.valid !== false) {
                    done(new Error(`Expected Response token validity ${response.obj.valid} to be equal to  false`));
                  } else {
                    done();
                  }
                }, (err) => {
                  console.log(err);
                  done(err);
                });
            } else {
              done(new Error('Missing Security Service'));
            }

          });
      });

    after((done) => {
        securityService.getHttp().close();

        clearSecurityDB((err) => {
            if (err) done(err);
            else
                done();
          });
      });
  });
