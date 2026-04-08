/**
 * LibGenerateCommLogEmailSendNow
 * Category: Form
 * Modified: 2025-01-27T20:34:41.577Z by patricio.bonetto@visualvault.com
 * Script ID: Script Id: e026e33f-c390-ef11-82ae-862bfd7a22f1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
var logger = require('../log');
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

module.exports.main = async function (ffCollection, vvClient, response) {
    /*Script Name:  LibGenerateCommLogEmailSendNow
     Customer:      VisualVault
     Purpose:       The purpose of this library script is to recieve a single email object, lookup the Email Template, generate a communication log that is marked as sent and then send the email.

     Parameters:    The following represent variables passed into the function:
                    -Email Name (string, Required) The Email Name passed in must match the name of the correct email record you wish to create a communication log for.
                    -Tokens (array of objects, Required) The tokens object passed in must match the formatting listed below. Pass in as many tokens as needed.
                            EX:
                                            var TokenFirstName = '[First Name]';        //These should be configurable variables in your calling script.
                                            var TokenLastName = '[Last Name]';
                                            var tokenArray = [
                                                {name:TokenFirstName, value: firstName},    //firstName and lastName are string values pulled from form fields.
                                                {name:TokenLastName, value: lastName}
                                            ];
                                            emailData = {};                             //Configure the object and push it into the array being sent to this script. 
                                            emailData.name = 'Tokens';
                                            emailData.value = tokenArray;
                                            webServiceInfo.push(emailData);
                    -Email Address (string, Conditionally Required) A comma-separated string of email addresses. Required if there is no send to email address stored in the email template record.
                    -Email AddressCC (string, Optional) A comma-separated string of email addresses.
                    -OTHERFIELDSTOUPDATE (object, Optional) The read-only fields to update on the Communications Log. The otherfields passed in must match the example below.
                            EX:             {name:'OTHERFIELDSTOUPDATE',value:{"Primary Record ID": "Form ID as string"}}
                                            This object will need to be changed according to the Communications Log field names.
                    -RELATETORECORD (Array of strings representing form IDs, Optional) The RelateToRecord passed in must match the example below.
                                    This will relate the calling form to the communication log that will be generate.
                            EX:             {name:'RELATETORECORD', value:relateToRecord}       //The value for this example is for multiple records stored in an array.

     Return Array:  The following represents the array of information returned to the calling function.  This is a standardized response.
                    Any item in the array at points 2 or above can be used to return multiple items of information.
                    0 - Status: Success, Error
                    1 - Message
                    2 - Any unreplaced tokens in the generated email notification.


     Process Pseudocode:   The following documents the pseudo code for this process.

                    Step 1:  Recieve and parse all required data
                    Step 2:  Search for the email template
                    Step 3:  Get forms on the email template
                    Step 4:  Start pull in data from the email template form.
                    Step 5:  Configure communication array
                    Step 6:  Create the new communication log
                    Step 7: if there are records to relate then relate them to the newly created comm log
                    Step 8: if there are documents related to the commlog then add them to the email. Ths should not be used as this is an immediate send
                    Step 9: Send the email
                    Step 10: update the commlog that the communciation was sent and what time it was sent
           
     Date of Dev:   10/23/2024
     Last Rev Date: 10/23/2024
     Revision Notes:
        10/23/2024 - Brian Davis :  Initial Script Created for WADNR
     */

    logger.info('Start of the process LibEmailGenerateAndCreateCommunicationLog at ' + Date());

    //Configuration Variables
    const emailNotifTemplateName = 'Email Template'; //The name of the Email Template template.
    const CommLogTemplateName = 'Communications Log'; //The name of the Communications Log template.
    const sendWithIncompleteTokens = 'Yes'; //Set to 'Yes' if you want to send emails with unreplaced tokens. Otherwise set to 'No'.

    const sendToDDOne = 'Send to a defined list of email addresses'; //Three options in the send to drop-down field on the emailNotifTemplateName template.
    const sendToDDTwo = 'Send to recipients based on context';
    const sendToDDThree = 'Send to both';

    const sendCCDDOne = 'CC to a defined list of email addresses'; //Three options in the CC drop-down field on the emailNotifTemplateName template.
    const sendCCDDTwo = 'CC to recipients based on context';
    const sendCCDDThree = 'CC both';

    //End Configuration variables.

    //Script Variables
    let errors = []; //Used to hold errors as they are found, to return together.
    let badTokenList = [];
    let commLogRecordID = '';
    let commLogGUID = '';
    let emailTemplateSearch = '';

    //End Script Variables

    try {
        /*********************
        Form Record Variables
        **********************/

        //Step 1:  Recieve and parse all required data
        let emailName = getFieldValueByName('Email Name');
        let tokenArray = getFieldValueByName('Tokens');
        let additionaEmailAddress = getFieldValueByName('Email Address');
        let CCadditionaEmailAddress = getFieldValueByName('Email AddressCC', 'true');
        let otherFields = getFieldValueByName('OTHERFIELDSTOUPDATE', 'true');
        let relateToRecord = getFieldValueByName('RELATETORECORD', 'true');
        let sendDateTime = getFieldValueByName('SendDateTime', 'true');

        if (otherFields.hasOwnProperty('Sent/Recorded By')) {
            if (otherFields['Sent/Recorded By'] === '')
                otherFields['Sent/Recorded By'] = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
        } else {
            if (otherFields['Sent/Recorded By'] === '')
                otherFields['Sent/Recorded By'] = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
        }

        /****************
         Helper Functions
        *****************/
        // Check if field object has a value property and that value is truthy before returning value.
        function getFieldValueByName(fieldName, isOptional) {
            try {
                let fieldObj = ffCollection.getFormFieldByName(fieldName);
                let fieldValue = fieldObj && (fieldObj.hasOwnProperty('value') ? fieldObj.value : null);

                if (fieldValue === null) {
                    throw new Error(`${fieldName}`);
                }
                if (!isOptional && !fieldValue) {
                    throw new Error(`${fieldName}`);
                }
                return fieldValue;
            } catch (error) {
                errors.push(error.message);
            }
        }

        //Initialization of the return object
        var outputCollection = [];

        //Function to check a comma-delimited string of email addresses and return a valid list where possible.
        var checkEmailList = function (emailList) {
            var emailValidationCheck =
                /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            var validEmailList = []; //Holds the valid email list
            var invalidEmailList = []; //Holds any invalid email addresses encountered.

            //Split the inputted list into an array, based on commas
            var emailArray = emailList.split(',');

            //Process each item of the array.
            emailArray.forEach(function (email) {
                //Check if blank string. If it is, OK to ignore it.
                email = email.trim();
                if (email.length > 0) {
                    if (!emailValidationCheck.test(email)) {
                        //Not a valid email
                        invalidEmailList.push(email);
                    } else {
                        //Valid email address, add it to the valid result
                        validEmailList.push(email);
                    }
                }
            });

            //Send back an array of data to parse. If any invalid emails encountered, send back Error. Otherwise success.
            var returnArray = [];
            if (invalidEmailList.length > 0) {
                returnArray[0] = 'Error';
            } else {
                returnArray[0] = 'Success';
            }

            //Always return both lists of emails as comma-delimited lists.
            returnArray[1] = validEmailList.join(',');
            returnArray[2] = invalidEmailList.join(',');

            return returnArray;
        };

        let emailNameCleaned = emailName.replace(/'/g, "\\'");

        if (!sendDateTime) {
            sendDateTime = dayjs().toISOString();
        } else {
            sendDateTime = sendDateTime.value;
            if (!dayjs(sendDateTime).isValid()) {
                errors.push(
                    'The send date and time are not in the correct format. Please pass in a dayjs().toISOString().'
                );
            }
        }

        // Step 2:  Search for the email template
        emailTemplateSearch = `[Email Name] eq '${emailNameCleaned}'`;

        let queryParams = {
            q: emailTemplateSearch,
            expand: true,
        };

        // Step 3:  Get forms on the email template
        let getFormsResp = await vvClient.forms.getForms(queryParams, emailNotifTemplateName);
        getFormsResp = JSON.parse(getFormsResp);
        let getFormsData = getFormsResp.hasOwnProperty('data') ? getFormsResp.data : null;
        let getFormsLength = Array.isArray(getFormsData) ? getFormsData.length : 0;

        if (getFormsResp.meta.status !== 200) {
            throw new Error(
                'There was an error when attempting to retrieve the email notification template. Please contact a System Administrator with this information. ' +
                    getFormsData.meta.statusMsg
            );
        }
        if (!getFormsData || !Array.isArray(getFormsData)) {
            throw new Error(`Data was not returned when calling getForms.`);
        }
        if (getFormsLength != 1) {
            throw new Error(
                getFormsLength +
                    ' email template(s) were found with the email name of ' +
                    emailName +
                    '. Review the email name to ensure only one record is referenced. Please contact a System Administrator with this information.'
            );
        }

        let emailTemplateObj = getFormsData;

        // Step 4:  Start pull in data from the email template form.
        var sendToSelector = emailTemplateObj[0]['send To Selector'];
        var sendCCSelector = emailTemplateObj[0]['send CC Selector'];
        var commLogSendType = emailTemplateObj[0]['send Select'];
        var subject = emailTemplateObj[0]['subject Line'];
        var body = emailTemplateObj[0]['body Text'];
        var sendToEmails = emailTemplateObj[0]['send To'];
        var ccToEmails = emailTemplateObj[0]['send CC'];
        //End pull in data from the email template form.

        //Start replacing tokens in body
        tokenArray.forEach(function (tokenItem) {
            var tokenName = tokenItem.name;
            var tokenData = tokenItem.value;
            body = body.split(tokenName).join(tokenData);
        });
        //End replacing tokens in body.

        //Start search for unreplaced tokens.
        badTokenList = [];
        var tokenCheckBody = body.split(/(\[(.*?)\])/);
        tokenCheckBody.forEach(function (unreplacedToken) {
            if (unreplacedToken.charAt(0) == '[' && unreplacedToken.slice(-1) == ']') {
                badTokenList.push(unreplacedToken);
            }
        });

        //Start replacing tokens in subject
        tokenArray.forEach(function (tokenItem) {
            var tokenName = tokenItem.name;
            var tokenData = tokenItem.value;
            subject = subject.split(tokenName).join(tokenData);
        });
        //End replacing tokens in subject.

        //Start search for unreplaced tokens.
        badTokenList = [];
        var tokenCheckSubject = subject.split(/(\[(.*?)\])/);
        tokenCheckSubject.forEach(function (unreplacedToken) {
            if (unreplacedToken.charAt(0) == '[' && unreplacedToken.slice(-1) == ']') {
                badTokenList.push(unreplacedToken);
            }
        });

        //If any unreplaced tokens found, throw or push error as appropriate based on configurable setting.
        if (badTokenList.length > 0) {
            var unreplacedTokens = badTokenList.join(', ');
            if (sendWithIncompleteTokens == 'Yes') {
                errors.push(
                    'One or more tokens were not replaced in the generated notification. The tokens are: ' +
                        unreplacedTokens +
                        '. The communication log has been created.'
                );
            } else {
                throw new Error(
                    'Please contact a System Administrator with this information. One or more tokens have not been replaced. The tokens are : ' +
                        unreplacedTokens
                );
            }
        }
        //End checking body for unreplaced tokens

        //Start Send to Email selector and validation.
        var sendEmail = '';
        switch (sendToSelector) {
            case sendToDDOne: //Defined List
                sendEmail = sendToEmails;
                break;
            case sendToDDTwo: //Context
                sendEmail = additionaEmailAddress;
                break;
            case sendToDDThree: //Both
                sendEmail = sendToEmails + ',' + additionaEmailAddress;
                break;
            case 'Select Item':
                sendEmail = sendToEmails + ',' + additionaEmailAddress;
                break;
        }

        if (!sendEmail) {
            throw new Error(
                'No Email Address has been supplied. Please contact a System Administrator with this information.'
            );
        } else {
            //Centralized checking for bad emails.
            sendEmail = sendEmail.trim();
            var testSendEmail = checkEmailList(sendEmail);
            if (testSendEmail[0] == 'Success') {
                sendEmail = testSendEmail[1];
            } else if (testSendEmail[0] == 'Error') {
                throw new Error(
                    'Could not generate an email notification. At least one email address was not formatted correctly: ' +
                        testSendEmail[2] +
                        '. Please contact a System Administrator with this information.'
                );
            }
        }
        //End Send to Email selector and validation.

        //Start CC Email selector and validation.
        var sendEmailCC = '';
        switch (sendCCSelector) {
            case sendCCDDOne: //Defined List
                sendEmailCC = ccToEmails;
                break;
            case sendCCDDTwo: //Context
                sendEmailCC = CCadditionaEmailAddress;
                break;
            case sendCCDDThree: //Both
                sendEmailCC = ccToEmails + ',' + CCadditionaEmailAddress;
                break;
            case 'Select Item':
                sendEmailCC = ccToEmails + ',' + CCadditionaEmailAddress;
                break;
        }

        if (sendEmailCC) {
            //Centralized checking for bad emails.
            sendEmailCC = sendEmailCC.trim();
            var testSendEmailCC = checkEmailList(sendEmailCC);
            if (testSendEmailCC[0] == 'Success') {
                sendEmailCC = testSendEmailCC[1];
            } else if (testSendEmailCC[0] == 'Error') {
                throw new Error(
                    'Could not generate an email notification. At least one email address was not formatted correctly: ' +
                        testSendEmailCC[2] +
                        '. Please contact a System Administrator with this information.'
                );
            }
        }
        //End CC Email selector and validation.

        // Step 5:  Configure communication array
        var targetFields = {};
        targetFields['Communication Type'] = 'Email';
        targetFields['Email Type'] = commLogSendType;
        targetFields['Email Recipients'] = sendEmail;
        targetFields['CC'] = sendEmailCC;
        targetFields['Subject'] = subject;
        targetFields['Email Body'] = body;
        targetFields['Scheduled Date'] = sendDateTime;
        targetFields['Approved'] = 'Yes';
        targetFields['Communication Sent'] = 'Yes';
        targetFields['Communication Type Filter'] = 'Log Previous'; // set the default value to prevent cascades reseting Communication
        targetFields['Form Saved'] = 'true';

        //Load additional fields
        for (var property1 in otherFields) {
            targetFields[property1] = otherFields[property1];
        }

        //Step 6:  Create the new communication log
        let postFormsRespCommLog = await vvClient.forms.postForms(null, targetFields, CommLogTemplateName);
        let postFormsDataCommLog = postFormsRespCommLog.hasOwnProperty('data') ? postFormsRespCommLog.data : null;

        if (postFormsRespCommLog.meta.status !== 201) {
            throw new Error(`An error was encountered when attempting to create the ${CommLogTemplateName} record. 
             (${
                 postFormsRespCommLog.hasOwnProperty('meta')
                     ? postFormsRespCommLog.meta.statusMsg
                     : postFormsRespCommLog.message
             })`);
        }
        if (!postFormsDataCommLog) {
            throw new Error(`Data was not returned when calling postForms.`);
        }

        commLogRecordID = postFormsDataCommLog['instanceName'];
        commLogGUID = postFormsDataCommLog['revisionId'];

        //Step 7: if there are records to relate then relate them to the newly created comm log
        if (Array.isArray(relateToRecord)) {
            for (const RecordID of relateToRecord) {
                let relateResp = await vvClient.forms.relateFormByDocId(commLogGUID, RecordID);
                relateResp = JSON.parse(relateResp);
                if (relateResp.meta.status !== 200 && relateResp.meta.status !== 404) {
                    throw new Error(
                        `There was an error when attempting to relate ${ServiceProviderTypeTemplateID} and ${relatedRecordName}.`
                    );
                }
            }
        }

        const recipients = String(sendEmail).toLowerCase();
        //For each communications log to send:
        //1. Fetch the documents that are related to the communications log
        //2. Send the email message (with documents)

        //Step 8: if there are documents related to the commlog then add them to the email. Ths should not be used as this is an immediate send
        var getRelatedDocsParams = {};
        let relatedDocs = await vvClient.forms.getFormRelatedDocs(commLogGUID, getRelatedDocsParams);
        var docResp = JSON.parse(relatedDocs);
        if (docResp.meta.status !== 200) {
            throw new Error('The call to get related documents for email returned with an error.');
        }
        let docsData = docResp.data;

        //Load the email object.
        var emailObj = {};

        emailObj.recipients = recipients;
        emailObj.ccrecipients = sendEmailCC;
        emailObj.subject = subject;
        emailObj.body = body;
        emailObj.hasAttachments = docsData.length > 0; //boolean
        emailObj.documents = docsData.map((o) => o.id); //array of doc IDs.

        let emailSent = false;

        //Step 9: Send the email
        let emailResp = await vvClient.email.postEmails(null, emailObj);
        if (emailResp.meta.status !== 201) {
            throw new Error('An error occurred while attempting to send the email');
        }

        emailSent = true;

        //Step 10: update the commlog that the communciation was sent and what time it was sent
        if (emailSent) {
            //Load object to update comm log record. Include local timestamp
            var updateObj = {};
            updateObj['Communication Date'] = new Date().toISOString();
            updateObj['Communication Sent'] = 'Yes';

            //Update comm log record to reflect sent
            let updateRecordResp = await vvClient.forms.postFormRevision(
                null,
                updateObj,
                CommLogTemplateName,
                commLogGUID
            );
            if (updateRecordResp.meta.status !== 201) {
                throw new Error('Error updating record ' + locItem['comm Log ID'] + ' after emails were sent.');
            }
        }

        logger.info('Succesfully created the communication log.');
        outputCollection[0] = 'Success';
        outputCollection[1] = 'The communication log has been created.';
        outputCollection[2] = errors;
    } catch (error) {
        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errors}`));
        outputCollection[0] = 'Error';
        outputCollection[1] = `${error.message} ${errors.join(' ')} `;
    } finally {
        response.json(200, outputCollection);
    }
};
