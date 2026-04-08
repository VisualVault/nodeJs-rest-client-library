/**
 * PaymentItemBeforeFormSave
 * Category: Workflow
 * Modified: 2025-02-19T15:09:28.033Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 7c1a0525-a5cf-ef11-82bf-a0dcc70b93c8
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
    /*Script Name: PaymentItemBeforeFormSave
    Customer:      WADNR
    Purpose:       The purpose of this process is to run any checks or perform updates before the Payment Item form is saved. Notably runs the Duplicate Check logic and also performs updates on the Payment Item's associated Transaction record
    Parameters:    Form ID (String, Required) - DhDocID of the Payment Item form
                   Transaction Type (String, Required) - Form field
                   Fee ID (String, Required) - Form field
                   Related Record ID (String, Required) - Form field. Will typically be a Shopping Cart or Refund ID
                   Transaction Amount (String, Required) - Form field
                   Transaction ID (String, Required) - Form field. Represents the Payment Item's associated Transaction record
    Return Array:   
                    [0] Status: 'Success', 'Error', 'Error Duplicate'
                    [1] Message
                    [2] duplicateData - An array of found duplicate objects (if any found). Each object has the following properties:
                      formID: The DhDocID of the duplicate
                      revisionID: The DhID of the duplicate
    Pseudo code:   
                    1. Verify there are no duplicates for the Payment Item form based on Transaction Type, Fee ID, and Related Record ID fields
                    2. If duplicates were found, throw an error and stop processing of the webservice. Return duplicates data to the client.
                    3. Update the amount on the Transaction record using the "Transaction Amount" field on the Payment Item

    Date of Dev: 01/10/2025
    Revision Notes:
    01/10/2025 - John Sevilla: Script migrated.
    02/19/2025 - John Sevilla: Update to use new helper fns
    */

    logger.info('Start of the process PaymentItemBeforeFormSave at ' + Date());

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */
    const missingFieldGuidance = 'Please provide a value for the missing field(s).';
    const PaymentItemTemplateID = 'Payment Item';
    const TransactionTemplateID = 'Transaction';
    const DuplicateCheckWebsvcName = 'LibFormDuplicateCheck';
    const UpdateTransactionWebsvcName = 'LibTransactionUpdateTransaction';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */
    let outputCollection = [];
    let errorLog = [];
    let duplicateCheckReturnObject = null;
    let errorStatus = 'Error';
    let paymentItemRevisionID = null;

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

    function callExternalWs(webServiceName, webServiceParams, shortDescription = `Run Web Service: ${webServiceName}`) {
        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
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

    async function verifyPaymentItemHasNoDuplicates(paymentItem) {
        // Step 1. Verify there are no duplicates for the Payment Item form based on Transaction Type, Fee ID, and Related Record ID fields
        const duplicateCheckQueryString =
            `[Transaction Type] eq '${paymentItem.TransactionType}' AND ` +
            `[Fee ID] eq '${paymentItem.FeeID}' AND ` +
            `[Related Record ID] eq '${paymentItem.RelatedRecordID}'`;

        const webSvcParams = [
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
                value: paymentItem.FormID,
            },
        ];

        const duplicateCheckData = await callExternalWs(DuplicateCheckWebsvcName, webSvcParams);

        // Step 2. If duplicates were found, throw an error and stop processing of the webservice. Return duplicates data to the client.
        const duplicateCheckStatus = duplicateCheckData[0];
        duplicateCheckReturnObject = duplicateCheckData[2];

        if (duplicateCheckStatus === 'Error') {
            throw new Error(
                `The call to ${DuplicateCheckWebsvcName} returned with an error. ${duplicateCheckData.statusMessage}.`
            );
        } else if (duplicateCheckStatus === 'Duplicate Found') {
            errorStatus = 'Error Duplicate';
            throw new Error('This record is a duplicate.');
        } else if (duplicateCheckStatus !== 'No Duplicate Found' && duplicateCheckStatus !== 'Current Record Match') {
            throw new Error(`The call to ${DuplicateCheckWebsvcName} returned with an unhandled error.`);
        }

        // store revision ID if matched in duplicate check for later use
        paymentItemRevisionID = duplicateCheckReturnObject.matchRevisionID;
    }

    async function updateTransactionRecordAmount(transactionID, newTransactionAmount) {
        const currentTransaction = await getTransactionRecordData(transactionID);

        const updateTransactionRecordParams = [
            { name: 'Transaction Record ID', value: transactionID },

            // fields that will possibly be updated (depends on current status of transaction)
            { name: 'Transaction Amount', value: newTransactionAmount },

            // fields that will not be updated
            { name: 'Status', value: currentTransaction['status'] },
            { name: 'Transaction Category', value: currentTransaction['transaction Category'] },
            { name: 'Balance Change', value: currentTransaction['balance Change'] },
            { name: 'Transaction Description', value: currentTransaction['transaction Description'] },
            { name: 'Transaction Date', value: currentTransaction['transaction Date'] },
            { name: 'Fund', value: currentTransaction['fund'] },
            { name: 'Cost Center', value: currentTransaction['cost Center'] },
            { name: 'GL Account', value: currentTransaction['gL Account'] },
            { name: 'Related Record ID', value: currentTransaction['related Record ID'] },
            { name: 'License ID', value: currentTransaction['license ID'] },
            { name: 'Transaction ID', value: currentTransaction['transaction ID'] }, // Note: This is not a Transaction record ID
            { name: 'Fee ID', value: currentTransaction['fee ID'] },
            { name: 'Provider ID', value: currentTransaction['provider ID'] },
        ];

        const updateTransactionRecordData = await callExternalWs(
            UpdateTransactionWebsvcName,
            updateTransactionRecordParams
        );

        if (Array.isArray(updateTransactionRecordData[1]) === false || updateTransactionRecordData[1].length < 1) {
            throw new Error(`Unexpected data returned from ${UpdateTransactionWebsvcName}.`);
        }
    }

    async function getTransactionRecordData(transactionID) {
        const [transactionRecord] = await getFormRecords(
            {
                q: `[instanceName] eq '${transactionID}'`,
                expand: true,
            },
            TransactionTemplateID
        );

        if (!transactionRecord) {
            throw new Error(`Unable to find ${TransactionTemplateID} with ID "${transactionID}"`);
        }

        return transactionRecord;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        /*********************
    Form Record Variables
    **********************/
        let FormID = getFieldValueByName('Form ID');
        let TransactionType = getFieldValueByName('Transaction Type');
        let FeeID = getFieldValueByName('Fee ID');
        let RelatedRecordID = getFieldValueByName('Related Record ID');
        let NewTransactionAmount = getFieldValueByName('Transaction Amount');
        let TransactionID = getFieldValueByName('Transaction ID');

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        // Step 1 & 2
        await verifyPaymentItemHasNoDuplicates({
            TransactionType,
            FeeID,
            RelatedRecordID,
            FormID,
        });

        // Step 3. Update the amount on the Transaction record using the "Transaction Amount" field on the Payment Item
        await updateTransactionRecordAmount(TransactionID, NewTransactionAmount);

        // send to client
        outputCollection[0] = 'Success';
        outputCollection[1] = 'PaymentItemBeforeFormSave has returned successfully';
    } catch (error) {
        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = errorStatus;
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = errorLog;
        outputCollection[3] = duplicateCheckReturnObject?.duplicates;
    } finally {
        response.json(200, outputCollection);
    }
};
