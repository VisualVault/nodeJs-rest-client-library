/**
 * SCHRetriggerBoxWorkflow
 * Category: Scheduled
 * Modified: 2026-04-03T18:23:07.977Z by ross.rhone@visualvault.com
 * Script ID: Script Id: 5c1a60af-f529-f111-832d-e40a64ced594
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
    Script Name:    SCHRetriggerBoxWorkflow
    Customer:       WADNR
    Purpose:        Retrigger the document workflow responsible for pushing offline documents to Box
                    when a previous Box upload attempt failed.
    Preconditions:
                    - Box Synchronization Log form exists
                    - Offline/isInBox document index fields exist
                    - Document workflow is triggered by the Offline index field transition
    Parameters:     NONE

    Return Object:
                    Message will be sent back to VV as part of the ending of this scheduled process.
    Psuedo code:
                    1. Get failed Box Sync History upload log records
                        1a Get the document ID of the file that failed to upload/removal to Box
                    2. Check if the index fields of the failed file are set to trigger the workflow once per run
                    3. If index fields are set to upload then toggle index field Offline to false then to true to
                    trigger the workflow to attempt to re-upload the file to Box
                    3a. If index fields are set to removal then update index field Offline to true to trigger the workflow to attempt to re-remove the file from Box
                    4. If index fields are not set to trigger the workflow then log the occurrence and reason in the Box Synchronization Log form
                    5. If there are 3 or more failed sync attempts for the document in the past 5 hours, log that the workflow will not be retriggered to 
                    avoid infinite loop and log the occurrence and reason in the Box Synchronization Log form
                    6. Log outcome for each processed document
                    7. Return scheduled process completion

    Date of Dev:    03/26/2026
    Revision Notes:
    03/26/2026 - Ross Rhone:  Initial Revision

  */

    logger.info(`Start of logic for SCHRetriggerBoxWorkflow on ${new Date()}`);
    response.json(200, `Start of logic for SCHRetriggerBoxWorkflow on ${new Date()}`);

    /***********************
 Configurable Variables
************************/

    let errorLog = [];
    let responseMessage = '';
    const scheduledProcessGUID = token;
    const WADNR_TIMEZONE = 'America/Los_Angeles';
    const dateISOStringFormat = 'YYYY-MM-DD HH:mm:ss';
    const FAILED_BOX_SYNC_COUNTS_QUERY_NAME = 'zIntegrationBoxAPIFailures';

    /*****************
 Helper Functions
******************/

    function parseRes(vvClientRes) {
        try {
            const jsObject = JSON.parse(vvClientRes);
            if (jsObject && typeof jsObject === 'object') {
                vvClientRes = jsObject;
            }
        } catch (e) {
            // Response is already an object
        }
        return vvClientRes;
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

        if (status != ignoreStatusCode && !vvClientRes.data) {
            throw new Error(
                `${shortDescription} data property was not present. Please, check parameters and syntax. Status: ${status}.`
            );
        }

        return vvClientRes;
    }

    function normalizeBoolean(value) {
        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized === 'true') {
                return true;
            }
            if (normalized === 'false') {
                return false;
            }
        }

        return Boolean(value);
    }

    async function withRetry(fn, { label, retries = 2 } = {}) {
        let lastError;

        for (let attempt = 1; attempt <= retries + 1; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (attempt > retries) {
                    break;
                }

                logger.info(
                    `SCHRetriggerBoxWorkflow: ${label || 'operation'} failed on attempt ${attempt} of ${retries + 1}. ${error.message}`
                );
            }
        }

        throw lastError;
    }

    function getFailedBoxSyncLogs() {
        const shortDescription = 'Get failed Box Synchronization Log records';

        const cutoffDateTime = dayjs().tz('America/Los_Angeles').subtract(5, 'hour').format(dateISOStringFormat);

        logger.info(`SCHRetriggerBoxWorkflow: Server time: ${cutoffDateTime}`);

        const getFormsParams = {
            q: `([Operation] eq 'Upload' OR [Operation] eq 'Removal') AND [Sync Direction] eq 'To Box' AND [Success Or Failure] eq 'Failure' AND [Sync Date Time] ge '${cutoffDateTime}'`,
            fields: 'revisionId, Document ID, File Name, Folder Path, Feature Message, Sync Date Time, Operation',
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, 'Box Synchronization Log')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data || []);
    }

    function getCustomQueryDataBySQLParams(queryName, sqlParams) {
        const shortDescription = `Custom Query using SQL Parameters for '${queryName}'`;
        const customQueryData = {};

        if (sqlParams) {
            const sqlParamArr = [];

            for (const parameterName in sqlParams) {
                sqlParamArr.push({
                    parameterName,
                    value: sqlParams[parameterName],
                });
            }

            customQueryData.params = JSON.stringify(sqlParamArr);
        }

        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, customQueryData)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data || []);
    }

    function getFailedBoxSyncCountsByDocument() {
        const cutoffDateTime = dayjs().tz('America/Los_Angeles').subtract(5, 'hour').format(dateISOStringFormat);

        return getCustomQueryDataBySQLParams(FAILED_BOX_SYNC_COUNTS_QUERY_NAME, {
            CutoffDateTime: cutoffDateTime,
        });
    }

    function getDocument(docID) {
        const shortDescription = `Get document ${docID}`;
        const getDocsParams = {
            q: `documentId = '${docID}'`,
            indexFields: 'include',
        };

        return vvClient.documents
            .getDocuments(getDocsParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data || []);
    }

    function updateDocumentIndexFields(
        documentGUID,
        indexFieldsToUpdate,
        shortDescription = `Update index fields for ${documentGUID}`
    ) {
        const indexFieldsDataWrapper = {
            indexFields: JSON.stringify(indexFieldsToUpdate),
        };

        return vvClient.documents
            .putDocumentIndexFields(indexFieldsDataWrapper, documentGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getLatestFailedLogsPerDocument(logRecords) {
        const logsByDocument = new Map();

        for (const record of logRecords) {
            const docID = record['document ID'];
            const operation = record.operation || record.Operation || 'Upload';
            if (!docID) {
                continue;
            }

            const documentOperationKey = `${docID}::${operation}`;

            const existing = logsByDocument.get(documentOperationKey);
            const currentModifyDate = record['sync Date Time'] || record.modifyDate || '';
            const existingModifyDate = existing?.['sync Date Time'] || existing?.modifyDate || '';

            if (!existing || currentModifyDate > existingModifyDate) {
                logsByDocument.set(documentOperationKey, record);
            }
        }

        return Array.from(logsByDocument.values());
    }

    function getFailureCountsByDocumentAndOperation(failureCountRecords) {
        const failureCountsByDocument = new Map();

        for (const record of failureCountRecords) {
            const docID = record.DocumentID || record.documentID || record.documentId;
            const operation = record.Operation || record.operation;
            const failureCount = Number(record.FailureCount || record.failureCount || record.failurecount || 0);

            if (!docID || !operation) {
                continue;
            }

            if (!failureCountsByDocument.has(docID)) {
                failureCountsByDocument.set(docID, new Map());
            }

            failureCountsByDocument.get(docID).set(operation, failureCount);
        }

        return failureCountsByDocument;
    }

    function logBOXActivity(docID, fileName, folderPath, isSuccess, featureMsg, operation = 'Upload') {
        const shortDescription = 'Post form Box Synchronization Log';
        const syncDateTimePacific = dayjs().tz(WADNR_TIMEZONE).format(dateISOStringFormat);
        const newRecordData = {
            'Sync Date Time': syncDateTimePacific,
            'Document ID': docID,
            'File Name': fileName,
            'Folder Path': folderPath,
            Operation: operation,
            'Sync Direction': 'To Box',
            'Success Or Failure': isSuccess == true ? 'Success' : 'Failure',
            'User Account Used To Sync': 'SCHRetriggerBoxWorkflow',
            'Feature Message': featureMsg,
        };

        return vvClient.forms
            .postForms(null, newRecordData, 'Box Synchronization Log')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    /**********
 MAIN CODE 
**********/

    try {
        logger.info('SCHRetriggerBoxWorkflow: Retrieving failed Box synchronization logs...');
        const failedLogRecords = await withRetry(() => getFailedBoxSyncLogs(), {
            label: 'getFailedBoxSyncLogs',
            retries: 2,
        });

        logger.info('SCHRetriggerBoxWorkflow: Retrieving failed Box synchronization counts...');
        const failedSyncCountRecords = await withRetry(() => getFailedBoxSyncCountsByDocument(), {
            label: 'getFailedBoxSyncCountsByDocument',
            retries: 2,
        });

        if (!failedLogRecords || failedLogRecords.length === 0) {
            logger.info('SCHRetriggerBoxWorkflow: No failed Box upload records found to retrigger.');
            responseMessage = 'No failed Box upload records found to retrigger.';
            return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, responseMessage);
        }

        const latestFailedLogs = getLatestFailedLogsPerDocument(failedLogRecords);
        const failureCountsByDocument = getFailureCountsByDocumentAndOperation(failedSyncCountRecords);

        let retriggeredCount = 0;
        let skippedCount = 0;

        for (const record of latestFailedLogs) {
            const docID = record['document ID'];
            const fileName = record['file Name'] || '';
            const folderPath = record['folder Path'] || '';
            const operation = record.operation || record.Operation || 'Upload';
            const failureCount = failureCountsByDocument.get(docID)?.get(operation) || 0;

            try {
                if (failureCount >= 3) {
                    skippedCount++;
                    await logBOXActivity(
                        docID,
                        fileName,
                        folderPath,
                        false,
                        `Document has ${failureCount} failed sync attempts in the retry window, ${operation} workflow will not be retriggered`,
                        operation
                    );
                    continue;
                }

                const returnedDocuments = await withRetry(() => getDocument(docID), {
                    label: `getDocument(${docID})`,
                    retries: 2,
                });

                if (!returnedDocuments || returnedDocuments.length === 0) {
                    skippedCount++;
                    await logBOXActivity(
                        docID,
                        fileName,
                        folderPath,
                        true,
                        'File not found in VV Document Library, retrigger workflow ended',
                        operation
                    );
                    continue;
                }

                const documentData = returnedDocuments[0];
                const isOffline = normalizeBoolean(documentData?.offline);
                const isInBox = normalizeBoolean(documentData?.isinbox);

                if (isOffline && !isInBox) {
                    const baseIndexFields = {
                        Offline: isOffline,
                        isInBox: false,
                    };

                    await withRetry(
                        () =>
                            updateDocumentIndexFields(docID, {
                                ...baseIndexFields,
                                Offline: false,
                            }),
                        {
                            label: `updateDocumentIndexFields(${docID}) toggle false for upload`,
                            retries: 2,
                        }
                    );

                    await withRetry(
                        () =>
                            updateDocumentIndexFields(docID, {
                                ...baseIndexFields,
                                Offline: true,
                            }),
                        {
                            label: `updateDocumentIndexFields(${docID}) toggle true for upload`,
                            retries: 2,
                        }
                    );

                    retriggeredCount++;
                    await logBOXActivity(
                        docID,
                        fileName,
                        folderPath,
                        true,
                        'Upload workflow retriggered by toggling Offline from false to true',
                        operation
                    );
                    continue;
                }

                if (!isOffline && isInBox) {
                    await withRetry(
                        () =>
                            updateDocumentIndexFields(docID, {
                                Offline: true,
                                isInBox: true,
                            }),
                        {
                            label: `updateDocumentIndexFields(${docID}) toggle true for removal`,
                            retries: 2,
                        }
                    );

                    retriggeredCount++;
                    await logBOXActivity(
                        docID,
                        fileName,
                        folderPath,
                        true,
                        'Removal workflow retriggered by updating Offline from false to true',
                        operation
                    );
                    continue;
                }

                skippedCount++;
                await logBOXActivity(
                    docID,
                    fileName,
                    folderPath,
                    true,
                    `Document state Offline=${isOffline} and isInBox=${isInBox} does not match a retrigger scenario`,
                    operation
                );
            } catch (error) {
                skippedCount++;
                logger.error(`SCHRetriggerBoxWorkflow: Error processing ${docID}. ${error.message}`);
                await logBOXActivity(
                    docID,
                    fileName,
                    folderPath,
                    false,
                    `(Error Encountered): ${error.message}`,
                    operation
                );
            }
        }

        responseMessage = `Processed ${latestFailedLogs.length} failed Box upload record(s). Retriggered: ${retriggeredCount}. Skipped or failed: ${skippedCount}.`;

        logger.info('SCHRetriggerBoxWorkflow: Completed! ' + responseMessage);

        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, responseMessage);
    } catch (error) {
        logger.info(`SCHRetriggerBoxWorkflow: Error encountered ${error.message}`);
        logger.error(`SCHRetriggerBoxWorkflow: Error encountered ${error.message}`);

        if (errorLog.length > 0) {
            responseMessage = `Error/s: ${errorLog.join('; ')}`;
        } else {
            responseMessage = `Unhandled error occurred: ${error.message || error}`;
        }

        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', false, responseMessage);
    }
};
