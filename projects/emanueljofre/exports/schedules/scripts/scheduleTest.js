/**
 * scheduleTest
 * Category: Scheduled
 * Modified: 2021-12-13T18:22:47.267Z by emanuel.jofre@onetree.com
 * Script ID: Script Id: 3a2ba3d6-3c5c-ec11-8209-fad752c36608
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
var logger = require("../log");

module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = "EmanuelJofre";
    options.databaseAlias = "Main";
    options.userId = "emanuel.jofre+api@onetree.com";
    options.password = "achq1Ozpg3xD";
    options.clientId = "4150133e-ddef-4d8e-af91-1e7c39f16a25";
    options.clientSecret = "RKxMRhdeJPdt+3A3B/kNT19rbTawYpPLx84LSpzrHZ0=";
    return options;
};

module.exports.main = function (vvClient, response, token) {
    /*
      Script Name:   SCRIPT NAME HERE
      Customer:      CUSTOMER NAME HERE
      Purpose:       The purpose of this script is to...
      Parameters:    The following are parameters that need to be passed into this libarary node script.
                     - Parameters are not required for a scheduled process.
 
      Return Object:
                     - Message will be sent back to VV as part of the ending of this scheduled process.
      Psuedo code:
                     1. Acquire the license lookup record that matches the license.
 
      Date of Dev:   07/30/2021
      Last Rev Date:
 
      Revision Notes:
      07/30/2021 - DEVELOPER NAME HERE:  First Setup of the script
     */

    logger.info("Start of logic for SCRIPT NAME HERE on " + new Date());

    try {
        var scheduledProcessGUID = token;

        //The following should be uncommented for production.
        //response.json(200, 'Process has been initiated to run.  Check back in the log to see completion information.');

        //Configurable Variables

        //Script variables
        var errorLog = [];

        //HELPER FUNCTIONS START
        //This section should include functions that will be reused from the main code.

        //HELPER FUNCTIONS END

        /*********************************************************************************************************
         *
         *              START OF MAIN CODE
         *              The following document the steps in the main code.
         *              1. ENTER STEPS OF THE MAIN CODE HERE.
         *              2. ENTER STEPS OF THE MAIN CODE HERE.
         *
         **********************************************************************************************************/

        var messageData = "";

        if (errorLog.length > 0) {
            throw new Error("Errors Encountered");
        } else {
            messageData = "SUCCESS STATUS MESSAGE HERE";

            //Comment this out for debugging.
            response.json(200, "hola");

            //Uncomment the following for production testing.
            return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, "complete", true, "SUCCESS STATUS MESSAGE HERE");
        }
    } catch (err) {
        logger.info("SCRIPT NAME HERE: Error encountered" + err);

        var messageData = "";

        if (errorLog.length > 0) {
            messageData = "ERROR STATUS MESSAGE HERE";
        } else {
            messageData = "Unhandeled error occurred " + err;
        }

        //Comment this out for debugging.
        response.json("200", returnArr);

        //Uncomment the following for production testing.
        //return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', false, messageData);
    }
};

