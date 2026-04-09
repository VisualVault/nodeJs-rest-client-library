/**
 * zzzLibShoppingCartHandleCartsRoss
 * Category: Workflow
 * Modified: 2025-06-03T20:40:00.593Z by moises.savelli@visualvault.com
 * Script ID: Script Id: b1c06a6f-af10-f011-82d2-d3e905652a41
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const currency = require('currency.js');
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

module.exports.main = async function (ffCollection, vvClient, response) {
    /*Script Name:	LibShoppingCartHandleCarts
    Customer:       WADNR
    Purpose:        Processes Shopping Cart(s) for the Individual to assign outstanding Fees to their corresponding Shopping Cart
                    and create/update Payment Items for Fees as needed. Able to process either all Shopping Carts for an Individual
                    or a specific Shopping Cart by providing a valid Shopping Cart ID.

    Parameters:     Individual ID         (String, Required) - The ID of the Individual to create a Shopping Cart for
                    Shopping Cart ID    (String, Optional) - The ID of the specific Shopping Cart to process if provided

    Return Array:   
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: (Array) Data objects for each Shopping Cart (Instance of `ShoppingCart`)
    Pseudo code:   
                    1. GET the Individual's unpaid Shopping Cart(s)
                    2. DETERMINE the collection type of each Shopping Cart returned
                    3. GET outstanding Fees for the Individual based on criteria
                    4. FOR each of the outstanding Fees:
                        a. DETERMINE their collection type by their properties
                        b. IF a Shopping Cart exists for their collection type:
                            i.  ADD the Fee to its corresponding Shopping Cart
                            OTHERWISE IF no Shopping Cart ID was provided:
                            i.  CREATE a new Shopping Cart for the Fee
                            ii. ADD the Fee to the newly created Shopping Cart
                    5. FOR each Fee of Shopping Cart(s) with associated Fees:
                        a. CALCULATE the balance of the Fee
                        b. IF the unpaid Fee does not have a related Payment Item:
                            i.  CREATE the Payment Item for the Fee
                        c. OTHERWISE 
                            i.  DETERMINE the action(s) to perform for the Payment Item
                            ii. UPDATE the Fee's Payment Item's and Shopping Cart if necessary
                    6. RETURN an array containing the Shopping Cart(s) processed
  
    Date of Dev: 01/13/2025
    Last Rev Date: 01/24/2025
    Revision Notes:
    01/13/2025 - John Sevilla: Script migrated.
    01/24/2025 - John Sevilla: Updated for new params
    */

    logger.info('Start of the process LibShoppingCartHandleCarts at ' + Date());

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

    /** **NOTE**: Number of days for an installment payment to be related to a Shopping Cart */
    const INSTALLMENT_TIMEFRAME = 5;

    // Form Template Names
    const SHOPPING_CART = 'zShoppingCartRoss';
    const FEE = 'Fee';

    // Web Service Names
    const LibShoppingCartCreate = 'LibShoppingCartCreate';
    const LibPaymentItemCreate = 'LibPaymentItemCreate';
    const LibPaymentItemUpdate = 'LibPaymentItemUpdate';
    const LibFeeCalculateBalance = 'LibFeeCalculateBalance';

    // Custom Query Names
    const GetOutstandingFeesByIndividualID = 'zWebSvc Get Outstanding Fees By Individual ID';

    const WADNR_TIMEZONE = 'America/Los_Angeles';
    const dateOnlyISOStringFormat = 'YYYY-MM-DD';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */

    // Payment Collection Types (Used to classify Shopping Cart/Fee)
    const PAY_BY_CHECK = 'PayByCheck';
    const CUSTOMER_PAYS_CCTP = 'CustomerPaysCCTP';
    const AGENCY_PAYS_CCTP = 'AgencyPaysCCTP';

    // Payment Cart Relation States (Used to determine action(s) for Payment Item)
    /** Signifies that the Payment Item is currently related to an active Shopping Cart */
    const RELATED_STATE = 'RELATED';
    /** Signifies that the Payment Item was unrelated (removed) from an active Shopping Cart */
    const UNRELATED_STATE = 'UNRELATED';
    /** Signifies that the _Payment Item_ must be related to a new _Shopping Cart_ for any of the following reasons:
     *  1. Previously removed from a _Shopping Cart_ that has since been paid, and therefore needs to be reassigned.
     *  2. Currently unrelated from a _Shopping Cart_ because it was removed and then added back to an active _Shopping Cart_.
     *  3. A record for the _Payment Item_ does not currently exist for the outstanding _Fee_ (e.g., possibly due to an unhandled error during its creation).
     */
    const FLOATING_STATE = 'FLOATING';

    /** **NOTE**: Classifies Shopping Cart as part of a collection based on its `Payment Collection Type` */
    const shoppingCartCollections = new Map();

    /** **NOTE**: Stores the data for the Shopping Cart for when `Shopping Cart ID` is provided */
    var managedShoppingCart = {};

    const currDateStr = dayjs().tz(WADNR_TIMEZONE).startOf('day').format(dateOnlyISOStringFormat);

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
                        `${shortDescription} returned an error. Please, check the called Web Service. Status Description: ${vvClientRes.data[1]}.`
                    );
                }
            }
        }
        return vvClientRes;
    }

    /**
     *
     * @param {Object} vvClientRes - Parsed response object from the API call
     * @param {String} webServiceName - Name of the executed web service to be evaluated
     * @returns The third entry in the `data` property of the response corresponding to the actual response data
     */
    function checkWebServiceRes(vvClientRes, webServiceName) {
        const [status, statusMsg, data] = vvClientRes.data;

        if (status === 'Error') {
            throw new Error(statusMsg);
        } else if (status !== 'Success') {
            throw new Error(`The call to ${webServiceName} returned with an unhandled error.`);
        }

        return data;
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
                .then((res) => checkWebServiceRes(res, this.webServiceName));
        };
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

    function getCustomQueryData(queryName, customQueryParams, shortDescription = `Custom Query for '${queryName}'`) {
        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, customQueryParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function determineFeeCollectionKey(onlyPaidByCheck, customerPaysCCTP) {
        // Determine the Fee's collection key by combining its collection type(s)
        let collectionKey = '';

        if (onlyPaidByCheck) {
            // Payments are only allowed via check based on the client's policies
            collectionKey += PAY_BY_CHECK;
        } else if (customerPaysCCTP) {
            // Customer must pay credit card processing fee for virtual transactions
            collectionKey += CUSTOMER_PAYS_CCTP;
        } else {
            // Agency (state staff) absorbs the credit card processing fees for virtual transactions
            collectionKey += AGENCY_PAYS_CCTP;
        }

        return collectionKey;
    }

    function determinePaymentItemTransactionAmount(relatedFeeData, finalizedPaymentOwed) {
        // Get the Transaction Amount for the Fee's related Payment Item
        let { paymentTransactionAmount } = relatedFeeData;

        const isInstallment = relatedFeeData['allow Installments'] == 'Yes';
        const feeMinimumPayment = currency(relatedFeeData['minimum Payment']).value;
        paymentTransactionAmount = currency(paymentTransactionAmount).value;

        if (isInstallment) {
            // Check that the Fee's next due date is within the configured timeframe
            const nextDueDate = dayjs(relatedFeeData['next Due Date']);
            const futureDate = dayjs().add(INSTALLMENT_TIMEFRAME, 'day');
            if (nextDueDate.isBefore(futureDate, 'day')) {
                // Determine whether or not the Payment Item's Transaction Amount is valid (satisfies the remaining balance, and is within bounds)
                let transactionAmountIsValid = false;
                if (paymentTransactionAmount < feeMinimumPayment) {
                    // Transaction Amount is less than the minimum payment, so evaluate if it satisfies the remaining balance
                    transactionAmountIsValid = paymentTransactionAmount === finalizedPaymentOwed;
                } else {
                    // Transaction Amount is greater than or equal to the minimum payment, so evaluate if it within bounds of the final payment owed
                    transactionAmountIsValid = paymentTransactionAmount <= finalizedPaymentOwed;
                }

                if (transactionAmountIsValid) {
                    // The current Transaction Amount is valid for the Payment Item since it satisfies the balance due
                    return paymentTransactionAmount;
                } else {
                    // An invalid transaction amount was provided for the installment item, so set as minimum payment or the finalized payment owed if it less
                    return feeMinimumPayment < finalizedPaymentOwed ? feeMinimumPayment : finalizedPaymentOwed;
                }
            } else {
                // The Fee is outside of the timeframe for the due date, so return its Payment Item's current transaction amount
                return paymentTransactionAmount;
            }
        } else if (paymentTransactionAmount !== finalizedPaymentOwed) {
            // Return the finalized payment amount due of the Fee since the values do not match
            return finalizedPaymentOwed;
        } else {
            // There is no need to update the Transaction Amount, so return its current amount
            return paymentTransactionAmount;
        }
    }

    /**
     * @param {string} individualID
     * @param {string?} shoppingCartID - If supplied, will only return data on the specified shopping cart
     * @returns {object[]} VV getForms data objects for the shopping carts
     */
    async function getUnpaidShoppingCartRecordsByID(individualID, shoppingCartID) {
        const SHOPPING_CART_FIELDS = ['id', 'name', '[isPayByCheck]', '[isCCTPPaidByCustomer]'];

        let unpaidShoppingCartsQuery;
        if (shoppingCartID) {
            unpaidShoppingCartsQuery = `[instanceName] eq '${shoppingCartID}' AND [Status] eq 'Unpaid'`;
        } else {
            unpaidShoppingCartsQuery = `[Individual ID] eq '${individualID}' AND [Status] eq 'Unpaid'`;
        }

        const unpaidShoppingCartsDesc =
            `Getting unpaid ${SHOPPING_CART.toLowerCase()}s for ${individualID}` +
            (shoppingCartID ? ` by '${shoppingCartID}'` : '');

        const unpaidShoppingCartRecords = await getFormRecords(
            {
                q: unpaidShoppingCartsQuery,
                fields: SHOPPING_CART_FIELDS.join(','),
            },
            SHOPPING_CART,
            unpaidShoppingCartsDesc
        );

        // Verify that a Shopping Cart was returned if Shopping Cart ID was provided
        if (shoppingCartID && unpaidShoppingCartRecords.length === 0) {
            throw new Error(`No unpaid ${SHOPPING_CART} could be found for ${individualID} by '${shoppingCartID}'`);
        }

        return unpaidShoppingCartRecords;
    }

    /**
     * Takes any value and attempts to parse it as a boolean string (case-insensitive), returning true if parsed as 'true'
     * @param {*} value
     * @returns {boolean}
     */
    function getBoolStrValue(value) {
        return String(value).toLowerCase() === 'true';
    }

    class ShoppingCart {
        constructor(shoppingCartID, shoppingCartGUID, paidOnlyByCheck, customerPaysCCTP) {
            this.id = shoppingCartID;
            this.guid = shoppingCartGUID;
            this.isPaidByCheck = paidOnlyByCheck;
            this.customerPaysCCTP = customerPaysCCTP;
            this.collectionType = paidOnlyByCheck
                ? PAY_BY_CHECK
                : customerPaysCCTP
                  ? CUSTOMER_PAYS_CCTP
                  : AGENCY_PAYS_CCTP;
            this.relatedFees = [];
        }

        // Define Getters
        get key() {
            return this.collectionType;
        }
        get fees() {
            return this.relatedFees;
        }

        // Shopping Cart Methods
        addFee = (feeID) => {
            this.relatedFees.push(feeID);
        };
        hasFees = () => {
            return this.relatedFees.length > 0;
        };
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get required web service parameters
        const individualID = getFieldValueByName('Individual ID');
        // Get optional web service parameters
        const shoppingCartID = getFieldValueByName('Shopping Cart ID', true);

        // Check if required parameters were provided
        if (!individualID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // Instantiate the web service manager for each web service to be able to create web service requests
        const { runWebService: createShoppingCart } = new WebServiceManager(LibShoppingCartCreate);
        const { runWebService: createPaymentItem } = new WebServiceManager(LibPaymentItemCreate);
        const { runWebService: updatePaymentItem } = new WebServiceManager(LibPaymentItemUpdate);
        const { runWebService: calculateBalance } = new WebServiceManager(LibFeeCalculateBalance);

        // Get any unpaid Shopping Cart(s) for the Individual, or a specific Shopping Cart if its ID has been provided
        const unpaidShoppingCartRecords = await getUnpaidShoppingCartRecordsByID(individualID, shoppingCartID);

        // Iterate over the returned unpaid Shopping Carts, and instantiate them to add to their respective collection
        for (let unpaidShoppingCart of unpaidShoppingCartRecords) {
            // Get Shopping Cart properties
            let {
                ['instanceName']: cartID,
                ['revisionId']: cartGUID,
                // Checkbox Fields
                ['isPayByCheck']: isPayByCheck,
                ['isCCTPPaidByCustomer']: isCCTPPaidByCustomer,
            } = unpaidShoppingCart;

            // Evaluate the checkbox fields values as booleans
            isPayByCheck = getBoolStrValue(isPayByCheck);
            isCCTPPaidByCustomer = getBoolStrValue(isCCTPPaidByCustomer);

            // Instantiate the shopping cart object and add it to its collection by its key value
            const shoppingCart = new ShoppingCart(cartID, cartGUID, isPayByCheck, isCCTPPaidByCustomer);
            shoppingCartCollections.set(shoppingCart.key, shoppingCart);
        }

        // If the Shopping Cart ID was provided set the managed Shopping Cart for future use
        if (shoppingCartID) {
            // Get the Shopping Cart data by getting the first (and only) element of the map
            const [shoppingCart] = shoppingCartCollections.values();
            managedShoppingCart = shoppingCart;
        }

        // Build the query parameter to only get Fees that are either: not installments, or where the next payment is within the timeframe
        const timeframeDate = dayjs()
            .tz(WADNR_TIMEZONE)
            .startOf('day')
            .add(INSTALLMENT_TIMEFRAME, 'day')
            .format(dateOnlyISOStringFormat);

        // Define the query parameters to search for any outstanding Fees for the Individual
        const queryDescription = `Getting outstanding ${FEE}s for ${individualID}`;
        const paymentQueryParams = {
            params: JSON.stringify([
                {
                    parameterName: 'individualID',
                    value: individualID,
                },
                {
                    parameterName: 'timeframeDate',
                    value: timeframeDate,
                },
            ]),
        };

        // Add filter conditions if the Shopping Cart ID was provided to exclude Fees that do not match its criteria
        if (shoppingCartID) {
            // Get the Shopping Cart's properties from the global object
            const { isPaidByCheck, customerPaysCCTP } = managedShoppingCart;

            const filterConditions = [
                `onlyPayByCheck eq ${Number(isPaidByCheck)}`,
                `customerPaysCCTP eq ${Number(customerPaysCCTP)}`,
            ];
            paymentQueryParams.q = `(${filterConditions.join(' AND ')})`;
        }

        // Get the outstanding fees (unpaid Fees, including those for Payment Items removed from Paid Shopping Carts) for the Individual
        const outstandingFeeData = await getCustomQueryData(
            GetOutstandingFeesByIndividualID,
            paymentQueryParams,
            queryDescription
        );

        // Organize the returned Fees into collections depending on how their payment can be fulfilled
        const feeMap = new Map();
        for (let feeData of outstandingFeeData) {
            // Get Fee properties and related record information
            let {
                feeID,
                onlyPayByCheck,
                customerPaysCCTP,
                ...remainingFeeData // NOTE: Can include related record data (Payment Item and Shopping Cart GUIDs) if they exist
            } = feeData;

            // Convert nums to bool
            onlyPayByCheck = Boolean(onlyPayByCheck);
            customerPaysCCTP = Boolean(customerPaysCCTP);

            // Build the collection key
            let collectionKey = determineFeeCollectionKey(onlyPayByCheck, customerPaysCCTP);

            // Map this Fee and include the data object for its related records (Payment Item, Shopping Cart, etc)
            // NOTE: The values returned may be `null`, which indicates that a given record is not related to this Fee
            feeMap.set(feeID, remainingFeeData);

            // Check if a Shopping Cart exists that can be associated with this Fee, and otherwise create one if Shopping Cart ID was not provided
            // NOTE: If Shopping Cart ID was provided, then we only want to handle Fees associated with that cart
            if (shoppingCartCollections.has(collectionKey)) {
                // Get the Shopping Cart object to add the current Fee
                const shoppingCart = shoppingCartCollections.get(collectionKey);
                shoppingCart.addFee(feeID);
            } else if (!shoppingCartID) {
                // Build the Shopping Cart create object
                const createCartParams = [
                    {
                        name: 'Individual ID',
                        value: individualID,
                    },
                    {
                        name: 'isPayByCheck',
                        value: onlyPayByCheck,
                    },
                    {
                        name: 'isCCTPPaidByCustomer',
                        value: customerPaysCCTP,
                    },
                ];

                // Create the Shopping Cart using `LibShoppingCartCreate`, and instantiate it as a `ShoppingCart` object
                const createdCartData = await createShoppingCart(createCartParams, individualID);
                const newShoppingCart = new ShoppingCart(
                    createdCartData.shoppingCartFormID,
                    createdCartData.shoppingCartGUID,
                    onlyPayByCheck,
                    customerPaysCCTP
                );

                // Add the current fee to the created Shopping Cart, and then create a new entry in the collection for it
                newShoppingCart.addFee(feeID);
                shoppingCartCollections.set(collectionKey, newShoppingCart);
            }
        }

        // For each of the Individual's unpaid Shopping Carts, determine if their outstanding Fees have a balance
        // NOTE: A balance means we may need to create/update record(s) related to the Fee
        for (let shoppingCart of shoppingCartCollections.values()) {
            // Determine if the current Shopping Cart has any Fees to calculate
            if (shoppingCart.hasFees())
                for (let feeID of shoppingCart.fees) {
                    // Calculate the current balance of the Fee using `LibFeeCalculateBalance`
                    const calculateBalanceParams = [
                        {
                            name: 'Fee IDs',
                            value: [feeID],
                        },
                        {
                            name: 'Individual ID',
                            value: individualID,
                        },
                        {
                            name: 'All Business Fees Flag',
                            value: 'False',
                        },
                    ];

                    // Evaluate the calculated current balance returned from the web service and overwrite the flag if it not already true
                    const [calculatedBalanceData] = await calculateBalance(calculateBalanceParams, feeID);

                    // Determine currency values for: Current Balance and Finalized Payment Owed
                    const feeCurrentBalance = currency(calculatedBalanceData?.['Current Balance']).value;
                    const finalizedPaymentOwed = currency(
                        calculatedBalanceData?.['Balance Due calculated from Finalized Transactions']
                    ).value;

                    // Get Fee details from its Map, and determine the currency value for the Transaction Amount of the related Payment Item
                    let {
                        paymentItemID,
                        paymentItemGUID,
                        paymentRelatedRecordID,
                        paymentCartRelation,
                        cartRemovedID,
                        cartRemovedGUID,
                        ...remainingFeeData
                    } = feeMap.get(feeID);

                    let paymentTransactionAmount = currency(remainingFeeData.paymentTransactionAmount).value;

                    // Evaluate if the Fee has a balance due, and whether or not the Payment Item needs to be related to a Shopping Cart
                    const feeHasBalance = Math.abs(feeCurrentBalance) > 0;
                    const paymentItemIsFloating = paymentCartRelation == FLOATING_STATE;

                    // Check whether we need to create a Payment Item for the Fee
                    if (!paymentItemGUID && paymentItemIsFloating && feeHasBalance) {
                        // No Payment Item has been created for this Fee, so determine its Transaction Amount and create its record using Fee information
                        paymentTransactionAmount = determinePaymentItemTransactionAmount(
                            remainingFeeData,
                            finalizedPaymentOwed
                        );

                        // Evaluate whether the Payment is part of an installment
                        const isInstallment = remainingFeeData['allow Installments'] == 'Yes';

                        const paymentItemCreateObj = {
                            // Identifiers
                            'Individual ID': individualID,
                            'Related Record ID': shoppingCart.id,
                            'Fee ID': feeID,
                            // Transaction Information
                            'Transaction Type': 'Payment',
                            'Transaction Amount': paymentTransactionAmount,
                            'Date of Transaction': currDateStr,
                            // Miscellaneous
                            Fund: remainingFeeData['fund'],
                            'Cost Center': remainingFeeData['cost Center'],
                            'GL Account': remainingFeeData['gL Account'],
                            Refundable: remainingFeeData['refundable'],
                            'Can Only Accept Checks': remainingFeeData['accept Checks'],
                            'Item Balance Due': paymentTransactionAmount,
                            'Installment Payment Item': isInstallment ? 'True' : 'False', // lib expects bool string
                            'Payment Method': shoppingCart.isPaidByCheck ? 'Check' : 'Credit Card',

                            // Related Transaction Record Data
                            'Transaction Record Description': `Payment for "${remainingFeeData['fee Name']}"`,
                            'Transaction Record Balance Change': 'Decrease',
                            'Transaction Record Status': 'Pending',
                        };

                        const createPaymentItemParams = [
                            { name: 'PaymentItemParamObjects', value: [paymentItemCreateObj] },
                        ];

                        const createdPaymentItemRespData = await createPaymentItem(createPaymentItemParams, feeID);
                        const createdPaymentItemData =
                            createdPaymentItemRespData.paymentItemReturnObjects[0].createdPaymentItem;

                        // Set Payment Item ID and GUID from the values returned from the web service (LibPaymentItemCreate)
                        paymentItemID = createdPaymentItemData.formID;
                        paymentItemGUID = createdPaymentItemData.revisionID;
                        paymentRelatedRecordID = shoppingCart.id; // NOTE: We also set this variable to prevent requesting to relate it again, which throws an error
                    }

                    // Create a list of requests to fulfil based on the conditions of the Fee and its related Payment item
                    const requestList = [];
                    const paymentUpdateObj = {};

                    // Check whether we need to unrelate the Payment Item from a previous Shopping Cart
                    if (paymentItemGUID && paymentItemIsFloating && cartRemovedGUID) {
                        // The Payment Item exists for the Fee, but it is currently related to a Shopping Cart which was paid which needs to be unrelated
                        const unrelatePaymentItemReq = vvClient.forms
                            .unrelateForm(cartRemovedGUID, paymentItemGUID)
                            .then((res) => parseRes(res))
                            .then((res) =>
                                checkMetaAndStatus(res, `Unrelating ${paymentItemID} from ${cartRemovedID}.`)
                            );

                        requestList.push(unrelatePaymentItemReq);
                    }

                    // Check whether we need to relate the Payment Item to the this Shopping Cart
                    if (
                        paymentItemGUID &&
                        paymentCartRelation != RELATED_STATE &&
                        paymentCartRelation != UNRELATED_STATE &&
                        paymentRelatedRecordID != shoppingCart.id
                    ) {
                        // Relate the Payment Item to the current Shopping Cart by their revision IDs
                        const relatePaymentItemReq = vvClient.forms
                            .relateForm(shoppingCart.guid, paymentItemGUID)
                            .then((res) => parseRes(res))
                            .then((res) =>
                                checkMetaAndStatus(res, `Relating ${paymentItemID} to ${shoppingCart.id}.`, 404)
                            );

                        requestList.push(relatePaymentItemReq);

                        // Set the update object's properties for updating the Payment Item
                        paymentUpdateObj['Related Record ID'] = shoppingCart.id;
                        paymentUpdateObj['Shopping Cart Removed ID'] = '';
                    }

                    // Determine the Payment Item's transaction amount and update the record if there is a remaining balance
                    if (feeHasBalance) {
                        const newTransactionAmount = determinePaymentItemTransactionAmount(
                            remainingFeeData,
                            finalizedPaymentOwed
                        );

                        if (newTransactionAmount != paymentTransactionAmount) {
                            // Only update the Payment Item's Transaction Amount if it differs from the one just calculated
                            // NOTE: This is done for performance reasons; to avoid updating the record if it is not necessary
                            paymentUpdateObj['Transaction Amount'] = newTransactionAmount;
                        }
                    }

                    // Create the call to `LibPaymentItemUpdate` only if the update object has defined properties
                    if (Object.keys(paymentUpdateObj).length > 0) {
                        const updatePaymentItemParams = [
                            {
                                name: 'Payment Item ID',
                                value: paymentItemID,
                            },
                            {
                                name: 'PaymentItemUpdateObject',
                                value: paymentUpdateObj,
                            },
                        ];

                        const updatePaymentItemReq = updatePaymentItem(updatePaymentItemParams, paymentItemID);
                        requestList.push(updatePaymentItemReq);
                    }

                    // Wait for requests to complete successfully
                    await Promise.all(requestList);
                }
            else {
                // No Fees to evaluate, so continue to the next Shopping Cart
                continue;
            }
        }

        // Build the data array depending on whether or not the Shopping Cart ID was provided
        let handledCartsData = [];
        if (shoppingCartID) {
            // Return the managed Shopping Cart object found earlier in the process, contained in an array
            handledCartsData = [managedShoppingCart];
        } else {
            // Set as the values for the Shopping Cart collection map
            handledCartsData = Array.from(shoppingCartCollections.values());
        }

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success';
        outputCollection[1] = 'LibShoppingCartHandleCarts returned successfully.';
        outputCollection[2] = handledCartsData;
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
        response.json(200, outputCollection);
    }
};
