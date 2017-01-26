'use strict';

/**
 * @swagger
 * tags:
 *  - name: error
 *    description: 'Everything you need to know about Error'
 *  - name: health
 *    description: 'Everything you need to know about Health'
 *  - name: authorizationResponses
 *    description: 'Everything you need to know about AuthorizationResponses'
 *  - name: tokenResponses
 *    description: 'Everything you need to know about TokenResponses'
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
 *     properties:
 *        cpuPercentUsage:
 *          type: number
 *        totalMemPercentageUsage:
 *          type: number
 *        loadAvg:
 *          type: number
 *   AccessTokenValidity:
 *      type: object
 *      required:
 *        - valid
 *      properties:
 *        valid:
 *          type: boolean
 *   AuthorizationResponse:
 *      type: object
 *      required:
 *        - redirect_uri
 *      properties:
 *        redirect_uri:
 *          type: string
 *   TokenResponse:
 *      type: object
 *      required:
 *        - access_token
 *      properties:
 *        access_token:
 *          type: string
 */
