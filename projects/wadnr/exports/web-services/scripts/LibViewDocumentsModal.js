/**
 * LibViewDocumentsModal
 * Category: Workflow
 * Modified: 2025-10-30T12:13:31.76Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: c1610d58-0fd4-ef11-82bd-d3a492f2461d
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
    /*Script Name: LibViewDocumentsModal
  Customer:     VisualVault library function
  Purpose:      This purpose of this process is to find documents related to a form (formRelatedDocs) or with given 
                index field values (indexFieldEquals). Adapted from LibDHHSUploadDocumentReview.
  Parameters:   
                Form ID (String, Required) - The Form ID of the current form
                REVISIONID (String, Required) - The Revision ID of the current form.
                SearchOptions (Object[], Required) - An array of searchOption objects. See: options.search 
                  parameter in VV.Form.Global.ViewDocumentsModal for full documentation on properties
  Return Array:   
                [0] Status: 'Success', 'Error'
                [1] Message
                [2] DocumentData: An array of VV document data objects that match the search criteria
  Pseudo code:   
                1. Determine how document search will be performed. If a formRelatedDocs option is found, this will take precedence
                2. Use the specified method
                  a. Search through form related documents
                    i. If the target form ID = current form ID, use the current revision ID to get docs
                    ii. If the target form ID != current form ID, get the target form's template and revision ID
                    iii. Get documents related to the target revision ID
                  b. Search through documents by index field
                    i. Collect all index field search options and "AND" them together
                    ii. Get documents with the built index field query

  Date of Dev: 04/28/2023
  Last Rev Date: 09/10/2025
  Revision Notes:
  04/28/2023 - John Sevilla: Script adapted from LibDHHSUploadDocumentReview
  10/01/2024 - Patrick Gelvin: Update prefix regex to support alphanumerical prefixes
  09/10/2025 - Mauro Rapuano: Added Step 3 to set Viewer permissions to proponent for TEMP/FORM ID subfolder
  */
    logger.info('Start of the process LibViewDocumentsModal at ' + Date());

    /****************
  Config Variables
  *****************/
    const errorMessageGuidance = 'Please try again or contact a system administrator if this problem continues.';
    const missingFieldGuidance = 'Please provide a value for the missing field(s).';
    const EnablePrefixToTemplateNameMap = false; // determines whether or not to cache query results in map
    const FormTemplatePrefixListQueryName = 'zWebSvc Form Template Prefix List';

    /****************
  Script Variables
  *****************/
    let outputCollection = [];
    let errorLog = [];
    let PrefixToTemplateNameMap;
    let DocumentData;

    try {
        /*********************
    Form Record Variables
    **********************/
        let FormID = getFieldValueByName('Form ID');
        let RevisionID = getFieldValueByName('REVISIONID');
        let SearchOptions = getFieldValueByName('SearchOptions');

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        /****************
    Helper Functions
    *****************/
        // Check if field object has a value property and that value is truthy before returning value.
        function getFieldValueByName(fieldName, isOptional) {
            try {
                let fieldObj = ffCollection.getFormFieldByName(fieldName);
                let fieldValue = fieldObj && (fieldObj.hasOwnProperty('value') ? fieldObj.value : null);

                if (!isOptional && !fieldValue) {
                    throw new Error(`${fieldName}`);
                }
                return fieldValue;
            } catch (error) {
                errorLog.push(error.message);
            }
        }

        function parseRes(vvClientRes) {
            /*
        Generic JSON parsing function
        Parameters:
            vvClientRes: JSON response from a vvClient API method
        */
            let res = vvClientRes;

            try {
                // Parses the response in case it's a JSON string
                const jsObject = JSON.parse(res);
                // Handle non-exception-throwing cases:
                if (jsObject && typeof jsObject === 'object') {
                    res = jsObject;
                }
            } catch (e) {
                // If an error ocurrs, it's because the resp is already a JS object and doesn't need to be parsed
            }
            return res;
        }

        function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
            /*
        Checks that the meta property of a vvCliente API response object has the expected status code
        Parameters:
            vvClientRes: Parsed response object from a vvClient API method
            shortDescription: A string with a short description of the process
            ignoreStatusCode: An integer status code for which no error should be thrown. If you're using checkDataPropertyExists(), make sure to pass the same param as well.
        */
            if (!vvClientRes.meta) {
                throw new Error(
                    `${shortDescription}. No meta object found in response. Check method call and credentials.`
                );
            }

            const status = vvClientRes.meta.status;

            // If the status is not the expected one, throw an error
            if (status !== 200 && status !== 201 && status !== ignoreStatusCode) {
                const errorReason =
                    vvClientRes.meta.errors && vvClientRes.meta.errors[0]
                        ? vvClientRes.meta.errors[0].reason
                        : 'unspecified';
                throw new Error(`${shortDescription}. Status: ${vvClientRes.meta.status}. Reason: ${errorReason}`);
            }
            return vvClientRes;
        }

        function checkDataPropertyExists(vvClientRes, shortDescription, ignoreStatusCode = 999) {
            /*
        Checks that the data property of a vvCliente API response object exists 
        Parameters:
            res: Parsed response object from the API call
            shortDescription: A string with a short description of the process
            ignoreStatusCode: An integer status code for which no error should be thrown. If you're using checkMetaAndStatus(), make sure to pass the same param as well.
        */
            const status = vvClientRes.meta.status;

            if (status != ignoreStatusCode) {
                // If the data property doesn't exist, throw an error
                if (!vvClientRes.data) {
                    throw new Error(
                        `${shortDescription}. Data property was not present. Please, check parameters syntax. Status: ${status}.`
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
            ignoreStatusCode: An integer status code for which no error should be thrown. If you're using checkMetaAndStatus(), make sure to pass the same param as well.
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
                        `${shortDescription} returned no data. Please, check parameters syntax. Status: ${status}.`
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

        function getFormPrefix(formID) {
            const prefixReg = /^([A-Za-z0-9-]+)-\d+$/; // gets the prefix of the form (e.g. 'EDUCATION-HISTORY' in 'EDUCATION-HISTORY-00000125')
            let formPrefix = '';
            try {
                formPrefix = prefixReg.exec(formID)[1];
            } catch (error) {
                throw new Error(`Unable to parse form prefix for: "${formID}". ${error.message}`);
            }

            return formPrefix;
        }

        async function getTemplateNameFromID(formID) {
            let formPrefix = getFormPrefix(formID);
            formPrefix += '-'; // add trailing dash since query returns prefixes in this format

            let queryParams = {};
            if (EnablePrefixToTemplateNameMap === false) {
                queryParams.q = `[prefix] eq '${formPrefix}'`;
            }

            let querySearchData;
            if (EnablePrefixToTemplateNameMap === false || PrefixToTemplateNameMap == null) {
                let queryResp = await vvClient.customQuery.getCustomQueryResultsByName(
                    FormTemplatePrefixListQueryName,
                    queryParams
                );
                queryResp = JSON.parse(queryResp);
                if (queryResp.meta.status !== 200) {
                    throw new Error(
                        `There was an error when calling the ${FormTemplatePrefixListQueryName} custom query. ${errorMessageGuidance}`
                    );
                }
                querySearchData = queryResp.hasOwnProperty('data') ? queryResp.data : null;
                if (Array.isArray(querySearchData) === false) {
                    throw new Error(
                        `Data was not able to be returned when calling the ${FormTemplatePrefixListQueryName} custom query.`
                    );
                }
                if (querySearchData.length < 1) {
                    throw new Error(`Unable to get template names from query ${FormTemplatePrefixListQueryName}`);
                }
            }

            let templateName;
            if (EnablePrefixToTemplateNameMap) {
                // global map to avoid querying several times
                if (PrefixToTemplateNameMap == null) {
                    PrefixToTemplateNameMap = new Map();
                    querySearchData.forEach((template) => {
                        PrefixToTemplateNameMap.set(template.prefix, template.templateName);
                    });
                }
                templateName = PrefixToTemplateNameMap.get(formPrefix);
            } else {
                templateName = querySearchData[0].templateName;
            }

            if (!templateName) {
                throw new Error(`Unable to find template name for ${formID}!`);
            }

            return templateName;
        }

        /**
         * Adds a new entity’s permissions to a folder.
         *
         * @param {string} folderGuid - The unique identifier of the folder.
         * @param {string} newEntityGuid - The unique identifier of the entity (user/group) to add.
         * @param {string} newEntityType - The type of the entity (e.g., "User" or "Group").
         * @param {string} permissionType - The role to assign (e.g., "Editor", "Viewer", "Owner").
         * @param {boolean} applyToSubfolders - If true, the permission is applied recursively to subfolders.
         * @returns {Promise<object>} - The API response after attempting to add the permission.
         * @throws {Error} - If the API call fails or returns an unexpected response.
         */
        async function addFolderPermission(
            folderGuid,
            newEntityGuid,
            newEntityType,
            permissionType,
            applyToSubfolders
        ) {
            const shortDescription = `Add Folder Permission for Entity GUID '${newEntityGuid}'`;

            try {
                // Map the entity type and role using vvClient constants
                const memType = vvClient.constants.securityMemberType[newEntityType];
                const role = vvClient.constants.securityRoles[permissionType];

                if (!memType) {
                    throw new Error(`Invalid entity type '${newEntityType}'. Must be 'User' or 'Group'.`);
                }
                if (!role) {
                    throw new Error(
                        `Invalid permission type '${permissionType}'. Must match a security role constant.`
                    );
                }

                let res = await vvClient.library
                    .putFolderSecurityMember(folderGuid, newEntityGuid, memType, role, applyToSubfolders)
                    .then((res) => parseRes(res))
                    .then((res) => checkMetaAndStatus(res, shortDescription))
                    .then((res) => checkDataPropertyExists(res, shortDescription))
                    .then((res) => checkDataIsNotEmpty(res, shortDescription));

                return res;
            } catch (error) {
                throw new Error(`Error in ${shortDescription}: ${error.message}`);
            }
        }

        async function getUserByUserID(userID) {
            const shortDescription = `Get user GUID for user ID: ${userID}`;
            const getUserQuery = {
                q: `[userid] eq '${userID}'`,
                fields: 'id',
            };

            return vvClient.users
                .getUser(getUserQuery)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                .then((res) => checkDataIsNotEmpty(res, shortDescription))
                .then((res) => res.data[0]);
        }

        async function getFolderPathGUID(folderPath) {
            shortDescription = `Get folder ${folderPath}`;
            const getFolderParams = {
                folderPath: folderPath,
            };

            let getFolderRes = await vvClient.library
                .getFolders(getFolderParams)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                .then((res) => checkDataIsNotEmpty(res, shortDescription));

            return getFolderRes;
        }

        /****************
    BEGIN ASYNC CODE
    *****************/
        // Step 1. Determine how document search will be performed. If a formRelatedDocs option is found, this will take precedence
        let formRelatedDocsOptions = SearchOptions.find((searchOption) => searchOption.type === 'formRelatedDocs');
        if (formRelatedDocsOptions) {
            // Step 2a. Search through form related documents
            let targetFormRevisionID;
            if (formRelatedDocsOptions.targetFormID === FormID) {
                // Step 2ai. If the target form ID = current form ID, use the current revision ID to get docs
                targetFormRevisionID = RevisionID;
            } else {
                // Step 2aii. If the target form ID != current form ID, get the target form's template and revision ID
                let targetFormTemplateName = await getTemplateNameFromID(formRelatedDocsOptions.targetFormID);
                let queryParams = {};
                queryParams.q = `[instanceName] eq '${formRelatedDocsOptions.targetFormID}'`;
                queryParams.expand = false;

                let getFormsResp = await vvClient.forms.getForms(queryParams, targetFormTemplateName);
                getFormsResp = JSON.parse(getFormsResp);
                let getFormsData = getFormsResp.hasOwnProperty('data') ? getFormsResp.data : null;

                if (getFormsResp.meta.status !== 200) {
                    throw new Error(`There was an error when calling getForms on ${targetFormTemplateName}.`);
                }
                if (Array.isArray(getFormsData) === false) {
                    throw new Error(
                        `Data was not able to be returned when calling getForms on ${targetFormTemplateName}.`
                    );
                }
                if (getFormsData.length < 1) {
                    throw new Error(`Data on Form ID ${formRelatedDocsOptions.targetFormID} not found.`);
                }

                targetFormRevisionID = getFormsData[0].revisionId;
            }

            // Step 2aiii. Get documents related to the target revision ID
            let queryParams = {};
            queryParams.q = '';
            queryParams.indexFields = 'include';
            queryParams.limit = 2000;

            let getFormRelatedDocsResp = await vvClient.forms.getFormRelatedDocs(targetFormRevisionID, queryParams);
            getFormRelatedDocsResp = JSON.parse(getFormRelatedDocsResp);
            let getFormRelatedDocsData = getFormRelatedDocsResp.hasOwnProperty('data')
                ? getFormRelatedDocsResp.data
                : null;
            if (Array.isArray(getFormRelatedDocsData) === false) {
                throw new Error(`Data was not able to be returned when calling getFormRelatedDocs.`);
            }
            if (getFormRelatedDocsResp.meta.status !== 200 && getFormRelatedDocsResp.meta.status !== 404) {
                throw new Error(
                    `An error was encountered when attempting retrive the form related documents. ${getFormRelatedDocsResp.meta.statusMsg}. ${errorMessageGuidance}`
                );
            }

            DocumentData = getFormRelatedDocsData;
        } else {
            // Step 2b. Search through documents by index field
            // Step 2bi. Collect all index field search options and "AND" them together
            let searchQueries = [];
            for (const searchOption of SearchOptions) {
                if (searchOption.type === 'indexFieldEquals') {
                    searchQueries.push(`[${searchOption.fieldName}] eq '${searchOption.fieldValue}'`);
                }
            }
            if (searchQueries.length < 1) {
                throw new Error('No valid index field search options were supplied. Unable to perform search.');
            }

            // Step 2bii. Get documents with the built index field query
            let queryParams = {};
            queryParams.q = searchQueries.join(' AND '); // join each query with an AND
            queryParams.indexFields = 'include';
            queryParams.limit = 2000;

            let getDocumentsResp = await vvClient.documents.getDocuments(queryParams);
            getDocumentsResp = JSON.parse(getDocumentsResp);
            let getDocumentsData = getDocumentsResp.hasOwnProperty('data') ? getDocumentsResp.data : null;

            if (getDocumentsResp.meta.status !== 200) {
                throw new Error(`There was an error when calling getDocuments. ${getDocumentsResp.meta.status}`);
            }
            if (Array.isArray(getDocumentsData) === false) {
                throw new Error(`Data was not able to be returned when calling getDocuments.`);
            }

            DocumentData = getDocumentsData;
        }

        // Step 3. Set permissions to proponent for TEMP/FORM ID subfolder if User ID and Folder Path are specified
        if (formRelatedDocsOptions && formRelatedDocsOptions.userID && formRelatedDocsOptions.folderPath) {
            const folderPathGUID = await getFolderPathGUID(formRelatedDocsOptions.folderPath);

            if (!folderPathGUID) {
                throw new Error(
                    `Error while adding permissions - Folder path ${formRelatedDocsOptions.folderPath} not found.`
                );
            }
            const folderGuid = folderPathGUID.data.id;

            const newEntityGuid = await getUserByUserID(formRelatedDocsOptions.userID);
            if (!newEntityGuid) {
                throw new Error(`Error while adding permissions - User ID ${formRelatedDocsOptions.userID} not found.`);
            }

            await addFolderPermission(folderGuid, newEntityGuid.id, 'User', 'Viewer', false);
        }

        // send to client
        outputCollection[0] = 'Success';
        outputCollection[1] = 'Document data retrieved';
        outputCollection[2] = DocumentData;
    } catch (error) {
        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = 'Error';
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = errorLog;
    } finally {
        response.json(200, outputCollection);
    }
};
