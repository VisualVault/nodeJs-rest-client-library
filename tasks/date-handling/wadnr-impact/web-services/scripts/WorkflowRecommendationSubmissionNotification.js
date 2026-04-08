/**
 * WorkflowRecommendationSubmissionNotification
 * Category: Workflow
 * Modified: 2026-03-18T21:18:28.643Z by federico.cuelho@visualvault.com
 * Script ID: Script Id: 4cec8f2b-9dc4-f011-82f8-fd3f23079e80
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');

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
    Script Name:
                    - WorkflowRecommendationSubmissionNotification
    Customer:
                    - WADNR
    Purpose:
                    - The purpose of this process is to notify the Proponent, Forester and Assigned External
                      Reviewer about a recommendation that was provided by an external reviewer.
    Preconditions:
                    - Having an assigned external reviewer in the WTM RP
                    - Having submitted recommendations or comments by a reviewer
    Parameters:
                    - Form ID:              String - (External Reviewer Recommendations Form ID)
                    - WTM Assigned Form ID: String - (WTM Assigned Reviewers Form ID)
                    - WTM RP Form ID:       String - (WTM Review Page Form ID)
    Psuedo code:
                    1. Receive parameters
                    2. Check if required parameters are present
                    3. Get WTM Review Page information
                    4. Get stakeholders (Proponent, Forester, External Reviewer)
                    5. Get a list of all the Water Segment Modification records for this External Reviewer Recommendation
                    6. Formulate the body of the email and create Communication Log
                    7. Send an email to the group of users
                    8. Set the Notification flag that identifies that this notification has been sent out
                    9. Build the success response array with the results of the email sending process

    Date of Dev:
                    - 03/18/2026

    Revision Notes:
                    - 11/19/2025 - Fernando Chamorro:  First Setup of the script
                    - 11/25/2025 - Fernando Chamorro:  Fixing empty contactInformation records
                    - 12/30/2025 - Sebastian Rolando: Add the Concur value for mapping of tokens in Template Email
                    - 02/19/2026 - Alfredo Scilabra: Added support for primary record ID
                    - 03/18/2026 - Federico Cuelho: Add Forester to the notification list.
                    - 03/18/2026 - Federico Cuelho: Refactor code and update helper functions for better error handling and readability.

    */

    logger.info('Start of the process WorkflowRecommendationSubmissionNotification at ' + Date());

    /**************************************
     Response and error handling variables
    ***************************************/

    let returnObject;

    // Respond immediately before the "processing"
    const responseParams = {
        success: true,
        message: 'Process started successfully.',
    };
    response.json(200, responseParams);

    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /***********************
     Configurable Variables
    ************************/

    let allContacts = [];

    const contactInformationRelationTemplateName = 'Contact Information Relation';
    const contactInformationTemplateName = 'Contact Information';
    const EMAIL_TEMPLATE_NAME = 'Recommendation Submission Notification';
    const externalReviewerRecommendationsTemplateName = 'External Reviewer Recommendations';
    const recommendationLineItemsTemplateName = 'Recommendation Line Items';
    const waterSegmentModificationTemplateName = 'Water Segment Modification';
    const wtmReviewPageTemplateName = 'WTM Review Page';
    const positionMgmtTemplateName = 'Position Management';

    /*****************
     Script Variables
    ******************/

    // Describes the process being checked using the parsing and checking helper functions
    let shortDescription = '';
    // Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete.
    const executionId = response.req.headers['vv-execution-id'];

    /*****************
     Helper Functions
    ******************/

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
            // If an error ocurrs, it's because the resp is already a JS object and doesn't need to be parsed
        }
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
        Checks that the meta property of a vvCliente API response object has the expected status code
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
        Checks that the data property of a vvCliente API response object exists
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
        Checks that the data property of a vvCliente API response object is not empty
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
     * @param {string} wtmfFormId
     * @param {string} processMessage
     * @param {Array} [sendNotificationEmailResults=[]]
     * @returns {string} Formatted process summary string
     **/
    function formatReturnObjectData(wtmfFormId, processMessage, sendNotificationEmailResults = []) {
        const resultsCount = Array.isArray(sendNotificationEmailResults) ? sendNotificationEmailResults.length : 0;

        return `WTMFFormID: ${wtmfFormId} | ProcessMessage: ${processMessage} | SendNotificationEmailResultsCount: ${resultsCount}`;
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
     * @param {string} externalReviewerRecomendationFormId - Form ID of the External Reviewer Recomendation record
     * @param {string} externalReviewerRecommendationsTemplateName - Template name of the External Reviewer Recommendations record
     * @returns {Promise<Object[]>} Record data for the given External Reviewer Recommendation form ID
     **/
    async function getExternalReviewerRecommendationRecord(
        externalReviewerRecomendationFormId,
        externalReviewerRecommendationsTemplateName
    ) {
        const queryParameters = {
            q: `[instanceName] eq '${externalReviewerRecomendationFormId}'`,
            // expand: true, // true to get all the form's fields
            fields: 'Form ID, Email notification flag', // to get only the fields 'id' and 'name'
        };
        const externalReviewerRecommendationRecord = await getForms(
            queryParameters,
            externalReviewerRecommendationsTemplateName
        );

        if (isNullEmptyUndefined(externalReviewerRecommendationRecord)) {
            throw new Error(
                `Error getting ${externalReviewerRecommendationsTemplateName} record for ${externalReviewerRecomendationFormId}.`
            );
        }

        return externalReviewerRecommendationRecord;
    }

    /**
     * @param {string} waterSegmentFormID - Form ID of the Water Segment Modification record
     * @param {string} waterSegmentModificationTemplateName - Template name of the Water Segment Modification record
     * @returns {Promise<Object[]>} Record data for the given Water Segment Modification form ID
     **/
    async function getWaterSegmentModificationRecord(waterSegmentFormID, waterSegmentModificationTemplateName) {
        const queryParameters = {
            q: `[instanceName] eq '${waterSegmentFormID}'`,
            // expand: true, // true to get all the form's fields
            fields: 'Form ID, Water Segment Identifier', // to get only the fields 'id' and 'name'
        };
        const waterSegmentModificationRecords = await getForms(queryParameters, waterSegmentModificationTemplateName);

        if (isNullEmptyUndefined(waterSegmentModificationRecords)) {
            throw new Error(`Error getting ${waterSegmentModificationTemplateName} record for ${waterSegmentFormID}.`);
        }

        return waterSegmentModificationRecords;
    }

    /**
     * @param {string} extRevRecFormId - Form ID of the External Reviewer Recommendation record
     * @returns {Promise<Object[]>} Recommendation Line Item records for the given External Reviewer Recommendation
     **/
    async function getRecommendationLineItemRecords(extRevRecFormId) {
        const queryParameters = {
            q: `[External Reviewer Recommendation ID] eq '${extRevRecFormId}'`,
            // expand: true, // true to get all the form's fields
            fields: 'Form ID, Segment Modification Form ID, Concur, Comments', // to get only the fields 'id' and 'name'
        };
        const recommendationLineItemRecords = await getForms(queryParameters, recommendationLineItemsTemplateName);

        if (isNullEmptyUndefined(recommendationLineItemRecords)) {
            throw new Error(`Error getting ${recommendationLineItemsTemplateName} records for ${extRevRecFormId}.`);
        }

        return recommendationLineItemRecords;
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
     * @param {string} primaryID - Primary Record ID to be included in the communication log
     * @returns {Promise<Object>} Communication log result from the email library
     **/
    async function sendNotificationEmail(tokens, emailAddress, relatedRecordID, emailName, primaryID) {
        const emailRequestArr = [
            { name: 'Email Name', value: emailName },
            { name: 'Tokens', value: tokens },
            { name: 'Email Address', value: emailAddress },
            { name: 'Email AddressCC', value: '' },
            { name: 'SendDateTime', value: '' },
            { name: 'RELATETORECORD', value: [relatedRecordID] },
            { name: 'OTHERFIELDSTOUPDATE', value: { 'Primary Record ID': primaryID } },
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
        const shortDescription = `Update form record ${recordGUID} for ${formTemplateName}`;
        const fieldValuesToUpdate = {
            'Email Notification Flag': 'True',
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    /**********
     MAIN CODE
    **********/

    try {
        // 1. Receive parameters
        const extRevRecFormId = getFieldValueByName('Form ID');
        const wtmReviewPageformId = getFieldValueByName('WTM RP Form ID');
        const wtmAssigRevformId = getFieldValueByName('WTM Assigned Form ID');

        // 2. Check if required parameters are present
        if (!extRevRecFormId || !wtmReviewPageformId || !wtmAssigRevformId) {
            throw new Error(errorLog.join('; '));
        }

        // 3. Get WTM Review Page information using the provided WTM RP Form ID to get the related WTMF record information.
        const [wtmRevPagRecord] = await getWTMReviewPageInformationRecord(
            wtmReviewPageformId,
            wtmReviewPageTemplateName
        );
        const wtmfFormId = wtmRevPagRecord['related Record ID'] || '';
        const wtmfNumber = wtmRevPagRecord['wtmF No'] || '';

        // 4. Get stakeholders - Proponent, Landowner, Surveyor, Forester and External Reviewer
        let contactInformationRecords = [];
        const contactInformationRelationRecords = await getContactInformationRelationRecords(wtmfFormId);

        if (!isNullEmptyUndefined(contactInformationRelationRecords)) {
            contactInformationRecords = await getContactInformationRecords(contactInformationRelationRecords);
        }

        // Get the email data for the external reviewers (Exclude the reviewer of this record)
        const assignedReviewersRecords = await getAssignedReviewersRecords(wtmReviewPageformId);
        const filteredExternalReviewers = assignedReviewersRecords.filter(
            (assigRev) => assigRev['assigned Reviewer Record ID'] !== wtmAssigRevformId
        );

        // Get email data from Forester.
        const contactPositionMgmtRecord = await getAssignedForesterRecords(
            wtmRevPagRecord['position Management Form ID']
        );

        // Merge all contacts into one array to facilitate the email sending process.
        allContacts = [...contactInformationRecords, ...filteredExternalReviewers, ...contactPositionMgmtRecord];

        // 5. Get a list of all the Water Segment Modification records for this External Reviewer Recommendation
        const recommendationLineItems = await getRecommendationLineItemRecords(extRevRecFormId);

        const recommendationTextArray = await Promise.all(
            recommendationLineItems.map(async (recLineItem) => {
                const smfId = recLineItem['segment Modification Form ID'];

                // Get the water segment identifier from the Water Segment Modification record related to the Recommendation Line Item record
                const [waterSegmentModificationRecord] = await getWaterSegmentModificationRecord(
                    smfId,
                    waterSegmentModificationTemplateName
                );
                const waterSegmentIdentifier = waterSegmentModificationRecord['water Segment Identifier'];

                return `
                    <article data-smf-id="${smfId}">
                        <strong>${waterSegmentIdentifier} - ${recLineItem.concur}</strong>
                        <p>${recLineItem.comments}</p>
                    </article>
                `;
            })
        );
        const recommendationsText = recommendationTextArray.join('\n');

        // 6. Formulate the body of the email and create Communication Log
        // Get External Reviewer Recommendation record information using the provided Form ID to check if the email notification has already been sent.
        const [extRevRecRecord] = await getExternalReviewerRecommendationRecord(
            extRevRecFormId,
            externalReviewerRecommendationsTemplateName
        );

        // lowerize keys for easier access of field data
        const relatedRecordLowerized = lowerizeObjectKeys(extRevRecRecord);
        const wasSent = relatedRecordLowerized['email notification flag'];

        let sendNotificationEmailResults = [];

        if (wasSent !== 'True') {
            const emailPromises = allContacts
                .filter((contact) => !isNullEmptyUndefined(contact.email))
                .map((contactInformation) => {
                    const tokens = [
                        {
                            name: '[WTMF No]',
                            value: wtmfNumber,
                        },
                        {
                            name: '[Recommendations]',
                            value: recommendationsText,
                        },
                    ];

                    return sendNotificationEmail(
                        tokens,
                        contactInformation.email,
                        extRevRecFormId,
                        EMAIL_TEMPLATE_NAME,
                        wtmfFormId
                    );
                });

            // 7. Send an email to the group of users
            sendNotificationEmailResults = await Promise.all(emailPromises);

            // 8. Set the Notification flag that identifies that this notification has been sent out
            await setFormNotificationFlagTrue(externalReviewerRecommendationsTemplateName, extRevRecRecord.revisionId);

            // 9. Build the success response array with the results of the email sending process
            const processMessage = `Notification sent for record ${extRevRecFormId}.`;
            returnObject = {
                MicroserviceResult: true,
                MicroserviceMessage: 'Microservice completed successfully',
                DocID: wtmfFormId,
                MicroserviceData: formatReturnObjectData(wtmfFormId, processMessage, sendNotificationEmailResults),
            };
        } else {
            const processMessage = `Notification already sent for record ${extRevRecFormId}. Skipping emails.`;
            logger.info(processMessage);

            // Create the following object that will be used when the api call is made to communicate the workflow item is complete.
            // First two items of the object are required to tell if the process completed successfully and the message that should be returned.
            // The other items in the object would have the name of any workflow variable that would be updated with data coming from the microservice/node script.
            returnObject = {
                MicroserviceResult: true,
                MicroserviceMessage: 'Microservice completed successfully',
                DocID: wtmfFormId,
                MicroserviceData: formatReturnObjectData(wtmfFormId, processMessage),
            };
        }
    } catch (err) {
        logger.info('Error encountered' + err.message);

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: err.message,
            MicroserviceData: [],
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
