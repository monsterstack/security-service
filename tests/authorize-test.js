'use strict';
const Promise = require('promise');
const mongoose = require('mongoose');
const HttpStatus = require('http-status');
const ApiBinding = require('discovery-proxy').ApiBinding;
const Proxy = require('discovery-proxy').Proxy;
const assert = require('assert');
const uuid = require('node-uuid');
const startTestService = require('discovery-test-tools').startTestService;
const sideLoadTenantDescriptor = require('discovery-test-tools').sideLoadServiceDescriptor;
const jwt = require('jsonwebtoken');

const TENANT_PORT = 8715;
const TENANT_SWAGGER = require('./resources/tenant-swagger.json');


/**
 *  Add Tenant for Test Cases.
 */
const addTenant = (tenantUrl, tenant) => {
    let p = new Promise((resolve, reject) => {
        let url = tenantUrl;
        // get the connection
        let conn = mongoose.createConnection(url);
        conn.collection('tenants').insertMany([tenant], (err, result) => {
            console.log(result);
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
        startTestService('SecurityService', {}/* options */, (err, server) => {
            resolve(server);
        });
    });
    return p;
}

/**
 * Mock Tenant Service
 */
const mockTenantService = (simpleTenantEntry) => {
    console.log('Tenant Swagger');
    let swagger = TENANT_SWAGGER;
    swagger.host = `127.0.0.1:${TENANT_PORT}`;
    swagger.basePath = '/api/v1';
    swagger.schemes = ['http'];
    
    console.log(swagger);
    
    let p = new Promise((resolve, reject) => {
        let app = require('express')();
        app.get('/swagger.json', (req, res) => {        
            res.status(HttpStatus.OK).send(swagger);
        });

        /* Used by Authorization -- need to mock endpoint */
        app.get('/api/v1/tenants/_apiKey/:apiKey', (req, res) => {
            console.log('Inside Tenant Lookup');
            res.status(HttpStatus.OK).send(simpleTenantEntry);
        });


        app.listen(TENANT_PORT, '127.0.0.1');

        resolve(app);
        
    });
    return p;
}

describe('Authorize Test', () => {
    let tenantUrl = 'mongodb://localhost:27017/cdspTenant';
    let securityUrl = 'mongodb://localhost:27017/cdspSecurity';

    let clearTenantDB  = require('mocha-mongoose')(tenantUrl, {noClear: true})
    let clearSecurityDB = require('mocha-mongoose')(securityUrl, {noClear: true});
    let securityService = null;
    let mockTenantServer = null;

    let clientId = uuid.v1();
    let clientSecret = jwt.sign(clientId, 'shhhhh!');

    let tenantEntry = {
        "status" : "Active",
	    "apiSecret" : clientSecret,
        "timestamp" : Date.now(),
	    "name" : "Testerson",
	    "apiKey" : clientId,
	    "services" : [{
			"name" : "DiscoveryService",
			"_id" : mongoose.Types.ObjectId("58a98bad624702214a6e2ba9")
		}]
    };

    let tenantDescriptor = {
        "docsPath": 'http://cloudfront.mydocs.com/tenant', 
        "endpoint": `http://localhost:${TENANT_PORT}`,
        "healthCheckRoute":  "/health" ,
        "region":  "us-east-1" ,
        "schemaRoute":  "/swagger.json" ,
        "stage":  "dev" ,
        "status":  "Online" ,
        "timestamp": Date.now(),
        "type":  "TenantService" ,
        "version":  "v1"
    };

    before( (done) => {
        startSecurityService().then((server) => {
            console.log(server.getApp().listeningPort);
            securityService = server;
            return addTenant(tenantUrl, tenantEntry);
        }).then((tenant) => {
            return mockTenantService(tenantEntry);
        }).then((mock) => {
            mockTenantServer = mock;
            setTimeout(() => {
                securityService.getApp().dependencies = ['TenantService'];
                console.log(securityService.getApp().dependencies);

                sideLoadTenantDescriptor(securityService, tenantDescriptor).then(() => {
                    console.log(securityService.getApp().dependencies);
                    console.log(securityService.getApp().proxy);
                    done();
                }).catch((err) => {
                    done(err);
                })
            }, 1500);
            //done();
        }).catch((err) => {
            done(err);
        });
    });

    /**
     * This test attempts to Authorize given a prepared Tenant (apikey/secret)
     * The expectation is that the Tenant will be located and the auth request key/secret will
     * match that of the Tenant.
     */
    it('Authorization Succeeds', (done) => {
        let service = {
            endpoint: `http://localhost:${securityService.getApp().listeningPort}`,
            schemaRoute: '/swagger.json'
        };

        let apiBinding = new ApiBinding(service);

        apiBinding.bind().then((service) => {
            if(service) {
                service.api.oauth.authorise({ 
                    scope: ['all'], 
                    grant_type: 'grant', 
                    'x-client-id': clientId, 
                    'x-client-secret': clientSecret
                }, (response) => {
                    done();
                }, (err) => {
                    console.log(err);
                    done(new Error(err.errObj.errorMessage));
                });
            } else {
                done(new Error("Missing Security Service"));
            }
        
        });
    }).timeout(120000);

    // /**
    //  * This test attempts to Authorize given a prepared Tenant (apikey/secret)
    //  * The expectation is that the Tenant will be located but the auth request secret will
    //  * not match that of the Tenant. This should result in a 403.
    //  */
    // it('Authorization Fails - Forbidden', (done) => {
    //     let service = {
    //         endpoint: `http://localhost:${securityService.getApp().listeningPort}`,
    //         schemaRoute: '/swagger.json'
    //     };

    //     let apiBinding = new ApiBinding(service);

    //     apiBinding.bind().then((service) => {
    //         if(service) {
    //             service.api.oauth.authorise({ 
    //                 scope: ['all'], 
    //                 grant_type: 'grant', 
    //                 'x-client-id': clientId, 
    //                 'x-client-secret': 'foo'
    //             }, (response) => {
    //                 done();
    //             }, (err) => {
    //                 if(err.status === HttpStatus.FORBIDDEN) {
    //                     done();
    //                 } else {
    //                     done(new Error(`Expecting status 403, received ${err.status}`));
    //                 }
    //             });
    //         } else {
    //             done(new Error("Missing Security Service"));
    //         }
        
    //     });
    // }).timeout(5000);

    // /**
    //  * This test attempts to Authorize given a prepared Tenant (apikey/secret)
    //  * The expectation is that the Tenant will be located but the auth request key will
    //  * not match any Tenant in the system.  This should result in a 401.
    //  */
    // it('Authorization Fails - Unauthorized', (done) => {
    //     let service = {
    //         endpoint: `http://localhost:${securityService.getApp().listeningPort}`,
    //         schemaRoute: '/swagger.json'
    //     };

    //     let apiBinding = new ApiBinding(service);

    //     apiBinding.bind().then((service) => {
    //         if(service) {
    //             service.api.oauth.authorise({ 
    //                 scope: ['all'], 
    //                 grant_type: 'grant', 
    //                 'x-client-id': 'foo', 
    //                 'x-client-secret': clientSecret
    //             }, (response) => {
    //                 done();
    //             }, (err) => {
    //                 if(err.status === HttpStatus.UNAUTHORIZED) {
    //                     done();
    //                 } else {
    //                     done(new Error(`Expecting status 401, received ${err.status}`));
    //                 }
    //             });
    //         } else {
    //             done(new Error("Missing Security Service"));
    //         }
        
    //     });
    // }).timeout(5000);

    after((done) => {
        securityService.getHttp().close();
        // I hate christmas
        clearTenantDB((err) => {
            if(err) done(err);
            else {
                clearSecurityDB((err) => {
                    if(err) done(err);
                    else
                        done();
                });
            }
        });
    });
});