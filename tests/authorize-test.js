'use strict';
const Promise = require('promise');
const mongoose = require('mongoose');
const HttpStatus = require('http-status');

const ServiceTestHelper = require('service-test-helpers').ServiceTestHelper;
const MongoHelper = require('data-test-helpers').MongoHelper;
const assert = require('service-test-helpers').Assert;

const ApiBinding = require('discovery-proxy').ApiBinding;
const Proxy = require('discovery-proxy').Proxy;
const uuid = require('node-uuid');
const sideLoadTenantDescriptor = require('discovery-test-tools').sideLoadServiceDescriptor;

const newTenantEntry = require('data-test-helpers').newTenantEntry;
const newApplicationEntry = require('data-test-helpers').newApplicationEntry;
const newTenantDescriptor = require('data-test-helpers').newTenantDescriptor;

const TokenTestHelper = require('service-test-helpers').TokenTestHelper;
const jwt = require('jsonwebtoken');

const TENANT_PORT = 8715;
const TENANT_SWAGGER = require('./resources/tenant-swagger.json');

const verifyApplicationAuthOk = (done) => {
  return (response) => {
    assert.assertEquals(response.status, HttpStatus.OK, `Expected status 200 - Ok`);
    assert.assertFieldExists('redirect_uri', response.obj, 'Expected redirect_uri exists');
    done();
  };
};

const verifyTenantAuthOk = (done) => {
  return (response) => {
    assert.assertEquals(response.status, HttpStatus.OK, `Expected status 200 - Ok`);
    assert.assertFieldExists('redirect_uri', response.obj, 'Expected redirect_uri exists');
    done();
  };
};

const verifyErrorMissing = (done) => {
  return (err) => {
    done(err);
  };
};

/**
 * Mock Tenant Service
 */
const mockTenantService = (simpleTenantEntry, simpleAppEntry) => {
    let swagger = TENANT_SWAGGER;
    swagger.host = `127.0.0.1:${TENANT_PORT}`;
    swagger.basePath = '/api/v1';
    swagger.schemes = ['http'];

    let p = new Promise((resolve, reject) => {
        let app = require('express')();
        app.get('/swagger.json', (req, res) => {
            res.status(HttpStatus.OK).send(swagger);
          });

        /* Used by Authorization -- need to mock endpoint */
        app.get('/api/v1/tenants/_apiKey/:apiKey', (req, res) => {
            res.status(HttpStatus.OK).send(simpleTenantEntry);
          });

        app.get('/api/v1/apps/_apiKey/:apiKey', (req, res) => {
            res.status(HttpStatus.OK).send(simpleAppEntry);
          });

        app.listen(TENANT_PORT, '127.0.0.1');

        resolve(app);

      });
    return p;
  };

describe('Authorize Test', () => {
    let tenantUrl = 'mongodb://localhost:27017/cdspTenant';
    let securityUrl = 'mongodb://localhost:27017/cdspSecurity';

    let serviceTestHelper = new ServiceTestHelper();
    let tenantMongoHelper = new MongoHelper('tenants', tenantUrl);
    let applicationMongoHelper = new MongoHelper('applications', tenantUrl);

    let clearTenantDB  = require('mocha-mongoose')(tenantUrl, { noClear: true });
    let clearSecurityDB = require('mocha-mongoose')(securityUrl, { noClear: true });
    let securityService = null;
    let mockTenantServer = null;

    let clientId = uuid.v1();
    let tenantEntry = newTenantEntry(clientId);
    let applicationEntry = newApplicationEntry(clientId);

    let tenantClientSecret = new TokenTestHelper().codeTenantSecret(tenantEntry, clientId);
    let applicationClientSecret = new TokenTestHelper().codeApplicationSecret(applicationEntry, clientId);
    tenantEntry.clientSecret = tenantClientSecret;
    applicationEntry.clientSecret = applicationClientSecret;

    let tenantDescriptor = newTenantDescriptor(TENANT_PORT);

    before((done) => {
        serviceTestHelper.startTestService('SecurityService', {}).then((server) => {
            securityService = server;
            return tenantMongoHelper.saveObject(tenantEntry);
          }).then((tenant) => {
            return applicationMongoHelper.saveObject(applicationEntry);
          }).then((application) => {
            return mockTenantService(tenantEntry, applicationEntry);
          }).then((mock) => {
            mockTenantServer = mock;
            securityService.getApp().dependencies = ['TenantService'];
            sideLoadTenantDescriptor(securityService, tenantDescriptor).then(() => {
              done();
            }).catch((err) => {
              done(err);
            });
          }).catch((err) => {
            done(err);
          });
      });

    /**
     * This test attempts to Authorize given a prepared Tenant (apikey/secret)
     * The expectation is that the Tenant will be located and the auth request key/secret will
     * match that of the Tenant.
     */
    it('auth succeeds - tenant', (done) => {
        serviceTestHelper.bindToGenericService(securityService.getApp().listeningPort).then((service) => {
            let request = {
              scope: ['all'],
              grant_type: 'grant',
              'x-client-id': clientId,
              'x-client-secret': tenantClientSecret,
            };
            service.api.oauth.authorise(request, verifyTenantAuthOk(done), verifyErrorMissing(done));
          });
      });

    /**
     * This test attempts to Authorize given a prepared Application (apikey/secret)
     * The expectation is that the Application will be located and the auth request key/secret will
     * match that of the Application.
     */
    it('auth succeeds - application', (done) => {
        serviceTestHelper.bindToGenericService(securityService.getApp().listeningPort).then((service) => {
            let request = {
              scope: ['all'],
              grant_type: 'grant',
              'x-client-id': clientId,
              'x-client-secret': applicationClientSecret,
            };
            service.api.oauth.authorise(request, verifyApplicationAuthOk(done), verifyErrorMissing(done));
          });
      });

    /**
     * This test attempts to Authorize given a prepared Tenant (apikey/secret)
     * The expectation is that the Tenant will be located but the auth request secret will
     * not match that of the Tenant. This should result in a 403.
     */
    it('auth fails forbidden - bad secret', (done) => {
        serviceTestHelper.bindToGenericService(securityService.getApp().listeningPort).then((service) => {
            let request = {
                scope: ['all'],
                grant_type: 'grant',
                'x-client-id': clientId,
                'x-client-secret': 'foo',
              };
            service.api.oauth.authorise(request, (response) => {
                done();
              }, (err) => {
                  if (err.status === HttpStatus.FORBIDDEN) {
                    done();
                  } else {
                    done(new Error(`Expecting status 403, received ${err.status}`));
                  }
                });

          });
      });

    /**
     * This test attempts to Authorize given a prepared Tenant (apikey/secret)
     * The expectation is that the Tenant will be located but the auth request key will
     * not match any Tenant in the system.  This should result in a 401.
     */
    it('auth fails forbidden - bad apiKey', (done) => {
        serviceTestHelper.bindToGenericService(securityService.getApp().listeningPort).then((service) => {
            let request = {
              scope: ['all'],
              grant_type: 'grant',
              'x-client-id': 'foo',
              'x-client-secret': tenantClientSecret,
            };
            service.api.oauth.authorise(request, (response) => {
                  done();
                }, (err) => {
                  if (err.status === HttpStatus.FORBIDDEN) {
                    done();
                  } else {
                    done(new Error(`Expecting status 403, received ${err.status}`));
                  }
                });

          });
      });

    after((done) => {
        securityService.getHttp().close();
        clearTenantDB((err) => {
            if (err) done(err);
            else {
              clearSecurityDB((err) => {
                  if (err) done(err);
                  else
                      done();
                });
            }
          });
      });
  });
