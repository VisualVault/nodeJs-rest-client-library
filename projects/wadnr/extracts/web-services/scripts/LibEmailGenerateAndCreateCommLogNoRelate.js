/**
 * LibEmailGenerateAndCreateCommLogNoRelate
 * Category: Workflow
 * Modified: 2026-02-13T21:06:24.087Z by ross.rhone@visualvault.com
 * Script ID: Script Id: 1da4558b-1b09-f111-8317-8bdb756ea687
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
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
    /*Script Name:   LibEmailSendAndCreateCommLog_NoRelate
  Customer:      VisualVault, WADNR, etc.
  Purpose:       Sends an email (Immediate Send) and creates a Communications Log record.
                 IMPORTANT: This script does NOT relate the Comm Log to any form.
                 This is intended for system/service notifications where no “primary form” exists.

  Inputs (Form Fields expected in ffCollection):
    - Email Name (string, Required)
        Must match a single record in the "Email Template" form.
    - Tokens (array<object>, Optional)
        Example: [{ name: "[First Name]", value: "Ross" }, { name: "[Permit]", value: "SE-FPA-26-4260" }]
    - Email Address (string, Optional)
        Comma-separated. Used when template uses context or both.
    - Email AddressCC (string, Optional)
        Comma-separated. Used when template uses context or both.
    - OTHERFIELDSTOUPDATE (object, Optional)
        Extra fields to update on the Comm Log record.
        Example: {"Sent/Recorded By":"PAELS.api","Primary Record ID":"N/A"}

    - SendDateTime (string, Optional)
        ISO 8601 string. If omitted, uses now.

  Config:
    - emailNotifTemplateName: "Email Template"
    - communicationLogTemplateID: "Communications Log"

  Return Array:
    0 - Status: "Success" | "Error"
    1 - Message
    2 - Minor warnings array (e.g., unreplaced tokens)
    3 - Comm Log Form ID (instanceName)
    4 - Comm Log Revision ID

  Notes:
    - This script assumes the Email Template has fields like:
        "send To Selector", "send CC Selector", "send Select", "subject Line", "body Text", "send To", "send CC"
    - This script creates the Comm Log and sets Approved="Yes" and Communication Sent="No"
      (your downstream process can send it if you have a sender job).
*/

    logger.info('Start of LibEmailSendAndCreateCommLog_NoRelate at ' + Date());

    // -------------------- Configuration --------------------
    var emailNotifTemplateName = 'Email Template';
    var communicationLogTemplateID = 'Communications Log';

    var sendWithIncompleteTokens = 'Yes'; // 'Yes' => allow, but warn; 'No' => hard fail

    var sendToDDOne = 'Send to a defined list of email addresses';
    var sendToDDTwo = 'Send to recipients based on context';
    var sendToDDThree = 'Send to both';

    var sendCCDDOne = 'CC a defined list of email addresses';
    var sendCCDDTwo = 'CC to recipients based on context';
    var sendCCDDThree = 'CC both';

    const missingFieldGuidance = 'Please provide a value for the missing field(s).';
    // ------------------------------------------------------

    // Script Variables
    var errorLog = []; // hard/soft errors collected
    var warnings = []; // non-fatal warnings to return
    var badTokenList = []; // unreplaced tokens
    var outputCollection = [];

    /****************
   Helper Functions
  *****************/

    function getFieldValueByName(fieldName, isOptional = false) {
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

    // Comma-delimited email validation
    function checkEmailList(emailList) {
        var emailValidationCheck =
            /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        var validEmailList = [];
        var invalidEmailList = [];

        var emailArray = String(emailList || '').split(',');

        emailArray.forEach(function (email) {
            email = String(email || '').trim();
            if (email.length > 0) {
                if (!emailValidationCheck.test(email)) invalidEmailList.push(email);
                else validEmailList.push(email);
            }
        });

        var returnArray = [];
        returnArray[0] = invalidEmailList.length > 0 ? 'Error' : 'Success';
        returnArray[1] = validEmailList.join(',');
        returnArray[2] = invalidEmailList.join(',');
        return returnArray;
    }

    function replaceTokens(text, tokens) {
        let out = String(text || '');
        (tokens || []).forEach(function (tokenItem) {
            if (!tokenItem) return;
            var tokenName = tokenItem.name;
            var tokenData = tokenItem.value;
            if (typeof tokenName !== 'string') return;
            out = out.split(tokenName).join(tokenData == null ? '' : String(tokenData));
        });
        return out;
    }

    function findUnreplacedTokens(text) {
        var list = [];
        var parts = String(text || '').split(/(\[(.*?)\])/);
        parts.forEach(function (piece) {
            if (piece && piece.charAt(0) === '[' && piece.slice(-1) === ']') list.push(piece);
        });
        return list;
    }

    try {
        /* -------------------------------------------------------------------------- */
        /*                                  MAIN CODE                                 */
        /* -------------------------------------------------------------------------- */

        /*********************
   Read Inputs
  **********************/

        /*
   // ---------------------------------------------------------
// Hardcoded TEST DATA for LibEmailSendAndCreateCommLog_NoRelate
// ---------------------------------------------------------

// Email Template (hardcoded)
const emailTemplateTest = {
  "email Name": "Scheduled Service - SendUpdatedDateToPendingDataForm",
  "send To": "ross.rhone@visualvault.com",
  "send CC": "ross.rhone@visaulvault.com", // (typo preserved from your example)
};

// Tokens (hardcoded)
const tokensTest = [
  {
    name: "message",
    value:
      "Error: One or more queries failed. See summary for details. .Failed during GIS_Get24h_FPAN Record Change Request.Failed to query updated data for dev AGOL tables",
  },
  { name: "environment", value: "dev" },
  { name: "failedAtTitle", value: "FPAN Record Change Request" },
  { name: "failedAtQuery", value: "GIS_Get24h_FPAN Record Change Request" },
  {
    name: "succeeded",
    value: `[
  { "title": "PendingDataForAGOL", "cqName": "GIS_GetCount24_PendingDataForAGOL" },
  { "title": "FPAN Renewal", "cqName": "GIS_GetCount24_FPAN Renewal" },
  { "title": "Appendix A Water Type Classification", "cqName": "GIS_GetCount24_Apdx A Water Type Classification" },
  { "title": "S or F Waters", "cqName": "GIS_GetCount24_S or F Waters" },
  { "title": "Notice to Comply", "cqName": "GIS_GetCount24_Notice to Comply" },
  { "title": "Legal Description", "cqName": "GIS_GetCount24_Legal Description" },
  { "title": "Forest Practices Application Notification", "cqName": "GIS_GetCount24_For Prac Application Notification" },
  { "title": "Forest Roads", "cqName": "GIS_GetCount24_For Roads" },
  { "title": "Water Crossings", "cqName": "GIS_GetCount24_Water Crossings" },
  { "title": "ActivityMapView", "cqName": "GIS_GetCount24_ActivityMapView" },
  { "title": "PDF Package Generation", "cqName": "GIS_GetCount24_PDF Package Generation" },
  { "title": "Contact Information Relation", "cqName": "GIS_GetCount24_Contact Information Relation" },
  { "title": "Informal Conference Note", "cqName": "GIS_GetCount24_Informal Conference Note" },
  { "title": "Stream Segment", "cqName": "GIS_GetCount24_Stream Segment" },
  { "title": "Field Representative", "cqName": "GIS_GetCount24_Field Representative" },
  { "title": "Application Review Page", "cqName": "GIS_GetCount24_Application Review Page" },
  { "title": "Notice of Conversion to Non Forestry Use", "cqName": "GIS_GetCount24_Notice of Conversion to Non Forry Use" },
  { "title": "Timber", "cqName": "GIS_GetCount24_Timber" },
  { "title": "FPAN Amendment Request", "cqName": "GIS_GetCount24_FPAN Amendment Request" },
  { "title": "Associated Document Relation", "cqName": "GIS_GetCount24_Associated Document Relation" },
  { "title": "Forest Tax Number", "cqName": "GIS_GetCount24_For Tax Number" },
  { "title": "Typed Water", "cqName": "GIS_GetCount24_Typed Water" },
  { "title": "Email Template", "cqName": "GIS_GetCount24_Email Template" },
  { "title": "Communications Log", "cqName": "GIS_GetCount24_Communications Log" },
  { "title": "Notice of Continuing Forest Land Obligation", "cqName": "GIS_GetCount24_Notice of Continuing For Land Obligation" },
  { "title": "Appendix D Slope Stability Informational", "cqName": "GIS_GetCount24_Apdx D Slope Stability Informational" },
  { "title": "Status History", "cqName": "GIS_GetCount24_Status History" },
  { "title": "Water Type Modification Form", "cqName": "GIS_GetCount24_Water Type Modification Form" },
  { "title": "Appendix J Forest Practices Marbled Murrelet", "cqName": "GIS_GetCount24_Apdx J For Prac Marbled Murrelet" }
]`,
  },
  {
    name: "skipped",
    value: `[
  { "title": "ICN Participants", "cqName": "GIS_GetCount24_ICN Participants", "reason": "No records returned" },
  { "title": "IFPL Shutdown Zone", "cqName": "GIS_GetCount24_IFPL Shutdown Zone", "reason": "No records returned" },
  { "title": "Task", "cqName": "GIS_GetCount24_Task", "reason": "No records returned" }
]`,
  },
  {
    name: "failed",
    value: `[
  {
    "title": "Forest Practices Aerial Chemical Application",
    "cqName": "GIS_GetCount24_For Prac Aerial Chemical Application",
    "index": 27,
    "error": "AGOLSendUpdatedDataToPendingDataForm: Custom Query using filter parameter for backward compatibility error. Status: 400. Reason: Custom Query Error"
  },
  {
    "title": "FPAN Notice of Transfer",
    "cqName": "GIS_GetCount24_FPAN Notice of Transfer",
    "index": 50,
    "error": "AGOLSendUpdatedDataToPendingDataForm: Custom Query using filter parameter for backward compatibility error. Status: 400. Reason: Custom Query Error"
  },
  {
    "title": "Step 1 Long Term FPA",
    "cqName": "GIS_GetCount24_Step 1 Long Term FPA",
    "index": 68,
    "error": "AGOLSendUpdatedDataToPendingDataForm: Custom Query using filter parameter for backward compatibility error. Status: 400. Reason: Custom Query Error"
  }
]`,
  },
];

// Other fields (hardcoded)
const otherFieldsTest = {
  "Sent/Recorded By": "PAELS.api",
  "Primary Record ID": "N/A",
  "Status": "Failed",
}; */

        // ---------------------------------------------------------
        // Build request array (NO RELATETORECORD)
        // ---------------------------------------------------------

        // Example call:
        // const resp = await vvClient.scripts.runWebService("LibEmailSendAndCreateCommLog_NoRelate", emailRequestArr);
        // console.log(resp);

        //let emailName = emailTemplateTest["email Name"]
        //let tokenArray = tokensTest
        //let additionalEmailAddress = emailTemplateTest["send To"]
        //let CCadditionalEmailAddress = emailTemplateTest["send CC"]

        let emailName = getFieldValueByName('Email Name');
        let tokenArray = getFieldValueByName('Tokens', true) || [];
        let additionalEmailAddress = getFieldValueByName('Email Address', true) || '';
        let CCadditionalEmailAddress = getFieldValueByName('Email AddressCC', true) || '';
        let otherFields = getFieldValueByName('OTHERFIELDSTOUPDATE', true) || {};
        let sendDateTime = getFieldValueByName('SendDateTime', true);

        // Required-field failures collected in errorLog
        if (errorLog.length > 0) {
            throw new Error(missingFieldGuidance);
        }

        // Ensure otherFields is an object
        if (!otherFields || typeof otherFields !== 'object') otherFields = {};

        // Default Sent/Recorded By if present or missing
        if (
            !Object.prototype.hasOwnProperty.call(otherFields, 'Sent/Recorded By') ||
            otherFields['Sent/Recorded By'] === ''
        ) {
            otherFields['Sent/Recorded By'] = 'PAELS.api';
        }

        // Normalize sendDateTime
        if (!sendDateTime) {
            sendDateTime = dayjs().toISOString();
        } else {
            const sendDateTimeObject = dayjs(sendDateTime);
            if (sendDateTimeObject.isValid()) sendDateTime = sendDateTimeObject.toISOString();
            else {
                throw new Error(
                    'The send date and time are not in the correct format. Please pass in a string in ISO 8601 format.'
                );
            }
        }

        /*********************
   Load Email Template
  **********************/
        let emailNameCleaned = String(emailName || '').replace(/'/g, "\\'");

        let queryParams = { q: `[Email Name] eq '${emailNameCleaned}'`, expand: true };

        let getFormsResp = await vvClient.forms.getForms(queryParams, emailNotifTemplateName);
        getFormsResp = JSON.parse(getFormsResp);

        let getFormsData = getFormsResp && getFormsResp.data ? getFormsResp.data : null;
        let getFormsLength = Array.isArray(getFormsData) ? getFormsData.length : 0;

        if (getFormsResp.meta.status !== 200) {
            throw new Error(
                'There was an error when attempting to retrieve the email notification template. Please contact a System Administrator. ' +
                    (getFormsResp.meta ? getFormsResp.meta.statusMsg : '')
            );
        }
        if (!getFormsData || !Array.isArray(getFormsData)) {
            throw new Error('Data was not returned when calling getForms.');
        }
        if (getFormsLength !== 1) {
            throw new Error(
                `${getFormsLength} email template(s) were found with the email name of ${emailName}. Review the email name to ensure only one record is referenced.`
            );
        }

        let emailTemplateObj = getFormsData[0];

        // Template fields
        var sendToSelector = emailTemplateObj['send To Selector'];
        var sendCCSelector = emailTemplateObj['send CC Selector'];
        var commLogSendType = emailTemplateObj['send Select']; // used as Email Type on comm log
        var subject = emailTemplateObj['subject Line'];
        var body = emailTemplateObj['body Text'];
        var sendToEmails = emailTemplateObj['send To'];
        var ccToEmails = emailTemplateObj['send CC'];

        /*********************
   Token Replacement
  **********************/
        body = replaceTokens(body, tokenArray);
        subject = replaceTokens(subject, tokenArray);

        // Unreplaced tokens check
        badTokenList = findUnreplacedTokens(body).concat(findUnreplacedTokens(subject));
        if (badTokenList.length > 0) {
            var unreplacedTokens = Array.from(new Set(badTokenList)).join(', ');
            if (sendWithIncompleteTokens === 'Yes') {
                warnings.push(
                    'One or more tokens were not replaced in the generated notification. Tokens: ' + unreplacedTokens
                );
            } else {
                throw new Error('One or more tokens have not been replaced. Tokens: ' + unreplacedTokens);
            }
        }

        /*********************
   Resolve Recipients
  **********************/
        var sendEmail = '';
        switch (sendToSelector) {
            case sendToDDOne:
                sendEmail = sendToEmails;
                break;
            case sendToDDTwo:
                sendEmail = additionalEmailAddress;
                break;
            case sendToDDThree:
                sendEmail = (sendToEmails || '') + ',' + (additionalEmailAddress || '');
                break;
            default:
                sendEmail = (sendToEmails || '') + ',' + (additionalEmailAddress || '');
                break;
        }

        sendEmail = String(sendEmail || '').trim();
        if (!sendEmail) {
            throw new Error('No Email Address has been supplied.');
        }
        var testSendEmail = checkEmailList(sendEmail);
        if (testSendEmail[0] === 'Success') {
            sendEmail = testSendEmail[1];
        } else {
            throw new Error('At least one email address was not formatted correctly: ' + testSendEmail[2]);
        }

        var sendEmailCC = '';
        switch (sendCCSelector) {
            case sendCCDDOne:
                sendEmailCC = ccToEmails;
                break;
            case sendCCDDTwo:
                sendEmailCC = CCadditionalEmailAddress;
                break;
            case sendCCDDThree:
                sendEmailCC = (ccToEmails || '') + ',' + (CCadditionalEmailAddress || '');
                break;
            default:
                sendEmailCC = (ccToEmails || '') + ',' + (CCadditionalEmailAddress || '');
                break;
        }

        sendEmailCC = String(sendEmailCC || '').trim();
        if (sendEmailCC) {
            var testSendEmailCC = checkEmailList(sendEmailCC);
            if (testSendEmailCC[0] === 'Success') {
                sendEmailCC = testSendEmailCC[1];
            } else {
                throw new Error('At least one CC email address was not formatted correctly: ' + testSendEmailCC[2]);
            }
        }

        /*********************
   Create Comm Log (NO RELATE)
  **********************/
        // Force "Email Type" to be Immediate Send (per your requirement “only option of sending an email”)
        // If your downstream expects exactly "Immediate Send", enforce it here:
        var emailTypeForCommLog = 'Immediate Send';

        var targetFields = {};
        targetFields['Communication Type'] = 'Email';
        targetFields['Email Type'] = emailTypeForCommLog;
        targetFields['Email Recipients'] = sendEmail;
        targetFields['CC'] = sendEmailCC;
        targetFields['Subject'] = subject;
        targetFields['Email Body'] = body;
        targetFields['Scheduled Date'] = sendDateTime;
        targetFields['Approved'] = 'Yes';
        targetFields['Communication Sent'] = 'No';
        targetFields['Communication Date'] = new Date().toISOString();
        targetFields['Form Saved'] = 'true';
        targetFields['Communication Type Filter'] = 'Log Previous';

        // Apply additional fields
        for (var k in otherFields) {
            if (Object.prototype.hasOwnProperty.call(otherFields, k)) {
                targetFields[k] = otherFields[k];
            }
        }

        let postResp = await vvClient.forms.postForms(null, targetFields, communicationLogTemplateID);

        if (!(postResp && postResp.meta && (postResp.meta.status === 201 || postResp.meta.status === 200))) {
            throw new Error(
                'Call to post new Communications Log returned with an error. Server returned status: ' +
                    (postResp && postResp.meta ? postResp.meta.status : 'Unknown')
            );
        }

        let commLogRevisionId = postResp.data.revisionId;
        let commLogFormId = postResp.data.instanceName;

        // Return success
        outputCollection[0] = 'Success';
        outputCollection[1] = 'Email queued and communication log created (no relate).';
        outputCollection[2] = warnings;
        outputCollection[3] = commLogFormId;
        outputCollection[4] = commLogRevisionId;
    } catch (error) {
        logger.info('LibEmailSendAndCreateCommLog_NoRelate : ' + JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = 'Error';
        outputCollection[1] = `${error.message} ${errorLog.join(' ')}`.trim();
        outputCollection[2] = [];
        outputCollection[3] = null;
        outputCollection[4] = null;
    } finally {
        response.json(200, outputCollection);
    }
};
