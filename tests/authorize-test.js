'use strict';
const ApiBinding = require('discovery-proxy').ApiBinding;
const assert = require('assert');

const securityServiceFactory = require('./serviceFactory').securityServiceFactory;

describe('Authorize Test', () => {
    
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
                    'x-client-id': 'af6965b0-f69c-11e6-bccd-a3216a71ea6d', 
                    'x-client-secret':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoIjoibWFnaWMiLCJhZ2VudCI6IngtY2RzcC10ZW5hbnQiLCJleHAiOjE0ODgxMTExNDksImlhdCI6MTQ4NzUwNjM0OX0.ls51XjQ6KNRJETq2-l_6fFvBJ4ztwABXFQWDSCfRbs0' 
                }, (response) => {
                    console.log(response.obj);
                    done();
                }, (err) => {
                    console.log(err.obj);
                    done(new Error(err.obj.errorMessage));
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