/**
 * LibPDFCreationGeneratePDF
 * Category: Workflow
 * Modified: 2026-04-02T13:36:40.4Z by sebastian.rolando@visualvault.com
 * Script ID: Script Id: f33e2496-fd78-f011-82e5-e783971c7bf6
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const fs = require('fs');
const PDFMerger = require('pdf-merger-js');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const libre = require('libreoffice-convert');
const path = require('path');
const { promisify } = require('util');
const emlParser = require('eml-parser');
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
    Script Name:    LibPDFCreationGeneratePDF
    Customer:       WADNR
    Purpose:        This library is a centralized process to generate PDF packages for the FPAN/Application Review
                    Page or the WTMF/WTM Review Page. This process will be called from a process design studio workflow.
    Preconditions:
                    - List of libraries, form, queries, etc. that must exist in order this code to run
                    - You can also list other preconditions as users permissions, environments, etc
    Parameters:
                    - Form ID:      This is the Form ID of the PDF Creation Record where the information
                                    needs to be acquired.
                    - Type:         FPA or WTM

    Pseudo code:
                  1. Get the PDF Creation record passed into this library.
                  2. Acquire the order of documents as they should appear in the PDF from the PDF Creation record from the saved JSON version of the order.
                  3. Get list of forms associated with the PDF Creation that have a report and then use the API call to make a PDF of the report.
                  4. Get a list of forms associated with the PDF Creation that do not have a report. Then make an API call to generate a PDF of the form record.
                  5. Get list of associated documents and measure if any are unsupported document types.
                  6. Generate the Office Review Summary and create a PDF of it to insert as the first item in the PDF packet.
                  7. Order the PDF files with the Office Review Summary first and then the other PDFs in the
                  8. Determine if the folder exists for the FPAN or WTM (/FPA/[YYYY]/[RANGE]/[FPA NUMBER]/)
                  9. Get the FPA External PDF record or WTM External Record.
                  10. Update the GUID of the newly uploaded/checked in PDF in the Application Review Page or the WTM Revie Page.
                  11. Clean up the PDF files generated in this process on the local disk.
                  12. Update the PDF Create Date and Status on the PDF Creation record.
                  13. Return success to the workflow with type of the forest activity (FPA or WTM).
                  14. Notify user.


    Date of Dev:    08/12/2025

    Revision Notes:
                    08/12/2025 - Alfredo Scilabra: First Setup of the script
                    09/02/2025 - Alfredo Scilabra: Add Receipt Date to Associated Doc Relation record
                    09/26/2025 - Alfredo Scilabra: Fix dedup in getAssociatedElements
                    11/13/2025 - Ross Rhone: Added "offline" index field to saved PDF document for Box upload
                    11/13/2025 - Alfredo Scilabra: Fix bug with getDocuments search
                    11/17/2025 - Sebastian Rolando: Add the creation for WTMF Decision Summary Report when type is for WTMF
                    11/24/2025 - Ross Rhone: Added commented out option for automatic folder index field population when creating folders in the document library
                    12/05/2025 - Zharich Barona: Add and improve notification email when errors occurs.
                    12/12/2025 - Ross Rhone: Added the Document Type index field to the saved PDF document (FPAN External or WTM External)
                    12/16/2025 - Mauro Rapuano: Fix on Email Template names
                    12/19/2025 - Matías Andrade: removed the inbound 'Type' parameter and now infer the PDF type at runtime from 'Related Record ID' to route the correct PDF generation flow.
                    12/19/2025 - Mauro Rapuano: Added Office Review Summary Report generation back for FPA type
                    01/02/2026 - Alfredo Scilabra: Fix flow for unsupported file types
                    01/05/2026 - Federico Cuelho: Added fix to error notification conditions and email template project name.
                    01/06/2026 - Federico Cuelho: Added missing call to sendNotificationEmail when success.
                    01/15/2026 - Federico Cuelho: Added NOD to FORMS_WITH_REPORT instead of adding it as form record.
                    01/21/2026 - Lucas Herrera: Update flag on parent from on completed process
                    01/22/2026 - Mauro Rapuano: Modified to skip relateDocumentToRecord since the relation is created when saving to the document library
                    02/06/2026 - Mauro Rapuano: Added all Appendix reports to list of FORMS_WITH_REPORT
                    02/09/2026 - Federico Cuelho: Added timezone handling to timestamp generation function.
                    02/19/2026 - Alfredo Scilabra: Added support for primary record ID
                    03/04/2026 - Zharich Barona: Modified the value to update de ARP or WTMF record to the string 'False' instead of boolean false to match the field type in VV and avoid errors when updating the record.
                    03/19/2026 - John Sevilla: Update folder path derivation to account for legacy FPA numbers 
                    04/02/2026 - Sebastian Rolando: Fix issues with the error handling. Change error email to PDF Package createdBy and update err response to err.message. 
    */

    logger.info('Start of the process LibPDFCreationGeneratePDF at ' + Date());

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    let returnObject;

    // Respond immediately before the "processing"
    const responseParams = {
        success: true,
        message: 'Process started successfully.',
    };
    response.json(200, responseParams);

    // Array for capturing error messages that may occur during the process
    let errorLog = [];
    let unsupportedFileFound = false;

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const SUPPORTED_DOCUMENT_TYPES = ['doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'pdf', 'eml', 'msg'];

    const EMAIL_TYPES = ['eml', 'msg'];

    //Form template Name - report ID
    const FORMS_WITH_REPORT = new Map([
        ['FPAN Amendment Request', 'd6413c96-8032-f011-82dc-c4855cbaa12f'],
        ['Forest Practices Aerial Chemical Application', '6c3f7c76-0431-f011-82d4-c3102142a75d'],
        ['Forest Practices Application Notification', 'aca9d95d-ed3f-f011-82e0-d8dee4ae92ba'],
        ['Long-Term Application 5-Day Notice', '34a47bd4-df21-f011-82cd-cce61d1869ed'],
        ['Step 1 Long Term FPA', '16cb4097-b334-f011-82d7-c622ac070367'],
        ['FPAN Renewal', '9c48546d-9431-f011-82d4-c3102142a75d'],
        ['FPAN Notice of Decision', '32c15b12-b3b9-f011-8300-a622a2f9d596'],
        ['FPAN Notice of Transfer', 'c39bb4ea-03ab-4f13-8aa8-4eef379bdeb6'],
        ['Appendix A Water Type Classification', 'be5ea9dc-40a2-4059-8d8f-f35d8363d136'],
        ['Appendix D Slope Stability Informational', 'cc0f8808-d6f4-415e-a167-4262080b9060'],
        ['Appendix H Eastern Washington Natural Regeneration Plan', '59a41e29-adaa-f011-82fb-84a2e0f8f11d'], //EW Region
        ['Appendix J Forest Practices Marbled Murrelet', '0c9d01b1-8eae-f011-82fb-84a2e0f8f11d'],
    ]);
    const APP_H_WW_REPORT_ID = '46bace2e-6cab-f011-82fb-84a2e0f8f11d';
    const BASE_PATH = path.dirname(require.main.filename);
    const TEMP_DIRNAME = path.join(BASE_PATH, 'files', 'temp');
    const WADNR_TIMEZONE = 'America/Los_Angeles';
    const dateOnlyISOStringFormat = 'YYYY-MM-DD';
    const DOWNLOADED_DOCS = [];
    const EMAIL_ERROR_TEMPLATE_NAME = 'PDF Creation Error';
    const EMAIL_TEMPLATE_NAME = 'PDF Package Generation Process';
    let errorNotificationEmail = null;

    /* -------------------------------------------------------------------------- */
    /*                           Script Variables                                 */
    /* -------------------------------------------------------------------------- */

    // Describes the process being checked using the parsing and checking helper functions
    let shortDescription = '';

    // Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete.
    const executionId = response.req.headers['vv-execution-id'];

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

    function checkDataIsNotEmpty(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
          Checks that the data property of a vvClient API response object is not empty
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
                        `${shortDescription} returned an error. Please, check called Web Service. Status: ${status}.`
                    );
                }
            }
        }
        return vvClientRes;
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

    function isNullEmptyUndefined(param) {
        if (param === null || param === undefined) {
            return true;
        }
        const dataType = Object.prototype.toString.call(param).slice(8, -1).toLowerCase(); //slicing the string returned by the toString method to remove the first eight characters ("[object ") and the last character (]), leaving only the name of the data type.
        switch (dataType) {
            case 'string':
                if (
                    param.trim().toLowerCase() === 'select item' ||
                    param.trim().toLowerCase() === 'null' ||
                    param.trim().toLowerCase() === 'undefined' ||
                    param.trim() === ''
                ) {
                    return true;
                }
                break;
            case 'array':
                if (param.length === 0) {
                    return true;
                }
                break;
            case 'object':
                if (Object.keys(param).length === 0) {
                    return true;
                }
                break;
            default:
                return false;
        }
        return false;
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

    function createFormRecord(formTemplateName, newRecordData) {
        const shortDescription = `Post form ${formTemplateName}`;

        return vvClient.forms
            .postForms(null, newRecordData, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function getDocument(documentName) {
        const shortDescription = `Get Documents Data for '${documentName}'`;
        const getDocsParams = {
            q: `Name = '${documentName}'`, // Globally unique "name" (e.g. "FPA-DOC-000001")
        };

        return vvClient.documents
            .getDocuments(getDocsParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function saveTempFile(fileName, fileBytes, ext = 'pdf') {
        const filePath = path.join(TEMP_DIRNAME, `${fileName}.${ext}`);
        fs.writeFileSync(filePath, fileBytes);
        return filePath;
    }

    async function generateReportPdfTempFile(reportIdGuid, reportParams, tempFileName) {
        try {
            const reportPdfBuffer = await vvClient.reports.getReportPDF(reportIdGuid, reportParams);
            const reportPdfTempFile = saveTempFile(tempFileName, reportPdfBuffer);

            return reportPdfTempFile;
        } catch (error) {
            throw new Error(error);
        }
    }

    async function getFormToPDF(templateId, instanceId, tempFileName) {
        try {
            const pdfBuffer = await vvClient.forms.getFormInstancePDF(templateId, instanceId);
            const pdfTempFile = saveTempFile(tempFileName, pdfBuffer);

            return pdfTempFile;
        } catch (error) {
            throw new Error('Error generating form pdf temp file.');
        }
    }

    async function getTemplateIdByName(templateName) {
        const getTemplateIdResult = await vvClient.forms.getFormTemplateIdByName(templateName);
        return getTemplateIdResult?.templateIdGuid || null;
    }

    async function mergeTempFilesToPdfByteArray(filesToMergeArray) {
        let mergedPdfBuffer = [];

        if (filesToMergeArray.length > 0) {
            const merger = new PDFMerger();
            for (let i = 0; i < filesToMergeArray.length; i++) {
                const filePath = filesToMergeArray[i];
                //skip if filePath is empty string
                if (filePath) {
                    await merger.add(filePath);
                }
            }

            //merger.save(filePath) can also be used
            mergedPdfBuffer = await merger.saveAsBuffer();

            //clean up temp files
            for (let i = 0; i < filesToMergeArray.length; i++) {
                const filePath = filesToMergeArray[i];
                //deletes file if exists
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        }
        return mergedPdfBuffer;
    }

    function removeFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const filePath = files[i];
            //deletes file if exists
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
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
    /*
  TODO: Re-add if needed later for migrations of environments
  this will be used in getting the index fields and then setting the folder index fields
  when automatically creating folders in the document library

  https://docs.visualvault.com/docs/indexfields-1

  function getAllIndexFields() {
    const shortDescription = `Get all index fields`;

    return vvClient.library
      .getIndexFields()
      .then((res) => parseRes(res))
      .then((res) => checkMetaAndStatus(res, shortDescription))
      .then((res) => checkDataPropertyExists(res, shortDescription))
      .then((res) => checkDataIsNotEmpty(res, shortDescription))
      .then((res) => res.data);
  } */

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

            /*
        TODO: Re-add if needed later for migrations of environments
        this will be used in getting the index fields and then setting the folder index fields
        when automatically creating folders in the document library



      //Set the index fields to the newly created folder
      const allIndexFields = await getAllIndexFields();
      const folderIndexFields = {};
      for (const indexField of allIndexFields) {
        const indexFieldName = indexField.name;
        if (indexFields.hasOwnProperty(indexFieldName)) {
          folderIndexFields[indexFieldName] = indexFields[indexFieldName];
        }
      }
      const folderIndexFieldsStringified = JSON.stringify(folderIndexFields);

      const updateFolderParams = {
        indexFields: folderIndexFieldsStringified,
      };
      await vvClient.library.updateFolderById(folderId, updateFolderParams);
      //End of setting index fields to the newly created folder*/
        }
        const formattedDocName = `${fileName} PDF Packet`;
        const stringifyIndexFields = JSON.stringify(indexFields);
        const docArgs = {
            documentState: 1,
            name: formattedDocName,
            description: formattedDocName,
            revision: '0',
            allowNoFile: true,
            fileLength: 0,
            fileName: `${fileName}.pdf`,
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

    async function updateToDocLibrary(documentData, pdfBytes, indexFields) {
        const stringifyIndexFields = JSON.stringify(indexFields);

        const fileParams = {
            documentId: documentData.id,
            name: documentData.name,
            revision: Number(documentData.revision) + 1,
            changeReason: '',
            checkInDocumentState: 'Released',
            fileName: documentData.fileName,
            indexFields: stringifyIndexFields,
        };

        const newFile = await createFile(fileParams, pdfBytes);
        return newFile;
    }

    async function convertEmailToPdf(sourceEmailFilePath, targetPdfFilePath, extension) {
        const emailFile = fs.createReadStream(sourceEmailFilePath);
        const errorFilePath = `${TEMP_DIRNAME}errorConvertEmail.txt`;

        return new emlParser(emailFile)
            .convertEmailToStream('pdf')
            .then((stream) => {
                return new Promise((resolve, reject) => {
                    stream
                        .pipe(fs.createWriteStream(targetPdfFilePath))
                        .on('finish', () => resolve(targetPdfFilePath))
                        .on('error', reject);
                });
            })
            .catch(async () => {
                fs.writeFileSync(
                    errorFilePath,
                    `error converting ${extension} to pdf. Generating download failed text page.`
                );
                return errorFilePath;
            });
    }

    async function getPDFOutputForDocument(documentName) {
        const [targetDoc] = await getDocument(documentName);
        if (!targetDoc) return '';

        const { id: fileRevisionId, name: docId, extension } = targetDoc;
        const fileExtension = extension.toLowerCase();
        const fileBytes = await vvClient.files.getFileBytesId(fileRevisionId);

        let filePath = path.join(TEMP_DIRNAME, `${fileRevisionId}.${fileExtension}`);
        const pdfOutputPath = path.join(TEMP_DIRNAME, `${fileRevisionId}.pdf`);

        // Handle unsupported types
        if (!SUPPORTED_DOCUMENT_TYPES.includes(fileExtension)) {
            fs.writeFileSync(
                filePath,
                `Unsupported file type "${fileExtension}" found. Please convert Document Id ${docId} to PDF, WORD, EXCEL, PNG, or JPG format for printing.`
            );
            unsupportedFileFound = true;
        } else {
            // Save original file
            fs.writeFileSync(filePath, fileBytes);
        }

        //Save filepath for cleanup later
        DOWNLOADED_DOCS.push(filePath);

        // Already a PDF
        if (fileExtension === 'pdf') {
            return filePath;
        }

        // Handle email types
        if (EMAIL_TYPES.includes(fileExtension)) {
            return await convertEmailToPdf(filePath, pdfOutputPath, fileExtension);
        }
        // Convert supported file types to PDF using LibreOffice
        const inputBuffer = fs.readFileSync(filePath);
        libre.convertAsync = promisify(libre.convert);
        const pdfBuffer = await libre.convertAsync(inputBuffer, '.pdf', undefined);
        fs.writeFileSync(pdfOutputPath, pdfBuffer);

        return pdfOutputPath;
    }

    async function addPageHeader(sourcePdfPath, headerArray) {
        // Load the original bytes
        const sourceBytes = fs.readFileSync(sourcePdfPath);
        const sourcePdf = await PDFDocument.load(sourceBytes);

        // Create a new PDF and copy pages over
        const newPdf = await PDFDocument.create();
        const helveticaFont = await newPdf.embedFont(StandardFonts.Helvetica);

        const copiedPages = await newPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());

        const fontSize = 9;
        const lineHeight = fontSize + 5;
        const margin = 20;

        for (const page of copiedPages) {
            newPdf.addPage(page);

            const { height } = page.getSize();
            let yPosition = height - margin;

            headerArray.forEach((headerText, j) => {
                page.drawText(headerText, {
                    x: margin,
                    y: yPosition - j * lineHeight,
                    size: fontSize,
                    font: helveticaFont,
                    color: rgb(0, 0, 0),
                });
            });
        }

        // Write the rebuilt PDF back to the same file (safe overwrite)
        fs.writeFileSync(sourcePdfPath, await newPdf.save());
    }

    function getPathFromFormNumber(appType, applicationNumber) {
        applicationNumber = String(applicationNumber).trim();

        // Validate the against the fpOnline number formats
        const fpOnlineNumberFormatMatch = applicationNumber.match(/^[^-]+-[^-]+-(\d{2})-(\d+)/);
        if (fpOnlineNumberFormatMatch) {
            let [, year, sequenceNumber] = fpOnlineNumberFormatMatch;
            year = '20' + year;
            sequenceNumber = parseInt(sequenceNumber, 10);
            const upper = Math.ceil(sequenceNumber / 1000) * 1000;
            const lower = upper - 999;

            return `/${appType}/${year}/${lower}-${upper}/${applicationNumber}`;
        }

        // If unable to match above, validate against the legacy FPA number format
        const legacyFPANumberFormatMatch = applicationNumber.match(/^\d+$/);
        if (legacyFPANumberFormatMatch) {
            return `/${appType}/Legacy/${applicationNumber}`;
        }

        // If nothing matches, return an empty string
        return '';
    }

    function getTimestamp() {
        const now = dayjs().tz(WADNR_TIMEZONE);
        const date = now.format(dateOnlyISOStringFormat);
        const time = now.format('HH:mm');
        return `${date} ${time}`;
    }

    async function getAssociatedElements(relatedRecordID) {
        const associatedElements = await getFormRecords(
            {
                q: `[ARP ID or WTM RP ID] eq '${relatedRecordID}' AND [Print Order] ne 'Not Printed'`,
                expand: true,
            },
            'Associated Document Relation'
        );

        //De-duplicate elements
        const seen = new Set();
        const uniqueAssociatedElements = associatedElements.filter((el) => {
            if (seen.has(el['document GUID'])) return false;
            seen.add(el['document GUID']);
            return true;
        });

        //Sort by Print Order
        uniqueAssociatedElements.sort((a, b) => parseInt(a['print Order']) - parseInt(b['print Order']));
        return uniqueAssociatedElements;
    }

    async function getPDFOutputForAssociatedElements(associatedElements, regionZone) {
        const associatedElementsPDFs = [];
        for (let i = 0; i < associatedElements.length; i++) {
            const element = associatedElements[i];
            let pdfOutput;
            if (element['document or Form'] === 'Document') {
                pdfOutput = await getPDFOutputForDocument(element['document Form Name']);
                associatedElementsPDFs.push(pdfOutput);
            } else {
                const tempFileName = `form${i}PDF`;
                if (FORMS_WITH_REPORT.has(element['document Form Name'])) {
                    // make a PDF of the report
                    let reportID = FORMS_WITH_REPORT.get(element['document Form Name']);

                    // If form is Appendix H, determine which report to use based on region zone
                    if (
                        element['document Form Name'] === 'Appendix H Eastern Washington Natural Regeneration Plan' &&
                        regionZone === 'WW'
                    ) {
                        reportID = APP_H_WW_REPORT_ID;
                    }

                    pdfOutput = await generateReportPdfTempFile(
                        reportID,
                        {
                            formId: element['related Record ID'],
                        },
                        tempFileName
                    );
                } else {
                    //generate pdf of form record
                    const targetTemplateID = await getTemplateIdByName(element['document Form Name']);
                    if (!targetTemplateID) continue; //Form template not found move on.

                    pdfOutput = await getFormToPDF(targetTemplateID, element['document GUID'], tempFileName);
                }
                associatedElementsPDFs.push(pdfOutput);
            }
        }
        return associatedElementsPDFs;
    }

    function relateDocumentToRecord(recordGUID, documentGUID) {
        const shortDescription = `Relate document '${documentGUID}' to form '${recordGUID}'`;

        return vvClient.forms
            .relateDocument(recordGUID, documentGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
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

    async function sendNotificationEmail(emailTemplate, tokens, emailAddress, relatedRecordID) {
        const emailRequestArr = [
            { name: 'Email Name', value: emailTemplate },
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

    async function getEnvConfig() {
        const envConfigResults = await getFormRecords(
            {
                expand: true,
            },
            'zEnvironmentConfiguration'
        );

        const envConfig = envConfigResults.find(
            (config) =>
                !isNullEmptyUndefined(config['envConfig XCID']) && !isNullEmptyUndefined(config['envConfig XCDID'])
        );

        if (isNullEmptyUndefined(envConfig)) {
            throw new Error('Error getting environment config.');
        }

        return envConfig;
    }

    function createPdfPackageLink(envConfig, pdfPackageGUID) {
        const { customerAlias, databaseAlias } = module.exports.getCredentials();
        const baseUrl = vvClient.getBaseUrl();

        const url = new URL(`${baseUrl}/Public/${customerAlias}/${databaseAlias}/FormViewer/app`);
        url.searchParams.set('DataID', pdfPackageGUID);
        url.searchParams.set('xcid', envConfig['envConfig XCID']);
        url.searchParams.set('xcdid', envConfig['envConfig XCDID']);
        url.searchParams.set('hidemenu', true);
        return url.toString();
    }

    function getUserGuid(userID) {
        const shortDescription = `Get user for user ID: ${userID}`;
        const getUserQuery = {
            q: `[userid] eq '${userID}'`, // userID = 'user@id.com'
            expand: 'true',
        };

        return vvClient.users
            .getUser(getUserQuery)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function getRecordRelatedDocs(recordGUID) {
        const shortDescription = `Get forms related to ${recordGUID}`;

        return (
            vvClient.forms
                .getFormRelatedDocs(recordGUID, null)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                // .then((res) => checkDataIsNotEmpty(res, shortDescription)) // Commented out to allow for records with no related docs
                .then((res) => res.data)
        );
    }

    function getRegionZone(region) {
        let regionZone = 'EW';

        switch (region) {
            case 'Northeast':
                regionZone = 'EW';
                break;
            case 'Southeast':
                regionZone = 'EW';
                break;
            case 'Northwest':
                regionZone = 'WW';
                break;
            case 'Olympic':
                regionZone = 'WW';
                break;
            case 'Pacific Cascade':
                regionZone = 'WW';
                break;
            case 'South Puget Sound':
                regionZone = 'WW';
                break;
        }

        return regionZone;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get parameters
        const pdfCreationID = getFieldValueByName('Form ID');
        const relatedRecordID = getFieldValueByName('Related Record ID');

        // Detect type based on Related Record ID
        let type = '';
        const relatedRecordIDUpper = (relatedRecordID || '').toUpperCase();

        if (relatedRecordIDUpper.includes('APPLICATION')) {
            type = 'FPA';
        } else if (relatedRecordIDUpper.includes('WTMRP')) {
            type = 'WTMRP';
        } else {
            // If neither token is present, we cannot infer the type safely
            throw new Error(
                `Unable to detect PDF type. Related Record ID does not contain 'APPLICATION' or 'WTMRP'. Related Record ID: ${relatedRecordID}`
            );
        }

        // Check required parameters
        if (!pdfCreationID || !relatedRecordID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        const isFPA = type === 'FPA';

        // #1
        const [pdfCreationRecord] = await getFormRecords(
            {
                q: `[instanceName] eq '${pdfCreationID}'`,
                expand: true,
            },
            'PDF Package Generation'
        );

        if (!pdfCreationRecord) {
            throw new Error('PDF Creation Record not found for the provided Form ID.');
        }

        errorNotificationEmail = pdfCreationRecord.createBy;

        const rpOrWtmTemplateName = isFPA ? 'Application Review Page' : 'WTM Review Page';
        const [arpOrWtmRecord] = await getFormRecords(
            {
                q: `[instanceName] eq '${pdfCreationRecord['related Record ID']}'`,
                expand: true,
            },
            rpOrWtmTemplateName
        );
        if (!arpOrWtmRecord) {
            throw new Error(`${rpOrWtmTemplateName} not found for the provided Form ID.`);
        }

        // #2 Get associated elements
        const associatedElements = await getAssociatedElements(pdfCreationRecord['related Record ID']);

        //Create TEMP folder if not exists
        fs.mkdirSync(TEMP_DIRNAME, { recursive: true });
        //# 3 and 4

        const regionZone = getRegionZone(arpOrWtmRecord['region']);
        const associatedElementsPDFs = await getPDFOutputForAssociatedElements(associatedElements, regionZone);

        // If Type is for WTMF, then add the Decision Summary Report as the first page of the PDF
        if (!isFPA) {
            const WTMFDecisionSummaryReportPDFReportID = '1a7fe47e-52a8-4ce7-8457-5384c61f8616';
            const WTMFDecisionSummaryReportPDFTempFileName = 'Water Type Modification Form Summary Report PDF';
            const WTMFDecisionSummaryReportPDFParams = {
                formId: pdfCreationRecord['related Record ID'],
            };

            const WTMFDecisionSummaryReportPDF = await generateReportPdfTempFile(
                WTMFDecisionSummaryReportPDFReportID,
                WTMFDecisionSummaryReportPDFParams,
                WTMFDecisionSummaryReportPDFTempFileName
            );
            associatedElementsPDFs.unshift(WTMFDecisionSummaryReportPDF);
        } else {
            const FPADecisionSummaryReportPDFReportID = '20f11f8c-32dc-f011-82fe-83085a48d862';
            const FPADecisionSummaryReportPDFTempFileName = 'Forest Practices Application Form Summary Report PDF';
            const FPADecisionSummaryReportPDFParams = {
                formId: pdfCreationRecord['related Record ID'],
            };

            const FPADecisionSummaryReportPDF = await generateReportPdfTempFile(
                FPADecisionSummaryReportPDFReportID,
                FPADecisionSummaryReportPDFParams,
                FPADecisionSummaryReportPDFTempFileName
            );
            associatedElementsPDFs.unshift(FPADecisionSummaryReportPDF);
        }

        //TODO: Un-comment this when Office Review Summary form is ready
        // #6 Office Review Summary creation
        // const officeReviewSummary = await createFormRecord('Office Review Summary', {});
        // const officeReviewSummaryTemplateID = await getTemplateIdByName('Office Review Summary');
        // const officeReviewSummaryPDF = await getFormToPDF(
        //   officeReviewSummaryTemplateID,
        //   officeReviewSummary.revisionId,
        //   'officeReviewSummary'
        // );

        // #7 Sorting by print order and Office Review Summary PDF as first page
        const readyToPrintElements = [/*officeReviewSummaryPDF,*/ ...associatedElementsPDFs];

        //#7 headers
        const timestamp = getTimestamp();
        const applicationNumber = isFPA ? arpOrWtmRecord['fpaN Number'] : arpOrWtmRecord['wtmF No'];
        for (let i = 0; i < readyToPrintElements.length; i++) {
            const pdfPath = readyToPrintElements[i];
            await addPageHeader(pdfPath, [applicationNumber, timestamp]);
        }
        const finalPDFName = `${isFPA ? 'fpa' : 'wtm'}-${applicationNumber}`;
        const region = arpOrWtmRecord['region'];

        //#8 Check folder existence
        const folderPath = getPathFromFormNumber(isFPA ? 'FPA' : 'WTM', applicationNumber);

        const folderExists = fs.existsSync(folderPath);
        if (!folderExists) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        //Create and merge pdfs here
        const mergedPdfBuffer = await mergeTempFilesToPdfByteArray(readyToPrintElements);
        //Clean up downloaded files
        removeFiles(DOWNLOADED_DOCS);

        const docType = isFPA ? 'FPAN External' : 'WTM External';

        const indexFields = {
            'FPA Number': applicationNumber,
            Offline: true,
            isInBox: false,
            Region: region,
            'Document Type': docType,
            'Print Order': 'Not Printed',
        };
        logger.info(
            'LibPDFCreationGeneratePDF: Attempting to save file ' + +folderPath + finalPDFName + ' to document library.'
        );
        logger.info('LibPDFCreationGeneratePDF: Index Fields ' + JSON.stringify(indexFields) + ' to document library.');

        const relatedDocs = await getRecordRelatedDocs(arpOrWtmRecord.revisionId);
        let newDoc;

        if (relatedDocs && relatedDocs.length > 0) {
            // filter array of objects to find object with matching description
            const pdfDoc = relatedDocs.find((doc) => doc.description === `${finalPDFName} PDF Packet`);
            if (pdfDoc) {
                newDoc = await updateToDocLibrary(pdfDoc, mergedPdfBuffer, indexFields);
            } else {
                newDoc = await saveToDocLibrary(finalPDFName, folderPath, mergedPdfBuffer, indexFields);
            }
        } else {
            newDoc = await saveToDocLibrary(finalPDFName, folderPath, mergedPdfBuffer, indexFields);
        }

        //Save final merged PDF
        const mergedPdfDocID = newDoc.documentId;
        const mergedPdfGUID = newDoc.id;

        //#9 Check if external record exist
        const externalDocType = isFPA ? 'FPAN External' : 'WTM External';
        const [pdfExternalRecord] = await getFormRecords(
            {
                q: `[ARP ID or WTM RP ID] eq '${arpOrWtmRecord.instanceName}' AND [Document Form Type] eq '${externalDocType}'`,
                expand: true,
            },
            'Associated Document Relation'
        );

        const currDateStr = dayjs().tz(WADNR_TIMEZONE).startOf('day').format(dateOnlyISOStringFormat);

        if (pdfExternalRecord) {
            //Update record
            const updatedRecord = await updateRecord('Associated Document Relation', pdfExternalRecord.revisionId, {
                'Document GUID': mergedPdfGUID,
            });
        } else {
            //Creat new associated record
            const createdPdfExternalRecord = await createFormRecord('Associated Document Relation', {
                'Document Form Name': 'PDF Packet',
                'Document Form Type': externalDocType,
                'Sensitive Indicator': 'No',
                'Document Form Status': 'Released',
                'Document Create By': 'fpOnline',
                'Document Create Date': currDateStr,
                'Document Modify By': 'fpOnline',
                'Document Modify Date': currDateStr,
                'Document GUID': mergedPdfGUID,
                'Related Record ID': mergedPdfDocID,
                'ARP ID or WTM RP ID': arpOrWtmRecord.instanceName,
                'Print Order': 'Not Printed',
                'Receipt Date': currDateStr,
                'Document or Form': 'Document',
            });
            //Relate doc to ARP or WTMRP
            // After saving to doc library, relation between file and ARP is already created
            // await relateDocumentToRecord(arpOrWtmRecord.revisionId, mergedPdfGUID);
        }

        // #10
        await updateRecord(rpOrWtmTemplateName, arpOrWtmRecord.revisionId, {
            'PDF GUID': mergedPdfGUID,
        });

        if (unsupportedFileFound) {
            throw new Error(
                `Unsupported file found. Please mark the document as Not Printed or convert the it to PDF, WORD, EXCEL, PNG, or JPG format for printing.`
            );
        }

        // #12
        await updateRecord('PDF Package Generation', pdfCreationRecord.revisionId, {
            Status: 'Printed',
            'Date Printed': currDateStr,
        });

        // #12.5 update on queue flag
        await updateRecord(rpOrWtmTemplateName, arpOrWtmRecord.revisionId, {
            'PDF Package Generation In Queue': 'False',
        });

        // Get Office Staff Name to send email
        let officeStaffInfo = await getUserGuid(pdfCreationRecord.createBy);
        let firstName = officeStaffInfo ? officeStaffInfo[0].firstName : 'Staff';
        let lastName = officeStaffInfo ? officeStaffInfo[0].lastName : '';

        const tokens = [
            {
                name: '[Application ID and Project Name]',
                value: `${applicationNumber} ${arpOrWtmRecord['project Name'] ? '/ ' + arpOrWtmRecord['project Name'] : ''}`,
            },
            {
                name: '[Office Staff Name]',
                value: firstName + ' ' + lastName,
            },
            {
                name: '[Job Reference ID]',
                value: pdfCreationRecord.instanceName,
            },
            {
                name: '[Completed Date]',
                value: currDateStr,
            },
        ];

        await sendNotificationEmail(
            EMAIL_TEMPLATE_NAME,
            tokens,
            pdfCreationRecord.modifyBy,
            pdfCreationRecord.instanceName
        );

        logger.info('LibPDFCreationGeneratePDF: Success ');
        returnObject = {
            MicroserviceResult: true,
            MicroserviceMessage: 'Microservice completed successfully',
            Success: 'OK',
        };
    } catch (err) {
        logger.info('LibPDFCreationGeneratePDF: Error encountered' + err);
        const currDateStr = dayjs().tz(WADNR_TIMEZONE).startOf('day').format(dateOnlyISOStringFormat);
        const relatedRecordID = getFieldValueByName('Related Record ID');
        const isFPAerr = (relatedRecordID || '').toUpperCase().includes('APPLICATION') ? 'FPA' : 'WTM';

        const [pdfCreationRecordError] = await getFormRecords(
            {
                q: `[instanceName] eq '${getFieldValueByName('Form ID')}'`,
                expand: true,
            },
            'PDF Package Generation'
        );

        await updateRecord('PDF Package Generation', pdfCreationRecordError.revisionId, {
            Status: 'Error',
            Message: err,
        });

        const rpOrWtmTemplateName = isFPAerr === 'FPA' ? 'Application Review Page' : 'WTM Review Page';

        const [arpOrWtmRecord] = await getFormRecords(
            {
                q: `[instanceName] eq '${pdfCreationRecordError['related Record ID']}'`,
                expand: true,
            },
            rpOrWtmTemplateName
        );

        await updateRecord(rpOrWtmTemplateName, arpOrWtmRecord.revisionId, {
            'PDF Package Generation In Queue': 'False',
        });

        const applicationNumberErr = isFPAerr === 'FPA' ? arpOrWtmRecord['fpaN Number'] : arpOrWtmRecord['wtmF No'];

        if (errorNotificationEmail) {
            const pdfPackageLink = createPdfPackageLink(await getEnvConfig(), pdfCreationRecordError.revisionId);

            const tokens = [
                {
                    name: '[Record Number]',
                    value: applicationNumberErr,
                },
                {
                    name: '[Record Type]',
                    value: isFPAerr ? 'ARP' : 'WTMRP',
                },
                {
                    name: '[DateTime]',
                    value: currDateStr,
                },
                {
                    name: '[ErrorMessage]',
                    value: `An error was encountered during PDF Package generation. \n ${err}`,
                },
                {
                    name: '[OpenPDFCreationJob]',
                    value: pdfPackageLink,
                },
            ];
            await sendNotificationEmail(
                EMAIL_ERROR_TEMPLATE_NAME,
                tokens,
                errorNotificationEmail,
                pdfCreationRecordError.instanceName
            );
        }

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: err.message,
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
