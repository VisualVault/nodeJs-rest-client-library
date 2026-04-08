/**
 * SCHGenerateWorkQueueExcelFiles
 * Category: Scheduled
 * Modified: 2026-04-07T20:55:35.893Z by ross.rhone@visualvault.com
 * Script ID: Script Id: 77271faf-ba40-f011-82d9-9f5f46d8620b
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const ExcelJS = require('exceljs');

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
    Script Name:    SCHGenerateWorkQueueExcelFiles
    Customer:       WADNR
    Purpose:        Generates excel files from work queues
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code: 
                    1. DEFINE QUERIES
                    2. RETRIEVE QUERIES
                    3. GROUP QUERIES BY REGION
                    4. CONVERT QUERY TO EXCEL FILE
                    5. CONVERT EXCEL FILE TO BUFFER
                    6. GENERATE FOLDERPATH
                    7. CREATE DOCUMENT IN VV LIBRARY
                    8. POST EXCELFILE TODOCUMENT
 
    Date of Dev:    05/09/2025
    Last Rev Date:  05/09/2025
 
    Revision Notes:
                    05/09/2025 - Austin Stone:  First Setup of the script
                    11/28/2025 - Ross Rhone: Added safe gaurd for region abbreviation conversion. 
                    This is used for creating the folder path/file name  for the work queue reports
                    in the doc library.
                    04/01/2026 - Ross Rhone: Added auto-filters to the excel files generated for better usability of the reports in Box
                                 when foresters are using box offline.
                    04/07/2026 - Ross Rhone: Added the functionality to add empty reports to the box folder. This is to ensure that foresters see 
                                 the report in their box folder even if there are no records for their region, which is a common scenario for some regions.
                                 Added the Pending WTM Decisions report
                  
    */

    logger.info(`Start of logic for SCHGenerateWorkQueueExcelFiles on ${new Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // You will see the responseMessage in the scheduled process log ONLY if the process runs manually.
    response.json(200, `Start of logic for SCHGenerateWorkQueueExcelFiles on ${new Date()}`);

    // Array for capturing error messages that may occur during the execution of the script.
    let errorLog = [];

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

    function getFolderID(folderPath) {
        const ignoreStatusCode = 403; // 403 is returned when the folder doesn't exist
        const shortDescription = `Get folder '${folderPath}'`;

        const getFolderParams = {
            folderPath,
        };

        return vvClient.library
            .getFolders(getFolderParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode))
            .then((res) => checkDataPropertyExists(res, shortDescription, ignoreStatusCode))
            .then((res) => (res.data ? res.data.id : null));
    }

    function postDoc(docName, folderId, indexFields) {
        const shortDescription = `${docName}`;
        const docParams = {
            documentState: 1,
            name: `${docName}`,
            description: `${docName}`,
            revision: '0',
            allowNoFile: true,
            fileLength: 0,
            fileName: `${docName}.xlsx`,
            indexFields: JSON.stringify(indexFields),
            folderId: folderId,
        };

        return vvClient.documents
            .postDoc(docParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function postFile(docData, fileBuffer, indexFields) {
        const shortDescription = `Post file for '${docData.name}'`;
        const fileParams = {
            documentId: `${docData.id}`,
            name: `${docData.name}`,
            revision: '1',
            changeReason: 'Initial Version',
            checkInDocumentState: 'Released',
            fileName: `${docData.fileName}`,
            indexFields: JSON.stringify(indexFields),
        };

        return vvClient.files
            .postFile(fileParams, fileBuffer)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));
    }

    function createFolder(folderPath, description) {
        const shortDescription = `Post folder '${folderPath}'`;
        const folderData = {
            description,
        };

        return vvClient.library
            .postFolderByPath(null, folderData, folderPath)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data.id);
    }

    function getLog(queryName) {
        const shortDescription = 'Custom Query using filter parameter for backward compatibility';

        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, {})
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getReportsInBox(folderPath) {
        const shortDescription = `Get Documents Data for '${folderPath}'`;
        const getDocsParams = {
            q: `folderPath = '${folderPath}' and Offline = 'True'`, // docID = "DOC-000001"
            // q: `FolderPath = '${folderPath}'`,
        };

        return vvClient.documents
            .getDocuments(getDocsParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function takeReportOutOfBox(docID) {
        const shortDescription = `Get Documents Data for '${docID}'`;
        const indexFields = {
            indexFields: JSON.stringify({
                Offline: 'False',
                isInBox: 'True',
            }),
        };

        return vvClient.documents
            .putDocumentIndexFields(indexFields, docID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    //The fpan number SHOULD BE in the format where the region is already in
    //the abbreviated format, but this is a safeguard in case it is not
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
                return 'OL';
            case 'pacific cascade':
            case 'pc':
                return 'PC';
            case 'south puget sound':
            case 'sp':
                return 'SP';
            case 'southeast':
            case 'se':
                return 'SE';
            default:
                return '';
        }
    }

    function convertToBoxAbbreviation(value) {
        switch (value.toLowerCase()) {
            case 'northeast':
            case 'ne':
                return 'NE';
            case 'northwest':
            case 'nw':
                return 'NW';
            case 'olympic':
            case 'ol':
                return 'OLY';
            case 'pacific cascade':
            case 'pc':
                return 'PC';
            case 'south puget sound':
            case 'sp':
                return 'SPS';
            case 'southeast':
            case 'se':
                return 'SE';
            default:
                return '';
        }
    }

    function getExcelColumnLetter(columnNumber) {
        let remainingColumnNumber = columnNumber;
        let columnLetter = '';

        while (remainingColumnNumber > 0) {
            const zeroBasedColumnIndex = remainingColumnNumber - 1;
            const currentLetterIndex = zeroBasedColumnIndex % 26;
            const currentLetter = String.fromCharCode(65 + currentLetterIndex);

            columnLetter = `${currentLetter}${columnLetter}`;
            remainingColumnNumber = Math.floor(zeroBasedColumnIndex / 26);
        }

        return columnLetter;
    }

    function getReportHeaders(queryName) {
        const headerMap = {
            'zMasterlog Work Queue': [
                'dhid',
                'Region',
                'Received Date',
                'WDFW Due Date',
                'WDFW Response Date',
                'FPAN Number',
                'Classification',
                'FP Forester',
                'Landowner',
                'Operator',
                'County',
                'Section',
                'Township',
                'Range',
                'Comment Due Date',
                'Decision Due Date',
                'Decision Effective Date',
                'Decision Expiration Date',
                'Project Name',
                'Document Type',
                'Status',
                'Application Type',
            ],
            'Under Review Work Queue': [
                'DhDocID',
                'DhID',
                'Region',
                'FP Forester',
                'FPAN Number',
                'Project Name',
                'FPAN Classification',
                'Landowner',
                'Date of Receipt',
                'WDFW Concurrence Due Date',
                'WDFW Concurrence Review Completed Date',
                'Comment Due Date',
                'Decision Due Date',
                'Document Type',
                'Status',
            ],
            'FPAN Notifications Work Queue': [
                'DhDocID',
                'DhID',
                'Region',
                'FPAN Number',
                'Project Name',
                'FPAN Classification',
                'FP Forester',
                'Landowner',
                'Operator',
                'Application Type',
                'Status',
                'Status Updated Date',
            ],
            'zWebSvc Get PendingWTMDecision 24h': [
                'Region',
                'FP Forester',
                'WTMF Number',
                'FPAN Number',
                'Date of Receipt',
                'Review Due Date',
                'Proponent Name',
                'Landowner Name',
                'Status',
            ],
        };

        return headerMap[queryName] || [];
    }

    function getAllReportRegions() {
        return [
            { regionAbbreviation: 'NE', regionBoxAbbreviation: 'NE' },
            { regionAbbreviation: 'NW', regionBoxAbbreviation: 'NW' },
            { regionAbbreviation: 'OL', regionBoxAbbreviation: 'OLY' },
            { regionAbbreviation: 'PC', regionBoxAbbreviation: 'PC' },
            { regionAbbreviation: 'SP', regionBoxAbbreviation: 'SPS' },
            { regionAbbreviation: 'SE', regionBoxAbbreviation: 'SE' },
        ];
    }

    function getRegionReportBatches(log, queryName) {
        if (!Array.isArray(log) || log.length === 0) {
            return getAllReportRegions().map((regionInfo) => ({
                ...regionInfo,
                records: [],
                headers: getReportHeaders(queryName),
            }));
        }

        const grouped = log.reduce((acc, item) => {
            if (!acc[item.region]) acc[item.region] = [];
            acc[item.region].push(item);
            return acc;
        }, {});

        return Object.entries(grouped).map(([region, records]) => ({
            regionAbbreviation: convertToAbbreviation(region),
            regionBoxAbbreviation: convertToBoxAbbreviation(region),
            records,
            headers: Object.keys(records[0] || {}),
        }));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1. DEFINE QUERIES
        const queries = [
            { queryName: 'zMasterlog Work Queue', fileName: 'MASTERLOG' },
            { queryName: 'Under Review Work Queue', fileName: 'PENDING DECISIONS' },
            { queryName: 'FPAN Notifications Work Queue', fileName: 'FPAN NOTIFICATIONS' },
            { queryName: 'zWebSvc Get PendingWTMDecision 24h', fileName: 'PENDING WTM DECISIONS' },
        ];

        for (let query of queries) {
            // 2. RETRIEVE QUERIES
            const log = await getLog(query.queryName);

            // 3. GROUP QUERIES BY REGION
            const regionReportBatches = getRegionReportBatches(log, query.queryName);

            for (let regionReport of regionReportBatches) {
                // 4. CONVERT QUERY TO EXCEL FILE
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Log');

                worksheet.columns = regionReport.headers.map((key) => ({
                    header: key,
                    key: key,
                    width: 20,
                }));

                if (regionReport.records.length > 0) {
                    worksheet.addRows(regionReport.records);
                }

                if (worksheet.columnCount > 0) {
                    worksheet.autoFilter = {
                        from: 'A1',
                        to: `${getExcelColumnLetter(worksheet.columnCount)}1`,
                    };
                }

                // 5. CONVERT EXCEL FILE TO BUFFER
                const excelBuffer = await workbook.xlsx.writeBuffer();
                const regionAbbreviation = regionReport.regionAbbreviation;
                const regionBoxAbbreviation = regionReport.regionBoxAbbreviation;

                // 6. GENERATE FOLDERPATH
                const folderPath = `/Work Queue Reports/${regionAbbreviation}/Reports`;
                let folderID;

                folderID = await getFolderID(folderPath);
                if (!folderID) {
                    await createFolder(folderPath);
                    folderID = await getFolderID(folderPath);
                }

                const now = new Date();

                const date = now.toISOString().split('T')[0]; // e.g., "2025-05-06"
                const hour = now.getHours(); // 0–23
                const minute = now.getMinutes(); // 0–59

                const timestamp = `${date} ${hour.toString().padStart(2, '0')}-${minute.toString().padStart(2, '0')}`;

                const reportsInBox = await getReportsInBox(folderPath);

                for (let report of reportsInBox) {
                    if (report.fileName.startsWith(query.fileName)) {
                        const response = await takeReportOutOfBox(report.documentId);
                        if (response[0].value != 'False') {
                            errorLog.push(`Could not set index field "Offline" for ${report.fileName} to false.`);
                        }
                    }
                }

                const indexFields = {
                    'FPA Number': 'workqueue',
                    Offline: 'True',
                    isInBox: 'False',
                    Region: regionBoxAbbreviation,
                    //TODO: Add Document Type index field when requirement is clear
                };

                // 7. CREATE DOCUMENT IN VV LIBRARY
                const docName = `${query.fileName} - ${regionAbbreviation} - ${timestamp}`;
                const docData = await postDoc(docName, folderID, indexFields);

                // 8. POST EXCELFILE TODOCUMENT
                await postFile(docData, excelBuffer, indexFields);
            }
        }

        if (errorLog.length > 0) {
            throw new Error(`${errorLog.join('; ')}`);
        }

        // You will see the responseMessage in the scheduled process log ONLY if the process runs automatically.
        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, responseMessage);
    } catch (error) {
        logger.info(`SCHGenerateWorkQueueExcelFiles: Error encountered ${error}`);

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
