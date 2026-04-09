/**
 * SignatureSubmitSignature
 * Category: Workflow
 * Modified: 2026-02-25T13:37:34.66Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: 889936d3-c7d4-ef11-82bd-d3a492f2461d
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
    Script Name:    SignatureSubmitSignature
    Customer:       WADNR
    Purpose:        Submits Signature
    Preconditions:
                    -No preconditions needed

    Parameters:     The following represent variables passed into the function:
                    RelatedRecordID,

    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code:
                    1° Get Fields
                    2° Check Required Fields Present
                    3° Get Enabled Contact information records and already submitted Signature records that matches with related record id
                    4° Determine if this is last signature and mark related record as Signatures Received

    Date of Dev:    01/16/2025
    Last Rev Date:  02/25/2026

    Revision Notes:
                    01/16/2025 - Nicolas Culini:  First Setup of the script
                    03/12/2025 - Alfredo Scilabra:  Added Forest Practices Aerial Chemical Application to detectFormTemplateFromID function
                    05/09/2025 - Mauro Rapuano:  Modified detectFormTemplateFromID function to support all main forms
                    05/20/2025 - Nicolas Culini: Fixed bug with business being counted for the remaining signatures
                    05/21/2025 - Nicolas Culini: Made Access Code Disabled after signing
                    12/05/2025 - Matías Andrade: Added NCFLO handling to detectFormTemplateFromID.
                    12/08/2025 - Mauro Rapuano: Mark 'Signatures Completed' field as 'True' when all signatures are received.
                    01/09/2026 - Santiago Tortu: Mark current signature as completed before checking if all signatures are received.
                    02/03/2026 - Mauro Rapuano: Handling edged case for NOT when Original and New contact are the same
                    02/25/2026 - Alfredo Scilabra: Rename Multi-pupose prefix
    */

    logger.info(`Start of the process SignatureSubmitSignature at ${Date()}`);

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

    function getForms(formTemplateName, query) {
        const shortDescription = `Get form ${formTemplateName}`;
        const getFormsParams = {
            q: query,
            fields: 'Contact Information ID',
        };

        return vvClient.forms
            .getForms(getFormsParams, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getRecordGUID(formTemplateName, recordID) {
        const shortDescription = `GetForm ${recordID}`;
        const getParentFormParams = {
            q: `[instanceName] eq '${recordID}'`,
            fields: 'revisionId',
        };

        return vvClient.forms
            .getForms(getParentFormParams, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0].revisionId);
    }

    function markRelatedRecordSignaturesReceived(formTemplateName, recordGUID) {
        const shortDescription = `Update form record ${recordGUID}`;
        const fieldValuesToUpdate = {
            Status: 'Required Signatures Received',
            'Signatures Completed': 'True',
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    function detectFormTemplateFromID(recordID) {
        if (recordID.substring(5, 14) == 'AMENDMENT') {
            return 'FPAN Amendment Request';
        } else if (recordID.substring(0, 7) == 'FPAN-RE') {
            return 'FPAN Renewal';
        } else if (recordID.substring(0, 6) == 'FPAN-T') {
            return 'FPAN Notice of Transfer';
        } else if (recordID.substring(0, 6) == 'LT-5DN') {
            return 'Long-Term Application 5-Day Notice';
        } else if (recordID.substring(0, 4) == 'FPAN') {
            return 'Forest Practices Application Notification';
        } else if (recordID.substring(0, 3) == 'FPA') {
            return 'Forest Practices Aerial Chemical Application';
        } else if (recordID.substring(0, 3) == 'MPF') {
            return 'Multi-purpose';
        } else if (recordID.substring(0, 5) == 'NCFLO') {
            return 'Notice of Continuing Forest Land Obligation';
        } else {
            return 'Step 1 Long Term FPA';
        }
    }

    function disableAccesCode(accessCode) {
        const shortDescription = `Update form record ${accessCode}`;
        const fieldValuesToUpdate = {
            Status: 'Disabled',
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, 'Access Code', accessCode)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    function getSignatureRecordByContactInfoRelation(relatedRecordID, contactInformationRelationID) {
        const shortDescription = `Get Signature record for Contact Information Relation ${contactInformationRelationID}`;
        const getSignatureParams = {
            q: `[Related Record ID] eq '${relatedRecordID}' AND [Contact Information Relation ID] eq '${contactInformationRelationID}'`,
            fields: 'revisionId, Status',
        };

        return vvClient.forms
            .getForms(getSignatureParams, 'Signature')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => {
                // Return the first record if it exists, or null if empty
                if (res.data && res.data.length > 0) {
                    return res.data[0];
                }
                return null;
            });
    }

    function markSignatureAsCompleted(signatureGUID) {
        const shortDescription = `Update Signature record ${signatureGUID}`;
        const fieldValuesToUpdate = {
            Status: 'Signature Completed',
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, 'Signature', signatureGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS
        const relatedRecordID = getFieldValueByName('Related Record ID');
        const accessCode = getFieldValueByName('Access Code');
        const contactInformationRelationID = getFieldValueByName('Contact Information Relation ID', true);

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!relatedRecordID) {
            outputCollection[0] = 'Success';
            outputCollection[1] = 'Related Record ID not Found';
            return response.json(200, outputCollection);
        }

        // 3° MARK CURRENT SIGNATURE AS COMPLETED (if Contact Information Relation ID is provided)
        // This must be done BEFORE checking if all signatures are received
        if (contactInformationRelationID) {
            try {
                const signatureRecord = await getSignatureRecordByContactInfoRelation(
                    relatedRecordID,
                    contactInformationRelationID
                );
                if (signatureRecord && signatureRecord.revisionId) {
                    // Only update if not already completed
                    if (signatureRecord.Status !== 'Signature Completed') {
                        await markSignatureAsCompleted(signatureRecord.revisionId);
                    }
                }
            } catch (error) {
                // Continue execution even if signature record update fails - it might already be marked
            }
        }

        // 4° CHECK IF ALL SIGNATURES ARE RECEIVED
        let allSignaturesReceived = false;

        const queryContactInformation = `[Related Record ID] eq '${relatedRecordID}' AND [Status] eq 'Enabled' AND [Contact Information ID] LIKE 'CONTACT%'`;

        const contactInformationRelationRecords = await getForms(
            'Contact Information Relation',
            queryContactInformation
        );

        // Get unique Contact Information IDs count, to avoid expecting multiple signatures from same contact (NOT edge case)
        const contactInfoRelationLength = new Set(
            contactInformationRelationRecords.map((r) => r['contact Information ID']).filter(Boolean)
        ).size;

        const querySubmittedSignatures = `[Related Record ID] eq '${relatedRecordID}' AND [Status] eq 'Signature Completed'`;

        const submittedSignaturesRecords = await getForms('Signature', querySubmittedSignatures);

        // Count total completed signatures: those in DB + current one if not yet saved
        // NOTE: The current signature might not be saved yet when web service runs,
        // so we count it anyway if we have Contact Information Relation ID
        let totalCompletedSignatures = submittedSignaturesRecords.length;
        let currentSignatureFoundInDB = false;

        if (contactInformationRelationID && submittedSignaturesRecords.length > 0) {
            submittedSignaturesRecords.forEach((record) => {
                const signatureContactInfoRel =
                    record['Contact Information Relation ID'] || record['contact information relation id'];
                if (signatureContactInfoRel === contactInformationRelationID) {
                    currentSignatureFoundInDB = true;
                }
            });
        }

        if (contactInformationRelationID && !currentSignatureFoundInDB) {
            totalCompletedSignatures += 1;
        }

        if (contactInfoRelationLength == totalCompletedSignatures && contactInfoRelationLength > 0) {
            allSignaturesReceived = true;
        }

        // 5° DISABLE ACCESS CODE
        const queryAccessCode = `[Related Record ID] eq '${relatedRecordID}' AND [Access Code Number] eq '${accessCode}'`;
        const accessCodeForm = await getForms('Access Code', queryAccessCode);

        if (accessCodeForm && accessCodeForm.length > 0 && accessCodeForm[0]['revisionId']) {
            await disableAccesCode(accessCodeForm[0]['revisionId']);
        }

        // 6° UPDATE PARENT FORM STATUS IF ALL SIGNATURES ARE RECEIVED
        const formTemplateName = detectFormTemplateFromID(relatedRecordID);

        if (allSignaturesReceived) {
            try {
                const relatedRecordGUID = await getRecordGUID(formTemplateName, relatedRecordID);
                await markRelatedRecordSignaturesReceived(formTemplateName, relatedRecordGUID);
            } catch (error) {
                // Log the error but don't fail the whole process
                throw error; // Re-throw to be caught by outer catch block
            }
        }

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Signatures were submitted successfully';
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
