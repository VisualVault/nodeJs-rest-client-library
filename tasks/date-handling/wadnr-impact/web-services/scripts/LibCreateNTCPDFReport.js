/**
 * LibCreateNTCPDFReport
 * Category: Workflow
 * Modified: 2026-02-19T11:37:59.07Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: 4f2d37b2-d0d1-f011-82fb-a3882b3d8540
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
    Script Name:    LibCreateNTCPDFReport
    Customer:       VisualVault
    Purpose:        Create a PDF report version of the Notice to Comply (NTC) and save it to the document library as "NTC Enforcement Report"
    Preconditions:
                    - Notice to Comply form template must exist
                    - NTC report design must be configured
                    - Email template "NTC Enforcement Report" must exist
                    - Document type "NTC Enforcement Report" must be configured
    Parameters:
                    Form ID - The Form ID of the Notice to Comply record
    Return Object:
                    1. MicroserviceResult - Return true if process ran successfully. Return false if an error occurred.
                    2. MicroserviceMessage - Message about what happened.
    Psuedo code:
                    1° Get the NTC form record
                    2° Generate the PDF report from the NTC report design
                    3° Determine folder path based on whether NTC Number exists (TEMP or permanent folder)
                    4° Save the PDF to the document library with document type "NTC Enforcement Report"
                    5° Relate the document to the NTC record
                    6° Update the NTC record with the PDF Report GUID and set Create Enforcement Report to False
                    7° Send notification email to the user who created the PDF

    Date of Dev:    12/05/2025
    Last Rev Date:  02/19/2026

    Revision Notes:
    12/05/2025 - Santiago Tortu: Initial setup for NTC Enforcement Report generation
    02/19/2026 - Alfredo Scilabra: Added support for primary record ID
    */

    logger.info('Start of the process LibCreateNTCPDFReport at ' + Date());

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

    const FOLDER_PATH_TEMP = 'ENFORCEMENT/TEMP/';
    const NTC_TEMPLATE_NAME = 'Notice to Comply';
    const NTC_REPORT_DESIGN = '23618273-3555-46df-a819-45101e01b587';
    const EMAIL_TEMPLATE_NAME = 'NTC Enforcement Report';

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

    function getPathFromFormNumber(appType, formNumber) {
        let formNumberArr = formNumber.split('-');
        if (formNumberArr.length < 4) return '';

        // Verify if both ending parts are numbers
        if (
            !/^\d+$/.test(formNumberArr[formNumberArr.length - 1]) ||
            !/^\d{2}$/.test(formNumberArr[formNumberArr.length - 2])
        )
            return '';

        let number = parseInt(formNumberArr[formNumberArr.length - 1], 10);
        let upper = Math.ceil(number / 1000) * 1000;
        let lower = upper - 999;
        let year = '20' + formNumberArr[formNumberArr.length - 2];

        return `/${appType}/${year}/${lower}-${upper}/${formNumber}`;
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
        const formattedDocName = `${fileName} NTC Enforcement Report`;
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
        const NTCFormID = getFieldValueByName('Form ID');

        // Check if the required parameters are present
        if (!NTCFormID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        const [NTCRecord] = await getFormRecords(
            {
                q: `[instanceName] eq '${NTCFormID}'`,
                expand: true,
            },
            NTC_TEMPLATE_NAME
        );

        const ntcPDFBuffer = await generateReportPdfTempFile(NTC_REPORT_DESIGN, {
            formID: NTCFormID,
        });

        if (!ntcPDFBuffer) {
            // Throw error if PDF generation failed
            throw new Error('Failed to generate NTC PDF report.');
        }

        const finalNTCPDFName = NTCRecord['ntC Number'] ? NTCRecord['ntC Number'] : NTCFormID;
        let folderPath = '';

        // Determine folder path based on whether NTC Number exists
        if (NTCRecord['ntC Number'] == null || NTCRecord['ntC Number'] == '') {
            // If no NTC Number, save to TEMP folder with Form ID
            folderPath = `${FOLDER_PATH_TEMP}${NTCFormID}`;
        } else {
            // If NTC Number exists, save to permanent folder
            folderPath = getPathFromFormNumber('ENFORCEMENT', NTCRecord['ntC Number']);
        }

        const indexFields = {
            'FPA Number': NTCRecord['fpaN Number'] ? NTCRecord['fpaN Number'] : '',
            'Document Type': 'NTC Enforcement Report',
        };

        const newDoc = await saveToDocLibrary(finalNTCPDFName, folderPath, ntcPDFBuffer, indexFields);
        const ntcPdfGUID = newDoc.id;

        // Relate the document to the NTC record
        await relateDocumentToRecord(NTCRecord.revisionId, ntcPdfGUID);

        // Update NTC record with PDF Report GUID to enable Print button visibility and set Create Enforcement Report to False
        await updateRecord(NTC_TEMPLATE_NAME, NTCRecord.revisionId, {
            'PDF Report GUID': ntcPdfGUID,
            'Create Enforcement Report': 'False',
        });

        // Send notification email per acceptance criteria 1b
        const tokens = [
            {
                name: '[Content]',
                value: `The NTC Enforcement Report of the Notice to Comply has been successfully created.\n\nTo view or print this document, open the Notice to Comply ${NTCFormID} and click the View PDF button.`,
            },
        ];
        await sendNotificationEmail(tokens, NTCRecord.modifyBy, NTCRecord.instanceName);

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
