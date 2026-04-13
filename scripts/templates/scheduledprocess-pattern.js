// When VV uploads this script, it runs from lib/.../files/ — require('../log') resolves correctly.
// For local test scripts that also run via a direct runner, use a try/catch dual-path (see test-scripts/).
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

module.exports.main = async function (vvClient, response, token) {
    /*
    Script Name:    Script Name Here
    Customer:       Project Name
    Purpose:        Brief description of the purpose of the script
    Preconditions:
                    - List of libraries, forms, queries, etc. that must exist for this code to run
                    - List other preconditions such as user permissions, environments, etc.
    Return Object:
                    output.status: "Success" - Process completed without errors
                                   "Warning" - Process completed with non-critical errors
                                   "Error"   - Process could not be completed due to a critical error
                    output.errors: Array of error messages

    Pseudo code:
                    1. Business logic
                    2. Item-level operations
                    3. Set status

    Date of Dev:    MM/DD/YYYY
    Last Rev Date:  MM/DD/YYYY

    Revision Notes:
                    MM/DD/YYYY - Developer Name: First setup of the script
  */

    /* ------------------------ Response & Log Variables ------------------------ */

    const serviceName = 'MyScheduledProcess';
    const scheduledProcessGUID = token;

    // Platform acknowledgment — immediate response before any work begins
    response.json(200, `${serviceName} Started`);

    const output = {
        errors: [],
        status: 'Success',
    };

    let logEntry = {
        customerAlias: vvClient._httpHelper._sessionToken.customerAlias,
        databaseAlias: vvClient._httpHelper._sessionToken.databaseAlias,
        environment: new URL(vvClient.getBaseUrl()).hostname.split('.')[0],
        errors: [],
        parameters: JSON.stringify({ token: scheduledProcessGUID }),
        service: serviceName,
        status: 'Started',
    };

    /* ------------------------- Configurable Variables ------------------------- */

    // Define constants and configuration here. Examples:
    // const FORM_TEMPLATE_NAME = "User Registration";
    // const QUERY_NAME = "GetActiveUsers";
    // const MAX_RECORDS = 100;

    /* eslint-disable no-unused-vars */

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

        return Object.fromEntries(
            Object.entries(entry).map(([key, value]) => {
                const isStructured = Array.isArray(value) || (value !== null && typeof value === 'object');
                const serialized = serializeValue(value);

                return [
                    key,
                    isStructured ? serialized.replace(/[\r\n\t\0]/g, ' ') : serialized.replace(/[,"\\\r\n\t\0]/g, ' '),
                ];
            })
        );
    }

    function parseRes(vvClientRes) {
        /*
        Generic JSON parsing function
        Parameters:
            vvClientRes: JSON response from a vvClient API method
        */
        try {
            const jsObject = JSON.parse(vvClientRes);
            if (jsObject && typeof jsObject === 'object') {
                vvClientRes = jsObject;
            }
        } catch (e) {
            // Response is already a JS object
        }
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
        Checks that the meta property of a vvClient API response object has the expected status code
        Parameters:
            vvClientRes: Parsed response object from a vvClient API method
            shortDescription: A string with a short description of the process
            ignoreStatusCode: An integer status code for which no error should be thrown
        */
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
        /*
        Checks that the data property of a vvClient API response object exists
        Parameters:
            res: Parsed response object from the API call
            shortDescription: A string with a short description of the process
            ignoreStatusCode: An integer status code for which no error should be thrown
        */
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
            ignoreStatusCode: An integer status code for which no error should be thrown
        */
        const status = vvClientRes.meta.status;

        if (status != ignoreStatusCode) {
            const dataIsArray = Array.isArray(vvClientRes.data);
            const dataIsObject = vvClientRes.data !== null && typeof vvClientRes.data === 'object';
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

    /* ---------------------------------- Main ---------------------------------- */

    logger.info(sanitizeLog(logEntry));

    try {
        // 1. Business logic
        // ...

        // 2. Item-level operations — wrap each in try/catch to continue on failure
        // for (const record of records) {
        //     try {
        //         await updateRecord(record);
        //     } catch (err) {
        //         output.errors.push(`record ${record.id}: ${err.message}`);
        //     }
        // }

        // 3. Set status — output.errors is final at this point
        if (output.errors.length > 0) output.status = 'Warning';
    } catch (err) {
        output.status = 'Error';
        if (err.message) output.errors.push(err.message);
    } finally {
        // Signal completion to VV scheduler
        if (scheduledProcessGUID) {
            await vvClient.scheduledProcess.postCompletion(
                scheduledProcessGUID,
                'complete',
                output.status !== 'Error',
                output.status === 'Success' ? 'Completed successfully' : output.errors.join('; ')
            );
        }

        logEntry.status = output.status;
        logEntry.errors = output.errors;

        if (output.status === 'Error') logger.error(sanitizeLog(logEntry));
        else if (output.status === 'Warning') logger.warn(sanitizeLog(logEntry));
        else logger.info(sanitizeLog(logEntry));
    }
};
