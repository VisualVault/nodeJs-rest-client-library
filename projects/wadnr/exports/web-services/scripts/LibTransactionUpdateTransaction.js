/**
 * LibTransactionUpdateTransaction
 * Category: Workflow
 * Modified: 2025-01-27T16:53:31.833Z by john.sevilla@visualvault.com
 * Script ID: Script Id: a655ea78-0cce-ef11-82bd-d3a492f2461d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
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
    /* Script Name:   LibTransactionUpdateTransaction
	   Customer:      WADNR
	   Purpose:       Updates a given Transaction using parameters passed into the web service, setting its fields
			  		  depending on the current status of the Transaction.
    
	   Parameters:	The following represent variables passed into the function:
	   				Transaction Record ID: 	(String, Required) Form ID (instance name) of the Transaction to update
			  		Status:                	(String, Required) Desired status to update to for the Transaction
			  		Transaction ID:        	(String, Optional) Value to update the Transaction's "Transaction ID" field (NOT the Transaction record ID)
			  		Individual ID:           	(String, Optional) The individual ID for the Individual ID field on the Transaction record.
			  		Related Record ID:     	(String, Optional) The Related Record ID for the Related Record ID field on the transaction record.
			  		Fee ID:                	(String, Optional) The Fee ID for the Fee ID field on the transaction record.
			  		Transaction Category:	(String, Optional) The transaction Category should only be values from the transaction record.
			  		Balance Change:        	(String, Optional) Only two values accepted Increase or Decrease
			  		Transaction Description:(String, Optional) The description of the transaction, under 500 characters, not validated
			  		Transaction Amount: 	(String, Optional) The amount should be a number with 2 decimal places
			  		Transaction Date: 		(Date, Optional)   The date of the transaction
			  		Transaction ID: 		(String, Optional) Identifier of the transaction, typically Check Number or Credit Card Transaction ID
			  		Fund: 					(String, Optional) The fund field
			  		Cost Center: 			(String, Optional) The cost center field
			  		GL Account: 			(String, Optional) the gl account field
    
	   Return Array:  	outputCollection[0]: Status
                    	outputCollection[1]: (Array) The updated `Status` of the transaction (if it could be updated)
                    	outputCollection[2]: (String) Revision ID for the updated Transaction
			  
	   Pseudo code:   
			1: GET the Transaction's current status and revision ID (GUID)
			3: CREATE the update object depending on the Transaction's current status
			4: UPDATE the Transaction using the determined update object
			5: RETURN the form data of the updated Transaction

      Date of Dev: 01/08/2025
      Revision Notes:
      01/08/2025 - John Sevilla: Script migrated.
      01/27/2025 - John Sevilla: Updated for new params
	   */

    logger.info('Start of the process LibTransactionUpdateTransaction at ' + Date());

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

    // Valid Transaction Statuses (to Update)
    const PENDING_STATUS = 'Pending';
    const FINALIZED_STATUS = 'Finalized';

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

    /**
     * Streamlines the creation of an update object for the `postFormRevision` API call
     */
    function FormUpdater() {
        this.updateObj = {
            // NOTE: The following field(s) are always updated
            ['Date Last Updated']: currDateStr,
        };
        /**
         * Updates the `updateObj` property with the field name and value passed in only if the value is truthy and not `'Select Item'`.
         * @param {String} fieldName - Corresponds to the name of the field to update.
         * @param {Any} fieldValue - The value to update the desired field.
         */
        this.setDefinedField = (fieldName, fieldValue) => {
            // Only set the fieldname as a property of the update object if its value is truthy and is not 'Select Item'
            if (fieldValue && fieldValue !== 'Select Item') {
                this.updateObj[fieldName] = fieldValue;
            }
        };
    }

    try {
        // Required Web Service Parameters
        let transactionRecordID = getFieldValueByName('Transaction Record ID');
        let status = getFieldValueByName('Status');
        // Optional Web Service Parameters
        let transactionCategory = getFieldValueByName('Transaction Category', true);
        let balanceChange = getFieldValueByName('Balance Change', true);
        let transactionDescription = getFieldValueByName('Transaction Description', true);
        let transactionAmount = getFieldValueByName('Transaction Amount', true);
        let transactionDate = getFieldValueByName('Transaction Date', true);
        let transactionID = getFieldValueByName('Transaction ID', true);
        let Fund = getFieldValueByName('Fund', true);
        let CostCenter = getFieldValueByName('Cost Center', true);
        let GLAccount = getFieldValueByName('GL Account', true);
        let relatedRecordID = getFieldValueByName('Related Record ID', true);
        let feeID = getFieldValueByName('Fee ID', true);
        let individualID = getFieldValueByName('Individual ID', true);

        // Check if required parameters were provided
        if (!transactionRecordID || !status) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        const getTransactionDescription = `Getting form data for ${transactionRecordID}`;
        const getTransactionParams = {
            q: `[instanceName] eq '${transactionRecordID}'`,
            fields: 'id,name,[Status]',
        };

        // Get the revision ID and the Transaction's current status
        const { revisionId: transactionGUID, status: currentTransactionStatus } = await vvClient.forms
            .getForms(getTransactionParams, TRANSACTION)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, getTransactionDescription))
            .then((res) => checkDataPropertyExists(res, getTransactionDescription))
            .then((res) => checkDataIsNotEmpty(res, getTransactionDescription))
            .then((res) => res.data[0]);

        // Build the update object based on the Transaction's current status and the parameters passed in
        const formUpdater = new FormUpdater();

        let updatedTransactionStatus = status;
        switch (currentTransactionStatus) {
            case FINALIZED_STATUS:
                updatedTransactionStatus = FINALIZED_STATUS;
                formUpdater.setDefinedField('Related Record ID', relatedRecordID);
                break;
            case PENDING_STATUS:
                updatedTransactionStatus = status;
                formUpdater.setDefinedField('Status', status);
                // Transaction Relations
                formUpdater.setDefinedField('Related Record ID', relatedRecordID);
                formUpdater.setDefinedField('Fee ID', feeID);
                formUpdater.setDefinedField('Individual ID', individualID);
                // Transaction Information
                formUpdater.setDefinedField('Transaction Category', transactionCategory);
                formUpdater.setDefinedField('Transaction Description', transactionDescription);
                formUpdater.setDefinedField('Transaction Amount', transactionAmount);
                formUpdater.setDefinedField('Transaction Date', transactionDate);
                formUpdater.setDefinedField('Transaction ID', transactionID);
                formUpdater.setDefinedField('Balance Change', balanceChange);
                formUpdater.setDefinedField('Cost Center', CostCenter);
                formUpdater.setDefinedField('GL Account', GLAccount);
                formUpdater.setDefinedField('Fund', Fund);
                break;
            default:
                throw new Error(`A ${TRANSACTION} with status '${currentTransactionStatus}' cannot be updated`);
        }

        // Update the Transaction using the update object created by the `FormUpdater` object
        const { updateObj } = formUpdater;
        const updateDescription = `Updating ${transactionRecordID}`;

        const updatedTransactionGUID = await vvClient.forms
            .postFormRevision(null, updateObj, TRANSACTION, transactionGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, updateDescription))
            .then((res) => checkDataPropertyExists(res, updateDescription))
            .then((res) => checkDataIsNotEmpty(res, updateDescription))
            .then((res) => res.data.revisionId);

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success';
        outputCollection[1] = [updatedTransactionStatus];
        outputCollection[2] = updatedTransactionGUID;
    } catch (error) {
        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));

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
