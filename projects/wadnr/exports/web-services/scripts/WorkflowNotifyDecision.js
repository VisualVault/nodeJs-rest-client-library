/**
 * WorkflowNotifyDecision
 * Category: Workflow
 * Modified: 2026-03-16T19:22:08.203Z by fernando.chamorro@visualvault.com
 * Script ID: Script Id: ca8bbad1-e0bd-f011-8301-e3ab0356d115
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
      Script Name:    WorkflowNotifyDNRDecision
      Customer:       VisualVault
      Purpose:        The purpose of this process is to generate a communication log that will facilitate sending
                      an email to the Proponent, Landowners, Surveyors, Forester and External Reviewers when
                      Decission has been made
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

      Date of Dev:    - 11/7/2025

      Revision Notes:
                      11/07/2025 - Nicolas Culini:  First Setup of the script
                      02/09/2026 - Sebastian Rolando: Fix mapping issues for the Email tokens.
                      02/10/2026 - Sebastian Rolando: Fix Query to retrieve correctly Assigned Reviewers emails
                      02/19/2026 - Alfredo Scilabra: Added support for primary record ID
                      02/20/2026 - Federico Cuelho: Add Forester to the notification list.
                      03/04/2026 - Sebastian Rolando: Update returning object on error. Change err to err.message to fit with the expected error handler results of the PDS Workflow.
                      03/16/2026 - Fernando Chamorro: Spelling fix for field passed through lowerize
      */

    logger.info('Start of the process WorkflowNotifyDNRDecision at ' + Date());

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
    const EMAIL_TEMPLATE_NAME = 'WTMF end of Review';
    const WTMReviewPageTemplateName = 'WTM Review Page';
    const PositionMgmtTemplateName = 'Position Management';

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

    async function getContactInformationRelationRecords(relatedRecordID) {
        const contactInformationRelationRecords = await getForms(
            {
                q: `[Related Record ID] eq '${relatedRecordID}' AND [Status] eq 'Enabled' AND ([Proponent] eq 'True' OR [Landowner] eq 'True' OR [Surveyor] eq 'True')`,
                expand: true,
            },
            contactInformationRelationTemplateName
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

        const contactInformationRecords = await getForms(
            {
                q: `[Contact Information ID] IN (${contactInformationIDString}) AND [Status] eq 'Enabled'`,
                expand: true,
            },
            contactInformationTemplateName
        );

        if (isNullEmptyUndefined(contactInformationRecords)) {
            throw new Error(`Error getting ${contactInformationTemplateName}.`);
        }

        return contactInformationRecords;
    }

    async function getAssignedReviewersRecords(relatedRecordID) {
        // Custom Query Example 2:
        // SELECT * FROM [Template Name] WHERE [Column Name] = @Parameter1Name AND [Another Column Name] = @Parameter2Name

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
     * @param {string} formID
     * @returns {Promise<Object[]>} Forester records from WTM Review Page
     **/
    async function getAssignedForesterRecords(formID) {
        const foresterRecords = await getForms(
            {
                q: `[instanceName] eq '${formID}'`,
                expand: true,
            },
            PositionMgmtTemplateName
        );

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

    async function sendNotificationEmail(tokens, emailAddress, relatedRecordID, emailName, primaryId) {
        const emailRequestArr = [
            { name: 'Email Name', value: emailName },
            { name: 'Tokens', value: tokens },
            { name: 'Email Address', value: emailAddress },
            { name: 'Email AddressCC', value: '' },
            { name: 'SendDateTime', value: '' },
            { name: 'RELATETORECORD', value: [relatedRecordID] },
            { name: 'OTHERFIELDSTOUPDATE', value: { 'Primary Record ID': primaryId } },
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
            'Decision Email Notification Flag': 'True',
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    /**
     * @param {Object} object
     * @returns {Object} A new object with lowercase keys
     */
    function lowerizeObjectKeys(obj) {
        return Object.keys(obj).reduce((acc, k) => {
            acc[k.toLowerCase()] = obj[k];
            return acc;
        }, {});
    }

    function getDNRDecision(wtmfFormId) {
        shortDescription = 'Custom Query using SQL Parameters';
        const customQueryData = {
            // params value must be a stringified array of objects with parameterName and value properties
            params: JSON.stringify([
                {
                    parameterName: 'formId',
                    value: wtmfFormId,
                },
            ]),
        };

        return vvClient.customQuery
            .getCustomQueryResultsByName('zWebService Get DNR Decision Comments', customQueryData)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription)) // Comment out if the query could have no results
            .then((res) => res.data);
    }

    function buildEmailBody(segments) {
        return segments
            .map((s) => {
                // Calculate Yes/No Concurred
                const concurredDecision =
                    s['concur'] === 'Yes'
                        ? 'Concurred'
                        : s['concur'] === 'No'
                          ? 'Not Concurred'
                          : 'No Answer for Concurred Decision';

                return `
            <div style="margin-bottom:12px;">
                <strong>${s['water Segment Identifier']}</strong> - ${concurredDecision}<br>
                ${s['comments']}
            </div>
        `;
            })
            .join('');
    }

    /**********
       MAIN CODE
      **********/

    try {
        // 1. Receive parameters
        const wtmReviewPageformId = getFieldValueByName('WTM Review Page Form');
        const wtmfFormId = getFieldValueByName('WTMF Form ID');
        const wtmfStatus = getFieldValueByName('WTMF Status');

        // 2. Check if required parameters are present
        if (!wtmReviewPageformId || !wtmfFormId || !wtmfStatus) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3. Retrieve contact information for each Proponent, Landowners, Surveyors, Forester and External Reviewers associated
        let allContacts = [];

        const contactInformationRelationRecords = await getContactInformationRelationRecords(wtmfFormId);

        const contactInformationRecords = await getContactInformationRecords(contactInformationRelationRecords);

        const assignedReviewersRecords = await getAssignedReviewersRecords(wtmReviewPageformId);

        const [relatedRecord] = await getRelatedRecord(wtmReviewPageformId);

        // Get email data from Forester.
        const contactPositionMgmtRecords = await getAssignedForesterRecords(
            relatedRecord['position Management Form ID']
        );

        allContacts = [...contactInformationRecords, ...assignedReviewersRecords, ...contactPositionMgmtRecords];

        // lowerize keys for easier access of field data
        const relatedRecordLowerized = lowerizeObjectKeys(relatedRecord);
        const wasSent = relatedRecordLowerized['decision email notification flag'];

        // 4. Create Communication Log and send email notification
        let sendNotificationEmailResults = [];

        const dnrDecision = await getDNRDecision(wtmReviewPageformId);

        const dnrDecisionComments = buildEmailBody(dnrDecision);

        if (wasSent !== 'True') {
            const emailPromises = allContacts
                .filter((contact) => !isNullEmptyUndefined(contact.email))
                .map((contactInformation) => {
                    let wtmfNumber = '';

                    if (relatedRecordLowerized['wtmf no']) {
                        wtmfNumber = relatedRecordLowerized['wtmf no'];
                    }

                    const tokens = [
                        {
                            name: '[WTMF No.]',
                            value: wtmfNumber,
                        },
                        {
                            name: '[WTMF Status]',
                            value: wtmfStatus,
                        },
                        {
                            name: '[DNR Decision Comments]',
                            value: dnrDecisionComments,
                        },
                    ];

                    return sendNotificationEmail(
                        tokens,
                        contactInformation.email,
                        wtmReviewPageformId,
                        EMAIL_TEMPLATE_NAME,
                        wtmfFormId
                    );
                });

            sendNotificationEmailResults = await Promise.all(emailPromises);

            // 5. Update notification flag
            await setFormNotificationFlagTrue(WTMReviewPageTemplateName, relatedRecord.revisionId);

            returnObject = {
                MicroserviceResult: true,
                MicroserviceMessage: 'Microservice completed successfully',
                DocID: wtmfFormId,
                'Process Message': `Notification sent for record ${wtmReviewPageformId}..`,
                'Send Notification Email Results': sendNotificationEmailResults,
            };
        } else {
            logger.info(`Notification already sent for record ${wtmReviewPageformId}. Skipping emails.`);

            // Create the following object that will be used when the api call is made to communicate the workflow item is complete.
            // First two items of the object are required to tell if the process completed successfully and the message that should be returned.
            // The other items in the object would have the name of any workflow variable that would be updated with data coming from the microservice/node script.
            returnObject = {
                MicroserviceResult: true,
                MicroserviceMessage: 'Microservice completed successfully',
                DocID: wtmfFormId,
                'Process Message': `Notification already sent for record ${wtmReviewPageformId}. Skipping emails.`,
            };
        }
    } catch (err) {
        logger.info('Error encountered' + err);

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: err.message,
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
