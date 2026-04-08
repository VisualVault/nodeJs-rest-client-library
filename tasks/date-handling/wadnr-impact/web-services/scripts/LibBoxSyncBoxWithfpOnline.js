/**
 * LibBoxSyncBoxWithfpOnline
 * Category: Workflow
 * Modified: 2026-03-20T19:30:02.52Z by john.sevilla@visualvault.com
 * Script ID: Script Id: b0038287-b989-f011-82f4-eead855597dc
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const jwt = require('jsonwebtoken');
const axios = require('axios');
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

module.exports.main = async function (ffCollection, vvClient, response) {
    /*
  Script Name:    LibBoxSyncBoxWithfpOnline
  Customer:       WADNR
  Purpose:        Responsible for syncing a document uploaded to Box to fpOnline
  Preconditions:
                  - Box account set up
                  - Box app set up
                  - Webhook set up to point to this micro service
                  - Microservice access set to anonymous

  Parameters:     The following represent variables passed into the function:
                  parameter1: Description of parameter1
                  parameter2: Description of parameter2
  Return Object:
                  outputCollection[0]: Status
                  outputCollection[1]: Short description message
                  outputCollection[2]: Data
  Pseudo code:
                  1. Retrieve request body
                  2. Retrieve file buffer
                  3. Calculate folder path and folder ID, and generate folder if it does not exist
                  4. Post the document and the file
                  5. Log BOX activity in Box Sync History

  Date of Dev:    09/04/2025

  Revision Notes:
                  09/04/2025 - Austin Stone:  First Setup of the script  
                  10/02/2025 - Mauro Rapuano: Add Document or Form field to Associated Document Relation record
                  12/01/2025 - Ross Rhone: Renamed variables for migration tool
                  12/05/2025 - Ross Rhone: Added logging for debugging purposes
                  12/12/2025 - Ross Rhone: Added the Print Order field to Associated Document Relation record
                  12/19/2025 - Ross Rhone: Changed FPA Number to manual-upload to trigger the document relate workflow
                  for relating the ARG
                  03/16/2026 - Ross Rhone: Not displaying an error to the box activity log when the application number cannot be found 
                               and posting the document in the "Other Documents" folder instead, to avoid losing documents that cannot be 
                               automatically related to an ARP but that could be related manually later on.
                  03/19/2026 - John Sevilla: Update folder path derivation to account for legacy FPA numbers 
  */

    logger.info(`Start of the process LibBoxSyncBoxWithfpOnline at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // Response array
    let outputCollection = [];
    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /***********************
     Configurable Variables
    ************************/

    const BOX_API_BASE = 'api.box.com';
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

    async function getAccessToken() {
        const params = new URLSearchParams();
        params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
        params.append('client_id', BOX_CLIENT_ID);
        params.append('client_secret', BOX_CLIENT_SECRET);
        params.append('assertion', token);

        try {
            const response = await axios.post('https://api.box.com/oauth2/token', params);

            return response.data.access_token;
        } catch (err) {
            // Axios error details
            const status = err?.response?.status;
            const data = err?.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message;
            throw new Error(data || err.message);
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

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
        } finally {
            return fieldValue;
        }
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
                throw new Error(
                    `${shortDescription} data property was not present. Please, check parameters and syntax. Status: ${status}.`
                );
            }
        }

        return vvClientRes;
    }

    async function logDebugMessage(message) {
        const shortDescription = `Post form zAustinWebhookDebugLog`;
        const newRecordData = {
            // You can convert these values or this object to arguments of this function
            message: message,
        };

        return vvClient.forms
            .postForms(null, newRecordData, 'zAustinWebhookDebugLog')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    async function getFileBuffer(fileId, accessToken) {
        try {
            const response = await axios.get(`https://api.box.com/2.0/files/${fileId}/content`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                responseType: 'arraybuffer', // Important to get raw binary
            });

            return Buffer.from(response.data);
        } catch (err) {
            if (err.status === 404) {
                throw new Error(`File with ID ${fileId} not found/no access in Box.`);
            }
            console.error(`Error fetching file ${fileId}:`, err.message);
            return null;
        }
    }

    function getFPANData(FPANumber) {
        shortDescription = 'getFPANData (Custom Query)';
        const customQueryData = {
            params: JSON.stringify([
                {
                    parameterName: 'FPANumber',
                    value: FPANumber,
                },
            ]),
        };

        return vvClient.customQuery
            .getCustomQueryResultsByName('zWebSvc Application Review Page By FPAN Number', customQueryData)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getWTMData(WTMNumber) {
        shortDescription = 'getWTMData (Custom Query)';
        const customQueryData = {
            params: JSON.stringify([
                {
                    parameterName: 'WTMNumber',
                    value: WTMNumber,
                },
            ]),
        };

        return vvClient.customQuery
            .getCustomQueryResultsByName('zWebSvc WTM Review Page By WTM Number', customQueryData)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    async function getFolderID(folderPath) {
        const ignoreStatusCode = 403; // 403 is returned when the folder doesn't exist
        let shortDescription = `Get folder '${folderPath}'`;

        const getFolderParams = {
            folderPath,
        };

        let folderId = await vvClient.library
            .getFolders(getFolderParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode))
            .then((res) => checkDataPropertyExists(res, shortDescription, ignoreStatusCode))
            .then((res) => (res.data ? res.data.id : null));

        if (!folderId) {
            shortDescription = `Post folder '${folderPath}'`;
            const folderData = {
                description: 'Received From Box',
            };

            folderId = vvClient.library
                .postFolderByPath(null, folderData, folderPath)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                .then((res) => res.data.id);

            if (folderId) return folderId;
        } else {
            return folderId;
        }
    }

    function postDoc(docName, folderId, region) {
        const shortDescription = `Post document for ${docName}`;
        let FPANumber;

        if (region === 'failed-to-find-application') {
            region = '';
            FPANumber = 'failed-to-find-application';
        } else {
            FPANumber = 'manual-upload';
            region = region;
        }

        const docParams = {
            documentState: 1,
            name: `${docName}`,
            description: `${docName}`,
            revision: '0',
            allowNoFile: true,
            fileLength: 0,
            fileName: `${docName}`,
            //Setting manual-upload to start workflow "DOC - Relate Documents to Review Page"
            //That workflow will set the correct FPA Number and relate the document to the ARP
            indexFields: JSON.stringify({
                'FPA Number': FPANumber,
                Region: region,
                Offline: 'False',
                isInBox: 'False',
            }),
            folderId: folderId,
        };

        return vvClient.documents
            .postDoc(docParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function postFile(docData, fileBuffer, FPANumber, region) {
        if (FPANumber === 'failed-to-find-application') {
            FPANumber = 'failed-to-find-application';
            region = 'failed-to-find-application';
        } else {
            FPANumber = FPANumber;
            region = region;
        }

        const shortDescription = `Post file for '${docData.name}'`;
        const fileParams = {
            documentId: `${docData.id}`,
            name: `${docData.name}`,
            revision: '1',
            changeReason: 'Initial Version',
            checkInDocumentState: 'Released',
            fileName: `${docData.fileName}`,
            indexFields: JSON.stringify({
                'FPA Number': FPANumber,
                Region: region,
            }),
        };

        return vvClient.files
            .postFile(fileParams, fileBuffer)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));
    }

    function getPathFromFormNumber(applicationNumber, includesRange, isWTM = false) {
        applicationNumber = String(applicationNumber).trim();
        const iniFolder = isWTM ? 'WTM' : 'FPA';

        // Validate the against the fpOnline number formats
        const fpOnlineNumberFormatMatch = applicationNumber.match(/^[^-]+-[^-]+-(\d{2})-(\d+)/);
        if (fpOnlineNumberFormatMatch) {
            let [, year, sequenceNumber] = fpOnlineNumberFormatMatch;
            year = '20' + year;
            sequenceNumber = parseInt(sequenceNumber, 10);
            const upper = Math.ceil(sequenceNumber / 1000) * 1000;
            const lower = upper - 999;

            if (includesRange) {
                return `/${iniFolder}/${year}/${lower}-${upper}/${applicationNumber}`;
            } else {
                return `/Appeals/${year}/${applicationNumber}`;
            }
        }

        if (!isWTM) {
            // If unable to match above, validate against the legacy FPA number format
            const legacyFPANumberFormatMatch = applicationNumber.match(/^\d+$/);
            if (legacyFPANumberFormatMatch) {
                return `/${iniFolder}/Legacy/${applicationNumber}`;
            }
        }

        // If nothing matches, return an empty string
        return '';
    }

    function logBOXActivity(docID, fileName, folderPath, isSuccess, featureMsg) {
        const shortDescription = `Post form Box Synchronization Log`;
        const newRecordData = {
            // You can convert these values or this object to arguments of this function
            'Sync DateTime': new Date(),
            'Document ID': docID,
            'File Name': fileName,
            'Folder Path': folderPath,
            Operation: 'Download',
            'Sync Direction': 'To fpOnline',
            'Success Or Failure': isSuccess == true ? 'Success' : 'Failure',
            'User Account Used To Sync': BOX_ENTERPRISE_ID,
            'Feature Message': featureMsg,
        };

        logger.info(`LibBoxSyncBoxWithfpOnline: Post form Box Synchronization Log ${JSON.stringify(newRecordData)}`);

        return vvClient.forms
            .postForms(null, newRecordData, 'Box Synchronization Log')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getApplicationType(str) {
        if (str.includes('WTM')) {
            return 'WTM';
        } else if (str.includes('FPA')) {
            return 'FPA';
        }
        return 'FPA'; // default
    }

    function getDocumentsByPathAndName(folderPath, fileName) {
        const shortDescription = `Get Documents Data for 'test'`;
        const getDocsParams = {
            q: `FolderPath = '${folderPath}' AND FileName = '${fileName}'`,
            indexFields: 'include',
        };

        return vvClient.documents
            .getDocuments(getDocsParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    async function postFileIntoOtherDocumentsFolder() {
        folderPath = '/Other Documents';
        folderId = await getFolderID(folderPath);

        // 4. Post the document and the file
        docData = await postDoc(fileName, folderId, 'failed-to-find-application');

        logger.info(`LibBoxSyncBoxWithfpOnline: (${fileId}) Post doc successful`);

        await postFile(docData, buffer, 'failed-to-find-application', 'failed-to-find-application');

        logger.info(`LibBoxSyncBoxWithfpOnline: (${fileId}) Post file successful`);
    }

    async function postFileIntoFPANNumFolder() {
        const region = FPANData['region'];

        logger.info(`LibBoxSyncBoxWithfpOnline: (${fileId}) FPANData: ${JSON.stringify(FPANData)}`);

        // 3. Calculate folder path and folder ID, and generate folder if it does not exist
        folderPath = getPathFromFormNumber(FPANumber, true, isWTM);
        folderPath = folderPath + '/Received From Box';
        folderId = await getFolderID(folderPath);

        logger.info(`LibBoxSyncBoxWithfpOnline: (${fileId}) Upload Folder Path: ${folderPath}`);

        const foundDocuments = await getDocumentsByPathAndName(folderPath, fileName);

        if (foundDocuments.length === 0) {
            // 4. Post the document and the file
            docData = await postDoc(fileName, folderId, region);

            logger.info(`LibBoxSyncBoxWithfpOnline: (${fileId}) Post doc successful`);

            await postFile(docData, buffer, FPANumber, region);

            logger.info(`LibBoxSyncBoxWithfpOnline: (${fileId}) Post file successful`);
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

        // 2. GET FILE BYTES
        let buffer = await getFileBytes(doc.id);
        logger.info(`LibBoxPushFilesToBox (ID: ${docID}): file bytes received (3)`);

        // 3. ENSURE FOLDER EXISTS IN BOX
        const folderID = await ensureBoxFolder(filePath);
        logger.info(`LibBoxPushFilesToBox (ID: ${docID}): folder found/generated in Box (4)`);
        //const collab = await createCollaboration(folderID) //for sharnig folder with primary user

        // 4. UPLOAD FILE TO BOX
        const fileID = await uploadToBox(buffer, fileName, folderID);
        logger.info(`LibBoxPushFilesToBox (ID: ${docID}): file uploaded to Box (5)`);

        // 5. ADD METADATA TO FILE
        const metadata = {
            fileId: docID,
            fileType: fileType,
        };

        const metaDataResponse = await addOrUpdateMetadata(fileID, metadata, METADATA_TEMPLATE_NAME);
        logger.info(`LibBoxPushFilesToBox (ID: ${docID}): metadata associated with file in Box (6)`);

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
            MicroserviceMessage: err,
            MicroSuccess: false,
            MicroErr: err.toString(),
        };
    } finally {
        shortDescription = 'Sending the workflow completion response to the log server';

        // If the complete was successful or not to the log server. This helps to track down what occurred when a microservice completed.
        await vvClient.scripts
            .completeWorkflowWebService(executionId, returnObject)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then(() => logger.info('Completion signaled to WF engine successfully.'))
            .catch(() => logger.info('There was an error signaling WF completion.'));
    }
};
