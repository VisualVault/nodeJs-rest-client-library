/**
 * SCHSoftDeleteStaleRecords
 * Category: Scheduled
 * Modified: 2025-04-11T12:48:22.493Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: 6c2d9c8a-d016-f011-82d3-f3203e068116
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
      Script Name:    SCHSoftDeleteStaleRecords
      Customer:       WADNR
      Purpose:        Applications in Draft, Pending Required Signature, and Required Signature Received
                      status with no activity (edit/save) for 30 calendar days will have their status
                      updated to Ready to Delete. This status change makes them inaccessible to Proponent
                      and Office Staff while remaining visible to System Administrators and VV users for
                      further review during the next 15 business days.

      Parameters:     NONE

      Return Object:
                      Message will be sent back to VV as part of the ending of this scheduled process.
      Pseudo code:
                      1.  CALCULATE cutoff date for Soft deletion
                      2.  GET FPAN, Aerial Chemical, LTA, Renewal, 5-Day Notice, Amendment, and Notice of Transfer records
                          in one of the following statuses: Draft, Pending Required Signature, or Required Signature Received and
                          Modify Date equals Today minus 30 calendar days
                      3.  FOR any Application found update its status to Ready to Delete
                      4.  RETURN a success message for the scheduled service

      Date of Dev:    04/11/2025
      Revision Notes:
                      04/11/2025 - Alfredo Scilabra: First Setup of the script.
      */
    logger.info(`Start of logic for SCHSoftDeleteStaleRecords on ${new Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // You will see the responseMessage in the scheduled process log ONLY if the process runs manually.
    response.json(200, `Start of logic for SCHSoftDeleteStaleRecords on ${new Date()}`);

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
    ];
    const TARGET_STATUSES = ['Draft', 'Pending Required Signature', 'Required Signature Received'];

    const UPDATE_LIB_NAME = 'LibFormUpdateStatus';
    const SOFT_DELETE_STATUS = 'Ready to Delete';

    //Represents the amount of time in days since today that Target Applications are considered due for soft-deletion notification
    const SOFT_DELETION_TIMESPAN = 30;
    const WADNR_TIMEZONE = 'America/Los_Angeles';
    const dateTimeISOStringFormat = 'YYYY-MM-DDTHH:mm:ss'; // Important: No tz specified (e.g. a 'Z' suffix)

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

    function getQueryParams() {
        const targetDateTimeStr = dayjs()
            .tz(WADNR_TIMEZONE)
            .subtract(SOFT_DELETION_TIMESPAN, 'day')
            .format(dateTimeISOStringFormat);

        const targetStatusesCondition = TARGET_STATUSES.map((status) => `[Status] eq '${status}'`);
        const targetDateStartOfDay = targetDateTimeStr.replace(/T\d{2}:\d{2}:\d{2}/, 'T00:00:00');
        const targetDateEndOfDay = targetDateTimeStr.replace(/T\d{2}:\d{2}:\d{2}/, 'T23:59:59');

        // Search for all stale Shopping Carts
        const getTargetAppConditions = [
            `(${targetStatusesCondition.join(' OR ')})`,
            `[modifyDate] ge '${targetDateStartOfDay}'`,
            `[modifyDate] le '${targetDateEndOfDay}'`,
            /* modifyDate is a platform-generated datetime timestamp in the
        server's local time (assumed to be same as client's). Datetime
        comparisons are valid in this case */
        ];

        return {
            q: getTargetAppConditions.join(' AND '),
            fields: `modifyDate`,
        };
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

        await Promise.all(
            targetApplications.map((application) =>
                callExternalWs(UPDATE_LIB_NAME, [
                    { name: 'Form ID', value: application.instanceName },
                    { name: 'Status', value: SOFT_DELETE_STATUS },
                ])
            )
        );

        const responseMessage =
            targetApplications.length === 0
                ? 'No eligible records found for Soft Deletion.'
                : `${targetApplications.length} records found for Soft Deletion.`;

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
