/**
 * LibWorkflowMoveUploadedFilesToFinalPath
 * Category: Workflow
 * Modified: 2026-03-20T19:40:55.38Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 51ac669e-971f-f011-82d6-afeb582902bd
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
  Script Name:    LibWorkflowMoveUploadedFilesToFinalPath
  Customer:       WADNR
  Purpose:        Moves uploaded documents from temporary storage folders to finalized destination folders once an FPA Number has been
                  assigned to a main application form. It handles uploads from both the main form and specific subforms (Appendix D, Appendix H, Appendix J)
                  by resolving relationships via the Related Record ID. After successful transfer, it deletes the original TEMP folder
                  contents and returns a structured response.

  Preconditions:

  Parameters:     The following represent variables passed into the function:
                  FPA Number (String, Required): The assigned FPA/N Number used to resolve final path. FPA Number can also be a WTMF Number
                  Form ID (String, Required): The Form ID of the main application form
  Pseudo code:
                  1 Get the values of the fields
                  2 Check if the required parameters are present
                  3 Identify main form type and get subform records
                  4 For each main and sub form, get temp and final path, move all documents, update the FPA Number index field, then delete temp path
                  5 call to LibWorkflowChangeFolderPermissions to update foldeer permission
                  6 Build the success response array

  Date of Dev:    02/25/2026

  Revision Notes:
                  04/22/2025 - Mauro Rapuano:     First Setup of the script
                  07/09/2025 - John Sevilla:      Add dynamic update to "FPA Number" index field
                  08/07/2025 - Mauro Rapuano:     Add enhancement to handle Appeal form
                  09/05/2025 - Alfredo Scilabra:  Add call to LibWorkflowChangeFolderPermissions. Also added support for WTM form
                  10/07/2025 - Mauro Rapuano:     Added Applications as final folder for WTM forms
                  10/21/2025 - Alfredo Scilabra:  Added support for FPETS forms (ICN, NCNU or NTC)
                  12/04/2025 - Fernando Chamorro: Added Applications as final folder for FPA forms (FPAN, Aerial, Step-1)
                  12/09/2025 - Fernando Chamorro: Added support for NCFLO form
                  12/10/2025 - Fernando Chamorro: Added NCFLO prefixes for detectFormTemplateFromID()
                  01/20/2026 - Fernando Chamorro: Added Appendix A prefix for SUB_FORM_TEMPLATES
                  02/25/2026 - Alfredo Scilabra:  Rename Multi-pupose prefix
                  03/19/2026 - John Sevilla:      Update folder path derivation to account for legacy FPA numbers 
  */

    logger.info('Start of the process LibWorkflowMoveUploadedFilesToFinalPath at ' + Date());

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

    //Sub form templates names
    const SUB_FORM_TEMPLATES = [
        {
            templateName: 'Appendix A Water Type Classification',
            folderName: 'Appendix A',
            prefix: 'AppendixA-ID-',
        },
        {
            templateName: 'Appendix D Slope Stability Informational',
            folderName: 'Appendix D',
            prefix: 'APPENDIX-D-',
        },
        {
            templateName: 'Appendix H Eastern Washington Natural Regeneration Plan',
            folderName: 'Appendix H',
            prefix: 'APPENDIX-H-',
        },
        {
            templateName: 'Appendix J Forest Practices Marbled Murrelet',
            folderName: 'Appendix J',
            prefix: 'AppendixJ-',
        },
        {
            templateName: 'Multi-purpose',
            folderName: 'Multi-Purpose Form',
            prefix: 'MPF-',
        },
    ];

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

    function isAppFPA(applicationFormId) {
        //NOTE: Check for longer prefixes first!
        const templateMap = new Map([
            ['STEP-1-LONG-TERM-FPA', ['Step 1 Long Term FPA', 'Form ID']],
            ['FPA-AERIAL-CHEMICAL', ['Forest Practices Aerial Chemical Application', 'Form ID']],
            ['FPAN', ['Forest Practices Application Notification', 'FPAN ID']],
        ]);

        const normalizedID = applicationFormId.replace(/\s+/g, '');

        for (const [prefix, formInformation] of templateMap) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return formInformation;
            }
        }
        return [];
    }

    function isAppWTM(applicationNumber) {
        return typeof applicationNumber === 'string' && applicationNumber.toUpperCase().startsWith('WTM-');
    }

    function isAppNCFLO(applicationNumber) {
        return typeof applicationNumber === 'string' && applicationNumber.toUpperCase().startsWith('NCFLO-');
    }

    function isAppFPETS(applicationNumber) {
        return (
            typeof applicationNumber === 'string' &&
            (applicationNumber.toUpperCase().startsWith('ICN-') ||
                applicationNumber.toUpperCase().startsWith('NCNU-') ||
                applicationNumber.toUpperCase().startsWith('NTC-'))
        );
    }

    function getPathFromFormNumber(
        formFolder,
        applicationNumber,
        includesRange,
        iniFolder,
        isWTM = false,
        isFPA = false
    ) {
        applicationNumber = String(applicationNumber).trim();
        const includeAppsFolder = isWTM || isFPA;
        let path = '';

        // Validate the against the fpOnline number formats
        const fpOnlineNumberFormatMatch = applicationNumber.match(/^[^-]+-[^-]+-(\d{2})-(\d+)/);
        if (fpOnlineNumberFormatMatch) {
            let [, year, sequenceNumber] = fpOnlineNumberFormatMatch;
            year = '20' + year;
            sequenceNumber = parseInt(sequenceNumber, 10);
            const upper = Math.ceil(sequenceNumber / 1000) * 1000;
            const lower = upper - 999;

            if (includesRange) {
                path = `/${iniFolder}/${year}/${lower}-${upper}/${applicationNumber}`;
            } else {
                path = `/${iniFolder}/${year}/${applicationNumber}`;
            }
        }

        if (!path && isFPA) {
            // If unable to match above, validate against the legacy FPA number format
            const legacyFPANumberFormatMatch = applicationNumber.match(/^\d+$/);
            if (legacyFPANumberFormatMatch) {
                path = `/${iniFolder}/Legacy/${applicationNumber}`;
            }
        }

        // Append subfolders to path depending on params/context
        if (path) {
            if (includeAppsFolder) {
                path += '/Applications';
            }

            //If Form ID is a subform, add folder name to path
            const matchedTemplate = SUB_FORM_TEMPLATES.find((template) => formFolder.startsWith(template.prefix));
            if (matchedTemplate) {
                path += `/${matchedTemplate.folderName}`;
            }
        }

        return path;
    }

    function getFolderGUID(folderPath) {
        const shortDescription = `Get folder ${folderPath}`;
        // Status code 403 must be ignored (not throwing error) because it means that the folder doesn't exist
        const ignoreStatusCode = 403;
        const getFolderParams = {
            folderPath,
        };

        return (
            vvClient.library
                .getFolders(getFolderParams)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode))
                .then((res) => checkDataPropertyExists(res, shortDescription, ignoreStatusCode))
                //.then((res) => checkDataIsNotEmpty(res, shortDescription, ignoreStatusCode))
                .then((res) => res.data)
        );
    }

    function getDocuments(folderPath) {
        const shortDescription = `Get Documents Data for '${folderPath}'`;
        const getDocsParams = {
            //q: `FileName = '${docID}'`, // docID = "DOC-000001"
            q: `FolderPath = '${folderPath}'`,
        };

        return (
            vvClient.documents
                .getDocuments(getDocsParams)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                //.then((res) => checkDataIsNotEmpty(res, shortDescription))
                .then((res) => res.data)
        );
    }

    function moveDocument(folderGUID, documentGUID) {
        const shortDescription = `Move Document ${documentGUID} to '${folderGUID}'`;
        const moveDocumentParams = {
            folderId: folderGUID,
        };

        return vvClient.documents
            .moveDocument(null, moveDocumentParams, documentGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));
    }

    function deleteTempFolder(folderGUID) {
        const shortDescription = `Delete folder ${folderGUID}`;

        return vvClient.library
            .deleteFolder(folderGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
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
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data.id);
    }

    /**
     * @param {object} indexFieldsToUpdate
     * @param {string} documentGUID - Usually the "documentId" property of a document and not the "id" property
     * @param {string?} shortDescription
     * @returns
     */
    function updateDocumentIndexFields(
        indexFieldsToUpdate,
        documentGUID,
        shortDescription = `Update index fields for ${documentGUID}`
    ) {
        // wrap in structure expected by lib function
        const indexFieldsDataWrapper = {
            indexFields: JSON.stringify(indexFieldsToUpdate),
        };

        return vvClient.documents
            .putDocumentIndexFields(indexFieldsDataWrapper, documentGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function detectFormTemplateFromID(recordID) {
        //NOTE: Check for longer prefixes first!
        const templateMap = new Map([
            ['STEP-1-LONG-TERM-FPA', ['Step 1 Long Term FPA', 'individual ID']],
            ['FPA-AERIAL-CHEMICAL', ['Forest Practices Aerial Chemical Application', 'individual ID']],
            ['FPAN-AMENDMENT', ['FPAN Amendment Request', 'individual ID']],
            ['FPAN-RENEWAL', ['FPAN Renewal', 'individual ID']],
            ['FPAN-T', ['FPAN Notice of Transfer', 'individual ID']],
            ['LT-5DN', ['Long-Term Application 5-Day Notice', 'individual ID']],
            ['Appeal', ['Appeal', 'individual ID']],
            ['FPAN', ['Forest Practices Application Notification', 'individual ID']],
            ['NCNU', ['Notice of Conversion to Non Forestry Use', 'individual ID']],
            ['NOD', ['FPAN Notice of Decision', 'individual ID']],
            ['WTM', ['Water Type Modification Form', 'individual ID']],
            ['ICN', ['Informal Conference Note', 'individual ID']],
            ['NTC', ['Notice to Comply', 'individual ID']],
            ['NCFLO', ['Notice of Continuing Forest Land Obligation', 'individual ID']],
        ]);

        const normalizedID = recordID.replace(/\s+/g, '');

        for (const [prefix, formInformation] of templateMap) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return formInformation;
            }
        }
        return [];
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

    /**********
   MAIN CODE
  **********/

    try {
        // 1 Get the values of the fields
        //NOTE: FPA Number can also be a WTMF Number or ICN Number
        const fpaNumber = getFieldValueByName('FPA Number');
        const formId = getFieldValueByName('Form ID');

        // 2 Check if the required parameters are present
        if (!fpaNumber || !formId) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        let movedFiles = [];
        // 3 Identify main form type
        const targetParams = {
            q: `[Related Record ID] eq '${formId}'`,
            fields: 'revisionId, instanceName',
        };

        // Get subform records
        const subFormsRelated = await Promise.all(
            SUB_FORM_TEMPLATES.map((template) => getFormRecords(targetParams, template.templateName))
        );
        const subFormIds = subFormsRelated.flat().map((record) => record.instanceName);

        const formsFoldersToMove = [formId, ...subFormIds];

        let [mainFormTemplateName, individualIdFieldName] = detectFormTemplateFromID(formId);
        if (!mainFormTemplateName) {
            throw new Error(`Template name not detected for '${formId}'`);
        }
        const [mainFormRecord] = await getFormRecords(
            {
                q: `[instanceName] eq '${formId}'`,
                expand: true,
            },
            mainFormTemplateName
        );
        if (!mainFormRecord) {
            throw new Error(`main application record not found '${formId}'`);
        }
        const individualID = mainFormRecord[individualIdFieldName];
        const isWTM = isAppWTM(formId);
        const isAppeal = formId.includes('Appeal');
        const isFpets = isAppFPETS(formId);
        const isFPA = isAppFPA(formId).length > 0;
        const isNCFLO = isAppNCFLO(formId);

        // 4 For each main and sub form, get temp and final path, move all documents, update the FPA Number index field, then delete temp path
        const folderTasks = formsFoldersToMove.map(async (formFolder) => {
            // Determine temp folder path
            let tempPath, iniFolder;
            let includesRange = true;
            if (isAppeal) {
                tempPath = `/Appeals/TEMP/${formFolder}`;
                iniFolder = 'Appeals';
                includesRange = false;
            } else if (isFpets) {
                tempPath = `/ENFORCEMENT/TEMP/${formFolder}`;
                iniFolder = 'ENFORCEMENT';
            } else if (isNCFLO) {
                tempPath = `/NCFLO/TEMP/${formFolder}`;
                iniFolder = 'NCFLO';
            } else {
                iniFolder = isWTM ? 'WTM' : 'FPA';
                tempPath = `/${iniFolder}/TEMP/${formFolder}`;
            }

            // Determine final destination folder
            const finalPath = getPathFromFormNumber(formFolder, fpaNumber, includesRange, iniFolder, isWTM, isFPA);

            // Validate final path
            if (!finalPath) {
                const formType = isAppeal ? 'Appeal' : isNCFLO ? 'NCFLO' : isFpets ? 'FPETS' : isWTM ? 'WTM' : 'FPA';
                throw new Error(
                    `${formType} Number '${fpaNumber}' is badly formatted. The last two sections must be numeric.`
                );
            }

            const documents = await getDocuments(tempPath);
            if (documents.length > 0) {
                const tempFolderGUID = await getFolderGUID(tempPath);

                if (!tempFolderGUID?.id) return;

                const finalFolderGUID = await createFolder(finalPath, fpaNumber);
                if (!finalFolderGUID || finalFolderGUID === '') {
                    throw new Error(`Error while creating final folder '${finalPath}' at ${Date()}`);
                }

                await Promise.all(
                    documents.map(async (doc) => {
                        const documentGUID = doc.documentId;
                        const newPathData = await moveDocument(finalFolderGUID, documentGUID);
                        if (newPathData.data.folderPath === finalPath) {
                            movedFiles.push({
                                source: tempPath,
                                destination: finalPath,
                                status: 'Moved',
                            });
                            logger.info(`Document succesfully moved from '${tempPath}' to '${finalPath}' at ${Date()}`);
                        } else {
                            throw new Error(
                                `Error while moving document from '${tempPath}' to '${finalPath}' at ${Date()}`
                            );
                        }

                        const updatedDocumentData = await updateDocumentIndexFields(
                            isAppeal ? { 'Appeal Number': fpaNumber } : { 'FPA Number': fpaNumber },
                            documentGUID
                        );
                    })
                );

                //Update final paht folder permissions
                const [changeFolderPermissionsStatus] = await callExternalWs('LibWorkflowChangeFolderPermissions', [
                    { name: 'New Entity', value: individualID },
                    { name: 'New Entity Type', value: 'Individual' },
                    { name: 'Permission Type', value: 'Viewer' },
                    { name: 'Folder Path', value: finalPath },
                    { name: 'Apply to subfolders', value: 'true' },
                ]);

                if (changeFolderPermissionsStatus !== 'Success') {
                    throw new Error('Error updating folder permissions.');
                }

                // Check again TEMP folder, if it is empty, delete it
                const checkDocumentsDeleted = await getDocuments(tempPath);
                if (checkDocumentsDeleted.length === 0) {
                    const deleteRes = await deleteTempFolder(tempFolderGUID.id);
                    if (deleteRes) {
                        logger.info(`Temp folder '${tempPath}' succesfully deleted at ${Date()}`);
                    } else {
                        throw new Error(`Error while deleting Temp folder '${tempPath}' at ${Date()}`);
                    }
                }
            }
        });

        const results = await Promise.allSettled(folderTasks);

        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                throw new Error(`Error processing folder '${formsFoldersToMove[index]}':`, result.reason.message);
            }
        });

        // 5 Build the success response array
        const message = movedFiles.length == 0 ? 'No files moved.' : 'All files moved successfully.';

        // Create the following object that will be used when the api call is made to communicate the workflow item is complete.
        // First two items of the object are required to tell if the process completed successfully and the message that should be returned.
        // The other items in the object would have the name of any workflow variable that would be updated with data coming from the microservice/node script.
        returnObject = {
            MicroserviceResult: true,
            MicroserviceMessage: 'Microservice completed successfully',
            Status: 'Success',
            Message: message,
            MovedFiles: movedFiles,
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
