/**
 * LibPaymentItemUpdate
 * Category: Workflow
 * Modified: 2026-02-11T16:38:43.68Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: 803734d1-0bce-ef11-82bd-d3a492f2461d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
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
    /*Script Name: LibPaymentItemUpdate
  Customer:      WADNR
  Purpose:       The purpose of this library is to update Payment Item records and its associated Transaction record in a structured way
  Parameters:    Payment Item ID (String, Required) - The record ID of the Payment Item to be updated
                 PaymentItemUpdateObject (Object, Required) - An object that is formatted as a fieldName -> fieldValue map to update one or more Payment Item fields. Only named fields are updated.
                  EX: PaymentItemUpdateObject = {
                        'Related Record ID': 'CART-000000N'
                        'Transaction Amount': '150.45',
                        'Fund': 'NewFundValue'
                      }
                  NOTE: Updating certain Payment Item fields will update the item's associated Transaction fields if the incoming value is truthy and the Transaction is not finalized. Some mappings are here, but a full list can be found in updateTransactionRecord function:
                    *Payment Item -> Transaction*
                    Transaction Amount -> Transaction Amount
                    Date of Transaction -> Transaction Date
                    Fund -> Fund
                    Cost Center -> Cost Center
                    GL Account -> GL Account
                    Fee ID -> Fee ID
                    Individual ID -> Individual ID
                 Transaction Record Description       (String) - Allows updating of 'Transaction Description' field on associated Transaction
                 Transaction Record Related Record ID (String) - Allows updating of 'Related Record Field' field on associated Transaction
                 Transaction Record Category          (String) - Allows updating of 'Transaction Category' field on associated Transaction
                 External Transaction ID              (String) - Allows updating of 'Transaction ID' field on associated Transaction
                 Finalize Transaction Record Status   (String) - Allows updating of 'Status' field on associated Transaction
                 Update Fee Records                   (String) - (True/False) An optional flag that determines whether the processed Fee(s) should be updated with the calculated balance
  Return Array:
                  [0] Status: 'Success', 'Error'
                  [1] Message
                  [2] returnObject: An object with the following possible properties:
                    errorLog (String[]): List of errors logged during process.
                    updatedPaymentItem (Object): Data for the updated Payment Item record. Contains: formID, revisionID
                    updatedTransaction (Object): Data for the updated Transaction record. Contains: formID, revisionID, status
                    calculatedFee (Object): Data for the calculated Fee record. Contains: Fee ID, Fee Amount Assessed, Current Balance, Allow Installment
  Pseudo code:
                  1. Verify that update object has values to update
                  2. Check if Payment Item record is in a non-final status
                  3. Update the Payment Item record with new field values
                  4. Update the item's associated Transaction record with new field values mapped from Payment Item updates or explicitly passed in as a parameter
                  5. Calculate the balance of the Fee associated to the Payment Item

  Date of Dev: 01/08/2025
  Revision Notes:
  01/08/2025 - John Sevilla: Script migrated.
  01/27/2025 - John Sevilla: Updated for new params
  */

    logger.info('Start of the process LibPaymentItemUpdate at ' + Date());

    /****************
  Config Variables
  *****************/
    const errorMessageGuidance = 'Please try again or contact a system administrator if this problem continues.';
    const missingFieldGuidance = 'Please provide a value for the missing field(s).';
    const PaymentItemTemplateID = 'Payment Item';
    const TransactionTemplateID = 'Transaction';
    const UpdateTransactionWebsvcName = 'LibTransactionUpdateTransaction';
    const CalculateFeeBalanceWebsvcName = 'LibFeeCalculateBalance';

    /****************
  Script Variables
  *****************/
    let outputCollection = [];
    let errorLog = [];
    let returnObject = {};

    // vars used for return object
    let UpdatedPaymentItem = null;
    let UpdatedTransaction = null;
    let CalculatedFee = null;

    // stores current state of payment item. all properties will be in lowercase
    let CurrentPaymentItem = null;

    /****************
  Helper Functions
  *****************/
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

    function callExternalWs(webServiceName, webServiceParams, shortDescription = `Run Web Service: ${webServiceName}`) {
        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    try {
        /*********************
    Form Record Variables
    **********************/
        let PaymentItemID = getFieldValueByName('Payment Item ID');
        let PaymentItemUpdateObject = getFieldValueByName('PaymentItemUpdateObject');
        let TransactionDescription = getFieldValueByName('Transaction Record Description', true);
        let TransactionRelatedRecordID = getFieldValueByName('Transaction Record Related Record ID', true);
        let TransactionCategory = getFieldValueByName('Transaction Record Category', true);
        let TransactionRecordExternalID = getFieldValueByName(
            'External Transaction ID', // NOTE: Corresponds to "Transaction ID or Check Number" from Shopping Cart
            true
        );
        let TransactionRecordStatus = getFieldValueByName('Finalize Transaction Record Status', true);
        let UpdateFeeRecords = getFieldValueByName('Update Fee Records', true);
        if (typeof UpdateFeeRecords === 'string' && UpdateFeeRecords.toLowerCase() === 'false') {
            UpdateFeeRecords = false;
        } else if (typeof UpdateFeeRecords !== 'boolean') {
            UpdateFeeRecords = true;
        }

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

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

        /**
         * @param {Object} object
         * @returns {Object} A new object with lowercase keys
         */
        function objectKeysToLowerCase(object) {
            let lowercaseObj = {};
            for (const key in object) {
                if (object.hasOwnProperty(key)) {
                    lowercaseObj[key.toLowerCase()] = object[key];
                }
            }
            return lowercaseObj;
        }

        /**
         * @param {Object} obj
         * @returns {Boolean}
         */
        function isObject(obj) {
            return typeof obj === 'object' && !Array.isArray(obj) && obj !== null;
        }

        async function getFormByFormID(formID, formTemplateID, additionalQueryParams) {
            let queryParams = {
                q: `[instanceName] eq '${formID}'`,
                expand: false,
                ...additionalQueryParams, // adds to/overrides default params
            };

            let getFormsResp = await vvClient.forms.getForms(queryParams, formTemplateID);
            getFormsResp = JSON.parse(getFormsResp);
            let getFormsData = getFormsResp.hasOwnProperty('data') ? getFormsResp.data : null;

            if (getFormsResp.meta.status !== 200) {
                throw new Error(`There was an error when calling getForms on ${formTemplateID}.`);
            }
            if (Array.isArray(getFormsData) === false || getFormsData.length < 1) {
                throw new Error(`Data was not able to be returned when calling getForms on ${formTemplateID}.`);
            }

            return getFormsData[0];
        }

        async function updatePaymentItemRecord() {
            let postFormRevisionResp = await vvClient.forms.postFormRevision(
                null,
                PaymentItemUpdateObject,
                PaymentItemTemplateID,
                CurrentPaymentItem['revisionid']
            );
            let postFormRevisionData = postFormRevisionResp.hasOwnProperty('data') ? postFormRevisionResp.data : null;
            if (postFormRevisionResp.meta.status !== 201) {
                throw new Error(
                    `Unable to update the ${PaymentItemTemplateID} form. ${
                        postFormRevisionResp.hasOwnProperty('meta')
                            ? postFormRevisionResp.meta.statusMsg
                            : postFormRevisionResp.message
                    } ${errorMessageGuidance}`
                );
            }
            if (postFormRevisionData === null) {
                throw new Error(`Data was not returned when calling postFormRevisions.`);
            }

            // Update CurrentPaymentItem with new values in update object
            for (const fieldName in PaymentItemUpdateObject) {
                if (PaymentItemUpdateObject.hasOwnProperty(fieldName)) {
                    CurrentPaymentItem[fieldName] = PaymentItemUpdateObject[fieldName];
                }
            }

            // Delete information in update object
            PaymentItemUpdateObject = null;

            // Set global(s)
            UpdatedPaymentItem = {
                formID: postFormRevisionData.instanceName,
                revisionID: postFormRevisionData.revisionId,
            };

            CurrentPaymentItem['revisionid'] = postFormRevisionData.revisionId;
        }

        async function updateTransactionRecord() {
            const transactionID = CurrentPaymentItem['transaction id'];
            if (!transactionID) {
                throw new Error(
                    `Unable to update Transaction record for Payment Item. Transaction ID does not exist on the Payment Item.`
                );
            }

            const currentTransaction = await getFormByFormID(transactionID, TransactionTemplateID, { expand: true });

            const updateTransactionRecordParams = [
                {
                    name: 'Transaction Record ID',
                    value: currentTransaction.instanceName,
                },

                // fields that will possibly be updated (if field was updated for payment item & transaction not finalized)
                {
                    name: 'Transaction Amount',
                    value: CurrentPaymentItem['transaction amount'] || currentTransaction['transaction Amount'],
                },
                {
                    name: 'Transaction Date',
                    value: CurrentPaymentItem['date of transaction'] || currentTransaction['transaction Date'],
                },
                {
                    name: 'Fund',
                    value: CurrentPaymentItem['fund'] || currentTransaction['fund'],
                },
                {
                    name: 'Cost Center',
                    value: CurrentPaymentItem['cost center'] || currentTransaction['cost Center'],
                },
                {
                    name: 'GL Account',
                    value: CurrentPaymentItem['gl account'] || currentTransaction['gL Account'],
                },
                {
                    name: 'Fee ID',
                    value: CurrentPaymentItem['fee id'] || currentTransaction['fee ID'],
                },
                {
                    name: 'Individual ID',
                    value: CurrentPaymentItem['individual id'] || currentTransaction['individual ID'],
                },

                // fields that will possibly be updated (if field param passed in & transaction not finalized)
                {
                    name: 'Transaction Description',
                    value: TransactionDescription || currentTransaction['transaction Description'],
                },
                {
                    name: 'Related Record ID',
                    value: TransactionRelatedRecordID || currentTransaction['related Record ID'],
                },
                {
                    name: 'Status',
                    value: TransactionRecordStatus || currentTransaction['status'],
                },
                {
                    name: 'Transaction ID', // NOTE: This is not a Transaction record ID
                    value: TransactionRecordExternalID || currentTransaction['transaction ID'],
                },
                {
                    name: 'Transaction Category',
                    value: TransactionCategory || currentTransaction['transaction Category'],
                },
                // fields that will not be updated
                { name: 'Balance Change', value: currentTransaction['balance Change'] },
            ];

            const updateTransactionRecordData = await callExternalWs(
                UpdateTransactionWebsvcName,
                updateTransactionRecordParams
            );

            if (Array.isArray(updateTransactionRecordData[1]) === false || updateTransactionRecordData[1].length < 1) {
                throw new Error(`Unexpected data returned from ${UpdateTransactionWebsvcName}.`);
            }

            const transactionStatus = updateTransactionRecordData[1][0];

            // Set global(s)
            UpdatedTransaction = {
                formID: currentTransaction.instanceName,
                revisionID: currentTransaction.revisionId,
                status: transactionStatus,
            };
        }

        async function calculateFeeRecordBalance() {
            const feeID = CurrentPaymentItem['fee id'];
            const individualID = CurrentPaymentItem['individual id'];
            if (!feeID) {
                throw new Error(
                    `Unable to calculate the Fee record balance. Fee ID does not exist on the Payment Item.`
                );
            }
            if (!individualID) {
                throw new Error(
                    `Unable to calculate the Fee record balance. Individual ID does not exist on the Payment Item.`
                );
            }

            const calculateFeeBalanceParams = [
                { name: 'Fee IDs', value: [feeID] },
                { name: 'Individual ID', value: individualID },
                { name: 'All Business Fees Flag', value: 'False' },
                { name: 'Update Fee Records', value: UpdateFeeRecords ? 'True' : 'False' },
            ];

            const calculateFeeBalanceData = await callExternalWs(
                CalculateFeeBalanceWebsvcName,
                calculateFeeBalanceParams
            );
            if (Array.isArray(calculateFeeBalanceData[2]) === false || calculateFeeBalanceData[2].length < 1) {
                throw new Error(`Unexpected data returned from ${CalculateFeeBalanceWebsvcName}.`);
            }

            // Set global(s)
            CalculatedFee = calculateFeeBalanceData[2][0];
        }

        /****************
    BEGIN ASYNC CODE
    *****************/
        // Step 1. Verify that update object has values to update
        if (isObject(PaymentItemUpdateObject) === false || Object.keys(PaymentItemUpdateObject).length < 1) {
            throw new Error(`Please supply field values into the PaymentItemUpdateObject.`);
        } else {
            PaymentItemUpdateObject = objectKeysToLowerCase(PaymentItemUpdateObject);
        }

        // Step 2. Check if Payment Item record is in a non-final status
        CurrentPaymentItem = await getFormByFormID(PaymentItemID, PaymentItemTemplateID, {
            fields: 'status,individual ID,fee ID,transaction ID',
        });
        CurrentPaymentItem = objectKeysToLowerCase(CurrentPaymentItem);

        // If payment item is finalized, error out
        if (CurrentPaymentItem['status'] !== 'Unpaid') {
            throw new Error(`The Payment Item is finalized and cannot be updated.`);
        }

        // Step 3. Update the Payment Item record with new field values
        await updatePaymentItemRecord();
        returnObject.updatedPaymentItem = UpdatedPaymentItem;

        // Step 4. Update the item's associated Transaction record with new field values mapped from Payment Item updates or explicitly passed in as a parameter
        await updateTransactionRecord();
        returnObject.updatedTransaction = UpdatedTransaction;

        // Step 5. Calculate the balance of the Fee associated to the Payment Item
        await calculateFeeRecordBalance();
        returnObject.calculatedFee = CalculatedFee;

        // Send to client
        let returnMessage = 'LibPaymentItemUpdate has updated the Payment Item record and its Transaction record';
        if (UpdatedTransaction.status === 'Finalized') {
            returnMessage =
                'LibPaymentItemUpdate has updated the Payment Item record and partially updated its Transaction record (is Finalized)';
        }

        outputCollection[0] = 'Success';
        outputCollection[1] = returnMessage;
        outputCollection[2] = returnObject;
    } catch (error) {
        // Add any errors to returnObject
        returnObject.errorLog = errorLog;

        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = 'Error';
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = returnObject;
    } finally {
        response.json(200, outputCollection);
    }
};
