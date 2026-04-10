/**
 * CommunicationLogSendImmediate
 * Category: Scheduled
 * Modified: 2026-01-13T21:37:42.793Z by roobini.krishnandam@visualvault.com
 * Script ID: Script Id: 49787d34-7e91-ef11-82b1-b3f8aa6cdd67
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-10
 */
var logger = require('../log');

module.exports.getCredentials = function () {
  var options = {};
  options.customerAlias = 'WADNR';
  options.databaseAlias = 'fpOnline';
  options.userId = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
  options.password = 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=';
  options.clientId = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
  options.clientSecret = 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=';
  return options;
};

module.exports.main = async function (vvClient, response, token) {
    /*Script Name:   CommunicationLogSendImmediate
     Customer:      VisualVault
     Purpose:       Purpose of this script is acquire list of communication logs that need to be sent immediately as an email and send them to the recipients.
     Parameters:    The following represent variables passed into the function: None
     Return Array:  The following represents the array of information returned to the calling function.  This is a standardized response.  Any item in the array at points 2 or above can be used to return multiple items of information.
                    - Message will be sent back to VV as part of the ending of this scheduled process.
    Process Pseudocode:   The following documents the pseudo code for this process.
                    Step1:  Run a query to acquire list of communications logs that are marked to be sent.
                    Step2:  For each item in the array:
                                a. Fetch the documents that are related to the communications log
                                b. Send the email message (with documents)
                                c. Wait a configurable number of milliseconds
                    Step3:  Measure results and communicate completion.
           
     Date of Dev:   05/14/2019
     Last Rev Date: 03/31/2023
     Revision Notes:
     05/14/2019 - Jason Hatch:  Initial creation of the business process. 
     05/15/2019 - Jason Hatch:  Update as per code review feedback.
     05/18/2019 - Kendra Austin: Bug fix to prevent error being thrown when query was successful.
     08/02/2019 - Jason Hatch:  Updating to have a mechanism to throttle the emails frequency that they are sent to avoid disconnecting connections.
     08/03/2019 - Jason Hatch:  Added timezone mechanisms to set communication time in Eastern time.
     08/06/2019: Rufus Peoples - For use in Lincoln Comm Log
     08/19/2019 - Kendra Austin: updated time zone to Central for Lincoln. 
     04/27/2020 - Kendra Austin: Updated to include timeout mechanism and convert to async/await.
     02/04/2022 - Jason Hatch:   Updated to use iso string.
     03/18/2022 - Jon Brown:   Updated to send one email per recipient/cc
     03/31/2023 - Michael Rainey: Clean up code and implement for PA
     05/16/2023 - Michael Rainey: removed Jon Brown 03/18/2022 update. Restored to send CC communications. per direction from Jason Hatch and Kiefer Jackson and ticket PAELS-1231 / PAELS-1106
     */

    logger.info('Start of the process CommunicationLogSendImmediate at ' + Date());

    response.json(
        '200',
        'Process started, please check back in this log for more information as the process completes.',
    );

    //CONFIGURABLE VALUES IN THE FOLLOWING AREA.
    var commLogTemplateID = 'Communications Log';
    var commLogQuery = 'zWebSvc Communication Send Immediately';
    var frequencyEmailSendinms = 500; //This is the number of milleseconds delay between sending each email.
    //END OF CONFIGURABLE VALUES

    //Other globally used variables.
    var errorLog = []; //Array for capturing error messages that may occur.

    try {
        //This function takes a configurable number of milliseconds to complete and returns a promise
        var waitFunction = function () {
            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve('Waited');
                }, frequencyEmailSendinms);
            });
        };

        var mergeArray = function (array) {
            var a = array.concat();
            for (var i = 0; i < a.length; ++i) {
                for (var j = i + 1; j < a.length; ++j) {
                    if (a[i] === a[j]) a.splice(j--, 1);
                }
            }

            return a;
        };

        //Parameter for the query.
        var queryparams = {};

        //Run query to get the communication log items.
        let commLogs = await vvClient.customQuery.getCustomQueryResultsByName(
            commLogQuery,
            queryparams,
        );
        var responseItem = JSON.parse(commLogs);
        if (responseItem.meta.status !== 200) {
            throw new Error(
                'Error encountered when running the query to get communication logs that need to be sent.',
            );
        }

        if (responseItem.data.length === 0) {
            throw new Error('No communication log records found.');
        }

        var commLogsToSend = responseItem.data;
        var numberToSend = responseItem.data.length;

        for (var i = 0; i < numberToSend; i++) {
            const locItem = commLogsToSend[i];
            try {
                const recipients = String(locItem['email Recipients']).toLowerCase();
                //For each communications log to send:
                //1. Fetch the documents that are related to the communications log
                //2. Send the email message (with documents)
                //3. Wait a configurable number of milliseconds

                //Fetch Docs
                var getRelatedDocsParams = {};
                let relatedDocs = await vvClient.forms.getFormRelatedDocs(
                    locItem.dhid,
                    getRelatedDocsParams,
                );
                var docResp = JSON.parse(relatedDocs);
                if (docResp.meta.status !== 200) {
                    throw new Error(
                        'The call to get related documents for email returned with an error.',
                    );
                }
                let docsData = docResp.data;

                //Load the email object.
                var emailObj = {};

                //update to DOH pattern

                emailObj.recipients = locItem['email Recipients'];
                emailObj.ccrecipients = locItem['cc'];
                emailObj.subject = locItem['subject'];
                emailObj.body = locItem['email Body'];
                emailObj.hasAttachments = docsData.length > 0; //boolean
                emailObj.documents = docsData.map((o) => o.id); //array of doc IDs.

                /*
                
                Previous implementation. This was used to condense all the Email Recipients and CC email addresses for a communication log into one off emails to each email address listed.
                Uncomment this section in order to remove CC functionality.

                let recipeintArr = locItem['email Recipients'].toString().split(',');
                let ccArr = locItem['cc'].toString().split(',');
                let recipientList = mergeArray(recipeintArr.concat(ccArr));
                */

                let emailSent = false;
                /*
                for (const recipient in recipientList) {
                    if (!recipientList[recipient]) {
                        continue;
                    }
                    */
                try {
                    // Uncomment this section in order to remove CC functionality.
                    //emailObj.recipients = recipientList[recipient];

                    //Send email
                    let emailResp = await vvClient.email.postEmails(null, emailObj);
                    if (emailResp.meta.status !== 201) {
                        throw new Error('An error occurred while attempting to send the email');
                    }

                    //Wait a configurable number of milliseconds
                    let waitingPeriod = await waitFunction();
                    if (waitingPeriod !== 'Waited') {
                        throw new Error('The waiting period did not behave as expected.');
                    }

                    emailSent = true;
                } catch (err) {
                    hasErrors = true;
                    errorLog.push(err);
                }
                //}

                // if we sent at least one email, assume other failures were due to bad emails
                if (emailSent) {
                    //Load object to update comm log record. Include local timestamp
                    //Commented out the timezone because it is causing issues.  Jason 2/4/2022
                    var updateObj = {};
                    //var sendDate = momentTz().tz(timeZone).format('L');
                    //var sendTime = momentTz().tz(timeZone).format('LT');
                    //var localScheduledTime = sendDate + " " + sendTime;
                    updateObj['Communication Date'] = new Date().toISOString();
                    updateObj['Communication Sent'] = 'Yes';

                    //Update comm log record to reflect sent
                    let updateRecordResp = await vvClient.forms.postFormRevision(
                        null,
                        updateObj,
                        commLogTemplateID,
                        locItem.dhid,
                    );
                    if (updateRecordResp.meta.status !== 201) {
                        throw new Error(
                            'Error updating record ' +
                                locItem['comm Log ID'] +
                                ' after emails were sent.',
                        );
                    }
                }
            } catch (err) {
                errorLog.push(err);
            }
        }

        //Do this last. Measure if any errors occurred during the process.
        if (errorLog.length > 0) {
            //Errors captured
            logger.info(JSON.stringify(errorLog));
            throw new Error(
                'Error encountered during processing.  Please contact support to troubleshoot the errors that are occurring.',
            );
        } else {
            // response.json('200', 'Emails processed successfully');
            return vvClient.scheduledProcess.postCompletion(
                token,
                'complete',
                true,
                'Emails processed successfully',
            );
        }
    } catch (err) {
        // Return errors captured.
        return vvClient.scheduledProcess.postCompletion(
            token,
            'complete',
            true,
            'Error encountered during processing.  Error was ' + err,
        );
    }
};
