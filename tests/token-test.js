'use strict';
const ApiBinding = require('discovery-proxy').ApiBinding;
const assert = require('assert');
const securityServiceFactory = require('./serviceFactory').securityServiceFactory;
const jwt = require('jsonwebtoken');
const sha1 = require('sha1');
const model = require('security-model').model;

describe('Token Test', () => {
    let hash;
    let securityDescriptor = {
        endpoint: 'http://localhost:12616',
        schemaRoute: '/swagger.json'
    }

    before( (done) => {
        // Need to shove access_token into db.
        let token = jwt.sign('1111', 'shhhhhhh!');
        hash = sha1(token);
        model.saveAccessToken({
            access_token: token,
            hash: hash,
            tenantName: "Fubu",
            scope: ['all']
        }).then((access) => {
            console.log('shoved access_token into db');
            securityServiceFactory((err, server) => {
                done();
            });
        }).catch((err) => {
            done(err);
        });
    });


    it('Authorization Token Fetch Succeeds', (done) => {
        let apiBinding = new ApiBinding(securityDescriptor);

        apiBinding.bind().then((service) => {
            if(service) {
                let tokenHashAccessCode = hash;
                console.log(tokenHashAccessCode);
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
        let hash = "dfadadsfd";
        
        let apiBinding = new ApiBinding(securityDescriptor);

        apiBinding.bind().then((service) => {
            if(service) {
                let tokenHashAccessCode = hash;

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

    after((done) => {
        done();
    });
});