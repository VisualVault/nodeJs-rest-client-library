/**
 * SendReviewerNotificationAutomation
 * Category: Form
 * Modified: 2026-03-17T17:39:38.843Z by sebastian.rolando@visualvault.com
 * Script ID: Script Id: 6bceeeef-9c9f-f011-82f8-bdf46654ff56
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));

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
    Script Name:    SendReviewerNotificationAutomation
    Customer:       WADNR
    Purpose:        This process will be executed from the Process Design Studio and will be triggered 
                    when the 'Need a Notification' flag is set on the WTM Assigned Reviewer records. 
                    The purpose of this webservice is to send a notification to the Reviewers that need 
                    to know they should complete the External Reviewer Recommendation Form and notify the Proponent and Forester.
    Preconditions:  
                    The library LibEmailGenerateAndCreateCommunicationLog is required to execute this microservice
    Parameters:
                    ('Form ID', string): Form ID of the WTM Assigned Reviewer record
                    ('Related Record ID', string): Form ID of the WTM Review Page record
                    ('Reviewer Name'): Value of field 'Reviewer Name' of the WTM Assigned Reviewer record that stores the Id of the Individual Record related to the Reviewer
                    ('Reviewer Type'): Reviewer Type field of the WTM Assigned Reviewer record
    Pseudo code:
                    1. Get parameters
                    2. Check is the required parameters are present
                    3. Get the WTM Review Page record data, related to WTM Assigned Reviewer
                    4. Get contact information for Proponent, Forester and Reviewer related to the WTM Review Page
                    5. Get or create the External Recommendation Record related to WTM Assigned Reviewer
                    6. Send the notification to the Reviewer
                    7. Build the success response array

    Date of Dev:    10/03/2025
    Last Rev Date:  02/26/2026

    Revision Notes:
                    10/03/2025 - Sebastian Rolando: First Setup of the script
                    12/05/2025 - Fernando Chamorro: Notification sending has been fixed and a dynamic URL has been added
                    12/15/2025 - Sebastian Rolando: Fix the format for the DueDate token, used into the Email Notification body
                    02/19/2026 - Alfredo Scilabra:  Added support for primary record ID
                    02/26/2026 - Federico Cuelho: Added logic to include the Forester and Proponent as CC in the notification email, and added error handling to avoid the process to fail when the email for those contacts is not present.
                    03/17/2026 - Sebastian Rolando: Set to True the flag Need a Notification, inside the mapping when creating the Recommendation Form.
    */

    logger.info('Start of the process SendReviewerNotificationAutomation at ' + Date());

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    let returnObject;

    // Respond immediately before the "processing"
    const responseParams = {
        success: true,
        message: 'Process started successfully.',
    };
    response.json(200, responseParams);

    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const externalReviewerRecommendationsTemplateName = 'External Reviewer Recommendations';
    const wtmReviewPageTemplateName = 'WTM Review Page';
    const individualRecordTemplateName = 'Individual Record';
    const contactInformationRelationTemplateName = 'Contact Information Relation';
    const contactInformationTemplateName = 'Contact Information';
    const positionMgmtTemplateName = 'Position Management';

    const EMAIL_TEMPLATE_NAME = 'Send Notification to Reviewers';

    /* -------------------------------------------------------------------------- */
    /*                           Script Variables                                 */
    /* -------------------------------------------------------------------------- */

    // Describes the process being checked using the parsing and checking helper functions
    let shortDescription = '';

    let externalReviewerStatus = '';
    let externalRecommendationID = '';

    // Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete.
    const executionId = response.req.headers['vv-execution-id'];

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
     * @returns {URL} Portal URL for the configured customer and database aliases
     **/
    function getPortalURL() {
        const { customerAlias, databaseAlias } = module.exports.getCredentials();
        const baseUrl = vvClient.getBaseUrl();

        return new URL(`${baseUrl}/app/${customerAlias}/${databaseAlias}`);
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
     * @param {string} reviewerFormID - Form ID of the WTM Assigned Reviewer record
     * @returns {Promise<Object[]>} External Reviewer Recommendation records related to the reviewer
     **/
    async function getExternalRecommendationRecord(reviewerFormID) {
        const queryParameters = {
            q: `[Related Record ID] eq '${reviewerFormID}'`,
            // expand: true, // true to get all the form's fields
            fields: 'Form ID, Status', // to get only the fields 'id' and 'name'
        };

        const externalRecommendationRecord = await getForms(
            queryParameters,
            externalReviewerRecommendationsTemplateName
        );

        return externalRecommendationRecord;
    }

    /**
     * @param {string} WTMReviewPageID - Form ID of the WTM Review Page record
     * @returns {Promise<Object[]>} WTM Review Page records with due date, WTMF number, and related IDs
     **/
    async function getWTMReviewPageInformation(WTMReviewPageID) {
        const queryParameters = {
            q: `[Form ID] eq '${WTMReviewPageID}'`,
            // expand: true, // true to get all the form's fields
            fields: 'Related Record ID, Comment Due Date, WTMF No, Position Management Form ID', // to get only the fields 'id' and 'name'
        };

        const wtmrpInformationRecords = await getForms(queryParameters, wtmReviewPageTemplateName);

        return wtmrpInformationRecords;
    }

    /**
     * @param {Object} newRecordData - Form data used to create the External Reviewer Recommendations record
     * @returns {Promise<Object>} Created External Reviewer Recommendation record identifier
     **/
    function createExternalRecomendationForm(newRecordData) {
        const shortDescription = `Post form ${externalReviewerRecommendationsTemplateName}`;

        return vvClient.forms
            .postForms(null, newRecordData, externalReviewerRecommendationsTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    /**
     * @param {string} relatedRecordID - Form ID of the WTMF record related to the WTM Review Page
     * @returns {Promise<Object[]>} Contact Information Relation records for enabled Proponents
     **/
    async function getContactInformationRelationRecords(relatedRecordID) {
        const queryParameters = {
            q: `[Related Record ID] eq '${relatedRecordID}' AND [Status] eq 'Enabled' AND ([Proponent] eq 'True')`,
            // expand: true, // true to get all the form's fields
            fields: 'Related Record ID, Contact Information ID, Status, Proponent', // to get only the fields 'id' and 'name'
        };
        const contactInformationRelationRecords = await getForms(
            queryParameters,
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
            .map((record) => `'${record['contact Information ID']}'`)
            .join(',');
        const queryParameters = {
            q: `[Contact Information ID] IN (${contactInformationIDString}) AND [Status] eq 'Enabled'`,
            // expand: true, // true to get all the form's fields
            fields: 'Email, First Name, Last Name', // to get only the fields 'id' and 'name'
        };
        const contactInformationRecords = await getForms(queryParameters, contactInformationTemplateName);

        return contactInformationRecords;
    }

    /**
     * @param {string} reviewerIndividualID - Form ID of the Individual Record related to the reviewer
     * @returns {Promise<Object>} Reviewer Individual Record information
     **/
    async function getReviewerIndividualInformation(reviewerIndividualID) {
        const getFormsParams = {
            q: `[Form ID] eq '${reviewerIndividualID}' AND ([Status] eq 'Enabled' OR [Status] eq 'Enable')`,
            // expand: true, // true to get all the form's fields
            fields: 'User ID, First Name, Last Name', // to get only the fields 'id' and 'name'
        };

        const reviewerIndividualInformationRecords = await getForms(getFormsParams, individualRecordTemplateName);

        return reviewerIndividualInformationRecords;
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
     * @param {string} ccEmailAddresses - Comma-separated CC email addresses
     * @param {string} relatedRecordID - Related record ID for communication logging
     * @returns {Promise<Object>} Communication log result from the email library
     **/
    async function sendNotificationEmail(tokens, emailAddress, ccEmailAddresses, relatedRecordID, primaryRecordID) {
        const emailRequestArr = [
            { name: 'Email Name', value: EMAIL_TEMPLATE_NAME },
            { name: 'Tokens', value: tokens },
            { name: 'Email Address', value: emailAddress },
            { name: 'Email AddressCC', value: ccEmailAddresses },
            { name: 'SendDateTime', value: '' },
            { name: 'RELATETORECORD', value: [relatedRecordID] },
            {
                name: 'OTHERFIELDSTOUPDATE',
                value: { 'Primary Record ID': primaryRecordID },
            },
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

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° Get parameters
        const reviewerFormID = getFieldValueByName('Form ID');
        const wtmrpFormID = getFieldValueByName('Related Record ID');
        const reviewerIndividualID = getFieldValueByName('Reviewer Name');
        const reviewerType = getFieldValueByName('Reviewer Type');

        // 2° Check is the required parameters are present
        if (!reviewerFormID || !wtmrpFormID || !reviewerIndividualID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3° Get the WTM Review Page record data, related to WTM Assigned Reviewer
        let dueDate = '';
        let WTMFNumber = '';
        let primaryRecordID = '';
        const [wtmReviewPageInformation] = await getWTMReviewPageInformation(wtmrpFormID);

        if (!isNullEmptyUndefined(wtmReviewPageInformation)) {
            dueDate = wtmReviewPageInformation['comment Due Date'];
            WTMFNumber = wtmReviewPageInformation['wtmF No'];
            primaryRecordID = wtmReviewPageInformation['related Record ID'];
        }

        // 4° Get contact information for each Proponent, Forester and Reviewer related to the WTM Review Page and store it in an array.
        // This information will be used to decide who should receive the notification email
        let ccEmails;

        // 4.1° Get Individual Record from the Reviewer Name to obtain the emailAddress and Full Name Information
        let reviewerFullName = '';
        let reviewerEmail = '';
        const [reviewerIndividualInformation] = await getReviewerIndividualInformation(reviewerIndividualID);

        if (!isNullEmptyUndefined(reviewerIndividualInformation)) {
            reviewerFullName = `${reviewerIndividualInformation['first Name']} ${reviewerIndividualInformation['last Name']}`;
            reviewerEmail = reviewerIndividualInformation['user ID'];
        }

        // 4.2° Get the contact information for the Proponent related to the WTM Review Page
        const wtmfFormId = wtmReviewPageInformation['related Record ID'];
        const contactInformationRelationRecords = await getContactInformationRelationRecords(wtmfFormId);
        let proponentEmail = '';

        if (!isNullEmptyUndefined(contactInformationRelationRecords)) {
            const contactInformationRecords = await getContactInformationRecords(contactInformationRelationRecords);
            proponentEmail = contactInformationRecords
                .map((record) => record['email'])
                .filter((email) => !isNullEmptyUndefined(email))
                .join(',');
        }

        // 4.3° Get the assigned Forester related to the WTM Review Page
        let foresterEmail = '';
        const [contactPositionMgmtRecords] = await getAssignedForesterRecords(
            wtmReviewPageInformation['position Management Form ID']
        );

        if (!isNullEmptyUndefined(contactPositionMgmtRecords)) {
            foresterEmail = contactPositionMgmtRecords['email'];
        }

        // Merge emails into one comma-separated string, excluding empty values and duplicates.
        ccEmails = [...new Set([foresterEmail, proponentEmail].filter((email) => !isNullEmptyUndefined(email)))].join(
            ','
        );

        // 5° Get or create the External Recommendation Record related to WTM Assigned Reviewer
        const [externalRecommendationRecord] = await getExternalRecommendationRecord(reviewerFormID);

        // If External Recommendation Record does not exist
        if (isNullEmptyUndefined(externalRecommendationRecord)) {
            // Create External Recomendation Form: Reviewer Name / Type, Due Date, Form ID, 'Waiting Reviewer'
            const newRecordData = {
                'Reviewer Name or Type': `${reviewerFullName} - ${reviewerType}`,
                'Comment Due Date or Date of Recommendation': dueDate,
                Status: 'Waiting Reviewer',
                'Related Record ID': reviewerFormID,
                'WTM RP ID': wtmrpFormID,
                'Need a Notification': 'True',
            };

            // Create the record
            const createdExternaRecommendationID = await createExternalRecomendationForm(newRecordData);

            // Obtain Id of the created Record
            externalRecommendationID = createdExternaRecommendationID;
        }

        // If External Recommendation Record does exist
        else {
            // Obtain Id of the related Record
            externalRecommendationID = externalRecommendationRecord.instanceName;
        }

        // 6° Send the notification to the Reviewer and CC the Forester and Proponent if they exist
        // Set token assignments for the email template
        const emailTemplateTokens = [
            {
                name: '[WTMF No]',
                value: WTMFNumber,
            },
            {
                name: '[due date]',
                value: dayjs.utc(dueDate).format('MM/DD/YYYY'),
            },
            {
                name: '[fpOnline link]',
                value: getPortalURL(),
            },
        ];

        // Call the library that send the email and create the Communication Log
        await sendNotificationEmail(
            emailTemplateTokens,
            reviewerEmail,
            ccEmails,
            externalRecommendationID,
            primaryRecordID
        );

        // 7° BUILD THE SUCCESS RESPONSE ARRAY
        // Create the following object that will be used when the api call is made to communicate the workflow item is complete.
        // First two items of the object are required to tell if the process completed successfully and the message that should be returned.
        // The other items in the object would have the name of any workflow variable that would be updated with data coming from the microservice/node script.
        returnObject = {
            MicroserviceResult: true,
            MicroserviceMessage: 'Microservice completed successfully',
            Success: `The user ${reviewerFullName} has been notified by email to ${reviewerEmail}`,
        };
    } catch (err) {
        logger.info('Error encountered' + err);

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: err,
        };
    } finally {
        shortDescription = 'Sending the workflow completion response to the log server';

        // If the complete was successful or not to the log server. This helps to track down what occurred when a microservice completed.
        await vvClient.scripts
            .completeWorkflowWebService(executionId, returnObject)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then(() => logger.info('Completion signaled to WF engine successfully.'))
            .catch(() => logger.info('There was an error signaling WF completion.'));
    }
};
