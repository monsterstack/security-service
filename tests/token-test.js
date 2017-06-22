'use strict';

const HttpStatus = require('http-status');
const ServiceTestHelper = require('service-test-helpers').ServiceTestHelper;
const assert = require('service-test-helpers').Assert;
const jwt = require('jsonwebtoken');
const sha1 = require('sha1');
const model = require('security-model').model;
const sideLoadTenantDescriptor = require('discovery-test-tools').sideLoadServiceDescriptor;

const newTenantDescriptor = require('data-test-helpers').newTenantDescriptor;

const TENANT_PORT = 8719;

const verifyTokenOkResponse = (expected, done) => {
  return (response) => {
    assert.assertEquals(response.status, HttpStatus.OK, 'Expected 200 - Ok');
    assert.assertEquals(expected.tokenHashAccessCode, response.obj.hash, `Expected ${response.obj.hash} === ${expected.tokenHashAccessCode}`);
    done();
  };
};

const verifyTokenNotFoundError = (done) => {
  return (err) => {
    assert.assertEquals(err.status, HttpStatus.NOT_FOUND, 'Expected 404 - Not found');
    done();
  };
};

const verifyErrorMissing = (done) => {
  return (err) => {
    done(new Error('Expected no error'));
  };
};

const verifyMissingResponse = (done) => {
  return (response) => {
    done(new Error('Expected no successful respnse'));
  };
};

describe('token-test', () => {
    let securityUrl = 'mongodb://localhost:27017/cdspSecurity';
    let securityService = null;
    let clearSecurityDB = require('mocha-mongoose')(securityUrl, { noClear: true });

    let serviceTestHelper = new ServiceTestHelper();
    let tenantDescriptor = newTenantDescriptor(TENANT_PORT);
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
        return serviceTestHelper.startTestService('SecurityService', {});
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

    it('fetch token succeeds', (done) => {
      serviceTestHelper.bindToGenericService(securityService.getApp().listeningPort).then((service) => {
        let tokenHashAccessCode = hash;
        let request = {
          tokenHashAccessCode: tokenHashAccessCode,
        };
        service.api.tokens.token(request, verifyTokenOkResponse(request, done), verifyErrorMissing(done));
      });
    });

    it('auth token fails', (done) => {
      let hash = 'dfadadsfd';
      serviceTestHelper.bindToGenericService(securityService.getApp().listeningPort).then((service) => {
        let tokenHashAccessCode = hash;
        let request = {
          tokenHashAccessCode: tokenHashAccessCode,
        };
        service.api.tokens.token(request, verifyMissingResponse(done), verifyTokenNotFoundError(done));
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
