var vvEntities = require("visualvault-api").default;
var logger = require('../log');

//Which client API this script is written against. 'v1' adds the compatibility shims;
//'v2' hands the script the visualvault-api 2.x client as it is.
//Stays on v1: the postCompletion call below is never awaited, and only the v1 Q
//promise swallows a rejection instead of crashing the server process.
module.exports.clientCompatibility = 'v1';

module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = "GRMTesting"; //Change this to your customer name
    options.databaseAlias = "Main"; //Make sure this is the right database
    options.userId = "[API User Key]"; //Vaultaccess user with HTTP API Access Key/Secret generated in user properties.
    options.password = "[API User Secret]";
    options.clientId = "[API User Key]";
    options.clientSecret = "[API User Secret]";
    options.audience = "[Optional Audience Key]";
    return options;
};


module.exports.main = function (vvClient, response, token) {
    /*Script Name:   NodeJSTestCommunicationScheduledProcess
     Customer:      Test
     Purpose:       Test to make sure communications between VV and NodeJS are working for new installations.    Need to replace the credentials aboe with valid information.  Setup as outside process, then as scheduled process.  Run as scheduled process.
     Date of Dev:   12/24/2014
     Last Rev Date: 
     Revision Notes:
     12/24/2014 - Jason:  First Setup of the script
     */

    var scheduledProcessGUID = token;

    response.json(200, 'COMMUNICATION ARRIVED SUCCESSFULLY.  THIS IS A CUSTOM MESSAGE COMING BACK FROM THE NODEJS SERVER.');

    logger.info('COMMUNICATION ARRIVED SUCCESSFULLY TO THE NODEJS SERVER.');

    vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, "Scheduled Process End has completed.");


}
