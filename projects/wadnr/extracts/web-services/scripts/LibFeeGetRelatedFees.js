/**
 * LibFeeGetRelatedFees
 * Category: Workflow
 * Modified: 2025-02-07T18:37:59.533Z by john.sevilla@visualvault.com
 * Script ID: Script Id: f860ecfa-7ae5-ef11-82c1-fe2ae3bd930b
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
    /* Script Name: LibFeeGetRelatedFees
     Purpose: This script retrieves related fees based on a given Fee ID. Another way to think about related fees is as "sibling" fees (fees that have the same parent fee)
     Parameters:    Fee ID (String, Required) - The unique identifier of the Fee.
     Return Array:
                    [0] Status: 'Success', 'Error'
                    [1] Object: An object containing parent Fee ID and related fee IDs (if they exist)
     Pseudo code:
                    Step 1. Get related fees using a custom query based on Fee ID
                    Step 2. Construct the related fees object
                    Step 3. Prepare and send the response array to the client

     Date of Dev: 02/07/2025
     Revision Notes:
     02/07/2025 - John Sevilla: Script migrated and modified for new params
  */

    logger.info('Start of the process LibFeeGetRelatedFees at ' + Date());

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */
    const missingFieldGuidance = 'Please provide a value for the missing field(s).';
    const getRelatedFeesQueryName = 'zWebSvc Get Related Fees';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */
    let outputCollection = [];
    let errorLog = [];
    let errorStatus = 'Error';

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

    // Check if field object has a value property and that value is truthy before returning value.
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

    // Function to execute a custom query
    async function getCustomQueryData(queryName, queryParams) {
        // Call getCustomQueryResultsByName
        let customQueryResp = await vvClient.customQuery.getCustomQueryResultsByName(queryName, queryParams);

        // Parse the response to JSON and extract the data object
        customQueryResp = JSON.parse(customQueryResp);
        const customQueryData = customQueryResp.hasOwnProperty('data') ? customQueryResp.data : null;

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
        //Return the data array
        return customQueryData;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */
    try {
        const FeeID = getFieldValueByName('Fee ID');

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        const sqlParams = [{ parameterName: 'FeeIDParameter', value: FeeID.trim() }];
        const customQueryGetRelatedFeeItemsParams = {
            params: JSON.stringify(sqlParams),
        };

        //Step 1. Get related fees using a custom query based on Fee ID
        const getRelatedFeeItems = await getCustomQueryData(
            getRelatedFeesQueryName,
            customQueryGetRelatedFeeItemsParams
        );

        // Initialize an array to hold the Fee IDs
        const relatedFees = [];
        let parentFeeID = null;

        if (getRelatedFeeItems.length > 0) {
            // Get the common Parent Fee ID from the first record
            parentFeeID = getRelatedFeeItems[0]['parent Fee ID'];

            // Iterate through the query result
            for (const record of getRelatedFeeItems) {
                relatedFees.push(record['fee ID']);
            }
        }

        // Step 2. Construct the related fees object
        const relatedFeesObject = {
            parentFeeID,
            relatedFees,
        };

        //Step 3. Prepare and send the response array to the client
        outputCollection[0] = 'Success';
        outputCollection[1] = relatedFeesObject;
    } catch (error) {
        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = errorStatus;
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = errorLog;
    } finally {
        response.json(200, outputCollection);
    }
};
