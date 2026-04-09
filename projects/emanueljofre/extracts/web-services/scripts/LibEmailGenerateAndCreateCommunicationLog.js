/**
 * LibEmailGenerateAndCreateCommunicationLog
 * Category: Form
 * Modified: 2022-02-10T16:42:03.967Z by emanuel.jofre@onetree.com
 * Script ID: Script Id: c08f766a-b789-ec11-820f-ce695f5cd0ce
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
// Web Service Libary
// MUST HAVE LIBFORMCREATECOMMUNICATIONLOG uploaded to the outside processes.

var logger = require("../log");
var moment = require("moment");

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

module.exports.main = async function (ffCollection, vvClient, response) {
    /*Script Name:  LibEmailGenerateAndCreateCommunicationLog
     Customer:      VisualVault
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
     Date of Dev:   10/16/2019
     Last Rev Date: 06/25/2021
     Revision Notes:
     10/16/2019 - Michael Rainey: Initial Creation
     12/10/2019 - Kendra Austin: QA.
     01/02/2020 - Michael Rainey - Additional funcionality added.
     01/24/2020 - Michael Rainey - Adjusted token replacement to accept an array instead of an object.
                                 - added passed in email address validation. added comma checking.
     01/29/2020 - Kendra Austin: QA Updates. 
     06/04/2020 - Jason Hatch    - Added mechanism to just send an email instead of creating a communication log and waiting for the system to send.    
     06/25/2021: Agustina Mannise - Update the .then promises chain for async/await.  
     */

    logger.info("Start of the process LibEmailGenerateAndCreateCommunicationLog at " + Date());

    //Configuration Variables
    var emailNotifTemplateName = "Email Notification Template"; //The name of the email notification lookup template.
    var sendWithIncompleteTokens = "Yes"; //Set to 'Yes' if you want to send emails with unreplaced tokens. Otherwise set to 'No'.
    var sendDirect = "Yes"; //This variable is used to send the email from this service instead of waiting for the communication log.

    var sendToDDOne = "Send to a defined list of email addresses"; //Three options in the send to drop-down field on the emailNotifTemplateName template.
    var sendToDDTwo = "Send to recipients based on context";
    var sendToDDThree = "Send to both";

    var sendCCDDOne = "CC a defined list of email addresses"; //Three options in the CC drop-down field on the emailNotifTemplateName template.
    var sendCCDDTwo = "CC recipients based on context";
    var sendCCDDThree = "CC both";

    //End Configuration variables.

    //Script Variables
    var errors = []; //Used to hold errors as they are found, to return together.
    var returnObj = []; //Initialization of the return object

    //End Script Variables

    //Start accept outside variables from calling script and assign them.
    var emailName = ffCollection.getFormFieldByName("Email Name");
    var tokenArray = ffCollection.getFormFieldByName("Tokens");
    var additionaEmailAddress = ffCollection.getFormFieldByName("Email Address");
    var CCadditionaEmailAddress = ffCollection.getFormFieldByName("Email AddressCC");
    var otherFields = ffCollection.getFormFieldByName("OTHERFIELDSTOUPDATE");
    var relateToRecord = ffCollection.getFormFieldByName("RELATETORECORD");
    //End accepted variables from calling script.

    //Function to check a comma-delimited string of email addresses and return a valid list where possible.
    var checkEmailList = function (emailList) {
        var emailValidationCheck =
            /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        var validEmailList = []; //Holds the valid email list
        var invalidEmailList = []; //Holds any invalid email addresses encountered.

        //Split the inputted list into an array, based on commas
        var emailArray = emailList.split(",");

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
            returnArray[0] = "Error";
        } else {
            returnArray[0] = "Success";
        }

        //Always return both lists of emails as comma-delimited lists.
        returnArray[1] = validEmailList.join(",");
        returnArray[2] = invalidEmailList.join(",");

        return returnArray;
    };

    //The following process will be used to facilitate generating the communcation log or sending an email immediately.
    var FacilitateEmail = async function (Recipients, CCRecipients, EmailSubject, EmailBody, RelatetoRecord, OtherFieldstoUpdate, commLogSendType) {
        var returnMsg = [];
        //Need to flag the communication log so it does not sent with the automated process.
        if (sendDirect == "Yes") {
            OtherFieldstoUpdate["Communication Date"] = moment().format("L");
            OtherFieldstoUpdate["Communication Sent"] = "Yes";
        }

        //Start configuring communication array
        var commFields = [
            { name: "COMMUNICATIONTYPE", value: "Email" },
            { name: "EMAILTYPE", value: commLogSendType },
            { name: "RECIPIENTS", value: Recipients },
            { name: "RECIPIENTSCC", value: CCRecipients },
            { name: "SUBJECT", value: EmailSubject },
            { name: "BODY", value: EmailBody },
            { name: "RELATETORECORD", value: RelatetoRecord },
            { name: "SCHEDULEDSENDDATETIME", value: new Date().toISOString() },
            { name: "APPROVEDTOSEND", value: "Yes" },
            { name: "OTHERFIELDSTOUPDATE", value: OtherFieldstoUpdate },
        ];
        //End configuring communication array

        let comResp = await vvClient.scripts.runWebService("LibFormCreateCommunicationLog", commFields);
        //Checking for status 200
        if (comResp.meta.status == 200) {
            //Checking that comResp has data attached to it.
            if (comResp.hasOwnProperty("data")) {
                if (comResp.data[0] == "Success") {
                    if (sendDirect == "Yes") {
                        var emailData = {};
                        emailData.recipients = Recipients;
                        emailData.ccrecipients = CCRecipients;
                        emailData.subject = EmailSubject;
                        emailData.body = EmailBody;

                        var emailParams = "";
                        let emailResp = await vvClient.email.postEmails(emailParams, emailData);
                        if (emailResp.meta.status === 201 && emailResp.data.success == true) {
                            logger.info("Email sent successfully.");
                            returnMsg[0] = "Success";
                            returnMsg[1] = "Email sent successfully.";
                        } else {
                            logger.info("User has been created, but the welcome email was not sent successfully.");
                            // errors.push('User has been created, but the welcome email was not sent successfully.');
                            returnMsg[0] = "Error";
                            returnMsg[1] = "User has been created, but the welcome email was not sent successfully.";
                        }
                    } else {
                        returnMsg[0] = "Success";
                        returnMsg[1] = "User has been created successfully.";
                    }
                } else if (comResp.data[0] == "Error") {
                    // throw new Error("The call to create the communication log returned with an error. " + comResp.data[1]);
                    returnMsg[0] = "Error";
                    returnMsg[1] = "The call to create the communication log returned with an error. " + comResp.data[1];
                } else {
                    // throw new Error("The call to create the communication log returned with an unhandled error.");
                    returnMsg[0] = "Error";
                    returnMsg[1] = "The call to create the communication log returned with an unhandled error.";
                }
            } else {
                // throw new Error("The data could not be returned from the global script LibFormCreateCommicationLog.");
                returnMsg[0] = "Error";
                returnMsg[1] = "The data could not be returned from the global script LibFormCreateCommicationLog.";
            }
        } else {
            // throw new Error("The call to LibFormCreateCommicationLog returned with an error.");
            returnMsg[0] = "Error";
            returnMsg[1] = "The call to LibFormCreateCommicationLog returned with an error.";
        }

        return returnMsg;
    };

    //Start the promise chain
    try {
        if (!emailName || !emailName.value) {
            errors.push("The Email Name parameter was not supplied.");
        } else {
            emailName = emailName.value;
            var emailNameCleaned = emailName.replace(/'/g, "\\'");
        }
        if (!tokenArray || !tokenArray.value) {
            errors.push("The Tokens parameter was not supplied.");
        } else {
            tokenArray = tokenArray.value;
        }

        //OTHERFIELDSTOUPDATE parameter is not required. If not passed in, set to empty object.
        if (!otherFields || !otherFields.value) {
            otherFields = {};
        } else {
            otherFields = otherFields.value;
        }

        //RELATETORECORD parameter is not required. If not passed in, set to empty array.
        if (!relateToRecord || !relateToRecord.value) {
            relateToRecord = [];
        } else {
            relateToRecord = relateToRecord.value;
        }

        //Email Address parameter is not required. If not passed in, set to empty string.
        if (!additionaEmailAddress || !additionaEmailAddress.value) {
            additionaEmailAddress = "";
        } else {
            additionaEmailAddress = additionaEmailAddress.value;
        }

        //CC Email Address parameter is not required. If not passed in, set to empty string.
        if (!CCadditionaEmailAddress || !CCadditionaEmailAddress.value) {
            CCadditionaEmailAddress = "";
        } else {
            CCadditionaEmailAddress = CCadditionaEmailAddress.value;
        }

        //If any parameters passed into the library are missing, throw and error with the message and stop.
        if (errors.length > 0) {
            throw new Error(errors);
        }

        var formQuery = {};
        formQuery.q = "[Email Name] eq '" + emailNameCleaned + "'";
        formQuery.expand = true;
        let emailTemplateObj = await vvClient.forms.getForms(formQuery, emailNotifTemplateName);

        emailTemplateObj = JSON.parse(emailTemplateObj);
        if (emailTemplateObj.meta.status == 200) {
            if (emailTemplateObj.data.length == 1) {
                //Start pull in data from the email template form.
                var sendToSelector = emailTemplateObj.data[0]["send To Selector"];
                var sendCCSelector = emailTemplateObj.data[0]["send CC Selector"];
                var commLogSendType = emailTemplateObj.data[0]["send Select"];
                var subject = emailTemplateObj.data[0]["subject Line"];
                var body = emailTemplateObj.data[0]["body Text"];
                var sendToEmails = emailTemplateObj.data[0]["send To"];
                var ccToEmails = emailTemplateObj.data[0]["send CC"];
                //End pull in data from the email template form.

                //Start replacing tokens in body
                tokenArray.forEach(function (tokenItem) {
                    var tokenName = tokenItem.name;
                    var tokenData = tokenItem.value;
                    body = body.split(tokenName).join(tokenData);
                    subject = subject.split(tokenName).join(tokenData);
                });
                //End replacing tokens in body.

                //Start search for unreplaced tokens.
                var badTokenList = [];
                var tokenCheck = body.split(/(\[(.*?)\])/);
                tokenCheck.push.apply(tokenCheck, subject.split(/(\[(.*?)\])/));
                tokenCheck.forEach(function (unreplacedToken) {
                    if (unreplacedToken.charAt(0) == "[" && unreplacedToken.slice(-1) == "]") {
                        badTokenList.push(unreplacedToken);
                    }
                });

                //If any unreplaced tokens found, throw or push error as appropriate based on configurable setting.
                if (badTokenList.length > 0) {
                    var unreplacedTokens = badTokenList.join(", ");
                    if (sendWithIncompleteTokens == "Yes") {
                        errors.push(
                            "One or more tokens were not replaced in the generated notification. The tokens are: " +
                                unreplacedTokens +
                                ". The communication log has been created."
                        );
                    } else {
                        throw new Error(
                            "Please contact a System Administrator with this information. One or more tokens have not been replaced. The tokens are : " +
                                unreplacedTokens
                        );
                    }
                }
                //End checking body for unreplaced tokens

                //Start Send to Email selector and validation.
                var sendEmail = "";
                switch (sendToSelector) {
                    case sendToDDOne: //Defined List
                        sendEmail = sendToEmails;
                        break;
                    case sendToDDTwo: //Context
                        sendEmail = additionaEmailAddress;
                        break;
                    case sendToDDThree: //Both
                        sendEmail = sendToEmails + "," + additionaEmailAddress;
                        break;
                    case "Select Item":
                        sendEmail = sendToEmails + "," + additionaEmailAddress;
                        break;
                }

                sendEmail = sendEmail.trim();
                if (!sendEmail) {
                    throw new Error("No Email Address has been supplied. Please contact a System Administrator with this information.");
                } else {
                    //Centralized checking for bad emails.
                    var testSendEmail = checkEmailList(sendEmail);
                    if (testSendEmail[0] == "Success") {
                        sendEmail = testSendEmail[1];
                    } else if (testSendEmail[0] == "Error") {
                        throw new Error(
                            "Could not generate an email notification. At least one email address was not formatted correctly: " +
                                testSendEmail[2] +
                                ". Please contact a System Administrator with this information."
                        );
                    }
                }
                //End Send to Email selector and validation.

                //Start CC Email selector and validation.
                var sendEmailCC = "";
                switch (sendCCSelector) {
                    case sendCCDDOne: //Defined List
                        sendEmailCC = ccToEmails;
                        break;
                    case sendCCDDTwo: //Context
                        sendEmailCC = CCadditionaEmailAddress;
                        break;
                    case sendCCDDThree: //Both
                        sendEmailCC = ccToEmails + "," + CCadditionaEmailAddress;
                        break;
                    case "Select Item":
                        sendEmailCC = ccToEmails + "," + CCadditionaEmailAddress;
                        break;
                }

                sendEmailCC = sendEmailCC.trim();
                if (sendEmailCC) {
                    //Centralized checking for bad emails.
                    var testSendEmailCC = checkEmailList(sendEmailCC);
                    if (testSendEmailCC[0] == "Success") {
                        sendEmailCC = testSendEmailCC[1];
                    } else if (testSendEmailCC[0] == "Error") {
                        throw new Error(
                            "Could not generate an email notification. At least one email address was not formatted correctly: " +
                                testSendEmailCC[2] +
                                ". Please contact a System Administrator with this information."
                        );
                    }
                }
                //End CC Email selector and validation.

                //Facilitate creating a communication log or sending email.
                var comResp = await FacilitateEmail(sendEmail, sendEmailCC, subject, body, relateToRecord, otherFields, commLogSendType);
            } else {
                throw new Error(
                    emailTemplateObj.data.length +
                        " email template(s) were found with the email name of " +
                        emailName +
                        ". Review the email name to ensure only one record is referenced. Please contact a System Administrator with this information."
                );
            }
        } else {
            throw new Error(
                "There was an error when attempting to retrieve the email notification template. Please contact a System Administrator with this information. " +
                    emailTemplateObj.meta.statusMsg
            );
        }

        //Checking for status 200
        if (comResp[0] == "Success") {
            logger.info("Succesfully created the communication log.");
            returnObj[0] = "Success";
            returnObj[1] = comResp[1];
            returnObj[2] = errors;
            return response.json(returnObj);
        } else {
            throw new Error(comResp[1]);
        }
    } catch (err) {
        logger.info(JSON.stringify(err));
        returnObj[0] = "Error";
        if (err && err.message) {
            returnObj[1] = err.message;
            returnObj[2] = errors;
        } else {
            returnObj[1] = "An unhandled error has occurred. The message returned was: " + err;
            returnObj[2] = errors;
        }
        return response.json(returnObj);
    }
};

