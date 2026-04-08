/**
 * LibFeeCalculateBalance
 * Category: Workflow
 * Modified: 2025-01-21T15:02:01.367Z by john.sevilla@visualvault.com
 * Script ID: Script Id: f99c3062-06ce-ef11-82bf-a0dcc70b93c8
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const currency = require('currency.js');
const logger = require('../log');

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
    /*   Script Name:   LibFeeCalculateBalance
       Customer:      VisualVault library function.
       Purpose:       The purpose of this process is to take a list of fees, calculate the balances from transaction records and update the balances for each to be the most up-to-date information
       Parameters:    Fee IDs (Array, Required) - List of Fee IDs to query on to calculate current balances
                      Individual ID (String, Required) - The ID of the proponent (Individual) to retrieve Fee data for
                      All Business Fees Flag (String, Required) - (True/False) A flag to determine whether to query all the unpaid fees or fees with balances for a proponent or just the passed in Fee IDs 
                      Update Fee Records (String, Optional) - (True/False) An optional flag that determines whether the processed Fee(s) should be updated with the calculated balance
       Return Array:
                      [0] Status: 'Success', 'Error'
                      [1] Message
                      [2] Fee Data: [
                                        {
                                            "Fee ID": "FEE-000000151",
                                            "Fee GUID": "651632eb-42d7-ef11-aa78-af555556a1b2",
                                            "Fee Amount Assessed": 123.45,
                                            "Current Balance": 0,
                                            "Allow Installment": "No"
                                            "Balance Due": 0
                                            "Pending Transaction Total": -123.45,
                                            "Finalized Transaction Total": 0,
                                            "Total of Unfinalized Transactions": -123.45
                                            "Balance Due calculated from Finalized Transactions": 123.45
                                        },
                                    ]
       Psuedo code: 
                  1. Determine whether to query all unpaid Fees or just the passed in Fees 
                  1a. Query all unpaid fees or fees with a balance greater than zero for a proponent
                  1b. Only calculate passed in fees
                  2. Group transactions by fee for processing
                  3. Call calculateFeeBalance and pass in structured fee object
                  4. Send the array back to the client

       Date of Dev: 01/08/2025
       Last Rev Date: 01/20/2025
       Revision Notes:
       01/08/2025 - John Sevilla: Script migrated.
       01/20/2025 - John Sevilla: Adapted to use Individual ID instead of Provider ID
       */

    logger.info('Start of the process LibFeeCalculateBalance at ' + Date());

    /****************
   Config Variables
  *****************/
    const errorMessageGuidance = 'Please try again or contact a system administrator if this problem continues.';
    const missingFieldGuidance =
        'Please provide a value for the missing field and try again, or contact a system administrator if this problem continues.';
    const FeeTemplateID = 'Fee';
    const queryUnpaidFeesByIDs = 'zWebSvc Find Unpaid Fees By IDs';
    const queryUnpaidIndividualFees = 'zWebSvc Find Unpaid Individual Fees';

    /****************
   Script Variables
  *****************/
    let outputCollection = [];
    let errorLog = [];
    let FeeData = [];
    let allowInstallments;
    let finalFeeAmount;
    let feeRevisionID;
    /** Represents the sum of: `Final Amount Due`, `Pending Transaction Total`, and `Finalized Transaction Total` */
    let balanceDue;
    /** The sum of a Fee's Transactions with a status of 'Pending' that does _NOT_ include the Transaction for the **Fee**
     * - Its value will often be a negative value in most circumstances.
     * - This field value is set for the `Pending Transaction Total` cell field on the **Fee** record.
     */
    let pendingTransactionTotal;
    /** The sum of a Fee's Transactions with a status of 'Finalized' that does _NOT_ include the Transaction for the **Fee**
     * - Its value will often be a negative value in most circumstances.
     * - This field value is set for the `Finalized Transaction Total` cell field on the **Fee** record.
     */
    let finalizedTransactionTotal;
    /** The sum of a Fee's Transactions with a status of 'Pending', excluding the Transaction for the **Fee** */
    let totalUnfinalizedTransactions;
    /** The sum of a Fee's Transactions with a status of 'Finalized', including the Transaction for the **Fee** even if it is 'Pending' */
    let balanceDueFromFinalizedTransaction;
    /** Maps the **Transaction**'s `Balance Change` to an appropriate calculation function using `currency` */
    const calculateTransactionMap = new Map([
        ['Increase', (balance, amount) => balance.add(amount)], // For Transactions with an 'Increase' in balance, we must add transaction amounts to the balance
        ['Decrease', (balance, amount) => balance.subtract(amount)], // For Transaction with a 'Decrease' in balance, we must subtract transaction amounts from the balance
    ]);

    /** **NOTE**: Value that corresponds to the `Transaction Category` of an assessed **Fee**, which is treated as `Finalized` for calculations regardless of its current status */
    const FEE_ASSESSED_CATEGORY = 'Fee Assessed';

    /****************
   Helper Functions
  *****************/
    // Check if field object has a value property and that value is truthy before returning value.
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
     * @param {string} queryName
     * @param {object} sqlParams An object used like a map for sql params (e.g. For @ProviderID in query,
     * sqlParams = { 'ProviderID': 'PROVIDER-00000N' })
     *
     * @returns {object[]} VV query result data objects. May be empty.
     */
    function getCustomQueryDataBySQLParams(queryName, sqlParams) {
        const shortDescription = `Custom Query using SQL Parameters for '${queryName}'`;

        const customQueryData = {};
        if (sqlParams) {
            const sqlParamArr = [];
            for (const parameterName in sqlParams) {
                sqlParamArr.push({
                    parameterName,
                    value: sqlParams[parameterName],
                });
            }
            customQueryData.params = JSON.stringify(sqlParamArr);
        }

        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, customQueryData)
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

    async function calculateFeeBalance(feeObj, updateFeeRecords) {
        for (const feeArr of Object.entries(feeObj)) {
            let [feeID, fees] = feeArr;
            // Initialize all of the balance objects to `0`
            totalUnfinalizedTransactions = balanceDueFromFinalizedTransaction = currency(0);

            // Initialize balance objects for Pending/Finalized transaction totals
            pendingTransactionTotal = finalizedTransactionTotal = currency(0);

            // Initialize the variable to store the transaction amount of transaction categorized as 'Fee Assessed'
            // NOTE: The Transaction record labeled as 'Fee Assessed' is the record that represents the Fee itself
            let transactionAmountAssessed = null;

            // For each transaction related to the `fees` collection, calculate the balance
            for (let transaction of fees) {
                // Get Fee/Transaction Properties and set to global variables
                feeRevisionID = transaction['dhid'];
                finalFeeAmount = transaction['final Amount Due'];
                allowInstallments = transaction['allow Installments'];

                const {
                    ['transaction Status']: transactionStatus,
                    ['transaction Amount']: transactionAmount,
                    ['transaction Category']: transactionCategory,
                    ['balance Change']: balanceChange,
                } = transaction;

                // Check the Transaction record's status and make sure that the transaction amount is not falsy
                if (transactionStatus !== 'Rejected' && transactionAmount) {
                    // Get the currency calculation function corresponding to the Transaction's balance change (Increase/Decrease)
                    const calculateBal = calculateTransactionMap.get(balanceChange);

                    // Calculate the corresponding transaction amount based on its status
                    if (transactionStatus == 'Pending' && transactionCategory !== FEE_ASSESSED_CATEGORY) {
                        totalUnfinalizedTransactions = calculateBal(totalUnfinalizedTransactions, transactionAmount);
                    } else if (transactionStatus == 'Finalized' || transactionCategory === FEE_ASSESSED_CATEGORY) {
                        balanceDueFromFinalizedTransaction = calculateBal(
                            balanceDueFromFinalizedTransaction,
                            transactionAmount
                        );
                    }

                    // Determine if this is the Transaction for the Fee Assessed, and set its transaction amount if so
                    if (transactionCategory === FEE_ASSESSED_CATEGORY) {
                        transactionAmountAssessed = transactionAmount;
                    }

                    // For any Transactions that do not correspond to the Fee, calculate the Pending/Finalized Transaction Total
                    // NOTE: In most circumstances, these values will be a negative number representing the decrease of the balance owed
                    if (transactionCategory !== FEE_ASSESSED_CATEGORY) {
                        if (transactionStatus == 'Pending') {
                            pendingTransactionTotal = calculateBal(pendingTransactionTotal, transactionAmount);
                        } else if (transactionStatus == 'Finalized') {
                            finalizedTransactionTotal = calculateBal(finalizedTransactionTotal, transactionAmount);
                        }
                    }
                }
            }

            // Determine the final amount due for the Fee based on whether the Transaction for the Fee exists
            // NOTE: `finalFeeAmount` corresponds to the "Final Amount Due" field on the Fee, and is the default for when a Transaction record has not been created
            const finalAmountDue = currency(transactionAmountAssessed || finalFeeAmount);

            // Calculate the balance due (current balance) by summing: Final Amount Due, Pending Transaction Total, and Finalized Transaction Total
            balanceDue = finalAmountDue.add(pendingTransactionTotal).add(finalizedTransactionTotal).value;

            // Get the determined currency values from the balance variables
            pendingTransactionTotal = pendingTransactionTotal.value;
            finalizedTransactionTotal = finalizedTransactionTotal.value;
            totalUnfinalizedTransactions = totalUnfinalizedTransactions.value;
            balanceDueFromFinalizedTransaction = balanceDueFromFinalizedTransaction.value;
            // NOTE: If no transactions are found, then the balance due is the Final Amount Due on the fee record
            let finalCurrentBalance = fees.length === 0 ? finalFeeAmount : balanceDue;

            // Evaluate whether we need to update the Fee with the final balance
            if (updateFeeRecords) {
                const updatedFeeFields = {
                    'Final Amount Due': finalAmountDue.value,
                    'Current Balance': finalCurrentBalance,
                    'Pending Transaction Total': pendingTransactionTotal,
                    'Finalized Transaction Total': finalizedTransactionTotal,
                };

                const updatedFeeRecord = await updateFormRecord(updatedFeeFields, FeeTemplateID, feeRevisionID);
                feeRevisionID = updatedFeeRecord.revisionId; // update GUID
            }

            // push the updated fee into Fee Data array
            FeeData.push({
                'Fee ID': feeID,
                'Fee GUID': feeRevisionID,
                'Fee Amount Assessed': finalAmountDue,
                'Current Balance': finalCurrentBalance,
                'Allow Installment': allowInstallments,
                'Balance Due': balanceDue,
                // Transaction Totals (Pending/Finalized)
                'Pending Transaction Total': pendingTransactionTotal,
                'Finalized Transaction Total': finalizedTransactionTotal,
                // Individual totals for unfinalized/finalized transactions
                'Total of Unfinalized Transactions': totalUnfinalizedTransactions,
                'Balance Due calculated from Finalized Transactions': balanceDueFromFinalizedTransaction,
            });
        }
    }

    try {
        /*********************
     Form Record Variables
    **********************/
        let FeeIDs = getFieldValueByName('Fee IDs');
        let IndividualID = getFieldValueByName('Individual ID');
        let AllBusinessFees = String(getFieldValueByName('All Business Fees Flag')).toLowerCase() === 'true';
        let UpdateFeeRecords = String(getFieldValueByName('Update Fee Records', true)).toLowerCase() === 'true';

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        if (AllBusinessFees === false && (FeeIDs.length === 0 || FeeIDs[0] === '')) {
            errorLog.push('Fee IDs');
            throw new Error(`${missingFieldGuidance}`);
        }

        /****************
     BEGIN ASYNC CODE
    *****************/
        // Step 1. Determine whether to query all unpaid Fees or just the passed in Fees
        let unpaidFees;
        if (AllBusinessFees || FeeIDs.length > 10) {
            // Step 1a. Query all unpaid fees or fees with a balance greater than zero for a proponent
            unpaidFees = await getCustomQueryDataBySQLParams(queryUnpaidIndividualFees, {
                IndividualID: IndividualID,
            });
        } else {
            // Step 1b. Only calculate passed in fees
            unpaidFees = await getCustomQueryDataBySQLParams(queryUnpaidFeesByIDs, {
                feeIDs: FeeIDs.join(','),
            });
        }

        //Step 2. Group transactions by fee for processing
        let feeObj = {};
        for (let fee of unpaidFees) {
            if (!feeObj[fee['dhDocID']]) {
                feeObj[fee['dhDocID']] = [fee];
            } else {
                feeObj[fee['dhDocID']].push(fee);
            }
        }

        //Step 3. Call calculateFeeBalance and pass in structured fee object
        await calculateFeeBalance(feeObj, UpdateFeeRecords);

        // Step 4. Send the array back to the client
        outputCollection[0] = 'Success';
        outputCollection[1] = 'LibFeeCalculateBalance returned successfully';
        outputCollection[2] = FeeData;
    } catch (error) {
        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = 'Error';
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = null;
        outputCollection[3] = errorLog;
    } finally {
        response.json(200, outputCollection);
    }
};
