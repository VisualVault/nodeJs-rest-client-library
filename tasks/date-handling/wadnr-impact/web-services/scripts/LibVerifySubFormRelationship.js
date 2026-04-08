/**
 * LibVerifySubFormRelationship
 * Category: Form
 * Modified: 2026-04-08T13:52:14.807Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: 012b9a62-172e-f111-832f-e1a6acf32be3
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
    Script Name:    VerifySubFormRelationship
    Customer:       WADNR
    Purpose:        The purpose of this script is to verify that a sub-form is correctly
                    related to its Main Application parent (FPAN, Aerial Chemical, LTA Step 1,
                    LTA Step 2). If the sub-form is incorrectly related to a sibling sub-form
                    caused by the Add New flow, this script unrelates it from the sibling and
                    relates it to the correct Main Application using the Related Record ID
                    stored in the sub-form.

    Preconditions:  None

    Parameters:
                    - Related Record ID:    (String) Main Application ID stored in the sub-form
                    - Sub Form Revision ID: (String) Form ID of the sub-form being verified

    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message

    Pseudo code:
                    1. Receive and validate parameters
                    2. Get the Main Application and Sub Form records using the Related Record ID and Sub Form Revision ID
                    3. Get all related forms of the sub-form
                    4. Check if the sub-form is already related to the Main Application
                    5. If already related, return Success with no changes
                    6. If not, find the sibling it is incorrectly related to
                    7. Unrelate from the sibling
                    8. Relate to the Main Application
                    9. Return Success

    Date of Dev:    04/01/2026
    Last Rev Date:  04/08/2026

    Revision Notes:
                    04/01/2026 - Matías: First setup of the script
                    04/03/2023 - Include NCNU
                    04/08/2026 - Alfredo Scilabra: Add support for NCFLO
    */

    logger.info(`Start of the process VerifySubFormRelationship at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    let outputCollection = [];
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const subFormPrefixes = [
        'Legal-Description-',
        'Forest R-',
        'Stream S-',
        'WTM-',
        'Water Se-',
        'CHAN-CHARAC-',
        'Water Cr-',
        'Typed Wa-',
        'Wetlands-',
        'Timber-',
        'S or F W-',
        'NP-Waters-',
        'CHEMICAL-INFORMATION-',
        'Sensitive-Site-',
        'NCNU-',
    ];

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

    function getFieldValueByName(fieldName, isOptional = false) {
        let fieldValue = '';

        try {
            const field = ffCollection.getFormFieldByName(fieldName);
            const requiredFieldDoesntExists = !isOptional && !field;

            if (requiredFieldDoesntExists) {
                throw new Error(`The field '${fieldName}' was not found.`);
            }

            if (field) {
                fieldValue = 'value' in field ? field.value : fieldValue;
                fieldValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;

                const requiredFieldHasNoValue = !fieldValue && typeof fieldValue !== 'number' && !isOptional;
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
        try {
            const jsObject = JSON.parse(vvClientRes);
            if (jsObject && typeof jsObject === 'object') {
                vvClientRes = jsObject;
            }
        } catch (e) {}
        return vvClientRes;
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
        const status = vvClientRes.meta.status;

        if (status != ignoreStatusCode) {
            const dataIsArray = Array.isArray(vvClientRes.data);
            const dataIsObject = typeof vvClientRes.data === 'object';
            const isEmptyArray = dataIsArray && vvClientRes.data.length == 0;
            const isEmptyObject = dataIsObject && Object.keys(vvClientRes.data).length == 0;

            if (isEmptyArray || isEmptyObject) {
                throw new Error(
                    `${shortDescription} returned no data. Please, check parameters and syntax. Status: ${status}.`
                );
            }

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

    function detectFormTemplateFromID(recordID) {
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
            ['CHEMICAL-INFORMATION-', 'Chemical Information'],
            ['CHAN-CHARAC-', 'Channel Characteristics'],
            ['Legal-Description-', 'Legal Description'],
            ['NP-Waters-', 'NP Waters'],
            ['Sensitive-Site-', 'Sensitive Site'],
            ['Stream S-', 'Stream Segment'],
            ['Typed Wa-', 'Typed Water'],
            ['Timber-', 'Timber'],
            ['Water Cr-', 'Water Crossings'],
            ['Water Se-', 'Water Segment Modification'],
            ['Wetlands-', 'Wetlands'],
            ['WTM-', 'Water Type Modification Form'],
            ['Forest R-', 'Forest Roads'],
            ['S or F W-', 'S or F Waters'],
            ['NCNU-', 'Notice of Conversion to Non Forestry Use'],
            ['NCFLO-', 'Notice of Continuing Forest Land Obligation'],
            ['AppendixA-ID-', 'Appendix A Water Type Classification'],
        ]);

        const normalizedID = recordID.replace(/\s+/g, '');

        for (const [prefix, name] of templateMap) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return name;
            }
        }

        throw new Error('Form template name not found.');
    }

    function isSubFormSibling(instanceName) {
        return subFormPrefixes.some((prefix) => instanceName.startsWith(prefix));
    }

    function getRecords(recordId) {
        const shortDescription = `Get Main Application record ${recordId}`;
        const templateName = detectFormTemplateFromID(recordId);

        const getFormsParams = {
            q: `[instanceName] eq '${recordId}'`,
            fields: 'revisionId',
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]);
    }

    function getRelatedForms(revisionId) {
        const shortDescription = `Get related forms for ${revisionId}`;

        return vvClient.forms
            .getFormRelatedForms(revisionId, {})
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function relateRecordsByDocId(parentRevisionId, childInstanceName) {
        const shortDescription = `Relating forms: ${parentRevisionId} and form ${childInstanceName}`;

        return vvClient.forms
            .relateFormByDocId(parentRevisionId, childInstanceName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    function unrelateRecords(parentRevisionId, childInstanceName) {
        const shortDescription = `Unrelating forms: ${parentRevisionId} and form ${childInstanceName}`;

        return vvClient.forms
            .unrelateFormByDocId(parentRevisionId, childInstanceName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Step 1: Receive and validate parameters
        const relatedRecordId = getFieldValueByName('Related Record ID');
        const subFormInstanceName = getFieldValueByName('Sub Form Revision ID');

        if (errorLog.length > 0) {
            throw new Error(errorLog.join('; '));
        }

        // Step 2: Get the Main Application record and Sub Form record using the Related Record ID and Sub Form Revision ID
        const mainAppRecord = await getRecords(relatedRecordId);
        const mainAppRevisionId = mainAppRecord.revisionId;

        const subRecord = await getRecords(subFormInstanceName);
        const subRevisionId = subRecord.revisionId;

        // Step 3: Get all related forms of the sub-form
        const relatedForms = await getRelatedForms(subRevisionId);

        // Step 4: Check if the sub-form is already related to the Main Application
        const alreadyRelatedToParent = relatedForms.some((form) => form.revisionId === mainAppRevisionId);

        if (alreadyRelatedToParent) {
            // Step 5: Relation is already correct, nothing to fix
            outputCollection[0] = 'Success';
            outputCollection[1] = 'Relation is already correct. No fix needed.';
        } else {
            // Step 6: Find the sibling it is incorrectly related to
            const siblingForm = relatedForms.find((form) => isSubFormSibling(form.instanceName));

            if (!siblingForm) {
                throw new Error(`No sibling relation found for sub-form ${subFormInstanceName}.`);
            }

            // Step 7: Unrelate from the sibling
            await unrelateRecords(siblingForm.revisionId, subFormInstanceName);

            // Step 8: Relate to the Main Application
            await relateRecordsByDocId(mainAppRevisionId, subFormInstanceName);

            outputCollection[0] = 'Success';
            outputCollection[1] = 'Relation corrected successfully.';
        }
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        outputCollection[0] = 'Error';

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors occurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        response.json(200, outputCollection);
    }
};
