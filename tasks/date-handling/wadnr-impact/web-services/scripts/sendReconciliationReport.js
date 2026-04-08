/**
 * sendReconciliationReport
 * Category: Scheduled
 * Modified: 2025-12-17T14:05:44.383Z by nicolas.culini@visualvault.com
 * Script ID: Script Id: 0a3c0b22-e4c5-f011-8303-9ca0b95120ed
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
    Script Name:    sendReconciliationReport
    Customer:       WADNR
    Purpose:        Email dailty the reconciliation report
    Preconditions:
                    -Daily Transaction Report exists
 
    Return Object:
                    Message will be sent back to VV as part of the ending of this scheduled process.
    Psuedo code:
                    1. Generate the Daily transaction report and download it as excel
                    2. Send email to defined addresses
 
    Date of Dev:    11/18/2025
    Last Rev Date:  11/18/2025
 
    Revision Notes:
                    11/18/2021 - Nicolas Culini:  First Setup of the script
    */

    logger.info(`Start of logic for sendReconciliationReport on ${new Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // You will see the responseMessage in the scheduled process log ONLY if the process runs manually.
    response.json(200, `Start of logic for sendReconciliationReport on ${new Date()}`);

    // Array for capturing error messages that may occur during the execution of the script.
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const tableDataQuery = 'zWebService Get Table Data For Daily Transaction';
    const headerDataQuery = 'zWebService Header Transaction Date Finance';
    const grandTotalQuery = 'zWebService Grand Total by Line Item Finance';
    const grandTotalDayQuery = 'zWebService Grand Total By Day Financial Report';

    /* -------------------------------------------------------------------------- */
    /*                              Script Variables                              */
    /* -------------------------------------------------------------------------- */

    // Contains the success or error response message
    let responseMessage = '';

    // Identifies the process in VV servers
    const scheduledProcessGUID = token;

    // Description used to better identify API methods errors
    let shortDescription = '';

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

    function getDates() {
        const now = new Date();

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        const day = yesterday.getDay();
        if (day === 0) {
            yesterday.setDate(yesterday.getDate() - 2);
        } else if (day === 6) {
            yesterday.setDate(yesterday.getDate() - 1);
        }

        const startDate = yesterday;
        startDate.setHours(0, 0, 0, 0);

        const endDate = yesterday;
        endDate.setHours(23, 59, 59, 0);

        return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    }

    async function generateDailyTransactionReport(data, headerData, grandTotalData, grandTotalDayData, imageBuffer) {
        const headers = [
            'Application ID',
            'FPAN Number',
            'Transaction ID',
            'Transaction Date',
            'Transaction Amount',
            'Permit Regions',
            'Account Number',
            'Confirmation Number',
            'Proponent First Name',
            'Proponent Last Name',
            'Account Holder Full Name',
            'Payer Name',
            'Street',
            'City',
            'State',
            'Zip Code',
            'Email Address',
            'ACH Return Code',
            'Payment Method Description',
            'Card Type Code Description',
            'Payment Code Description',
            'Authorization Medium Description',
        ];

        const dataMapping = {
            'Application ID': 'application ID',
            'FPAN Number': 'fpaN Number',
            'Transaction ID': 'transaction ID',
            'Transaction Date': 'transaction Date',
            'Transaction Amount': 'cart Transaction Amount',
            'Permit Regions': 'permit Regions',
            'Account Number': 'account Number',
            'Confirmation Number': 'confirmation Number',
            'Proponent First Name': 'proponent First Name',
            'Proponent Last Name': 'proponent Last Name',
            'Account Holder Full Name': 'account Holder Full Name',
            'Payer Name': 'account Holder Full Name',
            Street: 'payer Street',
            City: 'city',
            State: 'state',
            'Zip Code': 'zip Code',
            'Email Address': 'email Address',
            'ACH Return Code': 'acH Code',
            'Payment Method Description': 'payment Method Description',
            'Card Type Code Description': 'card Type Code Desc',
            'Payment Code Description': 'payment Code Desc',
            'Authorization Medium': 'authorization Medium Desc',
        };

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Daily Report');

        const logoId = workbook.addImage({
            buffer: imageBuffer,
            extension: 'png',
        });

        sheet.addImage(logoId, {
            tl: { col: 0, row: 0 },
            ext: { width: 150, height: 150 },
        });

        sheet.getRow(1).height = 115;

        sheet.mergeCells('A1:' + sheet.getColumn(headers.length).letter + '1');

        const titleCell = sheet.getCell('A1');
        titleCell.value = 'Daily Transactions Report';

        titleCell.font = { size: 20, bold: true };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.height = 30;

        sheet.getCell('G2').value = grandTotalDayData[0]['grand Total by Day'] ? 'Report Transaction Amount:' : '';
        sheet.getCell('G2').font = { bold: true };

        sheet.getCell('H2').value = grandTotalDayData[0]['grand Total by Day']
            ? `$${grandTotalDayData[0]['grand Total by Day']}`
            : '';
        sheet.getCell('H2').font = { bold: true };

        headerData.forEach((item) => {
            const row = sheet.addRow([
                'Details for Transaction Date:',
                `${formatDateLong(item['transaction Date'])}`,
                '',
                'Date Transaction Amount:',
                `$${item['date Transaction Amount']}`,
            ]);

            row.getCell(1).font = { bold: true };
            row.getCell(2).font = { bold: true };
            row.getCell(4).font = { bold: true };
            row.getCell(5).font = { bold: true };

            row.alignment = { vertical: 'middle' };
        });

        let r1 = sheet.addRow([]);

        r1.height = 18;

        let r2 = sheet.addRow([]);

        for (let col = 1; col <= headers.length; col++) {
            r2.getCell(col).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFA2AEB9' },
            };
        }
        r2.height = 18;

        let r3 = sheet.addRow([]);
        r3.height = 18;

        const headerRow = sheet.addRow(headers);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF305496' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
            cell.alignment = { horizontal: 'center' };
        });

        data.forEach((t) => {
            const rowValues = buildMappedRow(t, headers, dataMapping);
            const row = sheet.addRow(rowValues);

            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            });
        });

        sheet.columns.forEach((col) => {
            let max = 10;
            col.eachCell({ includeEmpty: true }, (cell) => {
                max = Math.max(max, cell.value ? cell.value.toString().length : 0);
            });
            col.width = max + 2;
        });

        sheet.addRow([]);

        sheet.getCell('G18').value = grandTotalData[0]['grand Total by Line Items'] ? 'Report Transaction Amount:' : '';
        sheet.getCell('G18').font = { bold: true };

        sheet.getCell('H18').value = grandTotalData[0]['grand Total by Line Items']
            ? `$${grandTotalData[0]['grand Total by Line Items']}`
            : '';
        sheet.getCell('H18').font = { bold: true };

        return await workbook.xlsx.writeBuffer();
    }

    function executeCustomQuery(queryName, dates) {
        shortDescription = 'Custom Query using SQL Parameters';
        const customQueryData = {
            params: JSON.stringify([
                {
                    parameterName: 'StartDate',
                    value: dates.startDate,
                },
                {
                    parameterName: 'EndDate',
                    value: dates.endDate,
                },
            ]),
        };

        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, customQueryData)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function buildMappedRow(obj, headers, mapping) {
        return headers.map((header) => {
            const key = mapping[header];

            if (key == 'transaction Date') {
                return key ? (formatDateLong(obj[key]) ?? '') : '';
            }

            return key ? (obj[key] ?? '') : '';
        });
    }

    function getDNRLogo() {
        const shortDescription = `Get DNR Logo`;
        const getDocsParams = {
            q: `FileName = 'dnr-logo.png'`,
        };

        return vvClient.documents
            .getDocuments(getDocsParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function getFileBytes(id) {
        return await vvClient.files.getFileBytesId(id);
    }

    function formatDateLong(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
        });
    }

    function getFolderID(folderPath) {
        const ignoreStatusCode = 403; // 403 is returned when the folder doesn't exist
        const shortDescription = `Get folder '${folderPath}'`;

        const getFolderParams = {
            folderPath: folderPath,
        };

        return vvClient.library
            .getFolders(getFolderParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode))
            .then((res) => checkDataPropertyExists(res, shortDescription, ignoreStatusCode))
            .then((res) => (res.data ? res.data.id : null));
    }

    function postDoc(docArgs) {
        const shortDescription = `Some description for th`;

        return vvClient.documents
            .postDoc(docArgs)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function postFile(docData, fileBuffer) {
        const shortDescription = `Post file fo`;

        return vvClient.files
            .postFile(docData, fileBuffer)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    function createFolder(folderPath, description) {
        const shortDescription = `Post folder '${folderPath}'`;
        return vvClient.library
            .postFolderByPath(null, description, folderPath)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data.id);
    }

    function createCommunicationLog(transactionDate) {
        const shortDescription = `Run Web Service: LibEmailGenerateAndCreateCommunicationLog`;

        const tokens = [
            {
                name: '[Transaction Date]',
                value: transactionDate,
            },
        ];

        const emailRequestArr = [
            { name: 'Email Name', value: 'Daily Finance Report' },
            { name: 'Tokens', value: tokens },
            { name: 'SendDateTime', value: '' },
            { name: 'RELATETORECORD', value: [] },
            {
                name: 'OTHERFIELDSTOUPDATE',
                value: {},
            },
        ];

        return vvClient.scripts
            .runWebService('LibEmailGenerateAndCreateCommunicationLog', emailRequestArr)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function relateDocumentToRecord(documentGUID, recordGUID) {
        const shortDescription = `Relate document '${documentGUID}' to form '${recordGUID}'`;

        return vvClient.forms
            .relateDocumentByDocId(recordGUID, documentGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    async function saveToDocLibraryCreateCommLogAndRelate(fileName, folderPath, pdfBytes, transactionDate) {
        let folderId = await getFolderID(folderPath);

        //if folder found get the id else create new folder
        if (!folderId) {
            folderId = await createFolder(folderPath, {
                description: fileName,
            });
        }

        const formattedDocName = `daily-report`;

        const docArgs = {
            documentState: 1,
            name: formattedDocName,
            description: formattedDocName,
            revision: '0',
            allowNoFile: true,
            fileLength: 0,
            fileName: `${fileName}.xlsx`,
            indexFields: '{}',
            folderId: folderId,
        };

        const newDoc = await postDoc(docArgs);

        const fileParams = {
            documentId: newDoc.id,
            name: newDoc.name,
            revision: '1',
            changeReason: '',
            checkInDocumentState: 'Released',
            fileName: newDoc.fileName,
            indexFields: '{}',
        };

        const newFile = await postFile(fileParams, pdfBytes);

        const commLog = await createCommunicationLog(transactionDate);

        await relateDocumentToRecord(newFile.data.name, commLog[3][3]);
        return newFile;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        const dates = getDates();

        const tableData = await executeCustomQuery(tableDataQuery, dates);
        const headerData = await executeCustomQuery(headerDataQuery, dates);
        const grandTotalData = await executeCustomQuery(grandTotalQuery, dates);
        const grandTotalDayData = await executeCustomQuery(grandTotalDayQuery, dates);
        const dnrLogo = await getDNRLogo();
        const dnrLogoBytes = await getFileBytes(dnrLogo[0].id);

        const reportBuffer = await generateDailyTransactionReport(
            tableData,
            headerData,
            grandTotalData,
            grandTotalDayData,
            dnrLogoBytes
        );

        await saveToDocLibraryCreateCommLogAndRelate(
            'daily-report-test',
            '/Testing2',
            reportBuffer,
            formatDateLong(dates.startDate)
        );

        responseMessage = 'Success';

        // You will see the responseMessage in the scheduled process log ONLY if the process runs automatically.
        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, responseMessage);
    } catch (error) {
        logger.info(`Error encountered ${error}`);

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
