/**
 * MultiPurposeRelateToARP
 * Category: Workflow
 * Modified: 2025-11-04T15:37:03.633Z by zharich.barona@visualvault.com
 * Script ID: Script Id: c1621e1f-9fb6-f011-8300-a622a2f9d596
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

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
    Script Name:    MultiPurposeRelateToARP
    Customer:       WADNR
    Purpose:        The purpose of this script is to create Associated Document Relations between Multi-Purpose and ARP or WTM Review Page forms. Also the forms will be related each other.
    Preconditions:  -
    Parameters:     The following represent variables passed into the function:
                    - Form ID:      This is the Form ID of the application where the information needs to be acquired.
                    - FPAN Number:  This is the FPAN Number so we can find the Application Review Page or WTM Review Page.
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code:
                    1   Get params
                    2   Find the ARP or WTM Review Page by FPAN Number
                    3   Check if an Associated Document Relation already exists between the Multi-Purpose form and the found Review Page
                    4   If not, create the Associated Document Relation
                    5   Build the success response array

    Date of Dev:    10/31/2025
    Last Rev Date:  10/31/2025
 
    Revision Notes:
                    10/31/2025 - Zharich Barona:  First Setup of the script
    */

    logger.info(`Start of the process MultiPurposeRelateToARP at ${Date()}`);

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
    const WADNR_TIMEZONE = 'America/Los_Angeles';
    const dateOnlyISOStringFormat = 'YYYY-MM-DD';
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

    function isNullEmptyUndefined(param) {
        if (param === null || param === undefined) {
            return true;
        }
        const dataType = Object.prototype.toString.call(param).slice(8, -1).toLowerCase(); //slicing the string returned by the toString method to remove the first eight characters ("[object ") and the last character (]), leaving only the name of the data type.
        switch (dataType) {
            case 'string':
                if (
                    param.trim().toLowerCase() === 'select item' ||
                    param.trim().toLowerCase() === 'null' ||
                    param.trim().toLowerCase() === 'undefined' ||
                    param.trim() === ''
                ) {
                    return true;
                }
                break;
            case 'array':
                if (param.length === 0) {
                    return true;
                }
                break;
            case 'object':
                if (Object.keys(param).length === 0) {
                    return true;
                }
                break;
            default:
                return false;
        }
        return false;
    }

    function checkDataIsNotEmpty(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
        Checks that the data property of a vvCliente API response object is not empty
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

    function getFormRecords(getFormsParams, templateName) {
        shortDescription = `Get ${templateName} form record`;

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function createRecord(templateName, newRecordData) {
        const shortDescription = `Post form ${templateName}`;
        return vvClient.forms
            .postForms(null, newRecordData, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function relateRecords(parentRecordGUID, childRecordID) {
        const shortDescription = `relating forms: ${parentRecordGUID} and form ${childRecordID}`;
        //404 is needed so that a hard error is not thrown when relationship already exists.
        const ignoreStatusCode = '404';

        return vvClient.forms
            .relateFormByDocId(parentRecordGUID, childRecordID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1 Get params
        const formID = getFieldValueByName('Form ID');
        const fpanNumber = getFieldValueByName('FPAN Number');
        const formStatus = getFieldValueByName('Status');

        if (!formID || !fpanNumber) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        let reviewPageRecord;
        // 2 Find the ARP or WTM Review Page by FPAN Number
        if (fpanNumber.includes('WTM')) {
            [reviewPageRecord] = await getFormRecords(
                {
                    q: `[WTMF No] eq '${fpanNumber}'`,
                    expand: true,
                },
                'WTM Review Page'
            );

            if (isNullEmptyUndefined(reviewPageRecord)) {
                throw new Error('WTM Review Page not found.');
            }
        } else if (fpanNumber.includes('FPA')) {
            [reviewPageRecord] = await getFormRecords(
                {
                    q: `[FPAN Number] eq '${fpanNumber}'`,
                    expand: true,
                },
                'Application Review Page'
            );

            if (isNullEmptyUndefined(reviewPageRecord)) {
                throw new Error('Application Review Page not found.');
            }
        } else {
            throw new Error('FPAN Number does not contain FPA or WTM identifiers.');
        }

        // 3 Check if an Associated Document Relation already exists between the Multi-Purpose form and the found Review Page
        const [foundAssociatedDocumentRelation] = await getFormRecords(
            {
                q: `[ARP ID or WTM RP ID] eq '${reviewPageRecord['form ID']}' AND [Related Record ID] eq '${formID}'`,
                expand: true,
            },
            'Associated Document Relation'
        );

        // 4 If not, create the Associated Document Relation
        if (isNullEmptyUndefined(foundAssociatedDocumentRelation)) {
            const currDateStr = dayjs().tz(WADNR_TIMEZONE).startOf('day').format(dateOnlyISOStringFormat);
            const [mpRecord] = await getFormRecords(
                {
                    q: `[instanceName] eq '${formID}'`,
                    expand: true,
                },
                'Multi-Purpose'
            );
            if (isNullEmptyUndefined(mpRecord)) {
                throw new Error('Multi-Purpose record not found.');
            }
            await createRecord('Associated Document Relation', {
                'Document Form Name': 'Multi-Purpose Form',
                'Document Form Type': 'Form',
                'Sensitive Indicator': 'No',
                'Document Create By': 'fpOnline',
                'Document Create Date': currDateStr,
                'Document Modify By': 'fpOnline',
                'Document Modify Date': currDateStr,
                'Document GUID': mpRecord.revisionId,
                'Related Record ID': formID,
                'Document or Form': 'Form',
                'ARP ID or WTM RP ID': reviewPageRecord['form ID'],
                'Receipt Date': currDateStr,
                'Document Form Status': formStatus,
            });
            await relateRecords(reviewPageRecord.revisionId, formID);
        }

        // 5 BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] =
            'Records related successfully. Associated Document Relation records have been updated or created';
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
