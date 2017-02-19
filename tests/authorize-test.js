'use strict';
const HttpStatus = require('http-status');
const ApiBinding = require('discovery-proxy').ApiBinding;
const assert = require('assert');

const securityServiceFactory = require('./serviceFactory').securityServiceFactory;

describe('Authorize Test', () => {
    let clientId = 'af6965b0-f69c-11e6-bccd-a3216a71ea6d';
    let clientSecret = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoIjoibWFnaWMiLCJhZ2VudCI6IngtY2RzcC10ZW5hbnQiLCJleHAiOjE0ODgxMTExNDksImlhdCI6MTQ4NzUwNjM0OX0.ls51XjQ6KNRJETq2-l_6fFvBJ4ztwABXFQWDSCfRbs0';

    before( (done) => {
        // Need some way to mock Tenant Service - fully swaggered
        // And then sideload the service descriptor into 'server.boundProxy'.
        securityServiceFactory((err, server) => {
            done();
        });
    });

    it('Authorization Succeeds', (done) => {
        let service = {
            endpoint: 'http://localhost:12616',
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
                    done(new Error(err.obj.errorMessage));
                });
            } else {
                done(new Error("Missiong Security Service"));
            }
        
        });
    });

    /**
     * Forbidden shall occur when the 'x-client-secret' is invalid
     */
    it('Authorization Fails - Forbidden', (done) => {
        let service = {
            endpoint: 'http://localhost:12616',
            schemaRoute: '/swagger.json'
        };

        let apiBinding = new ApiBinding(service);

        apiBinding.bind().then((service) => {
            if(service) {
                service.api.oauth.authorise({ 
                    scope: ['all'], 
                    grant_type: 'grant', 
                    'x-client-id': clientId, 
                    'x-client-secret': 'foo'
                }, (response) => {
                    done();
                }, (err) => {
                    if(err.status === HttpStatus.FORBIDDEN) {
                        done();
                    } else {
                        done(new Error(`Expecting status 403, received ${err.status}`));
                    }
                });
            } else {
                done(new Error("Missiong Security Service"));
            }
        
        });
    });

    /**
     * Unauthorized shall occur when the 'x-client-id' is not recognized. (i.e. we haven't authenticated you)
     */
    it('Authorization Fails - Unauthorized', (done) => {
        let service = {
            endpoint: 'http://localhost:12616',
            schemaRoute: '/swagger.json'
        };

        let apiBinding = new ApiBinding(service);

        apiBinding.bind().then((service) => {
            if(service) {
                service.api.oauth.authorise({ 
                    scope: ['all'], 
                    grant_type: 'grant', 
                    'x-client-id': 'foo', 
                    'x-client-secret': clientSecret
                }, (response) => {
                    done();
                }, (err) => {
                    if(err.status === HttpStatus.UNAUTHORIZED) {
                        done();
                    } else {
                        done(new Error(`Expecting status 401, received ${err.status}`));
                    }
                });
            } else {
                done(new Error("Missiong Security Service"));
            }
        
        });
    });

    after((done) => {
        done();
    });
});