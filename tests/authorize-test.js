'use strict';
const Promise = require('promise');
const mongoose = require('mongoose');
const HttpStatus = require('http-status');

const ServiceTestHelper = require('service-test-helpers').ServiceTestHelper;
const assert = require('service-test-helpers').Assert;

const ApiBinding = require('discovery-proxy').ApiBinding;
const Proxy = require('discovery-proxy').Proxy;
const uuid = require('node-uuid');
const startTestService = require('discovery-test-tools').startTestService;
const sideLoadTenantDescriptor = require('discovery-test-tools').sideLoadServiceDescriptor;

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
 *  Add Tenant for Test Cases.
 */
const addTenant = (tenantUrl, tenant) => {
    let p = new Promise((resolve, reject) => {
        let url = tenantUrl;
        // get the connection
        let conn = mongoose.createConnection(url);
        conn.collection('tenants').insertMany([tenant], (err, result) => {
            resolve(result.ops[0]);
          });
      });

    return p;
  };

const addApplication = (tenantUrl, application) => {
  let p = new Promise((resolve, reject) => {
        let url = tenantUrl;
        // get the connection
        let conn = mongoose.createConnection(url);
        conn.collection('applications').insertMany([application], (err, result) => {
            resolve(result.ops[0]);
          });
      });

  return p;
};

/**
 * Start Security Service
 */
const startSecurityService = () => {
    let p = new Promise((resolve, reject) => {
        startTestService('SecurityService', {}, (err, server) => {
            resolve(server);
          });
      });
    return p;
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

    let clearTenantDB  = require('mocha-mongoose')(tenantUrl, { noClear: true });
    let clearSecurityDB = require('mocha-mongoose')(securityUrl, { noClear: true });
    let securityService = null;
    let mockTenantServer = null;

    let clientId = uuid.v1();

    let tenantEntry = {
        status: 'Active',
        timestamp: Date.now(),
        name: 'Testerson',
        apiKey: clientId,
        services: ['DiscoveryService'],
      };

    let applicationEntry = {
        status: 'Active',
        timestamp: Date.now(),
        name: 'MyApp',
        apiKey: clientId,
        scope: ['all'],
    };

    let tenantClientSecret = new TokenTestHelper().codeTenantSecret(tenantEntry, clientId);
    let applicationClientSecret = new TokenTestHelper().codeApplicationSecret(applicationEntry, clientId);
    tenantEntry.clientSecret = tenantClientSecret;
    applicationEntry.clientSecret = applicationClientSecret;

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

    before((done) => {
        startSecurityService().then((server) => {
            securityService = server;
            return addTenant(tenantUrl, tenantEntry);
          }).then((tenant) => {
            return addApplication(tenantUrl, applicationEntry);
          }).then((application) => {
            return mockTenantService(tenantEntry, applicationEntry);
          }).then((mock) => {
            mockTenantServer = mock;
            setTimeout(() => {
                securityService.getApp().dependencies = ['TenantService'];
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

    /**
     * This test attempts to Authorize given a prepared Tenant (apikey/secret)
     * The expectation is that the Tenant will be located and the auth request key/secret will
     * match that of the Tenant.
     */
    it('auth succeeds - tenant', (done) => {
        let service = {
            endpoint: `http://localhost:${securityService.getApp().listeningPort}`,
            schemaRoute: '/swagger.json',
          };

        let apiBinding = new ApiBinding(service);

        apiBinding.bind().then((service) => {
            if (service) {
              service.api.oauth.authorise({
                  scope: ['all'],
                  grant_type: 'grant',
                  'x-client-id': clientId,
                  'x-client-secret': tenantClientSecret,
                }, verifyTenantAuthOk(done), verifyErrorMissing(done));
            } else {
              done(new Error('Missing Security Service'));
            }

          });
      });

    /**
     * This test attempts to Authorize given a prepared Application (apikey/secret)
     * The expectation is that the Application will be located and the auth request key/secret will
     * match that of the Application.
     */
    it('auth succeeds - application', (done) => {
        let service = {
            endpoint: `http://localhost:${securityService.getApp().listeningPort}`,
            schemaRoute: '/swagger.json',
          };

        let apiBinding = new ApiBinding(service);

        apiBinding.bind().then((service) => {
            if (service) {
              service.api.oauth.authorise({
                  scope: ['all'],
                  grant_type: 'grant',
                  'x-client-id': clientId,
                  'x-client-secret': applicationClientSecret,
                }, verifyApplicationAuthOk(done), verifyErrorMissing(done));
            } else {
              done(new Error('Missing Security Service'));
            }

          });
      });

    /**
     * This test attempts to Authorize given a prepared Tenant (apikey/secret)
     * The expectation is that the Tenant will be located but the auth request secret will
     * not match that of the Tenant. This should result in a 403.
     */
    it('auth fails forbidden - bad secret', (done) => {
        let service = {
            endpoint: `http://localhost:${securityService.getApp().listeningPort}`,
            schemaRoute: '/swagger.json',
          };

        let apiBinding = new ApiBinding(service);

        apiBinding.bind().then((service) => {
            if (service) {
              service.api.oauth.authorise({
                  scope: ['all'],
                  grant_type: 'grant',
                  'x-client-id': clientId,
                  'x-client-secret': 'foo',
                }, (response) => {
                  done();
                }, (err) => {
                  if (err.status === HttpStatus.FORBIDDEN) {
                    done();
                  } else {
                    done(new Error(`Expecting status 403, received ${err.status}`));
                  }
                });
            } else {
              done(new Error('Missing Security Service'));
            }

          });
      }).timeout(5000);

    /**
     * This test attempts to Authorize given a prepared Tenant (apikey/secret)
     * The expectation is that the Tenant will be located but the auth request key will
     * not match any Tenant in the system.  This should result in a 401.
     */
    it('auth fails forbidden - bad apiKey', (done) => {
        let service = {
            endpoint: `http://localhost:${securityService.getApp().listeningPort}`,
            schemaRoute: '/swagger.json',
          };

        let apiBinding = new ApiBinding(service);

        apiBinding.bind().then((service) => {
            if (service) {
              service.api.oauth.authorise({
                  scope: ['all'],
                  grant_type: 'grant',
                  'x-client-id': 'foo',
                  'x-client-secret': tenantClientSecret,
                }, (response) => {
                  done();
                }, (err) => {
                  if (err.status === HttpStatus.FORBIDDEN) {
                    done();
                  } else {
                    done(new Error(`Expecting status 403, received ${err.status}`));
                  }
                });
            } else {
              done(new Error('Missing Security Service'));
            }

          });
      }).timeout(5000);

    after((done) => {
        securityService.getHttp().close();
        // I hate christmas trees
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
