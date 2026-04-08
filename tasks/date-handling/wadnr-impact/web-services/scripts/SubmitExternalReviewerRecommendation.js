/**
 * SubmitExternalReviewerRecommendation
 * Category: Form
 * Modified: 2025-10-09T19:07:56.347Z by sebastian.rolando@visualvault.com
 * Script ID: Script Id: 154f189f-85a4-f011-82f9-cf43b5202663
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
    Script Name:    SubmitExternalReviewerRecommendation
    Customer:       WADNR
    Purpose:        The purpose of this script is to update Recommendation Line Items record, where the External Reviewer did not complete the Concur Field.
    Preconditions:  -
    Parameters:     
                    - (Form ID, string): DhDocId of the current record
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code:
                    1° Get and validate parameters
                    2° Check if the required parameters are present
                    3° Search Line Item related to Ext Recommendation ID
                    4° If Line Item where concur field was not provided by the External Reviewer exists, then update the records field value to 'N/A'
                    5° Build the response object
    Date of Dev:    10/08/2025
    Last Rev Date:  10/08/2025
    Revision Notes:
                    10/08/2025 - Sebastian Rolando:  First Setup of the script
    */

    logger.info(`Start of the process SubmitExternalReviewerRecommendation at ${Date()}`);

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

    const recommendationLineItemTemplateName = 'Recommendation Line Items';

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

    function getLineItemsRelated(relatedFormID) {
        // IMPORTANT: getForms has a limit of 200 records, if you need to get more than 200 records use getCustomQueryResultsByName
        const shortDescription = `Get Recommendation Line Items records related to ${relatedFormID}`;
        const getFormsParams = {
            q: `[External Reviewer Recommendation ID] eq '${relatedFormID}'`,
            // expand: true, // true to get all the form's fields
            fields: 'Segment Modification Form ID, Concur', // to get only the fields 'id' and 'name'
        };

        return vvClient.forms
            .getForms(getFormsParams, recommendationLineItemTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    async function updateLineItem(lineItem) {
        function getRecordGUID(formTemplateName, recordID) {
            const shortDescription = `GetForm ${recordID}`;
            const getParentFormParams = {
                q: `[instanceName] eq '${recordID}'`, // recordID = "INDV-000001"
                fields: 'revisionId',
            };

            return vvClient.forms
                .getForms(getParentFormParams, formTemplateName)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                .then((res) => checkDataIsNotEmpty(res, shortDescription))
                .then((res) => res.data[0].revisionId);
        }

        function updateRecord(formTemplateName, recordGUID) {
            const shortDescription = `Update form record ${recordGUID}`;
            const fieldValuesToUpdate = {
                Concur: 'N/A',
            };

            return vvClient.forms
                .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                .then((res) => checkDataIsNotEmpty(res, shortDescription));
        }

        const recordGUID = await getRecordGUID(recommendationLineItemTemplateName, lineItem);
        return await updateRecord(recommendationLineItemTemplateName, recordGUID);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° Get and validate parameters
        const formID = getFieldValueByName('Form ID');

        // 2° Check if the required parameters are present
        if (!formID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3° Search Line Item related to Ext Recommendation ID
        const lineItemsRelated = await getLineItemsRelated(formID);

        // 4° Check if exists Line Item where concur field was not provided by the External Reviewer
        const lineItemsRelatedNotprovided = lineItemsRelated.filter(
            (lineItem) => lineItem['concur'] === 'Select Item' || lineItem['concur'] === ''
        );

        if (lineItemsRelatedNotprovided.length) {
            // Update line item records concur field to N/A
            await Promise.all(
                lineItemsRelatedNotprovided.map((lineItem) => {
                    return updateLineItem(lineItem.instanceName);
                })
            );
        }

        // 5° Build the response object
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = `Submit Recommendation Process Completed`;
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
