'use strict';

/**
 * @swagger
 * definitions:
 *   Error:
 *     type: object
 *     required:
 *        - errorMessage
 *     properties:
 *        errorMessage:
 *          type: string
 *   Health:
 *     type: object
 *     required:
 *        - cpuPercentUsage
 *        - totalMemPercentageUsage
 *        - loadAvg
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
 *   TokenResponse:
 *      type: object
 *      required:
 *        - access_token
 *
 */
