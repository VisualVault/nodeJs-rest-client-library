/**
 * ReminderExternalReviewerEmailNotification
 * Category: Scheduled
 * Modified: 2026-04-07T16:35:19.26Z by federico.cuelho@visualvault.com
 * Script ID: Script Id: 5199d00f-1e8f-f011-82f5-e43f3109388f
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

module.exports.main = async function (vvClient, response, token) {
    /*
    Script Name:    SCHRemindExternalReviewerNotification
    Customer:       WDNR
    Purpose:        The purpose of this script is to inform the external reviewer that the recommendation submit its due in 10 days.
    Psuedo code:
                    1° Search a list of External Reviewer Recommendation records that have a due date in the next 10 days
                    where the status is "Waiting Reviewer" and a notification has not been sent.
                    2° Get the related WTM Review Page record to obtain the due date and the WTMF number to include in the email notification.
                    3° Get the email address of the external reviewer via the WTM Assigned Reviewers and Individual Record forms.
                    4° Send an email to the external reviewer.
                    5° Set flag on the External Reviewer Recommendation indicating that the notification has been sent.
 
    Date of Dev:    11/19/2025
    Last Rev Date:  04/07/2026
 
    Revision Notes:
                    11/19/2025 - Lucas Herrera:  First Setup of the script
                    03/17/2026 - Sebastian Rolando: Update getExternalReviewerRecords function to retrieve in a more accurate way the records which due Date is within 10 days.
                    04/07/2026 - Federico Cuelho: Update logic to avoid sending duplicate emails in case multiple records are linked to the same WTM Review Page.
    */

    logger.info(`Start of logic for SCHRemindExternalReviewerNotification on ${new Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // You will see the responseMessage in the scheduled process log ONLY if the process runs manually.
    response.json(200, `Start of logic for SCHRemindExternalReviewerNotification on ${new Date()}`);

    // Array for capturing error messages that may occur during the execution of the script.
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const formTemplateName = 'External Reviewer Recommendations';
    const EMAIL_TEMPLATE_NAME = 'WTMF External Reviewer Notification';
    const individualTemplateName = 'Individual Record';
    const WTMAssignedReviewersFormTemplate = 'WTM Assigned Reviewers';
    const WTMReviewPageTemplateName = 'WTM Review Page';

    /* -------------------------------------------------------------------------- */
    /*                              Script Variables                              */
    /* -------------------------------------------------------------------------- */

    // Contains the success or error response message
    let responseMessage = '';

    // Identifies the process in VV servers
    const scheduledProcessGUID = token;

    // Description used to better identify API methods errors
    let shortDescription = '';

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

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

    async function getExternalReviewerRecords(formTemplateName) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        const tenDaysFromNow = new Date();
        tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
        tenDaysFromNow.setHours(23, 59, 59, 999); // End of day 10 days from now

        const ExternalReviewerRecords = await getForms(
            {
                q: `[Status] eq 'Waiting Reviewer' and [Need a Notification] eq 'True' and [Comment Due Date or Date of Recommendation] ge '${today.toISOString()}' and [Comment Due Date or Date of Recommendation] le '${tenDaysFromNow.toISOString()}'`,
                expand: true,
            },
            formTemplateName
        );

        if (isNullEmptyUndefined(ExternalReviewerRecords)) {
            throw new Error(
                'No External Reviewer Records found with a due date in the next 10 days where the status is "Waiting Reviewer" and a notification has not been sent.'
            );
        }

        return ExternalReviewerRecords;
    }

    async function getAssignedReviewersRecords(wtmRpId, relatedRecordID) {
        const assignedReviewersRecords = await getForms(
            {
                q: `[Form ID] eq '${relatedRecordID}' AND [Related Record ID] eq '${wtmRpId}' AND [Status] eq 'Enabled'`,
                expand: true,
            },
            WTMAssignedReviewersFormTemplate
        );

        return assignedReviewersRecords;
    }

    async function getRelatedWTMReviewPageRecord(relatedRecordID) {
        const WTMReviewPageRecord = await getForms(
            {
                q: `[Form ID] eq '${relatedRecordID}'`,
                expand: true,
            },
            WTMReviewPageTemplateName
        );

        return WTMReviewPageRecord;
    }

    async function getIndividualRecords(assignedReviewersRecords) {
        const individualIDString = assignedReviewersRecords
            .map((el) => lowerizeObjectKeys(el))
            .map((el) => `'${el['individual record id']}'`)
            .join(',');

        const individualRecords = await getForms(
            {
                q: `[Form ID] IN (${individualIDString}) AND [Status] eq 'Enable'`,
                expand: true,
            },
            individualTemplateName
        );

        return individualRecords;
    }

    async function sendNotificationEmail(tokens, emailAddress, relatedRecordID, emailName) {
        const emailRequestArr = [
            { name: 'Email Name', value: emailName },
            { name: 'Tokens', value: tokens },
            { name: 'Email Address', value: emailAddress },
            { name: 'Email AddressCC', value: '' },
            { name: 'SendDateTime', value: '' },
            { name: 'RELATETORECORD', value: [relatedRecordID] },
            { name: 'OTHERFIELDSTOUPDATE', value: {} },
        ];

        const [LibEmailGenerateAndCreateCommunicationLogStatus, , comLogResult] = await callExternalWs(
            'LibEmailGenerateAndCreateCommunicationLog',
            emailRequestArr
        );

        if (LibEmailGenerateAndCreateCommunicationLogStatus != 'Success') {
            throw new Error(`There was an error sending the notification email to ${emailAddress}.`);
        }

        return comLogResult;
    }

    async function updateExternalReviewerRecord(recordGUID) {
        shortDescription = 'Update External Reviewer Record';
        const fieldValuesToUpdate = {
            'Need a Notification': 'False',
        };

        const updateRes = await vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));

        return updateRes;
    }

    function getPortalURL() {
        const { customerAlias, databaseAlias } = module.exports.getCredentials();
        const baseUrl = vvClient.getBaseUrl();

        return new URL(`${baseUrl}/app/${customerAlias}/${databaseAlias}`);
    }

    function lowerizeObjectKeys(obj) {
        return Object.keys(obj).reduce((acc, k) => {
            acc[k.toLowerCase()] = obj[k];
            return acc;
        }, {});
    }
    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        let sendNotificationEmailResults = [];
        let emailPromises = [];
        let individualRecords = [];

        // 1. Search a list of External Reviewer Recommendation record that have a due date in the next 10 days.
        const externalReviewerRecords = await getExternalReviewerRecords(formTemplateName);

        // Loop through the External Reviewer Recommendation records to send notification emails to the assigned reviewers,
        // making sure to only send one email per reviewer in case there are multiple recommendations related to the same WTM Review Page.
        for (const record of externalReviewerRecords) {
            const lowerizedRecord = lowerizeObjectKeys(record);
            const wtmRpId = lowerizedRecord['wtm rp id'];
            const relatedRecordID = lowerizedRecord['related record id'];

            // 2. Get the related WTM Review Page record to obtain the due date and the wtmf number to include in the email notification.
            const wtmReviewPage = await getRelatedWTMReviewPageRecord(wtmRpId);
            const wtmReviewPageLowerized = lowerizeObjectKeys(wtmReviewPage[0]);

            // 3. Get the email address of the external reviewer.
            const assignedReviewersRecords = await getAssignedReviewersRecords(wtmRpId, relatedRecordID);

            if (!isNullEmptyUndefined(assignedReviewersRecords)) {
                individualRecords = await getIndividualRecords(assignedReviewersRecords);
            }

            // 4. Send an email to the external reviewer.
            emailPromises.push(
                ...individualRecords
                    .map((individual) => lowerizeObjectKeys(individual))
                    .filter((individual) => !isNullEmptyUndefined(individual['email']))
                    .map((individual) => {
                        let wtmfNumber = '';

                        if (!isNullEmptyUndefined(wtmReviewPageLowerized['wtmf no'])) {
                            wtmfNumber = wtmReviewPageLowerized['wtmf no'];
                        }

                        const tokens = [
                            {
                                name: '[WTMF No]',
                                value: wtmfNumber,
                            },
                            {
                                name: '[due date]',
                                value:
                                    wtmReviewPageLowerized['comment due date'] === null
                                        ? lowerizedRecord['comment due date or date of recommendation']
                                        : wtmReviewPageLowerized['comment due date'],
                            },
                            {
                                name: '[fpOnline link]',
                                value: getPortalURL(),
                            },
                        ];

                        return sendNotificationEmail(tokens, individual['email'], wtmRpId, EMAIL_TEMPLATE_NAME);
                    })
            );
        }

        sendNotificationEmailResults = await Promise.all(emailPromises);

        // 5. Set flag on the External Reviewer Recommendation indicating that the notification has been sent.
        const updatePromises = externalReviewerRecords.map((record) =>
            updateExternalReviewerRecord(record['revisionId'])
        );

        await Promise.all(updatePromises);

        // 6. SEND THE SUCCESS RESPONSE MESSAGE
        responseMessage = 'Success';

        // You will see the responseMessage in the scheduled process log ONLY if the process runs automatically.
        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, responseMessage);
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // SEND THE ERROR RESPONSE MESSAGE

        if (errorLog.length > 0) {
            responseMessage = `Error/s: ${errorLog.join('; ')}`;
        } else {
            responseMessage = `Unhandled error occurred: ${error}`;
        }

        // You will see the responseMessage in the scheduled process log ONLY if the process runs automatically.
        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', false, responseMessage);
    }
};
