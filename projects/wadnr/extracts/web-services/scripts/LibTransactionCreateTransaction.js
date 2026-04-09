/**
 * LibTransactionCreateTransaction
 * Category: Workflow
 * Modified: 2025-06-05T18:34:03.57Z by fernando.chamorro@visualvault.com
 * Script ID: Script Id: 9092b526-0cce-ef11-82bd-d3a492f2461d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const currency = require('currency.js');
const util = require('util');
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
    /* Script Name:   LibTransactionCreateTransaction
	   Customer:      WADNR
	   Purpose:       Centralized web service to handle the creation of a new Transaction record.
  
	   Parameters:    
					Status                  (String, Required) Only two values accepted Pending or Finalized 
					Related Record ID       (String, Required) The Related Record ID for the Related Record ID field on the transaction record.
					Fee ID                  (String, Required) The Fee ID for the Fee ID field on the transaction record.
					Individual ID           (String, Required) The individual ID for the Individual ID field on the transaction record.
					Transaction Category    (String, Required) The transaction Category should only be values from the transaction record.
					Transaction Description (String, Required) The description of the transaction, under 500 characters, not validated
					Transaction Amount      (String, Required) The amount should be a number with 2 decimal places
					Transaction Date        (Date, Required) The date of the transaction
					Balance Change          (String, Required) Only two values accepted Increase or Decrease
					Cost Center             (String, Required) The cost center field
					GL Account              (String, Required) the gl account field
					Fund                    (String, Required) The fund field
					User ID           	  	(String, Optional) The user ID for the User ID field on the transaction record.
					Transaction ID          (String, Optional) Id of the transaction typically Check Number or Credit Card Transaction ID
  
	   Return Array:  [0] Status: 'Success', 'Error'
					  [1] Message
					  
	   Pseudo code:   
					  1. CHECK that the passed in parameters are valid
					  2. CREATE the data object to create the Transaction record
					  3. CREATE a new Transaction record using the provided data
					  4. RETURN an array containing the revision ID (GUID) and instance name (Form ID) of the new Transaction record
    
    Date of Dev: 01/08/2025
    Last Rev Date: 01/21/2025
    Revision Notes:
    	01/08/2025 - John Sevilla: 		Script migrated.
		01/21/2025 - John Sevilla: 		Updated for new params
		05/06/2025 - Fernando Chamorro: Updated for new User ID param
  */

    logger.info('Start of the process LibTransactionCreateTransaction at ' + Date());

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
    const WADNR_TIMEZONE = 'America/Los_Angeles';
    const dateOnlyISOStringFormat = 'YYYY-MM-DD';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */

    // Acceptable Value Lists
    const VALID_STATUS_LIST = ['Pending', 'Finalized'];
    const VALID_BAL_CHANGE_LIST = ['Increase', 'Decrease'];
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
                        `${shortDescription} returned an error. Please, check called Web Service. Status: ${status}.`
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

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Required Web Service Parameters
        let status = getFieldValueByName('Status');
        let relatedRecordID = getFieldValueByName('Related Record ID');
        let feeID = getFieldValueByName('Fee ID');
        let individualID = getFieldValueByName('Individual ID');
        let transactionCategory = getFieldValueByName('Transaction Category');
        let transactionDescription = getFieldValueByName('Transaction Description');
        let transactionAmount = getFieldValueByName('Transaction Amount');
        let transactionDate = getFieldValueByName('Transaction Date');
        let balanceChange = getFieldValueByName('Balance Change');
        let CostCenter = getFieldValueByName('Cost Center');
        let GLAccount = getFieldValueByName('GL Account');
        let Fund = getFieldValueByName('Fund');
        // Optional Web Service Parameters
        let userID = getFieldValueByName('User ID', true);
        let transactionID = getFieldValueByName('Transaction ID', true);

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            // NOTE: The missing fields will be added to the error message in the `catch` statement
            throw new Error('Required fields were not provided');
        }

        // Check that the balance change and status values provided are valid
        if (!VALID_BAL_CHANGE_LIST.includes(balanceChange)) {
            throw new Error(
                `Balance Change can only be one of the following values: ${VALID_BAL_CHANGE_LIST.join(', ')}.`
            );
        }
        if (!VALID_STATUS_LIST.includes(status)) {
            throw new Error(`Status can only be one of the following values: ${VALID_STATUS_LIST.join(', ')}.`);
        }

        // Evaluate that the transaction amount is a non-negative number
        transactionAmount = currency(transactionAmount).value;
        if (transactionAmount < 0) {
            throw new Error(`Transaction Amount cannot be provided as a negative number.`);
        }

        // Create the Transaction object
        const createTransactionObj = {
            Status: status,
            'Date Last Updated': currDateStr,
            // Transaction Relations
            'Related Record ID': relatedRecordID,
            'Fee ID': feeID,
            'Individual ID': individualID,
            // Transaction Information
            'Transaction Category': transactionCategory,
            'Transaction Description': transactionDescription,
            'Transaction Amount': transactionAmount,
            'Transaction Date': transactionDate,
            'Balance Change': balanceChange,
            'Cost Center': CostCenter,
            'GL Account': GLAccount,
            Fund: Fund,
        };

        // Add optional field values if they were provided
        if (transactionID) {
            createTransactionObj['Transaction ID'] = transactionID;
        }

        if (userID) {
            createTransactionObj['User ID'] = userID;
        }

        // Create a new Transaction record using the update object
        const createTransactionDescription = `Creating ${TRANSACTION} with a status of ${status}`;
        const newTransactionRecord = await createFormRecord(
            createTransactionObj,
            TRANSACTION,
            createTransactionDescription
        );

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success';
        outputCollection[1] = [newTransactionRecord.instanceName, newTransactionRecord.revisionId];
    } catch (error) {
        let errorToReturn =
            error instanceof Error
                ? `Error encountered: ${error}`
                : `Unhandled error occurred: ${util.format('%o', error)}`;

        if (errorLog.length > 0) {
            errorToReturn += '; ' + errorLog.join('; ');
        }

        logger.error(errorToReturn);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don't change this
        outputCollection[1] = errorToReturn;
    } finally {
        response.json(200, outputCollection);
    }
};
