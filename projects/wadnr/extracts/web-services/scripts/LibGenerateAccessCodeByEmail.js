/**
 * LibGenerateAccessCodeByEmail
 * Category: Workflow
 * Modified: 2026-02-04T15:07:28.697Z by nicolas.culini@visualvault.com
 * Script ID: Script Id: f2215547-86cb-f011-82fa-da1785568e94
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const dayjs = require('dayjs');

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
    Script Name:    LibGenerateAccessCodeByEmail
    Customer:       WADNR
    Purpose:        Generates a unique, 6-digit access code and sends it to target email
    Preconditions:

    Parameters:     The following represent variables passed into the function:
                    Email: (String, required) Target Email

    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code:
                    1 Get the values of the fields
                    2 Set any previous record as disabled
                    3 Access Code Generation
                    4 Uniqueness Check
                    5 Access Code Record Creation
                    6 Send email
                    7 Build the success response array

    Date of Dev:    11/27/2025
    Last Rev Date:  11/27/2025

    Revision Notes:
                    11/27/2025 - Alfredo Scilabra:  First Setup of the script

    */

    logger.info(`Start of the process LibGenerateAccessCodeByEmail at ${Date()}`);
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

    const MAX_CODE_GENERATION_ATTEMPTS = 25; //Exit condition to do-while loop for code generation
    const MAX_ACCESS_CODE_VALUE = 999999;
    const ACCESS_CODE_INCREMENT_RATE = 1;
    const DAYS_TO_CALCULATE_EXPIRATION = 1;
    const FORM_TEMPLATE_NAME = 'Forest Practices Notification Profile';
    const EMAIL_SUBJECT = 'Access Code for Your Forest Practices Notification Profile';

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

    async function getFormRecords(getFormsParams, templateName) {
        const shortDescription = `Get ${templateName} form record`;

        const getFormsRes = await vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));

        return getFormsRes.data;
    }

    function createRecord(formTemplateName, newRecordData) {
        const shortDescription = `Post form ${formTemplateName}`;

        return vvClient.forms
            .postForms(null, newRecordData, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function updateRecord(formTemplateName, recordGUID, fieldValuesToUpdate) {
        const shortDescription = `Update form record ${recordGUID}`;

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function generateAccessCode() {
        const randomCode = Math.floor(Math.random() * 1000000).toString();
        return randomCode.padStart(6, '0');
    }

    function incrementAccessCode(accessCode) {
        let incrementedCode = parseInt(accessCode, 10) + ACCESS_CODE_INCREMENT_RATE;

        // Handle overflow if the code exceeds MAX_ACCESS_CODE_VALUE
        if (incrementedCode > MAX_ACCESS_CODE_VALUE) {
            incrementedCode = generateAccessCode();
        }

        return incrementedCode.toString().padStart(6, '0');
    }

    async function isCodeUnique(accessCode, email) {
        const [foundAccessCode] = await getFormRecords(
            {
                q: `[Access Code Number] eq '${accessCode}' AND [Related Record ID] eq '${email}' AND [Status] eq 'Enabled'`,
                fields: 'revisionId',
            },
            'Access Code'
        );
        return isNullEmptyUndefined(foundAccessCode);
    }

    function getExpirationDate() {
        const date = dayjs().add(DAYS_TO_CALCULATE_EXPIRATION, 'day');
        return date.toDate().toLocaleDateString('en-US');
    }

    function isValidEmail(email) {
        if (typeof email !== 'string' || !email.trim()) return false;
        const emailValidationCheck =
            /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return emailValidationCheck.test(email);
    }

    async function disablePreviousAccessCode(email) {
        const foundAccessCode = await getFormRecords(
            {
                q: `[Related Record ID] eq '${email}'`,
                fields: 'revisionId',
            },
            'Access Code'
        );

        await Promise.all(
            foundAccessCode.map((accessCode) =>
                updateRecord('Access Code', accessCode.revisionId, {
                    Status: 'Disabled',
                })
            )
        );
    }

    async function sendEmail(email, body) {
        const emailObj = {
            recipients: String(email).trim().toLowerCase(),
            ccrecipients: '',
            subject: EMAIL_SUBJECT,
            body,
            hasAttachments: false,
            documents: [],
        };

        const response = await vvClient.email.postEmails(null, emailObj);

        if (!response?.meta || response.meta.status !== 201) {
            throw new Error('An error occurred while attempting to send the email');
        }
        return response;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get the values of the fields
        const email = getFieldValueByName('Email');

        // Check if the required parameters are present and complete list of holidays
        if (!email) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        if (!isValidEmail(email)) {
            throw new Error('Invalid email provided');
        }

        // Set previous records as disabled
        await disablePreviousAccessCode(email);

        // Access Code Generation + Uniqueness Check
        let codeGenerationAttempts = 0,
            isAccessCodeUnique = false,
            accessCode = '';

        do {
            accessCode = accessCode === '' ? generateAccessCode() : incrementAccessCode(accessCode);
            isAccessCodeUnique = await isCodeUnique(accessCode, email);
            codeGenerationAttempts++;
        } while (!isAccessCodeUnique && codeGenerationAttempts <= MAX_CODE_GENERATION_ATTEMPTS);

        if (!isAccessCodeUnique) {
            throw new Error(
                "Unique access code couldn't be generated. Max generation attempts reached, please try again."
            );
        }

        // Access Code Record Creation
        const expirationDate = getExpirationDate();
        const today = new Date().toISOString();

        const newAccessCode = await createRecord('Access Code', {
            'Related Record ID': email,
            'Contact Information Relation ID': email,
            'Access Code Number': accessCode,
            'Expiration Date': expirationDate,
            'Date Created': today,
            'Related Record Type': FORM_TEMPLATE_NAME,
            Status: 'Enabled',
        });

        if (!newAccessCode) {
            throw new Error('An error ocurred while creating the new Access Code');
        }

        // Send email
        //EMAIL_SUBJECT
        const emailBody = `
      <p>You recently initiated the creation or modification of your Forest Practices Notification Profile.</p>

      <p>Please use the following time-sensitive access code to continue:</p>

      <p>Access Code: <strong>${accessCode}</strong></p>

      <p>For security purposes, this code will expire in <strong>24 hours</strong>, after its first use, or immediately upon requesting a new code.</p>

      <p>If you received this email in error or require fpOnline support, please contact the Washington Department of Natural Resources at
        <a href="mailto:fpOnline-support@dnr.wa.gov">fpOnline-support@dnr.wa.gov</a>
        or call 360-902-1420.
      </p>
    `;

        const emailResponse = await sendEmail(email, emailBody);
        if (emailResponse) {
            // Log communication
            await createRecord('Communications Log', {
                'Communication Type': 'Email',
                'Email Type': 'Manual Log',
                'Email Recipients': email,
                Subject: EMAIL_SUBJECT,
                'Email Body': emailBody,
                'Communication Date': today,
                'Communication Sent': 'Yes',
            });
        }

        // Build the success response array
        outputCollection[0] = 'Success'; // Don´t change this
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
