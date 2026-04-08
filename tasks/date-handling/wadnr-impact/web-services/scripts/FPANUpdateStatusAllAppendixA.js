/**
 * FPANUpdateStatusAllAppendixA
 * Category: Workflow
 * Modified: 2025-10-09T17:05:12.957Z by zharich.barona@visualvault.com
 * Script ID: Script Id: 1b22aeef-61a4-f011-82f9-cf43b5202663
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
    Script Name:    FPANUpdateStatusAllAppendixA
    Customer:       WADNR
    Purpose:        The purpose of this script is to update the Apendix A records to submitted found by FPAN Form ID.
    
    Preconditions:  None
    Parameters:     
                    - Form ID: String (Form ID)
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code:
                    1. Validate parameters
                    2. Search for Appendix A records associated with the FPAN Form ID
                    3. Update the records found to submitted
                    4. Return the response

    Date of Dev:    10/06/2025
    Last Rev Date:  10/06/2025

    Revision Notes:
                    10/06/2025 - Zharich Barona:  First Setup of the script
    */

    logger.info(`Start of the process FPANUpdateStatusAllAppendixA at ${Date()}`);

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

    const AppendixAtemplateName = 'Appendix A Water Type Classification';

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

    function getAppendixArecordsByFPANFormID(formID) {
        const shortDescription = `Get Appendix A with FPAN Form ID ${formID}`;

        const getFormsParams = {
            q: `[Related Record ID] eq '${formID}' AND [Status] ne 'Disabled'`,
            fields: 'Form ID',
        };

        return vvClient.forms
            .getForms(getFormsParams, AppendixAtemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function updateRecords(revisionID) {
        const shortDescription = `Update Appendix A ${revisionID}`;
        const fieldValuesToUpdate = {
            status: 'Submitted',
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, AppendixAtemplateName, revisionID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Step #1
        const FormID = getFieldValueByName('Form ID');

        // CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!FormID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // Step #2
        const AppendixArecords = await getAppendixArecordsByFPANFormID(FormID);

        if (AppendixArecords.length > 0) {
            // Step #3
            await Promise.all(AppendixArecords.map(({ revisionId }) => updateRecords(revisionId)));

            // Step #4
            outputCollection[0] = 'Success';
            outputCollection[1] = 'Record(s) updated successfully';
            outputCollection[2] = 'Records updated Successfully';
        } else {
            // Step #4
            outputCollection[0] = 'Success';
            outputCollection[1] = 'Appendix A records not Found';
            outputCollection[2] = 'Records Not Found';
        }
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don´t change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors ocurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        // SEND THE RESPONSE
        response.json(200, outputCollection);
    }
};
