/**
 * LibBoxPushFilesToBox
 * Category: Form
 * Modified: 2026-04-06T17:24:16.267Z by ross.rhone@visualvault.com
 * Script ID: Script Id: cbafe8b0-e22a-f011-82d8-c702f4413de2
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const https = require('https');
const FormData = require('form-data');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

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
    Script Name:    LibBoxPushFilesToBox
    Customer:       WADNR
    Purpose:        This script is responsible for pushing a file marked offline from VisualVault to Box.
    Preconditions:
                    - Box account with at least Business level subscription
    Parameters:
                    - Doc ID: ID of document to upload
                    - File Name: Name of the document to upload
                    - File Path: Path in box where the document should be uploaded
    Return Object:
                    1. MicroserviceResult - Return true if process ran successfully.  Return false if an error occurred.
                    2. MicroserviceMessage - Message about what happened.
                    3. FileID - ID of file in box
    Psuedo code: 
                    1. RETRIEVE WORKFLOW VARIABLE VALUES
                    2. GET FILE BYTES
                    3. ENSURE FOLDER EXISTS IN BOX
                    4. UPLOAD FILE TO BOX
                    5. ADD METADATA TO FILE
                    6. RETURN RESPONSE

    Date of Dev:    07/22/2021
    Last Rev Date: 

    Revision Notes:
    05/06/2025 - Austin Stone:  First Setup of the script
    08/27/2025 - Austin Stone: Changing dhid to documentId for getDocuments API
    09/03/2025 - Austin Stone: Added more logging, added Box Synchronization Log Creation
    11/13/2025 - Ross Rhone: Removed BOX_ROOT_FOLDER variable and updated filePath logic
    03/17/2026 - Ross Rhone: Adding folders for WTMs in box
    03/26/2026 - Ross Rhone: Added retry logic for Box API token retrieval and requests
    03/31/2026 - Ross Rhone Added retry logic for file uploads and metadata association 
    */
    const processStart = Date.now();

    function logElapsed(label, startTime) {
        logger.info(`${label} | elapsedMs=${Date.now() - startTime}`);
    }

    logger.info('Start of the process LibBoxPushFilesToBox at ' + Date());

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

    /*****************
     Script Variables
    ******************/

    // Describes the process being checked using the parsing and checking helper functions
    let shortDescription = '';
    // Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete.
    const executionId = response.req.headers['vv-execution-id'];

    /***********************
     Configurable Variables
    ************************/

    const BOX_API_BASE = 'api.box.com';
    const ROOT_FOLDER = '0';
    const BOX_ROOT_FOLDER = 'BOX_ROOT_FOLDER';
    const METADATA_TEMPLATE_NAME = 'fpmetadata';

    const BOX_PUBLIC_KEY = 'r9l6gjaa';
    const BOX_PRIVATE_KEY =
        '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIFLTBXBgkqhkiG9w0BBQ0wSjApBgkqhkiG9w0BBQwwHAQI2fIgbFNOVd0CAggA\nMAwGCCqGSIb3DQIJBQAwHQYJYIZIAWUDBAEqBBB0Xs+b0q/pxENuMv20OwhDBIIE\n0K9zrnXcW4u976pd7zGn5fb2cLqp4MmHyefD7CnupFVRb7oyt+nMEdeicWBMXQzb\nA6Gi3uSVNB9f/GvQSl7cB8dEBBbuCLu5W+OfgveJ6R5DOExvhvMS/bJyKE3nVKfe\nvlOk/RqhO7w6q3CoDzW824d4UJnlPhx/YE7xPKxb+I5mZ0p3YT8UW/Y5PH006Ith\nq8Fipn+l6cuF5pH9WDWBJj1sSeF5OC0QEryeGd/5NvluYyNKoc772FEuvTzhLpTg\n3ydV0sTNW2wInxGua6n3HlVpIYOS09gF9gJRI/8ni3vXy3YXfRkychRqroamB4Jd\n+PbaxPeZkCjGC22mBP54fJVJs9kMFpAu5G6RZNzHVJ1UwHrwXwtt51MHFJ8M2QxL\nNl5yAhwlE5acbNvOYpXGDVxE7Kc/JoHKr9OtCtcnLQmjq8ONhcEejlRthazqYKF6\nZThL7GHC/64xTMFemCLUc5zaS9d17bVS0Sd6NkyOUoRV80ZAkWVUQC14U8hbXPnl\nGjC9ytD40gF3On8T0S1S5ssbS6IVL2U8mPcNSgVgIqTiscSXOlR/UFfPXfgnSIo2\nrf1DYs3IUelECwgB+jX3/umJmzOTDfKtci/HaOGdo4jvXAwdcS1V7MC1qQLo9D9D\nqSgHGbD4CH3ynfVg87hzipIVP6WPxX/ZiQZooK9reJCpbzrNlh/y6cqspfGBDrQh\nSfW+mIAy1jXIFMN9YSO1hnRo5pJ9Fp6d1vs1sUQTtcBo4hyCD8ollJDnDFTpQvzZ\nPo4u0riRE32bw5YmWtlk1bi1z2lU4KMv83FfaoWeRxTI3aBlIeY9kkwHNagmaPca\nPzscLMOKeVik11NMNssDkJJVDPboNYL2CPRFQcp6KLKC+pxzpjcOKIzUvVHPUW+X\nT3Zcqo3wxXCQHyfz8qRjyhjLpAZDROeSWTWo6X+rkk69nYD7nhQ7IyTz+jDxxP63\nqQSceLvgysiiXHm8dVK1n+R8zdusD+0tLMbqwsgeLBCAfwzQRqyTgM9bPeQQjyzC\nVehlN+Zfnw837cLy1++FjVyXYe64/72F71AibHJFpssDmHoD3qmYI208CKyESVW2\n/r56XpBMJ7kBym6ugw2EwQ8CSZEZE/NYKmHxppmOJCJjxvmMfpBsRqugRXs+NTTB\n8RQNxdTZcXB1trY8Laor0+Y9YKq6ZCWaWW57oeQKAQ1WIKLB50+8sQkrjpkPxyiY\noSusR6MG10TwDgLa5C6ErGj5V4wzIJ/XD56pTuIUmZ7+u6PqFxD5Q6tQTiShA6aQ\n9VsIKNN+vHSKAHuIzWnClSP69BblAwp4vR/3meuMRlVWccmxBq9fQPI+bXOovWXo\nDMkueL/ErDaIeP4Qe8ZOLCJVMH2hWjXC2QckvSZxMHvmoatIIKb80AgUwxuyIZr6\niOjUrO5pnp2u1LYr/cxfErZDSEiJU1uETk2rKsBF2/FUGxDbwhsbhab1Xi4nhbl/\n5ghXFQ1nBK3B/WIRghBxA6dQ0jGL4uZWDE90AawgBk7xZv/qBGL53InYmGbL2nTf\nGoHLbu+qscVxPFdc4VDR8ACfABNVCaBi+3fKrZnaz2IjW9Ozom6yD+P5XL64pxCU\nIJisIcVKcxkWMUScN83DBDj2ueQa90jZzebHISdmCA3j\n-----END ENCRYPTED PRIVATE KEY-----\n';
    const BOX_PASSPHRASE = '71d641190f22501c7b46784f62745409';
    const BOX_ENTERPRISE_ID = '1299448262';
    const BOX_CLIENT_ID = 'u7hsoeuiulericyvonf1adj1f8u6qoss';
    const BOX_CLIENT_SECRET = 'QmzvIosXFlVxLVxQDnFS5kP5AhS1XpRB';

    /* -------------------------------------------------------------------------- */
    /*                              Authentication                                */
    /* -------------------------------------------------------------------------- */

    async function getAccessToken(token) {
        const params = new URLSearchParams();
        params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
        params.append('client_id', BOX_CLIENT_ID);
        params.append('client_secret', BOX_CLIENT_SECRET);
        params.append('assertion', token);

        const tokenResponse = await axios.post('https://api.box.com/oauth2/token', params);

        return tokenResponse.data.access_token;
    }

    async function getAccessTokenWithRetry(token, maxRetries = 3) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await getAccessToken(token);
            } catch (error) {
                lastError = error;
                logger.warn(
                    `LibBoxPushFilesToBox: Box token request failed on attempt ${attempt} of ${maxRetries}. ${error.message}`
                );
            }
        }

        const err = new Error('Failed to get token from Box');
        err.cause = lastError;
        throw err;
    }

    let ACCESS_TOKEN;

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
        }

        return fieldValue;
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

    async function getFileBytes(docGUID) {
        let res = await vvClient.files.getFileBytesId(docGUID);

        return res;
    }

    function boxApiRequest(method, path, data = null, isUpload = false, contentType = null) {
        const requestContentType = contentType || (isUpload ? 'multipart/form-data' : 'application/json');

        let params = {
            method: method,
            url: `https://${BOX_API_BASE}${path}`,
            headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': requestContentType,
            },
        };

        if (data) params['data'] = data;

        return axios(params)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                const err = new Error(error.response?.data?.message || error.message || 'Box API request failed');

                err.status = error.response?.status;
                err.code = error.code;
                err.data = error.response?.data;

                throw err;
            });
    }

    function shouldRetryBoxApiRequest(error) {
        const status = error?.status;

        if (!status) {
            return true;
        }

        return status === 429 || status >= 500;
    }

    function shouldRetryBoxUpload(error) {
        const status = error?.status;

        if (!status) {
            return true;
        }

        return status === 429 || status >= 500;
    }

    function shouldRetryBoxMetadata(error) {
        const status = error?.status;

        if (!status) {
            return true;
        }

        return status === 429 || status >= 500;
    }

    function shouldUpdateExistingMetadata(error) {
        const status = error?.status;

        return status === 400 || status === 409;
    }

    async function boxApiRequestWithRetry(
        method,
        path,
        data = null,
        isUpload = false,
        contentType = null,
        maxRetries = 3
    ) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await boxApiRequest(method, path, data, isUpload, contentType);
            } catch (error) {
                lastError = error;

                if (attempt === maxRetries || !shouldRetryBoxApiRequest(error)) {
                    throw error;
                }

                logger.warn(
                    `LibBoxPushFilesToBox: Box API request failed on attempt ${attempt} of ${maxRetries} for ${method} ${path}. ${error.message}`
                );
            }
        }

        throw lastError;
    }

    async function ensureBoxFolder(directoryPath, parentFolderId = ROOT_FOLDER) {
        const folders = directoryPath.split('/'); // Split the path into folder levels
        let currentParentId = parentFolderId;

        for (let i = 0; i < folders.length; i++) {
            const folderName = folders[i].toLowerCase();

            // Check for the folder only if we're still in known territory
            const existingFolders = await boxApiRequestWithRetry('GET', `/2.0/folders/${currentParentId}/items`);
            let existingFolder = existingFolders.entries.find(
                (f) => f.type === 'folder' && f.name.toLowerCase() === folderName
            );

            if (!existingFolder) {
                // If a folder is missing, create everything from this point onward
                for (let j = i; j < folders.length; j++) {
                    const folderData = JSON.stringify({ name: folders[j], parent: { id: currentParentId } });
                    const createdFolder = await boxApiRequestWithRetry('POST', '/2.0/folders', folderData);
                    currentParentId = createdFolder.id; // Move to the newly created folder
                }
                return currentParentId; // Return last created folder ID
            }

            currentParentId = existingFolder.id; // Move deeper into the hierarchy
        }

        return currentParentId; // Return final existing folder ID
    }

    async function checkFileExists(fileName, folderId) {
        const path = `/2.0/folders/${folderId}/items`;
        const response = await boxApiRequestWithRetry('GET', path);

        // Check if file exists
        const existingFile = response.entries.find((f) => f.type === 'file' && f.name === fileName);
        return existingFile ? existingFile.id : null;
    }

    async function uploadToBox(buffer, fileName, folderId) {
        const existingFileId = await checkFileExists(fileName, folderId);
        const isVersionUpload = Boolean(existingFileId);
        const uploadPath = isVersionUpload ? `/api/2.0/files/${existingFileId}/content` : '/api/2.0/files/content';

        if (isVersionUpload) {
            logger.info(
                `LibBoxPushFilesToBox (ID: ${docID}) File "${fileName}" already exists in folder ${folderId}. Uploading a new version to Box fileId: ${existingFileId}`
            );
        }

        return new Promise((resolve, reject) => {
            const form = new FormData();
            form.append('file', buffer, { filename: fileName });
            form.append('attributes', JSON.stringify({ name: fileName, parent: { id: folderId } }));

            const options = {
                hostname: 'upload.box.com',
                path: uploadPath,
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    ...form.getHeaders(),
                },
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', async () => {
                    let uploadResponse;

                    try {
                        uploadResponse = JSON.parse(body);
                    } catch (parseError) {
                        const err = new Error(
                            `Invalid JSON response from Box. Status: ${res.statusCode}. Body: ${body}`
                        );
                        err.status = res.statusCode;
                        return reject(err);
                    }

                    // Non-2xx response from Box
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        const err = new Error(
                            `Upload failed. Status: ${res.statusCode}. Response: ${JSON.stringify(uploadResponse)}`
                        );
                        err.status = res.statusCode;
                        err.data = uploadResponse;
                        return reject(err);
                    }

                    // Expected successful upload response structure:
                    // { total_count: 1, entries: [ { id: "..." } ] }
                    const totalCount = Number(uploadResponse?.total_count ?? 0);
                    const entries = Array.isArray(uploadResponse?.entries) ? uploadResponse.entries : [];

                    if (totalCount < 1) {
                        return reject(
                            new Error(
                                `Upload appeared to succeed, but Box returned total_count=${uploadResponse?.total_count}. Response: ${JSON.stringify(uploadResponse)}`
                            )
                        );
                    }

                    if (entries.length < 1) {
                        return reject(
                            new Error(
                                `Upload appeared to succeed, but Box returned no entries. Response: ${JSON.stringify(uploadResponse)}`
                            )
                        );
                    }

                    const uploadedFile = entries[0];
                    const uploadedFileId = uploadedFile?.id;

                    if (!uploadedFileId) {
                        return reject(
                            new Error(
                                `Upload appeared to succeed, but uploaded file ID was missing. Response: ${JSON.stringify(uploadResponse)}`
                            )
                        );
                    }

                    logger.info(
                        `LibBoxPushFilesToBox (ID: ${docID}) ${isVersionUpload ? 'Uploaded a new version of' : 'Uploaded'} "${fileName}" to folder ${folderId}. Box fileId: ${uploadedFileId}, total_count: ${totalCount}`
                    );

                    resolve(uploadedFileId);
                });
            });

            req.on('error', (err) => {
                const uploadErr = new Error(`Box upload request error: ${err.message}`);
                uploadErr.code = err.code;
                reject(uploadErr);
            });

            form.pipe(req);
        });
    }

    async function uploadToBoxWithRetry(buffer, fileName, folderId, maxRetries = 3) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await uploadToBox(buffer, fileName, folderId);
            } catch (error) {
                lastError = error;

                if (attempt === maxRetries || !shouldRetryBoxUpload(error)) {
                    throw error;
                }

                logger.warn(
                    `LibBoxPushFilesToBox: Box upload failed on attempt ${attempt} of ${maxRetries} for document ${docID}. ${error.message}`
                );
            }
        }

        throw lastError;
    }

    function convertToJSONPatch(metadata) {
        return Object.keys(metadata).map((key) => ({
            op: 'replace',
            path: `/${key}`,
            value: metadata[key],
        }));
    }

    async function addOrUpdateMetadata(fileId, metadata, templateName, maxRetries = 3) {
        const metadataPath = `/2.0/files/${fileId}/metadata/enterprise/${templateName}`;

        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const createResponse = await boxApiRequestWithRetry('POST', metadataPath, JSON.stringify(metadata));

                if (createResponse['$id']) {
                    return createResponse;
                }

                throw new Error(`Metadata creation failed: ${JSON.stringify(createResponse)}`);
            } catch (error) {
                lastError = error;

                if (shouldUpdateExistingMetadata(error)) {
                    logger.info(
                        `LibBoxPushFilesToBox (ID: ${docID}) Metadata already exists for file ${fileId}, updating instead.`
                    );
                    const patchOperations = convertToJSONPatch(metadata);

                    return boxApiRequestWithRetry(
                        'PUT',
                        metadataPath,
                        JSON.stringify(patchOperations),
                        false,
                        'application/json-patch+json'
                    );
                }

                if (attempt === maxRetries || !shouldRetryBoxMetadata(error)) {
                    throw error;
                }

                logger.warn(
                    `LibBoxPushFilesToBox: Box metadata request failed on attempt ${attempt} of ${maxRetries} for file ${fileId}. ${error.message}`
                );
            }
        }

        throw lastError;
    }

    function getDocuments(docID) {
        const shortDescription = `Get Documents Data for '${docID}'`;
        const getDocsParams = {
            q: `documentId = '${docID}'`, // docID = "DOC-000001"
            // q: `FolderPath = '${folderPath}'`,
        };

        return vvClient.documents
            .getDocuments(getDocsParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function logBOXActivity(docID, fileName, folderPath, isSuccess, featureMsg) {
        const shortDescription = `Post form Box Synchronization Log`;
        const WADNR_TIMEZONE = 'America/Los_Angeles';
        const dateISOStringFormat = 'YYYY-MM-DD HH:mm:ss';
        const syncDateTimePacific = `${dayjs().tz(WADNR_TIMEZONE).format(dateISOStringFormat)}`;
        const newRecordData = {
            // You can convert these values or this object to arguments of this function
            'Sync Date Time': syncDateTimePacific,
            'Document ID': docID,
            'File Name': fileName,
            'Folder Path': folderPath,
            Operation: 'Upload',
            'Sync Direction': 'To Box',
            'Success Or Failure': isSuccess == true ? 'Success' : 'Failure',
            'User Account Used To Sync': BOX_ENTERPRISE_ID,
            'Feature Message': featureMsg,
        };

        return vvClient.forms
            .postForms(null, newRecordData, 'Box Synchronization Log')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function convertToAbbreviation(value) {
        switch (value.toLowerCase()) {
            case 'northeast':
            case 'ne':
                return 'NE';
            case 'northwest':
            case 'nw':
                return 'NW';
            case 'olympic':
            case 'ol':
            case 'oly':
                return 'OLY';
            case 'pacific cascade':
            case 'pc':
                return 'PC';
            case 'south puget sound':
            case 'sp':
            case 'sps':
                return 'SPS';
            case 'southeast':
            case 'se':
                return 'SE';
            default:
                return '';
        }
    }

    /**********
     MAIN CODE 
    **********/

    let docID;
    let fileName;
    let fileType;
    let region;
    let FPANumber;
    let filePath;

    try {
        // 1. RETRIEVE WORKFLOW VARIABLE VALUES
        docID = getFieldValueByName('Doc ID');
        fileName = getFieldValueByName('File Name');
        fileType = getFieldValueByName('Document Type');
        region = getFieldValueByName('Region');
        FPANumber = getFieldValueByName('FPA Number');

        logger.info(`LibBoxPushFilesToBox (ID: ${docID}): variables loaded (1)`);

        const claims = {
            iss: BOX_CLIENT_ID,
            sub: BOX_ENTERPRISE_ID,
            box_sub_type: 'enterprise',
            aud: 'https://api.box.com/oauth2/token',
            jti: require('crypto').randomBytes(64).toString('hex'),
            exp: Math.floor(Date.now() / 1000) + 60,
        };

        const token = jwt.sign(
            claims,
            {
                key: BOX_PRIVATE_KEY,
                passphrase: BOX_PASSPHRASE,
            },
            {
                algorithm: 'RS512',
                header: {
                    kid: BOX_PUBLIC_KEY,
                },
            }
        );

        try {
            ACCESS_TOKEN = await getAccessTokenWithRetry(token);
        } catch (error) {
            throw new Error('Failed to get token from Box');
        }

        // 1. RETRIEVE WORKFLOW VARIABLE VALUES
        docID = getFieldValueByName('Doc ID');
        fileName = getFieldValueByName('File Name');
        fileType = getFieldValueByName('Document Type');
        region = getFieldValueByName('Region');
        FPANumber = getFieldValueByName('FPA Number');

        logger.info(`LibBoxPushFilesToBox (ID: ${docID}): variables loaded (1)`);

        let doc = (await getDocuments(docID))[0];

        logger.info(`LibBoxPushFilesToBox (ID: ${docID}): document loaded (2)`);
        logger.info(`LibBoxPushFilesToBox (ID: ${docID}): region: ${region})`);
        logger.info(`LibBoxPushFilesToBox (ID: ${docID}): FPANumber: ${FPANumber})`);
        logger.info(`LibBoxPushFilesToBox (ID: ${docID}): fileType: ${fileType})`);

        if (region) {
            const regionAbbreviation = convertToAbbreviation(region);

            if (FPANumber != 'workqueue' && FPANumber && fileType) {
                if (fileType === 'FPAN External') {
                    filePath = `${BOX_ROOT_FOLDER}/FP_Program/FP_${regionAbbreviation}/FPA/${FPANumber}`;
                } else if (fileType === 'WTM External') {
                    filePath = `${BOX_ROOT_FOLDER}/FP_Program/FP_${regionAbbreviation}/WTM/${FPANumber}`;
                }
                logger.info(`LibBoxPushFilesToBox (ID: ${docID}): FilePath: ${filePath})`);
            } else if (FPANumber == 'workqueue') {
                filePath = `${BOX_ROOT_FOLDER}/FP_Program/FP_${regionAbbreviation}/Reports`;
                logger.info(`LibBoxPushFilesToBox (ID: ${docID}): FilePath: ${filePath})`);
            } else {
                throw new Error(`FPA Number value is missing or invalid for Doc ID: ${docID}`);
            }
        } else {
            throw new Error(`Region value is missing or invalid for Doc ID: ${docID}`);
        }

        // 2. GET FILE BYTES - RUN IN PARALLEL WITH FOLDER CHECK/CREATION TO OPTIMIZE TIME SPENT IN MICROSERVICE
        const bufferPromise = getFileBytes(doc.id);
        // 3. ENSURE FOLDER EXISTS IN BOX
        const folderIDPromise = ensureBoxFolder(filePath);

        const [buffer, folderID] = await Promise.all([bufferPromise, folderIDPromise]);

        logger.info(`LibBoxPushFilesToBox (ID: ${docID}): file bytes received (3)`);
        logger.info(`LibBoxPushFilesToBox (ID: ${docID}): folder found/generated in Box (4)`);

        let metaDataResponse = '';
        let fileID = '';

        // 4. UPLOAD FILE TO BOX
        try {
            fileID = await uploadToBoxWithRetry(buffer, fileName, folderID);
            logger.info(`LibBoxPushFilesToBox (ID: ${docID}): file uploaded to Box (5)`);

            // 5. ADD METADATA TO FILE
            const metadata = {
                fileId: docID,
                fileType: fileType,
            };

            metaDataResponse = await addOrUpdateMetadata(fileID, metadata, METADATA_TEMPLATE_NAME);
            logger.info(`LibBoxPushFilesToBox (ID: ${docID}): metadata associated with file in Box (6)`);
        } catch (error) {
            throw new Error(`Failed to upload file to Box for Doc ID: ${docID}`);
        }

        logBOXActivity(
            docID,
            fileName,
            filePath,
            true,
            JSON.stringify({
                folderID: folderID,
                fileID: fileID,
                metaDataResponse: metaDataResponse,
            })
        );
        logger.info(`LibBoxPushFilesToBox (ID: ${docID}): Box activity logged in Box Synchronization Log (7)`);

        // 6. RETURN RESPONSE
        returnObject = {
            MicroserviceResult: true,
            MicroserviceMessage: 'Microservice completed successfully',
            FileID: fileID,
            MicroSuccess: true,
            MicroErr: '',
        };
    } catch (err) {
        const msg = `(Error Encountered): ${err?.message ?? String(err)}`;
        logger.error('WADNR - LibBoxPushFilesToBox: Error encountered' + msg);

        logBOXActivity(docID, fileName, filePath, false, `${msg}`);

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: err?.message || String(err),
            MicroSuccess: false,
            MicroErr: err?.stack || err?.message || String(err),
        };
    } finally {
        logElapsed(`LibBoxPushFilesToBox (ID: ${docID}): total runtime`, processStart);

        shortDescription = 'Sending the workflow completion response to the log server';

        // If the complete was successful or not to the log server. This helps to track down what occurred when a microservice completed.
        await vvClient.scripts
            .completeWorkflowWebService(executionId, returnObject)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then(() =>
                logger.info(`LibBoxPushFilesToBox: (ID: ${docID}): Completion signaled to WF engine successfully.`)
            )
            .catch(() =>
                logger.info(`LibBoxPushFilesToBox: (ID: ${docID}): There was an error signaling WF completion.`)
            );
    }
};
