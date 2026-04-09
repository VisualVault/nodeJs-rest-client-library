/**
 * UpdateWTMFStatus
 * Category: Workflow
 * Modified: 2025-11-21T17:00:58.86Z by sebastian.rolando@visualvault.com
 * Script ID: Script Id: 0bcc8f71-0f8f-f011-82eb-976abaa31550
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
    Script Name:    UpdateWTMFStatus
    Customer:       WADNR
    Purpose:        The purpose of this script is to update the status of the 
                    Water Type Modification Form (WTMF) when the status is changed 
                    in the WTM Review Page.

    Preconditions:  None
    Parameters:     
                    - WTM Review Page Form ID: String (WTM Review Page Form ID)
                    - New Status: String (New status value to be set)
                    - Old Status: String (Current status value that will be replace with the newest one)
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code:
                    1. Get and validate parameters (WTM Review Page Form ID and New Status)
                    2. Get the WTMF Number from the WTM Review Page
                    3. Find the Water Type Modification Form using the WTMF Number
                    4. Update the status field in the Water Type Modification Form

    Date of Dev:    09/11/2025
    Last Rev Date:  11/13/2025

    Revision Notes:
                    09/11/2025 - Santiago Tortu:  First Setup of the script
                    11/13/2025 - Sebastian Rolando: Add logic to update UpdatedSubFormsToDraft and UpdatedSubFormsToSubmitted flag fields when changing WTMF Status. 
    */

    logger.info(`Start of the process UpdateWTMFStatus at ${Date()}`);

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

    const wtmReviewPageTemplateName = 'WTM Review Page';
    const wtmfTemplateName = 'Water Type Modification Form';

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

    function getWTMFNumber(wtmReviewPageFormID) {
        const shortDescription = `Get WTMF No from WTM Review Page ${wtmReviewPageFormID}`;

        const getFormsParams = {
            q: `[form ID] eq '${wtmReviewPageFormID}'`,
            fields: 'wtmF No',
        };

        return vvClient.forms
            .getForms(getFormsParams, wtmReviewPageTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => {
                // Check if data exists and has WTMF No field
                if (!res.data || res.data.length === 0) {
                    throw new Error(`WTM Review Page with Form ID ${wtmReviewPageFormID} not found.`);
                }

                const wtmfNo = res.data[0]['wtmF No']; // Correct field name from server response
                logger.info(`WTMF No field value: "${wtmfNo}" for WTM Review Page ${wtmReviewPageFormID}`);

                if (!wtmfNo || wtmfNo.trim() === '') {
                    throw new Error(
                        `WTMF No field is empty in WTM Review Page ${wtmReviewPageFormID}. Please ensure the WTM Review Page is properly linked to a Water Type Modification Form by filling in the "WTMF No" field with the corresponding "WTMF Number" from the Water Type Modification Form.`
                    );
                }

                return wtmfNo;
            });
    }

    function getWTMFRevisionId(wtmfNumber) {
        const shortDescription = `Get WTMF Revision ID for WTMF Number ${wtmfNumber}`;

        const getFormsParams = {
            q: `[WTMF Number] eq '${wtmfNumber}'`,
            fields: 'revisionId',
        };

        return vvClient.forms
            .getForms(getFormsParams, wtmfTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]['revisionId']);
    }

    function updateWTMFStatus(wtmfRevisionId, newStatus, oldStatus) {
        const shortDescription = `Update WTMF Status to ${newStatus}`;
        const fieldValuesToUpdate = {
            Status: newStatus,
        };

        // If it's necessary, update the WTMF flags to trigger automation that update subforms Status
        if (oldStatus !== newStatus) {
            if (newStatus === 'Draft' || newStatus === 'Pending Revisions') {
                if (oldStatus !== 'Draft' && oldStatus !== 'Pending Revisions') {
                    fieldValuesToUpdate['UpdateSubformsToDraft'] = 'True';
                }
            }

            if (newStatus !== 'Draft' && newStatus !== 'Pending Revisions') {
                if (oldStatus === 'Draft' || oldStatus === 'Pending Revisions') {
                    fieldValuesToUpdate['UpdateSubformsToSubmitted'] = 'True';
                }
            }
        }

        logger.info(`Updating WTMF with Revision ID: ${wtmfRevisionId}, New Status: ${newStatus}`);

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, wtmfTemplateName, wtmfRevisionId)
            .then((res) => parseRes(res))
            .then((res) => {
                logger.info(`WTMF update response: ${JSON.stringify(res)}`);
                return checkMetaAndStatus(res, shortDescription);
            });
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Step #1 - Get and validate parameters
        const wtmReviewPageFormID = getFieldValueByName('WTM Review Page Form ID');
        const newStatus = getFieldValueByName('New Status');
        const oldStatus = getFieldValueByName('Old Status', true);

        logger.info(`Parameters received - WTM Review Page Form ID: ${wtmReviewPageFormID}, New Status: ${newStatus}`);

        // CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!wtmReviewPageFormID || !newStatus) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // Step #2 - Get the WTMF Number from the WTM Review Page
        const wtmfNumber = await getWTMFNumber(wtmReviewPageFormID);
        logger.info(`WTMF Number found: ${wtmfNumber}`);

        // Step #3 - Get the WTMF Revision ID using the WTMF Number
        const wtmfRevisionId = await getWTMFRevisionId(wtmfNumber);
        logger.info(`WTMF Revision ID found: ${wtmfRevisionId}`);

        // Step #4 - Update the status in the Water Type Modification Form
        await updateWTMFStatus(wtmfRevisionId, newStatus, oldStatus);
        logger.info(`WTMF status updated successfully to: ${newStatus}`);

        responseTitle = 'Success';
        responseMessage = `WTMF status updated successfully to ${newStatus}`;

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'WTMF status updated successfully';
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
