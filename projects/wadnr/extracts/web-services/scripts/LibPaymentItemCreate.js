/**
 * LibPaymentItemCreate
 * Category: Workflow
 * Modified: 2025-02-17T17:39:35.79Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 60231d2a-83d2-ef11-82c1-f717fbb433ff
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
    /*Script Name: LibPaymentItemCreate
  Customer:      WADNR
  Purpose:       The purpose of this library is to create Payment Item records and associated children records in a structured way.
  Parameters:    PaymentItemParamObjects (Object[], Required) - An array of objects holding the parameters for each Payment Item. Properties include:
                    Individual ID (String, Required) - The record ID of the Individual
                    Fee ID (String, Required) - The record ID of the associated Fee
                    Related Record ID (String, Required) - The record ID of the associated form record. Typically a shopping cart or refund form ID.
                    Transaction Type (String, Required) - The Transaction Type field of the Payment Item form. 
                      The following fields are required if type = "Payment":
                        Payment Method (String, Required*) - The Payment Method field of the Payment Item form.
                        Item Balance Due (String, Required*) - The Item Balance Due field of the Payment Item form.
                        Installment Payment Item (String, Required*) - The Installment Payment Item field of the Payment Item form.
                      The following fields are required if type = "Refund":
                        Refund Reason (String, Required*) - The Refund Reason field of the Payment Item form.
                        Date of Original Transaction (String, Required*) - The Date of Original Transaction field of the Payment Item form. Expects date in ISO 8601 format.
                        Original Transaction Amount (String, Required*) - The Original Transaction Amount field of the Payment Item form.
                    Payment Method (String, Required) - The Payment Method field of the Payment Item form
                    Item Balance Due (String, Required) - The Item Balance Due field of the Payment Item form
                    Transaction Amount (String, Required) - The Transaction Amount field of the Payment Item form
                    Fund (String, Required) - The Fund field of the Payment Item form
                    Cost Center (String, Required) - The Cost Center field of the Payment Item form
                    GL Account (String, Required) - The GL Account field of the Payment Item form
                    Date of Transaction (String, Required) - The Date of Transaction field of the Payment Item form. Expects date in ISO 8601 format.
                    Refundable - The Refundable field of the Payment Item form
                    Can Only Accept Checks - The Can Only Accept Checks field of the Payment Item form
                    Transaction Record Description (String, Required) - The value on the 'Transaction Description' field of the associated Transaction record that is created.
                    Transaction Record Balance Change (String, Required) - The value on the 'Balance Change' field of the associated Transaction record that is created.
                    Transaction Record Status (String, Required) - The value on the 'Status' field of the associated Transaction record that is created.
                    OTHERFIELDSTOUPDATE (Object) - Other non-specified fields to update on the Payment Item form. Can be used to override default field values. An example on how to pass this in via a runWebService is provided below.
                        EX: { 'OTHERFIELDSTOUPDATE':{ "Related Payment Item ID": "PAYMENT-ITEM-ZZZZZZZ" }}
                        This object will need to be changed according to form field names.
  Return Array:   
                  [0] Status: 'Success', 'Error', 'Minor Error'
                  [1] Message
                  [2] returnObject: An object with the following possible properties:
                    errorLog (String[]): List of errors logged during process.
                    paymentItemReturnObjects (Object[]): List of data associated with each passed in payment item. Each contains the following possible properties:
                      libraryStatus (String): Status of the Payment Item being processed through this library. 'In Process', 'Error', or 'Success'
                      createdPaymentItem (Object): Data for the created Payment Item record. Contains: formID, revisionID
                      createdTransaction (Object): Data for the created Transaction record. Contains: formID, revisionID
                      paymentItemDuplicates (Object[]): Data list of existing Payment Item records that are duplicates of the payment item attempting to be created. Contains: formID, revisionID. Only present if duplicates are found.
  Pseudo code:   
                  1. Verify all required fields to build the Payment Items and their children records (Transaction) are present
                  2. For each Payment Item to create,
                    a. Verify there are no duplicates for the Payment Item form based on Transaction Type, Fee ID, and Related Record ID
                      i. Perform query based on duplicate check criteria
                      ii. If duplicates were found, throw an error and stop processing of the payment item. Return duplicates data to the client.
                    b. Create the Payment Item record
                    c. Relate the Payment Item to the Related Record and Fee records
                    d. Create the Transaction record
                    e. Update the Payment Item record with new information (e.g. Transaction ID)
                  3. Calculate the balances of the Fee records for each Payment Item by Individual

  Date of Dev: 01/13/2025
  Revision Notes:
  01/13/2025 - John Sevilla: Script migrated.
  01/27/2025 - John Sevilla: Updated for new params
  02/17/2025 - John Sevilla: Fix missing fields not properly being flagged
  */

    logger.info('Start of the process LibPaymentItemCreate at ' + Date());

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */
    const missingFieldGuidance = 'Please provide a value for the missing field(s).';
    const PaymentItemTemplateID = 'Payment Item';
    const DuplicateCheckWebsvcName = 'LibFormDuplicateCheck';
    const CreateTransactionWebsvcName = 'LibTransactionCreateTransaction';
    const CalculateFeeBalanceWebsvcName = 'LibFeeCalculateBalance';
    const PaymentItemRequiredFields = [
        'Individual ID',
        'Related Record ID',
        'Fee ID',
        'Transaction Type',
        'Transaction Amount',
        'Fund',
        'Cost Center',
        'GL Account',
        'Date of Transaction',
        'Refundable',
        'Can Only Accept Checks',
    ];
    const PaymentTypePaymentItemRequiredFields = ['Payment Method', 'Item Balance Due', 'Installment Payment Item'];
    const RefundTypePaymentItemRequiredFields = [
        'Refund Reason',
        'Date of Original Transaction',
        'Original Transaction Amount',
    ];
    /* Transaction Required Fields, collected within buildPaymentItemProcessObjects()
    - Transaction Record Description
    - Transaction Record Status
    - Transaction Record Balance Change
  */
    const PaymentItemParamObjectsFieldName = 'PaymentItemParamObjects';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */
    let outputCollection = [];
    let errorLog = [];
    let returnObject = {};

    /**
     * Stores data that will be sent back to the client. See 'Return Array' documentation above for information on properties.
     * @typedef {Object} PaymentItemReturnObject
     * @property {String} libraryStatus
     * @property {Object} createdPaymentItem
     * @property {Object} createdTransaction
     * @property {Object[]} paymentItemDuplicates
     */
    /** @type {PaymentItemReturnObject[]} */
    returnObject.paymentItemReturnObjects = [];

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

    /**
     * Stores data that is used while processing a payment item
     * @typedef {Object} PaymentItemProcessObject
     * @property {String} libraryStatus - Status of the payment item being processed through this library. 'In Process', 'Error', or 'Success'
     * @property {Object} paymentItemCreateObject - A data structure that has Payment Item form field names as keys. Used for creating the record via postforms.
     * @property {Object} transactionCreateObject - A data structure that has Transaction form field names as keys. Partially used to create the payment item's associated transaction via library (other fields come directly from paymentItemCreateObject)
     * @property {Object} createdPaymentItem - Contains identifiers for newly created payment item
     * @property {Object} createdTransaction - Contains identifiers for newly created transaction
     */
    /**
     * Check for required fields in each payment item params object and restructures data into process objects consumable by the web service
     * @returns {PaymentItemProcessObject[]}
     */
    function buildPaymentItemProcessObjects() {
        let paymentItemParamObjects = getFieldValueByName(PaymentItemParamObjectsFieldName, true); // true prevents duplicate errorLog entries
        if (Array.isArray(paymentItemParamObjects) === false || paymentItemParamObjects.length <= 0) {
            errorLog.push(PaymentItemParamObjectsFieldName);
            return null; // stop processing
        }

        /** @type {PaymentItemProcessObject[]} */
        const paymentItemProcessObjects = [];
        // transform 'param' into 'process' object
        for (let i = 0; i < paymentItemParamObjects.length; i++) {
            const paramObject = paymentItemParamObjects[i];
            if (isObject(paramObject) === false) {
                errorLog.push(`${PaymentItemParamObjectsFieldName}[${i}]:(Not an object)`);
                continue; // skip this entry
            }

            // collect general required fields
            /** @type {PaymentItemProcessObject} */
            const missingFieldNames = [];

            // determine payment item required fields
            const paymentItemCreateObject = {};
            let finalPaymentItemRequiredFields = PaymentItemRequiredFields;
            const transactionType = getFieldValueInObject(paramObject, 'Transaction Type'); // omit missingFieldNames to prevent duplicate in names
            if (transactionType === 'Refund') {
                finalPaymentItemRequiredFields = finalPaymentItemRequiredFields.concat(
                    RefundTypePaymentItemRequiredFields
                );
            } else {
                // Payment type
                finalPaymentItemRequiredFields = finalPaymentItemRequiredFields.concat(
                    PaymentTypePaymentItemRequiredFields
                );
            }

            // collect payment item required fields into a create object (also adds missing fields to missingFieldNames)
            finalPaymentItemRequiredFields.forEach((reqFieldName) => {
                paymentItemCreateObject[reqFieldName] = getFieldValueInObject(
                    paramObject,
                    reqFieldName,
                    missingFieldNames
                );
            });

            // collect other form fields that aren't specified as a params into payment item create object
            let otherFieldsToUpdate = getFieldValueInObject(paramObject, 'OTHERFIELDSTOUPDATE');
            if (isObject(otherFieldsToUpdate)) {
                for (const fieldName in otherFieldsToUpdate) {
                    if (otherFieldsToUpdate.hasOwnProperty(fieldName)) {
                        paymentItemCreateObject[fieldName] = otherFieldsToUpdate[fieldName];
                    }
                }
            }

            // update create object fields with defaults if not set
            if (paymentItemCreateObject.hasOwnProperty('Status') === false) {
                paymentItemCreateObject['Status'] = 'Unpaid';
            }

            // collect transaction required fields into a create object (also adds missing fields to missingFieldNames)
            const transactionCreateObject = {
                'Transaction Description': getFieldValueInObject(
                    paramObject,
                    'Transaction Record Description',
                    missingFieldNames
                ),
                'Balance Change': getFieldValueInObject(
                    paramObject,
                    'Transaction Record Balance Change',
                    missingFieldNames
                ),
                Status: getFieldValueInObject(paramObject, 'Transaction Record Status', missingFieldNames),
            };

            // make create objects part of process object
            const paymentItemProcessObject = {
                libraryStatus: 'In Process',
                paymentItemCreateObject,
                transactionCreateObject,
            };

            if (missingFieldNames.length > 0) {
                // if fields were missing, add to errorLog
                errorLog.push(`${PaymentItemParamObjectsFieldName}[${i}]:${missingFieldNames.join(',')}`);
            } else {
                paymentItemProcessObjects.push(paymentItemProcessObject);
            }
        }

        return paymentItemProcessObjects;
    }

    // Check if field in a fields object has a truthy value before returning value. Adds missing fields to the missing fields list if provided
    function getFieldValueInObject(fieldsObj, fieldName, missingFieldNames) {
        const fieldValue = fieldsObj.hasOwnProperty(fieldName) ? fieldsObj[fieldName] : null;

        if (!fieldValue && Array.isArray(missingFieldNames)) {
            missingFieldNames.push(fieldName);
        }

        return fieldValue;
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

    function createFormRecord(newRecordData, templateName, shortDescription = `Post form ${templateName}`) {
        return vvClient.forms
            .postForms(null, newRecordData, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
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

    async function relateFormsByGUIDandFormID(
        formAGUID,
        formBFormID,
        shortDescription = `Relating forms: ${formAGUID} and form ${formBFormID}`
    ) {
        //404 is needed so that a hard error is not thrown when relationship already exists.
        const ignoreStatusCode = '404';

        const relateFormByDocIDRes = await vvClient.forms
            .relateFormByDocId(formAGUID, formBFormID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode));

        return relateFormByDocIDRes;
    }

    function callExternalWs(webServiceName, webServiceParams, shortDescription = `Run Web Service: ${webServiceName}`) {
        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    /**
     * @param {Object} obj
     * @returns {Boolean}
     */
    function isObject(obj) {
        return typeof obj === 'object' && !Array.isArray(obj) && obj !== null;
    }

    /**
     * Checks for duplicates. If any found, they are appended to the process object
     * @param {PaymentItemProcessObject} currentPaymentItemProcessObject
     */
    async function verifyPaymentItemHasNoDuplicates(currentPaymentItemProcessObject) {
        // load properties from current process object
        const { paymentItemCreateObject } = currentPaymentItemProcessObject;

        // Step 2ai. Perform query based on duplicate check criteria
        const duplicateCheckQueryString =
            `[Transaction Type] eq '${paymentItemCreateObject['Transaction Type']}' AND ` +
            `[Fee ID] eq '${paymentItemCreateObject['Fee ID']}' AND ` +
            `[Related Record ID] eq '${paymentItemCreateObject['Related Record ID']}'`;

        let duplicateCheckWebSvcParams = [
            {
                name: 'templateID',
                value: PaymentItemTemplateID,
            },
            {
                name: 'query',
                value: duplicateCheckQueryString,
            },
            {
                name: 'formID',
                value: 'zzzIGNORE', // no existing form ids to compare
            },
        ];

        const duplicateCheckData = await callExternalWs(DuplicateCheckWebsvcName, duplicateCheckWebSvcParams);

        // Step 2aii. If duplicates were found, throw an error and stop processing of the payment item. Return duplicates data to the client.
        let duplicateCheckStatus = duplicateCheckData[0];
        let duplicateCheckReturnObject = duplicateCheckData[2];

        if (duplicateCheckStatus === 'Duplicate Found') {
            currentPaymentItemProcessObject.paymentItemDuplicates = duplicateCheckReturnObject.duplicates;
            throw new Error('This record is a duplicate.');
        } else if (duplicateCheckStatus !== 'No Duplicate Found' && duplicateCheckStatus !== 'Current Record Match') {
            throw new Error(`The call to ${DuplicateCheckWebsvcName} returned with an unhandled error.`);
        }
    }

    /**
     * @param {PaymentItemProcessObject} currentPaymentItemProcessObject
     */
    async function createPaymentItemRecord(currentPaymentItemProcessObject) {
        // load properties from current process object
        const { paymentItemCreateObject } = currentPaymentItemProcessObject;

        const createdPaymentItemRecord = await createFormRecord(paymentItemCreateObject, PaymentItemTemplateID);

        // update process object
        currentPaymentItemProcessObject.createdPaymentItem = {
            formID: createdPaymentItemRecord.instanceName,
            revisionID: createdPaymentItemRecord.revisionId,
        };
    }

    /**
     * Creates a Transaction record that updates balance for the associated fee.
     * @param {PaymentItemProcessObject} currentPaymentItemProcessObject
     */
    async function createTransactionRecord(currentPaymentItemProcessObject) {
        // load properties from current process object
        const { paymentItemCreateObject, transactionCreateObject, createdPaymentItem } =
            currentPaymentItemProcessObject;

        const createTransactionParams = [
            {
                name: 'Transaction Category',
                value: paymentItemCreateObject['Transaction Type'] === 'Refund' ? 'Refund' : 'Payment',
            },
            { name: 'Balance Change', value: transactionCreateObject['Balance Change'] },
            { name: 'Transaction Description', value: transactionCreateObject['Transaction Description'] },
            {
                name: 'Transaction Amount',
                value: paymentItemCreateObject['Transaction Amount'],
            },
            {
                name: 'Transaction Date',
                value: paymentItemCreateObject['Date of Transaction'],
            },
            { name: 'Transaction ID', value: '' }, // Note: This is NOT a Transaction record ID
            { name: 'Fund', value: paymentItemCreateObject['Fund'] },
            { name: 'Cost Center', value: paymentItemCreateObject['Cost Center'] },
            { name: 'GL Account', value: paymentItemCreateObject['GL Account'] },
            { name: 'Related Record ID', value: createdPaymentItem.formID },
            { name: 'Fee ID', value: paymentItemCreateObject['Fee ID'] },
            { name: 'Individual ID', value: paymentItemCreateObject['Individual ID'] },
            { name: 'Status', value: transactionCreateObject['Status'] },
        ];

        const createTransactionData = await callExternalWs(CreateTransactionWebsvcName, createTransactionParams);
        const createdTransactionIDs = createTransactionData[1];
        if (Array.isArray(createdTransactionIDs) === false) {
            throw new Error(`Unexpected data returned from ${CreateTransactionWebsvcName}.`);
        }

        const [createdTransactionFormID, createdTransactionGUID] = createdTransactionIDs;

        const createdTransaction = {
            formID: createdTransactionFormID,
            revisionID: createdTransactionGUID,
        };

        // update process object
        currentPaymentItemProcessObject.createdTransaction = createdTransaction;
    }

    /**
     * Updates the created Payment Item with newly obtained information (e.g. newly created Transaction record ID)
     * @param {PaymentItemProcessObject} currentPaymentItemProcessObject
     */
    async function updatePaymentItemRecord(currentPaymentItemProcessObject) {
        // load properties from current process object
        const { createdTransaction, createdPaymentItem } = currentPaymentItemProcessObject;

        let formUpdateObj = {
            'Transaction ID': createdTransaction.formID,
        };

        const updatedPaymentItemRecord = await updateFormRecord(
            formUpdateObj,
            PaymentItemTemplateID,
            createdPaymentItem.revisionID
        );

        // update process object
        createdPaymentItem.revisionID = updatedPaymentItemRecord.revisionId; // update revision id
    }

    async function calculateFeeRecordBalancesForIndividual(individualID, feeIDs) {
        if (Array.isArray(feeIDs) === false || feeIDs.length < 1) {
            throw new Error(`No valid fee IDs supplied.`);
        }

        let calculateFeeBalanceParams = [
            { name: 'Fee IDs', value: feeIDs },
            { name: 'Individual ID', value: individualID },
            { name: 'All Business Fees Flag', value: 'False' },
        ];

        const calculateFeeBalanceData = await callExternalWs(CalculateFeeBalanceWebsvcName, calculateFeeBalanceParams);

        return calculateFeeBalanceData;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Step 1. Verify all required fields to build the Payment Items and their children records (Transaction) are present
        let PaymentItemProcessObjects = buildPaymentItemProcessObjects();

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        // Step 2. For each Payment Item to create,
        let individualIDToFeeIDsMap = new Map();
        for (let i = 0; i < PaymentItemProcessObjects.length; i++) {
            const currentPaymentItemProcessObject = PaymentItemProcessObjects[i];
            /** @type {PaymentItemReturnObject} */
            const currentPaymentItemReturnObject = {};

            try {
                // Step 2a. Verify there are no duplicates for the Payment Item form based on Transaction Type, Fee ID, and Related Record ID
                await verifyPaymentItemHasNoDuplicates(currentPaymentItemProcessObject);

                // Step 2b. Create the Payment Item record
                await createPaymentItemRecord(currentPaymentItemProcessObject);
                currentPaymentItemReturnObject.createdPaymentItem = currentPaymentItemProcessObject.createdPaymentItem;

                // Step 2c. Relate the Payment Item to the Related Record and Fee records
                const paymentItemRevisionID = currentPaymentItemProcessObject.createdPaymentItem.revisionID;
                const relatedRecordID = currentPaymentItemProcessObject.paymentItemCreateObject['Related Record ID'];
                await relateFormsByGUIDandFormID(paymentItemRevisionID, relatedRecordID);

                const feeID = currentPaymentItemProcessObject.paymentItemCreateObject['Fee ID'];
                await relateFormsByGUIDandFormID(paymentItemRevisionID, feeID);

                // Step 2d. Create the Transaction record
                await createTransactionRecord(currentPaymentItemProcessObject);
                currentPaymentItemReturnObject.createdTransaction = currentPaymentItemProcessObject.createdTransaction;

                // Step 2e. Update the Payment Item record with new information (e.g. Transaction ID)
                await updatePaymentItemRecord(currentPaymentItemProcessObject);

                // Set variables needed for calculating fee record balances
                const individualID = currentPaymentItemProcessObject.paymentItemCreateObject['Individual ID'];
                if (individualIDToFeeIDsMap.has(individualID)) {
                    let individualFeeIDs = individualIDToFeeIDsMap.get(individualID);
                    individualFeeIDs.push(feeID);
                } else {
                    // add first fee ID
                    individualIDToFeeIDsMap.set(individualID, [feeID]);
                }

                // Update library status last
                currentPaymentItemProcessObject.libraryStatus = 'Success';
            } catch (error) {
                currentPaymentItemProcessObject.libraryStatus = 'Error';
                errorLog.push(
                    `Error encountered processing ${PaymentItemParamObjectsFieldName}[${i}]: ${error.message}`
                );
            }

            // Append data to return object
            currentPaymentItemReturnObject.libraryStatus = currentPaymentItemProcessObject.libraryStatus;
            if (currentPaymentItemProcessObject.hasOwnProperty('paymentItemDuplicates')) {
                currentPaymentItemReturnObject.paymentItemDuplicates =
                    currentPaymentItemProcessObject.paymentItemDuplicates;
            }

            // Push to global returnObject
            returnObject.paymentItemReturnObjects.push(currentPaymentItemReturnObject);
        }

        // Step 3. Calculate the balances of the Fee records for each Payment Item by Individual
        for (const [individualID, feeIDs] of individualIDToFeeIDsMap) {
            try {
                await calculateFeeRecordBalancesForIndividual(individualID, feeIDs);
            } catch (error) {
                errorLog.push(
                    `Error encountered attempting to calculate fee balances for ${individualID}: ${error.message}`
                );
            }
        }

        // Send to client
        let returnStatus = 'Success';
        let returnMessage = 'LibPaymentItemCreate has returned successfully';
        if (errorLog.length > 0) {
            returnStatus = 'Minor Error';
            returnMessage = `Non-halting errors encountered: ${errorLog.join(' ')}`;

            // Add any errors to returnObject
            returnObject.errorLog = errorLog;
        }

        outputCollection[0] = returnStatus;
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
