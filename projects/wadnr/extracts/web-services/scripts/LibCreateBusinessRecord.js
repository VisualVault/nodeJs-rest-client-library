/**
 * LibCreateBusinessRecord
 * Category: Workflow
 * Modified: 2024-11-08T03:10:06.927Z by moises.savelli@visualvault.com
 * Script ID: Script Id: 434d8ae5-759d-ef11-82b2-daa27b318f25
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
    Script Name:    LibCreateBusinessRecord
    Customer:       WA-DNR
    Purpose:        Create a new Business record in VisualVault
    Preconditions:
                    - LibCheckDuplicateBusiness
    Parameters:     The following represent variables passed into the function:
                     businessObject:
                        - Business Name: The name of the business (required)
                        - Business ID Number: The ID number of the business (optional)
                        - Business Country: The country of the business (required)
                        - Business Zip Code: The zip code of the business (required)
                        - Business Address Line 1: The address line 1 of the business (required)
                        - Business Address Line 2: The address line 2 of the business (optional)
                        - Business Address Line 3: The address line 3 of the business (optional)
                        - Business City: The city of the business (required)
                        - Business Province State: The province or state of the business (required)
                        - Business Phone: The phone number of the business (optional)
                        - Business Email: The email of the business (optional)
                        - Related Record ID: The ID of the related record (required)
                    Example:
                    {
                        "Business Name": "Dunder Mifflin",
                        "Business ID Number": "123456789",
                        "Business Country": "United States",
                        "Business Zip Code": "12345",
                        "Business Address Line 1": "1234 Paper St",
                        "Business Address Line 2": "",
                        "Business Address Line 3": "",
                        "Business City": "Scranton",
                        "Business Province State": "PA",
                        "Business Phone": "123-456-7890",
                        "Business Email": "dunder.mifflin@paper.com",
                        "Related Record ID": "fpan-123"
                    }
 
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code: 
                    1° Get the values of the fields
                    2° Check if the required parameters are present
                    3° Validate the business is not a duplicate
                    4° Create the business record
                    5° Build the success response array
 
    Date of Dev:    11/07/2024
    Last Rev Date:  11/07/2024
 
    Revision Notes:
                    11/07/2024 - Moises Savelli: WADNR-974 - First Setup of the script
    */

    logger.info(`Start of the process LibCreateBusinessRecord at ${Date()}`);

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

    const businessFormTemplate = 'Business';
    const LibCheckDuplicateBusiness = 'LibCheckDuplicateBusiness';

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

    function validateBusiness(businessObject) {
        /*
        Check if the required parameters are present
        Parameters:
        businessObject: The object with the business data
    */
        const requiredFields = [
            'BusinessName',
            'BusinessCountry',
            'BusinessZipCode',
            'BusinessAddressLine1',
            'BusinessCity',
            'BusinessProvinceState',
            'RelatedRecordID',
        ];

        requiredFields.forEach((field) => {
            if (!businessObject[field]) {
                throw new Error(`The field '${field}' is required.`);
            }
        });
    }

    function checkDuplicateBusiness(webServiceName, businessObject) {
        const shortDescription = `Run Web Service: ${webServiceName}`;

        const webServiceParams = [
            {
                name: 'Business Name',
                value: businessObject.BusinessName,
            },
            {
                name: 'Country',
                value: businessObject.BusinessCountry,
            },
            {
                name: 'Address Line 1',
                value: businessObject.BusinessAddressLine1,
            },
            {
                name: 'City',
                value: businessObject.BusinessCity,
            },
            {
                name: 'State',
                value: businessObject.BusinessProvinceState,
            },
            {
                name: 'Zip Code',
                value: businessObject.BusinessZipCode,
            },
        ];

        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function createContactRecord(contactInformationFormTemplate, newContactRecordData) {
        const shortDescription = `Post form ${contactInformationFormTemplate}`;

        return vvClient.forms
            .postForms(null, newContactRecordData, contactInformationFormTemplate)
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
        const businessObject = {
            BusinessName: getFieldValueByName('Business Name'),
            BusinessIDNumber: getFieldValueByName('Business ID Number', true),
            BusinessCountry: getFieldValueByName('Business Country'),
            BusinessZipCode: getFieldValueByName('Business Zip Code'),
            BusinessAddressLine1: getFieldValueByName('Business Address Line 1'),
            BusinessAddressLine2: getFieldValueByName('Business Address Line 2', true),
            BusinessAddressLine3: getFieldValueByName('Business Address Line 3', true),
            BusinessCity: getFieldValueByName('Business City'),
            BusinessProvinceState: getFieldValueByName('Business Province State'),
            BusinessPhone: getFieldValueByName('Business Phone', true),
            BusinessEmail: getFieldValueByName('Business Email', true),
            RelatedRecordID: getFieldValueByName('Related Record ID'),
        };

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        validateBusiness(businessObject);

        // 3° VALIDATE BUSINESS IS NOT A DUPLICATE
        const duplicateBusiness = await checkDuplicateBusiness(LibCheckDuplicateBusiness, businessObject);

        if (duplicateBusiness[2].duplicateFound === 'True') {
            outputCollection[0] = 'Success'; // Don´t change this
            outputCollection[1] = 'Duplicate Business';
            outputCollection[2] = duplicateBusiness.results;
        } else {
            // 4° CREATE THE BUSINESS RECORD
            const newBusinessRecordData = {
                'Business Name': businessObject.BusinessName,
                'Business ID Number': businessObject.BusinessIDNumber,
                'Business Country': businessObject.BusinessCountry,
                'Business Zip Code': businessObject.BusinessZipCode,
                'Business Address Line 1': businessObject.BusinessAddressLine1,
                'Business Address Line 2': businessObject.BusinessAddressLine2,
                'Business Address Line 3': businessObject.BusinessAddressLine3,
                'Business City': businessObject.BusinessCity,
                'Business Province State': businessObject.BusinessProvinceState,
                'Business County': 'Washington', // hardcoded value for now
                'Business Phone': businessObject.BusinessPhone,
                'Business Email': businessObject.BusinessEmail,
                'Related Record ID': businessObject.RelatedRecordID,
            };

            const newBusinessRecord = await createContactRecord(businessFormTemplate, newBusinessRecordData);

            // 4° BUILD THE SUCCESS RESPONSE ARRAY
            outputCollection[0] = 'Success'; // Don´t change this
            outputCollection[1] = 'Contact record created successfully';
            outputCollection[2] = newBusinessRecord;
        }
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY

        outputCollection[0] = 'Error'; // Don´t change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors ocurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        // SEND THE RESPONSE

        response.json(200, outputCollection);
    }
};
