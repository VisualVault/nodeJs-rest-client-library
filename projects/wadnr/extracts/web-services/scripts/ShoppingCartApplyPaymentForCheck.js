/**
 * ShoppingCartApplyPaymentForCheck
 * Category: Workflow
 * Modified: 2025-04-23T15:46:41.31Z by ross.rhone@visualvault.com
 * Script ID: Script Id: 8fd1978c-92d2-ef11-82bd-d3a492f2461d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const currency = require('currency.js');

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
    Script Name:    LibShoppingCartApplyPayment
    Customer:       WADNR
    Purpose:        Provides a unified mechanism where online payments or checks can be applied to payment items 
                    related to a Shopping Cart, and finalize the transaction records associated with the payment 
                    items, including the ability to process multiple Shopping Carts at a time.

    Preconditions:
                    - Forms: Shopping Cart

    Parameters:     The following represent variables passed into the function:
                    Shopping Cart Data: (Array) List of objects representing the Shopping Cart(s) to be processed:
                        - Shopping Cart ID: (String) Instance name of the given Shopping Cart (e.g., 'CART-000133')
                        - Amount Paid:      (Number) The monetary amount paid for the the given Shopping Cart

    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: 

    Pseudo code: 
                    1. FOR each Shopping Cart:
                        a. GET its related Payment Items and their Fees
                        b. GET the payment method used for the Shopping Cart
                        c. FOR each Payment Item and its related Fee:
                            - UPDATE the Payment Item and its Transaction using `LibPaymentItemUpdate`
                            - DETERMINE if the balance has been paid and if the Payment Item is an installment
                            - IF the balance has been fully paid:
                                i.  UPDATE the Fee's status as 'Paid'
                              OTHERWISE IF the Payment Item is part of an installment:
                                i.  CALCULATE the next due date for the Fee
                                ii. UPDATE the unpaid Fee with the next due date
                    2. RETURN a status of the web service's success
 
    Date of Dev: 01/13/2025
    Last Rev Date: 01/13/2025
    Revision Notes:
    01/13/2025 - John Sevilla: Script migrated.        
    */

    logger.info(`Start of the process LibShoppingCartApplyPayment at ${Date()}`);

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

    // Form Template Names
    const SHOPPING_CART = 'Shopping Cart';
    const FEE = 'Fee';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */

    // Custom Query Names
    const GetShoppingCartRelatedRecords = 'zWebSvc Get Shopping Cart Related Records';

    // Library Web Service Names
    const LibPaymentItemUpdate = 'LibPaymentItemUpdate';

    // Form Status Options
    const PAID_STATUS = 'Paid';
    const FINALIZED_STATUS = 'Finalized';

    // Miscellaneous
    const DEFAULT_FREQUENCY = 'Monthly';
    const frequencyMap = new Map([
        ['Weekly', { unit: 'week', num: 1 }],
        ['Biweekly', { unit: 'week', num: 2 }],
        ['Monthly', { unit: 'month', num: 1 }],
        ['Quarterly', { unit: 'quarter', num: 1 }],
    ]);
    const validPaymentMethods = ['credit', 'debit', 'ach'];

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

    /**
     * Updates a given form record by its revision ID using a data object to update specific fields.
     * @param {String} formGUID - Revision ID for the form to update
     * @param {String} templateName - The form template name of the form to update
     * @param {Object} updateObj - Data object where each property corresponds to the form's control name to update
     * @param {String} shortDescription - Optional argument to define the update process description
     * @returns The `Promise` for the form update request which returns its `data` property
     */
    function updateFormRecord(formGUID, templateName, updateObj, shortDescription) {
        shortDescription = shortDescription || `Updating ${formGUID} (${templateName})`;
        return vvClient.forms
            .postFormRevision(null, updateObj, templateName, formGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    /**
     * Executes a custom query by name by passing in query parameters
     * @param {String} queryName - The name of the custom query as it is defined in VisualVault
     * @param {Array} params - List of the parameter names and their value to be passed to the query
     * @param {String} shortDescription - Description of the query to be performed
     * @returns The `Promise` for the custom query call which returns its `data` property
     */
    function executeCustomQuery(queryName, params, shortDescription) {
        const queryParams = {
            params: JSON.stringify(params),
        };

        // Execute the custom query using the provided parameters
        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, queryParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    /**
     * Constructor function to streamline executing web services and evaluating their response.
     * @param {String} webServiceName - The name of the web service to be called
     */
    function WebServiceManager(webServiceName) {
        this.webServiceName = webServiceName;
        /**
         * Executes the web service using the passed in parameters and evaluates its response.
         * @param {Object} webServiceParams - The parameters to be passed to the web service
         * @param {String} target - A description of the web service target (e.g., a Form ID)
         * @returns The `Promise` for the web service API call which returns its `data` property
         */
        this.runWebService = (webServiceParams, target) => {
            // Generate the description using the description of the web service's target
            const shortDescription = `Executing ${this.webServiceName} for '${target}'`;
            return vvClient.scripts
                .runWebService(this.webServiceName, webServiceParams)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                .then((res) => checkDataIsNotEmpty(res, shortDescription))
                .then((res) => res.data);
        };
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get required web service parameters
        const cartData = getFieldValueByName('Shopping Cart Data');

        // Check if required parameters were provided
        if (!cartData) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // Verify that the Shopping Cart Data was provided as an array with at least one item
        const cartDataIsValid = Array.isArray(cartData) && cartData.length > 0;
        if (!cartDataIsValid) {
            throw new Error(`Shopping Cart Data must be provided as an array with at least one (1) item.`);
        }

        // Instantiate the web service manager to be able to create web service requests
        const { runWebService: updatePaymentItem } = new WebServiceManager(LibPaymentItemUpdate);

        // Iterate over each of the Shopping Carts to apply the payment
        for (let cart of cartData) {
            // Get the Shopping Cart ID and the Amount Paid for this Shopping Cart and verify that they were provided
            const { ['Shopping Cart ID']: cartID, ['Amount Paid']: amountPaid } = cart;

            if (!cartID || !amountPaid) {
                throw new Error(
                    `Missing data pair for ${SHOPPING_CART}, where Shopping Cart ID = '${cartID}' and Amount Paid = '${amountPaid}'`
                );
            }

            // Get the Shopping Cart's related records
            const shoppingCartRelatedRecords = await executeCustomQuery(
                GetShoppingCartRelatedRecords,
                [
                    {
                        parameterName: 'shoppingCartID',
                        value: cartID,
                    },
                ],
                `Getting related records for '${cartID}'`
            );

            // Get the payment method used for the Shopping Cart, so that it can be used to update its Payment Item(s)
            const getCartPaymentMethodDescription = `Getting payment type used for '${cartID}'`;
            const getCartPaymentMethodParams = {
                q: `[Form ID] eq '${cartID}'`,
                fields: `id,name,[Payment Type]`,
            };

            const paymentMethod = await vvClient.forms
                .getForms(getCartPaymentMethodParams, SHOPPING_CART)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, getCartPaymentMethodDescription))
                .then((res) => checkDataPropertyExists(res, getCartPaymentMethodDescription))
                .then((res) => checkDataIsNotEmpty(res, getCartPaymentMethodDescription))
                .then((res) => res.data[0]['payment Type']);

            // Verify that the payment method returned is one of the valid options
            // NOTE: If the Shopping Cart is being processed at this point, it should ALWAYS have a valid payment method selected
            if (!validPaymentMethods.includes(paymentMethod)) {
                throw new Error(`'${paymentMethod}' is not a valid payment method for a ${SHOPPING_CART}.`);
            }

            for (let recordCollection of shoppingCartRelatedRecords) {
                // Get the Payment Item details and the Transaction ID / Check Number for its Shopping Cart
                const { paymentItemID, checkNumberOrTransactionID } = recordCollection;

                // Define the web service parameters to update the Payment Item
                const paramsLibPaymentItemUpdate = [
                    {
                        name: 'Payment Item ID',
                        value: paymentItemID,
                    },
                    {
                        name: 'PaymentItemUpdateObject',
                        value: {
                            Status: PAID_STATUS,
                            'Payment Method': paymentMethod,
                        },
                    },
                    {
                        name: 'External Transaction ID',
                        value: checkNumberOrTransactionID,
                    },
                    {
                        name: 'Finalize Transaction Record Status',
                        value: FINALIZED_STATUS,
                    },
                ];

                // Update the Payment Item and its associated Transaction record using `LibPaymentItemUpdate`
                const [status, statusMsg, updatedPaymentItemData] = await updatePaymentItem(
                    paramsLibPaymentItemUpdate,
                    paymentItemID
                );

                if (status !== 'Success') {
                    // An error occurred for the called web service
                    throw new Error(statusMsg);
                }

                // Get the Payment Item's Fee ID and its calculated finalized transactions balance determined by `LibFeeCalculateBalance` (called from `LibPaymentItemUpdate`)
                const feeID = updatedPaymentItemData.calculatedFee['Fee ID'];
                const finalizedTransactionsBalance =
                    updatedPaymentItemData.calculatedFee['Balance Due calculated from Finalized Transactions'];

                // Evaluate if the finalized balance has been fully paid and if the current Payment Item is part of an installment
                const balanceIsFullyPaid = finalizedTransactionsBalance == 0;
                // NOTE: The custom query returns `paymentIsInstallment` as a `1` (true) or a `0` (false)
                const paymentIsInstallment = Boolean(recordCollection.paymentIsInstallment);

                // Check if the related Fee must be updated based on the evaluated values
                if (balanceIsFullyPaid || paymentIsInstallment) {
                    const getFeeDescription = `Getting revision ID for '${feeID}'`;
                    const getFeeParams = {
                        q: `[Form ID] eq '${feeID}'`,
                        fields: 'id,name',
                    };

                    // Get the revision ID for the Payment Item's related Fee
                    const feeGUID = await vvClient.forms
                        .getForms(getFeeParams, FEE)
                        .then((res) => parseRes(res))
                        .then((res) => checkMetaAndStatus(res, getFeeDescription))
                        .then((res) => checkDataPropertyExists(res, getFeeDescription))
                        .then((res) => checkDataIsNotEmpty(res, getFeeDescription))
                        .then((res) => res.data[0].revisionId);

                    // Build the Fee's update object depending on whether the balance has been paid or the payment is an installment
                    let feeUpdateObject = {};
                    let feeUpdateDescription = '';
                    if (balanceIsFullyPaid) {
                        feeUpdateDescription = `Updating ${feeID} to '${PAID_STATUS}'`;
                        feeUpdateObject['Status'] = PAID_STATUS;
                    } else if (paymentIsInstallment) {
                        feeUpdateDescription = `Setting next due date for ${feeID}`;

                        // Determine the `dayjs` parameters for calculating the next due date
                        const { feeFrequency, paymentDueDate } = recordCollection;
                        const paymentFrequencyKey = frequencyMap.has(feeFrequency) ? feeFrequency : DEFAULT_FREQUENCY;
                        const { unit, num } = frequencyMap.get(paymentFrequencyKey);

                        // Calculate the next due date, and reset the installment notification flag
                        // NOTE: In the event that the due date is returned as `null`, default to the start of today (UTC)
                        const nextDueDate = dayjs(paymentDueDate || dayjs.utc().startOf('day')).add(num, unit);
                        feeUpdateObject['Next Due Date'] = nextDueDate.toISOString();
                        feeUpdateObject['Upcoming Due Installment Fee Notification Sent'] = 'False';
                    }

                    // Update the Fee using the update object
                    await updateFormRecord(feeGUID, FEE, feeUpdateObject, feeUpdateDescription);
                }
            }
        }

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success'; // Don't change this
        outputCollection[1] = `Payments were successfully applied for ${SHOPPING_CART}s (${cartData.length})`;
        outputCollection[2] = {};
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
