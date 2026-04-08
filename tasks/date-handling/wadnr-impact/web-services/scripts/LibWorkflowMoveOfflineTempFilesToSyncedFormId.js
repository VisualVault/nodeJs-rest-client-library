/**
 * LibWorkflowMoveOfflineTempFilesToSyncedFormId
 * Category: Workflow
 * Modified: 2026-02-05T22:07:22.923Z by matias.andrade@visualvault.com
 * Script ID: Script Id: 61d984b6-3ffd-f011-8311-c41c113564c7
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
    Script Name:    LibWorkflowMoveOfflineTempFilesToSyncedFormId
    Customer:       WADNR
    Purpose:        When an ICN/NTC record is created OFFLINE and later synced ONLINE, the record may receive a new Form ID
                    due to ID collisions. Offline-uploaded documents may remain in /ENFORCEMENT/TEMP/<offlineId>.
                    This microservice moves ONLY documents associated to the current record, avoiding multi-collision ambiguity.

    Return Object:
                    returnObject.MicroserviceResult: Boolean
                    returnObject.MicroserviceMessage: String
                    returnObject.Status: String ("Success" | "Error")
                    returnObject.Message: String
                    returnObject.OnlineId: String
                    returnObject.OfflineId: String
                    returnObject.SourcePath: String
                    returnObject.TargetPath: String
                    returnObject.dhid: String (only on collision path)
                    returnObject.MovedFiles: Array
                    returnObject.SkippedFiles: Array
                    returnObject.SourceFolderNotDeleted: Boolean

    Pseudo code:
                    1. Read and validate parameters (Form ID and Offline Form ID) 
                    2. Build TEMP source/target paths using offlineId/onlineId 
                    3. If onlineId == offlineId, set "Offline Files Migrated" to True and exit 
                    4. If onlineId != offlineId, resolve dhid (revisionId) via getForms using Form ID 
                    5. Retrieve record-related documents using getFormRelatedDocs(dhid) 
                    6. Filter candidates: only docs with folderPath under /ENFORCEMENT/TEMP/<offlineId> 
                    7. Create target folder if needed and move only candidate documents 
                    8. Set "Offline Files Migrated" to True to prevent workflow re-run 
                    9. Return a structured response and complete the workflow (completeWorkflowWebService) 

    Key Behavior:
                    - If onlineId === offlineId: no move, mark Offline Files Migrated = True.
                    - If onlineId !== offlineId:
                        - Look up dhid (revisionId) via getForms using the Form ID.
                        - Get related docs for that dhid.
                        - Move only those related docs whose current folderPath starts with sourcePath.
                        - Create target folder if needed.
                        - Mark Offline Files Migrated = True.

    Required Fields:
                    - Form ID (String, Required)
                    - Offline Initial Form ID (String, Required)

    Date of Dev:    02/03/2026

    Revision Notes:
                    01/28/2026 - Matias Andrade: Initial revision.
  */

    logger.info('Start of the process LibWorkflowMoveOfflineTempFilesToSyncedFormId at ' + Date());

    // Respond immediately before processing
    response.json(200, { success: true, message: 'Process started successfully.' });

    const executionId = response.req.headers['vv-execution-id'];
    let returnObject;
    let errorLog = [];

    /*****************
   Helper Functions
  ******************/
    function parseRes(vvClientRes) {
        try {
            const jsObject = JSON.parse(vvClientRes);
            if (jsObject && typeof jsObject === 'object') vvClientRes = jsObject;
        } catch (e) {}
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        if (!vvClientRes.meta) {
            throw new Error(`${shortDescription} error. No meta object found in response.`);
        }

        const status = vvClientRes.meta.status;

        if (status != 200 && status != 201 && status != ignoreStatusCode) {
            const errorReason =
                vvClientRes.meta.errors && vvClientRes.meta.errors[0]
                    ? vvClientRes.meta.errors[0].reason
                    : 'unspecified';
            throw new Error(`${shortDescription} error. Status: ${status}. Reason: ${errorReason}`);
        }
        return vvClientRes;
    }

    function checkDataPropertyExists(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        const status = vvClientRes.meta.status;

        if (status != ignoreStatusCode && !vvClientRes.data) {
            throw new Error(`${shortDescription} data property was not present. Status: ${status}.`);
        }
        return vvClientRes;
    }

    function getFieldValueByName(fieldName, isOptional = false) {
        let fieldValue = '';

        try {
            const field = ffCollection.getFormFieldByName(fieldName);
            const requiredFieldMissing = !isOptional && !field;

            if (requiredFieldMissing) {
                throw new Error(`The field '${fieldName}' was not found.`);
            }

            if (field) {
                fieldValue = 'value' in field ? field.value : fieldValue;
                fieldValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;

                const requiredNoValue = !fieldValue && typeof fieldValue !== 'number' && !isOptional;

                const ddSelectItem = fieldValue === 'Select Item';

                if (requiredNoValue || ddSelectItem) {
                    fieldValue = '';
                    throw new Error(`The value for field '${fieldName}' was not found or is empty.`);
                }
            }
        } catch (error) {
            errorLog.push(error.message);
        } finally {
            return fieldValue;
        }
    }

    function normalizeFormId(formId) {
        return (formId || '').toString().trim();
    }

    function detectTemplateFromFormId(formId) {
        // NOTE: Keep this mapping minimal for this fix (ICN/NTC only).
        const upper = (formId || '').toUpperCase();
        if (upper.startsWith('ICN-')) return 'Informal Conference Note';
        if (upper.startsWith('NTC-')) return 'Notice to Comply';
        return '';
    }

    async function getRelatedDocs(formRevisionID, params = { indexFields: 'include' }) {
        const shortDescription = `Get related docs for record ${formRevisionID}`;
        return vvClient.forms
            .getFormRelatedDocs(formRevisionID, params)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data || []);
    }

    async function getFolderByPath(folderPath) {
        const shortDescription = `Get folder '${folderPath}'`;
        const ignoreStatusCode = 403; // folder not found
        const getFolderParams = { folderPath };

        return vvClient.library
            .getFolders(getFolderParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode))
            .then((res) => checkDataPropertyExists(res, shortDescription, ignoreStatusCode))
            .then((res) => res.data || null);
    }

    async function createFolderByPath(folderPath, description = '') {
        const shortDescription = `Create folder '${folderPath}'`;
        const folderData = { description };

        try {
            const res = await vvClient.library.postFolderByPath(null, folderData, folderPath);
            const parsed = parseRes(res);
            checkMetaAndStatus(parsed, shortDescription);
            return true;
        } catch (e) {
            logger.info(`Create folder recovery path for '${folderPath}'. Reason: ${String(e)}`);
            return false;
        }
    }

    async function moveDocumentToFolder(folderId, documentId) {
        const shortDescription = `Move Document '${documentId}' to folder '${folderId}'`;
        const moveDocumentParams = { folderId };

        return vvClient.documents
            .moveDocument(null, moveDocumentParams, documentId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function updateFormRecord(
        fieldValuesToUpdate,
        templateName,
        recordGUID,
        shortDescription = `Update form record ${recordGUID}`
    ) {
        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, templateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    async function setOfflineFilesMigratedTrue(formId) {
        const { templateName, revisionId } = await getRecordIdentifiersByFormId(formId);

        const shortDescription = `Set Offline Files Migrated = True for '${formId}'`;

        const formData = {
            'Offline Files Migrated': 'True',
        };

        return updateFormRecord(formData, templateName, revisionId, shortDescription);
    }

    function getDocGuid(doc) {
        // Some endpoints return "documentId" and others return "id".
        return doc?.documentId || doc?.id || '';
    }

    async function getRecordIdentifiersByFormId(formId) {
        const templateName = detectTemplateFromFormId(formId);
        if (!templateName) {
            throw new Error(`Template could not be detected for Form ID '${formId}'.`);
        }

        const shortDescription = `Get record identifiers for '${formId}' (${templateName})`;
        const getFormsParams = {
            q: `[instanceName] eq '${formId}'`,
            fields: 'revisionId,instanceName',
            expand: false,
        };

        const res = await vvClient.forms.getForms(getFormsParams, templateName);
        const parsed = parseRes(res);
        checkMetaAndStatus(parsed, shortDescription);
        checkDataPropertyExists(parsed, shortDescription);

        const record = Array.isArray(parsed.data) ? parsed.data[0] : null;

        const revisionId = record?.revisionId; // Used for postFormRevision

        return { templateName, revisionId };
    }

    /**********
   MAIN CODE
  **********/
    try {
        // Read and validate parameters
        const onlineId = normalizeFormId(getFieldValueByName('Form ID'));
        const offlineId = normalizeFormId(getFieldValueByName('Offline Form ID'));

        // Build source/target TEMP paths
        const baseTempRoot = '/ENFORCEMENT/TEMP';
        const sourcePath = `${baseTempRoot}/${offlineId}`;
        const targetPath = `${baseTempRoot}/${onlineId}`;

        if (!onlineId || !offlineId) {
            throw new Error(errorLog.join('; '));
        }

        // No collision path
        if (onlineId === offlineId) {
            // Mark migrated to avoid workflow re-run
            await setOfflineFilesMigratedTrue(onlineId);

            returnObject = {
                MicroserviceResult: true,
                MicroserviceMessage: 'Microservice completed successfully',
                Status: 'Success',
                Message:
                    'Offline Initial Form ID matches current Form ID. Marked Offline Files Migrated = True. No files moved.',
                OnlineId: onlineId,
                OfflineId: offlineId,
                SourcePath: sourcePath,
                TargetPath: targetPath,
                MovedFiles: [],
                SkippedFiles: [],
                SourceFolderNotDeleted: true,
            };
        } else {
            // Resolve dhid (revisionId) by Form ID
            const { revisionId } = await getRecordIdentifiersByFormId(onlineId);

            // Get record-related docs
            const relatedDocs = await getRelatedDocs(revisionId);

            if (!Array.isArray(relatedDocs) || relatedDocs.length === 0) {
                // Mark migrated to avoid workflow re-run
                await setOfflineFilesMigratedTrue(onlineId);

                returnObject = {
                    MicroserviceResult: true,
                    MicroserviceMessage: 'Microservice completed successfully',
                    Status: 'Success',
                    Message:
                        'No related documents found for this record. Marked Offline Files Migrated = True. No files moved.',
                    OnlineId: onlineId,
                    OfflineId: offlineId,
                    SourcePath: sourcePath,
                    TargetPath: targetPath,
                    dhid: revisionId,
                    MovedFiles: [],
                    SkippedFiles: [],
                    SourceFolderNotDeleted: true,
                };
            } else {
                // Filter only docs currently stored under the offline TEMP folder.
                const candidates = relatedDocs.filter((d) => {
                    const folderPath = d.folderPath || d.FolderPath || '';
                    return (
                        typeof folderPath === 'string' && folderPath.toUpperCase().startsWith(sourcePath.toUpperCase())
                    );
                });

                if (candidates.length === 0) {
                    // Mark migrated to avoid workflow re-run
                    await setOfflineFilesMigratedTrue(onlineId);

                    returnObject = {
                        MicroserviceResult: true,
                        MicroserviceMessage: 'Microservice completed successfully',
                        Status: 'Success',
                        Message:
                            'Related documents found, but none located in the offline TEMP folder. Marked Offline Files Migrated = True. No files moved.',
                        OnlineId: onlineId,
                        OfflineId: offlineId,
                        SourcePath: sourcePath,
                        TargetPath: targetPath,
                        dhid: revisionId,
                        MovedFiles: [],
                        SkippedFiles: relatedDocs.map((d) => ({
                            documentId: getDocGuid(d),
                            fileName: d.fileName || d.name || '',
                            folderPath: d.folderPath || d.FolderPath || '',
                            reason: 'Not in offline TEMP source folder; skipping.',
                        })),
                        SourceFolderNotDeleted: true,
                    };
                } else {
                    // Ensure target folder exists and move candidate docs
                    await createFolderByPath(targetPath, `Synced TEMP folder for ${onlineId}`);

                    const targetFolder = await getFolderByPath(targetPath);
                    const targetFolderId = targetFolder?.id;

                    if (!targetFolderId) {
                        throw new Error(`Target folder could not be found/created: ${targetPath}`);
                    }

                    const movedFiles = [];
                    const skippedFiles = [];

                    for (const d of candidates) {
                        const docGuid = getDocGuid(d);
                        const currentFolderPath = d.folderPath || d.FolderPath || '';

                        if (!docGuid) {
                            skippedFiles.push({
                                documentId: '',
                                fileName: d.fileName || d.name || '',
                                folderPath: currentFolderPath,
                                reason: 'Missing document GUID (documentId/id not present).',
                            });
                            continue;
                        }

                        const movedRes = await moveDocumentToFolder(targetFolderId, docGuid);

                        movedFiles.push({
                            documentId: docGuid,
                            fileName: d.fileName || d.name || '',
                            from: currentFolderPath || sourcePath,
                            to: targetPath,
                            movedFolderPath: movedRes?.folderPath || '',
                            status: 'Moved',
                        });
                    }

                    // Mark migrated to avoid workflow re-run
                    await setOfflineFilesMigratedTrue(onlineId);

                    returnObject = {
                        MicroserviceResult: true,
                        MicroserviceMessage: 'Microservice completed successfully',
                        Status: 'Success',
                        Message: `Moved ${movedFiles.length} related document(s) from offline TEMP to online TEMP. Marked Offline Files Migrated = True.`,
                        OnlineId: onlineId,
                        OfflineId: offlineId,
                        SourcePath: sourcePath,
                        TargetPath: targetPath,
                        dhid: revisionId,
                        MovedFiles: movedFiles,
                        SkippedFiles: skippedFiles,
                        SourceFolderNotDeleted: true,
                    };
                }
            }
        }
    } catch (err) {
        logger.info('Error encountered: ' + String(err));

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: String(err),
            Status: 'Error',
            Message: 'Error moving offline TEMP files to synced Form ID TEMP folder.',
        };
    } finally {
        // Complete workflow execution
        const shortDescription = 'Sending workflow completion response to log server';

        await vvClient.scripts
            .completeWorkflowWebService(executionId, returnObject)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then(() => logger.info('Completion signaled to WF engine successfully.'))
            .catch((e) => logger.info('There was an error signaling WF completion: ' + String(e)));
    }
};
