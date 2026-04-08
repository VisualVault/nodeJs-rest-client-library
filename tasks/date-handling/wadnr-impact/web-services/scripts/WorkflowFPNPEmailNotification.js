/**
 * WorkflowFPNPEmailNotification
 * Category: Workflow
 * Modified: 2026-02-19T12:00:55.07Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: ae15352c-3c1a-f011-82cd-cce61d1869ed
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
        Script Name:        WorkflowFPNPEmailNotification
        Customer:           WADNR
        Purpose:            The purpose of this process is to inform the Interested Party that the
                            subscription has been accepted.

        Parameters:
                            - Form ID: String
                            - Email Name: String
        Psuedo code:
                            1. Receive parameters
                            2. Check if the required parameters are present
                            3. Get FPNP record by Form ID
                            4. Create Communication Log and send email notification

        Date of Dev:
                            06/13/2025
        Revision Notes:
                            04/15/2025 - Fernando Chamorro:  First Setup of the script
                            05/23/2025 - Fernando Chamorro:  Adding condition for sent email flag
                            06/13/2025 - Alfredo Scilbra:  Replace hardcoded FPNP GUID with a function
                              to retrieve it dinamically
                            07/09/2025 - John Sevilla: Fix incorrect assignments of Email and SAW User ID on createActionsLink
                            02/19/2026 - Alfredo Scilabra: Added support for primary record ID

    */

    logger.info('Start of the process WorkflowFPNPEmailNotification at ' + Date());

    /**************************************
      Response and error handling variables
    ***************************************/

    let returnObject;

    // Respond immediately before the "processing"
    const responseParams = {
        success: true,
        message: 'Process started successfully.',
    };
    response.json(200, responseParams);

    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /***********************
      Configurable Variables
    ************************/
    const formTemplateName = 'Forest Practices Notification Profile';

    /*****************
      Script Variables
    ******************/

    // Describes the process being checked using the parsing and checking helper functions
    let shortDescription = '';
    // Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete.
    const executionId = response.req.headers['vv-execution-id'];

    /*****************
      Helper Functions
    ******************/

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
            // If an error ocurrs, it's because the resp is already a JS object and doesn't need to be parsed
        }
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
      Checks that the meta property of a vvCliente API response object has the expected status code
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
      Checks that the data property of a vvCliente API response object exists
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
      Checks that the data property of a vvCliente API response object is not empty
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

    async function getFpnpRecord(FormID, formTemplateName) {
        const FPNPrecords = await getForms(
            {
                q: `[Form ID] eq '${FormID}' AND [Status] eq 'Enabled'`,
                expand: true,
            },
            formTemplateName
        );

        if (isNullEmptyUndefined(FPNPrecords)) {
            throw new Error('Error getting contact information.');
        }

        return FPNPrecords;
    }

    async function sendNotificationEmail(tokens, emailAddress, relatedRecordID, emailName) {
        const emailRequestArr = [
            { name: 'Email Name', value: emailName },
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
        const envConfigResults = await getForms({ expand: true }, 'zEnvironmentConfiguration');

        const envConfig = envConfigResults.find(
            (config) =>
                !isNullEmptyUndefined(config['envConfig XCID']) && !isNullEmptyUndefined(config['envConfig XCDID'])
        );

        if (isNullEmptyUndefined(envConfig)) {
            throw new Error('Error getting environment config.');
        }

        return envConfig;
    }

    function getFormTemplateGUID(templateName) {
        const shortDescription = `Get the GUID of ${templateName} form template`;
        const getFormTemplatesParams = {
            q: `[Name] eq '${templateName}'`,
        };

        return vvClient.forms
            .getFormTemplates(getFormTemplatesParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0].revisionId);
    }

    function createActionsLink({ envConfig, sawUserId, email, includeUnsubscribe, fpnpGUID }) {
        const baseUrl = vvClient.getBaseUrl();
        const { customerAlias, databaseAlias } = module.exports.getCredentials();

        const url = new URL(`${baseUrl}/Public/${customerAlias}/${databaseAlias}/formviewer`);

        url.searchParams.set('formid', fpnpGUID);
        url.searchParams.set('xcid', envConfig['envConfig XCID']);
        url.searchParams.set('xcdid', envConfig['envConfig XCDID']);
        url.searchParams.set('SAW User ID', sawUserId);
        url.searchParams.set('Email', email);
        url.searchParams.set('hidemenu', true);

        if (includeUnsubscribe) {
            url.searchParams.set('Unsubscribe', true);
        }

        return url.toString();
    }

    /**********
      MAIN CODE
    **********/

    try {
        // 1. Receive parameters
        const FormID = getFieldValueByName('Form ID');
        const emailName = getFieldValueByName('Email Name');

        // 2. Check if the required parameters are present
        if (!FormID || !emailName) {
            throw new Error(errorLog.join('; '));
        }

        // 3. Get FPNP record by Form ID
        const [fpnpRecord] = await getFpnpRecord(FormID, formTemplateName);

        const firstName = fpnpRecord['first Name'] || '';
        const lastName = fpnpRecord['last Name'] || '';
        const email = fpnpRecord['email'] || '';
        const sawUserId = fpnpRecord['saW User ID'] || '';
        const wasEmailSent = fpnpRecord['was Email Sent'] || '';
        const updatePreferences = fpnpRecord['updating Preferences'] || '';

        const envConfig = await getEnvConfig();
        const fpnpGUID = await getFormTemplateGUID(formTemplateName);
        const updatePreferencesLink = createActionsLink({
            envConfig,
            email,
            sawUserId,
            includeUnsubscribe: false,
            fpnpGUID,
        });
        const unsubscribeLink = createActionsLink({
            envConfig,
            email,
            sawUserId,
            includeUnsubscribe: true,
            fpnpGUID,
        });

        const tokens = [
            { name: '[First Name]', value: firstName },
            { name: '[Last Name]', value: lastName },
            { name: '[Update Preferences]', value: updatePreferencesLink },
            { name: '[Unsubscribe]', value: unsubscribeLink },
        ];

        // Check if the email should be sent
        if (wasEmailSent === 'True' && updatePreferences === 'True') {
            returnObject = {
                MicroserviceResult: true,
                MicroserviceMessage: 'Microservice completed successfully. Email was already sent previously.',
                DocID: FormID,
            };
        } else {
            // 4. Create Communication Log and send email notification
            const sendNotificationEmailResults = await sendNotificationEmail(tokens, email, FormID, emailName);

            returnObject = {
                MicroserviceResult: true,
                MicroserviceMessage: 'Microservice completed successfully',
                DocID: FormID,
                'Communication Log details': [...sendNotificationEmailResults],
            };
        }
    } catch (err) {
        logger.info('Error encountered' + err);

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: err,
        };
    } finally {
        shortDescription = 'Sending the workflow completion response to the log server';

        // If the complete was successful or not to the log server. This helps to track down what occurred when a microservice completed.
        await vvClient.scripts
            .completeWorkflowWebService(executionId, returnObject)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then(() => logger.info('Completion signaled to WF engine successfully.'))
            .catch(() => logger.info('There was an error signaling WF completion.'));
    }
};
