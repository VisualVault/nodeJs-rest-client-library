/**
 * WorkflowEmailConfirmationForReceivedStatus
 * Category: Workflow
 * Modified: 2026-03-18T03:24:03.4Z by nicolas.culini@visualvault.com
 * Script ID: Script Id: 94b6b630-6a11-f011-82c9-b8f97820bf87
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
      Script Name:        WorkflowEmailConfirmationForReceivedStatus
      Customer:           WADNR
      Purpose:            The purpose of this process is to inform the proponent that the Application has been received.
                          Used by "Application - M - Received Status" workflow
      Preconditions:
                          - It is necessary to have an application that has the FPAN Number, Region, Project Name, and Date of Receipt
      Parameters:
                          - Form ID: String
                          - Email Name: String
      Psuedo code:
                          1. Receive parameters
                          2. Check if the required parameters are present
                          3. Identify signers from Contact Information Relation
                          4. Retrieve the contacts of each signer
                          5. Create Communication Log and send email notification
                          6. Update notification flag

      Date of Dev:
                          04/05/2025
      Revision Notes:
                          04/05/2025 - Fernando Chamorro:  First Setup of the script
                          06/10/2025 - Fernando Chamorro:  Removing FPAN Number param
                          07/10/2025 - John Sevilla:       Make related record obj properties case insensitive to prevent access issues
                          07/22/2025 - John Sevilla:       Add conditionally present comma between FPAN Number and Project Name fields
                          07/22/2025 - Alfredo Scilabra:   Add Date of Receipt field mapping
                          08/28/2025 - Fernando Chamorro:  Allow a single notification sending
                          12/29/2025 - Alfredo Scilabra:  Add Received Notification Sent flag update
                          02/19/2026 - Alfredo Scilabra: Added support for primary record ID
  */

    logger.info('Start of the process WorkflowEmailConfirmationForReceivedStatus at ' + Date());

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

    // NOTE: Add here the field name mapping for the email template to work properly
    // There should be no need to worry about case sensitivity of the Region field name in this mapping
    const REGION_NAME_FIELD_MAPPING = {
        'FPAN Renewal': 'Region',
        'Step 1 Long Term FPA': 'Region',
        'Forest Practices Aerial Chemical Application': 'Region',
        'Forest Practices Application Notification': 'Region',
        'Long-Term Application 5-Day Notice': 'Region Project Information',
    };

    const DATE_OF_RECEIPT_FIELD_MAPPING = {
        'FPAN Renewal': 'Date of Receipt',
        'Step 1 Long Term FPA': 'Date of Receipt',
        'Forest Practices Aerial Chemical Application': 'Received Date',
        'Forest Practices Application Notification': 'Date of Receipt',
        'Long-Term Application 5-Day Notice': 'Date of Receipt',
    };

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

    function formatUTCDate(utcDateStr) {
        if (!utcDateStr) return '';

        const date = new Date(utcDateStr);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();

        return `${month}/${day}/${year}`;
    }

    async function getForms(getFormsParams, templateName) {
        shortDescription = `Get ${templateName} form record`;

        const getFormsRes = await vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));

        return getFormsRes.data;
    }

    function callExternalWs(webServiceName, webServiceParams) {
        let shortDescription = `Run Web Service: ${webServiceName}`;

        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function getContactInformationRelationRecords(relatedRecordID) {
        const contactInformationRelationRecords = await getForms(
            {
                q: `[Related Record ID] eq '${relatedRecordID}' AND [Status] eq 'Enabled'`,
                expand: true,
            },
            'Contact Information Relation'
        );

        if (isNullEmptyUndefined(contactInformationRelationRecords)) {
            throw new Error('No contact records found associated to the application.');
        }

        return contactInformationRelationRecords;
    }

    async function getContactInformationRecords(contactInformationRelationRecords) {
        const contactInformationIDString = contactInformationRelationRecords
            .map((el) => `'${el['contact Information ID']}'`)
            .join(',');

        const contactInformationRecords = await getForms(
            {
                q: `[Contact Information ID] IN (${contactInformationIDString}) AND [Status] eq 'Enabled'`,
                expand: true,
            },
            'Contact Information'
        );

        if (isNullEmptyUndefined(contactInformationRecords)) {
            throw new Error('Error getting contact information.');
        }

        return contactInformationRecords;
    }

    // NOTE: Including only templates used by "Application - M - Received Status"
    function detectFormTemplateFromID(recordID) {
        //NOTE: Check for longer prefixes first!
        const templateNames = [
            {
                prefix: 'FPA-AERIAL-CHEMICAL',
                name: 'Forest Practices Aerial Chemical Application',
            },
            { prefix: 'FPAN', name: 'Forest Practices Application Notification' },
            { prefix: 'STEP-1-LONG-TERM-FPA', name: 'Step 1 Long Term FPA' },
        ];

        const normalizedID = recordID.replace(/\s+/g, ''); // Remove spaces

        for (const { prefix, name } of templateNames) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return name;
            }
        }

        throw new Error('Form template name not found.');
    }

    async function getRelatedRecord(relatedRecordID, formTemplateName) {
        const relatedRecord = await getForms(
            {
                q: `[instanceName] eq '${relatedRecordID}'`,
                expand: true,
            },
            formTemplateName
        );

        if (isNullEmptyUndefined(relatedRecord)) {
            throw new Error('Error getting related record information.');
        }

        return relatedRecord;
    }

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

    function setFormNotificationFlagTrue(formTemplateName, recordGUID) {
        const shortDescription = `Update form record ${recordGUID}`;
        const fieldValuesToUpdate = {
            'Received Notification Sent': 'True',
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
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

    /**********
    MAIN CODE
  **********/

    try {
        // 1. Receive parameters
        const relatedRecordID = getFieldValueByName('Form ID');
        const emailName = getFieldValueByName('Email Name');

        // 2. Check if the required parameters are present
        if (!relatedRecordID || !emailName) {
            throw new Error(errorLog.join('; '));
        }

        // 3. Identify signers from Contact Information Relation
        const contactInformationRelationRecords = await getContactInformationRelationRecords(relatedRecordID);

        // 4. Retrieve the contacts of each signer
        const contactInformationRecords = await getContactInformationRecords(contactInformationRelationRecords);

        // 5. Create Communication Log and send email notification
        const formTemplateName = detectFormTemplateFromID(relatedRecordID);
        const [relatedRecord] = await getRelatedRecord(relatedRecordID, formTemplateName);

        // lowerize keys for easier access of field data
        const relatedRecordLowerized = lowerizeObjectKeys(relatedRecord);
        const wasSent = relatedRecordLowerized['received Notification Sent'];

        let sendNotificationEmailResults = [];

        if (wasSent !== 'True') {
            const emailPromises = contactInformationRecords
                .filter((contact) => !isNullEmptyUndefined(contact.email))
                .map((contactInformation) => {
                    const fpanNumberAndProjectName = [];

                    if (relatedRecordLowerized['fpan number']) {
                        fpanNumberAndProjectName.push(relatedRecordLowerized['fpan number']);
                    }

                    if (relatedRecordLowerized['project name']) {
                        fpanNumberAndProjectName.push(relatedRecordLowerized['project name']);
                    }

                    const receiptDateFieldName = DATE_OF_RECEIPT_FIELD_MAPPING[formTemplateName]?.toLowerCase();
                    const dateOfReceipt = relatedRecordLowerized[receiptDateFieldName] || '';

                    const regionFieldName = REGION_NAME_FIELD_MAPPING[formTemplateName]?.toLowerCase();
                    const region = relatedRecordLowerized[regionFieldName] || '';

                    const tokens = [
                        {
                            name: '[FPAN Number and Project Name]',
                            value: fpanNumberAndProjectName.join(', '),
                        },
                        { name: '[Region]', value: region },
                        { name: '[Date Of Receipt]', value: formatUTCDate(dateOfReceipt) },
                    ];

                    return sendNotificationEmail(tokens, contactInformation.email, relatedRecordID, emailName);
                });

            sendNotificationEmailResults = await Promise.allSettled(emailPromises);

            /**
             * 6. Update notification flag
             * @README Please consult notes on WADNR-10286 before removing this code. This sets a flag that prevents
             * "Application - M - Received Status" from running endlessly
             */
            await setFormNotificationFlagTrue(formTemplateName, relatedRecord.revisionId);
        } else {
            logger.info(`Notification already sent for record ${relatedRecordID}. Skipping emails.`);
        }

        // Create the following object that will be used when the api call is made to communicate the workflow item is complete.
        // First two items of the object are required to tell if the process completed successfully and the message that should be returned.
        // The other items in the object would have the name of any workflow variable that would be updated with data coming from the microservice/node script.
        returnObject = {
            MicroserviceResult: true,
            MicroserviceMessage: 'Microservice completed successfully',
            DocID: relatedRecordID,
            'Communication Log details': [...sendNotificationEmailResults],
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
