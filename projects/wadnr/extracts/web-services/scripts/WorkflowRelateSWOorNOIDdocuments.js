/**
 * WorkflowRelateSWOorNOIDdocuments
 * Category: Workflow
 * Modified: 2026-04-08T19:52:48.567Z by santiago.tortu@visualvault.com
 * Script ID: Script Id: 26b06fdd-85db-f011-82fe-83085a48d862
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
    /*
  Script Name:    WorkflowRelateSWOorNOIDdocuments
  Customer:       WADNR
  Purpose:        The purpose of this process is to create automation that will relate a document 
                  uploaded with a Multi-Purpose Form (MPF) and populate the GUID of that document 
                  into a hidden field of the MPF when the document type is “NOID or SWO."
  Parameters:
                  ('Document ID', string): Document ID of the document uploaded (e.g. FPA-DOC-00000001)
  Pseudo code:
                  1. Get parameters
                  2. Check is the required parameters are present
                  3. Obtain data from the document
                  4. Obtain the related form's revisionId
                  5. Read the existing Document GUID (best-effort)
                  6. Concatenate the new Document GUID to the existing ones (if any)
                  7. Set the Document GUID hidden field with concatenated values
                  8. Build the success response array

  Date of Dev:    12/19/2025
  Last Rev Date:  08/02/2026

  Revision Notes:
                  12/19/2025 - Fernando Chamorro: First Setup of the script
                  08/02/2026 - Santiago Tortu: Concatenate multiple Document GUIDs instead of overwriting
*/

    logger.info('Start of the process WorkflowRelateSWOorNOIDdocuments at ' + Date());

    /**************************************
   Response and error handling variables
  ***************************************/

    let returnObject;

    // Respond immediately before the "processing"
    const responseParams = {
        success: true,
        message: 'Process started successfully.',
    };
    response.json(200, responseParams);

    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /***********************
   Configurable Variables
  ************************/

    const multipurposeTemplateName = 'Multi-purpose';

    /*****************
   Script Variables
  ******************/

    // Describes the process being checked using the parsing and checking helper functions
    let shortDescription = '';
    let processMessage = '';

    // Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete.
    const executionId = response.req.headers['vv-execution-id'];

    /*****************
   Helper Functions
  ******************/

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

    function getDocument(documentID) {
        const shortDescription = `Get Documents Data for '${documentID}'`;
        const getDocsParams = {
            q: `Name = '${documentID}'`, // documentID = "FPA-DOC-000001"
            indexFields: 'include',
        };

        return vvClient.documents
            .getDocuments(getDocsParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]);
    }

    function getGUIDFromFormID(formID, templateName) {
        const shortDescription = `Get (${templateName}) record from the FormID (${formID})`;

        const getFormsParams = {
            q: `[Form ID] eq '${formID}'`,
            fields: 'revisionId',
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]['revisionId']);
    }

    function getExistingDocumentGUID(formID, templateName) {
        // Best-effort read of the existing 'Document GUID' field. Returns "" on any failure
        // so the workflow falls back to overwrite behavior instead of failing completely.
        const shortDescription = `Get existing 'Document GUID' from FormID (${formID})`;

        const getFormsParams = {
            q: `[Form ID] eq '${formID}'`,
            fields: 'Document GUID',
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => {
                const record = res.data[0];
                const value = record['Document GUID'] || record['document GUID'] || '';
                logger.info(`Existing Document GUID read for FormID ${formID}: '${value}'`);
                return value;
            })
            .catch((err) => {
                logger.info(
                    `Could not read existing Document GUID for FormID ${formID}: ${err}. Falling back to empty.`
                );
                return '';
            });
    }

    function setHiddenField(recordGUID, templateName, documentGUID) {
        const shortDescription = `Set 'Document GUID' hidden field in ${templateName}`;

        const fieldValuesToUpdate = {
            'Document GUID': documentGUID,
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, templateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    /**
     * @param {Object} object
     * @returns {Object} A new object with lowercase keys
     */
    function lowerizeObjectKeys(obj) {
        return Object.keys(obj).reduce((acc, k) => {
            acc[k.toLowerCase()] = obj[k];
            return acc;
        }, {});
    }

    /**********
   MAIN CODE 
  **********/
    try {
        // 1. Get parameters
        const documentID = getFieldValueByName('Document ID');

        // 2. Check is the required parameters are present
        if (!documentID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3. Obtain data from the document
        const documentData = await getDocument(documentID);
        const documentDataLowerized = lowerizeObjectKeys(documentData);
        const documentGUID = documentDataLowerized['id'];
        const relatedRecord = documentDataLowerized['other record id number'];

        // 4. Obtain the related form's revisionId (same as original code path)
        const relatedRecordGUID = await getGUIDFromFormID(relatedRecord, multipurposeTemplateName);
        logger.info(
            `WorkflowRelateSWOorNOIDdocuments: relatedRecordGUID='${relatedRecordGUID}', new documentGUID='${documentGUID}'`
        );

        // 5. Read the existing Document GUID separately (best-effort, returns "" on failure)
        const existingDocumentGUID = await getExistingDocumentGUID(relatedRecord, multipurposeTemplateName);

        // 6. Concatenate the new Document GUID to the existing ones (if any)
        let updatedDocumentGUID;
        if (existingDocumentGUID && existingDocumentGUID.trim() !== '') {
            // Check if the document GUID is already in the list to avoid duplicates
            const existingGUIDs = existingDocumentGUID.split(',').map((g) => g.trim());
            if (!existingGUIDs.includes(documentGUID)) {
                updatedDocumentGUID = existingDocumentGUID + ',' + documentGUID;
            } else {
                updatedDocumentGUID = existingDocumentGUID;
            }
        } else {
            updatedDocumentGUID = documentGUID;
        }
        logger.info(
            `WorkflowRelateSWOorNOIDdocuments: writing Document GUID='${updatedDocumentGUID}' to recordGUID='${relatedRecordGUID}'`
        );

        // 7. Set the Document GUID hidden field with concatenated values
        const setDocumentGUIDHiddenField = await setHiddenField(
            relatedRecordGUID,
            multipurposeTemplateName,
            updatedDocumentGUID
        );

        // 8. Build the success response array
        if (setDocumentGUIDHiddenField.meta.status === 201) {
            processMessage = 'Document GUID hidden field set successfully.';
        } else {
            processMessage = 'The Document GUID hidden field was not possible to set.';
        }

        // Create the following object that will be used when the api call is made to communicate the workflow item is complete.
        // First two items of the object are required to tell if the process completed successfully and the message that should be returned.
        // The other items in the object would have the name of any workflow variable that would be updated with data coming from the microservice/node script.
        returnObject = {
            MicroserviceResult: true,
            MicroserviceMessage: 'Microservice completed successfully',
            DocID: documentID,
            'Process Message': processMessage,
        };
    } catch (err) {
        logger.info('Error encountered' + err);

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: err,
        };
    } finally {
        shortDescription = 'Sending the workflow completion response to the log server';

        // If the complete was successful or not to the log server. This helps to track down what occurred when a microservice completed.
        await vvClient.scripts
            .completeWorkflowWebService(executionId, returnObject)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then(() => logger.info('Completion signaled to WF engine successfully.'))
            .catch(() => logger.info('There was an error signaling WF completion.'));
    }
};
