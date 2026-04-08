/**
 * WTMUploadLegacyPDFPackage
 * Category: Workflow
 * Modified: 2025-12-23T14:51:41.997Z by matias.andrade@visualvault.com
 * Script ID: Script Id: d8a41f89-14dc-f011-830b-ddc27d6f0569
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const fetch = require('cross-fetch');

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
      Script Name:    WTMUploadLegacyPDFPackage
      Customer:       WADNR
      Purpose:        Uploads a PDF required for the WTM PDF Package flow and associates it to the
                      WTM Review Page (WTMRP) via Associated Document Relation. Also persists the
                      generated PDF GUID on the WTMRP record.
  
      Preconditions:  None
      Parameters:
                      - Form ID: (Required) WTM Review Page Form ID (example: WTMRP-000001)
  
    Return Object:
                      outputCollection[0]: Status (Success | Error)
                      outputCollection[1]: Short message
                      outputCollection[2]: Optional detailed error info

    Pseudo code:
                    1. Get and validate the input parameter (WTMRP Form ID)
                    2. Retrieve the WTMRP record by Form ID
                    3. Read the WTMRP Legacy PDF URL value
                    4. If a URL exists, download the PDF as a buffer
                    5. Retrieve the WTMF No from WTMRP and calculate the target folder path
                    6. Resolve the target folder ID in VV and create a VV Document + upload the file
                    7. Reorder existing Associated Document Relation records so the legacy stays first
                    8. Create the Associated Document Relation record for the uploaded PDF
                    9. Return Success or Error response  
  
      Date of Dev:    12/18/2025
      Revision Notes:
                      12/18/2025 - Matías Andrade: Initial implementation for WTMRP PDF Package support.
    */

    logger.info(`Start of process WTMUploadLegacyPDFPackage at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // Response array
    let outputCollection = [];

    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const wtmReviewPageTemplateName = 'WTM Review Page';
    const associatedDocRelationTemplateName = 'Associated Document Relation';

    // WTMRP fields
    const wtMrpLegacyPdfUrlFieldKey = 'legacy PDF URL';
    const wtMrpWtmNumberFieldKey = 'wtmF No';
    const wtMrpPdfGuidFieldKey = 'PDF GUID';

    // Associated Document Relation fields
    const legacyPdfType = 'Legacy PDF';

    function getFieldValueByName(fieldName, isOptional = false) {
        let fieldValue = '';

        try {
            const field = ffCollection.getFormFieldByName(fieldName);
            const requiredFieldDoesntExists = !isOptional && !field;

            if (requiredFieldDoesntExists) {
                throw new Error(`The field '${fieldName}' was not found.`);
            }

            if (field) {
                fieldValue = 'value' in field ? field.value : fieldValue;
                fieldValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;

                const requiredFieldHasNoValue = !fieldValue && typeof fieldValue !== 'number' && !isOptional;

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
        try {
            const jsObject = JSON.parse(vvClientRes);
            if (jsObject && typeof jsObject === 'object') {
                vvClientRes = jsObject;
            }
        } catch (e) {
            // Already an object
        }
        return vvClientRes;
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

        if (status != ignoreStatusCode && !vvClientRes.data) {
            throw new Error(
                `${shortDescription} data property was not present. Please, check parameters and syntax. Status: ${status}.`
            );
        }
        return vvClientRes;
    }

    function checkDataIsNotEmpty(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        const status = vvClientRes.meta.status;

        if (status != ignoreStatusCode) {
            const dataIsArray = Array.isArray(vvClientRes.data);
            const dataIsObject = typeof vvClientRes.data === 'object';
            const isEmptyArray = dataIsArray && vvClientRes.data.length == 0;
            const isEmptyObject = dataIsObject && Object.keys(vvClientRes.data).length == 0;

            if (isEmptyArray || isEmptyObject) {
                throw new Error(
                    `${shortDescription} returned no data. Please, check parameters and syntax. Status: ${status}.`
                );
            }

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
        const overrideGetFormsParams = { expand: false, ...getFormsParams };

        return vvClient.forms
            .getForms(overrideGetFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
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

    function updateRecord(formTemplateName, recordGUID, fieldValuesToUpdate) {
        const shortDescription = `Update form record ${recordGUID}`;

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    function getFolderID(folderPath) {
        const ignoreStatusCode = 403; // returned when folder doesn't exist
        const shortDescription = `Get folder '${folderPath}'`;

        return vvClient.library
            .getFolders({ folderPath })
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode))
            .then((res) => checkDataPropertyExists(res, shortDescription, ignoreStatusCode))
            .then((res) => (res.data ? res.data.id : null));
    }

    function postDocByName(docName, folderId) {
        const shortDescription = `Post Document for '${docName}'`;

        const docParams = {
            documentState: 1,
            name: `${docName}`,
            description: 'WTM PDF',
            revision: '0',
            allowNoFile: true,
            fileLength: 0,
            fileName: `${docName}.pdf`,
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

    function postFileBuffer(docData, fileBuffer) {
        const shortDescription = `Post file for '${docData.name}'`;

        const fileParams = {
            documentId: `${docData.id}`,
            name: `${docData.name}`,
            revision: '1',
            changeReason: 'Initial Version',
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

    async function downloadPdfAsBuffer(url) {
        const headRes = await fetch(url, { method: 'HEAD' });
        if (!headRes.ok) {
            throw new Error(`File not found or inaccessible. Status: ${headRes.status}`);
        }

        const contentType = headRes.headers.get('content-type');
        if (!contentType || !contentType.includes('pdf')) {
            throw new Error(`The file at ${url} is not a PDF. Content-Type: ${contentType}`);
        }

        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to download PDF. Status: ${res.status}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }

    function getTimestamp() {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const hour = now.getHours();
        const minute = now.getMinutes();
        return `${date} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    function getPathFromWtmNumber(wtmNumber) {
        // This helper expects a number format similar to "WTM-YY-NNNNN" or "<prefix>-YY-NNNNN".
        // Adjust parsing rules if WTM number is stored differently.
        const parts = (wtmNumber || '').split('-');
        if (parts.length < 3) return '';

        const yy = parts[parts.length - 2];
        const seq = parts[parts.length - 1];

        if (!/^\d{2}$/.test(yy) || !/^\d+$/.test(seq)) return '';

        const number = parseInt(seq, 10);
        const upper = Math.ceil(number / 1000) * 1000;
        const lower = upper - 999;
        const year = `20${yy}`;

        return `/WTM/${year}/${lower}-${upper}/${wtmNumber}`;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */
    try {
        // 1. Get and validate the input parameter (WTMRP Form ID)
        const wtMrpFormId = getFieldValueByName('Form ID');

        // 10. Return Error response if required parameters are missing
        if (!wtMrpFormId) {
            throw new Error(errorLog.join('; '));
        }

        // 2. Retrieve the WTMRP record by Form ID
        const [wtMrpRecord] = await getFormRecords(
            { q: `[Form ID] eq '${wtMrpFormId}'`, expand: true },
            wtmReviewPageTemplateName
        );

        // 10. Return Error response if WTMRP record was not found
        if (!wtMrpRecord) {
            throw new Error('WTM Review Page record not found');
        }

        // 3. Read the WTMRP Legacy PDF URL value
        const legacyUrl = wtMrpRecord[wtMrpLegacyPdfUrlFieldKey];

        // Default response when Legacy PDF URL is not present/populated
        outputCollection[1] = 'No PDF URL found on WTM Review Page';

        // 4. If a URL exists, download the PDF as a buffer
        if (legacyUrl !== '' && legacyUrl !== null) {
            const wtmNumber = wtMrpRecord[wtMrpWtmNumberFieldKey];
            if (!wtmNumber) {
                throw new Error(`WTM number is missing on WTMRP (field: '${wtMrpWtmNumberFieldKey}').`);
            }

            const pdfBuffer = await downloadPdfAsBuffer(legacyUrl);

            // 5. Retrieve the WTMF No from WTMRP and calculate the target folder path
            const folderPath = getPathFromWtmNumber(wtmNumber);
            if (!folderPath) {
                throw new Error(`Unable to calculate folder path from WTM number '${wtmNumber}'.`);
            }

            // 6. Resolve the target folder ID in VV and create a VV Document + upload the file
            const folderId = await getFolderID(folderPath);
            const docData = await postDocByName('WTM PDF', folderId);
            const fileRes = await postFileBuffer(docData, pdfBuffer);

            // 7. Reorder existing Associated Document Relation records so the legacy stays first
            // Update all docs order to keep legacy first
            const associatedDocRelationRecords = await getFormRecords(
                {
                    q: `[ARP ID or WTM RP ID] eq '${wtMrpFormId}' AND [Print Order] ne 'Not Printed'`,
                    expand: true,
                },
                'Associated Document Relation'
            );

            // Sort by Print Order (numeric)
            associatedDocRelationRecords.sort(
                (a, b) => parseInt(a['print Order'], 10) - parseInt(b['print Order'], 10)
            );

            // Reassign Print Order so legacy can remain 0
            await Promise.all(
                associatedDocRelationRecords.map((record, index) =>
                    updateRecord('Associated Document Relation', record.revisionId, {
                        'Print Order': `${index + 1}`,
                    })
                )
            );

            const pdfGuid = fileRes.data?.id;
            const pdfDocumentId = fileRes.data?.documentId;

            if (!pdfGuid || !pdfDocumentId) {
                throw new Error('Unable to retrieve uploaded PDF identifiers (GUID / DocumentId).');
            }

            const currDateStr = getTimestamp();

            // 8. Create the Associated Document Relation record for the uploaded PDF
            await createFormRecord(associatedDocRelationTemplateName, {
                'Document Form Name': 'WTM PDF',
                'Document Form Type': legacyPdfType,
                'Document Form Status': 'Released',
                'Document Create By': 'fpOnline',
                'Document Create Date': currDateStr,
                'Document Modify By': 'fpOnline',
                'Document Modify Date': currDateStr,
                'Document GUID': pdfGuid,
                'Print Order': '0',
                'Related Record ID': pdfDocumentId,
                'ARP ID or WTM RP ID': wtMrpFormId,
            });

            outputCollection[1] = 'WTM PDF uploaded and associated successfully';
        }

        // 9. Return Success response
        outputCollection[0] = 'Success';
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // 9. Return Error response
        outputCollection[0] = 'Error';

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors occurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        response.json(200, outputCollection);
    }
};
