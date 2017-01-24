'use strict';

const controller = require('../controllers/oauth.controller.js');

module.exports = (app) => {
  /**
   * @swagger
   * /security/oauth:
   *  get:
   *    description: Request Authorization
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: x_client_id
   *        description: Client Id
   *        in: header
   *        required: true
   *      - name: x_client_secret
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
   */
  app.get('/api/v1/security/oauth', controller.authorise(app));

  /**
   * @swagger
   * /security/oauth/token:
   *  get:
   *    description: Request Token
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
   */
  app.get('/api/v1/security/token/:tokenHashAccessCode', controller.token(app));
}
