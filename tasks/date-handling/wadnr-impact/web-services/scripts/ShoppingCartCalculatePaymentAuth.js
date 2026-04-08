/**
 * ShoppingCartCalculatePaymentAuth
 * Category: Workflow
 * Modified: 2025-01-14T16:15:53.48Z by john.sevilla@visualvault.com
 * Script ID: Script Id: b3be97b1-92d2-ef11-82bd-d3a492f2461d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const currency = require('currency.js');
const crypto = require('crypto');

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
    Script Name:    ShoppingCartCalculatePaymentAuth
    Customer:       WADNR
    Purpose:        Generates a Hash-based Message Authentication Code (HMAC) using transaction/payment details 
                    from the calling Shopping Cart form so that the SnapPay transaction can be authenticated in
                    addition to determining the payment type + other authentication details for the transaction
    Preconditions:
                    - Forms: Shopping Cart

    Parameters:     The following represent variables passed into the function:
                    Form ID:        (String) Instance name of the given Shopping Cart (e.g., 'CART-000133')
                    Payment Type:   (String) User-selected option for the method of payment (e.g., 'Credit Card', 'ACH')
                    Total Amount:   (Number) The total amount for the balances due of the Shopping Cart's related Payment Items

    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: (Object) Data object including HMAC signature and other transaction details

    Pseudo code: 
                    1. GET the payment mode based on the selected payment type
                    2. GET payment details for the given Shopping Cart
                    3. IF customer pays processing fee and payment mode is via credit card:
                        a. CALCULATE the processing fee based on the transaction amount
                        b. CREATE the fee description so that the info is displayed to the payer
                    4. CREATE the UDF mapping array based on the payment details
                    5. DETERMINE the merchant ID based on the payment mode/CCTP policy
                    6. CREATE an HMAC signature using provided transaction details
                    7. RETURN an object containing HMAC signature and other details in the response
 
    Date of Dev: 01/13/2025
    Last Rev Date: 01/13/2025
    Revision Notes:
    01/13/2025 - John Sevilla: Script migrated.          
    */

    logger.info(`Start of the process ShoppingCartCalculatePaymentAuth at ${Date()}`);

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

    const CURRENCY_CODE = 'USD';
    /** **NOTE**: The percentage fee for credit card processing */
    const CCTP_FEE = 0.02;
    /** **NOTE**: This determines what parameters to return in the response depending on if the site is in staging/production */
    const PRODUCTION = false;
    /** **IMPORTANT**: Do **not** send in response! This is the authorization code used for creating the HMAC and initiating payment through _SnapPay_ */
    const API_AUTH_CODE = 'NULL'; // TODO: Modify based on fpOnline solution

    // Form Template Names
    const SHOPPING_CART = 'Shopping Cart';

    // Custom Query Names
    const GetShoppingCartPaymentDetails = 'zWebSvc Get Shopping Cart Payment Details';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */

    // TODO: Define the production Account ID
    const ACCOUNT_ID = PRODUCTION ? '' : '1001111488';
    // TODO: Define the production Customer ID
    const CUSTOMER_ID = PRODUCTION ? '' : '999';
    const HPP_PAGE_URL = `https://${PRODUCTION ? 'www' : 'stage'}.snappayglobal.com/Interop/HostedPaymentPage`;
    const HPP_SCRIPT_URL = `https://${PRODUCTION ? 'www' : 'stage'}.snappayglobal.com/Areas/Interop/Scripts/HPPForm.js`;

    // SnapPay Payment Modes
    const PAYMENT_MODE_CC = 'CC';
    const PAYMENT_MODE_ACH = 'ACH';

    // Correlates the selectable payment options (type) to their abbreviated code (mode) sent to the HPP
    const paymentTypeModes = new Map([
        ['Credit Card', PAYMENT_MODE_CC],
        ['ACH', PAYMENT_MODE_ACH],
    ]);

    // 'Unpaid' status for the Payment Item form
    const UNPAID_STATUS = 'Unpaid';

    const CHARGE_CUSTOMER = '_CHARGE_CUSTOMER';
    const CHARGE_AGENCY = '_CHARGE_AGENCY';

    // The merchant ID depends on the payment mode selected and whether the agency/customer pays the credit card processing fee
    const merchantIDMap = new Map([
        // TODO: Define the production Merchant IDs
        [PAYMENT_MODE_CC + CHARGE_CUSTOMER, PRODUCTION ? '' : '700000009421'], // Charge processing fee to Customer
        [PAYMENT_MODE_CC + CHARGE_AGENCY, PRODUCTION ? '' : '700000009422'], // Charge processing fee to Agency
        [PAYMENT_MODE_ACH, PRODUCTION ? '' : '44010399'],
    ]);

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

    function createHMAC(
        accountID,
        customerID,
        merchantID,
        transactionAmount,
        currencyCode,
        paymentMode,
        payerEmail,
        apiAuthCode
    ) {
        const timeStamp = Date.now().toString();
        const nonce = crypto.randomUUID();
        var signatureRawData =
            accountID +
            customerID +
            merchantID +
            transactionAmount +
            currencyCode +
            paymentMode +
            payerEmail +
            nonce +
            timeStamp;
        var secretkey = Buffer.from(apiAuthCode, 'base64');
        var prehash = Buffer.from(signatureRawData, 'utf-8').toString();
        var hash = crypto.createHmac('sha256', secretkey).update(prehash);
        var signature = hash.digest('base64');
        var signatureData = signature + ':' + nonce + ':' + timeStamp;
        var HmacValue = Buffer.from(signatureData, 'utf-8').toString('base64');

        return HmacValue;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get required web service parameters
        const shoppingCartFormID = getFieldValueByName('Form ID');
        const paymentType = getFieldValueByName('Payment Type');
        const totalAmount = getFieldValueByName('Total Amount');

        // Check if required parameters were provided
        if (!shoppingCartFormID || !paymentType || !totalAmount) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // Get the payment mode associated with the selected payment type and check if it is a valid option
        const paymentMode = paymentTypeModes.get(paymentType) || null;
        if (!paymentMode) {
            throw new Error(`${paymentType} is not a valid payment option.`);
        }

        // Search for unpaid Payment Items related to the given Shopping Cart
        const queryDescription = `Getting payment details for '${shoppingCartFormID}'`;
        const paymentQueryParams = {
            params: JSON.stringify([
                {
                    parameterName: 'shoppingCartID',
                    value: shoppingCartFormID,
                },
                {
                    parameterName: 'paymentStatus',
                    value: UNPAID_STATUS,
                },
            ]),
        };

        // Get the payment details for the Shopping Cart to acquire information about the payer / recipient
        const paymentDetails = await vvClient.customQuery
            .getCustomQueryResultsByName(GetShoppingCartPaymentDetails, paymentQueryParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, queryDescription))
            .then((res) => checkDataPropertyExists(res, queryDescription))
            .then((res) => {
                // Check that results were returned for the given Shopping Cart
                if (res.data.length === 0) {
                    throw new Error(
                        `Unable to find payment details for the ${SHOPPING_CART}. Please review your items again and contact support if you require assistance.`
                    );
                }

                // Return the first result since there can only be one (1) program office paid per Shopping Cart
                return res.data[0];
            });

        // Get the returned properties from the payment details object
        const {
            providerMPI,
            programOfficeAbbreviation,
            programOfficeName,
            programOfficeDeptName,
            programOfficeBillingCode,
            programOfficeCustomerPaysCCTP,
        } = paymentDetails;

        // Determine if the customer or the program office pays the CCTP fee
        const customerPaysCCTP = Boolean(programOfficeCustomerPaysCCTP);

        // Get the transaction amount object, and calculate the fee if the customer pays the CCTP fee
        const transactionAmount = currency(totalAmount).value;
        let feeDescription = '';
        if (paymentMode == PAYMENT_MODE_CC && customerPaysCCTP) {
            // Create the display values to represent the processing fee for this transaction
            const processFeeVal = currency(transactionAmount).multiply(CCTP_FEE).value;
            const cctpFeeString = Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY_CODE }).format(
                processFeeVal
            );
            const percentString = Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 }).format(
                CCTP_FEE
            );

            feeDescription = `${percentString} processing fee of ${cctpFeeString} (${CURRENCY_CODE})`;
        }

        // Map the UDF fields for providing the program office billing code, SAP vendor number, and reference values
        let udfMapping = [
            ['data-udf1', ''], // TODO: SAP Vendor Number
            ['data-udf2', programOfficeBillingCode], // Program Office
            ['data-udf3', transactionAmount], // Transaction Amount
        ];

        // Define the reference UDF fields using the payment details
        udfMapping.push(
            ['data-udf0', programOfficeAbbreviation], // Program Office Abbreviation
            ['data-udf4', providerMPI], // Provider MPI Number
            ['data-udf7', shoppingCartFormID] // Shopping Cart ID
        );

        // Determine the merchant ID based on the payment mode selected and the recipient program office(s) if applicable
        let merchantID = '';
        if (paymentMode === PAYMENT_MODE_CC) {
            // Acquire the merchant ID depending on if the program office or the customer pay the credit card processing fee
            merchantID = merchantIDMap.get(PAYMENT_MODE_CC + (customerPaysCCTP ? CHARGE_CUSTOMER : CHARGE_AGENCY));
        } else {
            // Get the associated merchant ID for the ACH payment type
            merchantID = merchantIDMap.get(PAYMENT_MODE_ACH);
        }

        const hmacSignature = createHMAC(
            ACCOUNT_ID,
            CUSTOMER_ID,
            merchantID,
            transactionAmount,
            CURRENCY_CODE,
            paymentMode,
            // NOTE: `payerEmail` provided as a blank string since it is not provided in the Shopping Cart form
            '',
            API_AUTH_CODE
        );

        const transactionDetailsObj = {
            // Transaction Identifiers
            accountid: ACCOUNT_ID,
            customerid: CUSTOMER_ID,
            merchantid: merchantID,
            // Transaction Details
            totalAmount: transactionAmount,
            currencycode: CURRENCY_CODE,
            paymentmode: paymentMode,
            // Display Values
            feeDescription: feeDescription,
            departmentName: programOfficeDeptName,
            officeName: programOfficeName,
            // Miscellaneous
            signature: hmacSignature,
            udf: udfMapping,
            formURL: HPP_PAGE_URL,
            scriptURL: HPP_SCRIPT_URL,
        };

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success'; // Don't change this
        outputCollection[1] = `Transaction authentication details were successfully created.`;
        outputCollection[2] = transactionDetailsObj;
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don't change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors ocurred.';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        // SEND THE RESPONSE
        response.json(200, outputCollection);
    }
};
