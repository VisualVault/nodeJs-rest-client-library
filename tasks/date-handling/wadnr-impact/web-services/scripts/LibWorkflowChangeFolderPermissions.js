/**
 * LibWorkflowChangeFolderPermissions
 * Category: Workflow
 * Modified: 2025-10-14T15:09:51.13Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: 10e9f139-9889-f011-82f4-eead855597dc
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
    Script Name:    LibWorkflowChangeFolderPermissions
    Customer:       Project Name
    Purpose:        Change folder permissions in the document library, 
                    replacing an entity with another (Group/User/Individual).
    Preconditions:
                    - The folder structure must exist in the document library
                    - The entities (Groups/Users/Individuals) must exist
                    - User running must have editor permissions to set security
    Parameters:     
                    New Entity: Name/ID of the new entity to add
                    New Entity Type: Group | User | Individual
                    Remove Entity: Name/ID of the entity to remove (optional)
                    Remove Entity Type: Group | User | Individual (required if Remove Entity provided)
                    Permission Type: Level of permission (e.g., "Viewer", "Editor")
                    Folder Path: Path to the target folder
                    Apply to subfolders: true/false
    Return Object:
                    outputCollection[0]: Status ("Success" or "Error")
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data (optional details)
    Pseudo code: 
                    1° Get and validate inputs
                    2° Resolve folder GUID from path
                    3° Resolve entity GUIDs
                    4° Remove permissions from RemoveEntity if provided
                    5° Add permissions to NewEntity
                    6° Return status

    Date of Dev:    09/05/2025
    Last Rev Date:  09/05/2025

    Revision Notes:
                    09/05/2025 - Fernando Chamorro: Initial setup of script
                    09/08/2025 - Fernando Chamorro: Fixing newEntityType param to assign permission
    */

    logger.info(`Start of the process LibWorkflowChangeFolderPermissions at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    let outputCollection = [];
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Helper Functions                                 */
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

    function getGroup(group) {
        const shortDescription = `Get group data for: ${group}`;
        const getGroupsParams = {
            q: `name eq '${group}'`, // groups = `"Office Staff", "Proponent", ...`
        };

        return vvClient.groups
            .getGroups(getGroupsParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function getUserByUserID(userID) {
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

    async function resolveEntity(entity, type) {
        if (!entity || !type) return null;

        let resolvedGuid = null;

        switch (type) {
            case 'Group': {
                const groupData = await getGroup(entity);
                resolvedGuid = groupData[0].id;
                break;
            }
            case 'User': {
                const userData = await getUserByUserID(entity);
                resolvedGuid = userData.id;
                break;
            }
            case 'Individual': {
                const individualData = await getFormRecords(
                    { q: `[Form ID] eq '${entity}'`, expand: true },
                    'Individual Record'
                );

                const userId = individualData[0]['user ID'] || individualData[0]['User ID'];
                if (userId) {
                    const userData = await getUserByUserID(userId);
                    resolvedGuid = userData.id;
                }
                break;
            }
        }

        if (!resolvedGuid) throw new Error(`Entity not found: ${entity} (${type})`);

        return resolvedGuid;
    }

    /**
     * Removes a single entity’s permissions from a folder.
     *
     * @param {string} folderGuid - The unique identifier of the folder.
     * @param {string} removeEntityGuid - The unique identifier of the entity (user/group) to remove.
     * @param {boolean} applyToSubfolders - If true, the permission removal is applied recursively to subfolders.
     * @returns {Promise<object>} - The API response after attempting to remove the permission.
     * @throws {Error} - If the API call fails or returns an unexpected response.
     */
    async function deleteFolderPermission(folderGuid, removeEntityGuid, applyToSubfolders) {
        const ignoreStatusCode = 400; // 400 is returned when the folder has no permissions set
        const shortDescription = `Delete Folder Permission for Entity GUID '${removeEntityGuid}'`;

        try {
            let res = await vvClient.library
                .deleteFolderSecurityMember(folderGuid, removeEntityGuid, applyToSubfolders)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode))
                .then((res) => checkDataPropertyExists(res, shortDescription, ignoreStatusCode))
                .then((res) => checkDataIsNotEmpty(res, shortDescription, ignoreStatusCode));

            return res;
        } catch (error) {
            throw new Error(`Error in ${shortDescription}: ${error.message}`);
        }
    }

    /**
     * Adds a new entity’s permissions to a folder.
     *
     * @param {string} folderGuid - The unique identifier of the folder.
     * @param {string} newEntityGuid - The unique identifier of the entity (user/group) to add.
     * @param {string} newEntityType - The type of the entity (e.g., "User" or "Group" or "Individual").
     * @param {string} permissionType - The role to assign (e.g., "Editor", "Viewer", "Owner").
     * @param {boolean} applyToSubfolders - If true, the permission is applied recursively to subfolders.
     * @returns {Promise<object>} - The API response after attempting to add the permission.
     * @throws {Error} - If the API call fails or returns an unexpected response.
     */
    async function addFolderPermission(folderGuid, newEntityGuid, newEntityType, permissionType, applyToSubfolders) {
        const shortDescription = `Add Folder Permission for Entity GUID '${newEntityGuid}'`;

        try {
            let entityType = newEntityType;
            if (newEntityType === 'Individual') {
                entityType = 'User';
            }

            // Map the entity type and role using vvClient constants
            const memType = vvClient.constants.securityMemberType[entityType];
            const role = vvClient.constants.securityRoles[permissionType];

            if (!memType) {
                throw new Error(`Invalid entity type '${entityType}'. Must be 'User' or 'Group' or 'Individual'.`);
            }
            if (!role) {
                throw new Error(
                    `Invalid permission type '${permissionType}'. Must match a security role constant. (e.g., "Editor", "Viewer", "Owner")`
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

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET INPUT VALUES
        const newEntity = getFieldValueByName('New Entity');
        const newEntityType = getFieldValueByName('New Entity Type');
        const removeEntity = getFieldValueByName('Remove Entity', true);
        const removeEntityType = getFieldValueByName('Remove Entity Type', true);
        const permissionType = getFieldValueByName('Permission Type');
        const folderPath = getFieldValueByName('Folder Path');
        const applyToSubfoldersField = getFieldValueByName('Apply to subfolders', true);
        const applyToSubfolders = String(applyToSubfoldersField).toLowerCase() === 'true';

        if (!newEntity || !newEntityType || !permissionType || !folderPath) {
            throw new Error(errorLog.join('; '));
        }
        if (removeEntity && !removeEntityType) {
            throw new Error('Remove Entity Type is required when Remove Entity is provided.');
        }

        // 2° GET FOLDER GUID
        const folderPathGUID = await getFolderPathGUID(folderPath);
        const folderGuid = folderPathGUID.data.id;

        // 3° RESOLVE ENTITY GUIDS
        const newEntityGuid = await resolveEntity(newEntity, newEntityType);

        const removeEntityGuid = removeEntity ? await resolveEntity(removeEntity, removeEntityType) : null;

        // 4° REMOVE OLD ENTITY PERMISSIONS
        if (removeEntityGuid) {
            await deleteFolderPermission(folderGuid, removeEntityGuid, applyToSubfolders);
        }

        // 5° ADD NEW ENTITY PERMISSIONS
        await addFolderPermission(folderGuid, newEntityGuid, newEntityType, permissionType, applyToSubfolders);

        // 6° SUCCESS RESPONSE
        outputCollection[0] = 'Success';
        outputCollection[1] = `Permission '${permissionType}' applied to ${newEntityType} '${newEntity}' on folder '${folderPath}'.`;
        outputCollection[2] = {
            folderGuid,
            newEntity,
            newEntityType,
            permissionType,
        };
    } catch (error) {
        logger.info(`Error encountered ${error}`);
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
