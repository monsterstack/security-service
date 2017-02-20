'use strict';
const ApiBinding = require('discovery-proxy').ApiBinding;
const assert = require('assert');
const securityServiceFactory = require('./resources/serviceFactory').securityServiceFactory;
const jwt = require('jsonwebtoken');
const sha1 = require('sha1');
const model = require('security-model').model;

const SECRET = "shhhhhh!";

describe('Check Token Test', () => {
    /**
     * Setup all Test Fixtures
     * Security Url
     * Security Service Descriptor
     * Client Id
     * Client Secret
     * Auth Request
     */
    let securityUrl = 'mongodb://localhost:27017/cdspSecurity';

    let clearSecurityDB = require('mocha-mongoose')(securityUrl, {noClear: true});

    let token;
    let securityDescriptor = {
        endpoint: 'http://localhost:12616',
        schemaRoute: '/swagger.json'
    }

    let clientId = '11111';
    let clientSecret = 'dfdfadffd';

    let authReq = { 
        scope: ['all'], 
        grant_type: 'grant', 
        'x-client-id': clientId, 
        'x-client-secret': clientSecret
    };

    before( (done) => {
        // Need to shove access_token into db.
        token = jwt.sign(JSON.stringify(authReq), SECRET);
        let hash = sha1(token);
        model.saveAccessToken({
            access_token: token,
            hash: hash,
            tenantName: "Fubu",
            scope: ['all']
        }).then((access) => {
            console.log('shoved access_token into db');
            securityServiceFactory("SecurityService", (err, server) => {
                done();
            });
        }).catch((err) => {
            done(err);
        });
    });


    it('Authorization Validity Check Succeeds', (done) => {

        let apiBinding = new ApiBinding(securityDescriptor);
        

        apiBinding.bind().then((service) => {
            if(service) {
                service.api.tokens.check({ 
                    'access-token': token
                }, (response) => {
                    console.log(response.obj);
                    if(response.status != 200) {
                        done(new Error(`Expected Response Status 200 - got ${response.status}`));
                    } else if(response.obj.valid !== true) {
                        done(new Error(`Expected Response token validity ${response.obj.valid} \
                             to be equal to  true`));
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

    it('Authorization Validity Check Fails', (done) => {

        let apiBinding = new ApiBinding(securityDescriptor);
        

        apiBinding.bind().then((service) => {
            if(service) {
                service.api.tokens.check({ 
                    'access-token': token.substring(0, 10)
                }, (response) => {
                    console.log(response.obj);
                    if(response.status != 200) {
                        done(new Error(`Expected Response Status 200 - got ${response.status}`));
                    } else if(response.obj.valid !== false) {
                        done(new Error(`Expected Response token validity ${response.obj.valid} \
                             to be equal to  false`));
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

    after((done) => {
        clearSecurityDB((err) => {
            if(err) done(err);
            else
                done();
        })
    });
});