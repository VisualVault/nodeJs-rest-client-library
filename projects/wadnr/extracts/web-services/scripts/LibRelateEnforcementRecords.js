/**
 * LibRelateEnforcementRecords
 * Category: Workflow
 * Modified: 2026-03-13T16:00:24.557Z by john.sevilla@visualvault.com
 * Script ID: Script Id: d3cd57df-35fd-f011-8311-c41c113564c7
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
    Script Name:    LibRelateEnforcementRecords
    Customer:       WADNR
    Purpose:        The purpose of this script is to create relationships between different forms of type Enforcements

    Parameters:     
                    - Enforcement Numbers   (String): A list of Enforcement numbers of type ICN, NTC, NCNU, MultiPurpose.
                    - Enforcement Form ID   (String): Current enforcement FormId
                    - Enforcement GUID      (String, Optional): Current enforcement GUID/Revision ID
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code: 
                    1. Receive and validate parameters
                    2. Parse/Split the Enforcement Numbers
                    3. Get current enforcement record's number
                    4. Classify all numbers
                    5. Get current form's revision ID to check existing relationships
                    6. Get existing related forms
                    7. Process each enforcement number
                    8. Unrelate and remove from 'Related Enforcement Numbers' for numbers that were removed
                    9. Return the response

    Date of Dev:    01/29/2026
 
    Revision Notes:
                    01/29/2026 - Fernando Chamorro:  First Setup of the script
                    02/12/2026 - Zharich Baron:  Fixed bug (typo in field name). It solved issues when deleting enforcement numbers in Related Enforcement No field.
                    02/25/2026 - John Sevilla: Updated number classification to account for legacy enforcement numbers 
                    and also added optional Enforcement GUID parameter for improved resilience to form ID mismatch error
    */

    logger.info(`Start of the process LibRelateEnforcementRecords at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    let outputCollection = [];
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const icnTemplateName = 'Informal Conference Note';
    const multiPurposeTemplateName = 'Multi-purpose';
    const ncnuTemplateName = 'Notice of Conversion to Non Forestry Use';
    const ntcTemplateName = 'Notice to Comply';

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

    function getTemplateAndFieldByType(type) {
        /*
        Helper function to get template name and number field based on type
        */
        const templateMap = {
            ICN: { template: icnTemplateName, field: 'ICN Number' },
            NTC: { template: ntcTemplateName, field: 'NTC Number' },
            NCNU: { template: ncnuTemplateName, field: 'NCNU Number' },
            MULTI_PURPOSE: {
                template: multiPurposeTemplateName,
                field: 'Document Number',
            },
        };

        return templateMap[type] || null;
    }

    async function getRecordByNumber(type, number) {
        /*
        Get full record data by type and number
        */
        const config = getTemplateAndFieldByType(type);

        if (!config) {
            throw new Error(`Unsupported type: ${type}`);
        }

        const getFormParams = {
            q: `[${config.field}] eq '${number}'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormParams, config.template)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, `GetForm from ${config.template}`))
            .then((res) => checkDataPropertyExists(res, `GetForm from ${config.template}`))
            .then((res) => checkDataIsNotEmpty(res, `GetForm from ${config.template}`))
            .then((res) => res.data[0]);
    }

    async function relateRecordsByDocId(parentRecordGUID, childRecordID) {
        const shortDescription = `Relating forms: ${parentRecordGUID} and form ${childRecordID}`;
        const ignoreStatusCode = 404;

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

    function getFormRecord(getFormsParams, templateName) {
        const shortDescription = `Get ${templateName} form record`;

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    async function classifyNumber(number) {
        /*
         * IMPORTANT: Patterns *must* be backwards compatible with legacy numbers. Legacy numbers are very similar to fpOnline
         * numbers, but not identical. Consult commit history for details.
         */
        const patterns = {
            ICN: '-ICN',
            NTC: '-NTC',
            NCNU: '-NCN',
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            if (String(number).includes(pattern)) {
                const getMultiPurposeFormParams = {
                    q: `[Document Number] eq '${number}'`,
                    fields: 'form ID, revisionId',
                };

                const multiPurposeRecord = await getFormRecord(getMultiPurposeFormParams, multiPurposeTemplateName);

                if (multiPurposeRecord && multiPurposeRecord.length > 0) {
                    return 'MULTI_PURPOSE';
                }

                return type;
            }
        }

        return 'MULTI_PURPOSE';
    }

    async function getCurrentEnforcementNumber(formID, formGUID) {
        /*
        Get the number field of the current enforcement form
        */
        // Try each template to find the current form
        const templates = [
            { name: icnTemplateName, field: 'icN Number' },
            { name: ntcTemplateName, field: 'ntC Number' },
            { name: ncnuTemplateName, field: 'ncnU Number' },
            { name: multiPurposeTemplateName, field: 'document Number' },
        ];

        for (const template of templates) {
            try {
                // prefer GUID when provided, more resilient against Form ID mismatch
                const getFormsQuery = formGUID ? `[revisionId] eq '${formGUID}'` : `[Form ID] eq '${formID}'`;
                const getFormParams = {
                    q: getFormsQuery,
                    fields: template.field,
                };

                const record = await getFormRecord(getFormParams, template.name);

                if (record && record.length > 0) {
                    return record[0][template.field];
                }
            } catch (error) {
                // Continue to next template
                continue;
            }
        }

        throw new Error(`Could not find enforcement record with Form ID: ${formID}`);
    }

    async function getEnforcementNumberFromInstanceName(instanceName) {
        /*
        Extract the enforcement number from related forms using their instanceName
        Returns the enforcement number or null if not an enforcement form
        */

        // List of templates to check
        const templatesWithNumbers = [
            { name: icnTemplateName, field: 'icN Number' },
            { name: ntcTemplateName, field: 'ntC Number' },
            { name: ncnuTemplateName, field: 'ncnU Number' },
            { name: multiPurposeTemplateName, field: 'document Number' },
        ];

        // Try to find the enforcement number in each template
        for (const template of templatesWithNumbers) {
            try {
                const getFormParams = {
                    q: `[Form ID] eq '${instanceName}'`,
                    fields: template.field,
                };

                const record = await getFormRecord(getFormParams, template.name);

                if (record && record.length > 0) {
                    return record[0][template.field];
                }
            } catch (error) {
                // Continue to next template
                continue;
            }
        }

        return null; // Not an enforcement form
    }

    async function updateRelatedEnforcementNumbers(revisionId, currentNumbers, numberToAdd, templateName) {
        /*
        Update the 'Related Enforcement Numbers' field
        Parameters:
            revisionId: The revision ID of the form to update
            currentNumbers: Current value of 'Related Enforcement Numbers' field
            numberToAdd: The enforcement number to add
            templateName: The template name of the form being updated
        */
        const numbersArray = currentNumbers ? currentNumbers.split(',').map((n) => n.trim()) : [];

        // Add new number if not already present
        if (!numbersArray.includes(numberToAdd)) {
            numbersArray.push(numberToAdd);
        }

        const updatedNumbers = numbersArray.join(', ');

        const updateParams = {
            'Related Enforcement Numbers': updatedNumbers,
        };

        const shortDescription = `Update Related Enforcement Numbers for ${revisionId}`;

        return vvClient.forms
            .postFormRevision(null, updateParams, templateName, revisionId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function removeFromRelatedEnforcementNumbers(revisionId, currentNumbers, numberToRemove, templateName) {
        /*
        Remove a number from 'Related Enforcement Numbers' field
        Parameters:
            revisionId: The revision ID of the form to update
            currentNumbers: Current value of 'Related Enforcement Numbers' field
            numberToRemove: The enforcement number to remove
            templateName: The template name of the form being updated
        */
        if (!currentNumbers) return;

        const numbersArray = currentNumbers.split(',').map((n) => n.trim());
        const filteredNumbers = numbersArray.filter((n) => n !== numberToRemove);

        const updatedNumbers = filteredNumbers.join(', ');

        const updateParams = {
            'Related Enforcement Numbers': updatedNumbers || '', // Empty string if no numbers left
        };

        const shortDescription = `Remove from Related Enforcement Numbers for ${revisionId}`;

        return vvClient.forms
            .postFormRevision(null, updateParams, templateName, revisionId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function getRelatedForms(revisionId, params = {}) {
        /*
        Get all forms related to a specific revision
        */
        const shortDescription = `Get related forms for ${revisionId}`;

        return vvClient.forms
            .getFormRelatedForms(revisionId, params)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1. Receive and validate parameters
        const formID = getFieldValueByName('Enforcement Form ID');
        const formGUID = getFieldValueByName('Enforcement GUID', true);
        const enforcementNumbers = getFieldValueByName('Enforcement Numbers', true);
        const enforcementNumbersExist = Boolean(
            typeof enforcementNumbers === 'string' && enforcementNumbers.trim() !== ''
        );

        if (!formID) {
            throw new Error(errorLog.join('; '));
        }

        // 2. Get current enforcement record's number
        const currentEnforcementNumber = await getCurrentEnforcementNumber(formID, formGUID);
        if (typeof currentEnforcementNumber !== 'string' || currentEnforcementNumber.trim() === '') {
            /** @NOTE Return response early */
            if (enforcementNumbersExist) {
                throw new Error(
                    `Unable to relate enforcement number(s) ${enforcementNumbers}. No enforcement number found for the current record`
                );
            } else {
                outputCollection[0] = 'Success';
                outputCollection[1] = `No enforcement number found for the current record, no relationships to modify.`;
                response.json(200, outputCollection);
                return;
            }
        }

        if (enforcementNumbersExist === false) {
            // 3. Get current form's revision ID to check existing relationships
            const currentFormType = await classifyNumber(currentEnforcementNumber);
            const currentFormRecord = await getRecordByNumber(currentFormType, currentEnforcementNumber);
            const currentRevisionId = currentFormRecord.revisionId;

            // 4. Get existing related forms
            const existingRelatedForms = await getRelatedForms(currentRevisionId);

            // Extract enforcement numbers from related forms
            const existingRelatedNumbers = new Set();

            for (const relatedForm of existingRelatedForms) {
                const enforcementNumber = await getEnforcementNumberFromInstanceName(relatedForm.instanceName);

                if (enforcementNumber) {
                    existingRelatedNumbers.add(enforcementNumber);
                }
            }

            // 5. Unrelate all existing enforcement relationships
            for (const number of existingRelatedNumbers) {
                try {
                    const type = await classifyNumber(number);
                    const record = await getRecordByNumber(type, number);
                    const config = getTemplateAndFieldByType(type);

                    // Unrelate the forms
                    await unrelateRecords(currentRevisionId, record.instanceName);

                    // Remove current number from target's 'Related Enforcement Numbers'
                    await removeFromRelatedEnforcementNumbers(
                        record.revisionId,
                        record['related Enforcement Numbers'],
                        currentEnforcementNumber,
                        config.template
                    );
                } catch (error) {
                    errorLog.push(`Failed to unrelate ${number}: ${error.message}`);
                }
            }

            /** @NOTE Return response early */
            outputCollection[0] = 'Success';
            outputCollection[1] = `Removed all ${existingRelatedNumbers.size} enforcement relationships.`;

            if (errorLog.length > 0) {
                outputCollection[2] = `Warnings: ${errorLog.join('; ')}`;
            }

            response.json(200, outputCollection);
            return;
        }

        // 3. Parse/Split the Enforcement Numbers
        const sanitizedEnforcementNumbers = [enforcementNumbers]
            .filter(Boolean)
            .join(',')
            .split(',')
            .map((id) => id.trim().toUpperCase())
            .filter((str) => str);

        // 4. Classify all numbers
        const classificationResults = await Promise.all(
            sanitizedEnforcementNumbers.map(async (id) => {
                try {
                    return await classifyNumber(id);
                } catch (error) {
                    errorLog.push(`Failed to classify ${id}: ${error.message}`);
                    return null;
                }
            })
        );

        // 5. Get current form's revision ID to check existing relationships
        const currentFormType = await classifyNumber(currentEnforcementNumber);
        const currentFormRecord = await getRecordByNumber(currentFormType, currentEnforcementNumber);
        const currentRevisionId = currentFormRecord.revisionId;

        // 6. Get existing related forms
        const existingRelatedForms = await getRelatedForms(currentRevisionId);

        // Extract enforcement numbers from related forms
        const existingRelatedNumbers = new Set();

        for (const relatedForm of existingRelatedForms) {
            const enforcementNumber = await getEnforcementNumberFromInstanceName(relatedForm.instanceName);

            if (enforcementNumber) {
                existingRelatedNumbers.add(enforcementNumber);
            }
        }

        // 7. Process each enforcement number
        const processedNumbers = new Set();

        for (let i = 0; i < sanitizedEnforcementNumbers.length; i++) {
            const number = sanitizedEnforcementNumbers[i];
            const type = classificationResults[i];

            if (!type) continue;

            try {
                // Get the record and template config
                const record = await getRecordByNumber(type, number);
                const targetRevisionId = record.revisionId;
                const config = getTemplateAndFieldByType(type);

                // Relate current form to target form
                await relateRecordsByDocId(currentRevisionId, record.instanceName);

                // Update 'Related Enforcement Numbers' in target form
                await updateRelatedEnforcementNumbers(
                    targetRevisionId,
                    record['related Enforcement Numbers'],
                    currentEnforcementNumber,
                    config.template
                );

                processedNumbers.add(number);
            } catch (error) {
                errorLog.push(`Failed to process ${number}: ${error.message}`);
            }
        }

        // 8. Unrelate and remove from 'Related Enforcement Numbers' for numbers that were removed
        const numbersToUnrelate = [...existingRelatedNumbers].filter((num) => !processedNumbers.has(num));

        for (const number of numbersToUnrelate) {
            try {
                const type = await classifyNumber(number);
                const record = await getRecordByNumber(type, number);
                const config = getTemplateAndFieldByType(type);

                // Unrelate the forms
                await unrelateRecords(currentRevisionId, record.instanceName);

                // Remove current number from target's 'Related Enforcement Numbers'
                await removeFromRelatedEnforcementNumbers(
                    record.revisionId,
                    record['related Enforcement Numbers'],
                    currentEnforcementNumber,
                    config.template
                );
            } catch (error) {
                errorLog.push(`Failed to unrelate ${number}: ${error.message}`);
            }
        }

        // 9. Return the response
        outputCollection[0] = 'Success';
        outputCollection[1] = `Processed ${processedNumbers.size} enforcement numbers. Unrelated ${numbersToUnrelate.length} numbers.`;

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
