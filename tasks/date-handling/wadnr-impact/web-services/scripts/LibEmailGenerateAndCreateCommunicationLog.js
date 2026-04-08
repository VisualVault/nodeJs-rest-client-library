/**
 * LibEmailGenerateAndCreateCommunicationLog
 * Category: Form
 * Modified: 2025-11-21T13:38:50.603Z by nicolas.culini@visualvault.com
 * Script ID: Script Id: b900d501-c390-ef11-82ae-862bfd7a22f1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
// Web Service Libary
// MUST HAVE LIBFORMCREATECOMMUNICATIONLOG uploaded to the outside processes.
const logger = require('../log');
const dayjs = require('dayjs');

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
    /*Script Name:  LibEmailGenerateAndCreateCommunicationLog
       Customer:      VisualVault, WADNR, etc.
       Purpose:       The purpose of this script is to simplify the email creation and editing process.
                          IMPORTANT NOTE: This script calls the web service LibFormCreateCommunicationLog. That script must be configured before this one will run.
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
                      -SendDateTime (string, optional) If a specifc time needs to be set when the email should occur, then this should be passed from the calling script as a dayjs().toISOString() with any date/time manipulations needed.
                                              This script will validate the date passed in.  If nothing is passed in, then the current date and time will be used.
  
       Pseudocode:    1.  Accept data from calling webscript.
                      2.  Validate data recieved from calling webscript.
                      3.  Query to find the correct email form template.
                      4.  Replace tokens in body of email with token values from the calling webscript.
                      5.  Determine if any tokens remain unreplaced. Config variable determines if an error should be thrown. 
                      6.  Set the Send To email address to the correct value depending on the drop-down selection on the form.
                      7.  Validate the Send To email addresses.
                      8.  Set the CC email address to the correct value depending on the drop-down selection on the form.
                      9. Validate the CC email addresses.
                      10. Create and populate the communication array to be sent to the LibFormCreateCommunicationLog.
                      11. Measure the response and error checking.
       Return Array:  The following represents the array of information returned to the calling function.  This is a standardized response.
                      Any item in the array at points 2 or above can be used to return multiple items of information.
                      0 - Status: Success, Error
                      1 - Message
                      2 - Any unreplaced tokens in the generated email notification.
       Date of Dev:   10/22/2024
       Last Rev Date: 10/22/2024
       Revision Notes:
       10/22/2024 - Brian Davis: Initial Creation
       */

    logger.info('Start of the process LibEmailGenerateAndCreateCommunicationLog at ' + Date());

    //Configuration Variables
    var emailNotifTemplateName = 'Email Template'; //The name of the Email Template template.
    var sendWithIncompleteTokens = 'Yes'; //Set to 'Yes' if you want to send emails with unreplaced tokens. Otherwise set to 'No'.

    var sendToDDOne = 'Send to a defined list of email addresses'; //Three options in the send to drop-down field on the emailNotifTemplateName template.
    var sendToDDTwo = 'Send to recipients based on context';
    var sendToDDThree = 'Send to both';

    var sendCCDDOne = 'CC a defined list of email addresses'; //Three options in the CC drop-down field on the emailNotifTemplateName template.
    var sendCCDDTwo = 'CC to recipients based on context';
    var sendCCDDThree = 'CC both';

    const missingFieldGuidance = 'Please provide a value for the missing field(s).';

    //End Configuration variables.

    //Script Variables
    var errorLog = []; //Used to hold errors as they are found, to return together.
    var badTokenList = [];
    let emailTemplateSearch = '';

    //Initialization of the return object
    var outputCollection = [];

    //End Script Variables

    try {
        /*********************
    Form Record Variables
    **********************/
        let emailName = getFieldValueByName('Email Name');
        let tokenArray = getFieldValueByName('Tokens');
        let additionalEmailAddress = getFieldValueByName('Email Address', 'true') || '';
        let CCadditionalEmailAddress = getFieldValueByName('Email AddressCC', 'true') || '';
        let otherFields = getFieldValueByName('OTHERFIELDSTOUPDATE', 'true');
        let relateToRecord = getFieldValueByName('RELATETORECORD', 'true');
        let sendDateTime = getFieldValueByName('SendDateTime', 'true');

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        if (otherFields.hasOwnProperty('Sent/Recorded By')) {
            if (otherFields['Sent/Recorded By'] === '') otherFields['Sent/Recorded By'] = 'PAELS.api';
        } else {
            if (otherFields['Sent/Recorded By'] === '') otherFields['Sent/Recorded By'] = 'PAELS.api';
        }

        /****************
     Helper Functions
    *****************/
        function getFieldValueByName(fieldName, isOptional = false) {
            /*
      Check if a field was passed in the request and get its value
      Parameters:
          fieldName: The name of the field to be checked
          isOptional: If the field is required or not
      */

            try {
                const field = ffCollection.getFormFieldByName(fieldName);
                const requiredFieldDoesntExists = !isOptional && !field;

                if (requiredFieldDoesntExists) {
                    throw new Error(`The field '${fieldName}' was not found.`);
                }

                if (field) {
                    let fieldValue = 'value' in field ? field.value : null;
                    fieldValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;
                    const requiredFieldHasNoValue = !fieldValue && typeof fieldValue !== 'number' && !isOptional;
                    const ddSelectItem = fieldValue == 'Select Item';

                    if (requiredFieldHasNoValue || ddSelectItem) {
                        throw new Error(`The value property for the field '${fieldName}' was not found or is empty.`);
                    }

                    return fieldValue;
                }
            } catch (error) {
                errorLog.push(error.message);
            }
        }

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
            const sendDateTimeObject = dayjs(sendDateTime);
            if (sendDateTimeObject.isValid()) {
                sendDateTime = sendDateTimeObject.toISOString();
            } else {
                throw new Error(
                    'The send date and time are not in the correct format. Please pass in a string in ISO 8601 format.'
                );
            }
        }

        // Step 1.  Perform a getforms on the current form to get the GUID.

        emailTemplateSearch = `[Email Name] eq '${emailNameCleaned}'`;

        let queryParams = {
            q: emailTemplateSearch,
            expand: true,
        };

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

        let emailTemplateObj = getFormsData[0];

        //Start pull in data from the email template form.
        var sendToSelector = emailTemplateObj['send To Selector'];
        var sendCCSelector = emailTemplateObj['send CC Selector'];
        var commLogSendType = emailTemplateObj['send Select'];
        var subject = emailTemplateObj['subject Line'];
        var body = emailTemplateObj['body Text'];
        var sendToEmails = emailTemplateObj['send To'];
        var ccToEmails = emailTemplateObj['send CC'];
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
                errorLog.push(
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
                sendEmail = additionalEmailAddress;
                break;
            case sendToDDThree: //Both
                sendEmail = sendToEmails + ',' + additionalEmailAddress;
                break;
            default:
                sendEmail = sendToEmails + ',' + additionalEmailAddress;
                break;
        }

        sendEmail = sendEmail.trim();
        if (!sendEmail) {
            throw new Error(
                'No Email Address has been supplied. Please contact a System Administrator with this information.'
            );
        } else {
            //Centralized checking for bad emails.
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
                sendEmailCC = CCadditionalEmailAddress;
                break;
            case sendCCDDThree: //Both
                sendEmailCC = ccToEmails + ',' + CCadditionalEmailAddress;
                break;
            default:
                sendEmailCC = ccToEmails + ',' + CCadditionalEmailAddress;
                break;
        }

        sendEmailCC = sendEmailCC.trim();
        if (sendEmailCC) {
            //Centralized checking for bad emails.
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

        //Start configuring communication array
        var commFields = [
            { name: 'COMMUNICATIONTYPE', value: 'Email' },
            { name: 'EMAILTYPE', value: commLogSendType },
            { name: 'RECIPIENTS', value: sendEmail },
            { name: 'RECIPIENTSCC', value: sendEmailCC },
            { name: 'SUBJECT', value: subject },
            { name: 'BODY', value: body },
            { name: 'RELATETORECORD', value: relateToRecord },
            { name: 'SCHEDULEDSENDDATETIME', value: sendDateTime },
            { name: 'APPROVEDTOSEND', value: 'Yes' },
            { name: 'OTHERFIELDSTOUPDATE', value: otherFields },
        ];
        //End configuring communication array

        let postFormsCommLog = await vvClient.scripts.runWebService('LibFormCreateCommunicationLog', commFields);

        let postFormsCommData = postFormsCommLog.hasOwnProperty('data') ? postFormsCommLog.data : null;
        if (postFormsCommLog.meta.status !== 200) {
            throw new Error(`An error was encountered when attempting to create the Communication Log record. 
            (${postFormsCommLog.hasOwnProperty('meta') ? postFormsCommLog.meta.statusMsg : postFormsCommLog.message})`);
        }
        if (!postFormsCommData) {
            throw new Error(`Data was not returned when calling postForms.`);
        }

        if (postFormsCommData[0] == 'Success') {
            logger.info('Succesfully created the communication log.');
            outputCollection[0] = 'Success';
            outputCollection[1] = 'The communication log has been created.';
            outputCollection[2] = errorLog;
            outputCollection[3] = postFormsCommData;
        } else if (postFormsCommData[0] == 'Error') {
            throw new Error('The call to create the communication log returned with an error. ' + postFormsCommData[1]);
        } else {
            throw new Error('The call to create the communication log returned with an unhandled error.');
        }
    } catch (error) {
        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = 'Error';
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
    } finally {
        response.json(200, outputCollection);
    }
};
