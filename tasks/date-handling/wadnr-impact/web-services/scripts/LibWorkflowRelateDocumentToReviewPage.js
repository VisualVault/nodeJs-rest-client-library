/**
 * LibWorkflowRelateDocumentToReviewPage
 * Category: Workflow
 * Modified: 2026-03-25T20:09:01.13Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: 388b019d-d49e-f011-82ee-e7f084c73f7e
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const fs = require('fs');

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
      Script Name:    LibWorkflowRelateDocumentToReviewPage
      Customer:       WADNR
      Purpose:        Relates uplooaded documents to the correct review page (ARP or WTMRP) based on FPA Number.
      Preconditions:
      Parameters:
                      - FPA Number: (String, Required) — Application Number to relate to the document
                      - DocID:  (String, Required) — Document ID to relate to the review page

      Pseudo code:
                      1   Receives parameters and validates them.
                      2   Determine if the document was uploaded for an FPAN or WTM Number.
                      3   Get associated document relation for the corresponding review page and determine if an Associated Document Relation record already exists.
                      4   If the relation does not exist, then create the Associated Document Relation record to relate the document to the review page.
                      5   Build response object and return.


      Date of Dev:    10/01/2025
      Last Rev Date:  03/25/2026

      Revision Notes:
                      10/01/2025 - Mauro Rapuano: First Setup of the script
                      11/15/2025 - Santiago Tortu: Added WTM-specific print order support.
                      11/21/2025 - Santiago Tortu: Added support for manual document uploads.
                      12/17/2025 - Ross Rhone: Added relating the document to the review page after creating the Associated Document Relation record.
                      01/06/2025 - Sebastian Rolando: Fix parameter value issue for function relateDocToRecord
                      01/14/2026 - Alfredo Scilabra: Add updateAssociatedDocumentRelationFromDoc to update associated Doc record if document get updated
                      01/22/2026 - Mauro Rapuano:   Fix createAssociatedDocumentRelationFromDoc call to pass correct Related Record ID
                      02/13/2026 - Mauro Rapuano: Pad print order with leading zeros to ensure correct sorting (e.g., 01, 02, ..., 10, 11, etc.)
                      03/25/2026 - Mauro Rapuano: Update to set print order to "Not Printed" for sensitive/protected documents

      */

    logger.info('Start of the process LibWorkflowRelateDocumentToReviewPage at ' + Date());

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    let returnObject;

    // Respond immediately before the "processing"
    const responseParams = {
        success: true,
        message: 'Process started successfully.',
    };
    response.json(200, responseParams);

    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */
    const printOrderObjDocuments = {
        'Office Review Summary': 0,
        'FPA/N Addendum/Additional Information': 4,
        'FPA Activity Map': 5,
        'State/Federal Conservation Agreement': 6,
        'Alternate Plan or Alternate Plan Template': 7,
        'Alternate Plan Map': 8,
        'Conversion Options Harvest Plan (COHP)': 9,
        'Forest Practice Hydraulic Project (FPHP) Plans & Specifications': 10,
        'Desired Future Condition (DFC) Documents': 11,
        'Water Typing Map': 13,
        'Water Type Modification Form (Processed)': 15,
        'Other - WTMF': 16,
        'Appendix C. Inner Zone Hardwood Conversion Worksheet': 17,
        'Slope Stability Map': 19,
        'Qualified Expert Report - Appendix D': 20,
        'Other - Appendix D': 21,
        'Appendix E. Channel Migration Zone Assessment Form': 22,
        'Qualified Expert Report - Appendix E': 23,
        'Appendix F. Stream Shade Assessment Worksheet': 24,
        'Appendix G. Type NP RMZ Worksheet': 25,
        'Other - Appendix H': 27,
        'Appendix I. Watershed Analysis Worksheet': 28,
        'Watershed Analysis Prescriptions': 29,
        'Sensitive Information Map': 31,
        'Water Protocol Survey': 32,
        'Small Forest Landowner (SFL) Road Maintenance and Abandonment Plan (RMAP) Checklist': 33,
        'Archaeological/Cultural Resource Documents': 34,
        'Habitat Plans/Reports': 35,
        '10-year Forest Management Plan and Statement of Intent to Keep in Forestry': 36,
        'State Environmental Policy Act (SEPA) Checklist/Documents': 37,
        'Local Government Entity (LGE) Permit(s)/Info': 38,
        'Informal Conference Notification': 40,
        Other: 41,
        'FPAN External': 'Not Printed',
        'FPA/N - Hard Copy Submittal': 'Not Printed',
        'Multi-purpose': 'Not Printed',
        'Appeal & Associated Documents': 'Not Printed',
        'Brief Adjudicative Proceeding (BAP) Request & Associated Documents': 'Not Printed',
        'Civil Penalty & Associated Documents': 'Not Printed',
        'Forester Field Notes': 'Not Printed',
        'FPHP Office Checklist': 'Not Printed',
        'Notice of Continuing Forest Landowner Obligation (NCFLO)': 'Not Printed',
        'Notice of Intent to Disapprove (NOID)': 'Not Printed',
        'Stop Work Order': 'Not Printed',
    };

    const printOrderObjDocumentsWTMF = {
        'WTM Decision Summary Report': 0,
        'Water Typing Map': 2,
        'Water Protocol Survey(s)': 3,
        'Water Type Modification Form (Processed)': 4,
        'Other - WTMF': 5,
        'Informal Conference Note': 6,
        'Informal Conference Note': 7,
        Other: 8,
        'WTM External': 'Not Printed',
    };

    let printOrderCounter = 42;

    /* -------------------------------------------------------------------------- */
    /*                           Script Variables                                 */
    /* -------------------------------------------------------------------------- */

    // Describes the process being checked using the parsing and checking helper functions
    let shortDescription = '';
    // Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete.
    const executionId = response.req.headers['vv-execution-id'];

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

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode) {
        if (!vvClientRes.meta) {
            throw new Error(
                `${shortDescription} error. No meta object found in response. Check method call parameters and credentials.`
            );
        }

        const status = vvClientRes.meta.status;
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
        const status = vvClientRes.meta.status;
        if (status != ignoreStatusCode) {
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

    function getReviewPageRecord(filterValue, templateName, appTypeNumber) {
        const shortDescription = `Get form ${templateName}`;
        const getFormsParams = {
            q: `[${appTypeNumber}] eq '${filterValue}'`,
            //expand: true, // true to get all the form's fields
            fields: 'form ID', // to get only the fields 'id' and 'name'
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getFormRecordsByRPId(filterValue, templateName) {
        const shortDescription = `Get form ${templateName}`;
        const getFormsParams = {
            q: `[ARP ID or WTM RP ID] eq '${filterValue}'`,
            //expand: true, // true to get all the form's fields
            fields: 'document Form Name', // to get only the fields 'id' and 'name'
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function createFormRecord(formTemplateName, newRecordData) {
        const shortDescription = `Post form ${formTemplateName}`;

        return vvClient.forms
            .postForms(null, newRecordData, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function getDocument(documentIdGuid) {
        const shortDescription = `Get Documents Data for '${documentIdGuid}'`;
        const getDocsParams = {
            q: `[documentId] eq '${documentIdGuid}'`,
            indexFields: 'include',
        };

        return vvClient.documents
            .getDocuments(getDocsParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function relateDocumentToRecord(recordGUID, documentGUID) {
        const shortDescription = `Relate document '${documentGUID}' to form '${recordGUID}'`;

        return vvClient.forms
            .relateDocument(recordGUID, documentGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    function getRecordRelatedDocs(recordGUID) {
        const shortDescription = `Get forms related to ${recordGUID}`;

        return vvClient.forms
            .getFormRelatedDocs(recordGUID, null)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function getAllRelatedRecords(recordGUID) {
        const shortDescription = `Records related to the record ${recordGUID}`;

        return vvClient.forms
            .getFormRelatedForms(recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function mapFields(original, definedMap) {
        const result = {};
        for (const [origKey, newKey] of Object.entries(definedMap)) {
            result[newKey] = original[origKey] ?? '';
        }
        return result;
    }

    async function relateDocToRecord(parentRecordGUID, childDocID) {
        const shortDescription = `relating forms: ${parentRecordGUID} and form ${childDocID}`;
        //404 is needed so that a hard error is not thrown when relationship already exists.
        const ignoreStatusCode = '404';

        return vvClient.forms
            .relateDocument(parentRecordGUID, childDocID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode));
    }

    function getFormPrefix(formID) {
        // Capture everything up to the last hyphen followed by digits
        const prefixReg = /^(.+)-\d+$/;
        let formPrefix = '';
        try {
            const match = prefixReg.exec(formID);
            if (!match) {
                throw new Error('Invalid format');
            }
            formPrefix = match[1];
        } catch (error) {
            throw new Error(`Unable to parse form prefix for: "${formID}". ${error.message}`);
        }

        return formPrefix;
    }

    function classifyNumber(number) {
        /*
          Function to determine the type of number (FPAN or WTMF)
          Parameters:
            number: A string representing the number to classify.
          Returns:
            'FPAN' if the number matches the FPAN pattern,
            'WTMF' if it matches the WTMF pattern,
        */

        // Define regex patterns for FPAN and WTMF numbers
        const fpanPattern = /^[A-Z]{2}-FPA-\d{2}-\d{4}$/;
        const wtmfPattern = /^[A-Z]{2}-WTM-\d{2}-\d{4}$/;

        if (fpanPattern.test(number)) {
            return 'FPAN';
        } else if (wtmfPattern.test(number)) {
            return 'WTMF';
        } else {
            throw new Error(`Invalid number format: ${number}`);
        }
    }

    function classifyFormId(formId) {
        /*
        Function to determine the type of form id (FPAN or WTMF)
        Parameters:
          formId: A string representing the form id to classify.
        Returns:
          'FPAN' if the form id matches the FPAN pattern,
          'WTMF' if it matches the WTMF pattern,
        */

        const fpanPattern = /^APPLICATION-REVIEW-/;
        const wtmfPattern = /^WTMRP-/;

        if (fpanPattern.test(formId)) {
            return 'FPAN';
        } else if (wtmfPattern.test(formId)) {
            return 'WTMF';
        } else {
            throw new Error(`Invalid form id format: ${formId}`);
        }
    }

    function createAssociatedDocumentRelationFromDoc(doc, formID) {
        const shortDescription = `Create Associated Document Relation record`;

        // Determine if this is for WTM or FPAN based on formID
        const isWTMF = classifyFormId(formID) === 'WTMF';
        const printOrderToUse = isWTMF ? printOrderObjDocumentsWTMF : printOrderObjDocuments;

        const associatedDocRelation = {
            'Document Form Name': doc[0]['name'],
            'Document Form Type': doc[0]['document type'],
            'Sensitive Indicator': doc[0]['sensitive\\protected content'] || '',
            'Document Form Status': doc[0]['releaseState'],
            'Document Create By': doc[0]['createBy'],
            'Document Create Date': doc[0]['createDate'],
            'Receipt Date': doc[0]['createDate'],
            'Document Modify By': doc[0]['modifyBy'],
            'Document Modify Date': doc[0]['modifyDate'],
            'Document GUID': doc[0]['id'],
            'Document or Form': 'Document',
            'Related Record ID': doc[0]['documentId'],
            'ARP ID or WTM RP ID': formID,
            'Print Order':
                doc[0]['sensitive\\protected content'] === 'Yes'
                    ? 'Not Printed'
                    : String(
                          printOrderToUse[doc[0]['document type']] !== undefined
                              ? printOrderToUse[doc[0]['document type']]
                              : isWTMF
                                ? printOrderObjDocumentsWTMF['Other'] // For WTM, unspecified documents use order 8 ("Other") to maintain the 0-8 range
                                : printOrderCounter++
                      ).padStart(2, '0'), // Pad the print order with leading zeros to ensure correct sorting (e.g., 01, 02, ..., 10, 11, etc.)
        };

        return vvClient.forms
            .postForms(null, associatedDocRelation, 'Associated Document Relation')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    function updateRecord(templateName, recordGUID, fieldValuesToUpdate) {
        const shortDescription = `Update form record ${recordGUID}`;

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, templateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    function updateAssociatedDocumentRelationFromDoc(doc, associatedDocRevisionId) {
        const updateObj = {
            'Sensitive Indicator': doc[0]['sensitive\\protected content'] || '',
            'Document Modify By': doc[0]['modifyBy'],
            'Document Modify Date': doc[0]['modifyDate'],
            'Document GUID': doc[0]['id'],
            ...(doc[0]['sensitive\\protected content'] === 'Yes' && {
                'Print Order': 'Not Printed',
            }),
        };

        return updateRecord('Associated Document Relation', associatedDocRevisionId, updateObj);
    }

    function getDocumentById(docID) {
        const shortDescription = `Get Documents Data for '${docID}'`;
        const getDocsParams = {
            q: `Name = '${docID}'`, // docID = "DOC-000001"
            indexFields: 'include',
        };

        return vvClient.documents
            .getDocuments(getDocsParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function updateDocumentIndexFields(
        indexFieldsToUpdate,
        documentGUID,
        shortDescription = `Update index fields for ${documentGUID}`
    ) {
        /*
          Function to update document index fields
          Parameters:
            indexFieldsToUpdate: Object with the index fields to update
            documentGUID: The document GUID
            shortDescription: Description for error messages
        */
        const indexFieldsDataWrapper = {
            indexFields: JSON.stringify(indexFieldsToUpdate),
        };

        return vvClient.documents
            .putDocumentIndexFields(indexFieldsDataWrapper, documentGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function extractFPANumberFromPath(folderPath) {
        /*
          Function to extract FPA Number from folder path
          Parameters:
            folderPath: A string representing the folder path (e.g., "/FPA/2024/0-1000/SP-FPA-24-0045")
          Returns:
            The FPA Number if found, null otherwise
        */
        if (!folderPath || typeof folderPath !== 'string') {
            return null;
        }

        // Define regex patterns for FPAN and WTMF numbers
        const fpanPattern = /([A-Z]{2}-FPA-\d{2}-\d{4})/;
        const wtmfPattern = /([A-Z]{2}-WTM-\d{2}-\d{4})/;

        // Try to find FPAN pattern first
        const fpanMatch = folderPath.match(fpanPattern);
        if (fpanMatch) {
            return fpanMatch[1];
        }

        // Try to find WTMF pattern
        const wtmfMatch = folderPath.match(wtmfPattern);
        if (wtmfMatch) {
            return wtmfMatch[1];
        }

        return null;
    }
    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get parameters
        let fpaNumber = getFieldValueByName('FPA Number');
        const docId = getFieldValueByName('DocID');

        // 1. Receives parameters and validates them.
        if (!fpaNumber || !docId) {
            throw new Error(errorLog.join('; '));
        }

        // If fpaNumber is "manual-upload", extract it from the document's folder path
        let documentInfo = null;
        if (fpaNumber === 'manual-upload') {
            documentInfo = await getDocumentById(docId);
            if (!documentInfo || !documentInfo[0]) {
                throw new Error(`Error while getting document info to extract FPA Number. DocID: ${docId}`);
            }

            const folderPath = documentInfo[0]['folderPath'];
            if (!folderPath) {
                throw new Error(`Document folder path not found. DocID: ${docId}`);
            }

            const extractedFPANumber = extractFPANumberFromPath(folderPath);
            if (!extractedFPANumber) {
                throw new Error(`Could not extract FPA Number from folder path: ${folderPath}`);
            }

            // Update the document's indexFields with the extracted FPA Number
            const documentGUID = documentInfo[0]['documentId'] || documentInfo[0]['id'];
            if (documentGUID) {
                await updateDocumentIndexFields(
                    { 'FPA Number': extractedFPANumber },
                    documentGUID,
                    `Update FPA Number index field for document ${docId}`
                );
                logger.info(`Document ${docId} updated with FPA Number: ${extractedFPANumber}`);
            } else {
                logger.info(`Warning: Could not find document GUID to update indexFields for document ${docId}`);
            }

            fpaNumber = extractedFPANumber;
            logger.info(`FPA Number extracted from folder path: ${fpaNumber}`);
        }

        // 2. Determine if the document was uploaded for an FPAN or WTM Number.
        const applicationType = classifyNumber(fpaNumber);

        // 3. Get associated document relation for the corresponding review page and determine if an Associated Document Relation record already exists.
        // Get the RP information
        const reviewPageInfo = await getReviewPageRecord(
            fpaNumber,
            applicationType === 'FPAN' ? 'Application Review Page' : 'WTM Review Page',
            applicationType === 'FPAN' ? 'FPAN Number' : 'WTMF No'
        );
        if (reviewPageInfo.length < 1) {
            throw new Error(`Error while getting Review Page info. Application Number: ${fpaNumber}`);
        }

        const associatedDocRelationRecord = await getFormRecordsByRPId(
            reviewPageInfo[0]['form ID'],
            'Associated Document Relation'
        );

        // Filter the associated document relation records to find if the document is already related
        const associatedDocRelationRecordFiltered = associatedDocRelationRecord.filter(
            (item) => item['document Form Name'] === docId
        );

        // 4. If the relation does not exist, then create the Associated Document Relation record to relate the document to the review page.
        let message = '';
        // Get the document information (reuse if already obtained when extracting FPA Number)
        if (!documentInfo) {
            documentInfo = await getDocumentById(docId);
        }
        if (!documentInfo) {
            throw new Error(`Error while getting document info. DocID: ${docId}`);
        }
        if (associatedDocRelationRecordFiltered.length < 1) {
            // Create the Associated Document Relation record
            await createAssociatedDocumentRelationFromDoc(documentInfo, reviewPageInfo[0]['form ID']);

            const docId = documentInfo[0]['id'];
            await relateDocToRecord(reviewPageInfo[0].revisionId, docId);

            message = 'Associated Document Relation record created successfully.';
        } else {
            await updateAssociatedDocumentRelationFromDoc(
                documentInfo,
                associatedDocRelationRecordFiltered[0].revisionId
            );
            message = 'Associated Document Relation record already exists.';
        }

        // 5. Build response object and return.

        returnObject = {
            MicroserviceResult: true,
            MicroserviceMessage: message,
            Success: 'Success',
        };
    } catch (err) {
        logger.info('LibWorkflowRelateDocumentToReviewPage: Error encountered' + err);

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
