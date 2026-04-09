/**
 * WorkflowUpdateSubformsStatus
 * Category: Workflow
 * Modified: 2026-02-18T15:41:19.04Z by lucas.herrera@visualvault.com
 * Script ID: Script Id: 4cd95cc2-69c4-f011-82f8-fd3f23079e80
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
    /*Script Name:	  WorkflowUpdateSubformsStatus
    Customer:       WADNR
    Purpose:        Updates Subforms based on ‘UpdateSubformsToSubmitted’ and ‘UpdatedSubFormsToDraft’
                    flags. Once updates are completed successfully, the flags will be cleared
    Preconditions:

    Parameters:
                    - Form ID: (String, Required) — instanceName of the main application
                    - New Status:  (String, Required) — Submitted | Draft

    Pseudo code:
                   Pseudo code:
                    1. Get main application record
                    2. Get target sub forms
                    3. Update target subforms to New Status
                    4. RETURN an object that signals the completion of the microservice and its success/error

    Date of Dev:    11/14/2025
    Last Rev Date:  11/14/2025

    Revision Notes:
                    11/14/2025 - Alfredo Scilabra: First Setup of the script
	  */

    logger.info('Start of the process WorkflowUpdateSubformsStatus at ' + Date());

    // Respond immediately before proceeding
    response.json(200, { success: true, message: 'Process started successfully.' });

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */
    let returnObject;
    // Describes the process being checked using the parsing and checking helper functions
    let shortDescription = '';

    // Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete.
    const executionId = response.req.headers['vv-execution-id'];
    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const VALID_SUBFORM_TYPES_BY_MAIN_APP_TYPE = new Map([
        [
            'Forest Practices Application Notification',
            [
                'Legal Description',
                'Appendix D Slope Stability Informational',
                'Appendix J Forest Practices Marbled Murrelet',
                'Appendix A Water Type Classification',
                'Appendix H Eastern Washington Natural Regeneration Plan',
                'Typed Water',
                'Forest Roads',
                'Rockpit',
                'Spoils',
                'Wetlands',
                'Timber',
                'Forest Tax Number',
                'S or F Waters',
                'NP Waters',
            ],
        ],
        ['Forest Practices Aerial Chemical Application', ['Legal Description', 'Chemical Information']],
        [
            'Step 1 Long Term FPA',
            [
                'Legal Description',
                'Appendix D Slope Stability Informational',
                'Appendix J Forest Practices Marbled Murrelet',
                'S or F Waters',
                'Wetlands',
                'Sensitive Site',
                'Forest Roads',
            ],
        ],
        [
            'Water Type Modification Form',
            ['Legal Description', 'Water Segment Modification', 'Channel Characteristics'],
        ],
        ['Appendix D Slope Stability Informational', ['Field Representative']],
        ['Appendix J Forest Practices Marbled Murrelet', ['Survey', 'Nesting Platforms', 'Unit Identifier']],
        ['Appendix A Water Type Classification', ['Stream Segment']],
    ]);

    const SUBFORMS_WITH_SUBFORMS = [
        'Appendix D Slope Stability Informational',
        'Appendix J Forest Practices Marbled Murrelet',
        'Appendix A Water Type Classification',
    ];

    const EXCLUDE_STATUS = 'Disabled';

    const enableprefixToTemplateNameMap = true; // determines whether or not to cache query results in map
    const formTemplatePrefixListQueryName = 'zWebSvc Form Template Prefix List';
    const subformStatusQueryName = 'zWebSvc Form Not Disabled';
    let prefixToTemplateNameMap;

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

    function getAllRelatedRecords(recordGUID) {
        const shortDescription = `Records related to the record ${recordGUID}`;

        return vvClient.forms
            .getFormRelatedForms(recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getFormPrefix(formID) {
        // Capture everything up to the last hyphen followed by digits
        const prefixReg = /^(.+)-\d+$/;
        let formPrefix = '';
        try {
            const match = prefixReg.exec(formID);
            if (!match) {
                throw new Error('Invalid format');
            }
            formPrefix = match[1];
        } catch (error) {
            throw new Error(`Unable to parse form prefix for: "${formID}". ${error.message}`);
        }

        return formPrefix;
    }

    async function getTemplateNameFromID(formID) {
        let formPrefix = getFormPrefix(formID);
        formPrefix += '-'; // add trailing dash since query returns prefixes in this format

        let queryParams = {};
        if (enableprefixToTemplateNameMap === false) {
            queryParams.q = `[prefix] eq '${formPrefix}'`;
        }

        let querySearchData;
        if (enableprefixToTemplateNameMap === false || prefixToTemplateNameMap == null) {
            let queryResp = await vvClient.customQuery.getCustomQueryResultsByName(
                formTemplatePrefixListQueryName,
                queryParams
            );
            queryResp = JSON.parse(queryResp);
            if (queryResp.meta.status !== 200) {
                throw new Error(`There was an error when calling the ${formTemplatePrefixListQueryName} custom query.`);
            }
            querySearchData = queryResp.hasOwnProperty('data') ? queryResp.data : null;
            if (Array.isArray(querySearchData) === false) {
                throw new Error(
                    `Data was not able to be returned when calling the ${formTemplatePrefixListQueryName} custom query.`
                );
            }
            if (querySearchData.length < 1) {
                throw new Error(`Unable to get template names from query ${formTemplatePrefixListQueryName}`);
            }
        }

        let templateName;
        if (enableprefixToTemplateNameMap) {
            // global map to avoid querying several times
            if (prefixToTemplateNameMap == null) {
                prefixToTemplateNameMap = new Map();
                querySearchData.forEach((template) => {
                    prefixToTemplateNameMap.set(template.prefix, template.templateName);
                });
            }
            templateName = prefixToTemplateNameMap.get(formPrefix);
        } else {
            templateName = querySearchData[0].templateName;
        }

        if (!templateName) {
            throw new Error(`Unable to find template name for ${formID}!`);
        }

        return templateName;
    }

    function detectFormTemplateFromID(recordID) {
        //NOTE: Check for longer prefixes first!
        const templateMap = new Map([
            ['STEP-1-LONG-TERM-FPA', 'Step 1 Long Term FPA'],
            ['FPA-AERIAL-CHEMICAL', 'Forest Practices Aerial Chemical Application'],
            ['FPAN', 'Forest Practices Application Notification'],
            ['WTM', 'Water Type Modification Form'],
        ]);

        const normalizedID = recordID.replace(/\s+/g, '');

        for (const [prefix, name] of templateMap) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return name;
            }
        }

        throw new Error('Form template name not found.');
    }

    async function getStatusFromId(instanceName, templateName) {
        const sqlParams = [
            { parameterName: 'TemplateName', value: templateName },
            { parameterName: 'InstanceName', value: instanceName },
        ];

        const testParams = {
            params: JSON.stringify(sqlParams),
        };

        const response = await vvClient.customQuery.getCustomQueryResultsByName(subformStatusQueryName, testParams);
        const data = JSON.parse(response);

        if (data.meta.status !== 200) {
            throw new Error(`Error retrieving status for ${instanceName} - ${templateName}`);
        }

        return data.data[0]?.status || null;
    }

    async function getValidSubFormRecords(revisionId, templateName, isSubForm = false) {
        const subForms = await getAllRelatedRecords(revisionId);
        if (!Array.isArray(subForms) || subForms.length === 0) return [];

        const validTypes = VALID_SUBFORM_TYPES_BY_MAIN_APP_TYPE.get(templateName);
        if (!Array.isArray(validTypes) || validTypes.length === 0) return [];

        const result = [];

        for (const subForm of subForms) {
            const subformTemplateName = await getTemplateNameFromID(subForm.instanceName);

            const subformStatus = await getStatusFromId(subForm.instanceName, subformTemplateName);

            // exclude disabled records
            if (subformStatus === EXCLUDE_STATUS) continue;

            // FIXED: check subformTemplateName
            if (!validTypes.includes(subformTemplateName)) continue;

            result.push({ templateName: subformTemplateName, subForm });

            // If this subform can contain subforms, recurse
            if (!isSubForm && SUBFORMS_WITH_SUBFORMS.includes(subformTemplateName)) {
                const nested = await getValidSubFormRecords(subForm.revisionId, subformTemplateName, true);
                result.push(...nested);
            }
        }

        return result;
    }

    function parseBool(value) {
        return String(value).toLowerCase() === 'true';
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get required web service parameters
        const mainAppFormID = getFieldValueByName('Form ID');
        const newStatus = getFieldValueByName('New Status');
        const updateFlags = getFieldValueByName('Update Flags');

        // Check is the required parameters are present
        if (!mainAppFormID || !newStatus) {
            throw new Error(errorLog.join('; '));
        }

        const mainAppTemplateName = detectFormTemplateFromID(mainAppFormID);

        // 1 Get main application record
        const [mainAppRecord] = await getFormRecords(
            {
                q: `[instanceName] eq '${mainAppFormID}'`,
                expand: true,
            },
            mainAppTemplateName
        );

        if (!mainAppRecord) {
            throw new Error('Main application Form not found.');
        }

        // 2. Get target sub forms
        const validSubForms = await getValidSubFormRecords(mainAppRecord.revisionId, mainAppTemplateName);

        // 3. Update target non-disabled subforms to New Status
        await Promise.all(
            validSubForms.map(({ templateName, subForm }) =>
                updateRecord(templateName, subForm.revisionId, {
                    Status: newStatus,
                })
            )
        );

        if (parseBool(updateFlags) || newStatus === 'Draft') {
            await updateRecord(mainAppTemplateName, mainAppRecord.revisionId, {
                UpdateSubformsToSubmitted: false,
                UpdateSubformsToDraft: false,
            });
        }

        // 4. RETURN an object that signals the completion of the microservice and its success/error
        returnObject = {
            MicroserviceResult: true,
            MicroserviceMessage: 'Subforms updated successfully.',
            formID: mainAppFormID,
            'Subforms Updated': validSubForms.length,
        };

        logger.info('Task assignee notification completed successfully.');
    } catch (err) {
        logger.info('Error encountered' + err);

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: err.message ? err.message : err.toString(),
        };
    } finally {
        shortDescription = 'Sending the workflow completion response to the log server';

        // If the complete was successful or not to the log server. This helps to track down what occurred when a microservice completed.
        await vvClient.scripts
            .completeWorkflowWebService(executionId, returnObject)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then(() => logger.info('Completion signaled to WF engine successfully.'))
            .catch(() => logger.info('There was an error signaling WF completion.'));
    }
};
