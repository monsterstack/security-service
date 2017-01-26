'use strict';
const Promise = require('promise');
const HttpStatus = require('http-status');
const ServiceError = require('core-server').ServiceError;
const jwt = require('jsonwebtoken');
const sha1 = require('sha1');

const model = require('security-model').model;

// Dependent Services - TYPES
const TENANT_SERVICE_TYPE = 'TenantService';

class AuthService {
  constructor(proxy) {
    this.proxy = proxy;
    this.model = model;
  }

  authorise(authRequest) {
    let self = this;
    let p = new Promise((resolve, reject) => {
        let clientId = authRequest.client_id;
        let clientSecret = authRequest.client_secret;
        let scope = authRequest.scope;
        let grant = authRequest.grant;

        /**
         * Lookup Tenant
         */
        self._lookupTenant(clientId, clientSecret).then((tenant) => {
          if(tenant) {
            console.log('Got Tenant');
            console.log(`Client Secret - ${tenant.apiSecret}`);
            console.log(tenant);
            if(tenant.apiSecret === clientSecret) {
              console.log('Secrets match');
              /**
               * Store Token
               */
               self._storeAuthToken(authRequest).then((signedRequest) => {
                /**
                 * Build Auth Response
                 */
                 self._buildAuthResponse(signedRequest, authRequest).then((response) => {
                   resolve(response);
                 }).catch((err) => {
                   reject(err);
                 })
               });
             } else {
               reject(new ServiceError(HttpStatus.FORBIDDEN, "Forbidden Access - Unknown Secret"));
             }
           } else {
             reject(new ServiceError(HttpStatus.UNAUTHORIZED, "Unauthorized Access"));
           }
        }).catch((err) => {
          reject(err);
        });
    });

    return p;
  }

  token(tokenHashAccessCode) {
    let p = new Promise((resolve, reject) => {
      let access_token = jwt.sign(tokenHashAccessCode, SEED);

      resolve({
        access_token: access_token
      });
    });

    return p;
  }

  _buildAuthResponse(signedRequest, authRequest) {
    let p = new Promise((resolve, reject) => {
      let sha = sha1(signedRequest);
      let response = {
        redirect_uri: `http://localhost/api/v1/security/token/#${sha}`
      };

      resolve(response);
    });

    return p;
  }

  _storeAuthToken(authRequest) {
    console.log('Storing Auth Token');
    let self = this;
    let p = new Promise((resolve, reject) => {
      let accessToken =jwt.sign(authRequest, "shhhhhh!");
      console.log(accessToken);

      self.model.saveAccessToken({
        access_token: accessToken
      }).then((token) => {
        resolve(token.access_token);
      });
    });

    return p;
  }

  _lookupTenant(clientId, clientSecret) {
    let self = this;
    let unavailError = new ServiceError(HttpStatus.SERVICE_UNAVAILABLE, 'Tenant Service Not Available');
    let p = new Promise((resolve, reject) => {
      // Use Proxy to talk to Tenant Service.
      if(self.proxy) {
        self.proxy.apiForServiceType(TENANT_SERVICE_TYPE).then((service) => {
          if(service) {
            // Call Tenant Service
            service.api.tenants.getTenantByApiKey({apiKey: clientId}, (tenant) => {
              resolve(tenant.obj);
            }, (err) => {
              reject(err.errObj);
            });
          } else {
            console.log('No service found');
            reject(unavailError);
          }
        }).catch((err) => {
          console.log('error');
          console.log(err);
          reject(unavailError);
        });
      } else {
        // What is the error in this case?
        console.log('No Proxy');
        reject(unavailError);
      }
    });

    return p;
  }
}

module.exports = AuthService;
