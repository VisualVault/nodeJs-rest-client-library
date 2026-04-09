/**
 * moveToPositionPDFPackage
 * Category: Workflow
 * Modified: 2026-03-11T13:26:01.443Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: 93fb92c6-4b79-f011-82e5-e783971c7bf6
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
    Script Name:    moveToPositionPDFPackage 
    Customer:       WADNR
    Purpose:        Move to Position for PDF printing queue
    Parameters:     
                    The following represent variables passed into the function:
                    formId: formId of the PDF Package Generator
                    selectedRecordRevisionId: Selected Record
                    newPosition: Position to move the document to
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code: 
                    1° Make sure required fields are present
                    2° Calculate the positions to modify
                    3° Modify Positions
 
    Date of Dev:    08/14/2025
    Last Rev Date:  03/10/2026
 
    Revision Notes:
                    08/14/2025 - Nicolas Culini:  First Setup of the script
                    12/15/2025 - Mauro Rapuano: Fix to use ARP ID or WTM RP ID instead of Related Record ID when getting related records
                    02/13/2026 - Mauro Rapuano: Pad print order with leading zeros to ensure correct sorting (e.g., 01, 02, ..., 10, 11, etc.)
                    03/10/2026 - Mauro Rapuano: Updated move logic to avoid issues when moving to the end of the list
    */

    logger.info(`Start of the process moveToPositionPDFPackage at ${Date()}`);

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

    const templateName = 'Associated Document Relation';

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

    function getAllRelatedRecords(formId, revisionId) {
        const shortDescription = `Get form ${templateName}`;
        const getFormsParams = {
            q: `[ARP ID or WTM RP ID] eq '${formId}' and ([Print Order] ne 'Not Printed' or [revisionId] eq '${revisionId}')`,
            fields: 'Print Order, Document Form Type, Sensitive Indicator',
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription)) // Comment out this line if the query could have no match
            .then((res) => res.data);
    }

    function updateOrder(revisionId, newOrder) {
        const shortDescription = `Update form record ${revisionId}`;
        const fieldValuesToUpdate = {
            'Print Order': String(newOrder).padStart(2, '0'), // Pad the print order with leading zeros to ensure correct sorting (e.g., 01, 02, ..., 10, 11, etc.)
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, templateName, revisionId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS

        const formId = getFieldValueByName('Form ID');
        const selectedRecordRevisionId = getFieldValueByName('Selected Record');
        let newPosition = getFieldValueByName('New Position');

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT

        if (!formId || !selectedRecordRevisionId) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        let records = await getAllRelatedRecords(formId, selectedRecordRevisionId);

        const maxPrintOrder = Math.max(...records.map((r) => Number(r['print Order']) || 0));
        newPosition = Math.min(newPosition, maxPrintOrder + 1);
        const selectedRecord = records.find((record) => record.revisionId == selectedRecordRevisionId);
        let originalPosition = selectedRecord['print Order'];

        if (originalPosition == 'Not Printed') originalPosition = records.length + 1;

        if (
            selectedRecord['sensitive Indicator'] == 'Yes' ||
            selectedRecord['document Form Type'] == 'FPAN External' ||
            selectedRecord['document Form Type'] == 'WTM External'
        ) {
            throw new Error("Can't change print order since the document is sensitive or FPAN External/WTM External");
        }

        if (newPosition != originalPosition) {
            const positionOccupied = records.some(
                (r) => r.revisionId !== selectedRecordRevisionId && Number(r['print Order']) === newPosition
            );

            if (!positionOccupied || newPosition > maxPrintOrder) {
                await updateOrder(selectedRecordRevisionId, newPosition);
            } else {
                const affectedRecords = records
                    .filter((r) => r.revisionId !== selectedRecordRevisionId)
                    .filter((r) => {
                        if (newPosition < originalPosition) {
                            return (
                                Number(r['print Order']) >= newPosition && Number(r['print Order']) < originalPosition
                            );
                        } else {
                            return (
                                Number(r['print Order']) > originalPosition && Number(r['print Order']) <= newPosition
                            );
                        }
                    });

                const pivot = newPosition < originalPosition ? 1 : -1;

                await updateOrder(selectedRecordRevisionId, newPosition);

                await Promise.all(
                    affectedRecords.map((r) => updateOrder(r.revisionId, Number(r['print Order']) + pivot))
                );
            }
        }

        outputCollection[0] = 'Success';
        outputCollection[1] = 'Successfully updated print order';
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
