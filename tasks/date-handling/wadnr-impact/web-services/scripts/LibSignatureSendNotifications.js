/**
 * LibSignatureSendNotifications
 * Category: Workflow
 * Modified: 2026-02-25T13:48:35.41Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: 99341e4b-87ce-ef11-82bf-a0dcc70b93c8
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
    Script Name:    LibSignatureSendNotifications
    Customer:       WADNR
    Purpose:        Collects required signers for a form, generates unique access codes for each,
                    and creates a communication log entry to initiate the notification process.
    Preconditions:

    Parameters:     The following represent variables passed into the function:
                    Related Record ID: (String, required) The identifier of the form (e.g., FPAN) for which the access codes and communication log entries are generated.
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code:
                    1 Get the values of the fields
                    2 Check if the required parameters are present and complete list of holidays
                    3 Identify Signers
                    4 Generate Access Codes
                    5 Create Communication Log
                    6 Build the success response array

    Date of Dev:    01/09/2025
    Last Rev Date:  02/25/2026

    Revision Notes:
                    01/09/2025 - Alfredo Scilabra:  First Setup of the script
                    03/12/2025 - Alfredo Scilabra:  Adjust access code and signature functions to fix link creation
                    03/13/2025 - Alfredo Scilabra:  Update getEnvConfig to avoid ID hardcoding
                    03/19/2025 - Alfredo Scilabra:  Add field name mapping for email templates
                    05/19/2025 - Mauro Rapuano:     Add Step 1 LTA to detectForm function
                    06/05/2025 - Alfredo Scilabra:  Fix region token for Step 1
                    10/17/2025 - Alfredo Scilabra:  Added support for Notice of Continuing Forest Land Obligation
                    12/04/2025 - Matías Andrade:    Updated [Recipient Name] email token to use "Company Name Person" for NCFLO contacts.
                    02/19/2026 - Alfredo Scilabra: Added support for primary record ID
                    02/25/2026 - Alfredo Scilabra: Rename Multi-pupose prefix
  */

    logger.info(`Start of the process LibSignatureSendNotifications at ${Date()}`);
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

    const SIGNATURE_FORMID = 'ff71cbf4-58f0-ef11-aa7d-9a67e15c5f63';
    /**
     * This mapping has the following structrue
     * {
     *    'Template Name': 'Target Field Name'
     * }
     */
    // NOTE: Add here the field name mapping for the email template to work properly
    // Keep in mind that the field name in the getForms response object has the first letter in lower case
    const REGION_NAME_FIELD_MAPPING = new Map([
        ['FPAN Renewal', 'region'],
        ['Forest Practices Aerial Chemical Application', 'region'],
        ['Forest Practices Application Notification', 'region'],
        ['Long-Term Application 5-Day Notice', 'region Project Information'],
        ['FPAN Amendment Request', 'region'],
        ['Step 1 Long Term FPA', 'region'],
        ['Notice of Continuing Forest Land Obligation', 'region'],
    ]);

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

    async function getForms(getFormsParams, templateName) {
        shortDescription = `Get ${templateName} form record`;

        const getFormsRes = await vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));

        return getFormsRes.data;
    }

    function callExternalWs(webServiceName, webServiceParams) {
        let shortDescription = `Run Web Service: ${webServiceName}`;

        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function getContactInformationRelationRecords(relatedRecordID) {
        const contactInformationRelationRecords = await getForms(
            {
                q: `[Related Record ID] eq '${relatedRecordID}' AND [Status] eq 'Enabled'`,
                expand: true,
            },
            'Contact Information Relation'
        );

        if (isNullEmptyUndefined(contactInformationRelationRecords)) {
            throw new Error('No contact records found associated to the application.');
        }

        return contactInformationRelationRecords;
    }

    async function getContactInformationRecords(contactInformationRelationRecords) {
        const contactInformationIDString = contactInformationRelationRecords
            .map((el) => `'${el['contact Information ID']}'`)
            .join(',');

        // This is a helper object for adding contact info relation ID because its needed to generate access code
        const contactInformationRelationIDCollection = contactInformationRelationRecords.reduce((acc, el) => {
            acc[el['contact Information ID']] = el.instanceName;
            return acc;
        }, {});

        const contactInformationRecords = await getForms(
            {
                q: `[Contact Information ID] IN (${contactInformationIDString}) AND [Status] eq 'Enabled'`,
                expand: true,
            },
            'Contact Information'
        );

        if (isNullEmptyUndefined(contactInformationRecords)) {
            throw new Error('Error getting contact information.');
        }

        return contactInformationRecords.map((contactInformation) => ({
            ...contactInformation,
            // Adding contact info relation ID because its needed to generate access code
            contactInformationRelationID: contactInformationRelationIDCollection[contactInformation.instanceName],
        }));
    }

    async function generateAccesCode(relatedRecordID, contactInformationRelationID) {
        const [LibSignatureGenerateAccessCodeStatus, , accessCodeResult] = await callExternalWs(
            'LibSignatureGenerateAccessCode',
            [
                {
                    name: 'Related Record ID',
                    value: relatedRecordID,
                },
                {
                    name: 'Contact Information Relation ID',
                    value: contactInformationRelationID,
                },
            ]
        );

        if (LibSignatureGenerateAccessCodeStatus !== 'Success') {
            throw new Error('Error generating Access Code.');
        }

        return accessCodeResult['Access Code GUID'];
    }

    async function getAccesCode(accessCodeGUID) {
        const accessCodeRecord = await getForms(
            {
                q: `[revisionId] eq '${accessCodeGUID}'`,
                expand: true,
            },
            'Access Code'
        );

        if (isNullEmptyUndefined(accessCodeRecord)) {
            throw new Error('Error getting Access Code.');
        }

        return accessCodeRecord;
    }

    async function sendNotificationEmail(tokens, emailAddress, relatedRecordID) {
        const emailRequestArr = [
            { name: 'Email Name', value: 'FPAN Signatures' },
            { name: 'Tokens', value: tokens },
            { name: 'Email Address', value: emailAddress },
            { name: 'Email AddressCC', value: '' },
            { name: 'SendDateTime', value: '' },
            { name: 'RELATETORECORD', value: [relatedRecordID] },
            { name: 'OTHERFIELDSTOUPDATE', value: { 'Primary Record ID': relatedRecordID } },
        ];
        const [LibEmailGenerateAndCreateCommunicationLogStatus, , comLogResult] = await callExternalWs(
            'LibEmailGenerateAndCreateCommunicationLog',
            emailRequestArr
        );

        if (LibEmailGenerateAndCreateCommunicationLogStatus !== 'Success') {
            throw new Error('Error sending notifications.');
        }

        return comLogResult;
    }

    async function getEnvConfig() {
        const envConfigResults = await getForms(
            {
                expand: true,
            },
            'zEnvironmentConfiguration'
        );

        const envConfig = envConfigResults.find(
            (config) =>
                !isNullEmptyUndefined(config['envConfig XCID']) && !isNullEmptyUndefined(config['envConfig XCDID'])
        );

        if (isNullEmptyUndefined(envConfig)) {
            throw new Error('Error getting environment config.');
        }

        return envConfig;
    }

    function createSignatureLink(envConfig, relatedRecordID, contactInformationRelationID) {
        const { customerAlias, databaseAlias } = module.exports.getCredentials();
        const baseUrl = vvClient.getBaseUrl();

        const url = new URL(`${baseUrl}/Public/${customerAlias}/${databaseAlias}/formviewer`);
        url.searchParams.set('formid', SIGNATURE_FORMID);
        url.searchParams.set('xcid', envConfig['envConfig XCID']);
        url.searchParams.set('xcdid', envConfig['envConfig XCDID']);
        url.searchParams.set('Related Record ID', relatedRecordID);
        url.searchParams.set('Contact Information Relation ID', contactInformationRelationID);
        url.searchParams.set('hidemenu', true);
        return url.toString();
    }

    function detectFormTemplateFromID(recordID) {
        //NOTE: Check for longer prefixes first!
        const templateMap = new Map([
            ['STEP-1-LONG-TERM-FPA', 'Step 1 Long Term FPA'],
            ['FPA-AERIAL-CHEMICAL', 'Forest Practices Aerial Chemical Application'],
            ['APPLICATION-REVIEW', 'Application Review Page'],
            ['FPAN-AMENDMENT', 'FPAN Amendment Request'],
            ['FPAN-RENEWAL', 'FPAN Renewal'],
            ['FPAN-T', 'FPAN Notice of Transfer'],
            ['LT-5DN', 'Long-Term Application 5-Day Notice'],
            ['NCFLO', 'Notice of Continuing Forest Land Obligation'],
            ['FPAN', 'Forest Practices Application Notification'],
            ['MPF', 'Multi-purpose'],
        ]);

        const normalizedID = recordID.replace(/\s+/g, '');

        for (const [prefix, name] of templateMap) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return name;
            }
        }

        throw new Error('Form template name not found.');
    }

    async function getRelatedRecord(relatedRecordID, formTemplateName) {
        const relatedRecord = await getForms(
            {
                q: `[instanceName] eq '${relatedRecordID}'`,
                expand: true,
            },
            formTemplateName
        );

        if (isNullEmptyUndefined(relatedRecord)) {
            throw new Error('Error getting related record information.');
        }

        return relatedRecord;
    }

    async function attachAccessCodeToContactRecord(contactInformation, relatedRecordID, envConfig) {
        const accessCodeGUID = await generateAccesCode(
            relatedRecordID,
            contactInformation.contactInformationRelationID
        );
        const [accessCodeRecord] = await getAccesCode(accessCodeGUID);

        const signatureLink = createSignatureLink(
            envConfig,
            relatedRecordID,
            contactInformation.contactInformationRelationID
        );

        return {
            ...contactInformation,
            accessCode: accessCodeRecord['access Code Number'],
            expirationDate: accessCodeRecord['expiration Date'],
            signatureLink,
        };
    }

    function getDaysUntilExpiration(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date

        const targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
            throw new Error('Error calculating expiration date.');
        }

        if (targetDate < today) {
            throw new Error('Error expiration date is in the past.');
        }

        const timeDiff = targetDate - today + 1;
        return Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1 Get the values of the fields
        const relatedRecordID = getFieldValueByName('Related Record ID');

        // 2 Check if the required parameters are present and complete list of holidays
        if (!relatedRecordID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3 Identify Signers
        const contactInformationRelationRecords = await getContactInformationRelationRecords(relatedRecordID);

        const contactInformationRecords = await getContactInformationRecords(contactInformationRelationRecords);

        // 4 Generate Access Codes
        const envConfig = await getEnvConfig();

        const contactInformationRecordsWithAccessCode = await Promise.all(
            contactInformationRecords.map(
                async (contactInformation) =>
                    await attachAccessCodeToContactRecord(contactInformation, relatedRecordID, envConfig)
            )
        );

        // 5 Create Communication Log
        const formTemplateName = detectFormTemplateFromID(relatedRecordID);
        const [relatedRecord] = await getRelatedRecord(relatedRecordID, formTemplateName);
        const regionFieldName = REGION_NAME_FIELD_MAPPING.get(formTemplateName) ?? 'region';

        const sendNotificationEmailResults = await Promise.all(
            contactInformationRecordsWithAccessCode.map(async (contactInformation) => {
                if (isNullEmptyUndefined(contactInformation.email)) {
                    return Promise.resolve();
                }
                const expirationDate = getDaysUntilExpiration(contactInformation.expirationDate);

                // Build Recipient Name token
                let recipientName = '';

                // Default behavior: use First Name + Last Name if available
                const firstName = contactInformation['first Name'] || '';
                const lastName = contactInformation['last Name'] || '';
                const fullName = `${firstName} ${lastName}`.trim();

                if (fullName) {
                    recipientName = fullName;
                }

                // Specific behavior for NCFLO: use Company Name Person
                if (
                    formTemplateName === 'Notice of Continuing Forest Land Obligation' &&
                    isNullEmptyUndefined(recipientName)
                ) {
                    recipientName = contactInformation['company Name Person'] || '';
                }

                const tokens = [
                    { name: '[FPAN Number]', value: relatedRecordID },
                    { name: '[Access Code]', value: contactInformation.accessCode },
                    {
                        name: '[Region Name]',
                        value: relatedRecord[regionFieldName],
                    },
                    { name: '[Expiration Date]', value: expirationDate },
                    {
                        name: '[Signature Link]',
                        value: contactInformation.signatureLink,
                    },
                    {
                        name: '[Recipient Name]',
                        value: recipientName,
                    },
                ];
                return await sendNotificationEmail(tokens, contactInformation.email, relatedRecordID);
            })
        );

        // 6 Build the success response array
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Access codes generated, and emails sent.';
        outputCollection[2] = {
            'Generated Access Codes': [...contactInformationRecordsWithAccessCode.map((el) => el.accessCode)],
            'Com log details': [...sendNotificationEmailResults],
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
