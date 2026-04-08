/**
 * WorkflowNotifyOfGISCompletion
 * Category: Workflow
 * Modified: 2026-03-30T17:45:16.003Z by lucas.herrera@visualvault.com
 * Script ID: Script Id: 4beb64dd-5ab0-f011-82f3-8a51ceac8dc2
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
    Script Name:    WorkflowNotifyOfGISCompletion
    Customer:       VisualVault
    Purpose:        The purpose of this process is to generate a communication log that will facilitate sending
                    an email to the Proponent, Landowners, Surveyors, Forester and External Reviewers when
                    the GIS Editor has entered the GIS Edits Complete Date.
    Preconditions:
                    - A WTMF-type application must exist and have been submitted.
                    - Its corresponding WTM Review Page must exist.
                    - This process must only be performed for users with the GIS Editor role.
    Parameters:
                    - Form ID: String - (WTM Review Page ID)
    Return Object:
                    1. Receive parameters
                    2. Check if required parameters are present
                    3. Retrieve contact information for each Proponent, Landowners, Surveyors, Forester and External Reviewers associated
                    4. Create Communication Log and send email notification
                    5. Update notification flag
                    6. Build the success response array

    Date of Dev:    - 03/06/2026

    Revision Notes:
                    - 10/23/2025 - Fernando Chamorro:  First Setup of the script
                    - 11/25/2025 - Fernando Chamorro:  Fixing empty contactInformation records
                    - 02/10/2026 - Fernando Chamorro:  'Gis Edits Complete Date' validation added
                    - 02/11/2026 - Fernando Chamorro:  PDF Package Link added
                    - 02/19/2026 - Alfredo Scilabra: Added support for primary record ID
                    - 02/20/2026 - Federico Cuelho: Add Forester to the notification list.
                    - 02/24/2026 - Fernando Chamorro:   Assign permissions to DocumentPath
                    - 02/27/2026 - Federico Cuelho: Refactor code and update helper functions for better error handling and readability.
                    - 03/06/2026 - Federico Cuelho: Add check to avoid sending broken links in case the PDF Package GUID is not available and to avoid setting permissions to a path that doesn't exist.
                    - 03/30/2026 - Lucas Herera: Add sendDateTime to digest notification
    */

    logger.info('Start of the process WorkflowNotifyOfGISCompletion at ' + Date());

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

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */
    const contactInformationRelationTemplateName = 'Contact Information Relation';
    const contactInformationTemplateName = 'Contact Information';
    const EMAIL_TEMPLATE_NAME = 'WTM Review Page - Notify of GIS Completion';
    const WTMReviewPageTemplateName = 'WTM Review Page';
    const positionMgmtTemplateName = 'Position Management';

    const libChangeFolderPermissions = 'LibWorkflowChangeFolderPermissions';

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

    /**
     * @param {string} wtmfFormId
     * @param {string} processMessage
     * @param {Array} [sendNotificationEmailResults=[]]
     * @returns {string} Formatted process summary string
     **/
    function formatReturnObjectData(wtmfFormId, processMessage, sendNotificationEmailResults = []) {
        const resultsCount = Array.isArray(sendNotificationEmailResults) ? sendNotificationEmailResults.length : 0;

        return `WTMFFormID: ${wtmfFormId} | ProcessMessage: ${processMessage} | SendNotificationEmailResultsCount: ${resultsCount}`;
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
                q: `[Related Record ID] eq '${relatedRecordID}' AND [Status] eq 'Enabled' AND ([Proponent] eq 'True' OR [Landowner] eq 'True' OR [Surveyor] eq 'True')`,
                expand: true,
            },
            contactInformationRelationTemplateName
        );

        return contactInformationRelationRecords;
    }

    async function getContactInformationRecords(contactInformationRelationRecords) {
        const contactInformationIDString = contactInformationRelationRecords
            .map((el) => `'${el['contact Information ID']}'`)
            .join(',');

        const contactInformationRecords = await getForms(
            {
                q: `[Contact Information ID] IN (${contactInformationIDString}) AND [Status] eq 'Enabled'`,
                expand: true,
            },
            contactInformationTemplateName
        );

        return contactInformationRecords;
    }

    async function getAssignedReviewersRecords(relatedRecordID) {
        shortDescription = 'Get Assigned Reviewers from WTM Review Page using SQL Parameters';
        const customQueryData = {
            // params value must be a stringified array of objects with parameterName and value properties
            params: JSON.stringify([
                {
                    parameterName: 'WTMRP',
                    value: relatedRecordID,
                },
            ]),
        };

        return vvClient.customQuery
            .getCustomQueryResultsByName('zWebSvc Get Assigned Reviewers by WTM Review Page', customQueryData)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    /**
     * @param {string} positionManagementFormID - Form ID of the Position Management record related to the WTM Review Page
     * @returns {Promise<Object[]>} Forester records from WTM Review Page
     **/
    async function getAssignedForesterRecords(positionManagementFormID) {
        const queryParameters = {
            q: `[instanceName] eq '${positionManagementFormID}'`,
            // expand: true, // true to get all the form's fields
            fields: 'Email', // to get only the fields 'id' and 'name'
        };
        const foresterRecords = await getForms(queryParameters, positionMgmtTemplateName);

        return foresterRecords;
    }

    async function getRelatedRecord(formID) {
        const relatedRecord = await getForms(
            {
                q: `[instanceName] eq '${formID}'`,
                expand: true,
            },
            WTMReviewPageTemplateName
        );

        if (isNullEmptyUndefined(relatedRecord)) {
            throw new Error('Error getting related record information.');
        }

        return relatedRecord;
    }

    async function sendNotificationEmail(tokens, emailAddress, relatedRecordID, emailName, primaryID, sendDateTime) {
        const emailRequestArr = [
            { name: 'Email Name', value: emailName },
            { name: 'Tokens', value: tokens },
            { name: 'Email Address', value: emailAddress },
            { name: 'Email AddressCC', value: '' },
            { name: 'SendDateTime', value: sendDateTime },
            { name: 'RELATETORECORD', value: [relatedRecordID] },
            { name: 'OTHERFIELDSTOUPDATE', value: { 'Primary Record ID': primaryID } },
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

    function setFormNotificationFlagTrue(formTemplateName, recordGUID) {
        const shortDescription = `Update form record ${recordGUID}`;
        const fieldValuesToUpdate = {
            'Email Notification Flag': 'True',
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    /**
     * @param {Object} obj
     * @returns {Object} A new object with lowercase keys
     **/
    function lowerizeObjectKeys(obj) {
        return Object.keys(obj).reduce((acc, k) => {
            acc[k.toLowerCase()] = obj[k];
            return acc;
        }, {});
    }

    function createPdfPackageLink(envConfig, pdfPackageGUID) {
        const URL = getEnvURL(envConfig);
        return `${URL}/publicSearch/getDocument?fromLink=true&GUID=${pdfPackageGUID}`;
    }

    function getEnvURL(envConfig) {
        if (envConfig['envConfig URL'].includes('dev')) return 'https://fpansearch-dev.visualvault.com';
        else if (envConfig['envConfig URL'].includes('qa')) return 'https://fpansearch-qa.visualvault.com';
        else if (envConfig['envConfig URL'].includes('sandbox')) return 'https://fpansearch-uat.visualvault-gov.com';
        else return 'https://fpansearch.visualvault.com';
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
                ![null, '', undefined].includes(config['envConfig XCID']) &&
                ![null, '', undefined].includes(config['envConfig XCDID'])
        );

        if ([null, '', undefined].includes(envConfig)) {
            throw new Error('Error getting environment config.');
        }

        return envConfig;
    }

    async function updateFolderPermissions(newEntity, newEntityType, permissionType, folderPath, applyToSubfolders) {
        const shortDescription = `Run Web Service: ${libChangeFolderPermissions}`;

        const webServiceParams = [
            // One object for each parameter sent to the next web service
            // You can convert this array to an argument of this function
            {
                name: 'New Entity',
                value: newEntity,
            },
            {
                name: 'New Entity Type',
                value: newEntityType,
            },
            {
                name: 'Permission Type',
                value: permissionType,
            },
            {
                name: 'Folder Path',
                value: folderPath,
            },
            {
                name: 'Apply to subfolders',
                value: applyToSubfolders,
            },
        ];

        return vvClient.scripts
            .runWebService(libChangeFolderPermissions, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    /**********
     MAIN CODE
    **********/

    try {
        // 1. Receive parameters
        const wtmReviewPageformId = getFieldValueByName('WTM Review Page Form');
        const wtmfFormId = getFieldValueByName('WTMF Form ID');

        // 2. Check if required parameters are present
        if (!wtmReviewPageformId || !wtmfFormId) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3. Retrieve contact information for each Proponent, Landowners, Surveyors, Forester and External Reviewers associated
        let allContacts = [];
        let contactInformationRecords = [];
        const contactInformationRelationRecords = await getContactInformationRelationRecords(wtmfFormId);

        if (!isNullEmptyUndefined(contactInformationRelationRecords)) {
            contactInformationRecords = await getContactInformationRecords(contactInformationRelationRecords);
        }

        // Get assigned reviewers from WTM Review Page using SQL parameters in a custom query
        // to avoid issues with too many records related to the WTM Review Page that can be retrieved with the expand parameter of the getForms method.
        const assignedReviewersRecord = await getAssignedReviewersRecords(wtmReviewPageformId);
        const [relatedRecord] = await getRelatedRecord(wtmReviewPageformId);

        // Get email data from Forester.
        const contactPositionMgmtRecord = await getAssignedForesterRecords(
            relatedRecord['position Management Form ID']
        );

        // Merge all contacts into one array to facilitate the email sending process.
        allContacts = [...contactInformationRecords, ...assignedReviewersRecord, ...contactPositionMgmtRecord];

        // lowerize keys for easier access of field data
        const relatedRecordLowerized = lowerizeObjectKeys(relatedRecord);
        const wasSent = relatedRecordLowerized['email notification flag'];
        const gisEditsCompleteDate = relatedRecordLowerized['gis edits complete date'];
        const pdfPackageGUID = relatedRecordLowerized['pdf guid'];
        const documentPath = relatedRecordLowerized['document upload path'];

        // Assign permissions to the specified folder
        const addFolderPermissions = await updateFolderPermissions('Signatory', 'Group', 'Viewer', documentPath, true);

        if (isNullEmptyUndefined(addFolderPermissions)) {
            throw new Error(`Error while setting new folder permissions - Signatory not found`);
        }

        // Add check to add a text instead of the pdf link in case the pdfPackageGUID field is empty or null, to avoid
        // setting permissions to a path not available and sending broken links in the email notification.
        if (isNullEmptyUndefined(pdfPackageGUID)) {
            logger.info(
                `The 'PDF Package GUID' field is empty for the form ${wtmReviewPageformId}. The email notification will be sent with a text instead of the PDF link.`
            );
        } else {
            // Assign permissions to the specified folder
            const addFolderPermissions = await updateFolderPermissions(
                'Signatory',
                'Group',
                'Viewer',
                documentPath,
                true
            );

            if (isNullEmptyUndefined(addFolderPermissions)) {
                throw new Error(`Error while setting new folder permissions - Signatory not found`);
            }
        }

        // 4. Create Communication Log and send email notification
        let sendNotificationEmailResults = [];

        if (wasSent !== 'True' && gisEditsCompleteDate) {
            const envConfig = await getEnvConfig();
            const sendDateTime = dayjs().tz(WADNR_TIMEZONE).hour(19).minute(0).second(0).millisecond(0).toISOString();

            const emailPromises = allContacts
                .filter((contact) => !isNullEmptyUndefined(contact.email))
                .map((contactInformation) => {
                    // [WTMF No] token
                    const wtmfNumber = relatedRecordLowerized['wtmf no'] || '';
                    let pdfPackageLink = '';

                    if (!isNullEmptyUndefined(pdfPackageGUID)) {
                        // [Link to Publicly Available PDF Package] token
                        pdfPackageLink = createPdfPackageLink(envConfig, pdfPackageGUID);
                    }

                    const tokens = [
                        {
                            name: '[WTMF No]',
                            value: wtmfNumber,
                        },
                        {
                            name: '[Link to Publicly Available PDF Package]',
                            value: isNullEmptyUndefined(pdfPackageLink) ? 'PDF NOT COMPLETED' : pdfPackageLink,
                        },
                    ];

                    return sendNotificationEmail(
                        tokens,
                        contactInformation.email,
                        wtmReviewPageformId,
                        EMAIL_TEMPLATE_NAME,
                        wtmfFormId,
                        sendDateTime
                    );
                });

            sendNotificationEmailResults = await Promise.all(emailPromises);

            // 5. Update notification flag
            await setFormNotificationFlagTrue(WTMReviewPageTemplateName, relatedRecord.revisionId);

            // 6. Build the success response array
            const processMessage = `Notification sent for record ${wtmReviewPageformId}.`;
            returnObject = {
                MicroserviceResult: true,
                MicroserviceMessage: 'Microservice completed successfully',
                MicroserviceData: formatReturnObjectData(wtmfFormId, processMessage, sendNotificationEmailResults),
            };
        } else {
            let processMessage = `Notification already sent for record ${wtmReviewPageformId}. Skipping emails.`;

            if (!gisEditsCompleteDate) {
                processMessage = `The 'GIS Edits Complete Date' field must be completed for the form ${wtmReviewPageformId}. Email sending is omitted.`;

                logger.info(
                    `The 'GIS Edits Complete Date' field must be completed for the form ${wtmReviewPageformId}. Email sending is omitted.`
                );
            } else {
                logger.info(`Notification already sent for record ${wtmReviewPageformId}. Skipping emails.`);
            }

            // Create the following object that will be used when the api call is made to communicate the workflow item is complete.
            // First two items of the object are required to tell if the process completed successfully and the message that should be returned.
            // The other items in the object would have the name of any workflow variable that would be updated with data coming from the microservice/node script.
            returnObject = {
                MicroserviceResult: true,
                MicroserviceMessage: 'Microservice completed successfully',
                MicroserviceData: formatReturnObjectData(wtmfFormId, processMessage, []),
            };
        }
    } catch (err) {
        logger.info('Error encountered: ' + err.message);

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: err.message,
            MicroserviceData: [],
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
