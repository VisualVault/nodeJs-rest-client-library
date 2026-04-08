/**
 * ARPUploadLegacyPDFPackage
 * Category: Workflow
 * Modified: 2026-03-20T17:55:20.903Z by john.sevilla@visualvault.com
 * Script ID: Script Id: d9c715b0-8d82-f011-82f2-c723b37c1215
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
    Script Name:    ARPUploadLegacyPDFPackage
    Customer:       WADNR
    Purpose:        The purpose of this process is to upload a legacy pdf file related to an ARP

    Preconditions:  None
    Parameters:
                    - Form ID: (Required) ARP Form ID
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code:
                    1. Get and validate parameters (ARP Form ID)
                    2. Get ARP record
                    3. Validate and Download pdf
                    4. Upload pdf to VV
                    5. Create Legacy PDF associated record

    Date of Dev:    09/10/2025
    Revision Notes:
                    08/26/2025 - Alfredo Scilabra: First Setup of the script
                    09/10/2025 - Alfredo Scilabra: Add logic to update all docs order to keep legacy first
                    03/19/2026 - John Sevilla: Update folder path derivation to account for legacy FPA numbers. Add logic
                    to create FPA Number folder if one does not exist. Fix Assoc Doc Relation creation so it can be picked up
                    by PDF Generation
    */

    logger.info(`Start of the process ARPUploadLegacyPDFPackage at ${Date()}`);

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

    const legacyPdfType = 'Legacy PDF';
    const associatedDocRelationTemplateName = 'Associated Document Relation';

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
                        `${shortDescription} returned an error. Please, check the called Web Service. Status Description: ${vvClientRes.data[1]}.`
                    );
                }
            }
        }
        return vvClientRes;
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

    /**
     * @param {string} folderPath
     * @param {*} description
     * @returns {Promise<string>} - A promise that resolve to the new folder's system ID
     */
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
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => {
                if (res.data.id) return res.data.id;
                else {
                    throw new Error(`Unable to validate creation of folder ${folderPath}`);
                }
            });
    }

    function postDocByName(docName, folderId) {
        const shortDescription = `Post Document for the document '${docName}'`;
        const docParams = {
            documentState: 1,
            name: `${docName}`,
            description: `Legacy PDF`,
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

    /**
     * Downloads a PDF file as a buffer after validating it exists.
     * @param {string} url - The URL of the PDF file.
     * @returns {Promise<Buffer>} - Resolves with the PDF buffer.
     */
    async function downloadPdfAsBuffer(url) {
        // Validate with a HEAD request
        const headRes = await fetch(url, { method: 'HEAD' });

        if (!headRes.ok) {
            throw new Error(`File not found or inaccessible. Status: ${headRes.status}`);
        }

        const contentType = headRes.headers.get('content-type');
        if (!contentType || !contentType.includes('pdf')) {
            throw new Error(`The file at ${url} is not a PDF. Content-Type: ${contentType}`);
        }

        // Fetch the actual PDF
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to download PDF. Status: ${res.status}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
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
        const now = new Date();
        const date = now.toISOString().split('T')[0]; // e.g., "2025-05-06"
        const hour = now.getHours(); // 0–23
        const minute = now.getMinutes(); // 0–59
        return `${date} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
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

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1.
        const arpFormID = getFieldValueByName('Form ID');

        // CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!arpFormID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }
        // 2.
        const [targetArpRecord] = await getFormRecords(
            {
                q: `[Form ID] eq '${arpFormID}'`,
                expand: true,
            },
            'Application Review Page'
        );
        if (!targetArpRecord) {
            throw new Error('Application Review Page Record not found');
        }

        // Check if legacy pdf doc relation exists (if one exists, it means process already ran)
        const existingAssociatedDocRelationRecords = await getFormRecords(
            {
                q: `[ARP ID or WTM RP ID] eq '${arpFormID}' AND [Document Form Name] eq 'Legacy PDF' AND [Status] ne 'Disabled'`,
                expand: true,
            },
            associatedDocRelationTemplateName
        );

        let message = 'No need to process Legacy PDF';

        if (targetArpRecord['legacy PDF URL'] && existingAssociatedDocRelationRecords.length < 1) {
            // 3.
            const pdfBuffer = await downloadPdfAsBuffer(targetArpRecord['legacy PDF URL']);

            // 4.
            const folderPath = getPathFromFormNumber('FPA', targetArpRecord['fpaN Number']);
            let targetFolderID = await getFolderID(folderPath);
            if (!targetFolderID) {
                // Create the folder if it doesn't exist
                targetFolderID = await createFolder(folderPath, targetArpRecord['fpaN Number']);
            }

            const docData = await postDocByName('Legacy PDF', targetFolderID);
            const fileData = await postFileBuffer(docData, pdfBuffer);

            // 5.
            // Update all docs order to keep legacy first
            const associatedDocRelationRecords = await getFormRecords(
                {
                    q: `[ARP ID or WTM RP ID] eq '${arpFormID}' AND [Print Order] ne 'Not Printed'`,
                    expand: true,
                },
                associatedDocRelationTemplateName
            );
            //Sort by Print Order
            associatedDocRelationRecords.sort((a, b) => parseInt(a['print Order']) - parseInt(b['print Order']));
            await Promise.all(
                associatedDocRelationRecords.map((record, index) =>
                    updateRecord(associatedDocRelationTemplateName, record.revisionId, {
                        'Print Order': `${index + 1}`,
                    })
                )
            );

            const currDateStr = getTimestamp();
            const createdLegacyPdfAssociatedRecord = await createFormRecord(associatedDocRelationTemplateName, {
                'Document Form Name': docData.name, // system-generated "name" used so it can be picked up by LibPDFCreationGeneratePDF
                'Document Form Type': legacyPdfType,
                'Document Form Status': 'Released',
                'Document Create By': 'fpOnline',
                'Document Create Date': currDateStr,
                'Document Modify By': 'fpOnline',
                'Document Modify Date': currDateStr,
                'Document GUID': fileData.id,
                'Print Order': '0',
                'Related Record ID': fileData.documentId,
                'ARP ID or WTM RP ID': arpFormID,
                'Document or Form': 'Document',
            });

            message = 'Legacy PDF uploaded successfully';
        }

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = message;
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don´t change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors ocurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        // SEND THE RESPONSE
        response.json(200, outputCollection);
    }
};
