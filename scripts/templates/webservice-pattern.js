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
    Script Name:    Script Name Here
    Customer:       Project Name
    Purpose:        Brief description of the purpose of the script
    Preconditions:
                    - List of libraries, forms, queries, etc. that must exist for this code to run
                    - List other preconditions such as user permissions, environments, etc.
    Parameters:     The following represent variables passed into the function:
                    parameter1: Description of parameter1
                    parameter2: Description of parameter2
    Return Object:
                    output.status: "Success" - Process completed without errors
                                   "Warning" - Process completed with non-critical errors
                                   "Error"   - Process could not be completed due to a critical error
                    output.errors: Array of error messages
                    output.data:   Return payload

                    Note: The legacy array format (["Success", "message", data]) is deprecated.

    Pseudo code:
                    1. Validate parameters
                    2. Business logic
                    3. Set status

    Date of Dev:    MM/DD/YYYY
    Last Rev Date:  MM/DD/YYYY

    Revision Notes:
                    MM/DD/YYYY - Developer Name: First setup of the script
  */

    /* ------------------------ Response & Log Variables ------------------------ */

    const serviceName = 'ServiceNameHere';
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

    // Define constants and configuration here. Examples:
    // const FORM_TEMPLATE_NAME = "User Registration";
    // const QUERY_NAME = "GetActiveUsers";
    // const MAX_RECORDS = 100;

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

    /* ---------------------------------- Main ---------------------------------- */

    logger.info(sanitizeLog(logEntry));

    try {
        // Validate parameters
        // const firstName = getFieldValueByName("First Name");

        if (output.errors.length > 0) {
            throw new Error();
        }

        // Business logic
        //...

        // Assign return data here
        // output.data = someValue;

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
