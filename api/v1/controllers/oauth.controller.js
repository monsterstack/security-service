'use strict';

const appRoot = require('app-root-path');
const HttpStatus = require('http-status');
const Error = require('core-server').Error;

const AuthService = require(appRoot+'/services/authService.js');

const CLIENT_ID_HDR = 'x_client_id';
const CLIENT_SECRET_HDR = 'x_client_secret';

const authorise = (app) => {
  return (req, res) => {
    let url = require('url');
    let url_parts = url.parse(req.url, true);
    let query = url_parts.query;
    let grant = 'token';
    let scope = ['all'];
    if(query.scope) {
      scope = query.scope.split(',');
    }

    let headers = req.headers;

    let authRequest = {
      client_id: headers['x_client_id'],
      client_secret: headers['x_client_secret'],
      grant: grant,
      scope: scope
    };

    let authService = new AuthService(app.proxy);
    authService.authorise(authRequest).then((authResponse) => {
      res.status(HttpStatus.OK).send(authResponse);
    }).catch((err) => {
      if(err.status) {
        if(err instanceof Error) {
          // Can we do duck typing?? Maybe check instance???
          err.writeResponse(res);
        } else {
          new Error(err.status, err.message).writeResponse(res);
        }
      } else {
        new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
      }
    });
  }
}

const token = (app) => {
  return (req, res) => {
    let tokenHashAccessCode = req.params.tokenHashAccessCode;
    let authService = new AuthService();
    authService.token(tokenHashAccessCode).then((token) => {
      res.status(HttpStatus.OK).send(token);
    }).catch((err) => {
      new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
    });

  }
}

/* Public */
exports.authorise = authorise;
exports.token = token;
