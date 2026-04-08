/**
 * ShoppingCartSCHDisableStaleCarts
 * Category: Scheduled
 * Modified: 2025-02-18T17:41:01.807Z by john.sevilla@visualvault.com
 * Script ID: Script Id: accd5513-93d2-ef11-82bd-d3a492f2461d
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

module.exports.main = async function (vvClient, response, token) {
    /*
    Script Name:    ShoppingCartSCHDisableStaleCarts
    Customer:       WADNR
    Purpose:        To dispose of unpaid Shopping Carts with a total amount of $0, which have not been modified 
                    within in a configurable period

    Parameters:     NONE
 
    Return Object:
                    Message will be sent back to VV as part of the ending of this scheduled process.
    Pseudo code:
                    1. CALCULATE cutoff date for Shopping Carts
                    2. GET stale Shopping Carts
                    3. FOR any stale Shopping Carts returned:
                        a. UPDATE their status to 'Stale'
                    4. RETURN a success message for the scheduled service
 
    Date of Dev: 01/13/2025
    Revision Notes:
    01/13/2025 - John Sevilla: Script migrated.
    02/18/2025 - John Sevilla: Update date calculation
    */

    logger.info(`Start of logic for ShoppingCartSCHDisableStaleCarts on ${new Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // You will see the responseMessage in the scheduled process log ONLY if the process runs manually.
    response.json(200, `Start of logic for ShoppingCartSCHDisableStaleCarts on ${new Date()}`);

    // Array for capturing error messages that may occur during the execution of the script.
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    // Form Template Names
    const SHOPPING_CART = 'Shopping Cart';

    /** **NOTE**: Represents the amount of time in days since today that a Shopping Cart is considered stale */
    const STALE_CART_TIMESPAN = 183;

    const STALE_CART_STATUS = 'Stale';

    const WADNR_TIMEZONE = 'America/Los_Angeles';
    const dateTimeISOStringFormat = 'YYYY-MM-DDTHH:mm:ss'; // Important: No tz specified (e.g. a 'Z' suffix)

    /* -------------------------------------------------------------------------- */
    /*                              Script Variables                              */
    /* -------------------------------------------------------------------------- */

    // Contains the success or error response message
    let responseMessage = '';

    // Identifies the process in VV servers
    const scheduledProcessGUID = token;

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

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
            // If an error ocurrs, it's because the resp is already a JS object and doesn't need to be parsed
        }
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
        Checks that the meta property of a vvCliente API response object has the expected status code
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
        Checks that the data property of a vvCliente API response object exists 
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
        Checks that the data property of a vvCliente API response object is not empty
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

    function getFormRecords(getFormsParams, templateName, shortDescription = `Get form ${templateName}`) {
        getFormsParams = {
            expand: false,
            ...getFormsParams, // overrides defaults in this object
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function updateFormRecord(
        fieldValuesToUpdate,
        templateName,
        recordGUID,
        shortDescription = `Update form record ${recordGUID}`
    ) {
        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, templateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Calculate the cutoff date for stale Shopping Carts by subtracting today's date by the timeframe
        const cutoffDateTimeStr = dayjs()
            .tz(WADNR_TIMEZONE)
            .subtract(STALE_CART_TIMESPAN, 'day')
            .format(dateTimeISOStringFormat);

        // Search for all stale Shopping Carts
        const getCartConditions = [
            `[Status] eq 'Unpaid'`,
            `[Total Amount] eq 0`,
            `[createDate] lt '${cutoffDateTimeStr}'` /* createDate is a platform-generated datetime timestamp in the 
                                                    server's local time (assumed to be same as client's). Datetime 
                                                    comparisons are valid in this case */,
        ];
        const getCartDescription = `Getting stale ${SHOPPING_CART}s older than ${cutoffDateTimeStr}`;
        const getCartParams = {
            q: getCartConditions.join(' AND '),
            fields: `createDate`,
        };

        const staleCartsData = await getFormRecords(getCartParams, SHOPPING_CART, getCartDescription);

        let responseMessage = '';
        if (staleCartsData.length > 0) {
            for (const staleCart of staleCartsData) {
                // Update the status of the Shopping Carts as stale
                const updateDescription = `Update form record ${staleCart.instanceName}'s status to '${STALE_CART_STATUS}'`;
                const updateCartParams = {
                    Status: STALE_CART_STATUS,
                };

                const updatedCart = await updateFormRecord(
                    updateCartParams,
                    SHOPPING_CART,
                    staleCart.revisionId,
                    updateDescription
                );
            }

            // All Shopping Carts were successfully disposed of
            responseMessage = `${SHOPPING_CART}s (Count: ${staleCartsData.length}) were successfully determined/updated as '${STALE_CART_STATUS}'.`;
        } else {
            responseMessage = `No unpaid ${SHOPPING_CART}s with a balance of $0 and older than '${cutoffDateTimeStr}' were found.`;
        }

        // SEND THE SUCCESS RESPONSE MESSAGE
        // NOTE: You will see the responseMessage in the scheduled process log ONLY if the process runs automatically.
        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, responseMessage);
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // SEND THE ERROR RESPONSE MESSAGE
        if (errorLog.length > 0) {
            responseMessage = `Error/s: ${errorLog.join('; ')}`;
        } else {
            responseMessage = `Unhandled error occurred: ${error}`;
        }

        // NOTE: You will see the responseMessage in the scheduled process log ONLY if the process runs automatically.
        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', false, responseMessage);
    }
};
