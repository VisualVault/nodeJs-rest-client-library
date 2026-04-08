/**
 * LibValidateAccessCodeByEmail
 * Category: Workflow
 * Modified: 2025-12-03T10:51:59.973Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: f7684c86-54cc-f011-82fa-da1785568e94
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
    Script Name:    LibValidateAccessCodeByEmail
    Customer:       WADNR
    Purpose:        Validate Access code by email generated in FPNP.
    Preconditions:

    Parameters:     The following represent variables passed into the function:
                    Email: (String, required)
                    Access Code: (String, required)
                    Zip Code: (String, required)

    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code:
                    1 Get the values of the fields
                    2 Get access code by params
                    2.a.1 If found then check expiration
                    2.a.2 if not expired search for existing FPNP
                    2.a.3 If FPNP is found then return its data if not return null so a new one is created
                    2.a.4 Mark access code as disabled
                    2.a.5 return obj will return acces code valid
                    2.b If access code is not found or is invalid continue without actions, return obj will return acces code invalid
                    3 Build the success response array

    Date of Dev:    11/27/2025
    Last Rev Date:  11/27/2025

    Revision Notes:
                    11/27/2025 - Alfredo Scilabra:  First Setup of the script

    */

    logger.info(`Start of the process LibValidateAccessCodeByEmail at ${Date()}`);
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

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        if (!vvClientRes.meta) {
            throw new Error(
                `${shortDescription} error. No meta object found in response. Check method call parameters and credentials.`
            );
        }

        const status = vvClientRes.meta.status;
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
        const status = vvClientRes.meta.status;
        if (status != ignoreStatusCode) {
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
                        `${shortDescription} returned an error. Please, check called Web Service. Status: ${status}.`
                    );
                }
            }
        }
        return vvClientRes;
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

    function getFormRecords(getFormsParams, templateName) {
        const shortDescription = `Get form ${templateName}`;
        const overrideGetFormsParams = {
            expand: false,
            ...getFormsParams, // overrides defaults in this object
        };

        return vvClient.forms
            .getForms(overrideGetFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function updateRecord(formTemplateName, recordGUID, fieldValuesToUpdate) {
        const shortDescription = `Update form record ${recordGUID}`;

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get the values of the fields
        const email = getFieldValueByName('Email');
        const accessCode = getFieldValueByName('Access Code');
        const zipCode = getFieldValueByName('Zip Code');
        const response = {
            canContinue: false,
            fpnpRecord: null,
        };

        // Check if the required parameters are present and complete list of holidays
        if (!email || !accessCode || !zipCode) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        const [foundAccessCode] = await getFormRecords(
            {
                q: `[Related Record ID] eq '${email}' AND [Access Code Number] eq '${accessCode}' AND [Status] eq 'Enabled'`,
                expand: true,
            },
            'Access Code'
        );
        if (foundAccessCode) {
            const currentDate = new Date();
            const expirationDateObj = new Date(foundAccessCode['expiration Date']);

            //Check expiration
            if (currentDate <= expirationDateObj) {
                //Get FPNP
                const [foundFPNP] = await getFormRecords(
                    {
                        q: `[Email] eq '${email}' AND [Status] eq 'Enabled'`,
                        expand: true,
                    },
                    'Forest Practices Notification Profile'
                );
                //Check existing FPNP
                if (foundFPNP) {
                    const zipCodeMatches = foundFPNP['zip Code'] === zipCode;
                    //Check existing FPNP and zip code matches
                    if (zipCodeMatches) {
                        response.canContinue = true;
                        response.fpnpRecord = {
                            formID: foundFPNP['instanceName'],
                            formGUID: foundFPNP['revisionId'],
                        };
                    }
                } else {
                    response.canContinue = true;
                }
                if (response.canContinue) {
                    //Disable Access Code
                    await updateRecord('Access Code', foundAccessCode.revisionId, {
                        Status: 'Disabled',
                    });
                }
            }
        }

        // Build the success response array
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = response; // Don´t change this
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
