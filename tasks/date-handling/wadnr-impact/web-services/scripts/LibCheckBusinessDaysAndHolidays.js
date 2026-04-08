/**
 * LibCheckBusinessDaysAndHolidays
 * Category: Workflow
 * Modified: 2025-05-07T13:03:27.733Z by moises.savelli@visualvault.com
 * Script ID: Script Id: e5e7c3b9-f6b6-ef11-82ba-a637fa2258dd
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const weekday = require('dayjs/plugin/weekday');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(weekday);

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
    Script Name:    LibCheckBusinessDaysAndHolidays 
    Customer:       WADNR
    Purpose:        Determines if a given date falls on a business day, based on Washington state business hours, recognized holidays, and daylight saving time.
    Preconditions:

    Parameters:     The following represent variables passed into the function:
                    Date: (Datetime, required) Date to be evaluated
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code: 
                    1° Get the values of the fields
                    2° Check if the required parameters are present and complete list of holidays
                    3° Check if date to be evaluated falls on holidays (including Observed Days)
                    4° Check if date to be evaluated falls on a business day during Washington State's business hours
                    5° If BusinessDay = false, get next Business Day
                    6° Build the success response array
 
    Date of Dev:    12/10/2024
    Last Rev Date:  12/16/2024
 
    Revision Notes:
                    12/10/2024 - Mauro Rapuano:  First Setup of the script
                    12/16/2024 - Mauro Rapuano:  Add logic to get next Business Day in case first result is false
                    07/05/2025 - Moises Savelli:  Add logic to get holidays and observed days based on Washington State Holidays
    */

    logger.info(`Start of the process LibCheckBusinessDaysAndHolidays at ${Date()}`);

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
    let washingtonStateHolidays = [
        //As there are variable dates, I keep them empty when creating the array and then set its values after receiving the year
        {
            name: "New Year's Day",
            dateMMDD: '01/01',
            observedDay: '',
        },
        {
            name: 'Martin Luther King Jr. Day',
            dateMMDD: '',
            observedDay: '',
        },
        {
            name: "President's Day",
            dateMMDD: '',
            observedDay: '',
        },
        {
            name: 'Memorial Day',
            dateMMDD: '',
            observedDay: '',
        },
        {
            name: 'Juneteenth',
            dateMMDD: '06/19',
            observedDay: '',
        },
        {
            name: 'Independence Day',
            dateMMDD: '07/04',
            observedDay: '',
        },
        {
            name: 'Labor Day',
            dateMMDD: '',
            observedDay: '',
        },
        {
            name: "Veterans' Day",
            dateMMDD: '11/11',
            observedDay: '',
        },
        {
            name: 'Thanksgiving Day',
            dateMMDD: '',
            observedDay: '',
        },
        {
            name: 'Native American Heritage Day',
            dateMMDD: '',
            observedDay: '',
        },
        {
            name: 'Christmas Day',
            dateMMDD: '12/25',
            observedDay: '',
        },
    ];
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

    function completeWashingtonHolidays(dateToEvaluate) {
        /*
        Based on year to be evaluated, get all Washington State's dynamic holidays
        Parameters:
            dateToEvaluate: Date to be evaluated
        */
        try {
            let errors = [];
            const year = dayjs(dateToEvaluate).year();

            /* First, check if the static ones falls on weekends */
            washingtonStateHolidays.forEach((holiday) => {
                if (holiday.dateMMDD != '') {
                    //If date falls on Sunday (0), add 1 day
                    //If date falls on Saturday (6), subtract 1 day
                    if (dayjs(`${holiday.dateMMDD}/${year}`).day() === 0) {
                        holiday.observedDay = dayjs(holiday.dateMMDD).add(1, 'day').format('MM/DD');
                    } else if (dayjs(`${holiday.dateMMDD}/${year}`).day() === 6) {
                        holiday.observedDay = dayjs(holiday.dateMMDD).subtract(1, 'day').format('MM/DD');
                    }
                }
            });

            //Martin Luther King Jr. Day - 3rd Monday of January
            const martinLutherKingJrDay = getExactDateFromStart(1, 1, year, 3);

            if (!isValidHolidayDate(martinLutherKingJrDay) || martinLutherKingJrDay.toLowerCase().includes('error')) {
                errors.push(`${martinLutherKingJrDay} - Martin Luther King Jr Day`);
            } else {
                washingtonStateHolidays.find((holiday) => holiday.name === 'Martin Luther King Jr. Day').dateMMDD =
                    martinLutherKingJrDay;
            }

            //President's Day - 3rd Monday of February
            const presidentsDay = getExactDateFromStart(1, 2, year, 3);

            if (!isValidHolidayDate(presidentsDay) || presidentsDay.toLowerCase().includes('error')) {
                errors.push(`${presidentsDay} - President's Day`);
            } else {
                washingtonStateHolidays.find((holiday) => holiday.name === "President's Day").dateMMDD = presidentsDay;
            }

            //Memorial Day - Last Monday of May
            const memorialDay = getExactLastDate(1, 5, year);

            if (!isValidHolidayDate(memorialDay) || memorialDay.toLowerCase().includes('error')) {
                errors.push(`${memorialDay} - Memorial Day`);
            } else {
                washingtonStateHolidays.find((holiday) => holiday.name === 'Memorial Day').dateMMDD = memorialDay;
            }

            //Labor Day - 1st Monday of September
            const laborDay = getExactDateFromStart(1, 9, year, 1);

            if (!isValidHolidayDate(laborDay) || laborDay.toLowerCase().includes('error')) {
                errors.push(`${laborDay} - Labor Day`);
            } else {
                washingtonStateHolidays.find((holiday) => holiday.name === 'Labor Day').dateMMDD = laborDay;
            }

            //Thanksgiving Day - 4th Thursday of November
            const thanksgivingDay = getExactDateFromStart(4, 11, year, 4);

            if (!isValidHolidayDate(thanksgivingDay) || thanksgivingDay.toLowerCase().includes('error')) {
                errors.push(`${thanksgivingDay} - Thanksgiving Day`);
            } else {
                washingtonStateHolidays.find((holiday) => holiday.name === 'Thanksgiving Day').dateMMDD =
                    thanksgivingDay;

                //Native American Heritage Day - Day after thanksgiving (only fill it if Thanksgiving Day was succesfully found)
                const nativeAmericanHeritageDay = dayjs(thanksgivingDay).add(1, 'day').format('MM/DD');

                if (
                    !isValidHolidayDate(nativeAmericanHeritageDay) ||
                    nativeAmericanHeritageDay.toLowerCase().includes('error')
                ) {
                    errors.push(`${nativeAmericanHeritageDay} - Native American Heritage Day`);
                }

                washingtonStateHolidays.find((holiday) => holiday.name === 'Native American Heritage Day').dateMMDD =
                    nativeAmericanHeritageDay;
            }

            //After getting every holidays, if there were errors, throw all of them
            if (errors.length > 0) {
                throw new Error(errors.join('; '));
            }

            return true;
        } catch (error) {
            errorLog.push(error.message);
            return false;
        }
    }

    function getExactDateFromStart(day, month, year, numberOfDay) {
        /*
        Gets exact date, based on day-month-year and which day of the month is required (starting from first day of the month)
        Parameters:
            day: Day of the week to search for (0-Sunday, 1-Monday, 2-Tuesday, 3-Wednesday, 4-Thursday, 5-Friday, 6-Saturday)
            month: Month to find day (Number)
            year: Year to find day
            numberOfDay: Represents day of the month to be searched for (1-First, 3-Third, etc)
        Example:
            3rd Monday of January - 1, 1, year, 3
        */
        try {
            const firstDayOfMonth = dayjs(`${month}-01-${year}`);

            //If first day is not the required one, get next one depending on which day is the last one
            //(ie: Sunday = 0, Monday = 1 => then (7 - 0 + 1) % 7 to add one day)
            const firstDesiredDay =
                firstDayOfMonth.day() === day
                    ? firstDayOfMonth
                    : firstDayOfMonth.add((7 - firstDayOfMonth.weekday() + day) % 7, 'day');
            return firstDesiredDay.add((numberOfDay - 1) * 7, 'day').format('MM/DD');
        } catch (error) {
            return `getExactDateFromStart error - ${error.message}`;
        }
    }

    function getExactLastDate(day, month, year) {
        /*
        Gets exact last date, based on day-month-year
        Parameters:
            day: Day of the week to search for (0-Sunday, 1-Monday, 2-Tuesday, 3-Wednesday, 4-Thursday, 5-Friday, 6-Saturday)
            month: Month to find day (Number)
            year: Year to find day
        Example:
            Last Monday of May - 1, 5, year
        */
        try {
            const lastDayOfMonth = dayjs(`${month}-01-${year}`).endOf('month');

            //If last day is not the required one, get previous one depending on which day is the last one and the one to get
            //(ie: Sunday = 0, Monday = 1 => then (0 - 1 + 7) % 7 to substract 6 days)
            return lastDayOfMonth.day() === day
                ? lastDayOfMonth.format('MM/DD')
                : lastDayOfMonth.subtract((lastDayOfMonth.weekday() - day + 7) % 7, 'day').format('MM/DD');
        } catch (error) {
            return `getExactLastDate error - ${error.message}`;
        }
    }

    function isValidHolidayDate(date) {
        /*
        Validates that a date is correctly formatted as 'MM/DD'
        Parameters:
            date: String representing date to be evaluated
        Example:
            '02/10' -> true
            '' -> false
        */
        const regex = /^(0[1-9]|1[0-2])\/([0-2][0-9]|3[01])$/;
        return regex.test(date);
    }

    function checkBusinessDay(dateToEvaluate) {
        /*
        Checks if a date falls on business day (during Washington State's business hours)
        Parameters:
            dateToEvaluate: Date to be evaluated
        */
        try {
            const date = dayjs(dateToEvaluate).tz('America/Los_Angeles');
            const day = date.day();
            const hour = date.hour();
            const minute = date.minute();

            //Day = 0 - Sunday
            //Day = 6 - Saturday
            if (day === 0 || day === 6) {
                return false;
            }

            //Business hours are between 08:00 and 16:30
            if (hour < 8 || (hour === 16 && minute > 30) || hour > 16) {
                return false;
            }

            return true;
        } catch (error) {
            errorLog.push(error.message);
            return false;
        }
    }

    function checkHolidays(dateToEvaluate) {
        /*
        Checks if a date falls on holidays (Supported Washington State Holidays listed above), or if weekend, on an Observed Day
        Parameters:
            dateToEvaluate: Date to be evaluated
        */
        try {
            const dateToFind = dayjs(dateToEvaluate).format('MM/DD');
            const holiday = washingtonStateHolidays.find(
                (holiday) => holiday.dateMMDD === dateToFind || holiday.observedDay === dateToFind
            );
            return holiday == undefined
                ? { isHoliday: false, holidayName: '' }
                : { isHoliday: true, holidayName: holiday.name };
        } catch (error) {
            errorLog.push(error.message);
            return false;
        }
    }

    function getNextBusinessDay(dateToEvaluate, isHoliday) {
        /*
        Get next business day (Monday to Friday, 8AM to 16.30PM PT) based on a date to evaluate
        Parameters:
            dateToEvaluate: Date to be evaluated
            isHoliday: Boolean to indicate if dateToEvaluate is holiday or not
        */
        try {
            let nextDay = '';
            const date = dayjs(dateToEvaluate).tz('America/Los_Angeles');
            const day = date.day();
            const hour = date.hour();

            //For every weekday that's not a holiday and before 8AM - return same day at 8AM
            if (!isHoliday && hour < 8 && day != 0 && day != 6) {
                return date.hour(8).minute(0).second(0);
            }

            //For every day that's a holiday, weekend and not weekday before 8AM - Add one day and check if its not weekend or holiday
            nextDay = date.add(1, 'days');
            while (nextDay.day() === 0 || nextDay.day() === 6 || checkHolidays(nextDay).isHoliday) {
                nextDay = nextDay.add(1, 'days');
            }

            return nextDay.hour(8).minute(0).second(0);
        } catch (error) {
            errorLog.push(error.message);
            return '';
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° Get the values of the fields
        const date = getFieldValueByName('Date');

        // 2° Check if the required parameters are present and complete list of holidays
        if (!date) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        const dateOnWashingtonTime = dayjs(date).tz('America/Los_Angeles');
        if (!completeWashingtonHolidays(dateOnWashingtonTime)) {
            // Throw error in case of failure while filling holidays list
            throw new Error(errorLog.join('; '));
        }

        // 3° Check if date to be evaluated falls on holidays (including Observed Days)
        let holiday = checkHolidays(dateOnWashingtonTime);

        // 4° Check if date to be evaluated falls on a business day during Washington State's business hours
        let isBusinessDay = !holiday.isHoliday ? checkBusinessDay(dateOnWashingtonTime) : false;

        //5° If BusinessDay = false, get next Business Day
        let nextBusinessDay = !isBusinessDay ? getNextBusinessDay(dateOnWashingtonTime, holiday.isHoliday) : '';

        if (errorLog.length > 0) {
            throw new Error(errorLog.join('; '));
        }

        // 6° Build the success response array
        let successResponse = {
            isBusinessDay,
            ...holiday,
            nextBusinessDay,
        };

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Date verified succesfully';
        outputCollection[2] = successResponse;
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
