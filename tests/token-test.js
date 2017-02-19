'use strict';
const ApiBinding = require('discovery-proxy').ApiBinding;
const assert = require('assert');
const securityServiceFactory = require('./serviceFactory').securityServiceFactory;

describe('Token Test', () => {
    before( (done) => {
        // Need to shove access_token into db.

        // Need to shove tenant into db.

        // Need some way to mock Tenant Service - fully swaggered
        // And then sideload the service descriptor into 'server.boundProxy'.
        securityServiceFactory((err, server) => {
            done();
        });
    });


    it('Authorization Token Fetch Succeeds', (done) => {
        let service = {
            endpoint: 'http://localhost:12616',
            schemaRoute: '/swagger.json'
        };

        let apiBinding = new ApiBinding(service);

        apiBinding.bind().then((service) => {
            if(service) {
                let tokenHashAccessCode = '942edf488f51822dafc4753555d6e0d7b017eddb';
                service.api.tokens.token({ 
                    'tokenHashAccessCode': tokenHashAccessCode
                }, (response) => {
                    if(response.status != 200) {
                        done(new Error(`Expected Response Status 200 - got ${response.status}`));
                    } else if(response.obj.hash !== tokenHashAccessCode) {
                        done(new Error(`Expected Response token hash ${response.obj.hash} \
                             to match queried token hash ${tokenHashAccessCode}`));
                    } else {
                        done();
                    }
                }, (err) => {
                    console.log(err);
                    done(err);
                });
            } else {
                done(new Error("Missing Security Service"));
            }
        
        });
    });

    it('Authorization Token Fetch Fails', (done) => {
        let service = {
            endpoint: 'http://localhost:12616',
            schemaRoute: '/swagger.json'
        };

        let apiBinding = new ApiBinding(service);

        apiBinding.bind().then((service) => {
            if(service) {
                let tokenHashAccessCode = '2edf488f51822dafc4753555d6e0d7b017eddb';

                service.api.tokens.token({ 
                    'tokenHashAccessCode': tokenHashAccessCode    
                }, (response) => {
                    if(response.status === 200) {
                        done(new Error(`Expected 404 response status and received ${response.status}`));
                    }
                }, (err) => {
                    if(err.status === 404) {
                        done();
                    } else {
                        done(new Error(`Expected 404 response status and received ${err.status}`));
                    }
                });
            } else {
                done(new Error("Missing Security Service"));
            }
        
        });
    });

    it('Authorization Token Fetch - Missing Parameters', (done) => {
        let service = {
            endpoint: 'http://localhost:12616',
            schemaRoute: '/swagger.json'
        };

        let apiBinding = new ApiBinding(service);

        apiBinding.bind().then((service) => {
            if(service) {

                service.api.tokens.token({    
                }, (response) => {
                    console.log(response);
                    if(response.status === 200) {
                        done(new Error(`Expected 400 response status and received 200`));
                    }
                }, (err) => {
                    if(err.status === 400) {
                        done();
                    } else {
                        console.log(err);
                        done(new Error(`Expected 400 response status and received ${err.status}`));
                    }
                });
            } else {
                done(new Error("Missing Security Service"));
            }
        
        });
    });

    after((done) => {
        done();
    });
});