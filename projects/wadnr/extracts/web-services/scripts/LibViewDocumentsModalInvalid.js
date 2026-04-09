/**
 * LibViewDocumentsModalInvalid
 * Category: Workflow
 * Modified: 2025-01-16T13:45:31.823Z by nicolas.culini@visualvault.com
 * Script ID: Script Id: 7f946c1f-10d4-ef11-82bd-d3a492f2461d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const { query } = require('winston');
var logger = require('../log');
const { get } = require('request');

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
    /*Script Name:   LibViewDocumentsModalInvalid
     Customer:      VisualVault Library Function
     Purpose:       The purpose of this process is to unrelate documents when marked invalid.
     Parameters:
     Return Array:
                    1. Status: 'Success', 'Minor Error', 'Error'
     Psuedo code:
                1. Call unrelateDocument to unrelate the doc
                2. Update index field as this may have been invalidated after being accepted
     Last Rev Date: 4/4/2024
     Revision Notes:
    6/6/2023 - Brian Davis: Script created
    4/4/2024 - Alfredo Scilabra: Commented out block 1. Call unrelateDocument to unrelate the doc.
     */

    logger.info('Start of the process LibViewDocumentsModalInvalid at ' + Date());

    /****************
     Config Variables
    *****************/
    //$$ScriptText_76$$
    let errorMessageGuidance = 'Please try again, or contact a system administrator if this problem continues.';
    //$$ScriptText_78$$
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
        let RevisionID = getFieldValueByName('REVISIONID');
        let DocumentID = getFieldValueByName('documentID');
        let DocumentGUID = getFieldValueByName('documentGUID');

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
        //IMPORTANT: THIS PART OF THE CODE WAS COMMENTED OUT AS REQUESTED IN TICKET PAELS-7522
        //1. Call unrelateDocument to unrelate the doc
        // let unrelateDoc = await vvClient.forms.unrelateDocument(
        //   RevisionID,
        //   DocumentGUID,
        // );
        // let unrelateResp = JSON.parse(unrelateDoc);
        // if (unrelateResp.meta.status !== 200 && unrelateResp.meta.status !== 404) {
        //   throw new Error(`Could not unrelate the document.`);
        // }

        //2. Update index field as this may have been invalidated after being accepted
        var fieldData = {
            'Document Accepted': '',
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
        outputCollection[1] = `Document Invalidated`;
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
