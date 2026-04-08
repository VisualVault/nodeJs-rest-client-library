/**
 * LibGetRelatedFormsWadnrSearch
 * Category: Workflow
 * Modified: 2026-03-16T18:50:00.993Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: a18ca46c-110c-f111-8308-b28bfdc866da
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
    Script Name:    LibGetRelatedFormsWadnrSearch
    Customer:       WADNR
    Purpose:        For WADNR Search to get related forms

    Preconditions:  None
    Parameters:
                    - dhid: String, Required. main app revision id
                    - templateName: String, Required. main app Template Name
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code:
                    1.  Get and validate parameters (dhid)
                    2.  Get documents
                    3.  Build response object and end process.

    Date of Dev:    02/17/2026
    Last Rev Date:  02/17/2026

    Revision Notes:
                   02/17/2026 - Alfredo Scilabra: First Setup of the script
    */

    logger.info(`Start of the process LibGetRelatedFormsWadnrSearch at ${Date()}`);

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

    const SUBFORM_RELATION_FIELD = new Map([
        ['Legal Description', 'Related Record ID'],
        ['Appendix D Slope Stability Informational', 'Related Record ID'],
        ['Appendix J Forest Practices Marbled Murrelet', 'Related Record ID'],
        ['Appendix A Water Type Classification', 'Related Record ID'],
        ['Appendix H Eastern Washington Natural Regeneration Plan', 'Related Record ID'],
        ['Water Type Modification Form', 'Related Record ID'],
        ['Water Crossings', 'FPAN ID'],
        ['Typed Water', 'Related Record ID'],
        ['S or F Waters', 'Related Record ID'],
        ['NP Waters', 'Related Record ID'],
        ['Forest Roads', 'Related Record ID'],
        ['Rockpit', 'Related Record ID'],
        ['Spoils', 'Related Record ID'],
        ['Wetlands', 'Related Record ID'],
        ['Timber', 'Related Record ID'],
        ['Forest Tax Number', 'Related Record ID'],
        ['Chemical Information', 'Related Record ID'],
        ['Sensitive Site', 'Related Record ID'],
        ['Field Representative', 'Related Record ID'],
        ['Survey', 'Related Record ID'],
        ['Nesting Platforms', 'Related Record ID'],
        ['Unit Identifier', 'Related Record ID'],
        ['Stream Segment', 'Related Record ID'],
        ['Water Segment Modification', 'Related Record ID'],
        ['Channel Characteristics', 'Related Record ID'],
        ['Business', 'Related Record ID'],
    ]);
    const SUBFORMS_WITH_SUBFORMS = [
        'Appendix D Slope Stability Informational',
        'Appendix J Forest Practices Marbled Murrelet',
        'Appendix A Water Type Classification',
        'Water Type Modification Form',
    ];

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

    async function getSubformsForRecord({ parentInstanceName, templateName, relationField }) {
        return getFormRecords(
            {
                q: `[${relationField}] eq '${parentInstanceName}'`,
                fields: 'revisionId, instanceName',
                expand: false,
            },
            templateName
        );
    }

    async function loadSubformsRecursively(parentRecord) {
        const results = [];

        for (const [templateName, relationField] of SUBFORM_RELATION_FIELD.entries()) {
            const subforms = await getSubformsForRecord({
                parentInstanceName: parentRecord.instanceName,
                templateName,
                relationField,
            });

            for (const subform of subforms) {
                results.push({
                    revisionId: subform.revisionId,
                    templateName,
                });

                // recurse only if this template can have subforms
                if (SUBFORMS_WITH_SUBFORMS.includes(templateName)) {
                    const nestedSubforms = await loadSubformsRecursively(subform);
                    results.push(...nestedSubforms);
                }
            }
        }

        return results;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        const dhid = getFieldValueByName('dhid');
        const templateName = getFieldValueByName('templateName');

        // CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!dhid || !templateName) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        const [mainRecord] = await getFormRecords(
            {
                q: `[revisionId] eq '${dhid}'`,
                fields: 'revisionId, instanceName',
                expand: false,
            },
            templateName
        );

        if (!mainRecord) {
            throw new Error('Main record not found');
        }

        const responseObj = await loadSubformsRecursively(mainRecord);

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Documents retrieved successfully.';
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
