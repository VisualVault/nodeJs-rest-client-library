/**
 * AGOLSendUpdatedDataToPendingDataForm
 * Category: Scheduled
 * Modified: 2026-02-13T21:26:41.307Z by ross.rhone@visualvault.com
 * Script ID: Script Id: 58e0e733-e5a5-f011-82fa-ec61d8777d62
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-10
 */
const logger = require("../log");
const { stringify } = require("csv/sync");
const crypto = require("crypto");

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
   /*Script Name:   AGOLSendUpdatedDataToPendingDataForm
 Customer:       WA DNR: fpOnline
 Purpose:        Extracts updated fpOnline form data (last 24 hours) and pushes it into the "queue"
                 (PendingDataForAGOL form/table) as CSV documents stored in the VV Document Library.
                 This queue is later consumed by the AGOLPostFponlineDataToAGOLTables process.

                 1° Retrieve list of “count” custom queries for last-24hr changes (GetAGOLCount24CustomQueryNames)
                 2° For each form/table returned:
                    2°a Convert table name abbreviations back to full VV DB names (replace_WA_Adpx)
                    2°b Convert GIS_GetCount24_* → GIS_Get24h_* (the “data pull” query name)
                    2°c Run GIS_GetCount24_* to get total updated row count
                    2°d If 0 rows: log + skip
                    2°e If rows exist: stream the GIS_Get24h_* results in pagination (pages) and build CSV output
                 3° Chunk large CSV output into multiple VV documents (≤ ~9MB each)
                    - Needed because AGOL analyze has a 10MB CSV limit
                 4° For each chunk written:
                    4°a Create VV Document (postDoc) in folderPath (/FailedToUpdateTableInAGOL)
                    4°b Upload CSV file bytes to that document (postFile)
                    4°c Create a PendingDataForAGOL queue record with:
                         - CSVFileDocumentId
                         - CSVFileName
                         - AGOLCSVFileName (the “table title” / target name)
                    4°d Log queued chunk (batchId + part number)

                 0° Error handling:
                    - Fail-fast: if one query fails, remaining queries continue
                    - On failure, sends notification email + communication log via LibEmailGenerateAndCreateCommLogNoRelate
                      using template query GISGetSQLUpdatedDataFailedEmail, with token payload including:
                    - message (error + queryName + environment)
                        - environment (dev, qa, sbox, etc)
                        - failedAtTitle (Name of the table/form that failed)
                        - failedAtQuery (Name of the custom query that failed)
                        - succeeded (Name of successfully processed queries)
                        - skipped (Name of skipped queries)
                        - failed (Name of failed queries)
  
     Date of Dev:   10/09/2025
     Last Rev Date: 
     Revision Notes:
     10/09/2025 - Ross Rhone:  First Setup of the script
     12/05/2025 - Ross Rhone: Added logging based on environment
     01/28/2026 - Ross Rhone:  Adding the process of chunking large csv files into multiple documents in VV doc library
                               due to AGOL's 10MB file size limit for csv file analyze function.

     */
    logger.info(`Start of the process AGOLSendUpdatedDataToPendingDataForm at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // Response array
    let outputCollection = [];
    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    // You will see the responseMessage in the scheduled process log ONLY if the process runs manually.
    response.json(200, `Start of logic for AGOLSendUpdatedDataToPendingDataForm on ${new Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                           Global Variables                           */
    /* -------------------------------------------------------------------------- */

    // Identifies the process in VV servers
    const scheduledProcessGUID = token;

    const emptyJsonFormId = {

        params: JSON.stringify([
            {
                parameterName: 'formId',
                value: ""
            }
        ])
    }

    let currentQueryName = "";
    let currentTitle = "";
    let GISQueries = [];
    let summary = { succeeded: [], skipped: [], failed: [] };


    const templateName = "PendingDataForAGOL";

    const descriptionTest = "TestDescription"

    const folderPath = "/FailedToUpdateTableInAGOL"

    let pendingDataForAGOLResponse = "";

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const jitter = (ms) => {
        const d = Math.floor(ms * 0.2);          // ±20% jitter
        return ms + Math.floor((Math.random() * 2 - 1) * d);
    };


    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

    /**
     * uses vvClient to detect the current environment
     * @param {object} vvClient 
     * @returns "dev" | "qa" | "sandbox" | "production"
     */
    function detectEnvironment(vvClient) {
        // Define known environments and their identifying URL segments.  Add or modify as needed.
        const environments = {
            "vv5dev.visualvault.com": "dev",
            "vv5qa.visualvault.com": "qa",
            "sandbox.visualvault-gov.com": "sandbox",
            "na5.visualvault.com": "production",
        };
        const envUrl = vvClient.getBaseUrl();

        // Find environment by checking if envUrl contains any of the environment keys
        for (const [envKey, envType] of Object.entries(environments)) {
            if (envUrl.includes(envKey)) {
                return envType;
            }
        }

        return "unknown";
    }

    function testCustomQuery(formId, queryName) {

        const formIdJson = createJsonFormId(formId);


        const shortDescription = 'Custom Query using filter parameter for backward compatibility';


        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, formIdJson)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getCustomQueryByPagination(queryName, query) {

        const shortDescription = 'Custom Query using filter parameter for backward compatibility';


        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, query)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
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
            throw new Error(`${shortDescription} error. No meta object found in response. Check method call parameters and credentials.`);
        }

        const status = vvClientRes.meta.status;

        // If the status is not the expected one, throw an error
        if (status != 200 && status != 201 && status != ignoreStatusCode) {
            const errorReason = vvClientRes.meta.errors && vvClientRes.meta.errors[0] ? vvClientRes.meta.errors[0].reason : 'unspecified';
            throw new Error(`AGOLSendUpdatedDataToPendingDataForm: ${shortDescription} error. Status: ${vvClientRes.meta.status}. Reason: ${errorReason}`);
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
                throw new Error(`${shortDescription} data property was not present. Please, check parameters and syntax. Status: ${status}.`);
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
                throw new Error(`${shortDescription} returned no data. Please, check parameters and syntax. Status: ${status}.`);
            }
            // If it is a Web Service response, check that the first value is not an Error status
            if (dataIsArray) {
                const firstValue = vvClientRes.data[0];

                if (firstValue == 'Error') {
                    throw new Error(`${shortDescription} returned an error. Please, check the called Web Service. Status Description: ${vvClientRes.data[1]}.`);
                }
            }
        }
        return vvClientRes;
    }

    function createJsonFormId(fpanId) {
        if (fpanId) {
            return jsonFormId = {

                params: JSON.stringify([
                    {
                        parameterName: 'formId',
                        value: fpanId
                    }
                ])
            }
        } else {
            return emptyJsonFormId;
        }
    }

    // Decide if an error is likely transient
    function isTransient(err) {
        // Generic/network-ish errors
        if (/timeout|network|fetch|failed|ECONNRESET|ETIMEDOUT/i.test(String(err?.message))) return true;
        return false;
    }

    // Generic retry wrapper (exponential backoff + jitter)
    async function withRetry(fn, {
        retries = 3,               // total attempts = 1 + retries
        baseDelayMs = 1000,
        maxDelayMs = 8000,
        label = "operation",
        onRetry = (err, attempt, nextDelay) => {
            logger.info(`AGOLSendUpdatedDataToPendingDataForm: [retry] ${label} attempt ${attempt} failed: ${err?.message || err}. Retrying in ${nextDelay}ms...`);
        }
    } = {}) {
        let attempt = 0;
        let delay = baseDelayMs;

        while (true) {
            try {
                return await fn();
            } catch (err) {
                attempt++;
                if (!isTransient(err) || attempt > retries) throw err;
                const wait = jitter(Math.min(delay, maxDelayMs));
                onRetry(err, attempt, wait);
                await sleep(wait);
                delay = Math.min(delay * 2, maxDelayMs);
            }
        }
    }

    async function createFolder(folderPath, description) {
        const shortDescription = `Post folder '${folderPath}'`;
        const folderData = {
            description,
        };

        return vvClient.library
            .postFolderByPath(null, folderData, folderPath)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data.id);
    }

    async function getFolderId(folderPath) {
        const shortDescription = `Get folder ${folderPath}`;
        // Status code 403 must be ignored (not throwing error) because it means that the folder doesn't exist
        const ignoreStatusCode = 403;
        const getFolderParams = {
            folderPath,
        };

        return vvClient.library
            .getFolders(getFolderParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode))
            .then((res) => checkDataPropertyExists(res, shortDescription, ignoreStatusCode))
            .then((res) => checkDataIsNotEmpty(res, shortDescription, ignoreStatusCode))
            .then((res) => (res.data ? res.data.id : null));
    }

    function createDocName(formName, currentDate) {
        const currentDateTime = currentDate.toISOString();
        let docName = formName + "_" + currentDateTime;
        // Create document in the VV Document Library
        return docName;
    }

    async function postDoc(docName, folderId) {
        const shortDescription = `DOR FPAN Permit(s) '${docName}'`;
        const docParams = {
            documentState: 1,
            name: `${docName}`,
            description: `DOR FPAN Permit(s) ${docName}`,
            revision: '0',
            changeReason: 'AGOL tables 24hr Data Update - Create Document',
            allowNoFile: true,
            fileLength: 0,
            fileName: `${docName}.csv`,
            indexFields: '{}',
            folderId: folderId,
        };

        return vvClient.documents
            .postDoc(docParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function postFile(docData, fileBuffer) {
        const shortDescription = `Post file for '${docData.name}'`;
        const fileParams = {
            documentId: `${docData.id}`,
            name: `${docData.name}`,
            revision: '1',
            changeReason: 'AGOL tables 24hr Data Update - Create File',
            checkInDocumentState: 'Released',
            fileName: `${docData.fileName}`,
            indexFields: '{}',
        };

        return vvClient.files
            .postFile(fileParams, fileBuffer)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }


    async function putUpdatedFormDataInVVDocLib(docName, folderId, failedData) {
        const docData = await postDoc(docName, folderId);

        const fileBuffer = Buffer.from(failedData, 'utf-8');

        const fileData = await postFile(docData, fileBuffer);
        return fileData;
    }

    function createPendingDataSubForm(csvData, title) {
        const shortDescription = `Post form ${templateName}`;
        const newRecordData = {
            // You can convert these values or this object to arguments of this function
            'CSVFileDocumentId': csvData.data.documentId,
            'CSVFileName': csvData.data.fileName,
            'AGOLCSVFileName': title
        };

        return vvClient.forms
            .postForms(null, newRecordData, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function postCSVFileToDocLib(GISQueries) {

        const succeeded = [];
        const failed = [];
        const skipped = [];  // items attempted but skipped (e.g., 0 rows)

        let i = 0; //index

        let cqNameAll = "";



        for (const { title, cqName } of GISQueries) {
            //Can change to GIS_GetCount_ and GIS_GetAll_ to retrieve all records instead of just 24hr changes
            //2°b Convert GIS_GetCount24_* → GIS_Get24h_* (the “data pull” query name)
            currentTitle = title;
            cqNameAll = cqName.replace("GIS_GetCount24_", "GIS_Get24h_");
            currentQueryName = cqNameAll;

            try {
                //2°c Run GIS_GetCount24_* to get total updated row count
                const totalRecordResponse = await withRetry(() => testCustomQuery(null, cqName), {
                    label: `testCustomQuery(${cqName})`,
                    retries: 2
                });

                let totalRecordCount = 0;
                //2°d If 0 rows: log + skip
                if (!totalRecordResponse || totalRecordResponse.length === 0) {
                    logger.info(`AGOLSendUpdatedDataToPendingDataForm: No records found for ${title}`);
                    skipped.push({
                        title,
                        cqName,
                        reason: "No records returned"
                    });
                    i++;
                    continue;
                } else {
                    //2°e If rows exist: stream the GIS_Get24h_* results in pagination (pages) and build CSV output
                    totalRecordCount = totalRecordResponse[0].totaL_ROWS;

                    if (totalRecordCount === 0) {
                        skipped.push({
                            title,
                            cqName,
                            reason: "No records returned"
                        });
                            i++;
                            continue;
                    }

                    await streamQueryToChunkedCsvDocs(totalRecordCount, {
                        title,
                        totalRecordCount,
                        cqNameAll,
                        folderPath,
                        maxChunkBytes: 9 * 1024 * 1024
                    });

                    succeeded.push({ title, cqName });
                }
            } catch (error) {
                failed.push({ title, cqName, index: i, error: error.message });
            }
            i++;
        }
        logger.info("AGOLSendUpdatedDataToPendingDataForm: ==== SUMMARY ====");
        logger.info(`AGOLSendUpdatedDataToPendingDataForm: Total:     ${GISQueries.length}`);
        logger.info(`AGOLSendUpdatedDataToPendingDataForm: Succeeded: ${succeeded.length}`);
        logger.info(`AGOLSendUpdatedDataToPendingDataForm: Skipped:   ${skipped.length}`);
        logger.info(`AGOLSendUpdatedDataToPendingDataForm: Failed:    ${failed.length}`);

        return { succeeded, skipped, failed };
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

    async function sendNotificationEmail(emailTemplate, tokens) {
        const emailRequestArr = [
            { name: 'Email Name', value: emailTemplate["email Name"] },
            { name: 'Tokens', value: tokens },
            { name: 'Email Address', value: emailTemplate["send To"] },
            { name: 'Email AddressCC', value: emailTemplate["send CC"] },
            { name: 'SendDateTime', value: new Date().toISOString() },
            {
                name: 'OTHERFIELDSTOUPDATE',
                value: {},
            },
        ];
        const [LibEmailGenerateAndCreateCommunicationLogStatus, , comLogResult] = await callExternalWs(
            'LibEmailGenerateAndCreateCommLogNoRelate',
            emailRequestArr
        );

        if (LibEmailGenerateAndCreateCommunicationLogStatus !== 'Success') {
            throw new Error('Error sending notifications.');
        }

        return comLogResult;
    }

    //Using the replaces function to make names under the 55 character limit in VV's database
    function replace_WA_Adpx(tableName) {
        return tableName
            .replace(/\bApdx\b/g, "Appendix")
            .replace(/\bWa\b/g, "Washington")
            .replace(/\bNat\b/g, "Natural")
            .replace(/\bReg\b/g, "Regeneration")
            .replace(/\bEA\b/g, "Eastern")
            .replace(/\bPrac\b/g, "Practices")
            .replace(/\bFor\b/g, "Forest")
            .replace(/\bForry\b/g, "Forestry");

    }

    function utf8Bytes(str) {
        return Buffer.byteLength(str, "utf8");
    }

    function makeHeaderCsv(columns, { bom = true } = {}) {
        // header only (no rows)
        return stringify([], { header: true, columns, bom });
    }

    function makeRowCsvLine(row, columns) {
        // one row, no header
        return stringify([row], { header: false, columns });
    }

    function createCsvChunkWriter({
        maxBytes = 9 * 1024 * 1024,
        columns,
        title,
        folderId,
        currentDate,
        batchId,
        flushChunk,   // async ({ csv, chunkIndex, chunkCountUnknownYet }) => void
        bomEveryChunk = true, // set false if you only want BOM on chunk 1
    }) {
        if (!columns || columns.length === 0) throw new Error("columns required");

        let chunkIndex = 0;
        let headerCsv = makeHeaderCsv(columns, { bom: true });
        let headerBytes = utf8Bytes(headerCsv);

        let parts = [];          // array of csv lines (strings)
        let sizeBytes = headerBytes;

        async function flush() {
            if (parts.length === 0) return; // nothing to flush

            chunkIndex++;

            const bom = bomEveryChunk ? true : (chunkIndex === 1);
            const header = makeHeaderCsv(columns, { bom });
            const csv = header + parts.join("");

            // sanity check
            const csvBytes = utf8Bytes(csv);
            if (csvBytes > maxBytes) {
                throw new Error(`Chunk ${chunkIndex} exceeded maxBytes unexpectedly: ${csvBytes} > ${maxBytes}`);
            }

            await flushChunk({ csv, chunkIndex, batchId });

            // reset for next chunk
            parts = [];
            headerCsv = header;                 // reuse last-built header (minor)
            headerBytes = utf8Bytes(headerCsv);
            sizeBytes = headerBytes;
        }

        function addRow(row) {
            const line = makeRowCsvLine(row, columns);
            const lineBytes = utf8Bytes(line);

            // If a single row cannot fit in an empty chunk, chunking won’t help.
            if (headerBytes + lineBytes > maxBytes) {
                throw new Error(`Single row exceeds max chunk size (${maxBytes} bytes).`);
            }

            // If adding this line would exceed limit, signal caller to flush first
            if (sizeBytes + lineBytes > maxBytes) {
                return { needsFlush: true };
            }

            parts.push(line);
            sizeBytes += lineBytes;
            return { needsFlush: false };
        }

        return {
            addRow,
            flush,
            getChunkIndex: () => chunkIndex,
        };
    }

    //3° Chunk large CSV output into multiple VV documents (≤ ~9MB each)
    // - Needed because AGOL analyze has a 10MB CSV limit
    async function streamQueryToChunkedCsvDocs(totalRecordCount,{
        title,
        cqNameAll,            // GIS_GetAll_...
        folderPath,
        maxChunkBytes = 9 * 1024 * 1024,
    }) {
        // Ensure folder
        let folderId = await getFolderId(folderPath);
        if (folderId === null) folderId = await createFolder(folderPath, descriptionTest);

        const currentDate = new Date();
        const batchId = (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"));

        const PAGE_SIZE = 2000;
        let offset = 0;

        let writer = null;
        //4°a Create VV Document (postDoc) in folderPath (/FailedToUpdateTableInAGOL)
        // A small helper that actually writes one chunk to VV + pending form
        const flushChunk = async ({ csv, chunkIndex, batchId }) => {
            const docName =
                `${createDocName(title, currentDate)}__batch_${batchId}__part_${String(chunkIndex).padStart(3, "0")}`;
            
            //4°b Upload CSV file bytes to that document (postFile)
            const fileDataResponse = await putUpdatedFormDataInVVDocLib(docName, folderId, csv);

            if (fileDataResponse?.meta?.status !== 200) {
                throw new Error(`Failed to post ${docName} to docLib. Status=${fileDataResponse?.meta?.status}`);
            }
            //4°c Create a PendingDataForAGOL queue record with:
            //                         - CSVFileDocumentId
            //                         - CSVFileName
            //                         - AGOLCSVFileName (the “table title” / target name)
            // Create pending queue row (add these fields to template if you can)
            pendingDataForAGOLResponse = await createPendingDataSubForm(fileDataResponse, title, {
                batchId,
                chunkIndex,
                // chunkCount unknown at this moment (unless you buffer all chunks)
                sourceCqName: cqNameAll
            });

            if (!pendingDataForAGOLResponse?.instanceName) {
                throw new Error(`Failed to create PendingDataForAGOL for chunk ${chunkIndex} (${docName})`);
            }
            //4°d Log queued chunk (batchId + part number)
            //logger.info(`AGOLSendUpdatedToPendingDataForm: Queued ${title} chunk ${chunkIndex} (batchId=${batchId})`);
        };

        const seen = new Set(); // to acccount for potential duplicates

        while (offset < totalRecordCount) {
            const query = { sort: "vvCreateDate", sortdir: "desc", limit: PAGE_SIZE, offset };
            const rows = await getCustomQueryByPagination(cqNameAll, query);

            if (!rows || rows.length === 0) break;

            // Initialize writer once we know columns (from first row)
            if (!writer) {
                const columns = Object.keys(rows[0]);
                writer = createCsvChunkWriter({
                    maxBytes: maxChunkBytes,
                    columns,
                    title,
                    folderId,
                    currentDate,
                    batchId,
                    flushChunk,
                    bomEveryChunk: true,
                });
            }

            // Stream rows into chunk writer
            for (const row of rows) {
                const key = row.dhDocID;
                if (key && seen.has(key)) continue; // to acccount for potential duplicates
                if (key) seen.add(key);

                const { needsFlush } = writer.addRow(row);
                if (needsFlush) {
                    await writer.flush();           // flush current chunk
                    const again = writer.addRow(row); // re-add row (it fits in empty chunk)
                    if (again.needsFlush) {
                        // Should never happen because we check single-row oversize
                        throw new Error("Unexpected: row still needsFlush after flush()");
                    }
                }
            }

            offset += PAGE_SIZE;
        }

        // Flush remaining rows in the final chunk
        if (writer) {
            await writer.flush();
        }

        //logger.info(`AGOLSendUpdatedToPendingDataForm: Finished streaming ${title} (batchId=${batchId})`);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {

        //If there is ever a need to do a full migration of all records use the query
        //GetAGOLCountCustomQueryNames this will return the total record count for each form
        //Then use the GIS_GetAll_ custom queries to pull all records from each form

        //1° Retrieve list of “count” custom queries for last-24hr changes (GetAGOLCount24CustomQueryNames)
        const customQueryNames = await testCustomQuery(null, "GetAGOLCount24CustomQueryNames");

        //2° For each form/table returned, build GISQueries array
        for (const row of customQueryNames) {
            const cqName = row.cqName;
            const tableName = row.tableName;
            //2°a Convert table name abbreviations back to full VV DB names (replace_WA_Adpx)
            const fullTableName = replace_WA_Adpx(tableName);
            const customQuery = {
                title: fullTableName,
                cqName: cqName
            }
            GISQueries.push(customQuery);
        }

        summary = await postCSVFileToDocLib(GISQueries);

        statusMessage = "Completed all queries."

        if(summary.failed.length > 0){
            throw new Error("One or more queries failed. See summary for details.");
        }

        // You will see the responseMessage in the scheduled process log ONLY if the process runs automatically.
        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, statusMessage);
    } catch (error) {
        //0° Error handling:
        //- Fail-fast: if one query fails, remaining queries continue
        //- On failure, sends notification email + communication log via LibEmailGenerateAndCreateCommunicationLog
        //    using template query GISGetSQLUpdatedDataFailedEmail, with token payload including:
        //       -  message (error + queryName + environment)
        //       -  environment (dev, qa, sbox, etc)
        //       -  failedAtTitle (Name of the table/form that failed)
        //       -  failedAtQuery (Name of the custom query that failed)
        //       -  succeeded (Name of successfully processed queries)
        //       -  skipped (Name of skipped queries)
        //       -  failed (Name of failed queries)
        logger.error(`AGOLSendUpdatedDataToPendingDataForm: Error encountered ${error}`);
        logger.error("Scheduled Service: AGOLSendUpdatedDataToPendingDataForm failed!");

        logger.error("AGOLSendUpdatedDataToPendingDataForm: ==== SUMMARY ====");
        logger.error(`AGOLSendUpdatedDataToPendingDataForm: Total:     ${GISQueries.length}`);
        logger.error(`AGOLSendUpdatedDataToPendingDataForm: Succeeded: ${summary?.succeeded.length}`);
        logger.error(`AGOLSendUpdatedDataToPendingDataForm: Skipped:   ${summary?.skipped.length}`);
        logger.error(`AGOLSendUpdatedDataToPendingDataForm: Failed:    ${summary?.failed.length}`);


        const emailTemplate = await testCustomQuery(null, "GISGetSQLUpdatedDataFailedEmail");
        const currentEnv = detectEnvironment(vvClient);

        const tokens = [
            { name: 'message', value: error + " .Failed during " + currentQueryName + ".Failed to query updated data for " + currentEnv + " AGOL tables" },
            { name: "environment", value: currentEnv },
            { name: "failedAtTitle", value: currentTitle },
            { name: "failedAtQuery", value: currentQueryName },
            { name: "succeeded", value: JSON.stringify(summary?.succeeded || [], null, 2) },
            { name: "skipped", value: JSON.stringify(summary?.skipped || [], null, 2) },
            { name: "failed", value: JSON.stringify(summary?.failed || [], null, 2) }
        ]

        await sendNotificationEmail(emailTemplate[0], tokens)

        // BUILD THE ERROR RESPONSE ARRAY

        outputCollection[0] = 'Error'; // Don´t change this

        if (error?.originalMessage) {
            error = error.name + " " + error.originalMessage;
        } else {
            error = error.message;
        }

        if (errorLog.length > 0) {
            responseMessage = `Some errors occurred. Error/s: ${errorLog.join('; ')}`;
        } else {
            responseMessage = error.message
                ? error.message
                : `Unhandled error occurred: ${error}`;
        }
        logger.info(`End of the process AGOLSendUpdatedDataToPendingDataForm at ${Date()}`);

        // You will see the responseMessage in the scheduled process log ONLY if the process runs automatically.
        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', false, responseMessage);
    }
}
