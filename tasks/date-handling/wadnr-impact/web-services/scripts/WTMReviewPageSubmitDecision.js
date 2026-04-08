/**
 * WTMReviewPageSubmitDecision
 * Category: Form
 * Modified: 2025-12-30T21:39:50.44Z by sebastian.rolando@visualvault.com
 * Script ID: Script Id: 9b0ffea9-83a3-f011-82f9-cf43b5202663
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
    Script Name:    WTMReviewPageSubmitDecision
    Customer:       WADNR
    Purpose:        Updates the status of External Reviewer Recommendation records related to a WTM Review Page based on reviewer participation,
                    and updated WTMF record to status 'Concurred', 'Non-Concurred' or 'Partial Concurred'.
    Preconditions:

    Parameters:     The following represent variables passed into the function:
                    WTM RP ID: String - ID of the WTM RP record
                    WTMF ID: String - ID of the WTMF record to update
                    Status: String - Status to set on the WTMF record (Concurred, Non-Concurred, Partial Concurred)
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Ids of the updated External Reviewer Recommendation records (if successful)
    Pseudo code:
                    1° Checks all data was received correctly
                    2° Gets all External Reviewer Recommendation records related to the WTM Review Page
                    3° Based on reviewer participation, updates status of each External Reviewer Recommendation record (Completed or Review Ended)
                    4° Updates WTMF record to status 'Concurred', 'Non-Concurred' or 'Partial Concurred'
                    5° Returns response message
    Date of Dev:    10/07/2025
    Last Rev Date:  10/07/2025

    Revision Notes:
                    10/07/2025 - Mauro Rapuano:  First Setup of the script
                    12/30/2025 - Sebastian Rolando: Prevent throwing error action if no External Reviewers Record related exists.
    */

    logger.info(`Start of the process WTMReviewPageSubmitDecision at ${Date()}`);

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
    const wtmfFormTemplateName = 'Water Type Modification Form';
    const externalReviewerRecommendationTemplateName = 'External Reviewer Recommendations';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */

    // Description used to better identify API methods errors
    let shortDescription = '';

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

    function getRecommendationsForms(wtmReviewPageID) {
        const shortDescription = `Get forms ${externalReviewerRecommendationTemplateName} associated with ${wtmReviewPageID}`;
        const getFormsParams = {
            q: `[WTM RP ID] eq '${wtmReviewPageID}'`,
            fields: 'revisionId, Status',
        };
        return vvClient.forms
            .getForms(getFormsParams, externalReviewerRecommendationTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function updateRecommendationStatus(recordGUID, finalStatus, decisionMade) {
        const shortDescription = `Update form record ${recordGUID} for ${externalReviewerRecommendationTemplateName} to status ${finalStatus}`;
        const fieldValuesToUpdate = {
            Status: finalStatus,
            'Decision Made': decisionMade,
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, externalReviewerRecommendationTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    function getWTMFRecordGUID(recordID) {
        const shortDescription = `Get ${wtmfFormTemplateName} form ${recordID}`;
        const getParentFormParams = {
            q: `[instanceName] eq '${recordID}'`, // recordID = "INDV-000001"
            fields: 'revisionId',
        };

        return vvClient.forms
            .getForms(getParentFormParams, wtmfFormTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0].revisionId);
    }

    function updateWTMFRecord(recordGUID, status) {
        const shortDescription = `Update form record ${recordGUID} for ${wtmfFormTemplateName} to status ${status}`;
        const fieldValuesToUpdate = {
            Status: status,
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, wtmfFormTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }
    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // GET THE VALUES OF THE FIELDS
        const wtmReviewPageID = getFieldValueByName('WTM RP ID');
        const wtmfID = getFieldValueByName('WTMF ID');
        const status = getFieldValueByName('Status');

        // 1. Checks all data was received correctly
        if (!wtmReviewPageID || !wtmfID || !status) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 2. Gets all External Reviewer Recommendation records related to the WTM Review Page
        const externalReviewerRecommendationRecords = await getRecommendationsForms(wtmReviewPageID);
        if (externalReviewerRecommendationRecords.length) {
            // 2.1 Based on reviewer participation, updates status of each External Reviewer Recommendation record (Completed or Review Ended)
            for (const record of externalReviewerRecommendationRecords) {
                let finalStatus;
                const recordGUID = record.revisionId;
                const currentStatus = record.status;

                if (currentStatus === 'Completed') {
                    finalStatus = currentStatus;
                } else {
                    finalStatus = 'Review Ended';
                }

                await updateRecommendationStatus(recordGUID, finalStatus, 'True');
            }
        }

        // 3. Updates WTMF record to status 'Concurred', 'Non-Concurred' or 'Partial Concurred'
        const wtmfRecord = await getWTMFRecordGUID(wtmfID);
        if (!wtmfRecord) {
            throw new Error(`No ${wtmfFormTemplateName} record found for the provided WTMF ID.`);
        }
        await updateWTMFRecord(wtmfRecord, status);

        // 5. BUILD THE SUCCESS RESPONSE ARRAY
        let updatedRecordsIds = externalReviewerRecommendationRecords.map((rec) => rec.instanceName).join(', ');
        let responseObj = {
            externalReviewerRecommendationRecordsUpdated: updatedRecordsIds,
            wtmfRecordUpdated: wtmfID,
        };

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = `WTMF and External Reviewer Recommendation records updated successfully.`;
        outputCollection[2] = responseObj;
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
