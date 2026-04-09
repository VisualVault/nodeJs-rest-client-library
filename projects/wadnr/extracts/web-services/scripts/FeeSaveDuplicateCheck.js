/**
 * FeeSaveDuplicateCheck
 * Category: Workflow
 * Modified: 2025-02-17T17:54:44.727Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 81e73d85-fddf-ef11-82bf-f990b504e413
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
    /*  
    Script Name:  FeeSaveDuplicateCheck
    Customer:     WADNR
    Purpose:      The purpose of the Save event is to allow a Finance Editor to make changes to a fee and add notes.
    Parameters:   Form ID (String, Required)
                  Individual ID (String, Required)
                  Fee Name (String, Required)
                  Related Record ID (String, Required)
                  Final Amount Due (String, Required)
                  Fee Description (String, Required)
                  Cost Center (String, Required)
                  GL Account (String, Required)
                  Fund (String, Required)
    Return Array:
                  [0] Status: 'Success', 'Error'
                  [1] Message
                  [2] Fee Data: {
                    "Fee ID": "FEE-000000002",
                    "Fee Amount Assessed": 50,
                    "Current Balance": 50,
                    "Allow Installment": "No"
                  }
                  [3] duplicate record object info or null
                  [4] error array or null
    Pseudo code:
                  1. VERIFY that the given Fee is not a duplicate record using `LibFormDuplicateCheck`
                  2. GET the Transaction record associated with the Fee
                  3. IF the Transaction does not exist:
                    a. CREATE the Transaction for the Fee using `LibTransactionCreateTransaction`
                     OTHERWISE it must exist, so:
                    b. UPDATE the Transaction with the Fee's final amount due
                  4. GET the Fee's related unpaid payment item (if it exists)
                  5. IF the payment item should be updated:
                    a. UPDATE the payment item with the new amounts (this library also calls `LibFeeCalculateBalance`) and recalculate the balance of the fee
                     OTHERWISE it should not be updated, so:
                    b. Calculate the current balance of the Fee after creating/updating its Transaction by calling `LibFeeCalculateBalance`
                  6. RETURN data for the newly calculated balance

    Date of Dev:    01/31/2025
    Revision Notes:
    01/31/2025 - John Sevilla: Script migrated and updated for new params
    02/17/2025 - John Sevilla: Fix date populated on transaction
  */
    logger.info('Start of the process FeeSaveDuplicateCheck at ' + Date());

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
    const TRANSACTION = 'Transaction';
    const FEE = 'Fee';
    const PAYMENT_ITEM = 'Payment Item';

    // Web Service Names
    const LibFormDuplicateCheck = 'LibFormDuplicateCheck';
    const LibTransactionCreateTransaction = 'LibTransactionCreateTransaction';
    const LibTransactionUpdateTransaction = 'LibTransactionUpdateTransaction';
    const LibFeeCalculateBalance = 'LibFeeCalculateBalance';
    const LibPaymentItemUpdate = 'LibPaymentItemUpdate';

    const WADNR_TIMEZONE = 'America/Los_Angeles';
    const dateOnlyISOStringFormat = 'YYYY-MM-DD';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */

    /** Stores the response data when calling `LibFormDuplicateCheck` for the given Fee */
    let duplicateCheckReturnObj = null;
    let feeBalanceData = null;

    /** Boolean flag to determine whether a duplicate was found so that the error can be handled
     *  appropriately on the client-side. */
    let errorDuplicate = false;

    // Transaction field values to set when creating/updating a Transaction
    const TRANSACTION_PENDING_STATUS = 'Pending';

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
     * @returns The output collection of the web service response data
     */
    function checkWebServiceRes(vvClientRes, webServiceName) {
        const webServiceData = vvClientRes.data;

        if (webServiceData[0] === 'Error') {
            throw new Error(webServiceData[1]);
        }

        return webServiceData;
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

    /**
     * Get the payment item related to the fee (the single unpaid payment-type payment item)
     * @param {string} feeID
     * @returns {object?} VV getForms data for the payment item (if found)
     */
    async function getRelatedUnpaidPaymentItem(feeID) {
        // Get the payment item related to the fee (the only up payment item)
        const paymentItemRecords = await getFormRecords(
            {
                q: `[Fee ID] eq '${feeID}' and [Transaction Type] = 'Payment' and [Status] = 'Unpaid'`,
                fields: 'Transaction Amount, Item Balance Due',
            },
            PAYMENT_ITEM
        );

        if (paymentItemRecords.length > 1) {
            const paymentItemRecordIDs = paymentItemRecords.map((pIRecord) => pIRecord.instanceName);
            throw new Error(
                `Found more than one unpaid payment-type payment item associated with fee ${feeID}: ${paymentItemRecordIDs.join(', ')}`
            );
        }

        return paymentItemRecords[0];
    }

    /**
     * @param {string|number} transactionAmount - on Payment Item
     * @param {string|number} itemBalanceDue  - on Payment Item
     * @param {string|number} pendingTransactionTotal  - on Fee
     * @returns {boolean}
     */
    function shouldPaymentItemUpdate(transactionAmount, itemBalanceDue, pendingTransactionTotal) {
        const transactionAmountIntVal = currency(transactionAmount).intValue;
        const itemBalanceDueIntVal = currency(itemBalanceDue).intValue;
        const pendingTransactionTotalIntVal = currency(Math.abs(pendingTransactionTotal)).intValue; // absolute value, since what is received from client is likely negative

        return (
            itemBalanceDueIntVal !== pendingTransactionTotalIntVal ||
            transactionAmountIntVal !== pendingTransactionTotalIntVal
        );
    }

    /**
     * @param {string} relatedRecordID - The related record ID of the target Transaction
     * @returns {object?} VV getForms data object for the Transaction record
     */
    async function getTransactionRecordByRelatedRecordID(relatedRecordID) {
        const getTransactionDescription = `Getting ${TRANSACTION} record for '${relatedRecordID}'`;
        const getTransactionParams = {
            q: `[Related Record ID] eq '${relatedRecordID}'`,
            fields: 'id,name',
        };

        const [transactionRecord] = await getFormRecords(getTransactionParams, TRANSACTION, getTransactionDescription);

        return transactionRecord;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get required web service parameters
        const feeID = getFieldValueByName('Form ID');
        const individualID = getFieldValueByName('Individual ID');
        const feeName = getFieldValueByName('Fee Name Text');
        const relatedRecordID = getFieldValueByName('Related Record ID');
        // Get required web service parameters (to create/update Transaction record)
        const finalAmountDue = getFieldValueByName('Final Amount Due');
        const feeDescription = getFieldValueByName('Fee Description');
        const costCenter = getFieldValueByName('Cost Center');
        const glAccount = getFieldValueByName('GL Account');
        const fund = getFieldValueByName('Fund');
        // Get required web service parameter to update related Payment Item + associated Transaction record
        const pendingTransactionTotal = getFieldValueByName('Pending Transaction Total');

        // Check if required parameters were provided
        if (errorLog.length > 0) {
            // NOTE: Specific fields are detailed in the errorLog sent in the response to the client.
            throw new Error(`Please provide a value for the required fields.`);
        }

        // Instantiate the web service manager for each web service to be able to create web service requests
        const { runWebService: checkFormDuplicate } = new WebServiceManager(LibFormDuplicateCheck);
        const { runWebService: createTransaction } = new WebServiceManager(LibTransactionCreateTransaction);
        const { runWebService: updateTransaction } = new WebServiceManager(LibTransactionUpdateTransaction);
        const { runWebService: calculateBalance } = new WebServiceManager(LibFeeCalculateBalance);
        const { runWebService: updatePaymentItem } = new WebServiceManager(LibPaymentItemUpdate);

        // 1. VERIFY that the given Fee is not a duplicate record using `LibFormDuplicateCheck`
        const duplicateRecordParams = [
            {
                name: 'templateId',
                value: FEE,
            },
            {
                name: 'query',
                value: `[Fee Name] eq '${feeName}' AND [Related Record ID] eq '${relatedRecordID}'`,
            },
            {
                name: 'formId',
                value: feeID,
            },
        ];

        // Check for if there are any duplicate Fees in the system by evaluating the return object
        const duplicateCheckData = await checkFormDuplicate(duplicateRecordParams, feeID);

        const duplicateStatus = duplicateCheckData[0];
        duplicateCheckReturnObj = duplicateCheckData[2];

        if (duplicateStatus === 'Duplicate Found') {
            errorDuplicate = true;
            throw new Error('This record is a duplicate.');
        } else if (duplicateStatus !== 'No Duplicate Found' && duplicateStatus !== 'Current Record Match') {
            throw new Error(`Unhandled error occurred while attempting to find a duplicate record for ${feeID}.`);
        }

        // 2. GET the Transaction record associated with the Fee
        const transactionRecord = await getTransactionRecordByRelatedRecordID(feeID);
        const transactionID = transactionRecord?.instanceName;

        // 3. IF the Transaction does not exist:
        let feeTransactionRecordStatus;
        if (!transactionID) {
            // 3a. CREATE the Transaction for the Fee using `LibTransactionCreateTransaction`
            const createTransactionParams = [
                { name: 'Status', value: TRANSACTION_PENDING_STATUS },
                { name: 'Related Record ID', value: feeID },
                { name: 'Individual ID', value: individualID },
                { name: 'Fee ID', value: feeID },
                { name: 'Transaction Category', value: 'Fee Assessed' },
                { name: 'Transaction Description', value: feeDescription },
                { name: 'Transaction Amount', value: finalAmountDue },
                { name: 'Transaction Date', value: currDateStr },
                { name: 'Balance Change', value: 'Increase' },
                { name: 'Cost Center', value: costCenter },
                { name: 'GL Account', value: glAccount },
                { name: 'Fund', value: fund },
            ];

            const createTransactionResp = await createTransaction(createTransactionParams, feeID);
            feeTransactionRecordStatus = TRANSACTION_PENDING_STATUS;
        } else {
            // 3b. UPDATE the Transaction with the Fee's final amount due
            const updateTransactionParams = [
                { name: 'Transaction Record ID', value: transactionID },
                { name: 'Status', value: TRANSACTION_PENDING_STATUS },
                { name: 'Related Record ID', value: feeID },
                { name: 'Individual ID', value: individualID },
                { name: 'Fee ID', value: feeID },
                { name: 'Transaction Amount', value: finalAmountDue },
                { name: 'Transaction Description', value: feeDescription },
                { name: 'Cost Center', value: costCenter },
                { name: 'GL Account', value: glAccount },
                { name: 'Fund', value: fund },
            ];

            const updateTransactionResp = await updateTransaction(updateTransactionParams, feeID);
            feeTransactionRecordStatus = updateTransactionResp[1][0];
        }

        // 4. GET the Fee's related unpaid payment item (if it exists)
        let paymentItemShouldUpdate = false;
        const paymentItemRecord = await getRelatedUnpaidPaymentItem(feeID);
        if (paymentItemRecord) {
            paymentItemShouldUpdate = shouldPaymentItemUpdate(
                paymentItemRecord['transaction Amount'],
                paymentItemRecord['item Balance Due'],
                pendingTransactionTotal
            );
        }

        // 5. IF the payment item should be updated:
        if (paymentItemShouldUpdate) {
            const newItemBalanceDue = currency(Math.abs(pendingTransactionTotal)).value; // absolute value, since what is received from client is likely negative
            // 5a. UPDATE the payment item with the new amounts (this library also calls `LibFeeCalculateBalance`) and recalculate the balance of the fee
            const updatePaymentItemParams = [
                { name: 'Payment Item ID', value: paymentItemRecord.instanceName },
                {
                    name: 'PaymentItemUpdateObject',
                    value: {
                        'Transaction Amount': newItemBalanceDue,
                        'Item Balance Due': newItemBalanceDue,
                    },
                },
                {
                    // NOTE: This must be set to 'False' so that a new revision of the Fee is not created
                    name: 'Update Fee Records',
                    value: 'False',
                },
            ];

            // Call the `LibPaymentItemUpdate` web service to update the given Payment Item
            const updatePaymentItemResp = await updatePaymentItem(
                updatePaymentItemParams,
                paymentItemRecord.instanceName
            );

            // return recalculated fee balance data
            const updatePaymentItemData = updatePaymentItemResp[2];
            feeBalanceData = updatePaymentItemData.calculatedFee;
        } else {
            // 5b. Calculate the current balance of the Fee after creating/updating its Transaction by calling `LibFeeCalculateBalance`
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
                {
                    // NOTE: This must be set to 'False' so that a new revision of the Fee is not created
                    name: 'Update Fee Records',
                    value: 'False',
                },
            ];

            // Destruct the calculated balance data returned from the web service and verify that it was successful
            const calculatedBalanceData = await calculateBalance(calculateBalanceParams, feeID);
            const [balanceCalcStatus, balanceCalcMsg] = calculatedBalanceData;

            if (balanceCalcStatus != 'Success') {
                throw new Error(balanceCalcMsg);
            }

            // return recalculated fee balance data
            [feeBalanceData] = calculatedBalanceData[2];
        }

        // 6. RETURN data for the newly calculated balance
        outputCollection[0] = 'Success';
        outputCollection[1] = 'Successfully performed checks and updates before saving Fee';
        outputCollection[2] = feeBalanceData;
    } catch (error) {
        logger.info(JSON.stringify(`${error} ${errorLog}`));

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = errorDuplicate ? 'Error Duplicate' : 'Error'; //Set error message based on error even so they can be handled client side.
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = null;
        outputCollection[3] = duplicateCheckReturnObj.duplicates;
        outputCollection[4] = errorLog;
    } finally {
        response.json(200, outputCollection);
    }
};
