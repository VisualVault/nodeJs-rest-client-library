/**
 * SCHExpirationMaintenanceInARP
 * Category: Scheduled
 * Modified: 2026-04-08T14:10:07.233Z by lucas.herrera@visualvault.com
 * Script ID: Script Id: 1a0115e4-3e21-f011-82d7-d7071da8caf0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

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
    Script Name:    SCHExpirationMaintenanceInARP
    Customer:       WADNR
    Purpose:        The purpose of this process is to enable a maintenance process that would expire the FPAN Number and change the main status on the Application Review Page to have an expired status.
    Preconditions:
                    - It is necessary to have ARPs in Approved status and with Expiration Date less than today
                    - Each ARP must have an associated application.
    Parameters:     NONE
 
    Return Object:
                    Message will be sent back to VV as part of the ending of this scheduled process.
    Psuedo code:
                    #1 Get ARP records
                    #2 Find related applications
                    #3 Update Status to Expired (ARPs and Applications)
                        #3.1 Updating ARPs
                        #3.2 Updating Applications
                    #4 SEND THE SUCCESS RESPONSE MESSAGE
 
    Date of Dev:    02/19/2026
 
    Revision Notes:
                    04/24/2025 - Fernando Chamorro:  First Setup of the script
                    02/10/2026 - John Sevilla: Update "FPAN Status" on ARP
                    02/19/2026 - Mauro Rapuano: Added Class II Notification Accepted status to be updated 
    */

    logger.info(`Start of logic for SCHExpirationMaintenanceInARP on ${new Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // You will see the responseMessage in the scheduled process log ONLY if the process runs manually.
    response.json(200, `Start of logic for SCHExpirationMaintenanceInARP on ${new Date()}`);

    // Array for capturing error messages that may occur during the execution of the script.
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const AppReviewPageTemplateName = 'Application Review Page';

    const WADNR_TIMEZONE = 'America/Los_Angeles';

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

    function detectFormTemplateFromID(formID) {
        const templateNames = [
            {
                prefix: 'FPA-AERIAL-CHEMICAL',
                name: 'Forest Practices Aerial Chemical Application',
                formIdField: 'Form ID',
            },
            {
                prefix: 'FPAN',
                name: 'Forest Practices Application Notification',
                formIdField: 'FPAN ID',
            },
        ];

        const normalizedID = formID.replace(/\s+/g, '');

        for (const { prefix, name, formIdField } of templateNames) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return [name, formIdField];
            }
        }

        throw new Error('Form template name not found.');
    }

    async function getForms(getFormsParams, templateName) {
        shortDescription = `Get ${templateName} form record`;

        const getFormsRes = await vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));

        return getFormsRes.data;
    }

    function getExpiredARPQueryParams() {
        const todayStr = dayjs().tz(WADNR_TIMEZONE).format('YYYY-MM-DD');

        const conditions = [
            `[FPAN Status] in ('Approved', 'Class II Notification Accepted')`,
            `[FPAN Decision Expiration Date] lt '${todayStr}'`,
        ];

        return {
            q: conditions.join(' AND '),
            fields: 'revisionId, FPAN Decision Expiration Date, Related Record ID, FPAN Number, FPAN Status',
        };
    }

    async function getARPrecords(queryParams, formTemplateName) {
        const ARPrecords = await getForms(queryParams, formTemplateName);

        if (isNullEmptyUndefined(ARPrecords)) {
            throw new Error('Error getting ARP records.');
        }

        return ARPrecords;
    }

    async function getApplicationRecord(ApplicationID, templateName, formIdField) {
        const applicationRecord = await getForms(
            {
                q: `[${formIdField}] eq '${ApplicationID}'`,
                expand: true,
            },
            templateName
        );

        if (isNullEmptyUndefined(applicationRecord)) {
            throw new Error('Error getting Application record.');
        }

        return applicationRecord;
    }

    function updateStatusToExpired(revisionId, templateName) {
        const shortDescription = `Update the status to be Expired for ${revisionId}`;
        const fieldValuesToUpdate = { status: 'Expired' };

        // Also update FPAN status when updating ARP
        if (templateName === AppReviewPageTemplateName) {
            fieldValuesToUpdate['FPAN Status'] = 'Expired';
        }

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, templateName, revisionId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    function createStatusHistoryRecord(
        formType,
        fpanNumber,
        beforeStatusValue,
        statusModifiedBy,
        relatedRecordId,
        statusChange,
        statusModifiedDate,
        applicationReviewPageId
    ) {
        const shortDescription = `Post form Status History`;
        const newRecordData = {
            'Form Type': formType,
            'FPAN Number': fpanNumber,
            'Before Status Value': beforeStatusValue,
            'Status Modified By': statusModifiedBy,
            'Related Record ID': relatedRecordId,
            'Status Change': statusChange,
            'Status Modified Date': statusModifiedDate,
            'ARP Related Record ID': applicationReviewPageId,
        };

        return vvClient.forms
            .postForms(null, newRecordData, 'Status History')
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
        // #1 Get ARP records
        const queryParams = getExpiredARPQueryParams();
        const arpRecords = await getARPrecords(queryParams, AppReviewPageTemplateName);

        // #2 Find related applications
        const applications = await Promise.allSettled(
            arpRecords.map(async (record) => {
                const applicationId = record['related Record ID'];
                const fpanNumber = record['fpaN Number'];
                const recordStatus = record['fpaN Status'];
                const arpId = record['instanceName'];
                const [templateName, formIdField] = detectFormTemplateFromID(applicationId);
                const [appRecord] = await getApplicationRecord(applicationId, templateName, formIdField);

                const revisionId = appRecord?.revisionId;

                if (revisionId) {
                    return { revisionId, templateName, applicationId, fpanNumber, recordStatus, arpId };
                } else {
                    throw new Error(`No revisionId found for ${applicationId}`);
                }
            })
        );

        const appRevisionDataList = applications.filter((res) => res.status === 'fulfilled').map((res) => res.value);

        // #3 Update Status to Expired (ARPs and Applications)

        // #3.1 Updating ARPs & creating status history records
        await Promise.allSettled(
            arpRecords.map(({ revisionId }) => updateStatusToExpired(revisionId, AppReviewPageTemplateName))
        );

        let now = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });

        now = dayjs(now).tz('America/Los_Angeles').format('MM/DD/YYYY HH:mm:ss');

        // #3.2 Updating Applications & creating status history records
        await Promise.allSettled(
            appRevisionDataList.map(({ revisionId, templateName, applicationId, fpanNumber, recordStatus, arpId }) => {
                (updateStatusToExpired(revisionId, templateName),
                    createStatusHistoryRecord(
                        templateName,
                        fpanNumber,
                        recordStatus,
                        'WADNR.api',
                        applicationId,
                        'Expired',
                        now,
                        arpId
                    ));
            })
        );

        // #4 SEND THE SUCCESS RESPONSE MESSAGE
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
