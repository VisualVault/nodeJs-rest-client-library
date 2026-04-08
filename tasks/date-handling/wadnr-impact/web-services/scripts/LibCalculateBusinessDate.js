/**
 * LibCalculateBusinessDate
 * Category: Workflow
 * Modified: 2026-01-19T17:25:29.6Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: d851bb8f-f7cc-ef11-82bf-a0dcc70b93c8
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
  Script Name:    LibCalculateBusinessDate
  Customer:       WADNR
  Purpose:        calculates a target business date starting from a given date and a specified number
                  of business days, accounting for weekends, holidays, and business hours.
  Preconditions:

  Parameters:     The following represent variables passed into the function:
                  Start Date: (Datetime, required) Start date
                  Number of Business Days: (String, required) Number of business days to calculate
  Return Object:
                  outputCollection[0]: Status
                  outputCollection[1]: Short description message
                  outputCollection[2]: Data
  Pseudo code:
                  1 Get the values of the fields
                  2 Check if the required parameters are present and complete list of holidays
                  3 Iterate through days and calculate target business date
                  4 Build the success response array

  Date of Dev:    01/07/2025
  Last Rev Date:  01/19/2025

  Revision Notes:
                  01/07/2025 - Alfredo Scilabra:  First Setup of the script
                  05/07/2025 - Mauro Rapuano:  Fixed timezone from T13 to T16
                  06/04/2025 - Mauro Rapuano:  Fixed logic to calculate day with param = 0
                  07/11/2025 - Mauro Rapuano:  Modified logic to verify also for business time using complete date
                  01/19/2026 - Mauro Rapuano:  Modified logic to set business time to 8.00AM instead of 8.30AM

  */

    logger.info(`Start of the process LibCalculateBusinessDate at ${Date()}`);
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

    const MAX_BUSINESS_DAYS_THRESHOLD = 1095;
    const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';

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

    function callExternalWs(webServiceName, webServiceParams) {
        let shortDescription = `Run Web Service: ${webServiceName}`;

        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function calculateBusinessDate(startDate, businessDays) {
        const timeNow = dayjs();
        let currentDate = dayjs(startDate).hour(timeNow.hour()).minute(timeNow.minute()).second(timeNow.second());
        let daysMoved = 0;
        let executionCount = 0; //Exit condition to avoid infinite execution in while loop
        const isMovingFoward = businessDays >= 0;
        const absBusinessDays = Math.abs(businessDays);

        //If outside of business time, move to 8.30AM Washington State time (today or tomorrow, depending if before 8.30 or after 16.30)
        const nowInWashington = dayjs.tz(dayjs(), 'America/Los_Angeles');
        const start830InWashington = nowInWashington.hour(8).minute(0).second(0).millisecond(0);
        const end1630InWashington = nowInWashington.hour(16).minute(0).second(0).millisecond(0);
        if (currentDate.isBefore(start830InWashington)) {
            currentDate = dayjs.tz(currentDate, 'America/Los_Angeles').hour(8).minute(0).second(0).millisecond(0);
        } else if (currentDate.isAfter(end1630InWashington)) {
            currentDate = dayjs
                .tz(currentDate, 'America/Los_Angeles')
                .add(1, 'day')
                .hour(8)
                .minute(0)
                .second(0)
                .millisecond(0);
        }

        while (daysMoved <= absBusinessDays && executionCount <= MAX_BUSINESS_DAYS_THRESHOLD) {
            try {
                if (executionCount != 0) {
                    currentDate = isMovingFoward
                        ? dayjs
                              .tz(currentDate, 'America/Los_Angeles')
                              .add(1, 'day')
                              .hour(8)
                              .minute(0)
                              .second(0)
                              .millisecond(0)
                        : dayjs
                              .tz(currentDate, 'America/Los_Angeles')
                              .subtract(1, 'day')
                              .hour(8)
                              .minute(0)
                              .second(0)
                              .millisecond(0);
                }

                const [wsStatus, , { isBusinessDay }] = await callExternalWs('LibCheckBusinessDaysAndHolidays', [
                    {
                        name: 'Date',
                        //Adding time here bc LibCheckBusinessDaysAndHolidays expect DateTime param
                        //We are not calculating business time but business days in this Lib
                        //So im kinda bypassing that validation
                        value: currentDate.toISOString(), //currentDate.format(DEFAULT_DATE_FORMAT) + 'T16:00:00.000Z',
                    },
                ]);

                if (wsStatus !== 'Success') {
                    throw new Error('Error calling LibCheckBusinessDaysAndHolidays.');
                }

                if (isBusinessDay) {
                    daysMoved++;
                }
                executionCount++; //Exit condition to avoid infinite execution in while loop
            } catch (error) {
                errorLog.push(error.message);
            }
        }

        return currentDate.toISOString();
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1 Get the values of the fields
        const startDate = getFieldValueByName('Start Date');
        const businessDays = getFieldValueByName('Number of Business Days');

        // 2 Check if the required parameters are present and complete list of holidays
        if (!startDate || !businessDays) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        const parsedBusinessDays = parseInt(businessDays);
        if (isNaN(parsedBusinessDays)) {
            throw new Error(`Number of Business Days is not a valid number.`);
        }

        if (Math.abs(parsedBusinessDays) > MAX_BUSINESS_DAYS_THRESHOLD) {
            throw new Error(`Maximum number of business days threshold reached.`);
        }

        // 3 Iterate through days and calculate target business date
        const calculatedDate = await calculateBusinessDate(startDate, parsedBusinessDays);

        if (errorLog.length > 0) {
            throw new Error(errorLog.join('; '));
        }

        // 4 Build the success response array
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Target date calculated succesfully';
        outputCollection[2] = { calculatedDate };
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
