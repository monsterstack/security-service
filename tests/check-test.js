'use strict';
const ApiBinding = require('discovery-proxy').ApiBinding;
const assert = require('service-test-helpers').Assert;
const ServiceTestHelper = require('service-test-helpers').ServiceTestHelper;

const jwt = require('jsonwebtoken');
const sha1 = require('sha1');
const model = require('security-model').model;
const sideLoadTenantDescriptor = require('discovery-test-tools').sideLoadServiceDescriptor;

const newTenantDescriptor = require('data-test-helpers').newTenantDescriptor;

const TENANT_PORT = 8718;

const SECRET = 'shhhhhh!';

const verifyCheckOkResponseAndValid = (done) => {
  return (response) => {
    assert.assertEquals(response.status, 200, 'Expected 200 - Ok');
    assert.assertFieldExists('valid', response.obj, 'Expected validity.valid exists');
    assert.assertEquals(response.obj.valid, true, 'Expected validity.valid === true');
    done();
  };
};

const verifyCheckOkResponseAndInvalid = (done) => {
  return (response) => {
    assert.assertEquals(response.status, 200, 'Expected 200 - Ok');
    assert.assertFieldExists('valid', response.obj, 'Expected validity.valid exists');
    assert.assertEquals(response.obj.valid, false, 'Expected validity.valid === false');
    done();
  };
};

const verifyErrorMissing = (done) => {
  return (err) => {
    done(new Error('Expected no errors'));
  };
};

describe('check-token', () => {
    let securityUrl = 'mongodb://localhost:27017/cdspSecurity';
    let securityService = null;
    let clearSecurityDB = require('mocha-mongoose')(securityUrl, { noClear: true });

    let serviceTestHelper = new ServiceTestHelper();
    let tenantDescriptor = newTenantDescriptor(TENANT_PORT);

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
        let accessToken = {
          access_token: token,
          hash: hash,
          name: 'Fubu',
          scope: ['all'],
        };

        model.saveAccessToken(accessToken).then((access) => {
          return serviceTestHelper.startTestService('TenantService', {});
        }).then((server) => {
            securityService = server;
            securityService.getApp().dependencies = { types: ['TenantService'] };

            sideLoadTenantDescriptor(securityService, tenantDescriptor).then(() => {
              done();
            }).catch((err) => {
              done(err);
            });
          }).catch((err) => {
            done(err);
          });
      });

    it('auth validity check succeeds', (done) => {
      serviceTestHelper.bindToGenericService(securityService.getApp().listeningPort).then((service) => {
        let request = { 'access-token': token };
        service.api.tokens.check(request, verifyCheckOkResponseAndValid(done), verifyErrorMissing(done));
      });
    });

    it('auth validity check fails', (done) => {
      serviceTestHelper.bindToGenericService(securityService.getApp().listeningPort).then((service) => {
        let request = {
          'access-token': token.substring(0, 10),
        };
        service.api.tokens.check(request, verifyCheckOkResponseAndInvalid(done), verifyErrorMissing(done));
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
