/**
 * LibStatusHistoryCreate
 * Category: Workflow
 * Modified: 2026-01-13T18:56:50.003Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: 3dc154b2-f26b-f011-82ee-ef5ae14491fa
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
    Script Name:    LibStatusHistoryCreate
    Customer:       WADNR
    Purpose:        Generate Status History Records

    Parameters:     The following represent variables passed into the function:
                    formType: The type of form being processed.
                    fpanNumber: The FPAN Number associated with the form.
                    relatedRecordId: Related Record ID.
                    beforeStatusValue: The status value of the record before the change occurred.
                    statusChange: The updated status or change applied to the record.
                    statusModifiedBy: The user or system that modified the status.
                    statusModifiedDate: The date and time when the status was modified.
                    applicationReviewPageId: ARP Form ID.
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code: 
                    1° Check all required fields present
                    2° Verify ARP exists
                    3° Create Status History Record
 
    Date of Dev:    07/28/2025
    Last Rev Date:  01/13/2026
 
    Revision Notes:
                    07/28/2025 - Nicolas Culini:  First Setup of the script
                    01/13/2026 - Mauro Rapuano: Updated ARP ID to be optional
    */

    logger.info(`Start of the process LibStatusHistoryCreate at ${Date()}`);

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

    function checkForARPForm(applicationReviewPageId, fpanNumber) {
        const shortDescription = `Get form ${applicationReviewPageId}`;
        const getFormsParams = {
            q:
                applicationReviewPageId === '' || !applicationReviewPageId
                    ? `[FPAN Number] eq '${fpanNumber}'`
                    : `[instanceName] eq '${applicationReviewPageId}' OR [FPAN Number] eq '${fpanNumber}'`,
            fields: 'revisionId',
        };

        return vvClient.forms
            .getForms(getFormsParams, 'Application Review Page')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data[0]);
    }

    function createStatusHistoryRecord(
        formType,
        fpanNumber,
        beforeStatusValue,
        statusModifiedBy,
        relatedRecordId,
        statusChange,
        statusModifiedDate,
        applicationReviewPageId
    ) {
        const shortDescription = `Post form Status History`;
        const newRecordData = {
            'Form Type': formType,
            'FPAN Number': fpanNumber,
            'Before Status Value': beforeStatusValue,
            'Status Modified By': statusModifiedBy,
            'Related Record ID': relatedRecordId,
            'Status Change': statusChange,
            'Status Modified Date': statusModifiedDate,
            'ARP Related Record ID': applicationReviewPageId,
        };

        return vvClient.forms
            .postForms(null, newRecordData, 'Status History')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function checkARPRelation(arpGuid, relatedRecordId) {
        const shortDescription = `Records related to the record ${arpGuid}`;

        return vvClient.forms
            .getFormRelatedForms(arpGuid)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data.filter((record) => record.instanceName.includes(relatedRecordId)).length);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS

        const formType = getFieldValueByName('Form Type');
        const fpanNumber = getFieldValueByName('FPAN Number');
        const relatedRecordId = getFieldValueByName('Related Record ID');
        const beforeStatusValue = getFieldValueByName('Before Status Value');
        const statusChange = getFieldValueByName('Status Change');
        const statusModifiedBy = getFieldValueByName('Status Modified By');
        const statusModifiedDate = getFieldValueByName('Status Modified Date');
        const applicationReviewPageId = getFieldValueByName('Application Review Page ID', true);

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT

        if (
            !formType ||
            !fpanNumber ||
            !relatedRecordId ||
            !beforeStatusValue ||
            !statusChange ||
            !statusModifiedBy ||
            !statusModifiedDate
        ) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        const arpData = await checkForARPForm(applicationReviewPageId, fpanNumber);

        if (!arpData) throw new Error('Application Review Page not found.');

        const isRelatedToApplicaction = await checkARPRelation(arpData['revisionId'], relatedRecordId);

        if (!isRelatedToApplicaction)
            throw new Error("An Application Review Page was found, but it's not related to the current application.");

        const statusHistoryRecord = await createStatusHistoryRecord(
            formType,
            fpanNumber,
            beforeStatusValue,
            statusModifiedBy,
            relatedRecordId,
            statusChange,
            statusModifiedDate,
            applicationReviewPageId
        );

        // X° BUILD THE SUCCESS RESPONSE ARRAY

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Success short description here';
        outputCollection[2] = statusHistoryRecord;
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
