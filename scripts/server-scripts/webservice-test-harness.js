const logger = require('../log');

module.exports.getCredentials = function () {
    var env = global.VV_ENV || {};
    var customerAlias = env.customerAlias || 'CUSTOMER ALIAS';
    var databaseAlias = env.databaseAlias || 'DATABASE ALIAS';
    var clientId = env.clientId || 'CLIENT ID';
    var clientSecret = env.clientSecret || 'CLIENT SECRET';

    return {
        customerAlias,
        databaseAlias,
        clientId,
        clientSecret,
        userId: env.clientId || clientId,
        password: env.clientSecret || clientSecret,
        audience: env.audience || '',
    };
};

module.exports.main = async function (ffCollection, vvClient, response) {
    /*
    Script Name:    DateTest WS Harness
    Customer:       VisualVault
    Purpose:        Multi-purpose test harness for date-handling web service tests.
                    Supports 10 test categories (WS-1 through WS-10) via an Action parameter.
    Preconditions:
                    - DateTest form template must exist in the target environment
                    - For read actions (WS-2, WS-5): a saved record must exist
    Parameters:     Passed via ffCollection:
                    Action:        Required. "WS-1" through "WS-10"
                    TargetConfigs: Optional. Comma-separated config letters (A-H) or "ALL". Default: "ALL"
                    RecordID:      Optional. Instance name (e.g. "DateTest-000080") for read actions
                    InputDate:     Optional. ISO date string (e.g. "2026-03-15") for write actions
                    InputFormats:  Optional. Comma-separated format keys for WS-6
    Return Object:
                    output.status: "Success" | "Warning" | "Error"
                    output.errors: Array of error messages
                    output.data:   Structured result envelope with action, configs, serverTime, and results array

    Date of Dev:    04/02/2026
    Last Rev Date:  04/02/2026

    Revision Notes:
                    04/06/2026 - Emanuel Jofré: Add WS-10 (postForms vs forminstance/) for Freshdesk #124697
                    04/02/2026 - Emanuel Jofré: Initial harness with WS-1 and WS-2 actions
  */

    /* ------------------------ Response & Log Variables ------------------------ */

    const serviceName = 'DateTestWSHarness';
    const environment = new URL(vvClient.getBaseUrl()).hostname.split('.')[0];

    const output = {
        data: null,
        errors: [],
        status: 'Success',
    };

    let logEntry = {
        customerAlias: vvClient._httpHelper._sessionToken.customerAlias,
        databaseAlias: vvClient._httpHelper._sessionToken.databaseAlias,
        environment,
        errors: [],
        parameters: ffCollection,
        service: serviceName,
        status: 'Started',
    };

    /* ------------------------- Configurable Variables ------------------------- */

    let FORM_TEMPLATE_NAME = 'DateTest';
    const ROUND_TRIP_CYCLES = 2;

    // Field configuration map — mirrors testing/fixtures/vv-config.js (lines 48-113)
    const FIELD_MAP = {
        A: {
            field: 'Field7',
            preset: 'Field2',
            currentDate: 'Field1',
            enableTime: false,
            ignoreTimezone: false,
            useLegacy: false,
        },
        B: {
            field: 'Field10',
            preset: 'Field27',
            currentDate: 'Field28',
            enableTime: false,
            ignoreTimezone: true,
            useLegacy: false,
        },
        C: {
            field: 'Field6',
            preset: 'Field15',
            currentDate: 'Field17',
            enableTime: true,
            ignoreTimezone: false,
            useLegacy: false,
        },
        D: {
            field: 'Field5',
            preset: 'Field16',
            currentDate: 'Field18',
            enableTime: true,
            ignoreTimezone: true,
            useLegacy: false,
        },
        E: {
            field: 'Field12',
            preset: 'Field19',
            currentDate: 'Field23',
            enableTime: false,
            ignoreTimezone: false,
            useLegacy: true,
        },
        F: {
            field: 'Field11',
            preset: 'Field20',
            currentDate: 'Field24',
            enableTime: false,
            ignoreTimezone: true,
            useLegacy: true,
        },
        G: {
            field: 'Field14',
            preset: 'Field21',
            currentDate: 'Field25',
            enableTime: true,
            ignoreTimezone: false,
            useLegacy: true,
        },
        H: {
            field: 'Field13',
            preset: 'Field22',
            currentDate: 'Field26',
            enableTime: true,
            ignoreTimezone: true,
            useLegacy: true,
        },
    };

    // Date format generators for WS-6 (format tolerance testing)
    // Each takes an ISO date string (e.g. "2026-03-15") and returns the formatted version
    const FORMAT_MAP = {
        ISO: (d) => d,
        US: (d) => {
            const [y, m, dd] = d.split('-');
            return `${m}/${dd}/${y}`;
        },
        DATETIME: (d) => `${d}T00:00:00`,
        ISO_Z: (d) => `${d}T00:00:00Z`,
        ISO_NEG3: (d) => `${d}T00:00:00-03:00`,
        ISO_POS530: (d) => `${d}T00:00:00+05:30`,
    };

    /* eslint-disable no-unused-vars, no-unsafe-finally */

    /* ---------------------------- Helper Functions ---------------------------- */

    /**
     * Sanitizes a log entry for safe key=value logging.
     * Serializes values (arrays, dates, objects) to strings and strips
     * characters that break log format (commas, quotes, newlines, etc.).
     * Structured values (arrays/objects) preserve commas in their JSON output.
     * @param {Object} entry - Log entry object with key-value pairs.
     * @returns {Object} Sanitized entry with all values as safe strings.
     */
    function sanitizeLog(entry) {
        function serializeValue(value) {
            if (Array.isArray(value)) return value.join('; ');
            if (value instanceof Date) return value.toUTCString();
            if (value !== null && typeof value === 'object') return JSON.stringify(value);
            return String(value);
        }

        // Iterate over each property and rebuild with sanitized values
        return Object.fromEntries(
            Object.entries(entry).map(([key, value]) => {
                const isStructured = Array.isArray(value) || (value !== null && typeof value === 'object');
                const serialized = serializeValue(value);

                return [
                    key,
                    isStructured
                        ? serialized.replace(/[\r\n\t\0]/g, ' ') // Strip newlines/tabs/nulls only
                        : serialized.replace(/[,"\\\r\n\t\0]/g, ' '), // Also strip commas/quotes/backslashes
                ];
            })
        );
    }

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
            output.errors.push(error.message);
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
            const dataIsObject = vvClientRes.data !== null && typeof vvClientRes.data === 'object';
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

    function parseTargetConfigs(raw) {
        if (!raw || raw.toUpperCase() === 'ALL') {
            return Object.keys(FIELD_MAP);
        }
        const configs = raw.split(',').map((s) => s.trim().toUpperCase());
        const invalid = configs.filter((c) => !FIELD_MAP[c]);
        if (invalid.length > 0) {
            throw new Error(`Invalid config(s): ${invalid.join(', ')}. Valid: A-H`);
        }
        return configs;
    }

    function buildResultEntry(configKey, extras) {
        const config = FIELD_MAP[configKey];
        return {
            config: configKey,
            fieldName: config.field,
            enableTime: config.enableTime,
            ignoreTimezone: config.ignoreTimezone,
            useLegacy: config.useLegacy,
            ...extras,
        };
    }

    function extractDateFields(record, targetConfigs) {
        // VV API returns field names in camelCase (e.g. "dataField7").
        // Do a case-insensitive lookup to be safe across API versions.
        const recordKeys = Object.keys(record);
        const extracted = {};
        for (const configKey of targetConfigs) {
            const config = FIELD_MAP[configKey];
            const targetLower = config.field.toLowerCase();
            const matchedKey = recordKeys.find((k) => k.toLowerCase() === targetLower);
            extracted[configKey] = matchedKey && record[matchedKey] != null ? record[matchedKey] : '';
        }
        return extracted;
    }

    function createFormRecord(fieldValues) {
        const shortDescription = 'Create DateTest record';
        return vvClient.forms
            .postForms(null, fieldValues, FORM_TEMPLATE_NAME)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function updateFormRecord(recordGUID, fieldValues) {
        const shortDescription = `Update DateTest record ${recordGUID}`;
        return vvClient.forms
            .postFormRevision(null, fieldValues, FORM_TEMPLATE_NAME, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    // WS-10: Create record via FormsAPI forminstance/ endpoint (Freshdesk #124697).
    // Uses vvClient.formsApi.formInstances.postForm() — requires FormsApi enabled + JWT.
    // The forminstance/ endpoint requires the template REVISION ID (not the template ID or
    // form definition GUID). We resolve it dynamically from the template name.
    let _resolvedRevisionId = null;

    async function getFormTemplateIds() {
        if (_resolvedRevisionId) return _resolvedRevisionId;
        const resp = await vvClient.forms.getFormTemplateIdByName(FORM_TEMPLATE_NAME);
        _resolvedRevisionId = {
            templateId: resp.templateIdGuid,
            revisionId: resp.templateRevisionIdGuid,
        };
        if (!_resolvedRevisionId.revisionId) {
            throw new Error(`Could not resolve revisionId for template "${FORM_TEMPLATE_NAME}"`);
        }
        return _resolvedRevisionId;
    }

    async function createFormRecordViaFormInstance(fieldValues) {
        const shortDescription = 'Create DateTest record via forminstance/';
        const ids = await getFormTemplateIds();

        // The forminstance/ endpoint expects { fields: [{key, value}, ...] } array.
        // Discovered via browser network intercept of VV.Form.CreateFormInstance.
        const fieldsArray = Object.entries(fieldValues).map(([key, value]) => ({
            key,
            value,
        }));
        const data = { formName: '', fields: fieldsArray };

        const rawResp = await vvClient.formsApi.formInstances.postForm(null, data, ids.revisionId);
        const parsed = parseRes(rawResp);

        checkMetaAndStatus(parsed, shortDescription);
        checkDataPropertyExists(parsed, shortDescription);
        checkDataIsNotEmpty(parsed, shortDescription);
        return parsed.data;
    }

    function readFormRecord(instanceName) {
        const shortDescription = `Read DateTest record ${instanceName}`;
        const getFormsParams = {
            q: `[instanceName] eq '${instanceName}'`,
            expand: true,
        };
        return vvClient.forms
            .getForms(getFormsParams, FORM_TEMPLATE_NAME)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]);
    }

    /* ----------------------------- Action Handlers ----------------------------- */

    async function actionSetDate(targetConfigs, inputDate, isDebug) {
        // WS-1: Create a record with inputDate in each target config field, then read back to verify
        const fieldValues = {};
        for (const configKey of targetConfigs) {
            fieldValues[FIELD_MAP[configKey].field] = inputDate;
        }

        const created = await createFormRecord(fieldValues);
        const instanceName = created.instanceName;
        const revisionId = created.revisionId;

        // Read back to get canonical stored values
        const record = await readFormRecord(instanceName);
        const stored = extractDateFields(record, targetConfigs);

        const results = targetConfigs.map((configKey) =>
            buildResultEntry(configKey, {
                sent: inputDate,
                stored: stored[configKey],
                match: inputDate === stored[configKey],
            })
        );

        const result = {
            action: 'WS-1',
            targetConfigs,
            inputDate,
            recordID: instanceName,
            revisionId,
            serverTime: new Date().toISOString(),
            results,
        };

        if (isDebug) {
            result.rawRecord = record;
            result.fieldValuesSent = fieldValues;
        }

        return result;
    }

    async function actionGetDate(targetConfigs, recordID, isDebug) {
        // WS-2: Read an existing record and return the API values for each target config
        const record = await readFormRecord(recordID);
        const stored = extractDateFields(record, targetConfigs);

        const results = targetConfigs.map((configKey) =>
            buildResultEntry(configKey, {
                apiReturn: stored[configKey],
            })
        );

        const result = {
            action: 'WS-2',
            targetConfigs,
            inputDate: null,
            recordID,
            serverTime: new Date().toISOString(),
            results,
        };

        if (isDebug) {
            result.rawRecord = record;
        }

        return result;
    }

    async function actionRoundTrip(targetConfigs, recordID, inputDate, isDebug) {
        // WS-3: Write → Read → Write-back → Read. ROUND_TRIP_CYCLES times. Detect drift.
        // Step 1: Create a record with inputDate in each target config field
        const fieldValues = {};
        for (const configKey of targetConfigs) {
            fieldValues[FIELD_MAP[configKey].field] = inputDate;
        }

        const created = await createFormRecord(fieldValues);
        const instanceName = created.instanceName;
        const revisionId = created.revisionId;

        // Step 2: Cycle read → write-back
        const cycles = [];
        let currentRevisionId = revisionId;

        for (let cycle = 1; cycle <= ROUND_TRIP_CYCLES; cycle++) {
            // Read current values
            const record = await readFormRecord(instanceName);
            const readValues = extractDateFields(record, targetConfigs);

            // Write back the exact values we just read
            const writeBackFields = {};
            for (const configKey of targetConfigs) {
                writeBackFields[FIELD_MAP[configKey].field] = readValues[configKey];
            }

            const updated = await updateFormRecord(currentRevisionId, writeBackFields);
            currentRevisionId = updated.revisionId;

            cycles.push({
                cycle,
                read: { ...readValues },
                writeBack: { ...writeBackFields },
            });
        }

        // Final read after all cycles
        const finalRecord = await readFormRecord(instanceName);
        const finalValues = extractDateFields(finalRecord, targetConfigs);

        // Build per-config results with drift detection
        const results = targetConfigs.map((configKey) => {
            const cycleReads = cycles.map((c) => c.read[configKey]);
            const drift = cycleReads.some((val) => val !== cycleReads[0]);
            return buildResultEntry(configKey, {
                sent: inputDate,
                cycle1Read: cycles[0] ? cycles[0].read[configKey] : null,
                cycle2Read: cycles[1] ? cycles[1].read[configKey] : null,
                finalRead: finalValues[configKey],
                drift,
            });
        });

        const result = {
            action: 'WS-3',
            targetConfigs,
            inputDate,
            recordID: instanceName,
            revisionId,
            totalCycles: ROUND_TRIP_CYCLES,
            serverTime: new Date().toISOString(),
            cycles,
            results,
        };

        if (isDebug) {
            result.rawFinalRecord = finalRecord;
            result.fieldValuesSent = fieldValues;
        }

        return result;
    }

    async function actionApiToForms(targetConfigs, inputDate, isDebug) {
        // WS-4: Create a record via API, return record info for browser verification.
        // Step 1 (this handler): Create record + read back API values.
        // Step 2 (Playwright — outside harness): Open record via DataID URL,
        //         verify display value, GetFieldValue(), getValueObjectValue().
        if (!inputDate) throw new Error('InputDate is required for WS-4');

        const fieldValues = {};
        for (const configKey of targetConfigs) {
            fieldValues[FIELD_MAP[configKey].field] = inputDate;
        }

        const created = await createFormRecord(fieldValues);
        const instanceName = created.instanceName;
        const revisionId = created.revisionId;

        // Read back to get canonical API-stored values
        const record = await readFormRecord(instanceName);
        const stored = extractDateFields(record, targetConfigs);

        const results = targetConfigs.map((configKey) =>
            buildResultEntry(configKey, {
                sent: inputDate,
                apiStored: stored[configKey],
            })
        );

        const result = {
            action: 'WS-4',
            targetConfigs,
            inputDate,
            recordID: instanceName,
            revisionId,
            dataId: revisionId,
            serverTime: new Date().toISOString(),
            results,
        };

        if (isDebug) {
            result.rawRecord = record;
            result.fieldValuesSent = fieldValues;
        }

        return result;
    }

    async function actionFormatTolerance(targetConfigs, inputDate, isDebug) {
        // WS-5: Send a date in a specific format via postForms(), verify what gets stored.
        // Tests format acceptance, rejection, and normalization.
        if (!inputDate) throw new Error('InputDate is required for WS-5');

        const fieldValues = {};
        for (const configKey of targetConfigs) {
            fieldValues[FIELD_MAP[configKey].field] = inputDate;
        }

        let created, record, stored, accepted, error;
        try {
            created = await createFormRecord(fieldValues);
            record = await readFormRecord(created.instanceName);
            stored = extractDateFields(record, targetConfigs);
            accepted = true;
        } catch (err) {
            accepted = false;
            error = err.message || String(err);
        }

        const results = targetConfigs.map((configKey) =>
            buildResultEntry(configKey, {
                sent: inputDate,
                accepted,
                stored: accepted ? stored[configKey] : null,
                error: accepted ? null : error,
            })
        );

        const result = {
            action: 'WS-5',
            targetConfigs,
            inputDate,
            recordID: accepted ? created.instanceName : null,
            serverTime: new Date().toISOString(),
            results,
        };

        if (isDebug && record) {
            result.rawRecord = record;
            result.fieldValuesSent = fieldValues;
        }

        return result;
    }

    async function actionEmptyNull(targetConfigs, inputDate, isDebug) {
        // WS-6: Test how the API handles empty, null, and special values.
        // Runs all scenarios per config in one invocation.
        // inputDate is used as the "normal" date for the clearUpd scenario (default: "2026-03-15").
        const normalDate = inputDate || '2026-03-15';

        const scenarios = [
            { id: 'empty', label: 'Empty string', value: '' },
            { id: 'null', label: 'Null value', value: null },
            { id: 'omit', label: 'Field omitted', value: undefined },
            { id: 'strNull', label: 'Literal "null"', value: 'null' },
            { id: 'invDate', label: '"Invalid Date" string', value: 'Invalid Date' },
            { id: 'clearUpd', label: 'Create with date, update with ""', value: '__CLEAR_UPDATE__' },
        ];

        const allResults = [];

        for (const scenario of scenarios) {
            for (const configKey of targetConfigs) {
                const fieldName = FIELD_MAP[configKey].field;
                let stored, accepted, error, recordID, details;

                try {
                    if (scenario.id === 'clearUpd') {
                        // Two-step: create with real date, then update with empty
                        const createFields = { [fieldName]: normalDate };
                        const created = await createFormRecord(createFields);
                        recordID = created.instanceName;

                        // Verify date was stored
                        const recordBefore = await readFormRecord(recordID);
                        const beforeValues = extractDateFields(recordBefore, [configKey]);
                        const beforeValue = beforeValues[configKey];

                        // Update with empty string to clear
                        const updateFields = { [fieldName]: '' };
                        await updateFormRecord(created.revisionId, updateFields);

                        // Read back after clear
                        const recordAfter = await readFormRecord(recordID);
                        const afterValues = extractDateFields(recordAfter, [configKey]);

                        stored = afterValues[configKey] || null;
                        accepted = true;
                        details = { beforeClear: beforeValue, afterClear: stored };
                    } else if (scenario.id === 'omit') {
                        // Create record WITHOUT the target field
                        const createFields = {};
                        const created = await createFormRecord(createFields);
                        recordID = created.instanceName;
                        const record = await readFormRecord(recordID);
                        const values = extractDateFields(record, [configKey]);
                        stored = values[configKey] || null;
                        accepted = true;
                    } else {
                        // Create record WITH the specific value
                        const createFields = { [fieldName]: scenario.value };
                        const created = await createFormRecord(createFields);
                        recordID = created.instanceName;
                        const record = await readFormRecord(recordID);
                        const values = extractDateFields(record, [configKey]);
                        stored = values[configKey] || null;
                        accepted = true;
                    }
                } catch (err) {
                    accepted = false;
                    error = err.message || String(err);
                }

                const entry = buildResultEntry(configKey, {
                    scenario: scenario.id,
                    scenarioLabel: scenario.label,
                    sent: scenario.id === 'clearUpd' ? `"${normalDate}" then ""` : scenario.value,
                    accepted,
                    stored,
                    recordID: recordID || null,
                    error: error || null,
                });

                if (details) entry.details = details;
                allResults.push(entry);
            }
        }

        return {
            action: 'WS-6',
            targetConfigs,
            serverTime: new Date().toISOString(),
            results: allResults,
        };
    }

    async function actionUpdatePath(targetConfigs, inputDate, isDebug) {
        // WS-7: Test postFormRevision() — change, preserve, and add date values.
        // Runs 3 scenarios per config: Change, Preserve, Add.
        const allResults = [];

        for (const configKey of targetConfigs) {
            const fieldName = FIELD_MAP[configKey].field;
            const isDateTime = FIELD_MAP[configKey].enableTime;
            const createDate = isDateTime ? '2026-03-15T14:30:00' : '2026-03-15';
            const changeDate = isDateTime ? inputDate || '2026-06-20T09:00:00' : inputDate || '2026-06-20';
            const addDate = createDate;

            // Scenario 1: Change — create with dateA, update to dateB
            {
                const created = await createFormRecord({ [fieldName]: createDate });
                await updateFormRecord(created.revisionId, { [fieldName]: changeDate });
                const record = await readFormRecord(created.instanceName);
                const values = extractDateFields(record, [configKey]);
                allResults.push(
                    buildResultEntry(configKey, {
                        scenario: 'change',
                        createValue: createDate,
                        updateValue: changeDate,
                        stored: values[configKey],
                        recordID: created.instanceName,
                        match: values[configKey] === changeDate || values[configKey] === changeDate + 'Z',
                    })
                );
            }

            // Scenario 2: Preserve — create with dateA, update WITHOUT the field
            {
                const created = await createFormRecord({ [fieldName]: createDate });
                await updateFormRecord(created.revisionId, {}); // empty update
                const record = await readFormRecord(created.instanceName);
                const values = extractDateFields(record, [configKey]);
                const preserved = values[configKey] !== '' && values[configKey] !== null;
                allResults.push(
                    buildResultEntry(configKey, {
                        scenario: 'preserve',
                        createValue: createDate,
                        updateValue: '(field omitted)',
                        stored: values[configKey],
                        recordID: created.instanceName,
                        preserved,
                    })
                );
            }

            // Scenario 3: Add — create WITHOUT date, update WITH date
            {
                const created = await createFormRecord({}); // no date fields
                await updateFormRecord(created.revisionId, { [fieldName]: addDate });
                const record = await readFormRecord(created.instanceName);
                const values = extractDateFields(record, [configKey]);
                allResults.push(
                    buildResultEntry(configKey, {
                        scenario: 'add',
                        createValue: '(no date)',
                        updateValue: addDate,
                        stored: values[configKey],
                        recordID: created.instanceName,
                        match: values[configKey] === addDate || values[configKey] === addDate + 'Z',
                    })
                );
            }
        }

        return {
            action: 'WS-7',
            targetConfigs,
            serverTime: new Date().toISOString(),
            results: allResults,
        };
    }

    async function actionQueryFilter(targetConfigs, inputDate, isDebug) {
        // WS-8: Test OData-style q parameter filters on date fields via getForms().
        // Creates a fresh record with known values, then runs predefined queries to check match/no-match.
        const dateOnlyValue = '2026-03-15';
        const dateTimeValue = '2026-03-15T14:30:00';

        // Create a self-contained test record with both Config A and C values
        const fieldValues = {};
        if (targetConfigs.includes('A')) fieldValues[FIELD_MAP.A.field] = dateOnlyValue;
        if (targetConfigs.includes('C')) fieldValues[FIELD_MAP.C.field] = dateTimeValue;
        // Fallback: if only one config requested, still create with it
        for (const configKey of targetConfigs) {
            if (!fieldValues[FIELD_MAP[configKey].field]) {
                fieldValues[FIELD_MAP[configKey].field] = FIELD_MAP[configKey].enableTime
                    ? dateTimeValue
                    : dateOnlyValue;
            }
        }

        const created = await createFormRecord(fieldValues);
        const instanceName = created.instanceName;

        // Define query test cases per config
        const queryTests = {
            A: [
                { id: 'eq', type: 'Exact match', q: `[${FIELD_MAP.A.field}] eq '2026-03-15'`, expected: true },
                { id: 'gt', type: 'Greater than', q: `[${FIELD_MAP.A.field}] gt '2026-03-14'`, expected: true },
                {
                    id: 'range',
                    type: 'Range',
                    q: `[${FIELD_MAP.A.field}] ge '2026-03-15' AND [${FIELD_MAP.A.field}] le '2026-03-16'`,
                    expected: true,
                },
                { id: 'fmtUS', type: 'Format mismatch', q: `[${FIELD_MAP.A.field}] eq '03/15/2026'`, expected: null },
                { id: 'noMatch', type: 'No match', q: `[${FIELD_MAP.A.field}] eq '2026-03-16'`, expected: false },
            ],
            C: [
                { id: 'eq', type: 'Exact match', q: `[${FIELD_MAP.C.field}] eq '2026-03-15T14:30:00'`, expected: true },
                {
                    id: 'gt',
                    type: 'Greater than',
                    q: `[${FIELD_MAP.C.field}] gt '2026-03-15T14:00:00'`,
                    expected: true,
                },
                {
                    id: 'range',
                    type: 'Range',
                    q: `[${FIELD_MAP.C.field}] ge '2026-03-15' AND [${FIELD_MAP.C.field}] le '2026-03-16'`,
                    expected: true,
                },
                {
                    id: 'fmtZ',
                    type: 'Format mismatch',
                    q: `[${FIELD_MAP.C.field}] eq '2026-03-15T14:30:00Z'`,
                    expected: null,
                },
                {
                    id: 'noMatch',
                    type: 'No match',
                    q: `[${FIELD_MAP.C.field}] eq '2026-03-15T15:00:00'`,
                    expected: false,
                },
            ],
        };

        const allResults = [];

        for (const configKey of targetConfigs) {
            const tests = queryTests[configKey];
            if (!tests) continue;

            for (const test of tests) {
                let matched = false;
                let matchCount = 0;
                let error = null;
                let queryResponse;

                try {
                    // Run the query, filtering by instanceName AND the date condition
                    // This ensures we only check our test record
                    const combinedQ = `[instanceName] eq '${instanceName}' AND ${test.q}`;
                    const params = { q: combinedQ, expand: true };
                    const res = await vvClient.forms
                        .getForms(params, FORM_TEMPLATE_NAME)
                        .then((r) => parseRes(r))
                        .then((r) => checkMetaAndStatus(r, `Query ${test.id}`))
                        .then((r) => checkDataPropertyExists(r, `Query ${test.id}`));

                    queryResponse = res;
                    matchCount = Array.isArray(res.data) ? res.data.length : 0;
                    matched = matchCount > 0;
                } catch (err) {
                    error = err.message || String(err);
                }

                const pass =
                    test.expected === null
                        ? true // TBD — we just record the result
                        : matched === test.expected;

                allResults.push(
                    buildResultEntry(configKey, {
                        queryId: test.id,
                        queryType: test.type,
                        query: test.q,
                        expectedMatch: test.expected,
                        matched,
                        matchCount,
                        pass,
                        error,
                    })
                );
            }
        }

        return {
            action: 'WS-8',
            targetConfigs,
            testRecordID: instanceName,
            serverTime: new Date().toISOString(),
            results: allResults,
        };
    }

    async function actionDateComputation(targetConfigs, inputDate, isDebug) {
        // WS-9: Test what gets stored when scripts use Date objects and arithmetic.
        // The `request` library serializes Date objects via JSON.stringify() → .toJSON() → ISO+Z.
        // This is TZ-sensitive: run with TZ= env var to simulate different server timezones.
        const baseISO = '2026-03-15';
        const baseUS = '03/15/2026';
        const serverTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const patterns = [
            {
                id: 'iso',
                label: 'new Date("2026-03-15") — ISO parse → UTC midnight',
                compute: () => new Date(baseISO),
            },
            {
                id: 'us',
                label: 'new Date("03/15/2026") — US parse → LOCAL midnight',
                compute: () => new Date(baseUS),
            },
            {
                id: 'parts',
                label: 'new Date(2026, 2, 15) — constructor parts → LOCAL midnight',
                compute: () => new Date(2026, 2, 15),
            },
            {
                id: 'utc',
                label: 'new Date(Date.UTC(2026, 2, 15)) — explicit UTC midnight',
                compute: () => new Date(Date.UTC(2026, 2, 15)),
            },
            {
                id: 'arith',
                label: 'new Date(ISO) + setDate(getDate()+30) — local arithmetic',
                compute: () => {
                    const d = new Date(baseISO);
                    d.setDate(d.getDate() + 30);
                    return d;
                },
            },
            {
                id: 'arithUTC',
                label: 'new Date(ISO) + setUTCDate(getUTCDate()+30) — UTC arithmetic',
                compute: () => {
                    const d = new Date(baseISO);
                    d.setUTCDate(d.getUTCDate() + 30);
                    return d;
                },
            },
            {
                id: 'safe',
                label: 'toISOString().split("T")[0] after +30d — safe string extract',
                compute: () => {
                    const d = new Date(baseISO);
                    d.setDate(d.getDate() + 30);
                    return d.toISOString().split('T')[0];
                },
            },
            {
                id: 'locale',
                label: 'toLocaleDateString("en-US") — locale formatted string',
                compute: () => {
                    const d = new Date(baseISO);
                    return d.toLocaleDateString('en-US');
                },
            },
        ];

        const allResults = [];

        for (const pattern of patterns) {
            for (const configKey of targetConfigs) {
                const fieldName = FIELD_MAP[configKey].field;
                const computedValue = pattern.compute();
                const isDateObj = computedValue instanceof Date;
                const serialized = isDateObj ? computedValue.toJSON() : computedValue;

                // Send to API — Date objects get JSON.stringify'd by the request library
                const fieldValues = { [fieldName]: computedValue };
                const created = await createFormRecord(fieldValues);
                const record = await readFormRecord(created.instanceName);
                const stored = extractDateFields(record, [configKey]);

                const entry = buildResultEntry(configKey, {
                    pattern: pattern.id,
                    patternLabel: pattern.label,
                    valueType: isDateObj ? 'Date' : 'string',
                    serialized,
                    stored: stored[configKey],
                    recordID: created.instanceName,
                });

                if (isDateObj && isDebug) {
                    entry.localString = computedValue.toString();
                    entry.localDate = computedValue.getDate();
                    entry.utcDate = computedValue.getUTCDate();
                }

                allResults.push(entry);
            }
        }

        return {
            action: 'WS-9',
            targetConfigs,
            serverTimezone: serverTz,
            serverTime: new Date().toISOString(),
            results: allResults,
        };
    }

    async function actionFormInstanceCompare(targetConfigs, inputDate, isDebug) {
        // WS-10: Compare postForms (core API) vs forminstance/ (FormsAPI) endpoints.
        // Freshdesk #124697: postForms-created records have time mutated on form open;
        // forminstance/-created records reportedly preserve time correctly.
        //
        // Sub-actions (controlled by InputDate format):
        //   WS-10A/B: Create via both endpoints, return DataIDs for browser verification.
        //   The browser step (verify-ws10-browser.js) handles comparison and save-stabilize.
        if (!inputDate) throw new Error('InputDate is required for WS-10');

        const fieldValues = {};
        for (const configKey of targetConfigs) {
            fieldValues[FIELD_MAP[configKey].field] = inputDate;
        }

        // --- postForms path (core API: /formtemplates/<id>/forms) ---
        const postFormsCreated = await createFormRecord(fieldValues);
        const postFormsRecord = await readFormRecord(postFormsCreated.instanceName);
        const postFormsStored = extractDateFields(postFormsRecord, targetConfigs);

        // --- forminstance/ path (FormsAPI: /forminstance) ---
        let formInstanceCreated, formInstanceRecord, formInstanceStored;
        let formInstanceError = null;

        try {
            formInstanceCreated = await createFormRecordViaFormInstance(fieldValues);
            // forminstance/ response uses { name, formId } instead of { instanceName, revisionId }
            const fiInstanceName = formInstanceCreated.name || formInstanceCreated.instanceName;
            const fiDataId = formInstanceCreated.formId || formInstanceCreated.revisionId;
            formInstanceCreated._instanceName = fiInstanceName;
            formInstanceCreated._dataId = fiDataId;
            formInstanceRecord = await readFormRecord(fiInstanceName);
            formInstanceStored = extractDateFields(formInstanceRecord, targetConfigs);
        } catch (err) {
            formInstanceError =
                err instanceof ReferenceError ? 'FormsApi not enabled on this environment' : err.message || String(err);
            output.errors.push(`forminstance/ path failed: ${formInstanceError}`);
        }

        const results = targetConfigs.map((configKey) => {
            const entry = buildResultEntry(configKey, {
                sent: inputDate,
                postForms: {
                    apiStored: postFormsStored[configKey],
                    recordID: postFormsCreated.instanceName,
                    dataId: postFormsCreated.revisionId,
                },
            });

            if (formInstanceCreated) {
                entry.formInstance = {
                    apiStored: formInstanceStored[configKey],
                    recordID: formInstanceCreated._instanceName,
                    dataId: formInstanceCreated._dataId,
                };
                entry.storedMatch = postFormsStored[configKey] === formInstanceStored[configKey];
            } else {
                entry.formInstance = { error: formInstanceError };
                entry.storedMatch = null;
            }

            return entry;
        });

        const result = {
            action: 'WS-10',
            targetConfigs,
            inputDate,
            serverTime: new Date().toISOString(),
            results,
        };

        if (isDebug) {
            result.postFormsRaw = postFormsRecord;
            if (formInstanceRecord) result.formInstanceRaw = formInstanceRecord;
            result.fieldValuesSent = fieldValues;
        }

        return result;
    }

    /* ---------------------------------- Main ---------------------------------- */

    logger.info(sanitizeLog(logEntry));

    try {
        // Read control parameters
        const action = getFieldValueByName('Action');
        const targetConfigsRaw = getFieldValueByName('TargetConfigs', true);
        const recordID = getFieldValueByName('RecordID', true);
        const inputDate = getFieldValueByName('InputDate', true);
        const debug = getFieldValueByName('Debug', true).toLowerCase() === 'true';
        const templateNameParam = getFieldValueByName('TemplateName', true);
        if (templateNameParam) FORM_TEMPLATE_NAME = templateNameParam;

        if (output.errors.length > 0) {
            throw new Error();
        }

        const targetConfigs = parseTargetConfigs(targetConfigsRaw);

        // Dispatch to action handler
        switch (action) {
            case 'WS-1':
                if (!inputDate) throw new Error('InputDate is required for WS-1');
                output.data = await actionSetDate(targetConfigs, inputDate, debug);
                break;
            case 'WS-2':
                if (!recordID) throw new Error('RecordID is required for WS-2');
                output.data = await actionGetDate(targetConfigs, recordID, debug);
                break;
            case 'WS-3':
                if (!inputDate) throw new Error('InputDate is required for WS-3');
                output.data = await actionRoundTrip(targetConfigs, recordID, inputDate, debug);
                break;
            case 'WS-4':
                output.data = await actionApiToForms(targetConfigs, inputDate, debug);
                break;
            case 'WS-5':
                output.data = await actionFormatTolerance(targetConfigs, inputDate, debug);
                break;
            case 'WS-6':
                output.data = await actionEmptyNull(targetConfigs, inputDate, debug);
                break;
            case 'WS-7':
                output.data = await actionUpdatePath(targetConfigs, inputDate, debug);
                break;
            case 'WS-8':
                output.data = await actionQueryFilter(targetConfigs, inputDate, debug);
                break;
            case 'WS-9':
                output.data = await actionDateComputation(targetConfigs, inputDate, debug);
                break;
            case 'WS-10':
                output.data = await actionFormInstanceCompare(targetConfigs, inputDate, debug);
                break;
            default:
                throw new Error(`Unknown action: '${action}'. Valid: WS-1 through WS-10`);
        }

        // Enrich output with diagnostics
        if (output.data) {
            output.data.serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            output.data.parameters = { action, targetConfigsRaw, recordID, inputDate, debug };
        }

        // Set status
        if (output.errors.length > 0) output.status = 'Warning';
        else output.status = 'Success';
    } catch (err) {
        output.status = 'Error';
        if (err.message) output.errors.push(err.message);
    } finally {
        response.json(200, output);

        logEntry.status = output.status;
        logEntry.errors = output.errors;

        if (output.status === 'Error') logger.error(sanitizeLog(logEntry));
        else if (output.status === 'Warning') logger.warn(sanitizeLog(logEntry));
        else logger.info(sanitizeLog(logEntry));
    }
};
