/**
 * LibBoxRemoveFilesFromBox
 * Category: Form
 * Modified: 2026-04-02T17:56:05.23Z by ross.rhone@visualvault.com
 * Script ID: Script Id: 504ef434-642b-f011-82d8-c702f4413de2
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
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
    Script Name:    LibBoxRemoveFilesFromBox
    Customer:       WADNR
    Purpose:        This script is responsible for removing a file marked no longer marked offline from Box.
    Preconditions:
                    - Box account with at least Business level subscription
    Parameters:
                    - Doc ID: ID of document to remove
    Return Object:
                    1. MicroserviceResult - Return true if process ran successfully.  Return false if an error occurred.
                    2. MicroserviceMessage - Message about what happened.
    Psuedo code: 
                    1° AUTHENTICATES INTO BOX
                    2° DELETES FILE

    Date of Dev:    05/06/2025
    Last Rev Date:  05/06/2025

    Revision Notes:
                       05/06/2025 - Austin Stone:  First Setup of the script
                       12/01/2025 - Ross Rhone: Renamed variables for migration tool
                       03/26/2026 - Ross Rhone: Added retry logic for Box API token retrieval and requests
                       03/31/2026 - Ross Rhone Added retry logic Box API calls for removal of files from Box throwing non-generic errors

    */

    const processStart = Date.now();

    function logElapsed(label, startTime) {
        logger.info(`${label} | elapsedMs=${Date.now() - startTime}`);
    }

    logger.info('Start of the process LibBoxRemoveFilesFromBox at ' + Date());

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
    const METADATA_TEMPLATE_NAME = 'fpmetadata';
    const BOX_ROOT_FOLDER = 'BOX_ROOT_FOLDER';

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

        const tokenRes = await axios.post('https://api.box.com/oauth2/token', params);
        return tokenRes.data.access_token;
    }

    async function getAccessTokenWithRetry(token, maxRetries = 3) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await getAccessToken(token);
            } catch (error) {
                lastError = error;
                logger.warn(
                    `LibBoxRemoveFilesFromBox: Box token request failed on attempt ${attempt} of ${maxRetries}. ${error.message}`
                );
            }
        }

        const err = new Error('Failed to get token from Box');
        err.cause = lastError;
        throw err;
    }

    let ACCESS_TOKEN;

    const REGION_FOLDER_MAP = {
        NW: 'NW',
        SE: 'SE',
        PC: 'PC',
        OL: 'OLY',
        SP: 'SPS',
        NE: 'NE',
    };

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
            errorLog.push(error);
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

    async function boxApiRequest(method, path, data = null, isUpload = false, contentType = null) {
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
                    `LibBoxRemoveFilesFromBox: Box API request failed on attempt ${attempt} of ${maxRetries} for ${method} ${path}. ${error.message}`
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
            Operation: 'Removal',
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

    function extractRegion(fileName) {
        // Pattern for report files
        const reportMatch = fileName.match(/-\s*(NW|SE|PC|OL|SP|NE)\s*-/i);

        if (reportMatch) {
            return reportMatch[1].toUpperCase();
        }

        // Pattern for FPA files
        const fpaMatch = fileName.match(/^fpa-(NW|SE|PC|OL|SP|NE)-/i);

        if (fpaMatch) {
            return fpaMatch[1].toUpperCase();
        }

        throw new Error(`Could not determine region from filename: ${fileName}`);
    }

    function inferFolderPathFromFileName(fileName) {
        const regionCode = extractRegion(fileName);
        const regionFolder = REGION_FOLDER_MAP[regionCode];

        if (!regionFolder) {
            throw new Error(`Unsupported region code: ${regionCode}`);
        }

        const trimmed = fileName.trim();
        const regionRoot = `FP_${regionFolder}`;

        // -------------------------
        // REPORT FILES
        // -------------------------
        if (
            /^FPAN NOTIFICATIONS/i.test(trimmed) ||
            /^PENDING DECISIONS/i.test(trimmed) ||
            /^MASTERLOG/i.test(trimmed)
        ) {
            return {
                folderPath: `${regionRoot}/Reports`,
                regionRoot: regionRoot,
            };
        }

        // -------------------------
        // FPA FILES
        // -------------------------
        const fpaMatch = trimmed.match(/^fpa-(.*)$/i);

        if (fpaMatch) {
            const folderName = fpaMatch[1].toUpperCase();

            return {
                folderPath: `${regionRoot}/FPA/${folderName}`,
                regionRoot: regionRoot,
                folderName: folderName,
            };
        }

        throw new Error(`Unable to infer Box folder path from filename: ${fileName}`);
    }

    function getFolderIdByRoot(folderResponse, BOX_ROOT_FOLDER, regionFolder, searchFolderPath) {
        // So we want to return the folder id from the parent entry of the root folder because that is the unique identifier for the folder across environments.
        // For example. BOX_ROOT_FOLDER_QA/FP_Program/FP_NW/Reports "QA" and BOX_ROOT_FOLDER/FP_Program/FP_NW/Reports "Dev"

        for (const folder of folderResponse.entries) {
            if (folder.name !== searchFolderPath) {
                continue;
            }

            const pathEntries = folder.path_collection?.entries || [];

            const pathNames = pathEntries.map((entry) => entry.name);

            const hasRootFolder = pathNames.includes(BOX_ROOT_FOLDER);
            const hasRegion = pathNames.includes(regionFolder);

            if (hasRootFolder && hasRegion) {
                return folder.id;
            }
        }

        return null; // No folder found
    }

    /**********
     MAIN CODE 
    **********/

    let docID;
    let fileName;
    let docFilePath;

    try {
        docID = getFieldValueByName('Doc ID');
        fileName = getFieldValueByName('File Name');

        logger.info(`LibBoxRemoveFilesFromBox: Process Started | DocID: ${docID} | Filename: ${fileName}`);

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

        const docs = await getDocuments(docID);
        if (!docs || docs.length === 0) throw new Error(`No VV document found for docID ${docID}`);

        const doc = docs[0];

        logger.info(
            `LibBoxRemoveFilesFromBox: Retrieved document for docID ${docID}, document name ${doc?.name}, folder path `
        );

        const hasDocFilePath = doc?.folderPath;
        if (!hasDocFilePath) {
            logger.warn(`LibBoxRemoveFilesFromBox: document has no folderPath for docID ${docID}`);
            docFilePath = '';
        } else {
            docFilePath = doc['folderPath'];
        }

        const boxFolderPaths = inferFolderPathFromFileName(fileName);

        const regionfolder = boxFolderPaths.regionRoot;
        const targetFolderPath = boxFolderPaths.folderPath;

        //search by the region folder first and then use
        // the targetFolderPath to search through the response.

        let searchFolderPath = '';
        if (targetFolderPath.includes('Reports')) {
            searchFolderPath = 'Reports';
        } else {
            //Get foldername
            searchFolderPath = fileName
                .split('.')
                .shift()
                .replace(/^\s*(fpa-|wtm-)/i, '');
        }
        const queryParams = new URLSearchParams({
            query: `"${searchFolderPath}"`,
            fields: 'id,name,path_collection',
            ancestor_folder_ids: '0',
            type: 'folder',
        });

        let folderResponse = '';
        try {
            const searchPath = `/2.0/search?${queryParams.toString()}`;
            folderResponse = await boxApiRequestWithRetry('GET', searchPath);
        } catch (error) {
            logger.error(
                `LibBoxRemoveFilesFromBox: Error searching for folder in Box for docID ${docID}. ${error.message}`
            );
            throw new Error(`Error searching for folder in Box: ${error.message}`);
        }

        logElapsed(`LibBoxRemoveFilesFromBox (ID: ${docID}): time after box folder search`, processStart);

        const folderId = getFolderIdByRoot(folderResponse, BOX_ROOT_FOLDER, regionfolder, searchFolderPath);

        if (!folderId) {
            console.log('No Folder Found');
        }

        //We have the folder id so now we can search for the file in that folder and delete it if we find it.
        // We will use the metadata value to find the file in case there are multiple files with the same name in the folder.

        // Step 2: Search for files under that folder
        const queryParamsFolder = new URLSearchParams({
            query: `"${regionfolder}"`,
            fields: 'id,name,path_collection',
            ancestor_folder_ids: '0',
            type: 'folder',
        });

        const itemsFolderPath = `/2.0/folders/${folderId}/items?${queryParamsFolder.toString()}`;
        let itemsResponse = '';
        try {
            itemsResponse = await boxApiRequestWithRetry('GET', itemsFolderPath);
        } catch (error) {
            logger.error(
                `LibBoxRemoveFilesFromBox: Error searching for files in Box folder for docID ${docID}. ${error.message}`
            );
            throw new Error(`Error searching for files in Box folder: ${error.message}`);
        }

        logElapsed(`LibBoxRemoveFilesFromBox (ID: ${docID}): time after box file search`, processStart);

        // Step 3: Find file(s) with matching filename

        const fileId = await itemsResponse.entries.find((entry) => entry.name === fileName)?.id;

        if (!fileId) {
            logger.info(
                `LibBoxRemoveFilesFromBox: ${docID} No file found with name ${fileName} in folder ${targetFolderPath}`
            );
            throw new Error(
                `LibBoxRemoveFilesFromBox: ${docID} No file found with name ${fileName} in folder ${targetFolderPath}`
            );
        }

        logger.info(`LibBoxRemoveFilesFromBox: ${docID} Deleting file: ${fileName} (ID: ${fileId})`);

        let fileDeleteResponse = '';
        try {
            fileDeleteResponse = await boxApiRequestWithRetry('DELETE', `/2.0/files/${fileId}`);
        } catch (error) {
            logger.error(`LibBoxRemoveFilesFromBox: Error deleting file in Box for docID ${docID}. ${error.message}`);
            throw new Error(`Error deleting file in Box: ${error.message}`);
        }

        if (fileDeleteResponse === '') {
            logger.info(`LibBoxRemoveFilesFromBox: ${docID} File ${fileName} deleted successfully.`);
        } else {
            logger.info(
                `LibBoxRemoveFilesFromBox: ${docID} Unexpected response when deleting file ${fileName}: ${JSON.stringify(fileDeleteResponse)}`
            );
            throw new Error(`LibBoxRemoveFilesFromBox: ${docID} Unexpected response when deleting file ${fileName}`);
        }

        await logBOXActivity(docID, fileName, docFilePath, true, '');

        returnObject = {
            MicroserviceResult: true,
            MicroserviceMessage: 'Microservice completed successfully',
            MicroSuccess: true,
            MicroErr: '',
        };
    } catch (err) {
        logger.info(`LibBoxRemoveFilesFromBox: Error encountered ${docID} + ${err.toString()}`);

        await logBOXActivity(docID, fileName, docFilePath, false, `(Error Encountered): ${err.toString()}`);

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: err?.message || String(err),
            MicroSuccess: false,
            MicroErr: err?.stack || err?.message || String(err),
        };
    } finally {
        logElapsed(`LibBoxRemoveFilesFromBox (ID: ${docID}): total runtime`, processStart);

        shortDescription = 'Sending the workflow completion response to the log server';

        // If the complete was successful or not to the log server. This helps to track down what occurred when a microservice completed.
        await vvClient.scripts
            .completeWorkflowWebService(executionId, returnObject)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then(() =>
                logger.info(`LibBoxRemoveFilesFromBox: Completion signaled to WF engine successfully. ${docID}`)
            )
            .catch(() => logger.info(`LibBoxRemoveFilesFromBox: There was an error signaling WF completion. ${docID}`));
    }
};
