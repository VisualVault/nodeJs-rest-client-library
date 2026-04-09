/**
 * LibCopyFiles
 * Category: Form
 * Modified: 2021-11-30T20:13:40.58Z by emanuel.jofre@onetree.com
 * Script ID: Script Id: 75fd9460-0e4a-ec11-820b-df713f8a8361
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
const logger = require('../log');

module.exports.getCredentials = function () {
    const options = {};
    options.customerAlias = 'EmanuelJofre';
    options.databaseAlias = 'Main';
    options.userId = 'emanuel.jofre+api@onetree.com';
    options.password = 'achq1Ozpg3xD';
    options.clientId = '4150133e-ddef-4d8e-af91-1e7c39f16a25';
    options.clientSecret = 'RKxMRhdeJPdt+3A3B/kNT19rbTawYpPLx84LSpzrHZ0=';
    return options;
};

module.exports.main = async function (ffCollection, vvClient, response) {
    /* Script Name: LibCopyFiles 
    Customer:       VisualVault
    Purpose:        The purpose of this script is to copy files from a existent location to a new location while setting the corresponding security permissions.
    Parameters:     The following represent variables passed into the function:  

    Return Array:   The following represents the array of information returned to the calling function.  This is a standardized response.
                    0 - Status: Success, Error
                    1 - Message
                    2 - Post file responses
                  
    Pseudocode:     1.Checks if the required paramenters are present
                    2.Checks if folder already exists
                    3.Creates folder if doesn't exist
                    4.Gets folder's current permissions settings
                    5.Deletes current members with permissions
                    6.Sets new permissions to the folder
                    7.Gets the original document ids
                    8.Copies the documents
                    9.Builds the success response array
                    10.Sends email with errors
                    11.Sends the response

    Date of Dev:    11/20/2021
    Last Rev Date:  11/20/2021

    Revision Notes:
    11/20/2021 - Emanuel Jofré: Library creation
    */

    logger.info('Start of the process ApplicantRegistrationSubmit at ', Date());

    /**************************************
     Response and error handling variables
    ***************************************/

    // Response array to be returned
    // outputCollection[0]: Status
    // outputCollection[1]: Short description message
    // outputCollection[2]: Data. Usually an object
    const outputCollection = [];
    // Array for capturing error messages that may occur within helper functions.
    const errorLog = [];

    /***********************
     Configurable Variables 
    ************************/

    // Name of the parameter that contains the source folder name
    const sourcePathParamName = 'Source Folder';
    // Name of the parameter that contains the target folder name
    const targetPathParamName = 'Target Folder';
    // Name of the groups that will have permissions set in the folder.
    const permissionGroupsParamName = 'permissionGroups';
    // Coma separated email addresses to send error log after the script is finished.
    let errorEmailList = 'emanuel.jofre@onetree.com';

    /*****************
     Helper Functions
    ******************/

    function getFieldValueByName(fieldNameString, isRequired = true) {
        // Check if a field was passed in the request and get its value
        // If isOptionalBoolean parameter is not passed in, the field is required
        let resp = null;

        try {
            // Tries to get the field from the passed in arguments
            const field = ffCollection.getFormFieldByName(fieldNameString);

            if (!field) {
                if (isRequired) {
                    throw new Error(`The field '${fieldNameString}' was not found.`);
                }
            } else {
                // If the field was found, get its value
                const fieldValue = field.value ? field.value : null;

                if (typeof fieldValue === 'string') {
                    // Remove any leading or trailing spaces
                    fieldValue.trim();
                }

                if (fieldValue) {
                    // Sets the field value to the response
                    resp = fieldValue;
                } else if (isRequired) {
                    // If the field is required and has no value, throw an error
                    throw new Error(`The value property for the field '${fieldNameString}' was not found or is empty.`);
                }
            }
        } catch (error) {
            // If an error was thrown, add it to the error log
            errorLog.push(error);
        }
        return resp;
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
            throw new Error(`${shortDescription}. No meta object found in response. Check method call and credentials.`);
        }

        const status = vvClientRes.meta.status;

        // If the status is not the expected one, throw an error
        if (status !== 200 && status !== 201 && status !== ignoreStatusCode) {
            const errorReason = vvClientRes.meta.errors && vvClientRes.meta.errors[0] ? vvClientRes.meta.errors[0].reason : 'unspecified';
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
                throw new Error(`${shortDescription}. Data property was not present. Please, check parameters syntax. Status: ${status}.`);
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
                throw new Error(`${shortDescription} returned no data. Please, check parameters syntax. Status: ${status}.`);
            }
            // If it is a Web Service response, check that the first value is not an Error status
            if (dataIsArray) {
                const firstValue = vvClientRes.data[0];

                if (firstValue == 'Error') {
                    throw new Error(`${shortDescription} returned an error. Please, check called Web Service. Status: ${status}.`);
                }
            }
        }

        return vvClientRes;
    }

    async function getFolderID(folderPath) {
        const ignoreStatusCode = 403; // 403 is returned when the folder doesn't exist
        const shortDescription = `Get folder '${folderPath}'`;

        const getFolderParams = {
            folderPath: folderPath,
        };

        const getFolderRes = await vvClient.library
            .getFolders(getFolderParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode))
            .then((res) => checkDataPropertyExists(res, shortDescription, ignoreStatusCode));

        const folderID = getFolderRes.data ? getFolderRes.data.id : null;

        return folderID;
    }

    async function createFolder(folderPath) {
        const shortDescription = `Post folder '${folderPath}'`;

        const folderData = {};

        const postFolderResp = await vvClient.library
            .postFolderByPath(null, folderData, folderPath)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));

        const newFolderID = postFolderResp.data.id;

        return newFolderID;
    }

    async function getFolderPermissionMembersIDs(folderId) {
        let securityMemberIDs = [];
        const shortDescription = `Security member IDs for Folder ID '${folderId}'`;

        let getFolderSecurityResp = await vvClient.library
            .getFolderSecurityMembers(null, folderId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));

        // Data could be empty, meaning no permissions are currently set for the folder
        if (getFolderSecurityResp.data.length > 0) {
            securityMemberIDs = getFolderSecurityResp.data.map((member) => member.memberId);
        }

        return securityMemberIDs;
    }

    async function deleteFolderPermissions(folderId, membersIDs = []) {
        // Wait for every permission to be deleted
        let res = await Promise.all(
            // Delete every permission in the memberIDs array
            membersIDs.map(async (memberID) => {
                const shortDescription = `Delete Folder Permissions for Member ID '${memberID}'`;

                return await vvClient.library
                    .deleteFolderSecurityMember(folderId, memberID, true)
                    .then((res) => parseRes(res))
                    .then((res) => checkMetaAndStatus(res, shortDescription))
                    .then((res) => checkDataPropertyExists(res, shortDescription))
                    .then((res) => checkDataIsNotEmpty(res, shortDescription));
            })
        );

        return res;
    }

    async function setGroupsFolderSecurity(folderId, groups) {
        // Wait for every new permission to be set
        const res = await Promise.all(
            // Set permission to every group in the groups array
            groups.map(async (group) => {
                const shortDescription = `Set Folder '${folderId}' Security for Group '${group}'`;

                const groupParam = {
                    q: `name eq '${group}'`,
                    fields: 'id,name,description',
                };

                // Gets the group ID
                let groupResp = await vvClient.groups
                    .getGroups(groupParam)
                    .then((res) => parseRes(res))
                    .then((res) => checkMetaAndStatus(res, shortDescription))
                    .then((res) => checkDataPropertyExists(res, shortDescription))
                    .then((res) => checkDataIsNotEmpty(res, shortDescription));

                const memType = vvClient.constants.securityMemberType['Group'];
                const role = vvClient.constants.securityRoles['Editor'];
                const groupID = groupResp.data[0].id;

                // Sets the permissions for the group
                let putFolderSecurityResp = await vvClient.library
                    .putFolderSecurityMember(folderId, groupID, memType, role, true)
                    .then((res) => parseRes(res))
                    .then((res) => checkMetaAndStatus(res, shortDescription))
                    .then((res) => checkDataPropertyExists(res, shortDescription))
                    .then((res) => checkDataIsNotEmpty(res, shortDescription));

                return putFolderSecurityResp.data;
            })
        );

        return res;
    }

    async function getDocumentsData(folderPath) {
        const shortDescription = `Get Documents Data for '${folderPath}'`;

        const getDocsArgs = {
            q: `FolderPath = '${folderPath}'`,
        };

        let getDocsResp = await vvClient.documents
            .getDocuments(getDocsArgs)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));

        return getDocsResp.data;
    }

    async function copyFile(docData, targetFolderID) {
        let shortDescription = `Copy File ${docData.name}`;
        let fileBytes;
        let docArgs;

        return vvClient.files
            .getFileBytesId(docData.id)
            .then((buffer) => {
                // 1. Gets the file bytes
                fileBytes = buffer;

                if (!fileBytes) {
                    throw new Error(`Could not get file bytes '${docData.id}'`);
                }
            })
            .then(() => {
                // 2. Create a new placeholder document
                docArgs = {
                    documentState: 1,
                    name: `${docData.fileName.split('.')[0]}`,
                    description: `${docData.description}`,
                    revision: '0',
                    allowNoFile: true,
                    fileLength: 0,
                    fileName: `${docData.fileName}`,
                    indexFields: '{}',
                    folderId: `${targetFolderID}`,
                };

                return vvClient.documents.postDoc(docArgs);
            })
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((postDocResp) => {
                // 3. Uploads the file bytes to the new placeholder document
                const fileParams = {
                    documentId: postDocResp.data.id,
                    name: postDocResp.data.name,
                    revision: '1',
                    changeReason: '',
                    checkInDocumentState: 'Released',
                    fileName: `${postDocResp.data.fileName}`,
                    indexFields: '{}',
                };

                return vvClient.files.postFile(fileParams, fileBytes);
            })
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((postFileResp) => postFileResp.data);
    }

    //This function sends an error log email. See configurable variables for settings.
    async function sendErrorLogEmail() {
        let body = 'The following errors or messages were logged while processing the folders and documents for a new user: \n\n';

        for (let errorItem of errorLog) {
            //Generate the body of the email.
            body += '<li>' + errorItem + '</li>';
        }

        const emailData = {
            recipients: errorEmailList,
            subject: 'Errors generated during new Plaidsoft registration ' + new Date().toLocaleString(),
            body: body,
        };

        await vvClient.email.postEmails(null, emailData);
    }

    /**********
     MAIN CODE
    ***********/

    try {
        const sourcePath = getFieldValueByName(sourcePathParamName);
        const targetPath = getFieldValueByName(targetPathParamName);
        const permissionGroups = getFieldValueByName(permissionGroupsParamName, false);

        // 1.Checks if the required paramenters are present
        if (!sourcePath || !targetPath) {
            // It could be more than one error, so we need to send all of them in one response
            throw new Error(errorLog.join('; '));
        }

        // 2.Checks if folder already exists
        let folderId = await getFolderID(targetPath);

        // 3.Creates folder if doesn't exist
        if (!folderId) {
            folderId = await createFolder(targetPath);
        }

        // If permissions groups were sent, set them
        if (permissionGroups) {
            // 4.Gets folder's current permissions settings
            const folderPermissionsIDs = await getFolderPermissionMembersIDs(folderId);

            // 5.Deletes current members with permissions
            // This is because we can only ADD new permissions
            if (folderPermissionsIDs.length > 0) {
                await deleteFolderPermissions(folderId, folderPermissionsIDs);
            }

            // 6.Sets new permissions to the folder
            await setGroupsFolderSecurity(folderId, permissionGroups);
        }

        // 7.Gets the original document ids
        const sourceDocsData = await getDocumentsData(sourcePath);

        // 8.Copies the documents
        let copiedFiles = [];

        for (const doc of sourceDocsData) {
            copiedFiles.push(await copyFile(doc, folderId));
        }

        // 9.Builds the success response array
        outputCollection[0] = 'Success';
        outputCollection[1] = 'Process Complete';
        outputCollection[2] = copiedFiles;
    } catch (err) {
        logger.info(JSON.stringify(err));
        errorLog.push(err.message ? err.message : err);

        // Builds the error response array
        outputCollection[0] = 'Error';
        outputCollection[1] = err.message ? err.message : err;
    } finally {
        // 10.Sends email with errors
        if (errorLog.length > 0) {
            sendErrorLogEmail();
        }

        // 11.Sends the response
        response.json(200, outputCollection);
    }
};

