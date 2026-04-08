/**
 * LibEmailConfirmationForReceivedStatus
 * Category: Workflow
 * Modified: 2025-10-21T14:22:47.407Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: 73cb8365-89ae-f011-82f2-ac04d8d0fca0
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
      Script Name:        LibEmailConfirmationForReceivedStatus
      Customer:           WADNR
      Purpose:            The purpose of this process is to inform the proponent that the Application has been received.
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
                          10/21/2025
      Revision Notes:
                          10/21/2025 - Mauro Rapuano:  First Setup of the script
  */

    logger.info(`Start of the process LibEmailConfirmationForReceivedStatus at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    let outputCollection = [];
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

    /* -------------------------------------------------------------------------- */
    /*                           Helper Functions                                 */
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

    function detectFormTemplateFromID(recordID) {
        //NOTE: Check for longer prefixes first!
        const templateNames = [
            { prefix: 'FPAN-RENEWAL', name: 'FPAN Renewal' },
            {
                prefix: 'FPA-AERIAL-CHEMICAL',
                name: 'Forest Practices Aerial Chemical Application',
            },
            { prefix: 'LT-5DN', name: 'Long-Term Application 5-Day Notice' },
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
            {
                name: 'OTHERFIELDSTOUPDATE',
                value: {},
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

    function setFormNotificationFlagTrue(formTemplateName, recordGUID) {
        const shortDescription = `Update form record ${recordGUID}`;
        const fieldValuesToUpdate = {
            'Notification Flag': 'True',
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

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

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
        const wasSent = relatedRecordLowerized['notification flag'];

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

            // 6. Update notification flag solo si fue enviado
            await setFormNotificationFlagTrue(formTemplateName, relatedRecord.revisionId);
        } else {
            logger.info(`Notification already sent for record ${relatedRecordID}. Skipping emails.`);
        }

        // 7° SUCCESS RESPONSE
        outputCollection[0] = 'Success';
        outputCollection[1] = `Communication sent succesfully.`;
        outputCollection[2] = {
            relatedRecordID,
            'Communication Log details': [...sendNotificationEmailResults],
        };
    } catch (error) {
        logger.info(`Error encountered ${error}`);
        outputCollection[0] = 'Error';
        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors occurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        response.json(200, outputCollection);
    }
};
