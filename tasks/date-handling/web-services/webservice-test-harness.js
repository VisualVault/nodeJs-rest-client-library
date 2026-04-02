const logger = require('../log');

module.exports.getCredentials = function () {
    const customerAlias = 'CUSTOMER ALIAS';
    const databaseAlias = 'DATABASE ALIAS';
    const clientId = 'CLIENT ID';
    const clientSecret = 'CLIENT SECRET';

    return {
        customerAlias,
        databaseAlias,
        clientId,
        clientSecret,
        userId: clientId,
        password: clientSecret,
    };
};

module.exports.main = async function (ffCollection, vvClient, response) {
    /*
    Script Name:    DateTest WS Harness
    Customer:       VisualVault
    Purpose:        Multi-purpose test harness for date-handling web service tests.
                    Supports 7 test categories (WS-1 through WS-7) via an Action parameter.
    Preconditions:
                    - DateTest form template must exist in the target environment
                    - For read actions (WS-2, WS-5): a saved record must exist
    Parameters:     Passed via ffCollection:
                    Action:        Required. "WS-1" through "WS-7"
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

    const FORM_TEMPLATE_NAME = 'DateTest';
    const ROUND_TRIP_CYCLES = 2;

    // Field configuration map — mirrors testing/fixtures/vv-config.js (lines 48-113)
    const FIELD_MAP = {
        A: {
            field: 'DataField7',
            preset: 'DataField2',
            currentDate: 'DataField1',
            enableTime: false,
            ignoreTimezone: false,
            useLegacy: false,
        },
        B: {
            field: 'DataField10',
            preset: 'DataField27',
            currentDate: 'DataField28',
            enableTime: false,
            ignoreTimezone: true,
            useLegacy: false,
        },
        C: {
            field: 'DataField6',
            preset: 'DataField15',
            currentDate: 'DataField17',
            enableTime: true,
            ignoreTimezone: false,
            useLegacy: false,
        },
        D: {
            field: 'DataField5',
            preset: 'DataField16',
            currentDate: 'DataField18',
            enableTime: true,
            ignoreTimezone: true,
            useLegacy: false,
        },
        E: {
            field: 'DataField12',
            preset: 'DataField19',
            currentDate: 'DataField23',
            enableTime: false,
            ignoreTimezone: false,
            useLegacy: true,
        },
        F: {
            field: 'DataField11',
            preset: 'DataField20',
            currentDate: 'DataField24',
            enableTime: false,
            ignoreTimezone: true,
            useLegacy: true,
        },
        G: {
            field: 'DataField14',
            preset: 'DataField21',
            currentDate: 'DataField25',
            enableTime: true,
            ignoreTimezone: false,
            useLegacy: true,
        },
        H: {
            field: 'DataField13',
            preset: 'DataField22',
            currentDate: 'DataField26',
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

    async function actionRoundTrip() {
        throw new Error('WS-3 (Round-Trip) not yet implemented');
    }

    async function actionApiToForms() {
        throw new Error('WS-4 (API→Forms) not yet implemented');
    }

    async function actionFormsToApi() {
        throw new Error('WS-5 (Forms→API) not yet implemented');
    }

    async function actionFormatTolerance() {
        throw new Error('WS-6 (Format Tolerance) not yet implemented');
    }

    async function actionEmptyNull() {
        throw new Error('WS-7 (Empty/Null) not yet implemented');
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
                output.data = await actionRoundTrip(targetConfigs, recordID, inputDate);
                break;
            case 'WS-4':
                output.data = await actionApiToForms(targetConfigs, inputDate);
                break;
            case 'WS-5':
                output.data = await actionFormsToApi(targetConfigs, recordID);
                break;
            case 'WS-6':
                output.data = await actionFormatTolerance(targetConfigs, inputDate);
                break;
            case 'WS-7':
                output.data = await actionEmptyNull(targetConfigs);
                break;
            default:
                throw new Error(`Unknown action: '${action}'. Valid: WS-1 through WS-7`);
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
