/**
 * LibGroupGetGroupUserEmails
 * Category: Workflow
 * Modified: 2025-01-09T15:18:24.033Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 7b1c89d4-9cce-ef11-82bf-a0dcc70b93c8
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
    /*Script Name:   LibGroupGetGroupUserEmails
     Customer:      VisualVault
     Purpose:       Get a list User IDs, First Name, Last Name and Email addresses for all users who are the member of a group or multiple groups.
     Parameters:    The following represent variables passed into the function:
                     Array of VisualVault security Groups.  Example as follows:
                     
                     var groupsParamObj = [
                            {
                                name: 'Groups',
                                value: ['Information and Eligibility Staff', 'Information and Eligibility Managers']
                            }
                        ];
                     
                     
     Process PseudoCode:
                    1. Build the query to get groups using passed in group names and call getGroups
                    2. Make sure each passed in group name has a group returned from the query
                    3. For each group found, get user information and load user information into the UserData object.
                    4. Send the userData back to the client
     Return Array:  The following represents the array of information returned to the calling function.  This is a standardized response.
                     Any item in the array at points 2 or above can be used to return multiple items of information.
                     0 - Status: 'Success' or 'Error'
                     1 - Message
                     2 - userData: User data object with list of users.
                     3 - groupsNotFound: Array of group names that were not found (if any)
    Date of Dev: 01/08/2025
    Last Rev Date: 01/08/2025
    Revision Notes:
    01/08/2025 - John Sevilla: Script migrated.
     */

    logger.info('Start of the process LibGroupGetGroupUserEmails at ' + Date());

    /****************
    Config Variables
    *****************/
    let missingFieldGuidance = 'Please provide a value for the missing field(s).';

    /****************
    Script Variables
    *****************/
    let outputCollection = [];
    let errorLog = [];
    let userData = [];
    let groupsNotFound = [];

    try {
        /*********************
        Form Record Variables
      **********************/
        let Groups = getFieldValueByName('Groups');

        //Return all errors at once
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        /****************
      Helper Functions
      *****************/
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

        /****************
      BEGIN ASYNC CODE
      *****************/
        //Step 1: Build the query to get groups using passed in group names and call getGroups
        let inClause = '';
        Groups.forEach(function (groupName) {
            if (inClause.length > 0) {
                inClause += ',';
            }
            inClause += `'${groupName}'`;
        });

        let groupParams = {};
        groupParams.q = `[name] IN (${inClause})`;

        let groupResp = await vvClient.groups.getGroups(groupParams);
        groupResp = JSON.parse(groupResp);
        let groupData = groupResp.hasOwnProperty('data') ? groupResp.data : null;
        if (groupResp.meta.status !== 200) {
            throw new Error(`Error encountered when calling getGroups. ${groupResp.meta.statusMsg}.`);
        }
        if (groupData === null) {
            throw new Error('Data was not returned when calling getGroups');
        }

        //Step 2: Make sure each passed in group name has a group returned from the query
        let foundGroupNames = new Set(groupData.map((group) => group.name.toLowerCase()));
        groupsNotFound = Groups.filter((groupName) => foundGroupNames.has(groupName.toLowerCase()) === false);
        if (groupsNotFound.length > 0) {
            logger.info(
                `One or more of the passed in group names were unable to be found: ${groupsNotFound.join(',')}`
            );
        }

        //Step 3: For each group found, get user information and load user information into the UserData object.
        let groupUsersParams = {};
        groupUsersParams.fields = 'Id,Name,UserId,FirstName,LastName,EmailAddress,Enabled';

        for (const group of groupData) {
            let groupUsersResp = await vvClient.groups.getGroupsUsers(groupUsersParams, group.id);
            groupUsersResp = JSON.parse(groupUsersResp);
            let groupUsersData = groupUsersResp.hasOwnProperty('data') ? groupUsersResp.data : null;
            if (groupUsersResp.meta.status !== 200) {
                throw new Error(`Error encountered when calling getGroupsUsers. ${groupUsersResp.meta.statusMsg}.`);
            }
            if (groupUsersData === null) {
                throw new Error('Data was not returned when calling getGroupsUsers');
            }

            groupUsersData.forEach(function (userInfo) {
                //Only add enabled users
                if (userInfo.enabled == true) {
                    //Add the user to the data array if it's not already there
                    if (
                        !userData.find(function (user) {
                            return user.id === userInfo.id;
                        })
                    ) {
                        userInfo.groupname = group.name;
                        userData.push(userInfo);
                    }
                }
            });
        }

        //Step 4: Send the userData back to the client
        outputCollection[0] = 'Success';
        outputCollection[1] = 'All actions completed successfully';
        outputCollection[2] = userData;
        outputCollection[3] = groupsNotFound;
    } catch (error) {
        //Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = 'Error';
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = errorLog;
    } finally {
        response.json(200, outputCollection);
    }
};
