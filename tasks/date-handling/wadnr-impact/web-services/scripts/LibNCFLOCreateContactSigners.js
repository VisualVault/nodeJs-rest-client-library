/**
 * LibNCFLOCreateContactSigners
 * Category: Workflow
 * Modified: 2025-12-04T13:12:30.373Z by matias.andrade@visualvault.com
 * Script ID: Script Id: 72ec866d-6bd0-f011-8306-f1dc58f01122
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
    Script Name:    LibNCFLOCreateContactSigners
    Customer:       WA-DNR
    Purpose:        Create (or reuse) Contact Information records for NCFLO Buyer and Seller,
                    and create Contact Information Relation records linked to the NCFLO record.
                    This script prepares the signer structure required for the signature process.

    Preconditions:

    Parameters (ffCollection fields):
                    FormID                      (required) → NCFLO instanceName / Form ID

                    SellerCompanyNamePerson     (required)
                    SellerEmail                 (required)
                    SellerZip                   (required)
                    SellerPhone                 (optional)
                    SellerMailingAddress        (optional)
                    SellerCity                  (optional)
                    SellerState                 (optional)

                    BuyerCompanyNamePerson      (required)
                    BuyerEmail                  (required)
                    BuyerZip                    (required)
                    BuyerPhone                  (optional)
                    BuyerMailingAddress         (optional)
                    BuyerCity                   (optional)
                    BuyerState                  (optional)

    Return Object:
                    outputCollection[0]: Status  ("Success" or "Error")
                    outputCollection[1]: Message
                    outputCollection[2]: Data
                        {
                          FormID: 'NCFLO-...',
                          Seller: {
                            ContactInformationID: '...',
                            RelationFormID: '...'
                          },
                          Buyer: {
                            ContactInformationID: '...',
                            RelationFormID: '...'
                          }
                        }

    Pseudo code:
                    1) Get and validate required parameters.
                    2) For Seller: find or create Contact Information, then create Relation.
                    3) For Buyer: find or create Contact Information, then create Relation.
                    4) Return Success so client-side.

    Date of Dev:    11/28/2025
    Last Rev Date:  11/28/2025

    Revision Notes:
                    11/28/2025 - Initial version for NCFLO signers setup.
  */

    logger.info(`Start of the process LibNCFLOCreateContactSigners at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    let outputCollection = [];
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const CONTACT_INFORMATION_TEMPLATE = 'Contact Information';
    const DEFAULT_COUNTRY = 'United States';
    const DEFAULT_STATE = 'Washington';

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
        const dataType = Object.prototype.toString.call(param).slice(8, -1).toLowerCase();
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

    async function getContactByEmail(email) {
        if (isNullEmptyUndefined(email)) {
            return null;
        }

        const shortDescription = 'Get Contact Information by email';

        const getFormsParams = {
            q: `[Email] eq '${email}' AND [Status] eq 'Enabled'`,
            expand: true,
        };

        const res = await vvClient.forms
            .getForms(getFormsParams, CONTACT_INFORMATION_TEMPLATE)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));

        return res.length > 0 ? res[0] : null;
    }

    /**
     * createContactInformation
     * Creates a new Contact Information record using the provided data object.
     * Executes the standard vvClient form-posting pipeline with parsing,
     * metadata validation, and data checks.
     *
     * @param {Object} contactData - Field/value pairs for creating a Contact Information record.
     * @returns {Promise<Object>} The created Contact Information record (postRes.data).
     */
    async function createContactInformation(contactData) {
        const shortDescription = `Post form ${CONTACT_INFORMATION_TEMPLATE}`;

        const postRes = await vvClient.forms
            .postForms(null, contactData, CONTACT_INFORMATION_TEMPLATE)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));

        return postRes.data;
    }
    /**
     * upsertContactAndRelation
     * Creates or updates a Contact Information record and its corresponding
     * Contact Information Relation record for either a Buyer or a Seller.
     *
     * If the contact already exists (matched by email), it is reused.
     * Otherwise, a new Contact Information record is created.
     * A Contact Information Relation entry is always created for the provided NCFLO form.
     *
     * @param {String} roleLabel - "Seller" or "Buyer".
     * @param {String} formID - NCFLO Form ID used as Related Record ID.
     * @param {Object} personData - Contact data for Buyer/Seller.
     * @param {String} personData.companyNamePerson - Person or company name.
     * @param {String} personData.email - Email address (required).
     * @param {String} personData.zip - Zip Code (required).
     * @param {String} [personData.phone] - Phone number.
     * @param {String} [personData.address] - Address Line 1.
     * @param {String} [personData.city] - City.
     * @param {String} [personData.state] - State code.
     *
     * @returns {Promise<Object>} Object containing:
     *  - ContactInformationID: ID of the created or reused Contact Information record.
     *  - RelationInstanceName: Instance name of the created Contact Information Relation record.
     */
    async function upsertContactAndRelation(roleLabel, formID, personData) {
        // 1) Find or create Contact Information
        let contactRecord = await getContactByEmail(personData.email);

        if (!contactRecord) {
            const contactInfoData = {
                'Company Name Person': personData.companyNamePerson,
                Email: personData.email,
                Phone: personData.phone || '',
                Country: DEFAULT_COUNTRY,
                'Zip Code': personData.zip,
                'Address Line 1': personData.address || '',
                City: personData.city || '',
                State: personData.state || DEFAULT_STATE,
                County: '',
                'Related Record ID': formID,
                Status: 'Enabled',
            };

            contactRecord = await createContactInformation(contactInfoData);
        }

        const contactInformationID = contactRecord['contact Information ID'] || contactRecord.instanceName;

        // 2) Call LibCreateContactInformationRelation to create the CIR record
        const cirParams = [
            { name: 'Related Record ID', value: formID },
            { name: 'Contact Information ID', value: contactInformationID },
            { name: 'Relation Type', value: 'Individual' },
            // Buyer / Seller flags for NCFLO
            { name: 'Buyer', value: roleLabel === 'Buyer' ? 'True' : 'False' },
            { name: 'Seller', value: roleLabel === 'Seller' ? 'True' : 'False' },
        ];

        const shortDescription = `Executing LibCreateContactInformationRelation for ${roleLabel} – ${formID}`;

        const cirResult = await vvClient.scripts
            .runWebService('LibCreateContactInformationRelation', cirParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);

        const relationFormID = cirResult?.[2].results?.['Form ID'] || null;

        return {
            ContactInformationID: contactInformationID,
            RelationFormID: relationFormID,
        };
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1) Get values from the form
        const formID = getFieldValueByName('Form ID');

        const sellerCompanyNamePerson = getFieldValueByName('Seller Company Name Person');
        const sellerEmail = getFieldValueByName('Seller Email');
        const sellerZip = getFieldValueByName('Seller Zip');
        const sellerPhone = getFieldValueByName('Seller Phone', true);
        const sellerMailingAddress = getFieldValueByName('Seller Mailing Address', true);
        const sellerCity = getFieldValueByName('Seller City', true);
        const sellerState = getFieldValueByName('Seller State', true);

        const buyerCompanyNamePerson = getFieldValueByName('Buyer Company Name Person');
        const buyerEmail = getFieldValueByName('Buyer Email');
        const buyerZip = getFieldValueByName('Buyer Zip');
        const buyerPhone = getFieldValueByName('Buyer Phone', true);
        const buyerMailingAddress = getFieldValueByName('Buyer Mailing Address', true);
        const buyerCity = getFieldValueByName('Buyer City', true);
        const buyerState = getFieldValueByName('Buyer State', true);

        // Check if required parameters were provided
        if (
            !formID ||
            !sellerCompanyNamePerson ||
            !sellerEmail ||
            !sellerZip ||
            !buyerCompanyNamePerson ||
            !buyerEmail ||
            !buyerZip
        ) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 2) Upsert Seller
        const sellerResult = await upsertContactAndRelation('Seller', formID, {
            companyNamePerson: sellerCompanyNamePerson,
            email: sellerEmail,
            zip: sellerZip,
            phone: sellerPhone,
            address: sellerMailingAddress,
            city: sellerCity,
            state: sellerState,
        });

        // 3) Upsert Buyer
        const buyerResult = await upsertContactAndRelation('Buyer', formID, {
            companyNamePerson: buyerCompanyNamePerson,
            email: buyerEmail,
            zip: buyerZip,
            phone: buyerPhone,
            address: buyerMailingAddress,
            city: buyerCity,
            state: buyerState,
        });

        // 4) Build success response
        outputCollection[0] = 'Success';
        outputCollection[1] =
            'Contact Information and Relation records created/linked successfully for Buyer and Seller.';
        outputCollection[2] = {
            FormID: formID,
            Seller: sellerResult,
            Buyer: buyerResult,
        };
    } catch (error) {
        logger.info(`Error encountered in LibNCFLOCreateContactSigners: ${error}`);

        outputCollection[0] = 'Error';

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors ocurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        response.json(200, outputCollection);
    }
};
