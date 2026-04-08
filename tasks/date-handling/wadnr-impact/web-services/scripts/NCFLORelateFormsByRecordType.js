/**
 * NCFLORelateFormsByRecordType
 * Category: Form
 * Modified: 2026-02-19T17:34:56.567Z by santiago.tortu@visualvault.com
 * Script ID: Script Id: 448487dd-aec0-f011-8302-a0aab378b35e
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

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
    Script Name:    NCFLORelateFormsByRecordType
    Customer:       WADNR
    Purpose:        This script establishes relationships between NCFLO forms and FPAN/FPETS records by creating or updating Associated Document Relations based on provided IDs.
    Parameters:     The following represent variables passed into the function:

                    - Form ID:                      The unique identifier of the NCFLO form.
                    - Status:                       The status of the NCFLO form.
                    - Revision ID:                  The GUID of the NCFLO form.
                    - Reforestation Description:    A list of FPAN numbers to associate.
                    - Harvest Strategy Description: A list of FPAN numbers related to harvest strategies.
                    - Conversion Description:       A list of FPETS numbers for conversion of forestland.
                    - Other Description:            Additional FPAN/FPETS numbers to associate.

    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code: 
                    1° Get parameters
                    2° Check if at least one required parameter is present
                    3° Separate FPAN and/or FPETS numbers
                    4° Check if there is an Associated Document Relation record for the current NCFLO record. If not, create it.
                    5° Relate the current form with ARP records if any value was provided.
                    6° Relate the current form with FPETS records if any value was provided.
                    7° Return the output collection
 
    Date of Dev:    11/13/2025
    Last Rev Date:  11/13/2025

    Revision Notes:
                    11/13/2025 - Federico Cuelho:  Updated purpose and parameters.
    */

    logger.info(`Start of the process NCFLORelateFormsByRecordType at ${Date()}`);

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

    const arpTemplateName = 'Application Review Page';
    const icnTemplateName = 'Informal Conference Note';
    const ntcTemplateName = 'Notice to Comply';
    const ncnuTemplateName = 'Notice of Conversion of Nonforested Use';
    const multiPurposeTemplateName = 'Multi-purpose';
    const associatedDocumentRelationTemplateName = 'Associated Document Relation';
    const WADNR_TIMEZONE = 'America/Los_Angeles';
    const dateOnlyISOStringFormat = 'YYYY-MM-DD';

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

    function getFormRecord(getFormsParams, templateName) {
        shortDescription = `Get ${templateName} form record`;

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    async function getCurrentNCFLORevisionId(formId) {
        /*
        Helper function to fetch the current revision ID of an NCFLO form.
        This is needed because the client-provided revision ID may be stale
        after form updates during the submission flow.
        Parameters:
            formId: The Form ID (instanceName) of the NCFLO record
        Returns:
            The current revisionId of the NCFLO form
        */
        const getFormParams = {
            q: `[instanceName] eq '${formId}'`,
            fields: 'revisionId',
        };
        const formTemplateName = 'Notice of Continuing Forest Land Obligation';
        const shortDescription = `Get current NCFLO revision for ${formId}`;

        return vvClient.forms
            .getForms(getFormParams, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0].revisionId);
    }

    async function classifyNumber(number) {
        /*
        Function to determine the type of number (FPAN, ICN, NTC, NCNU, Multi Purpose)
        Parameters:
            number: A string representing the number to classify.
        Returns:
            A string representing the type of the number.
        */

        // Define regex patterns for each number type
        const patterns = {
            FPAN: /^[A-Z]{2}-FPA-\d{2}-\d{4}$/,
            ICN: /^[A-Z]{2}-ICN-\d{2}-\d{4}$/,
            NTC: /^[A-Z]{2}-NTC-\d{2}-\d{4}$/,
            NCNU: /^[A-Z]{2}-NCNU-\d{2}-\d{4}$/,
        };

        // Check if the number matches the FPAN pattern
        if (patterns.FPAN.test(number)) {
            return 'FPAN';
        }

        // Check other patterns (ICN, NTC, NCNU)
        for (const [type, pattern] of Object.entries(patterns)) {
            if (type !== 'FPAN' && pattern.test(number)) {
                // Use getFormRecord to check if it's linked to a Multi Purpose record
                const getMultiPurposeFormParams = {
                    q: `[Document Number] eq '${number}'`,
                    fields: 'form ID, revisionId',
                };
                const multiPurposeRecord = await getFormRecord(getMultiPurposeFormParams, multiPurposeTemplateName);

                if (multiPurposeRecord && multiPurposeRecord.length > 0) {
                    return 'MULTI_PURPOSE';
                }
                return type;
            }
        }

        // If no pattern matches, default to MULTI_PURPOSE
        return 'MULTI_PURPOSE';
    }

    function isNullEmptyUndefined(param) {
        /*
        Helper function to check if a parameter is null, empty, or undefined.
        This function is used to validate inputs and ensure data integrity.
        
        Parameters:
            param: The parameter to validate. Can be of any data type.
        
        Returns:
            A boolean value indicating whether the parameter is null, empty, or undefined.
        */
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

    async function getRecordGUID(type, number) {
        /*
        Helper Function to get the GUID of a record based on its type and number
        Parameters:
            type: The type of the record (e.g., FPAN, ICN, etc.)
            number: The number of the record
        Returns:
            The GUID of the record
        */

        const templateMap = {
            FPAN: arpTemplateName,
            ICN: icnTemplateName,
            NTC: ntcTemplateName,
            NCNU: ncnuTemplateName,
            MULTI_PURPOSE: multiPurposeTemplateName,
        };

        const queryFieldMap = {
            FPAN: '[FPAN Number]',
            ICN: '[ICN Number]',
            NTC: '[NTC Number]',
            NCNU: '[NCNU Number]',
            MULTI_PURPOSE: '[Document Number]',
        };

        const formTemplateName = templateMap[type];
        const queryField = queryFieldMap[type];

        if (!formTemplateName || !queryField) {
            throw new Error(`Unsupported type: ${type}`);
        }

        const getParentFormParams = {
            q: `${queryField} eq '${number}'`,
            fields: 'revisionId',
        };

        return vvClient.forms
            .getForms(getParentFormParams, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, `GetForm from ${formTemplateName}`))
            .then((res) => checkDataPropertyExists(res, `GetForm from ${formTemplateName}`))
            .then((res) => checkDataIsNotEmpty(res, `GetForm from ${formTemplateName}`))
            .then((res) => res.data[0].revisionId);
    }

    async function relateRecordsByDocId(parentRecordGUID, childRecordID) {
        /*
        Helper function to relate records by their Doc IDs
        Parameters:
            parentRecordGUID: The Doc ID of the parent record
            childRecordID: The Doc ID of the child record
        */
        const shortDescription = `Relating forms: ${parentRecordGUID} and form ${childRecordID}`;
        const ignoreStatusCode = '404'; // Avoid hard error if relationship already exists

        return vvClient.forms
            .relateFormByDocId(parentRecordGUID, childRecordID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode));
    }

    async function relateForms(numbersString, formId) {
        /*
        Helper function to relate the current form with records based on the provided numbers
        Parameters:
            numbersString: A comma-separated string of numbers
            formId: The Form ID of the current form record
        */

        const idNumbers = numbersString.split(',').map((num) => num.trim());

        for (const id of idNumbers) {
            try {
                const type = await classifyNumber(id);
                const parentRecordGUID = await getRecordGUID(type, id);
                await relateRecordsByDocId(parentRecordGUID, formId);
            } catch (error) {
                errorLog.push(`Failed to process id ${id}: ${error.message}`);
            }
        }
    }

    function createRecord(templateName, newRecordData) {
        /*
        Helper function to create a new form record
        Parameters:
            templateName: The name of the form template
            newRecordData: An object containing the field data for the new record
        Returns:
            The data property of the response containing the created record information
        */
        const shortDescription = `Post form ${templateName}`;
        return vvClient.forms
            .postForms(null, newRecordData, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function checkAndCreateAssociatedRelationsRecord(fpanNumbers, ncfloFormId, ncfloRevisionId, ncfloFormStatus) {
        /*
        Helper function to check if an Associated Document Relation already exists between the NCFLO form and the ARP records.
        If it doesn't, a new relation will be created.
        
        Parameters:
            fpanNumbers: A comma-separated string of FPAN numbers to process.
            ncfloFormId: The Form ID of the NCFLO record.
            ncfloRevisionId: The GUID of the NCFLO record.
            ncfloFormStatus: The status of the NCFLO form.
        */
        if (fpanNumbers) {
            const fpanArray = fpanNumbers.split(',');

            for (const fpan of fpanArray) {
                const getArpRecordParams = {
                    q: `[FPAN Number] eq '${fpan}'`,
                    fields: 'form ID, revisionId',
                };
                const [arpRecord] = await getFormRecord(getArpRecordParams, arpTemplateName);

                if (isNullEmptyUndefined(arpRecord)) {
                    logger.info(`No ARP record found for FPAN: ${fpan}`);
                    continue;
                }

                // Check if an Associated Document Relation already exists
                const getAssociatedDocRelParams = {
                    q: `[ARP ID or WTM RP ID] eq '${arpRecord['form ID']}' AND [Related Record ID] eq '${ncfloFormId}'`,
                    fields: 'form ID, revisionId',
                };
                const [foundAssociatedDocumentRelation] = await getFormRecord(
                    getAssociatedDocRelParams,
                    associatedDocumentRelationTemplateName
                );

                // If not, create the Associated Document Relation record
                if (isNullEmptyUndefined(foundAssociatedDocumentRelation)) {
                    const currDateStr = dayjs().tz(WADNR_TIMEZONE).startOf('day').format(dateOnlyISOStringFormat);
                    const newRecordData = {
                        'Document Form Name': 'Notice of Continuing Forest Land Obligation',
                        'Document Form Type': 'Form',
                        'Sensitive Indicator': 'Yes',
                        'Document Create By': 'fpOnline',
                        'Document Create Date': currDateStr,
                        'Document Modify By': 'fpOnline',
                        'Document Form Status': ncfloFormStatus,
                        'Document Modify Date': currDateStr,
                        'Document GUID': ncfloRevisionId,
                        'Related Record ID': ncfloFormId,
                        'Document or Form': 'Form',
                        'ARP ID or WTM RP ID': arpRecord['form ID'],
                        'Print Order': 'Not Printed',
                        'Receipt Date': currDateStr,
                    };

                    await createRecord('Associated Document Relation', newRecordData);
                    logger.info(`Created Associated Document Relation for FPAN: ${fpan}`);
                } else {
                    logger.info(`Associated Document Relation already exists for FPAN: ${fpan}`);
                }
            }
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET PARAMETERS
        const ncfloFormId = getFieldValueByName('Form ID');
        const ncfloFormStatus = getFieldValueByName('Status');
        const reforestFPANs = getFieldValueByName('Reforestation Description');
        const harvestStrategyFPANs = getFieldValueByName('Harvest Strategy Description');
        const convertForestlandFPANsFPETs = getFieldValueByName('Convertion Of Forestland Description');
        const otherFPANsFPETs = getFieldValueByName('Other Description');

        // 2° CHECK IF AT LEAST ONE REQUIRED PARAMETER IS PRESENT
        const hasAtLeastOneValue =
            reforestFPANs || harvestStrategyFPANs || convertForestlandFPANsFPETs || otherFPANsFPETs;

        if (!ncfloFormId || !ncfloFormStatus || !hasAtLeastOneValue) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        const ncfloRevisionId = await getCurrentNCFLORevisionId(ncfloFormId);

        // 3° SEPARATE FPAN AND/OR FPETS NUMBERS
        // Each source field may contain one or multiple IDs separated by commas.
        // Normalize into an array of individual, trimmed, uppercased IDs.
        const fpanOrFpetsNumbers = [reforestFPANs, harvestStrategyFPANs, convertForestlandFPANsFPETs, otherFPANsFPETs]
            .filter(Boolean) // Drop empty/null values
            .join(',') // Combine then split to support fields with multiple comma-separated IDs
            .split(',')
            .map((id) => id.trim().toUpperCase()) // Trim whitespace and convert to uppercase
            .filter((str) => str); // Remove empty strings

        // Separate FPAN and FPET numbers
        const classificationResults = await Promise.all(fpanOrFpetsNumbers.map((id) => classifyNumber(id)));
        const fpanNumbers = fpanOrFpetsNumbers.filter((_, idx) => classificationResults[idx] === 'FPAN').join(',');
        const fpetsNumbers = fpanOrFpetsNumbers
            .filter((_, idx) => classificationResults[idx] && classificationResults[idx] !== 'FPAN')
            .join(',');

        // 4° CHECK IF AN ASSOCIATED DOCUMENT RELATION ALREADY EXISTS BETWEEN THE NCFLO FORM AND THE ARP RECORDS
        // IF NOT, CREATE IT.
        await checkAndCreateAssociatedRelationsRecord(fpanNumbers, ncfloFormId, ncfloRevisionId, ncfloFormStatus);

        // 5° RELATE THE ARPs BY FPAN NUMBER IF ANY VALUE WAS PROVIDED
        if (fpanNumbers) {
            await relateForms(fpanNumbers, ncfloFormId);
        }

        // 6° RELATE THE FPETS IF ANY VALUE WAS PROVIDED
        if (fpetsNumbers) {
            await relateForms(fpetsNumbers, ncfloFormId);
        }

        // 7° BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] =
            'Records related successfully. Associated Document Relation records have been updated or created';
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
