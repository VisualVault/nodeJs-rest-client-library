/**
 * LibViewDocumentsModalDelete
 * Category: Workflow
 * Modified: 2025-12-19T14:43:37.693Z by sebastian.rolando@visualvault.com
 * Script ID: Script Id: a2d0dac4-0fd4-ef11-82bd-d3a492f2461d
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
    /*Script Name: LibViewDocumentsModalDelete
  Customer:      VisualVault Library Function
  Purpose:       The purpose of this process is to delete a selected document as a part of the ViewDocumentsModal process.
  Parameters:
                documentID (String, Required) - The 'documentId' property of the VV document data
                documentGUID (String, Required) - The 'id' property of the VV document data
                formGUID (String, Required) - The 'revision' of the Form from which this library is being called
  Return Array:
                [0] Status: 'Success', 'Error'
                [1] Message
  Psuedo code:
                1. Update the Document Verified index field of the document to be 'No'
                2. Call unrelateDocument to unrelate the doc from the app
  Date of Dev: 05/02/2023
  Last Rev Date: 06/04/2025
  Revision Notes:
  05/02/2023 - John Sevilla: Script created
  06/04/2025 - Alfredo Scilabra: Added formGUID param and logic to unrelate docs from related app
  12/19/2025 - Sebastian Rolando: Add a process that disable the related Associated Document Relation if exists
  */
    logger.info('Start of the process LibViewDocumentsModalDelete at ' + Date());

    /****************
  Config Variables
  *****************/
    const errorMessageGuidance = 'Please try again or contact a system administrator if this problem continues.';
    const missingFieldGuidance = 'Please provide a value for the missing field(s).';

    /****************
  Script Variables
  *****************/
    let outputCollection = [];
    let errorLog = [];

    /****************
    Helper Functions
    *****************/
    // Check if field object has a value property and that value is truthy before returning value.
    function getFieldValueByName(fieldName, isOptional) {
        try {
            let fieldObj = ffCollection.getFormFieldByName(fieldName);
            let fieldValue = fieldObj && (fieldObj.hasOwnProperty('value') ? fieldObj.value : null);

            if (!isOptional && !fieldValue) {
                throw new Error(`${fieldName}`);
            }
            return fieldValue;
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
            // If an error ocurrs, it's because the resp is already a JS object and doesn't need to be parsed
        }
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
        Checks that the meta property of a vvCliente API response object has the expected status code
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
        Checks that the data property of a vvCliente API response object exists 
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
        Checks that the data property of a vvCliente API response object is not empty
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

    function unrelateDocFromRecord(recordGUID, documentGUID) {
        const shortDescription = `Unrelate document: ${documentGUID} from form: ${recordGUID}`;

        return vvClient.forms
            .unrelateDocument(recordGUID, documentGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    function deleteDocumentFromLibrary(documentID, documentGUID) {
        const shortDescription = `Delete documentID: ${documentID} documentGUID: ${documentGUID}`;
        return vvClient.documents
            .deleteDocument(
                {
                    q: `id = '${documentID}'`,
                },
                documentGUID
            )
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    async function disableAssociatedDocumentRelation(docGUID) {
        function getRecordGUID(formTemplateName, docGUID) {
            const shortDescription = `GetForm ${formTemplateName}`;
            const getParentFormParams = {
                q: `[Document GUID] eq '${docGUID}' and [Status] eq 'Enabled'`, // recordID = "INDV-000001"
                fields: 'revisionId',
            };

            return (
                vvClient.forms
                    .getForms(getParentFormParams, formTemplateName)
                    .then((res) => parseRes(res))
                    .then((res) => checkMetaAndStatus(res, shortDescription))
                    .then((res) => checkDataPropertyExists(res, shortDescription))
                    //.then((res) => checkDataIsNotEmpty(res, shortDescription))
                    .then((res) => (res.data && res.data[0] ? res.data[0].revisionId : undefined))
            );
        }

        function updateRecord(formTemplateName, recordGUID) {
            const shortDescription = `Update form record ${recordGUID}`;
            const fieldValuesToUpdate = {
                Status: 'Disabled',
            };

            return vvClient.forms
                .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                .then((res) => checkDataIsNotEmpty(res, shortDescription));
        }

        const recordGUID = await getRecordGUID('Associated Document Relation', docGUID);
        recordGUID && (await updateRecord('Associated Document Relation', recordGUID));
    }

    try {
        /*********************
    Form Record Variables
    **********************/
        const documentID = getFieldValueByName('documentID');
        const documentGUID = getFieldValueByName('documentGUID');
        const formGUID = getFieldValueByName('formGUID');

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        /****************
    BEGIN ASYNC CODE
    *****************/
        // Step 2. Delete the document from the document library
        const deleteDocumentResp = await deleteDocumentFromLibrary(documentID, documentGUID);
        if (deleteDocumentResp.meta.status !== 200 && deleteDocumentResp.meta.status !== 404) {
            throw new Error(`Could not delete the document. ${errorMessageGuidance}`);
        }

        // Step 2. Call unrelateDocument to unrelate the doc from the app
        const unrelateDocResp = await unrelateDocFromRecord(formGUID, documentGUID);
        if (unrelateDocResp.meta.status !== 200 && unrelateDocResp.meta.status !== 404) {
            throw new Error(`Could not unrelate the document. ${errorMessageGuidance}`);
        }

        // Step 3. If exists, disable the Associated Document Relation record
        await disableAssociatedDocumentRelation(documentGUID);

        // send to client
        outputCollection[0] = 'Success';
        outputCollection[1] = 'Document Deleted';
    } catch (error) {
        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = 'Error';
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = errorLog;
    } finally {
        response.json(200, outputCollection);
    }
};
