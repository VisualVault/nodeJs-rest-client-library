/**
 * LibRemoveContactInformationRelation
 * Category: Workflow
 * Modified: 2026-04-02T18:33:50.28Z by lucas.herrera@visualvault.com
 * Script ID: Script Id: e47ed666-28f5-ef11-82c4-953deda8420a
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
    Script Name:    LibRemoveContactInformationRelation
    Customer:       WADNR
    Purpose:        The purpose of this script is to 'disable' selected Contact Information Relation from the
                    current form.

    Preconditions:  None
    Parameters:
                    - Form ID: String (FPAN form ID)
                    - Selected Item IDs: Array (Collection of Landowners Business GUIDs)
                    - Removed Name: type of the removed contact information (i.e Landowner, Timber Owner)
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code:
                    1. Get and validate parameters
                    2. Get selected Contact Information Relation Form IDs
                    3. Check existing relation
                    4. Disable relation record from "Contact Information Relation"

    Date of Dev:    02/27/2025
    Last Rev Date:  02/25/2026

    Revision Notes:
                    02/27/2025 - Nicolas Culini:  First Setup of the script
                    04/23/2025 - Mauro Rapuano: Added 'Multi-purpose' form to be supported by library
                    06/25/2025 - John Sevilla: Added 'Notice of Transfer' form to be supported by library
                    02/25/2026 - Alfredo Scilabra: Rename Multi-pupose prefix
                    04/02/2026 - Lucas Herrera: Added type (business or individual) on filter when search for contact relation record
    */

    logger.info(`Start of the process LibRemoveContactInformationRelation at ${Date()}`);

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

    const contactInfoRelationTemplateName = 'Contact Information Relation';
    let templateName = 'Contact Information';

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

    function getContactInfoFormID(formGUID) {
        const shortDescription = `Get (Contact Information) with GUID ${formGUID}`;

        const getFormsParams = {
            q: `[revisionId] eq '${formGUID}'`,
            fields: 'instanceName',
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]['instanceName']);
    }

    function getContactInfoRelationFormId(contactInfoID, formId, type) {
        const shortDescription = `Get (Contact Information Relation) with Contact Information ID ${contactInfoID} and Form ID ${formId}`;
        const businessOrIndividual = type === 'Business Signer' ? 'Business' : 'Individual';

        const getFormsParams = {
            q: `[Related Record ID] eq '${formId}' AND [contact Information ID] eq '${contactInfoID}' AND [Status] ne 'Disabled' AND [Relation Type] eq '${businessOrIndividual}'`,
            fields: 'Contact Information Relation ID',
        };

        return vvClient.forms
            .getForms(getFormsParams, contactInfoRelationTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]['contact Information Relation ID']);
    }

    function checkExistingRelation(formID, contactInfoRelFormID) {
        const shortDescription = `Get Forms with Form ID ${formID} and (Contact Information Relation) ID ${contactInfoRelFormID}`;

        const getFormsParams = {
            q: `[Related Record ID] eq '${formID}' AND [contact Information Relation ID] eq '${contactInfoRelFormID}'`,
            fields: 'revisionId, Landowner, Timber Owner, Operator, Contact Person, Surveyor, Other',
        };

        return vvClient.forms
            .getForms(getFormsParams, contactInfoRelationTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]);
    }

    async function disableRelation(record, remove, parentId, contactInformationId, contactInformationGUID) {
        const shortDescription = `Disable Contact Informatino Relation ${record['revisionId']}`;

        const fieldValuesToUpdate = {};
        let checkboxesChecked = 0;

        Object.keys(record).forEach((key) => {
            if (record[key] == 'True') checkboxesChecked++;
        });

        fieldValuesToUpdate[remove] = 'False';

        if (checkboxesChecked <= 1) {
            await undoInnerRelations(parentId, contactInformationId, contactInformationGUID, record['instanceName']);
            fieldValuesToUpdate['Status'] = 'Disabled';
        }

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, contactInfoRelationTemplateName, record['revisionId'])
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

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

    function detectFormTemplateFromID(recordID) {
        if (recordID.substring(5, 14) == 'AMENDMENT') {
            return 'FPAN Amendment Request';
        } else if (recordID.substring(0, 7) == 'FPAN-RE') {
            return 'FPAN Renewal';
        } else if (recordID.substring(0, 6) == 'LT-5DN') {
            return 'Long-Term Application 5-Day Notice';
        } else if (recordID.substring(0, 6) == 'FPAN-T') {
            return 'FPAN Notice of Transfer';
        } else if (recordID.substring(0, 4) == 'FPAN') {
            return 'Forest Practices Application Notification';
        } else if (recordID.substring(0, 3) == 'FPA') {
            return 'Forest Practices Aerial Chemical Application';
        } else if (recordID.substring(0, 3) == 'MPF') {
            return 'Multi-purpose';
        } else if (recordID.substring(0, 20) == 'STEP-1-LONG-TERM-FPA') {
            return 'Step 1 Long Term FPA';
        } else if (recordID.substring(0, 3) == 'WTM') {
            return 'Water Type Modification Form';
        } else if (recordID.substring(0, 3) == 'ICN') {
            return 'Informal Conference Note';
        } else if (recordID.substring(0, 3) == 'NTC') {
            return 'Notice to Comply';
        } else if (recordID.substring(0, 4) == 'NCNU') {
            return 'Notice of Conversion to Non Forestry Use';
        } else {
            throw new Error(`Unable to detect form template name of ${recordID}`);
        }
    }

    async function undoInnerRelations(
        parentId,
        contactInformationId,
        contactInformationGUID,
        contactInformationRelationId
    ) {
        const parentName = detectFormTemplateFromID(parentId);
        const parentGUID = await getRecordGUID(parentName, parentId);
        await unrelateRecords(parentGUID, contactInformationId);
        await unrelateRecords(parentGUID, contactInformationRelationId);
        await unrelateRecords(contactInformationGUID, contactInformationRelationId);
    }

    function unrelateRecords(parentRecordGUID, childRecordID) {
        const shortDescription = `unrelating forms: ${parentRecordGUID} and form ${childRecordID}`;

        return vvClient.forms
            .unrelateFormByDocId(parentRecordGUID, childRecordID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Step #1
        const selectedContactInfoGUID = getFieldValueByName('Selected Item IDs'); // Selected Contact Information GUIDs
        const formId = getFieldValueByName('Form ID');
        const removedName = getFieldValueByName('Removed Name');
        const type = getFieldValueByName('Type');

        if (type == 'Business') {
            templateName = 'Business';
        }

        // CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!selectedContactInfoGUID || !formId || !removedName) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // Step #2
        const contactInfoFormIDs = await Promise.all(
            selectedContactInfoGUID.map((contactInfoGUID) => getContactInfoFormID(contactInfoGUID))
        );

        // Step #3
        const contactInfoRelationIDs = await Promise.all(
            contactInfoFormIDs.map((contactInfoID) => getContactInfoRelationFormId(contactInfoID, formId, type))
        );

        // Step #4
        const contactInfoRelationRecords = await Promise.all(
            contactInfoRelationIDs.map((contactInfoRelFormID) => checkExistingRelation(formId, contactInfoRelFormID))
        );

        // Step #5
        await Promise.all(
            contactInfoRelationRecords.map((record, index) =>
                disableRelation(record, removedName, formId, contactInfoFormIDs[index], selectedContactInfoGUID[index])
            )
        );

        responseTitle = 'Success';
        responseMessage = `${contactInfoRelationRecords.length} Contact Information Relations records removed from this Form`;

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Record(s) removed successfully';
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
