/**
 * LibApplicationReviewCollectRelatedDocs
 * Category: Form
 * Modified: 2026-02-13T18:43:33.003Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: d1e3856f-ca1e-f011-82d6-afeb582902bd
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
      Script Name:    LibApplicationReviewCollectRelatedDocs
      Customer:       WADNR
      Purpose:        The purpose of this library is to help gather documentation related to an application and relate it
                      to the Application Review Page or WTM Review Page based on the parameters provided.
      Preconditions:
                      - List of libraries, form, queries, etc. that must exist in order this code to run
                      - You can also list other preconditions as users permissions, environments, etc
      Parameters:
                      - Form ID:      This is the Form ID of the application where the information
                                      needs to be acquired.
  
                      - FPAN/WTMF Number: This is the id provided so we can find either the Application Review Page or
                                          WTM Review Page to associate the documents and forms.
      Pseudo code:
                      #1 Get parameters
                      #2 Check is the required parameters are present
                      #3 Get the Application Review Page (ARP) records and/or WTM Review Page (WTMRP) records to get the Form ID of that record
                        #3A Handle multiple FPAN Numbers and/or WTMF Numbers scenario
                        #3B Handle single FPAN or WTMF Number scenario
                      #4 Get the form record and all related forms and subforms for the Application
                        #4.1 Get related forms of the Application
                        #4.2 Get related forms of each subform in parallel
                        #4.3 Get all related documents uploaded to each of the forms and subforms
                      #5 Compare the list of related forms and documents to obtain those not yet related to the ARP
                      #6 Related the “not yet related” documents and forms to the Application Review page
                        #6.1 Relate Forms
                        #6.2 Relate Docs
                        #6.3 Create Associated Document Relation record for each form and document
                      #7 Build Response
  
      Date of Dev:    04/22/2025
      Last Rev Date:  02/13/2026
  
      Revision Notes:
                      04/22/2025 - Fernando Chamorro: First Setup of the script
                      05/29/2025 - Mauro Rapuano:     Filter contact information records to avoid relating a large amount of forms/docs
                      07/17/2025 - Fernando Chamorro: Adding NOD prefix in templateNames object
                      07/25/2025 - Lucas Herrera:     Create Associated Document Relation record for each form and document
                      08/07/2025 - Alfredo Scilabra:  Update detectFormTemplateFromID to not throw error if template name not found
                                                      This was causing related forms like COMM-LOG to throw error and prevent further execution
                      08/29/2025 - Alfredo Scilabra:  Added print order.
                      09/11/2025 - Sebastian Rolando: Adding SPS-NCN- prefix in templateNames object
                      09/18/2025 - Federico Cuelho:   Refactor all logic to handle single FPAN or multiple FPAN/WTMF numbers
                      09/23/2025 - Sebastian Rolando: Prevent ARP o WTM Review Page for relating itself. Also, prevent unexpected merging relations, preventing retrie subforms record template like 'Contact Information', 'Business' or 'Contact Information Relation'.  
                      10/02/2025 - Mauro Rapuano:     Add Document or Form field to Associated Document Relation record
                      12/12/2025 - Mauro Rapuano:     Added Appendixes to create Associated Document Relation records.
                      12/12/2025 - Sebastian Rolando: Update classifyFormId function to detect correctly the prefix for the ARP Template
                      12/15/2025 - Mauro Rapuano:     Added duplicates validation to avoid creating multiple Associated Document Relation records for the same document/form.
                      12/19/2025 - Sebastian Rolando: Add mapping for Status Enabled when creating Associated Document Relation Form
                      12/30/2025 - Sebastian Rolando: Add the Receipt Date field for the mapping when the ADR is created
                      12/30/2025 - Federico Cuelho:   Added logic to relate WTM Review Page single id.
                      01/21/2026 - Fernando Chamorro: Fix duplicate Associated Document Relations by properly filtering forms and docs
                                                        - Separate associated IDs into formIds and docIds sets based on record type
                                                        - Filter forms using both formsToRelateSet (revision ID) and associatedFormIds (form ID)
                                                        - Filter docs using both docsToRelateSet (doc ID) and associatedDocIds (document ID)
                                                        - Prevent race conditions when multiple processes create relations simultaneously
                      01/22/2026 - Mauro Rapuano:   Disable creation of ADR records for documents as it's being handled in another workflow to avoid duplicates
                      02/13/2026 - Mauro Rapuano:   Map 'Submitted' status to 'Received' when creating Associated Document Relation records to avoid execution time issues
      */

    logger.info(`Start of the process LibApplicationReviewCollectRelatedDocs at ${Date()}`);

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

    const AppReviewPageTemplateName = 'Application Review Page';
    const WTMReviewPageTemplateName = 'WTM Review Page';
    const printOrderObjFormTemplate = {
        'Step 1 Long Term FPA': 1,
        'Forest Practices Application Notification': 2,
        'Forest Practices Aerial Chemical Application': 3,
        'Appendix A Water Type Classification': 12,
        'Water Type Modification Form': 14,
        'Appendix D Slope Stability Informational': 18,
        'Appendix H. Eastern Washington Natural Regeneration Plan': 26,
        'Appendix J Forest Practices Marbled Murrelet': 30,
        'Informal Conference Notification': 39,
    };

    // print order only for WTMF
    const printOrderObjFormTemplateWTMF = {
        'Water Type Modification Form': 1,
        'Informal Conference Notification': 6,
    };

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

    // print order only for WTMF
    const printOrderObjDocumentsWTMF = {
        'WTM Decision Summary Report': 0,
        'Water Typing Map': 2,
        'Water Protocol Survey(s)': 3,
        'Water Type Modification Form (Processed)': 4,
        'Other - WTMF': 5,
        'Informal Conference Note': 6,
        'Informal Conference Note': 7,
        Other: 8,
    };

    let printOrderCounter = 42;

    // Describes the process being checked using the parsing and checking helper functions
    let shortDescription = '';

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

    function isNullEmptyUndefined(param) {
        if (param === null || param === undefined) {
            return true;
        }
        const dataType = Object.prototype.toString.call(param).slice(8, -1).toLowerCase(); //slicing the string returned by the toString method to remove the first eight characters ("[object ") and the last character (]), leaving only the name of the data type.
        switch (dataType) {
            case 'string':
                if (
                    param.trim().toLowerCase() === 'select item' ||
                    param.trim().toLowerCase() === 'null' ||
                    param.trim().toLowerCase() === 'undefined' ||
                    param.trim() === ''
                ) {
                    return true;
                }
                break;
            case 'array':
                if (param.length === 0) {
                    return true;
                }
                break;
            case 'object':
                if (Object.keys(param).length === 0) {
                    return true;
                }
                break;
            default:
                return false;
        }
        return false;
    }

    function detectFormTemplateFromID(recordID) {
        //NOTE: Check for longer prefixes first!
        const templateMap = new Map([
            ['STEP-1-LONG-TERM-FPA', ['Step 1 Long Term FPA', 'Form ID']],
            ['FPA-AERIAL-CHEMICAL', ['Forest Practices Aerial Chemical Application', 'Form ID']],
            ['APPLICATION-REVIEW', ['Application Review Page', 'Form ID']],
            ['FPAN-AMENDMENT', ['FPAN Amendment Request', 'Form ID']],
            ['FPAN-RENEWAL', ['FPAN Renewal', 'Form ID']],
            ['FPAN-T', ['FPAN Notice of Transfer', 'Form ID']],
            ['LT-5DN', ['Long-Term Application 5-Day Notice', 'Form ID']],
            ['WTMRP', ['WTM Review Page', 'Form ID']],
            ['FPAN', ['Forest Practices Application Notification', 'FPAN ID']],
            ['NOD', ['FPAN Notice of Decision', 'Form ID']],
            ['NCNU', ['Notice of Conversion to Non Forestry Use', 'Form ID']],
            ['ICN', ['Informal Conference Note', 'Form ID']],
            ['WTM', ['Water Type Modification Form', 'WTMF ID']],
            ['NTC', ['Notice to Comply', 'Form ID']],
            ['AppendixA-ID-', ['Appendix A Water Type Classification', 'Form ID']],
            ['APPENDIX-D-', ['Appendix D Slope Stability Informational', 'Appendix D Slope Stability Information ID']],
            ['APPENDIX-H-', ['Appendix H Eastern Washington Natural Regeneration Plan', 'Form ID']],
            [
                'AppendixJ-',
                ['Appendix J Forest Practices Marbled Murrelet', 'Appendix J Forest Practices Marbled Murrelet ID'],
            ],
        ]);

        const normalizedID = recordID.replace(/\s+/g, '');

        for (const [prefix, formInformation] of templateMap) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return formInformation;
            }
        }
        return [];
    }

    async function getForms(getFormsParams, templateName) {
        shortDescription = `Get ${templateName} form record`;

        const getFormsRes = await vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));

        return getFormsRes.data;
    }

    async function getRecordByIdNumberType(number, formTemplateName) {
        /*
        Get record by its FPAN or WTMF number
        Parameters:
          number: The FPAN or WTMF number
          formTemplateName: The name of the form template where the record is stored
        Returns:
          The record object
      */
        const queryField = classifyNumber(number) === 'FPAN' ? '[FPAN Number]' : '[WTMF No]';
        const record = await getForms(
            {
                q: `${queryField} eq '${number}'`,
                expand: true,
            },
            formTemplateName
        );

        if (isNullEmptyUndefined(record)) {
            throw new Error(`Error getting record for ${number}.`);
        }

        return record;
    }

    async function getApplicationRecord(ApplicationID, templateName, formIdField) {
        /*
        Get Application record by its Form ID
        Parameters:
          ApplicationID: The Form ID of the Application record
          templateName: The name of the form template where the Application record is stored
          formIdField: The field in the Application form that contains the Form ID (usually "Form ID" or "FPAN ID")
        Returns:
          The Application record object
      */
        const applicationRecord = await getForms(
            {
                q: `[${formIdField}] eq '${ApplicationID}'`,
                expand: true,
            },
            templateName
        );

        if (isNullEmptyUndefined(applicationRecord)) {
            throw new Error('Error getting Application record.');
        }

        return applicationRecord;
    }

    function getRelatedDocs(formRevisionID, params = { indexFields: 'include' }) {
        const shortDescription = `Get related docs for record ${formRevisionID}`;
        return vvClient.forms
            .getFormRelatedDocs(formRevisionID, params)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getRelatedForms(formRevisionID, params = {}) {
        const shortDescription = `Get related forms for record ${formRevisionID}`;
        return vvClient.forms
            .getFormRelatedForms(formRevisionID, params)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function relateFormToRecord(parentRecordGUID, childRecordGUID) {
        const shortDescription = `Relate form '${parentRecordGUID}' to form '${childRecordGUID}'`;

        return vvClient.forms
            .relateForm(parentRecordGUID, childRecordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    function relateDocumentToRecord(documentGUID, recordGUID) {
        const shortDescription = `Relate document '${documentGUID}' to form '${recordGUID}'`;

        return vvClient.forms
            .relateDocument(recordGUID, documentGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    function createAssociatedDocumentRelationFromForm(form, formID) {
        const shortDescription = `Create Associated Document Relation record`;

        const printOrderToUse =
            classifyFormId(formID) === 'WTMF' ? printOrderObjFormTemplateWTMF : printOrderObjFormTemplate;

        const associatedDocRelation = {
            'Document Form Name': form['templateName'],
            'Document Form Type': form['templateName'],
            'Sensitive Indicator': form['sensitiveIndicator'] || '',
            'Document Form Status': form['status'] === 'Submitted' ? 'Received' : form['status'], //As Submitted is a mid step status, map it to Received to avoid execution time issues
            'Document Create By': form['createBy'],
            'Document Create Date': form['createDate'],
            'Receipt Date': form['createDate'],
            'Document Modify By': form['modifyBy'],
            'Document Modify Date': form['modifyDate'],
            'Document GUID': form['dhid1'],
            'Related Record ID': form['dhdocid1'],
            'Document or Form': 'Form',
            'ARP ID or WTM RP ID': formID,
            'Print Order': String(
                printOrderToUse[form['templateName']] !== undefined
                    ? printOrderToUse[form['templateName']]
                    : classifyFormId(formID) === 'WTMF'
                      ? printOrderObjDocumentsWTMF['Other'] // For WTM, unspecified forms use order 8 ("Other") to maintain the 0-8 range
                      : printOrderCounter++
            ).padStart(2, '0'), // Pad the print order with leading zeros to ensure correct sorting (e.g., 01, 02, ..., 10, 11, etc.)
            Status: 'Enabled',
        };

        return vvClient.forms
            .postForms(null, associatedDocRelation, 'Associated Document Relation')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    function createAssociatedDocumentRelationFromDoc(doc, formID) {
        const shortDescription = `Create Associated Document Relation record`;

        const printOrderToUse = classifyFormId(formID) === 'WTMF' ? printOrderObjDocumentsWTMF : printOrderObjDocuments;

        const associatedDocRelation = {
            'Document Form Name': doc['name'],
            'Document Form Type': doc['document type'],
            'Sensitive Indicator': doc['sensitiveIndicator'] || '',
            'Document Form Status': doc['releaseState'],
            'Document Create By': doc['createBy'],
            'Document Create Date': doc['createDate'],
            'Receipt Date': doc['createDate'],
            'Document Modify By': doc['modifyBy'],
            'Document Modify Date': doc['modifyDate'],
            'Document GUID': doc['id'],
            'Related Record ID': doc['documentId'],
            'Document or Form': 'Document',
            'ARP ID or WTM RP ID': formID,
            'Print Order': String(
                printOrderToUse[doc['document type']] !== undefined
                    ? printOrderToUse[doc['document type']]
                    : classifyFormId(formID) === 'WTMF'
                      ? printOrderObjDocumentsWTMF['Other'] // For WTM, unspecified documents use order 8 ("Other") to maintain the 0-8 range
                      : printOrderCounter++
            ).padStart(2, '0'), // Pad the print order with leading zeros to ensure correct sorting (e.g., 01, 02, ..., 10, 11, etc.)
            Status: 'Enabled',
        };

        return vvClient.forms
            .postForms(null, associatedDocRelation, 'Associated Document Relation')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
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

    async function getARPsAndWTMRPs(fpanWtmfNumbers, appReviewTemplateName, wtmReviewTemplateName) {
        /*
        Function to handle FPAN Number WTMF Number scenario.
        Parameters:
          fpanWtmfNumbers: A string containing comma-separated IDs (FPAN or WTMF numbers).
          appReviewTemplateName: Template name for Application Review Page.
          wtmReviewTemplateName: Template name for WTM Review Page.
        Returns:
          Two arrays: one for ARPs (Application Review Pages) and another for WTMRPs (WTM Review Pages).
      */
        const shortDescription = 'Get ARPs and WTMRPs records';
        const idsArray = fpanWtmfNumbers.split(',').map((id) => id.trim()); // Convert string to array and trim whitespace
        const arpRecords = [];
        const wtmrpRecords = [];

        for (const id of idsArray) {
            try {
                // Determine the query field based on the number pattern
                const type = classifyNumber(id);
                const queryField = type === 'FPAN' ? '[FPAN Number]' : '[WTMF No]';

                if (type === 'FPAN') {
                    // If the ID starts with 'FPAN', treat it as an FPAN Number
                    const arpRecord = await getForms(
                        {
                            q: `${queryField} eq '${id}'`,
                            expand: true,
                        },
                        appReviewTemplateName
                    );

                    if (!isNullEmptyUndefined(arpRecord)) {
                        arpRecords.push(...arpRecord);
                    }
                } else if (type === 'WTMF') {
                    // If the ID starts with 'WTMF', treat it as a WTMF Number
                    const wtmrpRecord = await getForms(
                        {
                            q: `${queryField} eq '${id}'`,
                            expand: true,
                        },
                        wtmReviewTemplateName
                    );

                    if (!isNullEmptyUndefined(wtmrpRecord)) {
                        wtmrpRecords.push(...wtmrpRecord);
                    }
                } else {
                    // Log an error for unrecognized patterns
                    logger.info(`Unrecognized ID pattern: ${id}`);
                }
            } catch (error) {
                logger.info(`${shortDescription} error for ID '${id}': ${error.message}`);
            }
        }

        return { arpRecords, wtmrpRecords };
    }

    async function processApplicationRelatedRecords(
        applicationRelatedRecords,
        docsResults,
        applicationRelatedFormsList,
        applicationRelatedDocsList,
        relatedFormsList,
        relatedDocsList,
        revisionID,
        formID
    ) {
        // #5 Compare the list of related forms and documents to obtain those not yet related to the ARP or WTMRP
        const formsSet = new Set(relatedFormsList);
        const docsSet = new Set(relatedDocsList);

        const formsToRelate = applicationRelatedFormsList.filter(
            (applicationRelatedRevisionId) =>
                !formsSet.has(applicationRelatedRevisionId) && !(applicationRelatedRevisionId === revisionID)
        );

        const docsToRelate = applicationRelatedDocsList.filter((docId) => !docsSet.has(docId));

        // docsResults has two of the same objects in the array, need to filter the duplicated ones
        const uniqueDocsResults = docsResults
            .flat()
            .filter((doc, index, self) => index === self.findIndex((d) => d.id === doc.id));

        // #6 Relate the "not yet related" documents and forms to the ARP or WTM RP
        // #6.1 Relate Forms
        await Promise.allSettled(formsToRelate.map((revId) => relateFormToRecord(revisionID, revId)));

        // #6.2 Relate Docs
        await Promise.allSettled(docsToRelate.map((docGUID) => relateDocumentToRecord(docGUID, revisionID)));

        applicationRelatedRecords.sort((a, b) => {
            return new Date(a.createDate) - new Date(b.createDate);
        });

        uniqueDocsResults.sort((a, b) => {
            return new Date(a.createDate) - new Date(b.createDate);
        });

        // Get all Associated Document Relation records to avoid duplicates
        const associatedDocumentRelationRecords = await getAssociatedDocumentRelationRecords(formID);

        // **FIX: Use Form IDs for Associated Document Relation comparison**
        const associatedFormIds = new Set(
            associatedDocumentRelationRecords
                .filter((record) => record['document or Form'] === 'Form')
                .map((record) => record['related Record ID'])
        );

        const associatedDocIds = new Set(
            associatedDocumentRelationRecords
                .filter((record) => record['document or Form'] === 'Document')
                .map((record) => record['related Record ID'])
        );

        // **FIX: Create sets of revision IDs that should be processed**
        const formsToRelateSet = new Set(formsToRelate);
        const docsToRelateSet = new Set(docsToRelate);

        // **FIX: Filter forms that need to be related AND don't have Associated Document Relation yet**
        const filteredApplicationRelatedRecords = applicationRelatedRecords.filter(
            (record) =>
                //formsToRelateSet.has(record['dhid1']) && // Needs to be related (by revision ID)
                !associatedFormIds.has(record['dhdocid1']) && // No Associated Doc Relation yet (by form ID)
                formID !== record['dhdocid1'] // Not the main form itself
        );

        // **FIX: Filter docs that need to be related AND don't have Associated Document Relation yet**
        const filteredDocRelatedRecords = uniqueDocsResults.filter(
            (record) =>
                docsToRelateSet.has(record['id']) && // Needs to be related (by doc ID)
                !associatedDocIds.has(record['documentId']) // No Associated Doc Relation yet (by document ID)
        );

        // #6.3 Create Associated Document Relation record for each form and document
        await Promise.allSettled(
            filteredApplicationRelatedRecords.map((form) => createAssociatedDocumentRelationFromForm(form, formID))
        );

        // This process is disabled as the creation of ADR records for documents is being handled in workflow 'DOC - Relate Documents to Review Page'
        // So this block was creating duplicates as both were executing at the same time
        //await Promise.allSettled(
        //    filteredDocRelatedRecords.map((doc) =>
        //        createAssociatedDocumentRelationFromDoc(doc, formID),
        //    ),
        //);
    }

    async function getAssociatedDocumentRelationRecords(formID) {
        const shortDescription = `Get Associated Document Relation records`;
        const getFormsParams = {
            q: `[ARP ID or WTM RP ID] eq '${formID}' AND [Status] ne 'Disabled'`,
            // expand: true,
            fields: 'related Record ID, Document or Form',
        };

        return (
            vvClient.forms
                .getForms(getFormsParams, 'Associated Document Relation')
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                //.then((res) => checkDataIsNotEmpty(res, shortDescription)) // Comment out this line if the query could have no match
                .then((res) => res.data)
        );
    }

    async function getApplicationRecordsAndRelatedLists(ApplicationID) {
        /*
        Function to get application records and related lists
        Parameters:
            ApplicationID: The Form ID of the application.
        Returns:
            An object containing application related records, forms list, documents list, and document results.
      */

        // #4 Get the form record and all related forms and subforms for the Application
        let [templateName, formIdField] = detectFormTemplateFromID(ApplicationID);
        const [appRecord] = await getApplicationRecord(ApplicationID, templateName, formIdField);
        const applicationRevisionID = appRecord['revisionId'] || '';

        // #4.1 Get related forms of the Application
        const applicationRelatedNotFilteredForms = await getRelatedForms(applicationRevisionID);

        // Filter CONTACT-INFORMATION, CONTACT-INFORMATION-RELATION and Business records
        const applicationRelatedForms = applicationRelatedNotFilteredForms.filter(
            (form) =>
                !form.instanceName.startsWith('CONTACT-INFORMATION') &&
                !form.instanceName.startsWith('Contact Information Relation') &&
                !form.instanceName.startsWith('Business')
        );

        // Get revision ID from the filtered applicationRelatedForms
        const initialRevisionIds = applicationRelatedForms.map((form) => form.revisionId);

        // Get application records from related forms
        const applicationRelatedRecords = [];
        appRecord.templateName = templateName;
        applicationRelatedRecords.push(appRecord);

        for (const form of applicationRelatedForms) {
            [templateName, formIdField] = detectFormTemplateFromID(form.instanceName);
            if (!templateName) continue;
            let applicationRecord = await getApplicationRecord(form.instanceName, templateName, formIdField);
            // Add instanceName and templateName to the applicationRecord
            applicationRecord = applicationRecord.map((rec) => ({
                ...rec,
                instanceName: form.instanceName,
                templateName: templateName,
            }));
            applicationRelatedRecords.push(...applicationRecord);
        }

        // #4.2 Get related forms of each subform in parallel
        const subformRelatedListsResults = await Promise.allSettled(
            initialRevisionIds.map((revId) => getRelatedForms(revId))
        );

        const subformRelatedListsNotFilteredForms = subformRelatedListsResults
            .filter((res) => res.status === 'fulfilled')
            .map((res) => res.value);

        // Filter CONTACT-INFORMATION, CONTACT-INFORMATION-RELATION and Business records
        const subformRelatedLists = subformRelatedListsNotFilteredForms.flatMap((forms) =>
            forms.filter(
                (form) =>
                    !form.instanceName.startsWith('CONTACT-INFORMATION') &&
                    !form.instanceName.startsWith('Contact Information Relation') &&
                    !form.instanceName.startsWith('Business')
            )
        );

        // Collect all revisioo IDs for then be used in the relateForms process
        const allRevisionIds = [...initialRevisionIds, ...subformRelatedLists.map((f) => f.revisionId)];

        const applicationRelatedFormsList = [...new Set(allRevisionIds)];

        // #4.3 Get all related documents uploaded to each of the forms and subforms
        const docsResultsRaw = await Promise.allSettled(
            applicationRelatedFormsList.map((revId) => getRelatedDocs(revId))
        );

        const docsResults = docsResultsRaw.filter((res) => res.status === 'fulfilled').map((res) => res.value);

        const allDocIds = docsResults.flatMap((docs) => docs.map((doc) => doc.id));
        const applicationRelatedDocsList = [...new Set(allDocIds)];

        return {
            applicationRelatedRecords,
            applicationRelatedFormsList,
            applicationRelatedDocsList,
            docsResults,
        };
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // #1 Get parameters
        const ApplicationID = getFieldValueByName('Form ID');

        // Determine the ID numbers
        const idNumbers = ['FPAN Number', 'FPAN or WTMF Numbers', 'WTMF Number']
            .map(getFieldValueByName)
            .find((value) => value);

        // #2 Check is the required parameters are present
        if (!ApplicationID || !idNumbers) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // #3 Get the Application Review Page (ARP) records and/or WTM Review Page (WTMRP) records to get the Form ID of that record
        let arpRecords = [];
        let wtmrpRecords = [];

        if (idNumbers.includes(',')) {
            // #3A - Handle multiple FPAN Numbers and/or WTMF Numbers scenario
            const result = await getARPsAndWTMRPs(idNumbers, AppReviewPageTemplateName, WTMReviewPageTemplateName);
            arpRecords = result.arpRecords;
            wtmrpRecords = result.wtmrpRecords;
        } else {
            // #3B - Handle single FPAN or WTMF Number scenario
            const type = classifyNumber(idNumbers);

            if (type === 'FPAN') {
                const [arpRecord] = await getRecordByIdNumberType(idNumbers, AppReviewPageTemplateName);
                arpRecords.push(arpRecord);
            } else if (type === 'WTMF') {
                const [wtmrpRecord] = await getRecordByIdNumberType(idNumbers, WTMReviewPageTemplateName);
                wtmrpRecords.push(wtmrpRecord);
            }
        }

        // #4 Get the form record and all related forms and subforms for the Application
        //    Get all related documents uploaded to each of the forms and subforms
        const { applicationRelatedRecords, applicationRelatedFormsList, applicationRelatedDocsList, docsResults } =
            await getApplicationRecordsAndRelatedLists(ApplicationID);

        // ****************** PROCESS ALL RECORDS OBTAINED (ARP and/or WTMRP) ******************

        // #5 #6 Process ARP records (if available)
        if (arpRecords.length > 0) {
            const aggregatedArpRelatedForms = [];
            const aggregatedArpRelatedDocs = [];
            let uniqueArpRelatedFormsList = [];
            let uniqueArpRelatedDocsList = [];

            // Get Docs and Forms related to every ARP
            for (const arpRecord of arpRecords) {
                const arpRevisionID = arpRecord['revisionId'] || '';
                const arpFormID = arpRecord['form ID'] || '';

                if (arpRevisionID) {
                    const arpRelatedForms = await getRelatedForms(arpRevisionID);
                    const arpRelatedDocs = await getRelatedDocs(arpRevisionID);

                    aggregatedArpRelatedForms.push(...arpRelatedForms.map((form) => form.revisionId));
                    aggregatedArpRelatedDocs.push(...arpRelatedDocs.map((doc) => doc.id));

                    // Use aggregated lists for ARP processing
                    uniqueArpRelatedFormsList = [...new Set(aggregatedArpRelatedForms)];
                    uniqueArpRelatedDocsList = [...new Set(aggregatedArpRelatedDocs)];
                }

                if (arpFormID) {
                    // #7 Compare the list of related forms and documents to obtain those not yet related to the ARP
                    // #8 Relate the “not yet related” documents and forms to the ARP or WTM RP
                    await processApplicationRelatedRecords(
                        applicationRelatedRecords,
                        docsResults,
                        applicationRelatedFormsList,
                        applicationRelatedDocsList,
                        uniqueArpRelatedFormsList,
                        uniqueArpRelatedDocsList,
                        arpRevisionID,
                        arpFormID
                    );
                }
            }
        }

        // #5 #6 Process WTMRP records (if available)
        if (wtmrpRecords.length > 0) {
            const aggregatedWtmrpRelatedForms = [];
            const aggregatedWtmrpRelatedDocs = [];
            let uniqueWtmrpRelatedFormsList = [];
            let uniqueWtmrpRelatedDocsList = [];

            // Get Docs and Forms related to every WTMRP
            for (const wtmrpRecord of wtmrpRecords) {
                const wtmrpRevisionID = wtmrpRecord['revisionId'] || '';
                const wtmrpFormID = wtmrpRecord['form ID'] || '';

                if (wtmrpRevisionID) {
                    const wtmrpRelatedForms = await getRelatedForms(wtmrpRevisionID);
                    const wtmrpRelatedDocs = await getRelatedDocs(wtmrpRevisionID);

                    aggregatedWtmrpRelatedForms.push(...wtmrpRelatedForms.map((form) => form.revisionId));
                    aggregatedWtmrpRelatedDocs.push(...wtmrpRelatedDocs.map((doc) => doc.id));

                    // Use aggregated lists for WTMRP processing
                    uniqueWtmrpRelatedFormsList.push(...new Set(aggregatedWtmrpRelatedForms));
                    uniqueWtmrpRelatedDocsList.push(...new Set(aggregatedWtmrpRelatedDocs));
                }

                if (wtmrpFormID) {
                    // #5 Compare the list of related forms and documents to obtain those not yet related to the WTMRP
                    // #6 Relate the “not yet related” documents and forms to the ARP or WTM RP
                    await processApplicationRelatedRecords(
                        applicationRelatedRecords,
                        docsResults,
                        applicationRelatedFormsList,
                        applicationRelatedDocsList,
                        uniqueWtmrpRelatedFormsList,
                        uniqueWtmrpRelatedDocsList,
                        wtmrpRevisionID,
                        wtmrpFormID
                    );
                }
            }
        }

        // 7° BUILD THE SUCCESS RESPONSE ARRAY

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Documentation Related successfully';
        // outputCollection[2] = someVariableWithData;
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY

        outputCollection[0] = 'Error'; // Don´t change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors occurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        // SEND THE RESPONSE

        response.json(200, outputCollection);
    }
};
