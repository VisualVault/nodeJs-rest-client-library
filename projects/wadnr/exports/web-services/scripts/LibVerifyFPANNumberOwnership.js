/**
 * LibVerifyFPANNumberOwnership
 * Category: Workflow
 * Modified: 2026-03-30T11:31:21.763Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: 82b50903-0d88-f011-82e8-e147d2d9cd9a
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
    Script Name:    LibVerifyFPANNumberOwnership
    Customer:       WADNR
    Purpose:        The LibVerifyFPANNumberOwnership library validates that a provided FPAN Number belongs to the specified Proponent
    Preconditions:  -
    Parameters:     The following represent variables passed into the function:
                    FPAN_Number (String, Required): The FPAN Number to validate
                    IndividualId (String/Guid, Required): The Proponent’s Individual ID to validate ownership.
                    ChildFormID (String, Required): The instanceName of the calling (child) form that is requesting auto-population
                    IsOfficeStaff (Boolean, Optional): Flag to indicate if the user is office staff. If true, IndividualId validation will be skipped.
                    ltaStep2 (Boolean, Optional): Flag to indicate if validation is for LTA Step 2. If true, verifies FPAN belongs to LTA Step 1.
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Form related data
    Pseudo code:
                    1° Get the values of the fields
                    2° Check if the required parameters are present
                    3° Cross-form search for FPAN Number
                    4° Ownership Validation
                       - If ltaStep2 is true:
                         * Validate FPAN belongs to LTA Step 1
                         * Validate ChildFormID matches the LTA Step 1 found
                         * Validate ChildFormID exists and has the correct FPAN Number
                       - Validate FPAN belongs to specified Proponent
                    5° On success, retrieve related data
                    6° Build the success response array

    Date of Dev:    09/02/2025

    Revision Notes:
                    09/02/2025 - Mauro Rapuano:  First Setup of the script
                    10/30/2025 - Santiago Tortu: Added ltaStep2 parameter for LTA Step 2 validation.
                    12/24/2025 - Mauro Rapuano: For LTA Step 2 scenario, only search in Step 1 Long Term FPA forms.
    */

    logger.info(`Start of the process LibVerifyFPANNumberOwnership at ${Date()}`);

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
    const libFPANGetRelatedData = 'LibFPANGetRelatedData';

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

    async function crossFormSearch(fpanNumber, individualId, isOfficeStaff, isLtaStep2) {
        const formSearches = isLtaStep2
            ? [() => searchMainForm(fpanNumber, 'Step 1 Long Term FPA')]
            : [
                  () => searchMainForm(fpanNumber, 'Forest Practices Application Notification'),
                  () => searchMainForm(fpanNumber, 'Step 1 Long Term FPA'),
                  () => searchMainForm(fpanNumber, 'Forest Practices Aerial Chemical Application'),
              ];

        for (const formSearch of formSearches) {
            const records = await formSearch();
            let latestRecord = getLatestRecord(records, individualId, isOfficeStaff);

            if (latestRecord) {
                return latestRecord;
            }
        }

        // If no record is found in any of the forms, return null
        return null;
    }

    function searchMainForm(fpanNumber, formTemplateName) {
        const shortDescription = `Get ${formTemplateName} with FPAN Number eq to ${fpanNumber}`;
        const getFormsParams = {
            q: `[FPAN Number] eq '${fpanNumber}'`,
            //expand: true,
            fields: 'Individual ID, Date Of Receipt, createDate',
        };

        return (
            vvClient.forms
                .getForms(getFormsParams, formTemplateName)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                //.then((res) => checkDataIsNotEmpty(res, shortDescription)) // Comment out this line if the query could have no match
                .then((res) => res.data)
        );
    }

    function getLatestRecord(records, individualId, isOfficeStaff) {
        if (!Array.isArray(records) || records.length === 0) {
            return null;
        }

        // Filter records by Date Of Receipt, if more than one is available, get the most recent one
        let filterFn = isOfficeStaff
            ? (r) => r['date of Receipt']
            : (r) => r['date of Receipt'] && r['individual ID'] === individualId;

        const filteredByDateOfReceipt = records.filter(filterFn);
        if (filteredByDateOfReceipt.length > 0) {
            filteredByDateOfReceipt.sort((a, b) => new Date(b['date of Receipt']) - new Date(a['date of Receipt']));
            return filteredByDateOfReceipt[0];
        }

        // Filter records by Created Date, if more than one is available, get the most recent one
        filterFn = isOfficeStaff
            ? (r) => r['createDate']
            : (r) => r['createDate'] && r['individual ID'] === individualId;
        const filteredByCreatedDate = records.filter(filterFn);
        if (filteredByCreatedDate.length > 0) {
            filteredByCreatedDate.sort((a, b) => new Date(b['createDate']) - new Date(a['createDate']));
            return filteredByCreatedDate[0];
        }

        return records[0] || null;
    }

    async function callLibFPANGetRelatedData(fpanNumber, formId) {
        const shortDescription = `Run Web Service: ${libFPANGetRelatedData}`;

        const webServiceParams = [
            {
                name: 'relatedRecordID',
                value: fpanNumber,
            },
            {
                name: 'Form ID',
                value: formId,
            },
        ];

        return vvClient.scripts
            .runWebService(libFPANGetRelatedData, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function detectFormTemplateFromID(recordID) {
        //NOTE: Check for longer prefixes first!
        const templateMap = new Map([
            ['STEP-1-LONG-TERM-FPA', 'Step 1 Long Term FPA'],
            ['FPA-AERIAL-CHEMICAL', 'Forest Practices Aerial Chemical Application'],
            ['FPAN', 'Forest Practices Application Notification'],
        ]);

        const normalizedID = recordID.replace(/\s+/g, '');

        for (const [prefix, name] of templateMap) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return name;
            }
        }

        throw new Error('Form template name not found.');
    }

    async function validateChildFormRelationship(childFormID, fpanNumber, ltaStep1FormId) {
        /*
        Validates that the childFormID (LTA Step 1) has the correct FPAN Number
        Parameters:
            childFormID: The instanceName of the LTA Step 1 form being validated
            fpanNumber: The FPAN Number that should match
            ltaStep1FormId: The instanceName of the LTA Step 1 form found by FPAN search (should match childFormID)
        */
        const shortDescription = `Get LTA Step 1 form ${childFormID}`;

        // The ChildFormID should be the same as the LTA Step 1 found by the FPAN Number
        if (childFormID !== ltaStep1FormId) {
            throw new Error(
                `The ChildFormID provided (${childFormID}) does not match the LTA Step 1 Application found for FPAN Number (${fpanNumber}).`
            );
        }

        // Additional validation: Verify the form exists and has the correct FPAN Number
        let childFormTemplateName;
        try {
            childFormTemplateName = detectFormTemplateFromID(childFormID);
        } catch (error) {
            throw new Error(`The ChildFormID provided (${childFormID}) has an invalid format.`);
        }

        // Verify it's a Step 1 Long Term FPA form
        if (childFormTemplateName !== 'Step 1 Long Term FPA') {
            throw new Error(`The ChildFormID provided (${childFormID}) is not a Step 1 Long Term FPA form.`);
        }

        // Get the child form to verify it exists and has the correct FPAN Number
        const getChildFormParams = {
            q: `[instanceName] eq '${childFormID}'`,
            fields: 'FPAN Number',
        };

        const childFormData = await vvClient.forms
            .getForms(getChildFormParams, childFormTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);

        // Check if the child form exists
        if (!childFormData || childFormData.length === 0) {
            throw new Error(`The ChildFormID provided (${childFormID}) does not exist in the fpOnline system.`);
        }

        const childForm = childFormData[0];

        // Try multiple field name variations as VV API may return different casing
        let childFPANNumber =
            childForm['FPAN Number'] ||
            childForm['fpan Number'] ||
            childForm['fpanNumber'] ||
            childForm['fPAN Number'] ||
            '';

        // If still not found, search all keys case-insensitively
        if (!childFPANNumber) {
            const formKeys = Object.keys(childForm);
            const fpanKey = formKeys.find((key) => key.toLowerCase().replace(/\s+/g, '') === 'fpannumber');
            if (fpanKey) {
                childFPANNumber = childForm[fpanKey];
            }
        }

        // Verify that the child form has the correct FPAN Number
        if (!childFPANNumber || childFPANNumber !== fpanNumber) {
            throw new Error(
                `The ChildFormID provided (${childFormID}) has FPAN Number "${childFPANNumber}" which does not match the provided FPAN Number "${fpanNumber}".`
            );
        }

        return true;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° Get the values of the fields
        const fpanNumber = getFieldValueByName('FPAN_Number');
        const childFormID = getFieldValueByName('ChildFormID');
        const isOfficeStaff = getFieldValueByName('IsOfficeStaff', true);
        const ltaStep2 = getFieldValueByName('ltaStep2', true);
        const individualId = !isOfficeStaff
            ? getFieldValueByName('IndividualId')
            : getFieldValueByName('IndividualId', true);

        // 2° Check if the required parameters are present
        if (!fpanNumber || (!isOfficeStaff && !individualId) || !childFormID) {
            throw new Error(errorLog.join('; '));
        }

        // 3° Cross-form search for FPAN Number
        let relatedForm = await crossFormSearch(fpanNumber, individualId, isOfficeStaff, ltaStep2);

        if (!relatedForm) {
            throw new Error(`The FPAN Number provided does not exist within the fpOnline system.`);
        }

        // 4° Ownership Validation
        let {
            instanceName: formId,
            ['date of Receipt']: dateOfReceipt,
            ['individual ID']: parentIndividualId,
        } = relatedForm;

        let formType = detectFormTemplateFromID(formId);
        let ltaStep1Validated = false;
        let successMessage = 'Ownership verified and related data retrieved successfully';

        // Validate LTA Step 1 requirement if ltaStep2 parameter is true
        if (ltaStep2 === true || ltaStep2 === 'true' || ltaStep2 === 'True') {
            if (formType !== 'Step 1 Long Term FPA') {
                throw new Error(`The FPAN Number provided does not belong to an LTA Step 1 Application.`);
            }

            // Validate that the ChildFormID is correctly related to the FPAN Number and LTA Step 1
            //await validateChildFormRelationship(childFormID, fpanNumber, formId);

            ltaStep1Validated = true;
            successMessage =
                'LTA Step 1 validation successful. Ownership verified and related data retrieved successfully';
        }

        // Validate that the FPAN belongs to the specified Proponent
        if (!isOfficeStaff && parentIndividualId !== individualId) {
            throw new Error(`The FPAN Number provided does not belong to the specified Proponent.`);
        }

        // 5° On success, retrieve related data

        let relatedData = await callLibFPANGetRelatedData(fpanNumber, childFormID);

        // 6° Build the success response array

        const returnObj = {
            fpanNumber,
            formType,
            formId,
            relatedRecordId: formId,
            childFormID,
            dateOfReceipt,
            ltaStep1Validated,
            ...relatedData[2],
        };

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = successMessage;
        outputCollection[2] = returnObj;
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
