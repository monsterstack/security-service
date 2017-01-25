'use strict';

const controller = require('../controllers/oauth.controller.js');

module.exports = (app) => {
  /**
   * @swagger
   * /security/oauth:
   *  get:
   *    description: Request Authorization
   *    operationId: authorise
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
   */
  app.get('/api/v1/security/oauth', controller.authorise(app));

  /**
   * @swagger
   * /security/oauth/token:
   *  get:
   *    description: Request Token
   *    operationId: token
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
   */
  app.get('/api/v1/security/token/:tokenHashAccessCode', controller.token(app));
}
