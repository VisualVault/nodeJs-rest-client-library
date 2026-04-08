/**
 * LibTransactionFinalizeTransaction
 * Category: Workflow
 * Modified: 2025-01-09T15:17:04.49Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 8083825f-9cce-ef11-82bf-a0dcc70b93c8
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const dayjs = require('dayjs');

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
    /*Script Name:  LibTransactionFinalizeTransaction
     Customer:      PAELS
     Purpose:       This purpose of this library is to finalize an array of transaction log(s)

     Parameters:    Transaction Record ID (Array, Required)

     Return Array:  [0] Status: 'Success', 'Error'
                    [1] Message
                    
     Pseudo code:   
                    Step 1: Validate input. Only Transaction Record ID is required.
                    Step 2: Getforms on Transaction IDs to get the GUIDs.
                    Step 3: Construct postformsrevision object
                    Step 4: Postformsrevison the record.
                    Step 5: send back sucess or fail.


  
      Date of Dev: 01/09/2025
      Last Rev Date: 01/09/2025
      Revision Notes:
      01/09/2025 - John Sevilla: Script migrated.
     */

    logger.info('Start of the process LibTransactionFinalizeTransaction at ' + Date());

    /**********************
     Configurable Variables
    ***********************/
    // Response array populated in try or catch block, used in response sent in finally block.
    let outputCollection = [];

    // Array for capturing error messages that may occur within helper functions.
    let errorLog = [];

    // Array of records that failed being updated
    let errorTransactionRecordID = [];

    //Creation of the post forms object
    let formUpdateObj = {};

    //Status of the transaction record
    let status = 'Finalized';

    //variable to hold GUID of the transaction record
    let transactionGUID = '';

    //variables to hold the template ids
    let TransactionTemplateTemplateID = 'Transaction';

    try {
        /****************
         BEGIN ASYNC CODE
        *****************/
        //Step 1: Validate input. Only Status and Transaction Record ID is required.
        // Create variables for the values on the form record
        let transactionArrayRecordID = getFieldValueByName('Array Transaction Record ID');

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`Please provide a value for the required fields.`);
        }

        /****************
         Helper Functions
        *****************/
        // Check if field object has a value property and that value is truthy before returning value.
        function getFieldValueByName(fieldName, isOptional) {
            try {
                let fieldObj = ffCollection.getFormFieldByName(fieldName);
                let fieldValue = fieldObj && (fieldObj.hasOwnProperty('value') ? fieldObj.value : null);

                if (fieldValue === null) {
                    throw new Error(`A value property for ${fieldName} was not found.`);
                }
                if (!isOptional && !fieldValue) {
                    throw new Error(`A value for ${fieldName} was not provided.`);
                }
                return fieldValue;
            } catch (error) {
                errorLog.push(error.message);
            }
        }

        /****************
         BEGIN ASYNC CODE
        *****************/

        if (!Array.isArray(transactionArrayRecordID)) {
            throw new Error(`The list of Transaction Record IDs needs to be an array.`);
        }

        if (transactionArrayRecordID.length == 0) {
            throw new Error(
                `No Transaction Record IDs were passed in. Please pass in at least one Transaction Record ID.`
            );
        } else if (!transactionArrayRecordID[0].includes('TRANSACTION')) {
            throw new Error(
                `No Transaction Record IDs were passed in. Please pass in at least one Transaction Record ID.`
            );
        }

        for (var transactionRecord of transactionArrayRecordID) {
            transactionRecord = transactionRecord.trim();

            try {
                //Step 2: Getforms on Transaction ID to get the GUID.
                let queryParams = {
                    q: `[Form ID] eq '${transactionRecord}'`,
                    expand: false,
                };

                let getFormsRespTransactionRecord = await vvClient.forms.getForms(
                    queryParams,
                    TransactionTemplateTemplateID
                );
                getFormsRespTransactionRecord = JSON.parse(getFormsRespTransactionRecord);
                let getFormsDataTransactionRecord = getFormsRespTransactionRecord.hasOwnProperty('data')
                    ? getFormsRespTransactionRecord.data
                    : null;

                if (getFormsRespTransactionRecord.meta.status !== 200) {
                    throw new Error(
                        `Error encountered when calling getForms. ${getFormsRespTransactionRecord.meta.statusMsg}.`
                    );
                }
                if (!Array.isArray(getFormsDataTransactionRecord)) {
                    throw new Error(`Data was not returned when calling getForms.`);
                }

                //Pull and store the GUID
                transactionGUID = getFormsDataTransactionRecord[0]['revisionId'];

                formUpdateObj['Status'] = status;
                formUpdateObj['Date Last Updated'] = dayjs().toISOString();

                //Step 4: Postformsrevison the record.
                let postFormResp = await vvClient.forms.postFormRevision(
                    null,
                    formUpdateObj,
                    TransactionTemplateTemplateID,
                    transactionGUID
                );
                if (postFormResp.meta.status !== 201) {
                    throw new Error(
                        `An error was encountered when attempting to update the ${TransactionTemplateTemplateID} form. ${postFormResp.hasOwnProperty('meta') ? postFormResp.meta.statusMsg : postFormResp.message}`
                    );
                }
            } catch (error) {
                errorLog.push(error.message);
                errorTransactionRecordID.push(transactionRecord);
            }
        }

        //Step 5: send back sucess or fail.
        outputCollection[0] = 'Success';
        outputCollection[1] = errorTransactionRecordID;
    } catch (error) {
        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = 'Error';
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = errorTransactionRecordID;
    } finally {
        response.json(200, outputCollection);
    }
};
