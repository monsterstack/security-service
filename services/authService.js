'use strict';
const Promise = require('promise');
const HttpStatus = require('http-status');
const Error = require('core-server').Error;
const jwt = require('jsonwebtoken');
const sha1 = require('sha1');

// Dependent Services - TYPES
const TENANT_SERVICE_TYPE = 'TenantService';

class AuthService {
  constructor(proxy) {
    this.proxy = proxy;
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
            if(tenant.apiSecret === clientSecret) {
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
               reject(new Error(HttpStatus.FORBIDDEN, "Forbidden Access"));
             }
           } else {
             reject(new Error(HttpStatus.UNAUTHORIZED, "Unauthorized Access"));
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
    let p = new Promise((resolve, reject) => {
      resolve(jwt.sign(authRequest, authRequest.clientSecret));
    });

    return p;
  }

  _lookupTenant(clientId, clientSecret) {
    let self = this;
    let unavailError = new Error(HttpStatus.SERVICE_UNAVAILABLE, 'Tenant Service Not Available');
    let p = new Promise((resolve, reject) => {
      // Use Proxy to talk to Tenant Service.
      if(self.proxy) {
        self.proxy.apiForServiceType(TENANT_SERVICE_TYPE).then((service) => {
          if(service) {
            // Call Tenant Service
            service.api.tenants.getTenant({id: clientId}, (tenant) => {
              resolve(tenant);
            }, (err) => {
              console.log(err);
              reject(err);
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
