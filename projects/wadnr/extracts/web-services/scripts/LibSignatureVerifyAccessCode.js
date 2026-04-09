/**
 * LibSignatureVerifyAccessCode
 * Category: Workflow
 * Modified: 2026-02-03T19:37:11.307Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: 2b4766eb-9cce-ef11-82bf-a0dcc70b93c8
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
    Script Name:    LibSignatureVerifyAccessCode 
    Customer:       WADNR
    Purpose:        Library which verifies the validity of access codes for specific forms (e.g. FPAN).
                    This library will confirm the access code's association with contact information and related records, validate the expiration date, match the zip code, and return an appropriate response.
                    The library validates an access code against the following criteria:
                    . Matches the provided Contact Information ID and Related Record ID.
                    . Has not expired.
                    . Matches the associated zip code (ignoring the +4 digits).
    Preconditions:
                    - 
    Parameters:     The following represent variables passed into the function:
                    Contact Information ID | STRING | REQUIRED | The ID of the contact information record
                    Related Record ID | STRING | REQUIRED | The ID of the related record
                    Example: 
                    {
                        "Related Record ID": "Access Code-000001",
                        "Contact Information ID": "CONTACT-INFORMATION-0000187",
                        "Zip Code": "12345",
                        "Access Code": "12345"
                    }
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                                    . Sucess: "Acess code verified".
                                    . Error: Detailed error message.
                    outputCollection[2]: Data: Contact Information Details.
    Pseudo code: 
                    1° Retrieve 'Enabled' Access Code record based on 'Related Record ID' and 'Contact Information ID'.
                    2° Retriebe Zip Code from 'Contact Information' record. using LibGetContactInformation.
                    3° Compare retrieved 5-digit Zip Code (ignore +4) access code. And validate that Expiration Date is not expired.
                    ...
 
    Date of Dev:    01/09/2025
    Last Rev Date:  02/03/2026
 
    Revision Notes:
                    01/09/2025 - Lucas Herrera:  First Setup of the script
                    02/03/2026 - Mauro Rapuano:  Handling edged case for NOT when Original and New contact are the same
    */

    logger.info(`Start of the process LibSignatureVerifyAccessCode at ${Date()}`);

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

    const accessCodeTemplateId = 'Access Code';
    const contactInformationRelationId = 'Contact Information Relation';

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

    async function callExternalWs(webServiceName, webServiceParams) {
        let shortDescription = `Calling Web Service ${webServiceName}`;

        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function getContactInformation(contactInformationId) {
        const [LibGetContactInformationStatus, , { results }] = await callExternalWs('LibGetContactInformation', [
            { name: 'Contact Information ID', value: contactInformationId },
        ]);

        if (LibGetContactInformationStatus !== 'Success') {
            throw new Error('An error occured trying to get the Contact Information.');
        }

        return results;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS

        const contactInformationId = getFieldValueByName('Contact Information ID');
        const relatedRecordId = getFieldValueByName('Related Record ID');
        const zipCode = getFieldValueByName('Zip Code').slice(0, 5);
        const accessCode = getFieldValueByName('Access Code');

        // 2° Retrieve 'Enable' Access Code record based on 'Related Record ID' and 'Contact Information ID'.

        let query1 = `[Contact Information ID] eq '${contactInformationId}' AND [Related Record ID] eq '${relatedRecordId}'`;

        const getContactInformationRelationParams = {
            q: query1,
            fields: 'Contact Information Relation ID',
        };

        const contactInformationRelationRes = await vvClient.forms
            .getForms(getContactInformationRelationParams, contactInformationRelationId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, 'Contact Information Relation record'))
            .then((res) => checkDataPropertyExists(res, 'Contact Information Relation record'))
            .then((res) => checkDataIsNotEmpty(res, 'Contact Information Relation record'))
            .then((res) => res.data);

        // Edge case scenario where there is multiple contact information relation records for the same contactInformationId and relatedRecordId combination
        // Scenario for the NOT form when New and Original contact is the same, in this case take the most recent one
        const getNumericId = (id) => Number(id.match(/\d+$/)[0]);

        contactInformationRelationRes.sort(
            (a, b) =>
                getNumericId(b['contact Information Relation ID']) - getNumericId(a['contact Information Relation ID'])
        );

        const relationId = contactInformationRelationRes[0]['contact Information Relation ID'];

        let query = `[Contact Information Relation ID] eq '${relationId}' AND [Related Record ID] eq '${relatedRecordId}' AND [Status] eq 'Enabled'`;

        const getAccessCodeParams = {
            q: query,
            fields: 'Form ID, Access Code Number, Contact Information ID, Contact Information Relation ID, Date Created, Expiration Date, Related Record ID, Status',
        };

        const accessCodeRes = await vvClient.forms
            .getForms(getAccessCodeParams, accessCodeTemplateId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, 'Access Code record'))
            .then((res) => checkDataPropertyExists(res, 'Access Code record'))
            .then((res) => res.data);

        // edge case scenario where there is multiple access code records for the same relationId and relatedRecordId combination
        if (accessCodeRes.length > 1) {
            throw new Error(
                'There are multiple access code records for the same relationId and relatedRecordId combination.'
            );
        }

        let response = 'Access Code Verified.';

        if (accessCodeRes.length == 0) {
            response =
                'Please check your access code. It has either expired or has already been used to access the form.';
        } else {
            // 3° Retrieve Zip Code from 'Contact Information' record. using LibGetContactInformation.

            const contactInformation = await getContactInformation(contactInformationId);

            // 4° Compare retrieved 5-digit Zip Code (ignore +4) access code. And validate that Expiration Date is not expired.
            const accessCodeRecord = accessCodeRes[0];
            const expirationDate = accessCodeRecord['expiration Date'];
            const accessCodeNumber = accessCodeRecord['access Code Number'];

            const zipCodeContactInformation = contactInformation[0]['zip Code'].slice(0, 5);

            if (zipCode !== zipCodeContactInformation) {
                response = 'The zip code does not match the contact information zip code.';
            }

            if (accessCode !== accessCodeNumber) {
                response = 'The access code does not match the access code number.';
            }

            const currentDate = new Date();
            const expirationDateObj = new Date(expirationDate);

            if (currentDate > expirationDateObj) {
                response = 'The access code has expired.';
            }
        }
        // 5° BUILD THE SUCCESS RESPONSE ARRAY

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Access code verified.';
        outputCollection[2] = {
            'Contact Information Relation ID': relationId,
            'Related Record ID': relatedRecordId,
            'Contact Information ID': contactInformationId,
            Response: response,
        };
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
