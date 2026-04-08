/**
 * LibCreateNCNUPDFReport
 * Category: Workflow
 * Modified: 2026-02-19T11:24:17.01Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: 2d520429-b8d0-f011-8306-f1dc58f01122
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const path = require('path');
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
    Script Name:    LibCreateNCNUPDFReport
    Customer:       VisualVault
    Purpose:        This microservice generates a NCNU PDF report, saves it to the document library, updates the NCNU record with the PDF GUID, relate de document to NCNU and sends a notification email.
    Preconditions:
                    1° The microservice is called from a workflow on the NCNU form.

    Parameters:
    Return Object:
                    1. MicroserviceResult - Return true if process ran successfully.  Return false if an error occurred.
                    2. MicroserviceMessage - Message about what happened.
    Psuedo code:
                    1° Get required field values
                    2° Get NCNU record details
                    3° Generate NCNU PDF report
                    4° Check if the PDF report was generated successfully
                    5° Save the PDF report to the document library
                    6° Relate the document to the NCNU record and update the record with the PDF GUID and set Create Enforcement Report to False.
                    7° Send notification email

    Date of Dev:    12/02/2025
    Last Rev Date:  02/19/2026

    Revision Notes:
    12/02/2025 - Zharich Barona:  First Setup of the script
    02/19/2026 - Alfredo Scilabra: Added support for primary record ID
    */

    logger.info('Start of the process LibCreateNCNUPDFReport at ' + Date());

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

    /***********************
     Configurable Variables
    ************************/

    const BASE_PATH = path.dirname(require.main.filename);
    const TEMP_DIRNAME = path.join(BASE_PATH, 'files', 'temp');
    const FOLDER_PATH_TEMP = 'ENFORCEMENT/TEMP/';
    const NCNU_TEMPLATE_NAME = 'Notice of Conversion to Non Forestry Use';
    const NCNU_REPORT_DESIGN = '03d90768-2cbf-f011-8301-e3ab0356d115';
    const EMAIL_TEMPLATE_NAME = 'NCNU PDF Generation Process';

    /*****************
     Script Variables
    ******************/

    // Describes the process being checked using the parsing and checking helper functions
    let shortDescription = '';
    // Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete.
    const executionId = response.req.headers['vv-execution-id'];

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

    async function generateReportPdfTempFile(reportIdGuid, reportParams) {
        try {
            const reportPdfBuffer = await vvClient.reports.getReportPDF(reportIdGuid, reportParams);

            return reportPdfBuffer;
        } catch (error) {
            throw new Error(error);
        }
    }

    function getPathFromFormNumber(appType, ncnuNumber) {
        let ncnuARR = ncnuNumber.split('-');
        if (ncnuARR.length < 4) return '';

        //Verify if both ending parts are numbers
        if (!/^\d+$/.test(ncnuARR[ncnuARR.length - 1]) || !/^\d{2}$/.test(ncnuARR[ncnuARR.length - 2])) return '';

        let number = parseInt(ncnuARR[ncnuARR.length - 1], 10);
        let upper = Math.ceil(number / 1000) * 1000;
        let lower = upper - 999;
        let year = '20' + ncnuARR[ncnuARR.length - 2];

        return `/${appType}/${year}/${lower}-${upper}/${ncnuNumber}`;
    }

    function getFolderGUID(folderPath) {
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
            .then((res) => res.data);
    }

    function createFolder(folderPath, folderData) {
        const shortDescription = `Post folder '${folderPath}'`;

        return vvClient.library
            .postFolderByPath(null, folderData, folderPath)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data.id);
    }

    function createDoc(docArgs) {
        const shortDescription = `Create Document`;

        return vvClient.documents
            .postDoc(docArgs)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function createFile(fileParams, fileBuffer) {
        const shortDescription = `Post file for '${fileParams.name}'`;

        return vvClient.files
            .postFile(fileParams, fileBuffer)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function saveToDocLibrary(fileName, folderPath, pdfBytes, indexFields) {
        const foundFolder = await getFolderGUID(folderPath);

        let folderId;

        //if folder found get the id else create new folder
        if (foundFolder?.id) {
            folderId = foundFolder.id;
        } else {
            folderId = await createFolder(folderPath, {
                description: fileName,
            });
        }
        const formattedDocName = `${fileName} NCNU Enforcement Report`;
        const stringifyIndexFields = JSON.stringify(indexFields);
        const docArgs = {
            documentState: 1,
            name: formattedDocName,
            description: formattedDocName,
            revision: '0',
            allowNoFile: true,
            fileLength: 0,
            fileName: `${fileName}.pdf`,
            indexFields: stringifyIndexFields,
            folderId: folderId,
        };

        const newDoc = await createDoc(docArgs);

        const fileParams = {
            documentId: newDoc.id,
            name: newDoc.name,
            revision: '1',
            changeReason: '',
            checkInDocumentState: 'Released',
            fileName: newDoc.fileName,
            indexFields: stringifyIndexFields,
        };

        const newFile = await createFile(fileParams, pdfBytes);
        return newFile;
    }

    function updateRecord(formTemplateName, recordGUID, fieldValuesToUpdate) {
        const shortDescription = `Update form record ${recordGUID}`;

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
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

    async function sendNotificationEmail(tokens, emailAddress, relatedRecordID) {
        const emailRequestArr = [
            { name: 'Email Name', value: EMAIL_TEMPLATE_NAME },
            { name: 'Tokens', value: tokens },
            { name: 'Email Address', value: emailAddress },
            { name: 'Email AddressCC', value: '' },
            { name: 'SendDateTime', value: '' },
            { name: 'RELATETORECORD', value: [relatedRecordID] },
            { name: 'OTHERFIELDSTOUPDATE', value: { 'Primary Record ID': relatedRecordID } },
        ];
        const [LibEmailGenerateAndCreateCommunicationLogStatus, , comLogResult] = await callExternalWs(
            'LibEmailGenerateAndCreateCommunicationLog',
            emailRequestArr
        );

        if (LibEmailGenerateAndCreateCommunicationLogStatus !== 'Success') {
            throw new Error('Error sending notifications.');
        }

        return comLogResult;
    }

    function relateDocumentToRecord(recordGUID, documentGUID) {
        const shortDescription = `Relate document '${documentGUID}' to form '${recordGUID}'`;

        return vvClient.forms
            .relateDocument(recordGUID, documentGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1. Get required field values
        const NCNUFormID = getFieldValueByName('Form ID');

        // Check is the required parameters are present
        if (!NCNUFormID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 2. Get NCNU record details
        const [NCNURecord] = await getFormRecords(
            {
                q: `[instanceName] eq '${NCNUFormID}'`,
                expand: true,
            },
            NCNU_TEMPLATE_NAME
        );

        // 3. Generate NCNU PDF report
        const ncnuPDFBufer = await generateReportPdfTempFile(NCNU_REPORT_DESIGN, {
            formID: NCNUFormID,
        });

        // 4. Check if the PDF report was generated successfully
        if (!ncnuPDFBufer) {
            // Throw every error getting field values as one concatenated string
            throw new Error('Failed to generate NCNU PDF report.');
        }

        // 5. Save the PDF report to the document library
        const finalNCNUPDFName = NCNURecord['ncnU Number'] ? NCNURecord['ncnU Number'] : NCNUFormID;
        let folderPath = '';

        if (NCNURecord['ncnU Number'] == null || NCNURecord['ncnU Number'] == '') {
            folderPath = `${FOLDER_PATH_TEMP}${NCNUFormID}`;
        } else {
            folderPath = getPathFromFormNumber('ENFORCEMENT', NCNURecord['ncnU Number']);
        }

        const indexFields = {
            'FPA Number': NCNURecord['fpaN Number'] ? NCNURecord['fpaN Number'] : '',
            'Document Type': 'NCNU Enforcement Report',
        };

        const newDoc = await saveToDocLibrary(finalNCNUPDFName, folderPath, ncnuPDFBufer, indexFields);

        // 6. Relate the document to the NCNU record and update the record with the PDF GUID and set Create Enforcement Report to False.
        const ncnuPdfGUID = newDoc.id;

        await relateDocumentToRecord(NCNURecord.revisionId, ncnuPdfGUID);

        await updateRecord(NCNU_TEMPLATE_NAME, NCNURecord.revisionId, {
            'PDF Report GUID': ncnuPdfGUID,
            'Create Enforcement Report': 'False',
        });

        // 7. Send notification email
        const tokens = [
            {
                name: '[Content]',
                value: `The NCNU PDF has been successfully created. To view or print this document, open the NCNU ${NCNUFormID} and click the Print button.`,
            },
        ];
        await sendNotificationEmail(tokens, NCNURecord.modifyBy, NCNURecord.instanceName);

        returnObject = {
            MicroserviceResult: true,
            MicroserviceMessage: 'Microservice completed successfully',
            Success: 'OK',
        };
    } catch (err) {
        logger.info('Error encountered' + err);

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: err,
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
