/**
 * Test Communication Max
 * Category: Scheduled
 * Modified: 2025-08-01T09:46:43.143Z by max.coppola
 * Script ID: Script Id: b0bae94c-e56d-f011-82ef-b68a666f1af9
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
var logger = require('../log');

module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = "EmanuelJofre";
    options.databaseAlias = "Main";
    options.userId = "SiteMax.API";
    options.password = "dXnN*K6P";
    options.clientId = "de38846f-814a-4255-81a9-df67802e1a9e";
    options.clientSecret = "KQhAqDZS98ZIFi2bbP3KuhwmQ6LED3Yp+xXRRwiJhk0=";
    return options;
};

module.exports.main = function (vvClient, response, token) {
    /*Script Name:   NodeJSTestCommunication
     Customer:      VisualVault
     Purpose:       Test to make sure communications between VV and NodeJS are working for new installations.    Need to replace the credentials aboe with valid information.  Setup as outside process, then as scheduled process.  Run as scheduled process.
     Date of Dev:   12/24/2014
     Last Rev Date: 

     Revision Notes:
     12/24/2014 - Jason:  First Setup of the script
     */

    logger.info('COMMUNICATION ARRIVED SUCCESSFULLY TO THE NODEJS SERVER.');

    var responseMessage = 'Hello World!';

    response.json(200, responseMessage);
}
