/**
 * WorkflowTaskAssigneeNotification
 * Category: Workflow
 * Modified: 2026-02-19T12:09:58.073Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: 9c374b3a-34b4-f011-82ff-991bc11c012d
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
      Script Name:        WorkflowTaskAssigneeNotification
      Customer:           WADNR
      Purpose:            Notifies the assigned staff member when a Task is created or updated.
      Parameters:
                          - SourceDocId: String (The GUID of the Task record)
      Psuedo code:
                          1. Receive and validate parameters
                          2. Get Task record by SourceDocId
                          3. Read "Notification was send" field to determine notification type
                          4. Check notification conditions (Assignee, Title, Status)
                          5. Update "Notification was send" flag to True (prevents race conditions)
                          6. Get assignee info from Position Management
                          7. Send email with appropriate template (Create or Update)
                          8. Return success response

      Date of Dev:
                          10/28/2025
      Revision Notes:
                          10/28/2025 - Santiago Tortu: Initial Setup
                          12/18/2025 - Santiago Tortu: Adjusted the fpOnline tasks link to use the new URL structure
                          02/19/2026 - Alfredo Scilabra: Added support for primary record ID
  */

    logger.info('Start of the process WorkflowTaskAssigneeNotification at ' + Date());

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
    const formTemplateName = 'Task';
    const emailTemplateCreate = 'New fpOnline task assigned';
    const emailTemplateUpdate = 'fpOnline task updated';
    const positionManagementTemplateName = 'Position Management';

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
        let fieldValue = '';

        try {
            const field = ffCollection.getFormFieldByName(fieldName);
            const requiredFieldDoesntExists = !isOptional && !field;

            if (requiredFieldDoesntExists) {
                throw new Error(`The field '${fieldName}' was not found.`);
            }

            if (field) {
                // Check if the value property exists
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

    async function getTaskRecord(FormID) {
        const taskRecords = await getForms(
            {
                q: `[instanceName] eq '${FormID}'`,
                expand: true,
            },
            formTemplateName
        );

        if (isNullEmptyUndefined(taskRecords) || taskRecords.length === 0) {
            throw new Error('Error getting Task record or Task record not found.');
        }

        return taskRecords[0];
    }

    async function getAssigneeEmailFromPositionManagement(assigneeEmail) {
        const positionRecords = await getForms(
            {
                q: `[Email] eq '${assigneeEmail}'`,
                expand: true,
            },
            positionManagementTemplateName
        );

        if (isNullEmptyUndefined(positionRecords) || positionRecords.length === 0) {
            throw new Error('Assignee not found in Position Management.');
        }

        return {
            email: assigneeEmail,
            firstName: positionRecords[0]['First Name'] || positionRecords[0]['first Name'] || '',
            lastName: positionRecords[0]['Last Name'] || positionRecords[0]['last Name'] || '',
        };
    }

    async function sendNotificationEmail(tokens, emailAddress, relatedRecordID, emailTemplateName) {
        const emailRequestArr = [
            { name: 'Email Name', value: emailTemplateName },
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

    async function updateTaskNotificationFields(taskRevisionId, notificationDateTime) {
        shortDescription = `Update Task record notification fields`;

        const fieldValuesToUpdate = {
            'Notification was send': 'True',
            'Assignee Notification Date Time': notificationDateTime,
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, taskRevisionId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    function getUTCDateTime() {
        return new Date().toISOString();
    }

    function createFpOnlineTasksLink() {
        // Following the same pattern as SignatureDeclineSignature.js and SCHRemindExternalReviewerNotification.js
        const { customerAlias, databaseAlias } = module.exports.getCredentials();
        const baseUrl = vvClient.getBaseUrl();

        const url = new URL(`${baseUrl}/app/${customerAlias}/${databaseAlias}`);
        // Add the fragment for the tasks page (fragments must be appended as string)
        return `${url.toString()}/#/main/tasks`;
    }

    /**********
     MAIN CODE
    **********/

    try {
        // 1. Receive parameters
        const FormID = getFieldValueByName('SourceDocId');

        // 2. Check if the required parameters are present
        if (!FormID) {
            throw new Error(errorLog.join('; '));
        }

        // 3. Get Task record by SourceDocId
        const taskRecord = await getTaskRecord(FormID);

        const assigneeEmail = taskRecord['dnR Staff Assigned User ID'];
        const title = taskRecord['Title'] || taskRecord['title'];
        const status = taskRecord['Status'] || taskRecord['status'];
        const notificationWasSend =
            taskRecord['Notification was send'] || taskRecord['notification was send'] || 'False';

        // 4. Check notification conditions
        // Skip notification if Assignee is not set
        if (isNullEmptyUndefined(assigneeEmail)) {
            returnObject = {
                MicroserviceResult: true,
                MicroserviceMessage: 'Notification skipped: Assignee is not set.',
                DocID: FormID,
            };
        }
        // Skip notification if Title is not set
        else if (isNullEmptyUndefined(title)) {
            returnObject = {
                MicroserviceResult: true,
                MicroserviceMessage: 'Notification skipped: Title is not set.',
                DocID: FormID,
            };
        }
        // Skip notification if Status is not "Assigned" (case-insensitive)
        else if (status && status.toLowerCase() !== 'assigned') {
            returnObject = {
                MicroserviceResult: true,
                MicroserviceMessage: `Notification skipped: Task status is '${status}', expected 'Assigned'.`,
                DocID: FormID,
            };
        }
        // All conditions met, proceed with notification
        else {
            // 5. Determine notification type based on "Notification was send" field
            const isFirstTimeNotification = notificationWasSend !== 'True' && notificationWasSend !== 'true';
            const emailTemplate = isFirstTimeNotification ? emailTemplateCreate : emailTemplateUpdate;

            // 6. Update "Notification was send" flag immediately to prevent duplicate notifications
            const notificationDateTime = getUTCDateTime();
            await updateTaskNotificationFields(taskRecord.revisionId, notificationDateTime);

            // 7. Get Assignee info from Position Management
            const assigneeInfo = await getAssigneeEmailFromPositionManagement(assigneeEmail);

            // 8. Prepare email tokens
            const fpOnlineLink = createFpOnlineTasksLink();

            const tokens = [
                { name: '[Task Title]', value: title },
                { name: '[Assignee First Name]', value: assigneeInfo.firstName },
                { name: '[Assignee Last Name]', value: assigneeInfo.lastName },
                { name: '[fpOnline Link]', value: fpOnlineLink },
            ];

            // 9. Send email notification
            const sendNotificationEmailResults = await sendNotificationEmail(
                tokens,
                assigneeInfo.email,
                FormID,
                emailTemplate
            );

            returnObject = {
                MicroserviceResult: true,
                MicroserviceMessage: 'Task assignee notification sent successfully.',
                DocID: FormID,
                'Assignee Email': assigneeInfo.email,
                'Notification Date Time': notificationDateTime,
                'Communication Log details': [...sendNotificationEmailResults],
            };

            logger.info('Task assignee notification completed successfully.');
        }
    } catch (err) {
        logger.info('Error encountered' + err);

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: err.message ? err.message : err.toString(),
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
