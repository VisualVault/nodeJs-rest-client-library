/**
 * UpdateLandownerType
 * Category: Workflow
 * Modified: 2026-02-18T14:37:37.103Z by santiago.tortu@visualvault.com
 * Script ID: Script Id: 0686b323-e38c-f011-82e9-ee9de6c193b6
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
    Script Name:    UpdateLandownerType
    Customer:       WADNR
    Purpose:        The purpose of this script is to update the "Landowner Type" field
                    in Contact Information Relation forms with values "SFL" or "LFL"

    Preconditions:  None
    Parameters:
                    - Selected Item IDs: Array (Collection of Contact Information Relation DhDocIDs)
                    - Landowner Type: String ("SFL" or "LFL")
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code:
                    1. Get and validate parameters (Selected Item IDs and Landowner Type)
                    2. For each CIR DhDocID, get the revisionId and update the Landowner Type field

    Date of Dev:    08/09/2025
    Last Rev Date:  02/13/2026

    Revision Notes:
                    08/09/2025 - Initial creation of the script
                    02/13/2026 - Simplified to receive CIR DhDocIDs directly from frontend
  */

    logger.info(`Start of the process UpdateLandownerType at ${Date()}`);

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

    const contactInfoRelationTemplateName = 'Contact Information Relation';

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

    async function getRevisionIdFromDhDocID(cirDhDocID) {
        // Query CIR directly by instanceName (DhDocID) to get its revisionId (GUID needed for update)
        const shortDescription = `Get CIR revisionId for ${cirDhDocID}`;
        const query = {
            q: `[instanceName] eq '${cirDhDocID}'`,
            fields: 'revisionId',
        };

        const resp = await vvClient.forms
            .getForms(query, contactInfoRelationTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));

        return resp.data && resp.data.length > 0 ? resp.data[0].revisionId : null;
    }

    function updateLandownerType(contactInfoRelationGUID, landownerType) {
        const shortDescription = `Update Landowner Type for Contact Information Relation ${contactInfoRelationGUID}`;
        const fieldValuesToUpdate = {
            'Landowner Type': landownerType,
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, contactInfoRelationTemplateName, contactInfoRelationGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Step #1
        const selectedItemIDs = getFieldValueByName('Selected Item IDs');
        const landownerType = getFieldValueByName('Landowner Type');

        // CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!selectedItemIDs || !landownerType) {
            throw new Error(errorLog.join('; '));
        }

        // Validate the landowner type value
        if (landownerType !== 'SFL' && landownerType !== 'LFL') {
            throw new Error('Landowner Type must be either "SFL" or "LFL"');
        }

        // Step #2 - Update Contact Information Relation for each selected CIR DhDocID
        let updatedCount = 0;

        for (const cirDhDocID of selectedItemIDs) {
            // Get the revisionId (GUID) from the DhDocID
            const cirRevisionId = await getRevisionIdFromDhDocID(cirDhDocID);

            if (cirRevisionId) {
                await updateLandownerType(cirRevisionId, landownerType);
                updatedCount++;
            } else {
                errorLog.push(`CIR not found: ${cirDhDocID}`);
            }
        }

        // Step #3 - Check if any records were updated
        if (updatedCount === 0) {
            throw new Error('No Contact Information Relations were found to update');
        }

        responseTitle = 'Success';
        responseMessage = `Landowner Type successfully updated to ${landownerType} for ${selectedItemIDs.length} contact(s)`;

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Landowner Type updated successfully';
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don´t change this

        if (errorLog.length > 0) {
            outputCollection[1] = `Some errors occurred: ${errorLog.join('; ')}`;
            outputCollection[2] = errorLog;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        // SEND THE RESPONSE
        response.json(200, outputCollection);
    }
};
