'use strict';
const Promise = require('promise');
const HttpStatus = require('http-status');
const ServiceError = require('core-server').ServiceError;
const jwt = require('jsonwebtoken');
const sha1 = require('sha1');

const model = require('security-model').model;
const SECRET = "shhhhhh!";
// Dependent Services - TYPES
const TENANT_SERVICE_TYPE = 'TenantService';

// Expire Token in 10h
const JWT_OPTS = {
  expiresIn: "10h"
};

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
               self._storeAuthToken(tenant.name, authRequest).then((signedRequest) => {
                /**
                 * Build Auth Response
                 */
                 self._buildAuthResponse(signedRequest.access_token, signedRequest).then((response) => {
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

  check(accessToken) {
    let p = new Promise((resolve, reject) => {
      console.log(`Checking token ${accessToken}`);
      model.findAccessToken(accessToken).then((tokenModel) => {
        console.log(tokenModel);
        if(tokenModel) {
          jwt.verify(tokenModel.access_token, SECRET, (err, decoded) => {
            if(err) {
              // @TODO: if err.name === 'TokenExpiredError' then delete token.
              resolve({ valid: false, tenantName: tokenModel.tenantName});
            } else {
              resolve({ valid: true, tenantName: tokenModel.tenantName});
            }
          });
        } else {
          console.stash(`No matching token ${accessToken}`);
          resolve({ valid: false, tenantName: null});
        }
      }).catch((err) => {
        reject(err);
      });
    });
    return p;
  }

  token(tokenHashAccessCode) {
    return this._lookupTokenByHash(tokenHashAccessCode);
  }

  _lookupTokenByHash(hash) {
    let self = this;
    let p = new Promise((resolve, reject) => {
      self.model.findAccessTokenByHash(hash).then((accessToken) => {
        resolve(accessToken);
      }).catch((err) => {
        reject(err);
      });
    });
    return p;
  }

  _buildAuthResponse(signedRequest, authRequest) {
    let p = new Promise((resolve, reject) => {
      let sha = authRequest.hash;
      let ip = require('ip').address();

      // Need to get DNS of LB - for now whatevs
      if(process.env.HOST_IP) {
        ip = process.env.HOST_IP;
      }

      let response = {
        redirect_uri: `http://${ip}:${config.port}/api/v1/security/token/#${sha}`
      };

      resolve(response);
    });

    return p;
  }

  _storeAuthToken(tenantName, authRequest) {
    console.log('Storing Auth Token');
    let self = this;
    let p = new Promise((resolve, reject) => {
      let scope = authRequest.scope;
      let accessToken =jwt.sign(authRequest, SECRET, JWT_OPTS);
      console.log(accessToken);

      self.model.saveAccessToken({
        access_token: accessToken,
        hash: sha1(accessToken),
        scope: scope,
        tenantName: tenantName
      }).then((token) => {
        resolve(token);
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
            service.api.tenants.getTenantByApiKey({apiKey: clientId, 'x-fast-pass': true}, (tenant) => {
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
