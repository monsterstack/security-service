'use strict';

const appRoot = require('app-root-path');
const HttpStatus = require('http-status');
const Error = require('core-server').Error;

const AuthService = require(appRoot+'/services/authService.js');

const authorise = (app) => {
  return (req, res) => {
    let authService = new AuthService();
    authService.authorise(authRequest).then((authResponse) => {
      res.status(HttpStatus.OK).send(authResponse);
    }).catch((err) => {
      new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
    });
  }
}

const token = (app) => {
  return (req, res) => {
    res.status(HttpStatus.OK).send({});
  }
}

/* Public */
exports.authorise = authorise;
exports.token = token;
