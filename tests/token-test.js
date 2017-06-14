'use strict';
const ApiBinding = require('discovery-proxy').ApiBinding;
const assert = require('assert');
const startTestService = require('discovery-test-tools').startTestService;
const jwt = require('jsonwebtoken');
const sha1 = require('sha1');
const model = require('security-model').model;
const sideLoadTenantDescriptor = require('discovery-test-tools').sideLoadServiceDescriptor;

const TENANT_PORT = 8719;

const startSecurityService = () => {
    let p = new Promise((resolve, reject) => {
        startTestService('SecurityService', {}, (err, server) => {
            resolve(server);
          });
      });
    return p;
  };

describe('token-test', () => {
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

    let hash;

    before((done) => {
        // Need to shove access_token into db.
        let token = jwt.sign('1111', 'shhhhhhh!');
        hash = sha1(token);
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

                sideLoadTenantDescriptor(securityService, tenantDescriptor).then(() => {
                    done();
                  }).catch((err) => {
                    done(err);
                  });
              }, 1500);
          }).catch((err) => {
            done(err);
          });
      });

    it('fetch token succeeds', (done) => {
        let securityDescriptor = {
            endpoint: `http://localhost:${securityService.getApp().listeningPort}`,
            schemaRoute: '/swagger.json',
          };
        let apiBinding = new ApiBinding(securityDescriptor);

        apiBinding.bind().then((service) => {
            if (service) {
              let tokenHashAccessCode = hash;
              service.api.tokens.token({
                  tokenHashAccessCode: tokenHashAccessCode,
                }, (response) => {
                  if (response.status != 200) {
                    done(new Error(`Expected Response Status 200 - got ${response.status}`));
                  } else if (response.obj.hash !== tokenHashAccessCode) {
                    done(new Error(`Expected Response token hash ${response.obj.hash} === ${tokenHashAccessCode}`));
                  } else {
                    done();
                  }
                }, (err) => {
                  done(err);
                });
            } else {
              done(new Error('Missing Security Service'));
            }

          });
      });

    it('auth token fails', (done) => {
        let hash = 'dfadadsfd';
        let securityDescriptor = {
            endpoint: `http://localhost:${securityService.getApp().listeningPort}`,
            schemaRoute: '/swagger.json',
          };
        let apiBinding = new ApiBinding(securityDescriptor);

        apiBinding.bind().then((service) => {
            if (service) {
              let tokenHashAccessCode = hash;

              service.api.tokens.token({
                  tokenHashAccessCode: tokenHashAccessCode,
                }, (response) => {
                  if (response.status === 200) {
                    done(new Error(`Expected 404 response status and received ${response.status}`));
                  }
                }, (err) => {
                  if (err.status === 404) {
                    done();
                  } else {
                    done(new Error(`Expected 404 response status and received ${err.status}`));
                  }
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
