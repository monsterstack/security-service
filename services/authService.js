'use strict';
const Promise = require('promise');
const Error = require('core-server').Error;
const jwt = require('jsonwebtoken');
const sha1 = require('sha1');
const SEED = "shhhhhhh!";

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
      resolve(jwt.sign(authRequest, SEED));
    });

    return p;
  }

  _lookupTenant(clientId, clientSecret) {
    let p = new Promise((resolve, reject) => {
      let tenant = {
        apiKey: clientId,
        apiSecret: clientSecret
      };

      // Use Proxy to talk to Tenant Service.

      resolve(tenant);
    });

    return p;
  }
}

module.exports = AuthService;
