/**
 * LibFPETSNumberGenerate
 * Category: Workflow
 * Modified: 2025-10-06T12:20:21.443Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: 263f771c-5092-f011-82f5-e43f3109388f
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
    Script Name:    LibFPETSNumberGenerate
    Customer:       WADNR
    Purpose:        The LibFPETSNumberGenerate library generates and assigns official Number Identifiers for
                    FPETS forms (NCNU, NTC, ICN) at the time of submission. It ensures automated, consistent,
                    and concurrency-safe sequencing across all regions and form types.
                    The identifier format is: {RegionCode}-{FormType}-{YY}-{Seq4}
                    Examples:
                    • NCNU → SP-NCN-24-0001
                    • NTC → SP-NTC-24-0001
                    • ICN → SP-ICN-24-0001
                    Region Code: NE, NW, OL, PC, SE, SP
                    Form Type: NCN (for NCNU forms), NTC, ICN
                    YY: last two digits of the submission year
                    Seq4: zero-padded 4-digit sequence, restarting each year per Region + FormType
    Preconditions:
    Parameters:     The following represent variables passed into the function:
                    Form ID (String, Required) — instanceName of the submitted form.
                    Form Type (String, Required) — must be one of: NCN, NTC, ICN.
                    Region Code (String, Required) — must be one of: NE, NW, OL, PC, SE, SP.
                    Submission Date  (String, Required) — Formatted MM/DD/YYYY
                    Update Client Side: (String, Optional) Flag to update client side

    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Unique Reference ID and Date of Receipt
    Pseudo code:
                    1  Get the values of the fields
                    2  Check if the required parameters are present
                    3  Validate regionCode and formType against allowed sets.
                    4  Generate unique identifier
                    5  Persist identifier to the form’s correct field (NCNU No, NTC No, ICN No).
                    6  Build the success response array

    Date of Dev:    10/06/2025

    Revision Notes:
                    09/15/2025 - Alfredo Scilabra:  First Setup of the script
                    10/06/2025 - Alfredo Scilabra:  Added Update Client Side (Opt) to prevent error on submit forms
    */

    logger.info(`Start of the process LibFPETSNumberGenerate at ${Date()}`);

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
    const validRegionCodes = ['NE', 'NW', 'OL', 'PC', 'SE', 'SP'];
    const validFormTypes = ['NCN', 'NTC', 'ICN'];
    const templateNameMap = new Map([
        ['NCN', 'Notice of Conversion to Non Forestry Use'],
        ['NTC', 'Notice to Comply'],
        ['ICN', 'Informal Conference Note'],
    ]);
    const numberFieldMap = new Map([
        ['NCN', 'ncnU Number'],
        ['NTC', 'ntC Number'],
        ['ICN', 'icN Number'],
    ]);
    const toUpdateNumberFieldMap = new Map([
        ['NCN', 'NCNU Number'],
        ['NTC', 'NTC Number'],
        ['ICN', 'ICN Number'],
    ]);

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

    function getFormRecords(getFormsParams, templateName) {
        const shortDescription = `Get form ${templateName}`;
        const overrideGetFormsParams = {
            expand: false,
            ...getFormsParams, // overrides defaults in this object
        };

        return vvClient.forms
            .getForms(overrideGetFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function updateFormRecord(fieldValuesToUpdate, templateName, recordGUID) {
        const shortDescription = `Update form record ${recordGUID}`;
        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, templateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
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

    function extractSeq4(formID, type) {
        const regex = new RegExp(`^${type}[A-Z]*-(\\d+)$`);
        const match = formID.match(regex);

        if (!match) {
            return null; // type doesn't match the formID
        }

        const digits = match[1]; // captured number part
        return digits.slice(-4); // last 4 digits
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1 Get the values of the fields
        const formId = getFieldValueByName('Form ID');
        const regionCode = getFieldValueByName('Region Code');
        const formType = getFieldValueByName('Form Type');
        const submissionDate = getFieldValueByName('Submission Date');
        const updateClientSide = getFieldValueByName('Update Client Side', true) || 'No';

        // 2 Check if the required parameters are present and complete list of holidays
        if (!formId || !regionCode || !formType || !submissionDate) {
            throw new Error(errorLog.join('; '));
        }

        // 3 Check for valid input codes
        if (!validRegionCodes.includes(regionCode.toUpperCase())) {
            throw new Error('Invalid Region Code');
        }

        const upprFormType = formType.toUpperCase();
        if (!validFormTypes.includes(formType.toUpperCase())) {
            throw new Error('Invalid Form Type');
        }

        // 4
        const year = dayjs(submissionDate).year().toString().substring(2);
        const uniqueNumber = extractSeq4(formId, upprFormType);
        const uniqueReferenceID = `${regionCode}-${upprFormType}-${year}-${uniqueNumber}`;

        const targetNumberField = numberFieldMap.get(upprFormType);
        const targetToUpdateNumberField = toUpdateNumberFieldMap.get(upprFormType);
        const targetTemplateName = templateNameMap.get(upprFormType);

        // 5
        const [targetRecord] = await getFormRecords(
            {
                q: `[instanceName] eq '${formId}'`,
                expand: true,
            },
            targetTemplateName
        );

        const doUpdate =
            targetRecord &&
            isNullEmptyUndefined(targetRecord[targetNumberField]) &&
            updateClientSide.toLowerCase() === 'no';

        if (doUpdate) {
            await updateFormRecord(
                {
                    [targetToUpdateNumberField]: uniqueReferenceID,
                },
                targetTemplateName,
                targetRecord.revisionId
            );
        }

        // 6
        const returnObj = {
            formId,
            formType: upprFormType,
            regionCode,
            year,
            sequence: uniqueNumber,
            numberIdentifier: uniqueReferenceID,
        };

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Identifier generated successfully';
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
