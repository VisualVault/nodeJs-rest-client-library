/**
 * NTCRelateToARP
 * Category: Workflow
 * Modified: 2025-11-05T21:25:38.273Z by zharich.barona@visualvault.com
 * Script ID: Script Id: 5c90ebcf-9d94-f011-82ec-99025dabeb15
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
    Script Name:    NTCRelateToARP
    Customer:       WADNR
    Purpose:        The purpose of this script is to update or create Associated Document Relations between NTC and ARP forms. Also the forms will be related each other.
    Preconditions:  LibApplicationReviewCollectRelatedDocs should exists for the execution of this microservice
    Parameters:     The following represent variables passed into the function:
                    - Form ID:      This is the Form ID of the application where the information
                                    needs to be acquired.
                    - FPAN Number:  This is the FPAN Number so we can find the Application Review Page
                                    to associate the documents and forms.
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code:
                    1   Get params
                    2   Check if Associated Document Relation exists
                    2.a If not create it and realte it to the NTC
                    2.b If exists do nothing
                    3   Return object with status

    Date of Dev:    09/19/2025
    Last Rev Date:  10/02/2025

    Revision Notes:
                    09/19/2025 - Alfredo Scilabra:  First Setup of the script  
                    10/02/2025 - Mauro Rapuano: Add Document or Form field to Associated Document Relation record
                    10/21/2025 - Sebastian Rolando: Add CheckDataIsNotEmpty helper function
                    10/28/2025 - Sebastian Rolando: Add mapping for the status value of the Associated Document created
    */

    logger.info(`Start of the process NTCRelateToARP at ${Date()}`);

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
    const AppReviewPageTemplateName = 'Application Review Page';
    const libraryName = 'LibApplicationReviewCollectRelatedDocs';
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

    function runWebService(webServiceName, webServiceParams) {
        const shortDescription = `Run Web Service: ${webServiceName}`;

        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function getRecordGUID(formTemplateName, number) {
        /*
      Get the GUID of a record based on its FPAN or WTMF number and form template name
      Parameters:
          formTemplateName: The name of the form template where the record is stored
          number: The FPAN or WTMF number
      Returns:
          The GUID of the record
      */
        const shortDescription = `GetForm from ${formTemplateName}`;

        // Determine the query field based on the number pattern
        const queryField = '[FPAN Number]';

        const getParentFormParams = {
            q: `${queryField} eq '${number}'`,
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

    async function relateRecordsByDocId(parentRecordGUID, childRecordID) {
        /*
      Helper function to relate records by their Doc IDs
      Parameters:
          parentRecordGUID: The Doc ID of the parent record
          childRecordID: The Doc ID of the child record
      */
        const shortDescription = `Relating forms: ${parentRecordGUID} and form ${childRecordID}`;
        const ignoreStatusCode = '404'; // Avoid hard error if relationship already exists

        return vvClient.forms
            .relateFormByDocId(parentRecordGUID, childRecordID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode));
    }

    async function relateRecords(FPANNumberString, formId) {
        /*
      Function to relate the current form with ARP and/or WTMF records based on the provided numbers
      Parameters:
          FPANNumberString: A comma-separated string of FPAN and/or WTMF numbers
          formId: The Doc ID of the current form
      */

        // Split the string by commas and trim whitespace
        const idNumbers = FPANNumberString.split(',').map((num) => num.trim());

        for (const id of idNumbers) {
            try {
                const parentRecordGUID = await getRecordGUID(AppReviewPageTemplateName, id);
                await relateRecordsByDocId(parentRecordGUID, formId);
            } catch (error) {
                errorLog.push(`Failed to process id ${id}: ${error.message}`);
            }
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1
        const formID = getFieldValueByName('Form ID');
        const fpanNumber = getFieldValueByName('FPAN Number');

        if (!formID || !fpanNumber) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3° Call LibApplicationReviewCollectRelatedDocs to update or create Associated Document Relation
        const webServiceParams = [
            // One object for each parameter sent to the next web service
            // You can convert this array to an argument of this function
            {
                name: 'Form ID',
                value: formID,
            },
            {
                name: 'FPAN Number',
                value: fpanNumber,
            },
        ];

        await runWebService(libraryName, webServiceParams);

        await relateRecords(fpanNumber, formID);

        // 3 BUILD THE SUCCESS RESPONSE ARRAY
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
