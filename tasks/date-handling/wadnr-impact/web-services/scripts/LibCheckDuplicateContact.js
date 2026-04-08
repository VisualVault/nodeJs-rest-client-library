/**
 * LibCheckDuplicateContact
 * Category: Workflow
 * Modified: 2024-10-04T18:16:37.733Z by moises.savelli@visualvault.com
 * Script ID: Script Id: 6802b97f-5582-ef11-82b0-9d4821abdbfe
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
    Script Name:    LibCheckDuplicateContact
    Customer:       WA DNR
    Purpose:        Check if a contact already exists in the database
    Preconditions:
                    - LibFormDuplicatePersonChecking : Web Service.
    Parameters:     The following represent variables passed into the function:
                    - Contact Type: (String)
                    - Fist Name: (String)
                    - Last Name: (String)
                    - Business Name: (String)
                    - Street1: (String)
                    - Country: (String)
                    - County: (String)
                    - Phone: (String)
                    - Email: (String)

                    If the contact type is Landowner, the following fields are required:
                    - TimberOwnerSameLandOwner: ("Yes/No")
                    - OperatorSameLandOwner: ("Yes/No")

                    Example:
                    {
                        "Contact Type": "Landowner",
                        "First Name": "John",
                        "Last Name": "Doe",
                        "Business Name": "Doe Inc.",
                        "Street1": "1234 Main St.",
                        "Country": "USA",
                        "County": "King",
                        "Phone": "123-456-7890",
                        "Email": "John.Doe@test.com",
                        "TimberOwnerSameLandOwner": "Yes",
                        "OperatorSameLandOwner": "No"
                    }
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code: 
                    1° Get the values of the fields
                    2° Check if the required parameters are present
                    3° Check if the contact already exists
                        3.1° Find duplicates using isDuplicate function
                    4° Return the response
 
    Date of Dev:    10/02/2024
    Last Rev Date:  10/02/2024
 
    Revision Notes:
                    10/02/2024 - Moises Savelli:  First Setup of the script
    */

    logger.info(`Start of the process LibCheckDuplicateContact at ${Date()}`);

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

    const SoundexQueryName = 'zWebSvc Contact Soundex Query';
    const SearchQueryName = 'zWebSvc Contact Search Query';
    const contactFormTemplateName = 'Contact Information';

    const REQUIRED_FIELDS = ['FirstName', 'LastName', 'BusinessName', 'Street1', 'Country', 'County', 'Phone', 'Email'];

    const LANDOWNER_REQUIRED_FIELDS = ['TimberOwnerSameLandOwner', 'OperatorSameLandOwner'];

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

    function isEmptyOrWhitespace(value) {
        return !value || value.trim() === '';
    }

    function validateRequiredFields(contactObject, fields) {
        return fields.reduce((errors, field) => {
            if (isEmptyOrWhitespace(contactObject[field])) {
                errors.push(`The field '${field}' is required.`);
            }
            return errors;
        }, []);
    }

    function validateContact(contactObject) {
        let errorLog = [];

        // Validate Contact Type
        if (isEmptyOrWhitespace(contactObject.ContactType)) {
            errorLog.push("The field 'ContactType' is required.");
        } else if (contactObject.ContactType.toLowerCase() === 'landowner') {
            errorLog = errorLog.concat(validateRequiredFields(contactObject, LANDOWNER_REQUIRED_FIELDS));
        }

        // Validate common required fields
        errorLog = errorLog.concat(validateRequiredFields(contactObject, REQUIRED_FIELDS));

        return errorLog;
    }

    function isDuplicate(contact, contactObject) {
        const streetMatches =
            (contact['street 1']?.toLowerCase().trim() || '') === (contactObject.Street1.toLowerCase().trim() || '');

        const countryMatches = contact['country']
            ? (contact['country']?.toLowerCase().trim() || '') === (contactObject.Country.toLowerCase().trim() || '')
            : true;

        const countyMatches =
            (contact['county']?.toLowerCase().trim() || '') === (contactObject.County.toLowerCase().trim() || '');

        const phoneMatches = (contact['phone']?.trim() || '') === (contactObject.Phone.trim() || '');

        const emailMatches =
            (contact['email']?.toLowerCase().trim() || '') === (contactObject.Email.toLowerCase().trim() || '');

        const landownerValidation =
            contactObject.ContactType?.toLowerCase() === 'landowner'
                ? (contact['timber Owner Same As Landowner']?.trim() || '') ===
                      (contactObject.TimberOwnerSameLandOwner.trim() || '') &&
                  (contact['operator Same As Landowner']?.trim() || '') ===
                      (contactObject.OperatorSameLandOwner.trim() || '')
                : true;

        // Return true if *all* fields match
        return streetMatches && countryMatches && countyMatches && phoneMatches && landownerValidation && emailMatches;
    }

    async function searchByName(contactObject) {
        const webServiceName = 'LibFormDuplicatePersonChecking';
        shortDescription = '';
        let firstName, lastName, soundexQuery, county, countyNameQuery;

        firstName = contactObject.FirstName.trim().replace(/'/g, "''");
        lastName = contactObject.LastName.trim().replace(/'/g, "''");
        businessName = contactObject.BusinessName.trim().replace(/'/g, "''");
        county = contactObject.County.trim().replace(/'/g, "''");
        countyNameQuery = `[County] = '${county}'`;
        soundexQuery = `SOUNDEX([Last Name]) = SOUNDEX('${lastName}') AND SOUNDEX([First Name]) = SOUNDEX('${firstName}') AND SOUNDEX([Business Name]) = SOUNDEX('${businessName}')`;

        let personCheckObject = [
            {
                name: 'PersonObject',
                value: {
                    firstname: firstName,
                    lastname: lastName,
                    otheridquery: `${countyNameQuery}`,
                },
            },
            {
                name: 'SoundexQueryName',
                value: SoundexQueryName,
            },
            {
                name: 'SearchQueryName',
                value: SearchQueryName,
            },
            {
                name: 'SoundexWhereClause',
                value: soundexQuery,
            },
            {
                name: 'NameOfFirstNameField',
                value: 'First Name',
            },
            {
                name: 'NameOfLastNameField',
                value: 'Last Name',
            },
            {
                name: 'NameOfMiddleNameField',
                value: '',
            },
            {
                name: 'MiddleNameSearch',
                value: false,
            },
            { name: 'IndividualRecordTemplateID', value: contactFormTemplateName },
        ];

        return vvClient.scripts
            .runWebService(webServiceName, personCheckObject)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° Get the values of the fields
        const contactObject = {
            ContactType: getFieldValueByName('ContactType'),
            FirstName: getFieldValueByName('FirstName', true),
            LastName: getFieldValueByName('LastName', true),
            BusinessName: getFieldValueByName('BusinessName', true),
            Street1: getFieldValueByName('Street1'),
            Country: getFieldValueByName('Country'),
            County: getFieldValueByName('County'),
            Phone: getFieldValueByName('Phone'),
            Email: getFieldValueByName('Email'),
            TimberOwnerSameLandOwner: getFieldValueByName('TimberOwnerSameLandOwner', true),
            OperatorSameLandOwner: getFieldValueByName('OperatorSameLandOwner', true),
        };

        // 2° Check if the required parameters are present
        const validateField = validateContact(contactObject);

        if (validateField.length > 0) {
            throw new Error(`Some field(s) are missing: ${validateField.join('; ')}`);
        }

        // 3° Check if the contact already exists
        const contactExists = await searchByName(contactObject);

        outputCollection[0] = 'Success'; // Don’t change this

        if (contactExists.data[1] === 'Duplicates found') {
            const contacts = contactExists.data[2];

            // 3.1° Find duplicates using isDuplicate function
            const duplicates = contacts.filter((contact) => isDuplicate(contact, contactObject));

            if (duplicates.length > 0) {
                outputCollection[1] = 'Duplicates found';
                outputCollection[2] = duplicates; // Return the actual duplicate contacts
            } else {
                outputCollection[1] = 'No duplicates found';
            }
        } else {
            outputCollection[1] = 'No duplicates found';
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
