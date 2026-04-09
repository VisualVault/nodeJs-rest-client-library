/**
 * MultipurposeRelateAssociatedRecord
 * Category: Workflow
 * Modified: 2026-02-26T16:57:51.443Z by fernando.chamorro@visualvault.com
 * Script ID: Script Id: 9e8f0b7c-8712-f111-830a-b2d961468a98
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
    Script Name:    MultipurposeRelateAssociatedRecord
    Customer:       WADNR
    Purpose:        The purpose of this script is to create Associated Document Relations between 
                    Multi-Purpose and ARP or WTM Review Page forms. It supports multiple FPA/WTM 
                    numbers separated by commas. When numbers are removed, 
                    it unrelates them and disables their Associated Document Relations.
    Preconditions:  -
    Parameters:     The following represent variables passed into the function:
                    - Multipurpose Form ID: This is the Form ID of the Multi-Purpose form
                    - Associated Records:   Comma-separated string of FPAN/WTMF Numbers (e.g., "SP-FPA-26-1234, SP-WTM-26-1234")
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code:
                    1   Get params
                    2   Parse and sanitize FPAN/WTMF numbers
                    3   Get existing related review pages to compare
                    4   Process each number: find review page, create Associated Document Relation, relate forms
                    5   Identify and unrelate removed numbers, disable their Associated Document Relations
                    6   Build the success response array

    Date of Dev:    10/31/2025
    Last Rev Date:  02/26/2026
 
    Revision Notes:
                    02/26/2026 - Fernando Chamorro:  First Setup of the script
    */

    logger.info(`Start of the process MultipurposeRelateAssociatedRecord at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    let outputCollection = [];
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */
    const WADNR_TIMEZONE = 'America/Los_Angeles';
    const dateOnlyISOStringFormat = 'YYYY-MM-DD';
    const arpTemplateName = 'Application Review Page';
    const wtmReviewPageTemplateName = 'WTM Review Page';
    const multiPurposeTemplateName = 'Multi-Purpose';
    const associatedDocumentRelationTemplateName = 'Associated Document Relation';

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

    function isNullEmptyUndefined(param) {
        if (param === null || param === undefined) {
            return true;
        }
        const dataType = Object.prototype.toString.call(param).slice(8, -1).toLowerCase();
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
        const shortDescription = `Get ${templateName} form record`;

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
        const shortDescription = `Relating forms: ${parentRecordGUID} and form ${childRecordID}`;
        const ignoreStatusCode = 404; // Don't throw error if relationship already exists

        return vvClient.forms
            .relateFormByDocId(parentRecordGUID, childRecordID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode));
    }

    function unrelateRecords(parentRecordGUID, childRecordID) {
        const shortDescription = `Unrelating forms: ${parentRecordGUID} and form ${childRecordID}`;

        return vvClient.forms
            .unrelateFormByDocId(parentRecordGUID, childRecordID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    function updateAssociatedDocumentRelation(revisionId, status) {
        const shortDescription = `Update Associated Document Relation ${revisionId} to ${status}`;
        const updateParams = {
            Status: status,
        };

        return vvClient.forms
            .postFormRevision(null, updateParams, associatedDocumentRelationTemplateName, revisionId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    async function getRelatedForms(revisionId) {
        const shortDescription = `Get related forms for ${revisionId}`;

        return vvClient.forms
            .getFormRelatedForms(revisionId, {})
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, 404))
            .then((res) => {
                if (res.meta.status === 404 || !res.data) {
                    return [];
                }
                return res.data;
            });
    }

    async function findReviewPageByNumber(number) {
        /*
            Find ARP or WTM Review Page by number
            Returns: { record, type: 'ARP' | 'WTM' }
        */
        if (number.includes('WTM')) {
            const [record] = await getFormRecords(
                {
                    q: `[WTMF No] eq '${number}'`,
                    expand: true,
                },
                wtmReviewPageTemplateName
            );

            if (isNullEmptyUndefined(record)) {
                throw new Error(`WTM Review Page not found for number: ${number}`);
            }

            return { record, type: 'WTM' };
        } else if (number.includes('FPA')) {
            const [record] = await getFormRecords(
                {
                    q: `[FPAN Number] eq '${number}'`,
                    expand: true,
                },
                arpTemplateName
            );

            if (isNullEmptyUndefined(record)) {
                throw new Error(`Application Review Page not found for number: ${number}`);
            }

            return { record, type: 'ARP' };
        } else {
            throw new Error(`Number does not contain FPA or WTM identifiers: ${number}`);
        }
    }

    async function processNumber(number, mpFormID, mpRevisionId, formStatus) {
        /*
            Process a single FPA/WTM number: find review page, create relation, 
            create Associated Document Relation
        */
        try {
            // Find the review page
            const { record: reviewPageRecord } = await findReviewPageByNumber(number);

            // Check if Associated Document Relation already exists
            const [foundAssociatedDocumentRelation] = await getFormRecords(
                {
                    q: `[ARP ID or WTM RP ID] eq '${reviewPageRecord['form ID']}' AND [Related Record ID] eq '${mpFormID}' AND [Status] eq 'Enabled'`,
                    expand: true,
                },
                associatedDocumentRelationTemplateName
            );

            // If not, create it
            if (isNullEmptyUndefined(foundAssociatedDocumentRelation)) {
                const currDateStr = dayjs().tz(WADNR_TIMEZONE).startOf('day').format(dateOnlyISOStringFormat);

                await createRecord(associatedDocumentRelationTemplateName, {
                    'Document Form Name': 'Multi-Purpose Form',
                    'Document Form Type': 'Form',
                    'Sensitive Indicator': 'No',
                    'Document Create By': 'fpOnline',
                    'Document Create Date': currDateStr,
                    'Document Modify By': 'fpOnline',
                    'Document Modify Date': currDateStr,
                    'Document GUID': mpRevisionId,
                    'Related Record ID': mpFormID,
                    'Document or Form': 'Form',
                    'ARP ID or WTM RP ID': reviewPageRecord['form ID'],
                    'Receipt Date': currDateStr,
                    'Document Form Status': formStatus,
                    Status: 'Enabled',
                });

                await relateRecords(reviewPageRecord.revisionId, mpFormID);

                logger.info(`Created relation for Multi-Purpose ${mpFormID} with ${number}`);
            } else {
                logger.info(`Relation already exists for Multi-Purpose ${mpFormID} with ${number}`);
            }

            return number;
        } catch (error) {
            errorLog.push(`Failed to process ${number}: ${error.message}`);
            return null;
        }
    }

    async function unrelateNumber(number, mpFormID) {
        /*
            Unrelate a number: unrelate forms and disable Associated Document Relation
        */
        try {
            // Find the review page
            const { record: reviewPageRecord } = await findReviewPageByNumber(number);

            // Find the Associated Document Relation
            const [associatedDocRelation] = await getFormRecords(
                {
                    q: `[ARP ID or WTM RP ID] eq '${reviewPageRecord['form ID']}' AND [Related Record ID] eq '${mpFormID}' AND [Status] eq 'Enabled'`,
                    expand: true,
                },
                associatedDocumentRelationTemplateName
            );

            if (!isNullEmptyUndefined(associatedDocRelation)) {
                // Unrelate the forms
                await unrelateRecords(reviewPageRecord.revisionId, mpFormID);

                // Disable the Associated Document Relation
                await updateAssociatedDocumentRelation(associatedDocRelation.revisionId, 'Disabled');

                logger.info(`Unrelated Multi-Purpose ${mpFormID} from ${number}`);
            }
        } catch (error) {
            errorLog.push(`Failed to unrelate ${number}: ${error.message}`);
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1. Get params
        const mpFormID = getFieldValueByName('Multipurpose Form ID');
        const fpanNumbers = getFieldValueByName('Associated Records', true); // Make optional to handle empty field

        if (!mpFormID) {
            throw new Error(errorLog.join('; '));
        }

        // Get Multi-Purpose record
        const [mpRecord] = await getFormRecords(
            {
                q: `[instanceName] eq '${mpFormID}'`,
                expand: true,
            },
            multiPurposeTemplateName
        );

        if (isNullEmptyUndefined(mpRecord)) {
            throw new Error('Multi-Purpose record not found.');
        }

        const mpRevisionId = mpRecord.revisionId;
        const formStatus = mpRecord.status;

        // 2. Parse and sanitize FPAN/WTMF numbers
        const sanitizedNumbers = fpanNumbers
            ? fpanNumbers
                  .split(',')
                  .map((num) => num.trim().toUpperCase())
                  .filter((num) => num)
            : [];

        // 3. Get existing related review pages to compare
        const existingRelatedForms = await getRelatedForms(mpRevisionId);

        const existingNumbers = new Set();

        for (const relatedForm of existingRelatedForms) {
            try {
                // Check if it's an ARP
                const [arpRecord] = await getFormRecords(
                    {
                        q: `[Form ID] eq '${relatedForm.instanceName}'`,
                        fields: 'FPAN Number',
                    },
                    arpTemplateName
                );

                if (!isNullEmptyUndefined(arpRecord) && arpRecord['fpaN Number']) {
                    existingNumbers.add(arpRecord['fpaN Number']);
                    continue;
                }

                // Check if it's a WTM Review Page
                const [wtmRecord] = await getFormRecords(
                    {
                        q: `[Form ID] eq '${relatedForm.instanceName}'`,
                        fields: 'WTMF No',
                    },
                    wtmReviewPageTemplateName
                );

                if (!isNullEmptyUndefined(wtmRecord) && wtmRecord['wtmF No']) {
                    existingNumbers.add(wtmRecord['wtmF No']);
                }
            } catch (error) {
                // Not an ARP or WTM, skip
                continue;
            }
        }

        // 4. Process each number
        const processedNumbers = new Set();

        for (const number of sanitizedNumbers) {
            const result = await processNumber(number, mpFormID, mpRevisionId, formStatus);
            if (result) {
                processedNumbers.add(result);
            }
        }

        // 5. Identify and unrelate removed numbers
        const numbersToUnrelate = [...existingNumbers].filter((num) => !processedNumbers.has(num));

        for (const number of numbersToUnrelate) {
            await unrelateNumber(number, mpFormID);
        }

        // 6. BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success';
        outputCollection[1] = `Processed ${processedNumbers.size} FPA/WTM number(s). Unrelated ${numbersToUnrelate.length} number(s).`;

        if (errorLog.length > 0) {
            outputCollection[2] = `Warnings: ${errorLog.join('; ')}`;
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
