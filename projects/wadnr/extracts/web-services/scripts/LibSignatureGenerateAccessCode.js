/**
 * LibSignatureGenerateAccessCode
 * Category: Workflow
 * Modified: 2026-01-09T16:43:16.127Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: 1f8ffdca-b8cd-ef11-82bf-a0dcc70b93c8
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
    Script Name:    LibSignatureGenerateAccessCode
    Customer:       WADNR
    Purpose:        Generates a unique, 6-digit access code based on the Related Record ID,
                    ensuring each code is distinct and traceable.
    Preconditions:

    Parameters:     The following represent variables passed into the function:
                    Related Record ID: (String, required) The identifier of the form for which the access code is being generated (e.g., FPAN ID).
                    Contact Information Relation ID: (String, required) The identifier of the contact information relation associated with the signer.
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code:
                    1 Get the values of the fields
                    2 Check if the required parameters are present and complete list of holidays
                    3 Verify that the Contact Information Relation ID is valid and corresponds to the provided Related Record ID in the Contact Information Relation form
                    4 Access Code Generation
                    5 Uniqueness Check
                    6 Access Code Record Creation
                    7 Build the success response array

    Date of Dev:    01/08/2025
    Last Rev Date:  03/19/2025

    Revision Notes:
                    01/08/2025 - Alfredo Scilabra:  First Setup of the script
                    03/19/2025 - Alfredo Scilabra:  Fix expiration date format
                    07/11/2025 - Lucas Gali: Added template name to the Access Code record
                    01/09/2026 - Alfredo Scilabra: Add a function to disable previous Access Codes for signer

    */

    logger.info(`Start of the process LibSignatureGenerateAccessCode at ${Date()}`);
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

    const MAX_CODE_GENERATION_ATTEMPTS = 25; //Exit condition to do-while loop for code generation
    const MAX_ACCESS_CODE_VALUE = 999999;
    const ACCESS_CODE_INCREMENT_RATE = 1;
    const BUSINESS_DAYS_TO_CALCULATE_EXPIRATION = '7';

    const FormTemplatePrefixListQueryName = 'zWebSvc Form Template Prefix List';

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

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        if (!vvClientRes.meta) {
            throw new Error(
                `${shortDescription} error. No meta object found in response. Check method call parameters and credentials.`
            );
        }

        const status = vvClientRes.meta.status;
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
        const status = vvClientRes.meta.status;
        if (status != ignoreStatusCode) {
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
                        `${shortDescription} returned an error. Please, check called Web Service. Status: ${status}.`
                    );
                }
            }
        }
        return vvClientRes;
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

    async function getForm(getFormsParams, templateName) {
        shortDescription = `Get ${templateName} form record`;

        const getFormsRes = await vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));

        return getFormsRes.data;
    }

    function createRecord(formTemplateName, newRecordData) {
        const shortDescription = `Post form ${formTemplateName}`;

        return vvClient.forms
            .postForms(null, newRecordData, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
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

    function generateAccessCode() {
        const randomCode = Math.floor(Math.random() * 1000000).toString();
        return randomCode.padStart(6, '0');
    }

    function incrementAccessCode(accessCode) {
        let incrementedCode = parseInt(accessCode, 10) + ACCESS_CODE_INCREMENT_RATE;

        // Handle overflow if the code exceeds MAX_ACCESS_CODE_VALUE
        if (incrementedCode > MAX_ACCESS_CODE_VALUE) {
            incrementedCode = generateAccessCode();
        }

        return incrementedCode.toString().padStart(6, '0');
    }

    async function isCodeUnique(accessCode, relatedRecordID) {
        const [foundAccessCode] = await getForm(
            {
                q: `[Access Code Number] eq '${accessCode}' AND [Related Record ID] eq '${relatedRecordID}'`,
                fields: 'revisionId',
            },
            'Access Code'
        );
        return isNullEmptyUndefined(foundAccessCode);
    }

    async function getExpirationDate() {
        const [LibCalculateBusinessDateStatus, , { calculatedDate }] = await callExternalWs(
            'LibCalculateBusinessDate',
            [
                {
                    name: 'Start Date',
                    value: dayjs().format('YYYY-MM-DD'),
                },
                {
                    name: 'Number of Business Days',
                    value: BUSINESS_DAYS_TO_CALCULATE_EXPIRATION,
                },
            ]
        );

        if (LibCalculateBusinessDateStatus !== 'Success') {
            throw new Error('An error ocurred trying to calculate expiration date.');
        }

        const expirationDate = new Date(calculatedDate);
        return expirationDate.toLocaleDateString('en-US');
    }

    function getCustomQueryData(queryName, customQueryParams, shortDescription = `Custom Query for '${queryName}'`) {
        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, customQueryParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getFormPrefix(formID) {
        const prefixReg = /^([A-Za-z0-9-]+)-\d+$/;
        let formPrefix = '';
        try {
            formPrefix = prefixReg.exec(formID)[1];
        } catch (error) {
            throw new Error(`Unable to parse form prefix for: "${formID}". ${error.message}`);
        }

        return formPrefix;
    }

    async function getTemplateNameFromID(formID) {
        let formPrefix = getFormPrefix(formID);
        formPrefix += '-'; // add trailing dash since query returns prefixes in this format

        const [formTemplate] = await getCustomQueryData(FormTemplatePrefixListQueryName, {
            limit: 1,
            q: `[prefix] eq '${formPrefix}'`,
        });

        if (!formTemplate?.templateName) {
            throw new Error(`Unable to find form template name for prefix "${formPrefix}"`);
        }

        return formTemplate.templateName;
    }

    function updateRecord(formTemplateName, recordGUID, fieldValuesToUpdate) {
        const shortDescription = `Update form record ${recordGUID}`;

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function disablePreviousAccessCode(contactInformationRelationId, relatedRecordId) {
        const foundAccessCode = await getForm(
            {
                q: `[Contact Information Relation ID] eq '${contactInformationRelationId}' AND [Related Record ID] eq '${relatedRecordId}' AND [Status] eq 'Enabled'`,
                fields: 'revisionId',
            },
            'Access Code'
        );

        await Promise.all(
            foundAccessCode.map((accessCode) =>
                updateRecord('Access Code', accessCode.revisionId, {
                    Status: 'Disabled',
                })
            )
        );
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1 Get the values of the fields
        const relatedRecordID = getFieldValueByName('Related Record ID');
        const contactInformationRelationID = getFieldValueByName('Contact Information Relation ID');

        // 2 Check if the required parameters are present and complete list of holidays
        if (!relatedRecordID || !contactInformationRelationID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3 Verify that the Contact Information Relation ID is valid and corresponds to the provided Related Record ID in the Contact Information Relation form
        const [contactInformationRelationRecord] = await getForm(
            {
                q: `[Contact Information Relation ID] eq '${contactInformationRelationID}' AND [Related Record ID] eq '${relatedRecordID}'`,
                fields: 'revisionId',
            },
            'Contact Information Relation'
        );

        if (!contactInformationRelationRecord) {
            throw new Error('Contact Information Relation not found');
        }

        // get the form template name from the Related Record ID
        const formTemplateName = await getTemplateNameFromID(relatedRecordID);

        // 4 Access Code Generation +
        // 5 Uniqueness Check
        let codeGenerationAttempts = 0,
            isAccessCodeUnique = false,
            accessCode = '';

        do {
            accessCode = accessCode === '' ? generateAccessCode() : incrementAccessCode(accessCode);
            isAccessCodeUnique = await isCodeUnique(accessCode, relatedRecordID);
            codeGenerationAttempts++;
        } while (!isAccessCodeUnique && codeGenerationAttempts <= MAX_CODE_GENERATION_ATTEMPTS);

        if (!isAccessCodeUnique) {
            throw new Error(
                "Unique access code couldn't be generated. Max generation attempts reached, please try again."
            );
        }

        // 6 Access Code Record Creation
        const expirationDate = await getExpirationDate();

        //Disable previous access codes
        await disablePreviousAccessCode(contactInformationRelationID, relatedRecordID);

        const newAccessCode = await createRecord('Access Code', {
            'Related Record ID': relatedRecordID,
            'Contact Information Relation ID': contactInformationRelationID,
            'Access Code Number': accessCode,
            'Expiration Date': expirationDate,
            'Related Record Type': formTemplateName,
            Status: 'Enabled',
        });

        if (!newAccessCode) {
            throw new Error('An error ocurred while creating the new Access Code');
        }

        // 7 Build the success response array
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Target date calculated succesfully';
        outputCollection[2] = { 'Access Code GUID': newAccessCode.revisionId };
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
