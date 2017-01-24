'use strict';

/**
 * @swagger
 * definitions:
 *   AuthorizationRequest:
 *     type: object
 *     required:
 *       - response_type
 *       - client_id
 *       - client_secret
 *       - scope
 *     properties:
 *        response_type:
 *          type: string
 *        client_id:
 *          type: string
 *        client_secret:
 *          type: string
 *        scope:
 *          type: string
 *   AuthorizationResponse:
 *      type: object
 *      required:
 *        - redirect_uri
 */
