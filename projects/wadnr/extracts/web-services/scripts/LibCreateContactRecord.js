/**
 * LibCreateContactRecord
 * Category: Workflow
 * Modified: 2024-11-15T04:49:39.853Z by luis.diasdoliveira@visualvault.com
 * Script ID: Script Id: f6aea436-f779-ef11-82b0-9d4821abdbfe
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
    Script Name:    LibCreateContactRecord
    Customer:       WA-DNR
    Purpose:        Create contact records in the system
    Preconditions:
                    - N/A
    Parameters:     The following represent variables passed into the function:
                     contactObject: 
                        - ContactType : Landowner, Timber Owner, Operator, Contact Person, Surveyor, or Other
                        - Type : Business or Individual
                        - FirstName : First name of the contact (Required if Type Individual is selected)
                        - LastName : Last name of the contact (Required if Type Individual is selected)
                        - BusinessName : Name of the business (Required if Type Business is selected)
                        - Country : Country of the address (Required)
                        - Street1 : Street address line 1 (Required)
                        - Street2 : Street address line 2 (Optional)
                        - Street3 : Street address line 3 (Optional)
                        - ZipCode : Zip code of the address (Required)
                        - City : City of the address (Required)
                        - State : State of the address (Required)
                        - County : County of the address (Required)
                        - Phone : Phone number of the contact (Required)
                        - Email : Email address of the contact (Optinal)
                        - TimberOwnerSameLandOwner : Yes/No (Required)
                        - OperatorSameLandOwner : Yes/No (Required)
                        - FormID : The ID of the form that triggered the creation of the contact record (Required)
                    Example:
                        {
                        ContactType: "Landowner",
                        Type: "Individual",
                        FirstName: "John",
                        LastName: "Doe",
                        Country: "USA",
                        Street1: "123 Main St",
                        ZipCode: "12345",
                        City: "Springfield",
                        State: "IL",
                        County: "Sangamon"
                        Phone: "555-555-5555",
                        TimberOwnerSameLandOwner: Yes,
                        OperatorSameLandOwner: No,
                        FormID: "FORMID-12345"
                        }
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code: 
                    1° Get the values of the fields
                    2° Check if the required parameters are present
                    3° Create the contact record
 
    Date of Dev:    09/23/2024
    Last Rev Date:  11/07/2024
 
    Revision Notes:
                    09/23/2024 - Moises Savelli: WADNR-863 - First Setup of the script
                    11/07/2024 - Lucas Herrera: WADNR-956 - Exception to rules for FPAN-1D
                    11/15/2024 - Luis D'Oliveira: WADNR-1008 - Update Street2 and Street3 as optional
    */

    logger.info(`Start of the process LibCreateContactRecord at ${Date()}`);

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

    const contactInformationFormList = 'zDropDownListImport';
    const contactInformationFormTemplate = 'Contact Information';
    const filterValidContactTypes = 'Valid Contact Types';

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

    function getValidContactTypes(filterValidContactTypes, contactInformationFormList) {
        const shortDescription = `Get form ${contactInformationFormList}`;

        const getFormsParams = {
            q: `[List Name] eq '${filterValidContactTypes}' AND [Display Value] ne 'Select Item'`,
            fields: 'Display Value',
        };

        return vvClient.forms
            .getForms(getFormsParams, contactInformationFormList)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function validateContact(contactObject) {
        const errorLog = [];

        // Validate ContactType
        const validContactTypes = await getValidContactTypes(filterValidContactTypes, contactInformationFormList);

        const isValidContactType = validContactTypes.some(
            (item) => item['display Value'] === contactObject.ContactType
        );

        if (!isValidContactType) {
            errorLog.push('Invalid Contact Type');
        }

        // Validate Type (Business or Individual)
        const validTypes = ['business', 'individual'];
        if (!validTypes.includes(contactObject.Type.toLowerCase())) {
            errorLog.push('Invalid Type');
        }

        // Validate fields based on Type
        if (contactObject.Type.toLowerCase() === 'individual') {
            if (!contactObject.FirstName || contactObject.FirstName.trim() === '') {
                errorLog.push('First Name is required for Individual');
            }
            if (!contactObject.LastName || contactObject.LastName.trim() === '') {
                errorLog.push('Last Name is required for Individual');
            }
        }

        if (contactObject.Type.toLowerCase() === 'business') {
            if (!contactObject.BusinessName || contactObject.BusinessName.trim() === '') {
                errorLog.push('Business Name is required for Business');
            }
        }

        // Validate MailAddress object
        if (!contactObject.MailAddress) {
            errorLog.push('Mail Address is required');
        } else {
            const { Country, Street1, ZipCode, City, State, County } = contactObject.MailAddress;
            if (!Country || Country.trim() === '') errorLog.push('Country is required');
            if (!Street1 || Street1.trim() === '') errorLog.push('Street 1 is required');
            if (!ZipCode || ZipCode.trim() === '') errorLog.push('ZipCode is required');
            if (!City || City.trim() === '') errorLog.push('City is required');
            if (!State || State.trim() === '') errorLog.push('State is required');
            if (!County || County.trim() === '') errorLog.push('County is required');
        }

        // Validate Phone
        if (!contactObject.Phone || contactObject.Phone.trim() === '') {
            errorLog.push('Phone is required');
        }

        // Email is optional, no validation needed

        // Validate TimberOwnerSameLandOwner and OperatorSameLandOwner as Boolean
        if (
            contactObject.TimberOwnerSameLandOwner.toLowerCase() !== 'yes' &&
            contactObject.TimberOwnerSameLandOwner.toLowerCase() !== 'no'
        ) {
            errorLog.push('Is the Timber Owner Same as LandOwner must be a Yes or No value');
        }
        if (
            contactObject.OperatorSameLandOwner.toLowerCase() !== 'yes' &&
            contactObject.OperatorSameLandOwner.toLowerCase() !== 'no'
        ) {
            errorLog.push('Is the Operator Same as Landowner must be a Yes or No value');
        }

        if (!contactObject.FormID || contactObject.FormID.trim() === '') {
            errorLog.push('FormID is required');
        }

        // If there are errors, throw them
        if (errorLog.length > 0) {
            throw new Error(errorLog.join('; '));
        }

        return 'Validation passed';
    }

    async function validateContactFPAN1D(contactObject) {
        const errorLog = [];

        // Validate Email Adress
        if (!contactObject.Email || contactObject.Email.trim() === '') {
            errorLog.push('Email is required');
        }

        // Validate Phone Number
        if (!contactObject.Phone || contactObject.Phone.trim() === '') {
            errorLog.push('Phone is required');
        }

        // Validate first and last Name
        if (!contactObject.FirstName || contactObject.FirstName.trim() === '') {
            errorLog.push('firstName is required');
        }

        if (!contactObject.LastName || contactObject.LastName.trim() === '') {
            errorLog.push('lastName is required');
        }

        // If there are errors, throw them
        if (errorLog.length > 0) {
            throw new Error(errorLog.join('; '));
        }

        return 'Validation passed.';
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
        const FPAN1D = getFieldValueByName('FPAN1D') === 'True' ? true : false;
        let contactObject = {};
        let newContactRecordData = {};

        if (!FPAN1D) {
            contactObject = {
                ContactType: getFieldValueByName('ContactType'),
                Type: getFieldValueByName('Type'),
                FirstName: getFieldValueByName('FirstName', true),
                LastName: getFieldValueByName('LastName', true),
                BusinessName: getFieldValueByName('BusinessName', true),
                MailAddress: {
                    Country: getFieldValueByName('Country'),
                    Street1: getFieldValueByName('Street1'),
                    Street2: getFieldValueByName('Street2', true),
                    Street3: getFieldValueByName('Street3', true),
                    ZipCode: getFieldValueByName('ZipCode'),
                    City: getFieldValueByName('City'),
                    State: getFieldValueByName('State'),
                    County: getFieldValueByName('County'),
                },
                Phone: getFieldValueByName('Phone'),
                Email: getFieldValueByName('Email'),
                TimberOwnerSameLandOwner: getFieldValueByName('TimberOwnerSameLandOwner'),
                OperatorSameLandOwner: getFieldValueByName('OperatorSameLandOwner'),
                FormID: getFieldValueByName('FormID'),
            };
        } else {
            contactObject = {
                FirstName: getFieldValueByName('FirstName'),
                LastName: getFieldValueByName('LastName'),
                Email: getFieldValueByName('Email'),
                Phone: getFieldValueByName('Phone'),
                FormID: getFieldValueByName('FormID'),
            };
        }

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!FPAN1D) {
            await validateContact(contactObject);
        } else {
            await validateContactFPAN1D(contactObject);
        }

        // 3° CREATE THE CONTACT RECORD
        if (!FPAN1D) {
            newContactRecordData = {
                'Contact Type': contactObject.ContactType,
                'Timber Owner Same As Landowner': contactObject.TimberOwnerSameLandOwner,
                'Operator Same As Landowner': contactObject.OperatorSameLandOwner,
                'First Name': contactObject.FirstName,
                'Last Name': contactObject.LastName,
                'Street 1': contactObject.MailAddress.Street1,
                'Street 2': contactObject.MailAddress.Street2,
                'Street 3': contactObject.MailAddress.Street3,
                'Zip Code': contactObject.MailAddress.ZipCode,
                City: contactObject.MailAddress.City,
                State: contactObject.MailAddress.State,
                Country: contactObject.MailAddress.Country,
                Phone: contactObject.Phone,
                Email: contactObject.Email,
                'Business Name': contactObject.BusinessName,
                County: contactObject.MailAddress.County,
                'Initiating Record GUID': contactObject.FormID,
                // "Is the contact Person the same as landOwner" exists on Contact Information
                // But it's not a field requested for this story. WADNR-863
                // Forest Tax Number exists on Contact Information
                // But it's not a field requested for this story. WADNR-863
            };
        } else {
            newContactRecordData = {
                'First Name': contactObject.FirstName,
                'Last Name': contactObject.LastName,
                Phone: contactObject.Phone,
                Email: contactObject.Email,
                'Initiating Record GUID': contactObject.FormID,
            };
        }

        // 3.1° Call the function to create the contact record
        const newRecord = await createContactRecord(contactInformationFormTemplate, newContactRecordData);

        // 3.2° create new object to return
        const newRecordObject = {
            ...newContactRecordData,
            instanceName: newRecord.instanceName,
        };

        // TODO: Create relationship between the new contact record and the form that triggered the creation of the contact record using the Relate API

        // 4° BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Contact record created successfully';
        outputCollection[2] = newRecordObject;
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
