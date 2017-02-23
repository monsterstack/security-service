'use strict';
const appRoot = require('app-root-path');
const HttpStatus = require('http-status');
const ServiceError = require('core-server').ServiceError;
const SwaggerService = require('core-server').SwaggerService;

const getSwagger = (app) => {
  return (req, res) => {
    let baseSwagger = require(appRoot + '/api/swagger/swagger.json');
    let options = {};
    console.log(`App listening port is ${app.listeningPort}`);
    if(!process.env.hasOwnProperty('randomWorkerPort') || process.env.randomWorkerPort === false) {
      options.port = app.listeningPort;
    }

    let swaggerService = new SwaggerService('/api/v1', baseSwagger, options);
    swaggerService.getSwagger().then((swagger) => {
      res.status(HttpStatus.OK).send(swagger);
    }).catch((err) => {
      new ServiceError(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
    });
  }
}

/* Public */
exports.getSwagger = getSwagger;
