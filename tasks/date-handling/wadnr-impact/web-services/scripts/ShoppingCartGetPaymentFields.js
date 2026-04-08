/**
 * ShoppingCartGetPaymentFields
 * Category: Workflow
 * Modified: 2026-03-03T19:50:29.793Z by ross.rhone@visualvault.com
 * Script ID: Script Id: bfd8773d-b91b-f011-82d6-afeb582902bd
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone'); // dependent on utc plugin
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
    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const PAYMENT_TIMEZONE = 'America/Los_Angeles';

    // Form Template Names
    const SHOPPING_CART = 'Shopping Cart';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */

    // 'Paid' status for the Shopping Cart
    const PAID_STATUS = 'Paid';
    // Payment information for the Shopping Cart
    const RECEIVED_BY = 'Online Payment';

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // Response array
    let outputCollection = [];
    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

    function formatCurrency(currencyCode = 'USD', number) {
        const formatter = Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode });
        return formatter.format(number);
    }

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

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // current time to ISO‑8601 (UTC “Z” suffix)
        const paymentDateISO = dayjs() // now, in system zone
            .tz(PAYMENT_TIMEZONE) // view that instant as Phoenix time
            .toISOString(); // ⇢ 2025‑04‑16T23:04:12.345Z (example)

        const paymentType = getPaymentType(getFieldValueByName('payment_method'));
        const confirmationNumber = getFieldValueByName('confirmation_number');
        const amount = getFieldValueByName('amount');
        const currencyCode = getFieldValueByName('currency_code');
        const transactionID = getFieldValueByName('transactionID');
        const feeAmount = getFieldValueByName('fee_amount');
        //Also get fee?
        //Get currency code?

        let returnObj = {
            message: '',
            status: '',
            fields: '',
        };

        function getPaymentType(paymentMethod) {
            let paymentType = '';
            if (paymentMethod.includes('credit')) {
                paymentType = 'Credit';
            }
            if (paymentMethod.includes('debit')) {
                paymentType = 'Debit';
            }
            if (paymentMethod.includes('ach')) {
                paymentType = 'ACH';
            }
            return paymentType;
        }

        // Create the form update object for the Shopping Cart
        const updateCartArr = [
            { name: 'Payment Type', value: paymentType },
            { name: 'Payment Date', value: paymentDateISO },
            { name: 'Received By', value: RECEIVED_BY },
            { name: 'Confirmation Number', value: confirmationNumber },
            { name: 'Amount Received', value: amount },
            { name: 'Status', value: PAID_STATUS },
            { name: 'Transaction ID or Check Number', value: transactionID },
            { name: 'Transactional Fee', value: feeAmount },
        ];
        //Add fee to show total amount.

        returnObj.status = 'Success';
        returnObj.message = `The ${SHOPPING_CART} was successfully paid with the amount of: `;
        returnObj.message += `<strong>${formatCurrency(currencyCode, amount)}</strong>.`;

        // Declare the fields to be updated on the form in the response
        returnObj.fields = updateCartArr;

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success'; // Don't change this
        outputCollection[1] = `The payment gateway response was successful.`;
        outputCollection[2] = returnObj;
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don't change this
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
