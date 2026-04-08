/**
 * SCHSoftDeleteWarningNotifications
 * Category: Scheduled
 * Modified: 2026-03-26T19:10:50.577Z by fernando.chamorro@visualvault.com
 * Script ID: Script Id: 5ba7c265-0416-f011-82d3-f3203e068116
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
      Script Name:    SCHSoftDeleteWarningNotifications
      Customer:       WADNR
      Purpose:        To ensure that fpOnline users are informed before their application records are
                      automatically purged, the system must generate an automated email notification 7 calendar
                      days prior to the date that the record will be marked for purge. The purge happens on
                      Day 60 from last modification, allowing a 30-day inactivity period followed by a
                      15-business-day retention window.

      Parameters:     NONE

      Return Object:
                      Message will be sent back to VV as part of the ending of this scheduled process.
      Pseudo code:
                      1.  CALCULATE cutoff date for Notification
                      2.  GET FPAN, Aerial Chemical, LTA, Renewal, 5-Day Notice, Amendment, and Notice of Transfer records
                          in one of the following statuses: Draft, Pending Required Signature, or Required Signature Received and
                          Modify Date equals Today minus 23 calendar days
                      3. FOR any Application found create a Comm log
                      4. RETURN a success message for the scheduled service

      Date of Dev:    03/11/2025
      Revision Notes:
                      04/10/2025 - Alfredo Scilabra:    First Setup of the script.
                      03/11/2025 - Alfredo Scilabra:    Add support for new forms and change email send to be 1 per user
                      26/03/2026 - Fernando Chamorro:   Add date to be purged to body table
      */
    logger.info(`Start of logic for SCHSoftDeleteWarningNotifications on ${new Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // You will see the responseMessage in the scheduled process log ONLY if the process runs manually.
    response.json(200, `Start of logic for SCHSoftDeleteWarningNotifications on ${new Date()}`);

    // Array for capturing error messages that may occur during the execution of the script.
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    // Form Template Names
    const TARGET_APPLICATIONS_TEMPLATES = [
        'Forest Practices Aerial Chemical Application',
        'Forest Practices Application Notification',
        'Step 1 Long Term FPA',
        'FPAN Renewal',
        'Long-Term Application 5-Day Notice',
        'FPAN Amendment Request',
        'FPAN Notice of Transfer',
        'Water Type Modification Form',
        'Notice of Continuing Forest Land Obligation',
    ];

    const EMAIL_TEMPLATE_NAME = '7-Day Purge Warning';

    const TARGET_STATUSES = ['Draft', 'Pending Required Signature', 'Required Signature Received'];

    //Represents the amount of time in days since today that Target Applications are considered due for soft-deletion notification
    const SOFT_DELETION_TIMESPAN = 23;

    //Represents the amount of time in days from today that Target Applications will be purged
    //Purge happens 60 days after last update so if we are 23 days + 37 days = 60 days after last update
    //NOTE: this numbers of days will be calculated from today (added)
    const PURGE_TIMESPAN = 37;

    // The system sends a notification to inform the user about the record's inactivity;
    // therefore, the date for purging is defined within the next seven calendar days.
    const DAYS_SCHEDULED_FOR_PURGING_IN_CALENDAR_DAYS = 7;

    const WADNR_TIMEZONE = 'America/Los_Angeles';
    const dateTimeISOStringFormat = 'YYYY-MM-DDTHH:mm:ss'; // Important: No tz specified (e.g. a 'Z' suffix)
    const dateStringFormat = 'MM-DD-YYYY'; //Use for tokens in email template

    /* -------------------------------------------------------------------------- */
    /*                              Script Variables                              */
    /* -------------------------------------------------------------------------- */

    // Contains the success or error response message
    let responseMessage = '';

    // Identifies the process in VV servers
    const scheduledProcessGUID = token;

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

    function callExternalWs(webServiceName, webServiceParams) {
        let shortDescription = `Run Web Service: ${webServiceName}`;

        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    // Function to check if a value is null, empty, or undefined
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

    function getFormRecords(getFormsParams, templateName) {
        const shortDescription = `Get form ${templateName}`;
        const overrideGetFormsParams = {
            expand: false,
            ...getFormsParams, // overrides defaults in this object
        };

        return vvClient.forms
            .getForms(overrideGetFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function detectFormTemplateFromID(recordID) {
        //NOTE: Check for longer prefixes first!
        const templateNames = [
            { prefix: 'STEP-1-LONG-TERM-FPA', name: 'Step 1 Long Term FPA' },
            { prefix: 'FPA-AERIAL-CHEMICAL', name: 'Forest Practices Aerial Chemical Application' },
            { prefix: 'FPAN-AMENDMENT', name: 'FPAN Amendment Request' },
            { prefix: 'FPAN-RENEWAL', name: 'FPAN Renewal' },
            { prefix: 'FPAN-T', name: 'FPAN Notice of Transfer' },
            { prefix: 'LT-5DN', name: 'Long-Term Application 5-Day Notice' },
            { prefix: 'NCFLO', name: 'Notice of Continuing Forest Land Obligation' },
            { prefix: 'FPAN', name: 'Forest Practices Application Notification' },
            { prefix: 'WTM', name: 'Water Type Modification Form' },
        ];

        const normalizedID = recordID.replace(/\s+/g, ''); // Remove spaces

        for (const { prefix, name } of templateNames) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return name;
            }
        }

        throw new Error('Form template name not found.');
    }

    function getQueryParams() {
        const softDeletionDateTimeStr = dayjs()
            .tz(WADNR_TIMEZONE)
            .subtract(SOFT_DELETION_TIMESPAN, 'day')
            .format(dateTimeISOStringFormat);

        const targetStatusesCondition = TARGET_STATUSES.map((status) => `[Status] eq '${status}'`);
        const softDeletionStartOfDay = softDeletionDateTimeStr.replace(/T\d{2}:\d{2}:\d{2}/, 'T00:00:00');
        const softDeletionEndOfDay = softDeletionDateTimeStr.replace(/T\d{2}:\d{2}:\d{2}/, 'T23:59:59');

        const getTargetAppConditions = [
            `(${targetStatusesCondition.join(' OR ')})`,
            `[modifyDate] ge '${softDeletionStartOfDay}'`,
            `[modifyDate] le '${softDeletionEndOfDay}'`,
            /* modifyDate is a platform-generated datetime timestamp in the
        server's local time (assumed to be same as client's). Datetime
        comparisons are valid in this case */
        ];

        return {
            q: getTargetAppConditions.join(' AND '),
            fields: `Individual ID, modifyDate, createBy`,
        };
    }

    async function sendNotificationEmail(tokens, emailAddress, sendDateTime) {
        const emailRequestArr = [
            { name: 'Email Name', value: EMAIL_TEMPLATE_NAME },
            { name: 'Tokens', value: tokens },
            { name: 'Email Address', value: emailAddress },
            { name: 'Email AddressCC', value: '' },
            { name: 'SendDateTime', value: sendDateTime },
            { name: 'RELATETORECORD', value: [] },
            {
                name: 'OTHERFIELDSTOUPDATE',
                value: {},
            },
        ];
        try {
            const [LibEmailGenerateAndCreateCommunicationLogStatus] = await callExternalWs(
                'LibEmailGenerateAndCreateCommunicationLog',
                emailRequestArr
            );
            return LibEmailGenerateAndCreateCommunicationLogStatus;
        } catch (error) {
            return 'Error';
        }
    }

    function isValidEmail(email) {
        if (typeof email !== 'string' || !email.trim()) return false;
        const emailValidationCheck =
            /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return emailValidationCheck.test(email);
    }

    function buildAppsTableTokenforEmail(applications, purgeDate) {
        const cellStyle = 'style="border:1px solid #000; padding:8px; text-align:left"';
        const rows = applications
            .map((app) => {
                return `
          <tr>
            <td ${cellStyle}><p>${detectFormTemplateFromID(app.instanceName)}</p></td>
            <td ${cellStyle}><p>${app.instanceName}</p></td>
            <td ${cellStyle}><p>${purgeDate}</p></td>
          </tr>
          `;
            })
            .join('');

        return `
      <table
        class="email-table"
        style="
          font-family: Arial, Helvetica Neue, Helvetica,
          sans-serif;
          font-size: 14px;
          color: #000000;
          border-collapse: collapse;
          width: 100%;
        ">
        <tbody>
          <tr>
            <th ${cellStyle}><p>Record Type</p></th>
            <th ${cellStyle}><p>Record ID</p></th>
            <th ${cellStyle}><p>Date to be purged</p></th>
          </tr>
          ${rows}
        </tbody>
      </table>
    `;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        const getAppParams = getQueryParams();

        const targetAppPromises = TARGET_APPLICATIONS_TEMPLATES.map((template) =>
            getFormRecords(getAppParams, template)
        );
        const targetApplicationsResult = await Promise.all(targetAppPromises);

        const targetApplications = targetApplicationsResult.flat();

        // GROUP BY createBy
        const applicationsByUser = targetApplications.reduce((acc, app) => {
            const key = app.createBy;
            if (!acc[key]) acc[key] = [];
            acc[key].push(app);
            return acc;
        }, {});

        const purgeDate = dayjs().tz(WADNR_TIMEZONE).add(PURGE_TIMESPAN, 'day').format(dateStringFormat);

        const dateToBePurged = dayjs()
            .tz(WADNR_TIMEZONE)
            .add(DAYS_SCHEDULED_FOR_PURGING_IN_CALENDAR_DAYS, 'day')
            .format(dateStringFormat);

        const sendDateTime = dayjs().tz(WADNR_TIMEZONE).hour(19).minute(0).second(0).millisecond(0).toISOString();

        let logsSentCount = 0;
        // Iterate grouped users instead of individual applications
        for (const [createdByUser, apps] of Object.entries(applicationsByUser)) {
            const [individualRecord] = await getFormRecords(
                {
                    q: `[User ID] eq '${createdByUser}'`,
                    expand: true,
                },
                'Individual Record'
            );

            if (!isNullEmptyUndefined(individualRecord)) {
                // Determine valid email once per user
                const primaryEmail = createdByUser;
                const fallbackEmail = individualRecord.email;

                const targetEmail = isValidEmail(primaryEmail)
                    ? primaryEmail
                    : isValidEmail(fallbackEmail)
                      ? fallbackEmail
                      : null;

                if (targetEmail) {
                    // Send one email per user
                    const tableToken = buildAppsTableTokenforEmail(apps, dateToBePurged);
                    const tokens = [
                        { name: '[User First Name]', value: individualRecord['first Name'] },
                        { name: '[User Last Name]', value: individualRecord['last Name'] },
                        { name: '[Applications Table]', value: tableToken },
                        { name: '[Date]', value: purgeDate },
                    ];

                    const sentResult = await sendNotificationEmail(tokens, targetEmail, sendDateTime);

                    if (sentResult === 'Success') logsSentCount++;
                }
            }
        }

        const responseMessage =
            logsSentCount === 0 ? 'No eligible records were found.' : `${logsSentCount} logs created`;

        // SEND THE SUCCESS RESPONSE MESSAGE
        // NOTE: You will see the responseMessage in the scheduled process log ONLY if the process runs automatically.
        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, responseMessage);
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // SEND THE ERROR RESPONSE MESSAGE
        if (errorLog.length > 0) {
            responseMessage = `Error/s: ${errorLog.join('; ')}`;
        } else {
            responseMessage = `Unhandled error occurred: ${error}`;
        }

        // NOTE: You will see the responseMessage in the scheduled process log ONLY if the process runs automatically.
        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', false, responseMessage);
    }
};
