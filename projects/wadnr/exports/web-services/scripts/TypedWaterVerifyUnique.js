/**
 * TypedWaterVerifyUnique
 * Category: Form
 * Modified: 2025-06-04T12:26:26.503Z by patricio.bonetto@visualvault.com
 * Script ID: Script Id: dc6ba779-62d7-ef11-82c3-a94025797804
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
    Script Name:    TypedWaterVerifyUnique 
    Customer:       WA FNR: fpOnline
    Purpose:        Verify the record is unique given its parent.
    Date of Dev:    01/20/2025
    Last Rev Date:  01/20/2025 (Creation)

    Pseudo code: 
                    1° Receives form Id, Related form Id, Activity and Water Types
                    2° Verifies the record to be created is unique
                    3° Returns either Success or Error

    Revision Notes:
    01/20/2025 - Patricio Bonetto:  First Setup of the script
    02/03/2025 - Moises Savelli: Bug Fixing WADNR-2581
    */

    logger.info(`Start of the process TypedWaterVerifyUnique at ${Date()}`);

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

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // GET THE VALUES OF THE FIELDS

        const typedWaterId = getFieldValueByName('Typed Water ID');
        const relatedRecordId = getFieldValueByName('Related Record ID');
        const activity = getFieldValueByName('Activity');
        const typeFWater = getFieldValueByName('Type F Water');
        const typeSWater = getFieldValueByName('Type S Water');
        const typeNpWater = getFieldValueByName('Type Np Water');
        const typeNsWater = getFieldValueByName('Type Ns Water');

        if (!typedWaterId || !relatedRecordId || !typeFWater || !typeSWater || !typeNpWater || !typeNsWater) {
            // It could be more than one error, so we need to send all of them in one response
            throw new Error(errorLog.join('; '));
        }

        // DEFINE THE QUERY VALUE

        query = `[Related Record ID] eq '${relatedRecordId}' AND [Activity] eq '${activity}' AND [Type F Water] eq '${typeFWater}' AND [Type S Water] eq '${typeSWater}' AND [Type Np Water] eq '${typeNpWater}' AND [Type Ns Water] eq '${typeNsWater}' AND [Status] neq 'Disabled'`;

        // CALL THE LIBRARY AND EVALUATE THE RESPONSE

        const uniqueRecordArr = [
            {
                name: 'templateId',
                value: 'Typed Water',
            },
            {
                name: 'query',
                value: query,
            },
            {
                name: 'formId',
                value: typedWaterId,
            },
        ];

        shortDescription = `Executing LibFormVerifyUniqueRecord for Typed Water: '${typedWaterId}'`;
        const verifyUniqueResp = await vvClient.scripts
            .runWebService('LibFormVerifyUniqueRecord', uniqueRecordArr)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));

        const verifyUniqueStatus = verifyUniqueResp.data['status'];

        if (verifyUniqueStatus === 'Not Unique') {
            errorLog.push(
                "We couldn't save the form because another Typed Water record with the same identifier already exists. Please update the Activity and/or the selected Water Types, or review the existing records to proceed."
            );
            throw new Error();
        }

        // BUILD THE RETURN OBJECT
        outputCollection[0] = 'Success';
        outputCollection[1] = `Unique, this form is '${verifyUniqueStatus}'`;
        outputCollection[2] = verifyUniqueStatus;
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY

        outputCollection[0] = 'Error';

        if (errorLog.length > 0) {
            outputCollection[1] = 'Errors encountered';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
            outputCollection[3] =
                "We couldn't save the form because another Typed Water record with the same identifier already exists. Please update the Activity and/or the selected Water Types, or review the existing records to proceed.";
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        // SEND THE RESPONSE

        response.json(200, outputCollection);
    }
};
