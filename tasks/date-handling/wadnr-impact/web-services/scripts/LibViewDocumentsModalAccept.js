/**
 * LibViewDocumentsModalAccept
 * Category: Workflow
 * Modified: 2025-01-16T13:43:50.347Z by nicolas.culini@visualvault.com
 * Script ID: Script Id: 49648191-0fd4-ef11-82bd-d3a492f2461d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const { query } = require('winston');

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
    /*Script Name:   LibViewDocumentsModalAccept
   Customer:      VisualVault Library Function
   Purpose:       The purpose of this process is to update document index for accepted documents.
   Parameters:
   Return Array:
                  1. Status: 'Success', 'Minor Error', 'Error'
   Psuedo code: 
              1. Update the Document Verified index field of each document to be 'Yes'
   Last Rev Date: 06/05/2023
   Revision Notes:
   06/02/2023 - Brian Davis: Script created
   */

    logger.info('Start of the process LibViewDocumentsModalAccept at ' + Date());

    /****************
   Config Variables
  *****************/
    let errorMessageGuidance = 'Please try again, or contact a system administrator if this problem continues.';
    let missingFieldGuidance =
        'Please provide a value for the missing field and try again, or contact a system administrator if this problem continues.';
    let relParams = {};
    relParams.indexFields = 'include';
    relParams.limit = '2000';

    /****************
   Script Variables
  *****************/
    let outputCollection = [];
    let errorLog = [];

    try {
        /****************
       Helper Functions
      *****************/
        // Check if field object has a value property and that value is truthy before returning value.
        function getFieldValueByName(fieldName, isOptional) {
            try {
                let fieldObj = ffCollection.getFormFieldByName(fieldName);
                let fieldValue = fieldObj && (fieldObj.hasOwnProperty('value') ? fieldObj.value : null);

                if (fieldValue === null) {
                    throw new Error(`${fieldName}`);
                }
                if (!isOptional && !fieldValue) {
                    throw new Error(`${fieldName}`);
                }
                return fieldValue;
            } catch (error) {
                errorLog.push(error.message);
            }
        }

        /*********************
       Form Record Variables
      **********************/
        let DocumentID = getFieldValueByName('documentID');

        /****************************
       Unused Form Record Variables
      *****************************/

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        /****************
       BEGIN ASYNC CODE
      *****************/

        var fieldData = {
            'Document Accepted': 'Yes',
        };

        var indexData = {
            indexFields: JSON.stringify(fieldData),
        };

        let putDocIndexResp = await vvClient.documents.putDocumentIndexFields(indexData, DocumentID);
        let putDocIndexData = putDocIndexResp.hasOwnProperty('data') ? putDocIndexResp.data : null;

        if (putDocIndexResp.meta.status != 200) {
            throw new Error('Error encountered when calling putDocumentIndexFields.');
        }
        if (!putDocIndexData) {
            throw new Error('Data was not returned when calling putDocumentIndexFields.');
        }

        //Return Array
        outputCollection[0] = 'Success';
        outputCollection[1] = 'Document Accepted';
        outputCollection[2] = DocumentID;
    } catch (error) {
        console.log(error);
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
