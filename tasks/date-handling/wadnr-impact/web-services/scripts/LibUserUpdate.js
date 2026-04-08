/**
 * LibUserUpdate
 * Category: Workflow
 * Modified: 2025-03-05T13:35:33.967Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: 3b030d5f-c0f9-ef11-82c4-953deda8420a
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
    /*Script Name:  LibUserUpdate
     Customer:      Visual Vault
     Purpose:       The purpose of this NodeJS process will allow a user to be updated with various potential options.  Those options will be turned on or off depending on what is passed to the NodeJS process.
                    NOTE: The username of a user cannot be changed with this script. It must be updated manually in the Control Panel.
                          Passwords cannot be changed with this script. Code is commented out in previous versions of this script on GitHub; to be used when the API is updated.
                          User sites cannot be changed with this script.
                    IMPORTANT CONFIGURATION NOTE: A query with the name defined in the const variable "UserLookupQueryName" must be configured in Default queries (NOT in form data queries) that reflects the below:
                        SELECT UsUserID, UsId, UsFirstName, UsMiddleInit, UsLastName, UsEmailAddress, UsSiteID, UsEnabled
                        FROM dbo.Users
     Parameters: The following represent variables passed into the function:
                    Action - (string, Required) 'Update', 'Disable', or 'Enable' This parameter will control which actions this script takes.
                    User ID - (string, Required) This is the user name of the user.
                    First Name - (string, not Required) When provided, this information will be updated in the user profile.
                    Middle Initial - (string, not Required) When provided, this information will be updated in the user profile.
                    Last Name - (string, not Required) When provided, this information will be updated in the user profile.
                    Email Address - (string, not Required) When provided, this information will be updated in the user profile.
                    Group List - (string, not Required) String of group names separated by commas. The user will be assigned to these groups. Not updated when Action = 'Disable'.
                        NOTE: Adding VaultAccess group implicitly enables the user
                    Remove Group List - (string, not Required) String of group names separated by commas. The user will be removed from these groups. Not updated when Action = 'Disable'

     Return Array:  The following represents the array of information returned to the calling function.  This is a standardized response.
                Any item in the array at points 2 or above can be used to return multiple items of information.
                0 - Status: Success, Error
                1 - Message
                2 - User GUID
     Psuedo code:
        1. Get the results of a custom query to find the user information. Store info for later use.
        - If no user found, throw an error.
        2. Determine the user account information that needs to change and load that info into a user update object
        3. Send the user update object through putUsersEndpoint to update the user information.
        4. If the user is not being disabled and Group List or Remove Group List were passed in as parameters, retrieve user groups present in the system and store into VVUserGroups
        5. Add/remove necessary user groups, ensuring they are valid groups in the system
     Date of Dev:   12/4/2018
     Last Rev Date: 03/31/2023
     Revision Notes:
     12/20/2018 - Alex Rhee: Initial creation of the business process.
     1/3/19 - Alex Rhee: Process created and working. Passwords cannot be changed at this time.
     1/18/19 - Alex Rhee: Made sure all API calls are being measured by Resp.meta.status === 200
     12/10/2019 - Kendra Austin: Update to include user enable & disable; update header; bug fixes.
     01/08/2020 - Kendra Austin: Update to run a custom query to find the user rather than getUsers. This precludes the need for the user GUID parameter.
     09/23/2021 - Eric Oyanadel: Repuposed script for NEDHHS; change the credentials
     03/31/2023 - John Sevilla: Updated to use async/await
     */

    logger.info('Start of the process LibUserUpdate at ' + Date());

    /****************
    Config Variables
    *****************/
    let missingFieldGuidance = 'Please provide a value for the missing field(s).';
    const UserLookupQueryName = 'zWebSvc User Lookup'; //The name of the custom query in Default queries (NOT in form data queries)

    /****************
    Script Variables
    *****************/
    let outputCollection = [];
    let errorLog = [];
    let returnMessage = 'User updated';
    /**
     * A mapping of usergroup name to a usergroup data object
     * @typedef {Map<String, Object>} UserGroupsMap
     */

    /** @type {UserGroupsMap} */
    let VVUserGroups = new Map();

    try {
        /*********************
         Parameter Variables
        **********************/
        let Action = getFieldValueByName('Action');
        if (Action !== 'Enable' && Action !== 'Disable' && Action !== 'Update') {
            errorLog.push(`The Action parameter must be Enable, Disable, or Update.`);
        }
        let UserID = getFieldValueByName('User ID');
        let NewEmail = getFieldValueByName('Email Address', true);
        let GroupList = getFieldValueByName('Group List', true);
        let RemoveGroupList = getFieldValueByName('Remove Group List', true);

        /* empty string can clear these fields out */
        let NewFirstName = getStringValueByName('First Name', true);
        let NewMiddleInitial = getStringValueByName('Middle Initial', true);
        let NewLastName = getStringValueByName('Last Name', true);

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

        // Works similarly to getFieldValueByName, but returns null only if value is not a string (i.e. allows empty string as a value)
        function getStringValueByName(fieldName, isOptional) {
            let fieldValue = ffCollection.getFormFieldByName(fieldName)?.value;

            if (typeof fieldValue === 'string') {
                return fieldValue.trim();
            } else {
                if (!isOptional) {
                    errorLog.push(fieldName);
                }

                return null;
            }
        }

        function isEmptyObject(obj) {
            return obj && Object.keys(obj).length === 0 && Object.getPrototypeOf(obj) === Object.prototype;
        }

        function arrFromDelimitedStr(delimitedStr, delimiter) {
            let arr = [];
            if (typeof delimitedStr === 'string') {
                delimitedStr.split(delimiter).forEach((item) => {
                    item = item.trim();
                    if (item) {
                        arr.push(item);
                    }
                });
            }

            return arr;
        }

        async function retrieveUserData(userLookupQueryName, userID) {
            let queryParams = { filter: `[UsUserID] = '${userID}'` };

            let customQueryResp = await vvClient.customQuery.getCustomQueryResultsByName(
                userLookupQueryName,
                queryParams
            );
            customQueryResp = JSON.parse(customQueryResp);
            let customQueryData = customQueryResp.hasOwnProperty('data') ? customQueryResp.data : null;

            if (customQueryResp.meta.status !== 200) {
                throw new Error(
                    `Error encountered when calling getCustomQueryResultsByName on ${userLookupQueryName}. Please ensure that a query with this name has been configured in the default queries area.`
                );
            }
            if (Array.isArray(customQueryData) === false) {
                throw new Error(
                    `Data was not returned when calling getCustomQueryResultsByName on ${userLookupQueryName}.`
                );
            }
            if (customQueryData.length < 1) {
                throw new Error(`User not found with user ID: ${userID}`);
            }
            if (customQueryData.length > 1) {
                throw new Error(
                    `More than one user was found for user ID: '${userID}'. This is an invalid state. Please notify a system administrator.`
                );
            }

            let user = {
                GUID: customQueryData[0].usId,
                siteID: customQueryData[0].usSiteID,
                firstName: customQueryData[0].usFirstName,
                lastName: customQueryData[0].usLastName,
                middleInitial: customQueryData[0].usMiddleInit,
                emailAddress: customQueryData[0].usEmailAddress,
            };

            return user;
        }

        /**
         * Gets user groups data and wraps it in a Map for easy access
         * @returns {UserGroupsMap}
         */
        async function getVVUserGroups() {
            let queryParams = {};
            queryParams.q = '';
            queryParams.fields = 'id,name,description';

            let getGroupsResp = await vvClient.groups.getGroups(queryParams);
            getGroupsResp = JSON.parse(getGroupsResp);
            let getGroupsData = getGroupsResp.hasOwnProperty('data') ? getGroupsResp.data : null;

            if (getGroupsResp.meta.status !== 200) {
                throw new Error(`There was an error when calling getGroups.`);
            }
            if (Array.isArray(getGroupsData) === false || getGroupsData.length < 1) {
                throw new Error(`No groups were found to exist.`);
            }

            let userGroupsMap = new Map();
            getGroupsData.forEach((group) => {
                userGroupsMap.set(group.name, group);
            });

            return userGroupsMap;
        }

        /****************
        BEGIN ASYNC CODE
        *****************/
        // 1. Get the results of a custom query to find the user information. Store info for later use.
        let user = await retrieveUserData(UserLookupQueryName, UserID);

        // 2. Determine the user account information that needs to change and load that info into a user update object
        let userUpdateObj = {};
        if (Action === 'Enable') {
            userUpdateObj.enabled = true;
        } else if (Action === 'Disable') {
            userUpdateObj.enabled = false;
            returnMessage = 'User account disabled';
        }

        if (NewEmail && NewEmail !== user.emailAddress) {
            userUpdateObj.emailaddress = NewEmail;
        }

        if (typeof NewFirstName === 'string' && NewFirstName !== user.firstName) {
            userUpdateObj.firstname = NewFirstName;
        }

        if (typeof NewMiddleInitial === 'string' && NewMiddleInitial !== user.middleInitial) {
            userUpdateObj.middleinitial = NewMiddleInitial;
        }

        if (typeof NewLastName === 'string' && NewLastName !== user.lastName) {
            userUpdateObj.lastname = NewLastName;
        }

        // 3. Send the user update object through putUsersEndpoint to update the user information.
        if (isEmptyObject(userUpdateObj) === false) {
            let updatedUserFields = Object.keys(userUpdateObj).join(', ');
            let queryParams = {};
            let putUsersResp = await vvClient.users.putUsersEndpoint(queryParams, userUpdateObj, user.GUID);
            if (putUsersResp.meta.status !== 200) {
                throw new Error(
                    `Attempt to update user fields (${updatedUserFields}) for user '${UserID}' encountered an error.`
                );
            }

            logger.info(`User fields (${updatedUserFields}) for user '${UserID}' were updated successfully.`);
        }

        // 4. If the user is not being disabled and Group List or Remove Group List were passed in as parameters, retrieve user groups present in the system and store into VVUserGroups
        let addUserGroups = arrFromDelimitedStr(GroupList, ',');
        let removeUserGroups = arrFromDelimitedStr(RemoveGroupList, ',');
        if (Action !== 'Disable' && (addUserGroups.length > 0 || removeUserGroups.length > 0)) {
            VVUserGroups = await getVVUserGroups();

            // 5. Add/remove necessary user groups, ensuring they are valid groups in the system
            for (const groupName of addUserGroups) {
                // add groups. NOTE: Adding VaultAccess group enables the user account
                let groupData = VVUserGroups.get(groupName);
                if (groupData) {
                    let queryParams = {};
                    let addUserToGroupResp = await vvClient.groups.addUserToGroup(queryParams, groupData.id, user.GUID);
                    addUserToGroupResp = JSON.parse(addUserToGroupResp);
                    //201 is success; 400 means the user is already part of the group. Both are successful results.
                    if (addUserToGroupResp.meta.status === 201 || addUserToGroupResp.meta.status === 400) {
                        logger.info(`User added to group '${groupName}' successfully.`);
                    } else {
                        throw new Error(
                            `Attempt to add user '${UserID}' to group '${groupName}' encountered an error.`
                        );
                    }
                } else {
                    errorLog.push(
                        `The group '${groupName}' could not be added to the user profile because the group was not found.`
                    );
                }
            }

            for (const groupName of removeUserGroups) {
                // remove groups
                let groupData = VVUserGroups.get(groupName);
                if (groupData) {
                    let queryParams = {};
                    let removeUserFromGroupResp = await vvClient.groups.removeUserFromGroup(
                        queryParams,
                        groupData.id,
                        user.GUID
                    );
                    removeUserFromGroupResp = JSON.parse(removeUserFromGroupResp);
                    if (removeUserFromGroupResp.meta.status === 200) {
                        logger.info(`User removed from group '${groupName}' successfully.`);
                    } else {
                        throw new Error(
                            `Attempt to remove user '${UserID}' to group '${groupName}' encountered an error.`
                        );
                    }
                } else {
                    errorLog.push(
                        `The group '${groupName}' could not be removed from the user profile because the group was not found.`
                    );
                }
            }

            if (errorLog.length > 0) {
                throw new Error('The user groups may not have been fully updated.');
            }
        }

        // send to client
        outputCollection[0] = 'Success';
        outputCollection[1] = returnMessage;
        outputCollection[2] = user.GUID;
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
