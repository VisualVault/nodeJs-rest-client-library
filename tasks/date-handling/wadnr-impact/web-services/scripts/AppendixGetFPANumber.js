/**
 * AppendixGetFPANumber
 * Category: Form
 * Modified: 2026-02-25T13:36:18.41Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: bd216e2b-f01a-f011-82cd-cce61d1869ed
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
    Script Name:    AppendixGetFPANumber
    Customer:       WADNR
    Purpose:        Get FPA Number from parent record
    Preconditions:

    Parameters:     The following represent variables passed into the function:
                    Related Record ID: String - ID of the parent record
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: FPA Number
    Pseudo code:
                    1° Checks all data was received correctly
                    2° Get FPA Number from parent record
                    3° Returns FPA Number if it exists, or an empty string if not
    Date of Dev:    04/16/2025
    Last Rev Date:  02/25/2026

    Revision Notes:
                    04/16/2025 - Mauro Rapuano:  First Setup of the script
                    04/24/2025 - Mauro Rapuano:  Added function to detect form based on Related Record ID
                    05/15/2025 - Alfredo Scilabra:  Refactored detectFormTemplateFromID and
                        added Application Review Page prefix to detect it from Related Record ID
                    02/25/2026 - Alfredo Scilabra: Rename Multi-pupose prefix
    */

    logger.info(`Start of the process AppendixGetFPANumber at ${Date()}`);

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

    function getParentRecord(recordID, templateName) {
        const shortDescription = `Get form ${recordID}`;
        const getFormsParams = {
            q: `[instanceName] eq '${recordID}'`,
            expand: true,
        };
        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function detectFormTemplateFromID(recordID) {
        //NOTE: Check for longer prefixes first!
        const templateMap = new Map([
            ['STEP-1-LONG-TERM-FPA', 'Step 1 Long Term FPA'],
            ['FPA-AERIAL-CHEMICAL', 'Forest Practices Aerial Chemical Application'],
            ['APPLICATION-REVIEW', 'Application Review Page'],
            ['FPAN-AMENDMENT', 'FPAN Amendment Request'],
            ['FPAN-RENEWAL', 'FPAN Renewal'],
            ['FPAN-T', 'FPAN Notice of Transfer'],
            ['LT-5DN', 'Long-Term Application 5-Day Notice'],
            ['FPAN', 'Forest Practices Application Notification'],
            ['WTMRP', 'WTM Review Page'],
            ['MPF', 'Multi-purpose'],
        ]);

        const normalizedID = recordID.replace(/\s+/g, '');

        for (const [prefix, name] of templateMap) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return name;
            }
        }

        throw new Error('Form template name not found.');
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // GET THE VALUES OF THE FIELDS
        const relatedRecordID = getFieldValueByName('Related Record ID');

        // CHECKS IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!relatedRecordID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        const [parentRecord] = await getParentRecord(relatedRecordID, detectFormTemplateFromID(relatedRecordID));

        let resFpaNumber;

        if (detectFormTemplateFromID(relatedRecordID) === 'WTM Review Page') {
            resFpaNumber = parentRecord?.['wtmF No'] ?? '';
        } else {
            resFpaNumber = parentRecord?.['fpaN Number'] ?? '';
        }

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = `FPA Number succesfully retrieved`;
        outputCollection[2] = resFpaNumber;
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
