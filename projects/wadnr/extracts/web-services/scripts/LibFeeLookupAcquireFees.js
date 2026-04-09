/**
 * LibFeeLookupAcquireFees
 * Category: Workflow
 * Modified: 2025-02-11T15:11:08.123Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 2bc16e74-89e8-ef11-82c3-b56430a8b3d1
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
    /* Script Name: LibFeeLookupAcquireFees
     Purpose:       This script retrieves active fees based on the provided Process Type and Fee Type. These parameters are used to match against a Fee Lookup record and "activeness" is determined off of the effectivity dates on the lookup
     Parameters: 
                    Process Type (String, Required)
                    Fee Type (String, Required)
     Return Array:
                    [0] Status: 'Success', 'Error'
                    [1] Object: Active fee information.
     Pseudo code:
                    Step 1. Get active fees using a custom query based on Process Type and Fee Type
                    Step 2. Prepare and send the response array to the client

     Date of Dev: 02/10/2025

     Revision Notes:
     02/10/2025 - John Sevilla: Script migrated and updated for new params
    */

    logger.info('Start of the process LibFeeLookupAcquireFees at ' + Date());

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */
    const getActiveFeesQueryName = 'zWebSvc Get Active Fees by Process and Fee Type';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */
    let outputCollection = [];
    let errorLog = [];
    let errorStatus = 'Error';
    let returnObj = {};

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

        try {
            const field = ffCollection.getFormFieldByName(fieldName);
            const requiredFieldDoesntExists = !isOptional && !field;

            if (requiredFieldDoesntExists) {
                throw new Error(`The field '${fieldName}' was not found.`);
            }

            if (field) {
                let fieldValue = 'value' in field ? field.value : null;
                fieldValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;
                const requiredFieldHasNoValue = !fieldValue && typeof fieldValue !== 'number' && !isOptional;
                const ddSelectItem = fieldValue == 'Select Item';

                if (requiredFieldHasNoValue || ddSelectItem) {
                    throw new Error(`The value property for the field '${fieldName}' was not found or is empty.`);
                }

                return fieldValue;
            }
        } catch (error) {
            errorLog.push(error.message);
        }
    }

    // Function to execute a custom query
    async function getCustomQueryData(queryName, queryParams) {
        // Call getCustomQueryResultsByName
        let customQueryResp = await vvClient.customQuery.getCustomQueryResultsByName(queryName, queryParams);

        // Parse the response to JSON and extract the data object
        customQueryResp = JSON.parse(customQueryResp);
        let customQueryData = customQueryResp.hasOwnProperty('data') ? customQueryResp.data : null;

        // If the status code of the response is not 200, throw an error
        if (customQueryResp.meta.status !== 200) {
            throw new Error(
                `Error encountered when calling getCustomQueryResultsByName. ${customQueryResp.meta.statusMsg}.`
            );
        }

        // If the data object is null or not an array, throw an error
        if (!customQueryData || !Array.isArray(customQueryData)) {
            throw new Error(`Data was not returned when calling getCustomQueryData.`);
        }
        // Return an array of fee
        return customQueryData;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        const processType = getFieldValueByName('Process Type');
        const feeType = getFieldValueByName('Fee Type');

        if (!processType || !feeType) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // Step 1. Get active fees using a custom query based on Process Type and Fee Type
        const queryParams = [
            { parameterName: 'ProcessTypeParameter', value: processType },
            { parameterName: 'FeeTypeParameter', value: feeType },
        ];

        const activeFees = await getCustomQueryData(getActiveFeesQueryName, { params: JSON.stringify(queryParams) });

        // If related fees are found, add the fee IDs to the results
        if (activeFees.length > 0) {
            const activeFeeIDs = activeFees.map((item) => item.dhDocID);

            // Add the complete fee information to the return object
            returnObj = {
                processType,
                feeType,
                feeIDs: activeFeeIDs,
                fees: activeFees,
            };
        } else {
            throw new Error('No active fees were found for the provided Process and Fee Type.');
        }

        // Step 2. Prepare and send the response array to the client
        outputCollection[0] = 'Success';
        outputCollection[1] = returnObj;
    } catch (error) {
        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don't change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors ocurred.';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        // Step 4. Prepare and send the response array to the client (error or success)
        response.json(200, outputCollection);
    }
};
