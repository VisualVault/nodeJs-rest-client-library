/**
 * SignatureDeclineSignature
 * Category: Workflow
 * Modified: 2026-02-25T13:41:37.52Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: 39ddd841-4cde-ef11-82c3-a94025797804
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
    Script Name:    SignatureDeclineSignature
    Customer:       WADNR
    Purpose:        Decline Signature
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
                    3° Get Enabled Access Code records
                    4° Set Status to Disable
                    5° Set Related Record to Draft
                    6° Update already submitted signatures to disabled

    Date of Dev:    01/29/2025
    Last Rev Date:  02/25/2026

    Revision Notes:
                    01/29/2025 - Nicolas Culini:  First Setup of the script
                    12/05/2025 - Modified getForms to return null instead of throwing when no data is found, required for first-time decline handling.
                    02/19/2026 - Alfredo Scilabra: Added support for primary record ID
                    02/25/2026 - Alfredo Scilabra: Rename Multi-pupose prefix
    */

    logger.info(`Start of the process SignatureDeclineSignature at ${Date()}`);

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

    function getForms(templateName, relatedRecordID, status) {
        const shortDescription = `Get form ${templateName}`;
        const getFormsParams = {
            q: `[Related Record ID] eq '${relatedRecordID}' AND [Status] eq '${status}'`,
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => {
                const data = res.data;

                if (!data) {
                    return null;
                }

                if (Array.isArray(data) && data.length === 0) {
                    return null;
                }

                return data;
            });
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

    function detectFormTemplateFromID(recordID) {
        if (recordID.substring(5, 14) == 'AMENDMENT') {
            return 'FPAN Amendment Request';
        } else if (recordID.substring(0, 7) == 'FPAN-RE') {
            return 'FPAN Renewal';
        } else if (recordID.substring(0, 6) == 'LT-5DN') {
            return 'Long-Term Application 5-Day Notice';
        } else if (recordID.substring(0, 4) == 'FPAN') {
            return 'Forest Practices Application Notification';
        } else if (recordID.substring(0, 3) == 'FPA') {
            return 'Forest Practices Aerial Chemical Application';
        } else if (recordID.substring(0, 6) == 'FPAN-T') {
            return 'FPAN Notice of Transfer';
        } else if (recordID.substring(0, 3) == 'MPF') {
            return 'Multi-purpose';
        } else if (recordID.substring(0, 5) == 'NCFLO') {
            return 'Notice of Continuing Forest Land Obligation';
        } else {
            return 'Step 1 Long Term FPA';
        }
    }

    function getRecordData(templateName, recordID) {
        const shortDescription = `GetForm ${recordID}`;
        const getParentFormParams = {
            q: `[instanceName] eq '${recordID}'`,
            fields: 'revisionId, Individual ID, createDate',
        };

        return vvClient.forms
            .getForms(getParentFormParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]);
    }

    function getPortalURL() {
        const { customerAlias, databaseAlias } = module.exports.getCredentials();
        const baseUrl = vvClient.getBaseUrl();

        return new URL(`${baseUrl}/app/${customerAlias}/${databaseAlias}`);
    }

    function getUserData(individualId) {
        const shortDescription = `GetForm ${individualId}`;
        const getParentFormParams = {
            q: `[instanceName] eq '${individualId}'`,
            fields: 'First Name, Last Name, Email',
        };

        return vvClient.forms
            .getForms(getParentFormParams, 'Individual Record')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]);
    }

    function sendNotificationEmail(tokens, emailAddress, relatedRecordID) {
        const shortDescription = 'Send declined signature notification email';

        const emailRequestArr = [
            { name: 'Email Name', value: 'Declined Signature - Proponent Digest' },
            { name: 'Tokens', value: tokens },
            { name: 'Email Address', value: emailAddress },
            { name: 'Email AddressCC', value: '' },
            { name: 'SendDateTime', value: '' },
            { name: 'RELATETORECORD', value: [relatedRecordID] },
            { name: 'OTHERFIELDSTOUPDATE', value: { 'Primary Record ID': relatedRecordID } },
        ];

        return vvClient.scripts
            .runWebService('LibEmailGenerateAndCreateCommunicationLog', emailRequestArr)
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

        const relatedRecordID = getFieldValueByName('Related Record ID');
        const signerName = getFieldValueByName('Type Name');

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT

        if (!relatedRecordID || !signerName) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // Get enabled access codes
        const accessCodes = await getForms('Access Code', relatedRecordID, 'Enabled');

        if (accessCodes && accessCodes.length > 0) {
            const updateAccessCodeObject = {
                Status: 'Disabled',
            };

            await Promise.all(
                accessCodes.map((accessCode) =>
                    updateRecord('Access Code', accessCode['revisionId'], updateAccessCodeObject)
                )
            );
        }

        const templateName = detectFormTemplateFromID(relatedRecordID);
        const relatedRecordData = await getRecordData(templateName, relatedRecordID);

        const userData = await getUserData(relatedRecordData['individual ID']);

        const updateRelatedFormObject = {
            Status: 'Draft',
        };

        await updateRecord(templateName, relatedRecordData.revisionId, updateRelatedFormObject);

        // Get submitted signatures
        const submittedSignatures = await getForms('Signature', relatedRecordID, 'Signature Completed');

        if (submittedSignatures && submittedSignatures.length > 0) {
            const updateSignatureObject = {
                Status: 'Signature Declined',
            };

            await Promise.all(
                submittedSignatures.map((signature) =>
                    updateRecord('Signature', signature['revisionId'], updateSignatureObject)
                )
            );
        }

        const tokens = [
            {
                name: '[Proponent First Name]',
                value: userData['first Name'],
            },
            {
                name: '[Proponent Last Name]',
                value: userData['last Name'],
            },
            {
                name: '[Signer Name]',
                value: signerName,
            },
            {
                name: '[Form Record ID]',
                value: relatedRecordID,
            },
            {
                name: '[Date Request Sent]',
                value: new Date(relatedRecordData['createDate']).toLocaleDateString(),
            },
            {
                name: '[Portal URL]',
                value: getPortalURL(),
            },
        ];

        await sendNotificationEmail(tokens, userData['email'], relatedRecordID);

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Successfully Disabled Signature';
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
