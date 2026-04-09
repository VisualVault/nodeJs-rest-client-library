/**
 * LibNCFLONumberGenerateAndDateOfReceipt
 * Category: Form
 * Modified: 2025-11-18T20:33:29.543Z by federico.cuelho@visualvault.com
 * Script ID: Script Id: f5e8eb48-d0c3-f011-8302-a0aab378b35e
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

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
    Script Name:    LibNCFLONumberGenerateAndDateOfReceipt
    Customer:       WADNR
    Purpose:        Generates a unique NCFLO reference ID (RE-NCF-YY-NNNN) for a specified Region, and corresponding Date Of Receipt.
                    Being:  RE - Region code (2 letters)
                            NCF - Form name (3 letters)
                            YY - Last digits of date of receipt year (2 numbers)
                            NNNN - Consecutive and unique identifier (4 numbers)
                    Example:
                            SP-NCF-25-0001
    Preconditions:
                    -LibCheckBusinessDaysAndHolidays must be implemented in order to execute this microservice

    Parameters:     The following represent variables passed into the function:
                    
                    - Form ID:                  (string, required) Form ID of the application
                    - Region Code:              (string, required) Region code to create new reference ID
                    - Form Type:                (string, required) Form type to create new reference ID

    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Unique Reference ID and Date of Receipt
    Pseudo code:
                    1° Get the values of the fields with format checks
                    2° Check if the required parameters are present
                    3° Call to LibCheckBusinessDaysAndHolidays to check Business Day and if not, get next one
                    4° Get last 4 digits of application review page form id
                    5° Build the Unique Reference ID based on parameters and results
                    6° Build the success response array

    Date of Dev:    11/14/2025
    Last Rev Date:  11/14/2025

    Revision Notes:
                    11/14/2025 - Federico Cuelho:  First Setup of the script
    */

    logger.info(`Start of the process LibNCFLONumberGenerateAndDateOfReceipt at ${Date()}`);

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

    const currentDate = new Date();
    const WADNR_TIMEZONE = 'America/Los_Angeles';
    const dateISOStringFormat = 'YYYY-MM-DD HH:mm:ss';
    const libBusinessDaysAndHolidays = 'LibCheckBusinessDaysAndHolidays';
    const formTemplateName = 'Notice of Continuing Forest Land Obligation';

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

    async function checkBusinessDaysAndHolidays() {
        shortDescription = `Executing LibCheckBusinessDaysAndHolidays for '${formTemplateName}' at '${Date()}' `;

        let checkObject = [
            {
                name: 'Date',
                value: currentDate,
            },
        ];

        return vvClient.scripts
            .runWebService(libBusinessDaysAndHolidays, checkObject)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));
    }

    function extractSeq4(formID, type) {
        const regex = new RegExp(`^${type}[A-Z]*-(\\d+)$`);
        const match = formID.match(regex);

        if (!match) {
            return null; // type doesn't match the formID
        }

        const digits = match[1]; // captured number part
        return digits.slice(-4); // last 4 digits
    }

    function validateRegionCode(code) {
        /*
        Validates the region code against allowed values and returns a normalized (uppercased) code.
        Throws an Error if invalid.
        */
        const allowed = ['OL', 'NE', 'SP', 'SE', 'PC', 'NW'];
        const value = typeof code === 'string' ? code.trim().toUpperCase() : '';

        if (!value) {
            const msg = "The value property for the field 'Region Code' was not found or is empty.";
            errorLog.push(msg);
            throw new Error(msg);
        }

        if (!allowed.includes(value)) {
            const msg = `Invalid Region Code '${code}'. Accepted values are: ${allowed.join(', ')}.`;
            errorLog.push(msg);
            throw new Error(msg);
        }

        return value;
    }

    function validateFormType(type) {
        /*
        Validates the form type. Must be 'NCF' (case-insensitive). Returns normalized 'NCF' or throws.
        */
        const allowed = ['NCF'];
        const value = typeof type === 'string' ? type.trim().toUpperCase() : '';

        if (!value) {
            const msg = "The value property for the field 'Form Type' was not found or is empty.";
            errorLog.push(msg);
            throw new Error(msg);
        }

        if (!allowed.includes(value)) {
            const msg = `Invalid Form Type '${type}'. Accepted value is: NCF.`;
            errorLog.push(msg);
            throw new Error(msg);
        }

        return value;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS WITH FORMAT CHECKS
        const formId = getFieldValueByName('Form ID');
        const regionCode = validateRegionCode(getFieldValueByName('Region'));
        const formType = validateFormType(getFieldValueByName('Form Type'));

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT AND COMPLETE LIST OF HOLIDAYS
        if (!formId || !regionCode || !formType) {
            throw new Error(errorLog.join('; '));
        }

        //3° CALL TO LibCheckBusinessDaysAndHolidays TO CHECK BUSINESS DAY AND IF NOT, GET NEXT ONE
        let business = await checkBusinessDaysAndHolidays();
        let dateOfReceipt = '';
        dateOfReceipt = business.data[2].isBusinessDay ? currentDate : business.data[2].nextBusinessDay;
        dateOfReceipt = dayjs(dateOfReceipt).tz(WADNR_TIMEZONE).format(dateISOStringFormat);
        const uniqueNumber = extractSeq4(formId, formType);

        // 5° BUILD THE UNIQUE REFERENCE ID BASED ON PARAMETERS AND RESULTS
        let year = dayjs(dateOfReceipt).year().toString().substring(2);
        let uniqueReferenceID = `${regionCode}-${formType}-${year}-${uniqueNumber}`;
        const returnObj = {
            formId,
            formType,
            regionCode,
            year,
            sequence: uniqueNumber,
            numberIdentifier: uniqueReferenceID,
            dateOfReceipt,
        };

        // 6° BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'NCF Number and Date generated succesfully';
        outputCollection[2] = returnObj;
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don´t change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors occurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        // SEND THE RESPONSE
        response.json(200, outputCollection);
    }
};
