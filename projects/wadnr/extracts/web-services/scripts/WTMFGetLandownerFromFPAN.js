/**
 * WTMFGetLandownerFromFPAN
 * Category: Form
 * Modified: 2026-02-11T21:18:19.073Z by sebastian.rolando@visualvault.com
 * Script ID: Script Id: 38053ca9-9cfd-f011-8305-8614b9ba619c
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
    Script Name:    WTMFGetLandownerFromFPAN
    Customer:       WADNR
    Purpose:        Use Related Record ID from FPAN to relate contact information to WTFM form
    Preconditions:
    Parameters:     The following represent variables passed into the function:
                    requestObject:
                        - relatedRecordID: ID of parent FPAN form
                        - Form ID: ID of WTMF form

    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code:
                    1° GET THE VALUES OF THE FIELDS
                    2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
                    3° GET THE CONTACT INFORMATION RELATION RECORDS
                    4° BUILD THE NEW CONTACT INFORMATION RELATIONSHIPS TO THE CHILD FORM
                    5° BUILD THE OUTPUT COLLECTION

    Date of Dev:    01/29/2026
    Last Rev Date:  01/29/2026

    Revision Notes:
                    01/29/2026 - Sebastian Rolando:  First Setup of the script
                    02/11/2026 - Sebastian Rolando: Update the logic to only retrieve Landowner Individual or Business, but not Business Signers

    */

    logger.info(`Start of the process WTMFGetLandownerFromFPAN at ${Date()}`);

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

    const WTMFTemplateName = 'Water Type Modification Form';
    const FPANTemplateName = 'Forest Practices Application Notification';
    const contactInformationTemplateName = 'Contact Information Relation';

    const CONTACT_INFO_RELATION_KEYS = [
        'relation Type',
        'landowner',
        'timber Owner',
        'operator',
        'contact Person',
        'surveyor',
        'other',
        'contact Information ID',
        'status',
        'business ID',
        'title',
    ];

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

    function relateRecords(parentRecordGUID, childRecordID) {
        const shortDescription = `relating forms: ${parentRecordGUID} and form ${childRecordID}`;
        //404 is needed so that a hard error is not thrown when relationship already exists.
        const ignoreStatusCode = '404';

        return vvClient.forms
            .relateFormByDocId(parentRecordGUID, childRecordID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode));
    }

    function getRecordsByRelatedRecordID(relatedRecordID, templateName) {
        const shortDescription = `Get form ${relatedRecordID}`;
        const getFormsParams = {
            q: `[Related Record ID] eq '${relatedRecordID}' AND [Business Signer] eq 'False' AND [Landowner] eq 'True' AND [Status] eq 'Enabled'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getNonDuplicatedRecords(toCreateRecords, existingRecords, generateKeyFunction) {
        const existingKeys = new Set(existingRecords.map(generateKeyFunction));

        // Filter toCreateRecords to only include new (non-duplicate) entries
        return toCreateRecords.filter((record) => {
            const key = generateKeyFunction(record);
            return !existingKeys.has(key);
        });
    }

    function createRecord(newRecordData, formTemplateName) {
        const shortDescription = `Post form ${formTemplateName}`;
        return vvClient.forms
            .postForms(null, newRecordData, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS
        const relatedRecordID = getFieldValueByName('relatedRecordID');
        const childFormID = getFieldValueByName('Form ID');

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!relatedRecordID || !childFormID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3° GET THE CONTACT INFORMATION RELATION RECORDS
        const contactInformationRes = await getRecordsByRelatedRecordID(
            relatedRecordID,
            contactInformationTemplateName
        );

        // 4° BUILD THE NEW CONTACT INFORMATION RELATIONSHIPS TO THE CHILD FORM
        // Getting already related Contact Information Relation records to prevent data duplication
        const childGUID = await getRecordGUID(WTMFTemplateName, childFormID);
        const childContactInformationRelationRecords = await getRecordsByRelatedRecordID(
            childFormID,
            'Contact Information Relation'
        );

        const uniqueContactInformationRes = getNonDuplicatedRecords(
            contactInformationRes,
            childContactInformationRelationRecords,
            (item) => CONTACT_INFO_RELATION_KEYS.map((key) => item[key]).join('|')
        );

        // Set up the object for the new Contact Information record
        for (const item of uniqueContactInformationRes) {
            const newRecordData = {
                'business ID': item['business ID'],
                'contact Information ID': item['contact Information ID'],
                'contact Person': item['contact Person'],
                landowner: item['landowner'],
                operator: item['operator'],
                other: item['other'],
                'related Record ID': childFormID,
                'relation Type': item['relation Type'],
                status: item['status'],
                surveyor: item['surveyor'],
                'timber Owner': item['timber Owner'],
                title: item['title'],
                'Business Signer': item['business Signer'],
            };

            // Create new Contact Information Record
            const postFormData = await createRecord(newRecordData, 'Contact Information Relation');

            // Relate WTMF with original Contact Information related to FPAN
            await relateRecords(childGUID, item['contact Information ID']);

            // Relate WTMF with the new created Contact Information
            await relateRecords(childGUID, postFormData['instanceName']);

            // Relate original Contact Information with the new created Contact Information
            const contactInformationTemplateName = item['contact Information ID'].includes('Business')
                ? 'Business'
                : 'Contact Information';
            const contactInfoGUID = await getRecordGUID(contactInformationTemplateName, item['contact Information ID']);

            await relateRecords(contactInfoGUID, postFormData['instanceName']);
        }

        // 5° BUILD THE OUTPUT COLLECTION
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'FPAN data retrieved successfully. New relationships built with child form successfully.';
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
