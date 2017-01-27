'use strict';

const controller = require('../controllers/oauth.controller.js');

module.exports = (app) => {
  /**
   * @swagger
   * /security/oauth:
   *  get:
   *    description: Request Authorization
   *    operationId: authorise
   *    tags:
   *      - oauth
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: x-client-id
   *        description: Client Id
   *        in: header
   *        required: true
   *      - name: x-client-secret
   *        description: Client Secret
   *        in: header
   *        required: true
   *      - name: grant_type
   *        description: Grant Type (i.e. token)
   *        in: query
   *        required: true
   *      - name: scope
   *        description: Scope
   *        in: query
   *        required: true
   *    responses:
   *      200:
   *        description: AuthorizationResponse
   *        type: object
   *        schema:
   *          $ref: '#/definitions/AuthorizationResponse'
   *      401:
   *        description: Error
   *        type: object
   *        schema:
   *          $ref: '#/definitions/Error'
   */
  app.get('/api/v1/security/oauth', controller.authorise(app));

  /**
   * @swagger
   * /security/oauth/token:
   *  get:
   *    description: Request Token
   *    operationId: token
   *    tags:
   *      - token
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: tokenHashAccessCode
   *        description: Token Hash Access Code
   *        in: path
   *        type: string
   *        required: true
   *    responses:
   *      200:
   *        description: TokenResponse
   *        type: object
   *        schema:
   *          $ref: '#/definitions/TokenResponse'
   *      404:
   *        description: Error
   *        type: object
   *        schema:
   *          $ref: '#/definitions/Error'
   */
  app.get('/api/v1/security/token/:tokenHashAccessCode', controller.token(app));

  /**
   * @swagger
   * /security/oauth/token/_check:
   *  get:
   *    description: Check Token Validity
   *    operationId: check
   *    produces:
   *      - application/json
   *    consumes:
   *      - application/json
   *    parameters:
   *      - name: access-token
   *        description: accessToken
   *        in: header
   *        required: true
   *    responses:
   *      200:
   *        description: TokenValidity
   *        type: object
   *        schema:
   *          $ref: '#/definitions/AccessTokenValidity'
   *      404:
   *        description: Error
   *        type: object
   *        schema:
   *          $ref: '#/definitions/Error'
   */
  app.get('/api/v1/security/token/_check', controller.isTokenValid(app));
}
