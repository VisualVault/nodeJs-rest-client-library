/**
 * LibAssociatedDocumentRelationUpdate
 * Category: Workflow
 * Modified: 2025-10-28T18:35:40.03Z by sebastian.rolando@visualvault.com
 * Script ID: Script Id: f2d3a5a2-8269-f011-82e2-c7d75e7297d5
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
    Script Name:    LibAssociatedDocumentRelationUpdate
    Customer:       WADNR
    Purpose:        The purpose of this library is to keep the Associated Document Relation record up to date with
                    the information that is on the application or application review page. This library will take
                    information from an application and then update the Associated Document Relation so the
                    status, and other key items of information are maintained.
    Preconditions:  None
    Parameters:
                    - Form ID (Required), String – This is the Form ID of the application where the status was updated.
                    - Form Template Type (Required), String – This will be the name of the form template of the application
                    - Sensitive Site (Required), String(Bool)
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code:
                    1. Get the record identified by the Form ID.
                    2. Get the Associated Document Relation for the Form ID.
                    3. If it is a sensitive site, add this to the update object.
                    4. Get information from the record and update the Associated Document Relation record.
                    a. Update the Create by, Create Date, Modify By, Modify Date and GUID.
                    5. Return success.

    Date of Dev:    07/27/2025
    Last Rev Date:  07/27/2025
    Revision Notes:
                    07/27/2025 - Alfredo Scilabra:  First Setup of the script
                    10/09/2025 - Nicolas Culini: Added Status to the fields updated
                    10/20/2025 - Zharich Barona: Modified to not throw an error if no Associated Document Relation is found
    */

    logger.info(`Start of the process LibAssociatedDocumentRelationUpdate at ${Date()}`);

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
                        `${shortDescription} returned an error. Please, check the called Web Service. Status Description: ${vvClientRes.data[1]}.`
                    );
                }
            }
        }
        return vvClientRes;
    }

    function getForms(getFormsParams, templateName) {
        shortDescription = `Get ${templateName} form record`;

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function updateForm(formTemplateName, recordGUID, fieldValuesToUpdate) {
        const shortDescription = `Update form record ${recordGUID}`;

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    function parseBool(value) {
        return String(value).toLowerCase() === 'true';
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        const formID = getFieldValueByName('Form ID');
        const formTemplateType = getFieldValueByName('Form Template Type');
        const rawSensitiveSite = getFieldValueByName('Sensitive Site');

        // CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!formID || !formTemplateType || !rawSensitiveSite) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        const sensitiveSite = parseBool(rawSensitiveSite);

        //1. Get the record identified by the Form ID.
        const [applicationWithStatusUpdate] = await getForms(
            {
                q: `[instanceName] eq '${formID}'`,
                fields: 'createBy, createDate, modifyBy, modifyDate, Status',
            },
            formTemplateType
        );

        if (!applicationWithStatusUpdate) {
            throw new Error('Application not found for the provided Form ID.');
        }

        //2. Get the Associated Document Relation for the Form ID.
        const [associatedDocumentRelation] = await getForms(
            {
                q: `[Related Record ID] eq '${formID}'`,
                expand: true,
            },
            'Associated Document Relation'
        );

        if (!associatedDocumentRelation) {
            // If no Associated Document Relation is found, return success without doing anything.
            outputCollection[0] = 'Success'; // Don´t change this
            outputCollection[1] = '';
            outputCollection[2] = {};
        } else {
            //3. If it is a sensitive site, add this to the update object.
            //4. Get information from the record and update the Associated Document Relation record.
            //      a. Update the Create by, Create Date, Modify By, Modify Date and GUID.
            const updateObject = {
                'Document Create by': applicationWithStatusUpdate.createBy,
                'Document Create date': applicationWithStatusUpdate.createDate,
                'Document Modify by': applicationWithStatusUpdate.modifyBy,
                'Document Modify date': applicationWithStatusUpdate.modifyDate,
                'Document GUID': applicationWithStatusUpdate.revisionId,
                'Document Form Status': applicationWithStatusUpdate.status,
            };
            if (sensitiveSite) {
                updateObject['Sensitive Site'] = 'Yes';
            }
            await updateForm('Associated Document Relation', associatedDocumentRelation.revisionId, updateObject);

            //5. Return success.
            outputCollection[0] = 'Success'; // Don´t change this
            outputCollection[1] = 'Associated Document Relation record has been updated.';
            outputCollection[2] = {};
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
