/**
 * LibWTMFNotifyWithdrawal
 * Category: Workflow
 * Modified: 2026-04-07T21:34:04.093Z by federico.cuelho@visualvault.com
 * Script ID: Script Id: 3a0f9796-b9ad-f011-82f2-ac04d8d0fca0
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
    /*
    Script Name:    LibWTMFNotifyWithdrawal
    Customer:       WADNR
    Purpose:        The purpose of this process is to notify the Proponents, Landowners, Surveyors, Foresters and External Reviewers
                    when the WTMF is withdrawn
    Preconditions:
                    -
    Parameters:
                    - Form ID: String
                    - Related Record ID: String (Form ID of the WTMF record related to the WTM Review Page)
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code:
                    1° Receive parameters
                    2° Check if required parameters are present
                    3° Retrieve contact information for each Proponent, Landowner, Surveyor, Forester and External Reviewer associated
                    4° Create Communication Logs and send email notifications
                    5° Update notification flag
                    6° Build the success response array

    Date of Dev:    10/17/2025
    Last Rev Date:  04/07/2026

    Revision Notes:
                    10/17/2025 - Lucas Herrera:  First Setup of the script
                    02/19/2026 - Alfredo Scilabra: Added support for primary record ID
                    04/07/2026 - Federico Cuelho: Add Forester to the notification list.
                    04/07/2026 - Federico Cuelho: Refactor code and update helper functions for better readability.
    */

    logger.info(`Start of the process LibWTMFNotifyWithdrawal at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // Response array
    let outputCollection = [];
    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const EMAIL_TEMPLATE_NAME = 'WTMF Withdrawal Notification';
    const contactInformationRelationTemplateName = 'Contact Information Relation';
    const contactInformationTemplateName = 'Contact Information';
    const wtmReviewPageTemplateName = 'WTM Review Page';
    const positionMgmtTemplateName = 'Position Management';

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

    function getFieldValueByName(fieldName, isOptional = false) {
        /*
        Check if a field was passed in the request and get its value
        Parameters:
            fieldName: The name of the field to be checked
            isOptional: If the field is required or not
        */
        let fieldValue = ''; // Default value

        try {
            const field = ffCollection.getFormFieldByName(fieldName);
            const requiredFieldDoesntExists = !isOptional && !field;

            if (requiredFieldDoesntExists) {
                throw new Error(`The field '${fieldName}' was not found.`);
            }

            if (field) {
                // Check if the value property exits
                fieldValue = 'value' in field ? field.value : fieldValue;

                // Trim the value if it's a string to avoid strings with only spaces like "   "
                fieldValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;

                // Check if the field is required and if it has a value. Added a condition to avoid 0 to be considered a falsy value
                const requiredFieldHasNoValue = !fieldValue && typeof fieldValue !== 'number' && !isOptional;

                // Check if the field is a dropdown with the default value "Select Item"
                // Some dropdowns have this value as the default one but some others don't
                const ddSelectItem = fieldValue === 'Select Item';

                if (requiredFieldHasNoValue || ddSelectItem) {
                    fieldValue = '';
                    throw new Error(`The value property for the field '${fieldName}' was not found or is empty.`);
                }
            }
        } catch (error) {
            errorLog.push(error.message);
        } finally {
            return fieldValue;
        }
    }

    function parseRes(vvClientRes) {
        /*
        Generic JSON parsing function
        Parameters:
            vvClientRes: JSON response from a vvClient API method
        */
        try {
            // Parses the response in case it's a JSON string
            const jsObject = JSON.parse(vvClientRes);
            // Handle non-exception-throwing cases:
            if (jsObject && typeof jsObject === 'object') {
                vvClientRes = jsObject;
            }
        } catch (e) {
            // If an error occurs, it's because the resp is already a JS object and doesn't need to be parsed
        }
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
        Checks that the meta property of a vvClient API response object has the expected status code
        Parameters:
            vvClientRes: Parsed response object from a vvClient API method
            shortDescription: A string with a short description of the process
            ignoreStatusCode: An integer status code for which no error should be thrown. If you're using checkData(), make sure to pass the same param as well.
        */

        if (!vvClientRes.meta) {
            throw new Error(
                `${shortDescription} error. No meta object found in response. Check method call parameters and credentials.`
            );
        }

        const status = vvClientRes.meta.status;

        // If the status is not the expected one, throw an error
        if (status != 200 && status != 201 && status != ignoreStatusCode) {
            const errorReason =
                vvClientRes.meta.errors && vvClientRes.meta.errors[0]
                    ? vvClientRes.meta.errors[0].reason
                    : 'unspecified';
            throw new Error(`${shortDescription} error. Status: ${vvClientRes.meta.status}. Reason: ${errorReason}`);
        }
        return vvClientRes;
    }

    function checkDataPropertyExists(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
        Checks that the data property of a vvClient API response object exists
        Parameters:
            res: Parsed response object from the API call
            shortDescription: A string with a short description of the process
            ignoreStatusCode: An integer status code for which no error should be thrown. If you're using checkMeta(), make sure to pass the same param as well.
        */
        const status = vvClientRes.meta.status;

        if (status != ignoreStatusCode) {
            // If the data property doesn't exist, throw an error
            if (!vvClientRes.data) {
                throw new Error(
                    `${shortDescription} data property was not present. Please, check parameters and syntax. Status: ${status}.`
                );
            }
        }

        return vvClientRes;
    }

    function checkDataIsNotEmpty(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
        Checks that the data property of a vvClient API response object is not empty
        Parameters:
            res: Parsed response object from the API call
            shortDescription: A string with a short description of the process
            ignoreStatusCode: An integer status code for which no error should be thrown. If you're using checkMeta(), make sure to pass the same param as well.
        */
        const status = vvClientRes.meta.status;

        if (status != ignoreStatusCode) {
            const dataIsArray = Array.isArray(vvClientRes.data);
            const dataIsObject = typeof vvClientRes.data === 'object';
            const isEmptyArray = dataIsArray && vvClientRes.data.length == 0;
            const isEmptyObject = dataIsObject && Object.keys(vvClientRes.data).length == 0;

            // If the data is empty, throw an error
            if (isEmptyArray || isEmptyObject) {
                throw new Error(
                    `${shortDescription} returned no data. Please, check parameters and syntax. Status: ${status}.`
                );
            }
            // If it is a Web Service response, check that the first value is not an Error status
            if (dataIsArray) {
                const firstValue = vvClientRes.data[0];

                if (firstValue == 'Error') {
                    throw new Error(
                        `${shortDescription} returned an error. Please, check the called Web Service. Status Description: ${vvClientRes.data[1]}.`
                    );
                }
            }
        }
        return vvClientRes;
    }

    /**
     * @param {*} param - Value to evaluate
     * @returns {boolean} True when the value is null, undefined, or considered empty by business rules
     **/
    function isNullEmptyUndefined(param) {
        if (param === null || param === undefined) {
            return true;
        }
        const dataType = Object.prototype.toString.call(param).slice(8, -1).toLowerCase(); //slicing the string returned by the toString method to remove the first eight characters ("[object ") and the last character (]), leaving only the name of the data type.
        switch (dataType) {
            case 'string':
                if (
                    param.trim().toLowerCase() === 'select item' ||
                    param.trim().toLowerCase() === 'null' ||
                    param.trim().toLowerCase() === 'undefined' ||
                    param.trim() === ''
                ) {
                    return true;
                }
                break;
            case 'array':
                if (param.length === 0) {
                    return true;
                }
                break;
            case 'object':
                if (Object.keys(param).length === 0) {
                    return true;
                }
                break;
            default:
                return false;
        }
        return false;
    }

    /**
     * @param {Object} object
     * @returns {Object} A new object with lowercase keys
     */
    function lowerizeObjectKeys(obj) {
        return Object.keys(obj).reduce((acc, k) => {
            acc[k.toLowerCase()] = obj[k];
            return acc;
        }, {});
    }

    /**
     * @param {Object} getFormsParams - Query parameters for the forms request
     * @param {string} templateName - Template name to query
     * @returns {Promise<Object[]>} Form records returned by the query
     **/
    async function getForms(getFormsParams, templateName) {
        shortDescription = `Get ${templateName} form record`;

        const getFormsRes = await vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));

        return getFormsRes.data;
    }

    /**
     * @param {string} WTMReviewPageID - Form ID of the WTM Review Page record
     * @returns {Promise<Object[]>} WTM Review Page records with due date, WTMF number, and related IDs
     **/
    async function getWTMReviewPageInformationRecord(WTMReviewPageID) {
        const queryParameters = {
            q: `[Form ID] eq '${WTMReviewPageID}'`,
            // expand: true, // true to get all the form's fields
            fields: 'Related Record ID, Comment Due Date, WTMF No, Position Management Form ID', // to get only the fields 'id' and 'name'
        };

        const wtmrpInformationRecord = await getForms(queryParameters, wtmReviewPageTemplateName);

        if (isNullEmptyUndefined(wtmrpInformationRecord)) {
            throw new Error(`Error getting ${wtmReviewPageTemplateName} record for ${WTMReviewPageID}.`);
        }

        return wtmrpInformationRecord;
    }

    /**
     * @param {string} relatedRecordID - Form ID of the WTMF record related to the WTM Review Page
     * @returns {Promise<Object[]>} Contact Information Relation records for enabled Proponents
     **/
    async function getContactInformationRelationRecords(relatedRecordID) {
        const contactInformationRelationRecords = await getForms(
            {
                q: `[Related Record ID] eq '${relatedRecordID}' AND [Status] eq 'Enabled' AND ([Proponent] eq 'True' OR [Landowner] eq 'True' OR [Surveyor] eq 'True')`,
                expand: true,
            },
            contactInformationRelationTemplateName
        );

        return contactInformationRelationRecords;
    }

    /**
     * @param {Object[]} contactInformationRelationRecords - Contact Information Relation records with Contact Information IDs
     * @returns {Promise<Object[]>} Contact Information records for enabled contacts
     **/
    async function getContactInformationRecords(contactInformationRelationRecords) {
        const contactInformationIDString = contactInformationRelationRecords
            .map((el) => `'${el['contact Information ID']}'`)
            .join(',');

        const contactInformationRecords = await getForms(
            {
                q: `[Contact Information ID] IN (${contactInformationIDString}) AND [Status] eq 'Enabled'`,
                expand: true,
            },
            contactInformationTemplateName
        );

        return contactInformationRecords;
    }

    /**
     * @param {string} relatedRecordID - Form ID of the Individual Record related to the reviewer
     * @returns {Promise<Object>} Reviewer Individual Record information
     **/
    async function getAssignedReviewersRecords(relatedRecordID) {
        shortDescription = 'Get Assigned Reviewers from WTM Review Page using SQL Parameters';
        const customQueryData = {
            // params value must be a stringified array of objects with parameterName and value properties
            params: JSON.stringify([
                {
                    parameterName: 'WTMRP',
                    value: relatedRecordID,
                },
            ]),
        };

        return vvClient.customQuery
            .getCustomQueryResultsByName('zWebSvc Get Assigned Reviewers by WTM Review Page', customQueryData)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    /**
     * @param {string} positionManagementFormID - Form ID of the Position Management record related to the WTM Review Page
     * @returns {Promise<Object[]>} Forester records from WTM Review Page
     **/
    async function getAssignedForesterRecords(positionManagementFormID) {
        const queryParameters = {
            q: `[instanceName] eq '${positionManagementFormID}'`,
            // expand: true, // true to get all the form's fields
            fields: 'Email', // to get only the fields 'id' and 'name'
        };
        const foresterRecords = await getForms(queryParameters, positionMgmtTemplateName);

        return foresterRecords;
    }

    /**
     * @param {string} webServiceName - Name of the web service to execute
     * @param {Object[]} webServiceParams - Parameters passed to the web service
     * @returns {Promise<Array>} Web service response data
     **/
    function callExternalWs(webServiceName, webServiceParams) {
        let shortDescription = `Run Web Service: ${webServiceName}`;

        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    /**
     * @param {Object[]} tokens - Token assignments for the email template
     * @param {string} emailAddress - Primary recipient email address
     * @param {string} relatedRecordID - Related record ID for communication logging
     * @param {string} emailName - Name of the email template to be sent
     * @returns {Promise<Object>} Communication log result from the email library
     **/
    async function sendNotificationEmail(tokens, emailAddress, relatedRecordID, emailName) {
        const emailRequestArr = [
            { name: 'Email Name', value: emailName },
            { name: 'Tokens', value: tokens },
            { name: 'Email Address', value: emailAddress },
            { name: 'Email AddressCC', value: '' },
            { name: 'SendDateTime', value: '' },
            { name: 'RELATETORECORD', value: [relatedRecordID] },
            { name: 'OTHERFIELDSTOUPDATE', value: { 'Primary Record ID': relatedRecordID } },
        ];
        const [LibEmailGenerateAndCreateCommunicationLogStatus, , comLogResult] = await callExternalWs(
            'LibEmailGenerateAndCreateCommunicationLog',
            emailRequestArr
        );

        if (LibEmailGenerateAndCreateCommunicationLogStatus !== 'Success') {
            throw new Error('Error sending notifications.');
        }

        return comLogResult;
    }

    /**
     * @param {string} formTemplateName - Template name of the form to be updated
     * @param {string} recordGUID - Revision ID of the form record to be updated
     * @returns {Promise<Object>} Updated form record information
     **/
    function setFormNotificationFlagTrue(formTemplateName, recordGUID) {
        const shortDescription = `Update form record ${recordGUID}`;
        const fieldValuesToUpdate = {
            'Withdrawal Notification Flag': 'True',
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS
        const wtmReviewPageformId = getFieldValueByName('Form ID');
        const wtmfFormId = getFieldValueByName('Related Record ID');

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!wtmReviewPageformId || !wtmfFormId) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3° RETRIEVE CONTACT INFORMATION FOR EACH PROPONENT, LANDOWNER, SURVEYOR, FORESTER AND EXTERNAL REVIEWER ASSOCIATED
        let allContacts = [];
        let contactInformationRecords = [];
        const contactInformationRelationRecords = await getContactInformationRelationRecords(wtmfFormId);

        if (!isNullEmptyUndefined(contactInformationRelationRecords)) {
            contactInformationRecords = await getContactInformationRecords(contactInformationRelationRecords);
        }

        // Get wtm review page information using the provided wtm rp form id to get the updated data.
        const [wtmRevPagRecord] = await getWTMReviewPageInformationRecord(wtmReviewPageformId);
        // lowerize keys for easier access of field data
        const wtmRevPagRecordLowerized = lowerizeObjectKeys(wtmRevPagRecord);

        // Get assigned reviewers from wtm review page using sql parameters in a custom query
        // to avoid issues with too many records related to the wtm review page that can be retrieved with the expand parameter of the getforms method.
        const assignedReviewersRecord = await getAssignedReviewersRecords(wtmReviewPageformId);

        // Get email data from forester.
        const contactPositionMgmtRecord = await getAssignedForesterRecords(
            wtmRevPagRecordLowerized['position management form id']
        );

        // Merge all contacts into one array to facilitate the email sending process.
        allContacts = [...contactInformationRecords, ...assignedReviewersRecord, ...contactPositionMgmtRecord];

        // 4° CREATE COMMUNICATION LOGS AND SEND EMAIL NOTIFICATIONS
        const wasSent = wtmRevPagRecordLowerized['withdrawal notification flag'];

        if (wasSent !== 'True') {
            const emailPromises = allContacts
                .filter((contact) => !isNullEmptyUndefined(contact.email))
                .map((contactInformation) => {
                    let wtmfNumber = '';

                    if (wtmRevPagRecordLowerized['wtmf number']) {
                        wtmfNumber = wtmRevPagRecordLowerized['wtmf number'];
                    }

                    const tokens = [
                        {
                            name: '[WTMF No.]',
                            value: wtmfNumber,
                        },
                    ];

                    return sendNotificationEmail(tokens, contactInformation.email, wtmfFormId, EMAIL_TEMPLATE_NAME);
                });

            await Promise.all(emailPromises);

            // 5° UPDATE NOTIFICATION FLAG
            await setFormNotificationFlagTrue(wtmReviewPageTemplateName, wtmRevPagRecord.revisionId);
        } else {
            logger.info(`Notification already sent for record ${wtmfFormId}. Skipping emails.`);
        }

        // 6° BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Emails sent successfully.';
        // outputCollection[2] = someVariableWithData;
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don´t change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors occurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        // SEND THE RESPONSE

        response.json(200, outputCollection);
    }
};
