'use strict';
const model = require('tenant-model').model;
const Promise = require('promise');
const jwt = require('jsonwebtoken');

const SEED = "shhhhhhh!";

class AuthService {
  constructor() {

  }

  authorise(authRequest) {
    let p = new Promise((resolve, reject) => {
        let clientId = authRequest.client_id;
        let clientSecret = authRequest.client_secret;
        let scope = authRequest.scope;
        let grant = authRequest.grant;

        self._storeAuthToken(jwt(authRequest)).then((signedRequest) => {
          self._buildAuthResponse(signedRequest, authRequest).then((response) => {
            resolve(response);
          }).catch((err) => {
            reject(err);
          })
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
      resolve(jwt(authRequest));
    });

    return p;
  }
}

module.exports = TenantService;
