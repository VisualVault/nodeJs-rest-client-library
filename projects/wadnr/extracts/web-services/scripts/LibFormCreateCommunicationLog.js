/**
 * LibFormCreateCommunicationLog
 * Category: Form
 * Modified: 2025-12-09T21:20:38.707Z by roobini.krishnandam@visualvault.com
 * Script ID: Script Id: b4e48019-c390-ef11-82ae-862bfd7a22f1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
var logger = require('../log');
var Q = require('q');
var dayjs = require('dayjs');

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

module.exports.main = function (ffCollection, vvClient, response) {
    /*Script Name:   LibFormCreateCommunicationLog
        Customer:      For Global Use
        Purpose:       The purpose of this library is to create a communication log form that will be used to send emails or record other communications.
        Parameters:    The following represent variables passed into the function:
                              COMMUNICATIONTYPE – This passes in the type of communication that will occur.  Value should be Email.
                              EMAILTYPE – This will indicate if the item is an immediate or digest type email.
                              RECIPIENTS – These are the recipients who will receive the communication.  Should be a comma separated list of email addresses.
                              RECIPIENTSCC – These are the carbon copied CCed recipients. Should be a comma separated list of email addresses.
                              SUBJECT – This is the subject of the notification.
                              BODY – This is the body of the communication.
                              RELATETORECORD – This is an array of Form IDs that this communication log should be related to in the system.
                              SCHEDULEDSENDDATETIME – This is the date and time when communication should be sent.  Date format should be an ISO format.
                              APPROVEDTOSEND – This is an indicator if the communication is approved to be sent immediately or not.  Value should be Yes as approved or No as not approved.
        Process PseudoCode:   1.  Validate that the information passed is correct and present.
                              2.  Prepare the postform process.
                              3.  Post the form to VisualVault
                              4.  Relate the form to the passed in guid of RELATETORECORD
                              5.  Return status information.
        Return Array:  The following represents the array of information returned to the calling function.  This is a standardized response.  
                       Any item in the array at points 2 or above can be used to return multiple items of information.
                       0 - Status: 'Success' or 'Error'
                       1 - Message
                       2 - Created Communication Log Form ID
                       3 - Created Communication Log Revision ID
                       4 - Minor error array
        Date of Dev:   10/23/2024
        Last Rev Date: 10/23/2024
   
        Revision Notes:
        10/23/2024 - Brian Davis: Script created for WADNR
        */

    logger.info('Start of the process LibFormCreateCommunicationLog at ' + Date());

    //Configuration Section
    var communicationLogTemplateID = 'Communications Log';

    //END OF CONFIGURATION SECTION
    //Initialization of the return object
    var returnObj = []; //Variable used to return information back to the client.

    //Variables used for parameters
    var communicationType = '';
    var emailType = '';
    var recipients = '';
    var recipientscc = '';
    var subject = '';
    var body = '';
    var relateToRecord = [];
    var scheduledSendDateTime = '';
    var utcScheduledTime = '';
    var approvedToSend = '';
    var otherFields = '';

    //Other variables used
    var inputErrors = 0;
    var commLogRevisionId = '';
    var commLogFormId = '';
    var inputErrorsMessage = '';
    var numForms = 0;
    var successes = 0;
    let minorErrors = [];

    var result = Q.resolve();

    return result
        .then(function () {
            //Extract the values of the passed in fields. for validation checking.

            communicationType = ffCollection.getFormFieldByName('COMMUNICATIONTYPE');
            emailType = ffCollection.getFormFieldByName('EMAILTYPE');
            recipients = ffCollection.getFormFieldByName('RECIPIENTS');
            recipientscc = ffCollection.getFormFieldByName('RECIPIENTSCC');
            subject = ffCollection.getFormFieldByName('SUBJECT');
            body = ffCollection.getFormFieldByName('BODY');
            relateToRecord = ffCollection.getFormFieldByName('RELATETORECORD');
            scheduledSendDateTime = ffCollection.getFormFieldByName('SCHEDULEDSENDDATETIME').value;
            approvedToSend = ffCollection.getFormFieldByName('APPROVEDTOSEND');
            otherFields = ffCollection.getFormFieldByName('OTHERFIELDSTOUPDATE');

            if (otherFields) {
                otherFields = otherFields.value;
            }

            //Validate passed in fields
            //COMMUNICATIONTYPE is a required parameter
            if (!communicationType || !communicationType.value) {
                inputErrors++;
                inputErrorsMessage +=
                    "The COMMUNICATIONTYPE parameter was not supplied. COMMUNICATIONTYPE should have a value of 'Email'  <br>";
            } else if (communicationType.value.toLowerCase() != 'email') {
                inputErrors++;
                inputErrorsMessage +=
                    "The COMMUNICATIONTYPE parameter must have a value of 'email'. Invalid value provided. <br>";
            }

            //EMAILTYPE is a required parameter
            if (!emailType || !emailType.value) {
                inputErrors++;
                inputErrorsMessage +=
                    "The EMAILTYPE parameter was not supplied. EMAILTYPE should have a value of either 'Digest' or 'Immediate Send'  <br>";
            } else if (emailType.value.toLowerCase() != 'digest' && emailType.value.toLowerCase() != 'immediate send') {
                inputErrors++;
                inputErrorsMessage +=
                    "The EMAILTYPE parameter must have a value of either 'Digest' or 'Immediate Send'. Invalid value provided. <br>";
            }

            //RECIPIENTS is a required parameter
            if (!recipients || !recipients.value) {
                inputErrors++;
                inputErrorsMessage +=
                    'The RECIPIENTS parameter was not supplied. This should be a comma separated list of email addresses. <br>';
            }

            //RECIPIENTSCC is not a required parameter
            //if (!recipeints || !recipeints.value) {
            //    inputErrors++;
            //    inputErrorsMessage += 'The RECIPIENTSCC parameter was not supplied. This should be a comma separated list of email addresses. <br>';
            //}

            //SUBJECT is a required parameter
            if (!subject || !subject.value) {
                inputErrors++;
                inputErrorsMessage +=
                    'The SUBJECT parameter was not supplied. This should be subject for the message. <br>';
            }

            //BODY is a required parameter
            if (!body || !body.value) {
                inputErrors++;
                inputErrorsMessage += 'The BODY parameter was not supplied. This should be the body of the email. <br>';
            }

            //RELATETORECORD is a required parameter
            if (!relateToRecord || !relateToRecord.value) {
                inputErrors++;
                inputErrorsMessage +=
                    'The RELATETORECORD parameter was not supplied. This should be an array of Form IDs to which the communication log should be related. <br>';
            }
            //Ensure that an array was passed in, not a string or other data type.
            else if (Array.isArray(relateToRecord.value) == false) {
                //If a string was passed in, make an array out of it. Otherwise throw an error and ask for an array.
                if (typeof relateToRecord.value == 'string') {
                    //Put the passed in string into a holding variable
                    var stringHolder = relateToRecord.value;

                    //Clear out relateToRecord and set it as an empty array
                    relateToRecord = [];
                    relateToRecord.push(stringHolder);
                    //Log the number of forms that should be related at the end of this process.
                    numForms = 1;
                } else {
                    inputErrors++;
                    inputErrorsMessage +=
                        'The RELATETORECORD parameter must be an array of Form IDs to which the communication log should be related. <br>';
                }
            } else {
                //Set relateToRecord equal to the array of Form IDs.
                relateToRecord = relateToRecord.value;
                //Log the number of forms that should be related at the end of this process.
                numForms = relateToRecord.length;
            }

            //SCHEDULEDSENDDATETIME is a required parameter
            var dateCheck = dayjs(scheduledSendDateTime);
            if (dateCheck.isValid() == false) {
                inputErrors++;
                inputErrorsMessage +=
                    'The SCHEDULEDSENDDATETIME needs to be in an iso date format to be manipulated. Invalid value provided. <br>';
            } else {
                utcScheduledTime = dayjs(scheduledSendDateTime).toISOString();
            }

            //APPROVEDTOSEND is a required parameter
            if (!approvedToSend || !approvedToSend.value) {
                inputErrors++;
                inputErrorsMessage +=
                    "The APPROVEDTOSEND parameter was not supplied. APPROVEDTOSEND should have a value of 'Yes' or 'No'  <br>";
            } else if (approvedToSend.value.toLowerCase() != 'yes' && approvedToSend.value.toLowerCase() != 'no') {
                inputErrors++;
                inputErrorsMessage +=
                    "The APPROVEDTOSEND parameter must have a value of 'Yes' or 'No'. Invalid value provided. <br>";
            }
        })
        .then(function () {
            //If the number of errors is greater than zero at this point, then throw an error with the aggregated issues.
            if (inputErrors > 0) {
                throw new Error(inputErrorsMessage);
            }
        })
        .then(function () {
            //Post the communication log.
            var targetFields = {};
            targetFields['Communication Type'] = communicationType.value;
            targetFields['Email Type'] = emailType.value;
            targetFields['Email Recipients'] = recipients.value;
            targetFields['CC'] = recipientscc.value;
            targetFields['Subject'] = subject.value;
            targetFields['Email Body'] = body.value;
            targetFields['Scheduled Date'] = utcScheduledTime;
            targetFields['Approved'] = approvedToSend.value;
            targetFields['Communication Sent'] = 'No';
            targetFields['Communication Date'] = new Date().toISOString();
            targetFields['Form Saved'] = 'true';
            targetFields['Communication Type Filter'] = 'Log Previous'; // set the default value to prevent cascades reseting Communication

            //Load additional fields
            for (var property1 in otherFields) {
                targetFields[property1] = otherFields[property1];
            }

            return vvClient.forms.postForms(null, targetFields, communicationLogTemplateID).then(function (postResp) {
                if (postResp.meta.status === 201 || postResp.meta.status === 200) {
                    commLogRevisionId = postResp.data.revisionId;
                    commLogFormId = postResp.data.instanceName;
                } else {
                    throw new Error(
                        'Call to post new form returned with an error. The server returned a status of ' +
                            postResp.meta.status
                    );
                }
            });
        })
        .then(function () {
            //Relate the created communication log to each Form ID in the RELATETORECORD array.
            var relateProcessResult = Q.resolve();

            relateToRecord.forEach(function (relatedForm) {
                relateProcessResult = relateProcessResult.then(function () {
                    return vvClient.forms.relateFormByDocId(commLogRevisionId, relatedForm).then(function (relateResp) {
                        var relatedResp = JSON.parse(relateResp);
                        if (relatedResp.meta.status === 200 || relatedResp.meta.status === 404) {
                            successes++;
                        } else {
                            //logger.info("Call to relate forms returned with an error.");
                            minorErrors.push(`${relatedForm}: Call to relate forms returned with an error.`);
                        }
                    });
                });
            });

            return relateProcessResult;
        })
        .then(function () {
            if (numForms == successes) {
                returnObj[0] = 'Success';
                returnObj[1] = 'The request to create communication log completed successfully.';
                returnObj[2] = commLogFormId;
                returnObj[3] = commLogRevisionId;
                returnObj[4] = minorErrors;
            } else {
                throw new Error(
                    'The communication log was created successfully, but at least one form was not successfully related to it.'
                );
            }

            return response.json(200, returnObj);
        })
        .catch(function (err) {
            logger.info(JSON.stringify(err));

            returnObj[0] = 'Error';

            if (err && err.message) {
                returnObj[1] = err.message;
            } else {
                returnObj[1] = 'An unhandled error has occurred. The message returned was: ' + err;
            }

            return response.json(returnObj);
        });
};
