/**
 * SCHFPANExpirationClearOfflineFlags
 * Category: Scheduled
 * Modified: 2026-02-04T21:04:47.853Z by fernando.chamorro@visualvault.com
 * Script ID: Script Id: f83ccd55-df01-f111-8306-d7f19a0f3584
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
        Script Name:    FPANExpirationClearOfflineFlags
        Customer:       WADNR
        Purpose:        The purpose of this process is to run a process so that for expired FPAN Numbers
                        (Application Review Pages) that have documents flagged for offline will clear the 
                        flags so that the documents will be removed from Box.
        Preconditions:
                        - Template "Application Review Page" must exist
                        - Field "FPAN Decision Expiration Date" must exist on ARP
                        - Field "Process Documents on Expiration" (hidden) must exist on ARP
                        - Documents related to ARPs must have an "Offline" index field

        Parameters:     None. This is a scheduled process.
        Return Object:  Completion message posted to the scheduled process log.

        Pseudo code:
                        1. Calculate threshold and get all expired, unprocessed ARPs
                        2. Process each ARP sequentially to avoid overwhelming the API
                            2.1 Get all documents related to this ARP
                            2.2 Filter only documents that have Offline flagged as true and clear them
                            2.3 Mark the ARP as processed
                        3. Build summary
  
        Date of Dev:    02/04/2026
        Last Rev Date:  02/04/2026
  
        Revision Notes:
                        02/04/2026 - Fernando Chamorro: First Setup of the script
    */

    logger.info(`FPANExpirationClearOfflineFlags on ${new Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    response.json(200, `Start of FPAN Expiration - Clear Offline Flags on ${new Date()}`);

    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const arpTemplateName = 'Application Review Page';
    const expirationDateField = 'FPAN Decision Expiration Date';
    const processedFlagField = 'Process Documents on Expiration';
    const RETENTION_YEARS = 2;

    /* -------------------------------------------------------------------------- */
    /*                              Script Variables                              */
    /* -------------------------------------------------------------------------- */

    let responseMessage = '';
    let shortDescription = '';

    const scheduledProcessGUID = token;

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

    function parseRes(vvClientRes) {
        try {
            const jsObject = JSON.parse(vvClientRes);
            if (jsObject && typeof jsObject === 'object') {
                vvClientRes = jsObject;
            }
        } catch (e) {}
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

        if (status != ignoreStatusCode) {
            if (!vvClientRes.data) {
                throw new Error(
                    `${shortDescription} data property was not present. Please, check parameters and syntax. Status: ${status}.`
                );
            }
        }

        return vvClientRes;
    }

    function getExpirationThresholdDate() {
        /*
          Calculates the date that is RETENTION_YEARS years ago from today.
          Any ARP with an expiration date before this threshold qualifies for processing.
        */
        const today = new Date();
        today.setFullYear(today.getFullYear() - RETENTION_YEARS);
        return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    }

    async function getExpiredUnprocessedARPs() {
        /*
          Fetches all ARPs where:
          - FPAN Decision Expiration Date is more than 2 years in the past
          - Process Documents on Expiration is not true (not yet processed)
          Returns: Array of ARP records
        */
        shortDescription = 'Get expired unprocessed ARPs';
        const thresholdDate = getExpirationThresholdDate();

        const getARPsParams = {
            q: `[${expirationDateField}] lt '${thresholdDate}' and [${processedFlagField}] eq 'False'`,
            fields: `revisionId, instanceName, ${expirationDateField}, ${processedFlagField}`,
        };

        return vvClient.forms
            .getForms(getARPsParams, arpTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    async function getRelatedDocuments(arpRevisionId) {
        /*
          Fetches all documents related to a specific ARP.
          Parameters:
              - arpRevisionId: The revision ID of the ARP
          Returns: Array of related documents, empty array if none found
        */
        shortDescription = `Get related documents for ARP ${arpRevisionId}`;

        return vvClient.forms
            .getFormRelatedDocs(arpRevisionId, { indexFields: 'include' })
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, 404))
            .then((res) => {
                if (res.meta.status === 404 || !res.data) {
                    return [];
                }
                return res.data;
            });
    }

    async function clearOfflineFlag(documentId) {
        /*
          Clears the Offline index flag on a document so it will be removed from Box on next sync.
          Parameters:
              - documentId: The ID of the document to update
        */
        shortDescription = `Clear Offline flag for document ${documentId}`;

        const indexData = {
            indexFields: JSON.stringify({ Offline: 'False' }),
        };

        return vvClient.documents
            .putDocumentIndexFields(indexData, documentId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    async function markARPAsProcessed(arpRevisionId) {
        /*
          Sets "Process Documents on Expiration" to True on the ARP
          to prevent it from being reprocessed.
          Parameters:
              - arpRevisionId: The revision ID of the ARP to update
        */
        shortDescription = `Mark ARP ${arpRevisionId} as processed`;

        const updateParams = {
            [processedFlagField]: 'True',
        };

        return vvClient.forms
            .postFormRevision(null, updateParams, arpTemplateName, arpRevisionId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    async function processARP(arp) {
        /*
          Processes a single ARP: clears Offline flags on all related documents
          and marks the ARP as processed.
          Parameters:
              - arp: The ARP record object
          Returns: Object with processing summary { arpId, docsProcessed, docsSkipped }
        */
        const arpRevisionId = arp.revisionId;
        const arpInstanceName = arp.instanceName;
        let docsProcessed = 0;
        let docsSkipped = 0;

        logger.info(`Processing ARP: ${arpInstanceName} (Expiration: ${arp[expirationDateField]})`);

        // 2.1 Get all documents related to this ARP
        const relatedDocs = await getRelatedDocuments(arpRevisionId);

        if (relatedDocs.length === 0) {
            logger.info(`No related documents found for ARP: ${arpInstanceName}`);
        }

        // 2.2 Filter only documents that have Offline flagged as true and clear them
        for (const doc of relatedDocs) {
            try {
                const isOffline = doc['offline'] === 'True' || doc['offline'] === true;

                if (isOffline) {
                    await clearOfflineFlag(doc.documentId);
                    docsProcessed++;

                    logger.info(
                        `Cleared Offline flag for document: ${doc.name || doc.documentId} in ARP: ${arpInstanceName}`
                    );
                } else {
                    docsSkipped++;
                }
            } catch (error) {
                errorLog.push(
                    `Failed to clear Offline flag for document ${
                        doc.name || doc.documentId || doc.id
                    } in ARP ${arpInstanceName}: ${error.message}`
                );
            }
        }

        // 2.3 Mark the ARP as processed
        await markARPAsProcessed(arpRevisionId);
        logger.info(
            `Marked ARP ${arpInstanceName} as processed. Docs cleared: ${docsProcessed}, Docs skipped: ${docsSkipped}`
        );

        return { arpId: arpInstanceName, docsProcessed, docsSkipped };
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1. Calculate threshold and get all expired, unprocessed ARPs
        const thresholdDate = getExpirationThresholdDate();
        logger.info(`Processing ARPs with expiration date before: ${thresholdDate}`);

        const expiredARPs = await getExpiredUnprocessedARPs();

        // If no ARPs need processing, finish successfully
        if (!expiredARPs || expiredARPs.length === 0) {
            responseMessage = 'Success. No expired unprocessed ARPs found.';
            logger.info('No expired unprocessed ARPs found. Nothing to do.');

            return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, responseMessage);
        }

        logger.info(`Found ${expiredARPs.length} expired ARP(s) to process.`);

        // 2. Process each ARP sequentially to avoid overwhelming the API
        const processingResults = [];

        for (const arp of expiredARPs) {
            try {
                const result = await processARP(arp);
                processingResults.push(result);
            } catch (error) {
                errorLog.push(`Failed to process ARP ${arp.instanceName}: ${error.message}`);
            }
        }

        // 3. Build summary
        const totalARPs = processingResults.length;
        const totalDocsCleared = processingResults.reduce((sum, r) => sum + r.docsProcessed, 0);
        const totalDocsSkipped = processingResults.reduce((sum, r) => sum + r.docsSkipped, 0);

        logger.info(
            `Processing complete. ARPs processed: ${totalARPs}, Docs cleared: ${totalDocsCleared}, Docs skipped: ${totalDocsSkipped}`
        );

        // SEND THE SUCCESS RESPONSE MESSAGE
        responseMessage = `Success. ARPs processed: ${totalARPs}, Documents cleared: ${totalDocsCleared}, Documents skipped (not offline): ${totalDocsSkipped}`;

        if (errorLog.length > 0) {
            responseMessage += ` | Warnings: ${errorLog.join('; ')}`;
        }

        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, responseMessage);
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // SEND THE ERROR RESPONSE MESSAGE
        if (errorLog.length > 0) {
            responseMessage = `Error/s: ${errorLog.join('; ')}`;
        } else {
            responseMessage = `Unhandled error occurred: ${error}`;
        }

        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', false, responseMessage);
    }
};
