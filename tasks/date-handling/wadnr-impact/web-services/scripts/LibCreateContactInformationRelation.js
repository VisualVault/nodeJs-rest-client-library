/**
 * LibCreateContactInformationRelation
 * Category: Workflow
 * Modified: 2026-03-26T15:39:01.873Z by federico.cuelho@visualvault.com
 * Script ID: Script Id: a6e6a973-c597-ef11-82b3-87eb829b9939
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
    Script Name:    LibCreateContactInformationRelation
    Customer:       WADNR
    Purpose:        The purpose of this web service is to create a new contact information relation record.
    Preconditions:

    Parameters:     The following represent variables passed into the function:
                    relatedRecordID: The ID of the related record
                    contactInformationID: The ID of the contact (Business ID or Contact Information ID)
                    relationType: The type of relation (Business or Individual)
                    role: The role of the contact
                    businessID: The Business ID to create relation (optional, for Business relation)
                    Proponent (String, Optional): indicates if the contact is a Proponent, with values “True” or “False”.
                    Business Signer (String, Optional): indicates if the contact is a Business Signer, with values “True” or “False”.
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: data
                    
    Date of Dev:    10/31/2024
    Last Rev Date:  03/26/2026

    Revision Notes: Brian Davis : Initial setup
                    12/30/2024 - Mauro Rapuano: Added logic to also update 'True' roles to 'False'
                    01/02/2025 - Mauro Rapuano: Added Business ID param to create relations
                    02/13/2025 - Nicolas Culini: Added inner form relation
                    02/18/2025 - Nicolas CUlini: Added inner form relation between parent and relation form
                    02/26/2025 - Nicolas Culini: Refactored Code and added functionality to re-enable disabled record instead of creating new one
                    03/11/2025 - Mauro Rapuano: Added hidden field 'Title', filled with all roles that are 'True' joined with ','
                    04/23/2025 - Mauro Rapuano: Added 'Multi-purpose' form to be supported by library
                    05/23/2025 - Mauro Rapuano: Modified updating existing record to avoid deleting previously added roles
                    05/29/2025 - Alfredo Scilabra: Add Original Contact Checkbox Opt param to allow new original contact for NOT
                    07/25/2025 - Alfredo Scilabra: Updated to accept a new value called Proponent so the System can create Contact
                                                    Information Relation records with a Proponent role
                    10/27/2025 - Mauro Rapuano: Added BusinessSigner role support
                    11/03/2025 - Mauro Rapuano: While creating new Business Signer, also update Business CIR record already associated
                    11/28/2025 - Matías Andrade: Added Buyer/Seller role support for NCFLO and updated CIR creation logic to support NCFLO workflows.
                    02/03/2026 - Mauro Rapuano: When getting existing CIR, filter also by Original Contact Checkbox = 'False' to avoid conflicts with NOT original contacts
                    03/03/2026 - Lucas Herrera: Adding exception for existing CIR record to not update in case that the Relation Type changes
                    03/26/2026 - Lucas Herrera: Switch back the prefix for the Multi-purpose form SPS-MPF to MPF as it was creating issues with the detection of the form template.

      */

    logger.info(`Start of the process LibCreateContactInformationRelation at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    let outputCollection = [];
    let errorLog = [];
    // Initialize the return object
    let returnObj = {};

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const contactInformationRelationTemplate = 'Contact Information Relation';

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

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
        try {
            const jsObject = JSON.parse(vvClientRes);
            if (jsObject && typeof jsObject === 'object') {
                vvClientRes = jsObject;
            }
        } catch (e) {}
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
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

    function getRecordGUID(formTemplateName, recordID) {
        const shortDescription = `GetForm ${recordID}`;
        const getParentFormParams = {
            q: `[instanceName] eq '${recordID}'`, // recordID = "INDV-000001"
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

    function relateRecords(parentRecordGUID, childRecordID) {
        const shortDescription = `relating forms: ${parentRecordGUID} and form ${childRecordID}`;
        //404 is needed so that a hard error is not thrown when relationship already exists.
        const ignoreStatusCode = '404';

        return vvClient.forms
            .relateFormByDocId(parentRecordGUID, childRecordID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode));
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
        } else if (recordID.substring(0, 3) == 'WTM') {
            return 'Water Type Modification Form';
        } else if (recordID.substring(0, 3) == 'ICN') {
            return 'Informal Conference Note';
        } else if (recordID.substring(0, 3) == 'NTC') {
            return 'Notice to Comply';
        } else if (recordID.substring(0, 4) == 'NCNU') {
            return 'Notice of Conversion to Non Forestry Use';
        } else if (recordID.substring(0, 5) == 'NCFLO') {
            return 'Notice of Continuing Forest Land Obligation';
        } else {
            return 'Step 1 Long Term FPA';
        }
    }

    function getExistingContactInformationRelationRecord(relatedRecordID, contactInformationID) {
        const shortDescription = `Get form ${contactInformationRelationTemplate}`;
        const getFormsParams = {
            q: `[Related Record ID] eq '${relatedRecordID}' AND [Contact Information ID] eq '${contactInformationID}' AND [Original Contact Checkbox] eq 'False' AND [Status] eq 'Enabled'`,
            fields: 'Related Record ID, Contact Information ID, Relation Type, Landowner, Timber Owner, Operator, Contact Person, Surveyor, Other, Buyer, Seller, Status',
        };

        return vvClient.forms
            .getForms(getFormsParams, contactInformationRelationTemplate)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data[0]);
    }

    function createContactInformationRelationRecord(
        relatedRecordID,
        contactInformationID,
        roles,
        businessID,
        relationType,
        title,
        isOriginalContact //This param is used for Nootice of Transfer
    ) {
        const shortDescription = `Post form ${contactInformationRelationTemplate}`;
        const newRecordData = {
            'Related Record ID': relatedRecordID,
            'Contact Information ID': contactInformationID,
            'Relation Type': relationType,
            Landowner: roles.landownerRole,
            'Timber Owner': roles.timberOwnerRole,
            Operator: roles.operatorRole,
            'Contact Person': roles.contactPersonRole,
            Surveyor: roles.surveyorRole,
            Other: roles.otherRole,
            Proponent: roles.proponentRole,
            'Business Signer': roles.businessSignerRole,
            Status: 'Enabled',
            'Business ID': businessID,
            Title: title,
            'Original Contact Checkbox': isOriginalContact ? 'True' : 'False',
        };

        return vvClient.forms
            .postForms(null, newRecordData, contactInformationRelationTemplate)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function makeInnerRelations(relatedRecordID, childRecordID, childRecordRelationID) {
        const parentName = detectFormTemplateFromID(relatedRecordID);
        const parentRecordGUID = await getRecordGUID(parentName, relatedRecordID);
        const childRecordName = childRecordID.includes('Business') ? 'Business' : 'Contact Information';
        const childRecordGUID = await getRecordGUID(childRecordName, childRecordID);
        await relateRecords(parentRecordGUID, childRecordID);
        await relateRecords(parentRecordGUID, childRecordRelationID);
        await relateRecords(childRecordGUID, childRecordRelationID);
    }

    function updateContactInformationRelationRecord(contactInformationRelationGUID, fieldValuesToUpdate) {
        const shortDescription = `Update form record ${contactInformationRelationTemplate}`;

        return vvClient.forms
            .postFormRevision(
                null,
                fieldValuesToUpdate,
                contactInformationRelationTemplate,
                contactInformationRelationGUID
            )
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // GET THE VALUES OF THE FIELDS
        const relatedRecordID = getFieldValueByName('Related Record ID');
        const contactInformationID = getFieldValueByName('Contact Information ID');
        const relationType = getFieldValueByName('Relation Type');
        const proponent = getFieldValueByName('Proponent', true);
        const landowner = getFieldValueByName('Landowner', true);
        const timberOwner = getFieldValueByName('Timber Owner', true);
        const operator = getFieldValueByName('Operator', true);
        const contactPerson = getFieldValueByName('Contact Person', true);
        const surveyor = getFieldValueByName('Surveyor', true);
        const other = getFieldValueByName('Other', true);
        const businessID = getFieldValueByName('Business ID', true);
        //This param is used by Notice of Transfer to distinguish original and new contacts
        const originalContactNOT = getFieldValueByName('Original Contact NOT', true);
        const businessSigner = getFieldValueByName('Business Signer', true);
        const buyer = getFieldValueByName('Buyer', true);
        const seller = getFieldValueByName('Seller', true);

        if (!relatedRecordID || !contactInformationID || !relationType) {
            throw new Error(errorLog.join('; '));
        }

        // Set each role to 'False' if they are null, empty, or undefined
        const roles = {
            proponentRole: isNullEmptyUndefined(proponent) ? 'False' : proponent,
            landownerRole: isNullEmptyUndefined(landowner) ? 'False' : landowner,
            timberOwnerRole: isNullEmptyUndefined(timberOwner) ? 'False' : timberOwner,
            operatorRole: isNullEmptyUndefined(operator) ? 'False' : operator,
            contactPersonRole: isNullEmptyUndefined(contactPerson) ? 'False' : contactPerson,
            surveyorRole: isNullEmptyUndefined(surveyor) ? 'False' : surveyor,
            businessSignerRole: isNullEmptyUndefined(businessSigner) ? 'False' : businessSigner,
            otherRole: isNullEmptyUndefined(other) ? 'False' : other,
            buyerRole: isNullEmptyUndefined(buyer) ? 'False' : buyer,
            sellerRole: isNullEmptyUndefined(seller) ? 'False' : seller,
        };

        const existingRecord = await getExistingContactInformationRelationRecord(relatedRecordID, contactInformationID);

        // If creating Business Signer, update CIR record for the business associated with the new roles
        if (businessSigner === 'True') {
            const businessCIRRecord = await getExistingContactInformationRelationRecord(relatedRecordID, businessID);
            if (businessCIRRecord) {
                const fieldValuesToUpdate = {
                    Landowner: businessCIRRecord['landowner'] === 'False' ? roles['landownerRole'] : 'True',
                    'Timber Owner': businessCIRRecord['timber Owner'] === 'False' ? roles['timberOwnerRole'] : 'True',
                    Operator: businessCIRRecord['operator'] === 'False' ? roles['operatorRole'] : 'True',
                };
                await updateContactInformationRelationRecord(businessCIRRecord['revisionId'], fieldValuesToUpdate);
            }
        }

        //Join each role to create Title field
        const mapping = {
            proponentRole: 'Proponent',
            landownerRole: 'Landowner',
            timberOwnerRole: 'Timber Owner',
            operatorRole: 'Operator',
            contactPersonRole: 'Contact Person',
            surveyorRole: 'Surveyor',
            businessSignerRole: 'Business Signer',
            otherRole: 'Other',
            buyerRole: 'Buyer',
            sellerRole: 'Seller',
        };

        const title = Object.entries(roles)
            .filter(([role, value]) => value === 'True')
            .map(([role, value]) => mapping[role])
            .join(', ');

        const isCurrentContactBusiness = relationType === 'Business';
        const isExistingRecordBusiness = existingRecord && existingRecord['relation Type'] === 'Business';
        const contactTypeChanged = existingRecord && isCurrentContactBusiness !== isExistingRecordBusiness;

        if (!existingRecord || contactTypeChanged) {
            const isOriginalContact = !isNullEmptyUndefined(originalContactNOT);
            const newRecord = await createContactInformationRelationRecord(
                relatedRecordID,
                contactInformationID,
                roles,
                businessID,
                relationType,
                title,
                isOriginalContact
            );
            await makeInnerRelations(relatedRecordID, contactInformationID, newRecord['instanceName']);

            returnObj = {
                results: { 'Form ID': newRecord['instanceName'], 'Form GUID': newRecord['revisionId'] },
            };
        } else {
            const isDisabled = existingRecord['status'] == 'Disabled';
            const isBusiness = contactInformationID.includes('Business');
            const fieldValuesToUpdate = {};

            const rolesMapping = {
                proponent: 'proponentRole',
                landowner: 'landownerRole',
                'timber Owner': 'timberOwnerRole',
                operator: 'operatorRole',
                'contact Person': 'contactPersonRole',
                surveyor: 'surveyorRole',
                'business Signer': 'businessSignerRole',
                other: 'otherRole',
                buyer: 'buyerRole',
                seller: 'sellerRole',
            };

            Object.entries(rolesMapping).forEach(([roleKey, roleValue]) => {
                //Only update if role is true, otherwise you are deleting previously added roles while adding timber owner or operators (don't have 'Same As' modal)
                if (roles[roleValue] == 'True') {
                    fieldValuesToUpdate[roleKey] = 'True';
                }
                /*if(isBusiness){
                    if(roles[roleValue] == 'True'){
                        fieldValuesToUpdate[roleKey] = 'True'
                    }
                }else{
                    if(existingRecord[roleKey] != roles[roleValue] && roles['landownerRole'] === 'True'){
                        fieldValuesToUpdate[roleKey] = roles[roleValue];
                    }
                } */
            });

            const differentRoles = Object.keys(fieldValuesToUpdate).length;

            if (isDisabled) {
                fieldValuesToUpdate['Status'] = 'Enabled';
            }

            if (differentRoles || isDisabled) {
                //While updating roles, also update joined Title
                fieldValuesToUpdate['Title'] = title;
                const updatedContactInformationRelation = await updateContactInformationRelationRecord(
                    existingRecord['revisionId'],
                    fieldValuesToUpdate
                );

                if (isDisabled) {
                    await makeInnerRelations(relatedRecordID, contactInformationID, existingRecord['instanceName']);
                }

                returnObj = {
                    recordUpdated: !isDisabled,
                    updatedFields: fieldValuesToUpdate,
                    results: updatedContactInformationRelation,
                };
            } else {
                throw new Error(`Duplicate Contact Information Relation record found.`);
            }
        }

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success';
        outputCollection[1] = 'LibContactInformationRelation returned successfully.';
        outputCollection[2] = returnObj;
    } catch (error) {
        logger.info(`Error encountered: ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error';

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
