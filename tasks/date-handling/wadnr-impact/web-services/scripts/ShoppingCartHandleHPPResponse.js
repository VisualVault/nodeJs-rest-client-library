/**
 * ShoppingCartHandleHPPResponse
 * Category: Workflow
 * Modified: 2025-05-07T13:20:40.543Z by moises.savelli@visualvault.com
 * Script ID: Script Id: b2a25af7-92d2-ef11-82bd-d3a492f2461d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const crypto = require('crypto');
const { AllHtmlEntities } = require('html-entities');
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
    /*
    Script Name:    ShoppingCartHandleHPPResponse
    Customer:       WADNR
    Purpose:        Based on the response received from the HPP payment form, the Shopping Cart and its related 
                    records are updated with details from the transaction and new records created if necessary. 
    Preconditions:
                    - Forms: Shopping Cart

    Parameters:     The following represent variables passed into the function:
                    Form ID:            (String) Instance name of the given Shopping Cart (e.g., 'CART-000133')
                    Payer Name:         (String) The legal name of the provider making the payment for the Shopping Cart
                    Department Name:    (String) The name of the department belonging to the given Program Office
                    Program Office Name:(String) The name of the program office associated with the fees for the Shopping Cart
                    HPP Request Text:   (String) The request script used to initiate the HPP request
                    HPP Response JSON:  (String) The JSON string of the response returned from the successful HPP transaction

    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: (Object) Data object with status and message description

    Pseudo code: 
                    1. DETERMINE the status of the payment response
                    2. IF the transaction was successful:
                        a. VERIFY that the response signature is valid
                        b. IF the response signature is invalid:
                            i.  POST an email notification to assigned recipients
                            ii. RETURN with an error message indicating invalid authentication
                           OTHERWISE it is valid, so:
                            i.  CREATE the return object with the fields to update, status of success, and a description
                       IF the transaction failed:
                        a. CREATE the return object for the error and log it
                       OTHERWISE:
                        a. the payment was cancelled so set the return object as `null`
                    3. RETURN an object with status, message, and fields to update if successful

    Date of Dev: 01/13/2025
    Last Rev Date: 01/13/2025
    Revision Notes:
    01/13/2025 - John Sevilla: Script migrated.
    */

    logger.info(`Start of the process ShoppingCartHandleHPPResponse at ${Date()}`);

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

    /** **NOTE**: This determines what parameters to return in the response depending on if the site is in staging/production */
    const PRODUCTION = false;

    /** **IMPORTANT**: Do **not** send in response! This is the authorization code used for creating the HMAC and initiating payment through _SnapPay_ */
    const API_AUTH_CODE = 'NULL'; // TODO: Modify based on fpOnline solution

    /** **NOTE**: Format for the `transactiondate` returned from _SnapPay_, to be provided for parsing date string through `dayjs`
     * - Date strings are provided as: `1/1/2024 01:01:01 AM`
     * - Reference: {@link https://day.js.org/docs/en/parse/string-format} */
    const HPP_DATE_FORMAT = 'M/D/YYYY hh:mm:ss A';

    /** **NOTE**: The timezone for the `transactiondate` returned from _SnapPay_, referenced from: {@link https://www.iana.org/time-zones}
     * - _SnapPay_'s offices are located in Mississauga, Ontario, Canada. */
    const PAYMENT_TIMEZONE = 'America/Toronto';

    /** **NOTE**: The timezone for the _Commonwealth of Pennsylvania_ used for formatting timestamps, referenced from {@link https://www.iana.org/time-zones}  */
    //const COPA_TIMEZONE = 'America/New_York';
    const COPA_TIMEZONE = 'America/Los_Angeles'; // Adjusted to DNR

    /** **NOTE**: For any responses where the signature is determined to be valid, the recipient(s) should be notified */
    const HPP_NOTIFICATION_RECIPIENTS = 'VALID EMAIL(S) HERE'; // TODO

    /** **NOTE**: For any responses where the signature is determined to be valid, the recipient(s) should be notified */
    const HPP_NOTIFICATION_BCC_RECIPIENTS =
        'support@visualvault.com' + (PRODUCTION ? '' : 'john.sevilla@visualvault.com');

    // Additional email token values
    const EMAIL_SUBJECT =
        (PRODUCTION ? '' : '(STAGING ENVIRONMENT) ') + 'Payment Transaction Response Validation Error';
    const VV_SUPPORT_EMAIL = 'support@visualvault.com';

    // Standardized error messages
    const PAYMENT_AUTH_ERROR = 'There was a problem authenticating the response from the payment vendor.';

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

    function validateHMAC(hmacParams, hppResponse, apiAuthCode, signatureFromSnapPay) {
        let signatureIsValid = false;

        try {
            // Decode the provided signature and split it by its delimiter
            const signatureBufferArr = Buffer.from(signatureFromSnapPay, 'base64');
            const rawAuthzHeader = new TextDecoder('iso-8859-1').decode(signatureBufferArr);
            const [incomingBase64Signature, nonce, timestamp] = rawAuthzHeader.split(':');

            // Determine the parameters received in the response as a concatenated string
            const receivedParamData = hmacParams.split(',').reduce((rawData, param) => {
                switch (param) {
                    case 'nonce':
                        return rawData + nonce;
                    case 'timestamp':
                        return rawData + timestamp;
                    default:
                        return rawData + String(hppResponse[param]);
                }
            }, '');

            // Calculate the HMAC signature from the received parameter data and the API auth code
            var secretkey = Buffer.from(apiAuthCode, 'base64');
            var prehash = Buffer.from(receivedParamData, 'utf-8').toString();
            var hash = crypto.createHmac('sha256', secretkey).update(prehash);
            var calculatedSignature = hash.digest('base64');

            // Compare the provided signature to the calculated one to verify that they match
            signatureIsValid = incomingBase64Signature == calculatedSignature;
        } catch (error) {
            // Add to the error list so that it can be handled from the caller
            errorLog.push(error);
        } finally {
            return signatureIsValid;
        }
    }

    function generateLoggerErrorMsg(shoppingCartID, responseJSONString) {
        return new Error(
            `ShoppingCartHandleHPPResponse; ${Date()}; ${shoppingCartID}; HPP Response: ${responseJSONString}`
        ).message;
    }

    function formatCurrency(currencyCode = 'USD', number) {
        const formatter = Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode });
        return formatter.format(number);
    }

    function encodeHTMLString(value) {
        const stringValue = String(value);
        return AllHtmlEntities.encode(stringValue);
    }

    function buildEmailBody(
        hppResponseObj,
        hppRequestText,
        payerName,
        departmentName,
        programOfficeName,
        shoppingCartFormID
    ) {
        // Encode all common token value strings to be used in the email body in case they are provided as HTML
        const $paymentType = encodeHTMLString(hppResponseObj?.paymentmode);
        const $transactionAmount = encodeHTMLString(hppResponseObj?.transactionamount);
        const $payerName = encodeHTMLString(payerName);
        const $departmentName = encodeHTMLString(departmentName);
        const $programOfficeName = encodeHTMLString(programOfficeName);
        const $shoppingCartFormID = encodeHTMLString(shoppingCartFormID);

        // Format the request text as an unordered list to display the attribute/value
        const reqAttributes = String(hppRequestText).match(/([\w|data-]+)="([^"]*)"+/g);
        const $payloadListItems = reqAttributes.map((attributeString) => {
            // NOTE: The input string is formatted like so: data-currencycode="USD"
            const attributeData = /(?<name>([\w*|data-])+)="(?<value>(.*))"/.exec(attributeString);
            let $name = '';
            let $value = '';
            if (!attributeData) {
                // Unexpected string format provided, so encode it as HTML and return as-is
                $name = '[INVALID INPUT]';
                $value = encodeHTMLString(attributeString);
            } else {
                // Acquire the name and value for the attribute and create the list item HTML using that information
                $name = encodeHTMLString(attributeData?.groups?.name);
                $value = encodeHTMLString(attributeData?.groups?.value);
            }

            // Build the list item HTML using the determined token values
            const paramLI = `<li><strong>${$name}</strong>: ${$value}</li>`;
            return paramLI;
        });

        // Format the response JSON object as an unordered list to display the key/value
        let $jsonListItems = '';
        for (key in hppResponseObj) {
            $key = encodeHTMLString(key);
            $value = encodeHTMLString(hppResponseObj[key]);
            $jsonListItems += `<li><strong>${$key}</strong>: ${$value}</li>`;
        }

        // Create the timestamp for when the response was validated
        const timestamp = new Intl.DateTimeFormat('en-US', {
            dateStyle: 'full',
            timeStyle: 'long',
            timeZone: COPA_TIMEZONE,
        }).format(new Date());

        // Build the email body HTML to notify staff of the invalid response
        let emailBody = `
            <p>
                A payment transaction response from the Commonwealth of Pennsylvania's SnapPay hosted payment 
                page failed validation of its HMAC signature at ${timestamp} in the Enterprise Licensing System.
                <br/>
                <br/>
                A${$paymentType == 'CC' ? ' credit card' : `n '${$paymentType}'`} payment 
                of ${formatCurrency(hppResponseObj?.currencycode, $transactionAmount)} was made for fees
                for ${$payerName} to ${$departmentName} - ${$programOfficeName}.
            </p>
            <br/>

            <strong>Enterprise Licensing System Shopping Cart ID:</strong> ${$shoppingCartFormID}
            <br/>
            <br/>

            <strong>Request Payload:</strong>
            <br/>
            <code>
                <ul>
                    ${$payloadListItems.join('')}
                </ul>
            </code>
            <br/>

            <strong>Response Payload:</strong>
            <br/>
            <code>
                <ul>
                    ${$jsonListItems}
                </ul>
            </code>
            <br/>

            <p>
                Please contact <a href="mailto:${VV_SUPPORT_EMAIL}">${VV_SUPPORT_EMAIL}</a> with the contents of this 
                notification if you have any questions.
            </p>
        `;

        return emailBody;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get required web service parameters
        const shoppingCartFormID = getFieldValueByName('Form ID');
        const payerName = getFieldValueByName('Payer Name');
        const departmentName = getFieldValueByName('Department Name');
        const programOfficeName = getFieldValueByName('Program Office Name');
        const hppRequestText = getFieldValueByName('HPP Request Text');
        const hppResponseJSON = getFieldValueByName('HPP Response JSON');

        // Check if required parameters were provided
        if (errorLog.length > 0) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // Parse the response JSON and determine transaction details/status by evaluating the response object
        const hppResponse = JSON.parse(hppResponseJSON);
        const transactionSuccessful = hppResponse?.transactionstatus == 'Y';
        const transactionFailed = (hppResponse?.returnmessage || '').startsWith('Transaction Failed');
        const transactionCancelled = (hppResponse?.returnmessage || '').startsWith('Action cancelled');

        let returnObj = {
            message: '',
            status: '',
        };

        if (transactionSuccessful) {
            // Get the returned signature and the response parameters to verify the signature
            const signatureFromSnapPay = hppResponse?.signature;
            const hmacParams = hppResponse?.hpphmacresponseparameters;
            if (!signatureFromSnapPay || !hmacParams) {
                throw new Error(PAYMENT_AUTH_ERROR);
            }

            const responseValid = validateHMAC(hmacParams, hppResponse, API_AUTH_CODE, signatureFromSnapPay);

            // Check that the signature provided was valid
            if (!responseValid) {
                const emailBody = buildEmailBody(
                    // Request/Response Payloads to parse and format
                    hppResponse,
                    hppRequestText,
                    // Miscellaneous Tokens
                    payerName,
                    departmentName,
                    programOfficeName,
                    shoppingCartFormID
                );

                const emailObj = {
                    recipients: HPP_NOTIFICATION_RECIPIENTS,
                    bccrecipients: HPP_NOTIFICATION_BCC_RECIPIENTS,
                    subject: EMAIL_SUBJECT,
                    body: emailBody,
                };

                await vvClient.email.postEmails(null, emailObj);
                throw new Error(PAYMENT_AUTH_ERROR);
            }

            // Destruct the parsed response object to get the returned transaction details
            const {
                transactiondate: transactionDate,
                transactionamount: amountReceived,
                pgtransactionid: transactionID,
                paymenttransactionid: paymentTransactionID,
            } = hppResponse;

            // Create the payment date string by converting the date provided to an ISO string formatted UTC date
            const normalizedDateString = dayjs(transactionDate, HPP_DATE_FORMAT).format('YYYY-MM-DD HH:mm:ss');
            const paymentDate = dayjs.tz(normalizedDateString, PAYMENT_TIMEZONE).toISOString();

            // Create the form update object for the Shopping Cart
            const updateCartArr = [
                { name: 'Payment Date', value: paymentDate },
                { name: 'Received By', value: RECEIVED_BY },
                { name: 'Transaction ID or Check Number', value: transactionID }, // NOTE: Visible to authorized user(s)
                { name: 'Secondary Transaction ID', value: paymentTransactionID }, // NOTE: Contained in hidden field
                { name: 'Amount Received', value: amountReceived },
                { name: 'Status', value: PAID_STATUS },
            ];

            returnObj.status = 'Success';
            returnObj.message = `The ${SHOPPING_CART} was successfully paid with the amount of: `;
            returnObj.message += `<strong>${formatCurrency(hppResponse.currencycode, amountReceived)}</strong>.`;

            // Declare the fields to be updated on the form in the response
            returnObj.fields = updateCartArr;
        } else if (transactionFailed) {
            // Do not throw an error, but log the web service details/response, and define the return object
            logger.info(generateLoggerErrorMsg(shoppingCartFormID, hppResponseJSON));
            returnObj.status = 'Error';
            returnObj.message = `The ${SHOPPING_CART} payment failed because of the following reason: ${hppResponse.returnmessage}`;
        } else if (transactionCancelled) {
            // The transaction was cancelled by the user
            returnObj = null;
        } else {
            // The response object was missing required properties, so log passed in response and throw an error
            logger.info(generateLoggerErrorMsg(shoppingCartFormID, hppResponseJSON));
            returnObj.status = 'Error';
            returnObj.message = 'The response from the payment vendor was missing required parameters.';
        }

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success'; // Don't change this
        outputCollection[1] = `The payment gateway response was successful.`;
        outputCollection[2] = returnObj;
        outputCollection[3] = null;
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don't change this
        outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        outputCollection[2] = null;
        outputCollection[3] = errorLog;
    } finally {
        // SEND THE RESPONSE
        response.json(200, outputCollection);
    }
};
